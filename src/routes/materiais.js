const express = require('express');
const db = require('../db/db');

const router = express.Router();

router.get('/', (req, res) => {
  const materiais = db.prepare('SELECT * FROM materiais ORDER BY nome').all();
  res.render('materiais', { materiais, erro: null });
});

router.post('/', (req, res) => {
  const { nome, unidade, custo_unitario, fornecedor } = req.body;
  if (!nome || !unidade) {
    const materiais = db.prepare('SELECT * FROM materiais ORDER BY nome').all();
    return res.render('materiais', { materiais, erro: 'Informe nome e unidade do material.' });
  }
  const custo = custo_unitario !== '' ? parseFloat(custo_unitario.replace(',', '.')) : null;
  db.prepare('INSERT INTO materiais (nome, unidade, custo_unitario, fornecedor) VALUES (?, ?, ?, ?)')
    .run(nome.trim(), unidade.trim(), isNaN(custo) ? null : custo, (fornecedor || '').trim() || null);
  res.redirect('/materiais');
});

router.post('/:id/editar', (req, res) => {
  const { nome, unidade, custo_unitario, fornecedor } = req.body;
  const custo = custo_unitario !== '' ? parseFloat(custo_unitario.replace(',', '.')) : null;
  db.prepare("UPDATE materiais SET nome=?, unidade=?, custo_unitario=?, fornecedor=?, atualizado_em=datetime('now') WHERE id=?")
    .run(nome.trim(), unidade.trim(), isNaN(custo) ? null : custo, (fornecedor || '').trim() || null, req.params.id);
  res.redirect('/materiais');
});

router.post('/:id/excluir', (req, res) => {
  db.prepare('DELETE FROM materiais WHERE id = ?').run(req.params.id);
  res.redirect('/materiais');
});

module.exports = router;
