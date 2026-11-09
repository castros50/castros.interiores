// Backup verificável do documento appState/main de PRODUÇÃO — só LEITURA,
// nunca grava nada no Firestore. Salva uma cópia local em JSON simples (o
// objeto tal como o Admin SDK devolve, não o formato verboso da API REST
// com fields/{stringValue,...}) — pronta para ser usada como snapshot pelo
// script de migração, sem conversão nenhuma.
//
// Nunca gated pelo tamanho do documento: mesmo com o documento no limite
// (ou acima dele), esta leitura continua segura e é exatamente o que se
// quer rodar primeiro nesse cenário.
//
// Uso:
//   npx tsx migrations/backup-production.ts --out=/caminho/durável/appstate_main_backup.json [--project=gen-lang-client-0378581840]
//
// Recusa gravar dentro de /tmp (ou do diretório temporário do SO) de
// propósito — um backup que só existe num diretório efêmero não serve como
// rede de segurança.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createHash } from 'node:crypto';
import { createProductionFirestore, PRODUCTION_CONFIRMATION_PHRASE } from './productionFirestoreClient.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

async function main() {
  const outArg = arg('out');
  const projectId = arg('project') || 'gen-lang-client-0378581840';

  if (!outArg) {
    console.error('Uso: npx tsx migrations/backup-production.ts --out=<caminho-fora-de-tmp>.json [--project=<id>]');
    process.exit(1);
  }

  const outPath = path.resolve(outArg);
  const forbiddenPrefixes = ['/tmp', os.tmpdir()];
  if (forbiddenPrefixes.some((p) => outPath.startsWith(path.resolve(p)))) {
    console.error(
      `Recusado: "${outPath}" fica num diretório temporário (${forbiddenPrefixes.join(' ou ')}). ` +
        'Escolha um caminho durável (ex.: um diretório no próprio Cloud Shell/home, ou baixado para a máquina local em seguida).'
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Confirmação de produção não é exigida aqui: isto é só LEITURA, nunca
  // escreve no Firestore — não há o mesmo risco que justifica a barreira em
  // createProductionFirestore() para os modos de escrita do script de
  // migração. Ainda assim, a conexão é sempre contra produção de verdade
  // (nunca o emulador) — ver a checagem de FIRESTORE_EMULATOR_HOST abaixo.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error(
      `FIRESTORE_EMULATOR_HOST="${process.env.FIRESTORE_EMULATOR_HOST}" está definido — isso faria este backup ` +
        'ler do emulador local, não de produção. Remova a variável antes de rodar isto para valer.'
    );
    process.exit(1);
  }
  const db = createProductionFirestore(projectId, PRODUCTION_CONFIRMATION_PHRASE);
  const snap = await db.collection('appState').doc('main').get();
  if (!snap.exists) {
    console.error('Documento appState/main não encontrado em produção — nada para fazer backup.');
    process.exit(1);
  }
  const data = snap.data();
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(outPath, json, 'utf-8');

  // Verificação: reler do disco (não da memória do processo) e reconfirmar
  // que é JSON válido e utilizável como snapshot de migração.
  const reread = fs.readFileSync(outPath, 'utf-8');
  const reparsed = JSON.parse(reread) as { attendances?: unknown[]; agentChats?: Record<string, unknown[]> };
  const bytesOnDisk = Buffer.byteLength(reread, 'utf-8');
  const sha256 = createHash('sha256').update(reread).digest('hex');
  const attendanceCount = Array.isArray(reparsed.attendances) ? reparsed.attendances.length : 0;
  const deskCount = reparsed.agentChats ? Object.keys(reparsed.agentChats).length : 0;
  const messageCount = reparsed.agentChats
    ? Object.values(reparsed.agentChats).reduce((sum, msgs) => sum + (Array.isArray(msgs) ? msgs.length : 0), 0)
    : 0;

  console.log('--- Backup de produção (appState/main) ---');
  console.log('Salvo em:', outPath);
  console.log('updateTime do documento no Firestore:', (snap as unknown as { updateTime?: { toDate(): Date } }).updateTime?.toDate().toISOString() ?? 'indisponível');
  console.log('Bytes no disco:', bytesOnDisk, `(limite por documento do Firestore: 1.048.576, ${((bytesOnDisk / 1_048_576) * 100).toFixed(1)}%)`);
  console.log('SHA-256 do arquivo:', sha256);
  console.log('Atendimentos no backup:', attendanceCount);
  console.log('Mesas com conversas no backup:', deskCount, `(${messageCount} mensagens no total)`);
  console.log('Verificação: arquivo relido do disco e reparseado como JSON com sucesso.');
}

main().catch((err) => {
  console.error('Falha no backup:', err);
  process.exit(1);
});
