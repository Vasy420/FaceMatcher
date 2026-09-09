import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export default function InteractiveMark() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 42 });
  const [hover, setHover] = useState(false);
  const [shutter, setShutter] = useState(false);
  const [status, setStatus] = useState<'idle' | 'tracking' | 'locked'>('idle');
  const reduce = usePrefersReducedMotion();

  const point = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el || reduce) return;
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      setTilt({ x: (0.5 - py) * 18, y: (px - 0.5) * 20 });
      setLook({ x: (px - 0.5) * 10, y: (py - 0.5) * 10 });
      setGlare({ x: px * 100, y: py * 100 });
    },
    [reduce],
  );

  function reset() {
    setHover(false);
    setTilt({ x: 0, y: 0 });
    setLook({ x: 0, y: 0 });
    setGlare({ x: 50, y: 42 });
    if (status !== 'locked') setStatus('idle');
  }

  function fireShutter() {
    if (reduce) return;
    setShutter(true);
    setStatus('locked');
    window.setTimeout(() => setShutter(false), 520);
    window.setTimeout(() => setStatus((s) => (s === 'locked' ? 'idle' : s)), 1600);
  }

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ref}
        role="img"
        aria-label="FaceMatcher mark. Move over it to track. Click to shutter."
        tabIndex={0}
        onMouseEnter={() => {
          setHover(true);
          if (status !== 'locked') setStatus('tracking');
        }}
        onMouseMove={(e) => {
          point(e.clientX, e.clientY);
          if (status !== 'locked') setStatus('tracking');
        }}
        onMouseLeave={reset}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) point(t.clientX, t.clientY);
          setHover(true);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) point(t.clientX, t.clientY);
        }}
        onTouchEnd={reset}
        onClick={fireShutter}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fireShutter();
          }
        }}
        className="relative w-[286px] h-[286px] sm:w-[330px] sm:h-[330px] xl:w-[374px] xl:h-[374px] cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded-[30%]"
        style={{ perspective: 900 }}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: reduce
              ? undefined
              : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: hover ? 'transform 80ms linear' : 'transform 500ms ease',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Ambient glow */}
          <div
            className={clsx(
              'absolute -inset-8 rounded-full blur-3xl transition-opacity duration-500',
              hover ? 'opacity-70' : 'opacity-40',
            )}
            style={{
              background:
                'radial-gradient(circle, rgba(165,180,252,0.28) 0%, transparent 68%)',
            }}
          />

          {/* Mark */}
          <img
            src="/logo-mark.png"
            alt=""
            draggable={false}
            className="relative w-full h-full rounded-[28%] object-cover ring-1 ring-white/10 shadow-[0_30px_80px_-24px_rgba(129,140,248,0.45)]"
            style={{
              transform: reduce ? undefined : `translate3d(${look.x * 0.35}px, ${look.y * 0.35}px, 18px)`,
              transition: hover ? 'transform 80ms linear' : 'transform 500ms ease',
            }}
          />

          {/* Rotating calibration rings */}
          {!reduce && (
            <>
              <span className="im-ring im-ring-slow pointer-events-none" />
              <span className="im-ring im-ring-fast pointer-events-none" />
            </>
          )}

          {/* Scan line */}
          {!reduce && <span className="im-scan pointer-events-none" />}

          {/* Iris follow — soft pupil offset */}
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,252,240,0.55) 0%, rgba(165,180,252,0.0) 70%)',
              transform: `translate(${look.x}px, ${look.y}px)`,
              transition: hover ? 'transform 70ms linear' : 'transform 500ms ease',
              mixBlendMode: 'screen',
            }}
          />

          {/* Specular glare */}
          <span
            className="pointer-events-none absolute inset-0 rounded-[28%] overflow-hidden"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.22), transparent 42%)`,
              mixBlendMode: 'soft-light',
            }}
          />

          {/* Shutter blades */}
          <span
            className={clsx(
              'pointer-events-none absolute inset-0 rounded-[28%] bg-zinc-950 origin-center',
              shutter ? 'im-shutter-on' : 'opacity-0',
            )}
          />
        </div>
      </div>

      <p className="mt-7 text-[10px] font-mono tracking-[0.28em] uppercase text-zinc-600">
        {status === 'tracking' && 'tracking'}
        {status === 'locked' && 'locked'}
        {status === 'idle' && 'move · click'}
      </p>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}
