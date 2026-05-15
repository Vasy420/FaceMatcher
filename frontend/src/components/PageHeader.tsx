import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  accent: string;
  subtitle: string;
}

export default function PageHeader({ icon: Icon, eyebrow, title, accent, subtitle }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-white/8 p-6 md:p-7 mb-2"
      style={{
        background:
          'linear-gradient(135deg, rgba(17,28,53,0.55), rgba(10,15,30,0.35))',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-gradient-to-br from-blue-500/15 to-violet-500/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-5">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent})` }}
        >
          <Icon size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono text-blue-300/80 tracking-[0.25em] uppercase mb-1.5">
            {eyebrow}
          </p>
          <h1 className="font-syne font-bold text-2xl md:text-3xl text-white leading-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
