const express = require('express');
const db = require('../db/db');
const { DEPARTAMENTOS, buscarDepartamento, consultarDepartamento } = require('../services/departamentosAgente');

const router = express.Router();

function carregarAtendimentoCompleto(id) {
  if (!id) return null;
  const atendimento = db.prepare('SELECT * FROM atendimentos WHERE id = ?').get(id);
  if (!atendimento) return null;
  atendimento.achados = db.prepare("SELECT * FROM achados WHERE atendimento_id = ? AND status_revisao != 'descartado'").all(id);
  atendimento.orcamentoItens = db.prepare('SELECT * FROM orcamento_itens WHERE atendimento_id = ?').all(id);
  return atendimento;
}

router.get('/departamentos', (req, res) => {
  const atendimentos = db.prepare('SELECT id, numero, cliente_nome, tipo_movel FROM atendimentos ORDER BY atualizado_em DESC').all();
  const departamentoAtivo = req.query.departamento || DEPARTAMENTOS[0].id;
  let resultado = null;
  if (req.query.consulta_id) {
    const consulta = db.prepare('SELECT * FROM consultas_agente WHERE id = ?').get(req.query.consulta_id);
    if (consulta) {
      resultado = {
        status: consulta.status,
        erro: consulta.erro,
        resposta: consulta.resposta_json ? JSON.parse(consulta.resposta_json) : null,
        modelo: consulta.modelo
      };
    }
  }
  res.render('departamentos', {
    departamentos: DEPARTAMENTOS,
    departamentoAtivo,
    atendimentos,
    atendimentoSelecionadoId: req.query.atendimento_id || '',
    resultado,
    erro: req.query.erro || null
  });
});

router.post('/departamentos/consultar', async (req, res) => {
  const { departamento_id, atendimento_id, prompt } = req.body;
  const dept = buscarDepartamento(departamento_id);
  if (!dept) return res.redirect('/departamentos');

  const atendimento = atendimento_id ? carregarAtendimentoCompleto(atendimento_id) : null;
  const resultado = await consultarDepartamento({ departamentoId: departamento_id, prompt, atendimento });

  const info = db.prepare(`
    INSERT INTO consultas_agente (atendimento_id, departamento, prompt, status, resposta_json, erro, modelo, criado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    atendimento_id || null,
    departamento_id,
    prompt || '',
    resultado.status,
    resultado.resultado ? JSON.stringify(resultado.resultado) : null,
    resultado.erro || null,
    resultado.modelo || null,
    req.session.userId
  );

  const destino = '/departamentos?departamento=' + encodeURIComponent(departamento_id) +
    (atendimento_id ? '&atendimento_id=' + encodeURIComponent(atendimento_id) : '') +
    '&consulta_id=' + info.lastInsertRowid;
  res.redirect(destino);
});

module.exports = router;
