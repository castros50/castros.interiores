// Leitura independente de UM atendimento (attendances_v2) direto pelo SDK do
// Firestore — não passa pela API da aplicação. Usado para diagnosticar um
// atendimento específico (ex.: criado por uma mensagem de WhatsApp recebida
// pelo webhook) sem precisar abrir o app: mostra mesa atual, status, telefone
// do cliente, histórico de handoff e o último evento de auditoria. Só leitura,
// nunca grava nada.
//
// Uso:
//   npx tsx migrations/inspect-attendance.ts --id=att-wa-XXXXXXXXXXXXX --confirm=CONFIRMO-PRODUCAO [--project=gen-lang-client-0378581840]

import { createProductionFirestore } from './productionFirestoreClient.ts';
import { COLLECTION_ATTENDANCES } from './firestoreCollectionsMigration.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

async function main() {
  const confirm = arg('confirm') || '';
  const projectId = arg('project') || 'gen-lang-client-0378581840';
  const id = arg('id');
  if (!id) {
    console.error('Uso: npx tsx migrations/inspect-attendance.ts --id=att-XXXX --confirm=CONFIRMO-PRODUCAO');
    process.exit(1);
  }

  const db = createProductionFirestore(projectId, confirm);
  const doc = await db.collection(COLLECTION_ATTENDANCES).doc(id).get();
  if (!doc.exists) {
    console.log(`Documento "${id}" não encontrado em ${COLLECTION_ATTENDANCES}.`);
    return;
  }
  const a = doc.data() as Record<string, any>;
  console.log(`ID: ${doc.id}`);
  console.log(`Número: ${a.attendanceNumber}`);
  console.log(`Cliente: ${a.clientName} | Telefone: ${a.clientPhone}`);
  console.log(`Tipo de pedido: ${a.orderType || a.requestType || '(ainda não classificado)'}`);
  console.log(`Mesa atual: ${a.currentDesk} | Status da mesa: ${a.deskStatus}`);
  console.log(`Criado em: ${a.createdAt} | Atualizado em: ${a.updatedAt}`);
  console.log(`isTestScenario: ${Boolean(a.isTestScenario)}`);
  console.log(`\nHandoffs (${(a.handoffHistory || []).length}):`);
  for (const h of (a.handoffHistory || []).slice(0, 5)) {
    console.log(`  - ${h.timestamp}: ${h.fromDesk} -> ${h.toDesk} (${h.reason})`);
  }
  console.log(`\nÚltimos eventos de auditoria (${(a.auditHistory || []).length} no total):`);
  for (const ev of (a.auditHistory || []).slice(0, 5)) {
    console.log(`  - ${ev.timestamp} | ${ev.actor} | ${ev.stage}: ${ev.action}`);
  }
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
