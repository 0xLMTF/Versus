// ─────────────────────────────────────────────
// VERSUS — Initialisation base de données PostgreSQL
// ─────────────────────────────────────────────
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // requis par Render/Neon/Supabase
});

pool.connect()
  .then((client) => {
    console.log('✅ PostgreSQL connecté');
    client.release();
  })
  .catch((err) => {
    console.error('❌ PostgreSQL erreur :', err.message);
  });

// ── Schéma complet ────────────────────────────
export async function initDb() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- ── Utilisateurs ─────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT NOT NULL,
      tag         TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,        -- bcrypt hash
      avatar_url  TEXT,
      role        TEXT DEFAULT 'USER',  -- USER | SUPERADMIN
      elo         INTEGER DEFAULT 1200,
      wins        INTEGER DEFAULT 0,
      losses      INTEGER DEFAULT 0,
      streak      INTEGER DEFAULT 0,
      theme_color TEXT DEFAULT 'cyan',
      is_private  INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT now(),
      updated_at  TIMESTAMPTZ DEFAULT now()
    );

    -- ── Relations d'amitié ───────────────────
    CREATE TABLE IF NOT EXISTS friendships (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      TEXT DEFAULT 'PENDING', -- PENDING | ACCEPTED | BLOCKED
      created_at  TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, friend_id)
    );

    -- ── Catégories de jeux ───────────────────
    CREATE TABLE IF NOT EXISTS categories (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      icon      TEXT,
      cat_color TEXT DEFAULT '#00F2FE',
      "desc"    TEXT,
      sort_order INTEGER DEFAULT 0
    );

    -- ── Jeux ────────────────────────────────
    CREATE TABLE IF NOT EXISTS games (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      icon        TEXT,
      created_by  TEXT REFERENCES users(id),
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    -- ── Ligues (créées avant matches pour la FK) ──
    CREATE TABLE IF NOT EXISTS leagues (
      id              TEXT PRIMARY KEY,    -- ex: LIGUE-8842
      name            TEXT NOT NULL,
      creator_id      TEXT NOT NULL REFERENCES users(id),
      discipline      TEXT DEFAULT 'multi', -- multi | single
      season          TEXT DEFAULT 'Saison 1',
      passcode        TEXT,
      is_active       INTEGER DEFAULT 1,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    -- ── Coupes (créées avant matches pour la FK) ──
    CREATE TABLE IF NOT EXISTS cups (
      id          TEXT PRIMARY KEY,   -- ex: COUPE-9901
      name        TEXT NOT NULL,
      creator_id  TEXT NOT NULL REFERENCES users(id),
      is_multi    INTEGER DEFAULT 0,
      game_id     TEXT REFERENCES games(id),
      passcode    TEXT,
      status      TEXT DEFAULT 'ONGOING', -- ONGOING | FINISHED
      bracket_data TEXT,              -- JSON du bracket complet
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    -- ── Matchs ───────────────────────────────
    CREATE TABLE IF NOT EXISTS matches (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      p1_id       TEXT NOT NULL REFERENCES users(id),
      p2_id       TEXT NOT NULL REFERENCES users(id),
      winner_id   TEXT REFERENCES users(id),
      category_id TEXT REFERENCES categories(id),
      game_id     TEXT REFERENCES games(id),
      game_name   TEXT,                  -- dénormalisé pour affichage rapide
      score       TEXT,                  -- ex: "6-3 6-2"
      proof_url   TEXT,
      league_id   TEXT REFERENCES leagues(id),
      cup_id      TEXT REFERENCES cups(id),
      status      TEXT DEFAULT 'CONFIRMED',  -- PENDING | CONFIRMED | DISPUTED | CANCELLED
      elo_delta   INTEGER DEFAULT 0,
      played_at   TIMESTAMPTZ DEFAULT now(),
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS league_games (
      league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
      game_id   TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      PRIMARY KEY (league_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS league_members (
      league_id  TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       TEXT DEFAULT 'MEMBER',  -- OWNER | MEMBER
      joined_at  TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (league_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS cup_members (
      cup_id    TEXT NOT NULL REFERENCES cups(id) ON DELETE CASCADE,
      user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (cup_id, user_id)
    );

    -- ── Notifications ────────────────────────
    CREATE TABLE IF NOT EXISTS notifications (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      type        TEXT NOT NULL,  -- MATCH_CLAIM | FRIEND_REQUEST | MATCH_ACCEPTED | BADGE_UNLOCKED
      from_id     TEXT REFERENCES users(id),
      to_id       TEXT NOT NULL REFERENCES users(id),
      details     TEXT,
      status      TEXT DEFAULT 'PENDING', -- PENDING | ACCEPTED | REFUSED | READ
      proof_url   TEXT,
      match_data  TEXT,           -- JSON des métadonnées du match
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    -- ── Badges obtenus ───────────────────────
    CREATE TABLE IF NOT EXISTS user_badges (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id   TEXT NOT NULL,
      earned_at  TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (user_id, badge_id)
    );

    -- ── Évaluations par catégorie (H2H) ──────
    CREATE TABLE IF NOT EXISTS category_ratings (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      from_id     TEXT NOT NULL REFERENCES users(id),
      to_id       TEXT NOT NULL REFERENCES users(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      rating      INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      updated_at  TIMESTAMPTZ DEFAULT now(),
      UNIQUE(from_id, to_id, category_id)
    );

    -- ── Sessions (refresh tokens) ────────────
    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token TEXT NOT NULL UNIQUE,
      expires_at    TIMESTAMPTZ NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    -- ── Index pour performances ───────────────
    CREATE INDEX IF NOT EXISTS idx_matches_p1        ON matches(p1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_p2        ON matches(p2_id);
    CREATE INDEX IF NOT EXISTS idx_matches_winner    ON matches(winner_id);
    CREATE INDEX IF NOT EXISTS idx_matches_league    ON matches(league_id);
    CREATE INDEX IF NOT EXISTS idx_matches_cup       ON matches(cup_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_to  ON notifications(to_id);
    CREATE INDEX IF NOT EXISTS idx_league_members_u  ON league_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_user  ON friendships(user_id);

    -- Migration (ta base tourne déjà : CREATE TABLE IF NOT EXISTS ne touche
    -- pas une table existante, donc on ajoute la colonne explicitement)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private INTEGER DEFAULT 0;
  `);

  console.log('✅ Schéma PostgreSQL initialisé');
}

// ── Seed — données initiales ─────────────────
export async function seedDb() {
  const bcrypt = (await import('bcryptjs')).default;

  // Catégories (alignées avec le front)
  const cats = [
    { id: 'sports',     name: 'Physique & Sport',      icon: '⚽', cat_color: '#F43F5E', desc: 'Sports réels & simulateurs' },
    { id: 'precision',  name: 'Adresse & Précision',   icon: '🎯', cat_color: '#F59E0B', desc: 'Jeux de visée et dextérité' },
    { id: 'mind',       name: 'Réflexion & Stratégie', icon: '🧠', cat_color: '#8B5CF6', desc: 'Stratégie, cartes, cerveaux' },
    { id: 'videogames', name: 'Jeux Vidéo',            icon: '🎮', cat_color: '#00F2FE', desc: 'Console, PC, mobile' },
  ];
  for (const [i, c] of cats.entries()) {
    await pool.query(
      `INSERT INTO categories(id,name,icon,cat_color,"desc",sort_order) VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.name, c.icon, c.cat_color, c.desc, i],
    );
  }

  // Jeux (ids stables pour le front)
  const games = [
    { id: 'g_padel', name: 'Padel Tennis', category_id: 'sports' },
    { id: 'g_tt', name: 'Tennis de Table', category_id: 'sports' },
    { id: 'g_foot5', name: 'Foot à 5 (Urban)', category_id: 'sports' },
    { id: 'g_badminton', name: 'Badminton', category_id: 'sports' },
    { id: 'g_darts', name: 'Fléchettes 501', category_id: 'precision' },
    { id: 'g_bowling', name: 'Bowling', category_id: 'precision' },
    { id: 'g_billiard', name: 'Billard Américain', category_id: 'precision' },
    { id: 'g_molkky', name: 'Mölkky', category_id: 'precision' },
    { id: 'g_chess', name: 'Échecs Blitz 5min', category_id: 'mind' },
    { id: 'g_poker', name: "Poker Hold'em", category_id: 'mind' },
    { id: 'g_blindtest', name: 'Blind Test Musical', category_id: 'mind' },
    { id: 'g_mk8', name: 'Mario Kart 8 Deluxe', category_id: 'videogames' },
    { id: 'g_fc26', name: 'EA Sports FC 26', category_id: 'videogames' },
    { id: 'g_smash', name: 'Super Smash Bros Ultimate', category_id: 'videogames' },
    { id: 'g_rl', name: 'Rocket League', category_id: 'videogames' },
    { id: 'g_tekken', name: 'Tekken 8', category_id: 'videogames' },
  ];
  for (const g of games) {
    await pool.query(
      `INSERT INTO games(id,name,category_id) VALUES($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [g.id, g.name, g.category_id],
    );
  }

  // Comptes démo (password: versus123)
  const demoPassword = process.env.SUPERADMIN_PASSWORD || 'versus123';
  const hash = await bcrypt.hash(demoPassword, 10);
  const demoUsers = [
    { id: 'usr_alex', name: 'Alex', tag: '@alex_god', role: 'SUPERADMIN', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', theme: 'cyan', elo: 2150, wins: 42, losses: 24, streak: 5 },
    { id: 'usr_clement', name: 'Clément', tag: '@clement_boss', role: 'USER', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', theme: 'fuchsia', elo: 2090, wins: 38, losses: 35, streak: 7 },
    { id: 'usr_hugo', name: 'Hugo', tag: '@hugo_fast', role: 'USER', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', theme: 'emerald', elo: 1850, wins: 32, losses: 12, streak: 4 },
    { id: 'usr_sarah', name: 'Sarah', tag: '@sarah_smash', role: 'USER', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', theme: 'purple', elo: 1980, wins: 15, losses: 15, streak: 0 },
    { id: 'usr_thomas', name: 'Thomas', tag: '@thomas_pro', role: 'USER', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80', theme: 'rose', elo: 1720, wins: 9, losses: 21, streak: 0 },
  ];

  for (const u of demoUsers) {
    await pool.query(
      `INSERT INTO users(id,name,tag,password,avatar_url,role,elo,wins,losses,streak,theme_color)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.name, u.tag.toLowerCase(), hash, u.avatar, u.role, u.elo, u.wins, u.losses, u.streak, u.theme],
    );
  }

  // Amis acceptés entre Alex et les autres
  for (const friendId of ['usr_clement', 'usr_hugo', 'usr_sarah', 'usr_thomas']) {
    await pool.query(
      `INSERT INTO friendships(user_id, friend_id, status) VALUES($1,$2,'ACCEPTED') ON CONFLICT DO NOTHING`,
      ['usr_alex', friendId],
    );
    await pool.query(
      `INSERT INTO friendships(user_id, friend_id, status) VALUES($1,$2,'ACCEPTED') ON CONFLICT DO NOTHING`,
      [friendId, 'usr_alex'],
    );
  }

  console.log('✅ Données initiales insérées (cats + games + 5 comptes démo)');
  console.log(`   Login démo : @alex_god / ${demoPassword}`);
}

// ── CLI direct : node db.js --init [--seed] | --seed ──
const wantsInit = process.argv.includes('--init');
const wantsSeed = process.argv.includes('--seed');

if (wantsInit || wantsSeed) {
  await initDb();
  if (wantsSeed || wantsInit) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM categories');
    if (wantsSeed || rows[0].n === 0) {
      await seedDb();
    }
  }
  await pool.end();
  process.exit(0);
}