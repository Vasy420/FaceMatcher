import axios from 'axios';

/** Empty VITE_API_URL = same origin (Docker). Split deploy: set the Render URL. */
const BASE = ((import.meta.env.VITE_API_URL as string) || '').trim().replace(/\/+$/, '');

export const api = axios.create({ baseURL: BASE, timeout: 300_000 });

export function getWsUrl(path: string): string {
  const origin = BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
  return origin.replace(/^http/, 'ws') + path;
}

export function getStaticUrl(path: string): string {
  if (!path) return BASE;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return BASE + (path.startsWith('/') ? path : `/${path}`);
}

export async function checkHealth(timeout = 5000): Promise<boolean> {
  try {
    const { data } = await api.get('/health', { timeout });
    return data?.status === 'ok';
  } catch {
    try {
      const { data } = await api.get('/', { timeout });
      return data?.status === 'ok';
    } catch {
      return false;
    }
  }
}

/** Long ping to spin up a sleeping Render instance (cold start can take ~60s). */
export async function wakeServer(): Promise<boolean> {
  const ok = await checkHealth(90_000);
  if (ok && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('fm:api-online'));
  }
  return ok;
}

export const API_ONLINE_EVENT = 'fm:api-online';

/** Extract a human-readable message from axios / FastAPI errors. */
export function apiErrorMessage(err: unknown, fallback = 'Request failed.'): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg))
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }
  if (detail && typeof detail === 'object' && 'msg' in (detail as object)) {
    return String((detail as { msg: string }).msg);
  }
  const msg = (err as { message?: string })?.message;
  if (msg && msg !== 'Network Error') return msg;
  if (msg === 'Network Error') return 'Cannot reach API. Check VITE_API_URL and that the backend is running.';
  return fallback;
}

export async function compressImage(file: File, maxDim = 800): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const done = (f: File) => {
      URL.revokeObjectURL(url);
      resolve(f);
    };
    img.onload = () => {
      const { width, height } = img;
      if (Math.max(width, height) <= maxDim) {
        done(file);
        return;
      }
      const scale = maxDim / Math.max(width, height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        done(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            done(file);
            return;
          }
          done(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.88,
      );
    };
    img.onerror = () => done(file);
    img.src = url;
  });
}
