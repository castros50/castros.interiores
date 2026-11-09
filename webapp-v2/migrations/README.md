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

A garantia real não é mais apenas configuração do Cloud Run — é um
interruptor em código. `server.ts` agora lê `MAINTENANCE_MODE_WRITES_BLOCKED`:
quando igual a `"1"`, `saveStore()` lança erro sem gravar nada (nem local,
nem Firestore) e a transação do webhook (`claimWhatsAppMessagesTransactionally`)
recusa antes de qualquer chamada de rede, respondendo 503. Isso bloqueia
gravações no ponto central usado por TODAS as rotas que escrevem no
documento único, não só o webhook.

1. Ativar a manutenção (variável de ambiente do serviço) ANTES de ler
   qualquer snapshot para a migração:
   ```bash
   gcloud run services update castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --update-env-vars MAINTENANCE_MODE_WRITES_BLOCKED=1
   ```
   **Limitação declarada:** rotas `async` que chamam `saveStore()` sem seu
   próprio try/catch não recebem uma resposta de erro limpa quando a
   gravação é bloqueada — a requisição pode ficar sem resposta (travada)
   em vez de um 500 imediato, porque o Express 4 não captura automaticamente
   uma rejeição não tratada de um handler assíncrono. O BLOQUEIO DA
   GRAVAÇÃO EM SI é garantido mesmo assim (nada chega a ser escrito); o que
   não é garantido é uma resposta HTTP elegante para todo cliente que tentar
   escrever durante a janela. Por isso a comunicação ao usuário final ("não
   use o sistema durante a manutenção") continua sendo parte do
   procedimento, não um substituto para o interruptor.
2. **Confirmar que TODAS as instâncias e revisões recebendo tráfego têm a
   manutenção ativa antes de seguir — isto não é automático.** Atualizar a
   variável de ambiente cria uma REVISÃO NOVA no Cloud Run; a revisão
   ANTIGA (sem a variável) continua existindo e pode continuar recebendo
   uma fração do tráfego durante o rollout, ou indefinidamente se houver
   split de tráfego manual já configurado (ex.: um teste A/B anterior).
   Instâncias da revisão antiga nunca leem a variável nova — elas não têm
   ideia de que uma manutenção está em andamento, e continuam gravando
   normalmente. Confirmar com uma leitura (não altera nada):
   ```bash
   gcloud run services describe castros-interiores \
     --region southamerica-east1 --project gen-lang-client-0378581840 \
     --format="table(status.traffic[].revisionName,status.traffic[].percent)"
   ```
   Só seguir quando esse comando mostrar **100% numa única revisão** — a
   que acabou de ser implantada com `MAINTENANCE_MODE_WRITES_BLOCKED=1`. Se
   mostrar qualquer percentual em outra revisão, o tráfego ainda não
   terminou de migrar (ou há split manual que precisa ser removido
   primeiro com `gcloud run services update-traffic --to-latest`) — uma
   revisão antiga com tráfego > 0% significa gravações ainda possíveis por
   fora do bloqueio.
3. **Esperar a drenagem das requisições em voo na revisão antiga.** Mesmo
   depois de 100% do tráfego NOVO ir para a revisão com a manutenção,
   requisições que a revisão antiga já tinha aceitado antes do corte
   continuam executando até terminar — o Cloud Run não as interrompe.
   Esperar uma margem de segurança generosamente maior que qualquer
   requisição única deste app pode levar (o maior tempo de processamento
   conhecido é o timeout de 8s da transação do Firestore mais a rede —
   folga seria 2 a 3 minutos) antes de considerar a drenagem completa. Não
   há um comando read-only que confirme "zero instâncias antigas ainda
   vivas" com certeza absoluta — esta espera é a mitigação prática.
5. Com as gravações bloqueadas (e a drenagem esperada), ler o `GET /api/store` de uma instância (as
   leituras continuam funcionando normalmente) e também ler o documento
   `appState/main` direto do Firestore (consulta somente leitura — ver a
   seção de backup abaixo para o comando exato). Como nada pode mais ser
   escrito, os dois devem corresponder ao estado final e estável — não há
   mais janela de corrida entre a leitura do snapshot e a migração.
6. Rodar `reconcileSnapshots(local, firestore)` com os dois. Se
   `identical: false`, investigar (algo pode ter sido gravado um instante
   antes da manutenção entrar em vigor) e reconciliar manualmente (ex.:
   reenviar o que só existe localmente para o Firestore) **antes** de
   seguir.
7. **Reconciliar-e-repetir (defesa adicional, não a garantia principal
   agora):** com o interruptor de manutenção ativo e o tráfego confirmado
   100% na revisão nova, nenhuma gravação nova deveria acontecer — mas,
   dada a limitação declarada no passo 1 (requisições `async` sem
   try/catch próprio podem já ter lido um snapshot ANTES de `saveStore()`
   recusar), vale reler o documento `appState/main` do Firestore MAIS UMA
   VEZ depois de rodar `runMigration` de verdade e rodar
   `reconcileSnapshots` entre esse novo snapshot e o snapshot usado como
   base. Se houver qualquer diferença, rode `runMigration` de novo com o
   snapshot atualizado — `runMigration` é idempotente (ver seção de
   Recuperação). Repita até duas leituras consecutivas saírem idênticas.
8. Só com as duas fontes iguais (ou já reconciliadas, e o ciclo do passo 7
   convergido) a migração deve ser considerada concluída. Desativar
   `MAINTENANCE_MODE_WRITES_BLOCKED` só depois disso.

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

## Correção da sobrescrita pelas outras rotas (revisão seguinte, mesma sessão)

O parágrafo acima ("~100 rotas ainda usam `.set()` comum") foi corrigido
por código, não só documentado como risco: `saveStore()` (usada por
praticamente todas as rotas que não são o webhook) agora também grava via
transação — `persistStoreKeysTransactionally`. A diferença chave: em vez de
sobrescrever o documento inteiro com a cópia local (possivelmente
desatualizada) de quem chamou, `loadStore()` registra um snapshot
"pristine" de como o store estava no momento da leitura, e `saveStore()`
compara contra ele para saber EXATAMENTE quais chaves de topo (`attendances`,
`settings`, `agentChats`, etc.) aquela chamada específica mudou. A
transação lê o documento FRESCO do Firestore e só sobrescreve essas chaves
— uma rota que só mexe em `settings` nunca mais pode apagar por cima
`attendances`/`agentChats`, porque nem toca nessas chaves no documento
fresco.

Testado contra o emulador real: 8 rodadas de webhook (cria atendimento) e
`PUT /api/settings` (muda só `cityState`) disparadas **verdadeiramente
concorrentes** (mesma chamada de shell, `&` + `wait`) — resultado: as 8
mensagens do WhatsApp E a atualização de configurações coexistem,
nenhuma sobrescreveu a outra.

**Limitação que permanece, agora menor e específica:** a granularidade é
por CHAVE DE TOPO, não por item dentro dela. Duas rotas que mudam a MESMA
chave ao mesmo tempo (ex.: duas edições concorrentes de atendimentos
diferentes, ambas tocando `attendances`) ainda podem ter uma sobrescrever
parte da mudança da outra dentro dessa chave — isso só se fecha de verdade
com granularidade por documento (a migração para coleções) ou convertendo
cada rota para sua própria transação cirúrgica (o que já foi feito
especificamente para o webhook, a rota de maior risco).

## Interruptor de manutenção para a janela de migração (mesma revisão)

`MAINTENANCE_MODE_WRITES_BLOCKED=1` (variável de ambiente do serviço)
bloqueia gravações de verdade — não é mais só uma recomendação de
configuração do Cloud Run. Testado contra o emulador real: com a variável
ativa, o webhook responde 503 em ~30ms (sem nem tentar a rede) e
`PUT /api/settings` responde 500 (gravação recusada) — e nada foi escrito
em nenhum dos dois casos. Leituras (`GET /api/store`) continuam funcionando
normalmente. Ver a seção "Controle de gravações durante a janela" acima
para o procedimento completo (incluindo a verificação de tráfego por
revisão) e a limitação declarada (rotas assíncronas sem try/catch próprio
podem não receber uma resposta HTTP limpa, embora a gravação em si fique
sempre bloqueada).

**Tarefas automáticas também são bloqueadas.** `POST /api/tasks/process-due`
(o alvo do gatilho externo, tipicamente Cloud Scheduler, que mantém a fila
de tarefas em segundo plano avançando — ex.: resposta automática do
WhatsApp) agora checa a manutenção ANTES de executar qualquer tarefa
devida, não só antes de salvar o resultado — isso evita que uma tarefa com
efeito colateral externo real (enviar uma mensagem) chegue a executar sem
conseguir registrar que executou. Confirmado por leitura de código: esta
rota e o próprio `/api/webhooks/whatsapp` são os ÚNICOS dois pontos de
entrada deste app que fazem gravação sem uma requisição HTTP explícita de
um usuário (não há `setInterval` nem outro laço autônomo gravando dados no
processo) — ambos cobertos.

**Gravações já em andamento no momento em que a manutenção é ativada NÃO
são abortadas.** O interruptor é checado no INÍCIO de `saveStore()`/da
transação do webhook — uma transação que já passou dessa checagem e está
em andamento quando a variável muda continua até o fim normalmente. Como a
variável de ambiente só existe em instâncias da revisão NOVA (nasce com o
container, não pode ser alterada em uma instância já rodando), isto só é
relevante entre o início e o fim de UMA ÚNICA requisição que por acaso
esteja em andamento bem no instante do corte de tráfego — janela de poucos
segundos no máximo, coberta pelo tempo de drenagem do passo 3 do
procedimento acima.

## Correção: merge por CAMPO dentro do MESMO atendimento (revisão seguinte)

A versão anterior deste documento dizia que fechar a corrida dentro do
MESMO atendimento exigia "a migração ou transação por rota". Isso estava
impreciso e foi corrigido: **migrar para coleções, por si só, não resolve
esse caso.** Trocar o documento único por um documento por atendimento só
muda o alcance de um `.set()` cego (de "todo o app" para "um atendimento")
— se a escrita daquele um documento continuar sendo um `.set()` que
substitui o registro inteiro, duas edições concorrentes do MESMO
atendimento colidem exatamente como colidiam antes, só que num raio menor.
O que fecha essa corrida é merge por campo DENTRO de uma transação — uma
técnica independente de documento único vs. coleções, que já foi
implementada e testada aqui, sem esperar a migração:

`computeStoreDiff` agora calcula, para cada atendimento atualizado, só os
CAMPOS de primeiro nível que mudaram desde o snapshot "pristine" (não o
registro inteiro) — e `persistStoreKeysTransactionally` mescla só esses
campos por cima do registro FRESCO lido na transação. Testado contra o
emulador oficial: duas rotas editando CAMPOS DIFERENTES do MESMO
atendimento (`reportedDefects` numa, `desiredService` na outra),
3 rodadas verdadeiramente concorrentes — as duas mudanças sobreviveram.

**Limite que permanece, agora preciso e menor:** o merge para no PRIMEIRO
NÍVEL de campos do atendimento. Um objeto aninhado (`budget`, `opinion`,
`foamInspection`, etc.) que mudou é tratado como um bloco só — duas edições
concorrentes tocando campos DIFERENTES dentro do MESMO objeto aninhado
(ex.: uma muda `budget.sellingPriceCents`, outra muda
`budget.paymentConditions`, no mesmo atendimento) ainda colidem. Ir mais
fundo exigiria merge recursivo, inclusive soldando arrays internos
(`budget.items`, `proposals`) pelo próprio id — mesma técnica, mais uma
camada, fora do escopo desta correção. E, claro, duas edições que mudam
exatamente o MESMO campo para valores diferentes continuam sendo uma
decisão de negócio (qual valor vale?), não um bug de concorrência — última
escrita vence, como em qualquer sistema sem resolução de conflito
assistida por humano.

## O que ainda não está fechado

- Migrar para coleções continua sendo o único jeito de resolver o limite de
  tamanho do documento (99,7% do limite) de forma permanente — os fixes
  acima tornam a escrita mais segura, não menor, e não dependem da
  migração para funcionar.
- Merge recursivo dentro de objetos aninhados do atendimento (ver acima).
- O merge por item/campo de `agentChats` e `attendances` foi testado contra
  o emulador oficial para o caminho do webhook e para `PUT /api/attendances/:id`
  especificamente — não para toda rota que toca essas estruturas (ex.: a
  rota principal de chat chama a API da Anthropic, fora do escopo dos
  testes rápidos feitos aqui). A técnica é a mesma em todos os casos
  (passa por `saveStore`/`computeStoreDiff` igual), mas não foi exercitada
  ponta a ponta em cada rota individualmente — limitação de cobertura de
  teste declarada, não um problema conhecido.
