// Ações reais que o chat da Júlia pode executar (ferramentas do Claude).
// Cada função grava no mesmo banco usado pelas telas de formulário — o chat é só
// outra porta de entrada para os mesmos dados.

const db = require('../db/db');

const FORMATOS = ['Anúncio', 'Pôster', 'Carrossel', 'Catálogo'];
const CANAIS = ['Instagram Feed', 'Instagram Stories', 'WhatsApp Status', 'Lista de Transmissão WhatsApp', 'Facebook'];
const TEMAS_VALIDOS = ['noite_ouro', 'editorial_creme', 'atelier_bronze', 'verde_esmeralda'];

function garantirCincoLaminas(campanhaId) {
  const existentes = db.prepare('SELECT ordem FROM julia_carrossel_laminas WHERE campanha_id = ?').all(campanhaId).map(r => r.ordem);
  const insert = db.prepare('INSERT INTO julia_carrossel_laminas (campanha_id, ordem, titulo, corpo) VALUES (?, ?, ?, ?)');
  for (let ordem = 1; ordem <= 5; ordem++) {
    if (!existentes.includes(ordem)) insert.run(campanhaId, ordem, '', '');
  }
}

function criarCampanha({ nome }) {
  if (!nome || !nome.trim()) return { ok: false, erro: 'É preciso um nome para a campanha.' };
  const info = db.prepare('INSERT INTO julia_campanhas (nome) VALUES (?)').run(nome.trim());
  garantirCincoLaminas(info.lastInsertRowid);
  return { ok: true, campanhaId: info.lastInsertRowid, resumo: 'Campanha "' + nome.trim() + '" criada (id ' + info.lastInsertRowid + ').' };
}

function editarCampanha(campanhaId, campos) {
  const atual = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(campanhaId);
  if (!atual) return { ok: false, erro: 'Campanha não encontrada.' };
  const novo = {
    objetivo: campos.objetivo !== undefined ? campos.objetivo : atual.objetivo,
    publico_alvo: campos.publico_alvo !== undefined ? campos.publico_alvo : atual.publico_alvo,
    formato: campos.formato && FORMATOS.includes(campos.formato) ? campos.formato : atual.formato,
    titulo: campos.titulo !== undefined ? campos.titulo : atual.titulo,
    texto: campos.texto !== undefined ? campos.texto : atual.texto,
    hashtags: campos.hashtags !== undefined ? campos.hashtags : atual.hashtags,
    cta_texto: campos.cta_texto !== undefined ? campos.cta_texto : atual.cta_texto,
    whatsapp_numero: campos.whatsapp_numero !== undefined ? campos.whatsapp_numero : atual.whatsapp_numero
  };
  db.prepare(`
    UPDATE julia_campanhas SET objetivo=?, publico_alvo=?, formato=?, titulo=?, texto=?, hashtags=?, cta_texto=?, whatsapp_numero=?,
      atualizado_em=datetime('now') WHERE id=?
  `).run(novo.objetivo, novo.publico_alvo, novo.formato, novo.titulo, novo.texto, novo.hashtags, novo.cta_texto, novo.whatsapp_numero, campanhaId);
  return { ok: true, resumo: 'Dados da campanha atualizados: ' + Object.keys(campos).join(', ') + '.' };
}

function definirLamina(campanhaId, { ordem, titulo, corpo, foto_id, tema }) {
  const n = parseInt(ordem, 10);
  if (!n || n < 1 || n > 5) return { ok: false, erro: 'Ordem da lâmina precisa ser um número de 1 a 5.' };
  garantirCincoLaminas(campanhaId);
  const lamina = db.prepare('SELECT * FROM julia_carrossel_laminas WHERE campanha_id = ? AND ordem = ?').get(campanhaId, n);
  if (!lamina) return { ok: false, erro: 'Lâmina não encontrada.' };
  if (foto_id) {
    const foto = db.prepare('SELECT id FROM julia_fotos WHERE id = ?').get(foto_id);
    if (!foto) return { ok: false, erro: 'Essa foto não existe na biblioteca. Use listar_fotos ou confirme o id com o usuário.' };
  }
  db.prepare("UPDATE julia_carrossel_laminas SET titulo=?, corpo=?, foto_id=COALESCE(?, foto_id), tema=?, atualizado_em=datetime('now') WHERE id=?")
    .run(titulo !== undefined ? titulo : lamina.titulo, corpo !== undefined ? corpo : lamina.corpo, foto_id || null,
      TEMAS_VALIDOS.includes(tema) ? tema : lamina.tema, lamina.id);
  return { ok: true, resumo: 'Lâmina ' + n + ' atualizada.' };
}

function definirPoster(campanhaId, { foto_id, tema }) {
  if (foto_id) {
    const foto = db.prepare('SELECT id FROM julia_fotos WHERE id = ?').get(foto_id);
    if (!foto) return { ok: false, erro: 'Essa foto não existe na biblioteca.' };
  }
  db.prepare("UPDATE julia_campanhas SET poster_foto_id=COALESCE(?, poster_foto_id), poster_tema=?, atualizado_em=datetime('now') WHERE id=?")
    .run(foto_id || null, TEMAS_VALIDOS.includes(tema) ? tema : 'editorial_creme', campanhaId);
  return { ok: true, resumo: 'Pôster atualizado.' };
}

function criarItemCatalogo(campanhaId, { titulo, categoria, colecao, descricao, medidas, cores, preco_texto, destaque }) {
  if (!titulo || !titulo.trim()) return { ok: false, erro: 'É preciso um nome para o produto.' };
  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem),0) AS m FROM julia_catalogo_itens WHERE campanha_id = ?').get(campanhaId).m;
  const info = db.prepare(`
    INSERT INTO julia_catalogo_itens (campanha_id, ordem, titulo, categoria, colecao, descricao, medidas, cores, preco_texto, destaque)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(campanhaId, maxOrdem + 1, titulo.trim(), categoria || null, colecao || null, descricao || null, medidas || null, cores || null, preco_texto || null, destaque || null);
  return { ok: true, itemId: info.lastInsertRowid, resumo: 'Produto "' + titulo.trim() + '" adicionado ao catálogo (id ' + info.lastInsertRowid + ').' };
}

function adicionarFotoItemCatalogo(itemId, fotoId) {
  const item = db.prepare('SELECT id FROM julia_catalogo_itens WHERE id = ?').get(itemId);
  if (!item) return { ok: false, erro: 'Produto do catálogo não encontrado.' };
  const foto = db.prepare('SELECT id FROM julia_fotos WHERE id = ?').get(fotoId);
  if (!foto) return { ok: false, erro: 'Essa foto não existe na biblioteca.' };
  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem),0) AS m FROM julia_catalogo_item_fotos WHERE item_id = ?').get(itemId).m;
  db.prepare('INSERT INTO julia_catalogo_item_fotos (item_id, foto_id, ordem) VALUES (?, ?, ?)').run(itemId, fotoId, maxOrdem + 1);
  return { ok: true, resumo: 'Foto vinculada ao produto.' };
}

function planejarPublicacao(campanhaId, { titulo, canal, data, hora }, usuarioId) {
  if (!titulo || !titulo.trim()) return { ok: false, erro: 'É preciso um título para a publicação.' };
  db.prepare(`
    INSERT INTO julia_agenda (campanha_id, titulo, canal, data, hora, status, criado_por)
    VALUES (?, ?, ?, ?, ?, 'Planejada', ?)
  `).run(campanhaId, titulo.trim(), CANAIS.includes(canal) ? canal : CANAIS[0], data || null, hora || null, usuarioId || null);
  return { ok: true, resumo: 'Publicação "' + titulo.trim() + '" planejada — envio manual necessário (não há postagem automática).' };
}

const CANAIS_TEXTO = { feed: 'texto_feed_ia', stories: 'texto_stories_ia', facebook: 'texto_facebook_ia' };

function definirTextoCanal(campanhaId, { canal, texto }) {
  const coluna = CANAIS_TEXTO[canal];
  if (!coluna) return { ok: false, erro: 'Canal inválido. Use feed, stories ou facebook.' };
  if (!texto || !texto.trim()) return { ok: false, erro: 'É preciso um texto para salvar.' };
  const flag = coluna.replace('_ia', '_adaptado_ia');
  db.prepare(`UPDATE julia_campanhas SET ${coluna}=?, ${flag}=1, atualizado_em=datetime('now') WHERE id=?`)
    .run(texto.trim(), campanhaId);
  return { ok: true, resumo: 'Texto adaptado para ' + canal + ' salvo nesta campanha (texto principal e WhatsApp continuam intactos).' };
}

// Ferramentas de leitura — permitem o chat consultar o que já existe antes de agir,
// em vez de adivinhar ids de foto ou sobrescrever dados sem saber o que já está preenchido.

function listarFotos() {
  const fotos = db.prepare('SELECT id, titulo, legenda, tag FROM julia_fotos ORDER BY criado_em DESC LIMIT 200').all();
  return { ok: true, fotos };
}

function listarCampanhas() {
  const campanhas = db.prepare('SELECT id, nome, formato FROM julia_campanhas ORDER BY atualizado_em DESC LIMIT 100').all();
  return { ok: true, campanhas };
}

function obterCampanha(campanhaId) {
  const campanha = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(campanhaId);
  if (!campanha) return { ok: false, erro: 'Campanha não encontrada.' };
  garantirCincoLaminas(campanhaId);
  const laminas = db.prepare('SELECT ordem, titulo, corpo, foto_id, tema FROM julia_carrossel_laminas WHERE campanha_id = ? ORDER BY ordem').all(campanhaId);
  const itensCatalogo = db.prepare('SELECT id, titulo, categoria, colecao, preco_texto FROM julia_catalogo_itens WHERE campanha_id = ? ORDER BY ordem, id').all(campanhaId);
  const agenda = db.prepare('SELECT id, titulo, canal, data, hora, status FROM julia_agenda WHERE campanha_id = ? ORDER BY data, hora').all(campanhaId);
  return { ok: true, campanha, laminas, itensCatalogo, agenda };
}

module.exports = {
  FORMATOS, CANAIS, TEMAS_VALIDOS, CANAIS_TEXTO, garantirCincoLaminas,
  criarCampanha, editarCampanha, definirLamina, definirPoster, criarItemCatalogo, adicionarFotoItemCatalogo, planejarPublicacao,
  listarFotos, listarCampanhas, obterCampanha, definirTextoCanal
};
