# Deploy em produção: correções de durabilidade do WhatsApp

**Status: preparado, NÃO executado.** Nenhum comando abaixo foi rodado contra
produção nesta sessão — este arquivo documenta exatamente o que rodar, na
ordem certa, para quem for executar manualmente. Não é a migração para
coleções (ver `README.md` neste mesmo diretório, que continua preparada e
também não executada) — este procedimento só leva para produção o código já
commitado nesta branch (`a64d2ae` até `8b06a4d`): persistência no Firestore
antes de responder ao webhook, transação em vez de sobrescrita, merge por
item/campo em `attendances`/`agentChats`, e o interruptor de manutenção.
Nenhuma mudança de schema — o documento `appState/main` continua no mesmo
formato antes e depois.

Serviço: `castros-interiores`, região `southamerica-east1`, projeto
`gen-lang-client-0378581840`.

## Por que isso é urgente e por que é delicado ao mesmo tempo

Urgente: enquanto a revisão em produção for anterior a estas correções, o bug
original continua ativo (gravação podia ficar só local numa instância do
Cloud Run, sem chegar ao Firestore, sob concorrência entre instâncias).

Delicado: o documento `appState/main` foi medido em 1.045.502 de 1.048.576
bytes (99,7% do limite por documento do Firestore) em 09/11/2026. Isso NÃO é
alterado por este deploy — o deploy não encolhe o documento, só torna a
escrita mais segura. Qualquer gravação nova (inclusive a mensagem de teste do
passo de validação abaixo) pode ser a que estoura o limite. Por isso o
primeiro passo é sempre reconferir o tamanho atual, não assumir o valor acima.

## Passo 0 — Checklist antes de começar

- [ ] Terminal com `gcloud auth list` mostrando a conta certa e acesso ao
      projeto `gen-lang-client-0378581840` (Cloud Shell já usado nesta
      investigação serve).
- [ ] Um número de WhatsApp real, que **nunca tenha conversado** com o número
      comercial conectado, disponível para enviar a mensagem de teste do
      passo de validação (não usar o botão "Testar" da Meta — aquele payload
      é fixo e não prova nada novo).
- [ ] Ninguém mais operando o sistema durante a janela (não há modo de
      manutenção ativado neste procedimento — ver "Por que não ativar o
      modo de manutenção" abaixo — então evitar uso concorrente é só
      precaução, não uma garantia de código).

### Por que não ativar `MAINTENANCE_MODE_WRITES_BLOCKED` aqui

Esse interruptor (ver `README.md`) existe para a janela da migração para
coleções, onde é preciso que o documento pare de mudar por completo enquanto
se lê um snapshot para copiar. Aqui não há leitura de snapshot para copiar —
é só trocar o código que já escreve no mesmo documento, da forma de sempre.
Ativar o bloqueio aqui só impediria clientes reais de serem atendidos durante
a janela, sem nenhum benefício correspondente.

## Passo 1 — Conferir o tamanho atual do documento (leitura, não altera nada)

```bash
curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics" \
  | python3 -m json.tool
```

Olhar `firestoreBackup.bytes`, `firestoreBackup.percentUsed` e
`firestoreBackup.critical`. Se `critical: true` (acima de 1.030.000 bytes),
**parar aqui** — qualquer escrita nova (inclusive a mensagem de teste do
passo 6) pode falhar com "entity too large" antes mesmo de chegar à etapa de
validação. Nesse caso a prioridade passa a ser liberar espaço (ex.: arquivar
fotos antigas fora do documento, se houver algo assim disponível) ou
adiantar a migração para coleções, não este deploy.

## Passo 2 — Backup do estado atual (leitura, salva uma cópia local)

```bash
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://firestore.googleapis.com/v1/projects/gen-lang-client-0378581840/databases/(default)/documents/appState/main" \
  -o appstate_main_backup_pre_deploy_$(date +%Y%m%dT%H%M%S).json
```

Guardar este arquivo fora do Cloud Shell efêmero (baixar para a própria
máquina) — é o estado exato de antes do deploy, para comparação ou
restauração manual em último caso.

## Passo 3 — Registrar a revisão atual (necessário para rollback)

```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="value(status.latestReadyRevisionName)"
```

Anotar o valor retornado (ex.: `castros-interiores-00042-xyz`) — é o
`$PREVIOUS_REVISION` usado no rollback. Sem este valor anotado ANTES do
deploy, o rollback exige procurar manualmente no histórico de revisões.

Também vale conferir que hoje só existe uma revisão recebendo tráfego (sem
split já configurado por algum teste anterior):

```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="table(status.traffic[].revisionName,status.traffic[].percent)"
```

## Passo 4 — Deploy

Rodar a partir da raiz de `webapp-v2` (onde está o `Dockerfile`):

```bash
cd webapp-v2
gcloud run deploy castros-interiores \
  --source . \
  --region southamerica-east1 \
  --project gen-lang-client-0378581840
```

Isso builda pelo `Dockerfile` existente (Cloud Build) e publica uma revisão
nova. Sem `--update-env-vars`, a revisão nova herda as variáveis de ambiente
já configuradas na revisão atual (`WHATSAPP_*`, `ANTHROPIC_API_KEY`, etc.) —
nada precisa ser reconfigurado para este deploy.

## Passo 5 — Confirmar 100% do tráfego na revisão nova

```bash
gcloud run services describe castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --format="table(status.traffic[].revisionName,status.traffic[].percent)"
```

Só prosseguir quando mostrar **100% numa única revisão** — a que acabou de
subir. Se aparecer qualquer percentual na revisão antiga, o código anterior
(com o bug original) ainda pode estar processando mensagens reais — esperar
e reconferir antes de seguir. Depois de confirmado, aguardar 2–3 minutos de
margem para requisições que a revisão antiga já tinha aceitado terminarem
(mesma lógica de drenagem do `README.md`).

## Passo 6 — Validação com mensagem inédita

**Não reutilizar o payload de teste da Meta** (`ABGGFlA5Fpa`) — ele já foi
investigado nesta sessão e é um payload fixo reenviado pelo botão "Testar" da
Meta, não prova nada sobre uma mensagem real nova.

1. **Enviar uma mensagem real** de um número de WhatsApp que nunca falou com
   o número comercial, com um texto que inclua algo único (ex.: a hora
   atual), para o número conectado.

2. **Conferir no log do Cloud Run** que a requisição chegou e retornou 200:
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="castros-interiores" AND httpRequest.requestUrl:"whatsapp"' \
     --project gen-lang-client-0378581840 --limit 5 \
     --format="table(timestamp,httpRequest.status,textPayload)"
   ```

3. **Conferir no diagnóstico da própria aplicação** que o evento foi
   registrado e que o documento não entrou em estado crítico de tamanho:
   ```bash
   curl -s "https://castros-interiores-377257663620.southamerica-east1.run.app/api/whatsapp/diagnostics" \
     | python3 -m json.tool
   ```
   Olhar `recentEvents[0]` (deve ser a mensagem nova) e reconferir
   `firestoreBackup.critical`.

4. **Conferir direto no Firestore** (fonte de verdade, independente de qual
   instância atendeu a mensagem) que a mensagem e o atendimento estão
   gravados e vinculados:
   ```bash
   curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     "https://firestore.googleapis.com/v1/projects/gen-lang-client-0378581840/databases/(default)/documents/appState/main" \
     -o /tmp/appstate_post_deploy.json
   python3 - "$FRAGMENTO_UNICO_DO_TEXTO" <<'PYEOF'
import json, sys
with open('/tmp/appstate_post_deploy.json') as f:
    doc = json.load(f)

def simplify(v):
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'booleanValue' in v: return v['booleanValue']
    if 'nullValue' in v: return None
    if 'mapValue' in v: return {k: simplify(x) for k, x in v['mapValue'].get('fields', {}).items()}
    if 'arrayValue' in v: return [simplify(x) for x in v['arrayValue'].get('values', [])]
    return v

data = {k: simplify(v) for k, v in doc.get('fields', {}).items()}
fragment = sys.argv[1]
found = None
for desk_id, messages in (data.get('agentChats') or {}).items():
    for m in messages or []:
        if fragment in (m.get('text') or ''):
            found = (desk_id, m)
if not found:
    print('Mensagem com esse fragmento NÃO encontrada — ver passo 3 antes de concluir que falhou (pode ser atraso de replicação).')
else:
    desk_id, m = found
    att_id = m.get('attendanceId')
    att = next((a for a in (data.get('attendances') or []) if a.get('id') == att_id), None)
    print(f"Mensagem encontrada na mesa '{desk_id}', attendanceId={att_id}")
    print(f"Atendimento correspondente: {'ENCONTRADO' if att else 'NÃO ENCONTRADO — referência órfã, igual ao caso investigado antes'}")
    if att:
        print(f"  attendanceNumber: {att.get('attendanceNumber')}")
        print(f"  clientPhone: {att.get('clientPhone')}")
PYEOF
   ```
   Substituir `$FRAGMENTO_UNICO_DO_TEXTO` pelo trecho único enviado no passo 1.

5. **Conferir na interface**: abrir o app em produção, ir em Atendimentos,
   localizar o atendimento novo (maior `attendanceNumber`/mais recente),
   abrir a conversa e confirmar que a mensagem aparece com o texto certo.

6. **Confirmar que sobrevive a um reinício** — forçar uma revisão nova do
   Cloud Run sem mudar código (prova que o dado não está só na memória do
   contêiner que atendeu a mensagem original, e sim persistido no Firestore
   e recarregado do zero por um processo novo):
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --update-labels=persistence-check=$(date +%s)
   ```
   Esperar a nova revisão assumir 100% do tráfego (repetir o comando do
   Passo 5) e então repetir os itens 3 e 5 acima (diagnóstico + interface).
   Se a mensagem e o atendimento continuam aparecendo depois desse reinício
   forçado, a persistência está confirmada ponta a ponta.

## Rollback

Reverte o tráfego para a revisão anterior, sem rebuildar nada:

```bash
gcloud run services update-traffic castros-interiores \
  --region southamerica-east1 --project gen-lang-client-0378581840 \
  --to-revisions $PREVIOUS_REVISION=100
```

(usar o valor anotado no Passo 3). Isso é imediato e não apaga nenhum dado
gravado nesse meio-tempo — mensagens/atendimentos criados pela revisão nova
antes do rollback continuam no Firestore normalmente.

**Importante: rollback traz de volta o bug original.** A revisão anterior não
tem a persistência-antes-de-responder, nem a transação, nem o merge por
item/campo — reverter é uma decisão de emergência (ex.: a revisão nova
quebrou algo pior), não uma correção de rotina. Se o problema for só o
tamanho do documento (passo 1 crítico), rollback não resolve isso — o
documento está igualmente cheio em qualquer revisão.

Não há rollback de dados necessário neste procedimento: como não há mudança
de schema, não existe "versão antiga dos dados" para restaurar — o backup do
Passo 2 é uma rede de segurança para um cenário não esperado (ex.: alguma
gravação corrompendo o documento), não parte do fluxo normal de rollback.

## Limitações que continuam depois deste deploy

- **Tamanho do documento**: este deploy não reduz os 99,7% medidos — só a
  migração para coleções (preparada, não executada — ver `README.md`)
  resolve isso de forma permanente. Enquanto não migrar, cada gravação nova
  é candidata a estourar o limite.
- **Merge só no primeiro nível de campos**: duas edições concorrentes dentro
  do MESMO objeto aninhado do MESMO atendimento (ex.: dois campos diferentes
  de `budget` ao mesmo tempo) ainda podem colidir — ver `README.md`, seção
  "Correção: merge por CAMPO".
- **Cobertura de teste parcial**: a transação e o merge foram testados contra
  o emulador oficial especificamente para o webhook e para
  `PUT /api/attendances/:id` — não foram exercitados ponta a ponta em toda
  rota que toca `attendances`/`agentChats` (ex.: a rota principal de chat,
  que também chama a API da Anthropic).
- **Resposta HTTP sob modo de manutenção**: se o interruptor
  `MAINTENANCE_MODE_WRITES_BLOCKED` vier a ser usado numa futura migração,
  rotas assíncronas sem try/catch próprio podem não devolver uma resposta
  HTTP limpa (a gravação em si continua bloqueada de qualquer forma).
- **PITR desativado**: confirmado nesta sessão
  (`POINT_IN_TIME_RECOVERY_DISABLED`). Se o documento for perdido ou
  corrompido de novo antes da migração para coleções, não há recuperação
  automática por ponto no tempo — só o backup manual do Passo 2 (se tirado
  recentemente) ou reconstrução manual, como no caso já investigado.
- **Rotas da API sem autenticação própria no servidor**: observado
  incidentalmente nesta sessão (não foi corrigido, não estava no escopo
  pedido) — não há middleware de sessão/autenticação em `server.ts`
  protegendo as rotas `/api/*`; qualquer um que alcance a URL do Cloud Run
  pode chamá-las diretamente, inclusive rotas de escrita. Isso é
  independente da durabilidade do WhatsApp, mas vale uma decisão separada
  sobre se e quando tratar.
