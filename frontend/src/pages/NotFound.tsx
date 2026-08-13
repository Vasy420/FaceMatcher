import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4"
    >
      <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-4">
        <Compass size={22} className="text-blue-300" />
      </div>
      <p className="text-[10px] font-mono text-slate-500 tracking-[0.25em] uppercase">404</p>
      <h1 className="font-syne font-bold text-3xl text-white mt-2">This page isn’t in the workspace</h1>
      <p className="text-slate-400 mt-2 max-w-md">The route doesn’t match a FaceMatcher module. Head back to the dashboard or jump into a scan.</p>
      <div className="flex flex-wrap gap-3 mt-6 justify-center">
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <Link to="/video" className="btn-ghost h-10 inline-flex items-center">Video Match</Link>
      </div>
    </motion.div>
  );
}
