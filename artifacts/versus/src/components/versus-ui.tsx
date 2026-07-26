import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Star, X } from 'lucide-react';
import { CONFETTI_COLORS, getEloTier } from '../data/constants';

export function Modal({
  children,
  onClose,
  borderColor = 'border-white/15',
}: {
  children: ReactNode;
  onClose: () => void;
  borderColor?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md bg-[#0D0D14] border ${borderColor} rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  onClose,
  color = 'text-white',
}: {
  title: string;
  onClose: () => void;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3">
      <h3 className={`font-black text-sm uppercase ${color}`}>{title}</h3>
      <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-white/30 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function StarRating({ rate, max = 5 }: { rate: number; max?: number }) {
  const filled = Math.round((rate / 100) * max);
  return (
    <div className="flex space-x-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < filled ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
        />
      ))}
    </div>
  );
}

export function CatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function EloTierBadge({ elo, size = 'sm' }: { elo: number; size?: 'sm' | 'lg' }) {
  const t = getEloTier(elo);
  return (
    <span
      className={`inline-flex items-center space-x-1 font-black rounded-lg border ${
        size === 'lg' ? 'text-xs px-2.5 py-1' : 'text-[9px] px-2 py-0.5'
      }`}
      style={{
        color: t.color,
        borderColor: `${t.color}50`,
        backgroundColor: `${t.color}18`,
      }}
    >
      <span>{t.icon}</span>
      <span>{t.name}</span>
    </span>
  );
}

export function ConfettiParticle({ i }: { i: number }) {
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  const left = (i * 37 + 11) % 100;
  const delay = (i * 60) % 600;
  const size = 6 + (i % 5) * 2;
  return (
    <div
      className="confetti"
      style={{
        position: 'absolute',
        top: '-10px',
        left: `${left}%`,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: i % 3 === 0 ? '50%' : 2,
        animation: `confettiFall 1.4s ease-in ${delay}ms forwards`,
      }}
    />
  );
}
