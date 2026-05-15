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
  const sessionMatchesRef = useRef(0);
  const sessionStartRef = useRef(0);

  facesRef.current = faces;

  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => { runningRef.current = running; }, [running]);

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
    if (f.size > 5 * 1024 * 1024) { toast('Image too large (max 5 MB).', 'error'); return; }
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
      const matched = newFaces.some((f) => f.is_match);
      setMatchDetected(matched);
      if (matched) {
        sessionMatchesRef.current++;
        if (!matchLoggedRef.current) {
          matchLoggedRef.current = true;
          recordActivity({
            kind: 'live',
            title: 'Live match detected',
            detail: `Confidence ${(best * 100).toFixed(0)}% · ${data.face_count} face(s) in frame`,
            meta: { matches: 1, confidence: Math.round(best * 100) },
          });
        }
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
    if (!refImg) { toast('Upload a reference face image first.', 'warning'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setRunning(true);
      matchLoggedRef.current = false;
      sessionMatchesRef.current = 0;
      sessionStartRef.current = Date.now();

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
      <PageHeader
        icon={Camera}
        eyebrow="MODULE · 02"
        title="Live Camera"
        accent="#8B5CF6, #D946EF"
        subtitle="Real-time face matching via webcam WebSocket stream."
      />

      {/* Telemetry strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TelemetryTile icon={Gauge} label="Throughput" value={`${fps} fps`} accent="#3B82F6" live={running} />
        <TelemetryTile icon={Wifi} label="Latency" value={`${latency} ms`} accent="#22D3EE" live={running} />
        <TelemetryTile icon={Users} label="Faces in frame" value={faceCount} accent="#8B5CF6" live={running} />
        <TelemetryTile icon={Target} label="Top confidence" value={`${(bestConfidence * 100).toFixed(0)}%`} accent={confidenceColor(bestConfidence)} live={running} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Left panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Reference</span>
              {ready && <Chip variant="emerald">ENCODED</Chip>}
            </div>
            {refPreview ? (
              <div className="relative">
                <img src={refPreview} alt="ref" className="w-full h-[180px] object-cover rounded-xl ring-1 ring-white/10" />
                <div className="absolute inset-0 rounded-xl ring-1 ring-blue-500/20 pointer-events-none" />
                <button
                  onClick={() => { setRefImg(null); setRefPreview(null); }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600/90 text-white rounded-md p-1.5 transition-colors backdrop-blur-sm"
                  title="Remove reference"
                >
                  <CameraOff size={12} />
                </button>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/60 backdrop-blur rounded-md px-2 py-1">
                  <span className="text-[10px] font-mono text-slate-200 truncate">{refImg?.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">{refImg ? Math.round(refImg.size / 1024) + 'KB' : ''}</span>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 h-[160px] border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/40 hover:bg-white/[0.02] transition-all">
                <Upload size={20} className="text-slate-500" />
                <span className="text-xs text-slate-400 font-sans">Drop or click to upload</span>
                <span className="text-[10px] font-mono text-slate-600">JPG · PNG · ≤5MB</span>
                <input type="file" accept="image/*" className="hidden" onChange={pickRef} />
              </label>
            )}
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Session</span>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <SessionStat label="State" value={running ? (ready ? 'Streaming' : 'Init…') : 'Idle'} dot={running ? (ready ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-500'} />
              <SessionStat label="Pipeline" value="WebSocket" dot="bg-blue-400" />
              <SessionStat label="Frame rate" value={`${fps}/s`} />
              <SessionStat label="Latency" value={`${latency}ms`} />
            </div>
          </div>

          <button
            onClick={running ? stop : start}
            disabled={!refImg}
            className={clsx(
              'flex items-center justify-center gap-2 h-11 rounded-xl font-syne font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
              running
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                : 'btn-primary',
            )}
          >
            {running ? (
              <>
                <span className="rec-dot w-2 h-2 rounded-full bg-rose-400" />
                Stop Session
              </>
            ) : (
              <>
                <Camera size={16} />
                Begin Live Feed
              </>
            )}
          </button>

          <p className="text-[10px] font-mono text-slate-600 text-center px-2 leading-relaxed">
            Reference image is encoded once at session start. Frames stream at ~6 fps over a single WebSocket.
          </p>
        </div>

        {/* Right: canvas */}
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {matchDetected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-center gap-3 match-pulse"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Zap size={16} className="text-emerald-300" />
                </div>
                <div>
                  <p className="font-syne font-bold text-emerald-300 text-sm">MATCH DETECTED</p>
                  <p className="text-xs font-mono text-emerald-300/70">
                    Confidence {(bestConfidence * 100).toFixed(1)}% · {faceCount} face{faceCount !== 1 ? 's' : ''} in frame
                  </p>
                </div>
                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 min-h-[420px] flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(2,6,16,0.85), rgba(10,15,30,0.85))',
            }}
          >
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain max-h-[560px]"
              style={{ display: running ? 'block' : 'none' }}
            />

            {/* Frame chrome */}
            {running && (
              <>
                <div className="pointer-events-none absolute inset-3 border border-white/10 rounded-xl" />
                <div className="pointer-events-none absolute inset-3 rounded-xl" style={{ boxShadow: 'inset 0 0 80px rgba(59,130,246,0.10)' }} />
                {/* Corner brackets */}
                {(['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'] as const).map((pos, i) => (
                  <div key={i} className={`pointer-events-none absolute ${pos} w-5 h-5`}>
                    <div className="absolute inset-0 border-blue-400/60" style={{
                      borderTopWidth: pos.includes('top') ? 2 : 0,
                      borderBottomWidth: pos.includes('bottom') ? 2 : 0,
                      borderLeftWidth: pos.includes('left') ? 2 : 0,
                      borderRightWidth: pos.includes('right') ? 2 : 0,
                      borderRadius: 4,
                    }} />
                  </div>
                ))}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur">
                  <span className="rec-dot w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-mono text-slate-200 tracking-widest">REC · LIVE</span>
                </div>
                <button
                  onClick={() => canvasRef.current?.requestFullscreen?.()}
                  className="absolute top-3 right-3 w-8 h-8 rounded-md bg-black/50 border border-white/10 backdrop-blur flex items-center justify-center text-slate-300 hover:text-white hover:bg-black/70"
                  title="Fullscreen"
                >
                  <Maximize2 size={13} />
                </button>
              </>
            )}

            {!running && (
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
                  <Camera size={28} strokeWidth={1.3} />
                </div>
                <p className="text-sm font-sans">Feed offline · upload reference & press start</p>
              </div>
            )}

            {/* Confidence overlay */}
            {running && bestConfidence > 0 && (
              <div className="absolute bottom-3 left-3 right-3">
                <div className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 backdrop-blur flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest w-20">Confidence</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: confidenceColor(bestConfidence) }}
                      animate={{ width: `${bestConfidence * 100}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>
                  <span className="text-xs font-mono w-12 text-right" style={{ color: confidenceColor(bestConfidence) }}>
                    {(bestConfidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Face cards */}
          {running && faces.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Tracked faces · {faces.length}</span>
                <Chip variant="blue">live</Chip>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {faces.map((f, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'rounded-lg border px-3 py-2.5 flex flex-col gap-1',
                      f.is_match
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-white/10 bg-white/[0.02]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">Face #{i + 1}</span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: f.is_match ? '#34d399' : '#fb7185' }}
                      >
                        {f.is_match ? 'MATCH' : 'OTHER'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-syne font-bold text-white">
                        {(f.confidence * 100).toFixed(0)}%
                      </span>
                      <div className="h-1 w-12 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${f.confidence * 100}%`,
                            background: confidenceColor(f.confidence),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TelemetryTile({
  icon: Icon,
  label,
  value,
  accent,
  live,
}: {
  icon: typeof Camera;
  label: string;
  value: React.ReactNode;
  accent: string;
  live: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-25" style={{ background: accent }} />
      <div className="relative flex items-start justify-between">
        <div className="w-7 h-7 rounded-md flex items-center justify-center border border-white/10" style={{ background: `${accent}1A` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-1.5" />}
      </div>
      <p className="relative text-[10px] font-mono text-slate-500 tracking-widest uppercase mt-2.5">{label}</p>
      <p className="relative font-syne font-bold text-lg text-white mt-1 leading-none">{value}</p>
    </div>
  );
}

function SessionStat({ label, value, dot }: { label: string; value: React.ReactNode; dot?: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2">
      <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="flex items-center gap-1.5 mt-1 text-sm font-syne font-semibold text-white">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        {value}
      </p>
    </div>
  );
}
