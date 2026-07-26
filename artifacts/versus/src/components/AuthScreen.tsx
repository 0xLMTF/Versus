import { useState, type FormEvent } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Input } from '@/components/versus-ui';
import { ACCOUNTS } from '@/data/seed';
import { login, register, type ApiUser } from '@/lib/api';

type Mode = 'login' | 'register';

type Props = {
  onSuccess: (user: ApiUser) => void;
  apiOnline: boolean | null;
};

export default function AuthScreen({ onSuccess, apiOnline }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await login(tag.trim(), password);
        onSuccess(res.user);
      } else {
        if (!name.trim()) throw new Error('Nom requis');
        if (password.length < 8) throw new Error('Mot de passe : 8 caractères minimum');
        const res = await register(name.trim(), tag.trim(), password);
        onSuccess(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setBusy(false);
    }
  };

  const quickDemo = async (demoTag: string) => {
    setError('');
    setBusy(true);
    try {
      const res = await login(demoTag, 'versus123');
      onSuccess(res.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} — lance l'API (pnpm dev:api) et le seed.`
          : 'API indisponible',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070A] text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-1 font-black text-3xl italic tracking-tighter">
          <span style={{ color: '#00F2FE' }}>V</span>
          <span className="text-fuchsia-500">II</span>
          <span className="text-white ml-1 font-sans not-italic text-2xl tracking-widest font-extrabold">
            VERSUS
          </span>
        </div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </p>
        {apiOnline === false && (
          <p className="text-amber-400 text-[10px] font-bold max-w-xs mx-auto">
            API hors ligne — lance <code className="text-cyan-300">corepack pnpm dev</code> (port
            3001)
          </p>
        )}
        {apiOnline === true && (
          <p className="text-emerald-400/80 text-[10px] font-mono">API connectée</p>
        )}
      </div>

      <div className="w-full max-w-sm flex rounded-xl overflow-hidden border border-white/10">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
          }}
          className={`flex-1 py-2.5 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
            mode === 'login' ? 'bg-cyan-500 text-black' : 'bg-slate-900 text-slate-400'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" /> Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError('');
          }}
          className={`flex-1 py-2.5 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
            mode === 'register' ? 'bg-fuchsia-500 text-black' : 'bg-slate-900 text-slate-400'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Inscription
        </button>
      </div>

      {error && (
        <p className="w-full max-w-sm text-rose-400 text-xs font-bold text-center bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        {mode === 'register' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Nom</label>
            <Input
              placeholder="Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
              required
            />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Tag</label>
          <Input
            placeholder="@ton_pseudo"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="font-mono"
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Mot de passe</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={busy || apiOnline === false}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black font-extrabold rounded-xl text-xs uppercase cursor-pointer hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login' ? 'Se connecter' : "Créer mon compte"}
        </button>
      </form>

      {mode === 'login' && (
        <div className="w-full max-w-sm space-y-2 pt-2 border-t border-white/10">
          <p className="text-[10px] text-slate-500 text-center font-mono uppercase tracking-wider">
            Comptes démo (mdp: versus123)
          </p>
          <div className="space-y-2">
            {ACCOUNTS.slice(0, 3).map((acc) => (
              <button
                key={acc.id}
                type="button"
                disabled={busy || apiOnline === false}
                onClick={() => quickDemo(acc.tag)}
                className="w-full p-3 bg-slate-900 border border-white/10 hover:border-white/30 rounded-2xl flex items-center space-x-3 transition cursor-pointer disabled:opacity-40"
              >
                <img
                  src={acc.avatar}
                  className="w-10 h-10 rounded-xl object-cover"
                  alt={acc.name}
                />
                <div className="flex-1 text-left">
                  <p className="font-extrabold text-white text-xs">{acc.name}</p>
                  <p className="text-[10px] font-mono text-slate-500">{acc.tag}</p>
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-bold">{acc.elo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
