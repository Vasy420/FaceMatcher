import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, Upload, Zap } from 'lucide-react';
import { useToast } from '../App';
import { getWsUrl } from '../lib/api';
import { LiveMatchResponse, LiveFaceResult } from '../types';
import { confidenceColor } from '../lib/utils';
import clsx from 'clsx';

const PAGE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
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
  const [threshold] = useState(0.55);

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

  facesRef.current = faces;

  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => { runningRef.current = running; }, [running]);

  function pickRef(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('Image too large (max 5 MB).', 'error'); return; }
    setRefImg(f);
    setRefPreview(URL.createObjectURL(f));
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
      const color = f.is_match ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, right - left, bottom - top);
      // Corner brackets
      const cs = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]].forEach(([x, y, dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(x as number, (y as number) + (dy as number) * cs); ctx.lineTo(x as number, y as number); ctx.lineTo((x as number) + (dx as number) * cs, y as number); ctx.stroke();
      });
      ctx.fillStyle = color;
      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.fillText(`${(f.confidence * 100).toFixed(0)}%`, left + 4, top - 6 < 0 ? bottom + 14 : top - 6);
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
      if (data.status === 'ready') { setReady(true); return; }
      if (data.error) { toast(data.error, 'error'); return; }
      const newFaces = data.matches ?? [];
      setFaces(newFaces);
      setFaceCount(data.face_count ?? 0);
      setLatency(data.processing_ms ?? 0);
      fpsCounterRef.current++;
      const best = newFaces.length > 0 ? Math.max(...newFaces.map((f) => f.confidence)) : 0;
      setBestConfidence(best);
      setMatchDetected(newFaces.some((f) => f.is_match && f.confidence >= threshold));
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
    if (!refImg) { toast('Upload a reference face image first.', 'warning'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setRunning(true);

      connectWs();

      rafRef.current = requestAnimationFrame(drawLoop);

      fpsTimerRef.current = setInterval(() => {
        setFps(fpsCounterRef.current);
        fpsCounterRef.current = 0;
      }, 1000);

      // Send frames at ~6fps
      frameIntervalRef.current = setInterval(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
        const tempCanvas = document.createElement('canvas');
        const v = videoRef.current!;
        tempCanvas.width = v.videoWidth;
        tempCanvas.height = v.videoHeight;
        const ctx = tempCanvas.getContext('2d')!;
        ctx.drawImage(v, 0, 0);
        const b64 = tempCanvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        ws.send(JSON.stringify({ type: 'frame', data: b64 }));
      }, 160);
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}` : 'Camera unavailable.';
      console.error('getUserMedia error:', err);
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

  useEffect(() => () => stop(), []); // eslint-disable-line

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <div>
        <h1 className="font-syne font-bold text-2xl text-white">Live Camera</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time face matching via webcam WebSocket stream.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Left panel */}
        <div className="flex flex-col gap-4">
          <div className="glass p-4 flex flex-col gap-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Reference Face</span>
            {refPreview ? (
              <div className="relative">
                <img src={refPreview} alt="ref" className="w-full h-[160px] object-cover rounded-xl" />
                <button
                  onClick={() => { setRefImg(null); setRefPreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-1 transition-colors"
                >
                  <CameraOff size={12} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 h-[140px] border-2 border-dashed border-blue-500/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors">
                <Upload size={20} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-sans">Upload reference image</span>
                <input type="file" accept="image/*" className="hidden" onChange={pickRef} />
              </label>
            )}
          </div>

          {/* Stats */}
          <div className="glass p-4 flex flex-col gap-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Stats</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'FPS', value: fps },
                { label: 'Faces', value: faceCount },
                { label: 'Confidence', value: `${(bestConfidence * 100).toFixed(0)}%` },
                { label: 'Latency', value: `${latency}ms` },
              ].map((s) => (
                <div key={s.label} className="bg-navy-800/50 rounded-xl p-2.5">
                  <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{s.label}</p>
                  <p className="font-mono text-sm font-medium text-slate-200 mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Start/stop */}
          <button
            onClick={running ? stop : start}
            className={clsx(
              'flex items-center justify-center gap-2 py-3 rounded-xl font-syne font-semibold text-sm transition-all duration-200',
              running
                ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                : 'btn-primary',
            )}
          >
            {running ? (
              <>
                <span className="rec-dot w-2 h-2 rounded-full bg-red-400" />
                Stop Session
              </>
            ) : (
              <>
                <Camera size={16} />
                Start Live
              </>
            )}
          </button>
        </div>

        {/* Right: canvas */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {matchDetected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-4 border border-green-500/40 match-pulse flex items-center gap-3"
              >
                <Zap size={18} className="text-green-400 shrink-0" />
                <div>
                  <p className="font-syne font-bold text-green-400 text-sm">MATCH DETECTED</p>
                  <p className="text-xs font-mono text-green-500/70">
                    Confidence: {(bestConfidence * 100).toFixed(1)}%
                    {' '}· {faceCount} face{faceCount !== 1 ? 's' : ''} in frame
                  </p>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-ping" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative glass overflow-hidden rounded-2xl bg-navy-900 min-h-[360px] flex items-center justify-center">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain max-h-[480px]"
              style={{ display: running ? 'block' : 'none' }}
            />
            {!running && (
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <Camera size={48} strokeWidth={1} />
                <p className="text-sm font-sans">Camera feed will appear here</p>
              </div>
            )}
            {/* Confidence overlay bar */}
            {running && bestConfidence > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="glass px-3 py-2 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest w-20">Confidence</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: confidenceColor(bestConfidence) }}
                      animate={{ width: `${bestConfidence * 100}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: confidenceColor(bestConfidence) }}>
                    {(bestConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
