// Mostra, em ordem decrescente, quantos bytes cada chave do backup de
// appState/main está ocupando — SEM tocar em produção: lê só o arquivo JSON
// que o backup-production.ts já salvou no disco (ex.: o backup em
// $HOME/backups/castros/ feito no Passo 1 do procedimento de deploy).
//
// Por que isto existe: depois do corte para coleções (attendances_v2/
// agentChats_v2_*), `attendances`/`agentChats` NUNCA MAIS são escritos em
// appState/main (ver persistStoreKeysTransactionally em server.ts) — mas o
// backup real de produção já mostrou 1.064.240 bytes (101,5% do limite de
// 1.048.576) com 0 atendimentos e só 23 mensagens pequenas no total. Ou seja:
// a bagunça de attendances/agentChats não é a causa principal do tamanho —
// o corte para coleções, por si só, pode não liberar espaço suficiente. Este
// script responde a pergunta "o que está ocupando o espaço de verdade" sem
// precisar adivinhar.
//
// Uso (com o backup já baixado, nenhuma credencial nem rede necessária):
//   npx tsx migrations/inspect-main-doc-size.ts --file=$HOME/backups/castros/appstate_main_backup_AAAAMMDDThhmmss.json

import fs from 'fs';

function arg(name: string): string | undefined {
  const pref = `--${name}=`;
  return process.argv.slice(2).find((a) => a.startsWith(pref))?.slice(pref.length);
}

function byteSize(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? null), 'utf-8');
}

function countDeep(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value as object).length;
  return 0;
}

async function main() {
  const filePath = arg('file');
  if (!filePath) {
    console.error('Uso: npx tsx migrations/inspect-main-doc-size.ts --file=<caminho do backup baixado>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const doc = JSON.parse(raw) as Record<string, unknown>;

  const totalBytes = Buffer.byteLength(raw, 'utf-8');
  const limitBytes = 1_048_576;

  console.log(`Arquivo: ${filePath}`);
  console.log(`Tamanho total do arquivo: ${totalBytes} bytes (${((totalBytes / limitBytes) * 100).toFixed(1)}% do limite de ${limitBytes}).`);
  console.log('\nQuebra por chave de nível superior (maior primeiro):\n');

  const breakdown = Object.keys(doc)
    .map((key) => ({ key, bytes: byteSize(doc[key]), items: countDeep(doc[key]) }))
    .sort((a, b) => b.bytes - a.bytes);

  for (const { key, bytes, items } of breakdown) {
    const pct = ((bytes / totalBytes) * 100).toFixed(1);
    const itemsNote = items > 0 ? ` (${items} item/campo${items === 1 ? '' : 's'})` : '';
    console.log(`  ${key.padEnd(24)} ${String(bytes).padStart(10)} bytes  (${pct}% do arquivo)${itemsNote}`);
  }

  const attendancesCount = Array.isArray(doc.attendances) ? doc.attendances.length : 0;
  const agentChatsTotal = doc.agentChats && typeof doc.agentChats === 'object'
    ? Object.values(doc.agentChats as Record<string, unknown[]>).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    : 0;
  const attendancesBytes = byteSize(doc.attendances);
  const agentChatsBytes = byteSize(doc.agentChats);
  const otherKeysBytes = totalBytes - attendancesBytes - agentChatsBytes;

  console.log('\nResumo relevante para a pergunta "o corte para coleções libera espaço suficiente?":');
  console.log(`  attendances: ${attendancesCount} registro(s), ${attendancesBytes} bytes.`);
  console.log(`  agentChats: ${agentChatsTotal} mensagem(ns) no total, ${agentChatsBytes} bytes.`);
  console.log(`  Soma de attendances + agentChats (sai do documento após o corte): ${attendancesBytes + agentChatsBytes} bytes.`);
  console.log(`  Tudo o que SOBRA em appState/main depois do corte (settings/materials/juliaData/clients/officeData/backgroundTasks/whatsappWebhookLog/nextSequence): ${otherKeysBytes} bytes.`);
  if (otherKeysBytes > limitBytes * 0.8) {
    console.log(
      `\n  ALERTA: mesmo removendo attendances e agentChats inteiramente, o que sobra já ocupa ` +
        `${((otherKeysBytes / limitBytes) * 100).toFixed(1)}% do limite — o corte para coleções, por si só, ` +
        'NÃO é suficiente para resolver o limite de tamanho. É preciso investigar/reduzir a(s) chave(s) ' +
        'de maior tamanho na quebra acima (ex.: mover para sua própria coleção, como já foi feito com attendances/agentChats).'
    );
  } else {
    console.log(
      `\n  O que sobra depois do corte (${otherKeysBytes} bytes) está dentro de uma margem segura do limite de ${limitBytes}.`
    );
  }
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
