// ── Notification routes — /api/notifications ──
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications?status=PENDING
router.get('/', async (req, res) => {
  const { status } = req.query;
  let where = 'WHERE n.to_id = $1';
  const params = [req.user.id];
  if (status) { params.push(status); where += ` AND n.status = $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT n.*, u.name as from_name, u.avatar_url as from_avatar
     FROM notifications n
     LEFT JOIN users u ON u.id = n.from_id
     ${where}
     ORDER BY n.created_at DESC
     LIMIT 50`,
    params,
  );

  res.json(rows.map(n => ({
    ...n,
    match_data: n.match_data ? JSON.parse(n.match_data) : null,
  })));
});

// GET /api/notifications/count — badge counter
router.get('/count', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int as count FROM notifications WHERE to_id=$1 AND status='PENDING'`,
    [req.user.id],
  );
  res.json({ count: rows[0].count });
});

// PATCH /api/notifications/:id/read — marquer comme lu
router.patch('/:id/read', async (req, res) => {
  await pool.query(`UPDATE notifications SET status='READ' WHERE id=$1 AND to_id=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  await pool.query(`UPDATE notifications SET status='READ' WHERE to_id=$1 AND status='PENDING'`, [req.user.id]);
  res.json({ ok: true });
});

// POST /api/notifications/proof-request — demander une preuve
router.post('/proof-request', async (req, res) => {
  const { targetUserId, matchId, message } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId requis' });
  await pool.query(
    `INSERT INTO notifications(type,from_id,to_id,details,match_data) VALUES('PROOF_REQUEST',$1,$2,$3,$4)`,
    [req.user.id, targetUserId, message || 'Preuve demandée', JSON.stringify({ matchId })],
  );
  res.status(201).json({ ok: true });
});

export default router;
