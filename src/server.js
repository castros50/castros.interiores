require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');

const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const atendimentosRoutes = require('./routes/atendimentos');
const materiaisRoutes = require('./routes/materiais');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'altere-este-segredo',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 }
}));

app.use((req, res, next) => {
  res.locals.usuarioNome = req.session ? req.session.userNome : null;
  next();
});

app.use('/', authRoutes);
app.use('/', requireAuth, atendimentosRoutes);
app.use('/materiais', requireAuth, materiaisRoutes);

app.use((req, res) => {
  res.status(404).render('erro', { titulo: 'Página não encontrada', mensagem: 'A página solicitada não existe.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('erro', { titulo: 'Erro inesperado', mensagem: 'Ocorreu um erro ao processar sua solicitação. Tente novamente.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Castros Interiores - Avaliação de Estofados rodando em http://localhost:${PORT}`);
});
