export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function confidenceColor(c: number): string {
  if (c >= 0.75) return '#22c55e';
  if (c >= 0.5) return '#f59e0b';
  return '#ef4444';
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export const EMOTION_EMOJI: Record<string, string> = {
  angry: '😠',
  disgust: '🤢',
  fear: '😨',
  happy: '😄',
  sad: '😢',
  surprise: '😲',
  neutral: '😐',
};

export const EMOTION_COLOR: Record<string, string> = {
  angry: '#ef4444',
  disgust: '#84cc16',
  fear: '#a855f7',
  happy: '#22c55e',
  sad: '#3b82f6',
  surprise: '#f59e0b',
  neutral: '#94a3b8',
};
