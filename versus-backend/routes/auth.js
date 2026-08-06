// ── Auth routes — /api/auth ───────────────────
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';

const router = Router();

function makeTokens(userId, role) {
  const access = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
  const refresh = uuid();
  return { access, refresh };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, tag, password } = req.body;
  if (!name || !tag || !password)
    return res.status(400).json({ error: 'Champs requis : name, tag, password' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min)' });

  const normalizedTag = tag.startsWith('@') ? tag.toLowerCase() : `@${tag.toLowerCase()}`;
  const { rows: existingRows } = await pool.query('SELECT id FROM users WHERE tag = $1', [normalizedTag]);
  if (existingRows[0]) return res.status(409).json({ error: 'Ce tag est déjà pris' });

  const hash = await bcrypt.hash(password, 12);
  const id = uuid();
  await pool.query(
    `INSERT INTO users(id,name,tag,password) VALUES($1,$2,$3,$4)`,
    [id, name, normalizedTag, hash],
  );

  const { access, refresh } = makeTokens(id, 'USER');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  await pool.query(
    `INSERT INTO sessions(user_id,refresh_token,expires_at) VALUES($1,$2,$3)`,
    [id, refresh, expiresAt],
  );

  const { rows: userRows } = await pool.query(
    'SELECT id,name,tag,role,elo,wins,losses,streak,theme_color,avatar_url FROM users WHERE id=$1',
    [id],
  );
  res.status(201).json({ token: access, refreshToken: refresh, user: userRows[0] });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { tag, password } = req.body;
  if (!tag || !password) return res.status(400).json({ error: 'tag et password requis' });

  const normalizedTag = tag.startsWith('@') ? tag.toLowerCase() : `@${tag.toLowerCase()}`;
  const { rows } = await pool.query('SELECT * FROM users WHERE tag = $1', [normalizedTag]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

  const { access, refresh } = makeTokens(user.id, user.role);
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  await pool.query(
    `INSERT INTO sessions(user_id,refresh_token,expires_at) VALUES($1,$2,$3)`,
    [user.id, refresh, expiresAt],
  );

  const { password: _, ...safeUser } = user;
  res.json({ token: access, refreshToken: refresh, user: safeUser });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken requis' });

  const { rows } = await pool.query(
    `SELECT s.*, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token = $1 AND s.expires_at > now()`,
    [refreshToken],
  );
  const session = rows[0];

  if (!session) return res.status(401).json({ error: 'Session expirée, reconnecte-toi' });

  const access = jwt.sign(
    { id: session.user_id, role: session.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
  res.json({ token: access });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
  }
  res.json({ ok: true });
});

export default router;
