function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ erro: 'Não autenticado.' });
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

module.exports = { requireAuth };
