// ── League routes — /api/leagues ─────────────
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticate);

function genId() { return `LIGUE-${Math.floor(1000 + Math.random() * 9000)}`; }

// GET /api/leagues — mes ligues
router.get('/', (req, res) => {
  const db = getDb();
  const leagues = db.prepare(`
    SELECT l.* FROM leagues l
    JOIN league_members lm ON lm.league_id = l.id
    WHERE lm.user_id = ? AND l.is_active = 1
    ORDER BY l.created_at DESC
  `).all(req.user.id);
  res.json(leagues);
});

// POST /api/leagues — créer une ligue
router.post('/', (req, res) => {
  const { name, discipline = 'multi', games = [], passcode, invitedTags = [], season = 'Saison 1' } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });

  const db = getDb();
  let id = genId();
  // Unicité de l'id
  while (db.prepare('SELECT id FROM leagues WHERE id=?').get(id)) id = genId();

  db.prepare(`INSERT INTO leagues(id,name,creator_id,discipline,season,passcode) VALUES(?,?,?,?,?,?)`)
    .run(id, name, req.user.id, discipline, season, passcode || null);

  // Ajouter le créateur comme OWNER
  db.prepare(`INSERT INTO league_members(league_id,user_id,role) VALUES(?,?,'OWNER')`).run(id, req.user.id);

  // Jeux rattachés
  if (games.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO league_games(league_id,game_id) VALUES(?,?)');
    games.forEach(gId => ins.run(id, gId));
  }

  // Inviter les tags
  if (invitedTags.length) {
    invitedTags.forEach(tag => {
      const u = db.prepare('SELECT id FROM users WHERE tag=?').get(tag.toLowerCase());
      if (u) {
        db.prepare(`INSERT INTO notifications(type,from_id,to_id,details,match_data) VALUES('FRIEND_REQUEST',?,?,?,?)`)
          .run(req.user.id, u.id, `Invitation à rejoindre la ligue "${name}"`, JSON.stringify({ leagueId: id, passcode }));
      }
    });
  }

  res.status(201).json({ id, name, discipline, season });
});

// POST /api/leagues/join — rejoindre par ID + passcode
router.post('/join', (req, res) => {
  const { id, passcode } = req.body;
  if (!id) return res.status(400).json({ error: 'id requis' });
  const db = getDb();
  const league = db.prepare('SELECT * FROM leagues WHERE id=?').get(id.toUpperCase());
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });
  if (league.passcode && league.passcode !== passcode)
    return res.status(403).json({ error: 'Mot de passe incorrect' });
  const already = db.prepare('SELECT * FROM league_members WHERE league_id=? AND user_id=?').get(league.id, req.user.id);
  if (already) return res.status(409).json({ error: 'Tu es déjà dans cette ligue' });
  db.prepare(`INSERT INTO league_members(league_id,user_id,role) VALUES(?,?,'MEMBER')`).run(league.id, req.user.id);
  res.json({ ok: true, league });
});

// GET /api/leagues/:id — détail + classement
router.get('/:id', (req, res) => {
  const db = getDb();
  const league = db.prepare('SELECT * FROM leagues WHERE id=?').get(req.params.id);
  if (!league) return res.status(404).json({ error: 'Ligue introuvable' });

  // Classement : compte victoires/défaites de matches confirmés
  const members = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.elo,
      COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) as wins,
      COUNT(CASE WHEN m.winner_id != u.id AND m.winner_id IS NOT NULL THEN 1 END) as losses
    FROM league_members lm
    JOIN users u ON u.id = lm.user_id
    LEFT JOIN matches m ON m.league_id = ? AND m.status='CONFIRMED' AND (m.p1_id=u.id OR m.p2_id=u.id)
    WHERE lm.league_id = ?
    GROUP BY u.id
    ORDER BY wins DESC, losses ASC
  `).all(league.id, league.id);

  const matches = db.prepare(`
    SELECT m.*, p1.name as p1_name, p2.name as p2_name, w.name as winner_name
    FROM matches m
    LEFT JOIN users p1 ON p1.id=m.p1_id
    LEFT JOIN users p2 ON p2.id=m.p2_id
    LEFT JOIN users w  ON w.id=m.winner_id
    WHERE m.league_id=? AND m.status='CONFIRMED'
    ORDER BY m.played_at DESC LIMIT 30
  `).all(league.id);

  res.json({ ...league, standings: members, recentMatches: matches });
});

// DELETE /api/leagues/:id — archiver (OWNER seulement)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const member = db.prepare('SELECT role FROM league_members WHERE league_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!member || member.role !== 'OWNER') return res.status(403).json({ error: 'Pas autorisé' });
  db.prepare('UPDATE leagues SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
