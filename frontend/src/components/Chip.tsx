import { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  children: ReactNode;
  variant?: 'default' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

const VAR = {
  default: 'bg-white/5 border-white/10 text-slate-300',
  blue: 'bg-blue-500/10 border-blue-500/25 text-blue-300',
  emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  amber: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  violet: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
  rose: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
};

export default function Chip({ children, variant = 'default', size = 'sm', icon, onClick, active, className }: Props) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wider',
        size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
        VAR[variant],
        onClick && 'cursor-pointer hover:brightness-125 transition-all',
        active && 'ring-1 ring-white/30',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
