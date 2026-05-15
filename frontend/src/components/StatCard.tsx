import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  delta?: { value: string; positive?: boolean };
  accent?: string;
  hint?: string;
}

export default function StatCard({ icon: Icon, label, value, delta, accent = '#3B82F6', hint }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] hover:border-white/15 transition-all p-5 group"
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/10"
          style={{ background: `${accent}1A` }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        {delta && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              delta.positive ? 'text-emerald-300 bg-emerald-500/10' : 'text-rose-300 bg-rose-500/10'
            }`}
          >
            {delta.positive ? '↑' : '↓'} {delta.value}
          </span>
        )}
      </div>
      <p className="relative text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-1.5">
        {label}
      </p>
      <p className="relative font-syne font-bold text-2xl text-white leading-none">{value}</p>
      {hint && <p className="relative text-xs text-slate-500 mt-2">{hint}</p>}
    </motion.div>
  );
}
