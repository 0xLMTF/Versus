import type { BadgeDef, Category, EloTier, ThemeColor } from '../types';

export const USER_THEME_COLORS: ThemeColor[] = [
  { id: 'cyan', name: 'Cyan Cyber', hex: '#00F2FE' },
  { id: 'fuchsia', name: 'Rose Néon', hex: '#F000FF' },
  { id: 'emerald', name: 'Vert Émeraude', hex: '#10B981' },
  { id: 'amber', name: 'Or Solaire', hex: '#F59E0B' },
  { id: 'purple', name: 'Violet Royal', hex: '#8B5CF6' },
  { id: 'rose', name: 'Rouge Brasier', hex: '#F43F5E' },
  { id: 'lime', name: 'Vert Lime', hex: '#84CC16' },
  { id: 'orange', name: 'Orange Volt', hex: '#FF6B00' },
];

export const CATEGORIES: Category[] = [
  {
    id: 'sports',
    name: 'Physique & Sport',
    icon: '⚽',
    catColor: '#F43F5E',
    games: [
      { id: 'g_padel', name: 'Padel Tennis', desc: 'Duel sportif rapide en raquette' },
      { id: 'g_tt', name: 'Tennis de Table', desc: 'Précision et réflexes autour de la table' },
      { id: 'g_foot5', name: 'Foot à 5 (Urban)', desc: 'Match de football en équipe réduite' },
      { id: 'g_badminton', name: 'Badminton', desc: 'Vitesse et précision avec volant' },
    ],
  },
  {
    id: 'precision',
    name: 'Adresse & Précision',
    icon: '🎯',
    catColor: '#F59E0B',
    games: [
      { id: 'g_darts', name: 'Fléchettes 501', desc: 'Atteins la cible avec précision' },
      { id: 'g_bowling', name: 'Bowling', desc: 'Fais tomber un maximum de quilles' },
      { id: 'g_billiard', name: 'Billard Américain', desc: 'Maîtrise les angles et les effets' },
      { id: 'g_molkky', name: 'Mölkky', desc: 'Jeu de précision en plein air' },
    ],
  },
  {
    id: 'mind',
    name: 'Réflexion & Stratégie',
    icon: '🧠',
    catColor: '#8B5CF6',
    games: [
      { id: 'g_chess', name: 'Échecs Blitz 5min', desc: 'Affronte ton adversaire sous pression' },
      { id: 'g_poker', name: "Poker Hold'em", desc: 'Stratégie, bluff et lecture du jeu' },
      { id: 'g_blindtest', name: 'Blind Test Musical', desc: 'Teste ta culture musicale' },
    ],
  },
  {
    id: 'videogames',
    name: 'Jeux Vidéo',
    icon: '🎮',
    catColor: '#00F2FE',
    games: [
      { id: 'g_mk8', name: 'Mario Kart 8 Deluxe', desc: 'Course arcade et objets chaotiques' },
      { id: 'g_fc26', name: 'EA Sports FC 26', desc: 'Affronte tes amis sur le terrain' },
      { id: 'g_smash', name: 'Super Smash Bros Ultimate', desc: 'Combat avec des personnages légendaires' },
      { id: 'g_rl', name: 'Rocket League', desc: 'Football automobile compétitif' },
      { id: 'g_tekken', name: 'Tekken 8', desc: 'Combat en duel technique' },
    ],
  },
];

/** 30 badges — conditions evaluated against live demo state */
export const BADGES_CATALOG: BadgeDef[] = [
  { id: 'b1', name: 'Premier Sang', desc: 'Remporte ton 1er match', icon: '🩸', condition: (u) => u.wins >= 1 },
  { id: 'b2', name: 'Débutant', desc: 'Joue 5 matchs', icon: '🌱', condition: (_u, m) => m.length >= 5 },
  { id: 'b3', name: 'Combattant', desc: 'Joue 20 matchs', icon: '⚔️', condition: (_u, m) => m.length >= 20 },
  { id: 'b4', name: 'Vétéran', desc: 'Joue 50 matchs', icon: '🎖️', condition: (_u, m) => m.length >= 50 },
  { id: 'b5', name: 'Centurion', desc: 'Joue 100 matchs', icon: '💯', condition: (_u, m) => m.length >= 100 },
  { id: 'b6', name: 'Tueur en Série', desc: 'Enchaîne 5 victoires', icon: '🔥', condition: (u) => u.streak >= 5 },
  { id: 'b7', name: 'Déchaîné', desc: 'Enchaîne 10 victoires', icon: '⚡', condition: (u) => u.streak >= 10 },
  { id: 'b8', name: 'Intouchable', desc: 'Enchaîne 20 victoires', icon: '🛡️', condition: (u) => u.streak >= 20 },
  { id: 'b9', name: "Chasseur d'ELO", desc: 'Atteins 2000 ELO', icon: '📈', condition: (u) => u.elo >= 2000 },
  { id: 'b10', name: 'Légende', desc: 'Atteins 2500 ELO', icon: '👑', condition: (u) => u.elo >= 2500 },
  { id: 'b11', name: 'Roi du Padel', desc: '10 victoires en Padel', icon: '🎾', condition: (u, m) => m.filter((x) => x.winner === u.name && x.category === 'Padel Tennis').length >= 10 },
  { id: 'b12', name: 'Grand Maître', desc: '10 victoires aux Échecs', icon: '♟️', condition: (u, m) => m.filter((x) => x.winner === u.name && x.category === 'Échecs Blitz 5min').length >= 10 },
  { id: 'b13', name: "Pilote d'Élite", desc: '10 victoires à Mario Kart', icon: '🏎️', condition: (u, m) => m.filter((x) => x.winner === u.name && x.category === 'Mario Kart 8 Deluxe').length >= 10 },
  { id: 'b14', name: 'Roi du Billard', desc: '10 victoires au Billard', icon: '🎱', condition: (u, m) => m.filter((x) => x.winner === u.name && x.category === 'Billard Américain').length >= 10 },
  { id: 'b15', name: 'Dieu du Bowling', desc: '10 victoires au Bowling', icon: '🎳', condition: (u, m) => m.filter((x) => x.winner === u.name && x.category === 'Bowling').length >= 10 },
  { id: 'b16', name: 'Sniper', desc: '10 victoires aux Fléchettes', icon: '🎯', condition: (u, m) => m.filter((x) => x.winner === u.name && x.category === 'Fléchettes 501').length >= 10 },
  {
    id: 'b17',
    name: 'Dominateur',
    desc: '10 victoires vs le même joueur',
    icon: '😤',
    condition: (u, m) => {
      const counts: Record<string, number> = {};
      m.filter((x) => x.winner === u.name).forEach((x) => {
        const opp = x.p1 === u.name ? x.p2 : x.p1;
        counts[opp] = (counts[opp] || 0) + 1;
      });
      return Object.values(counts).some((v) => v >= 10);
    },
  },
  {
    id: 'b18',
    name: 'Pourfendeur',
    desc: 'Bats ton Némésis 5 fois',
    icon: '🗡️',
    condition: (u, m) => {
      if (!u.nemesis) return false;
      return m.filter((x) => x.winner === u.name && (x.p1 === u.nemesis || x.p2 === u.nemesis)).length >= 5;
    },
  },
  {
    id: 'b19',
    name: 'Organisateur',
    desc: 'Crée une ligue ou une coupe',
    icon: '📋',
    condition: (u, _m, _p, l = [], t = []) =>
      l.some((x) => x.creator === u.name) || t.some((x) => x.creator === u.name),
  },
  {
    id: 'b20',
    name: 'Champion de Ligue',
    desc: 'Sois 1er dans une ligue',
    icon: '🥇',
    condition: (u, _m, _p, l = []) => l.some((x) => x.standings[0]?.name?.includes(u.name)),
  },
  {
    id: 'b21',
    name: 'Finaliste',
    desc: "Atteins la finale d'une coupe",
    icon: '🏅',
    condition: (u, _m, _p, _l, t = []) =>
      t.some((x) => x.bracket?.final?.p1 === u.name || x.bracket?.final?.p2 === u.name),
  },
  {
    id: 'b22',
    name: 'Champion de Coupe',
    desc: 'Remporte une coupe',
    icon: '🏆',
    condition: (u, _m, _p, _l, t = []) => t.some((x) => x.bracket?.final?.winner === u.name),
  },
  {
    id: 'b23',
    name: 'Multi-Talent',
    desc: 'Gagne dans 3 catégories',
    icon: '🌟',
    condition: (u, m) => {
      const cats = new Set(m.filter((x) => x.winner === u.name).map((x) => x.catId).filter(Boolean));
      return cats.size >= 3;
    },
  },
  {
    id: 'b24',
    name: 'Perfectionniste',
    desc: 'Win rate 80%+ sur 10 matchs',
    icon: '💎',
    condition: (u) => u.wins + u.losses >= 10 && u.wins / (u.wins + u.losses) >= 0.8,
  },
  {
    id: 'b25',
    name: 'Revanche',
    desc: 'Gagne après 5 défaites',
    icon: '😤',
    condition: (u, m) => {
      let streak = 0;
      let max = 0;
      [...m].reverse().forEach((x) => {
        if (x.winner !== u.name) {
          streak++;
          max = Math.max(max, streak);
        } else streak = 0;
      });
      return max >= 5 && u.wins > 0;
    },
  },
  { id: 'b26', name: 'Chaud Bouillant', desc: 'Enchaîne 7 victoires', icon: '🌡️', condition: (u) => u.streak >= 7 },
  {
    id: 'b27',
    name: 'Polyglotte',
    desc: 'Joue dans les 4 catégories',
    icon: '🎲',
    condition: (_u, m) => {
      const cats = new Set(m.map((x) => x.catId).filter(Boolean));
      return cats.size >= 4;
    },
  },
  { id: 'b28', name: 'Social', desc: 'Ajoute 5 amis', icon: '🤝', condition: (_u, _m, p = []) => p.length >= 5 },
  {
    id: 'b29',
    name: 'Influenceur',
    desc: 'Crée 3 ligues ou coupes',
    icon: '📣',
    condition: (u, _m, _p, l = [], t = []) =>
      l.filter((x) => x.creator === u.name).length + t.filter((x) => x.creator === u.name).length >= 3,
  },
  { id: 'b30', name: 'Indomptable', desc: 'Encaisse 50 défaites', icon: '💪', condition: (u) => u.losses >= 50 },
];

export const ELO_TIERS: EloTier[] = [
  { min: 0, max: 1199, name: 'Bronze', color: '#CD7F32', icon: '🥉', rank: 0 },
  { min: 1200, max: 1599, name: 'Argent', color: '#A8A8B3', icon: '🥈', rank: 1 },
  { min: 1600, max: 1999, name: 'Or', color: '#FFD700', icon: '🥇', rank: 2 },
  { min: 2000, max: 2399, name: 'Platine', color: '#00F2FE', icon: '💠', rank: 3 },
  { min: 2400, max: 2799, name: 'Diamant', color: '#B9F2FF', icon: '💎', rank: 4 },
  { min: 2800, max: 9999, name: 'Champion', color: '#F000FF', icon: '👑', rank: 5 },
];

export const CONFETTI_COLORS = ['#00F2FE', '#F000FF', '#FFD700', '#10B981', '#F43F5E', '#8B5CF6'];

export function getEloTier(elo: number): EloTier {
  return ELO_TIERS.find((t) => elo >= t.min && elo <= t.max) || ELO_TIERS[0];
}
