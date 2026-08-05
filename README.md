<div align="center">

# ⚔️ VERSUS

### Le classement ELO officiel de ta bande de potes.

*Padel, FIFA, échecs, fléchettes, Mario Kart... chaque duel compte. Chaque victoire se paie cash.*

![status](https://img.shields.io/badge/status-en%20développement-orange)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

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
- 🎖️ **Badges** — débloqués automatiquement selon tes exploits (séries de victoires, nemesis battu...)
- 🔔 **Notifications** — demandes d'amis, validations de match, demandes de preuve
- 👥 **Réseau d'amis** — recherche par tag, demandes, stats head-to-head détaillées
- 🎮 **4 catégories, 16 jeux** — Sport & Physique, Adresse & Précision, Réflexion & Stratégie, Jeux Vidéo
- 🔐 **Comptes réels** — inscription, connexion JWT, sessions persistantes, suppression de compte en un clic

---

## 🖼️ Aperçu

> _Glisse ici 2-3 captures d'écran ou un GIF (accueil, déclaration de match, bracket de coupe) — c'est ce qui vend le projet en 3 secondes à quelqu'un qui atterrit sur le repo._

---

## 🛠️ Stack technique

| Couche | Techno |
|---|---|
| **Front** | React 19 + Vite + TypeScript + Tailwind CSS |
| **API** | Express + SQLite (`better-sqlite3`) |
| **Auth** | JWT + bcrypt, refresh tokens |
| **Monorepo** | pnpm workspaces |

---

## 🚀 Démarrage rapide

```bash
# 1. Installer pnpm
corepack prepare pnpm@9.15.0 --activate

# 2. Config (une fois)
cp versus-backend/.env.example versus-backend/.env

# 3. Installer le monorepo + init DB
corepack pnpm setup

# 4. Lancer API (3001) + Web (5173)
corepack pnpm dev
```

Front → **http://localhost:5173** · API → **http://localhost:3001/api/health**

### Comptes démo (mot de passe : `versus123`)

| Tag | Rôle |
|---|---|
| `@alex_god` | SUPERADMIN |
| `@clement_boss` · `@hugo_fast` · `@sarah_smash` · `@thomas_pro` | USER |

---

## 🗺️ Roadmap

- [x] Auth complète — inscription, connexion, session, suppression de compte
- [x] API complète — matchs, ELO, ligues, coupes, notifications, amis
- [x] Seed démo + comptes de test
- [ ] Brancher matchs / ligues / coupes / notifications sur l'API (aujourd'hui : mock en mémoire côté front)
- [ ] Découper l'écran principal en composants indépendants
- [ ] Déploiement preview public (Vercel + Railway) — fini le ngrok
- [ ] Migration Postgres / Supabase
- [ ] App mobile React Native / Expo
- [ ] Tests automatisés (Vitest + smoke API)

---

## 📁 Structure du repo

```
Versus/
├── artifacts/versus/     # Front produit (Vite + React)
├── versus-backend/       # API Express + SQLite
└── scripts/              # Orchestration dev + smoke tests
```

---

## 📌 État actuel

L'API couvre déjà tout le domaine métier (matchs, ELO, ligues, coupes, notifications, amis) et persiste réellement en base. Le front, lui, n'est branché sur l'API que pour l'**authentification** — le reste (matchs, ligues, coupes) tourne encore sur des données de démo en mémoire, le temps de finir le câblage. Projet en développement actif, pas encore prêt pour la prod.

---

## 📄 Licence

MIT — fais-en ce que tu veux.

<div align="center">

*Construit avec rage compétitive et beaucoup trop de café.* ☕

</div>
