import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Zap, Smile, Activity, Cpu, Eye } from 'lucide-react';
import { useToast } from '../App';
import { api, apiErrorMessage } from '../lib/api';
import { EmotionResponse, EmotionFace } from '../types';
import { EMOTION_EMOJI, EMOTION_COLOR } from '../lib/utils';
import PageHeader from '../components/PageHeader';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import { recordActivity } from '../lib/activity';
import clsx from 'clsx';

const PAGE = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

interface HistoryItem {
  id: string;
  preview: string;
  result: EmotionResponse;
  ts: string;
}

export default function EmotionDetect() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmotionResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [webcamMode, setWebcamMode] = useState(false);
  const [liveDetecting, setLiveDetecting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectingRef = useRef(false);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const liveLoggedRef = useRef(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  function drawOverlay(faces: EmotionFace[]) {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const face of faces) {
      const { x, y, w, h } = face.region;
      if (!w || !h) continue;
      const color = EMOTION_COLOR[face.dominant_emotion] ?? '#94a3b8';
      const emoji = EMOTION_EMOJI[face.dominant_emotion] ?? '😐';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      const labelY = y > 30 ? y - 26 : y + h;
      ctx.fillStyle = color + 'dd';
      ctx.fillRect(x, labelY, Math.max(w, 90), 24);
      ctx.fillStyle = '#fff';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillText(`${emoji} ${face.dominant_emotion}`, x + 6, labelY + 16);
    }
  }

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast('Image too large (max 5 MB).', 'error');
      return;
    }
    setFile(f);
    setResult(null);
    e.target.value = '';
  }

  useEffect(() => {
    if (webcamMode && result?.faces) drawOverlay(result.faces);
  }, [result, webcamMode]);

  async function captureAndDetect() {
    if (detectingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        detectingRef.current = true;
        setLiveDetecting(true);
        try {
          const fd = new FormData();
          fd.append('image', new File([blob], 'live.jpg', { type: 'image/jpeg' }));
          const t = performance.now();
          const { data } = await api.post<EmotionResponse>('/api/emotion/detect', fd);
          setLastLatency(Math.round(performance.now() - t));
          setSessionCount((c) => c + 1);
          if (!data.face_detected || !data.faces || data.faces.length === 0) {
            setResult({ dominant_emotion: '', emotions: {}, face_detected: false, faces: [] });
            return;
          }
          setResult(data);
          if (!liveLoggedRef.current && data.face_detected && data.dominant_emotion) {
            liveLoggedRef.current = true;
            recordActivity({
              kind: 'emotion',
              title: 'Live emotion session',
              detail: `First read: ${data.dominant_emotion}`,
              meta: { dominant: data.dominant_emotion },
            });
          }
        } catch {
          /* silent on frame errors */
        } finally {
          detectingRef.current = false;
          setLiveDetecting(false);
        }
      },
      'image/jpeg',
      0.92,
    );
  }

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      videoRef.current!.srcObject = stream;
      await videoRef.current!.play();
      setWebcamMode(true);
      setResult(null);
      liveLoggedRef.current = false;
      setSessionCount(0);
      setTimeout(() => {
        captureAndDetect();
        liveIntervalRef.current = setInterval(captureAndDetect, 1000);
      }, 600);
    } catch {
      toast('Camera access denied.', 'error');
    }
  }

  function stopWebcam() {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const oc = overlayRef.current;
    if (oc) oc.getContext('2d')?.clearRect(0, 0, oc.width, oc.height);
    setWebcamMode(false);
    setLiveDetecting(false);
  }

  async function analyse() {
    if (!file) {
      toast('Upload an image first.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const t = performance.now();
      const { data } = await api.post<EmotionResponse>('/api/emotion/detect', fd);
      setLastLatency(Math.round(performance.now() - t));
      setResult(data);
      recordActivity({
        kind: 'emotion',
        title: `Detected: ${data.dominant_emotion || 'no face'}`,
        detail: file.name,
        meta: { dominant: data.dominant_emotion || 'none' },
      });
      if (preview) {
        setHistory((h) =>
          [
            {
              id: Math.random().toString(36).slice(2),
              preview,
              result: data,
              ts: new Date().toLocaleTimeString(),
            },
            ...h,
          ].slice(0, 5),
        );
      }
      if (data.face_detected) {
        toast(`Dominant: ${data.dominant_emotion}`, 'success');
      } else {
        toast('No face detected.', 'info');
      }
    } catch (err: unknown) {
      toast(apiErrorMessage(err, 'Analysis failed.'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const sorted = result ? Object.entries(result.emotions).sort(([, a], [, b]) => b - a) : [];

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <PageHeader
        icon={Smile}
        eyebrow="Analysis"
        title="Emotion"
        subtitle="Seven-class emotion from a photo or live webcam — DeepFace + MTCNN."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat icon={Activity} label="Session reads" value={sessionCount} />
        <MiniStat icon={Eye} label="Faces" value={result?.faces?.length ?? 0} />
        <MiniStat
          icon={Cpu}
          label="Latency"
          value={lastLatency !== null ? `${lastLatency}ms` : '—'}
        />
        <MiniStat icon={Smile} label="Mode" value={webcamMode ? 'Live' : 'Upload'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex gap-1 p-0.5 rounded-lg border border-white/[0.08] bg-white/[0.02]">
              <button
                onClick={() => stopWebcam()}
                className={clsx(
                  'flex-1 h-8 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5',
                  !webcamMode ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Upload size={12} /> Upload
              </button>
              <button
                onClick={webcamMode ? stopWebcam : startWebcam}
                className={clsx(
                  'flex-1 h-8 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5',
                  webcamMode ? 'bg-white text-zinc-900' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Camera size={12} /> Webcam
              </button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <div className={webcamMode ? 'relative' : 'hidden'}>
              <video ref={videoRef} className="w-full rounded-lg" playsInline muted />
              <canvas
                ref={overlayRef}
                className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full',
                    liveDetecting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400',
                  )}
                />
                <span className="text-[10px] font-mono text-white">
                  {liveDetecting ? 'Analysing' : 'Live'}
                </span>
              </div>
              <button
                onClick={stopWebcam}
                className="absolute top-2 right-2 bg-black/60 hover:bg-rose-600/80 text-white rounded-full p-1"
              >
                <X size={12} />
              </button>
            </div>

            {!webcamMode && (
              <>
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="uploaded"
                      className="w-full rounded-lg max-h-[260px] object-cover"
                    />
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setResult(null);
                      }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-rose-600/80 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center gap-2 h-[160px] border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={20} className="text-zinc-600" />
                    <span className="text-xs text-zinc-500">Click to upload an image</span>
                  </label>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickFile}
                />
                <button
                  onClick={analyse}
                  disabled={loading || !file}
                  className="btn-primary justify-center disabled:opacity-40"
                >
                  {loading ? 'Analysing…' : 'Detect emotion'}
                </button>
              </>
            )}

            {webcamMode && (
              <p className="text-[11px] text-zinc-600 text-center flex items-center justify-center gap-1">
                <Zap size={10} className="text-zinc-500" />
                Auto-detecting every 1s
              </p>
            )}
          </div>

          {history.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-2">
              <span className="text-xs text-zinc-500 mb-1">Recent</span>
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.02]">
                  <img src={h.preview} alt="" className="w-9 h-9 object-cover rounded-md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">
                      {EMOTION_EMOJI[h.result.dominant_emotion] ?? '😐'}{' '}
                      {h.result.dominant_emotion || '—'}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-600">{h.ts}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {result && result.face_detected ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 flex items-center gap-5">
                <div className="w-20 h-20 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-5xl shrink-0">
                  {EMOTION_EMOJI[result.dominant_emotion] ?? '😐'}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500 mb-1">Dominant</p>
                  <p
                    className="text-2xl font-semibold capitalize tracking-tight"
                    style={{ color: EMOTION_COLOR[result.dominant_emotion] ?? '#a1a1aa' }}
                  >
                    {result.dominant_emotion || 'unknown'}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <Chip variant="emerald">Face detected</Chip>
                    {result.faces?.length ? (
                      <Chip>{result.faces.length} region(s)</Chip>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-xs text-zinc-500 mb-4">Distribution</p>
                <div className="flex flex-col gap-2.5">
                  {sorted.map(([emo, val], i) => (
                    <div key={emo} className="flex items-center gap-3">
                      <span className="text-sm w-6 text-center">
                        {EMOTION_EMOJI[emo] ?? '😐'}
                      </span>
                      <span className="text-xs text-zinc-400 capitalize w-16">{emo}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: EMOTION_COLOR[emo] ?? '#94a3b8' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${val * 100}%` }}
                          transition={{ delay: i * 0.03, duration: 0.45 }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 w-11 text-right">
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState
                icon={Smile}
                title={
                  webcamMode
                    ? result
                      ? 'No face in frame'
                      : 'Waiting for first read…'
                    : 'Awaiting input'
                }
                description={
                  webcamMode
                    ? 'Move into frame — analysis runs every second.'
                    : 'Upload an image or switch to webcam mode.'
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Smile;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <Icon size={13} className="text-zinc-500 mb-2" />
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-zinc-50 mt-0.5 leading-none">{value}</p>
    </div>
  );
}
