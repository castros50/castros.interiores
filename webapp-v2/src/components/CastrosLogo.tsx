import React from 'react';

interface CastrosLogoProps {
  /** 'mark' = só o círculo com o "C"; 'header' = círculo + nome ao lado; 'seal' = selo completo (impressos, tela de boas-vindas). */
  variant?: 'mark' | 'header' | 'seal';
  /** Diâmetro do círculo em px (controla a escala de tudo). */
  size?: number;
  /** 'light' = para usar sobre fundo claro (padrão); 'dark' = para usar sobre fundo escuro/foto. */
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * Marca/logo oficial da Castros Interiores: selo circular com anel dourado
 * duplo e monograma "C" em serifa itálica, acompanhado do nome em duas
 * linhas. Mesma identidade usada no favicon (public/icon.svg) e nos
 * cabeçalhos dos PDFs (src/utils/pdfGenerator.ts, drawCastrosLogoMark).
 */
export const CastrosLogo: React.FC<CastrosLogoProps> = ({
  variant = 'header',
  size,
  theme = 'light',
  className = '',
}) => {
  const ink = theme === 'dark' ? '#FAF8F5' : '#181512';
  const gold = '#9A7138';

  if (variant === 'mark') {
    const d = size || 40;
    return (
      <div
        className={`rounded-full bg-[#181512] flex items-center justify-center shrink-0 ${className}`}
        style={{ width: d, height: d }}
        role="img"
        aria-label="Castros Interiores"
      >
        <span
          className="font-serif-display italic font-semibold text-[#FAF8F5] leading-none"
          style={{ fontSize: d * 0.5 }}
        >
          C
        </span>
      </div>
    );
  }

  if (variant === 'seal') {
    const d = size || 220;
    return (
      <div
        className={`rounded-full border-2 flex items-center justify-center relative shrink-0 ${className}`}
        style={{ width: d, height: d, borderColor: gold }}
        role="img"
        aria-label="Castros Interiores — Estofados, Reforma e Design de Interiores"
      >
        <div
          className="absolute rounded-full border"
          style={{ inset: d * 0.04, borderColor: gold, opacity: 0.55 }}
        />
        <div className="relative flex flex-col items-center gap-1.5 text-center" style={{ width: d * 0.68 }}>
          <span
            className="font-bold uppercase"
            style={{ fontSize: Math.max(7, d * 0.035), letterSpacing: 2.5, color: gold }}
          >
            Estofados
          </span>
          <span
            className="font-serif-display font-bold leading-none"
            style={{ fontSize: d * 0.11, letterSpacing: 1, color: ink }}
          >
            CASTROS
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: d * 0.08, height: 1, background: gold }} />
            <span style={{ width: 4, height: 4, background: gold, transform: 'rotate(45deg)' }} />
            <span style={{ width: d * 0.08, height: 1, background: gold }} />
          </span>
          <span
            className="font-serif-display font-medium uppercase leading-none"
            style={{ fontSize: d * 0.06, letterSpacing: 3, color: gold }}
          >
            Interiores
          </span>
          <span
            className="font-bold uppercase"
            style={{ fontSize: Math.max(7, d * 0.035), letterSpacing: 2.5, color: gold }}
          >
            Design
          </span>
        </div>
      </div>
    );
  }

  // variant === 'header': ícone + nome ao lado
  const d = size || 40;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="rounded-full border-2 flex items-center justify-center relative shrink-0"
        style={{ width: d, height: d, borderColor: gold }}
      >
        <div
          className="absolute rounded-full border"
          style={{ inset: Math.max(2, d * 0.08), borderColor: gold, opacity: 0.55 }}
        />
        <span
          className="font-serif-display italic font-semibold relative leading-none"
          style={{ fontSize: d * 0.46, color: ink }}
        >
          C
        </span>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-serif-display font-bold whitespace-nowrap"
          style={{ fontSize: d * 0.4, letterSpacing: 1, color: ink }}
        >
          CASTROS
        </span>
        <span
          className="font-semibold uppercase whitespace-nowrap"
          style={{ fontSize: d * 0.17, letterSpacing: 2.5, color: gold }}
        >
          Interiores
        </span>
      </div>
    </div>
  );
};
