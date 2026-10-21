const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');
const { upload, uploadMemoria, salvarArquivoEmDisco, UPLOAD_ROOT, CATEGORIAS_FOTO } = require('../middleware/upload');
const { gerarNumero } = require('../services/numeroAtendimento');
const statusService = require('../services/statusService');
const versionamento = require('../services/versionamento');
const iaAgent = require('../services/iaAgent');
const pdfInterno = require('../services/pdfInterno');
const pdfCliente = require('../services/pdfCliente');

const router = express.Router();

const COMPONENTES_PADRAO = [
  { valor: 'madeira_estrutura', rotulo: 'Madeira / estrutura' },
  { valor: 'pes', rotulo: 'Pés' },
  { valor: 'ferragens', rotulo: 'Ferragens' },
  { valor: 'mecanismos', rotulo: 'Mecanismos (retrátil/reclinável)' },
  { valor: 'molas', rotulo: 'Molas' },
  { valor: 'percintas', rotulo: 'Percintas' },
  { valor: 'espumas', rotulo: 'Espumas' },
  { valor: 'enchimentos', rotulo: 'Enchimentos' },
  { valor: 'tecido_revestimento', rotulo: 'Tecido / revestimento' },
  { valor: 'ziperes', rotulo: 'Zíperes' },
  { valor: 'acabamentos', rotulo: 'Acabamentos' }
];

const AREAS_ACHADO = [
  { valor: 'estrutura', rotulo: 'Estrutura' },
  { valor: 'base_e_pes', rotulo: 'Base e pés' },
  { valor: 'assento', rotulo: 'Assento' },
  { valor: 'encosto', rotulo: 'Encosto' },
  { valor: 'bracos', rotulo: 'Braços' },
  { valor: 'revestimento_e_costuras', rotulo: 'Revestimento e costuras' },
  { valor: 'espumas_e_enchimentos', rotulo: 'Espumas e enchimentos' },
  { valor: 'percintas_molas_e_sustentacao', rotulo: 'Percintas, molas e sustentação' },
  { valor: 'ferragens', rotulo: 'Ferragens' },
  { valor: 'mecanismos_retrateis_ou_reclinaveis', rotulo: 'Mecanismos retráteis ou reclináveis' },
  { valor: 'forro_inferior_e_acabamentos', rotulo: 'Forro inferior e acabamentos' }
];

function carregarAtendimento(id) {
  const atendimento = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(id);
  if (!atendimento) return null;
  atendimento.fotos = db.prepare('SELECT * FROM fotos WHERE atendimento_id = ? ORDER BY categoria, ordem, id').all(id);
  atendimento.achados = db.prepare("SELECT * FROM achados WHERE atendimento_id = ? AND status_revisao != 'descartado' ORDER BY area, id").all(id);
  atendimento.achadosDescartados = db.prepare("SELECT * FROM achados WHERE atendimento_id = ? AND status_revisao = 'descartado' ORDER BY id DESC").all(id);
  atendimento.reaproveitamento = db.prepare('SELECT * FROM reaproveitamento WHERE atendimento_id = ?').all(id);
  atendimento.propostas = db.prepare('SELECT * FROM propostas WHERE atendimento_id = ?').all(id);
  atendimento.orcamentoItens = db.prepare('SELECT o.*, m.nome AS material_nome FROM orcamento_itens o LEFT JOIN materiais m ON m.id = o.material_id WHERE o.atendimento_id = ? ORDER BY o.id').all(id);
  atendimento.parecer = db.prepare('SELECT * FROM parecer WHERE atendimento_id = ?').get(id);
  atendimento.ultimaAnaliseIA = db.prepare('SELECT * FROM analises_ia WHERE atendimento_id = ? ORDER BY id DESC LIMIT 1').get(id);
  return atendimento;
}

function mapComponenteRotulo(valor) {
  const c = COMPONENTES_PADRAO.find(c => c.valor === valor);
  return c ? c.rotulo : valor;
}
function mapAreaRotulo(valor) {
  const a = AREAS_ACHADO.find(a => a.valor === valor);
  return a ? a.rotulo : valor;
}

function baseLocals(req, atendimento, abaAtiva) {
  const materiaisDisponiveis = db.prepare('SELECT * FROM materiais ORDER BY nome').all();
  const historico = versionamento.listar(atendimento.id);
  return {
    atendimento,
    abaAtiva,
    categoriasFoto: CATEGORIAS_FOTO,
    componentesPadrao: COMPONENTES_PADRAO,
    areasAchado: AREAS_ACHADO,
    statusRotulos: statusService.ROTULOS,
    mapComponenteRotulo,
    mapAreaRotulo,
    materiaisDisponiveis,
    historico,
    usuarioId: req.session.userId,
    query: req.query
  };
}

// ---------- Dashboard ----------
router.get('/', (req, res) => {
  const atendimentos = db.prepare('SELECT * FROM atendimentos ORDER BY atualizado_em DESC').all();
  res.render('dashboard', { atendimentos, statusRotulos: statusService.ROTULOS });
});

// ---------- Avaliação rápida (envia foto(s) + descrição e já roda a análise) ----------
router.get('/analise-rapida', (req, res) => {
  res.render('analise_rapida', { erro: null, iaConfigurada: !!process.env.ANTHROPIC_API_KEY });
});

router.post('/analise-rapida', uploadMemoria.array('fotos', 20), async (req, res) => {
  const arquivos = req.files || [];
  if (arquivos.length === 0) {
    return res.render('analise_rapida', { erro: 'Envie ao menos uma foto para iniciar a avaliação.', iaConfigurada: !!process.env.ANTHROPIC_API_KEY });
  }

  const numero = gerarNumero();
  const campos = extrairCamposCadastro({
    cliente_nome: req.body.cliente_nome,
    tipo_movel: req.body.tipo_movel,
    defeitos_relatados: req.body.descricao,
    observacoes: 'Criado pela Avaliação rápida.'
  });
  const info = db.prepare(`
    INSERT INTO atendimentos (numero, status, cliente_nome, tipo_movel, defeitos_relatados, observacoes, criado_por)
    VALUES (?, 'rascunho', ?, ?, ?, ?, ?)
  `).run(numero, campos.cliente_nome, campos.tipo_movel, campos.defeitos_relatados, campos.observacoes, req.session.userId);
  const id = info.lastInsertRowid;
  versionamento.registrar({ atendimentoId: id, entidade: 'atendimento', entidadeId: id, acao: 'criado_avaliacao_rapida', usuarioId: req.session.userId });

  const insertFoto = db.prepare('INSERT INTO fotos (atendimento_id, categoria, arquivo, legenda, ordem) VALUES (?, ?, ?, ?, ?)');
  for (let idx = 0; idx < arquivos.length; idx++) {
    const nomeArquivo = await salvarArquivoEmDisco(id, arquivos[idx]);
    insertFoto.run(id, 'detalhes_defeitos', nomeArquivo, null, idx + 1);
  }

  statusService.avancar(id, 'pronto_para_analise');

  let erroIA = null;
  if (process.env.ANTHROPIC_API_KEY) {
    const resultadoIA = await executarAnaliseIA(id, req.session.userId);
    if (!resultadoIA.ok) erroIA = resultadoIA.erro;
  }

  const destino = '/atendimentos/' + id + '?tab=painel&ok=1' + (erroIA ? '&erroIA=' + encodeURIComponent(erroIA) : '');
  res.redirect(destino);
});

// ---------- Cadastro ----------
router.get('/atendimentos/novo', (req, res) => {
  res.render('atendimento_novo', { erro: null, valores: {} });
});

router.post('/atendimentos', (req, res) => {
  const numero = gerarNumero();
  const campos = extrairCamposCadastro(req.body);
  const info = db.prepare(`
    INSERT INTO atendimentos (
      numero, status, cliente_nome, cliente_telefone, tipo_movel, quantidade_pecas,
      medidas, tempo_uso, defeitos_relatados, servico_desejado, historico_reformas,
      preferencia_tecido, observacoes, criado_por
    ) VALUES (?, 'rascunho', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    numero, campos.cliente_nome, campos.cliente_telefone, campos.tipo_movel, campos.quantidade_pecas,
    campos.medidas, campos.tempo_uso, campos.defeitos_relatados, campos.servico_desejado,
    campos.historico_reformas, campos.preferencia_tecido, campos.observacoes, req.session.userId
  );
  statusService.avancar(info.lastInsertRowid, 'aguardando_fotos');
  versionamento.registrar({ atendimentoId: info.lastInsertRowid, entidade: 'atendimento', entidadeId: info.lastInsertRowid, acao: 'criado', snapshot: campos, usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + info.lastInsertRowid);
});

function extrairCamposCadastro(body) {
  return {
    cliente_nome: (body.cliente_nome || '').trim() || null,
    cliente_telefone: (body.cliente_telefone || '').trim() || null,
    tipo_movel: (body.tipo_movel || '').trim() || null,
    quantidade_pecas: (body.quantidade_pecas || '').trim() || null,
    medidas: (body.medidas || '').trim() || null,
    tempo_uso: (body.tempo_uso || '').trim() || null,
    defeitos_relatados: (body.defeitos_relatados || '').trim() || null,
    servico_desejado: (body.servico_desejado || '').trim() || null,
    historico_reformas: (body.historico_reformas || '').trim() || null,
    preferencia_tecido: (body.preferencia_tecido || '').trim() || null,
    observacoes: (body.observacoes || '').trim() || null
  };
}

router.get('/atendimentos/:id', (req, res) => {
  const atendimento = carregarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Atendimento não encontrado.' });
  const aba = req.query.tab || 'cadastro';
  res.render('atendimento', baseLocals(req, atendimento, aba));
});

router.post('/atendimentos/:id/editar', (req, res) => {
  const atendimento = carregarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Atendimento não encontrado.' });
  const campos = extrairCamposCadastro(req.body);
  db.prepare(`
    UPDATE atendimentos SET cliente_nome=?, cliente_telefone=?, tipo_movel=?, quantidade_pecas=?,
      medidas=?, tempo_uso=?, defeitos_relatados=?, servico_desejado=?, historico_reformas=?,
      preferencia_tecido=?, observacoes=?, atualizado_em = datetime('now')
    WHERE id = ?
  `).run(
    campos.cliente_nome, campos.cliente_telefone, campos.tipo_movel, campos.quantidade_pecas,
    campos.medidas, campos.tempo_uso, campos.defeitos_relatados, campos.servico_desejado,
    campos.historico_reformas, campos.preferencia_tecido, campos.observacoes, req.params.id
  );
  if (atendimento.fotos.length === 0) statusService.avancar(req.params.id, 'aguardando_fotos');
  versionamento.registrar({ atendimentoId: req.params.id, entidade: 'atendimento', entidadeId: req.params.id, acao: 'editado', snapshot: campos, usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + req.params.id + '?tab=cadastro&ok=1');
});

// ---------- Fotos ----------
router.post('/atendimentos/:id/fotos', upload.array('fotos', 20), async (req, res) => {
  const id = req.params.id;
  const atendimento = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(id);
  if (!atendimento) return res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Atendimento não encontrado.' });
  const categoria = req.body.categoria;
  const valido = CATEGORIAS_FOTO.some(c => c.valor === categoria);
  if (!valido) return res.redirect('/atendimentos/' + id + '?tab=fotos&erro=categoria');

  const arquivos = req.files || [];
  const legendas = Array.isArray(req.body.legenda) ? req.body.legenda : [req.body.legenda];
  const insert = db.prepare('INSERT INTO fotos (atendimento_id, categoria, arquivo, legenda, ordem) VALUES (?, ?, ?, ?, ?)');
  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem),0) AS m FROM fotos WHERE atendimento_id = ? AND categoria = ?').get(id, categoria).m;
  for (let idx = 0; idx < arquivos.length; idx++) {
    const nomeArquivo = await salvarArquivoEmDisco(id, arquivos[idx]);
    const legenda = (legendas[idx] || legendas[0] || '').toString().trim() || null;
    insert.run(id, categoria, nomeArquivo, legenda, maxOrdem + idx + 1);
  }

  if (arquivos.length > 0) {
    statusService.avancar(id, 'pronto_para_analise');
    statusService.invalidarRevisaoSeNecessario(id);
    versionamento.registrar({ atendimentoId: id, entidade: 'foto', acao: 'fotos_adicionadas', snapshot: { categoria, quantidade: arquivos.length }, usuarioId: req.session.userId });
  }
  res.redirect('/atendimentos/' + id + '?tab=fotos&ok=1');
});

router.get('/atendimentos/:id/fotos/:fotoId/arquivo', (req, res) => {
  const foto = db.prepare('SELECT * FROM fotos WHERE id = ? AND atendimento_id = ?').get(req.params.fotoId, req.params.id);
  if (!foto) return res.status(404).send('Foto não encontrada.');
  const caminho = path.join(UPLOAD_ROOT, String(req.params.id), foto.arquivo);
  if (!fs.existsSync(caminho)) return res.status(404).send('Arquivo não encontrado.');
  res.sendFile(caminho);
});

router.post('/atendimentos/:id/fotos/:fotoId/excluir', (req, res) => {
  const foto = db.prepare('SELECT * FROM fotos WHERE id = ? AND atendimento_id = ?').get(req.params.fotoId, req.params.id);
  if (foto) {
    const caminho = path.join(UPLOAD_ROOT, String(req.params.id), foto.arquivo);
    db.prepare('DELETE FROM fotos WHERE id = ?').run(foto.id);
    if (fs.existsSync(caminho)) fs.unlinkSync(caminho);
    versionamento.registrar({ atendimentoId: req.params.id, entidade: 'foto', entidadeId: foto.id, acao: 'foto_excluida', snapshot: { categoria: foto.categoria, arquivo: foto.arquivo }, usuarioId: req.session.userId });
  }
  res.redirect('/atendimentos/' + req.params.id + '?tab=fotos');
});

// ---------- Análise por IA ----------
// Função compartilhada entre a análise normal (dentro do atendimento) e a avaliação rápida.
async function executarAnaliseIA(id, usuarioId) {
  const atendimento = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(id);
  if (!atendimento) return { ok: false, erro: 'Atendimento não encontrado.' };
  const fotosDb = db.prepare('SELECT * FROM fotos WHERE atendimento_id = ?').all(id);
  if (fotosDb.length === 0) return { ok: false, erro: 'sem_fotos' };

  const fotosComBase64 = fotosDb.map(f => {
    const caminho = path.join(UPLOAD_ROOT, String(id), f.arquivo);
    let base64 = null;
    try { base64 = fs.readFileSync(caminho).toString('base64'); } catch (_) { base64 = null; }
    return { ...f, base64 };
  }).filter(f => f.base64);

  const resultado = await iaAgent.avaliarFotos({ atendimento, fotos: fotosComBase64 });

  db.prepare('INSERT INTO analises_ia (atendimento_id, modelo, status, resultado_json, erro) VALUES (?, ?, ?, ?, ?)')
    .run(id, resultado.modelo || process.env.ANTHROPIC_MODEL || null, resultado.status,
      resultado.resultado ? JSON.stringify(resultado.resultado) : null, resultado.erro || null);
  const analiseId = db.prepare('SELECT last_insert_rowid() AS id').get().id;

  if (resultado.status !== 'concluida') {
    return { ok: false, erro: resultado.erro || 'Falha na análise.' };
  }

  const insertAchado = db.prepare(`
    INSERT INTO achados (atendimento_id, area, descricao, foto_id, origem, gravidade, intervencao_sugerida, inspecao_necessaria, gerado_por_ia, analise_ia_id, status_revisao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pendente')
  `);
  const fotoPorCategoria = {};
  fotosDb.forEach(f => { if (!fotoPorCategoria[f.categoria]) fotoPorCategoria[f.categoria] = f.id; });

  for (const achado of resultado.resultado.achados) {
    const fotoId = achado.foto_referencia ? (fotoPorCategoria[achado.foto_referencia] || null) : null;
    let descricao = achado.descricao;
    if (achado.limitacao) descricao += ' [Limitação: ' + achado.limitacao + ']';
    insertAchado.run(id, achado.area, descricao, fotoId, achado.origem, achado.gravidade,
      achado.intervencao_sugerida || null, achado.inspecao_necessaria || null, analiseId);
  }

  statusService.avancar(id, 'analise_preliminar_concluida');
  statusService.invalidarRevisaoSeNecessario(id);
  versionamento.registrar({ atendimentoId: id, entidade: 'achado', acao: 'analise_ia_executada', snapshot: { analiseId, quantidade: resultado.resultado.achados.length }, usuarioId });
  return { ok: true, quantidade: resultado.resultado.achados.length };
}

router.post('/atendimentos/:id/analisar', async (req, res) => {
  const id = req.params.id;
  const resultado = await executarAnaliseIA(id, req.session.userId);
  if (!resultado.ok) {
    if (resultado.erro === 'sem_fotos') return res.redirect('/atendimentos/' + id + '?tab=fotos&erro=sem_fotos');
    return res.redirect('/atendimentos/' + id + '?tab=analise&erroIA=' + encodeURIComponent(resultado.erro));
  }
  res.redirect('/atendimentos/' + id + '?tab=analise&ok=1');
});

// ---------- Revisão dos achados ----------
router.post('/atendimentos/:id/achados', (req, res) => {
  const id = req.params.id;
  const area = req.body.area;
  if (!area) return res.redirect('/atendimentos/' + id + '?tab=analise');
  db.prepare(`
    INSERT INTO achados (atendimento_id, area, descricao, origem, gravidade, intervencao_sugerida, inspecao_necessaria, gerado_por_ia, status_revisao)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'confirmado')
  `).run(id, area, req.body.descricao || '', req.body.origem || 'confirmado_oficina', req.body.gravidade || 'nao_avaliavel',
    req.body.intervencao_sugerida || null, req.body.inspecao_necessaria || null);
  versionamento.registrar({ atendimentoId: id, entidade: 'achado', acao: 'achado_manual_criado', usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=analise');
});

router.post('/atendimentos/:id/achados/:achadoId', (req, res) => {
  const { id, achadoId } = req.params;
  const achado = db.prepare('SELECT * FROM achados WHERE id = ? AND atendimento_id = ?').get(achadoId, id);
  if (!achado) return res.redirect('/atendimentos/' + id + '?tab=analise');
  const acao = req.body.acao;

  versionamento.registrar({ atendimentoId: id, entidade: 'achado', entidadeId: achado.id, acao: 'versao_anterior', snapshot: achado, usuarioId: req.session.userId });

  if (acao === 'confirmar') {
    db.prepare("UPDATE achados SET status_revisao='confirmado', atualizado_em=datetime('now') WHERE id = ?").run(achadoId);
  } else if (acao === 'descartar') {
    db.prepare("UPDATE achados SET status_revisao='descartado', atualizado_em=datetime('now') WHERE id = ?").run(achadoId);
  } else if (acao === 'editar') {
    db.prepare(`
      UPDATE achados SET descricao=?, gravidade=?, intervencao_sugerida=?, inspecao_necessaria=?,
        origem=?, status_revisao='editado', versao = versao + 1, atualizado_em=datetime('now')
      WHERE id = ?
    `).run(req.body.descricao, req.body.gravidade, req.body.intervencao_sugerida || null,
      req.body.inspecao_necessaria || null, req.body.origem, achadoId);
  }
  res.redirect('/atendimentos/' + id + '?tab=analise');
});

router.post('/atendimentos/:id/revisar', (req, res) => {
  const id = req.params.id;
  const pendentes = db.prepare("SELECT COUNT(*) AS n FROM achados WHERE atendimento_id = ? AND status_revisao = 'pendente'").get(id).n;
  if (pendentes > 0) {
    return res.redirect('/atendimentos/' + id + '?tab=analise&erro=pendentes');
  }
  db.prepare("UPDATE atendimentos SET revisado_em = datetime('now'), responsavel_nome = ?, atualizado_em = datetime('now') WHERE id = ?")
    .run(req.body.responsavel_nome || req.session.userNome, id);
  statusService.avancar(id, 'revisado_pelo_responsavel');
  versionamento.registrar({ atendimentoId: id, entidade: 'atendimento', acao: 'revisado_pelo_responsavel', usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=analise&ok=2');
});

router.post('/atendimentos/:id/marcar-aguardando-inspecao', (req, res) => {
  statusService.avancar(req.params.id, 'aguardando_inspecao');
  res.redirect('/atendimentos/' + req.params.id + '?tab=analise');
});

// ---------- Reaproveitamento ----------
router.post('/atendimentos/:id/reaproveitamento', (req, res) => {
  const id = req.params.id;
  const componente = req.body.componente;
  if (!COMPONENTES_PADRAO.some(c => c.valor === componente)) return res.redirect('/atendimentos/' + id + '?tab=reaproveitamento');
  const existente = db.prepare('SELECT * FROM reaproveitamento WHERE atendimento_id = ? AND componente = ?').get(id, componente);
  const dados = {
    condicao: (req.body.condicao || '').trim() || null,
    possibilidade: req.body.possibilidade || 'pendente',
    reparo_necessario: (req.body.reparo_necessario || '').trim() || null,
    criterio_aprovacao: (req.body.criterio_aprovacao || '').trim() || null,
    efeito_custo: (req.body.efeito_custo || '').trim() || null
  };
  if (existente) {
    db.prepare(`UPDATE reaproveitamento SET condicao=?, possibilidade=?, reparo_necessario=?, criterio_aprovacao=?, efeito_custo=?, atualizado_em=datetime('now') WHERE id=?`)
      .run(dados.condicao, dados.possibilidade, dados.reparo_necessario, dados.criterio_aprovacao, dados.efeito_custo, existente.id);
  } else {
    db.prepare(`INSERT INTO reaproveitamento (atendimento_id, componente, condicao, possibilidade, reparo_necessario, criterio_aprovacao, efeito_custo) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, componente, dados.condicao, dados.possibilidade, dados.reparo_necessario, dados.criterio_aprovacao, dados.efeito_custo);
  }
  versionamento.registrar({ atendimentoId: id, entidade: 'reaproveitamento', acao: 'atualizado', snapshot: { componente, ...dados }, usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=reaproveitamento&ok=1');
});

// ---------- Propostas ----------
router.post('/atendimentos/:id/propostas/:tipo', (req, res) => {
  const { id, tipo } = req.params;
  if (!['essencial', 'recomendada', 'completa'].includes(tipo)) return res.redirect('/atendimentos/' + id + '?tab=propostas');
  const dados = {
    servicos: (req.body.servicos || '').trim() || null,
    manter: (req.body.manter || '').trim() || null,
    recuperar: (req.body.recuperar || '').trim() || null,
    substituir: (req.body.substituir || '').trim() || null,
    pendencias: (req.body.pendencias || '').trim() || null,
    beneficios: (req.body.beneficios || '').trim() || null,
    limitacoes: (req.body.limitacoes || '').trim() || null
  };
  const existente = db.prepare('SELECT * FROM propostas WHERE atendimento_id = ? AND tipo = ?').get(id, tipo);
  if (existente) {
    db.prepare(`UPDATE propostas SET servicos=?, manter=?, recuperar=?, substituir=?, pendencias=?, beneficios=?, limitacoes=?, atualizado_em=datetime('now') WHERE id=?`)
      .run(dados.servicos, dados.manter, dados.recuperar, dados.substituir, dados.pendencias, dados.beneficios, dados.limitacoes, existente.id);
  } else {
    db.prepare(`INSERT INTO propostas (atendimento_id, tipo, servicos, manter, recuperar, substituir, pendencias, beneficios, limitacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, tipo, dados.servicos, dados.manter, dados.recuperar, dados.substituir, dados.pendencias, dados.beneficios, dados.limitacoes);
  }
  versionamento.registrar({ atendimentoId: id, entidade: 'proposta', acao: 'atualizada', snapshot: { tipo, ...dados }, usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=propostas&ok=1');
});

router.post('/atendimentos/:id/propostas/:tipo/selecionar', (req, res) => {
  const { id, tipo } = req.params;
  const proposta = db.prepare('SELECT * FROM propostas WHERE atendimento_id = ? AND tipo = ?').get(id, tipo);
  if (proposta) {
    db.prepare("UPDATE atendimentos SET proposta_selecionada_id = ?, atualizado_em = datetime('now') WHERE id = ?").run(proposta.id, id);
    versionamento.registrar({ atendimentoId: id, entidade: 'proposta', entidadeId: proposta.id, acao: 'selecionada', usuarioId: req.session.userId });
  }
  res.redirect('/atendimentos/' + id + '?tab=propostas&ok=2');
});

// ---------- Orçamento ----------
router.post('/atendimentos/:id/orcamento/itens', (req, res) => {
  const id = req.params.id;
  const quantidadeTexto = (req.body.quantidade || '').trim();
  const custoUnitario = req.body.custo_unitario !== undefined && req.body.custo_unitario !== '' ? parseFloat(req.body.custo_unitario) : null;
  const quantidadeNum = quantidadeTexto !== '' && !isNaN(parseFloat(quantidadeTexto.replace(',', '.'))) ? parseFloat(quantidadeTexto.replace(',', '.')) : null;
  const subtotal = (quantidadeNum !== null && custoUnitario !== null) ? Math.round(quantidadeNum * custoUnitario * 100) / 100 : null;
  const materialId = req.body.material_id ? parseInt(req.body.material_id, 10) : null;

  db.prepare(`
    INSERT INTO orcamento_itens (atendimento_id, tipo, material_id, descricao, quantidade, unidade, custo_unitario, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.body.tipo || 'outro', materialId, req.body.descricao || '', quantidadeTexto || 'quantidade a levantar',
    req.body.unidade || null, custoUnitario, subtotal);

  versionamento.registrar({ atendimentoId: id, entidade: 'orcamento', acao: 'item_adicionado', usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=orcamento&ok=1');
});

router.post('/atendimentos/:id/orcamento/itens/:itemId/excluir', (req, res) => {
  db.prepare('DELETE FROM orcamento_itens WHERE id = ? AND atendimento_id = ?').run(req.params.itemId, req.params.id);
  res.redirect('/atendimentos/' + req.params.id + '?tab=orcamento');
});

router.post('/atendimentos/:id/orcamento/preco-venda', (req, res) => {
  const preco = req.body.preco_venda !== '' ? parseFloat(req.body.preco_venda.replace(',', '.')) : null;
  db.prepare("UPDATE atendimentos SET preco_venda = ?, atualizado_em = datetime('now') WHERE id = ?").run(isNaN(preco) ? null : preco, req.params.id);
  versionamento.registrar({ atendimentoId: req.params.id, entidade: 'orcamento', acao: 'preco_venda_definido', snapshot: { preco }, usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + req.params.id + '?tab=orcamento&ok=2');
});

// ---------- Parecer de viabilidade ----------
router.post('/atendimentos/:id/parecer', (req, res) => {
  const id = req.params.id;
  const atendimento = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(id);
  const temOrcamento = db.prepare('SELECT COUNT(*) AS n FROM orcamento_itens WHERE atendimento_id = ? AND subtotal IS NOT NULL').get(id).n > 0;
  const preliminar = (atendimento.revisado_em && temOrcamento) ? 0 : 1;
  const precoMovelNovo = req.body.preco_movel_novo !== '' ? parseFloat((req.body.preco_movel_novo || '').replace(',', '.')) : null;
  const existente = db.prepare('SELECT * FROM parecer WHERE atendimento_id = ?').get(id);
  if (existente) {
    db.prepare('UPDATE parecer SET conclusao=?, texto=?, preliminar=?, preco_movel_novo=?, atualizado_em=datetime(\'now\') WHERE atendimento_id=?')
      .run(req.body.conclusao, req.body.texto || null, preliminar, isNaN(precoMovelNovo) ? null : precoMovelNovo, id);
  } else {
    db.prepare('INSERT INTO parecer (atendimento_id, conclusao, texto, preliminar, preco_movel_novo) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.body.conclusao, req.body.texto || null, preliminar, isNaN(precoMovelNovo) ? null : precoMovelNovo);
  }
  versionamento.registrar({ atendimentoId: id, entidade: 'parecer', acao: 'atualizado', snapshot: { conclusao: req.body.conclusao }, usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=parecer&ok=1');
});

// ---------- Concluir atendimento ----------
router.post('/atendimentos/:id/concluir', (req, res) => {
  const id = req.params.id;
  const atendimento = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(id);
  if (!atendimento.revisado_em) {
    return res.redirect('/atendimentos/' + id + '?tab=relatorio&erro=sem_revisao');
  }
  statusService.avancar(id, 'concluido');
  versionamento.registrar({ atendimentoId: id, entidade: 'atendimento', acao: 'concluido', usuarioId: req.session.userId });
  res.redirect('/atendimentos/' + id + '?tab=relatorio&ok=1');
});

// ---------- Relatórios PDF ----------
router.get('/atendimentos/:id/relatorio/interno.pdf', (req, res) => {
  const atendimento = carregarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).send('Atendimento não encontrado.');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-interno-' + atendimento.numero + '.pdf"');
  pdfInterno.gerar(atendimento, { mapComponenteRotulo, mapAreaRotulo }).pipe(res);
});

router.get('/atendimentos/:id/relatorio/cliente.pdf', (req, res) => {
  const atendimento = carregarAtendimento(req.params.id);
  if (!atendimento) return res.status(404).send('Atendimento não encontrado.');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="relatorio-cliente-' + atendimento.numero + '.pdf"');
  pdfCliente.gerar(atendimento, { mapComponenteRotulo, mapAreaRotulo }).pipe(res);
});

module.exports = router;
