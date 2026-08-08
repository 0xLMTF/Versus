<div align="center">

# ⚔️ VERSUS

### Le classement ELO officiel de ta bande de potes.

*Padel, FIFA, échecs, fléchettes, Mario Kart... chaque duel compte. Chaque victoire se paie cash.*

![status](https://img.shields.io/badge/status-beta%20amis-orange)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Render](https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Front-Vercel-000000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**[🚀 Essayer Versus](https://versus-versus.vercel.app)**

</div>

---

## 🎯 Le pitch

On a tous ce pote qui prétend être imbattable au FIFA sans jamais le prouver. **Versus** met fin au débat.

C'est un tracker compétitif social pour les groupes d'amis : tu déclares tes matchs (sport, précision, stratégie, jeu vidéo...), ton **ELO** évolue en temps réel, ton historique face à chaque adversaire est consultable, et tes exploits débloquent des badges. Envie de structurer la baston sur la durée ? Monte une **ligue** avec classement saisonnier, ou une **coupe** à élimination directe avec bracket auto-généré.

La rivalité entre potes, mais avec des stats. Interface sombre, néon cyan/fuchsia, aucune pitié.

---

## ✨ Fonctionnalités

- 🏆 **Classement ELO** — chaque victoire/défaite recalcule ton rang en direct
- ⚔️ **Matchs 1v1** — déclaration directe, ou soumission à validation (l'adversaire confirme le score avant que ça compte)
- 🥇 **Ligues** — classement multi-joueurs sur une saison, rejoignable par code + mot de passe
- 🏅 **Coupes** — tournois à élimination directe, bracket avec progression automatique des vainqueurs
- 🎖️ **Badges** — débloqués automatiquement selon tes exploits
- 👥 **Réseau d'amis** — recherche, demandes, stats head-to-head détaillées
- 🎮 **4 catégories, 16 jeux** — Sport & Physique, Adresse & Précision, Réflexion & Stratégie, Jeux Vidéo
- 🔐 **Comptes réels** — inscription, connexion JWT, sessions persistantes

---

## 🛠️ Stack technique

| Couche | Techno | Hébergement |
|---|---|---|
| **Front** | React 19 + Vite + TypeScript + Tailwind CSS | Vercel |
| **API** | Express + PostgreSQL | Render |
| **Auth** | JWT + bcrypt, refresh tokens | — |

---

## 🚀 Essayer l'app

👉 **[versus-versus.vercel.app](https://versus-versus.vercel.app)**

### Comptes démo (mot de passe : `versus123`)

| Tag | Rôle |
|---|---|
| `@alex_god` | SUPERADMIN |
| `@clement_boss` · `@hugo_fast` · `@sarah_smash` · `@thomas_pro` | USER |

Ou crée ton propre compte — c'est un vrai backend, tes données persistent.

---

## 👨‍💻 Développer en local

```bash
git clone https://github.com/0xLMTF/Versus.git
cd Versus
corepack prepare pnpm@9.15.0 --activate

# Config back
cp versus-backend/.env.example versus-backend/.env
# → renseigne DATABASE_URL (Postgres), JWT_SECRET, CORS_ORIGIN

# Config front
cp artifacts/versus/.env.example artifacts/versus/.env
# → VITE_API_URL=http://localhost:3001 pour tester en local

corepack pnpm install
corepack pnpm dev
```

---

## 🗺️ Roadmap

- [x] Auth complète — inscription, connexion, session
- [x] API complète — matchs, ELO, ligues, coupes, notifications, amis
- [x] Backend migré sur PostgreSQL, déployé sur Render
- [x] Front déployé sur Vercel
- [ ] Câbler entièrement matchs / ligues / coupes / notifications côté front (aujourd'hui : partiellement mock)
- [ ] Système de recherche d'amis dynamique + comptes privés (sur invitation)
- [ ] Upload photo de profil avec recadrage
- [ ] Notifications réellement opérationnelles de bout en bout
- [ ] Découper l'écran principal en composants indépendants
- [ ] App mobile React Native / Expo

---

## 📁 Structure du repo

```
Versus/
├── artifacts/versus/     # Front produit (Vite + React)
├── versus-backend/       # API Express + PostgreSQL
└── scripts/              # Orchestration dev + smoke tests
```

---

