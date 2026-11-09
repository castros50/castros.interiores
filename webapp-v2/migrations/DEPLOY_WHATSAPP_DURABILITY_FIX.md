# Deploy em produção: correções de durabilidade do WhatsApp

**Status: preparado, NÃO executado.** Nenhum comando abaixo foi rodado contra
produção. Isto cobre duas frentes relacionadas mas distintas:

1. **Deploy do código já commitado** (`a64d2ae` até `8b06a4d`): persistência
   no Firestore antes de responder ao webhook, transação em vez de
   sobrescrita, merge por item/campo em `attendances`/`agentChats`, e o
   interruptor de manutenção. Nenhuma mudança de schema.
2. **Resolver o limite de tamanho do documento** (`appState/main` medido em
   99,7% do limite do Firestore) — usa a migração já preparada em
   `firestoreCollectionsMigration.ts`, agora com um CLI real para rodar
   contra produção (`run-production-migration.ts`, novo).

**Importante, para não criar uma falsa sensação de segurança:** migrar os
dados para as coleções novas **não encolhe nem estabiliza** `appState/main`.
A aplicação continua lendo/escrevendo nesse mesmo documento até que
`persistStoreToFirestore`/`restoreStoreFromFirestoreIfNeeded` em `server.ts`
sejam trocados para usar as coleções novas — essa troca de código é a
**próxima etapa, ainda não preparada**, e não faz parte deste procedimento.
O que a migração entrega aqui é uma cópia íntegra e verificada dos dados em
coleções sem o teto de tamanho — uma rede de segurança adicional, não uma
correção do limite em si.

Serviço: `castros-interiores`, região `southamerica-east1`, projeto
`gen-lang-client-0378581840`.

## Ordem do procedimento

1. **Backup verificável** (sempre primeiro, incondicional — é leitura pura)
2. Checar o tamanho atual (decide se é prudente gerar tráfego novo antes de migrar)
3. Resolver Phone Number ID / permissões do WhatsApp (pré-requisito da validação)
4. Deploy do código (seguro independente do tamanho do documento)
5. Confirmar 100% do tráfego na revisão nova
6. **Se o tamanho estiver crítico**: resolver o limite de armazenamento (bloqueio → reconciliação → migração → verificação → recuperação) antes do passo 7
7. Validação com mensagem inédita
8. Rollback (referência, só se precisar)
9. Limitações remanescentes

---

## Passo 1 — Backup verificável (sempre primeiro, nunca bloqueado por tamanho)

Isto é leitura pura — roda igual estando o documento em qualquer tamanho,
inclusive acima do limite. **Não depende de nenhuma checagem de tamanho
antes.**

Script novo `migrations/backup-production.ts` (usa `firebase-admin`/ADC, não
a API REST crua — mais simples e já devolve JSON pronto para o script de
migração, sem conversão):

```bash
cd webapp-v2
npx tsx migrations/backup-production.ts \
  --out=$HOME/backups/castros/appstate_main_backup_$(date +%Y%m%dT%H%M%S).json
```

**O que altera:** nada no Firestore. Cria um arquivo local novo no caminho
indicado.

**Por que fora de `/tmp`:** o script recusa explicitamente gravar em `/tmp`
ou no diretório temporário do SO (`os.tmpdir()`) — um backup que só existe
num diretório efêmero (apagado ao reiniciar a sessão/contêiner) não serve
como rede de segurança. Use um caminho dentro do `$HOME` do Cloud Shell (ou
baixe o arquivo para a máquina local logo em seguida).

**Por que é verificável, não só "salvo":** o script relê o arquivo do disco
(não confia na variável em memória), reparseia como JSON e imprime:
- `updateTime` do documento no Firestore no momento da leitura;
- bytes no disco e `%` do limite de 1.048.576;
- SHA-256 do arquivo (para comparar depois, se precisar confirmar que
  nenhum backup foi alterado);
- contagem de atendimentos e de mensagens por mesa.

Guardar esse SHA-256 e o caminho do arquivo em algum lugar anotado — é a
referência para qualquer rollback manual de dados, se um dia for preciso.

---

## Passo 2 — Checar o tamanho atual (decide o que vem depois, não bloqueia o backup)

```bash
curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics" \
  | python3 -m json.tool
```

Olhar `firestoreBackup.bytes`, `firestoreBackup.percentUsed` e
`firestoreBackup.critical` (o mesmo cálculo que o backup do Passo 1 já
mostrou, aqui como segunda fonte/confirmação via a própria aplicação).

**Última medição conhecida (09/11/2026, antes desta sessão): 1.045.502 bytes
(99,7%) — já acima do limiar crítico (1.030.000). Assumir `critical: true`
até este comando provar o contrário.**

- Se **não crítico**: seguir direto para o Passo 3.
- Se **crítico**: seguir para o Passo 3 normalmente (resolver o WhatsApp não
  grava nada), mas **não pular para o Passo 7 (mensagem de validação) sem
  antes passar pelo Passo 6** — mandar uma mensagem nova agora só adiciona
  gravação a um documento já no limite, aumentando a chance real de
  "entity too large" bem no meio da validação.

**O que altera:** nada — é leitura.

---

## Passo 3 — Resolver Phone Number ID / permissões do WhatsApp

A integração está com erro confirmado (última checagem registrada,
09/11/2026 14:29:23Z, via `integrationStatus` do diagnóstico):

```
Unsupported get request. Object with ID '1401848436349648' does not exist,
cannot be loaded due to missing permissions, or does not support this
operation.
```

`1401848436349648` é o `WHATSAPP_PHONE_NUMBER_ID` hoje configurado no Cloud
Run. Esse tipo de erro do Graph API ("não existe ou falta permissão") é
genérico demais para apontar uma causa única — mas duas candidatas
concretas, ligadas ao histórico desta própria integração nesta sessão:

1. **Mais provável: `WHATSAPP_ACCESS_TOKEN` ainda é o token temporário de
   24h** gerado no momento da configuração inicial ("vamos usar ele só pra
   um teste rápido... antes de gerarmos o token permanente de verdade" —
   texto literal desta mesma sessão). Se o token permanente (usuário do
   sistema, permissão `whatsapp_business_messaging`) nunca chegou a
   substituir o temporário na variável de ambiente do Cloud Run, ele expirou
   há dias — e um token expirado produz exatamente esse tipo de erro
   genérico no Graph API, não um 401 claro.
2. **Possível também: permissão de ativo não concedida.** Mesmo com um
   token válido, o Usuário do Sistema que gerou o token precisa ter acesso
   explícito à Conta de WhatsApp Business específica em Configurações do
   Negócio → Contas de WhatsApp → (a conta) → Parceiros/Pessoas. Esta sessão
   já viu esse exato tipo de erro de permissão de ativo antes (`#3441038`,
   para outro recurso), então vale conferir aqui também.

**Não consigo corrigir isso por aqui** — é configuração dentro do painel da
Meta (business.facebook.com), fora de qualquer CLI. Passos para quem for
resolver:

1. **Gerar um token permanente**: Configurações do Negócio →
   **Usuários → Usuários do Sistema** → usar ou criar um Usuário do Sistema
   → **Gerar novo token** → selecionar o app certo e marcar a permissão
   `whatsapp_business_messaging` (e `whatsapp_business_management` se a
   leitura de metadados do número continuar falhando mesmo com o token
   novo) → gerar. A Meta só mostra o valor uma vez — copiar com o ícone de
   clipe, sem printscreen.
2. **Confirmar acesso ao ativo**: no mesmo Usuário do Sistema, conferir que
   ele tem acesso (não só existe) à Conta de WhatsApp Business que contém o
   número `1401848436349648` — **Configurações do Negócio → Contas de
   mensagens/WhatsApp → (a conta) → Pessoas/Parceiros**, adicionar o Usuário
   do Sistema com permissão de gerenciar mensagens, se não estiver lá.
3. **Reconferir o Phone Number ID**: copiar de novo, direto da tela
   **WhatsApp → Configuração da API**, em vez de reusar o valor já
   configurado — descarta a hipótese de ID errado/trocado.
4. **Atualizar as variáveis no Cloud Run** (um comando por variável, no
   padrão já usado nesta mesma integração — evita o problema conhecido de
   quebra de linha ao colar valores copiados pelos botões da Meta):
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --update-env-vars WHATSAPP_ACCESS_TOKEN=<TOKEN_PERMANENTE_NOVO>
   ```
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --update-env-vars WHATSAPP_PHONE_NUMBER_ID=<ID_RECONFERIDO>
   ```
   (rodar só o segundo comando se o Phone Number ID não tiver mudado.)

   **O que altera:** cada `gcloud run services update` cria uma revisão nova
   do Cloud Run (mesmo código, variável nova) — isso por si só já é um
   mini-deploy; vale aplicar os Passos 4/5 deste documento (deploy do código
   + confirmar tráfego) depois, não antes, para não ter que repetir a
   verificação de tráfego duas vezes.

5. **Reverificar, sem enviar mensagem nenhuma ainda:**
   ```bash
   curl -s -X POST "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics/verify-connection"
   ```
   Isso chama a Graph API de verdade (uma leitura, não um envio) e atualiza
   `integrationStatus`. Só considerar isto resolvido quando `state` não for
   mais `"erro"`. Reler com `GET /api/whatsapp/diagnostics` (Passo 2) para
   conferir.

---

## Passo 4 — Deploy do código

Independente do tamanho do documento (deploy não grava dados, só código):

```bash
cd webapp-v2
gcloud run deploy castros-interiores \
  --source . \
  --region southamerica-east1 \
  --project gen-lang-client-0378581840
```

Builda pelo `Dockerfile` existente (Cloud Build) e publica uma revisão nova.
Sem `--update-env-vars`, herda as variáveis já configuradas na revisão atual
(inclusive as atualizadas no Passo 3).

**O que altera:** publica uma revisão nova do Cloud Run; não toca em dados.

**Antes de rodar, anotar a revisão atual (para o rollback do Passo 8):**
```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="value(status.latestReadyRevisionName)"
```

---

## Passo 5 — Confirmar 100% do tráfego na revisão nova

```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="table(status.traffic[].revisionName,status.traffic[].percent)"
```

Só prosseguir com **100% numa única revisão** — a recém-publicada. Se
aparecer tráfego na revisão antiga, o código anterior (sem a correção) ainda
pode estar processando mensagens reais. Depois de confirmado, aguardar 2–3
minutos de margem para requisições já aceitas pela revisão antiga
terminarem.

**O que altera:** nada por si só — é uma leitura de status. Decide se é
seguro prosseguir.

---

## Passo 6 — Resolver o limite de armazenamento (só se o Passo 2 indicou crítico)

Reaproveita a migração já implementada e testada (16/16 contra o emulador
oficial — ver `README.md`), agora com um CLI real contra produção
(`run-production-migration.ts`, novo nesta revisão). Cada escrita real exige
`--confirm=CONFIRMO-PRODUCAO` — sem isso, o script recusa conectar.

### 6.1 — Bloquear gravações novas na aplicação

```bash
gcloud run services update castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --update-env-vars MAINTENANCE_MODE_WRITES_BLOCKED=1
```
**O que altera:** nova revisão do Cloud Run com a variável ativa —
`saveStore()` e a transação do webhook passam a recusar qualquer gravação
(nem local, nem Firestore), respondendo erro/503 em vez de escrever.
Leituras continuam normais.

Confirmar 100% do tráfego nessa revisão nova (mesmo comando do Passo 5) e
esperar a mesma margem de drenagem (2–3 min) — ver `README.md`, seção
"Controle de gravações durante a janela", para o porquê detalhado (inclusive
a limitação declarada: rotas assíncronas sem try/catch próprio podem não
devolver uma resposta HTTP limpa, mas a gravação em si fica bloqueada mesmo
assim).

### 6.2 — Reconciliar as fontes antes de confiar em qualquer uma

Com gravações bloqueadas e o tráfego drenado, ler as duas fontes:

```bash
curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/store" \
  -o $HOME/backups/castros/appstate_live_instance_$(date +%Y%m%dT%H%M%S).json
```

(o backup do Passo 1, já salvo, é a segunda fonte — não precisa reler o
Firestore de novo).

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=reconcile \
  --snapshot=<arquivo do /api/store acima> \
  --snapshot2=<arquivo do backup do Passo 1>
```

**O que altera:** nada — só compara os dois arquivos e imprime o relatório
(`identical: true/false` e, se `false`, exatamente quais ids existem só de
um lado). Só seguir com `identical: true` (ou depois de reconciliar
manualmente as diferenças apontadas).

### 6.3 — Dry-run (confere contagens, não escreve nada)

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=dry-run \
  --snapshot=<backup reconciliado> \
  --confirm=CONFIRMO-PRODUCAO
```

**O que altera:** nada no Firestore — só calcula e imprime quantos
atendimentos/mensagens/marcadores de dedup SERIAM escritos.

### 6.4 — Execução real (escreve só nas coleções novas)

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=execute \
  --snapshot=<backup reconciliado> \
  --confirm=CONFIRMO-PRODUCAO
```

**O que altera:** cria/sobrescreve documentos em `attendances_v2`,
`agentChats_v2_{deskId}` e `whatsappMessageDedup`. **Nunca toca em
`appState/main`** — o documento único continua existindo, inalterado, como
rede de segurança. Idempotente: pode rodar de novo com segurança (ver
Recuperação abaixo).

### 6.5 — Verificar integridade

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=verify \
  --snapshot=<o mesmo backup usado no 6.4> \
  --confirm=CONFIRMO-PRODUCAO
```

**O que altera:** nada — lê de volta as coleções novas e compara contra o
snapshot original. Só considerar a migração concluída com `"ok": true`.

### 6.6 — Recuperação em caso de falha

- **Erros em `attendances`/`agentChats` (fase `errors` do 6.4):** a função é
  idempotente (`.set()` sobrescreve com o mesmo valor) — corrigir a causa do
  erro (ex.: permissão, rede) e rodar `--mode=execute` de novo é seguro, não
  duplica nada.
- **Marcadores de dedup "já existentes" (`dedupMarkersAlreadyPresent`):**
  não é erro — significa que uma execução anterior parcial já tinha
  escrito aquele marcador; a contagem só informa isso.
- **`--mode=verify` retorna `"ok": false`:** o relatório (`mismatches`) diz
  exatamente o que falta ou diverge, por id. Rodar `--mode=execute` de novo
  (idempotente) e `--mode=verify` outra vez, repetindo até `"ok": true`.
- **Nada disso resolve sozinho:** nenhuma etapa aqui apaga ou sobrescreve o
  documento único `appState/main` — se a migração falhar de um jeito
  irrecuperável, a aplicação continua funcionando exatamente como antes
  (lendo/escrevendo o documento único), sem nenhuma perda. O pior caso é
  "as coleções novas ficam incompletas/inconsistentes", não "dado real
  perdido".

### 6.7 — Desativar o modo de manutenção

Só depois do 6.5 passar:
```bash
gcloud run services update castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --remove-env-vars MAINTENANCE_MODE_WRITES_BLOCKED
```
**O que altera:** nova revisão sem a variável — gravações voltam ao normal.
Confirmar 100% de tráfego nessa revisão antes de considerar a janela
encerrada.

**Lembrete:** depois disto, `appState/main` continua do mesmo tamanho de
antes — as coleções novas existem, verificadas, mas a aplicação ainda lê e
escreve no documento único até a troca de código (fora deste procedimento).
O risco de "entity too large" em cada nova gravação continua existindo.

---

## Passo 7 — Validação com mensagem inédita

Só chegar aqui com: Phone Number ID/permissões resolvidos (Passo 3) e, se o
Passo 2 indicou crítico, o Passo 6 concluído (não porque isso reduz o
tamanho do documento — não reduz — mas porque é a ordem prudente: ter a
rede de segurança das coleções novas antes de arriscar mais uma gravação no
documento já no limite).

**Não reutilizar o payload de teste da Meta** (`ABGGFlA5Fpa`) — já
investigado nesta sessão, é um payload fixo reenviado pelo botão "Testar" do
painel da Meta, não prova nada sobre uma mensagem nova de verdade.

1. **Reconferir o tamanho uma última vez** (Passo 2) — cada evento recebido
   desde a última checagem pode ter mudado o quadro.
2. **Enviar uma mensagem real** de um número de WhatsApp que nunca falou com
   o número comercial, com texto único (ex.: incluir a hora atual).
3. **Log do Cloud Run:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="castros-interiores" AND httpRequest.requestUrl:"whatsapp"' \
     --project gen-lang-client-0378581840 --limit 5 \
     --format="table(timestamp,httpRequest.status,textPayload)"
   ```
4. **Diagnóstico da aplicação:**
   ```bash
   curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics" \
     | python3 -m json.tool
   ```
   Conferir `recentEvents[0]` e reconferir `firestoreBackup.critical` — se
   virou `true` só agora, é sinal para voltar ao Passo 6 antes de mandar
   mais tráfego de teste.
5. **Firestore direto** (fonte de verdade — buscar pelo fragmento único do
   texto enviado, não por um id fixo). Primeiro gerar um novo backup (o
   script já imprime o caminho exato em "Salvo em: ..."):
   ```bash
   npx tsx migrations/backup-production.ts \
     --out=$HOME/backups/castros/appstate_post_validacao_$(date +%Y%m%dT%H%M%S).json
   ```
   Depois buscar pelo fragmento único do texto enviado (substituir
   `CAMINHO_DO_BACKUP` pelo "Salvo em:" acima e `FRAGMENTO` pelo trecho
   único do texto do Passo 2):
   ```bash
   python3 -c "
import json
with open('CAMINHO_DO_BACKUP') as f:
    data = json.load(f)
fragment = 'FRAGMENTO'
found = None
for desk_id, messages in (data.get('agentChats') or {}).items():
    for m in messages or []:
        if fragment in (m.get('text') or ''):
            found = (desk_id, m)
if not found:
    print('Mensagem com esse fragmento NAO encontrada.')
else:
    desk_id, m = found
    att_id = m.get('attendanceId')
    att = next((a for a in (data.get('attendances') or []) if a.get('id') == att_id), None)
    print(f'Mensagem encontrada na mesa {desk_id!r}, attendanceId={att_id}')
    print('Atendimento:', 'ENCONTRADO' if att else 'NAO ENCONTRADO')
    if att:
        print(' attendanceNumber:', att.get('attendanceNumber'))
"
   ```
6. **Interface:** abrir o app em produção, Atendimentos, localizar o
   atendimento novo, abrir a conversa, confirmar o texto.
7. **Sobrevivência a reinício:**
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --update-labels=persistence-check=$(date +%s)
   ```
   Esperar 100% de tráfego na revisão nova (Passo 5) e repetir os itens 4 e
   6 acima. Se a mensagem e o atendimento continuam lá depois do reinício
   forçado, a persistência está confirmada ponta a ponta.

---

## Passo 8 — Rollback

```bash
gcloud run services update-traffic castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --to-revisions $PREVIOUS_REVISION=100
```
(valor anotado no Passo 4). Imediato, não apaga dado nenhum gravado nesse
meio-tempo.

**Importante: rollback traz de volta o bug original** (sem a
persistência-antes-de-responder, sem transação, sem merge por item/campo) —
é decisão de emergência, não rotina. Se o problema é só o tamanho do
documento, rollback não resolve isso — o documento está igualmente cheio em
qualquer revisão, e reverter não desfaz uma migração já executada no Passo 6
(as coleções novas continuam lá, inofensivas, só não usadas pelo código
antigo nem pelo novo ainda).

---

## Limitações que continuam depois deste procedimento

- **O tamanho de `appState/main` não é resolvido por este procedimento** —
  só a troca de código (`persistStoreToFirestore`/
  `restoreStoreFromFirestoreIfNeeded` para ler/escrever das coleções novas)
  resolve isso de verdade, e essa troca **não está preparada** aqui.
- **Merge só no primeiro nível de campos** — duas edições concorrentes
  dentro do MESMO objeto aninhado do MESMO atendimento ainda podem colidir
  (ver `README.md`).
- **Cobertura de teste parcial** — transação/merge testados contra o
  emulador oficial para o webhook e `PUT /api/attendances/:id`
  especificamente, não para toda rota que toca `attendances`/`agentChats`.
- **PITR desativado** (confirmado nesta sessão) — sem recuperação automática
  por ponto no tempo se o documento for perdido/corrompido de novo antes da
  troca de código.
- **Rotas da API sem autenticação própria no servidor** — observado
  incidentalmente, fora do escopo deste procedimento; decisão separada sobre
  se e quando tratar.
- **Causa raiz do erro do WhatsApp (Passo 3) é a hipótese mais provável, não
  uma certeza confirmada por mim** — depende de quem tiver acesso ao painel
  da Meta confirmar qual das duas causas (token expirado vs. permissão de
  ativo) era a real, já que não tenho como inspecionar isso por aqui.
