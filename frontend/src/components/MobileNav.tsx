import { NavLink } from 'react-router-dom';
import { Camera, Database, Film, LayoutDashboard, Smile } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { to: '/home', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/video', icon: Film, label: 'Video' },
  { to: '/live', icon: Camera, label: 'Live' },
  { to: '/database', icon: Database, label: 'Faces' },
  { to: '/emotion', icon: Smile, label: 'Emotion' },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-zinc-950/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ to, icon: Icon, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium',
                  isActive ? 'text-zinc-50' : 'text-zinc-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} strokeWidth={isActive ? 2 : 1.75} className={isActive ? 'text-indigo-300' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
