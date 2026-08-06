// ── Games / Categories routes — /api/games ────
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();
router.use(authenticate);

// GET /api/games/categories — toutes les catégories + jeux
router.get('/categories', async (req, res) => {
  const { rows: cats } = await pool.query('SELECT * FROM categories ORDER BY sort_order');
  const { rows: games } = await pool.query('SELECT * FROM games ORDER BY name');
  res.json(cats.map(c => ({ ...c, games: games.filter(g => g.category_id === c.id) })));
});

// GET /api/games/leaderboard/:gameId — top joueurs d'un jeu
router.get('/leaderboard/:gameId', async (req, res) => {
  const { rows: gameRows } = await pool.query('SELECT * FROM games WHERE id=$1', [req.params.gameId]);
  const game = gameRows[0];
  if (!game) return res.status(404).json({ error: 'Jeu introuvable' });

  const { rows: lb } = await pool.query(
    `SELECT u.id, u.name, u.avatar_url, u.elo,
      COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) as wins,
      COUNT(*) as played
    FROM matches m
    JOIN users u ON (u.id=m.p1_id OR u.id=m.p2_id)
    WHERE m.game_id = $1 AND m.status='CONFIRMED'
    GROUP BY u.id
    ORDER BY wins DESC, played ASC
    LIMIT 20`,
    [req.params.gameId],
  );

  res.json({ game, leaderboard: lb });
});

// POST /api/games — ajouter un jeu (SUPERADMIN seulement)
router.post('/', requireAdmin, async (req, res) => {
  const { name, category_id, icon } = req.body;
  if (!name || !category_id) return res.status(400).json({ error: 'name et category_id requis' });

  const { rows: catRows } = await pool.query('SELECT id FROM categories WHERE id=$1', [category_id]);
  if (!catRows[0]) return res.status(404).json({ error: 'Catégorie introuvable' });

  const { rows } = await pool.query(
    `INSERT INTO games(name,category_id,icon,created_by) VALUES($1,$2,$3,$4) RETURNING *`,
    [name, category_id, icon || null, req.user.id],
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/games/:id (SUPERADMIN)
router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM games WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
