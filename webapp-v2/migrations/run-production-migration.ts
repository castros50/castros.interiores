// CLI de migração contra o Firestore de PRODUÇÃO real — nunca o emulador.
// Só liga a lógica já testada (firestoreCollectionsMigration.ts, 16/16
// contra o emulador oficial — ver README.md) a uma conexão real, por trás
// da confirmação explícita de createProductionFirestore().
//
// NUNCA escreve nem apaga nada no documento único appState/main — só LÊ dele
// (via o arquivo de snapshot já salvo por backup-production.ts). As únicas
// escritas acontecem nas coleções novas (attendances_v2, agentChats_v2_*,
// whatsappMessageDedup), em --mode=execute.
//
// Uso:
//   npx tsx migrations/run-production-migration.ts --mode=reconcile --snapshot=<local.json> --snapshot2=<firestore.json>
//   npx tsx migrations/run-production-migration.ts --mode=dry-run   --snapshot=<backup.json> --confirm=CONFIRMO-PRODUCAO
//   npx tsx migrations/run-production-migration.ts --mode=execute   --snapshot=<backup.json> --confirm=CONFIRMO-PRODUCAO
//   npx tsx migrations/run-production-migration.ts --mode=verify    --snapshot=<backup.json> --confirm=CONFIRMO-PRODUCAO
//
// --mode=reconcile não precisa de --confirm (não abre conexão nenhuma — só
// compara dois arquivos JSON já salvos em disco).

import * as fs from 'node:fs';
import {
  runMigration,
  verifyMigrationIntegrity,
  reconcileSnapshots,
  type LegacyStoreSnapshot,
} from './firestoreCollectionsMigration.ts';
import { createProductionFirestore, RealFirestoreClient } from './productionFirestoreClient.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

function loadSnapshot(filePath: string): LegacyStoreSnapshot {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(raw.attendances)) {
    throw new Error(`"${filePath}" não parece um snapshot válido (campo "attendances" ausente ou não é array).`);
  }
  return raw as LegacyStoreSnapshot;
}

async function main() {
  const mode = arg('mode');
  const snapshotPath = arg('snapshot');
  const confirm = arg('confirm') || '';
  const projectId = arg('project') || 'gen-lang-client-0378581840';

  if (!mode || !snapshotPath) {
    console.error(
      'Uso: --mode=reconcile|dry-run|execute|verify --snapshot=<arquivo.json> ' +
        '[--snapshot2=<arquivo.json> só para reconcile] [--confirm=CONFIRMO-PRODUCAO]'
    );
    process.exit(1);
  }

  const snapshot = loadSnapshot(snapshotPath);

  if (mode === 'reconcile') {
    const snapshot2Path = arg('snapshot2');
    if (!snapshot2Path) {
      console.error('--mode=reconcile exige --snapshot2=<outro-arquivo.json>');
      process.exit(1);
    }
    const other = loadSnapshot(snapshot2Path);
    const report = reconcileSnapshots(snapshot, other);
    console.log(JSON.stringify(report, null, 2));
    if (!report.identical) {
      console.error('\nAs duas fontes NÃO são idênticas — reconciliar antes de seguir para dry-run/execute (ver migrations/README.md).');
    }
    process.exit(report.identical ? 0 : 2);
  }

  if (mode !== 'dry-run' && mode !== 'execute' && mode !== 'verify') {
    console.error(`Modo desconhecido: "${mode}". Use reconcile, dry-run, execute ou verify.`);
    process.exit(1);
  }

  const db = createProductionFirestore(projectId, confirm);
  const client = new RealFirestoreClient(db);

  if (mode === 'dry-run' || mode === 'execute') {
    if (mode === 'execute') {
      console.log('--- MODO EXECUTE: isto vai escrever de verdade nas coleções novas em produção. ---');
    }
    const result = await runMigration(client, snapshot, { dryRun: mode === 'dry-run' });
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length > 0) {
      console.error(`\n${result.errors.length} erro(s) — ver campo "errors" acima. A migração é idempotente: corrigir a causa e rodar de novo com --mode=execute é seguro.`);
      process.exit(1);
    }
    return;
  }

  // mode === 'verify'
  const report = await verifyMigrationIntegrity(client, snapshot);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(`\n${report.mismatches.length} divergência(s) — ver campo "mismatches" acima. Rodar --mode=execute de novo (idempotente) e --mode=verify outra vez até "ok": true.`);
  }
  process.exit(report.ok ? 0 : 1);
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
