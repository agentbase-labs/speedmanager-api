const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'speedmanager-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// v2.93 — Admin guard. Requires JWT with { admin: true } claim
// (issued exclusively by POST /api/admin/login).
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Admin token required' });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    if (!payload || payload.admin !== true) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = payload;
    next();
  });
}

module.exports = { authenticateToken, requireAdmin, JWT_SECRET };
// build: v2.93 admin-dashboard
