import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, UserCheck, Users, Database, X, Calendar } from 'lucide-react';
import { useToast } from '../App';
import { api, apiErrorMessage, getStaticUrl } from '../lib/api';
import { Face, IdentifyResponse, IdentifyResult } from '../types';
import ConfidenceRing from '../components/ConfidenceRing';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import Chip from '../components/Chip';
import EmptyState from '../components/EmptyState';
import { recordActivity } from '../lib/activity';

const PAGE = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
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
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Face | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regFileRef = useRef<HTMLInputElement>(null);
  const idFileRef = useRef<HTMLInputElement>(null);

  const filtered = faces.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

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

  useEffect(() => {
    loadFaces();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!registerName.trim()) {
      toast('Enter a name.', 'warning');
      return;
    }
    if (!registerFile) {
      toast('Upload an image.', 'warning');
      return;
    }
    setRegistering(true);
    try {
      const fd = new FormData();
      fd.append('name', registerName.trim());
      fd.append('image', registerFile);
      await api.post('/api/faces/register', fd);
      recordActivity({
        kind: 'register',
        title: `Registered ${registerName.trim()}`,
        detail: 'Added to local gallery',
      });
      toast(`"${registerName}" registered.`, 'success');
      setRegisterName('');
      setRegisterFile(null);
      setRegisterPreview(null);
      loadFaces();
    } catch (err: unknown) {
      toast(apiErrorMessage(err, 'Registration failed.'), 'error');
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    try {
      await api.delete(`/api/faces/${id}`);
      setFaces((p) => p.filter((f) => f.id !== id));
      recordActivity({ kind: 'delete', title: `Removed ${name}`, detail: 'Deleted from gallery' });
      toast(`"${name}" removed.`, 'success');
    } catch {
      toast('Delete failed.', 'error');
    }
  }

  async function handleIdentify() {
    if (!identifyFile) {
      toast('Upload an image to identify.', 'warning');
      return;
    }
    setIdentifying(true);
    setIdentifyResult(null);
    try {
      const fd = new FormData();
      fd.append('image', identifyFile);
      const { data } = await api.post<IdentifyResponse>('/api/faces/identify', fd);
      setIdentifyResult(data);
      const named = data.results.filter((r) => r.name !== 'Unknown').length;
      recordActivity({
        kind: 'identify',
        title: `Identified ${named}/${data.face_count} face${data.face_count === 1 ? '' : 's'}`,
        detail:
          data.results
            .map((r) => r.name)
            .filter((n) => n !== 'Unknown')
            .slice(0, 3)
            .join(', ') || 'No matches',
        meta: { matches: named, total: data.face_count },
      });
      toast(`${data.face_count} face(s) analysed.`, 'info');
    } catch (err: unknown) {
      toast(apiErrorMessage(err, 'Identification failed.'), 'error');
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
        const color = r.name !== 'Unknown' ? '#34d399' : '#f87171';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, right - left, bottom - top);
        ctx.fillStyle = color + 'dd';
        ctx.fillRect(left, bottom, Math.max(right - left, 80), 20);
        ctx.fillStyle = '#fff';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillText(`${r.name} ${(r.confidence * 100).toFixed(0)}%`, left + 4, bottom + 14);
      }
    };
    img.src = identifyPreview;
  }

  return (
    <motion.div {...PAGE} className="flex flex-col gap-6">
      <PageHeader
        icon={Database}
        eyebrow="Gallery"
        title="Face Database"
        subtitle="Register known faces, then identify people in any photo."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Enrolled" value={faces.length} />
        <MiniStat label="Showing" value={filtered.length} />
        <MiniStat label="Storage" value="SQLite" />
        <MiniStat label="Encoding" value="128-D" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] focus-within:border-white/15 px-3">
              <Search size={14} className="text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="bg-transparent outline-none flex-1 text-sm text-zinc-200 placeholder:text-zinc-600"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300">
                  <X size={13} />
                </button>
              )}
            </div>
            <Chip>
              {filtered.length}/{faces.length}
            </Chip>
          </div>

          {loadingFaces ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Skeleton className="h-[150px]" count={6} />
            </div>
          ) : faces.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No faces registered"
              description="Use the panel on the right to enroll a face."
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title="No matches" description={`Nothing matches "${query}".`} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {filtered.map((f) => (
                  <motion.button
                    key={f.id}
                    layout
                    onClick={() => setSelected(f)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group relative flex flex-col gap-2 p-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/15 transition-all text-left"
                  >
                    <div className="relative">
                      <img
                        src={getStaticUrl(f.image_path)}
                        alt={f.name}
                        className="w-full aspect-[5/4] object-cover rounded-lg bg-zinc-900"
                      />
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(f.id, f.name);
                        }}
                        className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-black/70 hover:bg-rose-500/80 text-white rounded-md p-1 transition-all cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100 truncate px-0.5">{f.name}</p>
                    <p className="text-[10px] font-mono text-zinc-600 flex items-center gap-1 px-0.5">
                      <Calendar size={9} />
                      {new Date(f.created_at).toLocaleDateString()}
                    </p>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Register */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-400">Enroll face</span>
            </div>

            <label
              className="relative flex flex-col items-center justify-center gap-2 h-[120px] border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors overflow-hidden"
              onClick={() => !registerPreview && regFileRef.current?.click()}
            >
              {registerPreview ? (
                <>
                  <img src={registerPreview} alt="reg" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setRegisterFile(null);
                      setRegisterPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white rounded-full p-1"
                  >
                    <Trash2 size={11} />
                  </button>
                </>
              ) : (
                <>
                  <UserCheck size={20} className="text-zinc-600" />
                  <span className="text-xs text-zinc-600">Upload photo</span>
                </>
              )}
            </label>
            <input
              ref={regFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setRegisterFile(f);
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
              className="btn-primary justify-center disabled:opacity-40"
            >
              {registering ? 'Registering…' : (
                <>
                  <Plus size={14} /> Register
                </>
              )}
            </button>
          </div>

          {/* Identify */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-400">Identify in image</span>
            </div>

            <label
              className="relative flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors overflow-hidden"
              style={{ minHeight: identifyPreview ? 'auto' : '100px' }}
              onClick={() => !identifyPreview && idFileRef.current?.click()}
            >
              {identifyPreview ? (
                <div className="w-full relative">
                  {identifyResult ? (
                    <canvas ref={canvasRef} className="w-full rounded-lg" />
                  ) : (
                    <img src={identifyPreview} alt="id" className="w-full rounded-lg" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIdentifyFile(null);
                      setIdentifyPreview(null);
                      setIdentifyResult(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-rose-600 text-white rounded-full p-1"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ) : (
                <>
                  <Search size={18} className="text-zinc-600" />
                  <span className="text-xs text-zinc-600">Upload image</span>
                </>
              )}
            </label>
            <input
              ref={idFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setIdentifyFile(f);
                  setIdentifyResult(null);
                }
                e.target.value = '';
              }}
            />

            <button
              onClick={handleIdentify}
              disabled={identifying || !identifyFile}
              className="btn-primary justify-center disabled:opacity-40"
            >
              {identifying ? 'Identifying…' : (
                <>
                  <Search size={14} /> Identify
                </>
              )}
            </button>

            {identifyResult && identifyResult.results.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {identifyResult.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <ConfidenceRing confidence={r.confidence} size={36} />
                    <div>
                      <span className="text-sm font-medium text-zinc-100">{r.name}</span>
                      <p className="text-[10px] font-mono text-zinc-600">Face #{i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <FaceDrawer
            face={selected}
            onClose={() => setSelected(null)}
            onDelete={() => {
              handleDelete(selected.id, selected.name);
              setSelected(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="text-xl font-semibold text-zinc-50 mt-1 leading-none">{value}</p>
    </div>
  );
}

function FaceDrawer({
  face,
  onClose,
  onDelete,
}: {
  face: Face;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 360 }}
        animate={{ x: 0 }}
        exit={{ x: 360 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[340px] h-full overflow-y-auto border-l border-white/[0.08] bg-zinc-950"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06]">
          <span className="text-xs text-zinc-500">Profile</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <img
            src={getStaticUrl(face.image_path)}
            alt={face.name}
            className="w-full aspect-square object-cover rounded-xl"
          />
          <h3 className="text-xl font-semibold text-zinc-50 mt-4">{face.name}</h3>
          <p className="text-xs font-mono text-zinc-600 mt-1">ID #{face.id}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/[0.06] px-2.5 py-2">
              <p className="text-[10px] text-zinc-600">Enrolled</p>
              <p className="text-xs text-zinc-300 mt-0.5">
                {new Date(face.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] px-2.5 py-2">
              <p className="text-[10px] text-zinc-600">Encoding</p>
              <p className="text-xs text-zinc-300 mt-0.5">128-D dlib</p>
            </div>
          </div>
          <button
            onClick={onDelete}
            className="mt-6 w-full h-10 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/15 text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
