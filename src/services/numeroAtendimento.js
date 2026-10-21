const db = require('../db/db');

// Gera números sequenciais no formato AAAA-0001, reiniciando a sequência a cada ano.
function gerarNumero() {
  const ano = new Date().getFullYear();
  const prefixo = ano + '-';
  const ultimo = db.prepare(
    "SELECT numero FROM atendimentos WHERE numero LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(prefixo + '%');

  let proximo = 1;
  if (ultimo) {
    const partes = ultimo.numero.split('-');
    const seq = parseInt(partes[1], 10);
    if (!isNaN(seq)) proximo = seq + 1;
  }
  return prefixo + String(proximo).padStart(4, '0');
}

module.exports = { gerarNumero };
