// ── Middleware JWT ────────────────────────────
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux admins' });
  }
  next();
}
