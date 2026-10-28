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
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  JuliaCampaignScheduleItem,
  JuliaDepartmentData,
  JuliaMarketingPhoto,
  JuliaPhotoTag,
  JuliaPieceFormat,
  JuliaSmartAdProject,
} from '../types';
import { ResilientImage } from './ResilientImage';

interface JuliaMarketingDepartmentProps {
  deviceFormFactor: string;
  stationName: string;
  workshopPhone: string;
  externalJuliaData?: JuliaDepartmentData | null;
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
    fullTitle: 'Etapa 1 — Fotos Direto do Celular e Seleção de Acervo',
    description:
      'Receba fotos diretamente da câmera ou galeria do celular sem depender de atendimento ativo e escolha as imagens da campanha.',
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
      'Elabore a frase principal que desperta atenção imediata no Instagram, Facebook e WhatsApp.',
  },
  {
    step: 5,
    shortTitle: '5. Texto Publicitário',
    fullTitle: 'Etapa 5 — Copywriting e Storytelling de Valorização',
    description:
      'Texto persuasivo destacando o design, o conforto e o acabamento de atelier da Castros Interiores.',
  },
  {
    step: 6,
    shortTitle: '6. Criar Anúncio',
    fullTitle: 'Etapa 6 — Criação de Anúncio (Feed & Stories)',
    description:
      'Versões prontas do anúncio para publicação no Feed e nos Stories / Status.',
  },
  {
    step: 7,
    shortTitle: '7. Criar Pôster',
    fullTitle: 'Etapa 7 — Criação de Pôster Promocional de Alto Padrão',
    description:
      'Configure e baixe o pôster visual com a foto do celular, selo editorial e contato da Castros Interiores.',
  },
  {
    step: 8,
    shortTitle: '8. Criar Carrossel',
    fullTitle: 'Etapa 8 — Criação de Carrossel Interativo (5 Lâminas)',
    description:
      'Estruture a sequência de 5 lâminas deslizáveis para retenção e engajamento nas redes sociais.',
  },
  {
    step: 9,
    shortTitle: '9. Criar Catálogo',
    fullTitle: 'Etapa 9 — Montagem do Catálogo Digital de Divulgação',
    description:
      'Organize a vitrine de estofados e ambientes com geração de Catálogo em PDF A4 para clientes.',
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
    fullTitle: 'Etapa 11 — Programação da Campanha e Calendário',
    description:
      'Agende o canal, a data e o horário de veiculação e adicione à agenda de campanhas.',
  },
  {
    step: 12,
    shortTitle: '12. Compartilhar',
    fullTitle: 'Etapa 12 — Revisão Final, Compartilhamento e Disparo',
    description:
      'Revise todas as peças criadas, compartilhe no WhatsApp ou redes sociais e atualize o Relatório Diário.',
  },
];

const PHOTO_TAGS: JuliaPhotoTag[] = [
  'Estofado Pronto',
  'Transformação Estética',
  'Ambiente Decorado',
  'Detalhe de Acabamento',
  'Vitrine / Catálogo',
];

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
          reader.onerror = () => reject(new Error('Falha ao ler foto do celular.'));
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxThumb = 360;
        let w = img.naturalWidth || 360;
        let h = img.naturalHeight || 270;
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
            thumbnailDataUrl: canvas.toDataURL('image/jpeg', 0.7),
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

  // Correction mode state for the "Corrigí" button
  const [correctionModeOpen, setCorrectionModeOpen] = useState(false);
  const [correctionInstruction, setCorrectionInstruction] = useState('');

  // Independent Mobile Photo Upload state
  const [photoTitleInput, setPhotoTitleInput] = useState('');
  const [photoCaptionInput, setPhotoCaptionInput] = useState('');
  const [photoTagInput, setPhotoTagInput] = useState<JuliaPhotoTag>('Estofado Pronto');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Camera Modal for direct cell phone capture
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Carousel viewer active slide
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  // New Catalog item form
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatLine, setNewCatLine] = useState('Coleção Castros Interiores');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatHighlight, setNewCatHighlight] = useState('Alto Padrão');

  // Voice & Text Chat state
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceSpeakEnabled, setVoiceSpeakEnabled] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Campaign scheduler form
  const [newCampTitle, setNewCampTitle] = useState('');
  const [newCampFormat, setNewCampFormat] = useState<JuliaPieceFormat>('Anúncio');
  const [newCampChannel, setNewCampChannel] = useState<
    JuliaCampaignScheduleItem['channel']
  >('Instagram Feed');
  const [newCampDate, setNewCampDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newCampTime, setNewCampTime] = useState('18:00');

  // Daily report state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync when external SSE data arrives
  useEffect(() => {
    if (externalJuliaData) {
      setJuliaData(externalJuliaData);
      setIsLoading(false);
    }
  }, [externalJuliaData]);

  // Initial load from server if not yet loaded
  useEffect(() => {
    let mounted = true;
    async function fetchJuliaStore() {
      try {
        const res = await fetch('/api/julia');
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.juliaData) {
            setJuliaData(data.juliaData);
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    if (!externalJuliaData) {
      fetchJuliaStore();
    }
    return () => {
      mounted = false;
    };
  }, [externalJuliaData]);

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
          'Câmera integrada indisponível neste navegador. Use o botão "Enviar Foto do Celular / Galeria" para selecionar direto do aparelho.'
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

  const showTemporaryNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4000);
  };

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

  const updateActiveProjectLocal = (updater: (proj: JuliaSmartAdProject) => JuliaSmartAdProject) => {
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
    return nextData;
  };

  // ============================================================================
  // OS 4 BOTÕES DAS 12 ETAPAS DO ANÚNCIO INTELIGENTE: VOLTÁ, AVANÇÁ, SALVÁ, CORRIGÍ
  // ============================================================================
  const handleStepVoltar = async () => {
    if (!juliaData || !activeProject) return;
    const prevStep = Math.max(1, currentStep - 1);
    const nextData = updateActiveProjectLocal((p) => ({
      ...p,
      currentStep: prevStep,
    }));
    if (nextData) {
      await handlePersistJuliaData(
        nextData,
        `Voltou para a Etapa ${prevStep} de 12`
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
        `Etapa ${currentStep} (${currentStepMeta.shortTitle}) salva com sucesso!`
      );
    }
  };

  const handleStepCorrigirWithAI = async (customInstruction?: string) => {
    if (!activeProject || isGeneratingAi) return;
    setIsGeneratingAi(true);
    setErrorNotice(null);
    try {
      // Save current draft first
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
            `Refine e aperfeiçoe a Etapa ${currentStep} (${currentStepMeta.fullTitle}) com linguagem publicitária de alto padrão para a Castros Interiores.`,
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
        `Etapa ${currentStep} corrigida e aperfeiçoada pela Júlia!`
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
  // RECEBIMENTO DIRETO DE FOTOS DO CELULAR (SEM DEPENDER DE ATENDIMENTO ATIVO)
  // ============================================================================
  const handleUploadMobilePhoto = async (fileOrDataUrl: File | string) => {
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
            photoTitleInput.trim() ||
            `Estofado Castros #${(juliaData?.photos.length || 0) + 1}`,
          caption:
            photoCaptionInput.trim() ||
            'Foto enviada diretamente pelo celular para Júlia Marketing e Divulgação.',
          tag: photoTagInput,
          dataUrl: fullDataUrl,
          thumbnailDataUrl,
          mimeType,
          sourceDevice: `${stationName} (${deviceFormFactor})`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.juliaData) {
        throw new Error(
          data.error || 'Falha ao enviar foto para a galeria da Júlia.'
        );
      }
      setJuliaData(data.juliaData);
      setPhotoTitleInput('');
      setPhotoCaptionInput('');
      showTemporaryNotice(
        'Foto recebida diretamente pela Júlia e sincronizada em todos os aparelhos!'
      );
    } catch (err) {
      setErrorNotice(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar foto do celular para a Júlia.'
      );
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
        showTemporaryNotice('Foto removida da galeria de marketing.');
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
      await handlePersistJuliaData(nextData);
    }
  };

  // ============================================================================
  // COMUNICAÇÃO POR VOZ E TEXTO COM HISTÓRICO PERSISTENTE
  // ============================================================================
  const handleSendChat = async (textToSend?: string, modality: 'voz' | 'texto' = 'texto') => {
    const finalMsg = (textToSend ?? chatInput).trim();
    if (!finalMsg || isSendingChat) return;
    if (!textToSend) setChatInput('');

    setIsSendingChat(true);
    setErrorNotice(null);
    try {
      const res = await fetch('/api/julia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalMsg,
          modality,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.juliaData) {
        throw new Error(data.error || 'Erro ao conversar com a Júlia.');
      }
      setJuliaData(data.juliaData);
      if (voiceSpeakEnabled && data.reply?.text) {
        speakTextInPortuguese(data.reply.text);
      }
    } catch (err) {
      setErrorNotice(
        err instanceof Error ? err.message : 'Falha na comunicação com a Júlia.'
      );
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleToggleVoiceListening = () => {
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
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorNotice(
        'Reconhecimento de voz não disponível neste navegador. Digite sua mensagem no campo de texto abaixo.'
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
          handleSendChat(transcript.trim(), 'voz');
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
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

  // ============================================================================
  // EXPORTAÇÃO DE PÔSTER (PNG) E CATÁLOGO / RELATÓRIO DIÁRIO (PDF A4) & COMPARTILHAMENTO
  // ============================================================================
  const primaryCampaignPhoto: JuliaMarketingPhoto | undefined =
    juliaData?.photos.find(
      (p) =>
        p.id === activeProject?.posterConfig.photoId ||
        activeProject?.selectedPhotoIds.includes(p.id)
    ) || juliaData?.photos[0];

  const handleDownloadPosterPng = async () => {
    if (!activeProject) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // Border frame
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Top badge
    ctx.fillStyle = accentHex;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      (activeProject.posterConfig.badgeText || 'CASTROS INTERIORES').toUpperCase(),
      canvas.width / 2,
      115
    );

    // Draw photo if available
    if (primaryCampaignPhoto) {
      const src =
        primaryCampaignPhoto.thumbnailDataUrl || primaryCampaignPhoto.imageUrl;
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 90, 160, 900, 640);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
      });
    } else {
      ctx.fillStyle = '#2E2722';
      ctx.fillRect(90, 160, 900, 640);
      ctx.fillStyle = '#D8C5A3';
      ctx.font = '28px serif';
      ctx.fillText(
        'CASTROS INTERIORES — ALTA ESTOFARIA',
        canvas.width / 2,
        480
      );
    }

    // Headline
    ctx.fillStyle = textHex;
    ctx.font = 'bold 52px serif';
    ctx.fillText(
      (activeProject.posterConfig.headline || 'CASTROS INTERIORES').slice(0, 38),
      canvas.width / 2,
      890
    );

    // Subheadline
    ctx.fillStyle = theme === 'editorial_creme' ? '#57534E' : '#D6CFC5';
    ctx.font = '32px sans-serif';
    ctx.fillText(
      (activeProject.posterConfig.subheadline || activeProject.headline).slice(0, 56),
      canvas.width / 2,
      960
    );

    // CTA Box
    ctx.fillStyle = accentHex;
    ctx.fillRect(190, 1050, 700, 90);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(
      (activeProject.posterConfig.ctaText || 'Fale pelo WhatsApp').slice(0, 42),
      canvas.width / 2,
      1107
    );

    // Contact line
    ctx.fillStyle = textHex;
    ctx.font = 'bold 32px monospace';
    ctx.fillText(
      `WhatsApp: ${activeProject.posterConfig.contactLine || workshopPhone}`,
      canvas.width / 2,
      1220
    );

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `poster-castros-interiores-${Date.now()}.png`;
    a.click();
    showTemporaryNotice('Pôster em alta resolução baixado com sucesso!');
  };

  const handleDownloadCatalogPdf = () => {
    if (!activeProject) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFillColor(24, 21, 18);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(249, 246, 240);
    doc.setFontSize(18);
    doc.text('CASTROS INTERIORES — CATÁLOGO DE DIVULGAÇÃO', 15, 18);
    doc.setFontSize(10);
    doc.text(
      `Departamento Júlia Marketing, Publicidade e Divulgação · WhatsApp: ${
        activeProject.whatsappDirectNumber || workshopPhone
      }`,
      15,
      28
    );

    let y = 50;
    doc.setTextColor(24, 21, 18);
    doc.setFontSize(14);
    doc.text(activeProject.headline || activeProject.name, 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(87, 83, 78);
    const copyLines = doc.splitTextToSize(activeProject.copyText || '', 180);
    doc.text(copyLines, 15, y);
    y += copyLines.length * 5 + 8;

    doc.setFontSize(12);
    doc.setTextColor(154, 113, 56);
    doc.text('VITRINE & COLEÇÕES EM DESTAQUE', 15, y);
    y += 8;

    activeProject.catalogEntries.forEach((entry, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 25;
      }
      doc.setDrawColor(229, 222, 201);
      doc.setFillColor(250, 248, 245);
      doc.roundedRect(15, y, 180, 34, 2, 2, 'FD');

      doc.setTextColor(24, 21, 18);
      doc.setFontSize(11);
      doc.text(`${idx + 1}. ${entry.title} — ${entry.collectionLine}`, 20, y + 9);

      doc.setTextColor(154, 113, 56);
      doc.setFontSize(9);
      doc.text(`Destaque: ${entry.highlightTag}`, 20, y + 16);

      doc.setTextColor(87, 83, 78);
      const descLines = doc.splitTextToSize(entry.styleDescription || '', 170);
      doc.text(descLines.slice(0, 2), 20, y + 23);

      y += 40;
    });

    doc.setFontSize(10);
    doc.setTextColor(24, 21, 18);
    doc.text(
      `Atendimento Exclusivo Castros Interiores: ${
        activeProject.whatsappDirectNumber || workshopPhone
      }`,
      15,
      282
    );

    doc.save(`catalogo-divulgacao-castros-interiores.pdf`);
    showTemporaryNotice('Catálogo de Divulgação em PDF A4 gerado com sucesso!');
  };

  const handleShareCampaign = async (customText?: string) => {
    if (!activeProject) return;
    const fullShareText =
      customText ||
      `*${activeProject.headline}*\n\n${activeProject.copyText}\n\n${activeProject.ctaButtonText}: ${activeProject.whatsappDirectNumber}\n\n${activeProject.hashtags}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: activeProject.headline || 'Castros Interiores',
          text: fullShareText,
        });
        showTemporaryNotice('Compartilhado com sucesso!');
        return;
      } catch {
        // fallback to WhatsApp link
      }
    }

    const encoded = encodeURIComponent(fullShareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
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

  const handleAddScheduledCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juliaData || !activeProject) return;
    const title =
      newCampTitle.trim() || `${activeProject.pieceFormat}: ${activeProject.headline.slice(0, 40)}`;
    const newItem: JuliaCampaignScheduleItem = {
      id: `jcamp-${Date.now()}`,
      title,
      format: newCampFormat,
      channel: newCampChannel,
      scheduledDate: newCampDate,
      scheduledTime: newCampTime,
      status: 'Programada',
      captionPreview: activeProject.copyText.slice(0, 140),
      photoId: primaryCampaignPhoto?.id,
      createdAt: new Date().toISOString(),
    };
    const nextData: JuliaDepartmentData = {
      ...juliaData,
      campaigns: [newItem, ...juliaData.campaigns],
    };
    setNewCampTitle('');
    await handlePersistJuliaData(
      nextData,
      'Campanha adicionada à programação da Júlia!'
    );
  };

  const handleToggleCampaignStatus = async (campId: string) => {
    if (!juliaData) return;
    const nextCampaigns = juliaData.campaigns.map((c) => {
      if (c.id !== campId) return c;
      const nextStatus: JuliaCampaignScheduleItem['status'] =
        c.status === 'Programada'
          ? 'Publicada'
          : c.status === 'Publicada'
          ? 'Concluída'
          : 'Programada';
      return { ...c, status: nextStatus };
    });
    await handlePersistJuliaData({
      ...juliaData,
      campaigns: nextCampaigns,
    });
  };

  const handleDeleteCampaign = async (campId: string) => {
    if (!juliaData) return;
    await handlePersistJuliaData({
      ...juliaData,
      campaigns: juliaData.campaigns.filter((c) => c.id !== campId),
    });
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

  return (
    <div className="space-y-6">
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
            Receba fotos direto do celular sem depender de atendimento ativo, percorra as 12 etapas do Anúncio Inteligente (Avançá, Voltá, Salvá e Corrigí), crie Anúncios, Pôsteres, Carrosséis e Catálogos, converse por Voz e Texto com histórico, programe campanhas e emita o Relatório Diário.
          </p>
        </div>

        {/* Botões Rápidos de Recebimento de Foto Direto do Celular */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
                : 'Enviar Foto do Celular / Galeria'}
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
          BLOCO 1: AS 12 ETAPAS DO ANÚNCIO INTELIGENTE (VOLTÁ, AVANÇÁ, SALVÁ, CORRIGÍ)
         ==================================================================== */}
      <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#EFECE6]">
          <div>
            <div className="text-xs font-mono font-semibold text-[#9A7138]">
              ANÚNCIO INTELIGENTE · ETAPA {currentStep} DE 12
            </div>
            <h3 className="text-lg font-serif-display font-bold text-[#181512]">
              {currentStepMeta.fullTitle}
            </h3>
            <p className="text-xs text-[#57534E]">{currentStepMeta.description}</p>
          </div>

          {/* OS 4 BOTÕES OBRIGATÓRIOS: VOLTÁ, AVANÇÁ, SALVÁ, CORRIGÍ */}
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
                Corrigir / Aperfeiçoar Etapa {currentStep} ({currentStepMeta.shortTitle}) com a Júlia:
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
                placeholder="Informe o que deseja corrigir ou melhorar nesta etapa (ou clique direto em Corrigir com Júlia IA)..."
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
                    : 'Aplicar Correção Inteligente'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Grade Navegável das 12 Etapas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {TWELVE_STEPS_META.map((item) => {
            const isActive = item.step === currentStep;
            const isSaved = Boolean(activeProject.stepStates?.[item.step]?.saved);
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  updateActiveProjectLocal((p) => ({
                    ...p,
                    currentStep: item.step,
                  }));
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
          {/* ETAPA 1: FOTOS DIRETO DO CELULAR (SEM DEPENDER DE ATENDIMENTO ATIVO) */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#E5DEC9]">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Título da Foto / Estofado
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
                    Destaque Estético (Opcional)
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
                        : 'Receber Foto do Celular'}
                    </span>
                  </button>
                </div>
              </div>

              {juliaData.photos.length === 0 ? (
                <div className="p-8 rounded-xl bg-white border border-[#E5DEC9] text-center space-y-3">
                  <ImageIcon className="w-8 h-8 text-[#9A7138] mx-auto" />
                  <h4 className="text-sm font-bold text-[#181512]">
                    Galeria Independente da Júlia Pronta para Receber Fotos do Celular
                  </h4>
                  <p className="text-xs text-[#6B6257] max-w-md mx-auto">
                    Você não precisa ter nenhum atendimento ativo. Clique em <strong>Tirar Foto pelo Celular</strong> ou <strong>Enviar Foto do Celular / Galeria</strong> para mandar imagens direto para a Júlia criar anúncios, pôsteres, carrosséis e catálogos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {juliaData.photos.map((photo) => {
                    const isSelected = activeProject.selectedPhotoIds.includes(
                      photo.id
                    );
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
                          <div className="h-40 bg-[#EDE7DC] relative">
                            <ResilientImage
                              src={photo.imageUrl || photo.thumbnailDataUrl || ''}
                              alt={photo.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3 space-y-1 text-xs">
                            <div className="text-[11px] font-semibold text-[#9A7138]">
                              {photo.tag} · {photo.sourceDevice || 'Celular'}
                            </div>
                            <div className="font-bold text-[#181512]">
                              {photo.title}
                            </div>
                            <p className="text-[#57534E] line-clamp-2">
                              {photo.caption}
                            </p>
                          </div>
                        </div>
                        <div className="p-3 pt-0 flex items-center justify-between gap-2">
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
                            {isSelected ? 'Selecionada na Campanha' : 'Usar na Campanha'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJuliaPhoto(photo.id)}
                            className="p-1.5 text-red-700 hover:text-red-900"
                            title="Remover foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ETAPA 2: OBJETIVO DA CAMPANHA E PÚBLICO-ALVO */}
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
                    updateActiveProjectLocal((p) => ({ ...p, name: e.target.value }))
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

          {/* ETAPA 3: FORMATO PRINCIPAL DA PEÇA PUBLICITÁRIA */}
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
                    'Arte vertical impactante com foto do estofado, tipografia editorial e contato.',
                  ],
                  [
                    'Carrossel',
                    'Carrossel Interativo (5 Lâminas)',
                    'Sequência narrativa deslizável para valorizar cada detalhe de estilo e conforto.',
                  ],
                  [
                    'Catálogo',
                    'Catálogo Digital de Portfólio',
                    'Vitrine organizada de coleções e peças prontas com exportação em PDF A4.',
                  ],
                ] as const
              ).map(([fmt, title, desc]) => {
                const selected = activeProject.pieceFormat === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() =>
                      updateActiveProjectLocal((p) => ({
                        ...p,
                        pieceFormat: fmt,
                      }))
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

          {/* ETAPA 4: TÍTULO DE IMPACTO (HEADLINE) */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#181512]">
                Título de Impacto (Headline Principal do Anúncio)
              </label>
              <input
                type="text"
                value={activeProject.headline}
                onChange={(e) =>
                  updateActiveProjectLocal((p) => ({
                    ...p,
                    headline: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2.5 text-sm font-semibold"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleStepCorrigirWithAI(
                      'Crie um título ainda mais sofisticado, magnético e focado em alto padrão para a Castros Interiores.'
                    )
                  }
                  disabled={isGeneratingAi}
                  className="px-3.5 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar / Aperfeiçoar Título com a Júlia</span>
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 5: TEXTO PUBLICITÁRIO E STORYTELLING (COPYWRITING) */}
          {currentStep === 5 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#181512]">
                  Texto Publicitário Principal (Legenda para Redes Sociais e WhatsApp)
                </label>
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
                      <span>Copiar Legenda</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={5}
                value={activeProject.copyText}
                onChange={(e) =>
                  updateActiveProjectLocal((p) => ({
                    ...p,
                    copyText: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-[#D6CFC5] bg-white p-3 text-xs leading-relaxed"
              />
            </div>
          )}

          {/* ETAPA 6: CRIAÇÃO DE ANÚNCIO (FEED & STORIES) */}
          {currentStep === 6 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#181512]">
                    Versão Anúncio para Feed (Instagram / Facebook)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText('ad-feed', activeProject.adFeedText)
                    }
                    className="text-xs font-semibold text-[#9A7138] underline"
                  >
                    {copiedKey === 'ad-feed' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={activeProject.adFeedText}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      adFeedText: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs"
                />
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#181512]">
                    Versão Anúncio Curto (Stories & Status do WhatsApp)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText('ad-stories', activeProject.adStoriesText)
                    }
                    className="text-xs font-semibold text-[#9A7138] underline"
                  >
                    {copiedKey === 'ad-stories' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={activeProject.adStoriesText}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      adStoriesText: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs"
                />
              </div>
            </div>
          )}

          {/* ETAPA 7: CRIAÇÃO DE PÔSTER PROMOCIONAL */}
          {currentStep === 7 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-6 space-y-3 bg-white p-4 rounded-xl border border-[#E5DEC9]">
                <h4 className="text-xs font-bold text-[#181512]">
                  Configuração Visual do Pôster
                </h4>
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
                    Título do Pôster
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
                    className="w-full rounded-lg border border-[#D6CFC5] px-3 py-1.5 text-xs"
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
                            theme: e.target.value as JuliaSmartAdProject['posterConfig']['theme'],
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
                      Foto do Celular no Pôster
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
                  <div className="h-48 rounded-lg overflow-hidden bg-[#2E2722] border border-[#9A7138]/40 flex items-center justify-center">
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
                        Envie uma foto do celular para exibir no pôster
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-serif-display font-bold">
                    {activeProject.posterConfig.headline}
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

          {/* ETAPA 8: CRIAÇÃO DE CARROSSEL (5 LÂMINAS) */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#181512]">
                  Carrossel Interativo — Lâmina {activeCarouselIndex + 1} de{' '}
                  {activeProject.carouselSlides.length}
                </span>
                <div className="flex items-center gap-2">
                  {activeProject.carouselSlides.map((sl, idx) => (
                    <button
                      key={sl.slideNumber}
                      type="button"
                      onClick={() => setActiveCarouselIndex(idx)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        idx === activeCarouselIndex
                          ? 'bg-[#181512] text-white'
                          : 'bg-white border border-[#D6CFC5] text-[#181512]'
                      }`}
                    >
                      Lâmina {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {activeProject.carouselSlides[activeCarouselIndex] && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-[#E5DEC9]">
                  <div className="md:col-span-7 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#181512] mb-1">
                        Título da Lâmina {activeCarouselIndex + 1}
                      </label>
                      <input
                        type="text"
                        value={
                          activeProject.carouselSlides[activeCarouselIndex].title
                        }
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
                        Texto da Lâmina {activeCarouselIndex + 1}
                      </label>
                      <textarea
                        rows={3}
                        value={
                          activeProject.carouselSlides[activeCarouselIndex].body
                        }
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
                  </div>

                  {/* Cartão Visual da Lâmina */}
                  <div className="md:col-span-5 rounded-xl bg-[#181512] text-[#F9F6F0] p-5 flex flex-col justify-between border border-[#9A7138]">
                    <div className="text-[11px] font-mono text-[#D8C5A3]">
                      CASTROS INTERIORES · LÂMINA {activeCarouselIndex + 1}/
                      {activeProject.carouselSlides.length}
                    </div>
                    <div className="space-y-2 my-4">
                      <h4 className="text-base font-serif-display font-bold text-white">
                        {activeProject.carouselSlides[activeCarouselIndex].title}
                      </h4>
                      <p className="text-xs text-[#D6CFC5] leading-relaxed">
                        {activeProject.carouselSlides[activeCarouselIndex].body}
                      </p>
                    </div>
                    <div className="text-[11px] text-[#9A7138] font-semibold">
                      Deslize para o lado →
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 9: MONTAGEM DO CATÁLOGO DE DIVULGAÇÃO */}
          {currentStep === 9 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-[#181512]">
                  Itens do Catálogo Digital de Divulgação ({activeProject.catalogEntries.length})
                </h4>
                <button
                  type="button"
                  onClick={handleDownloadCatalogPdf}
                  className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Catálogo Digital (PDF A4)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeProject.catalogEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold text-[#9A7138]">
                          {entry.collectionLine} · {entry.highlightTag}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateActiveProjectLocal((p) => ({
                              ...p,
                              catalogEntries: p.catalogEntries.filter(
                                (c) => c.id !== entry.id
                              ),
                            }))
                          }
                          className="text-red-700 hover:text-red-900"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h5 className="font-bold text-sm text-[#181512]">
                        {entry.title}
                      </h5>
                      <p className="text-[#57534E]">{entry.styleDescription}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar item ao Catálogo */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <input
                  type="text"
                  value={newCatTitle}
                  onChange={(e) => setNewCatTitle(e.target.value)}
                  placeholder="Título da peça no catálogo..."
                  className="rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={newCatLine}
                  onChange={(e) => setNewCatLine(e.target.value)}
                  placeholder="Linha / Coleção..."
                  className="rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Descrição de estilo e conforto..."
                  className="rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCatTitle.trim()) return;
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      catalogEntries: [
                        ...p.catalogEntries,
                        {
                          id: `cat-${Date.now()}`,
                          title: newCatTitle.trim(),
                          collectionLine: newCatLine.trim() || 'Coleção Castros',
                          styleDescription:
                            newCatDesc.trim() ||
                            'Acabamento artesanal de alto padrão.',
                          highlightTag: newCatHighlight,
                          photoId: primaryCampaignPhoto?.id,
                        },
                      ],
                    }));
                    setNewCatTitle('');
                    setNewCatDesc('');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#181512] text-white text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar ao Catálogo</span>
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 10: HASHTAGS E CHAMADA PARA AÇÃO (CTA) */}
          {currentStep === 10 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Chamada para Ação (CTA)
                </label>
                <input
                  type="text"
                  value={activeProject.ctaButtonText}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      ctaButtonText: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      whatsappDirectNumber: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      hashtags: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white p-3 text-xs"
                />
              </div>
            </div>
          )}

          {/* ETAPA 11: PROGRAMAÇÃO DE CAMPANHAS */}
          {currentStep === 11 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#181512] mb-1">
                  Canal Principal de Publicação
                </label>
                <select
                  value={activeProject.scheduleChannel}
                  onChange={(e) =>
                    updateActiveProjectLocal((p) => ({
                      ...p,
                      scheduleChannel: e.target.value as JuliaSmartAdProject['scheduleChannel'],
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
                  Data Programada
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
                  Horário Programado
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
          )}

          {/* ETAPA 12: REVISÃO FINAL E COMPARTILHAMENTO DIRETO */}
          {currentStep === 12 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-2 text-xs">
                <div className="font-bold text-sm text-[#181512]">
                  Resumo Final do Anúncio Inteligente (12 Etapas Concluídas)
                </div>
                <p className="text-[#181512] font-semibold">
                  {activeProject.headline}
                </p>
                <p className="text-[#57534E] whitespace-pre-line">
                  {activeProject.copyText}
                </p>
                <p className="text-[#9A7138] font-mono">
                  {activeProject.hashtags}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleShareCampaign()}
                  className="px-4 py-2.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar Agora (WhatsApp / Celular)</span>
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
                  onClick={handleDownloadCatalogPdf}
                  className="px-4 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-[#D8C5A3]" />
                  <span>Baixar Catálogo (PDF A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      'full-step12',
                      `${activeProject.headline}\n\n${activeProject.copyText}\n\n${activeProject.ctaButtonText}: ${activeProject.whatsappDirectNumber}\n\n${activeProject.hashtags}`
                    )
                  }
                  className="px-4 py-2.5 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
                >
                  {copiedKey === 'full-step12' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>Anúncio Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Texto Completo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          BLOCO 2: ESTÚDIO RÁPIDO DE ANÚNCIOS, PÔSTERES, CARROSSÉIS, CATÁLOGOS E COMPARTILHAMENTO
         ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <Megaphone className="w-4 h-4 text-[#9A7138]" />
              <span>Anúncios</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Feed, Stories e Status com chamada persuasiva pronta.
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
              Pôster de alto padrão com foto do celular e download PNG.
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
              <span>Carrosséis</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Sequência de {activeProject.carouselSlides.length} lâminas interativas.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateActiveProjectLocal((p) => ({ ...p, currentStep: 8 }))
            }
            className="w-full py-1.5 px-3 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#D6CFC5] text-xs font-semibold text-[#181512]"
          >
            Abrir Carrossel (Etapa 8)
          </button>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <BookOpen className="w-4 h-4 text-[#9A7138]" />
              <span>Catálogos</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Vitrine de coleções com exportação em PDF A4.
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
              title="Baixar Catálogo PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs text-[#181512]">
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>Compartilhamento</span>
            </div>
            <p className="text-[11px] text-[#57534E]">
              Envio imediato para WhatsApp, Instagram e celular.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleShareCampaign()}
            className="w-full py-1.5 px-3 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar Agora</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          BLOCO 3: COMUNICAÇÃO POR VOZ E TEXTO COM HISTÓRICO + PROGRAMAÇÃO DE CAMPANHAS + RELATÓRIO DIÁRIO
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggleVoiceListening}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 ${
                  isListeningVoice
                    ? 'bg-red-700 text-white'
                    : 'bg-[#9A7138] hover:bg-[#845E2B] text-white'
                }`}
              >
                {isListeningVoice ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Parar Voz</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Falar por Voz</span>
                  </>
                )}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder="Digite ou fale com a Júlia..."
                className="flex-1 rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />

              <button
                type="button"
                onClick={() => handleSendChat()}
                disabled={isSendingChat || !chatInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-[#D8C5A3]" />
                <span>{isSendingChat ? '...' : 'Enviar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (7 cols): PROGRAMAÇÃO DE CAMPANHAS + RELATÓRIO DIÁRIO */}
        <div className="lg:col-span-7 space-y-6">
          {/* PROGRAMAÇÃO DE CAMPANHAS */}
          <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6]">
              <div>
                <h3 className="text-base font-serif-display font-bold text-[#181512] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#9A7138]" />
                  <span>Programação de Campanhas ({juliaData.campaigns.length})</span>
                </h3>
                <p className="text-[11px] text-[#6B6257]">
                  Calendário de publicações de Anúncios, Pôsteres, Carrosséis e Catálogos.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAddScheduledCampaign}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#FAF8F5] p-3 rounded-xl border border-[#E5DEC9]"
            >
              <input
                type="text"
                value={newCampTitle}
                onChange={(e) => setNewCampTitle(e.target.value)}
                placeholder="Título da campanha programada..."
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
                className="sm:col-span-3 rounded-lg border border-[#D6CFC5] bg-white px-2 py-1.5 text-xs"
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
              <button
                type="submit"
                className="sm:col-span-1 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center justify-center py-1.5"
                title="Programar Campanha"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {juliaData.campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#181512]">{camp.title}</div>
                    <div className="text-[#6B6257] tabular-nums">
                      {camp.format} · {camp.channel} · {camp.scheduledDate} às{' '}
                      {camp.scheduledTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCampaignStatus(camp.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                        camp.status === 'Publicada' || camp.status === 'Concluída'
                          ? 'bg-emerald-800 text-white'
                          : 'bg-[#EDE7DC] text-[#181512]'
                      }`}
                    >
                      {camp.status}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-1 text-red-700 hover:text-red-900"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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
                  Balanço diário de fotos recebidas do celular, peças criadas e recomendações.
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
                    <div className="text-[10px] text-[#6B6257]">Fotos Celular</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9]">
                    <div className="font-bold text-sm text-[#181512] tabular-nums">
                      {juliaData.projects.length}
                    </div>
                    <div className="text-[10px] text-[#6B6257]">Anúncios</div>
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
                    <div className="text-[10px] text-[#6B6257]">Programadas</div>
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
