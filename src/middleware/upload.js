const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(UPLOAD_ROOT, String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const nome = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
    cb(null, nome);
  }
});

function filtroArquivo(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Apenas arquivos de imagem são aceitos.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: filtroArquivo,
  limits: { fileSize: 15 * 1024 * 1024, files: 20 }
});

module.exports = { upload, UPLOAD_ROOT, CATEGORIAS_FOTO };
