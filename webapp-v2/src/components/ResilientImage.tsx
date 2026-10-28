import React, { useState } from 'react';
import { Image as ImageIcon, ZoomIn, X } from 'lucide-react';
import { AttendancePhoto } from '../types';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle = 'Fotografia técnica',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full min-h-[120px] flex flex-col items-center justify-center bg-[#F1ECE2] text-[#6B6257] p-4 text-center">
        <ImageIcon className="w-7 h-7 mb-1.5 opacity-70" />
        <span className="text-xs font-medium">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

interface PhotoLightboxModalProps {
  photo: AttendancePhoto | null;
  onClose: () => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({ photo, onClose }) => {
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full bg-[#181512] text-[#F9F6F0] rounded-xl border border-[#3A322B] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2E2722]">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[#D4B98C] tabular-nums">{photo.code}</span>
            <span aria-hidden="true">·</span>
            <span>{photo.category}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#A89F91]">{photo.furnitureLabel}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#A89F91] hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-black max-h-[70vh] flex items-center justify-center p-2 overflow-auto">
          <ResilientImage
            src={photo.imageUrl || photo.thumbnailDataUrl || ''}
            alt={`${photo.code} - ${photo.caption || photo.category}`}
            className="max-h-[66vh] w-auto object-contain rounded"
            fallbackTitle={`${photo.code} — ${photo.category}`}
          />
        </div>

        <div className="px-5 py-3.5 border-t border-[#2E2722] text-sm text-[#D6CFC5]">
          <p className="font-medium text-white mb-0.5">Legenda:</p>
          <p>{photo.caption || 'Sem legenda adicional informada.'}</p>
        </div>
      </div>
    </div>
  );
};

export { ZoomIn };
