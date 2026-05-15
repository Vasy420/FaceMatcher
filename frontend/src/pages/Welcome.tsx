import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Film,
  Camera,
  Database,
  Smile,
  ArrowRight,
  Sparkles,
  Cpu,
  Shield,
  Zap,
  Github,
  ScanFace,
  Upload,
  Brain,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const FEATURES = [
  {
    icon: Film,
    title: 'Video Match',
    blurb:
      'Drop in a reference photo and any video — FaceMatcher scrubs every frame, returns timestamps where the face appears, and gives you clickable thumbnails.',
    bullets: ['Frame-accurate timestamps', 'Confidence scoring per hit', 'Direct seek-to-frame'],
    to: '/video',
    accent: 'from-blue-500 to-cyan-400',
    span: 'lg:col-span-2',
  },
  {
    icon: Camera,
    title: 'Live Camera',
    blurb:
      'Real-time WebSocket pipeline. Upload a reference face and FaceMatcher streams matches over a live webcam feed — boxes draw as the model sees you.',
    bullets: ['<200ms inference loop', 'WebSocket streaming', 'On-canvas annotations'],
    to: '/live',
    accent: 'from-violet-500 to-fuchsia-400',
    span: 'lg:col-span-1',
  },
  {
    icon: Database,
    title: 'Face Database',
    blurb:
      'Persistent SQLite-backed gallery. Enroll any number of named faces; identify groups; lookup by embedding distance with sub-second response.',
    bullets: ['Named enrollment', 'Group identification', '128-D face embeddings'],
    to: '/database',
    accent: 'from-emerald-500 to-teal-400',
    span: 'lg:col-span-1',
  },
  {
    icon: Smile,
    title: 'Emotion Detect',
    blurb:
      'DeepFace + MTCNN reads 7 emotions live from your webcam at 1Hz. Animated bar chart + dominant-emotion emoji update without you lifting a finger.',
    bullets: ['7-class emotion model', 'Live polling, no clicks', 'Auto face detection'],
    to: '/emotion',
    accent: 'from-amber-500 to-orange-400',
    span: 'lg:col-span-2',
  },
];

const STACK = [
  { name: 'FastAPI', tag: 'Backend' },
  { name: 'face_recognition', tag: 'dlib + ResNet' },
  { name: 'DeepFace', tag: 'Emotion' },
  { name: 'OpenCV', tag: 'Vision' },
  { name: 'SQLite', tag: 'Storage' },
  { name: 'React 18', tag: 'UI' },
  { name: 'Vite', tag: 'Bundler' },
  { name: 'Tailwind', tag: 'Styles' },
  { name: 'Framer Motion', tag: 'Anim' },
  { name: 'WebSockets', tag: 'Live' },
];

const STEPS = [
  {
    n: '01',
    icon: Upload,
    title: 'Upload',
    body: 'Drop a reference image, a video, or open your webcam. Files stay local — nothing leaves your machine.',
  },
  {
    n: '02',
    icon: Brain,
    title: 'Analyse',
    body: 'A FastAPI service runs face_recognition + DeepFace on the input. 128-D embeddings are compared by Euclidean distance.',
  },
  {
    n: '03',
    icon: Activity,
    title: 'Visualise',
    body: 'Matches render as confidence rings, bounded boxes, live charts and animated overlays — built for fast scanning.',
  },
];

function FaceMesh() {
  const dots = Array.from({ length: 28 });
  return (
    <div className="relative aspect-square w-full max-w-[440px] mx-auto">
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 via-violet-500/10 to-cyan-400/20 blur-3xl" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-6 rounded-full border border-blue-500/20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-12 rounded-full border border-violet-500/20"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-20 rounded-full border border-cyan-400/20"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-44 h-44 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl shadow-blue-500/20">
          <ScanFace size={72} strokeWidth={1.2} className="text-white/90" />
          <div className="scan-line" style={{ top: '50%' }} />
        </div>
      </div>
      {dots.map((_, i) => {
        const angle = (i / dots.length) * Math.PI * 2;
        const r = 38 + (i % 3) * 6;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-blue-400"
            style={{ left: `${x}%`, top: `${y}%` }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
            transition={{ duration: 2 + (i % 5) * 0.3, repeat: Infinity, delay: i * 0.05 }}
          />
        );
      })}
    </div>
  );
}

export default function Welcome() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOp = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Aurora background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(600px circle at ${mouse.x * 100}% ${mouse.y * 100}%, rgba(99,102,241,0.10), transparent 50%),
            radial-gradient(800px circle at 80% 10%, rgba(34,211,238,0.08), transparent 55%),
            radial-gradient(700px circle at 10% 80%, rgba(168,85,247,0.07), transparent 55%)
          `,
        }}
      />

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex items-center px-6 lg:px-12 overflow-hidden"
      >
        <motion.div
          style={{ y: heroY, opacity: heroOp }}
          className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center w-full max-w-7xl mx-auto"
        >
          {/* Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
            >
              <Sparkles size={12} className="text-blue-300" />
              <span className="text-xs font-mono text-blue-300 tracking-wider">
                AI VISION · LOCAL · REAL-TIME
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-syne font-bold text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
            >
              See faces.{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                  Read emotion.
                </span>
              </span>
              <br />
              All on your own machine.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 text-lg text-slate-400 max-w-xl leading-relaxed"
            >
              FaceMatcher is a self-hosted computer-vision workspace. Match a person across videos,
              identify a group photo, run a live recognition feed, or read live emotion from your
              webcam — all powered by face_recognition, DeepFace and a FastAPI core. Zero cloud
              calls.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/video"
                className="group relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-syne font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span>Launch Workspace</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/emotion"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 text-slate-200 font-syne font-medium hover:bg-white/5 hover:border-white/30 transition-all"
              >
                <Smile size={16} />
                <span>Try Emotion Demo</span>
              </Link>
            </motion.div>

            {/* Inline stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-14 grid grid-cols-3 gap-6 max-w-md"
            >
              {[
                { v: '4', l: 'Vision Models' },
                { v: '~120ms', l: 'Live Latency' },
                { v: '100%', l: 'Local Inference' },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-syne text-2xl font-bold text-white">{s.v}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1 tracking-wider uppercase">
                    {s.l}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
          >
            <FaceMesh />
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-slate-500 tracking-widest"
        >
          SCROLL ↓
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="px-6 lg:px-12 py-24 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mb-14"
          >
            <p className="text-xs font-mono text-blue-400 tracking-widest mb-3">/ FEATURES</p>
            <h2 className="font-syne font-bold text-4xl md:text-5xl text-white max-w-3xl leading-tight">
              Four lenses on the same{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                vision stack
              </span>
              .
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl">
              Each module is a focused workspace. Switch with one click. They share the same backend
              embeddings — train once, recognise everywhere.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.55, delay: i * 0.08 }}
                  className={`${f.span} group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/20 transition-all duration-500`}
                >
                  <div
                    className={`absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br ${f.accent} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity duration-500`}
                  />
                  <div className="relative p-7 lg:p-8 flex flex-col h-full min-h-[300px]">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center shadow-lg`}
                      >
                        <Icon size={22} className="text-white" />
                      </div>
                      <Link
                        to={f.to}
                        className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300"
                      >
                        <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10">
                          <ArrowRight size={14} className="text-white" />
                        </div>
                      </Link>
                    </div>

                    <h3 className="font-syne font-bold text-2xl text-white mb-3">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-5">{f.blurb}</p>

                    <ul className="mt-auto space-y-2">
                      {f.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2 text-xs font-mono text-slate-500"
                        >
                          <CheckCircle2 size={12} className="text-blue-400/70" />
                          {b}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={f.to}
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-syne font-semibold text-white hover:text-blue-300 transition-colors"
                    >
                      Open module
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 lg:px-12 py-24 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mb-14 max-w-2xl"
          >
            <p className="text-xs font-mono text-blue-400 tracking-widest mb-3">/ WORKFLOW</p>
            <h2 className="font-syne font-bold text-4xl md:text-5xl text-white leading-tight">
              From pixel to{' '}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-300 bg-clip-text text-transparent">
                prediction
              </span>{' '}
              in three steps.
            </h2>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-blue-500/0" />
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="relative p-7 rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Icon size={24} className="text-blue-300" />
                    </div>
                    <span className="font-syne font-bold text-5xl text-white/5 group-hover:text-white/10">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-syne font-bold text-xl text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="px-6 lg:px-12 py-24 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="grid lg:grid-cols-[1fr_1.3fr] gap-12 items-center"
          >
            <div>
              <p className="text-xs font-mono text-blue-400 tracking-widest mb-3">/ STACK</p>
              <h2 className="font-syne font-bold text-4xl md:text-5xl text-white leading-tight mb-5">
                Boring tech.{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                  Serious results.
                </span>
              </h2>
              <p className="text-slate-400 leading-relaxed">
                FaceMatcher leans on battle-tested OSS — dlib for face descriptors, MTCNN for
                detection, DeepFace for emotion. The frontend is a Vite-powered React app with
                Framer Motion for the small things that make it feel alive.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Shield size={12} className="text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-300">No telemetry</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Cpu size={12} className="text-blue-400" />
                  <span className="text-xs font-mono text-blue-300">CPU friendly</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Zap size={12} className="text-amber-400" />
                  <span className="text-xs font-mono text-amber-300">Hot-reload dev</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STACK.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
                >
                  <p className="font-syne font-semibold text-sm text-white">{s.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1 tracking-wider uppercase">
                    {s.tag}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-24 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 p-10 md:p-16 text-center"
            style={{
              background:
                'radial-gradient(ellipse at top, rgba(99,102,241,0.20), transparent 60%), linear-gradient(180deg, rgba(17,28,53,0.6), rgba(10,15,30,0.6))',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
            <h2 className="font-syne font-bold text-3xl md:text-5xl text-white leading-tight">
              Spin it up in{' '}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                under a minute
              </span>
              .
            </h2>
            <p className="text-slate-400 mt-5 max-w-xl mx-auto">
              Pick a module and start. Reference images, video files, your webcam — FaceMatcher
              takes whatever you throw at it.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/video"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white font-syne font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/60 hover:-translate-y-0.5 transition-all"
              >
                Enter Workspace
                <ArrowRight size={16} />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl border border-white/15 text-slate-200 font-syne font-medium hover:bg-white/5 hover:border-white/30 transition-all"
              >
                <Github size={16} />
                View Source
              </a>
            </div>
          </motion.div>

          <p className="text-center text-xs font-mono text-slate-600 mt-12 tracking-wider">
            BUILT WITH FASTAPI · DEEPFACE · REACT · © FACEMATCHER
          </p>
        </div>
      </section>
    </motion.div>
  );
}
