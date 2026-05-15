import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.015]">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/15 to-violet-500/10 border border-white/10 flex items-center justify-center mb-4">
        <Icon size={22} className="text-slate-300" />
      </div>
      <p className="font-syne font-semibold text-white text-base">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1.5 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
