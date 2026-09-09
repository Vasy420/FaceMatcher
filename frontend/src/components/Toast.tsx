import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastItem } from '../types';

const ICONS = {
  success: <CheckCircle size={15} className="text-emerald-400" />,
  error: <XCircle size={15} className="text-rose-400" />,
  warning: <AlertTriangle size={15} className="text-amber-400" />,
  info: <Info size={15} className="text-indigo-400" />,
};

const BORDER = {
  success: 'border-emerald-500/25',
  error: 'border-rose-500/25',
  warning: 'border-amber-500/25',
  info: 'border-indigo-500/25',
};

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[9999] flex flex-col gap-2 pointer-events-none items-stretch sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2.5 w-full sm:min-w-[260px] sm:w-auto max-w-sm rounded-lg border bg-zinc-900/95 backdrop-blur-md shadow-xl shadow-black/40 ${BORDER[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="text-sm text-zinc-200 flex-1">{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
