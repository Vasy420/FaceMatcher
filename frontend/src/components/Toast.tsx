import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastItem } from '../types';

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  info: <Info size={16} className="text-blue-400" />,
};

const BORDER = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  warning: 'border-amber-500/30',
  info: 'border-blue-500/30',
};

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`glass pointer-events-auto flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-sm border ${BORDER[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="text-sm text-slate-200 font-sans flex-1">{t.message}</span>
            <button
              onClick={() => onRemove(t.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
