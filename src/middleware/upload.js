const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'data', 'uploads');

const CATEGORIAS_FOTO = [
  { valor: 'frente', rotulo: 'Frente' },
  { valor: 'costas', rotulo: 'Costas' },
  { valor: 'lateral_direita', rotulo: 'Lateral direita' },
  { valor: 'lateral_esquerda', rotulo: 'Lateral esquerda' },
  { valor: 'assento', rotulo: 'Assento' },
  { valor: 'encosto', rotulo: 'Encosto' },
  { valor: 'bracos', rotulo: 'Braços' },
  { valor: 'pes_e_base', rotulo: 'Pés e base' },
  { valor: 'parte_inferior', rotulo: 'Parte inferior' },
  { valor: 'detalhes_defeitos', rotulo: 'Detalhes dos defeitos' },
  { valor: 'estrutura_interna', rotulo: 'Estrutura interna (oficina)' }
];

function filtroArquivo(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Apenas arquivos de imagem são aceitos.'));
  }
  cb(null, true);
}

// Todo upload passa por memória: a foto é convertida para JPEG antes de ir para o
// disco, assim qualquer formato enviado pelo cliente (webp, heic, png...) funciona
// igual nos relatórios em PDF e na análise por IA.
const uploadMemoria = multer({
  storage: multer.memoryStorage(),
  fileFilter: filtroArquivo,
  limits: { fileSize: 15 * 1024 * 1024, files: 20 }
});

// Mantido como alias — todas as rotas de foto usam o mesmo upload em memória.
const upload = uploadMemoria;

async function salvarArquivoEmDisco(pasta, file) {
  const dir = path.join(UPLOAD_ROOT, String(pasta));
  fs.mkdirSync(dir, { recursive: true });
  const nome = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.jpg';
  try {
    const jpegBuffer = await sharp(file.buffer).rotate().jpeg({ quality: 85 }).toBuffer();
    fs.writeFileSync(path.join(dir, nome), jpegBuffer);
  } catch (_) {
    // Se a conversão falhar (arquivo corrompido ou formato não reconhecido), grava o
    // original com a extensão que o navegador enviou, em vez de perder a foto.
    const extOriginal = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const nomeOriginal = nome.replace(/\.jpg$/, extOriginal);
    fs.writeFileSync(path.join(dir, nomeOriginal), file.buffer);
    return nomeOriginal;
  }
  return nome;
}

module.exports = { upload, uploadMemoria, salvarArquivoEmDisco, UPLOAD_ROOT, CATEGORIAS_FOTO };
