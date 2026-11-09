// Leitura independente das coleções novas, direto pelo SDK do Firestore —
// NÃO passa pela API da aplicação. `GET /api/store` reflete o cache local
// em disco de UMA instância do Cloud Run (a que atendeu aquela requisição
// específica), não é uma verificação independente do que está realmente
// gravado no Firestore — por isso o procedimento de deploy usa este script
// na validação (Passo 7), não mais um curl para `/api/store`.
//
// Busca por um FRAGMENTO de texto (não um id fixo) na coleção de uma mesa
// e mostra o atendimento vinculado, lendo attendances_v2/agentChats_v2_{desk}
// direto — só leitura, nunca grava nada.
//
// Uso:
//   npx tsx migrations/find-in-collections.ts --fragment="texto único enviado" [--desk=carla_atendimento] --confirm=CONFIRMO-PRODUCAO [--project=gen-lang-client-0378581840]

import { createProductionFirestore } from './productionFirestoreClient.ts';
import { COLLECTION_ATTENDANCES, COLLECTION_CHAT_MESSAGE_PREFIX } from './firestoreCollectionsMigration.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

async function main() {
  const fragment = arg('fragment');
  const desk = arg('desk') || 'carla_atendimento';
  const confirm = arg('confirm') || '';
  const projectId = arg('project') || 'gen-lang-client-0378581840';

  if (!fragment) {
    console.error(
      'Uso: npx tsx migrations/find-in-collections.ts --fragment="texto único enviado" ' +
        '[--desk=carla_atendimento] --confirm=CONFIRMO-PRODUCAO'
    );
    process.exit(1);
  }

  const db = createProductionFirestore(projectId, confirm);
  const chatColPath = `${COLLECTION_CHAT_MESSAGE_PREFIX}${desk}`;
  const chatCol = db.collection(chatColPath);

  console.log(`Lendo "${chatColPath}" direto do Firestore (SDK, não a API da aplicação)...`);
  const snap = await chatCol.get();
  const matches = snap.docs.filter((d) => {
    const text = (d.data().text as string | undefined) || '';
    return text.includes(fragment);
  });

  if (matches.length === 0) {
    console.log(
      `Nenhuma mensagem contendo "${fragment}" encontrada em "${chatColPath}" (${snap.size} mensagens no total nessa mesa).`
    );
    process.exit(1);
  }

  for (const doc of matches) {
    const data = doc.data() as Record<string, unknown>;
    console.log(`\nMensagem encontrada: ${doc.ref.path}`);
    console.log('  text:', data.text);
    console.log('  externalMessageId:', data.externalMessageId);
    console.log('  attendanceId:', data.attendanceId);

    const attId = data.attendanceId as string | undefined;
    if (!attId) {
      console.log('  Atendimento: a mensagem não referencia nenhum attendanceId.');
      continue;
    }
    const attDoc = await db.collection(COLLECTION_ATTENDANCES).doc(attId).get();
    console.log(`  Atendimento (${COLLECTION_ATTENDANCES}/${attId}):`, attDoc.exists ? 'ENCONTRADO' : 'NÃO ENCONTRADO');
    if (attDoc.exists) {
      const att = attDoc.data() as Record<string, unknown>;
      console.log('    attendanceNumber:', att.attendanceNumber);
      console.log('    clientName:', att.clientName);
      console.log('    status:', att.status);
    }
  }
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
