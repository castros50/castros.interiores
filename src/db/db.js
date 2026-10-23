const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'castros.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// CREATE TABLE IF NOT EXISTS não adiciona colunas a uma tabela que já existe em produção —
// novas colunas em tabelas já criadas precisam ser adicionadas aqui, uma vez, com segurança.
function garantirColuna(tabela, coluna, definicao) {
  const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all().map(c => c.name);
  if (!colunas.includes(coluna)) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
  }
}
garantirColuna('julia_campanhas', 'texto_facebook_ia', 'TEXT');
garantirColuna('julia_campanhas', 'texto_facebook_adaptado_ia', "INTEGER NOT NULL DEFAULT 0");

module.exports = db;
