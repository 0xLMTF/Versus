// ── Games / Categories routes — /api/games ────
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticate);

// GET /api/games/categories — toutes les catégories + jeux
router.get('/categories', (req, res) => {
  const db = getDb();
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const games = db.prepare('SELECT * FROM games ORDER BY name').all();
  res.json(cats.map(c => ({ ...c, games: games.filter(g => g.category_id === c.id) })));
});

// GET /api/games/leaderboard/:gameId — top joueurs d'un jeu
router.get('/leaderboard/:gameId', (req, res) => {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id=?').get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Jeu introuvable' });

  const lb = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.elo,
      COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) as wins,
      COUNT(*) as played
    FROM matches m
    JOIN users u ON (u.id=m.p1_id OR u.id=m.p2_id)
    WHERE m.game_id = ? AND m.status='CONFIRMED'
    GROUP BY u.id
    ORDER BY wins DESC, played ASC
    LIMIT 20
  `).all(req.params.gameId);

  res.json({ game, leaderboard: lb });
});

// POST /api/games — ajouter un jeu (SUPERADMIN seulement)
router.post('/', requireAdmin, (req, res) => {
  const { name, category_id, icon } = req.body;
  if (!name || !category_id) return res.status(400).json({ error: 'name et category_id requis' });
  const db = getDb();
  const cat = db.prepare('SELECT id FROM categories WHERE id=?').get(category_id);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
  const { lastInsertRowid } = db.prepare(`INSERT INTO games(name,category_id,icon,created_by) VALUES(?,?,?,?)`)
    .run(name, category_id, icon || null, req.user.id);
  const game = db.prepare('SELECT * FROM games WHERE rowid=?').get(lastInsertRowid);
  res.status(201).json(game);
});

// DELETE /api/games/:id (SUPERADMIN)
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM games WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
