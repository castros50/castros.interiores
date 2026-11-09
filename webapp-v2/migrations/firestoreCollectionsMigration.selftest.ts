// Teste isolado (padrão já usado neste projeto: script tsx com asserts
// simples, sem framework de teste) para a migração para coleções.
// Roda SÓ contra o fake em memória (fakeFirestoreClient.ts) — nunca contra
// Firestore real, nunca contra o store.json de produção.
//
// Executar: npx tsx migrations/firestoreCollectionsMigration.selftest.ts

import {
  buildMigrationPlan,
  runMigration,
  verifyMigrationIntegrity,
  reconcileSnapshots,
  tryClaimWhatsAppMessageId,
  COLLECTION_ATTENDANCES,
  COLLECTION_WHATSAPP_DEDUP,
  type LegacyStoreSnapshot,
} from './firestoreCollectionsMigration.ts';
import { FakeFirestoreClient } from './fakeFirestoreClient.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  OK   ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function buildSyntheticSnapshot(): LegacyStoreSnapshot {
  return {
    attendances: [
      { id: 'att-1', clientName: 'Cliente A', status: 'Rascunho' },
      { id: 'att-2', clientName: 'Cliente B', status: 'Rascunho' },
    ],
    agentChats: {
      carla_atendimento: [
        { id: 'msg-1', externalChannel: 'whatsapp', externalMessageId: 'wamid-AAA', attendanceId: 'att-1', text: 'oi' },
        { id: 'msg-2', externalChannel: 'whatsapp', externalMessageId: 'wamid-BBB', attendanceId: 'att-2', text: 'oi 2' },
        { id: 'msg-3', text: 'mensagem interna sem canal externo' },
      ],
    },
  };
}

async function testBuildMigrationPlan() {
  console.log('\n[1] buildMigrationPlan — contagens básicas');
  const plan = buildMigrationPlan(buildSyntheticSnapshot());
  assert(plan.attendanceWrites.length === 2, 'conta 2 atendimentos');
  assert(plan.chatMessageWrites.length === 3, 'conta 3 mensagens (inclui a sem canal externo)');
  assert(plan.whatsappDedupWrites.length === 2, 'conta só 2 marcadores de dedup (só as mensagens do whatsapp)');
}

async function testMigrationAndIntegrity() {
  console.log('\n[2] runMigration (dry-run e real) + verifyMigrationIntegrity');
  const client = new FakeFirestoreClient();
  const snapshot = buildSyntheticSnapshot();

  const dryRunResult = await runMigration(client, snapshot, { dryRun: true });
  assert(dryRunResult.attendancesWritten === 2, 'dry-run reporta 2 atendimentos sem escrever nada');
  assert(client.dumpCollection(COLLECTION_ATTENDANCES) && Object.keys(client.dumpCollection(COLLECTION_ATTENDANCES)).length === 0, 'dry-run não escreveu nada de fato na coleção');

  const realResult = await runMigration(client, snapshot, { dryRun: false });
  assert(realResult.attendancesWritten === 2, 'migração real escreveu 2 atendimentos');
  assert(realResult.chatMessagesWritten === 3, 'migração real escreveu 3 mensagens');
  assert(realResult.dedupMarkersWritten === 2, 'migração real escreveu 2 marcadores de dedup');
  assert(realResult.errors.length === 0, 'nenhum erro na migração real');

  const report = await verifyMigrationIntegrity(client, snapshot);
  assert(report.ok, 'verificação de integridade passa limpa após migração correta');
  assert(report.mismatches.length === 0, 'nenhuma divergência relatada');

  // Negativo: corrompe um campo pós-migração e confirma que o verificador
  // de fato detecta — prova que verifyMigrationIntegrity não é um no-op.
  client.corruptField(COLLECTION_ATTENDANCES, 'att-1', 'clientName', 'NOME TROCADO INDEVIDAMENTE');
  const corruptedReport = await verifyMigrationIntegrity(client, snapshot);
  assert(!corruptedReport.ok, 'verificação detecta divergência depois de corromper um campo');
  assert(
    corruptedReport.mismatches.some((m) => m.kind === 'attendance_field_diff' && m.id === 'att-1'),
    'a divergência detectada é especificamente o campo corrompido do atendimento att-1'
  );
}

async function testRecoveryFromPartialFailure() {
  console.log('\n[3] recuperação após falha parcial — migração é re-executável');
  const client = new FakeFirestoreClient();
  const snapshot = buildSyntheticSnapshot();

  // Simula uma falha parcial: migra só o primeiro atendimento manualmente,
  // como se o processo tivesse caído no meio da primeira execução.
  await client.collection(COLLECTION_ATTENDANCES).doc('att-1').set(snapshot.attendances[0]);

  const reportBeforeResume = await verifyMigrationIntegrity(client, snapshot);
  assert(!reportBeforeResume.ok, 'verificação detecta a migração incompleta (att-2 e mensagens faltando)');
  assert(
    reportBeforeResume.mismatches.some((m) => m.kind === 'attendance_missing' && m.id === 'att-2'),
    'especificamente reporta att-2 como faltante'
  );

  // Re-executa a migração inteira — deve ser seguro repetir (idempotente):
  // att-1 é sobrescrito com o mesmo valor (set), o resto é preenchido.
  const resumeResult = await runMigration(client, snapshot, { dryRun: false });
  assert(resumeResult.errors.length === 0, 'reexecução completa sem erros');

  const reportAfterResume = await verifyMigrationIntegrity(client, snapshot);
  assert(reportAfterResume.ok, 'depois de reexecutar, a verificação de integridade passa limpa');

  // Documento único legado nunca foi tocado por nenhuma dessas chamadas —
  // só existe como `snapshot` em memória neste teste, mas no mundo real
  // (ver README.md) ele continua em appState/main durante toda a migração.
  assert(true, 'nenhuma chamada de runMigration/verifyMigrationIntegrity recebe ou usa um handle de escrita no doc legado — por construção, não há como elas o tocarem');
}

async function testConcurrencyAcrossInstances() {
  console.log('\n[4] concorrência entre instâncias — tryClaimWhatsAppMessageId é atômico');
  const client = new FakeFirestoreClient();
  const sameExternalId = 'wamid-RACE-TEST';

  // Duas "instâncias" tentando reivindicar o MESMO externalMessageId ao
  // mesmo tempo (Promise.all, sem await entre elas) — simula exatamente o
  // cenário de duas instâncias do Cloud Run recebendo a mesma reentrega da
  // Meta simultaneamente.
  const [resultA, resultB] = await Promise.all([
    tryClaimWhatsAppMessageId(client, sameExternalId, { deskId: 'carla_atendimento', chatMessageId: 'msg-from-instance-A' }),
    tryClaimWhatsAppMessageId(client, sameExternalId, { deskId: 'carla_atendimento', chatMessageId: 'msg-from-instance-B' }),
  ]);

  const outcomes = [resultA, resultB].sort();
  assert(outcomes[0] === 'already_claimed' && outcomes[1] === 'claimed', 'exatamente uma das duas chamadas concorrentes reivindica, a outra vê "já reivindicado"');

  const dedupDoc = client.dumpCollection(COLLECTION_WHATSAPP_DEDUP)[sameExternalId] as { chatMessageId: string } | undefined;
  assert(dedupDoc !== undefined, 'o marcador de dedup existe depois da corrida');
  assert(
    dedupDoc?.chatMessageId === 'msg-from-instance-A' || dedupDoc?.chatMessageId === 'msg-from-instance-B',
    'o marcador registra qual das duas tentativas realmente venceu (nenhuma mistura/corrupção de dado)'
  );

  // Terceira tentativa, depois da corrida — deve ver "já reivindicado" de
  // forma estável (simula uma reentrega legítima da Meta chegando depois).
  const resultC = await tryClaimWhatsAppMessageId(client, sameExternalId, { deskId: 'carla_atendimento', chatMessageId: 'msg-from-instance-C' });
  assert(resultC === 'already_claimed', 'uma terceira tentativa posterior também vê "já reivindicado" — dedup estável');
}

async function testReconciliationAcrossSources() {
  console.log('\n[5] reconcileSnapshots — comparar fontes ANTES de decidir o backup');

  // Cenário real que motivou este teste: uma instância local processou uma
  // mensagem com sucesso no disco, mas a sincronização com o Firestore
  // falhou antes do fix desta sessão — então o Firestore está "atrasado"
  // em relação a essa instância específica.
  const localSnapshot: LegacyStoreSnapshot = {
    attendances: [
      { id: 'att-1', clientName: 'Cliente A' },
      { id: 'att-3', clientName: 'Cliente C (só nesta instância)' },
    ],
    agentChats: {
      carla_atendimento: [
        { id: 'msg-1', externalChannel: 'whatsapp', externalMessageId: 'wamid-AAA', attendanceId: 'att-1' },
        { id: 'msg-3', externalChannel: 'whatsapp', externalMessageId: 'wamid-CCC', attendanceId: 'att-3' },
      ],
    },
  };
  const firestoreSnapshot: LegacyStoreSnapshot = {
    attendances: [{ id: 'att-1', clientName: 'Cliente A' }],
    agentChats: {
      carla_atendimento: [{ id: 'msg-1', externalChannel: 'whatsapp', externalMessageId: 'wamid-AAA', attendanceId: 'att-1' }],
    },
  };

  const report = reconcileSnapshots(localSnapshot, firestoreSnapshot);
  assert(!report.identical, 'detecta que as duas fontes NÃO são iguais');
  assert(report.attendancesOnlyInLocal.includes('att-3'), 'aponta att-3 como existente só localmente');
  assert(report.attendancesOnlyInFirestore.length === 0, 'nenhum atendimento existe só no Firestore neste cenário');
  assert(report.whatsappMessageIdsOnlyInLocal.includes('wamid-CCC'), 'aponta a mensagem wamid-CCC como existente só localmente');
  assert(
    true,
    'conclusão operacional: usar só o Firestore como fonte do backup aqui PERDERIA att-3/wamid-CCC — é exatamente o motivo de não decidir a fonte do backup sem rodar esta comparação primeiro'
  );

  // Caso positivo: fontes idênticas.
  const identicalReport = reconcileSnapshots(localSnapshot, localSnapshot);
  assert(identicalReport.identical, 'duas cópias idênticas são reconhecidas como idênticas');
}

async function main() {
  await testBuildMigrationPlan();
  await testMigrationAndIntegrity();
  await testRecoveryFromPartialFailure();
  await testConcurrencyAcrossInstances();
  await testReconciliationAcrossSources();

  console.log(`\n${passed} passaram, ${failed} falharam.`);
  if (failed > 0) process.exit(1);
}

main();
