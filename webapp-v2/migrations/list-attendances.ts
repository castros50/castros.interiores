// Leitura independente da coleção attendances_v2 — direto pelo SDK do
// Firestore, NÃO passa pela API da aplicação (GET /api/store só reflete o
// cache local em disco da instância do Cloud Run que atendeu a requisição,
// não é uma verificação independente do que está realmente gravado).
//
// Usado para conferir se existe alguma divergência entre o que /api/store
// mostra e o que de fato está na coleção nova — por exemplo, atendimentos
// criados por mensagens de WhatsApp recentes que não aparecem na lista
// servida pela API. Só leitura, nunca grava nada.
//
// Uso:
//   npx tsx migrations/list-attendances.ts --confirm=CONFIRMO-PRODUCAO [--project=gen-lang-client-0378581840]

import { createProductionFirestore } from './productionFirestoreClient.ts';
import { COLLECTION_ATTENDANCES } from './firestoreCollectionsMigration.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

async function main() {
  const confirm = arg('confirm') || '';
  const projectId = arg('project') || 'gen-lang-client-0378581840';

  const db = createProductionFirestore(projectId, confirm);
  console.log(`Lendo "${COLLECTION_ATTENDANCES}" direto do Firestore (SDK, não a API da aplicação)...\n`);
  const snap = await db.collection(COLLECTION_ATTENDANCES).get();

  console.log(`Total de documentos em ${COLLECTION_ATTENDANCES}: ${snap.size}\n`);
  const rows = snap.docs
    .map((d) => {
      const a = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        attendanceNumber: a.attendanceNumber,
        clientName: a.clientName,
        orderType: a.orderType,
        isTestScenario: Boolean(a.isTestScenario),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    })
    .sort((x, y) => String(x.createdAt || '').localeCompare(String(y.createdAt || '')));

  for (const r of rows) {
    console.log(
      `- ${r.id} | ${r.attendanceNumber} | ${r.clientName} | ${r.orderType} | teste: ${r.isTestScenario} | criado: ${r.createdAt} | atualizado: ${r.updatedAt}`
    );
  }
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
