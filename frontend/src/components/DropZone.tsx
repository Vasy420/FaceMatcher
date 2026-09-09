import { useRef, useState, useEffect, DragEvent } from 'react';
import { Image as ImageIcon, Film, X } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../App';
import { compressImage } from '../lib/api';

interface Props {
  accept: 'image' | 'video';
  file: File | null;
  onFile: (f: File | null) => void;
  label: string;
  previewUrl?: string | null;
  hint?: string;
}

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

export default function DropZone({ accept, file, onFile, label, previewUrl, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const { toast } = useToast();

  const acceptAttr =
    accept === 'image'
      ? 'image/jpeg,image/png,image/webp'
      : 'video/mp4,video/avi,video/quicktime,video/webm';
  const Icon = accept === 'image' ? ImageIcon : Film;
  const maxSize = accept === 'image' ? MAX_IMAGE : MAX_VIDEO;
  const maxLabel = accept === 'image' ? '5 MB' : '100 MB';

  useEffect(() => {
    if (previewUrl) {
      setPreviewSrc(previewUrl);
      return;
    }
    if (file && accept === 'image') {
      const url = URL.createObjectURL(file);
      setPreviewSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewSrc(null);
  }, [file, previewUrl, accept]);

  async function handleFile(incoming: File) {
    if (incoming.size > maxSize) {
      toast(`File too large. Max ${maxLabel}.`, 'error');
      return;
    }
    if (accept === 'image') {
      const compressed = await compressImage(incoming, 800);
      onFile(compressed);
    } else {
      onFile(incoming);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <div
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden bg-white/[0.02]',
          dragging
            ? 'border-indigo-400/50 bg-indigo-500/5'
            : 'border-white/[0.08] hover:border-white/15',
          file ? 'min-h-[160px]' : 'min-h-[148px] py-8 px-6',
        )}
      >
        {file && accept === 'image' && previewSrc ? (
          <>
            <img
              src={previewSrc}
              alt="preview"
              className="w-full h-full object-cover max-h-[200px] rounded-lg"
            />
            <div className="absolute inset-0 flex items-start justify-end p-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFile(null);
                }}
                className="bg-black/60 hover:bg-rose-500/80 text-white rounded-full p-1 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </>
        ) : file && accept === 'video' ? (
          <div className="w-full px-4 py-4 flex flex-col items-center gap-1.5">
            <Film size={28} className="text-zinc-400" strokeWidth={1.5} />
            <p className="text-sm text-zinc-200 font-medium text-center truncate max-w-full px-2">
              {file.name}
            </p>
            <p className="text-xs text-zinc-600 font-mono">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
              className="mt-1 text-xs text-zinc-500 hover:text-rose-400 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Icon size={18} className="text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-400">
                Drop {accept} or <span className="text-zinc-200 underline underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-zinc-600 mt-1">{hint ?? `Max ${maxLabel}`}</p>
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
