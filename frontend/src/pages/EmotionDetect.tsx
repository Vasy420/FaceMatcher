import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Zap } from 'lucide-react';
import { useToast } from '../App';
import { api } from '../lib/api';
import { EmotionResponse, EmotionFace } from '../types';
import { EMOTION_EMOJI, EMOTION_COLOR } from '../lib/utils';

const PAGE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
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
      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      // Corner brackets
      const cs = 10;
      ctx.lineWidth = 3;
      [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([bx,by,dx,dy]) => {
        ctx.beginPath(); ctx.moveTo(bx as number,(by as number)+(dy as number)*cs); ctx.lineTo(bx as number,by as number); ctx.lineTo((bx as number)+(dx as number)*cs,by as number); ctx.stroke();
      });
      // Label background
      const labelY = y > 30 ? y - 28 : y + h;
      ctx.fillStyle = color + 'dd';
      ctx.fillRect(x, labelY, w, 26);
      // Label text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px JetBrains Mono, monospace';
      ctx.fillText(`${emoji} ${face.dominant_emotion}`, x + 6, labelY + 17);
    }
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast('Image too large (max 5 MB).', 'error'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    e.target.value = '';
  }

  async function captureAndDetect() {
    if (detectingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      detectingRef.current = true;
      setLiveDetecting(true);
      try {
        const fd = new FormData();
        fd.append('image', new File([blob], 'live.jpg', { type: 'image/jpeg' }));
        const { data } = await api.post<EmotionResponse>('/api/emotion/detect', fd);
        setResult(data);
      } catch { /* silent on individual frame errors */ }
      finally {
        detectingRef.current = false;
        setLiveDetecting(false);
      }
    }, 'image/jpeg', 0.7);
  }

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      videoRef.current!.srcObject = stream;
      await videoRef.current!.play();
      setWebcamMode(true);
      setResult(null);
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
    if (!file) { toast('Upload an image first.', 'warning'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post<EmotionResponse>('/api/emotion/detect', fd);
      setResult(data);
      if (preview) {
        const item: HistoryItem = {
          id: Math.random().toString(36).slice(2),
          preview,
          result: data,
          ts: new Date().toLocaleTimeString(),
        };
        setHistory((h) => [item, ...h].slice(0, 5));
      }
      toast(`Dominant emotion: ${data.dominant_emotion}`, 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Analysis failed.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  const sorted = result
    ? Object.entries(result.emotions).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <div>
        <h1 className="font-syne font-bold text-2xl text-white">Emotion Detection</h1>
        <p className="text-sm text-slate-500 mt-1">Live webcam detection or upload a photo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        {/* Upload / webcam */}
        <div className="flex flex-col gap-4">
          <div className="glass p-4 flex flex-col gap-3">
            {/* Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { stopWebcam(); }}
                className={`flex-1 py-2 text-xs font-mono rounded-xl border transition-all duration-150 ${
                  !webcamMode ? 'bg-blue-600/15 border-blue-500/40 text-blue-300' : 'border-blue-500/10 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Upload size={12} className="inline mr-1.5" />Upload
              </button>
              <button
                onClick={webcamMode ? stopWebcam : startWebcam}
                className={`flex-1 py-2 text-xs font-mono rounded-xl border transition-all duration-150 ${
                  webcamMode ? 'bg-blue-600/15 border-blue-500/40 text-blue-300' : 'border-blue-500/10 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Camera size={12} className="inline mr-1.5" />Webcam
              </button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
            <div className={webcamMode ? 'relative' : 'hidden'}>
              <video ref={videoRef} className="w-full rounded-xl" playsInline muted />
              {/* Live badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${liveDetecting ? 'bg-amber-400 animate-pulse' : 'bg-green-400 animate-ping'}`} />
                <span className="text-[10px] font-mono text-white uppercase tracking-widest">
                  {liveDetecting ? 'Analysing' : 'Live'}
                </span>
              </div>
              <button onClick={stopWebcam} className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-1">
                <X size={12} />
              </button>
            </div>

            {!webcamMode && (
              <>
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="uploaded" className="w-full rounded-xl max-h-[280px] object-cover" />
                    <button
                      onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-600/80 text-white rounded-full p-1 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center gap-2 h-[180px] border-2 border-dashed border-blue-500/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={24} className="text-slate-600" />
                    <span className="text-xs text-slate-600 font-sans">Click or drag an image</span>
                    <span className="text-[10px] font-mono text-slate-700">JPG · PNG · max 5 MB</span>
                  </label>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
                <button
                  onClick={analyse}
                  disabled={loading || !file}
                  className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading ? 'Analysing…' : 'Detect Emotion'}
                </button>
              </>
            )}

            {webcamMode && (
              <p className="text-xs font-mono text-slate-600 text-center">
                <Zap size={10} className="inline mr-1 text-amber-500" />
                Auto-detecting every 1s
              </p>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="glass p-4 flex flex-col gap-3">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Recent</span>
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 bg-navy-800/50 rounded-xl px-3 py-2">
                    <img src={h.preview} alt="" className="w-10 h-10 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-white truncate">
                        {EMOTION_EMOJI[h.result.dominant_emotion] ?? '😐'} {h.result.dominant_emotion}
                      </p>
                      <p className="text-[10px] font-mono text-slate-600">{h.ts}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="flex flex-col gap-4"
            >
              {/* Dominant emotion hero */}
              <div className="glass p-6 flex flex-col items-center gap-3 text-center">
                <div className="text-7xl">
                  {EMOTION_EMOJI[result.dominant_emotion] ?? '😐'}
                </div>
                <p
                  className="font-syne font-bold text-2xl uppercase tracking-widest transition-colors duration-500"
                  style={{ color: EMOTION_COLOR[result.dominant_emotion] ?? '#94a3b8' }}
                >
                  {result.dominant_emotion}
                </p>
                {!result.face_detected && (
                  <p className="text-xs font-mono text-amber-400">No face confidently detected</p>
                )}
              </div>

              {/* Bar chart */}
              <div className="glass p-4 flex flex-col gap-3">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">All Emotions</span>
                <div className="flex flex-col gap-2.5">
                  {sorted.map(([emo, val], i) => (
                    <div key={emo} className="flex items-center gap-3">
                      <span className="text-lg w-8">{EMOTION_EMOJI[emo] ?? '😐'}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: EMOTION_COLOR[emo] ?? '#94a3b8' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${val * 100}%` }}
                            transition={{ delay: i * 0.03, duration: 0.4, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400 w-10 text-right">
                          {(val * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[300px]"
            >
              <div className="text-5xl animate-float">😶</div>
              <p className="text-slate-500 text-sm font-sans">
                {webcamMode ? 'Waiting for first detection…' : 'Upload an image and click Detect Emotion'}
              </p>
              <p className="text-slate-700 text-xs font-mono">7 emotions · DeepFace engine</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
