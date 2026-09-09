import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Download,
  ChevronRight,
  Clock,
  Film,
  Filter,
  SortDesc,
  Search,
  AlertCircle,
  ScanFace,
  Image as ImageIcon,
} from 'lucide-react';
import DropZone from '../components/DropZone';
import ConfidenceRing from '../components/ConfidenceRing';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { recordActivity } from '../lib/activity';
import { useToast } from '../App';
import { api, apiErrorMessage, getStaticUrl } from '../lib/api';
import { MatchMode, VideoMatchResponse, VideoMatchResult } from '../types';
import { formatTime } from '../lib/utils';
import clsx from 'clsx';

const PAGE = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const SCAN_MSGS_FACE = [
  'Encoding reference face…',
  'Scanning video frames…',
  'Computing match distances…',
  'Aggregating results…',
];

const SCAN_MSGS_TEMPLATE = [
  'Loading reference image…',
  'Multi-scale template matching…',
  'Scoring frame similarities…',
  'Collecting detections…',
];

export default function VideoMatch() {
  const { toast } = useToast();
  const [mode, setMode] = useState<MatchMode>('face');
  const [refImg, setRefImg] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.6);
  const [frameSkip, setFrameSkip] = useState(5);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<VideoMatchResponse | null>(null);
  const [minConf, setMinConf] = useState(0);
  const [sortBy, setSortBy] = useState<'time' | 'conf'>('time');
  const [view, setView] = useState<'grid' | 'timeline'>('grid');
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const msgs = mode === 'face' ? SCAN_MSGS_FACE : SCAN_MSGS_TEMPLATE;

  const filteredMatches = (result?.matches ?? [])
    .filter((m) => m.confidence >= minConf)
    .sort((a, b) =>
      sortBy === 'time' ? a.timestamp_seconds - b.timestamp_seconds : b.confidence - a.confidence,
    );

  function startProgress() {
    setProgress(0);
    setMsgIdx(0);
    progressRef.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 2.2 : p));
    }, 300);
    msgRef.current = setInterval(() => {
      setMsgIdx((i) => (i + 1) % msgs.length);
    }, 2400);
  }

  function stopProgress() {
    if (progressRef.current) clearInterval(progressRef.current);
    if (msgRef.current) clearInterval(msgRef.current);
    setProgress(100);
  }

  useEffect(
    () => () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    },
    [],
  );

  // Reset result when mode changes
  useEffect(() => {
    setResult(null);
  }, [mode]);

  async function handleSubmit() {
    if (!refImg || !video) {
      toast('Upload both reference image and video.', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    startProgress();
    try {
      const fd = new FormData();
      fd.append('reference_image', refImg);
      fd.append('video', video);
      fd.append('threshold', String(threshold));
      fd.append('frame_skip', String(frameSkip));
      fd.append('mode', mode);
      const { data } = await api.post<VideoMatchResponse>('/api/match/video', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      });
      stopProgress();
      setResult(data);
      const label = mode === 'face' ? 'Face' : 'Image';
      recordActivity({
        kind: 'video',
        title: `${label} scan: ${data.matches.length} match${data.matches.length === 1 ? '' : 'es'}`,
        detail: `${video.name} · ${data.total_frames_scanned} frames · ${data.video_duration_seconds.toFixed(1)}s`,
        meta: { matches: data.matches.length, frames: data.total_frames_scanned },
      });
      if (data.matches.length === 0) {
        toast('No matches found in video.', 'info');
      } else {
        toast(`Found ${data.matches.length} match${data.matches.length > 1 ? 'es' : ''}.`, 'success');
      }
    } catch (err: unknown) {
      stopProgress();
      setProgress(0);
      toast(apiErrorMessage(err, 'Processing failed.'), 'error');
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
        eyebrow="Scan"
        title="Video Match"
        accent="#818cf8"
        subtitle="Find a face with recognition, or any image with multi-scale template matching."
      />

      {/* Mode toggle */}
      <div className="inline-flex self-start p-0.5 rounded-lg border border-white/[0.08] bg-white/[0.02]">
        {(
          [
            { id: 'face' as const, label: 'Face recognition', icon: ScanFace },
            { id: 'template' as const, label: 'Image match', icon: ImageIcon },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-medium transition-all',
              mode === id
                ? 'bg-white text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-600 -mt-3">
        {mode === 'face'
          ? 'Uses dlib face encodings — best for identifying a person across frames.'
          : 'Uses multi-scale OpenCV template matching — finds any reference image (logos, objects, faces).'}
      </p>

      {/* Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DropZone
          accept="image"
          file={refImg}
          onFile={setRefImg}
          label={mode === 'face' ? 'Reference face' : 'Reference image'}
          hint="JPG, PNG · max 5 MB"
        />
        <DropZone
          accept="video"
          file={video}
          onFile={setVideo}
          label="Target video"
          hint="MP4, AVI, MOV · max 10 min / 100 MB"
        />
      </div>

      {/* Config */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col sm:flex-row gap-6">
        <div className="flex-1">
          <label className="text-xs text-zinc-500">
            {mode === 'face' ? 'Confidence threshold' : 'Similarity threshold'}
          </label>
          <div className="flex items-center gap-3 mt-2.5">
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-1"
            />
            <span className="font-mono text-zinc-300 text-sm w-10 text-right">
              {(threshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs text-zinc-500">Frame skip</label>
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {[2, 5, 10, 15].map((n) => (
              <button
                key={n}
                onClick={() => setFrameSkip(n)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-mono border transition-all',
                  frameSkip === n
                    ? 'bg-white text-zinc-900 border-white'
                    : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/15',
                )}
              >
                every {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !refImg || !video}
        className="btn-primary self-start disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Play size={14} />
        {loading ? 'Processing…' : 'Scan video'}
      </button>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">{msgs[msgIdx]}</span>
            <span className="text-xs font-mono text-zinc-400">{Math.floor(progress)}%</span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {loading && !result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Skeleton className="h-36" count={4} />
        </div>
      )}

      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultStat label="Matches" value={result.matches.length} highlight={result.matches.length > 0} />
            <ResultStat label="Frames" value={result.total_frames_scanned} />
            <ResultStat label="Duration" value={formatTime(result.video_duration_seconds)} />
            <ResultStat label="FPS" value={result.fps.toFixed(1)} />
          </div>

          {result.matches.length > 0 ? (
            <>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={12} className="text-zinc-600" />
                  <span className="text-[11px] text-zinc-500">Min conf</span>
                </div>
                <div className="flex gap-1">
                  {[0, 0.5, 0.7, 0.85].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMinConf(v)}
                      className={clsx(
                        'px-2 py-1 rounded-md text-[11px] font-mono border transition-all',
                        minConf === v
                          ? 'bg-white/[0.08] border-white/15 text-zinc-200'
                          : 'border-white/[0.06] text-zinc-500 hover:border-white/12',
                      )}
                    >
                      {v === 0 ? 'all' : `${(v * 100).toFixed(0)}%+`}
                    </button>
                  ))}
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                  <SortDesc size={12} className="text-zinc-600" />
                  <div className="flex gap-1">
                    {(['time', 'conf'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={clsx(
                          'px-2 py-1 rounded-md text-[11px] font-mono border transition-all',
                          sortBy === s
                            ? 'bg-white/[0.08] border-white/15 text-zinc-200'
                            : 'border-white/[0.06] text-zinc-500 hover:border-white/12',
                        )}
                      >
                        {s === 'time' ? 'time' : 'conf'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  {(['grid', 'timeline'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={clsx(
                        'px-2 py-1 rounded-md text-[11px] font-mono border capitalize',
                        view === v
                          ? 'bg-white/[0.08] border-white/15 text-zinc-200'
                          : 'border-white/[0.06] text-zinc-500',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                  <button onClick={exportJSON} className="btn-ghost text-[11px] font-mono h-7 px-2">
                    <Download size={11} /> JSON
                  </button>
                </div>
              </div>

              {view === 'timeline' && (
                <TimelineView matches={filteredMatches} duration={result.video_duration_seconds} />
              )}

              {view === 'grid' &&
                (filteredMatches.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No matches at this threshold"
                    description="Lower the minimum confidence to see more results."
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredMatches.map((m, i) => (
                      <MatchCard key={i} match={m} index={i} />
                    ))}
                  </div>
                ))}
            </>
          ) : (
            <EmptyState
              icon={AlertCircle}
              title="No matches found"
              description={
                mode === 'face'
                  ? 'Try lowering the threshold or use a clearer face photo.'
                  : 'Try a more distinctive reference crop, or lower the similarity threshold.'
              }
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function MatchCard({ match, index }: { match: VideoMatchResult; index: number }) {
  return (
    <motion.a
      href={getStaticUrl(match.frame_url)}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="group flex flex-col gap-2 p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/15 transition-all"
    >
      <div className="relative">
        <img
          src={getStaticUrl(match.frame_url)}
          alt={`Match at ${formatTime(match.timestamp_seconds)}`}
          className="w-full aspect-video object-cover rounded-lg bg-zinc-900"
        />
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white flex items-center gap-1">
          <Clock size={9} /> {formatTime(match.timestamp_seconds)}
        </div>
        <div className="absolute bottom-1.5 right-1.5">
          <ConfidenceRing confidence={match.confidence} size={34} />
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600 px-0.5">
        <span>#{match.frame_number}</span>
        <span className="opacity-0 group-hover:opacity-100 text-zinc-400 flex items-center gap-0.5 transition-opacity">
          open <ChevronRight size={10} />
        </span>
      </div>
    </motion.a>
  );
}

function ResultStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
      <p
        className={`text-xl font-semibold tracking-tight leading-none ${
          highlight ? 'text-emerald-400' : 'text-zinc-50'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TimelineView({ matches, duration }: { matches: VideoMatchResult[]; duration: number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] text-zinc-500">Timeline</span>
        <span className="text-[11px] font-mono text-zinc-600">
          {matches.length} over {formatTime(duration)}
        </span>
      </div>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.08]" />
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <div
            key={p}
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${p * 100}%` }}
          >
            <div className="w-px h-2 bg-white/10 mb-1" />
            <span className="text-[9px] font-mono text-zinc-600">{formatTime(duration * p)}</span>
          </div>
        ))}
        {matches.map((m, i) => {
          const left = duration > 0 ? (m.timestamp_seconds / duration) * 100 : 0;
          return (
            <a
              key={i}
              href={getStaticUrl(m.frame_url)}
              target="_blank"
              rel="noreferrer"
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${left}%` }}
              title={`${formatTime(m.timestamp_seconds)} · ${(m.confidence * 100).toFixed(0)}%`}
            >
              <div
                className="w-2 h-2 rounded-full ring-2 ring-zinc-950 hover:scale-150 transition-transform"
                style={{
                  background:
                    m.confidence > 0.7 ? '#34d399' : m.confidence > 0.5 ? '#fbbf24' : '#f87171',
                }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
