import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, UserCheck, Users, Database } from 'lucide-react';
import { useToast } from '../App';
import { api, getStaticUrl } from '../lib/api';
import { Face, IdentifyResponse, IdentifyResult } from '../types';
import ConfidenceRing from '../components/ConfidenceRing';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';

const PAGE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function FaceDatabase() {
  const { toast } = useToast();
  const [faces, setFaces] = useState<Face[]>([]);
  const [loadingFaces, setLoadingFaces] = useState(true);
  const [registerName, setRegisterName] = useState('');
  const [registerFile, setRegisterFile] = useState<File | null>(null);
  const [registerPreview, setRegisterPreview] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [identifyFile, setIdentifyFile] = useState<File | null>(null);
  const [identifyPreview, setIdentifyPreview] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyResult, setIdentifyResult] = useState<IdentifyResponse | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regFileRef = useRef<HTMLInputElement>(null);
  const idFileRef = useRef<HTMLInputElement>(null);

  async function loadFaces() {
    setLoadingFaces(true);
    try {
      const { data } = await api.get<{ faces: Face[] }>('/api/faces/list');
      setFaces(data.faces);
    } catch {
      toast('Failed to load face database.', 'error');
    } finally {
      setLoadingFaces(false);
    }
  }

  useEffect(() => { loadFaces(); }, []);

  useEffect(() => {
    if (identifyResult && identifyPreview) drawAnnotations(identifyResult.results);
  }, [identifyResult, identifyPreview]);

  useEffect(() => {
    if (!registerFile) {
      setRegisterPreview(null);
      return;
    }
    const url = URL.createObjectURL(registerFile);
    setRegisterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [registerFile]);

  useEffect(() => {
    if (!identifyFile) {
      setIdentifyPreview(null);
      return;
    }
    const url = URL.createObjectURL(identifyFile);
    setIdentifyPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [identifyFile]);

  async function handleRegister() {
    if (!registerName.trim()) { toast('Enter a name.', 'warning'); return; }
    if (!registerFile) { toast('Upload an image.', 'warning'); return; }
    setRegistering(true);
    try {
      const fd = new FormData();
      fd.append('name', registerName.trim());
      fd.append('image', registerFile);
      await api.post('/api/faces/register', fd);
      toast(`"${registerName}" registered!`, 'success');
      setRegisterName('');
      setRegisterFile(null);
      setRegisterPreview(null);
      loadFaces();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Registration failed.';
      toast(msg, 'error');
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    try {
      await api.delete(`/api/faces/${id}`);
      setFaces((p) => p.filter((f) => f.id !== id));
      toast(`"${name}" removed.`, 'success');
    } catch {
      toast('Delete failed.', 'error');
    }
  }

  async function handleIdentify() {
    if (!identifyFile) { toast('Upload an image to identify.', 'warning'); return; }
    setIdentifying(true);
    setIdentifyResult(null);
    try {
      const fd = new FormData();
      fd.append('image', identifyFile);
      const { data } = await api.post<IdentifyResponse>('/api/faces/identify', fd);
      setIdentifyResult(data);
      toast(`${data.face_count} face(s) analysed.`, 'info');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Identification failed.';
      toast(msg, 'error');
    } finally {
      setIdentifying(false);
    }
  }

  function drawAnnotations(results: IdentifyResult[]) {
    const canvas = canvasRef.current;
    if (!canvas || !identifyPreview) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      for (const r of results) {
        const [top, right, bottom, left] = r.bbox;
        const color = r.name !== 'Unknown' ? '#22c55e' : '#ef4444';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(left, top, right - left, bottom - top);
        ctx.fillStyle = color + 'cc';
        ctx.fillRect(left, bottom, right - left, 22);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px DM Sans, sans-serif';
        ctx.fillText(`${r.name} ${(r.confidence * 100).toFixed(0)}%`, left + 4, bottom + 15);
      }
    };
    img.src = identifyPreview;
  }

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <PageHeader
        icon={Database}
        eyebrow="MODULE · 03"
        title="Face Database"
        accent="#10B981, #2DD4BF"
        subtitle="Register known faces, then identify people in any image."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* Face grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-slate-500" />
              <span className="text-sm font-sans text-slate-400">
                {faces.length} registered face{faces.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {loadingFaces ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Skeleton className="h-[140px]" count={6} />
            </div>
          ) : faces.length === 0 ? (
            <div className="glass p-12 flex flex-col items-center gap-4">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="rgba(59,130,246,0.15)" strokeWidth="2" strokeDasharray="6 4" />
                <circle cx="40" cy="32" r="12" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" />
                <path d="M18 62c0-12 10-20 22-20s22 8 22 20" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="40" cy="32" r="5" fill="rgba(59,130,246,0.2)" />
              </svg>
              <div className="text-center">
                <p className="text-slate-400 font-sans text-sm font-medium">No faces registered yet</p>
                <p className="text-slate-600 text-xs font-mono mt-1">Use the form to add known faces</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence>
                {faces.map((f) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="glass glass-hover group relative flex flex-col gap-2 p-3 overflow-hidden"
                  >
                    <img
                      src={getStaticUrl(f.image_path)}
                      alt={f.name}
                      className="w-full h-[100px] object-cover rounded-xl bg-navy-800"
                    />
                    <p className="font-syne font-semibold text-sm text-white truncate">{f.name}</p>
                    <p className="text-[10px] font-mono text-slate-600">
                      {new Date(f.created_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/70 hover:bg-red-500/80 text-white rounded-full p-1.5 transition-all duration-150"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Register */}
          <div className="glass p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-blue-400" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Register Face</span>
            </div>

            <label
              className="relative flex flex-col items-center justify-center gap-2 h-[130px] border-2 border-dashed border-blue-500/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors overflow-hidden"
              onClick={() => !registerPreview && regFileRef.current?.click()}
            >
              {registerPreview ? (
                <>
                  <img src={registerPreview} alt="reg" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRegisterFile(null); setRegisterPreview(null); }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              ) : (
                <>
                  <UserCheck size={22} className="text-slate-600" />
                  <span className="text-xs text-slate-600 font-sans">Upload face photo</span>
                </>
              )}
            </label>
            <input
              ref={regFileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setRegisterFile(f); }
                e.target.value = '';
              }}
            />

            <input
              type="text"
              className="input-dark"
              placeholder="Full name"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            />

            <button
              onClick={handleRegister}
              disabled={registering}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {registering ? 'Registering…' : <><Plus size={14} /> Register</>}
            </button>
          </div>

          {/* Identify */}
          <div className="glass p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-blue-400" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Identify Faces</span>
            </div>

            <label
              className="relative flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-500/20 rounded-xl cursor-pointer hover:border-blue-500/40 transition-colors overflow-hidden"
              style={{ minHeight: identifyPreview ? 'auto' : '100px' }}
              onClick={() => !identifyPreview && idFileRef.current?.click()}
            >
              {identifyPreview ? (
                <div className="w-full relative">
                  {identifyResult ? (
                    <canvas ref={canvasRef} className="w-full rounded-xl" />
                  ) : (
                    <img src={identifyPreview} alt="id" className="w-full rounded-xl" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIdentifyFile(null); setIdentifyPreview(null); setIdentifyResult(null); }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ) : (
                <>
                  <Search size={20} className="text-slate-600" />
                  <span className="text-xs text-slate-600 font-sans">Upload image to identify</span>
                </>
              )}
            </label>
            <input
              ref={idFileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setIdentifyFile(f); setIdentifyResult(null); }
                e.target.value = '';
              }}
            />

            <button
              onClick={handleIdentify}
              disabled={identifying || !identifyFile}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {identifying ? 'Identifying…' : <><Search size={14} /> Identify</>}
            </button>

            {/* Results list */}
            {identifyResult && identifyResult.results.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {identifyResult.results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 bg-navy-800/50 rounded-xl px-3 py-2">
                    <ConfidenceRing confidence={r.confidence} size={40} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-syne font-semibold text-white">{r.name}</span>
                      <span className="text-xs font-mono text-slate-600">Face #{i + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
