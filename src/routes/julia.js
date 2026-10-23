const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const db = require('../db/db');
const { uploadMemoria, salvarArquivoEmDisco, UPLOAD_ROOT } = require('../middleware/upload');
const { gerarImagemLamina, TEMAS } = require('../services/juliaImagens');
const pdfCatalogoJulia = require('../services/pdfCatalogoJulia');
const { consultarDepartamento } = require('../services/departamentosAgente');
const juliaChat = require('../services/juliaChat');

const router = express.Router();

const TAGS_FOTO = ['Estofado Pronto', 'Transformação Estética', 'Ambiente Decorado', 'Detalhe de Acabamento', 'Vitrine / Catálogo'];
const CANAIS = ['Instagram Feed', 'Instagram Stories', 'WhatsApp Status', 'Lista de Transmissão WhatsApp', 'Facebook'];
const FORMATOS = ['Anúncio', 'Pôster', 'Carrossel', 'Catálogo'];

function garantirCincoLaminas(campanhaId) {
  const existentes = db.prepare('SELECT ordem FROM julia_carrossel_laminas WHERE campanha_id = ?').all(campanhaId).map(r => r.ordem);
  const insert = db.prepare('INSERT INTO julia_carrossel_laminas (campanha_id, ordem, titulo, corpo) VALUES (?, ?, ?, ?)');
  for (let ordem = 1; ordem <= 5; ordem++) {
    if (!existentes.includes(ordem)) insert.run(campanhaId, ordem, '', '');
  }
}

function carregarCampanhaCompleta(id) {
  const campanha = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(id);
  if (!campanha) return null;
  garantirCincoLaminas(id);
  campanha.laminas = db.prepare(`
    SELECT l.*, f.arquivo AS foto_arquivo, f.titulo AS foto_titulo
    FROM julia_carrossel_laminas l LEFT JOIN julia_fotos f ON f.id = l.foto_id
    WHERE l.campanha_id = ? ORDER BY l.ordem
  `).all(id);
  campanha.itensCatalogo = db.prepare('SELECT * FROM julia_catalogo_itens WHERE campanha_id = ? ORDER BY ordem, id').all(id);
  campanha.itensCatalogo.forEach(item => {
    item.fotos = db.prepare(`
      SELECT jcif.id AS vinculo_id, f.* FROM julia_catalogo_item_fotos jcif
      JOIN julia_fotos f ON f.id = jcif.foto_id
      WHERE jcif.item_id = ? ORDER BY jcif.ordem
    `).all(item.id);
  });
  campanha.agenda = db.prepare('SELECT * FROM julia_agenda WHERE campanha_id = ? ORDER BY data, hora').all(id);
  campanha.posterFoto = campanha.poster_foto_id ? db.prepare('SELECT * FROM julia_fotos WHERE id = ?').get(campanha.poster_foto_id) : null;
  return campanha;
}

function baseLocals(req, abaAtiva) {
  const fotos = db.prepare('SELECT * FROM julia_fotos ORDER BY criado_em DESC').all();
  const campanhas = db.prepare('SELECT id, nome, formato, atualizado_em FROM julia_campanhas ORDER BY atualizado_em DESC').all();
  const campanhaId = req.query.campanha_id || (campanhas[0] && campanhas[0].id) || '';
  const campanhaAtiva = campanhaId ? carregarCampanhaCompleta(campanhaId) : null;
  const agendaGeral = db.prepare(`
    SELECT ja.*, jc.nome AS campanha_nome FROM julia_agenda ja
    LEFT JOIN julia_campanhas jc ON jc.id = ja.campanha_id
    ORDER BY ja.data, ja.hora
  `).all();
  const chatMensagens = db.prepare('SELECT * FROM julia_chat_mensagens WHERE campanha_id IS ? ORDER BY criado_em')
    .all(campanhaId || null);
  return {
    abaAtiva, fotos, campanhas, campanhaAtiva, campanhaId, agendaGeral, chatMensagens,
    tagsFoto: TAGS_FOTO, canais: CANAIS, formatos: FORMATOS, temas: TEMAS,
    erro: req.query.erro || null, ok: req.query.ok || null
  };
}

router.get('/julia', (req, res) => {
  res.render('julia', baseLocals(req, req.query.tab || 'chat'));
});

// ---------- Chat de verdade com a Júlia (function calling) ----------
router.post('/julia/chat', async (req, res) => {
  const mensagem = (req.body.mensagem || '').trim();
  const campanhaId = req.body.campanha_id || null;
  if (!mensagem) return res.redirect('/julia?tab=chat' + (campanhaId ? ('&campanha_id=' + campanhaId) : ''));

  const resultado = await juliaChat.conversar({ campanhaId, mensagem, usuarioId: req.session.userId });
  const idFinal = resultado.campanhaId || campanhaId;

  if (resultado.status === 'nao_configurado' || resultado.status === 'erro') {
    return res.redirect('/julia?tab=chat' + (idFinal ? ('&campanha_id=' + idFinal) : '') +
      '&erro=' + encodeURIComponent(resultado.erro || 'Não foi possível conversar com a Júlia agora.'));
  }
  res.redirect('/julia?tab=chat' + (idFinal ? ('&campanha_id=' + idFinal) : ''));
});

// ---------- Fotos ----------
router.post('/julia/fotos', uploadMemoria.array('fotos', 20), async (req, res) => {
  const arquivos = req.files || [];
  const tag = TAGS_FOTO.includes(req.body.tag) ? req.body.tag : TAGS_FOTO[TAGS_FOTO.length - 1];
  const insert = db.prepare('INSERT INTO julia_fotos (titulo, legenda, tag, arquivo, criado_por) VALUES (?, ?, ?, ?, ?)');
  for (const file of arquivos) {
    const nomeArquivo = await salvarArquivoEmDisco('marketing', file);
    insert.run(req.body.titulo || null, req.body.legenda || null, tag, nomeArquivo, req.session.userId);
  }
  res.redirect('/julia?tab=fotos&ok=1');
});

router.get('/julia/fotos/:id/arquivo', (req, res) => {
  const foto = db.prepare('SELECT * FROM julia_fotos WHERE id = ?').get(req.params.id);
  if (!foto) return res.status(404).send('Foto não encontrada.');
  const caminho = path.join(UPLOAD_ROOT, 'marketing', foto.arquivo);
  if (!fs.existsSync(caminho)) return res.status(404).send('Arquivo não encontrado.');
  res.sendFile(caminho);
});

router.post('/julia/fotos/:id/excluir', (req, res) => {
  const foto = db.prepare('SELECT * FROM julia_fotos WHERE id = ?').get(req.params.id);
  if (foto) {
    const emUso = db.prepare('SELECT COUNT(*) AS n FROM julia_carrossel_laminas WHERE foto_id = ?').get(foto.id).n +
      db.prepare('SELECT COUNT(*) AS n FROM julia_catalogo_item_fotos WHERE foto_id = ?').get(foto.id).n +
      db.prepare('SELECT COUNT(*) AS n FROM julia_campanhas WHERE poster_foto_id = ?').get(foto.id).n;
    if (emUso > 0) return res.redirect('/julia?tab=fotos&erro=' + encodeURIComponent('Essa foto está em uso num carrossel, catálogo ou pôster — remova esses vínculos antes de excluir.'));
    const caminho = path.join(UPLOAD_ROOT, 'marketing', foto.arquivo);
    db.prepare('DELETE FROM julia_fotos WHERE id = ?').run(foto.id);
    if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
  }
  res.redirect('/julia?tab=fotos');
});

// ---------- Campanhas (etapas 1-7) ----------
router.post('/julia/campanhas', (req, res) => {
  const nome = (req.body.nome || '').trim();
  if (!nome) return res.redirect('/julia?tab=campanha&erro=' + encodeURIComponent('Dê um nome para a campanha.'));
  const info = db.prepare('INSERT INTO julia_campanhas (nome, formato, criado_por) VALUES (?, ?, ?)').run(nome, 'Anúncio', req.session.userId);
  garantirCincoLaminas(info.lastInsertRowid);
  res.redirect('/julia?tab=campanha&campanha_id=' + info.lastInsertRowid);
});

router.post('/julia/campanhas/:id/editar', (req, res) => {
  const { objetivo, publico_alvo, formato, titulo, texto, hashtags, cta_texto, whatsapp_numero } = req.body;
  db.prepare(`
    UPDATE julia_campanhas SET objetivo=?, publico_alvo=?, formato=?, titulo=?, texto=?, hashtags=?, cta_texto=?, whatsapp_numero=?,
      atualizado_em=datetime('now') WHERE id=?
  `).run(objetivo || null, publico_alvo || null, FORMATOS.includes(formato) ? formato : 'Anúncio', titulo || null, texto || null,
    hashtags || null, cta_texto || 'Fale conosco', whatsapp_numero || null, req.params.id);
  res.redirect('/julia?tab=campanha&campanha_id=' + req.params.id + '&ok=1');
});

// Correção 5: adaptar texto para feed/stories/facebook SEM sobrescrever o título/texto originais,
// e deixando explícito que foi adaptado por IA. Cada rede tem sua própria regra de hashtag —
// o WhatsApp (aba Compartilhar) nunca leva hashtag; Instagram leva todas; Facebook leva só
// as 3 primeiras — e nenhuma hashtag nova é inventada, só as que o responsável já cadastrou.
const DESCRICAO_ALVO_ADAPTAR = {
  feed: 'Feed do Instagram (texto um pouco mais completo)',
  stories: 'Stories do Instagram (texto curto, direto, para tela vertical)',
  facebook: 'Facebook (texto comercial objetivo, destacando os diferenciais da Castros Interiores e com uma chamada para orçamento)'
};
const COLUNAS_ADAPTAR = {
  feed: { texto: 'texto_feed_ia', flag: 'texto_feed_adaptado_ia' },
  stories: { texto: 'texto_stories_ia', flag: 'texto_stories_adaptado_ia' },
  facebook: { texto: 'texto_facebook_ia', flag: 'texto_facebook_adaptado_ia' }
};

router.post('/julia/campanhas/:id/adaptar', async (req, res) => {
  const id = req.params.id;
  const alvo = DESCRICAO_ALVO_ADAPTAR[req.body.alvo] ? req.body.alvo : 'feed';
  const campanha = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(id);
  if (!campanha) return res.redirect('/julia?tab=campanha');
  if (!campanha.titulo && !campanha.texto) {
    return res.redirect('/julia?tab=campanha&campanha_id=' + id + '&erro=' + encodeURIComponent('Preencha título e texto da campanha antes de pedir uma adaptação.'));
  }

  const prompt = 'Adapte o anúncio abaixo para o formato ' + DESCRICAO_ALVO_ADAPTAR[alvo] +
    ', sem inventar preços, prazos ou dados de contato que não estejam aqui e sem incluir hashtags no texto (elas são adicionadas separadamente).' +
    '\nTítulo original: ' + (campanha.titulo || '(não informado)') +
    '\nTexto original: ' + (campanha.texto || '(não informado)') +
    '\nColoque o texto adaptado pronto para uso no campo clientMessageSuggestion da resposta.';

  const resultado = await consultarDepartamento({ departamentoId: 'julia_marketing', prompt, atendimento: null });

  if (resultado.status !== 'concluida' || !resultado.resultado.clientMessageSuggestion) {
    return res.redirect('/julia?tab=campanha&campanha_id=' + id + '&erro=' + encodeURIComponent(resultado.erro || 'Não foi possível adaptar o texto agora.'));
  }

  let textoFinal = resultado.resultado.clientMessageSuggestion;
  if (campanha.hashtags) {
    const tags = campanha.hashtags.split(/\s+/).filter(Boolean);
    const tagsUsadas = alvo === 'facebook' ? tags.slice(0, 3) : tags;
    if (tagsUsadas.length) textoFinal += '\n\n' + tagsUsadas.join(' ');
  }

  const { texto: colunaTexto, flag: colunaFlag } = COLUNAS_ADAPTAR[alvo];
  db.prepare(`UPDATE julia_campanhas SET ${colunaTexto}=?, ${colunaFlag}=1, atualizado_em=datetime('now') WHERE id=?`)
    .run(textoFinal, id);

  res.redirect('/julia?tab=campanha&campanha_id=' + id + '&ok=2');
});

// ---------- Carrossel ----------
router.post('/julia/campanhas/:id/laminas/:ordem', uploadMemoria.single('nova_foto'), async (req, res) => {
  const { id, ordem } = req.params;
  const lamina = db.prepare('SELECT * FROM julia_carrossel_laminas WHERE campanha_id = ? AND ordem = ?').get(id, ordem);
  if (!lamina) return res.redirect('/julia?tab=carrossel&campanha_id=' + id);

  let fotoId = lamina.foto_id;
  if (req.file) {
    const nomeArquivo = await salvarArquivoEmDisco('marketing', req.file);
    const info = db.prepare('INSERT INTO julia_fotos (titulo, tag, arquivo, criado_por) VALUES (?, ?, ?, ?)')
      .run('Lâmina ' + ordem + ' — ' + (req.body.titulo || 'sem título'), 'Transformação Estética', nomeArquivo, req.session.userId);
    fotoId = info.lastInsertRowid;
  } else if (req.body.foto_biblioteca_id) {
    fotoId = req.body.foto_biblioteca_id;
  }

  db.prepare("UPDATE julia_carrossel_laminas SET titulo=?, corpo=?, foto_id=?, tema=?, atualizado_em=datetime('now') WHERE id=?")
    .run(req.body.titulo || '', req.body.corpo || '', fotoId || null, req.body.tema || 'editorial_creme', lamina.id);

  res.redirect('/julia?tab=carrossel&campanha_id=' + id + '&ok=1');
});

router.post('/julia/campanhas/:id/laminas/:laminaId/mover', (req, res) => {
  const { id, laminaId } = req.params;
  const direcao = req.body.direcao === 'cima' ? -1 : 1;
  const atual = db.prepare('SELECT * FROM julia_carrossel_laminas WHERE id = ? AND campanha_id = ?').get(laminaId, id);
  if (!atual) return res.redirect('/julia?tab=carrossel&campanha_id=' + id);
  const vizinha = db.prepare('SELECT * FROM julia_carrossel_laminas WHERE campanha_id = ? AND ordem = ?').get(id, atual.ordem + direcao);
  if (vizinha) {
    db.prepare('UPDATE julia_carrossel_laminas SET ordem = ? WHERE id = ?').run(atual.ordem, vizinha.id);
    db.prepare('UPDATE julia_carrossel_laminas SET ordem = ? WHERE id = ?').run(atual.ordem + direcao, atual.id);
  }
  res.redirect('/julia?tab=carrossel&campanha_id=' + id);
});

// Nome de campanha quase sempre tem acento (ex.: "Pôster") — sem isso, o Content-Disposition
// grava o nome do arquivo corrompido (vira caractere inválido no download).
function nomeArquivoSeguro(texto) {
  return String(texto || 'arquivo').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'arquivo';
}

async function caminhoAbsolutoFoto(fotoId) {
  if (!fotoId) return null;
  const foto = db.prepare('SELECT * FROM julia_fotos WHERE id = ?').get(fotoId);
  if (!foto) return null;
  const caminho = path.join(UPLOAD_ROOT, 'marketing', foto.arquivo);
  return fs.existsSync(caminho) ? caminho : null;
}

router.get('/julia/campanhas/:id/laminas/:ordem/imagem.png', async (req, res) => {
  const { id, ordem } = req.params;
  const lamina = db.prepare('SELECT * FROM julia_carrossel_laminas WHERE campanha_id = ? AND ordem = ?').get(id, ordem);
  if (!lamina) return res.status(404).send('Lâmina não encontrada.');
  const campanha = db.prepare('SELECT nome FROM julia_campanhas WHERE id = ?').get(id);
  const caminhoFoto = await caminhoAbsolutoFoto(lamina.foto_id);
  const png = await gerarImagemLamina({ titulo: lamina.titulo, corpo: lamina.corpo, caminhoFotoAbsoluto: caminhoFoto, tema: lamina.tema, rodape: 'Castros Interiores' });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'inline; filename="lamina-' + ordem + '-' + nomeArquivoSeguro(campanha ? campanha.nome : 'carrossel') + '.png"');
  res.send(png);
});

router.get('/julia/campanhas/:id/carrossel.zip', async (req, res) => {
  const id = req.params.id;
  const campanha = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(id);
  if (!campanha) return res.status(404).send('Campanha não encontrada.');
  garantirCincoLaminas(id);
  const laminas = db.prepare('SELECT * FROM julia_carrossel_laminas WHERE campanha_id = ? ORDER BY ordem').all(id);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="carrossel-' + campanha.nome.replace(/[^a-z0-9]+/gi, '-') + '.zip"');
  const arquivo = archiver('zip');
  arquivo.pipe(res);
  for (const lamina of laminas) {
    const caminhoFoto = await caminhoAbsolutoFoto(lamina.foto_id);
    const png = await gerarImagemLamina({ titulo: lamina.titulo, corpo: lamina.corpo, caminhoFotoAbsoluto: caminhoFoto, tema: lamina.tema, rodape: 'Castros Interiores' });
    arquivo.append(png, { name: 'lamina-' + lamina.ordem + '.png' });
  }
  arquivo.finalize();
});

// ---------- Pôster ----------
router.post('/julia/campanhas/:id/poster', (req, res) => {
  db.prepare("UPDATE julia_campanhas SET poster_foto_id=?, poster_tema=?, atualizado_em=datetime('now') WHERE id=?")
    .run(req.body.foto_id || null, req.body.tema || 'editorial_creme', req.params.id);
  res.redirect('/julia?tab=poster&campanha_id=' + req.params.id + '&ok=1');
});

router.get('/julia/campanhas/:id/poster.png', async (req, res) => {
  const campanha = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(req.params.id);
  if (!campanha) return res.status(404).send('Campanha não encontrada.');
  const caminhoFoto = await caminhoAbsolutoFoto(campanha.poster_foto_id);
  const png = await gerarImagemLamina({
    titulo: campanha.titulo || campanha.nome,
    corpo: campanha.texto || '',
    caminhoFotoAbsoluto: caminhoFoto,
    tema: campanha.poster_tema,
    rodape: campanha.cta_texto || 'Castros Interiores'
  });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'inline; filename="poster-' + nomeArquivoSeguro(campanha.nome) + '.png"');
  res.send(png);
});

// ---------- Catálogo ----------
router.post('/julia/campanhas/:id/catalogo/itens', (req, res) => {
  const { titulo, categoria, colecao, descricao, medidas, cores, preco_texto, destaque } = req.body;
  if (!titulo || !titulo.trim()) return res.redirect('/julia?tab=catalogo&campanha_id=' + req.params.id);
  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem),0) AS m FROM julia_catalogo_itens WHERE campanha_id = ?').get(req.params.id).m;
  db.prepare(`
    INSERT INTO julia_catalogo_itens (campanha_id, ordem, titulo, categoria, colecao, descricao, medidas, cores, preco_texto, destaque)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, maxOrdem + 1, titulo.trim(), categoria || null, colecao || null, descricao || null, medidas || null, cores || null, preco_texto || null, destaque || null);
  res.redirect('/julia?tab=catalogo&campanha_id=' + req.params.id + '&ok=1');
});

router.post('/julia/campanhas/:id/catalogo/itens/:itemId/editar', (req, res) => {
  const { titulo, categoria, colecao, descricao, medidas, cores, preco_texto, destaque } = req.body;
  db.prepare(`
    UPDATE julia_catalogo_itens SET titulo=?, categoria=?, colecao=?, descricao=?, medidas=?, cores=?, preco_texto=?, destaque=?,
      atualizado_em=datetime('now') WHERE id=? AND campanha_id=?
  `).run(titulo || '', categoria || null, colecao || null, descricao || null, medidas || null, cores || null, preco_texto || null, destaque || null, req.params.itemId, req.params.id);
  res.redirect('/julia?tab=catalogo&campanha_id=' + req.params.id);
});

router.post('/julia/campanhas/:id/catalogo/itens/:itemId/excluir', (req, res) => {
  db.prepare('DELETE FROM julia_catalogo_itens WHERE id = ? AND campanha_id = ?').run(req.params.itemId, req.params.id);
  res.redirect('/julia?tab=catalogo&campanha_id=' + req.params.id);
});

router.post('/julia/campanhas/:id/catalogo/itens/:itemId/fotos', uploadMemoria.array('fotos', 5), async (req, res) => {
  const { id, itemId } = req.params;
  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem),0) AS m FROM julia_catalogo_item_fotos WHERE item_id = ?').get(itemId).m;
  const insertVinculo = db.prepare('INSERT INTO julia_catalogo_item_fotos (item_id, foto_id, ordem) VALUES (?, ?, ?)');

  let ordem = maxOrdem;
  if (req.body.foto_biblioteca_id) {
    ordem++;
    insertVinculo.run(itemId, req.body.foto_biblioteca_id, ordem);
  }
  for (const file of (req.files || [])) {
    const nomeArquivo = await salvarArquivoEmDisco('marketing', file);
    const info = db.prepare('INSERT INTO julia_fotos (titulo, tag, arquivo, criado_por) VALUES (?, ?, ?, ?)')
      .run('Produto do catálogo', 'Vitrine / Catálogo', nomeArquivo, req.session.userId);
    ordem++;
    insertVinculo.run(itemId, info.lastInsertRowid, ordem);
  }
  res.redirect('/julia?tab=catalogo&campanha_id=' + id + '&ok=2');
});

router.post('/julia/campanhas/:id/catalogo/itens/:itemId/fotos/:vinculoId/excluir', (req, res) => {
  db.prepare('DELETE FROM julia_catalogo_item_fotos WHERE id = ? AND item_id = ?').run(req.params.vinculoId, req.params.itemId);
  res.redirect('/julia?tab=catalogo&campanha_id=' + req.params.id);
});

router.get('/julia/campanhas/:id/catalogo.pdf', (req, res) => {
  const id = req.params.id;
  const campanha = db.prepare('SELECT * FROM julia_campanhas WHERE id = ?').get(id);
  if (!campanha) return res.status(404).send('Campanha não encontrada.');
  const itens = db.prepare('SELECT * FROM julia_catalogo_itens WHERE campanha_id = ? ORDER BY ordem, id').all(id).map(item => {
    const fotos = db.prepare(`
      SELECT f.arquivo FROM julia_catalogo_item_fotos jcif JOIN julia_fotos f ON f.id = jcif.foto_id
      WHERE jcif.item_id = ? ORDER BY jcif.ordem
    `).all(item.id).map(f => f.arquivo);
    return { ...item, fotos };
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="catalogo-' + nomeArquivoSeguro(campanha.nome) + '.pdf"');
  pdfCatalogoJulia.gerar(campanha, itens, { whatsapp: campanha.whatsapp_numero }).pipe(res);
});

// ---------- Agenda (planejamento — sem publicação automática) ----------
router.post('/julia/campanhas/:id/agenda', (req, res) => {
  const { titulo, canal, data, hora } = req.body;
  if (!titulo || !titulo.trim()) return res.redirect('/julia?tab=agenda&campanha_id=' + req.params.id);
  db.prepare(`
    INSERT INTO julia_agenda (campanha_id, titulo, canal, data, hora, status, criado_por)
    VALUES (?, ?, ?, ?, ?, 'Planejada', ?)
  `).run(req.params.id, titulo.trim(), CANAIS.includes(canal) ? canal : CANAIS[0], data || null, hora || null, req.session.userId);
  res.redirect('/julia?tab=agenda&campanha_id=' + req.params.id + '&ok=1');
});

router.post('/julia/agenda/:id/status', (req, res) => {
  const status = ['Planejada', 'Concluída', 'Com erro'].includes(req.body.status) ? req.body.status : 'Planejada';
  const item = db.prepare('SELECT * FROM julia_agenda WHERE id = ?').get(req.params.id);
  db.prepare('UPDATE julia_agenda SET status = ? WHERE id = ?').run(status, req.params.id);
  res.redirect('/julia?tab=agenda' + (item && item.campanha_id ? ('&campanha_id=' + item.campanha_id) : ''));
});

router.post('/julia/agenda/:id/excluir', (req, res) => {
  const item = db.prepare('SELECT * FROM julia_agenda WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM julia_agenda WHERE id = ?').run(req.params.id);
  res.redirect('/julia?tab=agenda' + (item && item.campanha_id ? ('&campanha_id=' + item.campanha_id) : ''));
});

module.exports = router;
