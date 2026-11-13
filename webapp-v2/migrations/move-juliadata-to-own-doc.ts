// Correção emergencial: appState/main passou do limite de 1MB do Firestore
// (995KB só de juliaData, de ~1.049KB no total) e toda gravação nova
// (settings, backgroundTasks, o próprio log do webhook do WhatsApp)
// começou a ser rejeitada com "Document ... exceeds the maximum allowed
// size" — bloqueando a integração inteira do WhatsApp, não só a Júlia.
//
// server.ts já foi alterado para nunca mais escrever juliaData dentro de
// appState/main (vai para appState/juliaData, documento próprio, com seu
// próprio orçamento de 1MB) — mas o CAMPO antigo, já gravado, continua
// ocupando espaço em appState/main até ser removido explicitamente. Este
// script faz essa remoção, uma única vez:
//   1. Lê appState/main.
//   2. Copia o campo juliaData (se existir) para appState/juliaData.
//   3. Remove o campo juliaData de appState/main (FieldValue.delete()).
// Idempotente: rodar de novo depois de já ter rodado não faz nada (passo 2
// e 3 são pulados se appState/main já não tiver mais o campo).
//
// IMPORTANTE: rodar isto só DEPOIS de o deploy da nova versão de server.ts
// já estar no ar (revisão do Cloud Run que não lê mais juliaData do
// documento único) — ver DEPLOY_WHATSAPP_DURABILITY_FIX.md para a ordem
// completa do procedimento.
//
// Uso:
//   npx tsx migrations/move-juliadata-to-own-doc.ts --confirm=CONFIRMO-PRODUCAO

import { FieldValue } from 'firebase-admin/firestore';
import { createProductionFirestore } from './productionFirestoreClient.ts';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

// Nenhuma chamada de rede abaixo pode ficar pendurada pra sempre — se
// travar, isso diz ONDE em vez de deixar o script parado sem explicação.
const STEP_TIMEOUT_MS = 20_000;
function withTimeout<T>(label: string, promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tempo esgotado (${STEP_TIMEOUT_MS}ms) em: ${label}`)), STEP_TIMEOUT_MS)
    ),
  ]);
}

async function main() {
  const confirm = arg('confirm') || '';
  const projectId = arg('project') || 'gen-lang-client-0378581840';

  console.log(`Conectando ao Firestore do projeto "${projectId}"...`);
  const db = createProductionFirestore(projectId, confirm);
  const mainRef = db.collection('appState').doc('main');
  const juliaRef = db.collection('appState').doc('juliaData');

  console.log('Lendo appState/main...');
  const mainSnap = await withTimeout('mainRef.get()', mainRef.get());
  console.log('Leitura de appState/main concluída.');
  if (!mainSnap.exists) {
    console.log('appState/main não existe — nada a fazer.');
    return;
  }
  const mainData = mainSnap.data() || {};
  const mainBytesBefore = Buffer.byteLength(JSON.stringify(mainData), 'utf-8');
  console.log(`appState/main antes: ${mainBytesBefore} bytes.`);

  if (!('juliaData' in mainData)) {
    console.log('appState/main já não tem o campo juliaData — já migrado, nada a fazer.');
    return;
  }

  const juliaData = mainData.juliaData;
  const juliaBytes = Buffer.byteLength(JSON.stringify(juliaData ?? null), 'utf-8');
  console.log(`Campo juliaData encontrado: ${juliaBytes} bytes. Copiando para appState/juliaData...`);

  await withTimeout('juliaRef.set()', juliaRef.set({ juliaData, savedAt: new Date().toISOString() }));
  console.log('appState/juliaData gravado com sucesso.');

  await withTimeout('mainRef.update() (delete field)', mainRef.update({ juliaData: FieldValue.delete() }));
  console.log('Campo juliaData removido de appState/main.');

  const mainSnapAfter = await withTimeout('mainRef.get() (depois)', mainRef.get());
  const mainBytesAfter = Buffer.byteLength(JSON.stringify(mainSnapAfter.data() || {}), 'utf-8');
  console.log(`appState/main depois: ${mainBytesAfter} bytes (era ${mainBytesBefore}).`);
  console.log('Migração concluída.');
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
