import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle: string;
  actions?: ReactNode;
}

export default function PageHeader({ icon: Icon, eyebrow, title, subtitle, actions }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8 min-h-[5.75rem] flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
    >
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
          <Icon size={18} className="text-zinc-300" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-mono text-zinc-600 tracking-wider uppercase mb-1">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-50 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5 max-w-xl leading-relaxed">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0 sm:pt-1">{actions}</div>}
    </motion.div>
  );
}
