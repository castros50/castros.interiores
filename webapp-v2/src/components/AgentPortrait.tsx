import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, RefreshCw, ZoomIn } from 'lucide-react';
import { DepartmentId } from '../types';

function getInitials(name: string): string {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PORTRAIT_SIZES = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-14 h-14 text-sm',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-28 h-28 text-2xl',
} as const;

interface AgentPortraitProps {
  deskId: DepartmentId;
  name: string;
  portraitUpdatedAt?: string;
  size?: keyof typeof PORTRAIT_SIZES;
  className?: string;
}

/**
 * Retrato fixo e reconhecível de um agente, com fallback para iniciais
 * (mesma identidade visual: fundo preto, aro bronze/dourado, texto creme)
 * quando ainda não há foto enviada ou o arquivo falha ao carregar.
 */
export const AgentPortrait: React.FC<AgentPortraitProps> = ({
  deskId,
  name,
  portraitUpdatedAt,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!portraitUpdatedAt && !failed;

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden border-2 border-[#9A7138] bg-[#181512] flex items-center justify-center ${PORTRAIT_SIZES[size]} ${className}`}
      title={`${name} — Assistente virtual`}
    >
      {hasPhoto ? (
        <img
          src={`/api/photos/agent-portrait-${deskId}.jpg?v=${encodeURIComponent(portraitUpdatedAt!)}`}
          alt={`Retrato de ${name}, assistente virtual`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-bold text-[#E5DEC9] font-serif-display select-none">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};

interface PortraitUploadModalProps {
  title: string;
  description?: string;
  aspectRatio?: number; // largura / altura. 1 = quadrado (retrato). >1 = banner (capa)
  outputSize?: { width: number; height: number };
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (dataUrl: string) => void | Promise<void>;
}

/**
 * Modal de envio + recorte manual (posicionar e ampliar) sem bibliotecas externas:
 * desenha a imagem num canvas na resolução final aplicando a mesma transformação
 * (zoom + posição) usada na pré-visualização.
 */
export const PortraitUploadModal: React.FC<PortraitUploadModalProps> = ({
  title,
  description,
  aspectRatio = 1,
  outputSize,
  isSaving = false,
  onCancel,
  onSave,
}) => {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const viewportWidth = aspectRatio >= 1 ? 320 : Math.round(320 * aspectRatio);
  const viewportHeight = Math.round(viewportWidth / aspectRatio);
  const finalOutput = outputSize || {
    width: Math.round(viewportWidth * 1.6),
    height: Math.round(viewportHeight * 1.6),
  };

  const clampPan = useCallback(
    (nextPan: { x: number; y: number }, img: HTMLImageElement, z: number) => {
      const baseScale = Math.max(viewportWidth / img.naturalWidth, viewportHeight / img.naturalHeight);
      const scale = baseScale * z;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const minX = Math.min(0, viewportWidth - drawW);
      const minY = Math.min(0, viewportHeight - drawH);
      return {
        x: Math.min(0, Math.max(minX, nextPan.x)),
        y: Math.min(0, Math.max(minY, nextPan.y)),
      };
    },
    [viewportWidth, viewportHeight]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem (JPG, PNG ou WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setImageEl(img);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      img.onerror = () => setError('Não foi possível ler esta imagem.');
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageEl) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !imageEl) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan(clampPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy }, imageEl, zoom));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleZoomChange = (nextZoom: number) => {
    if (!imageEl) {
      setZoom(nextZoom);
      return;
    }
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev, imageEl, nextZoom));
  };

  const handleSave = () => {
    if (!imageEl) return;
    const canvas = document.createElement('canvas');
    canvas.width = finalOutput.width;
    canvas.height = finalOutput.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Não foi possível preparar a imagem para salvar.');
      return;
    }
    const ratioX = finalOutput.width / viewportWidth;
    const ratioY = finalOutput.height / viewportHeight;
    const baseScale = Math.max(viewportWidth / imageEl.naturalWidth, viewportHeight / imageEl.naturalHeight);
    const scale = baseScale * zoom;
    const drawW = imageEl.naturalWidth * scale * ratioX;
    const drawH = imageEl.naturalHeight * scale * ratioY;
    const offsetX = pan.x * ratioX;
    const offsetY = pan.y * ratioY;
    ctx.fillStyle = '#F9F6F0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageEl, offsetX, offsetY, drawW, drawH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onSave(dataUrl);
  };

  const previewTransform = imageEl
    ? (() => {
        const baseScale = Math.max(viewportWidth / imageEl.naturalWidth, viewportHeight / imageEl.naturalHeight);
        const scale = baseScale * zoom;
        return {
          width: imageEl.naturalWidth * scale,
          height: imageEl.naturalHeight * scale,
        };
      })()
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5DEC9] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EFECE6] bg-[#181512] text-white">
          <h3 className="text-sm font-bold">{title}</h3>
          <button type="button" onClick={onCancel} className="text-[#D6CFC5] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {description && <p className="text-xs text-[#6B6257]">{description}</p>}

          {!imageEl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-[#D6CFC5] text-[#6B6257] hover:border-[#9A7138] hover:text-[#181512]"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs font-medium">Clique para escolher uma foto</span>
            </button>
          ) : (
            <>
              <div
                className="mx-auto overflow-hidden rounded-lg border border-[#D6CFC5] bg-[#181512] touch-none select-none cursor-move"
                style={{ width: viewportWidth, height: viewportHeight }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {previewTransform && (
                  <img
                    src={imageEl.src}
                    alt="Pré-visualização do recorte"
                    draggable={false}
                    style={{
                      width: previewTransform.width,
                      height: previewTransform.height,
                      transform: `translate(${pan.x}px, ${pan.y}px)`,
                      transformOrigin: 'top left',
                    }}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-[#6B6257] shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <p className="text-[11px] text-[#6B6257]">
                Arraste a imagem para posicionar e use o controle para ampliar. Enquadre o rosto dentro da área.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-[#845E2B] hover:underline"
              >
                Escolher outra foto
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#EFECE6] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!imageEl || isSaving}
            className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
