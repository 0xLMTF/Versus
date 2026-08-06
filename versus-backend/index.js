// ─────────────────────────────────────────────
// VERSUS — Serveur Express principal
// ─────────────────────────────────────────────
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

import { pool, initDb, seedDb } from './db.js';
import authRoutes         from './routes/auth.js';
import userRoutes         from './routes/users.js';
import matchRoutes        from './routes/matches.js';
import leagueRoutes       from './routes/leagues.js';
import tournamentRoutes   from './routes/tournaments.js';
import notifRoutes        from './routes/notifications.js';
import gameRoutes         from './routes/games.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001');

// ── Bootstrap DB ──────────────────────────────
await initDb();
// Seed si la DB est vide (premier lancement)
const { rows: catCountRows } = await pool.query('SELECT COUNT(*)::int as n FROM categories');
if (catCountRows[0].n === 0) {
  console.log('📦 Première initialisation — seed des données...');
  await seedDb();
}

// ── Dossier uploads ───────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// ── App Express ───────────────────────────────
const app = express();

// Sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting — 200 req / 15min par IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessaie dans quelques minutes.' },
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logs (dev uniquement)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serveur de fichiers statiques (preuves uploadées)
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/matches',       matchRoutes);
app.use('/api/leagues',       leagueRoutes);
app.use('/api/cups',          tournamentRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/games',         gameRoutes);

// Healthcheck
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// Erreurs globales
app.use((err, req, res, next) => {
  console.error('💥 Erreur serveur :', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
  });
});

// ── Démarrage ─────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎮 VERSUS API démarrée sur http://localhost:${PORT}`);
  console.log(`   Env     : ${process.env.NODE_ENV}`);
  console.log(`   DB      : PostgreSQL (${process.env.DATABASE_URL ? 'connectée' : '⚠️ DATABASE_URL manquante'})`);
  console.log(`   CORS    : ${process.env.CORS_ORIGIN}`);
  console.log('\n✅ Routes disponibles :');
  console.log('   POST   /api/auth/register');
  console.log('   POST   /api/auth/login');
  console.log('   GET    /api/users/me');
  console.log('   GET    /api/users/search?q=...');
  console.log('   GET    /api/matches');
  console.log('   POST   /api/matches');
  console.log('   POST   /api/matches/claim  (ligue)');
  console.log('   GET    /api/leagues');
  console.log('   POST   /api/leagues');
  console.log('   GET    /api/cups');
  console.log('   POST   /api/cups');
  console.log('   GET    /api/notifications');
  console.log('   GET    /api/games/categories');
  console.log('   GET    /api/health\n');
});

export default app;
