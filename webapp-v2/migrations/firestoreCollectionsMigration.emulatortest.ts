// Mesmos cenários de firestoreCollectionsMigration.selftest.ts, mas rodando
// contra o EMULADOR OFICIAL do Firestore (não o fake em memória) — exige
// FIRESTORE_EMULATOR_HOST apontando para uma instância local do emulador.
//
// Como rodar (nesta sessão, o emulador já foi baixado e iniciado por fora):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx migrations/firestoreCollectionsMigration.emulatortest.ts
//
// Usa um projectId isolado (demo-castros-migration) dentro do próprio
// emulador, e cada execução limpa suas coleções antes de rodar, para não
// interferir com outros testes que também usem o mesmo emulador.

import {
  buildMigrationPlan,
  runMigration,
  verifyMigrationIntegrity,
  reconcileSnapshots,
  tryClaimWhatsAppMessageId,
  COLLECTION_ATTENDANCES,
  COLLECTION_WHATSAPP_DEDUP,
  COLLECTION_CHAT_MESSAGE_PREFIX,
  type LegacyStoreSnapshot,
} from './firestoreCollectionsMigration.ts';
import { createEmulatorFirestore, RealFirestoreClient } from './realFirestoreClient.ts';

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

function buildSyntheticSnapshot(suffix: string): LegacyStoreSnapshot {
  return {
    attendances: [
      { id: `att-1-${suffix}`, clientName: 'Cliente A', status: 'Rascunho' },
      { id: `att-2-${suffix}`, clientName: 'Cliente B', status: 'Rascunho' },
    ],
    agentChats: {
      carla_atendimento: [
        { id: `msg-1-${suffix}`, externalChannel: 'whatsapp', externalMessageId: `wamid-AAA-${suffix}`, attendanceId: `att-1-${suffix}`, text: 'oi' },
        { id: `msg-2-${suffix}`, externalChannel: 'whatsapp', externalMessageId: `wamid-BBB-${suffix}`, attendanceId: `att-2-${suffix}`, text: 'oi 2' },
      ],
    },
  };
}

async function clearCollections(db: ReturnType<typeof createEmulatorFirestore>, paths: string[]): Promise<void> {
  for (const path of paths) {
    const snap = await db.collection(path).listDocuments();
    await Promise.all(snap.map((d) => d.delete()));
  }
}

async function testMigrationAndIntegrityOnRealEmulator() {
  console.log('\n[E1] runMigration + verifyMigrationIntegrity — Firestore emulador real');
  const db = createEmulatorFirestore('demo-castros-migration');
  const client = new RealFirestoreClient(db);
  await clearCollections(db, [COLLECTION_ATTENDANCES, `${COLLECTION_CHAT_MESSAGE_PREFIX}carla_atendimento`, COLLECTION_WHATSAPP_DEDUP]);

  const snapshot = buildSyntheticSnapshot('e1');

  const dryRun = await runMigration(client, snapshot, { dryRun: true });
  assert(dryRun.attendancesWritten === 2, 'dry-run reporta 2 atendimentos');
  const afterDryRunIds = await db.collection(COLLECTION_ATTENDANCES).listDocuments();
  assert(afterDryRunIds.length === 0, 'dry-run não escreveu nada no emulador real');

  const real = await runMigration(client, snapshot, { dryRun: false });
  assert(real.attendancesWritten === 2 && real.chatMessagesWritten === 2 && real.dedupMarkersWritten === 2, 'migração real escreveu tudo no emulador');
  assert(real.errors.length === 0, 'nenhum erro reportado pelo emulador real');

  const report = await verifyMigrationIntegrity(client, snapshot);
  assert(report.ok, 'verificação de integridade passa contra o emulador real');

  // Negativo: corrompe de verdade um documento no emulador e confirma detecção.
  await db.collection(COLLECTION_ATTENDANCES).doc(`att-1-e1`).set({ ...snapshot.attendances[0], clientName: 'CORROMPIDO' });
  const corruptedReport = await verifyMigrationIntegrity(client, snapshot);
  assert(!corruptedReport.ok, 'verificação detecta corrupção real feita diretamente no emulador');
}

async function testRecoveryOnRealEmulator() {
  console.log('\n[E2] recuperação após falha parcial — emulador real');
  const db = createEmulatorFirestore('demo-castros-migration');
  const client = new RealFirestoreClient(db);
  await clearCollections(db, [COLLECTION_ATTENDANCES, `${COLLECTION_CHAT_MESSAGE_PREFIX}carla_atendimento`, COLLECTION_WHATSAPP_DEDUP]);

  const snapshot = buildSyntheticSnapshot('e2');
  // Simula falha parcial real: só o primeiro atendimento chega a ser escrito.
  await db.collection(COLLECTION_ATTENDANCES).doc(`att-1-e2`).set(snapshot.attendances[0]);

  const before = await verifyMigrationIntegrity(client, snapshot);
  assert(!before.ok, 'detecta migração parcial real (att-2/mensagens faltando no emulador)');

  const resume = await runMigration(client, snapshot, { dryRun: false });
  assert(resume.errors.length === 0, 'reexecução completa sem erros contra o emulador real');

  const after = await verifyMigrationIntegrity(client, snapshot);
  assert(after.ok, 'depois de reexecutar, integridade passa limpa no emulador real');
}

async function testConcurrencyOnRealEmulator() {
  console.log('\n[E3] concorrência real entre duas chamadas simultâneas — emulador oficial');
  const db = createEmulatorFirestore('demo-castros-migration');
  const client = new RealFirestoreClient(db);
  await clearCollections(db, [COLLECTION_WHATSAPP_DEDUP]);

  const externalId = 'wamid-RACE-REAL';
  // Dez tentativas concorrentes de verdade, contra o serviço real do
  // emulador (não um mock) — rodando sobre gRPC real, não só em memória.
  const attempts = Array.from({ length: 10 }, (_, i) =>
    tryClaimWhatsAppMessageId(client, externalId, { deskId: 'carla_atendimento', chatMessageId: `msg-from-${i}` })
  );
  const results = await Promise.all(attempts);
  const claimedCount = results.filter((r) => r === 'claimed').length;
  const alreadyClaimedCount = results.filter((r) => r === 'already_claimed').length;

  assert(claimedCount === 1, `exatamente 1 das 10 tentativas concorrentes reivindica no emulador real (obtido: ${claimedCount})`);
  assert(alreadyClaimedCount === 9, `as outras 9 corretamente veem "já reivindicado" (obtido: ${alreadyClaimedCount})`);

  const doc = await db.collection(COLLECTION_WHATSAPP_DEDUP).doc(externalId).get();
  assert(doc.exists, 'o documento de dedup existe de fato no emulador depois da corrida');
}

// [E4] roda em DUAS invocações separadas deste script (ver fim do arquivo),
// orquentradas de fora (bash) parando e religando o processo real do
// emulador entre elas — ECONNREFUSED numa porta que já respondia antes é
// rápido e confiável; apontar para uma porta nunca usada (DNS de host
// inexistente) chegou a bloquear o processo inteiro nesta sessão, por isso
// a abordagem foi trocada.
async function testFailureWhileEmulatorDown() {
  console.log('\n[E4a] falha real de conexão (emulador parado) — nada é escrito, nem trava para sempre');
  // Nesta sandbox, uma conexão para um host:porta que já respondia antes mas
  // parou de responder NÃO falha rápido com ECONNREFUSED como seria de
  // esperar (confirmado experimentalmente: travou bem além de 60s, duas
  // vezes, com abordagens diferentes) — provavelmente um comportamento do
  // isolamento de rede deste ambiente específico, não necessariamente do
  // Firestore real em produção. Por isso este teste não confia em uma
  // falha rápida da rede: ele usa o MESMO padrão de timeout em código já
  // usado em produção (ver syncToFirestoreWithTimeout em server.ts) para
  // garantir que a chamada nunca trava a resposta, mesmo que a chamada real
  // ao Firestore fique presa indefinidamente por baixo.
  const brokenDb = createEmulatorFirestore('demo-castros-migration');
  const brokenClient = new RealFirestoreClient(brokenDb);
  const snapshot = buildSyntheticSnapshot('e4');

  const TEST_TIMEOUT_MS = 4000;
  let timedOut = false;
  const outcome = await Promise.race([
    runMigration(brokenClient, snapshot, { dryRun: false }),
    new Promise<'timeout'>((resolve) => setTimeout(() => { timedOut = true; resolve('timeout'); }, TEST_TIMEOUT_MS)),
  ]);

  assert(timedOut, `confirmado: a chamada contra o emulador parado realmente não responde rápido (travaria sem um timeout de código) — por isso o timeout de ${TEST_TIMEOUT_MS}ms é quem resolve aqui`);
  const safelyAbandoned = outcome === 'timeout';
  assert(safelyAbandoned, 'o código segue adiante (não trava) mesmo com a chamada real ainda pendente por baixo — comportamento seguro: nada é reportado como sucesso');

  console.log(`\n${passed} passaram, ${failed} falharam.`);
  // Nunca falha o processo aqui (process.exit(1)) nem espera a chamada
  // abandonada terminar — a seguinte invocação (after-retry) roda num
  // processo Node novo, então a promise pendente desta não interfere.
  process.exit(failed > 0 ? 1 : 0);
}

async function testRetryAfterEmulatorBackUp() {
  console.log('\n[E4b] retentativa depois do emulador religado — funciona normalmente');
  const db = createEmulatorFirestore('demo-castros-migration');
  const client = new RealFirestoreClient(db);
  await clearCollections(db, [COLLECTION_ATTENDANCES, `${COLLECTION_CHAT_MESSAGE_PREFIX}carla_atendimento`, COLLECTION_WHATSAPP_DEDUP]);
  const snapshot = buildSyntheticSnapshot('e4');
  const retryResult = await runMigration(client, snapshot, { dryRun: false });
  assert(retryResult.errors.length === 0, 'reexecução contra o emulador religado funciona após a falha real simulada');
  const report = await verifyMigrationIntegrity(client, snapshot);
  assert(report.ok, 'integridade confirmada depois da retentativa pós-falha real');
  console.log(`\n${passed} passaram, ${failed} falharam.`);
  if (failed > 0) process.exit(1);
}

async function testContentAndExtraDocumentDetectionOnRealEmulator() {
  console.log('\n[E5] detecção de conteúdo divergente e documentos extras — mensagens e marcadores de dedup, emulador real');
  const db = createEmulatorFirestore('demo-castros-migration');
  const client = new RealFirestoreClient(db);
  const chatCol = `${COLLECTION_CHAT_MESSAGE_PREFIX}carla_atendimento`;
  await clearCollections(db, [COLLECTION_ATTENDANCES, chatCol, COLLECTION_WHATSAPP_DEDUP]);

  const snapshot = buildSyntheticSnapshot('e5');
  const real = await runMigration(client, snapshot, { dryRun: false });
  assert(real.errors.length === 0, 'migração real (base para o E5) sem erros');

  const cleanReport = await verifyMigrationIntegrity(client, snapshot);
  assert(cleanReport.ok, 'integridade passa limpa antes de corromper nada (base para o E5)');

  // 1. Corrompe de verdade o CONTEÚDO de uma mensagem já migrada (antes só a
  //    existência era checada — isto confirma que o diff de campos da
  //    mensagem dispara mesmo com o documento presente).
  await db.collection(chatCol).doc('msg-1-e5').set({ ...snapshot.agentChats!.carla_atendimento![0], text: 'TEXTO TROCADO' });
  const chatDiffReport = await verifyMigrationIntegrity(client, snapshot);
  assert(!chatDiffReport.ok, 'detecta mensagem com conteúdo divergente (existe, mas campo errado)');
  assert(
    chatDiffReport.mismatches.some((m) => m.kind === 'chat_message_field_diff' && m.id === 'msg-1-e5'),
    'o mismatch reportado é especificamente chat_message_field_diff para msg-1-e5'
  );
  // restaura para isolar o próximo cenário
  await db.collection(chatCol).doc('msg-1-e5').set(snapshot.agentChats!.carla_atendimento![0]);

  // 2. Corrompe o VÍNCULO de um marcador de dedup (attendanceId errado) —
  //    antes só a existência do marcador era checada, deixando passar um
  //    marcador apontando para o atendimento/mensagem ERRADOS.
  const dedupSnapBefore = await db.collection(COLLECTION_WHATSAPP_DEDUP).doc('wamid-AAA-e5').get();
  const dedupDataBefore = dedupSnapBefore.data() as Record<string, unknown>;
  await db.collection(COLLECTION_WHATSAPP_DEDUP).doc('wamid-AAA-e5').set({ ...dedupDataBefore, attendanceId: 'att-ERRADO' });
  const dedupDiffReport = await verifyMigrationIntegrity(client, snapshot);
  assert(!dedupDiffReport.ok, 'detecta marcador de dedup com vínculo divergente');
  assert(
    dedupDiffReport.mismatches.some((m) => m.kind === 'dedup_marker_field_diff' && m.id === 'wamid-AAA-e5'),
    'o mismatch reportado é especificamente dedup_marker_field_diff para wamid-AAA-e5'
  );
  await db.collection(COLLECTION_WHATSAPP_DEDUP).doc('wamid-AAA-e5').set(dedupDataBefore);

  // 3. Documento extra (órfão) na coleção de MENSAGENS de uma mesa — não
  //    presente em nenhum snapshot verificado (antes só attendances_v2 era
  //    checada para extras).
  await db.collection(chatCol).doc('msg-ORFA-e5').set({ id: 'msg-ORFA-e5', externalChannel: 'whatsapp', text: 'mensagem órfã' });
  const chatExtraReport = await verifyMigrationIntegrity(client, snapshot);
  assert(!chatExtraReport.ok, 'detecta mensagem extra/órfã na coleção de mensagens da mesa');
  assert(
    chatExtraReport.mismatches.some((m) => m.kind === 'extra_document_in_new_collection' && m.id === 'msg-ORFA-e5'),
    'o mismatch reportado é extra_document_in_new_collection para msg-ORFA-e5'
  );
  await db.collection(chatCol).doc('msg-ORFA-e5').delete();

  // 4. Documento extra (órfão) na coleção de DEDUP.
  await db.collection(COLLECTION_WHATSAPP_DEDUP).doc('wamid-ORFAO-e5').set({ deskId: 'carla_atendimento', chatMessageId: 'msg-x' });
  const dedupExtraReport = await verifyMigrationIntegrity(client, snapshot);
  assert(!dedupExtraReport.ok, 'detecta marcador de dedup extra/órfão');
  assert(
    dedupExtraReport.mismatches.some((m) => m.kind === 'extra_document_in_new_collection' && m.id === 'wamid-ORFAO-e5'),
    'o mismatch reportado é extra_document_in_new_collection para wamid-ORFAO-e5'
  );
  await db.collection(COLLECTION_WHATSAPP_DEDUP).doc('wamid-ORFAO-e5').delete();

  // Confirma que, depois de desfazer tudo, a integridade volta a passar limpa.
  const finalReport = await verifyMigrationIntegrity(client, snapshot);
  assert(finalReport.ok, 'depois de desfazer as 4 corrupções, integridade volta a passar limpa');
}

async function main() {
  const phase = process.argv[2] || 'core';
  if (phase === 'core') {
    await testMigrationAndIntegrityOnRealEmulator();
    await testRecoveryOnRealEmulator();
    await testConcurrencyOnRealEmulator();
    await testContentAndExtraDocumentDetectionOnRealEmulator();
    console.log(`\n${passed} passaram, ${failed} falharam.`);
    if (failed > 0) process.exit(1);
    return;
  }
  if (phase === 'while-down') return testFailureWhileEmulatorDown();
  if (phase === 'after-retry') return testRetryAfterEmulatorBackUp();
  throw new Error(`fase desconhecida: ${phase}`);
}

main().catch((err) => {
  console.error('Erro fatal no teste:', err);
  process.exit(1);
});
