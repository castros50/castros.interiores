const db = require('../db/db');

function registrar({ atendimentoId, entidade, entidadeId, acao, snapshot, motivo, usuarioId }) {
  db.prepare(`
    INSERT INTO historico_versoes (atendimento_id, entidade, entidade_id, acao, snapshot_json, motivo, criado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    atendimentoId,
    entidade,
    entidadeId || null,
    acao,
    snapshot ? JSON.stringify(snapshot) : null,
    motivo || null,
    usuarioId || null
  );
}

function listar(atendimentoId) {
  return db.prepare(`
    SELECT h.*, u.nome AS usuario_nome
    FROM historico_versoes h
    LEFT JOIN users u ON u.id = h.criado_por
    WHERE h.atendimento_id = ?
    ORDER BY h.id DESC
  `).all(atendimentoId);
}

module.exports = { registrar, listar };
