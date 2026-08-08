import { USER_THEME_COLORS } from '../data/constants';
import type { Account, RivalProfile } from '../types';
import type { ApiUser } from './api';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80';

/** Map API user row → UI Account shape used across VersusApp */
export function mapApiUserToAccount(u: ApiUser): Account {
  const theme =
    USER_THEME_COLORS.find((c) => c.id === u.theme_color) || USER_THEME_COLORS[0];
  return {
    id: u.id,
    name: u.name,
    tag: u.tag.startsWith('@') ? u.tag : `@${u.tag}`,
    role: u.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'USER',
    avatar: u.avatar_url || FALLBACK_AVATAR,
    themeColor: theme,
    elo: u.elo ?? 1200,
    wins: u.wins ?? 0,
    losses: u.losses ?? 0,
    streak: u.streak ?? 0,
    nemesis: null,
  };
}

export function isSeedDemoAccount(userId: string): boolean {
  return userId.startsWith('usr_');
}

/**
 * Map un ami réel (retour API) vers le format RivalProfile utilisé partout
 * dans l'UI (mêmes champs que les anciens profils mock). Les stats par
 * catégorie et la forme récente ne sont pas encore calculées côté API
 * (nécessite le branchement des matchs) — valeurs neutres en attendant,
 * mises à jour dès que les vrais matchs seront comptés.
 */
export function mapApiUserToRivalProfile(u: ApiUser): RivalProfile {
  const total = (u.wins ?? 0) + (u.losses ?? 0);
  return {
    id: u.id,
    name: u.name,
    tag: u.tag.startsWith('@') ? u.tag : `@${u.tag}`,
    avatar: u.avatar_url || FALLBACK_AVATAR,
    wins: u.wins ?? 0,
    losses: u.losses ?? 0,
    streak: u.streak ? `${u.streak}🔥` : '—',
    status: total === 0 ? 'Nouvelle rivalité' : 'Rival',
    statusColor: 'text-cyan-400',
    elo: u.elo ?? 1200,
    catWins: { sports: 0, precision: 0, mind: 0, videogames: 0 },
    lastForm: [],
  };
}