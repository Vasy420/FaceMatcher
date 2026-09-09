import { ReactNode, useCallback, useEffect, useState } from 'react';
import Sidebar, { SIDEBAR_COLLAPSED, SIDEBAR_EXPANDED, useSidebarCollapsed } from './Sidebar';
import { checkHealth } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette';
import MobileNav from './MobileNav';
import Logo from './Logo';

const PAGE_NAME: Record<string, string> = {
  '/home': 'Dashboard',
  '/video': 'Video Match',
  '/live': 'Live Camera',
  '/database': 'Faces',
  '/emotion': 'Emotion',
};

export default function Layout({ children }: { children: ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [retryIn, setRetryIn] = useState(3);
  const location = useLocation();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true,
  );
  const pageName = PAGE_NAME[location.pathname] ?? 'FaceMatcher';

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;
    let countdownTimer: ReturnType<typeof setInterval>;

    async function check() {
      const ok = await checkHealth();
      if (!ok) {
        setShowBanner(true);
        setRetryIn(3);
        countdownTimer = setInterval(() => setRetryIn((n) => n - 1), 1000);
        retryTimer = setTimeout(() => {
          clearInterval(countdownTimer);
          check();
        }, 3000);
      } else {
        setShowBanner(false);
      }
    }

    check();
    return () => {
      clearTimeout(retryTimer);
      clearInterval(countdownTimer);
    };
  }, []);

  const ml = isDesktop ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) : 0;

  return (
    <div className="flex h-full min-h-screen bg-zinc-950">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className="flex-1 flex flex-col min-h-screen min-w-0 transition-[margin] duration-300"
        style={{ marginLeft: ml }}
      >
        <header className="sticky top-0 z-20 h-14 md:h-16 min-h-14 md:min-h-16 max-h-16 overflow-hidden shrink-0 px-3 sm:px-5 lg:px-8 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-xl">
          <div className="h-full flex items-center gap-3">
            <div className="md:hidden min-w-0 shrink-0">
              <Logo to="/" size={28} wordmark tagline={false} />
            </div>
            <p className="hidden md:block text-base font-medium text-zinc-100 truncate min-w-0 leading-none">
              {pageName}
            </p>
            <button
              onClick={openPalette}
              className="flex-1 max-w-xl ml-auto h-10 shrink min-w-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 transition-all text-left"
            >
              <Search size={16} className="text-zinc-500 shrink-0" />
              <span className="text-sm text-zinc-500 flex-1 truncate">Search…</span>
              <kbd className="hidden sm:inline text-[11px] font-mono text-zinc-500 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-500/8 border-b border-amber-500/15 px-4 sm:px-6 py-2.5 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm text-amber-200/90">
                  API offline — retrying in {Math.max(retryIn, 0)}s
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 p-4 sm:p-6 lg:p-10 w-full max-w-6xl mx-auto pb-24 md:pb-10">
          {children}
        </div>
      </main>

      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
