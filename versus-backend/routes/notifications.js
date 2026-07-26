// ── Notification routes — /api/notifications ──
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDb } from '../db.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications?status=PENDING
router.get('/', (req, res) => {
  const { status } = req.query;
  const db = getDb();
  let where = 'WHERE n.to_id = ?';
  const params = [req.user.id];
  if (status) { where += ' AND n.status = ?'; params.push(status); }

  const notifs = db.prepare(`
    SELECT n.*, u.name as from_name, u.avatar_url as from_avatar
    FROM notifications n
    LEFT JOIN users u ON u.id = n.from_id
    ${where}
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(...params);

  res.json(notifs.map(n => ({
    ...n,
    match_data: n.match_data ? JSON.parse(n.match_data) : null,
  })));
});

// GET /api/notifications/count — badge counter
router.get('/count', (req, res) => {
  const db = getDb();
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE to_id=? AND status='PENDING'`).get(req.user.id);
  res.json({ count });
});

// PATCH /api/notifications/:id/read — marquer comme lu
router.patch('/:id/read', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE notifications SET status='READ' WHERE id=? AND to_id=?`).run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE notifications SET status='READ' WHERE to_id=? AND status='PENDING'`).run(req.user.id);
  res.json({ ok: true });
});

// POST /api/notifications/proof-request — demander une preuve
router.post('/proof-request', (req, res) => {
  const { targetUserId, matchId, message } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId requis' });
  const db = getDb();
  db.prepare(`INSERT INTO notifications(type,from_id,to_id,details,match_data) VALUES('PROOF_REQUEST',?,?,?,?)`)
    .run(req.user.id, targetUserId, message || 'Preuve demandée', JSON.stringify({ matchId }));
  res.status(201).json({ ok: true });
});

export default router;
