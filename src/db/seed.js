const bcrypt = require('bcryptjs');
const db = require('./db');

// Cria o usuário responsável inicial, só se ainda não existir nenhum usuário.
// Chamada automaticamente ao iniciar o servidor (server.js) e também pode ser
// rodada manualmente via `npm run seed`.
function seedIfNeeded() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return false;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'castros123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password_hash, nome) VALUES (?, ?, ?)')
    .run(username, hash, 'Responsável Castros Interiores');
  console.log('Usuário inicial criado — usuário: ' + username + (process.env.ADMIN_PASSWORD ? '' : ' (senha padrão — defina ADMIN_PASSWORD no ambiente para trocar)'));
  return true;
}

if (require.main === module) {
  require('dotenv').config();
  const criou = seedIfNeeded();
  if (!criou) console.log('Usuários já existem, seed não é necessário.');
}

module.exports = { seedIfNeeded };
