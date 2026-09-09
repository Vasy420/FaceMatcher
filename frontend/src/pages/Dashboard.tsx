import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Activity,
  Camera,
  Database,
  Film,
  Smile,
  Users,
  ArrowRight,
  LayoutDashboard,
  ScanFace,
  CircleDot,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { api, API_ONLINE_EVENT, checkHealth } from '../lib/api';
import WakeServerButton from '../components/WakeServerButton';
import { Face } from '../types';
import {
  ActivityEvent,
  getActivity,
  getDailyCounts,
  subscribeActivity,
} from '../lib/activity';
import { formatRelative } from '../lib/utils';

const PAGE = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const KIND_ICON = {
  video: Film,
  identify: ScanFace,
  emotion: Smile,
  live: Camera,
  register: Users,
  delete: Activity,
} as const;

const MODULES = [
  {
    to: '/video',
    icon: Film,
    title: 'Video Match',
    blurb: 'Find a face — or any image — across every frame.',
  },
  {
    to: '/live',
    icon: Camera,
    title: 'Live Camera',
    blurb: 'Real-time face matching over WebSocket.',
  },
  {
    to: '/database',
    icon: Database,
    title: 'Face Database',
    blurb: 'Enroll names and identify faces in photos.',
  },
  {
    to: '/emotion',
    icon: Smile,
    title: 'Emotion',
    blurb: 'Seven-class emotion analysis from images or webcam.',
  },
];

export default function Dashboard() {
  const [faces, setFaces] = useState<Face[]>([]);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>(() => getActivity());

  useEffect(() => subscribeActivity(() => setActivity(getActivity())), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get<{ faces: Face[] }>('/api/faces/list');
        if (!cancelled) setFaces(data.faces ?? []);
      } catch {
        /* offline */
      }
    };
    const ping = async () => {
      const t = performance.now();
      const ok = await checkHealth();
      if (!cancelled) {
        setHealthy(ok);
        setLatency(ok ? Math.round(performance.now() - t) : null);
      }
    };
    load();
    ping();
    const id = setInterval(ping, 8000);
    const onOnline = () => {
      if (!cancelled) {
        setHealthy(true);
        load();
        ping();
      }
    };
    window.addEventListener(API_ONLINE_EVENT, onOnline);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(API_ONLINE_EVENT, onOnline);
    };
  }, []);

  const counts = useMemo(() => getDailyCounts(14), [activity]);
  const eventsToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return activity.filter((a) => new Date(a.ts).toISOString().slice(0, 10) === today).length;
  }, [activity]);
  const totalMatches = activity
    .filter((a) => a.kind === 'video' || a.kind === 'identify' || a.kind === 'live')
    .reduce((s, a) => s + Number(a.meta?.matches ?? 0), 0);

  return (
    <motion.div {...PAGE} className="flex flex-col gap-10">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow={healthy ? 'Online' : healthy === false ? 'Offline' : 'Connecting'}
        title="Dashboard"
        subtitle="Your local workspace. Scan video, match live, manage faces, and read emotion."
        actions={
          <>
            {healthy === false && (
              <WakeServerButton onOnline={() => setHealthy(true)} />
            )}
            <Link to="/video" className="btn-primary">
              Scan video <ArrowRight size={14} />
            </Link>
            <Link to="/live" className="btn-outline">
              Live camera
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Enrolled faces" value={faces.length} hint="SQLite gallery" />
        <StatCard icon={Activity} label="Events today" value={eventsToday} hint={`${activity.length} total`} />
        <StatCard icon={ScanFace} label="Matches logged" value={totalMatches} />
        <StatCard
          icon={CircleDot}
          label="API latency"
          value={latency !== null ? `${latency}ms` : '—'}
          delta={
            latency !== null
              ? { value: latency < 120 ? 'fast' : 'ok', positive: latency < 200 }
              : undefined
          }
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-200">Modules</h2>
            <span className="text-[11px] text-zinc-600">4 active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULES.map(({ to, icon: Icon, title, blurb }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 rounded-lg border border-white/[0.06] bg-transparent hover:bg-white/[0.03] hover:border-white/10 p-3.5 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-zinc-400" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-200">{title}</p>
                    <ArrowRight
                      size={12}
                      className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-200">Activity · 14d</h2>
            <span className="text-[11px] font-mono text-zinc-600">
              {counts.reduce((s, c) => s + c.count, 0)} events
            </span>
          </div>
          <ActivityChart data={counts} />
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-200">Recent</h2>
          <span className="text-[11px] text-zinc-600">{activity.length} stored locally</span>
        </div>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nothing yet"
            description="Run a scan, open live camera, or detect emotion — events appear here."
            action={
              <Link to="/video" className="btn-primary text-xs h-9 px-4">
                First scan <ArrowRight size={12} />
              </Link>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-white/[0.04]">
            {activity.slice(0, 8).map((a) => {
              const Icon = KIND_ICON[a.kind] ?? Activity;
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{a.title}</p>
                    {a.detail && <p className="text-[11px] text-zinc-600 truncate">{a.detail}</p>}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600 shrink-0">
                    {formatRelative(a.ts)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </motion.div>
  );
}

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d) => {
        const h = (d.count / max) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
            <div
              className="w-full rounded-sm bg-zinc-700/80 group-hover:bg-indigo-400/70 transition-colors min-h-[2px]"
              style={{ height: `${Math.max(h, 3)}%` }}
              title={`${d.date}: ${d.count}`}
            />
            <span className="text-[9px] font-mono text-zinc-700">
              {new Date(d.date + 'T12:00:00').getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
