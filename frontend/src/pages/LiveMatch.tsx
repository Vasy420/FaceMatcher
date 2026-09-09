import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Upload, Zap, Maximize2, Wifi, Gauge, Users, Target } from 'lucide-react';
import { useToast } from '../App';
import { getWsUrl } from '../lib/api';
import { LiveMatchResponse, LiveFaceResult } from '../types';
import { confidenceColor } from '../lib/utils';
import clsx from 'clsx';
import PageHeader from '../components/PageHeader';
import Chip from '../components/Chip';
import { recordActivity } from '../lib/activity';

const PAGE = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

export default function LiveMatch() {
  const { toast } = useToast();
  const [refImg, setRefImg] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [faces, setFaces] = useState<LiveFaceResult[]>([]);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [bestConfidence, setBestConfidence] = useState(0);
  const [matchDetected, setMatchDetected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsCounterRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const facesRef = useRef<LiveFaceResult[]>([]);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const readyRef = useRef(false);
  const runningRef = useRef(false);
  const matchLoggedRef = useRef(false);

  facesRef.current = faces;

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    if (!refImg) {
      setRefPreview(null);
      return;
    }
    const url = URL.createObjectURL(refImg);
    setRefPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [refImg]);

  function pickRef(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast('Image too large (max 5 MB).', 'error');
      return;
    }
    setRefImg(f);
    e.target.value = '';
  }

  const drawLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    for (const f of facesRef.current) {
      const [top, right, bottom, left] = f.bbox;
      const color = f.is_match ? '#34d399' : '#f87171';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, right - left, bottom - top);
      const cs = 10;
      ctx.lineWidth = 2.5;
      (
        [
          [left, top, 1, 1],
          [right, top, -1, 1],
          [left, bottom, 1, -1],
          [right, bottom, -1, -1],
        ] as const
      ).forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * cs);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * cs, y);
        ctx.stroke();
      });
      ctx.fillStyle = color;
      ctx.font = '600 11px JetBrains Mono, monospace';
      ctx.fillText(
        `${(f.confidence * 100).toFixed(0)}%`,
        left + 4,
        top - 6 < 0 ? bottom + 14 : top - 6,
      );
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  function connectWs() {
    if (!refImg) return;
    const ws = new WebSocket(getWsUrl('/api/match/live'));
    wsRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        ws.send(JSON.stringify({ type: 'init', reference_image: b64 }));
      };
      reader.readAsDataURL(refImg);
    };

    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as LiveMatchResponse & { status?: string; error?: string };
      if (data.status === 'ready') {
        setReady(true);
        return;
      }
      if (data.error) {
        toast(data.error, 'error');
        return;
      }
      const newFaces = data.matches ?? [];
      setFaces(newFaces);
      setFaceCount(data.face_count ?? 0);
      setLatency(data.processing_ms ?? 0);
      fpsCounterRef.current++;
      const best = newFaces.length > 0 ? Math.max(...newFaces.map((f) => f.confidence)) : 0;
      setBestConfidence(best);
      const matched = newFaces.some((f) => f.is_match);
      setMatchDetected(matched);
      if (matched && !matchLoggedRef.current) {
        matchLoggedRef.current = true;
        recordActivity({
          kind: 'live',
          title: 'Live match detected',
          detail: `Confidence ${(best * 100).toFixed(0)}% · ${data.face_count} face(s)`,
          meta: { matches: 1, confidence: Math.round(best * 100) },
        });
      }
    };

    ws.onclose = () => {
      if (!runningRef.current) return;
      const delay = Math.min(500 * 2 ** retryCountRef.current, 8000);
      retryCountRef.current++;
      reconnectRef.current = setTimeout(connectWs, delay);
    };

    ws.onerror = () => ws.close();
  }

  async function start() {
    if (!refImg) {
      toast('Upload a reference face image first.', 'warning');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setRunning(true);
      matchLoggedRef.current = false;

      connectWs();
      rafRef.current = requestAnimationFrame(drawLoop);

      fpsTimerRef.current = setInterval(() => {
        setFps(fpsCounterRef.current);
        fpsCounterRef.current = 0;
      }, 1000);

      frameIntervalRef.current = setInterval(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
        const v = videoRef.current!;
        if (!v.videoWidth || !v.videoHeight) return;
        // Downscale outbound frames for faster server HOG; send original dims for bbox scaling
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(v.videoWidth * scale);
        tempCanvas.height = Math.round(v.videoHeight * scale);
        tempCanvas.getContext('2d')!.drawImage(v, 0, 0, tempCanvas.width, tempCanvas.height);
        const b64 = tempCanvas.toDataURL('image/jpeg', 0.72).split(',')[1];
        ws.send(
          JSON.stringify({
            type: 'frame',
            data: b64,
            width: v.videoWidth,
            height: v.videoHeight,
          }),
        );
      }, 160);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : 'Camera unavailable.';
      toast(msg, 'error');
    }
  }

  function stop() {
    setRunning(false);
    setReady(false);
    setFaces([]);
    setMatchDetected(false);
    setBestConfidence(0);
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (fpsTimerRef.current) clearInterval(fpsTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <PageHeader
        icon={Camera}
        eyebrow="Realtime"
        title="Live Camera"
        subtitle="Stream your webcam over WebSocket and match against a reference face."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Throughput" value={`${fps} fps`} live={running} icon={Gauge} />
        <Tile label="Latency" value={`${latency} ms`} live={running} icon={Wifi} />
        <Tile label="Faces" value={faceCount} live={running} icon={Users} />
        <Tile
          label="Top conf"
          value={`${(bestConfidence * 100).toFixed(0)}%`}
          live={running}
          icon={Target}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Reference</span>
              {ready && <Chip variant="emerald">Encoded</Chip>}
            </div>
            {refPreview ? (
              <div className="relative">
                <img
                  src={refPreview}
                  alt="ref"
                  className="w-full h-[160px] object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setRefImg(null);
                    setRefPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600/90 text-white rounded-md p-1.5"
                >
                  <CameraOff size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 h-[140px] border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-all">
                <Upload size={18} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">Upload face photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={pickRef} />
              </label>
            )}
          </div>

          <button
            onClick={running ? stop : start}
            disabled={!refImg}
            className={clsx(
              'flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed',
              running
                ? 'bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/15'
                : 'btn-primary',
            )}
          >
            {running ? (
              <>
                <span className="rec-dot w-1.5 h-1.5 rounded-full bg-rose-400" />
                Stop
              </>
            ) : (
              <>
                <Camera size={15} />
                Start feed
              </>
            )}
          </button>

          <p className="text-[11px] text-zinc-600 leading-relaxed px-0.5">
            Frames stream at ~6 fps. Reference is encoded once at session start.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {matchDetected && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 flex items-center gap-3 match-pulse"
              >
                <Zap size={15} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Match detected</p>
                  <p className="text-xs font-mono text-emerald-400/70">
                    {(bestConfidence * 100).toFixed(1)}% · {faceCount} face
                    {faceCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] min-h-[240px] sm:min-h-[400px] flex items-center justify-center bg-zinc-900/50">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain max-h-[520px]"
              style={{ display: running ? 'block' : 'none' }}
            />

            {running && (
              <>
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 border border-white/10">
                  <span className="rec-dot w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-mono text-zinc-300 tracking-wider">LIVE</span>
                </div>
                <button
                  onClick={() => canvasRef.current?.requestFullscreen?.()}
                  className="absolute top-3 right-3 w-8 h-8 rounded-md bg-black/50 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <Maximize2 size={13} />
                </button>
              </>
            )}

            {!running && (
              <div className="flex flex-col items-center gap-3 text-zinc-600">
                <div className="w-14 h-14 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                  <Camera size={24} strokeWidth={1.3} />
                </div>
                <p className="text-sm">Upload a reference and start the feed</p>
              </div>
            )}

            {running && bestConfidence > 0 && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 w-16">Conf</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: confidenceColor(bestConfidence) }}
                      animate={{ width: `${bestConfidence * 100}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono w-10 text-right"
                    style={{ color: confidenceColor(bestConfidence) }}
                  >
                    {(bestConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {running && faces.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {faces.map((f, i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-lg border px-3 py-2.5',
                    f.is_match
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-white/[0.06] bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-zinc-600">#{i + 1}</span>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: f.is_match ? '#34d399' : '#f87171' }}
                    >
                      {f.is_match ? 'MATCH' : 'OTHER'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {(f.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Tile({
  label,
  value,
  live,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  live: boolean;
  icon: typeof Camera;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <Icon size={13} className="text-zinc-500" />
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </div>
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-50 mt-0.5 leading-none">{value}</p>
    </div>
  );
}
