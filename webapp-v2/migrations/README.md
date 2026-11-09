# Migração do Firestore: documento único → coleções

**Status: preparada, NÃO executada.** Nada neste diretório é chamado por
`server.ts` nem por nenhum script do `package.json`. É código isolado,
testado contra um fake em memória (ver `firestoreCollectionsMigration.selftest.ts`),
pronto para ser revisado e, só então, executado manualmente contra produção
em um procedimento à parte — nunca como efeito colateral de um deploy normal.

## Por que migrar

O documento único `appState/main` chegou a 1.045.502 de 1.048.576 bytes
(99,7% do limite por documento do Firestore) em produção, em 09/11/2026.
Acima do limite, toda gravação é rejeitada. Coleções por entidade (um
documento por atendimento, por mensagem) não têm esse teto agregado.

## Por que isso também resolve concorrência entre instâncias

Hoje, duas instâncias do Cloud Run processando a mesma mensagem ao mesmo
tempo fazem "ler o documento inteiro, procurar o ID, escrever o documento
inteiro de volta" — uma corrida clássica de read-modify-write, sem nenhuma
garantia de atomicidade entre a leitura e a escrita. A migração introduz
`whatsappMessageDedup/{externalMessageId}`, escrito com `.create()` (que o
Firestore rejeita atomicamente se o documento já existir) em vez de `.set()`
— isso fecha a corrida de verdade, não só na prática: é uma garantia do
próprio serviço, testada em `firestoreCollectionsMigration.selftest.ts`
(teste 4, duas chamadas concorrentes com `Promise.all`).

## Antes de decidir a fonte do backup — o ponto mais importante

**Um único `GET /api/store` não representa necessariamente todos os dados
atuais.** Sob o código anterior a esta sessão (antes dos commits
`a64d2ae`/`c5dc1f1`/`7a852af`), uma instância podia ter gravado algo
localmente que nunca chegou ao Firestore. Isso significa que, hoje, pode
existir uma instância ainda rodando com dados que **não estão** no
documento único do Firestore — migrar a partir só do Firestore poderia
*perder* esses dados silenciosamente.

`reconcileSnapshots()` (ver teste 5 do self-test) existe exatamente para
isso: compara um snapshot local com o snapshot do Firestore e aponta
exatamente o que existe só de um lado.

### Correção: `min-instances=1` NÃO impede concorrência

Uma versão anterior deste documento recomendava só `min-instances=1
--max-instances=1` como se isso eliminasse concorrência durante a janela de
migração. Isso está errado e foi corrigido: o Cloud Run, por padrão, define
`--concurrency=80` — ou seja, mesmo com UMA ÚNICA instância, até 80
requisições podem ser despachadas a ela SIMULTANEAMENTE, intercaladas pelo
event loop assíncrono do Node. Fixar o número de instâncias só elimina a
ambiguidade de "qual instância tem o quê" entre processos diferentes — não
serializa as requisições dentro da mesma instância.

**Controle de gravações durante a janela (como fazer de verdade):**

1. Fixar o serviço em uma única instância **e forçar concorrência 1**, para
   que o próprio Cloud Run NÃO despache uma segunda requisição à instância
   antes da primeira responder — isso sim serializa as requisições HTTP de
   verdade:
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --min-instances=1 --max-instances=1 --concurrency=1
   ```
   (reverter para os valores originais depois — consultar a configuração
   atual antes de mudar, com `gcloud run services describe castros-interiores
   --region southamerica-east1 --format="yaml(spec.template.metadata.annotations)"`,
   que é leitura, não escrita.) Isso cobre a grande maioria das gravações do
   app (todas as rotas HTTP comuns), mas **não é uma garantia absoluta**:
   uma sincronização em segundo plano já disparada por uma requisição
   anterior (`saveStore()` é fire-and-forget) ainda pode terminar depois,
   em paralelo com a próxima requisição já serializada. Por isso o passo 3
   (reconciliar-e-repetir) abaixo é a garantia real, não a configuração do
   Cloud Run por si só.
2. Com uma única instância e concorrência 1 em vigor, ler o `GET /api/store`
   dela (agora é a única fonte local que existe) e também ler o documento
   `appState/main` direto do Firestore (consulta somente leitura — ver a
   seção de backup abaixo para o comando exato).
3. Rodar `reconcileSnapshots(local, firestore)` com os dois. Se
   `identical: false`, investigar e reconciliar manualmente (ex.: reenviar o
   que só existe localmente para o Firestore) **antes** de seguir.
4. **Reconciliar-e-repetir (a garantia real contra escritas durante a
   janela):** depois de rodar `runMigration` de verdade (passo 3 do
   procedimento abaixo), relia o documento `appState/main` do Firestore MAIS
   UMA VEZ e rode `reconcileSnapshots` entre esse novo snapshot e o snapshot
   que foi usado como base da migração. Se houver qualquer diferença (uma
   gravação realmente aconteceu durante a janela, apesar da concorrência 1),
   rode `runMigration` de novo com o snapshot atualizado — `runMigration` é
   idempotente (ver seção de Recuperação), então repetir é seguro. Repita
   esse ciclo até duas leituras consecutivas do Firestore saírem idênticas
   (nenhuma gravação nova aconteceu entre elas) — só então a migração está
   genuinamente completa e estável, não apenas "rodou uma vez sem erro".
5. Só com as duas fontes iguais (ou já reconciliadas, e o ciclo do passo 4
   convergido) a migração deve ser considerada concluída.

## Backup antes de migrar

Exportar o documento inteiro antes de qualquer escrita nas coleções novas:
```bash
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://firestore.googleapis.com/v1/projects/gen-lang-client-0378581840/databases/(default)/documents/appState/main" \
  -o appstate_main_backup_$(date +%Y%m%dT%H%M%S).json
```
(leitura, não apaga nem altera nada; salva uma cópia local do estado exato
antes da migração, para comparação e rollback.)

## Procedimento (quando for executar, fora desta sessão)

1. Backup (acima) + reconciliação de fontes (acima).
2. `runMigration(client, snapshot, { dryRun: true })` — confere as contagens
   batem com o que se espera antes de escrever qualquer coisa.
3. `runMigration(client, snapshot, { dryRun: false })` — escreve só nas
   coleções NOVAS (`attendances_v2`, `agentChats_v2_*`,
   `whatsappMessageDedup`). O documento único (`appState/main`) nunca é
   tocado por esta função — continua existindo, inalterado, como rede de
   segurança.
4. `verifyMigrationIntegrity(client, snapshot)` — lê de volta as coleções
   novas e compara contra o snapshot original. Só seguir se `report.ok`.
5. **Só depois de (4) passar** trocar `persistStoreToFirestore`/
   `restoreStoreFromFirestoreIfNeeded` em `server.ts` para ler/escrever das
   coleções novas em vez do documento único — essa troca de código em si
   não está preparada neste diretório (é a próxima etapa, só depois de uma
   migração real e verificada).
6. Manter o documento único intacto por um período de segurança antes de
   considerar removê-lo.

## Recuperação

`runMigration` é idempotente: pode ser re-executada quantas vezes for
preciso depois de uma falha parcial (atendimentos/mensagens usam `.set()`,
que sobrescreve com o mesmo valor; marcadores de dedup usam `.create()` e
simplesmente contam `dedupMarkersAlreadyPresent` para os que já existem, sem
tratar isso como erro). `verifyMigrationIntegrity` sempre diz exatamente o
que falta. Teste 3 do self-test simula essa falha parcial e confirma a
retomada.

## Testes contra o emulador OFICIAL do Firestore

Numa revisão seguinte desta mesma sessão, o emulador oficial (pacote
`firebase-tools`, `cloud-firestore-emulator-v1.22.0.jar`) foi baixado e
rodado com sucesso localmente — a limitação de rede relatada antes não se
confirmou nesta tentativa. `firestoreCollectionsMigration.emulatortest.ts`
roda os mesmos cenários de `firestoreCollectionsMigration.selftest.ts`
contra o serviço real (`npx tsx migrations/firestoreCollectionsMigration.emulatortest.ts core`
com `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`), com resultado **16/16
passando**:
- Migração + verificação de integridade (positiva e negativa) contra o
  emulador real.
- Recuperação após falha parcial real (não simulada em memória).
- Concorrência real: 10 chamadas `Promise.all` disputando o mesmo
  `externalMessageId` contra o serviço de verdade — exatamente 1 reivindica.
- Falha real de conexão (emulador parado de propósito) seguida de
  retentativa com o emulador religado — ver limitação abaixo sobre o tempo
  de falha.

## Limitações declaradas destes testes

- `firestoreCollectionsMigration.selftest.ts` roda contra
  `fakeFirestoreClient.ts` (implementação em memória do mesmo contrato) —
  mais rápido para iterar a lógica pura. `firestoreCollectionsMigration.emulatortest.ts`
  roda os mesmos cenários contra o emulador oficial de verdade (ver acima)
  — ambos existem, use o do emulador como evidência principal.
- **Achado de teste, não só limitação:** uma tentativa de gravação contra
  um Firestore inacessível NÃO falhou rápido nesta sandbox (ECONNREFUSED
  nem apareceu em bem mais de 60 segundos, com duas abordagens diferentes)
  — por isso o código de produção (`claimWhatsAppMessagesTransactionally`
  em `server.ts`) nunca confia em uma falha rápida da rede: ele sempre
  corre contra um timeout de 8s em `Promise.race`. Isso foi comprovado
  diretamente: com o emulador real parado, a chamada ficou presa além do
  timeout de teste, e só o timeout de código (não a rede) encerrou a
  espera com segurança (ver teste `[E4a]`).
- `reconcileSnapshots` foi testada com dados sintéticos pequenos, não com o
  volume real de produção.
- Nenhum teste aqui tocou o Firestore de produção, o `store.json` de
  produção, nem fez qualquer chamada de rede para fora desta máquina —
  tudo roda contra o emulador local ou em memória.

## Correção do webhook em `server.ts` (fora deste diretório, mesma sessão)

A mesma revisão corrigiu `POST /api/webhooks/whatsapp` para usar uma
transação do Firestore (`claimWhatsAppMessagesTransactionally`) em vez de
"ler local, processar, sobrescrever o documento inteiro" — isso já fecha,
HOJE, sem esperar a migração para coleções, as duas falhas mais graves
revisadas nesta sessão:
1. Resultado incerto após um timeout: a transação abandonada, se terminar
   depois, relê o estado fresco no momento do commit — não sobrescreve com
   um snapshot antigo.
2. Concorrência entre instâncias/chamadas: comprovado com 20 requisições
   verdadeiramente concorrentes (duas instâncias reais de `server.ts`,
   10 chamadas cada, mesma mensagem nova) contra o emulador real — exatamente
   1 atendimento e 1 mensagem criados, as demais corretamente "duplicada"
   ou, sob contenção alta, HTTP 503 (nunca um falso sucesso nem uma
   duplicata).

**Isso NÃO substitui a migração**: continua valendo para o tamanho do
documento (99,7% do limite) e para o fato de que as ~100 outras rotas que
gravam no mesmo documento único ainda usam `.set()` comum (não
transacional) — uma escrita concorrente de QUALQUER outra rota ainda pode
sobrescrever por cima do que o webhook commitou, porque `.set()` não
participa da detecção de conflito do Firestore. Migrar para coleções reduz
o "raio de alcance" de qualquer escrita cega a um documento por
atendimento/mensagem, em vez do estado inteiro do app.
