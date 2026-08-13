import { uid } from './utils';

export type ActivityKind = 'video' | 'identify' | 'emotion' | 'live' | 'register' | 'delete';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  meta?: Record<string, string | number>;
  ts: string;
}

const KEY = 'fm.activity.v1';
const MAX = 80;

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(events: ActivityEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX)));
  listeners.forEach((fn) => fn());
}

export function getActivity(): ActivityEvent[] {
  return read();
}

export function recordActivity(
  event: Omit<ActivityEvent, 'id' | 'ts'> & { ts?: string },
): ActivityEvent {
  const item: ActivityEvent = {
    id: uid(),
    ts: event.ts ?? new Date().toISOString(),
    kind: event.kind,
    title: event.title,
    detail: event.detail,
    meta: event.meta,
  };
  write([item, ...read()]);
  return item;
}

export function clearActivity() {
  write([]);
}

export function subscribeActivity(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDailyCounts(days = 14): { date: string; count: number }[] {
  const events = read();
  const out: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = events.filter((e) => e.ts.slice(0, 10) === key).length;
    out.push({ date: key, count });
  }
  return out;
}

export function emotionTotals(): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const ev of read()) {
    if (ev.kind !== 'emotion') continue;
    const key = String(ev.meta?.dominant ?? '').toLowerCase();
    if (!key || key === 'none') continue;
    totals[key] = (totals[key] ?? 0) + 1;
  }
  return totals;
}
