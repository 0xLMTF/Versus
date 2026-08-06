// ── User routes — /api/users ─────────────────
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();
router.use(authenticate);

const PUBLIC_FIELDS = 'id,name,tag,role,elo,wins,losses,streak,theme_color,avatar_url,created_at';

// GET /api/users/me — profil actuel
router.get('/me', async (req, res) => {
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

// PATCH /api/users/me — mise à jour profil
router.patch('/me', async (req, res) => {
  const { name, avatar_url, theme_color, password } = req.body;

  const updates = [];
  const params = [];
  let i = 1;

  if (name)        { updates.push(`name = $${i++}`);        params.push(name); }
  if (avatar_url)  { updates.push(`avatar_url = $${i++}`);  params.push(avatar_url); }
  if (theme_color) { updates.push(`theme_color = $${i++}`); params.push(theme_color); }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court' });
    const hash = await bcrypt.hash(password, 12);
    updates.push(`password = $${i++}`);
    params.push(hash);
  }

  if (!updates.length) return res.status(400).json({ error: 'Rien à mettre à jour' });

  updates.push('updated_at = now()');
  params.push(req.user.id);

  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, params);
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
  res.json(rows[0]);
});

// DELETE /api/users/me — fermer / supprimer le compte (password requis)
router.delete('/me', async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis pour fermer le compte' });
  }

  const { rows } = await pool.query('SELECT id, password FROM users WHERE id = $1', [req.user.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const ok = await bcrypt.compare(password, row.password);
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });

  const uid = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sessions WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM notifications WHERE to_id = $1 OR from_id = $1', [uid]);
    await client.query('DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1', [uid]);
    await client.query('DELETE FROM user_badges WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM category_ratings WHERE from_id = $1 OR to_id = $1', [uid]);
    await client.query('DELETE FROM league_members WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM cup_members WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM matches WHERE p1_id = $1 OR p2_id = $1 OR winner_id = $1', [uid]);
    await client.query('DELETE FROM users WHERE id = $1', [uid]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json({ ok: true, message: 'Compte fermé définitivement' });
});

// GET /api/users/search?q=tag_ou_nom — recherche d'amis
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query trop courte (2 chars min)' });
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users
     WHERE (name ILIKE $1 OR tag ILIKE $1) AND id != $2
     LIMIT 20`,
    [`%${q}%`, req.user.id],
  );
  res.json(rows);
});

// GET /api/users/:id — profil public
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(rows[0]);
});

// GET /api/users/me/friends — liste d'amis acceptés
router.get('/me/friends', async (req, res) => {
  const fields = PUBLIC_FIELDS.split(',').map(f => `u.${f}`).join(', ');
  const { rows } = await pool.query(
    `SELECT ${fields} FROM friendships f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1 AND f.status = 'ACCEPTED'`,
    [req.user.id],
  );
  res.json(rows);
});

// POST /api/users/me/friends — demande d'ami par tag
router.post('/me/friends', async (req, res) => {
  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: 'tag requis' });

  const { rows: targetRows } = await pool.query('SELECT id FROM users WHERE tag = $1', [tag.toLowerCase()]);
  const target = targetRows[0];
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Tu ne peux pas t\'ajouter toi-même' });

  const { rows: existingRows } = await pool.query(
    'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
    [req.user.id, target.id],
  );
  if (existingRows[0]) return res.status(409).json({ error: 'Demande déjà envoyée ou amis' });

  await pool.query(
    `INSERT INTO friendships(user_id,friend_id,status) VALUES($1,$2,'PENDING')`,
    [req.user.id, target.id],
  );
  await pool.query(
    `INSERT INTO notifications(type,from_id,to_id,details) VALUES('FRIEND_REQUEST',$1,$2,$3)`,
    [req.user.id, target.id, `Nouvelle demande d'ami`],
  );
  res.status(201).json({ ok: true });
});

// PATCH /api/users/me/friends/:friendId — accepter/refuser
router.patch('/me/friends/:friendId', async (req, res) => {
  const { status } = req.body; // ACCEPTED | BLOCKED
  if (!['ACCEPTED', 'BLOCKED'].includes(status)) return res.status(400).json({ error: 'status invalide' });

  await pool.query(
    'UPDATE friendships SET status = $1 WHERE user_id = $2 AND friend_id = $3',
    [status, req.params.friendId, req.user.id],
  );
  if (status === 'ACCEPTED') {
    const { rows } = await pool.query(
      'SELECT id FROM friendships WHERE user_id=$1 AND friend_id=$2',
      [req.user.id, req.params.friendId],
    );
    if (!rows[0]) {
      await pool.query(
        `INSERT INTO friendships(user_id,friend_id,status) VALUES($1,$2,'ACCEPTED')`,
        [req.user.id, req.params.friendId],
      );
    } else {
      await pool.query(
        'UPDATE friendships SET status=$1 WHERE user_id=$2 AND friend_id=$3',
        ['ACCEPTED', req.user.id, req.params.friendId],
      );
    }
  }
  res.json({ ok: true });
});

// GET /api/users/me/h2h/:opponentId — statistiques head-to-head
router.get('/me/h2h/:opponentId', async (req, res) => {
  const myId = req.user.id;
  const oppId = req.params.opponentId;
  const { rows: matches } = await pool.query(
    `SELECT m.*, g.name as game_name, c.name as cat_name, c.icon as cat_icon
     FROM matches m
     LEFT JOIN games g ON g.id = m.game_id
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE status = 'CONFIRMED'
       AND ((m.p1_id = $1 AND m.p2_id = $2) OR (m.p1_id = $2 AND m.p2_id = $1))
     ORDER BY m.played_at DESC`,
    [myId, oppId],
  );

  const myWins  = matches.filter(m => m.winner_id === myId).length;
  const oppWins = matches.filter(m => m.winner_id === oppId).length;
  res.json({ total: matches.length, myWins, oppWins, matches });
});

export default router;
