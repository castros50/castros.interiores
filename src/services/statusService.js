const db = require('../db/db');

const ORDEM = [
  'rascunho',
  'aguardando_fotos',
  'pronto_para_analise',
  'analise_preliminar_concluida',
  'aguardando_inspecao',
  'revisado_pelo_responsavel',
  'concluido'
];

const ROTULOS = {
  rascunho: 'Rascunho',
  aguardando_fotos: 'Aguardando fotos',
  pronto_para_analise: 'Pronto para análise',
  analise_preliminar_concluida: 'Análise preliminar concluída',
  aguardando_inspecao: 'Aguardando inspeção',
  revisado_pelo_responsavel: 'Revisado pelo responsável',
  concluido: 'Concluído'
};

function indice(status) {
  const i = ORDEM.indexOf(status);
  return i === -1 ? 0 : i;
}

// Só avança o status se o novo estiver depois do atual na sequência.
function avancar(atendimentoId, novoStatus) {
  const atual = db.prepare('SELECT status FROM atendimentos WHERE id = ?').get(atendimentoId);
  if (!atual) return;
  if (indice(novoStatus) > indice(atual.status)) {
    db.prepare("UPDATE atendimentos SET status = ?, atualizado_em = datetime('now') WHERE id = ?")
      .run(novoStatus, atendimentoId);
  }
}

// Define o status diretamente, para casos de reset (ex.: nova foto invalida revisão anterior).
function definir(atendimentoId, novoStatus) {
  db.prepare("UPDATE atendimentos SET status = ?, atualizado_em = datetime('now') WHERE id = ?")
    .run(novoStatus, atendimentoId);
}

// Quando chega conteúdo novo (foto ou nova análise) em um atendimento já revisado/concluído,
// a aprovação antiga não pode valer para o conteúdo alterado.
function invalidarRevisaoSeNecessario(atendimentoId) {
  const atual = db.prepare('SELECT status FROM atendimentos WHERE id = ?').get(atendimentoId);
  if (!atual) return;
  if (indice(atual.status) >= indice('revisado_pelo_responsavel')) {
    db.prepare("UPDATE atendimentos SET status = 'analise_preliminar_concluida', revisado_em = NULL, atualizado_em = datetime('now') WHERE id = ?")
      .run(atendimentoId);
  }
}

module.exports = { ORDEM, ROTULOS, indice, avancar, definir, invalidarRevisaoSeNecessario };
