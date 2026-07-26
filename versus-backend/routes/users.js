// ── User routes — /api/users ─────────────────
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticate);

const PUBLIC_FIELDS = 'id,name,tag,role,elo,wins,losses,streak,theme_color,avatar_url,created_at';

// GET /api/users/me — profil actuel
router.get('/me', (req, res) => {
  const db = getDb();
  const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

// PATCH /api/users/me — mise à jour profil
router.patch('/me', async (req, res) => {
  const { name, avatar_url, theme_color, password } = req.body;
  const db = getDb();

  const updates = [];
  const params = [];

  if (name)       { updates.push('name = ?');       params.push(name); }
  if (avatar_url) { updates.push('avatar_url = ?');  params.push(avatar_url); }
  if (theme_color){ updates.push('theme_color = ?'); params.push(theme_color); }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court' });
    const hash = await bcrypt.hash(password, 12);
    updates.push('password = ?');
    params.push(hash);
  }

  if (!updates.length) return res.status(400).json({ error: 'Rien à mettre à jour' });

  updates.push("updated_at = datetime('now')");
  params.push(req.user.id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(req.user.id);
  res.json(user);
});

// DELETE /api/users/me — fermer / supprimer le compte (password requis)
router.delete('/me', async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis pour fermer le compte' });
  }

  const db = getDb();
  const row = db.prepare('SELECT id, password FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const ok = await bcrypt.compare(password, row.password);
  if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });

  const uid = req.user.id;
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM notifications WHERE to_id = ? OR from_id = ?').run(uid, uid);
    db.prepare('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?').run(uid, uid);
    db.prepare('DELETE FROM user_badges WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM category_ratings WHERE from_id = ? OR to_id = ?').run(uid, uid);
    db.prepare('DELETE FROM league_members WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM cup_members WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM matches WHERE p1_id = ? OR p2_id = ? OR winner_id = ?').run(uid, uid, uid);
    // Ligues / coupes créées : on les laisse orphelines ou on les supprime si seul membre déjà retiré
    db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  });
  tx();

  res.json({ ok: true, message: 'Compte fermé définitivement' });
});

// GET /api/users/search?q=tag_ou_nom — recherche d'amis
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query trop courte (2 chars min)' });
  const db = getDb();
  const users = db.prepare(`
    SELECT ${PUBLIC_FIELDS} FROM users
    WHERE (name LIKE ? OR tag LIKE ?) AND id != ?
    LIMIT 20
  `).all(`%${q}%`, `%${q}%`, req.user.id);
  res.json(users);
});

// GET /api/users/:id — profil public
router.get('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

// GET /api/users/me/friends — liste d'amis acceptés
router.get('/me/friends', (req, res) => {
  const db = getDb();
  const friends = db.prepare(`
    SELECT u.${PUBLIC_FIELDS.split(',').join(', u.')} FROM friendships f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? AND f.status = 'ACCEPTED'
  `).all(req.user.id);
  res.json(friends);
});

// POST /api/users/me/friends — demande d'ami par tag
router.post('/me/friends', (req, res) => {
  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: 'tag requis' });
  const db = getDb();
  const target = db.prepare('SELECT id FROM users WHERE tag = ?').get(tag.toLowerCase());
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Tu ne peux pas t\'ajouter toi-même' });

  const existing = db.prepare('SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?').get(req.user.id, target.id);
  if (existing) return res.status(409).json({ error: 'Demande déjà envoyée ou amis' });

  db.prepare(`INSERT INTO friendships(user_id,friend_id,status) VALUES(?,?,'PENDING')`).run(req.user.id, target.id);
  // Notifier la cible
  db.prepare(`INSERT INTO notifications(type,from_id,to_id,details) VALUES('FRIEND_REQUEST',?,?,?)`)
    .run(req.user.id, target.id, `Nouvelle demande d'ami`);
  res.status(201).json({ ok: true });
});

// PATCH /api/users/me/friends/:friendId — accepter/refuser
router.patch('/me/friends/:friendId', (req, res) => {
  const { status } = req.body; // ACCEPTED | BLOCKED
  if (!['ACCEPTED','BLOCKED'].includes(status)) return res.status(400).json({ error: 'status invalide' });
  const db = getDb();
  db.prepare('UPDATE friendships SET status = ? WHERE user_id = ? AND friend_id = ?')
    .run(status, req.params.friendId, req.user.id);
  if (status === 'ACCEPTED') {
    // Amitié réciproque
    const exists = db.prepare('SELECT id FROM friendships WHERE user_id=? AND friend_id=?').get(req.user.id, req.params.friendId);
    if (!exists) db.prepare(`INSERT INTO friendships(user_id,friend_id,status) VALUES(?,?,'ACCEPTED')`).run(req.user.id, req.params.friendId);
    else db.prepare('UPDATE friendships SET status=? WHERE user_id=? AND friend_id=?').run('ACCEPTED', req.user.id, req.params.friendId);
  }
  res.json({ ok: true });
});

// GET /api/users/me/h2h/:opponentId — statistiques head-to-head
router.get('/me/h2h/:opponentId', (req, res) => {
  const db = getDb();
  const myId = req.user.id;
  const oppId = req.params.opponentId;
  const matches = db.prepare(`
    SELECT m.*, g.name as game_name, c.name as cat_name, c.icon as cat_icon
    FROM matches m
    LEFT JOIN games g ON g.id = m.game_id
    LEFT JOIN categories c ON c.id = m.category_id
    WHERE status = 'CONFIRMED'
      AND ((m.p1_id = ? AND m.p2_id = ?) OR (m.p1_id = ? AND m.p2_id = ?))
    ORDER BY m.played_at DESC
  `).all(myId, oppId, oppId, myId);

  const myWins  = matches.filter(m => m.winner_id === myId).length;
  const oppWins = matches.filter(m => m.winner_id === oppId).length;
  res.json({ total: matches.length, myWins, oppWins, matches });
});

export default router;
