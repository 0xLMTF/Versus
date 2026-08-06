// ── Tournament (Cup) routes — /api/cups ───────
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();
router.use(authenticate);

function genId() { return `COUPE-${Math.floor(1000 + Math.random() * 9000)}`; }

function buildEmptyBracket(members) {
  const slots = [...members.map(m => m.name), ...Array(8 - members.length).fill(null)];
  return {
    final: { id: 'final', p1: null, p2: null, winner: null, score: null },
    leftSemis:  [
      { id: 'ls1', p1: slots[0], p2: slots[1], winner: null, score: null },
      { id: 'ls2', p1: slots[2], p2: slots[3], winner: null, score: null },
    ],
    rightSemis: [
      { id: 'rs1', p1: slots[4], p2: slots[5], winner: null, score: null },
      { id: 'rs2', p1: slots[6], p2: slots[7], winner: null, score: null },
    ],
    leftQuarts:  [],
    rightQuarts: [],
  };
}

// GET /api/cups — mes coupes
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.* FROM cups c
     JOIN cup_members cm ON cm.cup_id = c.id
     WHERE cm.user_id = $1
     ORDER BY c.created_at DESC`,
    [req.user.id],
  );
  res.json(rows.map(c => ({ ...c, bracket: JSON.parse(c.bracket_data || 'null') })));
});

// POST /api/cups — créer une coupe
router.post('/', async (req, res) => {
  const { name, is_multi = false, game_id, passcode, invitedTags = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });

  let id = genId();
  while ((await pool.query('SELECT id FROM cups WHERE id=$1', [id])).rows[0]) id = genId();

  // Membres initiaux = créateur + invités trouvés
  const { rows: meRows } = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
  const members = [{ name: meRows[0]?.name }];
  const invitedIds = [];
  for (const tag of invitedTags) {
    const { rows } = await pool.query('SELECT id,name FROM users WHERE tag=$1', [tag.toLowerCase()]);
    const u = rows[0];
    if (u) { members.push({ name: u.name }); invitedIds.push(u.id); }
  }

  const bracket = buildEmptyBracket(members);

  await pool.query(
    `INSERT INTO cups(id,name,creator_id,is_multi,game_id,passcode,bracket_data) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [id, name, req.user.id, is_multi ? 1 : 0, game_id || null, passcode || null, JSON.stringify(bracket)],
  );

  await pool.query(`INSERT INTO cup_members(cup_id,user_id) VALUES($1,$2)`, [id, req.user.id]);
  for (const uid of invitedIds) {
    await pool.query(`INSERT INTO cup_members(cup_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [id, uid]);
    await pool.query(
      `INSERT INTO notifications(type,from_id,to_id,details,match_data) VALUES('FRIEND_REQUEST',$1,$2,$3,$4)`,
      [req.user.id, uid, `Invitation à rejoindre la coupe "${name}"`, JSON.stringify({ cupId: id, passcode })],
    );
  }

  res.status(201).json({ id, name, bracket });
});

// POST /api/cups/join
router.post('/join', async (req, res) => {
  const { id, passcode } = req.body;
  const { rows } = await pool.query('SELECT * FROM cups WHERE id=$1', [id?.toUpperCase()]);
  const cup = rows[0];
  if (!cup) return res.status(404).json({ error: 'Coupe introuvable' });
  if (cup.passcode && cup.passcode !== passcode) return res.status(403).json({ error: 'Mot de passe incorrect' });
  await pool.query(`INSERT INTO cup_members(cup_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [cup.id, req.user.id]);
  res.json({ ok: true });
});

// GET /api/cups/:id
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM cups WHERE id=$1', [req.params.id]);
  const cup = rows[0];
  if (!cup) return res.status(404).json({ error: 'Coupe introuvable' });
  res.json({ ...cup, bracket: JSON.parse(cup.bracket_data || 'null') });
});

// PATCH /api/cups/:id/bracket — mettre à jour un match du bracket
router.patch('/:id/bracket', async (req, res) => {
  const { roundKey, matchId, winner, score } = req.body;
  const { rows } = await pool.query('SELECT * FROM cups WHERE id=$1', [req.params.id]);
  const cup = rows[0];
  if (!cup) return res.status(404).json({ error: 'Coupe introuvable' });

  const isCreator = cup.creator_id === req.user.id;
  if (!isCreator) return res.status(403).json({ error: 'Seul le créateur peut modifier le bracket' });

  const bracket = JSON.parse(cup.bracket_data || '{}');
  let match;
  if (roundKey === 'final')  match = bracket.final;
  else match = (bracket[roundKey] || []).find(m => m.id === matchId);

  if (!match) return res.status(404).json({ error: 'Match de bracket introuvable' });
  match.winner = winner;
  match.score  = score;

  // Propager le gagnant en demi / finale automatiquement
  const advance = (src, dst, slot) => {
    if (src.every(m => m.winner)) {
      if (dst) { if (slot === 0) dst.p1 = src[0].winner; else dst.p2 = src[1].winner; }
    }
  };
  if (roundKey === 'leftSemis')  advance(bracket.leftSemis,  bracket.final, 0);
  if (roundKey === 'rightSemis') advance(bracket.rightSemis, bracket.final, 1);

  // Statut finale
  if (bracket.final.winner) {
    await pool.query('UPDATE cups SET status=$1 WHERE id=$2', ['FINISHED', cup.id]);
  }

  await pool.query('UPDATE cups SET bracket_data=$1 WHERE id=$2', [JSON.stringify(bracket), cup.id]);
  res.json({ bracket });
});

export default router;
