// Migração pontual: converte manufacturingData.components[].dimensionsMm (e
// cutDimensionsMm, quando presente) de milímetros para dimensionsCm/
// cutDimensionsCm em centímetros, nos documentos reais de attendances_v2.
// Motivo: o campo dimensionsMm foi renomeado/trocado de unidade para
// dimensionsCm em todo o app (a Castros Interiores nunca trabalha em
// milímetros) — isto corrige o dado JÁ GRAVADO antes da troca de código,
// sem o que ele ficaria com os números antigos sob o nome de campo novo
// (10x maior do que deveria).
//
// Só leitura por padrão — imprime o que mudaria. Passe --apply pra gravar
// de verdade. Sempre roda contra TODOS os documentos de attendances_v2,
// mas só grava (mesmo com --apply) os que de fato têm dimensionsMm.
//
// Uso:
//   npx tsx migrations/convert-component-dimensions-mm-to-cm.ts --confirm=CONFIRMO-PRODUCAO [--apply] [--project=gen-lang-client-0378581840]

import { createProductionFirestore } from './productionFirestoreClient.ts';
import { COLLECTION_ATTENDANCES } from './firestoreCollectionsMigration.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}
function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function convertDims(dims: any): any {
  if (!dims) return dims;
  const toCm = (v: unknown) => (typeof v === 'number' ? Math.round((v / 10) * 100) / 100 : v ?? null);
  return { ...dims, length: toCm(dims.length), width: toCm(dims.width), thickness: toCm(dims.thickness) };
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
    if (!mfg) continue;

    let changed = false;
    const components: any[] = Array.isArray(mfg.components) ? mfg.components : [];
    const nextComponents = components.map((c) => {
      if (c && c.dimensionsMm && !c.dimensionsCm) {
        changed = true;
        const { dimensionsMm, ...rest } = c;
        return { ...rest, dimensionsCm: convertDims(dimensionsMm) };
      }
      return c;
    });

    const foamCuts: any[] = Array.isArray(mfg.cuttingPlan?.foamCuts) ? mfg.cuttingPlan.foamCuts : [];
    const nextFoamCuts = foamCuts.map((f) => {
      if (f && f.cutDimensionsMm && !f.cutDimensionsCm) {
        changed = true;
        const { cutDimensionsMm, ...rest } = f;
        return { ...rest, cutDimensionsCm: convertDims(cutDimensionsMm) };
      }
      return f;
    });

    if (!changed) continue;

    console.log(`\n${doc.id} (${data.attendanceNumber}):`);
    for (let i = 0; i < components.length; i++) {
      if (components[i]?.dimensionsMm) {
        console.log(`  ${components[i].code} ${components[i].name}: mm=${JSON.stringify(components[i].dimensionsMm)} -> cm=${JSON.stringify(nextComponents[i].dimensionsCm)}`);
      }
    }
    for (let i = 0; i < foamCuts.length; i++) {
      if (foamCuts[i]?.cutDimensionsMm) {
        console.log(`  corte ${foamCuts[i].pieceName}: mm=${JSON.stringify(foamCuts[i].cutDimensionsMm)} -> cm=${JSON.stringify(nextFoamCuts[i].cutDimensionsCm)}`);
      }
    }

    if (apply) {
      const nextMfg = { ...mfg, components: nextComponents };
      if (mfg.cuttingPlan) nextMfg.cuttingPlan = { ...mfg.cuttingPlan, foamCuts: nextFoamCuts };
      await col.doc(doc.id).set({ ...data, manufacturingData: nextMfg });
      console.log('  -> gravado.');
    }
    changedCount++;
  }

  console.log(`\n${changedCount} documento(s) com dimensionsMm encontrado(s)${apply ? ' e corrigido(s)' : ' (nada gravado — rode com --apply)'}.`);
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
