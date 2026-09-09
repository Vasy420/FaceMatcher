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
  default: 'bg-white/[0.04] border-white/[0.08] text-zinc-400',
  blue: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
  rose: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
};

export default function Chip({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  onClick,
  active,
  className,
}: Props) {
  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        VAR[variant],
        onClick && 'cursor-pointer hover:brightness-110 transition-all',
        active && 'ring-1 ring-white/20',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
