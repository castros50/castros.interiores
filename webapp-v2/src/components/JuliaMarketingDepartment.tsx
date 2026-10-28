import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  ArrowLeft,
  ArrowRight,
  Save,
  Edit3,
  Share2,
  Download,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Calendar,
  FileText,
  Sparkles,
  Check,
  Copy,
  Trash2,
  Plus,
  Image as ImageIcon,
  Layers,
  BookOpen,
  Megaphone,
  Smartphone,
  RefreshCw,
  X,
  Eye,
  FolderOpen,
  AlertTriangle,
  ExternalLink,
  Archive,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  JuliaCampaignScheduleItem,
  JuliaCampaignStatus,
  JuliaCatalogEntry,
  JuliaDepartmentData,
  JuliaMarketingPhoto,
  JuliaPhotoTag,
  JuliaPieceFormat,
  JuliaSlideTheme,
  JuliaSmartAdProject,
  JuliaSocialMediaVersions,
  JuliaTargetChannel,
} from '../types';
import { ResilientImage } from './ResilientImage';

interface JuliaMarketingDepartmentProps {
  deviceFormFactor: string;
  stationName: string;
  workshopPhone: string;
  externalJuliaData?: JuliaDepartmentData | null;
}

interface OfficialIntegrationsStatus {
  instagram: {
    connected: boolean;
    autoPublishSupported: boolean;
    statusMessage: string;
  };
  facebook: {
    connected: boolean;
    autoPublishSupported: boolean;
    statusMessage: string;
  };
  whatsapp: {
    connected: boolean;
    autoPublishSupported: boolean;
    directShareSupported: boolean;
    statusMessage: string;
  };
}

const TWELVE_STEPS_META: Array<{
  step: number;
  shortTitle: string;
  fullTitle: string;
  description: string;
}> = [
  {
    step: 1,
    shortTitle: '1. Fotos do Celular',
    fullTitle: 'Etapa 1 — Fotos Direto do Celular e Biblioteca Castros Interiores',
    description:
      'Receba fotos diretamente da câmera ou galeria do celular/computador sem depender de atendimento ativo e escolha as imagens da campanha.',
  },
  {
    step: 2,
    shortTitle: '2. Objetivo & Público',
    fullTitle: 'Etapa 2 — Objetivo da Campanha e Público-Alvo',
    description:
      'Defina o propósito publicitário (vitrine de alto padrão, transformação estética, captação de clientes) e o perfil de público.',
  },
  {
    step: 3,
    shortTitle: '3. Formato da Peça',
    fullTitle: 'Etapa 3 — Formato Principal da Peça Publicitária',
    description:
      'Escolha o formato principal de destaque: Anúncio, Pôster, Carrossel ou Catálogo.',
  },
  {
    step: 4,
    shortTitle: '4. Título (Headline)',
    fullTitle: 'Etapa 4 — Título de Impacto e Chamada Principal',
    description:
      'Elabore a frase principal que será utilizada fielmente nas peças publicitárias do Instagram, Facebook e WhatsApp.',
  },
  {
    step: 5,
    shortTitle: '5. Texto Publicitário',
    fullTitle: 'Etapa 5 — Copywriting e Texto Oficial da Campanha',
    description:
      'Texto persuasivo destacando o design, o conforto e o acabamento de atelier da Castros Interiores, preservado em todas as etapas.',
  },
  {
    step: 6,
    shortTitle: '6. Criar Anúncio',
    fullTitle: 'Etapa 6 — Criação de Anúncio (Feed & Stories) com Fidelidade ao Texto',
    description:
      'Versões prontas do anúncio utilizando fielmente o Título da Etapa 4 e o Texto da Etapa 5, com identificação clara quando adaptado por IA.',
  },
  {
    step: 7,
    shortTitle: '7. Criar Pôster',
    fullTitle: 'Etapa 7 — Criação de Pôster Promocional de Alto Padrão',
    description:
      'Configure e baixe o pôster visual com a fotografia real, selo editorial e contato da Castros Interiores.',
  },
  {
    step: 8,
    shortTitle: '8. Criar Carrossel',
    fullTitle: 'Etapa 8 — Criação de Carrossel com Fotografias Reais (5 Lâminas)',
    description:
      'Associe fotografias reais a cada lâmina, edite títulos, descrições e cores, reorganize a sequência e baixe em PNG ou ZIP completo.',
  },
  {
    step: 9,
    shortTitle: '9. Criar Catálogo',
    fullTitle: 'Etapa 9 — Catálogo Comercial Completo com Fotografias Reais (PDF A4)',
    description:
      'Cadastre produtos reais com uma ou mais fotografias, categoria, coleção, medidas, cores e preço opcional, visualize a prévia e baixe o PDF A4.',
  },
  {
    step: 10,
    shortTitle: '10. Hashtags & CTA',
    fullTitle: 'Etapa 10 — Hashtags Estratégicas e Chamada para WhatsApp',
    description:
      'Configure as tags de alcance e o botão/link de ação direta para o WhatsApp da Castros Interiores.',
  },
  {
    step: 11,
    shortTitle: '11. Programação',
    fullTitle: 'Etapa 11 — Planejamento e Agendamento de Publicações',
    description:
      'Separe claramente Planejar Publicação (envio manual) de Agendar Publicação Automática, verificando o status real das integrações.',
  },
  {
    step: 12,
    shortTitle: '12. Compartilhar',
    fullTitle: 'Etapa 12 — Revisão Final e Compartilhamento Oficial no WhatsApp',
    description:
      'Abra diretamente o WhatsApp Web ou aplicativo com o texto da campanha pronto, baixe ou copie a imagem publicitária para anexar.',
  },
];

const PHOTO_TAGS: JuliaPhotoTag[] = [
  'Estofado Pronto',
  'Transformação Estética',
  'Ambiente Decorado',
  'Detalhe de Acabamento',
  'Vitrine / Catálogo',
];

const SLIDE_THEME_PALETTES: Record<
  JuliaSlideTheme,
  {
    label: string;
    bgHex: string;
    cardHex: string;
    textHex: string;
    subTextHex: string;
    accentHex: string;
  }
> = {
  noite_ouro: {
    label: 'Noite & Ouro Castros',
    bgHex: '#181512',
    cardHex: '#241F1B',
    textHex: '#F9F6F0',
    subTextHex: '#D6CFC5',
    accentHex: '#9A7138',
  },
  editorial_creme: {
    label: 'Editorial Creme Claro',
    bgHex: '#F9F6F0',
    cardHex: '#EFEAE0',
    textHex: '#181512',
    subTextHex: '#57534E',
    accentHex: '#9A7138',
  },
  atelier_bronze: {
    label: 'Atelier Bronze Escuro',
    bgHex: '#261E18',
    cardHex: '#332820',
    textHex: '#F9F6F0',
    subTextHex: '#E5DEC9',
    accentHex: '#C89B57',
  },
  verde_esmeralda: {
    label: 'Verde Esmeralda Imperial',
    bgHex: '#102820',
    cardHex: '#17382D',
    textHex: '#F9F6F0',
    subTextHex: '#D1E5DD',
    accentHex: '#C59B5F',
  },
};

const PRODUCT_CATEGORIES = [
  'Sofá Sob Medida / Reformado',
  'Poltrona de Alto Padrão',
  'Cadeira de Jantar / Estofada',
  'Puff / Recamier / Chaise',
  'Cabeceira Estofada',
  'Almofadas & Acabamentos',
  'Conjunto Sala de Estar',
];

const LOCAL_BACKUP_KEY = 'castros_julia_department_backup_v2';

function stripPhoneFromCta(ctaText: string, phoneNumber?: string): string {
  let cleaned = (ctaText || '').trim();
  if (phoneNumber && phoneNumber.trim()) {
    cleaned = cleaned.split(phoneNumber.trim()).join('');
  }
  cleaned = cleaned
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g, '')
    .replace(/^whatsapp\s*:\s*/i, '')
    .replace(/[:\-–—\s]+$/, '')
    .trim();
  if (
    !cleaned ||
    /^(falar\s+no\s+whatsapp|fale\s+no\s+whatsapp|fale\s+conosco\s+no\s+whatsapp|whatsapp)$/i.test(
      cleaned
    )
  ) {
    return '';
  }
  return cleaned;
}

function formatSingleWhatsAppContactBlock(
  ctaButtonText: string,
  whatsappDirectNumber: string,
  existingCopyText?: string
): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanCta = stripPhoneFromCta(ctaButtonText, cleanPhone);
  const phoneDigits = cleanPhone.replace(/\D/g, '');
  const copyDigits = (existingCopyText || '').replace(/\D/g, '');
  const copyAlreadyHasPhone =
    phoneDigits.length >= 8 && copyDigits.includes(phoneDigits);

  if (copyAlreadyHasPhone) {
    return cleanCta ? cleanCta : `WhatsApp: ${cleanPhone}`;
  }

  return cleanCta
    ? `${cleanCta}\nWhatsApp: ${cleanPhone}`
    : `WhatsApp: ${cleanPhone}`;
}

function deduplicateBodyPhone(copyText: string, whatsappDirectNumber: string): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  let cleaned = (copyText || '').trim();
  if (cleanPhone) {
    // Remove phone from body if it is also going to be rendered in the dedicated WhatsApp contact line
    cleaned = cleaned
      .replace(
        new RegExp(
          `WhatsApp\\s*:\\s*${cleanPhone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'gi'
        ),
        ''
      )
      .replace(
        /Falar no WhatsApp\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}\s*:\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}/gi,
        ''
      )
      .trim();
  }
  return cleaned;
}

function buildFaithfulFeedText(
  headline: string,
  copyText: string,
  ctaButtonText: string,
  whatsappDirectNumber: string,
  hashtags: string
): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanCopy = deduplicateBodyPhone(copyText, cleanPhone);
  const contactBlock = formatSingleWhatsAppContactBlock(ctaButtonText, cleanPhone);
  return `${(headline || '').trim()}\n\n${cleanCopy}\n\n${contactBlock}\n\n${(hashtags || '').trim()}`.trim();
}

function buildFaithfulStoriesText(
  headline: string,
  copyText: string,
  ctaButtonText: string,
  whatsappDirectNumber: string
): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanCopy = deduplicateBodyPhone(copyText, cleanPhone);
  const contactBlock = formatSingleWhatsAppContactBlock(ctaButtonText, cleanPhone);
  return `${(headline || '').trim()}\n\n${cleanCopy}\n\n${contactBlock}`.trim();
}

export const TARGET_CHANNEL_OPTIONS: JuliaTargetChannel[] = [
  'Instagram Feed',
  'Instagram Stories',
  'Facebook',
  'WhatsApp',
  'WhatsApp Status',
  'Catálogo comercial',
  'Pôster publicitário',
  'Todas as redes sociais',
];

function stripHashtags(text: string): string {
  return (text || '')
    .replace(/#[a-zA-Z0-9_\u00C0-\u00FF]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function generateSocialMediaVersionsClient(
  headline: string,
  copyText: string,
  ctaButtonText: string,
  whatsappDirectNumber: string,
  hashtags: string
): JuliaSocialMediaVersions {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanHeadline = (headline || '').trim();
  const cleanCopy = (copyText || '').trim();
  const cleanCopyNoHashtags = stripHashtags(cleanCopy);
  const cleanCta = stripPhoneFromCta(ctaButtonText, cleanPhone);
  const now = new Date().toISOString();

  // 1. WhatsApp Message: SEM hashtags, linguagem comercial natural e convidativa, telefone único
  const whatsappMsgLines = [
    cleanHeadline,
    '',
    cleanCopyNoHashtags,
    '',
    cleanCta ? cleanCta : 'Solicite Atendimento Exclusivo',
    `WhatsApp: ${cleanPhone}`,
  ].filter(Boolean);
  const whatsappMessage = whatsappMsgLines.join('\n');

  // WhatsApp Status: Formato vertical rápido e dinâmico, SEM hashtags
  const whatsappStatus = `${cleanHeadline} ✨\n\n${cleanCopyNoHashtags.slice(0, 160)}${cleanCopyNoHashtags.length > 160 ? '...' : ''}\n\nFale conosco no WhatsApp: ${cleanPhone}`;

  // 2. Instagram: Feed com hashtags estratégicas, Stories visual, Reels com gancho dinâmico
  const igHashtags = hashtags && hashtags.trim()
    ? hashtags.trim()
    : '#CastrosInteriores #EstofadosDeAltoPadrao #DesignDeInteriores #DecoracaoElegante #SalaDeEstar #AtelierDeEstofados';
  const instagramFeed = `${cleanHeadline}\n\n${cleanCopy}\n\n${cleanCta ? `${cleanCta}\n` : ''}WhatsApp: ${cleanPhone}\n\n${igHashtags}`;
  const instagramStories = `${cleanHeadline}\n\n${cleanCopy}\n\nToque para falar no WhatsApp: ${cleanPhone}`;
  const instagramReels = `✨ A renovação do seu estofado com padrão de atelier artesanal.\n\n${cleanHeadline}\n\n${cleanCopyNoHashtags.slice(0, 180)}\n\nEnvie a foto do seu móvel pelo WhatsApp: ${cleanPhone}\n\n#CastrosInteriores #ReelsDesign #Estofaria #DesignDeInteriores #Decoracao`;

  // 3. Facebook: Texto comercial objetivo, diferenciais Castros Interiores, poucas hashtags (2 a 3)
  const fbHashtags = '#CastrosInteriores #ReformaDeEstofados';
  const facebook = `Diferenciais Castros Interiores — Alta Estofaria Sob Medida\n\n${cleanHeadline}\n\n${cleanCopyNoHashtags}\n\nPor que escolher o atelier da Castros Interiores?\n✔ Acabamento artesanal com alinhamento e costuras de alta precisão\n✔ Espumas de alta resiliência e densidades adequadas para conforto duradouro\n✔ Acervo selecionado de tecidos nobres, linhos e texturas contemporâneas\n✔ Cuidado minucioso preservando o design e a ergonomia do seu móvel\n\n${cleanCta || 'Solicite um orçamento sem compromisso'}\nWhatsApp: ${cleanPhone}\n\n${fbHashtags}`;

  // 4. Catálogos e Pôsteres: SEM hashtags automaticamente
  const catalogNotes = `Castros Interiores — Catálogo Comercial de Produtos e Alta Estofaria\n${cleanHeadline}\n${cleanCopyNoHashtags}\nAtendimento Comercial: WhatsApp ${cleanPhone}`;
  const posterNotes = `Pôster Promocional Castros Interiores\n${cleanHeadline}\nContato WhatsApp: ${cleanPhone}`;

  return {
    instagramFeed,
    instagramStories,
    instagramReels,
    facebook,
    whatsappMessage,
    whatsappStatus,
    catalogNotes,
    posterNotes,
    updatedAt: now,
  };
}

function validateWhatsAppRecipientPhone(rawInput: string): {
  hasInput: boolean;
  valid: boolean;
  normalizedPhone: string;
  formattedDisplay: string;
  error?: string;
} {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      hasInput: false,
      valid: true,
      normalizedPhone: '',
      formattedDisplay: '',
    };
  }

  const digits = trimmed.replace(/\D/g, '');
  let localDigits = digits;
  if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith('55')
  ) {
    localDigits = digits.slice(2);
  }

  if (localDigits.length !== 10 && localDigits.length !== 11) {
    return {
      hasInput: true,
      valid: false,
      normalizedPhone: '',
      formattedDisplay: trimmed,
      error:
        'Telefone do destinatário inválido. Informe DDD + número com 10 ou 11 dígitos (ex: (91) 98556-9841).',
    };
  }

  const ddd = parseInt(localDigits.slice(0, 2), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return {
      hasInput: true,
      valid: false,
      normalizedPhone: '',
      formattedDisplay: trimmed,
      error: 'DDD inválido. Informe um DDD brasileiro válido entre 11 e 99.',
    };
  }

  const normalizedPhone = `55${localDigits}`;
  const formattedDisplay =
    localDigits.length === 11
      ? `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7)}`
      : `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;

  return {
    hasInput: true,
    valid: true,
    normalizedPhone,
    formattedDisplay,
  };
}

async function compressPhotoForUpload(fileOrDataUrl: File | string): Promise<{
  fullDataUrl: string;
  thumbnailDataUrl: string;
  mimeType: string;
}> {
  const fullDataUrl: string =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Falha ao ler fotografia.'));
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxThumb = 420;
        let w = img.naturalWidth || 420;
        let h = img.naturalHeight || 315;
        if (w > maxThumb || h > maxThumb) {
          if (w > h) {
            h = Math.round((h * maxThumb) / w);
            w = maxThumb;
          } else {
            w = Math.round((w * maxThumb) / h);
            h = maxThumb;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve({
            fullDataUrl,
            thumbnailDataUrl: canvas.toDataURL('image/jpeg', 0.78),
            mimeType: 'image/jpeg',
          });
          return;
        }
      } catch {
        // fallback
      }
      resolve({
        fullDataUrl,
        thumbnailDataUrl: '',
        mimeType: 'image/jpeg',
      });
    };
    img.onerror = () =>
      resolve({
        fullDataUrl,
        thumbnailDataUrl: '',
        mimeType: 'image/jpeg',
      });
    img.src = fullDataUrl;
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const paragraphs = (text || '').split(/\n+/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
        if (lines.length >= maxLines) break;
      }
    }
    if (lines.length < maxLines) {
      lines.push(currentLine);
    }
    if (lines.length >= maxLines) break;
  }

  return lines.slice(0, maxLines);
}

function drawCoverImageOnCanvas(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number
) {
  const imgW = img.naturalWidth || img.width || targetW;
  const imgH = img.naturalHeight || img.height || targetH;
  const scale = Math.max(targetW / imgW, targetH / imgH);
  const srcW = targetW / scale;
  const srcH = targetH / scale;
  const srcX = Math.max(0, (imgW - srcW) / 2);
  const srcY = Math.max(0, (imgH - srcY_offset(imgH, srcH)));
  ctx.drawImage(img, srcX, srcY, srcW, srcH, targetX, targetY, targetW, targetH);
}

function srcY_offset(imgH: number, srcH: number): number {
  return (imgH - srcH) / 2;
}

async function loadPhotoAsImageElement(
  photo: JuliaMarketingPhoto | undefined
): Promise<HTMLImageElement | null> {
  if (!photo) return null;
  const sources = [photo.imageUrl, photo.thumbnailDataUrl].filter(Boolean) as string[];
  for (const src of sources) {
    const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    if (loaded) return loaded;
  }
  return null;
}

async function convertPhotoToJpegDataUrl(
  photo: JuliaMarketingPhoto | undefined,
  maxWidth = 900,
  maxHeight = 675
): Promise<string | null> {
  const img = await loadPhotoAsImageElement(photo);
  if (!img) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#F9F6F0';
    ctx.fillRect(0, 0, maxWidth, maxHeight);
    drawCoverImageOnCanvas(ctx, img, 0, 0, maxWidth, maxHeight);
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return photo?.thumbnailDataUrl || null;
  }
}

export const JuliaMarketingDepartment: React.FC<JuliaMarketingDepartmentProps> = ({
  deviceFormFactor,
  stationName,
  workshopPhone,
  externalJuliaData,
}) => {
  const [juliaData, setJuliaData] = useState<JuliaDepartmentData | null>(
    externalJuliaData || null
  );
  const [isLoading, setIsLoading] = useState(!externalJuliaData);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Official external integrations status (Instagram, Facebook, WhatsApp)
  const [integrationsStatus, setIntegrationsStatus] =
    useState<OfficialIntegrationsStatus>({
      instagram: {
        connected: false,
        autoPublishSupported: false,
        statusMessage: 'Publicação planejada. Envio manual necessário.',
      },
      facebook: {
        connected: false,
        autoPublishSupported: false,
        statusMessage: 'Publicação planejada. Envio manual necessário.',
      },
      whatsapp: {
        connected: false,
        autoPublishSupported: false,
        directShareSupported: true,
        statusMessage: 'Publicação planejada. Envio manual necessário.',
      },
    });

  // Correction mode state for the "Corrigí" button
  const [correctionModeOpen, setCorrectionModeOpen] = useState(false);
  const [correctionInstruction, setCorrectionInstruction] = useState('');

  // Independent Mobile Photo Upload state
  const [photoTitleInput, setPhotoTitleInput] = useState('');
  const [photoCaptionInput, setPhotoCaptionInput] = useState('');
  const [photoTagInput, setPhotoTagInput] = useState<JuliaPhotoTag>('Estofado Pronto');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slideFileInputRef = useRef<HTMLInputElement | null>(null);
  const catalogFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetCatalogEntryIdForUpload, setTargetCatalogEntryIdForUpload] = useState<
    string | null
  >(null);

  // Live Camera Modal for direct cell phone capture
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Carousel viewer active slide & export state
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [isExportingCarousel, setIsExportingCarousel] = useState(false);

  // Catalog complete product form & edit state (Correction 2)
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [catTitle, setCatTitle] = useState('');
  const [catCategory, setCatCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [catCollection, setCatCollection] = useState('Coleção Castros Interiores');
  const [catDescription, setCatDescription] = useState('');
  const [catMeasurements, setCatMeasurements] = useState('');
  const [catColors, setCatColors] = useState('');
  const [catPrice, setCatPrice] = useState('');
  const [catHighlight, setCatHighlight] = useState('Acabamento de Atelier');
  const [catSelectedPhotoIds, setCatSelectedPhotoIds] = useState<string[]>([]);
  const [catalogPreviewOpen, setCatalogPreviewOpen] = useState(false);
  const [isGeneratingCatalogPdf, setIsGeneratingCatalogPdf] = useState(false);
  const [attachingPhotosToProductId, setAttachingPhotosToProductId] = useState<
    string | null
  >(null);

  // Campaign scheduler form & filter (Correction 3)
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampFormat, setNewCampFormat] = useState<JuliaPieceFormat>('Anúncio');
  const [newCampChannel, setNewCampChannel] = useState<
    JuliaCampaignScheduleItem['channel']
  >('Instagram Feed');
  const [newCampDate, setNewCampDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newCampTime, setNewCampTime] = useState('18:00');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<
    'TODAS' | 'Planejada' | 'Agendada' | 'Concluída' | 'Com Erro'
  >('TODAS');

  // WhatsApp direct recipient optional input (Correction 4)
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState('');

  // Channel adaptation tab for Etapa 6 & Etapa 12
  const [socialChannelTab, setSocialChannelTab] = useState<
    'whatsapp' | 'whatsappStatus' | 'instagramFeed' | 'instagramStories' | 'instagramReels' | 'facebook' | 'print'
  >('whatsapp');
  const [isAdaptingChannel, setIsAdaptingChannel] = useState(false);

  // Voice & Text Chat state
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceSpeakEnabled, setVoiceSpeakEnabled] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Daily report state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-save debounce timer ref (Correction 6)
  const autoSaveTimerRef = useRef<number | null>(null);

  const showTemporaryNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 5000);
  };

  // Sync when external SSE data arrives
  useEffect(() => {
    if (externalJuliaData) {
      setJuliaData(externalJuliaData);
      setIsLoading(false);
      try {
        window.localStorage.setItem(
          LOCAL_BACKUP_KEY,
          JSON.stringify(externalJuliaData)
        );
      } catch {
        // ignore storage quota
      }
    }
  }, [externalJuliaData]);

  // Initial load from server + official integrations check
  useEffect(() => {
    let mounted = true;
    async function fetchJuliaStoreAndIntegrations() {
      try {
        const [juliaRes, intRes] = await Promise.all([
          fetch('/api/julia'),
          fetch('/api/julia/integrations-status'),
        ]);
        if (intRes.ok) {
          const intData = await intRes.json();
          if (mounted && intData.integrations) {
            setIntegrationsStatus(intData.integrations);
          }
        }
        if (juliaRes.ok) {
          const data = await juliaRes.json();
          if (mounted && data.juliaData) {
            setJuliaData(data.juliaData);
            try {
              window.localStorage.setItem(
                LOCAL_BACKUP_KEY,
                JSON.stringify(data.juliaData)
              );
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // Fallback to local safety backup if offline
        try {
          const cached = window.localStorage.getItem(LOCAL_BACKUP_KEY);
          if (cached && mounted && !juliaData) {
            setJuliaData(JSON.parse(cached));
          }
        } catch {
          // ignore
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchJuliaStoreAndIntegrations();
    return () => {
      mounted = false;
    };
  }, []);

  // Camera lifecycle
  useEffect(() => {
    if (!cameraOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return;
    }
    let active = true;
    async function initCamera() {
      setCameraError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
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
      } catch {
        setCameraError(
          'Câmera integrada indisponível neste navegador. Use o botão "Enviar Foto do Celular / Computador" para selecionar direto do aparelho.'
        );
      }
    }
    initCamera();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen, cameraFacing]);

  const speakTextInPortuguese = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  const stopVoiceSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const activeProject: JuliaSmartAdProject | null =
    juliaData?.projects.find((p) => p.id === juliaData.activeProjectId) ||
    juliaData?.projects[0] ||
    null;

  const currentStep = activeProject?.currentStep || 1;
  const currentStepMeta =
    TWELVE_STEPS_META.find((s) => s.step === currentStep) || TWELVE_STEPS_META[0];

  const handlePersistJuliaData = async (
    nextData: JuliaDepartmentData,
    noticeMsg?: string
  ) => {
    setJuliaData(nextData);
    try {
      window.localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(nextData));
    } catch {
      // ignore
    }
    setIsSaving(true);
    setErrorNotice(null);
    try {
      const res = await fetch('/api/julia', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-station-name': stationName,
        },
        body: JSON.stringify(nextData),
      });
      const data = await res.json();
      if (res.ok && data.juliaData) {
        setJuliaData(data.juliaData);
        try {
          window.localStorage.setItem(
            LOCAL_BACKUP_KEY,
            JSON.stringify(data.juliaData)
          );
        } catch {
          // ignore
        }
        if (noticeMsg) showTemporaryNotice(noticeMsg);
      }
    } catch (err) {
      setErrorNotice(
        err instanceof Error ? err.message : 'Erro ao salvar dados da Júlia.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Schedule automatic background save whenever project fields change (Correction 6)
  const scheduleAutoSave = (nextData: JuliaDepartmentData) => {
    try {
      window.localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(nextData));
    } catch {
      // ignore
    }
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch('/api/julia', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-station-name': stationName,
          },
          body: JSON.stringify(nextData),
        });
      } catch {
        // ignore background network glitch
      }
    }, 550);
  };

  const updateActiveProjectLocal = (
    updater: (proj: JuliaSmartAdProject) => JuliaSmartAdProject,
    immediatePersistNotice?: string
  ) => {
    if (!juliaData || !activeProject) return;
    const updatedProj = updater({
      ...activeProject,
      updatedAt: new Date().toISOString(),
    });
    const nextData: JuliaDepartmentData = {
      ...juliaData,
      projects: juliaData.projects.map((p) =>
        p.id === updatedProj.id ? updatedProj : p
      ),
    };
    setJuliaData(nextData);
    if (immediatePersistNotice !== undefined) {
      handlePersistJuliaData(nextData, immediatePersistNotice);
    } else {
      scheduleAutoSave(nextData);
    }
    return nextData;
  };

  // ============================================================================
  // CORREÇÃO 5 — FIDELIDADE AOS TEXTOS: ATUALIZAÇÃO AUTOMÁTICA ENTRE ETAPAS
  // ============================================================================
  const handleUpdateHeadlineWithFidelity = (newHeadline: string) => {
    updateActiveProjectLocal((p) => {
      const updatedFeed = p.adFeedAdaptedByAi
        ? p.adFeedText
        : buildFaithfulFeedText(
            newHeadline,
            p.copyText,
            p.ctaButtonText,
            p.whatsappDirectNumber,
            p.hashtags
          );
      const updatedStories = p.adStoriesAdaptedByAi
        ? p.adStoriesText
        : buildFaithfulStoriesText(
            newHeadline,
            p.copyText,
            p.ctaButtonText,
            p.whatsappDirectNumber
          );
      const updatedSlides = p.carouselSlides.map((sl, idx) =>
        idx === 0 && (sl.title === p.headline || !sl.title.trim())
          ? { ...sl, title: newHeadline }
          : sl
      );
      return {
        ...p,
        headline: newHeadline,
        adFeedText: updatedFeed,
        adStoriesText: updatedStories,
        posterConfig: {
          ...p.posterConfig,
          headline: newHeadline,
        },
        carouselSlides: updatedSlides,
      };
    });
  };

  const handleUpdateCopyTextWithFidelity = (newCopyText: string) => {
    updateActiveProjectLocal((p) => {
      const updatedFeed = p.adFeedAdaptedByAi
        ? p.adFeedText
        : buildFaithfulFeedText(
            p.headline,
            newCopyText,
            p.ctaButtonText,
            p.whatsappDirectNumber,
            p.hashtags
          );
      const updatedStories = p.adStoriesAdaptedByAi
        ? p.adStoriesText
        : buildFaithfulStoriesText(
            p.headline,
            newCopyText,
            p.ctaButtonText,
            p.whatsappDirectNumber
          );
      return {
        ...p,
        copyText: newCopyText,
        adFeedText: updatedFeed,
        adStoriesText: updatedStories,
      };
    });
  };

  const handleRestoreFaithfulTextsStep6 = () => {
    if (!activeProject) return;
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      adFeedText: buildFaithfulFeedText(
        p.headline,
        p.copyText,
        p.ctaButtonText,
        p.whatsappDirectNumber,
        p.hashtags
      ),
      adStoriesText: buildFaithfulStoriesText(
        p.headline,
        p.copyText,
        p.ctaButtonText,
        p.whatsappDirectNumber
      ),
      adFeedAdaptedByAi: false,
      adStoriesAdaptedByAi: false,
    }));
    if (nextData) {
      handlePersistJuliaData(
        nextData,
        'Anúncios Feed e Stories sincronizados fielmente com o Título (Etapa 4) e o Texto (Etapa 5)!'
      );
    }
  };

  // ============================================================================
  // CORREÇÃO 6 — BIBLIOTECA E GESTÃO DE MÚLTIPLAS CAMPANHAS SALVAS
  // ============================================================================
  const handleSelectSavedCampaignProject = async (projectId: string) => {
    if (!juliaData) return;
    const nextData: JuliaDepartmentData = {
      ...juliaData,
      activeProjectId: projectId,
    };
    await handlePersistJuliaData(nextData, 'Campanha recuperada da biblioteca!');
  };

  const handleCreateNewCampaignProject = async () => {
    if (!juliaData) return;
    const today = new Date().toISOString().slice(0, 10);
    const num = juliaData.projects.length + 1;
    const defaultHeadline = `Nova Campanha Castros Interiores #${num}`;
    const defaultCopy =
      'Transforme o ambiente da sua sala preservando o design e o conforto do seu estofado favorito com acabamento artesanal de alto padrão.';
    const defaultCta = 'Solicite Atendimento Exclusivo';
    const defaultHashtags =
      '#CastrosInteriores #EstofadosDeAltoPadrao #DesignDeInteriores #DecoracaoElegante';
    const firstPhotoId = juliaData.photos[0]?.id;

    const newProj: JuliaSmartAdProject = {
      id: `proj-julia-${Date.now()}`,
      name: `Campanha #${num} — Castros Interiores (${today})`,
      currentStep: 1,
      selectedPhotoIds: firstPhotoId ? [firstPhotoId] : [],
      campaignObjective:
        'Divulgar a excelência estética, conforto sob medida e acabamento artesanal da Castros Interiores.',
      targetAudience:
        'Clientes residenciais, arquitetos e apreciadores de decoração de alto padrão.',
      pieceFormat: 'Anúncio',
      headline: defaultHeadline,
      copyText: defaultCopy,
      adFeedText: buildFaithfulFeedText(
        defaultHeadline,
        defaultCopy,
        defaultCta,
        workshopPhone || '(91) 98556-9841',
        defaultHashtags
      ),
      adStoriesText: buildFaithfulStoriesText(
        defaultHeadline,
        defaultCopy,
        defaultCta,
        workshopPhone || '(91) 98556-9841'
      ),
      adFeedAdaptedByAi: false,
      adStoriesAdaptedByAi: false,
      posterConfig: {
        headline: defaultHeadline,
        subheadline: 'Alta Estofaria & Design Artesanal Sob Medida',
        badgeText: 'CASTROS INTERIORES',
        ctaText: 'Solicite Atendimento pelo WhatsApp',
        contactLine: workshopPhone || '(91) 98556-9841',
        theme: 'noite_ouro',
        photoId: firstPhotoId,
      },
      carouselSlides: [1, 2, 3, 4, 5].map((n, idx) => ({
        slideNumber: n,
        title:
          n === 1
            ? defaultHeadline
            : `Destaque ${n} — Castros Interiores`,
        body:
          n === 5
            ? `Fale conosco pelo WhatsApp ${workshopPhone || '(91) 98556-9841'} e solicite seu atendimento.`
            : 'Acabamento artesanal, alinhamento preciso e materiais selecionados.',
        photoId: juliaData.photos[idx % Math.max(1, juliaData.photos.length)]?.id,
        theme: 'noite_ouro',
      })),
      catalogEntries: activeProject?.catalogEntries
        ? [...activeProject.catalogEntries]
        : [],
      hashtags: defaultHashtags,
      ctaButtonText: defaultCta,
      whatsappDirectNumber: workshopPhone || '(91) 98556-9841',
      scheduleChannel: 'Instagram Feed',
      scheduleDate: today,
      scheduleTime: '18:00',
      scheduleMode: 'planejada_manual',
      finalReviewNotes: 'Campanha pronta para revisão e disparo.',
      stepStates: { 1: { saved: true, savedAt: new Date().toISOString() } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextData: JuliaDepartmentData = {
      ...juliaData,
      projects: [newProj, ...juliaData.projects],
      activeProjectId: newProj.id,
    };
    await handlePersistJuliaData(
      nextData,
      `Nova campanha "${newProj.name}" criada e salva na biblioteca!`
    );
  };

  // ============================================================================
  // ADAPTAÇÃO INTELIGENTE DE TEXTOS POR REDE SOCIAL (ATUALIZAÇÃO JÚLIA)
  // ============================================================================
  const handleChangeTargetChannel = async (channel: JuliaTargetChannel) => {
    if (!activeProject || !juliaData) return;
    setIsAdaptingChannel(true);
    setErrorNotice(null);
    try {
      const cleanPhone = (
        activeProject.whatsappDirectNumber ||
        workshopPhone ||
        '(91) 98556-9841'
      )
        .replace(/^whatsapp\s*:\s*/i, '')
        .trim();

      const baselineVersions = generateSocialMediaVersionsClient(
        activeProject.headline,
        activeProject.copyText,
        activeProject.ctaButtonText,
        cleanPhone,
        activeProject.hashtags
      );

      const mergedVersions: JuliaSocialMediaVersions = {
        ...baselineVersions,
        ...(activeProject.socialMediaVersions || {}),
        whatsappMessage: stripHashtags(
          activeProject.socialMediaVersions?.whatsappMessage || baselineVersions.whatsappMessage
        ),
        whatsappStatus: stripHashtags(
          activeProject.socialMediaVersions?.whatsappStatus || baselineVersions.whatsappStatus
        ),
        updatedAt: new Date().toISOString(),
      };

      let nextScheduleChannel = activeProject.scheduleChannel;
      let nextAdFeed = activeProject.adFeedText;
      let nextAdStories = activeProject.adStoriesText;

      if (channel === 'WhatsApp') {
        nextScheduleChannel = 'Lista de Transmissão WhatsApp';
        nextAdFeed = mergedVersions.whatsappMessage;
        setSocialChannelTab('whatsapp');
      } else if (channel === 'WhatsApp Status') {
        nextScheduleChannel = 'WhatsApp Status';
        nextAdStories = mergedVersions.whatsappStatus;
        setSocialChannelTab('whatsappStatus');
      } else if (channel === 'Instagram Feed') {
        nextScheduleChannel = 'Instagram Feed';
        nextAdFeed = mergedVersions.instagramFeed;
        setSocialChannelTab('instagramFeed');
      } else if (channel === 'Instagram Stories') {
        nextScheduleChannel = 'Instagram Stories';
        nextAdStories = mergedVersions.instagramStories;
        setSocialChannelTab('instagramStories');
      } else if (channel === 'Facebook') {
        nextScheduleChannel = 'Facebook';
        nextAdFeed = mergedVersions.facebook;
        setSocialChannelTab('facebook');
      } else if (channel === 'Catálogo comercial' || channel === 'Pôster publicitário') {
        setSocialChannelTab('print');
      } else {
        setSocialChannelTab('whatsapp');
      }

      const nextData = updateActiveProjectLocal((p) => ({
        ...p,
        targetChannel: channel,
        socialMediaVersions: mergedVersions,
        scheduleChannel: nextScheduleChannel,
        adFeedText: nextAdFeed,
        adStoriesText: nextAdStories,
      }));

      if (nextData) {
        await handlePersistJuliaData(
          nextData,
          channel === 'Todas as redes sociais'
            ? 'Versões independentes e adequadas geradas para cada rede social!'
            : `Divulgação configurada para ${channel}! Textos adaptados para a rede social.`
        );
      }
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : 'Falha ao adaptar canal de divulgação.'
      );
    } finally {
      setIsAdaptingChannel(false);
    }
  };

  const handleUpdateSocialMediaVersionText = (
    key: keyof JuliaSocialMediaVersions,
    newText: string
  ) => {
    updateActiveProjectLocal((p) => {
      const currentVersions = p.socialMediaVersions || generateSocialMediaVersionsClient(
        p.headline,
        p.copyText,
        p.ctaButtonText,
        p.whatsappDirectNumber,
        p.hashtags
      );
      const cleaned = (key === 'whatsappMessage' || key === 'whatsappStatus')
        ? stripHashtags(newText)
        : newText;
      const nextVersions: JuliaSocialMediaVersions = {
        ...currentVersions,
        [key]: cleaned,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...p,
        socialMediaVersions: nextVersions,
        ...(key === 'instagramFeed' && p.targetChannel === 'Instagram Feed'
          ? { adFeedText: cleaned }
          : {}),
        ...(key === 'facebook' && p.targetChannel === 'Facebook'
          ? { adFeedText: cleaned }
          : {}),
        ...(key === 'whatsappMessage' && p.targetChannel === 'WhatsApp'
          ? { adFeedText: cleaned }
          : {}),
        ...(key === 'instagramStories' && p.targetChannel === 'Instagram Stories'
          ? { adStoriesText: cleaned }
          : {}),
        ...(key === 'whatsappStatus' && p.targetChannel === 'WhatsApp Status'
          ? { adStoriesText: cleaned }
          : {}),
      };
    });
  };

  // ============================================================================
  // OS 4 BOTÕES DAS 12 ETAPAS DO ANÚNCIO INTELIGENTE: VOLTÁ, AVANÇÁ, SALVÁ, CORRIGÍ
  // ============================================================================
  const handleStepVoltar = async () => {
    if (!juliaData || !activeProject) return;
    const prevStep = Math.max(1, currentStep - 1);
    const now = new Date().toISOString();
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      currentStep: prevStep,
      stepStates: {
        ...p.stepStates,
        [currentStep]: {
          ...p.stepStates[currentStep],
          saved: true,
          savedAt: now,
        },
      },
    }));
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        `Alterações salvas · Voltou para a Etapa ${prevStep} de 12`
      );
    }
  };

  const handleStepAvancar = async () => {
    if (!juliaData || !activeProject) return;
    const nextStep = Math.min(12, currentStep + 1);
    const now = new Date().toISOString();
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      currentStep: nextStep,
      stepStates: {
        ...p.stepStates,
        [currentStep]: {
          ...p.stepStates[currentStep],
          saved: true,
          savedAt: now,
        },
      },
    }));
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        `Etapa ${currentStep} salva · Avançou para a Etapa ${nextStep} de 12`
      );
    }
  };

  const handleStepSalvar = async () => {
    if (!juliaData || !activeProject) return;
    const now = new Date().toISOString();
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      stepStates: {
        ...p.stepStates,
        [currentStep]: {
          ...p.stepStates[currentStep],
          saved: true,
          savedAt: now,
        },
      },
    }));
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        `Etapa ${currentStep} (${currentStepMeta.shortTitle}) e todos os dados da campanha salvos com segurança!`
      );
    }
  };

  const handleStepCorrigirWithAI = async (customInstruction?: string) => {
    if (!activeProject || isGeneratingAi) return;
    setIsGeneratingAi(true);
    setErrorNotice(null);
    try {
      if (juliaData) {
        await fetch('/api/julia', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(juliaData),
        });
      }

      const res = await fetch('/api/julia/ai-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          stepNumber: currentStep,
          correctionInstruction:
            customInstruction?.trim() ||
            correctionInstruction.trim() ||
            `Refine e aperfeiçoe apenas a Etapa ${currentStep} (${currentStepMeta.fullTitle}) mantendo total fidelidade ao título "${activeProject.headline}" e às informações aprovadas pelo usuário.`,
          mode: 'correct_step',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.juliaData) {
        throw new Error(
          data.error || 'Não foi possível corrigir a etapa com a Júlia IA.'
        );
      }
      setJuliaData(data.juliaData);
      setCorrectionInstruction('');
      setCorrectionModeOpen(false);
      showTemporaryNotice(
        `Etapa ${currentStep} aperfeiçoada pela Júlia IA (preservando os demais textos da campanha)!`
      );
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : 'Erro ao corrigir etapa com a Júlia.'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ============================================================================
  // RECEBIMENTO E VINCULAÇÃO DE FOTOGRAFIAS REAIS (ETAPA 1, CARROSSEL E CATÁLOGO)
  // ============================================================================
  const handleUploadMobilePhoto = async (
    fileOrDataUrl: File | string,
    options?: {
      assignToSlideIndex?: number;
      assignToCatalogEntryId?: string;
      addToCatalogDraftForm?: boolean;
      customTitle?: string;
    }
  ): Promise<JuliaMarketingPhoto | null> => {
    setIsUploadingPhoto(true);
    setErrorNotice(null);
    try {
      const { fullDataUrl, thumbnailDataUrl, mimeType } =
        await compressPhotoForUpload(fileOrDataUrl);

      const res = await fetch('/api/julia/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-station-name': stationName,
        },
        body: JSON.stringify({
          title:
            options?.customTitle ||
            photoTitleInput.trim() ||
            `Fotografia Castros #${(juliaData?.photos.length || 0) + 1}`,
          caption:
            photoCaptionInput.trim() ||
            'Fotografia real enviada para a biblioteca da Castros Interiores.',
          tag: photoTagInput,
          dataUrl: fullDataUrl,
          thumbnailDataUrl,
          mimeType,
          sourceDevice: `${stationName} (${deviceFormFactor})`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.juliaData || !data.photo) {
        throw new Error(
          data.error || 'Falha ao enviar fotografia para a galeria da Júlia.'
        );
      }

      const uploadedPhoto: JuliaMarketingPhoto = data.photo;
      let nextJuliaData: JuliaDepartmentData = data.juliaData;

      // Se o envio partiu de uma lâmina do Carrossel (Etapa 8), vincula imediatamente àquela lâmina
      if (typeof options?.assignToSlideIndex === 'number') {
        const slideIdx = options.assignToSlideIndex;
        nextJuliaData = {
          ...nextJuliaData,
          projects: nextJuliaData.projects.map((p) => {
            if (p.id !== nextJuliaData.activeProjectId) return p;
            return {
              ...p,
              carouselSlides: p.carouselSlides.map((s, idx) =>
                idx === slideIdx ? { ...s, photoId: uploadedPhoto.id } : s
              ),
            };
          }),
        };
        await handlePersistJuliaData(
          nextJuliaData,
          `Fotografia "${uploadedPhoto.title}" adicionada à Lâmina ${slideIdx + 1} do Carrossel!`
        );
      } else if (options?.assignToCatalogEntryId) {
        // Se o envio partiu de um produto já cadastrado no Catálogo (Etapa 9)
        const targetId = options.assignToCatalogEntryId;
        nextJuliaData = {
          ...nextJuliaData,
          projects: nextJuliaData.projects.map((p) => {
            if (p.id !== nextJuliaData.activeProjectId) return p;
            return {
              ...p,
              catalogEntries: p.catalogEntries.map((entry) => {
                if (entry.id !== targetId) return entry;
                const existingIds = entry.photoIds?.length
                  ? entry.photoIds
                  : entry.photoId
                  ? [entry.photoId]
                  : [];
                const nextPhotoIds = Array.from(
                  new Set([...existingIds, uploadedPhoto.id])
                );
                return {
                  ...entry,
                  photoId: nextPhotoIds[0],
                  photoIds: nextPhotoIds,
                };
              }),
            };
          }),
        };
        await handlePersistJuliaData(
          nextJuliaData,
          `Fotografia "${uploadedPhoto.title}" vinculada ao produto do catálogo!`
        );
      } else {
        setJuliaData(nextJuliaData);
        if (options?.addToCatalogDraftForm) {
          setCatSelectedPhotoIds((prev) =>
            Array.from(new Set([...prev, uploadedPhoto.id]))
          );
        }
        showTemporaryNotice(
          `Fotografia "${uploadedPhoto.title}" salva na biblioteca da Castros Interiores!`
        );
      }

      setPhotoTitleInput('');
      setPhotoCaptionInput('');
      return uploadedPhoto;
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar fotografia para a Júlia.'
      );
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCameraOpen(false);
    await handleUploadMobilePhoto(dataUrl);
  };

  const handleDeleteJuliaPhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/julia/photos/${photoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.juliaData) {
        setJuliaData(data.juliaData);
        showTemporaryNotice('Fotografia removida da biblioteca.');
      }
    } catch {
      // ignore
    }
  };

  const handleToggleSelectPhotoForCampaign = async (photoId: string) => {
    if (!juliaData || !activeProject) return;
    const exists = activeProject.selectedPhotoIds.includes(photoId);
    const nextIds = exists
      ? activeProject.selectedPhotoIds.filter((id) => id !== photoId)
      : [photoId, ...activeProject.selectedPhotoIds];
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      selectedPhotoIds: nextIds,
      posterConfig: {
        ...p.posterConfig,
        photoId: nextIds[0] || p.posterConfig.photoId,
      },
    }));
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        'Fotografia atualizada nas peças da campanha!'
      );
    }
  };

  // ============================================================================
  // CORREÇÃO 1 — RENDERIZAÇÃO EM CANVAS E EXPORTAÇÃO DO CARROSSEL (PNG E ZIP)
  // ============================================================================
  const renderCarouselSlideToCanvas = async (
    slideIndex: number
  ): Promise<HTMLCanvasElement | null> => {
    if (!activeProject || !juliaData) return null;
    const slide = activeProject.carouselSlides[slideIndex];
    if (!slide) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const themeKey: JuliaSlideTheme = slide.theme || 'noite_ouro';
    const palette = SLIDE_THEME_PALETTES[themeKey] || SLIDE_THEME_PALETTES.noite_ouro;

    // Background
    ctx.fillStyle = palette.bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer frame
    ctx.strokeStyle = palette.accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    // Top bar: Brand + Slide indicator
    ctx.fillStyle = palette.accentHex;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CASTROS INTERIORES', 76, 102);

    ctx.textAlign = 'right';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(
      `LÂMINA ${slideIndex + 1}/${activeProject.carouselSlides.length}`,
      canvas.width - 76,
      102
    );

    // Resolve slide photo (or fallback to campaign primary photo)
    const slidePhoto =
      juliaData.photos.find((ph) => ph.id === slide.photoId) ||
      juliaData.photos.find((ph) => activeProject.selectedPhotoIds.includes(ph.id)) ||
      juliaData.photos[slideIndex % Math.max(1, juliaData.photos.length)];

    const imgEl = await loadPhotoAsImageElement(slidePhoto);
    const photoX = 76;
    const photoY = 135;
    const photoW = 928;
    const photoH = 660;

    if (imgEl) {
      drawCoverImageOnCanvas(ctx, imgEl, photoX, photoY, photoW, photoH);
      ctx.strokeStyle = palette.accentHex;
      ctx.lineWidth = 3;
      ctx.strokeRect(photoX, photoY, photoW, photoH);
    } else {
      ctx.fillStyle = palette.cardHex;
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.strokeStyle = palette.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = palette.subTextHex;
      ctx.textAlign = 'center';
      ctx.font = '28px serif';
      ctx.fillText(
        'CASTROS INTERIORES — ALTA ESTOFARIA',
        canvas.width / 2,
        photoY + photoH / 2
      );
    }

    // Text Card area
    ctx.fillStyle = palette.cardHex;
    ctx.fillRect(76, 825, 928, 370);
    ctx.strokeStyle = palette.accentHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(76, 825, 928, 370);

    // Slide Title
    ctx.fillStyle = palette.textHex;
    ctx.textAlign = 'left';
    ctx.font = 'bold 42px serif';
    const titleLines = wrapCanvasText(
      ctx,
      slide.title || activeProject.headline,
      850,
      2
    );
    let textY = 890;
    for (const line of titleLines) {
      ctx.fillText(line, 114, textY);
      textY += 50;
    }

    // Divider line
    ctx.fillStyle = palette.accentHex;
    ctx.fillRect(114, textY - 22, 140, 4);
    textY += 24;

    // Slide Body Description
    ctx.fillStyle = palette.subTextHex;
    ctx.font = '30px sans-serif';
    const bodyLines = wrapCanvasText(ctx, slide.body || '', 850, 4);
    for (const bLine of bodyLines) {
      ctx.fillText(bLine, 114, textY);
      textY += 42;
    }

    // Bottom Footer bar (WhatsApp + Swipe prompt)
    ctx.fillStyle = palette.accentHex;
    ctx.textAlign = 'left';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(
      `WhatsApp: ${activeProject.whatsappDirectNumber || workshopPhone}`,
      76,
      1258
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = palette.textHex;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(
      slideIndex < activeProject.carouselSlides.length - 1
        ? 'Deslize para o lado →'
        : activeProject.ctaButtonText || 'Fale Conosco no WhatsApp',
      canvas.width - 76,
      1258
    );

    return canvas;
  };

  const handleDownloadSingleCarouselSlidePng = async (slideIdx: number) => {
    setIsExportingCarousel(true);
    try {
      const canvas = await renderCarouselSlideToCanvas(slideIdx);
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `carrossel-lamina-0${slideIdx + 1}-castros-interiores.png`;
      a.click();
      showTemporaryNotice(
        `Lâmina ${slideIdx + 1} do Carrossel baixada em PNG com fotografia real!`
      );
    } finally {
      setIsExportingCarousel(false);
    }
  };

  const handleDownloadAllCarouselSlidesSeparatePng = async () => {
    if (!activeProject) return;
    setIsExportingCarousel(true);
    try {
      for (let i = 0; i < activeProject.carouselSlides.length; i++) {
        const canvas = await renderCarouselSlideToCanvas(i);
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `carrossel-lamina-0${i + 1}-castros-interiores.png`;
          a.click();
          await new Promise((r) => setTimeout(r, 220));
        }
      }
      showTemporaryNotice(
        'As 5 lâminas do Carrossel foram exportadas em arquivos PNG separados!'
      );
    } finally {
      setIsExportingCarousel(false);
    }
  };

  const handleDownloadCarouselZip = async () => {
    if (!activeProject) return;
    setIsExportingCarousel(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < activeProject.carouselSlides.length; i++) {
        const canvas = await renderCarouselSlideToCanvas(i);
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          zip.file(
            `lamina-0${i + 1}-castros-interiores.png`,
            base64Data,
            { base64: true }
          );
        }
      }

      const campaignTxt = [
        `CAMPANHA: ${activeProject.name}`,
        `TÍTULO (ETAPA 4): ${activeProject.headline}`,
        ``,
        `TEXTO PUBLICITÁRIO (ETAPA 5):`,
        activeProject.copyText,
        ``,
        `CHAMADA PARA AÇÃO (CTA): ${activeProject.ctaButtonText}`,
        `WHATSAPP: ${activeProject.whatsappDirectNumber || workshopPhone}`,
        `HASHTAGS: ${activeProject.hashtags}`,
      ].join('\n');

      zip.file('legenda-campanha-castros.txt', campaignTxt);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carrossel-5-laminas-castros-interiores.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showTemporaryNotice(
        'Pacote ZIP com as 5 imagens PNG do Carrossel + Legenda baixado com sucesso!'
      );
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar arquivo ZIP do carrossel.'
      );
    } finally {
      setIsExportingCarousel(false);
    }
  };

  const handleMoveCarouselSlide = (fromIndex: number, direction: -1 | 1) => {
    if (!activeProject) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= activeProject.carouselSlides.length) return;
    const nextData = updateActiveProjectLocal((p) => {
      const copy = [...p.carouselSlides];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      const renumbered = copy.map((sl, idx) => ({
        ...sl,
        slideNumber: idx + 1,
      }));
      return {
        ...p,
        carouselSlides: renumbered,
      };
    });
    setActiveCarouselIndex(toIndex);
    if (nextData) {
      handlePersistJuliaData(
        nextData,
        `Lâmina reorganizada para a posição ${toIndex + 1}!`
      );
    }
  };

  // ============================================================================
  // EXPORTAÇÃO DE PÔSTER (PNG) — PRESERVADO E SINCRONIZADO COM FOTOS E TÍTULO ATUAL
  // ============================================================================
  const primaryCampaignPhoto: JuliaMarketingPhoto | undefined =
    juliaData?.photos.find((p) => p.id === activeProject?.posterConfig.photoId) ||
    juliaData?.photos.find((p) =>
      activeProject?.selectedPhotoIds.includes(p.id)
    ) ||
    juliaData?.photos[0];

  const renderPosterToCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!activeProject) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const theme = activeProject.posterConfig.theme;
    const bgHex =
      theme === 'editorial_creme'
        ? '#F9F6F0'
        : theme === 'atelier_bronze'
        ? '#261E18'
        : '#181512';
    const textHex = theme === 'editorial_creme' ? '#181512' : '#F9F6F0';
    const accentHex = '#9A7138';

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      (activeProject.posterConfig.badgeText || 'CASTROS INTERIORES').toUpperCase(),
      canvas.width / 2,
      110
    );

    const imgEl = await loadPhotoAsImageElement(primaryCampaignPhoto);
    if (imgEl) {
      drawCoverImageOnCanvas(ctx, imgEl, 90, 150, 900, 640);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3;
      ctx.strokeRect(90, 150, 900, 640);
    } else {
      ctx.fillStyle = '#2E2722';
      ctx.fillRect(90, 150, 900, 640);
      ctx.fillStyle = '#D8C5A3';
      ctx.font = '28px serif';
      ctx.fillText(
        'CASTROS INTERIORES — ALTA ESTOFARIA',
        canvas.width / 2,
        470
      );
    }

    // Headline (sempre fiel ao título configurado no pôster / Etapa 4)
    const posterTitle =
      activeProject.posterConfig.headline ||
      activeProject.headline ||
      'CASTROS INTERIORES';
    ctx.fillStyle = textHex;
    ctx.font = 'bold 46px serif';
    const titleLines = wrapCanvasText(ctx, posterTitle, 900, 2);
    let yTitle = 865;
    for (const line of titleLines) {
      ctx.fillText(line, canvas.width / 2, yTitle);
      yTitle += 54;
    }

    // Subheadline
    ctx.fillStyle = theme === 'editorial_creme' ? '#57534E' : '#D6CFC5';
    ctx.font = '30px sans-serif';
    const subLines = wrapCanvasText(
      ctx,
      activeProject.posterConfig.subheadline || activeProject.copyText,
      880,
      2
    );
    for (const sLine of subLines) {
      ctx.fillText(sLine, canvas.width / 2, yTitle + 10);
      yTitle += 40;
    }

    // CTA Box
    ctx.fillStyle = accentHex;
    ctx.fillRect(160, 1080, 760, 88);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(
      (
        activeProject.posterConfig.ctaText ||
        activeProject.ctaButtonText ||
        'Fale pelo WhatsApp'
      ).slice(0, 46),
      canvas.width / 2,
      1135
    );

    // Contact line
    ctx.fillStyle = textHex;
    ctx.font = 'bold 32px monospace';
    ctx.fillText(
      `WhatsApp: ${
        activeProject.posterConfig.contactLine ||
        activeProject.whatsappDirectNumber ||
        workshopPhone
      }`,
      canvas.width / 2,
      1235
    );

    return canvas;
  };

  const handleDownloadPosterPng = async () => {
    const canvas = await renderPosterToCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `poster-castros-interiores-${Date.now()}.png`;
    a.click();
    showTemporaryNotice('Pôster em alta resolução (PNG) baixado com sucesso!');
  };

  // ============================================================================
  // CORREÇÃO 2 — CATÁLOGO COMERCIAL COMPLETO COM FOTOGRAFIAS REAIS E PDF A4
  // ============================================================================
  const resetCatalogForm = () => {
    setEditingCatalogId(null);
    setCatTitle('');
    setCatCategory(PRODUCT_CATEGORIES[0]);
    setCatCollection('Coleção Castros Interiores');
    setCatDescription('');
    setCatMeasurements('');
    setCatColors('');
    setCatPrice('');
    setCatHighlight('Acabamento de Atelier');
    setCatSelectedPhotoIds(
      primaryCampaignPhoto ? [primaryCampaignPhoto.id] : []
    );
  };

  const handleStartEditCatalogEntry = (entry: JuliaCatalogEntry) => {
    setEditingCatalogId(entry.id);
    setCatTitle(entry.title || '');
    setCatCategory(entry.category || PRODUCT_CATEGORIES[0]);
    setCatCollection(entry.collectionLine || 'Coleção Castros Interiores');
    setCatDescription(entry.styleDescription || '');
    setCatMeasurements(entry.measurements || '');
    setCatColors(entry.availableColors || '');
    setCatPrice(entry.priceText || '');
    setCatHighlight(entry.highlightTag || 'Acabamento de Atelier');
    const ids =
      entry.photoIds && entry.photoIds.length > 0
        ? entry.photoIds
        : entry.photoId
        ? [entry.photoId]
        : [];
    setCatSelectedPhotoIds(ids);
  };

  const handleSaveCatalogProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !juliaData) return;
    if (!catTitle.trim()) {
      setErrorNotice('Informe o nome do produto para salvar no catálogo.');
      return;
    }

    const finalPhotoIds =
      catSelectedPhotoIds.length > 0
        ? catSelectedPhotoIds
        : primaryCampaignPhoto
        ? [primaryCampaignPhoto.id]
        : [];

    const entryPayload: JuliaCatalogEntry = {
      id: editingCatalogId || `cat-${Date.now()}`,
      title: catTitle.trim(),
      category: catCategory.trim() || 'Estofado de Alto Padrão',
      collectionLine: catCollection.trim() || 'Coleção Castros Interiores',
      styleDescription:
        catDescription.trim() ||
        'Acabamento artesanal de alto padrão com seleção criteriosa de revestimentos e conforto sob medida.',
      measurements: catMeasurements.trim() || undefined,
      availableColors: catColors.trim() || undefined,
      priceText: catPrice.trim() || undefined,
      highlightTag: catHighlight.trim() || 'Acabamento de Atelier',
      photoId: finalPhotoIds[0],
      photoIds: finalPhotoIds,
    };

    const nextData = updateActiveProjectLocal((p) => {
      const exists = p.catalogEntries.some((c) => c.id === entryPayload.id);
      const nextEntries = exists
        ? p.catalogEntries.map((c) =>
            c.id === entryPayload.id ? entryPayload : c
          )
        : [...p.catalogEntries, entryPayload];
      return {
        ...p,
        catalogEntries: nextEntries,
      };
    });

    resetCatalogForm();
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        editingCatalogId
          ? 'Produto atualizado no Catálogo Digital!'
          : 'Produto com fotografias reais adicionado ao Catálogo Digital!'
      );
    }
  };

  const handleDeleteCatalogProduct = async (entryId: string) => {
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      catalogEntries: p.catalogEntries.filter((c) => c.id !== entryId),
    }));
    if (editingCatalogId === entryId) {
      resetCatalogForm();
    }
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        'Produto removido do Catálogo Digital.'
      );
    }
  };

  const handleTogglePhotoInCatalogProduct = async (
    entryId: string,
    photoId: string
  ) => {
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      catalogEntries: p.catalogEntries.map((entry) => {
        if (entry.id !== entryId) return entry;
        const currentIds =
          entry.photoIds && entry.photoIds.length > 0
            ? entry.photoIds
            : entry.photoId
            ? [entry.photoId]
            : [];
        const hasPhoto = currentIds.includes(photoId);
        const nextIds = hasPhoto
          ? currentIds.filter((id) => id !== photoId)
          : [...currentIds, photoId];
        return {
          ...entry,
          photoId: nextIds[0],
          photoIds: nextIds,
        };
      }),
    }));
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        'Fotografias do produto atualizadas no catálogo!'
      );
    }
  };

  const getProductPhotos = (entry: JuliaCatalogEntry): JuliaMarketingPhoto[] => {
    if (!juliaData) return [];
    const ids =
      entry.photoIds && entry.photoIds.length > 0
        ? entry.photoIds
        : entry.photoId
        ? [entry.photoId]
        : [];
    const matched = ids
      .map((id) => juliaData.photos.find((ph) => ph.id === id))
      .filter(Boolean) as JuliaMarketingPhoto[];
    return matched;
  };

  const handleDownloadCatalogPdf = async () => {
    if (!activeProject || !juliaData) return;
    setIsGeneratingCatalogPdf(true);
    setErrorNotice(null);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const contactWhatsapp =
        activeProject.whatsappDirectNumber || workshopPhone || '(91) 98556-9841';

      // ======================================================================
      // PÁGINA 1: CAPA EDITORIAL CASTROS INTERIORES + APRESENTAÇÃO
      // ======================================================================
      doc.setFillColor(24, 21, 18);
      doc.rect(0, 0, 210, 297, 'F');

      // Moldura dourada
      doc.setDrawColor(154, 113, 56);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, 186, 273);
      doc.setLineWidth(0.3);
      doc.rect(15, 15, 180, 267);

      doc.setTextColor(216, 197, 163);
      doc.setFontSize(11);
      doc.text(
        'CATÁLOGO COMERCIAL & PORTFÓLIO DE ESTOFADOS',
        105,
        34,
        { align: 'center' }
      );

      doc.setTextColor(249, 246, 240);
      doc.setFontSize(26);
      doc.text('CASTROS INTERIORES', 105, 50, { align: 'center' });

      doc.setTextColor(154, 113, 56);
      doc.setFontSize(12);
      doc.text(
        'Alta Estofaria Artesanal · Design, Conforto e Acabamento de Atelier',
        105,
        60,
        { align: 'center' }
      );

      // Foto de capa real (se disponível)
      const coverPhoto =
        primaryCampaignPhoto ||
        (activeProject.catalogEntries[0]
          ? getProductPhotos(activeProject.catalogEntries[0])[0]
          : undefined) ||
        juliaData.photos[0];

      if (coverPhoto) {
        const coverDataUrl = await convertPhotoToJpegDataUrl(coverPhoto, 960, 640);
        if (coverDataUrl) {
          doc.setDrawColor(154, 113, 56);
          doc.rect(29, 72, 152, 102);
          doc.addImage(coverDataUrl, 'JPEG', 30, 73, 150, 100);
        }
      }

      let coverY = coverPhoto ? 190 : 105;
      doc.setTextColor(249, 246, 240);
      doc.setFontSize(16);
      const headlineLines = doc.splitTextToSize(
        activeProject.headline || activeProject.name,
        160
      );
      doc.text(headlineLines, 105, coverY, { align: 'center' });
      coverY += headlineLines.length * 7 + 6;

      doc.setTextColor(214, 207, 197);
      doc.setFontSize(10.5);
      const copyLines = doc.splitTextToSize(activeProject.copyText || '', 160);
      doc.text(copyLines.slice(0, 6), 105, coverY, { align: 'center' });

      // Box de contato comercial na capa
      doc.setFillColor(38, 30, 24);
      doc.setDrawColor(154, 113, 56);
      doc.roundedRect(30, 246, 150, 24, 2, 2, 'FD');
      doc.setTextColor(216, 197, 163);
      doc.setFontSize(10);
      doc.text(
        'ATENDIMENTO COMERCIAL E ORÇAMENTOS — CASTROS INTERIORES',
        105,
        255,
        { align: 'center' }
      );
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`WhatsApp Comercial: ${contactWhatsapp}`, 105, 264, {
        align: 'center',
      });

      // ======================================================================
      // PÁGINAS INTERNAS DOS PRODUTOS (FORMATO A4 COM FOTOS REAIS)
      // ======================================================================
      const entriesToRender: JuliaCatalogEntry[] =
        activeProject.catalogEntries.length > 0
          ? activeProject.catalogEntries
          : juliaData.photos.map((ph, idx) => ({
              id: `auto-photo-${idx}`,
              title: ph.title,
              category: ph.tag,
              collectionLine: 'Acervo Real Castros Interiores',
              styleDescription: ph.caption,
              highlightTag: ph.tag,
              photoId: ph.id,
              photoIds: [ph.id],
            }));

      if (entriesToRender.length > 0) {
        doc.addPage();
      }

      let y = 34;

      const drawInternalHeader = () => {
        doc.setFillColor(24, 21, 18);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setTextColor(249, 246, 240);
        doc.setFontSize(12);
        doc.text('CASTROS INTERIORES — CATÁLOGO DE PRODUTOS', 15, 11);
        doc.setTextColor(216, 197, 163);
        doc.setFontSize(9);
        doc.text(
          `${activeProject.headline.slice(0, 65)} · WhatsApp: ${contactWhatsapp}`,
          15,
          18
        );
      };

      if (entriesToRender.length > 0) {
        drawInternalHeader();
      }

      for (let idx = 0; idx < entriesToRender.length; idx++) {
        const entry = entriesToRender[idx];
        const productPhotos = getProductPhotos(entry);
        const cardHeight = productPhotos.length > 1 ? 105 : 86;

        if (y + cardHeight > 272) {
          doc.addPage();
          drawInternalHeader();
          y = 34;
        }

        // Card container
        doc.setDrawColor(214, 207, 197);
        doc.setFillColor(250, 248, 245);
        doc.roundedRect(15, y, 180, cardHeight, 2.5, 2.5, 'FD');

        // Render main real photo on the left
        const mainPhoto = productPhotos[0];
        if (mainPhoto) {
          const mainJpeg = await convertPhotoToJpegDataUrl(mainPhoto, 640, 480);
          if (mainJpeg) {
            doc.setDrawColor(154, 113, 56);
            doc.rect(19, y + 5, 68, 52);
            doc.addImage(mainJpeg, 'JPEG', 19.5, y + 5.5, 67, 51);
          }
        } else {
          doc.setFillColor(237, 231, 220);
          doc.rect(19, y + 5, 68, 52, 'F');
          doc.setTextColor(107, 98, 87);
          doc.setFontSize(8);
          doc.text('Sem foto vinculada', 53, y + 32, { align: 'center' });
        }

        // If product has multiple photos, render up to 3 additional thumbnails below the main photo
        if (productPhotos.length > 1) {
          const extraPhotos = productPhotos.slice(1, 4);
          for (let pIdx = 0; pIdx < extraPhotos.length; pIdx++) {
            const thumbJpeg = await convertPhotoToJpegDataUrl(
              extraPhotos[pIdx],
              320,
              240
            );
            if (thumbJpeg) {
              const tx = 19 + pIdx * 23;
              const ty = y + 60;
              doc.setDrawColor(214, 207, 197);
              doc.rect(tx, ty, 21, 16);
              doc.addImage(thumbJpeg, 'JPEG', tx + 0.3, ty + 0.3, 20.4, 15.4);
            }
          }
        }

        // Product details on the right column
        const textX = 92;
        let textY = y + 11;

        doc.setTextColor(154, 113, 56);
        doc.setFontSize(8.5);
        const catAndCol = [
          entry.category || 'Estofado',
          entry.collectionLine,
          entry.highlightTag,
        ]
          .filter(Boolean)
          .join(' · ');
        doc.text(catAndCol.toUpperCase().slice(0, 62), textX, textY);
        textY += 7;

        doc.setTextColor(24, 21, 18);
        doc.setFontSize(13);
        const titleLinesProd = doc.splitTextToSize(
          `${idx + 1}. ${entry.title}`,
          98
        );
        doc.text(titleLinesProd.slice(0, 2), textX, textY);
        textY += titleLinesProd.slice(0, 2).length * 5.5 + 2;

        doc.setTextColor(87, 83, 78);
        doc.setFontSize(9.5);
        const descLines = doc.splitTextToSize(
          entry.styleDescription || '',
          98
        );
        doc.text(descLines.slice(0, 4), textX, textY);
        textY += descLines.slice(0, 4).length * 4.5 + 3;

        if (entry.measurements && entry.measurements.trim()) {
          doc.setTextColor(24, 21, 18);
          doc.setFontSize(9);
          doc.text(
            `Medidas: ${entry.measurements.trim().slice(0, 55)}`,
            textX,
            textY
          );
          textY += 5;
        }

        if (entry.availableColors && entry.availableColors.trim()) {
          doc.setTextColor(24, 21, 18);
          doc.setFontSize(9);
          doc.text(
            `Cores / Revestimentos: ${entry.availableColors.trim().slice(0, 50)}`,
            textX,
            textY
          );
          textY += 5.5;
        }

        // Preço exibido SOMENTE quando informado pelo usuário
        if (entry.priceText && entry.priceText.trim()) {
          doc.setFillColor(24, 21, 18);
          doc.roundedRect(textX, textY - 3.5, 58, 8, 1.5, 1.5, 'F');
          doc.setTextColor(216, 197, 163);
          doc.setFontSize(9.5);
          doc.text(
            `Valor: ${entry.priceText.trim()}`,
            textX + 3,
            textY + 1.8
          );
        }

        y += cardHeight + 7;
      }

      // Add pagination and commercial footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        if (p > 1) {
          doc.setDrawColor(229, 222, 201);
          doc.line(15, 282, 195, 282);
          doc.setTextColor(87, 83, 78);
          doc.setFontSize(8.5);
          doc.text(
            `Castros Interiores — Atendimento e Pedidos via WhatsApp: ${contactWhatsapp}`,
            15,
            288
          );
          doc.text(`Página ${p} de ${totalPages}`, 195, 288, {
            align: 'right',
          });
        } else {
          doc.setTextColor(216, 197, 163);
          doc.setFontSize(8.5);
          doc.text(`Página 1 de ${totalPages}`, 195, 290, {
            align: 'right',
          });
        }
      }

      doc.save(`catalogo-comercial-castros-interiores.pdf`);
      showTemporaryNotice(
        'Catálogo Comercial em PDF A4 com fotografias reais gerado e baixado!'
      );
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar PDF do Catálogo Comercial.'
      );
    } finally {
      setIsGeneratingCatalogPdf(false);
    }
  };

  // ============================================================================
  // CORREÇÃO 1 & 2 (FINAL) — TEXTO SEM TELEFONE DUPLICADO E COMPARTILHAMENTO DIRETO NO WHATSAPP
  // ============================================================================
  const buildCampaignWhatsAppMessage = (): string => {
    if (!activeProject) return '';
    const cleanPhone = (
      activeProject.whatsappDirectNumber ||
      workshopPhone ||
      '(91) 98556-9841'
    )
      .replace(/^whatsapp\s*:\s*/i, '')
      .trim();

    // Se o usuário personalizou a versão de WhatsApp nas versões dos canais, usamos ela garantindo remoção de hashtags
    if (activeProject.socialMediaVersions?.whatsappMessage?.trim()) {
      return stripHashtags(activeProject.socialMediaVersions.whatsappMessage.trim());
    }

    // Remover qualquer hashtag do texto final do WhatsApp (sem alterar as hashtags originais destinadas a outras redes)
    const cleanCopyNoHashtags = stripHashtags(
      deduplicateBodyPhone(activeProject.copyText, cleanPhone)
    );
    const contactBlock = formatSingleWhatsAppContactBlock(
      activeProject.ctaButtonText,
      cleanPhone
    );

    return [
      activeProject.headline.trim(),
      '',
      cleanCopyNoHashtags,
      '',
      contactBlock,
    ]
      .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
      .join('\n')
      .trim();
  };

  const buildOfficialWhatsAppUrl = (
    messageText: string,
    recipientRaw: string
  ): {
    valid: boolean;
    url: string;
    hasRecipient: boolean;
    formattedRecipient: string;
    error?: string;
  } => {
    const encodedText = encodeURIComponent(messageText);
    const validation = validateWhatsAppRecipientPhone(recipientRaw);
    if (!validation.valid) {
      return {
        valid: false,
        url: '',
        hasRecipient: true,
        formattedRecipient: validation.formattedDisplay,
        error: validation.error,
      };
    }

    if (validation.hasInput && validation.normalizedPhone) {
      return {
        valid: true,
        url: `https://api.whatsapp.com/send?text=${encodedText}&phone=${validation.normalizedPhone}`,
        hasRecipient: true,
        formattedRecipient: validation.formattedDisplay,
      };
    }

    return {
      valid: true,
      url: `https://api.whatsapp.com/send?text=${encodedText}`,
      hasRecipient: false,
      formattedRecipient: '',
    };
  };

  const handleOpenWhatsAppDirect = async (customText?: string) => {
    if (!activeProject) return;
    setErrorNotice(null);
    const messageText = customText || buildCampaignWhatsAppMessage();
    const shareTarget = buildOfficialWhatsAppUrl(
      messageText,
      whatsappRecipientPhone
    );

    if (!shareTarget.valid) {
      setErrorNotice(
        shareTarget.error ||
          'Número de destinatário inválido. Verifique o DDD e o telefone informado.'
      );
      return;
    }

    // Copia automaticamente o texto preparado como garantia caso o WhatsApp Web limpe o campo ao trocar de conversa
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedKey('full-step12');
      setTimeout(() => setCopiedKey(null), 3500);
    } catch {
      // Ignora caso o navegador bloqueie clipboard automático
    }

    window.open(shareTarget.url, '_blank', 'noopener,noreferrer');
    showTemporaryNotice(
      shareTarget.hasRecipient
        ? `WhatsApp aberto para ${shareTarget.formattedRecipient} com a mensagem pronta para revisão (nenhum envio é feito sem sua confirmação).`
        : 'WhatsApp aberto com o texto codificado na URL (e copiado na área de transferência caso precise colar com Ctrl+V após escolher o contato).'
    );
  };

  const handleCopyCampaignImageToClipboard = async () => {
    try {
      const canvas =
        activeProject?.pieceFormat === 'Carrossel'
          ? await renderCarouselSlideToCanvas(activeCarouselIndex)
          : await renderPosterToCanvas();
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) return;

      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        'write' in navigator.clipboard &&
        typeof ClipboardItem !== 'undefined'
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showTemporaryNotice(
          'Imagem publicitária copiada! Agora basta abrir a conversa no WhatsApp Web e pressionar Ctrl+V para anexar a imagem.'
        );
      } else {
        await handleDownloadPosterPng();
      }
    } catch {
      await handleDownloadPosterPng();
    }
  };

  const handleShareImageFileNativeIfSupported = async () => {
    if (!activeProject) return;
    try {
      const canvas =
        activeProject.pieceFormat === 'Carrossel'
          ? await renderCarouselSlideToCanvas(activeCarouselIndex)
          : await renderPosterToCanvas();
      if (!canvas) return;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) return;
      const file = new File(
        [blob],
        `peca-publicitaria-castros-interiores.png`,
        { type: 'image/png' }
      );
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: activeProject.headline,
          text: buildCampaignWhatsAppMessage(),
          files: [file],
        });
        showTemporaryNotice(
          'Arquivo de imagem e texto preparados no compartilhamento do dispositivo!'
        );
      } else {
        await handleDownloadPosterPng();
        showTemporaryNotice(
          'Este navegador não suporta anexar arquivo automaticamente via Web Share. A imagem PNG foi baixada para você anexar manualmente no WhatsApp!'
        );
      }
    } catch {
      // user cancelled or unsupported
    }
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // ignore
    }
  };

  // ============================================================================
  // CORREÇÃO 3 — PLANEJAMENTO VS AGENDAMENTO AUTOMÁTICO DE PUBLICAÇÕES
  // ============================================================================
  const getChannelIntegrationInfo = (
    channel: JuliaCampaignScheduleItem['channel']
  ) => {
    if (channel.startsWith('Instagram')) {
      return integrationsStatus.instagram;
    }
    if (channel === 'Facebook') {
      return integrationsStatus.facebook;
    }
    return integrationsStatus.whatsapp;
  };

  const handleCreateScheduleEntry = async (
    mode: 'planejada_manual' | 'automatica',
    fromStep11Fields = false
  ) => {
    if (!juliaData || !activeProject) return;

    const channel = fromStep11Fields
      ? activeProject.scheduleChannel
      : newCampChannel;
    const scheduledDate = fromStep11Fields
      ? activeProject.scheduleDate
      : newCampDate;
    const scheduledTime = fromStep11Fields
      ? activeProject.scheduleTime
      : newCampTime;
    const format = fromStep11Fields
      ? activeProject.pieceFormat
      : newCampFormat;
    const title =
      (fromStep11Fields ? '' : newCampTitle.trim()) ||
      `${format}: ${activeProject.headline.slice(0, 48)}`;

    const channelIntegration = getChannelIntegrationInfo(channel);

    // Regra estrita da Correção 3:
    // A publicação automática somente deverá funcionar quando existir integração oficial,
    // autorização do usuário e suporte técnico da plataforma. Não simular publicações automáticas!
    let finalStatus: JuliaCampaignStatus = 'Planejada';
    let integrationNote = 'Publicação planejada. Envio manual necessário.';

    if (mode === 'automatica') {
      if (
        channelIntegration.connected &&
        channelIntegration.autoPublishSupported
      ) {
        finalStatus = 'Agendada';
        integrationNote = `Publicação automática agendada via integração oficial (${channel}).`;
      } else {
        // Sem integração oficial conectada: não simula disparo automático!
        finalStatus = 'Planejada';
        integrationNote =
          'Publicação planejada. Envio manual necessário. (Integração oficial para disparo automático não configurada neste canal)';
      }
    }

    const newItem: JuliaCampaignScheduleItem = {
      id: `jcamp-${Date.now()}`,
      projectId: activeProject.id,
      title,
      format,
      channel,
      scheduledDate,
      scheduledTime,
      publishMode: mode,
      status: finalStatus,
      integrationNote,
      captionPreview: activeProject.copyText.slice(0, 160),
      photoId: primaryCampaignPhoto?.id,
      createdAt: new Date().toISOString(),
    };

    const nextData: JuliaDepartmentData = {
      ...juliaData,
      campaigns: [newItem, ...juliaData.campaigns],
    };
    setNewCampTitle('');
    await handlePersistJuliaData(nextData, integrationNote);
  };

  const handleUpdateCampaignStatus = async (
    campId: string,
    nextStatus: JuliaCampaignStatus
  ) => {
    if (!juliaData) return;
    const nextCampaigns = juliaData.campaigns.map((c) =>
      c.id === campId ? { ...c, status: nextStatus } : c
    );
    await handlePersistJuliaData(
      {
        ...juliaData,
        campaigns: nextCampaigns,
      },
      `Status da publicação atualizado para "${nextStatus}".`
    );
  };

  const handleDeleteCampaign = async (campId: string) => {
    if (!juliaData) return;
    await handlePersistJuliaData(
      {
        ...juliaData,
        campaigns: juliaData.campaigns.filter((c) => c.id !== campId),
      },
      'Publicação removida do calendário.'
    );
  };

  // ============================================================================
  // COMUNICAÇÃO POR VOZ E TEXTO COM HISTÓRICO PERSISTENTE
  // ============================================================================
  const handleSendChat = async (
    textToSend?: string,
    modality: 'voz' | 'texto' = 'texto'
  ) => {
    const finalMsg = (textToSend ?? chatInput).trim();
    if (!finalMsg || isSendingChat) return;

    // Cancela áudio em andamento para evitar sobreposição ou eco
    stopVoiceSpeaking();

    setIsSendingChat(true);
    setErrorNotice(null);
    try {
      const res = await fetch('/api/julia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalMsg,
          modality,
          projectId: activeProject?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.juliaData) {
        throw new Error(data.error || 'Erro ao conversar com a Júlia.');
      }
      setJuliaData(data.juliaData);
      if (!textToSend) setChatInput(''); // Limpa o rascunho apenas após confirmação de sucesso
      if (voiceSpeakEnabled && data.reply?.text) {
        speakTextInPortuguese(data.reply.text);
      }
    } catch (err) {
      setErrorNotice(
        err instanceof Error ? err.message : 'Falha na comunicação com a Júlia. Sua mensagem foi preservada no campo.'
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleToggleVoiceListening = () => {
    // Cancela áudio anterior antes de iniciar nova escuta para evitar que o microfone capture a voz do próprio agente
    stopVoiceSpeaking();

    if (isListeningVoice) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListeningVoice(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorNotice(
        'Reconhecimento de voz não suportado neste navegador. Digite sua mensagem no campo de texto abaixo.'
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningVoice(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          setChatInput(transcript.trim());
          handleSendChat(transcript.trim(), 'voz');
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (e: any) => {
        setIsListeningVoice(false);
        if (e?.error === 'not-allowed') {
          setErrorNotice('Permissão do microfone negada. Permita o microfone no navegador para falar com a Júlia.');
        } else if (e?.error === 'no-speech') {
          setErrorNotice('Nenhuma fala foi capturada. Tente falar novamente mais próximo ao microfone.');
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleGenerateDailyReport = async () => {
    if (isGeneratingReport) return;
    setIsGeneratingReport(true);
    setErrorNotice(null);
    try {
      const res = await fetch('/api/julia/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.juliaData) {
        throw new Error(data.error || 'Erro ao gerar Relatório Diário.');
      }
      setJuliaData(data.juliaData);
      showTemporaryNotice(
        'Relatório Diário de Marketing, Publicidade e Divulgação gerado!'
      );
    } catch (err) {
      setErrorNotice(
        err instanceof Error ? err.message : 'Erro ao emitir Relatório Diário.'
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading || !juliaData || !activeProject) {
    return (
      <div className="p-8 rounded-xl bg-white border border-[#E5DEC9] text-center text-xs text-[#6B6257]">
        Carregando departamento Júlia Marketing, Publicidade e Divulgação...
      </div>
    );
  }

  const latestReport = juliaData.dailyReports[0];
  const currentCarouselSlide =
    activeProject.carouselSlides[activeCarouselIndex] ||
    activeProject.carouselSlides[0];
  const currentSlideThemeKey: JuliaSlideTheme =
    currentCarouselSlide?.theme || 'noite_ouro';
  const currentSlidePalette =
    SLIDE_THEME_PALETTES[currentSlideThemeKey] || SLIDE_THEME_PALETTES.noite_ouro;
  const currentSlidePhoto =
    juliaData.photos.find((ph) => ph.id === currentCarouselSlide?.photoId) ||
    juliaData.photos.find((ph) => activeProject.selectedPhotoIds.includes(ph.id)) ||
    juliaData.photos[activeCarouselIndex % Math.max(1, juliaData.photos.length)];

  const normalizedCampaignStatus = (
    st: JuliaCampaignStatus
  ): 'Planejada' | 'Agendada' | 'Concluída' | 'Com Erro' => {
    if (st === 'Programada' || st === 'Planejada') return 'Planejada';
    if (st === 'Agendada') return 'Agendada';
    if (st === 'Concluída' || st === 'Publicada') return 'Concluída';
    return 'Com Erro';
  };

  const filteredCalendarCampaigns = juliaData.campaigns.filter((c) => {
    if (calendarStatusFilter === 'TODAS') return true;
    return normalizedCampaignStatus(c.status) === calendarStatusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Inputs ocultos para envio direto de fotografias */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          for (const f of files) {
            await handleUploadMobilePhoto(f);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={slideFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await handleUploadMobilePhoto(file, {
              assignToSlideIndex: activeCarouselIndex,
              customTitle:
                currentCarouselSlide?.title ||
                `Foto Lâmina ${activeCarouselIndex + 1}`,
            });
          }
          e.target.value = '';
        }}
      />
      <input
        ref={catalogFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          for (const f of files) {
            if (targetCatalogEntryIdForUpload) {
              await handleUploadMobilePhoto(f, {
                assignToCatalogEntryId: targetCatalogEntryIdForUpload,
              });
            } else {
              await handleUploadMobilePhoto(f, {
                addToCatalogDraftForm: true,
                customTitle: catTitle.trim() || undefined,
              });
            }
          }
          setTargetCatalogEntryIdForUpload(null);
          e.target.value = '';
        }}
      />

      {/* Banner de cabeçalho do Departamento da Júlia */}
      <div className="rounded-xl bg-[#181512] text-[#F9F6F0] p-5 border border-[#2E2722] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#D8C5A3]">
            DEPARTAMENTO INDEPENDENTE · MARKETING, PUBLICIDADE E DIVULGAÇÃO
          </div>
          <h2 className="text-xl font-serif-display font-bold text-white">
            Júlia Marketing, Publicidade e Divulgação — Castros Interiores
          </h2>
          <p className="text-xs text-[#D6CFC5] max-w-3xl">
            Campanhas publicitárias com fotografias reais, Carrossel de 5 lâminas (PNG e ZIP), Pôster de alto padrão, Catálogo Comercial em PDF A4 com fotos, fidelidade integral aos textos aprovados, planejamento de publicações e compartilhamento direto no WhatsApp Web / Aplicativo.
          </p>
        </div>

        {/* Botões Rápidos de Recebimento de Foto Direto do Celular ou Computador */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={isUploadingPhoto}
            className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Tirar Foto pelo Celular</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="px-4 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#332C25] border border-[#D8C5A3]/40 text-[#F9F6F0] text-xs font-semibold flex items-center gap-2 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[#D8C5A3]" />
            <span>
              {isUploadingPhoto
                ? 'Enviando foto...'
                : 'Enviar Foto do Celular / Computador'}
            </span>
          </button>
        </div>
      </div>

      {/* Avisos de confirmação ou erro */}
      {statusNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950 text-emerald-100 border border-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-emerald-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs flex items-center justify-between">
          <span>{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-red-700 font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ====================================================================
          CORREÇÃO 6 — BIBLIOTECA DE CAMPANHAS SALVAS E RECUPERAÇÃO
         ==================================================================== */}
      <div className="rounded-xl bg-white border border-[#E5DEC9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="w-4 h-4 text-[#9A7138] shrink-0" />
          <div>
            <div className="text-xs font-bold text-[#181512]">
              Biblioteca de Campanhas Salvas ({juliaData.projects.length}) ·{' '}
              {juliaData.photos.length} Fotografia(s) Preservada(s)
            </div>
            <div className="text-[11px] text-[#6B6257]">
              Todas as alterações são salvas automaticamente ao navegar entre as etapas e ao fechar/reabrir o aplicativo.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeProject.id}
            onChange={(e) => handleSelectSavedCampaignProject(e.target.value)}
            className="rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] px-3 py-1.5 text-xs font-semibold text-[#181512]"
          >
            {juliaData.projects.map((proj, idx) => (
              <option key={proj.id} value={proj.id}>
                {idx + 1}. {proj.name} (Etapa {proj.currentStep}/12)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateNewCampaignProject}
            className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8C5A3]" />
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          NOVO CAMPO: PREPARAR DIVULGAÇÃO PARA (ATUALIZAÇÃO JÚLIA)
         ==================================================================== */}
      <div className="rounded-xl bg-[#FAF8F5] border-2 border-[#9A7138]/40 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#E5DEC9] pb-2.5">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#9A7138]" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#181512]">
              Preparar divulgação para:
            </span>
            <span className="px-2 py-0.5 rounded bg-[#181512] text-[#F9F6F0] text-[11px] font-semibold">
              {activeProject.targetChannel || 'Todas as redes sociais'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6B6257] font-medium hidden md:inline">
              Canal ativo:
            </span>
            <select
              value={activeProject.targetChannel || 'Todas as redes sociais'}
              onChange={(e) =>
                handleChangeTargetChannel(e.target.value as JuliaTargetChannel)
              }
              className="rounded-lg border border-[#D6CFC5] bg-white px-3 py-1.5 text-xs font-bold text-[#181512]"
            >
              {TARGET_CHANNEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                handleChangeTargetChannel(
                  activeProject.targetChannel || 'Todas as redes sociais'
                )
              }
              disabled={isAdaptingChannel}
              className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isAdaptingChannel ? 'animate-spin' : ''}`}
              />
              <span>
                {isAdaptingChannel ? 'Adaptando...' : 'Adaptar Textos'}
              </span>
            </button>
          </div>
        </div>

        {/* Botões Rápidos dos 8 Canais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {TARGET_CHANNEL_OPTIONS.map((opt) => {
            const isSelected =
              (activeProject.targetChannel || 'Todas as redes sociais') === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleChangeTargetChannel(opt)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all text-center truncate ${
                  isSelected
                    ? 'bg-[#181512] text-white border-[#181512] shadow-xs'
                    : 'bg-white text-[#57534E] border-[#D6CFC5] hover:bg-[#F3EFE6] hover:text-[#181512]'
                }`}
                title={opt}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Resumo da Regra do Canal Selecionado */}
        <div className="text-[11px] text-[#57534E] bg-white rounded-lg p-2.5 border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            {(!activeProject.targetChannel ||
              activeProject.targetChannel === 'Todas as redes sociais') && (
              <span>
                🌐 <strong>Todas as redes sociais:</strong> Versões independentes e adequadas para cada canal geradas simultaneamente (sem mensagem idêntica repetida).
              </span>
            )}
            {activeProject.targetChannel === 'WhatsApp' && (
              <span>
                💬 <strong>WhatsApp:</strong> Mensagem sem hashtags · Telefone único ({activeProject.whatsappDirectNumber || workshopPhone}) · Linguagem curta, natural e convidativa.
              </span>
            )}
            {activeProject.targetChannel === 'WhatsApp Status' && (
              <span>
                🟢 <strong>WhatsApp Status:</strong> Formato vertical dinâmico e curto · Sem hashtags · Chamada direta para o WhatsApp.
              </span>
            )}
            {activeProject.targetChannel === 'Instagram Feed' && (
              <span>
                📸 <strong>Instagram Feed:</strong> Legenda atraente · Hashtags estratégicas relevantes sem excesso · Informações reais da campanha.
              </span>
            )}
            {activeProject.targetChannel === 'Instagram Stories' && (
              <span>
                📱 <strong>Instagram Stories:</strong> Foco visual · Chamada direta para toque de mensagem ou link no WhatsApp.
              </span>
            )}
            {activeProject.targetChannel === 'Facebook' && (
              <span>
                👥 <strong>Facebook:</strong> Texto comercial objetivo · Serviços e diferenciais Castros Interiores · Poucas hashtags (2 a 3) · Orçamento.
              </span>
            )}
            {activeProject.targetChannel === 'Catálogo comercial' && (
              <span>
                📄 <strong>Catálogo comercial:</strong> Material impresso A4 com fotos reais · Sem hashtags na arte e descrições dos produtos.
              </span>
            )}
            {activeProject.targetChannel === 'Pôster publicitário' && (
              <span>
                🖼️ <strong>Pôster publicitário:</strong> Alta resolução · Tipografia editorial · Sem hashtags na composição gráfica.
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#9A7138] font-mono shrink-0 font-semibold">
            Etapas 6 e 12 integradas
          </span>
        </div>
      </div>

      {/* ====================================================================
          BLOCO 1: AS 12 ETAPAS DO ANÚNCIO INTELIGENTE (VOLTÁ, AVANÇÁ, SALVÁ, CORRIGÍ)
         ==================================================================== */}
      <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#EFECE6]">
          <div>
            <div className="text-xs font-mono font-semibold text-[#9A7138]">
              ANÚNCIO INTELIGENTE · ETAPA {currentStep} DE 12 · CAMPANHA:{' '}
              {activeProject.name.toUpperCase()}
            </div>
            <h3 className="text-lg font-serif-display font-bold text-[#181512]">
              {currentStepMeta.fullTitle}
            </h3>
            <p className="text-xs text-[#57534E]">{currentStepMeta.description}</p>
          </div>

          {/* OS 4 BOTÕES OBRIGATÓRIOS: VOLTÁ, SALVÁ, CORRIGÍ, AVANÇÁ */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStepVoltar}
              disabled={currentStep <= 1 || isSaving}
              className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] disabled:opacity-40 text-xs font-semibold text-[#181512] flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltá</span>
            </button>

            <button
              type="button"
              onClick={handleStepSalvar}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvando...' : 'Salvá'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCorrectionModeOpen((prev) => !prev)}
              disabled={isGeneratingAi}
              className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Corrigí</span>
            </button>

            <button
              type="button"
              onClick={handleStepAvancar}
              disabled={currentStep >= 12 || isSaving}
              className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Avançá</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra de Correção ("Corrigí") quando acionada */}
        {correctionModeOpen && (
          <div className="p-4 rounded-xl bg-[#FAF6EE] border border-[#9A7138] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#181512]">
                Corrigir / Aperfeiçoar Etapa {currentStep} ({currentStepMeta.shortTitle}) com a Júlia (sem sobrescrever outras etapas):
              </span>
              <button
                type="button"
                onClick={() => setCorrectionModeOpen(false)}
                className="text-xs text-[#6B6257] hover:text-[#181512]"
              >
                Fechar
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={correctionInstruction}
                onChange={(e) => setCorrectionInstruction(e.target.value)}
                placeholder="Informe o que deseja corrigir ou melhorar nesta etapa..."
                className="flex-1 rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => handleStepCorrigirWithAI()}
                disabled={isGeneratingAi}
                className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D8C5A3]" />
                <span>
                  {isGeneratingAi
                    ? 'Júlia corrigindo...'
                    : 'Aplicar Correção nesta Etapa'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Grade Navegável das 12 Etapas (com salvamento automático ao navegar) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {TWELVE_STEPS_META.map((item) => {
            const isActive = item.step === currentStep;
            const isSaved = Boolean(activeProject.stepStates?.[item.step]?.saved);
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  const now = new Date().toISOString();
                  const nextData = updateActiveProjectLocal((p) => ({
                    ...p,
                    currentStep: item.step,
                    stepStates: {
                      ...p.stepStates,
                      [currentStep]: {
                        ...p.stepStates[currentStep],
                        saved: true,
                        savedAt: now,
                      },
                    },
                  }));
                  if (nextData) {
                    handlePersistJuliaData(nextData);
                  }
                }}
                className={`px-3 py-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-1.5 ${
                  isActive
                    ? 'bg-[#181512] text-white border-[#181512] font-semibold'
                    : isSaved
                    ? 'bg-[#FAF6EE] text-[#181512] border-[#D8C5A3] hover:bg-[#F3EFE6]'
                    : 'bg-[#FAF8F5] text-[#57534E] border-[#E5DEC9] hover:bg-[#F3EFE6]'
                }`}
              >
                <span className="truncate">{item.shortTitle}</span>
                {isSaved && (
                  <Check
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[#D8C5A3]' : 'text-emerald-700'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* CONTEÚDO INTERATIVO DA ETAPA ATUAL (1 A 12) */}
        <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-4">
          {/* ================================================================
              ETAPA 1: FOTOS DIRETO DO CELULAR E BIBLIOTECA CASTROS INTERIORES
             ================================================================ */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#E5DEC9]">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Título da Fotografia / Produto
                  </label>
                  <input
                    type="text"
                    value={photoTitleInput}
                    onChange={(e) => setPhotoTitleInput(e.target.value)}
                    placeholder="Ex: Sofá Living Linho Bege"
                    className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Classificação de Marketing
                  </label>
                  <select
                    value={photoTagInput}
                    onChange={(e) => setPhotoTagInput(e.target.value as JuliaPhotoTag)}
                    className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                  >
                    {PHOTO_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Legenda / Detalhe Estético (Opcional)
                  </label>
                  <input
                    type="text"
                    value={photoCaptionInput}
                    onChange={(e) => setPhotoCaptionInput(e.target.value)}
                    placeholder="Ex: Acabamento pespontado e almofadas"
                    className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full py-2 px-3 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {isUploadingPhoto
                        ? 'Recebendo...'
                        : 'Adicionar Fotografia Real'}
                    </span>
                  </button>
                </div>
              </div>

              {juliaData.photos.length === 0 ? (
                <div className="p-8 rounded-xl bg-white border border-[#E5DEC9] text-center space-y-3">
                  <ImageIcon className="w-8 h-8 text-[#9A7138] mx-auto" />
                  <h4 className="text-sm font-bold text-[#181512]">
                    Biblioteca de Fotografias da Castros Interiores
                  </h4>
                  <p className="text-xs text-[#6B6257] max-w-md mx-auto">
                    Clique em <strong>Tirar Foto pelo Celular</strong> ou{' '}
                    <strong>Adicionar Fotografia Real</strong> para enviar imagens reais dos estofados e utilizá-las no Pôster, no Carrossel de 5 lâminas e no Catálogo Digital.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {juliaData.photos.map((photo) => {
                    const isSelected = activeProject.selectedPhotoIds.includes(
                      photo.id
                    );
                    const isPosterPrimary =
                      activeProject.posterConfig.photoId === photo.id;
                    return (
                      <div
                        key={photo.id}
                        className={`rounded-xl overflow-hidden border bg-white flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#9A7138] ring-2 ring-[#9A7138]/30'
                            : 'border-[#E5DEC9]'
                        }`}
                      >
                        <div>
                          <div className="h-44 bg-[#EDE7DC] relative">
                            <ResilientImage
                              src={photo.imageUrl || photo.thumbnailDataUrl || ''}
                              alt={photo.title}
                              className="w-full h-full object-cover"
                            />
                            {isPosterPrimary && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#181512]/90 text-[#D8C5A3] text-[10px] font-semibold">
                                Foto Principal / Capa
                              </span>
                            )}
                          </div>
                          <div className="p-3 space-y-1 text-xs">
                            <div className="text-[11px] font-semibold text-[#9A7138]">
                              {photo.tag} · {photo.sourceDevice || 'Celular'}
                            </div>
                            <input
                              type="text"
                              value={photo.title}
                              onChange={(e) => {
                                const newTitle = e.target.value;
                                const nextData: JuliaDepartmentData = {
                                  ...juliaData,
                                  photos: juliaData.photos.map((ph) =>
                                    ph.id === photo.id
                                      ? { ...ph, title: newTitle }
                                      : ph
                                  ),
                                };
                                setJuliaData(nextData);
                                scheduleAutoSave(nextData);
                              }}
                              className="w-full font-bold text-[#181512] border-b border-transparent focus:border-[#9A7138] focus:outline-none py-0.5"
                            />
                            <p className="text-[#57534E] line-clamp-2">
                              {photo.caption}
                            </p>
                          </div>
                        </div>
                        <div className="p-3 pt-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleSelectPhotoForCampaign(photo.id)
                              }
                              className={`flex-1 py-1.5 px-2.5 rounded text-xs font-semibold ${
                                isSelected
                                  ? 'bg-[#181512] text-white'
                                  : 'bg-[#FAF8F5] border border-[#D6CFC5] text-[#181512]'
                              }`}
                            >
                              {isSelected
                                ? 'Selecionada na Campanha'
                                : 'Usar na Campanha'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteJuliaPhoto(photo.id)}
                              className="p-1.5 text-red-700 hover:text-red-900"
                              title="Remover fotografia"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const nextData = updateActiveProjectLocal((p) => ({
                                ...p,
                                selectedPhotoIds: Array.from(
                                  new Set([photo.id, ...p.selectedPhotoIds])
                                ),
                                posterConfig: {
                                  ...p.posterConfig,
                                  photoId: photo.id,
                                },
                              }));
                              if (nextData) {
                                handlePersistJuliaData(
                                  nextData,
                                  `Fotografia "${photo.title}" definida como destaque principal do Pôster e Capa!`
                                );
                              }
                            }}
                            className="w-full py-1 px-2 rounded bg-[#FAF6EE] hover:bg-[#F3EFE6] border border-[#D8C5A3] text-[11px] font-semibold text-[#9A7138]"
                          >
                            Definir como Foto Principal (Pôster & Capa)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              ETAPA 2: OBJETIVO DA CAMPANHA E PÚBLICO-ALVO
             ================================================================ */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Nome da Campanha Publicitária
                </label>
                <input
                  type="text"
                  value={activeProject.name}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Público-Alvo Desejado
                </label>
                <input
                  type="text"
                  value={activeProject.targetAudience}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      targetAudience: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Objetivo Estratégico de Marketing e Divulgação
                </label>
                <textarea
                  rows={3}
                  value={activeProject.campaignObjective}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      campaignObjective: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white p-3 text-xs"
                />
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 3: FORMATO PRINCIPAL DA PEÇA PUBLICITÁRIA
             ================================================================ */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(
                [
                  [
                    'Anúncio',
                    'Anúncio Direto (Feed & Stories)',
                    'Ideal para captação imediata de clientes no Instagram, Facebook e Status do WhatsApp.',
                  ],
                  [
                    'Pôster',
                    'Pôster Promocional de Alto Padrão',
                    'Arte vertical impactante com foto real do estofado, tipografia editorial e contato.',
                  ],
                  [
                    'Carrossel',
                    'Carrossel com Fotos (5 Lâminas)',
                    'Sequência de 5 lâminas com fotografias reais e exportação em PNG e ZIP.',
                  ],
                  [
                    'Catálogo',
                    'Catálogo Comercial com Fotos',
                    'Vitrine completa de produtos com fotografias reais e exportação em PDF A4.',
                  ],
                ] as const
              ).map(([fmt, title, desc]) => {
                const selected = activeProject.pieceFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() =>
                      updateActiveProjectLocal(
                        (p) => ({
                          ...p,
                          pieceFormat: fmt,
                        }),
                        `Formato principal definido como ${fmt}!`
                      )
                    }
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      selected
                        ? 'bg-[#181512] text-white border-[#181512]'
                        : 'bg-white text-[#181512] border-[#E5DEC9] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <div className="font-bold text-sm">{title}</div>
                    <p
                      className={`text-xs ${
                        selected ? 'text-[#D6CFC5]' : 'text-[#57534E]'
                      }`}
                    >
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* ================================================================
              ETAPA 4: TÍTULO DE IMPACTO (HEADLINE) — COM SINCRONIZAÇÃO AUTOMÁTICA
             ================================================================ */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-[#181512]">
                  Título de Impacto (Headline Principal da Campanha)
                </label>
                <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-medium">
                  Sincronizado automaticamente com Anúncios (Etapa 6), Pôster (Etapa 7) e WhatsApp (Etapa 12)
                </span>
              </div>
              <input
                type="text"
                value={activeProject.headline}
                onChange={(e) => handleUpdateHeadlineWithFidelity(e.target.value)}
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2.5 text-sm font-semibold"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleStepCorrigirWithAI(
                      'Sugira um título publicitário ainda mais sofisticado e focado em alta estofaria para a Castros Interiores.'
                    )
                  }
                  disabled={isGeneratingAi}
                  className="px-3.5 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sugerir / Aperfeiçoar Título com a Júlia IA</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 5: TEXTO PUBLICITÁRIO (COPYWRITING) — COM FIDELIDADE INTEGRAL
             ================================================================ */}
          {currentStep === 5 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#181512]">
                    Texto Publicitário Oficial da Campanha (Etapa 5)
                  </label>
                  <p className="text-[11px] text-[#6B6257]">
                    Este texto é preservado integralmente nas peças seguintes, salvo quando você solicitar uma adaptação explícita.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText('copy-step5', activeProject.copyText)
                  }
                  className="px-3 py-1 rounded bg-[#181512] text-white text-xs font-semibold flex items-center gap-1"
                >
                  {copiedKey === 'copy-step5' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={5}
                value={activeProject.copyText}
                onChange={(e) => handleUpdateCopyTextWithFidelity(e.target.value)}
                className="w-full rounded-lg border border-[#D6CFC5] bg-white p-3 text-xs leading-relaxed"
              />
            </div>
          )}

          {/* ================================================================
              ETAPA 6: CRIAÇÃO DE ANÚNCIO (ADAPTAÇÃO INTELIGENTE POR REDE SOCIAL)
             ================================================================ */}
          {currentStep === 6 && (
            <div className="space-y-4">
              {/* Barra de Fidelidade e Status de Adaptação por Canal */}
              <div className="p-3.5 rounded-xl bg-white border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-[#181512] flex items-center gap-2">
                    <span>Divulgação Inteligente por Rede Social</span>
                    <span className="px-2 py-0.5 rounded bg-[#181512] text-[#F9F6F0] text-[11px] font-semibold">
                      Canal Prioritário: {activeProject.targetChannel || 'Todas as redes sociais'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#57534E]">
                    Textos adaptados automaticamente com linguagem própria para cada rede, sem mensagens genéricas idênticas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleChangeTargetChannel(
                        activeProject.targetChannel || 'Todas as redes sociais'
                      )
                    }
                    disabled={isAdaptingChannel}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#9A7138] ${isAdaptingChannel ? 'animate-spin' : ''}`} />
                    <span>Regerar Versões de Todos os Canais</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreFaithfulTextsStep6}
                    className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512]"
                  >
                    Restaurar Fiel (Etapas 4 e 5)
                  </button>
                </div>
              </div>

              {/* Seletor de visualização de canal na Etapa 6 */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F5] p-2 rounded-xl border border-[#E5DEC9]">
                <button
                  type="button"
                  onClick={() => setSocialChannelTab('whatsapp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    socialChannelTab === 'whatsapp'
                      ? 'bg-[#1F5E3B] text-white shadow-xs'
                      : 'bg-white text-[#181512] border border-[#D6CFC5] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span>💬 WhatsApp (Sem hashtags)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialChannelTab('whatsappStatus')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    socialChannelTab === 'whatsappStatus'
                      ? 'bg-[#1F5E3B] text-white shadow-xs'
                      : 'bg-white text-[#181512] border border-[#D6CFC5] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span>🟢 WhatsApp Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialChannelTab('instagramFeed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    socialChannelTab === 'instagramFeed'
                      ? 'bg-[#9A7138] text-white shadow-xs'
                      : 'bg-white text-[#181512] border border-[#D6CFC5] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span>📸 Instagram Feed (Com hashtags)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialChannelTab('instagramStories')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    socialChannelTab === 'instagramStories' || socialChannelTab === 'instagramReels'
                      ? 'bg-[#9A7138] text-white shadow-xs'
                      : 'bg-white text-[#181512] border border-[#D6CFC5] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span>📱 Stories & Reels</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialChannelTab('facebook')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    socialChannelTab === 'facebook'
                      ? 'bg-[#181512] text-white shadow-xs'
                      : 'bg-white text-[#181512] border border-[#D6CFC5] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span>👥 Facebook (Comercial)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialChannelTab('print')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    socialChannelTab === 'print'
                      ? 'bg-[#2E2722] text-white shadow-xs'
                      : 'bg-white text-[#181512] border border-[#D6CFC5] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <span>📄 Catálogo & Pôster</span>
                </button>
              </div>

              {/* Conteúdo Dinâmico por Canal Selecionado */}
              {socialChannelTab === 'whatsapp' && (
                <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE6] pb-2">
                    <div>
                      <span className="text-xs font-bold text-[#181512] block">
                        Versão WhatsApp — Mensagem Comercial Direta (Sem Hashtags)
                      </span>
                      <span className="text-[11px] text-[#1F5E3B] font-medium">
                        Regra: Sem hashtags · Telefone comercial único: {activeProject.whatsappDirectNumber || workshopPhone} · Tom natural e convidativo
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'tab-wa',
                          activeProject.socialMediaVersions?.whatsappMessage ||
                            buildCampaignWhatsAppMessage()
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'tab-wa' ? 'Copiado!' : 'Copiar para WhatsApp'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={
                      activeProject.socialMediaVersions?.whatsappMessage ||
                      buildCampaignWhatsAppMessage()
                    }
                    onChange={(e) =>
                      handleUpdateSocialMediaVersionText(
                        'whatsappMessage',
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs leading-relaxed font-sans"
                  />
                  <p className="text-[10px] text-[#6B6257]">
                    Você pode editar livremente o texto acima antes do envio. Quaisquer hashtags digitadas serão automaticamente removidas no disparo oficial do WhatsApp.
                  </p>
                </div>
              )}

              {socialChannelTab === 'whatsappStatus' && (
                <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE6] pb-2">
                    <div>
                      <span className="text-xs font-bold text-[#181512] block">
                        Versão WhatsApp Status (Sem Hashtags)
                      </span>
                      <span className="text-[11px] text-[#1F5E3B] font-medium">
                        Regra: Formato vertical dinâmico e curto · Sem hashtags · Chamada para o WhatsApp
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'tab-wastatus',
                          activeProject.socialMediaVersions?.whatsappStatus || ''
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'tab-wastatus' ? 'Copiado!' : 'Copiar Status'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={activeProject.socialMediaVersions?.whatsappStatus || ''}
                    onChange={(e) =>
                      handleUpdateSocialMediaVersionText(
                        'whatsappStatus',
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs leading-relaxed"
                  />
                </div>
              )}

              {socialChannelTab === 'instagramFeed' && (
                <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE6] pb-2">
                    <div>
                      <span className="text-xs font-bold text-[#181512] block">
                        Versão Instagram Feed — Legenda Atraente com Hashtags Estratégicas
                      </span>
                      <span className="text-[11px] text-[#9A7138] font-medium">
                        Regra: Legenda atraente · Hashtags relevantes sem excesso · Informações reais do produto e atelier
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'tab-igfeed',
                          activeProject.socialMediaVersions?.instagramFeed ||
                            activeProject.adFeedText
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'tab-igfeed' ? 'Copiado!' : 'Copiar Legenda Feed'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={
                      activeProject.socialMediaVersions?.instagramFeed ||
                      activeProject.adFeedText
                    }
                    onChange={(e) =>
                      handleUpdateSocialMediaVersionText(
                        'instagramFeed',
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs leading-relaxed"
                  />
                </div>
              )}

              {(socialChannelTab === 'instagramStories' ||
                socialChannelTab === 'instagramReels') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
                      <div>
                        <span className="text-xs font-bold text-[#181512] block">
                          Instagram Stories
                        </span>
                        <span className="text-[10px] text-[#6B6257]">
                          Chamada rápida para direct/WhatsApp
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            'tab-igstories',
                            activeProject.socialMediaVersions?.instagramStories ||
                              activeProject.adStoriesText
                          )
                        }
                        className="text-xs font-semibold text-[#9A7138] underline"
                      >
                        {copiedKey === 'tab-igstories' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={
                        activeProject.socialMediaVersions?.instagramStories ||
                        activeProject.adStoriesText
                      }
                      onChange={(e) =>
                        handleUpdateSocialMediaVersionText(
                          'instagramStories',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs leading-relaxed"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
                      <div>
                        <span className="text-xs font-bold text-[#181512] block">
                          Instagram Reels
                        </span>
                        <span className="text-[10px] text-[#6B6257]">
                          Gancho dinâmico de transformação e acabamento
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            'tab-igreels',
                            activeProject.socialMediaVersions?.instagramReels || ''
                          )
                        }
                        className="text-xs font-semibold text-[#9A7138] underline"
                      >
                        {copiedKey === 'tab-igreels' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={
                        activeProject.socialMediaVersions?.instagramReels || ''
                      }
                      onChange={(e) =>
                        handleUpdateSocialMediaVersionText(
                          'instagramReels',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {socialChannelTab === 'facebook' && (
                <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE6] pb-2">
                    <div>
                      <span className="text-xs font-bold text-[#181512] block">
                        Versão Facebook — Publicidade Comercial com Diferenciais
                      </span>
                      <span className="text-[11px] text-[#181512] font-medium">
                        Regra: Texto comercial objetivo · Destaca serviços e diferenciais da Castros Interiores · Poucas hashtags (2 a 3) · Chamada para orçamento
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'tab-fb',
                          activeProject.socialMediaVersions?.facebook || ''
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKey === 'tab-fb' ? 'Copiado!' : 'Copiar Texto Facebook'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={9}
                    value={activeProject.socialMediaVersions?.facebook || ''}
                    onChange={(e) =>
                      handleUpdateSocialMediaVersionText(
                        'facebook',
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs leading-relaxed"
                  />
                </div>
              )}

              {socialChannelTab === 'print' && (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-3 text-xs">
                  <div className="font-bold text-sm text-[#181512] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#9A7138]" />
                    <span>Catálogo Comercial, Pôsteres e Material Impresso</span>
                  </div>
                  <p className="text-[#57534E]">
                    Conforme a regra do departamento, o material impresso e as peças gráficas são gerados <strong>sem hashtags</strong>, preservando a identidade sofisticada de atelier:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#57534E] text-[11px]">
                    <li><strong>Catálogo Comercial (Etapa 9):</strong> Paginação organizada em formato A4, fotografias reais dos produtos, medidas, cores e preço somente quando informado. Sem hashtags.</li>
                    <li><strong>Pôster Promocional (Etapa 7):</strong> Tipografia editorial de alto padrão, foto real vinculada, selo superior e contato direto. Sem hashtags na arte.</li>
                    <li><strong>Carrossel de 5 Lâminas (Etapa 8):</strong> Sequência visual com fotos reais e exportação em PNG e pacote ZIP.</li>
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => updateActiveProjectLocal((p) => ({ ...p, currentStep: 7 }))}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#D6CFC5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512]"
                    >
                      Ir para Pôster (Etapa 7)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveProjectLocal((p) => ({ ...p, currentStep: 9 }))}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#D6CFC5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512]"
                    >
                      Ir para Catálogo (Etapa 9)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              ETAPA 7: CRIAÇÃO DE PÔSTER PROMOCIONAL (PRESERVADO E SINCRONIZADO)
             ================================================================ */}
          {currentStep === 7 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-6 space-y-3 bg-white p-4 rounded-xl border border-[#E5DEC9]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#181512]">
                    Configuração Visual do Pôster
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        posterConfig: {
                          ...p.posterConfig,
                          headline: p.headline,
                        },
                      }))
                    }
                    className="text-[11px] font-semibold text-[#9A7138] underline"
                  >
                    Usar Título da Etapa 4
                  </button>
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Selo Superior (Badge)
                  </label>
                  <input
                    type="text"
                    value={activeProject.posterConfig.badgeText}
                    onChange={(e) =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        posterConfig: {
                          ...p.posterConfig,
                          badgeText: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Título do Pôster (Sincronizado com Etapa 4)
                  </label>
                  <input
                    type="text"
                    value={activeProject.posterConfig.headline}
                    onChange={(e) =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        posterConfig: {
                          ...p.posterConfig,
                          headline: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] px-3 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#57534E] mb-1">
                    Subtítulo do Pôster
                  </label>
                  <input
                    type="text"
                    value={activeProject.posterConfig.subheadline}
                    onChange={(e) =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        posterConfig: {
                          ...p.posterConfig,
                          subheadline: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] px-3 py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">
                      Estilo de Cores
                    </label>
                    <select
                      value={activeProject.posterConfig.theme}
                      onChange={(e) =>
                        updateActiveProjectLocal((p) => ({
                          ...p,
                          posterConfig: {
                            ...p.posterConfig,
                            theme: e.target
                              .value as JuliaSmartAdProject['posterConfig']['theme'],
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="noite_ouro">Noite & Ouro Castros</option>
                      <option value="editorial_creme">Editorial Creme Claro</option>
                      <option value="atelier_bronze">Atelier Bronze Escuro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#57534E] mb-1">
                      Fotografia Real no Pôster
                    </label>
                    <select
                      value={activeProject.posterConfig.photoId || ''}
                      onChange={(e) =>
                        updateActiveProjectLocal((p) => ({
                          ...p,
                          posterConfig: {
                            ...p.posterConfig,
                            photoId: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="">Primeira foto selecionada</option>
                      {juliaData.photos.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPosterPng}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Pôster Pronto (PNG Alta Resolução)</span>
                </button>
              </div>

              {/* Preview ao vivo do Pôster */}
              <div className="lg:col-span-6 flex justify-center">
                <div
                  className={`w-full max-w-sm rounded-xl p-5 border-2 border-[#9A7138] text-center space-y-3 shadow-md ${
                    activeProject.posterConfig.theme === 'editorial_creme'
                      ? 'bg-[#F9F6F0] text-[#181512]'
                      : activeProject.posterConfig.theme === 'atelier_bronze'
                      ? 'bg-[#261E18] text-[#F9F6F0]'
                      : 'bg-[#181512] text-[#F9F6F0]'
                  }`}
                >
                  <div className="text-[11px] font-mono font-bold tracking-widest text-[#9A7138] uppercase">
                    {activeProject.posterConfig.badgeText}
                  </div>
                  <div className="h-52 rounded-lg overflow-hidden bg-[#2E2722] border border-[#9A7138]/40 flex items-center justify-center">
                    {primaryCampaignPhoto ? (
                      <ResilientImage
                        src={
                          primaryCampaignPhoto.imageUrl ||
                          primaryCampaignPhoto.thumbnailDataUrl ||
                          ''
                        }
                        alt={primaryCampaignPhoto.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#D8C5A3] px-4">
                        Selecione ou envie uma fotografia real para exibir no pôster
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-serif-display font-bold leading-snug">
                    {activeProject.posterConfig.headline || activeProject.headline}
                  </h4>
                  <p className="text-xs opacity-85">
                    {activeProject.posterConfig.subheadline}
                  </p>
                  <div className="py-2 px-3 rounded-lg bg-[#9A7138] text-white text-xs font-semibold">
                    {activeProject.posterConfig.ctaText}
                  </div>
                  <div className="text-xs font-mono font-semibold">
                    WhatsApp: {activeProject.posterConfig.contactLine || workshopPhone}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 8: CARROSSEL COM FOTOGRAFIAS REAIS (CORREÇÃO 1 COMPLETA)
             ================================================================ */}
          {currentStep === 8 && currentCarouselSlide && (
            <div className="space-y-5">
              {/* Cabeçalho e Botões de Exportação Completa (PNG Individual, 5 PNGs Separados e ZIP) */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#181512]">
                    Estúdio de Carrossel com Fotografias Reais — 5 Lâminas
                  </h4>
                  <p className="text-xs text-[#6B6257]">
                    Associe fotografias reais a cada lâmina, escolha cores, reorganize a ordem e exporte em PNG individual, 5 arquivos PNG separados ou pacote ZIP.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadSingleCarouselSlidePng(activeCarouselIndex)
                    }
                    disabled={isExportingCarousel}
                    className="px-3 py-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#9A7138]" />
                    <span>Baixar Lâmina {activeCarouselIndex + 1} (PNG)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAllCarouselSlidesSeparatePng}
                    disabled={isExportingCarousel}
                    className="px-3 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar 5 Imagens Separadas (PNG)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCarouselZip}
                    disabled={isExportingCarousel}
                    className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5 text-[#D8C5A3]" />
                    <span>
                      {isExportingCarousel
                        ? 'Exportando...'
                        : 'Baixar Carrossel Completo (ZIP)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Faixa Visual das 5 Lâminas com Miniatura da Fotografia e Seleção Rápida */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {activeProject.carouselSlides.map((sl, idx) => {
                  const slidePhoto =
                    juliaData.photos.find((ph) => ph.id === sl.photoId) ||
                    juliaData.photos.find((ph) =>
                      activeProject.selectedPhotoIds.includes(ph.id)
                    ) ||
                    juliaData.photos[idx % Math.max(1, juliaData.photos.length)];
                  const isActive = idx === activeCarouselIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveCarouselIndex(idx)}
                      className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                        isActive
                          ? 'bg-[#181512] text-white border-[#9A7138] ring-2 ring-[#9A7138]/40'
                          : 'bg-white text-[#181512] border-[#E5DEC9] hover:bg-[#F3EFE6]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Lâmina {idx + 1}</span>
                        <span className="text-[10px] text-[#9A7138]">
                          {slidePhoto ? 'Com Foto' : 'Sem Foto'}
                        </span>
                      </div>
                      <div className="h-20 w-full rounded-lg overflow-hidden bg-[#2E2722]">
                        {slidePhoto ? (
                          <ResilientImage
                            src={
                              slidePhoto.imageUrl ||
                              slidePhoto.thumbnailDataUrl ||
                              ''
                            }
                            alt={sl.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-[#D8C5A3] p-1 text-center">
                            Selecionar foto
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-medium truncate">
                        {sl.title}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Editor Completo + Visualização com Fotografia Real da Lâmina Selecionada */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 bg-white p-5 rounded-xl border border-[#E5DEC9] items-start">
                {/* Coluna Esquerda (7 cols): Controles da Lâmina */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EFECE6]">
                    <span className="text-xs font-bold text-[#181512]">
                      Editando Lâmina {activeCarouselIndex + 1} de{' '}
                      {activeProject.carouselSlides.length}
                    </span>

                    {/* Botões de Reorganizar Lâminas */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleMoveCarouselSlide(activeCarouselIndex, -1)
                        }
                        disabled={activeCarouselIndex === 0}
                        className="px-2.5 py-1 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] disabled:opacity-40 text-[11px] font-semibold text-[#181512]"
                      >
                        ← Mover p/ Trás
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleMoveCarouselSlide(activeCarouselIndex, 1)
                        }
                        disabled={
                          activeCarouselIndex >=
                          activeProject.carouselSlides.length - 1
                        }
                        className="px-2.5 py-1 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] disabled:opacity-40 text-[11px] font-semibold text-[#181512]"
                      >
                        Mover p/ Frente →
                      </button>
                    </div>
                  </div>

                  {/* Seleção e Substituição de Fotografia Real da Lâmina */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#181512]">
                        Fotografia do Produto na Lâmina {activeCarouselIndex + 1}
                      </label>
                      <button
                        type="button"
                        onClick={() => slideFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isUploadingPhoto
                            ? 'Enviando...'
                            : 'Enviar Nova Foto para esta Lâmina'}
                        </span>
                      </button>
                    </div>

                    <select
                      value={currentCarouselSlide.photoId || ''}
                      onChange={(e) => {
                        const chosenId = e.target.value;
                        updateActiveProjectLocal((p) => ({
                          ...p,
                          carouselSlides: p.carouselSlides.map((s, i) =>
                            i === activeCarouselIndex
                              ? { ...s, photoId: chosenId || undefined }
                              : s
                          ),
                        }));
                      }}
                      className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs font-medium"
                    >
                      <option value="">
                        Usar fotografia automática da campanha
                      </option>
                      {juliaData.photos.map((ph, pIdx) => (
                        <option key={ph.id} value={ph.id}>
                          Foto {pIdx + 1}: {ph.title} ({ph.tag})
                        </option>
                      ))}
                    </select>

                    {/* Grade rápida de miniaturas da biblioteca para trocar com 1 clique */}
                    {juliaData.photos.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] text-[#6B6257]">
                          Clique em uma fotografia da biblioteca para exibir ou substituir nesta lâmina:
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {juliaData.photos.map((ph) => {
                            const selectedInSlide =
                              currentSlidePhoto?.id === ph.id;
                            return (
                              <button
                                key={ph.id}
                                type="button"
                                onClick={() =>
                                  updateActiveProjectLocal((p) => ({
                                    ...p,
                                    carouselSlides: p.carouselSlides.map(
                                      (s, i) =>
                                        i === activeCarouselIndex
                                          ? { ...s, photoId: ph.id }
                                          : s
                                    ),
                                  }))
                                }
                                className={`relative w-16 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                                  selectedInSlide
                                    ? 'border-[#9A7138] ring-2 ring-[#9A7138]/40'
                                    : 'border-[#D6CFC5] opacity-75 hover:opacity-100'
                                }`}
                                title={`Selecionar ${ph.title}`}
                              >
                                <ResilientImage
                                  src={ph.imageUrl || ph.thumbnailDataUrl || ''}
                                  alt={ph.title}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Título e Descrição da Lâmina */}
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Título da Lâmina {activeCarouselIndex + 1}
                    </label>
                    <input
                      type="text"
                      value={currentCarouselSlide.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActiveProjectLocal((p) => ({
                          ...p,
                          carouselSlides: p.carouselSlides.map((s, i) =>
                            i === activeCarouselIndex ? { ...s, title: val } : s
                          ),
                        }));
                      }}
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Descrição da Lâmina {activeCarouselIndex + 1}
                    </label>
                    <textarea
                      rows={3}
                      value={currentCarouselSlide.body}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateActiveProjectLocal((p) => ({
                          ...p,
                          carouselSlides: p.carouselSlides.map((s, i) =>
                            i === activeCarouselIndex ? { ...s, body: val } : s
                          ),
                        }));
                      }}
                      className="w-full rounded-lg border border-[#D6CFC5] p-3 text-xs"
                    />
                  </div>

                  {/* Escolha de Cores da Lâmina */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-[#181512] mb-1">
                        Paleta de Cores desta Lâmina
                      </label>
                      <select
                        value={currentSlideThemeKey}
                        onChange={(e) => {
                          const newTheme = e.target.value as JuliaSlideTheme;
                          updateActiveProjectLocal((p) => ({
                            ...p,
                            carouselSlides: p.carouselSlides.map((s, i) =>
                              i === activeCarouselIndex
                                ? { ...s, theme: newTheme }
                                : s
                            ),
                          }));
                        }}
                        className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                      >
                        {Object.entries(SLIDE_THEME_PALETTES).map(
                          ([key, pal]) => (
                            <option key={key} value={key}>
                              {pal.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updateActiveProjectLocal(
                          (p) => ({
                            ...p,
                            carouselSlides: p.carouselSlides.map((s) => ({
                              ...s,
                              theme: currentSlideThemeKey,
                            })),
                          }),
                          `Paleta "${currentSlidePalette.label}" aplicada em todas as 5 lâminas!`
                        );
                      }}
                      className="py-2 px-3 rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512]"
                    >
                      Aplicar Cores nas 5 Lâminas
                    </button>
                  </div>
                </div>

                {/* Coluna Direita (5 cols): Visualização Real do Resultado da Lâmina */}
                <div className="lg:col-span-5 flex flex-col items-center space-y-3">
                  <div
                    style={{
                      backgroundColor: currentSlidePalette.bgHex,
                      color: currentSlidePalette.textHex,
                      borderColor: currentSlidePalette.accentHex,
                    }}
                    className="w-full max-w-sm rounded-xl p-4 border-2 shadow-lg space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span
                        style={{ color: currentSlidePalette.accentHex }}
                        className="font-bold"
                      >
                        CASTROS INTERIORES
                      </span>
                      <span>
                        LÂMINA {activeCarouselIndex + 1}/
                        {activeProject.carouselSlides.length}
                      </span>
                    </div>

                    {/* Fotografia Real do Produto na Lâmina */}
                    <div
                      style={{ borderColor: currentSlidePalette.accentHex }}
                      className="h-52 rounded-lg overflow-hidden bg-[#2E2722] border flex items-center justify-center"
                    >
                      {currentSlidePhoto ? (
                        <ResilientImage
                          src={
                            currentSlidePhoto.imageUrl ||
                            currentSlidePhoto.thumbnailDataUrl ||
                            ''
                          }
                          alt={currentCarouselSlide.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 space-y-2">
                          <ImageIcon className="w-6 h-6 mx-auto text-[#D8C5A3]" />
                          <p className="text-xs text-[#D8C5A3]">
                            Selecione ou envie uma fotografia real para esta lâmina
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Caixa de Texto da Lâmina */}
                    <div
                      style={{
                        backgroundColor: currentSlidePalette.cardHex,
                        borderColor: currentSlidePalette.accentHex,
                      }}
                      className="p-3.5 rounded-lg border space-y-1.5"
                    >
                      <h4 className="text-sm font-serif-display font-bold leading-snug">
                        {currentCarouselSlide.title}
                      </h4>
                      <p
                        style={{ color: currentSlidePalette.subTextHex }}
                        className="text-xs leading-relaxed"
                      >
                        {currentCarouselSlide.body}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span
                        style={{ color: currentSlidePalette.accentHex }}
                        className="font-mono font-semibold"
                      >
                        {activeProject.whatsappDirectNumber || workshopPhone}
                      </span>
                      <span className="font-semibold">
                        {activeCarouselIndex <
                        activeProject.carouselSlides.length - 1
                          ? 'Deslize →'
                          : 'Fale no WhatsApp'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadSingleCarouselSlidePng(activeCarouselIndex)
                    }
                    disabled={isExportingCarousel}
                    className="w-full max-w-sm py-2 px-4 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      Baixar Imagem da Lâmina {activeCarouselIndex + 1} em PNG
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 9: CATÁLOGO DIGITAL COM FOTOGRAFIAS REAIS (CORREÇÃO 2 COMPLETA)
             ================================================================ */}
          {currentStep === 9 && (
            <div className="space-y-5">
              {/* Barra Superior: Visualizar Catálogo e Baixar PDF A4 */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#181512]">
                    Catálogo Comercial Castros Interiores ({activeProject.catalogEntries.length} Produto(s) Cadastrado(s))
                  </h4>
                  <p className="text-xs text-[#6B6257]">
                    Cadastre quantos produtos desejar com uma ou mais fotografias reais, medidas, cores e preço opcional. Visualize antes de baixar o PDF A4.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCatalogPreviewOpen((prev) => !prev)}
                    className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-[#9A7138]" />
                    <span>
                      {catalogPreviewOpen
                        ? 'Ocultar Prévia do Catálogo'
                        : 'Visualizar Catálogo Antes do Download'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCatalogPdf}
                    disabled={isGeneratingCatalogPdf}
                    className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isGeneratingCatalogPdf
                        ? 'Gerando PDF A4 com Fotos...'
                        : 'Baixar Catálogo Comercial (PDF A4)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Formulário Completo de Cadastro / Edição de Produto do Catálogo */}
              <form
                onSubmit={handleSaveCatalogProduct}
                className="p-5 rounded-xl bg-white border border-[#E5DEC9] space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
                  <h5 className="text-xs font-bold text-[#181512]">
                    {editingCatalogId
                      ? 'Editando Produto do Catálogo Comercial'
                      : 'Cadastrar Produto no Catálogo Comercial'}
                  </h5>
                  {editingCatalogId && (
                    <button
                      type="button"
                      onClick={resetCatalogForm}
                      className="text-xs text-red-700 font-semibold hover:underline"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Nome do Produto *
                    </label>
                    <input
                      type="text"
                      value={catTitle}
                      onChange={(e) => setCatTitle(e.target.value)}
                      placeholder="Ex: Sofá Retrátil 3 Lugares Linho"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      list="castros-product-categories"
                      value={catCategory}
                      onChange={(e) => setCatCategory(e.target.value)}
                      placeholder="Ex: Sofá, Poltrona, Cadeira..."
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                    <datalist id="castros-product-categories">
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Coleção / Linha
                    </label>
                    <input
                      type="text"
                      value={catCollection}
                      onChange={(e) => setCatCollection(e.target.value)}
                      placeholder="Ex: Coleção Castros Interiores"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Preço (Opcional — só aparece se informado)
                    </label>
                    <input
                      type="text"
                      value={catPrice}
                      onChange={(e) => setCatPrice(e.target.value)}
                      placeholder="Ex: R$ 4.800,00 ou em branco"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Medidas (Opcional)
                    </label>
                    <input
                      type="text"
                      value={catMeasurements}
                      onChange={(e) => setCatMeasurements(e.target.value)}
                      placeholder="Ex: 2,20m x 0,95m x 0,85m"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Cores / Tecidos Disponíveis
                    </label>
                    <input
                      type="text"
                      value={catColors}
                      onChange={(e) => setCatColors(e.target.value)}
                      placeholder="Ex: Linho Bege, Cinza Aquecido, Terracota"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#181512] mb-1">
                      Selo de Destaque
                    </label>
                    <input
                      type="text"
                      value={catHighlight}
                      onChange={(e) => setCatHighlight(e.target.value)}
                      placeholder="Ex: Acabamento de Atelier"
                      className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#181512] mb-1">
                    Descrição Comercial do Produto
                  </label>
                  <textarea
                    rows={2}
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    placeholder="Descreva o acabamento, o conforto e os diferenciais do produto..."
                    className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs"
                  />
                </div>

                {/* Seleção de Uma ou Mais Fotografias da Biblioteca para o Produto */}
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#181512]">
                      Fotografias do Produto ({catSelectedPhotoIds.length} selecionada(s))
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCatalogEntryIdForUpload(null);
                        catalogFileInputRef.current?.click();
                      }}
                      disabled={isUploadingPhoto}
                      className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Enviar Nova Fotografia para este Produto</span>
                    </button>
                  </div>

                  {juliaData.photos.length === 0 ? (
                    <p className="text-xs text-[#6B6257]">
                      Nenhuma fotografia na biblioteca ainda. Clique no botão acima para enviar do celular ou computador.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {juliaData.photos.map((ph) => {
                        const checked = catSelectedPhotoIds.includes(ph.id);
                        return (
                          <button
                            key={ph.id}
                            type="button"
                            onClick={() =>
                              setCatSelectedPhotoIds((prev) =>
                                prev.includes(ph.id)
                                  ? prev.filter((id) => id !== ph.id)
                                  : [...prev, ph.id]
                              )
                            }
                            className={`p-1.5 rounded-lg border text-left transition-all ${
                              checked
                                ? 'bg-[#181512] text-white border-[#9A7138] ring-2 ring-[#9A7138]/40'
                                : 'bg-white text-[#181512] border-[#D6CFC5]'
                            }`}
                          >
                            <div className="h-16 rounded overflow-hidden bg-[#EDE7DC] mb-1">
                              <ResilientImage
                                src={ph.imageUrl || ph.thumbnailDataUrl || ''}
                                alt={ph.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-[10px] font-semibold truncate">
                              {checked ? '✓ ' : ''}
                              {ph.title}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-[#D8C5A3]" />
                    <span>
                      {editingCatalogId
                        ? 'Salvar Alterações do Produto'
                        : 'Adicionar Produto ao Catálogo'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Lista de Produtos Cadastrados no Catálogo */}
              {activeProject.catalogEntries.length === 0 ? (
                <div className="p-6 rounded-xl bg-white border border-[#E5DEC9] text-center text-xs text-[#6B6257]">
                  Nenhum produto cadastrado ainda neste catálogo. Preencha o formulário acima e selecione as fotografias reais da biblioteca da Castros Interiores para montar o catálogo.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeProject.catalogEntries.map((entry, idx) => {
                    const prodPhotos = getProductPhotos(entry);
                    const isAttaching = attachingPhotosToProductId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3 text-xs"
                      >
                        <div className="space-y-3">
                          {/* Fotografias Reais do Produto */}
                          {prodPhotos.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {prodPhotos.map((ph, pIdx) => (
                                <div
                                  key={ph.id}
                                  className={`rounded-lg overflow-hidden bg-[#EDE7DC] border border-[#D6CFC5] ${
                                    pIdx === 0 ? 'col-span-2 h-36' : 'h-36'
                                  }`}
                                >
                                  <ResilientImage
                                    src={ph.imageUrl || ph.thumbnailDataUrl || ''}
                                    alt={ph.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-28 rounded-lg bg-[#FAF8F5] border border-dashed border-[#D6CFC5] flex items-center justify-center text-[#6B6257]">
                              Sem fotografia vinculada — clique em "Adicionar Fotografias" abaixo
                            </div>
                          )}

                          <div className="space-y-1">
                            <div className="text-[11px] font-mono font-semibold text-[#9A7138]">
                              {idx + 1}. {entry.category || 'Estofado'} ·{' '}
                              {entry.collectionLine} · {entry.highlightTag}
                            </div>
                            <h5 className="font-bold text-sm text-[#181512]">
                              {entry.title}
                            </h5>
                            <p className="text-[#57534E]">
                              {entry.styleDescription}
                            </p>
                            {entry.measurements && (
                              <div className="text-[#181512]">
                                <strong>Medidas:</strong> {entry.measurements}
                              </div>
                            )}
                            {entry.availableColors && (
                              <div className="text-[#181512]">
                                <strong>Cores disponíveis:</strong>{' '}
                                {entry.availableColors}
                              </div>
                            )}
                            {entry.priceText && (
                              <div className="inline-block mt-1 px-2.5 py-1 rounded bg-[#181512] text-[#D8C5A3] font-bold">
                                Preço: {entry.priceText}
                              </div>
                            )}
                          </div>

                          {/* Painel rápido para adicionar/remover fotografias deste produto */}
                          {isAttaching && (
                            <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#D8C5A3] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] text-[#181512]">
                                  Selecionar Fotografias da Biblioteca:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetCatalogEntryIdForUpload(entry.id);
                                    catalogFileInputRef.current?.click();
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#9A7138] text-white text-[11px] font-semibold"
                                >
                                  + Enviar Nova Foto
                                </button>
                              </div>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {juliaData.photos.map((ph) => {
                                  const linked = prodPhotos.some(
                                    (p) => p.id === ph.id
                                  );
                                  return (
                                    <button
                                      key={ph.id}
                                      type="button"
                                      onClick={() =>
                                        handleTogglePhotoInCatalogProduct(
                                          entry.id,
                                          ph.id
                                        )
                                      }
                                      className={`w-16 h-14 rounded overflow-hidden border-2 shrink-0 ${
                                        linked
                                          ? 'border-[#9A7138] ring-2 ring-[#9A7138]/40'
                                          : 'border-[#D6CFC5] opacity-60'
                                      }`}
                                    >
                                      <ResilientImage
                                        src={
                                          ph.imageUrl ||
                                          ph.thumbnailDataUrl ||
                                          ''
                                        }
                                        alt={ph.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Botões obrigatórios do produto: Editar, Adicionar Fotografias, Excluir */}
                        <div className="pt-2 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditCatalogEntry(entry)}
                              className="px-2.5 py-1.5 rounded bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] font-semibold text-[#181512] flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#9A7138]" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAttachingPhotosToProductId(
                                  isAttaching ? null : entry.id
                                )
                              }
                              className="px-2.5 py-1.5 rounded bg-[#FAF6EE] hover:bg-[#F3EFE6] border border-[#D8C5A3] font-semibold text-[#9A7138] flex items-center gap-1"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Adicionar Fotografias</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCatalogProduct(entry.id)}
                            className="px-2.5 py-1.5 rounded bg-red-50 hover:bg-red-100 text-red-800 font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Visualização do Catálogo Antes do Download (Prévia A4 em Tela) */}
              {catalogPreviewOpen && (
                <div className="p-6 rounded-xl bg-[#181512] text-[#F9F6F0] border-2 border-[#9A7138] space-y-6">
                  <div className="flex items-center justify-between border-b border-[#2E2722] pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-[#D8C5A3]">
                        PRÉVIA DO CATÁLOGO COMERCIAL A4 ANTES DO DOWNLOAD
                      </span>
                      <h4 className="text-lg font-serif-display font-bold text-white">
                        CASTROS INTERIORES — {activeProject.headline}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadCatalogPdf}
                      disabled={isGeneratingCatalogPdf}
                      className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Confirmar e Baixar PDF A4</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#D6CFC5] leading-relaxed">
                    {activeProject.copyText}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeProject.catalogEntries.map((entry, idx) => {
                      const photos = getProductPhotos(entry);
                      return (
                        <div
                          key={entry.id}
                          className="p-4 rounded-xl bg-[#FAF8F5] text-[#181512] border border-[#D8C5A3] space-y-2.5"
                        >
                          {photos[0] && (
                            <div className="h-44 rounded-lg overflow-hidden bg-[#EDE7DC]">
                              <ResilientImage
                                src={
                                  photos[0].imageUrl ||
                                  photos[0].thumbnailDataUrl ||
                                  ''
                                }
                                alt={entry.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="text-[11px] font-mono font-bold text-[#9A7138]">
                            {idx + 1}. {entry.category || 'Estofado'} ·{' '}
                            {entry.collectionLine}
                          </div>
                          <div className="font-bold text-sm">{entry.title}</div>
                          <p className="text-xs text-[#57534E]">
                            {entry.styleDescription}
                          </p>
                          {entry.measurements && (
                            <div className="text-xs">
                              <strong>Medidas:</strong> {entry.measurements}
                            </div>
                          )}
                          {entry.availableColors && (
                            <div className="text-xs">
                              <strong>Cores:</strong> {entry.availableColors}
                            </div>
                          )}
                          {entry.priceText && (
                            <div className="text-xs font-bold text-[#9A7138]">
                              Valor: {entry.priceText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-[#2E2722] flex items-center justify-between text-xs text-[#D8C5A3]">
                    <span>
                      Contato Comercial Castros Interiores — WhatsApp:{' '}
                      {activeProject.whatsappDirectNumber || workshopPhone}
                    </span>
                    <span>Formato A4 Paginado</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              ETAPA 10: HASHTAGS E CHAMADA PARA AÇÃO (CTA)
             ================================================================ */}
          {currentStep === 10 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Chamada para Ação (CTA)
                </label>
                <input
                  type="text"
                  value={activeProject.ctaButtonText}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      ctaButtonText: val,
                      adFeedText: p.adFeedAdaptedByAi
                        ? p.adFeedText
                        : buildFaithfulFeedText(
                            p.headline,
                            p.copyText,
                            val,
                            p.whatsappDirectNumber,
                            p.hashtags
                          ),
                      adStoriesText: p.adStoriesAdaptedByAi
                        ? p.adStoriesText
                        : buildFaithfulStoriesText(
                            p.headline,
                            p.copyText,
                            val,
                            p.whatsappDirectNumber
                          ),
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  WhatsApp de Contato Direto nos Anúncios
                </label>
                <input
                  type="text"
                  value={activeProject.whatsappDirectNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      whatsappDirectNumber: val,
                      adFeedText: p.adFeedAdaptedByAi
                        ? p.adFeedText
                        : buildFaithfulFeedText(
                            p.headline,
                            p.copyText,
                            p.ctaButtonText,
                            val,
                            p.hashtags
                          ),
                      adStoriesText: p.adStoriesAdaptedByAi
                        ? p.adStoriesText
                        : buildFaithfulStoriesText(
                            p.headline,
                            p.copyText,
                            p.ctaButtonText,
                            val
                          ),
                      posterConfig: {
                        ...p.posterConfig,
                        contactLine: val,
                      },
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs tabular-nums"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Hashtags Estratégicas da Campanha
                </label>
                <textarea
                  rows={2}
                  value={activeProject.hashtags}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      hashtags: val,
                      adFeedText: p.adFeedAdaptedByAi
                        ? p.adFeedText
                        : buildFaithfulFeedText(
                            p.headline,
                            p.copyText,
                            p.ctaButtonText,
                            p.whatsappDirectNumber,
                            val
                          ),
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white p-3 text-xs"
                />
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 11: PROGRAMAÇÃO DE PUBLICAÇÕES (CORREÇÃO 3 COMPLETA)
             ================================================================ */}
          {currentStep === 11 && (
            <div className="space-y-4">
              {/* Verificação Real de Integração com Instagram, Facebook e WhatsApp */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-2 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Status Real de Integrações para Publicação Automática (Instagram, Facebook e WhatsApp)
                  </span>
                </div>
                <p className="font-semibold text-amber-900">
                  Publicação planejada. Envio manual necessário.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-white border border-amber-200">
                    <div className="font-bold text-[#181512]">Instagram</div>
                    <div className="text-[11px] text-amber-800">
                      {integrationsStatus.instagram.connected
                        ? 'Integração Oficial Conectada'
                        : 'Sem API automática conectada — Publicação planejada. Envio manual necessário.'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-amber-200">
                    <div className="font-bold text-[#181512]">Facebook</div>
                    <div className="text-[11px] text-amber-800">
                      {integrationsStatus.facebook.connected
                        ? 'Integração Oficial Conectada'
                        : 'Sem API automática conectada — Publicação planejada. Envio manual necessário.'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-amber-200">
                    <div className="font-bold text-[#181512]">WhatsApp</div>
                    <div className="text-[11px] text-amber-800">
                      {integrationsStatus.whatsapp.connected
                        ? 'WhatsApp Cloud API Conectada'
                        : 'Compartilhamento assistido via WhatsApp Web / App — Publicação planejada. Envio manual necessário.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[#E5DEC9]">
                <div>
                  <label className="block text-xs font-bold text-[#181512] mb-1">
                    Canal Principal de Publicação
                  </label>
                  <select
                    value={activeProject.scheduleChannel}
                    onChange={(e) =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        scheduleChannel: e.target
                          .value as JuliaSmartAdProject['scheduleChannel'],
                      }))
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs"
                  >
                    <option value="Instagram Feed">Instagram Feed</option>
                    <option value="Instagram Stories">Instagram Stories</option>
                    <option value="WhatsApp Status">WhatsApp Status</option>
                    <option value="Lista de Transmissão WhatsApp">
                      Lista de Transmissão WhatsApp
                    </option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#181512] mb-1">
                    Data da Publicação
                  </label>
                  <input
                    type="date"
                    value={activeProject.scheduleDate}
                    onChange={(e) =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        scheduleDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#181512] mb-1">
                    Horário da Publicação
                  </label>
                  <input
                    type="time"
                    value={activeProject.scheduleTime}
                    onChange={(e) =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        scheduleTime: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Duas Funções Claramente Separadas: 1. Planejar Publicação | 2. Agendar Publicação Automática */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#181512]">
                      Opção 1 — Planejar Publicação (Envio Manual Autorizado)
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      Registra a campanha no Calendário de Campanhas para você revisar e publicar manualmente no horário planejado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateScheduleEntry('planejada_manual', true)
                    }
                    className="w-full py-2.5 px-4 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-[#D8C5A3]" />
                    <span>1. Planejar Publicação no Calendário</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#181512]">
                      Opção 2 — Agendar Publicação Automática
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      Disponível somente quando houver integração oficial ativa e autorizada. Sem integração configurada, registrará como planejada para envio manual.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateScheduleEntry('automatica', true)
                    }
                    className="w-full py-2.5 px-4 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-[#181512] text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-[#9A7138]" />
                    <span>
                      2. Agendar Publicação Automática (Requer Integração Oficial)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 12: COMPARTILHAMENTO OFICIAL NO WHATSAPP WEB / APP (CORREÇÕES 1 E 2 FINAIS)
             ================================================================ */}
          {currentStep === 12 &&
            (() => {
              const preparedMessage = buildCampaignWhatsAppMessage();
              const recipientCheck = validateWhatsAppRecipientPhone(
                whatsappRecipientPhone
              );
              const singlePhoneClean = (
                activeProject.whatsappDirectNumber ||
                workshopPhone ||
                '(91) 98556-9841'
              )
                .replace(/^whatsapp\s*:\s*/i, '')
                .trim();
              const cleanCtaLabel = stripPhoneFromCta(
                activeProject.ctaButtonText,
                singlePhoneClean
              );

              return (
                <div className="space-y-4">
                  {/* Resumo fiel da campanha atual com Telefone Único */}
                  <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#181512]">
                            Texto Oficial para WhatsApp ({activeProject.targetChannel || 'WhatsApp'})
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Zero Hashtags
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6257]">
                          Título, texto elegante, CTA e contato exclusivo: <strong className="text-[#181512]">WhatsApp: (91) 98556-9841</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText('full-step12', preparedMessage)
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        {copiedKey === 'full-step12' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Texto Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Texto WhatsApp</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Preview box SEM NENHUMA HASHTAG para WhatsApp */}
                    <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
                      <p className="text-[#181512] font-bold text-sm">
                        {activeProject.headline}
                      </p>
                      <p className="text-[#57534E] whitespace-pre-line leading-relaxed">
                        {stripHashtags(
                          deduplicateBodyPhone(
                            activeProject.socialMediaVersions?.whatsappMessage || activeProject.copyText,
                            singlePhoneClean
                          )
                        )}
                      </p>
                      <div className="space-y-0.5 pt-2 border-t border-[#EFECE6]">
                        {cleanCtaLabel && (
                          <p className="text-[#181512] font-semibold">
                            {cleanCtaLabel}
                          </p>
                        )}
                        <p className="text-[#181512] font-bold">
                          WhatsApp: {singlePhoneClean}
                        </p>
                      </div>
                      <div className="pt-1.5 text-[10px] text-emerald-700 font-medium flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Hashtags removidas automaticamente da mensagem final do WhatsApp (preservadas com segurança para Instagram e Facebook).</span>
                      </div>
                    </div>

                    {/* Versões Rápidas de Redes Sociais quando 'Todas as redes sociais' ou para cópia imediata */}
                    {activeProject.socialMediaVersions && (
                      <div className="pt-2 border-t border-[#EFECE6] space-y-2">
                        <span className="text-[11px] font-bold text-[#181512]">
                          Versões Prontas para Outros Canais ({activeProject.targetChannel || 'Todas as redes sociais'}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#181512]">
                              <span>Instagram Feed</span>
                              <span className="text-[9px] text-[#9A7138] font-normal">5-8 hashtags</span>
                            </div>
                            <p className="text-[10px] text-[#6B6257] line-clamp-3">
                              {activeProject.socialMediaVersions.instagramFeed}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  'step12-ig-feed',
                                  activeProject.socialMediaVersions?.instagramFeed || ''
                                )
                              }
                              className="mt-1 py-1 px-2 rounded bg-white hover:bg-[#F3EFE6] border border-[#D6CFC5] text-[10px] font-semibold text-[#181512] flex items-center justify-center gap-1"
                            >
                              <Copy className="w-3 h-3 text-[#9A7138]" />
                              <span>{copiedKey === 'step12-ig-feed' ? 'Copiado!' : 'Copiar Legenda Feed'}</span>
                            </button>
                          </div>

                          <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#181512]">
                              <span>Facebook</span>
                              <span className="text-[9px] text-blue-700 font-normal">Comercial + 2-3 hashtags</span>
                            </div>
                            <p className="text-[10px] text-[#6B6257] line-clamp-3">
                              {activeProject.socialMediaVersions.facebook}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  'step12-fb',
                                  activeProject.socialMediaVersions?.facebook || ''
                                )
                              }
                              className="mt-1 py-1 px-2 rounded bg-white hover:bg-[#F3EFE6] border border-[#D6CFC5] text-[10px] font-semibold text-[#181512] flex items-center justify-center gap-1"
                            >
                              <Copy className="w-3 h-3 text-blue-700" />
                              <span>{copiedKey === 'step12-fb' ? 'Copiado!' : 'Copiar Post Facebook'}</span>
                            </button>
                          </div>

                          <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#181512]">
                              <span>WhatsApp Status</span>
                              <span className="text-[9px] text-emerald-700 font-normal">Direto sem hashtag</span>
                            </div>
                            <p className="text-[10px] text-[#6B6257] line-clamp-3">
                              {activeProject.socialMediaVersions.whatsappStatus}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  'step12-wa-status',
                                  activeProject.socialMediaVersions?.whatsappStatus || ''
                                )
                              }
                              className="mt-1 py-1 px-2 rounded bg-white hover:bg-[#F3EFE6] border border-[#D6CFC5] text-[10px] font-semibold text-[#181512] flex items-center justify-center gap-1"
                            >
                              <Copy className="w-3 h-3 text-emerald-700" />
                              <span>{copiedKey === 'step12-wa-status' ? 'Copiado!' : 'Copiar Status'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destinatário opcional + Abertura Direta do WhatsApp Web / Aplicativo */}
                  <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                    <div className="text-xs font-bold text-[#181512]">
                      1. Compartilhar Mensagem no WhatsApp Web ou Aplicativo WhatsApp
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      O botão abaixo utiliza o link oficial{' '}
                      <code className="bg-[#FAF8F5] px-1 py-0.5 rounded border border-[#E5DEC9]">
                        https://api.whatsapp.com/send?text=
                      </code>{' '}
                      com o texto codificado via{' '}
                      <code className="bg-[#FAF8F5] px-1 py-0.5 rounded border border-[#E5DEC9]">
                        encodeURIComponent
                      </code>
                      . Nenhuma mensagem é enviada automaticamente sem a sua confirmação.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={whatsappRecipientPhone}
                          onChange={(e) => {
                            setWhatsappRecipientPhone(e.target.value);
                            if (errorNotice) setErrorNotice(null);
                          }}
                          placeholder="WhatsApp do destinatário (opcional — ex: (91) 98556-9841)"
                          className={`w-full rounded-lg border px-3 py-2 text-xs ${
                            recipientCheck.hasInput && !recipientCheck.valid
                              ? 'border-red-500 bg-red-50/40'
                              : 'border-[#D6CFC5] bg-white'
                          }`}
                        />
                        {recipientCheck.hasInput && !recipientCheck.valid && (
                          <p className="text-[11px] text-red-700 font-medium">
                            {recipientCheck.error}
                          </p>
                        )}
                        {recipientCheck.hasInput && recipientCheck.valid && (
                          <p className="text-[11px] text-emerald-800 font-medium">
                            Destinatário validado: {recipientCheck.formattedDisplay} (+{recipientCheck.normalizedPhone}) — o texto abrirá direto na conversa!
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppDirect()}
                          className="px-5 py-2.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir WhatsApp com Texto Pronto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText('full-step12', preparedMessage)
                          }
                          className="px-4 py-2.5 rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#181512] text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#9A7138]" />
                          <span>
                            {copiedKey === 'full-step12'
                              ? 'Texto Copiado!'
                              : 'Copiar Texto'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                      <strong>Nota sobre o WhatsApp Web:</strong> Quando você informa o telefone do destinatário acima, o WhatsApp Web abre diretamente a conversa com o texto preenchido no campo de digitação. Quando o destinatário é deixado em branco, o WhatsApp abre a janela de seleção de contato; caso o WhatsApp Web não mantenha o texto ao trocar de janela, o sistema já copia automaticamente a mensagem (ou você pode clicar em <strong>&ldquo;Copiar Texto&rdquo;</strong>) para colar com <strong>Ctrl+V</strong>.
                    </div>
                  </div>

                  {/* Compartilhamento de Fotografias e Peças Gráficas */}
                  <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
                    <div className="text-xs font-bold text-[#181512]">
                      2. Anexar ou Compartilhar as Fotografias e Peças Publicitárias
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      O link oficial do WhatsApp prepara o texto da campanha. Para enviar a imagem publicitária junto, copie a imagem abaixo para colar (Ctrl+V) na conversa do WhatsApp Web, baixe o PNG/ZIP/PDF ou use o compartilhamento de arquivo em dispositivos compatíveis:
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleCopyCampaignImageToClipboard}
                        className="px-4 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4 text-[#D8C5A3]" />
                        <span>Copiar Imagem para Colar (Ctrl+V) no WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPosterPng}
                        className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Pôster (PNG)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCarouselZip}
                        disabled={isExportingCarousel}
                        className="px-4 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#332C25] text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4 text-[#D8C5A3]" />
                        <span>Baixar Carrossel 5 Lâminas (ZIP)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCatalogPdf}
                        disabled={isGeneratingCatalogPdf}
                        className="px-4 py-2.5 rounded-lg border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512] flex items-center gap-2"
                      >
                        <BookOpen className="w-4 h-4 text-[#9A7138]" />
                        <span>Baixar Catálogo (PDF A4)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShareImageFileNativeIfSupported}
                        className="px-4 py-2.5 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512] flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4 text-emerald-700" />
                        <span>Anexar Arquivo pelo Celular</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* ====================================================================
          BLOCO 2: ESTÚDIO RÁPIDO DE ANÚNCIOS, PÔSTERES, CARROSSÉIS, CATÁLOGOS E WHATSAPP
         ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <Megaphone className="w-4 h-4 text-[#9A7138]" />
              <span>Anúncios</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Feed e Stories fiéis ao Título (Etapa 4) e Texto (Etapa 5).
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateActiveProjectLocal((p) => ({ ...p, currentStep: 6 }))
            }
            className="w-full py-1.5 px-3 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512]"
          >
            Abrir Anúncios (Etapa 6)
          </button>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <ImageIcon className="w-4 h-4 text-[#9A7138]" />
              <span>Pôsteres</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Pôster de alto padrão com fotografia real e download PNG.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateActiveProjectLocal((p) => ({ ...p, currentStep: 7 }))
              }
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleDownloadPosterPng}
              className="py-1.5 px-2.5 rounded-lg bg-[#9A7138] text-white text-xs font-semibold"
              title="Baixar Pôster PNG"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <Layers className="w-4 h-4 text-[#9A7138]" />
              <span>Carrosséis (5 Lâminas)</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Com fotografias reais, cores e exportação em PNG e ZIP.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateActiveProjectLocal((p) => ({ ...p, currentStep: 8 }))
              }
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleDownloadCarouselZip}
              className="py-1.5 px-2.5 rounded-lg bg-[#181512] text-white text-xs font-semibold"
              title="Baixar Carrossel em ZIP"
            >
              <Archive className="w-3.5 h-3.5 text-[#D8C5A3]" />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <BookOpen className="w-4 h-4 text-[#9A7138]" />
              <span>Catálogo Digital</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Catálogo comercial com fotografias reais em PDF A4.
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateActiveProjectLocal((p) => ({ ...p, currentStep: 9 }))
              }
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleDownloadCatalogPdf}
              className="py-1.5 px-2.5 rounded-lg bg-[#181512] text-white text-xs font-semibold"
              title="Baixar Catálogo PDF A4"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <ExternalLink className="w-4 h-4 text-emerald-700" />
              <span>WhatsApp Oficial</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Abre o WhatsApp Web / App com o texto pronto para envio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenWhatsAppDirect()}
            className="w-full py-1.5 px-3 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir WhatsApp</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          BLOCO 3: COMUNICAÇÃO POR VOZ E TEXTO + CALENDÁRIO DE CAMPANHAS + RELATÓRIO DIÁRIO
         ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA (5 cols): COMUNICAÇÃO POR VOZ E TEXTO COM HISTÓRICO */}
        <div className="lg:col-span-5 rounded-xl bg-white border border-[#E5DEC9] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EFECE6]">
              <div>
                <h3 className="text-base font-serif-display font-bold text-[#181512]">
                  Comunicação por Voz e Texto com a Júlia
                </h3>
                <p className="text-[11px] text-[#6B6257]">
                  Histórico persistente de orientações faladas ou digitadas ({juliaData.chatHistory.length} mensagens)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVoiceSpeakEnabled((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 ${
                  voiceSpeakEnabled
                    ? 'bg-[#FAF6EE] border-[#9A7138] text-[#181512]'
                    : 'bg-[#FAF8F5] border-[#D6CFC5] text-[#6B6257]'
                }`}
                title="Ativar ou silenciar voz da Júlia"
              >
                {voiceSpeakEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#9A7138]" />
                    <span>Voz Ativa</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Mudo</span>
                  </>
                )}
              </button>
            </div>

            {/* Lista do Histórico de Conversas */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {juliaData.chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    msg.sender === 'operador'
                      ? 'bg-[#181512] text-[#F9F6F0] ml-6'
                      : 'bg-[#FAF8F5] text-[#181512] border border-[#E5DEC9] mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <span className="font-semibold">
                      {msg.sender === 'operador' ? 'Você' : 'Júlia Marketing'} ·{' '}
                      {msg.modality === 'voz' ? 'Voz' : 'Texto'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.sender === 'julia' && (
                        <button
                          type="button"
                          onClick={() => speakTextInPortuguese(msg.text)}
                          className="underline hover:text-[#9A7138]"
                          title="Ouvir mensagem em voz alta"
                        >
                          Ouvir
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Controles de Voz e Texto */}
          <div className="pt-2 border-t border-[#EFECE6] space-y-2">
            {/* Atalhos Rápidos de Interação */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleSendChat(
                    `Júlia, por favor avalie detalhadamente esta campanha ativa ("${
                      activeProject?.name || 'Campanha atual'
                    }"): analise o título, texto, público-alvo, adequação ao formato e apelo comercial.`
                  )
                }
                disabled={isSendingChat}
                className="px-2.5 py-1 rounded-md bg-[#FAF6EE] hover:bg-[#F3EFE6] border border-[#D8C5A3] text-[11px] font-semibold text-[#181512] flex items-center gap-1"
                title="Pede à Júlia uma avaliação da campanha ativa"
              >
                <Sparkles className="w-3 h-3 text-[#9A7138]" />
                <span>Avaliar esta campanha</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendChat(
                    'Júlia, quais melhorias você sugere para as fotos e legendas do Instagram desta campanha?'
                  )
                }
                disabled={isSendingChat}
                className="px-2.5 py-1 rounded-md bg-[#FAF6EE] hover:bg-[#F3EFE6] border border-[#D8C5A3] text-[11px] font-semibold text-[#181512] flex items-center gap-1"
              >
                <span>Dicas para Instagram</span>
              </button>

              <button
                type="button"
                onClick={stopVoiceSpeaking}
                className="px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-[10px] text-stone-600 font-medium"
                title="Interromper fala em voz alta"
              >
                Parar Áudio
              </button>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleToggleVoiceListening}
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                  isListeningVoice
                    ? 'bg-red-700 text-white animate-pulse'
                    : 'bg-[#9A7138] hover:bg-[#845E2B] text-white'
                }`}
                title={isListeningVoice ? 'Clique para parar' : 'Falar por voz'}
              >
                {isListeningVoice ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Ouvindo...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline">Voz</span>
                  </>
                )}
              </button>

              <textarea
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder="Digite para a Júlia (Enter envia, Shift+Enter pula linha)..."
                className="flex-1 rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#9A7138]"
              />

              <button
                type="button"
                onClick={() => handleSendChat()}
                disabled={isSendingChat || !chatInput.trim()}
                className="px-4 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-[#D8C5A3]" />
                <span>{isSendingChat ? 'Enviando...' : 'Enviar'}</span>
              </button>
            </div>

            {isSendingChat && (
              <p className="text-[11px] text-[#9A7138] italic flex items-center gap-1 animate-pulse">
                <span>Júlia está analisando e formulando a resposta...</span>
              </p>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (7 cols): CALENDÁRIO DE CAMPANHAS + RELATÓRIO DIÁRIO */}
        <div className="lg:col-span-7 space-y-6">
          {/* CALENDÁRIO DE CAMPANHAS (CORREÇÃO 3 COMPLETA) */}
          <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFECE6]">
              <div>
                <h3 className="text-base font-serif-display font-bold text-[#181512] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#9A7138]" />
                  <span>
                    Calendário de Campanhas ({juliaData.campaigns.length})
                  </span>
                </h3>
                <p className="text-[11px] text-[#6B6257]">
                  Publicação planejada. Envio manual necessário (nenhuma publicação é disparada sem autorização).
                </p>
              </div>

              {/* Filtros: Planejadas, Agendadas, Concluídas, Com Erro */}
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    ['TODAS', 'Todas'],
                    ['Planejada', 'Planejadas'],
                    ['Agendada', 'Agendadas'],
                    ['Concluída', 'Concluídas'],
                    ['Com Erro', 'Com Erro'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCalendarStatusFilter(key)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                      calendarStatusFilter === key
                        ? 'bg-[#181512] text-white'
                        : 'bg-[#FAF8F5] text-[#57534E] border border-[#E5DEC9]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#E5DEC9]">
              <input
                type="text"
                value={newCampTitle}
                onChange={(e) => setNewCampTitle(e.target.value)}
                placeholder="Título da publicação no calendário..."
                className="sm:col-span-4 rounded-lg border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
              />
              <select
                value={newCampFormat}
                onChange={(e) => setNewCampFormat(e.target.value as JuliaPieceFormat)}
                className="sm:col-span-2 rounded-lg border border-[#D6CFC5] bg-white px-2 py-1.5 text-xs"
              >
                <option value="Anúncio">Anúncio</option>
                <option value="Pôster">Pôster</option>
                <option value="Carrossel">Carrossel</option>
                <option value="Catálogo">Catálogo</option>
              </select>
              <select
                value={newCampChannel}
                onChange={(e) =>
                  setNewCampChannel(
                    e.target.value as JuliaCampaignScheduleItem['channel']
                  )
                }
                className="sm:col-span-2 rounded-lg border border-[#D6CFC5] bg-white px-2 py-1.5 text-xs"
              >
                <option value="Instagram Feed">Instagram Feed</option>
                <option value="Instagram Stories">Instagram Stories</option>
                <option value="WhatsApp Status">WhatsApp Status</option>
                <option value="Lista de Transmissão WhatsApp">
                  Lista WhatsApp
                </option>
                <option value="Facebook">Facebook</option>
              </select>
              <input
                type="date"
                value={newCampDate}
                onChange={(e) => setNewCampDate(e.target.value)}
                className="sm:col-span-2 rounded-lg border border-[#D6CFC5] bg-white px-2 py-1.5 text-xs tabular-nums"
              />
              <input
                type="time"
                value={newCampTime}
                onChange={(e) => setNewCampTime(e.target.value)}
                className="sm:col-span-2 rounded-lg border border-[#D6CFC5] bg-white px-2 py-1.5 text-xs tabular-nums"
              />
              <div className="sm:col-span-12 flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCreateScheduleEntry('planejada_manual', false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D8C5A3]" />
                  <span>Planejar Publicação (Envio Manual)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateScheduleEntry('automatica', false)}
                  className="px-3 py-1.5 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[#181512] text-xs font-semibold flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#9A7138]" />
                  <span>Agendar Publicação Automática</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredCalendarCampaigns.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B6257]">
                  Nenhuma publicação neste filtro do calendário.
                </div>
              ) : (
                filteredCalendarCampaigns.map((camp) => {
                  const normStatus = normalizedCampaignStatus(camp.status);
                  return (
                    <div
                      key={camp.id}
                      className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#181512]">{camp.title}</div>
                        <div className="text-[#6B6257] tabular-nums">
                          {camp.format} · {camp.channel} · {camp.scheduledDate} às{' '}
                          {camp.scheduledTime}
                        </div>
                        <div className="text-[11px] font-medium text-amber-900">
                          {camp.integrationNote ||
                            'Publicação planejada. Envio manual necessário.'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                          value={normStatus}
                          onChange={(e) =>
                            handleUpdateCampaignStatus(
                              camp.id,
                              e.target.value as JuliaCampaignStatus
                            )
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                            normStatus === 'Concluída'
                              ? 'bg-emerald-800 text-white border-emerald-900'
                              : normStatus === 'Com Erro'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : normStatus === 'Agendada'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-[#EDE7DC] text-[#181512] border-[#D6CFC5]'
                          }`}
                        >
                          <option value="Planejada">Planejada (Manual)</option>
                          <option value="Agendada">Agendada</option>
                          <option value="Concluída">Concluída</option>
                          <option value="Com Erro">Com Erro</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenWhatsAppDirect(
                              `*${camp.title}*\n\n${
                                camp.captionPreview || activeProject.copyText
                              }\n\nWhatsApp: ${
                                activeProject.whatsappDirectNumber || workshopPhone
                              }`
                            )
                          }
                          className="px-2.5 py-1 rounded bg-[#1F5E3B] text-white text-[11px] font-semibold"
                          title="Enviar agora pelo WhatsApp"
                        >
                          Enviar WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-1 text-red-700 hover:text-red-900"
                          title="Excluir publicação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RELATÓRIO DIÁRIO DA JÚLIA */}
          <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFECE6]">
              <div>
                <h3 className="text-base font-serif-display font-bold text-[#181512] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#9A7138]" />
                  <span>Relatório Diário de Marketing e Divulgação</span>
                </h3>
                <p className="text-[11px] text-[#6B6257]">
                  Balanço diário de fotografias reais, peças criadas e recomendações.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateDailyReport}
                disabled={isGeneratingReport}
                className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isGeneratingReport
                    ? 'Atualizando Relatório...'
                    : 'Atualizar Relatório Diário'}
                </span>
              </button>
            </div>

            {latestReport && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {juliaData.photos.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Fotos Reais</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {juliaData.projects.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Campanhas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {juliaData.projects.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Pôsteres</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {activeProject.carouselSlides.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Lâminas</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {activeProject.catalogEntries.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Catálogo</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {juliaData.campaigns.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Calendário</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
                  <div className="font-bold text-[#181512]">
                    Síntese Diária ({latestReport.date}):
                  </div>
                  <p className="text-[#292524] leading-relaxed">
                    {latestReport.summaryText}
                  </p>
                  {latestReport.highlights.length > 0 && (
                    <ul className="list-disc list-inside text-[#57534E] space-y-0.5">
                      {latestReport.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Câmera Direta do Celular para a Júlia */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#181512] text-[#F9F6F0] border border-[#3A322B] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2E2722]">
              <h3 className="text-sm font-bold">
                Câmera Direta — Júlia Marketing e Divulgação
              </h3>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="text-[#D6CFC5] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {cameraError ? (
                <div className="p-4 rounded-lg bg-amber-950/70 border border-amber-700 text-amber-100 text-xs">
                  {cameraError}
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-4/3">
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
                      setCameraFacing((prev) =>
                        prev === 'environment' ? 'user' : 'environment'
                      )
                    }
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 text-xs text-white flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Alternar Câmera</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#3E352D] text-xs text-[#D6CFC5]"
                >
                  Cancelar
                </button>
                {!cameraError && (
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturar e Enviar para a Júlia</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
