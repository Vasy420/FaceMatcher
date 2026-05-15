import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Film,
  Camera,
  Database,
  Smile,
  Trash2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { clearActivity } from '../lib/activity';
import clsx from 'clsx';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: typeof LayoutDashboard;
  section: string;
  run: () => void;
  kbd?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Cmd[] = useMemo(
    () => [
      { id: 'go-dash', label: 'Go to Dashboard', icon: LayoutDashboard, section: 'Navigate', run: () => nav('/'), kbd: ['G', 'D'] },
      { id: 'go-video', label: 'Go to Video Match', icon: Film, section: 'Navigate', run: () => nav('/video'), kbd: ['G', 'V'] },
      { id: 'go-live', label: 'Go to Live Camera', icon: Camera, section: 'Navigate', run: () => nav('/live'), kbd: ['G', 'L'] },
      { id: 'go-db', label: 'Go to Face Database', icon: Database, section: 'Navigate', run: () => nav('/database'), kbd: ['G', 'F'] },
      { id: 'go-emo', label: 'Go to Emotion', icon: Smile, section: 'Navigate', run: () => nav('/emotion'), kbd: ['G', 'E'] },
      {
        id: 'clear-act',
        label: 'Clear local activity history',
        hint: 'Wipes browser-stored detection log',
        icon: Trash2,
        section: 'Actions',
        run: () => clearActivity(),
      },
      {
        id: 'reload',
        label: 'Reload window',
        icon: Activity,
        section: 'Actions',
        run: () => window.location.reload(),
      },
    ],
    [nav],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(term) || c.section.toLowerCase().includes(term));
  }, [commands, q]);

  useEffect(() => {
    setIdx(0);
  }, [q, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQ('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered[idx];
        if (cmd) {
          cmd.run();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, idx, onClose]);

  const grouped = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    filtered.forEach((c) => {
      if (!map.has(c.section)) map.set(c.section, []);
      map.get(c.section)!.push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  let flatIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          style={{ background: 'rgba(2,6,16,0.55)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50"
            style={{
              background:
                'linear-gradient(180deg, rgba(20,28,52,0.95), rgba(13,18,38,0.95))',
              backdropFilter: 'blur(30px) saturate(150%)',
            }}
          >
            <div className="flex items-center gap-3 px-4 h-12 border-b border-white/8">
              <Search size={15} className="text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search commands…"
                className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-600 font-sans"
              />
              <kbd className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No commands match.</div>
              ) : (
                grouped.map(([section, cmds]) => (
                  <div key={section}>
                    <p className="px-4 pt-3 pb-2 text-[10px] font-mono text-slate-600 tracking-[0.2em] uppercase">
                      {section}
                    </p>
                    {cmds.map((c) => {
                      const i = flatIndex++;
                      const active = i === idx;
                      const Icon = c.icon;
                      return (
                        <button
                          key={c.id}
                          onMouseEnter={() => setIdx(i)}
                          onClick={() => {
                            c.run();
                            onClose();
                          }}
                          className={clsx(
                            'w-full flex items-center gap-3 px-4 h-10 text-left text-sm transition-colors',
                            active ? 'bg-white/[0.06] text-white' : 'text-slate-300 hover:bg-white/[0.03]',
                          )}
                        >
                          <Icon size={14} className={active ? 'text-blue-300' : 'text-slate-500'} />
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.hint && <span className="text-[11px] text-slate-500 hidden sm:inline">{c.hint}</span>}
                          {c.kbd && (
                            <span className="flex items-center gap-1">
                              {c.kbd.map((k) => (
                                <kbd
                                  key={k}
                                  className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          )}
                          {active && <ArrowRight size={12} className="text-blue-300" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-4 h-9 border-t border-white/8 bg-black/20 text-[10px] font-mono text-slate-500">
              <span>↑↓ Navigate · ↵ Select</span>
              <span>FaceMatcher · Command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
