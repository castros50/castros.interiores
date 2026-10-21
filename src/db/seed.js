require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) {
    console.log('Usuários já existem, seed não é necessário.');
    return;
  }
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'castros123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password_hash, nome) VALUES (?, ?, ?)')
    .run(username, hash, 'Responsável Castros Interiores');
  console.log('Usuário inicial criado:');
  console.log('  usuário: ' + username);
  console.log('  senha:   ' + password);
  console.log('IMPORTANTE: troque esta senha depois de entrar, ou defina ADMIN_USERNAME/ADMIN_PASSWORD no .env antes do primeiro start.');
}

seed();
