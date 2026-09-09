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
  BookOpen,
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
      { id: 'go-welcome', label: 'Welcome / About', icon: BookOpen, section: 'Navigate', run: () => nav('/') },
      { id: 'go-dash', label: 'Dashboard', icon: LayoutDashboard, section: 'Navigate', run: () => nav('/home') },
      { id: 'go-video', label: 'Video Match', icon: Film, section: 'Navigate', run: () => nav('/video') },
      { id: 'go-live', label: 'Live Camera', icon: Camera, section: 'Navigate', run: () => nav('/live') },
      { id: 'go-db', label: 'Face Database', icon: Database, section: 'Navigate', run: () => nav('/database') },
      { id: 'go-emo', label: 'Emotion', icon: Smile, section: 'Navigate', run: () => nav('/emotion') },
      {
        id: 'clear-act',
        label: 'Clear activity history',
        hint: 'Local browser log',
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
    return commands.filter(
      (c) => c.label.toLowerCase().includes(term) || c.section.toLowerCase().includes(term),
    );
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
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl overflow-hidden border border-white/[0.08] bg-zinc-900 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
              <Search size={18} className="text-zinc-500" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search pages and actions…"
                className="flex-1 bg-transparent outline-none text-base text-zinc-100 placeholder:text-zinc-600"
              />
              <kbd className="text-[11px] font-mono text-zinc-500 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08]">
                ESC
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">No matches</div>
              ) : (
                grouped.map(([section, cmds]) => (
                  <div key={section}>
                    <p className="px-3.5 pt-2.5 pb-1.5 text-[10px] font-mono text-zinc-600 tracking-wider uppercase">
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
                            'w-full flex items-center gap-3 px-4 min-h-11 text-left text-[0.9375rem] transition-colors',
                            active ? 'bg-white/[0.06] text-zinc-50' : 'text-zinc-400 hover:bg-white/[0.03]',
                          )}
                        >
                          <Icon size={14} className={active ? 'text-indigo-300' : 'text-zinc-600'} />
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.hint && (
                            <span className="text-[11px] text-zinc-600 hidden sm:inline">{c.hint}</span>
                          )}
                          {active && <ArrowRight size={12} className="text-zinc-500" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
