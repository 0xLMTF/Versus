# Versus

Tracker compétitif social — rivalités, matchs, ligues, coupes, badges.

Stack réelle du repo (pas encore React Native / Supabase) :

| Couche | Techno |
|--------|--------|
| Front | React 19 + Vite + Tailwind (`artifacts/versus`) |
| API | Express + SQLite (`versus-backend`) |
| Monorepo | pnpm workspaces |

Les comptes démo (Alex, Clément, Hugo, Sarah, Thomas) sont **conservés** : le front tourne en mémoire avec ce seed, et l’API les recrée aussi au premier boot.

---

## Prérequis

- **Node.js 20 LTS** (recommandé). Node 22/24 peut échouer sur `better-sqlite3` sans Visual Studio Build Tools.
- pnpm 9 via Corepack : `corepack prepare pnpm@9.15.0 --activate` puis `corepack pnpm …`  
  (`corepack enable` demande parfois l’admin Windows — sinon garde le préfixe `corepack`.)
- Sur Windows sans Node 20 système : un Node portable a été validé sous `%LOCALAPPDATA%\VersusDev\node20`.

```powershell
# Si besoin, Node 20 en tête du PATH pour cette session :
$env:Path = "$env:LOCALAPPDATA\VersusDev\node20;" + $env:Path
```


---

## Démarrage rapide (localhost)

```bash
# 1. Installer pnpm (une fois)
corepack prepare pnpm@9.15.0 --activate

# 2. Installer le monorepo + init DB
corepack pnpm setup
# équivalent : corepack pnpm install && corepack pnpm db:init

# 3. Lancer API (3001) + Web (5173)
corepack pnpm dev
```

- Front : http://localhost:5173  
- API health : http://localhost:3001/api/health  

### Comptes démo (API)

| Tag | Mot de passe | Rôle |
|-----|--------------|------|
| `@alex_god` | `versus123` | SUPERADMIN |
| `@clement_boss` | `versus123` | USER |
| `@hugo_fast` / `@sarah_smash` / `@thomas_pro` | `versus123` | USER |

### Lancer séparément

```bash
corepack pnpm dev:web    # Vite seul → http://localhost:5173
corepack pnpm dev:api    # Express seul → http://localhost:3001
corepack pnpm smoke      # health + login démo (API déjà up)
```

## Auth (preview testable)

Flow supporté de bout en bout via l’API :

1. **Inscription** — écran Connexion / Inscription  
2. **Connexion** — tag + mot de passe (ou comptes démo `versus123`)  
3. **Session** — JWT en `localStorage`, restaurée au reload  
4. **Déconnexion** — Profil → Se déconnecter  
5. **Fermer mon compte** — Profil → ⚙️ → Zone de danger → tape `FERMER` + mot de passe  

| Tag démo | Mot de passe |
|----------|--------------|
| `@alex_god` | `versus123` |
| `@clement_boss` | `versus123` |

Un compte **nouveau** démarre avec une UI vide (pas l’historique d’Alex). Un compte démo charge le seed riche pour explorer le produit.

---

## Preview live — le plus simple

### A. Sur ton PC (déjà prêt)

```powershell
$env:Path = "$env:LOCALAPPDATA\VersusDev\node20;" + $env:Path
cd C:\Users\louni\Desktop\Versus
corepack pnpm dev
```

Ouvre **http://localhost:5173** (API sur **:3001**).

### B. Lien partageable (recommandé pour montrer à quelqu’un)

1. Garde `corepack pnpm dev` qui tourne en local  
2. Dans un **autre** terminal : installe [ngrok](https://ngrok.com/download) (compte gratuit)  
3. `ngrok http 5173`  
4. Partage l’URL `https://….ngrok-free.app`  

Astuce : l’API est appelée sur `localhost:3001` depuis le navigateur du **visiteur**, donc **ça ne marchera pas** pour eux. Pour une vraie preview partagée :

- soit tu exposes aussi l’API (`ngrok http 3001`) et tu mets `VITE_API_URL=https://ton-api.ngrok…` avant de rebuild/relancer Vite  
- soit (plus simple plus tard) tu déploies front + API sur **Railway / Render** (gratuit pour démarrer)

### C. Déploiement cloud simple (plus tard, 15–20 min)

| Pièce | Où |
|-------|-----|
| Front Vite | [Vercel](https://vercel.com) ou Netlify — root `artifacts/versus` |
| API + SQLite | [Railway](https://railway.app) ou Render — dossier `versus-backend` |

Pour l’instant, **localhost + éventuellement 2 tunnels ngrok** est le chemin le plus rapide.

## Structure

```
Versus/
├── artifacts/versus/          # UI produit (Vite)
│   └── src/
│       ├── VersusApp.tsx      # Écrans + state
│       ├── data/              # Seed + constantes (badges, cats…)
│       ├── components/        # UI Versus (modals, ELO…)
│       ├── types.ts
│       └── lib/api.ts         # Client API (à brancher)
├── versus-backend/            # API Express + SQLite
├── lib/                       # Scaffolds Replit (OpenAPI/Drizzle) — non utilisés par le produit
├── artifacts/api-server/      # Scaffold /healthz Replit — ignorer
└── scripts/dev.mjs            # Lance API + Web ensemble
```

---

## GitHub

```bash
git remote add origin https://github.com/<toi>/Versus.git
git add .
git commit -m "chore: make Versus runnable locally outside Replit"
git push -u origin master
```

`.gitignore` exclut déjà `node_modules`, `.env`, `*.db`, uploads.

---

## État actuel & suite logique

**Déjà fait**

- Config Windows / localhost + scripts `pnpm setup` / `dev` / `smoke`
- Auth complète : inscription → session → déconnexion → **fermer mon compte**
- Seed API + comptes démo (`versus123`)
- Extraction data / types / composants hors du monolithe

**Prochaines étapes utiles**

1. Brancher matchs / ligues / notifs sur l’API (pas seulement l’auth)
2. Découper les écrans depuis `VersusApp.tsx`
3. Déploiement preview (Vercel + Railway) pour un lien public sans ngrok
4. Postgres/Supabase puis RN/Expo quand l’API est stable
5. Tests automatisés (Vitest + smoke auth)

Les dossiers `lib/*` et `artifacts/api-server` / `mockup-sandbox` sont du scaffolding Replit : on peut les garder inactifs ou les supprimer plus tard sans toucher au produit.
