import axios from 'axios';

/**
 * API origin.
 * - Empty / unset → same origin (Docker / reverse-proxy / Vite proxy).
 * - Set VITE_API_URL for split deploys (Vercel frontend + Render API).
 */
export function getApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';
  return raw.replace(/\/+$/, '');
}

export const api = axios.create({
  baseURL: getApiBase(),
  timeout: 30_000,
});

export function getStaticUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export function getWsUrl(path: string): string {
  const base = getApiBase() || window.location.origin;
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const { data, status } = await api.get('/health', { timeout: 4000 });
    return status === 200 && data?.status === 'ok';
  } catch {
    try {
      const { data, status } = await api.get('/', { timeout: 4000 });
      return status === 200 && data?.status === 'ok';
    } catch {
      return false;
    }
  }
}

/** Downscale + recompress an image in the browser before upload. */
export async function compressImage(file: File, maxDim = 800): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const { width, height } = bitmap;
  const longest = Math.max(width, height);
  const scale = longest > maxDim ? maxDim / longest : 1;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.88),
  );
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

export interface ApiStatus {
  status: string;
  version: string;
  faces: number;
  engines: { name: string; detail: string }[];
}

export async function getStatus(): Promise<ApiStatus | null> {
  try {
    const { data } = await api.get<ApiStatus>('/api/status', { timeout: 4000 });
    return data;
  } catch {
    return null;
  }
}
