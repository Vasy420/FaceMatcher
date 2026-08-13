import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          style={{ background: 'rgba(2,6,16,0.62)', backdropFilter: 'blur(10px)' }}
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/10 p-5 shadow-2xl"
            style={{ background: 'linear-gradient(180deg, rgba(22,30,56,0.96), rgba(12,17,36,0.96))' }}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                danger ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' : 'bg-blue-500/10 border-blue-500/25 text-blue-300'
              }`}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h2 id="confirm-title" className="font-syne font-bold text-white text-lg">{title}</h2>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{body}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onCancel} className="btn-ghost h-10 px-4">{cancelLabel}</button>
              <button
                onClick={onConfirm}
                className={danger
                  ? 'h-10 px-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 font-syne font-semibold text-sm hover:bg-rose-500/25'
                  : 'btn-primary h-10'}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
