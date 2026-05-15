import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, ChevronRight, Clock, Film } from 'lucide-react';
import DropZone from '../components/DropZone';
import ConfidenceRing from '../components/ConfidenceRing';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import { useToast } from '../App';
import { api, getStaticUrl } from '../lib/api';
import { VideoMatchResponse, VideoMatchResult } from '../types';
import { formatTime } from '../lib/utils';

const PAGE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const SCAN_MSGS = [
  'Extracting reference face encoding…',
  'Scanning video frames…',
  'Running face detection…',
  'Computing match distances…',
  'Aggregating results…',
  'Almost done…',
];

export default function VideoMatch() {
  const { toast } = useToast();
  const [refImg, setRefImg] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.6);
  const [frameSkip, setFrameSkip] = useState(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<VideoMatchResponse | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startProgress() {
    setProgress(0);
    setMsgIdx(0);
    progressRef.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 2.5 : p));
    }, 300);
    msgRef.current = setInterval(() => {
      setMsgIdx((i) => (i + 1) % SCAN_MSGS.length);
    }, 2200);
  }

  function stopProgress() {
    if (progressRef.current) clearInterval(progressRef.current);
    if (msgRef.current) clearInterval(msgRef.current);
    setProgress(100);
  }

  useEffect(() => () => {
    if (progressRef.current) clearInterval(progressRef.current);
    if (msgRef.current) clearInterval(msgRef.current);
  }, []);

  async function handleSubmit() {
    if (!refImg || !video) { toast('Upload both reference image and video.', 'warning'); return; }
    setLoading(true);
    setResult(null);
    startProgress();
    try {
      const fd = new FormData();
      fd.append('reference_image', refImg);
      fd.append('video', video);
      fd.append('threshold', String(threshold));
      fd.append('frame_skip', String(frameSkip));
      const { data } = await api.post<VideoMatchResponse>('/api/match/video', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      });
      stopProgress();
      setResult(data);
      if (data.matches.length === 0) {
        toast('No face matches found in video.', 'info');
      } else {
        toast(`Found ${data.matches.length} match${data.matches.length > 1 ? 'es' : ''}!`, 'success');
      }
    } catch (err: unknown) {
      stopProgress();
      setProgress(0);
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Processing failed.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  function exportJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'facematcher-results.json';
    a.click();
  }

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <PageHeader
        icon={Film}
        eyebrow="MODULE · 01"
        title="Video Match"
        accent="#3B82F6, #06B6D4"
        subtitle="Scan a video for a reference face and extract matched frames with timestamps."
      />

      {/* Upload + config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DropZone accept="image" file={refImg} onFile={setRefImg} label="Reference Face" />
        <DropZone accept="video" file={video} onFile={setVideo} label="Target Video" />
      </div>

      {/* Config */}
      <div className="glass p-5 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-1">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Confidence Threshold
          </label>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range" min={0.3} max={0.95} step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="font-mono text-blue-400 text-sm w-10 text-right">{(threshold * 100).toFixed(0)}%</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-mono">higher = stricter matching</p>
        </div>
        <div className="flex-1">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Frame Skip
          </label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[2, 5, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => setFrameSkip(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-150 ${
                  frameSkip === n
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                    : 'border-blue-500/10 text-slate-500 hover:text-slate-300 hover:border-blue-500/25'
                }`}
              >
                every {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1 font-mono">process 1 frame every N</p>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || !refImg || !video}
        className="btn-primary flex items-center gap-2 self-start disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Play size={15} />
        {loading ? 'Processing…' : 'Scan Video'}
      </button>

      {/* Progress */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{SCAN_MSGS[msgIdx]}</span>
            <span className="text-xs font-mono text-blue-400">{Math.floor(progress)}%</span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs text-slate-600 font-mono">Running face_recognition engine…</span>
          </div>
        </motion.div>
      )}

      {/* Skeleton */}
      {loading && !result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Skeleton className="h-40" count={4} />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
          {/* Stats bar */}
          <div className="glass p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Matches', value: result.matches.length, highlight: result.matches.length > 0 },
              { label: 'Frames Scanned', value: result.total_frames_scanned },
              { label: 'Duration', value: formatTime(result.video_duration_seconds) },
              { label: 'FPS', value: result.fps.toFixed(1) },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="text-xs font-mono text-slate-600 uppercase tracking-widest">{s.label}</span>
                <span className={`font-syne font-bold text-xl ${s.highlight ? 'text-green-400' : 'text-white'}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <button onClick={exportJSON} className="btn-ghost flex items-center gap-2 text-xs">
              <Download size={14} /> Export JSON
            </button>
          </div>

          {/* Timeline */}
          {result.matches.length > 0 ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 w-max">
                {result.matches.map((m: VideoMatchResult, i: number) => (
                  <MatchCard key={i} match={m} index={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="glass p-12 flex flex-col items-center gap-3">
              <span className="text-4xl">🔍</span>
              <p className="text-slate-400 font-sans text-sm">No face matches found. Try lowering the threshold.</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function MatchCard({ match, index }: { match: VideoMatchResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="glass glass-hover flex flex-col gap-2 p-3 w-[180px] shrink-0"
    >
      <img
        src={getStaticUrl(match.frame_url)}
        alt={`Match at ${formatTime(match.timestamp_seconds)}`}
        className="w-full h-[110px] object-cover rounded-xl bg-navy-800"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <Clock size={11} />
          {formatTime(match.timestamp_seconds)}
        </div>
        <ConfidenceRing confidence={match.confidence} size={44} />
      </div>
      <div className="flex items-center gap-1.5">
        <ChevronRight size={11} className="text-slate-600" />
        <span className="text-xs font-mono text-slate-600">frame {match.frame_number}</span>
      </div>
    </motion.div>
  );
}
