import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Cpu,
  Database,
  Film,
  Lock,
  ScanFace,
  Smile,
} from 'lucide-react';
import Logo from '../components/Logo';
import InteractiveMark from '../components/InteractiveMark';
import WakeServerButton from '../components/WakeServerButton';
import { API_ONLINE_EVENT, checkHealth } from '../lib/api';

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const CAPABILITIES = [
  {
    icon: Film,
    title: 'Find a person in a video',
    body: 'Upload a reference face and a clip. FaceMatcher scans frames, scores every detection, and returns timestamps with stills you can open.',
  },
  {
    icon: ScanFace,
    title: 'Or find any image, not just a face',
    body: 'Image match uses multi-scale template matching — logos, objects, a crop of clothing. Useful when you do not have a clean face photo.',
  },
  {
    icon: Camera,
    title: 'Match live from a webcam',
    body: 'A WebSocket stream encodes your camera at a few frames per second and draws boxes in place. Green means match. Red means someone else.',
  },
  {
    icon: Database,
    title: 'Keep a private face gallery',
    body: 'Enroll people by name. Later, drop a group photo and the app labels who it recognises from your local SQLite store.',
  },
  {
    icon: Smile,
    title: 'Read emotion',
    body: 'Seven classes — angry, disgust, fear, happy, sad, surprise, neutral — from a still or a live camera, powered by DeepFace.',
  },
  {
    icon: Lock,
    title: 'Nothing is uploaded',
    body: 'Encodings, frames, and the database live on this computer. There is no account, no cloud API, and no telemetry.',
  },
];

const PIPELINE = [
  {
    n: '01',
    title: 'Encode',
    body: 'A face becomes a 128-number vector (dlib). An arbitrary image becomes a multi-scale template.',
  },
  {
    n: '02',
    title: 'Search',
    body: 'Video is walked frame-by-frame. Live camera is sampled over a socket. Photos are compared to the gallery.',
  },
  {
    n: '03',
    title: 'Report',
    body: 'Hits come back with confidence, a timestamp, and an annotated still. You decide what to keep.',
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkHealth().then((ok) => {
      if (!cancelled) setApiDown(!ok);
    });
    const onOnline = () => setApiDown(false);
    window.addEventListener(API_ONLINE_EVENT, onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener(API_ONLINE_EVENT, onOnline);
    };
  }, []);

  function enter() {
    navigate('/home');
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top bar — landing only */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 h-14 sm:h-16 px-4 sm:px-10 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <Logo to="/" size={32} />
        <div className="flex items-center gap-2 shrink-0">
          {apiDown && <WakeServerButton compact onOnline={() => setApiDown(false)} />}
          <button type="button" onClick={enter} className="btn-primary h-9 px-3 sm:px-4 text-sm shrink-0">
            <span className="sm:hidden">Enter</span>
            <span className="hidden sm:inline">Enter dashboard</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 sm:px-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 70% 0%, rgba(129,140,248,0.10), transparent 55%)',
            }}
          />
          <div className="relative max-w-5xl mx-auto py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <motion.div {...fade} transition={{ duration: 0.45 }}>
              <p className="text-[11px] font-mono tracking-[0.22em] uppercase text-zinc-500 mb-5">
                Academic project · local vision
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.35rem] font-medium tracking-tight leading-[1.12] text-balance">
                A small studio for
                <br />
                <span className="text-zinc-500">finding faces in the wild.</span>
              </h1>
              <p className="mt-6 text-base sm:text-[17px] text-zinc-400 max-w-xl leading-relaxed">
                FaceMatcher is a self-hosted web app that answers a simple question:
                <span className="text-zinc-200"> does this person appear here?</span> It
                searches videos, watches a webcam, remembers named faces, and can read
                emotion — all on your machine.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" onClick={enter} className="btn-primary h-11 px-6">
                  Enter dashboard <ArrowRight size={15} />
                </button>
                <a href="#what-it-does" className="btn-outline h-11 px-5">
                  What it does
                </a>
              </div>
            </motion.div>

            <motion.div
              {...fade}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="flex justify-center lg:justify-end pt-4 lg:pt-0"
            >
              <InteractiveMark />
            </motion.div>
          </div>
        </section>

        {/* What it is */}
        <section className="px-6 sm:px-10 py-16 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-10">
            <div>
              <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-2">
                What this is
              </p>
              <h2 className="font-display text-3xl tracking-tight text-zinc-50">
                Built to look, not to phone home.
              </h2>
            </div>
            <div className="text-[15px] text-zinc-400 leading-relaxed space-y-4">
              <p>
                This started as two attempts at the same idea. The first was a Streamlit
                tool that hunted for an image inside a video. The second was a full
                recognition stack — faces, live camera, a database, emotion. FaceMatcher
                is those two projects combined into one quiet interface.
              </p>
              <p>
                It is meant for demos, coursework, and local experiments: “is this
                person in the lecture recording?”, “who is in this photo?”, “what is
                the expression right now?”. It is not a surveillance product and it
                does not send frames anywhere.
              </p>
              <p className="text-zinc-500 text-sm">
                Stack: FastAPI, dlib / face_recognition, OpenCV, DeepFace, React, SQLite.
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="what-it-does" className="px-6 sm:px-10 py-16 border-t border-white/[0.06] scroll-mt-20">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-2">
              What it does
            </p>
            <h2 className="font-display text-3xl tracking-tight text-zinc-50 mb-10">
              Six things the workspace can do
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CAPABILITIES.map((c, i) => (
                <motion.article
                  key={c.title}
                  {...fade}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
                    <c.icon size={16} className="text-zinc-300" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-sm font-medium text-zinc-100">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{c.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section className="px-6 sm:px-10 py-16 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-zinc-600 mb-2">
              Under the hood
            </p>
            <h2 className="font-display text-3xl tracking-tight text-zinc-50 mb-10">
              Encode. Search. Report.
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden border border-white/[0.06]">
              {PIPELINE.map((s) => (
                <li key={s.n} className="bg-zinc-950 p-7">
                  <span className="font-mono text-[11px] text-indigo-300/80 tracking-widest">{s.n}</span>
                  <h3 className="mt-3 font-display text-2xl text-zinc-50 tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <Cpu size={16} className="text-zinc-500 mt-0.5 shrink-0" />
              <p className="text-sm text-zinc-500 leading-relaxed">
                Face distance is mapped to confidence as <span className="font-mono text-zinc-400">1 − distance</span>.
                Template matches use OpenCV’s normalised correlation. Video hits are
                de-duplicated to about one per second so the results stay readable.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 sm:px-10 py-16 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl tracking-tight text-zinc-50">
                Ready when you are.
              </h2>
              <p className="mt-3 text-[15px] text-zinc-400 leading-relaxed">
                Open the dashboard to enroll a face, scan a video, or start the live
                feed. You can return here any time from the sidebar.
              </p>
            </div>
            <button type="button" onClick={enter} className="btn-primary h-12 px-7 self-start sm:self-auto">
              Continue to dashboard <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <footer className="px-6 sm:px-10 py-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs text-zinc-600">FaceMatcher · v2.0 · runs only on this computer</p>
        <button
          type="button"
          onClick={enter}
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors text-left"
        >
          Skip intro →
        </button>
      </footer>
    </div>
  );
}
