// Envia os retratos de src/scripts/agent-portraits/<deskId>.jpg para o serviço em produção,
// usando a mesma rota que o botão "Enviar foto" em Configurações usa
// (POST /api/agent-portraits/:deskId). Não inventa nem gera imagem nenhuma — só sobe
// arquivos já prontos, um por agente, exatamente como um envio manual faria.
//
// Uso: node scripts/upload-agent-portraits.mjs <URL-do-serviço>
// Ex.:  node scripts/upload-agent-portraits.mjs https://castros-interiores-377257663620.southamerica-east1.run.app

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTRAITS_DIR = path.join(__dirname, 'agent-portraits');

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Uso: node scripts/upload-agent-portraits.mjs <URL-do-serviço>');
  process.exit(1);
}

const files = fs.readdirSync(PORTRAITS_DIR).filter((f) => f.endsWith('.jpg'));
if (files.length === 0) {
  console.error(`Nenhum arquivo .jpg encontrado em ${PORTRAITS_DIR}`);
  process.exit(1);
}

let okCount = 0;
let failCount = 0;

for (const file of files) {
  const deskId = file.replace(/\.jpg$/, '');
  const filePath = path.join(PORTRAITS_DIR, file);
  const buffer = fs.readFileSync(filePath);
  const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/agent-portraits/${deskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, mimeType: 'image/jpeg' }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      console.log(`✔ ${deskId}: enviado (${data.imageUrl})`);
      okCount++;
    } else {
      console.error(`✘ ${deskId}: ${data.error || res.statusText}`);
      failCount++;
    }
  } catch (err) {
    console.error(`✘ ${deskId}: erro de rede — ${err instanceof Error ? err.message : err}`);
    failCount++;
  }
}

console.log(`\n${okCount} retrato(s) enviado(s) com sucesso, ${failCount} falha(s).`);
process.exit(failCount > 0 ? 1 : 0);
