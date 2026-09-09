import { useState } from 'react';
import { Power, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { wakeServer } from '../lib/api';

interface Props {
  onOnline?: () => void;
  className?: string;
  compact?: boolean;
}

export default function WakeServerButton({ onOnline, className, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function wake() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await wakeServer();
    setBusy(false);
    if (ok) onOnline?.();
    else setFailed(true);
  }

  return (
    <button
      type="button"
      onClick={wake}
      disabled={busy}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-70 shrink-0',
        compact
          ? 'h-8 px-2.5 text-xs bg-amber-400 text-zinc-950 hover:bg-amber-300'
          : 'h-9 px-3 text-sm bg-amber-400 text-zinc-950 hover:bg-amber-300',
        className,
      )}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
      {busy ? (compact ? 'Waking…' : 'Waking server…') : failed ? 'Retry wake' : 'Wake server'}
    </button>
  );
}
