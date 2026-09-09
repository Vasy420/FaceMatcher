import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Camera,
  Database,
  Smile,
  ChevronLeft,
  BookOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { API_ONLINE_EVENT, checkHealth } from '../lib/api';
import WakeServerButton from './WakeServerButton';
import { motion } from 'framer-motion';
import Logo from './Logo';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: '/home', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/video', icon: Film, label: 'Video' },
  { to: '/live', icon: Camera, label: 'Live' },
  { to: '/database', icon: Database, label: 'Faces' },
  { to: '/emotion', icon: Smile, label: 'Emotion' },
];

const COLLAPSE_KEY = 'fm.sidebar.collapsed';
export const SIDEBAR_EXPANDED = 272;
export const SIDEBAR_COLLAPSED = 80;

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (b: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const poll = async () => {
      setHealthy(await checkHealth());
    };
    poll();
    const id = setInterval(poll, 6000);
    const onOnline = () => setHealthy(true);
    window.addEventListener(API_ONLINE_EVENT, onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener(API_ONLINE_EVENT, onOnline);
    };
  }, []);

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, String(next));
  }

  return (
    <motion.aside
      animate={{ width }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-30 flex-col overflow-hidden border-r border-white/[0.06] bg-zinc-950"
    >
      <div className="shrink-0 h-16 min-h-16 max-h-16 px-3 flex items-center gap-2 border-b border-white/[0.06]">
        <div className={clsx('min-w-0', collapsed ? 'flex-1 flex justify-center' : 'flex-1')}>
          <Logo
            to="/"
            size={32}
            wordmark={!collapsed}
            tagline={false}
          />
        </div>
        {!collapsed && (
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="px-2 pt-2 flex justify-center">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronLeft size={16} className="rotate-180" />
          </button>
        </div>
      )}

      <nav className="flex-1 px-3 py-3 flex flex-col gap-1 overflow-y-auto">
        {PRIMARY.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 rounded-xl text-[0.9375rem] transition-colors duration-100 min-h-11',
                collapsed ? 'px-0 justify-center' : 'px-3',
                isActive
                  ? 'bg-white/[0.07] text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="navIndicator"
                    className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r bg-indigo-400"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2 : 1.75} className={isActive ? 'text-indigo-300' : ''} />
                {!collapsed && <span className="flex-1 truncate font-medium">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-1">
        <NavLink
          to="/"
          title={collapsed ? 'About' : undefined}
          className={clsx(
            'flex items-center gap-3 rounded-xl text-[0.9375rem] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors min-h-11',
            collapsed ? 'px-0 justify-center' : 'px-3',
          )}
        >
          <BookOpen size={17} strokeWidth={1.75} />
          {!collapsed && <span className="truncate">About</span>}
        </NavLink>
      </div>

      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div
          className={clsx(
            'rounded-xl border py-2.5 flex items-center gap-2.5',
            collapsed ? 'justify-center px-0' : 'px-3',
            healthy === false ? 'border-rose-500/25 bg-rose-500/5' : 'border-white/[0.06] bg-white/[0.02]',
          )}
        >
          <div
            className={clsx(
              'w-2 h-2 rounded-full shrink-0',
              healthy === null ? 'bg-amber-400' : healthy ? 'bg-emerald-400' : 'bg-rose-400',
            )}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400">
                {healthy === null ? 'Connecting…' : healthy ? 'API online' : 'API offline'}
              </p>
              {healthy === false && (
                <WakeServerButton compact className="mt-2 w-full" onOnline={() => setHealthy(true)} />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  });
  return [collapsed, setCollapsed] as const;
}
