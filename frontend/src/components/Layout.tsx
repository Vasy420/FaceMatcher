import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Sidebar, { useSidebarCollapsed } from './Sidebar';
import { checkHealth } from '../lib/api';
import { getActivity, subscribeActivity } from '../lib/activity';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, Command as CommandIcon, Menu, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CommandPalette from './CommandPalette';
import ActivityPanel from './ActivityPanel';
import MobileNav from './MobileNav';

const CRUMB: Record<string, { eyebrow: string; title: string }> = {
  '/': { eyebrow: 'Overview', title: 'Dashboard' },
  '/video': { eyebrow: 'Module 01', title: 'Video Match' },
  '/live': { eyebrow: 'Module 02', title: 'Live Camera' },
  '/database': { eyebrow: 'Module 03', title: 'Face Database' },
  '/emotion': { eyebrow: 'Module 04', title: 'Emotion Detection' },
};

const G_ROUTES: Record<string, string> = {
  d: '/',
  v: '/video',
  l: '/live',
  f: '/database',
  e: '/emotion',
};

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function Layout({ children }: { children: ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [retryIn, setRetryIn] = useState(3);
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const seenCount = useRef(getActivity().length);
  const gArmed = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => subscribeActivity(() => {
    const n = getActivity().length;
    if (n > seenCount.current && !activityOpen) setUnread((u) => u + (n - seenCount.current));
    seenCount.current = n;
  }), [activityOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (gArmed.current) {
        const dest = G_ROUTES[e.key.toLowerCase()];
        gArmed.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        gArmed.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => { gArmed.current = false; }, 700);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let countdownTimer: ReturnType<typeof setInterval>;

    async function check() {
      const ok = await checkHealth();
      if (cancelled) return;
      if (!ok) {
        setShowBanner(true);
        setRetryIn(3);
        clearInterval(countdownTimer);
        countdownTimer = setInterval(() => setRetryIn((n) => n - 1), 1000);
        retryTimer = setTimeout(() => {
          clearInterval(countdownTimer);
          check();
        }, 3000);
      } else {
        setShowBanner(false);
        retryTimer = setTimeout(check, 20_000);
      }
    }

    check();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(countdownTimer);
    };
  }, []);

  const ml = collapsed ? 72 : 240;
  const crumb = CRUMB[location.pathname] ?? { eyebrow: 'Workspace', title: 'FaceMatcher' };

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar
        onOpenPalette={openPalette}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className="fm-main flex-1 flex flex-col min-h-screen transition-[margin] duration-300 pb-24 md:pb-0"
        style={{ ['--sidebar-w' as string]: `${ml}px` }}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 flex items-center gap-3 h-14 px-4 sm:px-6 lg:px-8 border-b border-white/[0.05]"
          style={{
            background: 'linear-gradient(180deg, rgba(10,15,30,0.88), rgba(10,15,30,0.68))',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <button
            className="md:hidden w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-slate-300"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="text-[11px] font-mono text-slate-500 tracking-widest uppercase hover:text-slate-300 transition-colors">
              FaceMatcher
            </Link>
            <span className="text-slate-700 hidden sm:inline">/</span>
            <span className="text-[11px] font-mono text-slate-500 tracking-widest uppercase hidden sm:inline">{crumb.eyebrow}</span>
            <span className="text-slate-700">/</span>
            <span className="text-sm font-syne font-semibold text-white truncate">{crumb.title}</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={openPalette}
            className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-xs text-slate-400"
          >
            <CommandIcon size={12} />
            <span>Search</span>
            <kbd className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">⌘K</kbd>
          </button>

          <button
            onClick={() => { setActivityOpen(true); setUnread(0); }}
            className="relative w-8 h-8 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            aria-label="Open activity"
          >
            <Bell size={14} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-[9px] font-mono text-white flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center font-syne font-bold text-white text-[10px] shadow-md shadow-blue-500/30" title="Local workspace">
            FM
          </div>
        </div>

        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2.5 flex items-center gap-2.5">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300 font-mono flex-1">
                  API offline — retrying in {Math.max(retryIn, 0)}s
                </span>
                <button
                  onClick={() => { setRetryIn(0); checkHealth(); }}
                  className="text-[11px] font-mono text-amber-200 inline-flex items-center gap-1 hover:text-white"
                >
                  <RefreshCw size={11} /> Retry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ActivityPanel open={activityOpen} onClose={() => setActivityOpen(false)} />
    </div>
  );
}
