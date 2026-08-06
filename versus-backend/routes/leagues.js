// ── League routes — /api/leagues ─────────────
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();
router.use(authenticate);

function genId() { return `LIGUE-${Math.floor(1000 + Math.random() * 9000)}`; }

// GET /api/leagues — mes ligues
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT l.* FROM leagues l
     JOIN league_members lm ON lm.league_id = l.id
     WHERE lm.user_id = $1 AND l.is_active = 1
     ORDER BY l.created_at DESC`,
    [req.user.id],
  );
  res.json(rows);
});

// POST /api/leagues — créer une ligue
router.post('/', async (req, res) => {
  const { name, discipline = 'multi', games = [], passcode, invitedTags = [], season = 'Saison 1' } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });

  let id = genId();
  // Unicité de l'id
  while ((await pool.query('SELECT id FROM leagues WHERE id=$1', [id])).rows[0]) id = genId();

  await pool.query(
    `INSERT INTO leagues(id,name,creator_id,discipline,season,passcode) VALUES($1,$2,$3,$4,$5,$6)`,
    [id, name, req.user.id, discipline, season, passcode || null],
  );

  // Ajouter le créateur comme OWNER
  await pool.query(`INSERT INTO league_members(league_id,user_id,role) VALUES($1,$2,'OWNER')`, [id, req.user.id]);

  // Jeux rattachés
  for (const gId of games) {
    await pool.query(
      'INSERT INTO league_games(league_id,game_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [id, gId],
    );
  }

  // Inviter les tags
  for (const tag of invitedTags) {
    const { rows } = await pool.query('SELECT id FROM users WHERE tag=$1', [tag.toLowerCase()]);
    const u = rows[0];
    if (u) {
      await pool.query(
        `INSERT INTO notifications(type,from_id,to_id,details,match_data) VALUES('FRIEND_REQUEST',$1,$2,$3,$4)`,
        [req.user.id, u.id, `Invitation à rejoindre la ligue "${name}"`, JSON.stringify({ leagueId: id, passcode })],
      );
    }
  }

  res.status(201).json({ id, name, discipline, season });
});

// POST /api/leagues/join — rejoindre par ID + passcode
router.post('/join', async (req, res) => {
  const { id, passcode } = req.body;
  if (!id) return res.status(400).json({ error: 'id requis' });

  const { rows } = await pool.query('SELECT * FROM leagues WHERE id=$1', [id.toUpperCase()]);
  const league = rows[0];
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });
  if (league.passcode && league.passcode !== passcode)
    return res.status(403).json({ error: 'Mot de passe incorrect' });

  const { rows: alreadyRows } = await pool.query(
    'SELECT * FROM league_members WHERE league_id=$1 AND user_id=$2',
    [league.id, req.user.id],
  );
  if (alreadyRows[0]) return res.status(409).json({ error: 'Tu es déjà dans cette ligue' });

  await pool.query(`INSERT INTO league_members(league_id,user_id,role) VALUES($1,$2,'MEMBER')`, [league.id, req.user.id]);
  res.json({ ok: true, league });
});

// GET /api/leagues/:id — détail + classement
router.get('/:id', async (req, res) => {
  const { rows: leagueRows } = await pool.query('SELECT * FROM leagues WHERE id=$1', [req.params.id]);
  const league = leagueRows[0];
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  // Classement : compte victoires/défaites de matches confirmés
  const { rows: members } = await pool.query(
    `SELECT u.id, u.name, u.avatar_url, u.elo,
      COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) as wins,
      COUNT(CASE WHEN m.winner_id != u.id AND m.winner_id IS NOT NULL THEN 1 END) as losses
    FROM league_members lm
    JOIN users u ON u.id = lm.user_id
    LEFT JOIN matches m ON m.league_id = $1 AND m.status='CONFIRMED' AND (m.p1_id=u.id OR m.p2_id=u.id)
    WHERE lm.league_id = $1
    GROUP BY u.id
    ORDER BY wins DESC, losses ASC`,
    [league.id],
  );

  const { rows: matches } = await pool.query(
    `SELECT m.*, p1.name as p1_name, p2.name as p2_name, w.name as winner_name
    FROM matches m
    LEFT JOIN users p1 ON p1.id=m.p1_id
    LEFT JOIN users p2 ON p2.id=m.p2_id
    LEFT JOIN users w  ON w.id=m.winner_id
    WHERE m.league_id=$1 AND m.status='CONFIRMED'
    ORDER BY m.played_at DESC LIMIT 30`,
    [league.id],
  );

  res.json({ ...league, standings: members, recentMatches: matches });
});

// DELETE /api/leagues/:id — archiver (OWNER seulement)
router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT role FROM league_members WHERE league_id=$1 AND user_id=$2',
    [req.params.id, req.user.id],
  );
  const member = rows[0];
  if (!member || member.role !== 'OWNER') return res.status(403).json({ error: 'Pas autorisé' });
  await pool.query('UPDATE leagues SET is_active=0 WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
