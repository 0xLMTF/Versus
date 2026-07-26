import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Swords, Trophy, CheckCircle2, Plus, Sparkles, History, BarChart3,
  Bell, User, Moon, UserPlus, Key, ShieldCheck, Gamepad2, Settings,
  Upload, Mail, MessageSquare, Star, LogOut, Lock, Search, Camera,
  X, ChevronRight, Zap, Target, Award, Flame, TrendingUp, Image,
  Trash2, Loader2,
} from 'lucide-react';

import { USER_THEME_COLORS, CATEGORIES, BADGES_CATALOG } from '@/data/constants';
import {
  ACCOUNTS,
  INITIAL_PROFILES_DB,
  INITIAL_MATCHES,
  INITIAL_NOTIFICATIONS,
  INITIAL_LEAGUES,
  INITIAL_TOURNAMENTS,
} from '@/data/seed';
import {
  Modal,
  ModalHeader,
  Input,
  Select,
  StarRating,
  CatBar,
  EloTierBadge,
  ConfettiParticle,
} from '@/components/versus-ui';
import AuthScreen from '@/components/AuthScreen';
import {
  deleteAccount,
  fetchMe,
  getToken,
  healthCheck,
  logout as apiLogout,
  updateMe,
  type ApiUser,
} from '@/lib/api';
import { isSeedDemoAccount, mapApiUserToAccount } from '@/lib/mapUser';
import type { Account } from '@/types';

// ─────────────────────────────────────────────
// MAIN APP (screens + state — auth via API)
// ─────────────────────────────────────────────

export default function VersusApp() {
  // ── Auth ──
  const [loggedInUser, setLoggedInUser] = useState<Account | null>(null);
  const [authBooting, setAuthBooting] = useState(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // ── Screens ──
  const [currentScreen, setCurrentScreen] = useState('home');
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // ── Modals ──
  const [modal, setModal] = useState<string | null>(null); // single modal key
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Data ──
  const [categories, setCategories] = useState(CATEGORIES);
  const [profilesDB, setProfilesDB] = useState(INITIAL_PROFILES_DB);
  const [selectedRival, setSelectedRival] = useState(INITIAL_PROFILES_DB[0]);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [leagues, setLeagues] = useState(INITIAL_LEAGUES);
  const [selectedLeagueIndex, setSelectedLeagueIndex] = useState(0);
  const [tournaments, setTournaments] = useState(INITIAL_TOURNAMENTS);
  const [selectedTourneyIndex, setSelectedTourneyIndex] = useState(0);
  const [allMatches, setAllMatches] = useState(INITIAL_MATCHES);
  const [user, setUser] = useState<Account>(ACCOUNTS[0]);

  // ── UI State ──
  const [selectedGameCatTab, setSelectedGameCatTab] = useState('sports');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [editingCupMatch, setEditingCupMatch] = useState<any>(null);
  const [viewingMatch, setViewingMatch] = useState<any>(null);
  const [viewingRivalDetail, setViewingRivalDetail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [proofRequestNotifId, setProofRequestNotifId] = useState<string | null>(null);
  const [proofRequestMessage, setProofRequestMessage] = useState('');
  const [showBadges, setShowBadges] = useState(false);
  const [newBadgeUnlock, setNewBadgeUnlock] = useState<typeof BADGES_CATALOG[0] | null>(null);
  const [celebrationWin, setCelebrationWin] = useState(false);
  const [historyFilter, setHistoryFilter] = useState({ result: 'all', catId: 'all' });

  // ── Forms ──
  const [matchForm, setMatchForm] = useState({ opponentId: 'clement', catId: 'videogames', gameName: 'Mario Kart 8 Deluxe', result: 'WIN', scoreNote: '', proofImage: null as string|null, attachTo: 'free', leagueId: '', cupId: '' });
  const [leagueCreateForm, setLeagueCreateForm] = useState({ name: '', discipline: 'multi', games: [] as string[], passcode: '', inviteTag: '', invitedTags: [] as string[] });
  const [leagueJoinForm, setLeagueJoinForm] = useState({ id: '', passcode: '' });
  const [leagueMatchForm, setLeagueMatchForm] = useState({ p1: '', p2: '', score1: 0, score2: 0, catId: 'videogames', game: 'Mario Kart 8 Deluxe', leagueId: '', proofImage: null as string|null });
  const [tourneyCreateForm, setTourneyCreateForm] = useState({ name: '', isMulti: false, games: [] as string[], gameId: 'g_mk8', passcode: '', inviteTag: '', invitedTags: [] as string[] });
  const [tourneyJoinForm, setTourneyJoinForm] = useState({ id: '', passcode: '' });
  const [adminGameForm, setAdminGameForm] = useState({ name: '', categoryId: 'videogames' });
  const [cupScoreForm, setCupScoreForm] = useState({ score1: '', score2: '' });
  const [profileForm, setProfileForm] = useState({ name: '', tag: '', avatar: '', themeId: 'cyan' });
  const [closeAccountForm, setCloseAccountForm] = useState({ password: '', confirm: '' });

  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const proofImageRef = useRef<HTMLInputElement>(null);
  const leagueProofRef = useRef<HTMLInputElement>(null);

  const applyAuthenticatedUser = (apiUser: ApiUser) => {
    const account = mapApiUserToAccount(apiUser);
    setLoggedInUser(account);
    setUser(account);
    setProfileForm({
      name: account.name,
      tag: account.tag,
      avatar: account.avatar,
      themeId: account.themeColor.id,
    });
    setCurrentScreen('home');
    setIsSettingsOpen(false);
    setModal(null);

    if (isSeedDemoAccount(account.id)) {
      setProfilesDB(INITIAL_PROFILES_DB);
      setSelectedRival(INITIAL_PROFILES_DB[0]);
      setAllMatches(INITIAL_MATCHES);
      setNotifications(INITIAL_NOTIFICATIONS);
      setLeagues(INITIAL_LEAGUES);
      setTournaments(INITIAL_TOURNAMENTS);
    } else {
      // Nouveau compte : UI propre (pas l'historique démo d'Alex)
      setProfilesDB([]);
      setSelectedRival(INITIAL_PROFILES_DB[0]);
      setAllMatches([]);
      setNotifications([]);
      setLeagues([]);
      setTournaments([]);
      setSelectedLeagueIndex(0);
      setSelectedTourneyIndex(0);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await healthCheck();
        if (!cancelled) setApiOnline(true);
      } catch {
        if (!cancelled) setApiOnline(false);
      }

      const token = getToken();
      if (!token) {
        if (!cancelled) setAuthBooting(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (!cancelled) applyAuthenticatedUser(me);
      } catch {
        // token mort
      } finally {
        if (!cancelled) setAuthBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived ──
  const allGames = useMemo(() => categories.flatMap(c => c.games.map(g => ({ ...g, catId: c.id, catName: c.name }))), [categories]);
  const activeLeague = leagues[selectedLeagueIndex] || leagues[0];
  const activeTourney = tournaments[selectedTourneyIndex] || tournaments[0];
  const pendingNotifsCount = notifications.filter(n => n.status === 'PENDING').length;

  // Nemesis = person who beats me the most
  const nemesis = useMemo(() => {
    const losses: Record<string, number> = {};
    allMatches.filter(m => m.winner !== user.name).forEach(m => {
      const opp = m.p1 === user.name ? m.p2 : m.p1;
      losses[opp] = (losses[opp] || 0) + 1;
    });
    let max = 0, nemName = '';
    Object.entries(losses).forEach(([k, v]) => { if (v > max) { max = v; nemName = k; } });
    return max >= 2 ? { name: nemName, count: max } : null;
  }, [allMatches, user.name]);

  // Badges
  const earnedBadges = useMemo(() =>
    BADGES_CATALOG.filter(b => { try { return b.condition(user, allMatches, profilesDB, leagues, tournaments); } catch { return false; } }),
    [user, allMatches, profilesDB, leagues, tournaments]
  );

  // Category win rates for current user
  const catStats = useMemo(() => {
    const result: Record<string, { wins: number; losses: number; rate: number }> = {};
    categories.forEach(c => {
      const wins = allMatches.filter(m => m.winner === user.name && m.catId === c.id).length;
      const total = allMatches.filter(m => (m.p1 === user.name || m.p2 === user.name) && m.catId === c.id).length;
      result[c.id] = { wins, losses: total - wins, rate: total > 0 ? Math.round((wins / total) * 100) : 0 };
    });
    return result;
  }, [allMatches, user.name, categories]);

  // H2H matches vs selected rival
  const rivalMatches = useMemo(() =>
    allMatches.filter(m => (m.p1 === user.name && m.p2 === selectedRival.name) || (m.p2 === user.name && m.p1 === selectedRival.name)),
    [allMatches, user.name, selectedRival]
  );

  // ── Toast ──
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Auth Handlers ──
  const handleAuthSuccess = (apiUser: ApiUser) => {
    applyAuthenticatedUser(apiUser);
    showToast(`Bienvenue ${apiUser.name} !`);
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await apiLogout();
    } finally {
      setLoggedInUser(null);
      setCurrentScreen('home');
      setIsSettingsOpen(false);
      setModal(null);
      setAuthBusy(false);
      showToast('À bientôt — session fermée');
    }
  };

  const handleCloseAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (closeAccountForm.confirm.trim().toUpperCase() !== 'FERMER') {
      showToast('Tape FERMER pour confirmer');
      return;
    }
    setAuthBusy(true);
    try {
      await deleteAccount(closeAccountForm.password);
      setLoggedInUser(null);
      setModal(null);
      setCloseAccountForm({ password: '', confirm: '' });
      showToast('Compte fermé définitivement');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Impossible de fermer le compte');
    } finally {
      setAuthBusy(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => showToast(`📋 ${label} copié !`))
      .catch(() => showToast(`ID : ${text}`));
  };

  // ── Match Handlers ──
  const handleDeclareMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const isWin = matchForm.result === 'WIN';
    const opponent = profilesDB.find(r => r.id === matchForm.opponentId) || profilesDB[0];
    const eloDelta = isWin ? 18 : -15;

    // Snapshot badges BEFORE the match to detect new unlocks
    const prevBadgeIds = new Set(
      BADGES_CATALOG.filter(b => { try { return b.condition(user, allMatches, profilesDB, leagues, tournaments); } catch { return false; } }).map(b => b.id)
    );

    const updatedUser = { ...user, wins: isWin ? user.wins+1 : user.wins, losses: !isWin ? user.losses+1 : user.losses, streak: isWin ? user.streak+1 : 0, elo: Math.max(1000, user.elo+eloDelta) };
    setUser(updatedUser);

    const newM: any = {
      id: `m_${Date.now()}`,
      p1: user.name, p2: opponent.name,
      catId: matchForm.catId, category: matchForm.gameName,
      winner: isWin ? user.name : opponent.name,
      score: matchForm.scoreNote || (isWin ? 'Victoire' : 'Défaite'),
      date: "À l'instant", proofUrl: matchForm.proofImage,
      leagueId: matchForm.attachTo === 'league' ? matchForm.leagueId : null,
      cupId: matchForm.attachTo === 'cup' ? matchForm.cupId : null,
      status: 'CONFIRMED',
    };
    const updatedMatches = [newM, ...allMatches];
    setAllMatches(updatedMatches);

    // Check for newly unlocked badges
    setTimeout(() => {
      const newBadge = BADGES_CATALOG.find(b => {
        try { return !prevBadgeIds.has(b.id) && b.condition(updatedUser, updatedMatches, profilesDB, leagues, tournaments); }
        catch { return false; }
      });
      if (newBadge) setNewBadgeUnlock(newBadge);
    }, 400);

    // Celebrate on win
    if (isWin) {
      setCelebrationWin(true);
      setTimeout(() => setCelebrationWin(false), 1800);
    }

    if (matchForm.attachTo === 'league' && matchForm.leagueId) {
      const pendingNotif: any = {
        id: `n_${Date.now()}`, type: 'MATCH_CLAIM', from: user.name, fromId: user.id,
        details: `Propose un résultat : ${user.name} vs ${opponent.name} (${matchForm.gameName}) – ${isWin ? 'Victoire' : 'Défaite'}`,
        timestamp: "À l'instant", status: 'PENDING', proofUrl: matchForm.proofImage,
        matchData: { category: matchForm.gameName, catId: matchForm.catId, score: matchForm.scoreNote || (isWin ? '1-0' : '0-1'), leagueId: matchForm.leagueId },
      };
      setNotifications(prev => [pendingNotif, ...prev]);
    }

    setModal(null);
    setQuickMenuOpen(false);
    showToast(isWin ? `⚡ Victoire ! +${eloDelta} ELO — ${updatedUser.elo} PTS` : `💀 Défaite. ${eloDelta} ELO — ${updatedUser.elo} PTS`);
    setMatchForm(f => ({ ...f, scoreNote: '', proofImage: null }));
  };

  const handleAcceptNotif = (notifId: string) => {
    const notif = notifications.find(n => n.id === notifId);
    setNotifications(notifications.map(n => n.id === notifId ? { ...n, status: 'ACCEPTED' } : n));
    if (notif?.matchData?.leagueId) {
      handleLeagueMatchFromNotif(notif);
    }
    showToast('✅ Match accepté et classement mis à jour !');
  };

  const handleRejectNotif = (notifId: string) => {
    setNotifications(notifications.map(n => n.id === notifId ? { ...n, status: 'REJECTED' } : n));
    showToast('❌ Match refusé.');
  };

  const handleAskProof = (notifId: string) => {
    setProofRequestNotifId(notifId);
    setModal('ask_proof');
  };

  const handleSendProofRequest = () => {
    if (!proofRequestNotifId) return;
    const notif = notifications.find(n => n.id === proofRequestNotifId);
    const reply: any = {
      id: `n_${Date.now()}`,
      type: 'PROOF_REQUEST',
      from: user.name,
      fromId: user.id,
      details: `Demande de preuve pour : "${notif?.details}" — "${proofRequestMessage || 'Envoie une photo ou une vidéo du match.'}"`,
      timestamp: "À l'instant",
      status: 'PENDING',
      proofUrl: null,
      matchData: null,
    };
    setNotifications(prev => [reply, ...prev.map(n => n.id === proofRequestNotifId ? { ...n, status: 'PROOF_REQUESTED' } : n)]);
    setProofRequestMessage('');
    setProofRequestNotifId(null);
    setModal(null);
    showToast('🔍 Demande de preuve envoyée !');
  };

  const handleLeagueMatchFromNotif = (notif: any) => {
    if (!notif.matchData?.leagueId) return;
    const lIdx = leagues.findIndex(l => l.id === notif.matchData.leagueId);
    if (lIdx < 0) return;
    const newMatch = { id: `lm_${Date.now()}`, p1: notif.from, p2: user.name, score1: 1, score2: 0, game: notif.matchData.category };
    recalcLeagueStandings(lIdx, newMatch);
  };

  const recalcLeagueStandings = (lIdx: number, newMatch: any) => {
    const activeL = leagues[lIdx];
    const updatedMatches = [newMatch, ...activeL.matchesList];
    const scoresMap: Record<string, any> = {};
    activeL.standings.forEach(st => { scoresMap[st.name] = { pts: 0, played: 0, w: 0, d: 0, l: 0, avatar: st.avatar, streak: st.streak }; });

    updatedMatches.forEach(m => {
      if (!scoresMap[m.p1]) scoresMap[m.p1] = { pts: 0, played: 0, w: 0, d: 0, l: 0, avatar: user.avatar, streak: '•' };
      if (!scoresMap[m.p2]) scoresMap[m.p2] = { pts: 0, played: 0, w: 0, d: 0, l: 0, avatar: user.avatar, streak: '•' };
      if (m.score1 > m.score2) { scoresMap[m.p1].pts += 3; scoresMap[m.p1].w += 1; scoresMap[m.p2].l += 1; }
      else if (m.score2 > m.score1) { scoresMap[m.p2].pts += 3; scoresMap[m.p2].w += 1; scoresMap[m.p1].l += 1; }
      else { scoresMap[m.p1].pts += 1; scoresMap[m.p1].d += 1; scoresMap[m.p2].pts += 1; scoresMap[m.p2].d += 1; }
    });

    const newStandings = Object.keys(scoresMap)
      .map(name => ({ name, avatar: scoresMap[name].avatar, pts: scoresMap[name].pts, played: scoresMap[name].w + scoresMap[name].d + scoresMap[name].l, w: scoresMap[name].w, d: scoresMap[name].d, l: scoresMap[name].l, diff: '+0', streak: scoresMap[name].streak }))
      .sort((a, b) => b.pts - a.pts)
      .map((st, idx) => ({ ...st, rank: idx + 1 }));

    setLeagues(leagues.map((l, i) => i === lIdx ? { ...l, standings: newStandings, matchesList: updatedMatches } : l));
  };

  const handleAddLeagueMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const lIdx = leagues.findIndex(l => l.id === leagueMatchForm.leagueId);
    if (lIdx < 0) { showToast('❌ Ligue introuvable.'); return; }
    const newMatch = { id: `lm_${Date.now()}`, p1: leagueMatchForm.p1, p2: leagueMatchForm.p2, score1: leagueMatchForm.score1, score2: leagueMatchForm.score2, game: leagueMatchForm.game };
    recalcLeagueStandings(lIdx, newMatch);

    // Add to global history (pending)
    const pendingNotif: any = {
      id: `n_${Date.now()}`,
      type: 'MATCH_CLAIM',
      from: user.name,
      fromId: user.id,
      details: `Match de ligue : ${leagueMatchForm.p1} ${leagueMatchForm.score1} - ${leagueMatchForm.score2} ${leagueMatchForm.p2} (${leagueMatchForm.game})`,
      timestamp: "À l'instant",
      status: 'PENDING',
      proofUrl: leagueMatchForm.proofImage,
      matchData: { category: leagueMatchForm.game, catId: leagueMatchForm.catId, score: `${leagueMatchForm.score1}-${leagueMatchForm.score2}`, leagueId: leagueMatchForm.leagueId },
    };
    setNotifications(prev => [pendingNotif, ...prev]);
    setModal(null);
    showToast('📊 Match soumis pour approbation !');
  };

  const handleCreateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId = `LIGUE-${Math.floor(1000 + Math.random() * 9000)}`;
    const newL = {
      id: generatedId,
      passcode: leagueCreateForm.passcode || 'Libre',
      name: leagueCreateForm.name || 'Ligue sans nom',
      discipline: leagueCreateForm.discipline,
      games: leagueCreateForm.games,
      season: 'Saison 1',
      creator: user.name,
      invitedPlayers: [user.name, ...leagueCreateForm.invitedTags],
      standings: [{ rank: 1, name: `${user.name} (Toi)`, avatar: user.avatar, pts: 0, played: 0, w: 0, d: 0, l: 0, diff: '0', streak: '•' }],
      topScorer: '-', bestDefense: '-', matchesList: [] as any[],
    };
    setLeagues([...leagues, newL]);
    setSelectedLeagueIndex(leagues.length);
    setModal(null);
    showToast(`Ligue "${newL.name}" créée ! ID: ${generatedId}`);
    setLeagueCreateForm({ name: '', discipline: 'multi', games: [], passcode: '', inviteTag: '', invitedTags: [] });
  };

  const handleJoinLeague = (e: React.FormEvent) => {
    e.preventDefault();
    const foundIdx = leagues.findIndex(l => l.id.toUpperCase() === leagueJoinForm.id.trim().toUpperCase());
    if (foundIdx !== -1) { setSelectedLeagueIndex(foundIdx); setModal(null); showToast(`Rejoint "${leagues[foundIdx].name}" !`); }
    else showToast('❌ ID de Ligue introuvable.');
  };

  const handleCreateTourney = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId = `COUPE-${Math.floor(1000 + Math.random() * 9000)}`;
    const selectedGame = allGames.find(g => g.id === tourneyCreateForm.gameId);
    const newT = {
      id: generatedId,
      passcode: tourneyCreateForm.passcode || 'Libre',
      name: tourneyCreateForm.name || 'Coupe sans nom',
      game: selectedGame?.name || 'Multi-Disciplines',
      gameId: tourneyCreateForm.gameId,
      isMulti: tourneyCreateForm.isMulti,
      games: tourneyCreateForm.games,
      creator: user.name,
      invitedPlayers: [user.name, ...tourneyCreateForm.invitedTags],
      bracket: {
        leftQuarts:  [{ id: 'l_q1', p1: 'Alex', p2: 'TBD', winner: null, score1: null, score2: null }, { id: 'l_q2', p1: 'TBD', p2: 'TBD', winner: null, score1: null, score2: null }],
        rightQuarts: [{ id: 'r_q1', p1: 'TBD', p2: 'TBD', winner: null, score1: null, score2: null }, { id: 'r_q2', p1: 'TBD', p2: 'TBD', winner: null, score1: null, score2: null }],
        leftSemis:   [{ id: 'l_s1', p1: 'TBD', p2: 'TBD', winner: null, score1: null, score2: null }],
        rightSemis:  [{ id: 'r_s1', p1: 'TBD', p2: 'TBD', winner: null, score1: null, score2: null }],
        final:        { id: 'f1', p1: 'TBD', p2: 'TBD', winner: null, score1: null, score2: null },
      },
      mvp: '-', totalMatchesPlayed: 0,
    };
    setTournaments([...tournaments, newT]);
    setSelectedTourneyIndex(tournaments.length);
    setModal(null);
    showToast(`Coupe "${newT.name}" créée ! ID: ${generatedId}`);
    setTourneyCreateForm({ name: '', isMulti: false, games: [], gameId: 'g_mk8', passcode: '', inviteTag: '', invitedTags: [] });
  };

  const handleJoinTourney = (e: React.FormEvent) => {
    e.preventDefault();
    const foundIdx = tournaments.findIndex(t => t.id.toUpperCase() === tourneyJoinForm.id.trim().toUpperCase());
    if (foundIdx !== -1) { setSelectedTourneyIndex(foundIdx); setModal(null); showToast(`Rejoint "${tournaments[foundIdx].name}" !`); }
    else showToast('❌ ID de Coupe introuvable.');
  };

  const handleSaveCupMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const s1 = parseInt(cupScoreForm.score1, 10), s2 = parseInt(cupScoreForm.score2, 10);
    if (isNaN(s1) || isNaN(s2) || s1 === s2) { showToast('❌ Scores invalides (pas d\'égalité).'); return; }
    const { tourneyId, match, roundKey } = editingCupMatch;
    const winnerName = s1 > s2 ? match.p1 : match.p2;
    setTournaments(tournaments.map(t => {
      if (t.id !== tourneyId) return t;
      const nb = { ...t.bracket };
      const upd = (arr: any[]) => arr.map((m: any) => m.id === match.id ? { ...m, score1: s1, score2: s2, winner: winnerName } : m);
      if (roundKey === 'leftQuarts')  { nb.leftQuarts = upd(nb.leftQuarts); if (match.id === 'l_q1') nb.leftSemis[0].p1 = winnerName; if (match.id === 'l_q2') nb.leftSemis[0].p2 = winnerName; }
      if (roundKey === 'rightQuarts') { nb.rightQuarts = upd(nb.rightQuarts); if (match.id === 'r_q1') nb.rightSemis[0].p1 = winnerName; if (match.id === 'r_q2') nb.rightSemis[0].p2 = winnerName; }
      if (roundKey === 'leftSemis')   { nb.leftSemis = upd(nb.leftSemis); nb.final = { ...nb.final, p1: winnerName }; }
      if (roundKey === 'rightSemis')  { nb.rightSemis = upd(nb.rightSemis); nb.final = { ...nb.final, p2: winnerName }; }
      if (roundKey === 'final')       { nb.final = { ...nb.final, score1: s1, score2: s2, winner: winnerName }; }
      return { ...t, bracket: nb };
    }));
    setEditingCupMatch(null);
    setCupScoreForm({ score1: '', score2: '' });
    showToast(`🏆 ${winnerName} qualifié(e) !`);
  };

  const handleAdminAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminGameForm.name.trim()) return;
    setCategories(categories.map(cat => cat.id === adminGameForm.categoryId ? { ...cat, games: [...cat.games, { id: `g_${Date.now()}`, name: adminGameForm.name }] } : cat));
    setModal(null);
    showToast(`🎮 "${adminGameForm.name}" ajouté !`);
    setAdminGameForm({ name: '', categoryId: 'videogames' });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenTheme = USER_THEME_COLORS.find(c => c.id === profileForm.themeId) || USER_THEME_COLORS[0];
    setAuthBusy(true);
    try {
      const updated = await updateMe({
        name: profileForm.name,
        avatar_url: profileForm.avatar,
        theme_color: chosenTheme.id,
      });
      const account = mapApiUserToAccount(updated);
      setLoggedInUser(account);
      setUser(account);
      setProfileForm({
        name: account.name,
        tag: account.tag,
        avatar: account.avatar,
        themeId: account.themeColor.id,
      });
      showToast('✅ Profil synchronisé !');
    } catch (err) {
      setUser((prev) => ({
        ...prev,
        name: profileForm.name,
        tag: profileForm.tag,
        avatar: profileForm.avatar,
        themeColor: chosenTheme,
      }));
      showToast(err instanceof Error ? `Local only — ${err.message}` : 'Profil sauvé en local');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { const r = new FileReader(); r.onloadend = () => setProfileForm(p => ({ ...p, avatar: r.result as string })); r.readAsDataURL(f); }
  };

  const handleProofImage = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const f = e.target.files?.[0];
    if (f) { const r = new FileReader(); r.onloadend = () => setter(r.result as string); r.readAsDataURL(f); }
  };

  // ─────────────────────────────────────────────
  // AUTH BOOT / LOGIN
  // ─────────────────────────────────────────────
  if (authBooting) {
    return (
      <div className="min-h-screen bg-[#07070A] text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Chargement session…</p>
      </div>
    );
  }

  if (!loggedInUser) {
    return <AuthScreen onSuccess={handleAuthSuccess} apiOnline={apiOnline} />;
  }

  // ─────────────────────────────────────────────
  // MAIN APP RENDER
  // ─────────────────────────────────────────────

  const navItems = [
    { id: 'home',        label: 'Accueil', icon: Swords },
    { id: 'leagues',     label: 'Ligue',   icon: ShieldCheck },
    { id: 'PLUS',        label: '',        icon: Plus },
    { id: 'tournaments', label: 'Coupe',   icon: Trophy },
    { id: 'stats',       label: 'Stats',   icon: BarChart3 },
    { id: 'profile',     label: 'Profil',  icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#07070A] text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-black flex flex-col justify-between">
      {/* BACKGROUND GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-96 blur-[130px] pointer-events-none opacity-20" style={{ backgroundColor: user.themeColor.hex }} />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#07070A]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentScreen('home')}>
          <div className="flex items-center space-x-1 font-black text-xl italic tracking-tighter">
            <span style={{ color: user.themeColor.hex }}>V</span>
            <span className="text-fuchsia-500">II</span>
            <span className="text-white ml-1 font-sans not-italic text-lg tracking-widest font-extrabold">VERSUS</span>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          {/* NOTIFICATIONS */}
          <div className="relative">
            <button onClick={() => setModal(modal === 'notifs' ? null : 'notifs')}
              className="relative p-2 rounded-xl bg-slate-900 border border-white/10 text-amber-400 hover:bg-slate-800 transition cursor-pointer">
              <Bell className="w-4 h-4" />
              {pendingNotifsCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />}
            </button>
            {modal === 'notifs' && (
              <div className="absolute right-0 mt-2 w-80 bg-[#0D0D14] border border-white/15 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black uppercase text-amber-400">Notifications</span>
                  <button onClick={() => setModal(null)} className="text-xs text-slate-400"><X className="w-3.5 h-3.5" /></button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Aucune notification.</p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {notifications.map(n => (
                      <div key={n.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-2 text-xs">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span className="font-bold text-white">{n.from}</span>
                          <span>{n.timestamp}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{n.details}</p>
                        {n.proofUrl && <img src={n.proofUrl} className="w-full h-20 object-cover rounded-lg" alt="preuve" />}
                        {n.status === 'PENDING' ? (
                          <div className="flex space-x-1.5 pt-1">
                            {n.type === 'MATCH_CLAIM' && (
                              <button onClick={() => handleAskProof(n.id)}
                                className="flex-1 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg font-bold border border-amber-500/40 text-[10px] cursor-pointer">
                                🔍 Preuve
                              </button>
                            )}
                            <button onClick={() => handleAcceptNotif(n.id)}
                              className="flex-1 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg font-bold border border-emerald-500/40 text-[10px] cursor-pointer">
                              ✅ Accepter
                            </button>
                            <button onClick={() => handleRejectNotif(n.id)}
                              className="flex-1 py-1.5 bg-rose-500/20 text-rose-300 rounded-lg font-bold border border-rose-500/40 text-[10px] cursor-pointer">
                              ❌ Refuser
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                            {n.status === 'PROOF_REQUESTED' ? '🔍 Preuve demandée' : `Traité (${n.status})`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => { setCurrentScreen('profile'); setIsSettingsOpen(false); setModal(null); }}
            className="w-8 h-8 rounded-xl overflow-hidden border-2 cursor-pointer transition hover:scale-105"
            style={{ borderColor: user.themeColor.hex }}>
            <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
          </button>
        </div>
      </header>

      {/* TOAST */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-white/20 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" style={{ color: user.themeColor.hex }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-6 pb-28">

        {/* ═══════════════════════════════════════
            ACCUEIL
        ═══════════════════════════════════════ */}
        {currentScreen === 'home' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Profile card */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-white/10 shadow-xl"
              style={{ background: `linear-gradient(135deg, ${user.themeColor.hex}08, #0D0D14)` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img src={user.avatar} className="w-13 h-13 rounded-2xl object-cover" style={{ outline: `2px solid ${user.themeColor.hex}`, outlineOffset: 2 }} alt="user" />
                    {user.streak >= 3 && (
                      <div className="absolute -bottom-1 -right-1 text-base leading-none">🔥</div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                      <span className="font-extrabold text-sm text-white">{user.name}</span>
                      {user.role === 'SUPERADMIN' && <span className="text-[9px] font-black bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-1.5 py-0.5 rounded">ADMIN</span>}
                    </div>
                    <p className="text-[10px] font-mono font-bold mt-0.5" style={{ color: user.themeColor.hex }}>{user.tag}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <EloTierBadge elo={user.elo} />
                      <span className="text-[10px] text-slate-400 font-mono">{user.elo} pts</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Winrate</p>
                  <p className="text-xl font-black font-mono text-emerald-400">{((user.wins / (user.wins + user.losses || 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-slate-500 font-mono">{user.wins}V · {user.losses}D</p>
                  {user.streak >= 2 && (
                    <p className="text-[10px] font-black streak-shimmer mt-0.5">{user.streak} STREAK 🔥</p>
                  )}
                </div>
              </div>
            </div>

            {/* Nemesis banner */}
            {nemesis && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/60 to-transparent border border-rose-500/30 flex items-center space-x-3">
                <span className="text-2xl">💀</span>
                <div>
                  <p className="text-xs font-black text-rose-400 uppercase tracking-wider">Ton Némésis</p>
                  <p className="text-sm font-bold text-white">{nemesis.name} <span className="text-[10px] text-rose-300 font-mono">— {nemesis.count} victoires sur toi</span></p>
                </div>
              </div>
            )}

            {/* Badges quick view */}
            <button onClick={() => setShowBadges(true)} className="w-full p-3 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between hover:border-amber-500/40 transition cursor-pointer">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">{earnedBadges.length} / 30 Badges débloqués</span>
              </div>
              <div className="flex space-x-1">
                {earnedBadges.slice(0, 5).map(b => <span key={b.id} className="text-base">{b.icon}</span>)}
                {earnedBadges.length > 5 && <span className="text-[10px] text-slate-400 font-mono self-end">+{earnedBadges.length - 5}</span>}
                {earnedBadges.length === 0 && <span className="text-[10px] text-slate-500 font-mono">Joue pour débloquer !</span>}
              </div>
            </button>

            {/* Rivalry card */}
            {profilesDB.length > 0 && selectedRival ? (
            <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#07070A] p-5 shadow-2xl space-y-5 overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Rivalité Actuelle</span>
                <select value={selectedRival?.id || profilesDB[0].id}
                  onChange={e => { const r = profilesDB.find(i => i.id === e.target.value); if (r) setSelectedRival(r); }}
                  className="bg-slate-900 border border-white/10 text-xs font-bold text-white px-2 py-1 rounded-xl focus:outline-none cursor-pointer">
                  {profilesDB.map(r => <option key={r.id} value={r.id}>vs {r.name}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col items-center space-y-1">
                  <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover ring-2" style={{ borderColor: user.themeColor.hex }} alt="you" />
                  <span className="text-xs font-black text-white">{user.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">🔥 {user.streak} STREAK</span>
                </div>
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="text-xl font-black italic bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">VS</div>
                  <div className="text-3xl font-black font-mono text-white">
                    <span style={{ color: user.themeColor.hex }}>{rivalMatches.filter(m => m.winner === user.name).length}</span>
                    {' - '}
                    <span className="text-fuchsia-500">{rivalMatches.filter(m => m.winner !== user.name).length}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase">{rivalMatches.length} matchs joués</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <img src={selectedRival?.avatar || profilesDB[0].avatar} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-fuchsia-500" alt="rival" />
                  <span className="text-xs font-black text-white">{selectedRival?.name || 'Ami'}</span>
                  {nemesis?.name === selectedRival?.name && <span className="text-[9px] font-black text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/40">💀 NÉMÉSIS</span>}
                </div>
              </div>

              {/* Category stars per rival */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                {CATEGORIES.map(cat => {
                  const catMs = rivalMatches.filter(m => m.catId === cat.id);
                  const wins = catMs.filter(m => m.winner === user.name).length;
                  const rate = catMs.length > 0 ? Math.round((wins / catMs.length) * 100) : 0;
                  return (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <span className="text-sm">{cat.icon}</span>
                      <div className="flex-1">
                        <p className="text-[9px] text-slate-500 font-bold">{cat.name.split(' ')[0]}</p>
                        <StarRating rate={rate} />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">{wins}/{catMs.length}</span>
                    </div>
                  );
                })}
              </div>

              {/* View rivalry history */}
              <button onClick={() => setViewingRivalDetail(true)}
                className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer flex items-center justify-center space-x-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Voir l'historique complet vs {selectedRival.name}</span>
              </button>

              <button onClick={() => { setMatchForm(f => ({ ...f, opponentId: selectedRival.id })); setModal('declare'); }}
                style={{ backgroundColor: user.themeColor.hex }}
                className="w-full py-3.5 px-4 rounded-2xl text-black font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer hover:opacity-95 active:scale-95">
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>Enregistrer un Match Direct</span>
              </button>
            </div>
            ) : (
              <div className="p-5 rounded-3xl border border-dashed border-white/15 bg-slate-900/50 text-center space-y-2">
                <p className="text-xs font-bold text-white">Compte neuf — pas encore de rivalité</p>
                <p className="text-[11px] text-slate-500">Ajoute des amis depuis Profil, ou connecte-toi en démo pour explorer l&apos;UI remplie.</p>
              </div>
            )}

            {/* Recent matches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5" style={{ color: user.themeColor.hex }} />
                  <span>Derniers Combats</span>
                </h3>
                <button onClick={() => setModal('history')} className="text-xs font-bold text-cyan-400 hover:underline">Voir tout (+)</button>
              </div>
              <div className="space-y-2">
                {allMatches.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-white/10 rounded-2xl">
                    Aucun match encore — appuie sur + pour en déclarer un.
                  </p>
                )}
                {allMatches.slice(0, 4).map(m => (
                  <button key={m.id} onClick={() => setViewingMatch(m)}
                    className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-1.5 text-left hover:border-white/20 transition cursor-pointer">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold text-cyan-400">{m.category}</span>
                      <span className="text-slate-500">{m.date}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className={m.winner === user.name ? 'text-emerald-400 font-black' : 'text-slate-300'}>{m.p1} vs {m.p2}</span>
                      <div className="flex items-center space-x-1.5">
                        {m.proofUrl && <Image className="w-3 h-3 text-slate-500" />}
                        <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-white">{m.score}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            LIGUE
        ═══════════════════════════════════════ */}
        {currentScreen === 'leagues' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setModal('join_league')} className="flex-1 py-2.5 bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-xs font-bold text-white rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer">
                <Key className="w-3.5 h-3.5 text-cyan-400" /><span>Rejoindre</span>
              </button>
              <button onClick={() => setModal('create_league')} className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5 stroke-[3]" /><span>Créer une Ligue</span>
              </button>
            </div>

            {leagues.length > 0 && (
              <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                {leagues.map((l, idx) => (
                  <button key={l.id} onClick={() => setSelectedLeagueIndex(idx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition border ${selectedLeagueIndex === idx ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-white/10 text-slate-400'}`}>
                    {l.name}
                  </button>
                ))}
              </div>
            )}

            {activeLeague && (
              <div className="space-y-4">
                <div className="p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <button onClick={() => copyToClipboard(activeLeague.id, 'ID de ligue')}
                        className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 cursor-pointer hover:bg-cyan-900 transition flex items-center space-x-1">
                        <span>{activeLeague.id}</span><span>📋</span>
                      </button>
                      <h2 className="text-xl font-black text-white mt-1">{activeLeague.name}</h2>
                      <p className="text-xs text-slate-400 font-mono">{activeLeague.season} · Créateur : {activeLeague.creator}</p>
                      {activeLeague.invitedPlayers.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-1">👥 {activeLeague.invitedPlayers.join(', ')}</p>
                      )}
                    </div>
                    <button onClick={() => { setLeagueMatchForm(f => ({ ...f, leagueId: activeLeague.id, p1: user.name, p2: profilesDB[0]?.name || '' })); setModal('add_league_match'); }}
                      className="px-3 py-1.5 bg-cyan-500 text-black font-extrabold text-xs rounded-xl cursor-pointer shadow">
                      + Match
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Classement</span>
                    <div className="grid grid-cols-12 text-[9px] font-black uppercase text-slate-500 tracking-wider px-2">
                      <span className="col-span-1">#</span>
                      <span className="col-span-5">Joueur</span>
                      <span className="col-span-3 text-center">J/V-N-D</span>
                      <span className="col-span-3 text-right">PTS</span>
                    </div>
                    {activeLeague.standings.map(st => (
                      <div key={st.rank} className={`grid grid-cols-12 items-center p-2.5 rounded-2xl border text-xs ${st.name.includes(user.name) ? 'bg-cyan-500/10 border-cyan-500/50 text-white font-bold' : 'bg-slate-950 border-white/5 text-slate-300'}`}>
                        <span className="col-span-1 font-mono font-black">{st.rank}.</span>
                        <div className="col-span-5 flex items-center space-x-2 truncate">
                          <img src={st.avatar} className="w-6 h-6 rounded-lg object-cover" alt={st.name} />
                          <span className="truncate">{st.name}</span>
                        </div>
                        <div className="col-span-3 text-center font-mono text-[10px] text-slate-400">{st.played}m ({st.w}-{st.d}-{st.l})</div>
                        <span className="col-span-3 text-right font-mono font-black text-cyan-400">{st.pts}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">👑 Top Joueur</span>
                      <p className="text-xs font-bold text-emerald-400">{activeLeague.topScorer}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950 border border-white/5 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">🛡️ Meilleure Défense</span>
                      <p className="text-xs font-bold text-cyan-400">{activeLeague.bestDefense}</p>
                    </div>
                  </div>

                  {activeLeague.matchesList.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Matchs récents</span>
                      {activeLeague.matchesList.slice(0, 5).map((m: any) => (
                        <div key={m.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950 border border-white/5 text-xs">
                          <span className="text-white font-semibold">{m.p1} vs {m.p2}</span>
                          <span className="font-mono text-slate-400">{m.score1} – {m.score2}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            COUPE
        ═══════════════════════════════════════ */}
        {currentScreen === 'tournaments' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setModal('join_tourney')} className="flex-1 py-2.5 bg-slate-900 border border-white/10 hover:border-amber-500/40 text-xs font-bold text-white rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer">
                <Key className="w-3.5 h-3.5 text-amber-400" /><span>Rejoindre</span>
              </button>
              <button onClick={() => setModal('create_tourney')} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer">
                <Plus className="w-3.5 h-3.5 stroke-[3]" /><span>Créer une Coupe</span>
              </button>
            </div>

            {tournaments.length > 0 && (
              <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                {tournaments.map((t, idx) => (
                  <button key={t.id} onClick={() => setSelectedTourneyIndex(idx)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition border ${selectedTourneyIndex === idx ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-900 border-white/10 text-slate-400'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {activeTourney && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-5 overflow-x-auto">
                <div>
                  <button onClick={() => copyToClipboard(activeTourney.id, 'ID de coupe')}
                    className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer hover:bg-amber-900 transition flex items-center space-x-1">
                    <span>ID : {activeTourney.id}</span><span>📋</span>
                  </button>
                  <h2 className="text-xl font-black text-white mt-1">{activeTourney.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {activeTourney.isMulti ? 'Multi-Disciplines' : `Discipline : ${activeTourney.game}`}
                    {' · '}Créateur : {activeTourney.creator}
                  </p>
                  {activeTourney.invitedPlayers.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">👥 {activeTourney.invitedPlayers.join(', ')}</p>
                  )}
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center space-x-2 text-amber-300 text-xs font-medium">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Clique sur un match pour entrer le score.</span>
                </div>

                {/* BRACKET */}
                <div className="relative p-4 rounded-2xl bg-[#07070A] border border-white/10 space-y-6">
                  {/* FINALE */}
                  <div className="text-center mb-2">
                    <Trophy className="w-12 h-12 text-amber-400 mx-auto filter drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]" />
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest">Finale</span>
                    <button onClick={() => setEditingCupMatch({ tourneyId: activeTourney.id, match: activeTourney.bracket.final, roundKey: 'final' })}
                      className="mt-1 w-full p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-fuchsia-950/60 border border-amber-500/60 text-sm font-black font-mono flex justify-between items-center cursor-pointer">
                      <span className="text-amber-300">{activeTourney.bracket.final.p1}</span>
                      <span className="text-white">{activeTourney.bracket.final.winner ? `${activeTourney.bracket.final.score1}:${activeTourney.bracket.final.score2}` : '⚔️'}</span>
                      <span className="text-fuchsia-300">{activeTourney.bracket.final.p2}</span>
                    </button>
                    {activeTourney.bracket.final.winner && (
                      <div className="mt-2 p-2 bg-amber-500/20 border border-amber-500/50 rounded-xl text-xs font-black text-amber-400">
                        🏆 CHAMPION : {activeTourney.bracket.final.winner}
                      </div>
                    )}
                  </div>

                  {/* SEMIS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">Demi A</span>
                      {activeTourney.bracket.leftSemis.map((s: any) => (
                        <button key={s.id} onClick={() => setEditingCupMatch({ tourneyId: activeTourney.id, match: s, roundKey: 'leftSemis' })}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-[11px] font-mono flex justify-between items-center cursor-pointer">
                          <span>{s.p1} vs {s.p2}</span>
                          <span className="text-cyan-400 font-bold">{s.score1 !== null ? `${s.score1}:${s.score2}` : '+ Jouer'}</span>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-fuchsia-400 tracking-wider text-right block">Demi B</span>
                      {activeTourney.bracket.rightSemis.map((s: any) => (
                        <button key={s.id} onClick={() => setEditingCupMatch({ tourneyId: activeTourney.id, match: s, roundKey: 'rightSemis' })}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-fuchsia-500/40 text-[11px] font-mono flex justify-between items-center cursor-pointer">
                          <span className="text-fuchsia-400 font-bold">{s.score1 !== null ? `${s.score1}:${s.score2}` : '+ Jouer'}</span>
                          <span>{s.p1} vs {s.p2}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QUARTS */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Quarts A</span>
                      {activeTourney.bracket.leftQuarts.map((q: any) => (
                        <button key={q.id} onClick={() => setEditingCupMatch({ tourneyId: activeTourney.id, match: q, roundKey: 'leftQuarts' })}
                          className="w-full p-2 rounded-lg bg-slate-950 border border-white/5 text-[10px] font-mono flex justify-between items-center cursor-pointer hover:border-cyan-500/30">
                          <span className="text-slate-300">{q.p1} vs {q.p2}</span>
                          <span className={q.winner ? 'text-emerald-400' : 'text-slate-500'}>{q.score1 !== null ? `${q.score1}:${q.score2}` : '+ Jouer'}</span>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-right block">Quarts B</span>
                      {activeTourney.bracket.rightQuarts.map((q: any) => (
                        <button key={q.id} onClick={() => setEditingCupMatch({ tourneyId: activeTourney.id, match: q, roundKey: 'rightQuarts' })}
                          className="w-full p-2 rounded-lg bg-slate-950 border border-white/5 text-[10px] font-mono flex justify-between items-center cursor-pointer hover:border-fuchsia-500/30">
                          <span className="text-slate-300">{q.p1} vs {q.p2}</span>
                          <span className={q.winner ? 'text-emerald-400' : 'text-slate-500'}>{q.score1 !== null ? `${q.score1}:${q.score2}` : '+ Jouer'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            JEUX
        ═══════════════════════════════════════ */}
        {currentScreen === 'games' && (() => {
          // Build per-game leaderboard across user + all friends
          const allPlayers = [
            { id: user.id, name: user.name, avatar: user.avatar, themeColor: user.themeColor.hex },
            ...profilesDB.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, themeColor: '#00F2FE' })),
          ];

          const gameLeaderboard = (gameName: string) =>
            allPlayers
              .map(p => ({
                ...p,
                wins: allMatches.filter(m => m.winner === p.name && m.category === gameName).length,
                played: allMatches.filter(m => (m.p1 === p.name || m.p2 === p.name) && m.category === gameName).length,
              }))
              .filter(p => p.played > 0)
              .sort((a, b) => b.wins - a.wins);

          const catKing = (catId: string) => {
            const scores = allPlayers.map(p => ({
              ...p,
              wins: allMatches.filter(m => m.winner === p.name && m.catId === catId).length,
            })).sort((a, b) => b.wins - a.wins);
            return scores[0]?.wins > 0 ? scores[0] : null;
          };

          const activeCat = categories.find(c => c.id === selectedGameCatTab)!;
          const activeStat = catStats[selectedGameCatTab];
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <div className="space-y-5 animate-in fade-in duration-300">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-white">Arène des Jeux</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Classements & meilleurs potes par discipline</p>
                </div>
                {user.role === 'SUPERADMIN' && (
                  <button onClick={() => setModal('admin_add_game')}
                    className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer flex items-center space-x-1">
                    <Plus className="w-3 h-3" /><span>Ajouter</span>
                  </button>
                )}
              </div>

              {/* Category kings banner */}
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => {
                  const king = catKing(cat.id);
                  return (
                    <button key={cat.id} onClick={() => setSelectedGameCatTab(cat.id)}
                      className={`relative p-3 rounded-2xl border text-left transition cursor-pointer overflow-hidden ${selectedGameCatTab === cat.id ? 'border-2' : 'border border-white/8 bg-slate-950'}`}
                      style={selectedGameCatTab === cat.id ? { borderColor: cat.catColor, background: `linear-gradient(135deg, ${cat.catColor}18, transparent)` } : {}}>
                      {/* Glow dot */}
                      {selectedGameCatTab === cat.id && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.catColor }} />
                      )}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="text-[10px] font-black text-white leading-tight">{cat.name.split(' & ')[0]}</p>
                          <p className="text-[9px] text-slate-500">{cat.games.length} jeux</p>
                        </div>
                      </div>
                      {king ? (
                        <div className="flex items-center space-x-1.5">
                          <img src={king.avatar} className="w-5 h-5 rounded-md object-cover" alt={king.name} />
                          <div>
                            <p className="text-[9px] font-black" style={{ color: cat.catColor }}>👑 {king.name}</p>
                            <p className="text-[8px] text-slate-500">{king.wins}V</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-600 italic">Aucun match</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active category detail */}
              <div className="space-y-3">
                {/* Category header + my stats */}
                <div className="p-4 rounded-2xl border-2 overflow-hidden relative"
                  style={{ borderColor: activeCat.catColor, background: `linear-gradient(135deg, ${activeCat.catColor}12, transparent)` }}>
                  <div className="absolute -right-4 -top-4 text-7xl opacity-10 select-none">{activeCat.icon}</div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeCat.catColor }}>{activeCat.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{activeCat.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Ton winrate</p>
                      <p className="text-2xl font-black font-mono" style={{ color: activeCat.catColor }}>{activeStat.rate}%</p>
                      <p className="text-[9px] text-slate-500 font-mono">{activeStat.wins}V – {activeStat.losses}D</p>
                    </div>
                  </div>
                </div>

                {/* Per-game cards */}
                {activeCat.games.map(g => {
                  const lb = gameLeaderboard(g.name);
                  const myEntry = lb.find(p => p.name === user.name);
                  const myRank = lb.findIndex(p => p.name === user.name);
                  const leader = lb[0];
                  const isKing = leader?.name === user.name;

                  return (
                    <div key={g.id} className="rounded-2xl bg-slate-900 border border-white/8 overflow-hidden">
                      {/* Game title row */}
                      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5"
                        style={{ background: `linear-gradient(90deg, ${activeCat.catColor}10, transparent)` }}>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{activeCat.icon}</span>
                          <span className="font-extrabold text-sm text-white">{g.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isKing && <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">👑 Roi</span>}
                          {myEntry && !isKing && myRank >= 0 && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">#{myRank + 1}</span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">{lb.reduce((s, p) => s + p.played, 0)} matchs</span>
                        </div>
                      </div>

                      {/* Leaderboard */}
                      {lb.length === 0 ? (
                        <div className="px-4 py-4 text-center">
                          <p className="text-[10px] text-slate-600 italic">Aucun match enregistré — sois le premier !</p>
                          <button onClick={() => { setMatchForm(f => ({ ...f, gameName: g.name, catId: activeCat.id })); setModal('declare'); }}
                            className="mt-2 text-[10px] font-bold px-3 py-1.5 rounded-xl border cursor-pointer transition"
                            style={{ color: activeCat.catColor, borderColor: `${activeCat.catColor}50`, backgroundColor: `${activeCat.catColor}12` }}>
                            + Enregistrer le 1er match
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {lb.slice(0, 5).map((p, i) => {
                            const isMe = p.name === user.name;
                            const rate = p.played > 0 ? Math.round((p.wins / p.played) * 100) : 0;
                            return (
                              <div key={p.id}
                                className={`px-4 py-2.5 flex items-center space-x-3 ${isMe ? 'bg-white/4' : ''}`}>
                                {/* Rank */}
                                <div className="w-6 text-center shrink-0">
                                  {i < 3
                                    ? <span className="text-base">{medals[i]}</span>
                                    : <span className="text-[11px] font-black text-slate-500">#{i + 1}</span>
                                  }
                                </div>
                                {/* Avatar */}
                                <img src={p.avatar} className="w-8 h-8 rounded-xl object-cover shrink-0 ring-1"
                                  style={{ ringColor: isMe ? activeCat.catColor : 'transparent', outline: isMe ? `1.5px solid ${activeCat.catColor}` : undefined }}
                                  alt={p.name} />
                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-300'}`}>
                                    {p.name}{isMe ? ' (Toi)' : ''}
                                  </p>
                                  {/* Win bar */}
                                  <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                                    <div className="h-full rounded-full transition-all duration-700"
                                      style={{ width: `${rate}%`, backgroundColor: i === 0 ? activeCat.catColor : '#475569' }} />
                                  </div>
                                </div>
                                {/* Stats */}
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-black" style={{ color: i === 0 ? activeCat.catColor : '' }}>
                                    {p.wins}<span className="text-[9px] text-slate-500 font-normal">V</span>
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-mono">{rate}%</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* My quick action */}
                      <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[10px] text-slate-500">
                          {myEntry
                            ? `Tes stats : ${myEntry.wins}V / ${myEntry.played - myEntry.wins}D`
                            : 'Pas encore joué'}
                        </p>
                        <button onClick={() => { setMatchForm(f => ({ ...f, gameName: g.name, catId: activeCat.id })); setModal('declare'); }}
                          className="text-[10px] font-bold px-3 py-1 rounded-lg cursor-pointer transition"
                          style={{ color: activeCat.catColor, backgroundColor: `${activeCat.catColor}15` }}>
                          + Match
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════
            STATS
        ═══════════════════════════════════════ */}
        {currentScreen === 'stats' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Stats & Analyse</h2>

            {/* ELO + W/L + Streak summary */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Résumé Global</span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><p className="text-2xl font-black text-emerald-400 font-mono">{user.wins}</p><p className="text-[9px] text-slate-500 font-bold">Victoires</p></div>
                <div><p className="text-2xl font-black text-rose-400 font-mono">{user.losses}</p><p className="text-[9px] text-slate-500 font-bold">Défaites</p></div>
                <div><p className="text-2xl font-black font-mono" style={{ color: user.themeColor.hex }}>{user.elo}</p><p className="text-[9px] text-slate-500 font-bold">ELO</p></div>
                <div><p className="text-2xl font-black text-amber-400 font-mono">{user.streak}</p><p className="text-[9px] text-slate-500 font-bold">Série</p></div>
              </div>
              {/* Win rate bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400">Winrate global</span>
                  <span className="text-emerald-400">{((user.wins / (user.wins + user.losses || 1)) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(user.wins / (user.wins + user.losses || 1)) * 100}%` }} />
                  <div className="h-full bg-rose-600 flex-1" />
                </div>
              </div>
            </div>

            {/* Insight AI-like */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-transparent border border-indigo-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Moon className="w-4 h-4" /><span>Tu gagnes plus le soir</span>
              </div>
              <p className="text-sm font-semibold text-white">Entre 20h et 00h, ton taux de victoire grimpe de <span className="text-emerald-400 font-black">+17%</span>.</p>
            </div>

            {/* Category bars */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Winrate par Catégorie</span>
              {categories.map(cat => (
                <CatBar key={cat.id} label={`${cat.icon} ${cat.name}`} value={catStats[cat.id]?.rate || 0} color={cat.catColor} />
              ))}
            </div>

            {/* Best / worst */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">🏆 Meilleure Catégorie</span>
                {(() => {
                  const best = categories.reduce((a, c) => (catStats[c.id]?.rate || 0) > (catStats[a.id]?.rate || 0) ? c : a);
                  return <><p className="text-xs font-bold text-white">{best.icon} {best.name}</p><p className="text-[10px] text-emerald-400 font-mono">{catStats[best.id]?.rate || 0}% victoires</p></>;
                })()}
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase">💀 Pire Adversaire</span>
                <div className="flex items-center space-x-2">
                  <img src={profilesDB[0].avatar} className="w-8 h-8 rounded-lg object-cover" alt="worst" />
                  <div>
                    <p className="text-xs font-bold text-white">{nemesis?.name || profilesDB[0].name}</p>
                    <p className="text-[10px] text-rose-400 font-mono">{nemesis?.count || 0} défaites</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rival win rates */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">H2H vs Amis</span>
              {profilesDB.map(f => {
                const ms = allMatches.filter(m => (m.p1 === user.name && m.p2 === f.name) || (m.p2 === user.name && m.p1 === f.name));
                const wins = ms.filter(m => m.winner === user.name).length;
                const rate = ms.length > 0 ? Math.round((wins / ms.length) * 100) : 0;
                return (
                  <div key={f.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img src={f.avatar} className="w-5 h-5 rounded object-cover" alt={f.name} />
                        <span className="text-xs font-bold text-white">{f.name}</span>
                        {nemesis?.name === f.name && <span className="text-[9px] text-rose-400">💀</span>}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{wins}V / {ms.length - wins}D</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${rate}%` }} />
                      <div className="h-full bg-rose-600 flex-1" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent form */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Forme Récente (10 derniers matchs)</span>
              <div className="flex space-x-1.5">
                {allMatches.slice(0, 10).map((m, i) => (
                  <div key={i} className={`flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${m.winner === user.name ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                    {m.winner === user.name ? 'V' : 'D'}
                  </div>
                ))}
                {allMatches.length < 10 && Array.from({ length: 10 - allMatches.length }).map((_, i) => (
                  <div key={`e${i}`} className="flex-1 h-8 rounded-lg bg-slate-800/50 border border-white/5" />
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Badges ({earnedBadges.length}/30)</span>
                <button onClick={() => setShowBadges(true)} className="text-[10px] text-cyan-400 font-bold">Voir tout →</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map(b => (
                  <div key={b.id} className="flex items-center space-x-1.5 bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-xl">
                    <span className="text-base">{b.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold text-white leading-tight">{b.name}</p>
                    </div>
                  </div>
                ))}
                {earnedBadges.length === 0 && <p className="text-xs text-slate-500">Joue des matchs pour débloquer des badges !</p>}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            PROFIL
        ═══════════════════════════════════════ */}
        {currentScreen === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover ring-2 shadow-lg" style={{ borderColor: user.themeColor.hex }} alt="profile" />
                  <div>
                    <h2 className="text-xl font-black text-white">{user.name}</h2>
                    <p className="text-xs text-slate-400 font-mono">{user.tag}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-amber-400 font-mono font-bold">{user.elo} ELO</p>
                      {user.role === 'SUPERADMIN' && <span className="text-[9px] font-black bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-1.5 py-0.5 rounded">SUPERADMIN</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer ${isSettingsOpen ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-950 border-white/10 text-slate-300'}`}>
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Déconnexion */}
            <button onClick={handleLogout} disabled={authBusy}
              className="w-full py-3 bg-slate-900 border border-rose-500/30 text-rose-400 rounded-xl font-bold text-xs uppercase flex items-center justify-center space-x-2 cursor-pointer hover:bg-rose-500/10 transition disabled:opacity-40">
              {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Se déconnecter</span>
            </button>

            {isSettingsOpen ? (
              <div className="space-y-5 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Paramètres du Compte</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-xs text-cyan-400 font-bold">Fermer ✕</button>
                </div>
                <form onSubmit={handleSaveProfile} className="p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nom de Joueur</label>
                    <Input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tag unique (@pseudo)</label>
                    <Input value={profileForm.tag} disabled className="font-mono opacity-60" />
                    <p className="text-[9px] text-slate-500">Le tag ne peut pas être changé pour l&apos;instant.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Couleur de Thème</label>
                    <div className="grid grid-cols-4 gap-2">
                      {USER_THEME_COLORS.map(c => (
                        <button key={c.id} type="button" onClick={() => setProfileForm({ ...profileForm, themeId: c.id })}
                          className={`p-2 rounded-xl border text-[9px] font-bold cursor-pointer transition ${profileForm.themeId === c.id ? 'border-white/50 scale-105' : 'border-white/10'}`}
                          style={{ backgroundColor: `${c.hex}20`, color: c.hex }}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Photo de Profil</label>
                    <button type="button" onClick={() => profileImageInputRef.current?.click()}
                      className="w-full py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-2 cursor-pointer">
                      <Upload className="w-4 h-4 text-cyan-400" /><span>Importer une image</span>
                    </button>
                    <input type="file" ref={profileImageInputRef} accept="image/*" className="hidden" onChange={handleProfileImage} />
                  </div>
                  <button type="submit" disabled={authBusy} style={{ backgroundColor: user.themeColor.hex }} className="w-full text-black font-extrabold py-3 rounded-xl text-xs uppercase cursor-pointer disabled:opacity-40">
                    Enregistrer les Paramètres
                  </button>
                </form>

                <div className="p-5 rounded-3xl bg-slate-900 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase"><MessageSquare className="w-4 h-4" /><span>Suggestion ou jeu manquant ?</span></div>
                  <a href="mailto:lounismpro@outlook.fr?subject=Suggestion%20App%20VERSUS"
                    className="inline-flex items-center space-x-2 bg-white/10 text-cyan-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-cyan-500/30">
                    <Mail className="w-3.5 h-3.5" /><span>lounismpro@outlook.fr</span>
                  </a>
                </div>

                <div className="p-5 rounded-3xl bg-rose-950/40 border border-rose-500/40 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase">
                    <Trash2 className="w-4 h-4" />
                    <span>Zone de danger</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Fermer ton compte supprime définitivement ton profil, tes sessions et tes données liées. Irréversible.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setCloseAccountForm({ password: '', confirm: '' }); setModal('close_account'); }}
                    className="w-full py-3 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-xl font-extrabold text-xs uppercase cursor-pointer hover:bg-rose-500/30 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Fermer mon compte
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Mes Amis & Palmarès H2H</h3>
                  <button onClick={() => setModal('add_friend')} className="text-xs text-cyan-400 font-bold flex items-center space-x-1 cursor-pointer">
                    <UserPlus className="w-3.5 h-3.5" /><span>Ajouter</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  {profilesDB.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8 border border-dashed border-white/10 rounded-2xl">
                      Aucun ami pour l&apos;instant — ajoute-en un, ou teste un compte démo pour voir la rivalité complète.
                    </p>
                  ) : profilesDB.map(f => (
                    <button key={f.id} onClick={() => { setSelectedRival(f); setViewingRivalDetail(true); }}
                      className="w-full p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between hover:border-white/20 transition cursor-pointer text-left">
                      <div className="flex items-center space-x-3.5">
                        <img src={f.avatar} className="w-12 h-12 rounded-2xl object-cover" alt={f.name} />
                        <div>
                          <div className="font-extrabold text-sm text-white flex items-center space-x-2">
                            <span>{f.name}</span>
                            {nemesis?.name === f.name && <span className="text-[9px] text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-500/40">💀 NÉMÉSIS</span>}
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">{f.tag}</p>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            <span className="text-emerald-400 font-bold">{f.wins}V</span> — <span className="text-rose-400 font-bold">{f.losses}D</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`text-xs font-bold ${f.statusColor}`}>{f.status}</span>
                        <p className="text-xs font-mono font-bold text-amber-400">{f.streak}</p>
                        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════
          BOTTOM NAVIGATION
      ═══════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#07070A]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-3 pt-2">
        <div className="max-w-md mx-auto flex items-end">
          {/* LEFT: 3 items — mirrors the right exactly */}
          <div className="flex-1 flex items-end justify-around">
            {[
              { id: 'home',    label: 'Accueil', icon: Swords },
              { id: 'leagues', label: 'Ligue',   icon: ShieldCheck },
              { id: 'games',   label: 'Jeux',    icon: Gamepad2 },
            ].map(item => {
              const Icon = item.icon;
              const active = currentScreen === item.id;
              return (
                <button key={item.id} onClick={() => { setCurrentScreen(item.id); setIsSettingsOpen(false); setModal(null); }}
                  className={`flex flex-col items-center space-y-1 transition cursor-pointer px-2 py-1 ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Icon className="w-5 h-5" style={{ color: active ? user.themeColor.hex : undefined }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* CENTER: + button — truly centered */}
          <div className="flex-shrink-0 flex flex-col items-center px-2 -mt-6">
            <button onClick={() => setQuickMenuOpen(true)}
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/20 cursor-pointer transition hover:scale-105 active:scale-95 group"
              style={{ background: `linear-gradient(135deg, ${user.themeColor.hex}, #F000FF)` }}>
              <Plus className="w-7 h-7 text-black stroke-[3]" />
            </button>
          </div>

          {/* RIGHT: 3 items */}
          <div className="flex-1 flex items-end justify-around">
            {[
              { id: 'tournaments', label: 'Coupe',  icon: Trophy },
              { id: 'stats',       label: 'Stats',  icon: BarChart3 },
              { id: 'profile',     label: 'Profil', icon: User },
            ].map(item => {
              const Icon = item.icon;
              const active = currentScreen === item.id;
              return (
                <button key={item.id} onClick={() => { setCurrentScreen(item.id); setIsSettingsOpen(false); setModal(null); }}
                  className={`flex flex-col items-center space-y-1 transition cursor-pointer px-1 py-1 ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Icon className="w-5 h-5" style={{ color: active ? user.themeColor.hex : undefined }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          QUICK + MENU (TikTok style)
      ═══════════════════════════════════════ */}
      {quickMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={() => setQuickMenuOpen(false)}>
          <div className="w-full max-w-md mb-24 px-4 space-y-3 animate-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
            <p className="text-center text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Nouvelle Action</p>

            <button onClick={() => { setModal('declare'); setQuickMenuOpen(false); }}
              className="w-full p-4 rounded-2xl bg-slate-900 border border-white/15 flex items-center space-x-4 cursor-pointer hover:border-white/30 transition">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${user.themeColor.hex}30` }}>
                <Swords className="w-5 h-5" style={{ color: user.themeColor.hex }} />
              </div>
              <div className="text-left">
                <p className="font-extrabold text-white text-sm">Match Direct</p>
                <p className="text-[10px] text-slate-400 font-mono">Enregistre un duel 1v1</p>
              </div>
            </button>

            <button onClick={() => { setLeagueMatchForm(f => ({ ...f, leagueId: activeLeague?.id || '', p1: user.name })); setModal('add_league_match'); setQuickMenuOpen(false); }}
              className="w-full p-4 rounded-2xl bg-slate-900 border border-white/15 flex items-center space-x-4 cursor-pointer hover:border-cyan-500/40 transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-extrabold text-white text-sm">Match de Ligue</p>
                <p className="text-[10px] text-slate-400 font-mono">Soumettre pour approbation</p>
              </div>
            </button>

            <button onClick={() => { setCurrentScreen('tournaments'); setQuickMenuOpen(false); }}
              className="w-full p-4 rounded-2xl bg-slate-900 border border-white/15 flex items-center space-x-4 cursor-pointer hover:border-amber-500/40 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="font-extrabold text-white text-sm">Aller aux Coupes</p>
                <p className="text-[10px] text-slate-400 font-mono">Créer ou rejoindre une coupe</p>
              </div>
            </button>

            <button onClick={() => setQuickMenuOpen(false)}
              className="w-full py-3 rounded-2xl bg-slate-950 border border-white/10 text-slate-400 text-xs font-bold cursor-pointer">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          MATCH DETAIL MODAL
      ═══════════════════════════════════════ */}
      {viewingMatch && (
        <Modal onClose={() => setViewingMatch(null)} borderColor="border-white/15">
          <ModalHeader title="Détails du Match" onClose={() => setViewingMatch(null)} />
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400">{viewingMatch.category}</span>
                <span className="text-[10px] text-slate-500 font-mono">{viewingMatch.date}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-black">
                <span className={viewingMatch.winner === viewingMatch.p1 ? 'text-emerald-400' : 'text-slate-400'}>{viewingMatch.p1}</span>
                <span className="text-white font-mono">{viewingMatch.score}</span>
                <span className={viewingMatch.winner === viewingMatch.p2 ? 'text-emerald-400' : 'text-slate-400'}>{viewingMatch.p2}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] font-black text-slate-500 uppercase">Vainqueur :</span>
                <span className="text-xs font-bold text-emerald-400">🏆 {viewingMatch.winner}</span>
              </div>
              {viewingMatch.leagueId && <span className="text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">Ligue : {viewingMatch.leagueId}</span>}
              {viewingMatch.cupId && <span className="text-[9px] font-mono bg-amber-950 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">Coupe : {viewingMatch.cupId}</span>}
            </div>
            {viewingMatch.proofUrl ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Preuve du match</p>
                <img src={viewingMatch.proofUrl} className="w-full rounded-2xl object-cover" style={{ maxHeight: 240 }} alt="preuve" />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 flex items-center space-x-3 text-slate-500">
                <Camera className="w-5 h-5" />
                <span className="text-xs">Aucune preuve attachée à ce match.</span>
              </div>
            )}
            {(() => {
              const cat = CATEGORIES.find(c => c.id === viewingMatch.catId);
              if (!cat) return null;
              return (
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950 border border-white/5">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{cat.name}</p>
                    <p className="text-[10px] text-slate-400">{cat.desc}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          RIVALRY DETAIL MODAL
      ═══════════════════════════════════════ */}
      {viewingRivalDetail && (
        <Modal onClose={() => setViewingRivalDetail(false)} borderColor="border-fuchsia-500/30">
          <ModalHeader title={`Rivalry vs ${selectedRival.name}`} onClose={() => setViewingRivalDetail(false)} color="text-fuchsia-400" />
          <div className="space-y-4">
            {/* H2H summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex justify-around text-center">
              <div>
                <p className="text-2xl font-black text-emerald-400">{rivalMatches.filter(m => m.winner === user.name).length}</p>
                <p className="text-[10px] text-slate-500">Tes victoires</p>
              </div>
              <div>
                <p className="text-2xl font-black font-mono text-white">VS</p>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400">{rivalMatches.filter(m => m.winner !== user.name).length}</p>
                <p className="text-[10px] text-slate-500">Ses victoires</p>
              </div>
            </div>

            {/* Stars per category */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Par catégorie (tes ⭐ vs {selectedRival.name})</p>
              {CATEGORIES.map(cat => {
                const ms = rivalMatches.filter(m => m.catId === cat.id);
                const wins = ms.filter(m => m.winner === user.name).length;
                const rate = ms.length > 0 ? Math.round((wins / ms.length) * 100) : 0;
                return (
                  <div key={cat.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-xs font-bold text-white">{cat.name.split('&')[0].trim()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 font-mono">{wins}/{ms.length}</span>
                      <StarRating rate={rate} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Match history */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historique des matchs</p>
              {rivalMatches.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Aucun match joué contre {selectedRival.name}</p>
              ) : (
                rivalMatches.map(m => (
                  <button key={m.id} onClick={() => setViewingMatch(m)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs hover:border-white/20 transition cursor-pointer">
                    <div className="text-left">
                      <p className="font-bold text-cyan-400">{m.category}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{m.date}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {m.proofUrl && <Image className="w-3 h-3 text-slate-500" />}
                      <span className={`font-black ${m.winner === user.name ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.winner === user.name ? 'VICTOIRE' : 'DÉFAITE'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          BADGES MODAL
      ═══════════════════════════════════════ */}
      {showBadges && (
        <Modal onClose={() => setShowBadges(false)} borderColor="border-amber-500/30">
          <ModalHeader title={`Badges — ${earnedBadges.length}/30`} onClose={() => setShowBadges(false)} color="text-amber-400" />
          <div className="grid grid-cols-2 gap-2">
            {BADGES_CATALOG.map(b => {
              const earned = earnedBadges.some(e => e.id === b.id);
              return (
                <div key={b.id} className={`p-3 rounded-2xl border space-y-1 ${earned ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-950 border-white/5 opacity-50'}`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <p className="text-[10px] font-black text-white leading-tight">{b.name}</p>
                      {earned && <span className="text-[8px] font-bold text-amber-400 uppercase">Débloqué</span>}
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          CUP MATCH SCORE
      ═══════════════════════════════════════ */}
      {editingCupMatch && (
        <Modal onClose={() => setEditingCupMatch(null)} borderColor="border-amber-500/50">
          <ModalHeader title="Résultat Match de Coupe" onClose={() => setEditingCupMatch(null)} color="text-amber-400" />
          <form onSubmit={handleSaveCupMatch} className="space-y-4">
            <div className="text-center font-mono font-bold text-sm text-white p-3 bg-slate-950 rounded-xl">
              {editingCupMatch.match.p1} <span className="text-amber-400">vs</span> {editingCupMatch.match.p2}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min="0" placeholder={`Score ${editingCupMatch.match.p1}`} required value={cupScoreForm.score1}
                onChange={e => setCupScoreForm({ ...cupScoreForm, score1: e.target.value })}
                className="text-center text-lg font-black font-mono border-cyan-500/40" />
              <Input type="number" min="0" placeholder={`Score ${editingCupMatch.match.p2}`} required value={cupScoreForm.score2}
                onChange={e => setCupScoreForm({ ...cupScoreForm, score2: e.target.value })}
                className="text-center text-lg font-black font-mono border-fuchsia-500/40" />
            </div>
            <button type="submit" className="w-full bg-amber-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:bg-amber-400 transition">
              Valider et Qualifier le Vainqueur
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          DECLARE MATCH MODAL
      ═══════════════════════════════════════ */}
      {modal === 'declare' && (
        <Modal onClose={() => setModal(null)}>
          <ModalHeader title="Nouveau Duel Direct" onClose={() => setModal(null)} />
          <form onSubmit={handleDeclareMatch} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Adversaire</label>
              <Select value={matchForm.opponentId} onChange={e => setMatchForm({ ...matchForm, opponentId: e.target.value })}>
                {profilesDB.map(r => <option key={r.id} value={r.id}>{r.name} ({r.tag})</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Catégorie</label>
              <Select value={matchForm.catId} onChange={e => {
                const cat = categories.find(c => c.id === e.target.value);
                const firstGame = cat?.games[0]?.name || '';
                setMatchForm({ ...matchForm, catId: e.target.value, gameName: firstGame });
              }}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Jeu / Discipline</label>
              <Select value={matchForm.gameName} onChange={e => setMatchForm({ ...matchForm, gameName: e.target.value })}>
                {categories.find(c => c.id === matchForm.catId)?.games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMatchForm({ ...matchForm, result: 'WIN' })}
                className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${matchForm.result === 'WIN' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                🏆 VICTOIRE
              </button>
              <button type="button" onClick={() => setMatchForm({ ...matchForm, result: 'LOSS' })}
                className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${matchForm.result === 'LOSS' ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                💀 DÉFAITE
              </button>
            </div>
            <Input placeholder="Score (ex: 3-1, Mat par la Tour...)" value={matchForm.scoreNote}
              onChange={e => setMatchForm({ ...matchForm, scoreNote: e.target.value })} />

            {/* Attach to league/cup */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Attacher à</label>
              <div className="flex space-x-2">
                {(['free', 'league', 'cup'] as const).map(opt => (
                  <button key={opt} type="button" onClick={() => setMatchForm({ ...matchForm, attachTo: opt })}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border cursor-pointer transition ${matchForm.attachTo === opt ? 'bg-slate-700 border-white/40 text-white' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                    {opt === 'free' ? '🆓 Libre' : opt === 'league' ? '🛡 Ligue' : '🏆 Coupe'}
                  </button>
                ))}
              </div>
              {matchForm.attachTo === 'league' && (
                <Select value={matchForm.leagueId} onChange={e => setMatchForm({ ...matchForm, leagueId: e.target.value })}>
                  <option value="">-- Choisir une ligue --</option>
                  {leagues.map(l => <option key={l.id} value={l.id}>{l.name} ({l.id})</option>)}
                </Select>
              )}
              {matchForm.attachTo === 'cup' && (
                <Select value={matchForm.cupId} onChange={e => setMatchForm({ ...matchForm, cupId: e.target.value })}>
                  <option value="">-- Choisir une coupe --</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
                </Select>
              )}
            </div>

            {/* Proof image */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Preuve (photo/capture)</label>
              <button type="button" onClick={() => proofImageRef.current?.click()}
                className="w-full py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center space-x-2 cursor-pointer hover:border-white/30">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{matchForm.proofImage ? '✅ Photo chargée' : 'Joindre une preuve'}</span>
              </button>
              <input type="file" ref={proofImageRef} accept="image/*" className="hidden"
                onChange={e => { handleProofImage(e, v => setMatchForm(f => ({ ...f, proofImage: v }))); showToast('📸 Preuve attachée !'); }} />
              {matchForm.proofImage && <img src={matchForm.proofImage} className="w-full h-24 object-cover rounded-xl" alt="preuve" />}
            </div>

            <button type="submit" style={{ backgroundColor: user.themeColor.hex }}
              className="w-full text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:opacity-90 transition">
              Enregistrer le Match
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          ADD LEAGUE MATCH
      ═══════════════════════════════════════ */}
      {modal === 'add_league_match' && (
        <Modal onClose={() => setModal(null)} borderColor="border-cyan-500/30">
          <ModalHeader title="Soumettre un Match de Ligue" onClose={() => setModal(null)} color="text-cyan-400" />
          <form onSubmit={handleAddLeagueMatch} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Ligue concernée</label>
              <Select value={leagueMatchForm.leagueId} onChange={e => setLeagueMatchForm({ ...leagueMatchForm, leagueId: e.target.value })}>
                <option value="">-- Choisir une ligue --</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name} ({l.id})</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Catégorie</label>
              <Select value={leagueMatchForm.catId} onChange={e => {
                const cat = categories.find(c => c.id === e.target.value);
                setLeagueMatchForm({ ...leagueMatchForm, catId: e.target.value, game: cat?.games[0]?.name || '' });
              }}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Jeu</label>
              <Select value={leagueMatchForm.game} onChange={e => setLeagueMatchForm({ ...leagueMatchForm, game: e.target.value })}>
                {categories.find(c => c.id === leagueMatchForm.catId)?.games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Joueur 1</label>
                <Select value={leagueMatchForm.p1} onChange={e => setLeagueMatchForm({ ...leagueMatchForm, p1: e.target.value })}>
                  <option value={user.name}>{user.name} (Toi)</option>
                  {profilesDB.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Joueur 2</label>
                <Select value={leagueMatchForm.p2} onChange={e => setLeagueMatchForm({ ...leagueMatchForm, p2: e.target.value })}>
                  {profilesDB.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value={user.name}>{user.name} (Toi)</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Score J1" value={leagueMatchForm.score1}
                onChange={e => setLeagueMatchForm({ ...leagueMatchForm, score1: parseInt(e.target.value) || 0 })} className="font-mono text-center" />
              <Input type="number" placeholder="Score J2" value={leagueMatchForm.score2}
                onChange={e => setLeagueMatchForm({ ...leagueMatchForm, score2: parseInt(e.target.value) || 0 })} className="font-mono text-center" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Preuve</label>
              <button type="button" onClick={() => leagueProofRef.current?.click()}
                className="w-full py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center space-x-2 cursor-pointer hover:border-white/30">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{leagueMatchForm.proofImage ? '✅ Photo jointe' : 'Joindre une preuve (optionnel)'}</span>
              </button>
              <input type="file" ref={leagueProofRef} accept="image/*" className="hidden"
                onChange={e => handleProofImage(e, v => setLeagueMatchForm(f => ({ ...f, proofImage: v })))} />
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-medium">
              ℹ️ Ce match sera soumis à approbation par l'adversaire via les notifications.
            </div>
            <button type="submit" className="w-full bg-cyan-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:bg-cyan-400 transition">
              Soumettre pour Approbation
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          CREATE LEAGUE
      ═══════════════════════════════════════ */}
      {modal === 'create_league' && (
        <Modal onClose={() => setModal(null)} borderColor="border-cyan-500/30">
          <ModalHeader title="Créer une Ligue" onClose={() => setModal(null)} color="text-cyan-400" />
          <form onSubmit={handleCreateLeague} className="space-y-3">
            <Input placeholder="Nom de la ligue" value={leagueCreateForm.name}
              onChange={e => setLeagueCreateForm({ ...leagueCreateForm, name: e.target.value })} required />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Discipline</label>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setLeagueCreateForm({ ...leagueCreateForm, discipline: 'multi', games: [] })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${leagueCreateForm.discipline === 'multi' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                  🌐 Multi-Disciplines
                </button>
                <button type="button" onClick={() => setLeagueCreateForm({ ...leagueCreateForm, discipline: 'single' })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${leagueCreateForm.discipline === 'single' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                  🎯 Un jeu
                </button>
              </div>
              {leagueCreateForm.discipline === 'single' && (
                <Select value={leagueCreateForm.games[0] || ''} onChange={e => setLeagueCreateForm({ ...leagueCreateForm, games: [e.target.value] })}>
                  <option value="">-- Choisir un jeu --</option>
                  {categories.map(cat => <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>{cat.games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</optgroup>)}
                </Select>
              )}
            </div>

            <Input type="password" placeholder="Mot de passe (optionnel)" value={leagueCreateForm.passcode}
              onChange={e => setLeagueCreateForm({ ...leagueCreateForm, passcode: e.target.value })} />

            {/* Invite by @ */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Inviter des joueurs par @</label>
              <div className="flex space-x-2">
                <Input placeholder="@pseudo ou nom" value={leagueCreateForm.inviteTag}
                  onChange={e => setLeagueCreateForm({ ...leagueCreateForm, inviteTag: e.target.value })}
                  className="flex-1" />
                <button type="button" onClick={() => {
                  const tag = leagueCreateForm.inviteTag.trim();
                  if (!tag) return;
                  const found = profilesDB.find(p => p.tag.toLowerCase() === tag.toLowerCase() || p.name.toLowerCase() === tag.toLowerCase());
                  const display = found ? found.name : tag;
                  if (!leagueCreateForm.invitedTags.includes(display)) {
                    setLeagueCreateForm({ ...leagueCreateForm, invitedTags: [...leagueCreateForm.invitedTags, display], inviteTag: '' });
                    showToast(`✅ ${display} invité(e) !`);
                  }
                }} className="px-3 py-2 bg-cyan-500 text-black font-extrabold text-xs rounded-xl cursor-pointer">+</button>
              </div>
              {leagueCreateForm.invitedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {leagueCreateForm.invitedTags.map(tag => (
                    <span key={tag} className="flex items-center space-x-1 bg-slate-950 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded-xl">
                      <span>👤 {tag}</span>
                      <button type="button" onClick={() => setLeagueCreateForm(f => ({ ...f, invitedTags: f.invitedTags.filter(t => t !== tag) }))} className="text-slate-500 hover:text-rose-400 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="w-full bg-cyan-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:bg-cyan-400 transition">
              Créer la Ligue
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          JOIN LEAGUE
      ═══════════════════════════════════════ */}
      {modal === 'join_league' && (
        <Modal onClose={() => setModal(null)} borderColor="border-cyan-500/30">
          <ModalHeader title="Rejoindre une Ligue" onClose={() => setModal(null)} color="text-cyan-400" />
          <form onSubmit={handleJoinLeague} className="space-y-3">
            <Input placeholder="ID de la ligue (ex: LIGUE-8842)" value={leagueJoinForm.id}
              onChange={e => setLeagueJoinForm({ ...leagueJoinForm, id: e.target.value })} required className="font-mono uppercase" />
            <button type="submit" className="w-full bg-cyan-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer">Rejoindre</button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          CREATE TOURNEY
      ═══════════════════════════════════════ */}
      {modal === 'create_tourney' && (
        <Modal onClose={() => setModal(null)} borderColor="border-amber-500/30">
          <ModalHeader title="Créer une Coupe" onClose={() => setModal(null)} color="text-amber-400" />
          <form onSubmit={handleCreateTourney} className="space-y-3">
            <Input placeholder="Nom de la coupe" value={tourneyCreateForm.name}
              onChange={e => setTourneyCreateForm({ ...tourneyCreateForm, name: e.target.value })} required />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Discipline</label>
              <div className="flex space-x-2">
                <button type="button" onClick={() => setTourneyCreateForm({ ...tourneyCreateForm, isMulti: false })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${!tourneyCreateForm.isMulti ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                  🎯 Un jeu
                </button>
                <button type="button" onClick={() => setTourneyCreateForm({ ...tourneyCreateForm, isMulti: true })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${tourneyCreateForm.isMulti ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-white/10 text-slate-400'}`}>
                  🌐 Multi-Disciplines
                </button>
              </div>
              {!tourneyCreateForm.isMulti && (
                <Select value={tourneyCreateForm.gameId} onChange={e => setTourneyCreateForm({ ...tourneyCreateForm, gameId: e.target.value })}>
                  {categories.map(cat => <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>{cat.games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</optgroup>)}
                </Select>
              )}
            </div>

            <Input type="password" placeholder="Mot de passe (optionnel)" value={tourneyCreateForm.passcode}
              onChange={e => setTourneyCreateForm({ ...tourneyCreateForm, passcode: e.target.value })} />

            {/* Invite by @ */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Inviter des joueurs par @</label>
              <div className="flex space-x-2">
                <Input placeholder="@pseudo ou nom" value={tourneyCreateForm.inviteTag}
                  onChange={e => setTourneyCreateForm({ ...tourneyCreateForm, inviteTag: e.target.value })} />
                <button type="button" onClick={() => {
                  const tag = tourneyCreateForm.inviteTag.trim();
                  if (!tag) return;
                  const found = profilesDB.find(p => p.tag.toLowerCase() === tag.toLowerCase() || p.name.toLowerCase() === tag.toLowerCase());
                  const display = found ? found.name : tag;
                  if (!tourneyCreateForm.invitedTags.includes(display)) {
                    setTourneyCreateForm({ ...tourneyCreateForm, invitedTags: [...tourneyCreateForm.invitedTags, display], inviteTag: '' });
                  }
                }} className="px-3 py-2 bg-amber-500 text-black font-extrabold text-xs rounded-xl cursor-pointer">+</button>
              </div>
              {tourneyCreateForm.invitedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tourneyCreateForm.invitedTags.map(tag => (
                    <span key={tag} className="flex items-center space-x-1 bg-slate-950 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-xl">
                      <span>👤 {tag}</span>
                      <button type="button" onClick={() => setTourneyCreateForm(f => ({ ...f, invitedTags: f.invitedTags.filter(t => t !== tag) }))} className="text-slate-500 hover:text-rose-400 cursor-pointer"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="w-full bg-amber-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:bg-amber-400 transition">
              Créer la Coupe
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          JOIN TOURNEY
      ═══════════════════════════════════════ */}
      {modal === 'join_tourney' && (
        <Modal onClose={() => setModal(null)} borderColor="border-amber-500/30">
          <ModalHeader title="Rejoindre une Coupe" onClose={() => setModal(null)} color="text-amber-400" />
          <form onSubmit={handleJoinTourney} className="space-y-3">
            <Input placeholder="ID de la coupe (ex: COUPE-9901)" value={tourneyJoinForm.id}
              onChange={e => setTourneyJoinForm({ ...tourneyJoinForm, id: e.target.value })} required className="font-mono uppercase" />
            <button type="submit" className="w-full bg-amber-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer">Rejoindre</button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          ADMIN ADD GAME
      ═══════════════════════════════════════ */}
      {modal === 'admin_add_game' && (
        <Modal onClose={() => setModal(null)} borderColor="border-fuchsia-500/40">
          <ModalHeader title="SuperAdmin — Ajouter Jeu" onClose={() => setModal(null)} color="text-fuchsia-400" />
          <form onSubmit={handleAdminAddGame} className="space-y-3">
            <Input placeholder="Nom du jeu..." value={adminGameForm.name}
              onChange={e => setAdminGameForm({ ...adminGameForm, name: e.target.value })} required />
            <Select value={adminGameForm.categoryId} onChange={e => setAdminGameForm({ ...adminGameForm, categoryId: e.target.value })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
            <button type="submit" className="w-full bg-fuchsia-500 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:bg-fuchsia-400 transition">
              Publier le Jeu
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          ADD FRIEND
      ═══════════════════════════════════════ */}
      {modal === 'add_friend' && (
        <Modal onClose={() => setModal(null)} borderColor="border-cyan-500/30">
          <ModalHeader title="Rechercher un Ami" onClose={() => setModal(null)} />
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input placeholder="Nom ou @pseudo" value={friendSearchQuery}
                onChange={e => setFriendSearchQuery(e.target.value)} className="pl-8" />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {profilesDB.filter(p => p.name.toLowerCase().includes(friendSearchQuery.toLowerCase()) || p.tag.toLowerCase().includes(friendSearchQuery.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <img src={p.avatar} className="w-8 h-8 rounded-lg object-cover" alt={p.name} />
                      <div>
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.tag}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">Déjà ami</span>
                  </div>
                ))}
              {profilesDB.filter(p => p.name.toLowerCase().includes(friendSearchQuery.toLowerCase()) || p.tag.toLowerCase().includes(friendSearchQuery.toLowerCase())).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Aucun résultat pour "{friendSearchQuery}"</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          FULL HISTORY
      ═══════════════════════════════════════ */}
      {modal === 'history' && (() => {
        const filtered = allMatches.filter(m => {
          if (historyFilter.result === 'win' && m.winner !== user.name) return false;
          if (historyFilter.result === 'loss' && m.winner === user.name) return false;
          if (historyFilter.catId !== 'all' && m.catId !== historyFilter.catId) return false;
          return true;
        });
        return (
          <Modal onClose={() => setModal(null)}>
            <ModalHeader title="Historique Intégral" onClose={() => setModal(null)} />
            {/* Filters */}
            <div className="flex space-x-2">
              <div className="flex space-x-1 flex-1 bg-slate-950 rounded-xl p-1">
                {[{ v: 'all', l: 'Tous' }, { v: 'win', l: '✅ Victoires' }, { v: 'loss', l: '❌ Défaites' }].map(f => (
                  <button key={f.v} onClick={() => setHistoryFilter(h => ({ ...h, result: f.v }))}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-black cursor-pointer transition ${historyFilter.result === f.v ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex space-x-1 overflow-x-auto no-scrollbar pb-1">
              <button onClick={() => setHistoryFilter(h => ({ ...h, catId: 'all' }))}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition border ${historyFilter.catId === 'all' ? 'bg-white/10 text-white border-white/20' : 'text-slate-500 border-white/5'}`}>
                Tout
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setHistoryFilter(h => ({ ...h, catId: c.id }))}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition border ${historyFilter.catId === c.id ? 'text-white border-white/20' : 'text-slate-500 border-white/5'}`}
                  style={historyFilter.catId === c.id ? { backgroundColor: `${c.catColor}20`, borderColor: `${c.catColor}50`, color: c.catColor } : {}}>
                  {c.icon} {c.name.split(' & ')[0]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-mono">{filtered.length} match{filtered.length !== 1 ? 's' : ''}</p>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar">
              {filtered.length === 0 && (
                <p className="text-center text-xs text-slate-600 py-6">Aucun match pour ce filtre.</p>
              )}
              {filtered.map(m => {
                const isWin = m.winner === user.name;
                const opp = m.p1 === user.name ? m.p2 : m.p1;
                const cat = categories.find(c => c.id === m.catId);
                return (
                  <button key={m.id} onClick={() => setViewingMatch(m)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between text-xs hover:border-white/20 transition cursor-pointer group">
                    <div className="flex items-center space-x-2.5 text-left">
                      <div className={`w-1.5 h-10 rounded-full shrink-0 ${isWin ? 'bg-emerald-500' : 'bg-rose-600'}`} />
                      <div>
                        <p className="font-bold text-[10px]" style={{ color: cat?.catColor || '#00F2FE' }}>{m.category} {cat?.icon}</p>
                        <p className="text-white font-semibold mt-0.5">vs {opp}</p>
                        <p className="text-[9px] text-slate-600 mt-0.5">{m.date}{m.leagueId ? ` · Ligue` : ''}{m.cupId ? ` · Coupe` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {m.proofUrl && <Image className="w-3 h-3 text-slate-500" />}
                      <div className={`px-2 py-1 rounded-lg font-black text-[11px] ${isWin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {isWin ? 'V' : 'D'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Modal>
        );
      })()}

      {/* ═══════════════════════════════════════
          ASK PROOF MODAL
      ═══════════════════════════════════════ */}
      {modal === 'ask_proof' && (
        <Modal onClose={() => setModal(null)} borderColor="border-amber-500/30">
          <ModalHeader title="Demander une Preuve" onClose={() => setModal(null)} color="text-amber-400" />
          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Tu vas envoyer une demande de preuve à l'adversaire. Explique ce que tu attends comme justificatif.
            </p>
            <textarea
              value={proofRequestMessage}
              onChange={e => setProofRequestMessage(e.target.value)}
              placeholder="Ex: Envoie une capture d'écran ou photo du score..."
              rows={3}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500/40 resize-none"
            />
            <button onClick={handleSendProofRequest}
              className="w-full bg-amber-500 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase cursor-pointer hover:bg-amber-400 transition flex items-center justify-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Envoyer la Demande de Preuve</span>
            </button>
          </div>
        </Modal>
      )}

      {modal === 'close_account' && (
        <Modal onClose={() => setModal(null)} borderColor="border-rose-500/40">
          <ModalHeader title="Fermer mon compte" onClose={() => setModal(null)} color="text-rose-400" />
          <form onSubmit={handleCloseAccount} className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Cette action est <span className="text-rose-400 font-bold">définitive</span>. Tes données seront supprimées.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mot de passe</label>
              <Input
                type="password"
                value={closeAccountForm.password}
                onChange={(e) => setCloseAccountForm((f) => ({ ...f, password: e.target.value }))}
                required
                placeholder="Ton mot de passe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Tape <span className="text-rose-400">FERMER</span> pour confirmer
              </label>
              <Input
                value={closeAccountForm.confirm}
                onChange={(e) => setCloseAccountForm((f) => ({ ...f, confirm: e.target.value }))}
                required
                placeholder="FERMER"
                className="font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-3.5 bg-rose-500 text-black font-extrabold rounded-xl text-xs uppercase cursor-pointer hover:bg-rose-400 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Fermer définitivement
            </button>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════
          WIN CELEBRATION CONFETTI
      ═══════════════════════════════════════ */}
      {celebrationWin && (
        <div className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
          {/* Flash */}
          <div className="absolute inset-0 win-flash" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(16,185,129,0.25), transparent 60%)' }} />
          {/* Confetti particles */}
          {Array.from({ length: 28 }).map((_, i) => <ConfettiParticle key={i} i={i} />)}
          {/* Win text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-in zoom-in duration-300 text-center">
              <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] tracking-tighter">VICTOIRE</p>
              <p className="text-sm font-bold text-slate-300 mt-1">+18 ELO ⚡</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          BADGE UNLOCK POPUP
      ═══════════════════════════════════════ */}
      {newBadgeUnlock && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-xs bg-[#0D0D14] border-2 border-amber-500/60 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in duration-400 text-center"
            style={{ boxShadow: '0 0 60px rgba(245,158,11,0.25)' }}>
            <div className="text-6xl animate-in zoom-in duration-500">{newBadgeUnlock.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Badge Débloqué !</p>
              <p className="text-xl font-black text-white mt-1">{newBadgeUnlock.name}</p>
              <p className="text-xs text-slate-400 mt-1">{newBadgeUnlock.desc}</p>
            </div>
            <button onClick={() => setNewBadgeUnlock(null)}
              className="w-full py-3 rounded-2xl bg-amber-500 text-black font-extrabold text-sm cursor-pointer hover:bg-amber-400 transition">
              🎉 Trop bien !
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
