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
exatamente o que existe só de um lado. **Antes de migrar de verdade:**

1. Fixar o serviço em uma única instância durante a janela de migração, para
   eliminar a ambiguidade de "qual instância tem o quê":
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --min-instances=1 --max-instances=1
   ```
   (reverter para os valores originais depois — consultar a configuração
   atual antes de mudar, com `gcloud run services describe castros-interiores
   --region southamerica-east1 --format="yaml(spec.template.metadata.annotations)"`,
   que é leitura, não escrita.)
2. Com uma única instância garantida, ler o `GET /api/store` dela (agora é
   a única fonte local que existe) e também ler o documento `appState/main`
   direto do Firestore (consulta somente leitura, ver mensagem anterior
   desta conversa para o comando `curl` com `gcloud auth print-access-token`).
3. Rodar `reconcileSnapshots(local, firestore)` com os dois. Se
   `identical: false`, investigar e reconciliar manualmente (ex.: reenviar o
   que só existe localmente para o Firestore) **antes** de seguir.
4. Só com as duas fontes iguais (ou já reconciliadas) a migração deve ler o
   documento único como base confiável.

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

## Limitações declaradas destes testes

- Os testes rodam contra `fakeFirestoreClient.ts` (implementação em memória
  do mesmo contrato), não contra o emulador real do Firestore nem contra
  produção — esta sessão não tinha acesso de rede para baixar o emulador.
  Isso prova a lógica da migração e do primitivo de dedup atômico, não o
  comportamento exato do serviço real (latência, limites de transação,
  cotas, comportamento de índices).
- `reconcileSnapshots` foi testada com dados sintéticos pequenos, não com o
  volume real de produção.
- Nenhum teste aqui tocou o Firestore de produção, o `store.json` de
  produção, nem fez qualquer chamada de rede — tudo roda localmente, em
  memória, instantâneo.
