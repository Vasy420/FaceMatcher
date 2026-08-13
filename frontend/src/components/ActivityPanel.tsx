import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Camera, Film, Plus, Smile, Trash2, UserCheck, X } from 'lucide-react';
import { ActivityEvent, clearActivity, getActivity, subscribeActivity } from '../lib/activity';
import { formatRelative } from '../lib/utils';
import { useEffect, useState } from 'react';

const KIND_ICON = {
  video: Film,
  identify: UserCheck,
  emotion: Smile,
  live: Camera,
  register: Plus,
  delete: Trash2,
} as const;

const KIND_ACCENT = {
  video: '#3B82F6',
  identify: '#10B981',
  emotion: '#F59E0B',
  live: '#8B5CF6',
  register: '#06B6D4',
  delete: '#F43F5E',
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ActivityPanel({ open, onClose }: Props) {
  const [items, setItems] = useState<ActivityEvent[]>(() => getActivity());

  useEffect(() => subscribeActivity(() => setItems(getActivity())), []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(2,6,16,0.45)' }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full border-l border-white/10 flex flex-col"
            style={{ background: 'linear-gradient(180deg, rgba(18,26,50,0.97), rgba(10,15,30,0.97))' }}
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/8">
              <div>
                <p className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">Activity</p>
                <p className="text-sm font-syne font-semibold text-white">{items.length} events</p>
              </div>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <button
                    onClick={() => clearActivity()}
                    className="text-[11px] font-mono text-slate-400 hover:text-rose-300 px-2 h-8"
                  >
                    Clear
                  </button>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white flex items-center justify-center" aria-label="Close activity">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 text-slate-500">
                  <Activity size={22} className="mb-3 text-slate-400" />
                  <p className="text-sm">No detections yet</p>
                  <p className="text-xs mt-1">Run a scan or enroll a face and it will show up here.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {items.map((a) => {
                    const Icon = KIND_ICON[a.kind] ?? Activity;
                    const accent = KIND_ACCENT[a.kind] ?? '#60A5FA';
                    return (
                      <li key={a.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03]">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 shrink-0 mt-0.5"
                          style={{ background: `${accent}1A` }}
                        >
                          <Icon size={14} style={{ color: accent }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-100">{a.title}</p>
                          {a.detail && <p className="text-[11px] text-slate-500 mt-0.5">{a.detail}</p>}
                          <p className="text-[10px] font-mono text-slate-600 mt-1">{formatRelative(a.ts)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
