// Geração de imagens (lâminas de carrossel e pôster) da Júlia via SVG + sharp.
// Sem dependência de navegador headless: monta um SVG com texto + foto embutida
// e converte para PNG no servidor.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TEMAS = {
  noite_ouro: { fundo: '#181512', texto: '#F9F6F0', destaque: '#D8C5A3', rotulo: 'Noite & Ouro' },
  editorial_creme: { fundo: '#F3EFE6', texto: '#181512', destaque: '#9A7138', rotulo: 'Editorial Creme' },
  atelier_bronze: { fundo: '#2E2722', texto: '#F9F6F0', destaque: '#C79A5A', rotulo: 'Ateliê Bronze' },
  verde_esmeralda: { fundo: '#13342A', texto: '#F2F7F4', destaque: '#6FB58C', rotulo: 'Verde Esmeralda' }
};

const LARGURA = 1080;
const ALTURA = 1350; // formato retrato (feed/carrossel)

function escaparXml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Quebra um texto em várias linhas respeitando um nº máximo de caracteres por linha.
function quebrarLinhas(texto, maxCaracteres) {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const palavra of palavras) {
    const tentativa = atual ? atual + ' ' + palavra : palavra;
    if (tentativa.length > maxCaracteres && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function textoMultilinha(linhas, x, yInicial, tamanhoFonte, cor, pesoFonte) {
  return linhas.map((linha, i) =>
    `<text x="${x}" y="${yInicial + i * (tamanhoFonte * 1.25)}" font-family="Georgia, serif" font-size="${tamanhoFonte}" font-weight="${pesoFonte || 'normal'}" fill="${cor}">${escaparXml(linha)}</text>`
  ).join('');
}

async function montarFotoBase64(caminhoAbsoluto) {
  if (!caminhoAbsoluto || !fs.existsSync(caminhoAbsoluto)) return null;
  try {
    const buffer = await sharp(caminhoAbsoluto).resize(LARGURA, Math.round(ALTURA * 0.62), { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    return 'data:image/jpeg;base64,' + buffer.toString('base64');
  } catch (_) {
    return null;
  }
}

// Gera o PNG de uma lâmina de carrossel (ou do pôster, reaproveitando o mesmo layout).
async function gerarImagemLamina({ titulo, corpo, caminhoFotoAbsoluto, tema, rodape }) {
  const cores = TEMAS[tema] || TEMAS.editorial_creme;
  const fotoBase64 = await montarFotoBase64(caminhoFotoAbsoluto);
  const alturaFoto = Math.round(ALTURA * 0.62);

  const linhasTitulo = quebrarLinhas(titulo, 22).slice(0, 3);
  const linhasCorpo = quebrarLinhas(corpo, 38).slice(0, 6);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">
  <rect width="${LARGURA}" height="${ALTURA}" fill="${cores.fundo}"/>
  ${fotoBase64 ? `<image x="0" y="0" width="${LARGURA}" height="${alturaFoto}" href="${fotoBase64}" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <rect x="0" y="${fotoBase64 ? alturaFoto : 0}" width="${LARGURA}" height="${ALTURA - (fotoBase64 ? alturaFoto : 0)}" fill="${cores.fundo}"/>
  <rect x="60" y="${(fotoBase64 ? alturaFoto : 40) + 40}" width="80" height="6" fill="${cores.destaque}"/>
  ${textoMultilinha(linhasTitulo, 60, (fotoBase64 ? alturaFoto : 40) + 110, 46, cores.texto, 'bold')}
  ${textoMultilinha(linhasCorpo, 60, (fotoBase64 ? alturaFoto : 40) + 110 + (linhasTitulo.length * 58) + 40, 26, cores.texto, 'normal')}
  <text x="60" y="${ALTURA - 50}" font-family="Georgia, serif" font-size="22" fill="${cores.destaque}">${escaparXml(rodape || 'Castros Interiores')}</text>
</svg>`.trim();

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { TEMAS, gerarImagemLamina };
