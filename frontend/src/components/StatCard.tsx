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

export default function StatCard({ icon: Icon, label, value, delta, hint }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.1] transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <Icon size={15} className="text-zinc-400" strokeWidth={1.75} />
        </div>
        {delta && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              delta.positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
            }`}
          >
            {delta.value}
          </span>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-zinc-50 tracking-tight leading-none">{value}</p>
      {hint && <p className="text-xs text-zinc-600 mt-2">{hint}</p>}
    </motion.div>
  );
}
