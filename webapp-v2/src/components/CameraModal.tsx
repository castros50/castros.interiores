import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';
import { PhotoCategory, PHOTO_CATEGORIES } from '../types';

interface CameraModalProps {
  isOpen: boolean;
  defaultCategory: PhotoCategory;
  defaultFurnitureLabel: string;
  onClose: () => void;
  onCapture: (dataUrl: string, category: PhotoCategory, caption: string, furnitureLabel: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  defaultCategory,
  defaultFurnitureLabel,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [category, setCategory] = useState<PhotoCategory>(defaultCategory);
  const [caption, setCaption] = useState('');
  const [furnitureLabel, setFurnitureLabel] = useState(defaultFurnitureLabel);

  useEffect(() => {
    setCategory(defaultCategory);
    setFurnitureLabel(defaultFurnitureLabel);
  }, [defaultCategory, defaultFurnitureLabel]);

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let active = true;
    async function startCamera() {
      setError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? `Não foi possível acessar a câmera integrada (${err.message}). Use o botão "Selecionar da Galeria / Câmera do Celular".`
            : 'Permissão de câmera negada ou câmera indisponível.'
        );
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    onCapture(
      dataUrl,
      category,
      caption.trim() || `Foto capturada (${category})`,
      furnitureLabel.trim() || defaultFurnitureLabel
    );
    setCaption('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl rounded-xl bg-[#181512] text-[#F9F6F0] border border-[#3A322B] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2E2722]">
          <h3 className="text-base font-semibold">Capturar Fotografia do Estofado</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A89F91] hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error ? (
            <div className="p-4 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 text-sm">
              {error}
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                }
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 text-xs font-medium text-white flex items-center gap-1.5 hover:bg-black"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Alternar Câmera
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#C7B9A5] mb-1">Categoria da Foto</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PhotoCategory)}
                className="w-full rounded-lg bg-[#25201B] border border-[#3E352D] px-3 py-2 text-sm text-white"
              >
                {PHOTO_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#C7B9A5] mb-1">Vínculo com o Móvel</label>
              <input
                type="text"
                value={furnitureLabel}
                onChange={(e) => setFurnitureLabel(e.target.value)}
                placeholder="Ex: Sofá 3 Lugares"
                className="w-full rounded-lg bg-[#25201B] border border-[#3E352D] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#C7B9A5] mb-1">Legenda Técnica da Foto</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex: Detalhe da costura aberta no braço direito"
              className="w-full rounded-lg bg-[#25201B] border border-[#3E352D] px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#3E352D] text-sm text-[#D6CFC5] hover:bg-[#25201B]"
            >
              Cancelar
            </button>
            {!error && (
              <button
                type="button"
                onClick={handleTakeSnapshot}
                className="px-5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-sm font-medium flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capturar e Salvar Foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
