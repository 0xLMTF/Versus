// ── Match routes — /api/matches ───────────────
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticate);

const ELO_WIN  = parseInt(process.env.ELO_WIN  || '18');
const ELO_LOSS = parseInt(process.env.ELO_LOSS || '15');
const ELO_MIN  = parseInt(process.env.ELO_MIN  || '1000');

// ── ELO update helper ─────────────────────────
function applyElo(db, winnerId, loserId) {
  db.prepare('UPDATE users SET elo = MAX(?,elo+?), wins=wins+1, streak=streak+1 WHERE id=?')
    .run(ELO_MIN, ELO_WIN, winnerId);
  db.prepare('UPDATE users SET elo = MAX(?,elo-?), losses=losses+1, streak=0 WHERE id=?')
    .run(ELO_MIN, ELO_LOSS, loserId);
}

// GET /api/matches?limit=20&offset=0&userId=&catId=
router.get('/', (req, res) => {
  const { limit = 20, offset = 0, userId, catId, status } = req.query;
  const db = getDb();
  let where = 'WHERE m.status != ?';
  const params = ['CANCELLED'];
  if (userId) { where += ' AND (m.p1_id=? OR m.p2_id=?)'; params.push(userId, userId); }
  if (catId)  { where += ' AND m.category_id=?'; params.push(catId); }
  if (status) { where += ' AND m.status=?'; params.push(status); }

  const matches = db.prepare(`
    SELECT m.*,
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
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));

  res.json(matches);
});

// POST /api/matches — déclarer un match direct (confirmé)
router.post('/', (req, res) => {
  const { p2_id, category_id, game_id, game_name, winner_id, score, proof_url, league_id, cup_id } = req.body;
  if (!p2_id || !winner_id) return res.status(400).json({ error: 'p2_id et winner_id requis' });

  const db = getDb();
  const loserId = winner_id === req.user.id ? p2_id : req.user.id;

  const matchId = require('crypto').randomUUID();
  db.prepare(`
    INSERT INTO matches(id,p1_id,p2_id,winner_id,category_id,game_id,game_name,score,proof_url,league_id,cup_id,status,elo_delta)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,'CONFIRMED',?)
  `).run(matchId, req.user.id, p2_id, winner_id, category_id, game_id, game_name, score, proof_url, league_id, cup_id, ELO_WIN);

  applyElo(db, winner_id, loserId);

  const match = db.prepare('SELECT * FROM matches WHERE id=?').get(matchId);
  res.status(201).json(match);
});

// POST /api/matches/claim — soumettre pour validation ligue (PENDING)
router.post('/claim', (req, res) => {
  const { p2_id, category_id, game_id, game_name, result, score, proof_url, league_id } = req.body;
  if (!p2_id || !result || !league_id) return res.status(400).json({ error: 'p2_id, result, league_id requis' });

  const db = getDb();
  const winnerId = result === 'WIN' ? req.user.id : p2_id;
  const matchId  = crypto.randomUUID();

  db.prepare(`
    INSERT INTO matches(id,p1_id,p2_id,winner_id,category_id,game_id,game_name,score,proof_url,league_id,status,elo_delta)
    VALUES(?,?,?,?,?,?,?,?,?,?,'PENDING',?)
  `).run(matchId, req.user.id, p2_id, winnerId, category_id, game_id, game_name, score, proof_url, league_id, ELO_WIN);

  // Notification pour l'adversaire
  const details = `${req.user.id === winnerId ? 'Victoire' : 'Défaite'} déclarée : ${game_name} — score : ${score || 'non précisé'}`;
  db.prepare(`INSERT INTO notifications(type,from_id,to_id,details,proof_url,match_data,status)
              VALUES('MATCH_CLAIM',?,?,?,?,?,'PENDING')`)
    .run(req.user.id, p2_id, details, proof_url, JSON.stringify({ matchId, league_id, game_name, score }));

  res.status(201).json({ matchId, status: 'PENDING' });
});

// PATCH /api/matches/:id/accept — adversaire accepte
router.patch('/:id/accept', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id=?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match introuvable' });
  if (match.status !== 'PENDING') return res.status(400).json({ error: 'Match non en attente' });
  if (match.p2_id !== req.user.id) return res.status(403).json({ error: 'Pas ton match à valider' });

  const loserId = match.winner_id === match.p1_id ? match.p2_id : match.p1_id;
  db.prepare(`UPDATE matches SET status='CONFIRMED' WHERE id=?`).run(match.id);
  applyElo(db, match.winner_id, loserId);

  // Notifier le déclarant
  db.prepare(`INSERT INTO notifications(type,from_id,to_id,details) VALUES('MATCH_ACCEPTED',?,?,?)`)
    .run(req.user.id, match.p1_id, `Ton match a été accepté !`);

  res.json({ ok: true });
});

// PATCH /api/matches/:id/refuse — adversaire refuse
router.patch('/:id/refuse', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id=?').get(req.params.id);
  if (!match || match.p2_id !== req.user.id) return res.status(403).json({ error: 'Action non autorisée' });
  db.prepare(`UPDATE matches SET status='CANCELLED' WHERE id=?`).run(match.id);
  res.json({ ok: true });
});

// GET /api/matches/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const match = db.prepare(`
    SELECT m.*,
      p1.name as p1_name, p1.avatar_url as p1_avatar,
      p2.name as p2_name, p2.avatar_url as p2_avatar,
      w.name as winner_name, g.name as game_name, c.name as cat_name
    FROM matches m
    LEFT JOIN users p1 ON p1.id=m.p1_id
    LEFT JOIN users p2 ON p2.id=m.p2_id
    LEFT JOIN users w  ON w.id=m.winner_id
    LEFT JOIN games g  ON g.id=m.game_id
    LEFT JOIN categories c ON c.id=m.category_id
    WHERE m.id=?
  `).get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match introuvable' });
  res.json(match);
});

export default router;
