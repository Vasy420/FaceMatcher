import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface Props {
  to?: string;
  size?: number;
  wordmark?: boolean;
  tagline?: boolean;
  className?: string;
}

export default function Logo({ to, size = 32, wordmark = true, tagline = true, className }: Props) {
  const mark = (
    <img
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      className="rounded-[22%] object-cover shrink-0 select-none ring-1 ring-white/10"
      draggable={false}
    />
  );

  const inner = (
    <span className={clsx('inline-flex items-center gap-2.5 min-w-0', className)}>
      {mark}
      {wordmark && (
        <span className="flex flex-col min-w-0 leading-none">
          <span className="font-display text-base font-medium tracking-tight text-zinc-50 truncate">
            FaceMatcher
          </span>
          {tagline && (
            <span className="mt-0.5 text-[9px] font-mono tracking-[0.18em] uppercase text-zinc-500">
              local vision
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="hover:opacity-90 transition-opacity" aria-label="FaceMatcher">
      {inner}
    </Link>
  );
}

/** Crisp vector mark for favicon-sized use when the raster is too heavy. */
export function LogoMarkSvg({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="#0B0B0D" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" stroke="rgba(255,255,255,0.08)" />
      {/* viewfinder corners */}
      <path d="M18 22.5V18h4.5" stroke="#C4C4CC" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M46 22.5V18h-4.5" stroke="#C4C4CC" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M18 41.5V46h4.5" stroke="#C4C4CC" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M46 41.5V46h-4.5" stroke="#C4C4CC" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="32" cy="32" r="16" stroke="rgba(196,196,204,0.35)" strokeWidth="1" />
      <circle cx="32" cy="32" r="11.5" stroke="rgba(165,180,252,0.45)" strokeWidth="1" />
      <circle cx="32" cy="32" r="7" stroke="#A5B4FC" strokeWidth="1.15" />
      <circle cx="32" cy="32" r="2.4" fill="#C7D2FE" />
    </svg>
  );
}
