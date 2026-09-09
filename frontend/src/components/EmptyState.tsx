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
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015]">
      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <Icon size={18} className="text-zinc-400" strokeWidth={1.5} />
      </div>
      <p className="font-medium text-zinc-200 text-sm">{title}</p>
      {description && <p className="text-sm text-zinc-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
