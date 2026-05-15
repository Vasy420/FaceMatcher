import { NavLink } from 'react-router-dom';
import { Film, Camera, Database, Smile, Crosshair, Home } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { checkHealth } from '../lib/api';

const NAV = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/video', icon: Film, label: 'Video Match' },
  { to: '/live', icon: Camera, label: 'Live Camera' },
  { to: '/database', icon: Database, label: 'Face DB' },
  { to: '/emotion', icon: Smile, label: 'Emotion' },
];

export default function Sidebar() {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const poll = async () => setHealthy(await checkHealth());
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col z-20 border-r border-blue-500/10 overflow-hidden"
      style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(24px)' }}
    >
      {/* Scan line decoration */}
      <div className="scan-line" />

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Crosshair size={16} className="text-white" />
          </div>
          <div>
            <p className="font-syne font-bold text-white text-sm tracking-wide leading-none">FACE</p>
            <p className="font-syne font-bold text-blue-400 text-sm tracking-wide leading-none">MATCHER</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600/15 text-blue-300 border border-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Health */}
      <div className="px-5 py-4 border-t border-blue-500/10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div
              className={clsx(
                'w-2 h-2 rounded-full',
                healthy === null ? 'bg-amber-400' : healthy ? 'bg-green-400' : 'bg-red-400',
              )}
            />
            {healthy === true && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-60" />
            )}
          </div>
          <span className="text-xs font-mono text-slate-500">
            {healthy === null ? 'connecting...' : healthy ? 'API online' : 'API offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
