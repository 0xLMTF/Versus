# 🎮 VERSUS — Backend API

Stack : **Node.js 18+** · **Express** · **SQLite (better-sqlite3)** · **JWT**

---

## 📋 Prérequis

```bash
node --version   # >= 18
npm --version    # >= 9
```

---

## 🚀 Installation & démarrage

```bash
# 1. Copier dans un nouveau dossier sur ton PC
cd versus-backend

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Édite .env : change JWT_SECRET et SUPERADMIN_PASSWORD

# 4. Initialiser la base de données (crée versus.db + tables + données initiales)
npm run db:init

# 5. Démarrer en mode développement (redémarre auto à chaque modif)
npm run dev

# OU en production
npm start
```

L'API écoute sur **http://localhost:3001** par défaut.

---

## 🗄️ Base de données

SQLite — fichier `versus.db` créé au premier `npm run db:init`.

Pour réinitialiser complètement :
```bash
rm versus.db
npm run db:init
```

### Tables principales

| Table | Description |
|---|---|
| `users` | Comptes joueurs, ELO, stats |
| `friendships` | Relations amicales (PENDING/ACCEPTED) |
| `matches` | Matchs confirmés ou en attente |
| `leagues` | Ligues avec membres et classement |
| `cups` | Coupes avec bracket JSON |
| `notifications` | Alertes (match claims, invitations...) |
| `categories` | Catégories de jeux |
| `games` | Catalogue des jeux |
| `user_badges` | Badges débloqués par joueur |

---

## 🔌 Endpoints principaux

### Auth
```
POST /api/auth/register   { name, tag, password }
POST /api/auth/login      { tag, password }
POST /api/auth/refresh    { refreshToken }
POST /api/auth/logout     { refreshToken }
```

### Utilisateurs
```
GET    /api/users/me
PATCH  /api/users/me          { name, avatar_url, theme_color, password }
GET    /api/users/search?q=   Recherche par nom ou tag
GET    /api/users/:id         Profil public
GET    /api/users/me/friends
POST   /api/users/me/friends  { tag }   → demande d'ami
PATCH  /api/users/me/friends/:id { status: 'ACCEPTED'|'BLOCKED' }
GET    /api/users/me/h2h/:opponentId
```

### Matchs
```
GET    /api/matches            ?userId=&catId=&limit=20&offset=0
POST   /api/matches            Déclarer un match confirmé direct
POST   /api/matches/claim      Soumettre un match de ligue (PENDING)
PATCH  /api/matches/:id/accept Adversaire accepte
PATCH  /api/matches/:id/refuse Adversaire refuse
GET    /api/matches/:id
```

### Ligues
```
GET    /api/leagues
POST   /api/leagues            { name, discipline, games[], passcode, invitedTags[] }
POST   /api/leagues/join       { id, passcode }
GET    /api/leagues/:id        → standings + recentMatches
DELETE /api/leagues/:id
```

### Coupes
```
GET    /api/cups
POST   /api/cups               { name, is_multi, game_id, passcode, invitedTags[] }
POST   /api/cups/join          { id, passcode }
GET    /api/cups/:id
PATCH  /api/cups/:id/bracket   { roundKey, matchId, winner, score }
```

### Notifications
```
GET    /api/notifications      ?status=PENDING
GET    /api/notifications/count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
POST   /api/notifications/proof-request
```

### Jeux
```
GET    /api/games/categories
GET    /api/games/leaderboard/:gameId
POST   /api/games              (SUPERADMIN) { name, category_id }
DELETE /api/games/:id          (SUPERADMIN)
```

---

## 🔐 Authentification

Toutes les routes sauf `/api/auth/*` et `/api/health` nécessitent un **Bearer token** :

```
Authorization: Bearer <access_token>
```

Le token est obtenu à la connexion (`/api/auth/login`) et dure **30 jours** (configurable via `JWT_EXPIRES_IN`).
Pour le renouveler sans redemander le mot de passe, utilise `/api/auth/refresh` avec le `refreshToken`.

---

## 📸 Upload de preuves

Les preuves de matchs sont transmises en **base64** dans le champ `proof_url` des requêtes JSON.  
Pour la production, remplace ce champ par une URL S3/Cloudinary et ajoute une route `/api/upload` avec `multer`.

---

## 🎯 ELO

| Paramètre | Valeur par défaut | Variable `.env` |
|---|---|---|
| Gain victoire | +18 | `ELO_WIN` |
| Perte défaite | -15 | `ELO_LOSS` |
| Minimum | 1000 | `ELO_MIN` |

---

## 🔗 Connecter le front React

Dans le projet Vite/React, remplace les données statiques par des appels à l'API :

```typescript
// src/lib/api.ts
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiGet(path: string) {
  const token = localStorage.getItem('versus_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem('versus_token');
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

Ajoute dans `artifacts/versus/.env.local` :
```
VITE_API_URL=http://localhost:3001
```

---

## 🗂️ Structure des fichiers

```
versus-backend/
├── index.js                  Serveur principal
├── db.js                     Schéma SQLite + seed
├── package.json
├── .env.example              Variables à copier en .env
├── middleware/
│   └── auth.js               JWT authenticate + requireAdmin
└── routes/
    ├── auth.js               Inscription, connexion, refresh
    ├── users.js              Profil, amis, H2H
    ├── matches.js            Déclarer, valider, refuser
    ├── leagues.js            CRUD ligues + classement
    ├── tournaments.js        CRUD coupes + bracket
    ├── notifications.js      Alertes et compteur
    └── games.js              Catalogue + leaderboards
```

---

## 📦 Pour aller plus loin (prod)

- [ ] Remplacer SQLite par **PostgreSQL** (Neon, Supabase, ou Railway)
- [ ] Ajouter **WebSockets** (socket.io) pour les notifs en temps réel
- [ ] Upload preuves vers **Cloudinary** ou **S3**
- [ ] Déployer sur **Railway**, **Render**, ou **Fly.io**
- [ ] Ajouter **Zod** pour la validation des inputs
- [ ] CI/CD avec GitHub Actions
