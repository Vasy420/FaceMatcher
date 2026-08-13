export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Format seconds as m:ss or h:mm:ss. */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatRelative(ts: string | number | Date): string {
  const date = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString();
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return '#34d399';
  if (confidence >= 0.55) return '#fbbf24';
  if (confidence >= 0.35) return '#fb923c';
  return '#fb7185';
}

export const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprise: '😲',
  fear: '😨',
  disgust: '🤢',
  neutral: '😐',
};

export const EMOTION_COLOR: Record<string, string> = {
  happy: '#34d399',
  sad: '#60a5fa',
  angry: '#f43f5e',
  surprise: '#fbbf24',
  fear: '#a78bfa',
  disgust: '#84cc16',
  neutral: '#94a3b8',
};
