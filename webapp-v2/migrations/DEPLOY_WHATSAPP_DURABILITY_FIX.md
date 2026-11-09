# Deploy em produção: correções de durabilidade do WhatsApp + troca para coleções

**Status: preparado, NÃO executado.** Nenhum comando abaixo foi rodado contra
produção. Isto cobre três frentes que agora precisam ser implantadas
JUNTAS, na ordem deste documento (motivo explicado abaixo):

1. **Correções de durabilidade já commitadas** (`a64d2ae` até `8b06a4d`):
   persistência no Firestore antes de responder ao webhook, transação em vez
   de sobrescrita, merge por item/campo em `attendances`/`agentChats`, e o
   interruptor de manutenção.
2. **Migração para coleções** (`attendances_v2`, `agentChats_v2_{deskId}`,
   `whatsappMessageDedup`) — lógica já testada (16/16 contra o emulador
   oficial, ver `README.md`), agora com um CLI real para produção
   (`run-production-migration.ts`, novo).
3. **Troca do servidor para usar as coleções novas** (commit mais recente
   desta branch) — `persistStoreKeysTransactionally`,
   `claimWhatsAppMessagesTransactionally` e
   `restoreStoreFromFirestoreIfNeeded` em `server.ts` foram reescritos para
   ler/escrever `attendances`/`agentChats` das coleções, não mais do
   documento único. **Isto é código novo nesta revisão, testado ponta a
   ponta contra o emulador oficial** (não só os testes unitários da
   migração) — ver "O que foi testado" abaixo.

## Por que as três frentes têm que andar juntas agora

A frente 3 (troca do servidor) **exige que a frente 2 (migração) já tenha
rodado e passado na verificação de integridade** — a partir do deploy desta
revisão, `restoreStoreFromFirestoreIfNeeded` para de ler
`attendances`/`agentChats` do documento único e passa a ler só das coleções
novas. Se este código for implantado ANTES da migração rodar, qualquer
instância nova do Cloud Run (reinício, redeploy, autoscaling) encontraria as
coleções genuinamente vazias e subiria com **zero atendimentos** — o mesmo
sintoma da perda de dados investigada nesta sessão, só que desta vez por
sequenciamento errado, não por bug.

**Rede de segurança adicionada contra isso:** `restoreStoreFromFirestoreIfNeeded`
agora grava um `console.error` com `ALERTA:` se as coleções estiverem vazias
mas o documento único ainda tiver atendimentos — torna o cenário impossível
de passar despercebido no log, mas não evita a inicialização com 0
atendimentos sozinho. **Por isso a migração (Passo 4) deixou de ser
condicional ao tamanho do documento e passou a ser obrigatória antes do
deploy (Passo 5)**, diferente de uma versão anterior deste procedimento.

Isto também responde à limitação anterior: migrar os dados sozinho (sem
trocar o código) não reduzia `appState/main` nem o risco de "entity too
large". Com a troca de código incluída, depois deste procedimento o
documento único **para de crescer** com `attendances`/`agentChats` — o
risco de tamanho fica resolvido para gravações futuras (o documento já
existente continua grande, intacto, como histórico).

Serviço: `castros-interiores`, região `southamerica-east1`, projeto
`gen-lang-client-0378581840`.

## O que foi testado nesta revisão (emulador oficial, não produção)

Contra o emulador oficial do Firestore, com o servidor de verdade rodando
(`npx tsx server.ts`, não um teste isolado da lógica pura):
- Mensagem nova do WhatsApp → atendimento e mensagem gravados em
  `attendances_v2`/`agentChats_v2_carla_atendimento`, nada em
  `appState/main`.
- Reentrega da mesma mensagem (mesmo `externalMessageId`) → corretamente
  tratada como duplicata, nenhum registro novo.
- **10 chamadas verdadeiramente concorrentes para o mesmo `externalMessageId`**
  → exatamente 1 atendimento e 1 mensagem criados (achado real desta
  revisão: uma primeira versão com uma tentativa de "recuperação de racha"
  criava duplicatas sob esta mesma condição — removida, ver comentário em
  `claimWhatsAppMessagesTransactionally`).
- **5 chamadas verdadeiramente concorrentes com mensagens DIFERENTES do
  MESMO cliente novo (sem atendimento ainda)** → exatamente 1 atendimento
  criado, as 5 mensagens corretamente vinculadas a ele (fechado por uma
  transação real do Firestore escopada à coleção de atendimentos, não ao
  documento único).
- Reinício completo (apaga o disco local, reinicia o processo) → estado
  restaurado corretamente das coleções (`restoreStoreFromFirestoreIfNeeded`).
- Cenário "código novo antes da migração rodar" (coleções vazias, documento
  único ainda com dado) → `ALERTA` aparece no log, servidor sobe mesmo assim
  com 0 atendimentos (não finge sucesso, não trava).

**Não testado:** volume real de produção (99,7% do limite, provavelmente
centenas de mensagens) — os testes acima usam poucos registros sintéticos.
A query completa da coleção de atendimentos dentro da transação do webhook
(ver limitação declarada mais abaixo) pode ficar mais lenta/contenciosa à
medida que o número de atendimentos cresce — não medido aqui.

## Ordem do procedimento

1. **Backup verificável** (sempre primeiro, incondicional — é leitura pura)
2. Checar o tamanho atual (contexto/registro, não bloqueia nada abaixo)
3. Resolver Phone Number ID / permissões do WhatsApp (pré-requisito da validação)
4. **Migração para coleções — agora obrigatória, não mais condicional ao tamanho** (bloqueio → reconciliação → migração → verificação → recuperação)
5. Deploy do código (durabilidade + troca para coleções, juntos)
6. Confirmar 100% do tráfego na revisão nova
7. Validação com mensagem inédita (agora inclui confirmar a restauração pelas coleções)
8. Rollback (referência, só se precisar)
9. Limitações remanescentes

---

## Passo 1 — Backup verificável (sempre primeiro, nunca bloqueado por tamanho)

Isto é leitura pura — roda igual estando o documento em qualquer tamanho,
inclusive acima do limite. **Não depende de nenhuma checagem de tamanho
antes.**

Script `migrations/backup-production.ts` (usa `firebase-admin`/ADC, não a
API REST crua — mais simples e já devolve JSON pronto para o script de
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

## Passo 2 — Checar o tamanho atual (registro, não bloqueia nada)

```bash
curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics" \
  | python3 -m json.tool
```

Olhar `firestoreBackup.bytes`, `firestoreBackup.percentUsed` e
`firestoreBackup.critical`. Última medição conhecida (09/11/2026, antes
desta sessão): 1.045.502 bytes (99,7%) — já acima do limiar crítico
(1.030.000).

Diferente de uma versão anterior deste documento, este número **não decide
mais** se a migração do Passo 4 é necessária — ela passou a ser obrigatória
de qualquer forma (ver "Por que as três frentes têm que andar juntas" no
topo). Serve só de contexto e para decidir se, antes de tudo, vale a pena
evitar gerar tráfego de teste extra no documento único enquanto ele ainda
é a fonte em uso (até o Passo 5 implantar a troca de código).

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
   mini-deploy; vale aplicar os Passos 5/6 deste documento (deploy do código
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

## Passo 4 — Migração para coleções (obrigatória antes do deploy do Passo 5)

Reaproveita a migração já implementada e testada (16/16 contra o emulador
oficial — ver `README.md`), agora com um CLI real contra produção
(`run-production-migration.ts`). Cada escrita real exige
`--confirm=CONFIRMO-PRODUCAO` — sem isso, o script recusa conectar.

### 4.1 — Bloquear gravações novas na aplicação

```bash
gcloud run services update castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --update-env-vars MAINTENANCE_MODE_WRITES_BLOCKED=1
```
**O que altera:** nova revisão do Cloud Run com a variável ativa —
`saveStore()` e a transação do webhook passam a recusar qualquer gravação
(nem local, nem Firestore), respondendo erro/503 em vez de escrever.
Leituras continuam normais.

Confirmar 100% do tráfego nessa revisão nova (mesmo comando do Passo 6) e
esperar a mesma margem de drenagem (2–3 min) — ver `README.md`, seção
"Controle de gravações durante a janela", para o porquê detalhado (inclusive
a limitação declarada: rotas assíncronas sem try/catch próprio podem não
devolver uma resposta HTTP limpa, mas a gravação em si fica bloqueada mesmo
assim).

### 4.2 — Reconciliar as fontes antes de confiar em qualquer uma

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

### 4.3 — Dry-run (confere contagens, não escreve nada)

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=dry-run \
  --snapshot=<backup reconciliado> \
  --confirm=CONFIRMO-PRODUCAO
```

**O que altera:** nada no Firestore — só calcula e imprime quantos
atendimentos/mensagens/marcadores de dedup SERIAM escritos.

### 4.4 — Execução real (escreve só nas coleções novas)

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=execute \
  --snapshot=<backup reconciliado> \
  --confirm=CONFIRMO-PRODUCAO
```

**O que altera:** cria/sobrescreve documentos em `attendances_v2`,
`agentChats_v2_{deskId}` e `whatsappMessageDedup`. **Nunca toca em
`appState/main`** — o documento único continua existindo, inalterado, como
histórico. Idempotente: pode rodar de novo com segurança (ver Recuperação
abaixo).

### 4.5 — Verificar integridade

```bash
npx tsx migrations/run-production-migration.ts \
  --mode=verify \
  --snapshot=<o mesmo backup usado no 4.4> \
  --confirm=CONFIRMO-PRODUCAO
```

**O que altera:** nada — lê de volta as coleções novas e compara contra o
snapshot original. **Só prosseguir para o Passo 5 (deploy) com `"ok": true`
aqui** — é o que evita o cenário "código novo, coleções incompletas"
descrito no topo deste documento.

### 4.6 — Recuperação em caso de falha

- **Erros em `attendances`/`agentChats` (fase `errors` do 4.4):** a função é
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
  irrecuperável, **não prosseguir para o Passo 5**: sem o deploy, a
  aplicação continua funcionando exatamente como antes (lendo/escrevendo o
  documento único), sem nenhuma perda. O pior caso é "as coleções novas
  ficam incompletas", nunca "dado real perdido" — e o código que leria delas
  simplesmente ainda não foi implantado.

### 4.7 — Manter o modo de manutenção ativo

**Diferente de uma versão anterior deste procedimento: NÃO desativar
`MAINTENANCE_MODE_WRITES_BLOCKED` aqui.** Manter as gravações bloqueadas até
o Passo 5 (deploy) e o Passo 6 (confirmar tráfego) terminarem — isso fecha
de vez a janela entre "migração verificada" e "código novo no ar": nenhuma
gravação nova pode acontecer no documento único nesse meio-tempo, então não
há como o Passo 4.5 ficar desatualizado antes do deploy assumir.

---

## Passo 5 — Deploy do código (durabilidade + troca para coleções)

**Só rodar depois do Passo 4.5 confirmar `"ok": true`.**

```bash
cd webapp-v2
gcloud run deploy castros-interiores \
  --source . \
  --region southamerica-east1 \
  --project gen-lang-client-0378581840
```

Builda pelo `Dockerfile` existente (Cloud Build) e publica uma revisão nova.
Sem `--update-env-vars`, herda as variáveis já configuradas na revisão atual
(inclusive `MAINTENANCE_MODE_WRITES_BLOCKED=1` do Passo 4.1, ainda ativa de
propósito, e as atualizadas no Passo 3).

**O que altera:** publica uma revisão nova do Cloud Run, com o código que
lê/escreve `attendances`/`agentChats` das coleções novas em vez do documento
único. Não toca em dados por si só.

**Antes de rodar, anotar a revisão atual (para o rollback do Passo 8):**
```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="value(status.latestReadyRevisionName)"
```

---

## Passo 6 — Confirmar tráfego e desativar a manutenção

```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="table(status.traffic[].revisionName,status.traffic[].percent)"
```

Só prosseguir com **100% numa única revisão** — a recém-publicada (ainda com
`MAINTENANCE_MODE_WRITES_BLOCKED=1`, gravações bloqueadas). Depois de
confirmado, aguardar 2–3 minutos de margem para requisições já aceitas pela
revisão antiga terminarem, e só então desativar a manutenção:

```bash
gcloud run services update castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --remove-env-vars MAINTENANCE_MODE_WRITES_BLOCKED
```

Confirmar 100% de tráfego mais uma vez nesta revisão final (mesmo comando
acima) antes de considerar a janela encerrada.

**O que altera:** a primeira parte é só leitura. A segunda publica mais uma
revisão (mesmo código, sem a variável de manutenção) e libera gravações de
verdade — agora já lendo/escrevendo das coleções novas.

---

## Passo 7 — Validação com mensagem inédita

**Não reutilizar o payload de teste da Meta** (`ABGGFlA5Fpa`) — já
investigado nesta sessão, é um payload fixo reenviado pelo botão "Testar" do
painel da Meta, não prova nada sobre uma mensagem nova de verdade.

1. **Enviar uma mensagem real** de um número de WhatsApp que nunca falou com
   o número comercial, com texto único (ex.: incluir a hora atual).
2. **Log do Cloud Run:**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="castros-interiores" AND httpRequest.requestUrl:"whatsapp"' \
     --project gen-lang-client-0378581840 --limit 5 \
     --format="table(timestamp,httpRequest.status,textPayload)"
   ```
3. **Diagnóstico da aplicação:**
   ```bash
   curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics" \
     | python3 -m json.tool
   ```
   Conferir `recentEvents[0]`.
4. **Firestore direto** (fonte de verdade — buscar pelo fragmento único do
   texto enviado, não por um id fixo). Primeiro gerar um novo backup (o
   script já imprime o caminho exato em "Salvo em: ..."):
   ```bash
   npx tsx migrations/backup-production.ts \
     --out=$HOME/backups/castros/appstate_post_validacao_$(date +%Y%m%dT%H%M%S).json
   ```
   O backup agora reflete o documento único (que **não deve mais ganhar**
   `attendances`/`agentChats` novos a partir daqui — conferir que o
   `attendances`/`agentChats` deste backup não mudou desde o Passo 4). Para
   achar a mensagem de verdade, ler direto das coleções:
   ```bash
   curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/store" \
     | python3 -c "
import json, sys
d = json.load(sys.stdin)
fragment = 'FRAGMENTO'
found = None
for desk_id, messages in (d.get('agentChats') or {}).items():
    for m in messages or []:
        if fragment in (m.get('text') or ''):
            found = (desk_id, m)
if not found:
    print('Mensagem com esse fragmento NAO encontrada.')
else:
    desk_id, m = found
    att_id = m.get('attendanceId')
    att = next((a for a in (d.get('attendances') or []) if a.get('id') == att_id), None)
    print(f'Mensagem encontrada na mesa {desk_id!r}, attendanceId={att_id}')
    print('Atendimento:', 'ENCONTRADO' if att else 'NAO ENCONTRADO')
    if att:
        print(' attendanceNumber:', att.get('attendanceNumber'))
"
   ```
   (substituir `FRAGMENTO` pelo trecho único do texto enviado no item 1).
5. **Interface:** abrir o app em produção, Atendimentos, localizar o
   atendimento novo, abrir a conversa, confirmar o texto.
6. **Sobrevivência a reinício (agora também confirma a restauração pelas
   coleções, não só o cache local):**
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --update-labels=persistence-check=$(date +%s)
   ```
   Esperar 100% de tráfego na revisão nova (Passo 6) e repetir os itens 3 e
   5 acima. Se a mensagem e o atendimento continuam lá, a persistência pelas
   coleções está confirmada ponta a ponta em produção.
7. **Conferir que NÃO apareceu nenhum `ALERTA` no log** (ver Passo 4 do
   topo) desde o deploy:
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="castros-interiores" AND textPayload:"ALERTA"' \
     --project gen-lang-client-0378581840 --limit 5 \
     --format="table(timestamp,textPayload)"
   ```
   Se aparecer algo, **parar e investigar antes de liberar o sistema para
   uso normal** — indica que alguma instância subiu com as coleções vazias.

---

## Passo 8 — Rollback

```bash
gcloud run services update-traffic castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --to-revisions $PREVIOUS_REVISION=100
```
(valor anotado no Passo 5). Imediato, não apaga dado nenhum gravado nesse
meio-tempo.

**Importante: rollback traz de volta o código antigo, que lê/escreve o
documento único, não as coleções.** Qualquer atendimento/mensagem criado
DEPOIS do deploy do Passo 5 (já gravado só nas coleções novas) **ficaria
invisível** para a revisão antiga até uma migração/deploy futuros. Por isso:
- Se o rollback for necessário por um problema **não relacionado** a dados
  (ex.: erro de outra rota), avaliar se dá para corrigir e reimplantar em
  vez de reverter, especificamente por causa dessa janela.
- Se o rollback for mesmo necessário com dados novos já só nas coleções,
  documentar quais atendimentos/mensagens foram criados entre o Passo 5 e o
  rollback (via `GET /api/store` da revisão nova, antes de desligá-la) —
  eles precisarão ser migrados manualmente de volta ao documento único, ou
  esperar até a próxima tentativa de deploy desta mesma revisão.

Isto é mais delicado que o rollback de uma troca só de durabilidade (versão
anterior deste documento) — reforça por que o Passo 4.5 (verificação de
integridade) e o Passo 7 (validação) não devem ser pulados antes de liberar
o sistema para uso normal.

---

## Limitações que continuam depois deste procedimento

- **Merge só no primeiro nível de campos** — duas edições concorrentes
  dentro do MESMO objeto aninhado do MESMO atendimento ainda podem colidir
  (ver `README.md`); `set(..., {merge:true})` do Firestore faz merge raso,
  não recursivo.
- **Leitura completa da coleção de atendimentos dentro da transação do
  webhook** — para casar por telefone um cliente que já tem atendimento,
  `claimWhatsAppMessagesTransactionally` lê TODOS os atendimentos a cada
  mensagem nova processada (necessário porque o casamento é por sufixo de
  telefone, não uma igualdade indexável pelo Firestore). Não testado com o
  volume real de produção — pode ficar mais lento/contencioso à medida que
  a base de atendimentos cresce. Otimização futura declarada, não resolvida
  aqui: um índice próprio por telefone normalizado.
- **Reivindicação sem gravação correspondente (janela estreita)** — se o
  processo morrer entre reivindicar um `externalMessageId`
  (`whatsappMessageDedup`) e a transação que grava a mensagem/atendimento
  comitar, essa mensagem fica marcada como "já reivindicada" e é descartada
  silenciosamente numa reentrega futura. Aceito explicitamente em troca de
  nunca mais criar atendimento duplicado sob concorrência real (ver
  comentário em `claimWhatsAppMessagesTransactionally` — uma tentativa
  anterior de "recuperar" esse caso automaticamente foi testada e causava
  duplicatas sob concorrência verdadeira). Reconciliação periódica
  (comparar `whatsappMessageDedup` contra as mensagens reais e reprocessar
  órfãos antigos) fecharia isso — não implementada.
- **Cobertura de teste**: a troca para coleções foi testada ponta a ponta
  contra o emulador oficial nesta revisão (ver "O que foi testado" no
  topo), incluindo concorrência real — mas com dados sintéticos pequenos,
  não o volume de produção.
- **PITR desativado** (confirmado nesta sessão) — sem recuperação automática
  por ponto no tempo se dados forem perdidos/corrompidos.
- **Rotas da API sem autenticação própria no servidor** — observado
  incidentalmente, fora do escopo deste procedimento; decisão separada sobre
  se e quando tratar.
- **Causa raiz do erro do WhatsApp (Passo 3) é a hipótese mais provável, não
  uma certeza confirmada por mim** — depende de quem tiver acesso ao painel
  da Meta confirmar qual das duas causas (token expirado vs. permissão de
  ativo) era a real, já que não tenho como inspecionar isso por aqui.
