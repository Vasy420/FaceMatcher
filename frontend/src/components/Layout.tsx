import { ReactNode, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { checkHealth } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [retryIn, setRetryIn] = useState(3);
  const location = useLocation();
  const isWelcome = location.pathname === '/';

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

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col min-h-screen">
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-2.5">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300 font-mono">
                  API warming up… retrying in {Math.max(retryIn, 0)}s
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={isWelcome ? 'flex-1 w-full' : 'flex-1 p-6 lg:p-8 max-w-[1200px] w-full'}>
          {children}
        </div>
      </main>
    </div>
  );
}
