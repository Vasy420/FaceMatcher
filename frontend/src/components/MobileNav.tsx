import { NavLink } from 'react-router-dom';
import { Camera, Database, Film, LayoutDashboard, Smile } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/video', icon: Film, label: 'Video' },
  { to: '/live', icon: Camera, label: 'Live' },
  { to: '/database', icon: Database, label: 'Faces' },
  { to: '/emotion', icon: Smile, label: 'Emotion' },
];

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(18px)' }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ to, icon: Icon, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-medium',
                  isActive ? 'text-white' : 'text-slate-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-blue-300' : 'text-slate-500'} />
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
