// Migração pontual: converte manufacturingData.aiMissingQuestions de array de
// strings (formato antigo) para array de objetos { id, question, resolved,
// answer?, resolvedBy?, resolvedAt? } (formato novo), nos documentos reais de
// attendances_v2. Motivo: a Etapa 3 do Fluxo de 8 Etapas (Lucas) ganhou um
// jeito de responder/marcar cada pendência como resolvida — sem essa
// migração, pedidos já analisados antes da troca mostrariam as perguntas em
// branco (o código novo lê .question/.resolved, que não existem numa string).
//
// Só leitura por padrão — imprime o que mudaria. Passe --apply pra gravar de
// verdade. Sempre roda contra TODOS os documentos de attendances_v2, mas só
// grava (mesmo com --apply) os que de fato têm aiMissingQuestions em formato
// antigo (string[]).
//
// Uso:
//   npx tsx migrations/convert-missing-questions-to-objects.ts --confirm=CONFIRMO-PRODUCAO [--apply] [--project=gen-lang-client-0378581840]

import { createProductionFirestore } from './productionFirestoreClient.ts';
import { COLLECTION_ATTENDANCES } from './firestoreCollectionsMigration.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}
function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

async function main() {
  const confirm = arg('confirm') || '';
  const projectId = arg('project') || 'gen-lang-client-0378581840';
  const apply = hasFlag('apply');

  const db = createProductionFirestore(projectId, confirm);
  const col = db.collection(COLLECTION_ATTENDANCES);
  const snap = await col.get();

  console.log(`Lendo ${snap.size} documento(s) de ${COLLECTION_ATTENDANCES}...\n`);
  console.log(apply ? 'MODO: --apply (vai gravar de verdade)' : 'MODO: leitura (dry-run) — passe --apply pra gravar');

  let changedCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const mfg = data.manufacturingData;
    const questions = mfg?.aiMissingQuestions;
    if (!Array.isArray(questions) || questions.length === 0) continue;
    const isOldFormat = typeof questions[0] === 'string';
    if (!isOldFormat) continue;

    const nextQuestions = (questions as string[]).map((q, idx) => ({
      id: `mq-${Date.now()}-${idx}`,
      question: q,
      resolved: false,
    }));

    console.log(`\n${doc.id} (${data.attendanceNumber}): ${questions.length} pergunta(s) a converter`);
    for (const q of nextQuestions) {
      console.log(`  - ${q.question}`);
    }

    if (apply) {
      const nextMfg = { ...mfg, aiMissingQuestions: nextQuestions };
      await col.doc(doc.id).set({ ...data, manufacturingData: nextMfg });
      console.log('  -> gravado.');
    }
    changedCount++;
  }

  console.log(`\n${changedCount} documento(s) com aiMissingQuestions em formato antigo encontrado(s)${apply ? ' e corrigido(s)' : ' (nada gravado — rode com --apply)'}.`);
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
