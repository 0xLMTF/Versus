// ── Match routes — /api/matches ───────────────
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();
router.use(authenticate);

const ELO_WIN  = parseInt(process.env.ELO_WIN  || '18');
const ELO_LOSS = parseInt(process.env.ELO_LOSS || '15');
const ELO_MIN  = parseInt(process.env.ELO_MIN  || '1000');

// ── ELO update helper ─────────────────────────
async function applyElo(winnerId, loserId) {
  await pool.query(
    'UPDATE users SET elo = GREATEST($1,elo+$2), wins=wins+1, streak=streak+1 WHERE id=$3',
    [ELO_MIN, ELO_WIN, winnerId],
  );
  await pool.query(
    'UPDATE users SET elo = GREATEST($1,elo-$2), losses=losses+1, streak=0 WHERE id=$3',
    [ELO_MIN, ELO_LOSS, loserId],
  );
}

// GET /api/matches?limit=20&offset=0&userId=&catId=
router.get('/', async (req, res) => {
  const { limit = 20, offset = 0, userId, catId, status } = req.query;
  let where = 'WHERE m.status != $1';
  const params = ['CANCELLED'];
  if (userId) { params.push(userId); where += ` AND (m.p1_id=$${params.length} OR m.p2_id=$${params.length})`; }
  if (catId)  { params.push(catId);  where += ` AND m.category_id=$${params.length}`; }
  if (status) { params.push(status); where += ` AND m.status=$${params.length}`; }
  params.push(parseInt(limit), parseInt(offset));

  const { rows } = await pool.query(
    `SELECT m.*,
      p1.name as p1_name, p1.avatar_url as p1_avatar,
      p2.name as p2_name, p2.avatar_url as p2_avatar,
      w.name  as winner_name,
      g.name  as game_name, c.name as cat_name, c.icon as cat_icon
    FROM matches m
    LEFT JOIN users p1 ON p1.id = m.p1_id
    LEFT JOIN users p2 ON p2.id = m.p2_id
    LEFT JOIN users w  ON w.id  = m.winner_id
    LEFT JOIN games g  ON g.id  = m.game_id
    LEFT JOIN categories c ON c.id = m.category_id
    ${where}
    ORDER BY m.played_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  res.json(rows);
});

// POST /api/matches — déclarer un match direct (confirmé)
router.post('/', async (req, res) => {
  const { p2_id, category_id, game_id, game_name, winner_id, score, proof_url, league_id, cup_id } = req.body;
  if (!p2_id || !winner_id) return res.status(400).json({ error: 'p2_id et winner_id requis' });

  const loserId = winner_id === req.user.id ? p2_id : req.user.id;
  const matchId = randomUUID();

  await pool.query(
    `INSERT INTO matches(id,p1_id,p2_id,winner_id,category_id,game_id,game_name,score,proof_url,league_id,cup_id,status,elo_delta)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'CONFIRMED',$12)`,
    [matchId, req.user.id, p2_id, winner_id, category_id, game_id, game_name, score, proof_url, league_id, cup_id, ELO_WIN],
  );

  await applyElo(winner_id, loserId);

  const { rows } = await pool.query('SELECT * FROM matches WHERE id=$1', [matchId]);
  res.status(201).json(rows[0]);
});

// POST /api/matches/claim — soumettre pour validation ligue (PENDING)
router.post('/claim', async (req, res) => {
  const { p2_id, category_id, game_id, game_name, result, score, proof_url, league_id } = req.body;
  if (!p2_id || !result || !league_id) return res.status(400).json({ error: 'p2_id, result, league_id requis' });

  const winnerId = result === 'WIN' ? req.user.id : p2_id;
  const matchId  = randomUUID();

  await pool.query(
    `INSERT INTO matches(id,p1_id,p2_id,winner_id,category_id,game_id,game_name,score,proof_url,league_id,status,elo_delta)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING',$11)`,
    [matchId, req.user.id, p2_id, winnerId, category_id, game_id, game_name, score, proof_url, league_id, ELO_WIN],
  );

  // Notification pour l'adversaire
  const details = `${req.user.id === winnerId ? 'Victoire' : 'Défaite'} déclarée : ${game_name} — score : ${score || 'non précisé'}`;
  await pool.query(
    `INSERT INTO notifications(type,from_id,to_id,details,proof_url,match_data,status)
     VALUES('MATCH_CLAIM',$1,$2,$3,$4,$5,'PENDING')`,
    [req.user.id, p2_id, details, proof_url, JSON.stringify({ matchId, league_id, game_name, score })],
  );

  res.status(201).json({ matchId, status: 'PENDING' });
});

// PATCH /api/matches/:id/accept — adversaire accepte
router.patch('/:id/accept', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM matches WHERE id=$1', [req.params.id]);
  const match = rows[0];
  if (!match) return res.status(404).json({ error: 'Match introuvable' });
  if (match.status !== 'PENDING') return res.status(400).json({ error: 'Match non en attente' });
  if (match.p2_id !== req.user.id) return res.status(403).json({ error: 'Pas ton match à valider' });

  const loserId = match.winner_id === match.p1_id ? match.p2_id : match.p1_id;
  await pool.query(`UPDATE matches SET status='CONFIRMED' WHERE id=$1`, [match.id]);
  await applyElo(match.winner_id, loserId);

  // Notifier le déclarant
  await pool.query(
    `INSERT INTO notifications(type,from_id,to_id,details) VALUES('MATCH_ACCEPTED',$1,$2,$3)`,
    [req.user.id, match.p1_id, `Ton match a été accepté !`],
  );

  res.json({ ok: true });
});

// PATCH /api/matches/:id/refuse — adversaire refuse
router.patch('/:id/refuse', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM matches WHERE id=$1', [req.params.id]);
  const match = rows[0];
  if (!match || match.p2_id !== req.user.id) return res.status(403).json({ error: 'Action non autorisée' });
  await pool.query(`UPDATE matches SET status='CANCELLED' WHERE id=$1`, [match.id]);
  res.json({ ok: true });
});

// GET /api/matches/:id
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*,
      p1.name as p1_name, p1.avatar_url as p1_avatar,
      p2.name as p2_name, p2.avatar_url as p2_avatar,
      w.name as winner_name, g.name as game_name, c.name as cat_name
    FROM matches m
    LEFT JOIN users p1 ON p1.id=m.p1_id
    LEFT JOIN users p2 ON p2.id=m.p2_id
    LEFT JOIN users w  ON w.id=m.winner_id
    LEFT JOIN games g  ON g.id=m.game_id
    LEFT JOIN categories c ON c.id=m.category_id
    WHERE m.id=$1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Match introuvable' });
  res.json(rows[0]);
});

export default router;
