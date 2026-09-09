export type ActivityKind = 'video' | 'identify' | 'emotion' | 'live' | 'register' | 'delete';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  ts: number;
  meta?: Record<string, string | number>;
}

const KEY = 'fm.activity.v1';
const MAX = 50;

function read(): ActivityEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as ActivityEvent[];
  } catch {
    return [];
  }
}

function write(list: ActivityEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  window.dispatchEvent(new CustomEvent('fm:activity'));
}

export function recordActivity(ev: Omit<ActivityEvent, 'id' | 'ts'>) {
  const list = read();
  list.unshift({ ...ev, id: crypto.randomUUID(), ts: Date.now() });
  write(list);
}

export function getActivity(): ActivityEvent[] {
  return read();
}

export function clearActivity() {
  write([]);
}

export function subscribeActivity(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener('fm:activity', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('fm:activity', handler);
    window.removeEventListener('storage', handler);
  };
}

export interface DailyCount {
  date: string;
  count: number;
}

export function getDailyCounts(days = 14): DailyCount[] {
  const list = read();
  const buckets = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  list.forEach((e) => {
    const k = new Date(e.ts).toISOString().slice(0, 10);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  });
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

export function emotionTotals(): Record<string, number> {
  const totals: Record<string, number> = {};
  getActivity()
    .filter((e) => e.kind === 'emotion' && e.meta?.dominant)
    .forEach((e) => {
      const d = String(e.meta!.dominant);
      totals[d] = (totals[d] ?? 0) + 1;
    });
  return totals;
}
