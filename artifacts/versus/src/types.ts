export type ThemeColor = {
  id: string;
  name: string;
  hex: string;
};

export type Game = {
  id: string;
  name: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  catColor: string;
  games: Game[];
};

export type Account = {
  id: string;
  name: string;
  tag: string;
  role: 'SUPERADMIN' | 'USER';
  avatar: string;
  themeColor: ThemeColor;
  elo: number;
  wins: number;
  losses: number;
  streak: number;
  nemesis: string | null;
};

export type RivalProfile = {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  wins: number;
  losses: number;
  streak: string;
  status: string;
  statusColor: string;
  elo: number;
  catWins: Record<string, number>;
  lastForm: string[];
};

export type MatchRecord = {
  id: string;
  p1: string;
  p2: string;
  catId: string;
  category: string;
  winner: string;
  score: string;
  date: string;
  proofUrl: string | null;
  leagueId: string | null;
  cupId: string | null;
  status: string;
};

export type AppNotification = {
  id: string;
  type: string;
  from: string;
  fromId: string;
  details: string;
  timestamp: string;
  status: string;
  proofUrl: string | null;
  matchData: {
    category: string;
    catId: string;
    score: string;
    leagueId: string | null;
  } | null;
};

export type LeagueStanding = {
  rank: number;
  name: string;
  avatar: string;
  pts: number;
  played: number;
  w: number;
  d: number;
  l: number;
  diff: string;
  streak: string;
};

export type League = {
  id: string;
  passcode: string;
  name: string;
  discipline: string;
  games: string[];
  season: string;
  creator: string;
  invitedPlayers: string[];
  standings: LeagueStanding[];
  topScorer: string;
  bestDefense: string;
  matchesList: MatchRecord[];
};

export type BracketMatch = {
  id: string;
  p1: string;
  p2: string;
  winner: string | null;
  score1: number | null;
  score2: number | null;
};

export type Tournament = {
  id: string;
  passcode: string;
  name: string;
  game: string;
  gameId: string;
  isMulti: boolean;
  games: string[];
  creator: string;
  invitedPlayers: string[];
  bracket: {
    leftQuarts: BracketMatch[];
    rightQuarts: BracketMatch[];
    leftSemis: BracketMatch[];
    rightSemis: BracketMatch[];
    final: BracketMatch;
  };
  mvp: string;
  totalMatchesPlayed: number;
};

export type BadgeDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  condition: (
    u: Account,
    m: MatchRecord[],
    p?: RivalProfile[],
    l?: League[],
    t?: Tournament[],
  ) => boolean;
};

export type EloTier = {
  min: number;
  max: number;
  name: string;
  color: string;
  icon: string;
  rank: number;
};
