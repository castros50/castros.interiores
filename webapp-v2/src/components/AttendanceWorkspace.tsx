import React, { useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Check,
  AlertTriangle,
  RefreshCw,
  FileText,
  Download,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Eye,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendancePhoto,
  PhotoCategory,
  PHOTO_CATEGORIES,
  FurnitureArea,
  FURNITURE_AREAS,
  InformationOrigin,
  ApparentSeverity,
  DefectFinding,
  ReuseEvaluationItem,
  ReuseClassification,
  REUSE_COMPONENTS,
  ProposalTier,
  ReformProposal,
  BudgetLineCategory,
  BudgetLineItem,
  OpinionConclusion,
  MaterialCatalogItem,
  WorkshopSettings,
  HiddenDamageAddendum,
} from '../types';
import {
  calculateBudgetSummary,
  calculateLineItemTotal,
  formatCurrencyBRL,
  formatMissingText,
} from '../utils/calculations';
import { CameraModal } from './CameraModal';
import { ResilientImage, PhotoLightboxModal, ZoomIn } from './ResilientImage';

interface AttendanceWorkspaceProps {
  attendance: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  geminiConfigured: boolean;
  isSaving: boolean;
  lastSavedSuccessAt: string | null;
  saveError: string | null;
  isAnalyzingDefects: boolean;
  isAnalyzingReuse: boolean;
  aiError: string | null;
  onNewAttendance: (orderType?: 'Reforma' | 'Fabricação') => void;
  onUpdateDraft: (updated: AttendanceRecord, markStaleReason?: string) => void;
  onPersistAttendance: (recordToSave: AttendanceRecord, logAction?: string, logStage?: string) => Promise<boolean>;
  onUploadPhotoFile: (
    fileOrDataUrl: File | string,
    category: PhotoCategory,
    caption: string,
    furnitureLabel: string,
    existingFailedPhotoId?: string
  ) => Promise<void>;
  onRunDefectsAnalysis: () => Promise<void>;
  onRunReuseAnalysis: () => Promise<void>;
  onGenerateInternalPdf: () => Promise<void>;
  onGenerateClientPdf: () => Promise<void>;
}

const WORKFLOW_STEPS = [
  { id: 1, label: '01. Cadastro' },
  { id: 2, label: '02. Fotos' },
  { id: 3, label: '03. Análise de Defeitos' },
  { id: 4, label: '04. Revisão do Responsável' },
  { id: 5, label: '05. Reaproveitamento' },
  { id: 6, label: '06. Proposta e Orçamento' },
  { id: 7, label: '07. Parecer e Danos Ocultos' },
  { id: 8, label: '08. Relatórios PDF A4' },
];

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Rascunho',
  'Aguardando fotos',
  'Pronto para análise',
  'Análise preliminar concluída',
  'Aguardando inspeção',
  'Revisado pelo responsável',
  'Concluído',
];

const ORIGINS: InformationOrigin[] = [
  'Observado na foto',
  'Relatado pelo cliente',
  'Suspeita a confirmar',
  'Confirmado pela oficina',
  'Não avaliável',
];

const SEVERITIES: ApparentSeverity[] = ['Leve', 'Moderada', 'Grave', 'Não avaliável'];

const REUSE_CLASSIFICATIONS: ReuseClassification[] = [
  'Candidato a reaproveitamento, sujeito à inspeção',
  'Recuperável com reparo, sujeito à inspeção',
  'Substituição indicada',
  'Decisão pendente',
];

const OPINION_CONCLUSIONS: OpinionConclusion[] = [
  'Reforma potencialmente vantajosa',
  'Reforma viável com ressalvas',
  'Reforma aparentemente pouco vantajosa',
  'Dados insuficientes para concluir',
];

export const AttendanceWorkspace: React.FC<AttendanceWorkspaceProps> = ({
  attendance,
  materialsCatalog,
  geminiConfigured,
  isSaving,
  lastSavedSuccessAt,
  saveError,
  isAnalyzingDefects,
  isAnalyzingReuse,
  aiError,
  onNewAttendance,
  onUpdateDraft,
  onPersistAttendance,
  onUploadPhotoFile,
  onRunDefectsAnalysis,
  onRunReuseAnalysis,
  onGenerateInternalPdf,
  onGenerateClientPdf,
}) => {
  const [showAllStepsMode, setShowAllStepsMode] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<PhotoCategory>('Frente');
  const [photoCaptionInput, setPhotoCaptionInput] = useState('');
  const [photoFurnitureInput, setPhotoFurnitureInput] = useState(
    attendance.furnitureType || 'Sofá'
  );
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<AttendancePhoto | null>(null);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(
    materialsCatalog[0]?.id || ''
  );

  // Hidden damage form state
  const [newHiddenArea, setNewHiddenArea] = useState<FurnitureArea>('Estrutura');
  const [newHiddenDesc, setNewHiddenDesc] = useState('');
  const [newHiddenServices, setNewHiddenServices] = useState('');
  const [newHiddenPriceReais, setNewHiddenPriceReais] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  const activeStep = attendance.currentStep || 1;
  const budgetSummary = calculateBudgetSummary(attendance.budget);

  const setStep = (step: number) => {
    const clamped = Math.max(1, Math.min(8, step));
    onUpdateDraft({
      ...attendance,
      currentStep: clamped,
    });
  };

  const handleFieldChange = <K extends keyof AttendanceRecord>(
    field: K,
    value: AttendanceRecord[K],
    invalidatesAnalysis = false
  ) => {
    const hasExistingAnalysis =
      attendance.defectFindings.length > 0 || attendance.reviewCompleted;
    const shouldMarkStale = invalidatesAnalysis && hasExistingAnalysis;

    const updated: AttendanceRecord = {
      ...attendance,
      [field]: value,
      reviewCompleted: shouldMarkStale ? false : attendance.reviewCompleted,
      status:
        shouldMarkStale && attendance.status === 'Revisado pelo responsável'
          ? 'Análise preliminar concluída'
          : attendance.status,
      staleness: shouldMarkStale
        ? {
            defectsAnalysisNeedsReview: true,
            responsibleReviewNeedsUpdate: true,
            reuseNeedsReview: true,
            proposalNeedsReview: true,
            opinionNeedsReview: true,
            staleReason:
              'Dados do atendimento foram alterados após a análise/revisão anterior. Revise as etapas dependentes.',
          }
        : attendance.staleness,
    };

    onUpdateDraft(
      updated,
      shouldMarkStale ? 'Alteração nos dados cadastrais do móvel/relato' : undefined
    );
  };

  const handleMultipleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray: File[] = Array.from(files);
    e.target.value = '';

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const cap =
        photoCaptionInput.trim() ||
        `${selectedPhotoCategory} — ${file.name.replace(/\.[^/.]+$/, '')}`;
      await onUploadPhotoFile(
        file,
        selectedPhotoCategory,
        cap,
        photoFurnitureInput.trim() || attendance.furnitureType || 'Móvel'
      );
    }
    setPhotoCaptionInput('');
  };

  const handleUpdatePhotoMeta = (
    photoId: string,
    updates: Partial<Pick<AttendancePhoto, 'category' | 'caption' | 'furnitureLabel'>>
  ) => {
    const updatedPhotos = attendance.photos.map((p) =>
      p.id === photoId ? { ...p, ...updates } : p
    );
    handleFieldChange('photos', updatedPhotos, true);
  };

  const handleDeletePhoto = (photoId: string) => {
    const updatedPhotos = attendance.photos.filter((p) => p.id !== photoId);
    handleFieldChange('photos', updatedPhotos, true);
  };

  const handleFindingStatusChange = (
    findingId: string,
    newStatus: DefectFinding['reviewStatus']
  ) => {
    const now = new Date().toISOString();
    const updatedFindings = attendance.defectFindings.map((f) =>
      f.id === findingId ? { ...f, reviewStatus: newStatus, updatedAt: now } : f
    );
    const logEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      actor: attendance.reviewerName || 'Responsável Técnico',
      stage: 'Revisão do responsável',
      action: `Achado marcado como ${newStatus}`,
      details: `Item ID ${findingId} atualizado para ${newStatus}.`,
    };
    onUpdateDraft({
      ...attendance,
      defectFindings: updatedFindings,
      auditHistory: [logEntry, ...attendance.auditHistory],
    });
  };

  const handleFindingEdit = (findingId: string, updates: Partial<DefectFinding>) => {
    const now = new Date().toISOString();
    const updatedFindings = attendance.defectFindings.map((f) =>
      f.id === findingId
        ? { ...f, ...updates, reviewStatus: 'Editado' as const, updatedAt: now }
        : f
    );
    onUpdateDraft({
      ...attendance,
      defectFindings: updatedFindings,
    });
  };

  const handleAddManualFinding = () => {
    const newFinding: DefectFinding = {
      id: `df-manual-${Date.now()}`,
      area: 'Estrutura',
      defectOrSuspicion: 'Nova observação técnica registrada manualmente',
      evidenceAndPhoto: 'Inspeção visual / Relato',
      origin: 'Confirmado pela oficina',
      severity: 'Moderada',
      suggestedService: 'Definir reparo',
      requiredVerification: 'Verificado pelo responsável',
      reviewStatus: 'Confirmado',
      updatedAt: new Date().toISOString(),
    };
    onUpdateDraft({
      ...attendance,
      defectFindings: [...attendance.defectFindings, newFinding],
    });
    setEditingFindingId(newFinding.id);
  };

  const handleCompleteResponsibleReview = async () => {
    if (!attendance.reviewerName.trim()) {
      return;
    }
    const now = new Date().toISOString();
    const confirmedFindings = attendance.defectFindings.map((f) =>
      f.reviewStatus === 'Preliminar' ? { ...f, reviewStatus: 'Confirmado' as const } : f
    );
    const updated: AttendanceRecord = {
      ...attendance,
      defectFindings: confirmedFindings,
      reviewCompleted: true,
      reviewedAt: now,
      status: 'Revisado pelo responsável',
      staleness: {
        ...attendance.staleness,
        defectsAnalysisNeedsReview: false,
        responsibleReviewNeedsUpdate: false,
      },
      auditHistory: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: attendance.reviewerName,
          stage: 'Revisão do responsável',
          action: 'Análise revisada e validada pelo responsável',
          details: `Revisão técnica concluída por ${attendance.reviewerName}.`,
        },
        ...attendance.auditHistory,
      ],
    };
    await onPersistAttendance(updated, 'Revisão técnica homologada', 'Revisão do responsável');
  };

  const handleReuseItemChange = (
    id: string,
    updates: Partial<ReuseEvaluationItem>
  ) => {
    const updatedItems = attendance.reuseItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdateDraft({
      ...attendance,
      reuseItems: updatedItems,
    });
  };

  const handleInitializeDefaultReuseIfEmpty = () => {
    if (attendance.reuseItems.length > 0) return;
    const items: ReuseEvaluationItem[] = REUSE_COMPONENTS.map((comp, idx) => ({
      id: `ru-manual-${Date.now()}-${idx}`,
      component: comp,
      condition:
        comp === 'Espumas'
          ? 'Espuma coberta pelo revestimento — inspeção presencial na oficina necessária.'
          : 'Aguardando desmontagem na oficina.',
      classification: 'Decisão pendente',
      requiredRecovery: 'Avaliar após abertura na bancada.',
      approvalCriteria: 'Integridade estrutural e ausência de desgaste severo.',
      expectedCostEffect: 'Impacto no custo depende de inspeção presencial.',
    }));
    onUpdateDraft({
      ...attendance,
      reuseItems: items,
    });
  };

  const handleInitializeDefaultProposalsIfEmpty = () => {
    if (attendance.proposals.length > 0) return;
    const defaultProposals: ReformProposal[] = [
      {
        tier: 'ESSENCIAL',
        title: 'Reparos necessários, preservando componentes aprovados',
        justifiable: true,
        justificationNote: 'Justificável caso a estrutura interna e parte das espumas sejam aprovadas na oficina.',
        services: ['Substituição do revestimento danificado', 'Reforço de costuras e percintas afetadas'],
        materialsToKeep: ['Estrutura de madeira (sujeita à inspeção)', 'Pés originais'],
        materialsToRecover: ['Almofadas de encosto com complementação de fibra'],
        materialsToReplace: ['Tecido externo', 'Percintas sem tensão'],
        pendingItems: ['Inspeção interna após abertura', 'Plano de corte do tecido'],
        benefitsAndLimitations:
          'Reduz uso de novos insumos mantendo componentes íntegros, mas depende da aprovação da espuma atual na bancada.',
      },
      {
        tier: 'RECOMENDADA',
        title: 'Reparos e melhorias justificadas de conforto e acabamento',
        justifiable: true,
        justificationNote: 'Recomendada pelo desgaste observado no assento e no revestimento.',
        services: [
          'Troca integral do revestimento com costura reforçada',
          'Substituição das espumas de assento por D33 com manta acrílica',
          'Substituição completa do percintamento elástico',
        ],
        materialsToKeep: ['Chassi de madeira maciça (após inspeção)', 'Pés de madeira'],
        materialsToRecover: ['Enchimento de encosto e acabamento de base'],
        materialsToReplace: ['Revestimento completo', 'Espumas dos assentos', 'Percintas elásticas', 'Forro inferior TNT'],
        pendingItems: ['Levantamento da metragem exata no plano de corte'],
        benefitsAndLimitations:
          'Restabelece a ergonomia e durabilidade do assento com acabamento renovado.',
      },
      {
        tier: 'COMPLETA',
        title: 'Renovação ampla, mantendo componentes tecnicamente aprovados',
        justifiable: true,
        justificationNote: 'Indicada para renovação total de espumas, revestimento e revisão estrutural completa.',
        services: [
          'Revisão de marcenaria, esquadro e imunização preventiva',
          'Substituição integral de espumas (assento, encosto e braços)',
          'Novo percintamento e revestimento premium impermeabilizado',
        ],
        materialsToKeep: ['Apenas madeiramento estrutural aprovado na bancada'],
        materialsToRecover: ['Pés maciços com polimento e verniz'],
        materialsToReplace: [
          'Todas as espumas e mantas',
          'Todo o percintamento',
          'Revestimento completo e zíperes',
          'Forro inferior',
        ],
        pendingItems: ['Aprovação do tecido escolhido pelo cliente'],
        benefitsAndLimitations:
          'Entrega padrão equivalente a peça nova sobre o chassi original, exigindo maior investimento em insumos.',
      },
    ];
    onUpdateDraft({
      ...attendance,
      proposals: defaultProposals,
    });
  };

  const handleAddCatalogItemToBudget = () => {
    const catItem = materialsCatalog.find((m) => m.id === selectedCatalogId);
    if (!catItem) return;
    const isFabric =
      catItem.name.toLowerCase().includes('tecido') ||
      catItem.name.toLowerCase().includes('linho') ||
      catItem.name.toLowerCase().includes('couro') ||
      catItem.name.toLowerCase().includes('veludo');

    const newItem: BudgetLineItem = {
      id: `bi-${Date.now()}`,
      catalogItemId: catItem.id,
      category: catItem.category,
      name: catItem.name,
      unit: catItem.unit,
      quantity: isFabric && !attendance.budget.cuttingPlanConfirmed ? null : 1,
      quantityStatus:
        isFabric && !attendance.budget.cuttingPlanConfirmed
          ? 'A levantar (requer medidas e plano de corte)'
          : 'Definida',
      unitCostCents: catItem.unitCostCents,
    };

    onUpdateDraft({
      ...attendance,
      budget: {
        ...attendance.budget,
        items: [...attendance.budget.items, newItem],
      },
    });
  };

  const handleUpdateBudgetLine = (id: string, updates: Partial<BudgetLineItem>) => {
    const updatedItems = attendance.budget.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    onUpdateDraft({
      ...attendance,
      budget: {
        ...attendance.budget,
        items: updatedItems,
      },
    });
  };

  const handleRemoveBudgetLine = (id: string) => {
    onUpdateDraft({
      ...attendance,
      budget: {
        ...attendance.budget,
        items: attendance.budget.items.filter((i) => i.id !== id),
      },
    });
  };

  const handleAddHiddenDamage = async () => {
    if (!newHiddenDesc.trim()) return;
    const priceNum = parseFloat(newHiddenPriceReais.replace(',', '.'));
    const addendum: HiddenDamageAddendum = {
      id: `hd-${Date.now()}`,
      discoveredAt: new Date().toISOString(),
      affectedArea: newHiddenArea,
      description: newHiddenDesc.trim(),
      additionalServices: newHiddenServices.trim() || 'A definir',
      additionalPriceCents: !Number.isNaN(priceNum) && priceNum > 0 ? Math.round(priceNum * 100) : null,
      clientApproved: false,
    };
    const updated: AttendanceRecord = {
      ...attendance,
      hiddenDamages: [addendum, ...attendance.hiddenDamages],
      auditHistory: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: attendance.reviewerName || 'Oficina Castros Interiores',
          stage: 'Inspeção Interna / Danos Ocultos',
          action: 'Dano oculto registrado após abertura do móvel',
          details: `${newHiddenArea}: ${newHiddenDesc.trim()} (Aguardando aprovação do cliente antes de executar serviços adicionais).`,
        },
        ...attendance.auditHistory,
      ],
    };
    setNewHiddenDesc('');
    setNewHiddenServices('');
    setNewHiddenPriceReais('');
    await onPersistAttendance(updated, 'Dano oculto registrado', 'Parecer e Danos Ocultos');
  };

  const shouldRenderStep = (stepNumber: number) =>
    showAllStepsMode || activeStep === stepNumber;

  return (
    <div className="space-y-6">
      {/* Hero & Principal Command Bar inspired by Castros Interiores Visual Identity */}
      <div className="rounded-2xl bg-[#181512] text-[#F9F6F0] p-6 border border-[#2E2722]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#2E2722]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#D4B98C] mb-1.5">
              <span>AVALIAÇÃO TÉCNICA DE ESTOFADOS</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{attendance.attendanceNumber}</span>
              <span aria-hidden="true">·</span>
              <span>Estado: {attendance.status}</span>
              <span aria-hidden="true">·</span>
              <span>
                {attendance.reviewCompleted
                  ? `Revisado por ${attendance.reviewerName || 'Responsável'}`
                  : 'Análise Preliminar (Sujeita à Revisão)'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-display font-semibold tracking-tight text-white">
              {attendance.clientName && attendance.clientName !== 'não informado'
                ? `${attendance.clientName} — ${attendance.furnitureType}`
                : `Atendimento ${attendance.attendanceNumber}`}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {lastSavedSuccessAt && !isSaving && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/50 border border-emerald-800/50 tabular-nums">
                <Check className="w-3.5 h-3.5" />
                Salvo às {lastSavedSuccessAt}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAllStepsMode((prev) => !prev)}
              className="px-3.5 py-2 rounded-lg bg-[#26211C] hover:bg-[#322B24] text-xs font-medium text-[#E5DEC9] border border-[#3E352D] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              {showAllStepsMode ? 'Visão por Etapa' : 'Exibir Todas as Etapas'}
            </button>
          </div>
        </div>

        {/* 9 Mandatory Action Buttons (Todos funcionais) */}
        <div className="pt-5">
          <p className="text-xs text-[#A89F91] mb-3">
            Ações Principais do Atendimento (clique para executar diretamente):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => onNewAttendance(attendance.orderType || 'Reforma')}
              className="px-3.5 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#322B24] text-xs font-medium text-[#F9F6F0] border border-[#3E352D] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4B98C]" />
              Novo atendimento
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => onPersistAttendance(attendance, 'Atendimento salvo manualmente')}
              className="px-3.5 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-60 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar atendimento'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(2);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="px-3.5 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#322B24] text-xs font-medium text-[#F9F6F0] border border-[#3E352D] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-[#D4B98C]" />
              Adicionar fotos
            </button>

            <button
              type="button"
              disabled={isAnalyzingDefects}
              onClick={async () => {
                setStep(3);
                await onRunDefectsAnalysis();
              }}
              className="px-3.5 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#322B24] disabled:opacity-50 text-xs font-medium text-[#F9F6F0] border border-[#D4B98C]/40 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4B98C]" />
              {isAnalyzingDefects ? 'Analisando fotos...' : 'Analisar fotos'}
            </button>

            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-3.5 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#322B24] text-xs font-medium text-[#F9F6F0] border border-[#3E352D] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#D4B98C]" />
              Revisar análise
            </button>

            <button
              type="button"
              disabled={isAnalyzingReuse}
              onClick={async () => {
                setStep(5);
                await onRunReuseAnalysis();
              }}
              className="px-3.5 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#322B24] disabled:opacity-50 text-xs font-medium text-[#F9F6F0] border border-[#3E352D] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4B98C] ${isAnalyzingReuse ? 'animate-spin' : ''}`} />
              {isAnalyzingReuse ? 'Avaliando...' : 'Avaliar reaproveitamento'}
            </button>

            <button
              type="button"
              onClick={() => {
                handleInitializeDefaultProposalsIfEmpty();
                setStep(6);
              }}
              className="px-3.5 py-2.5 rounded-lg bg-[#26211C] hover:bg-[#322B24] text-xs font-medium text-[#F9F6F0] border border-[#3E352D] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-[#D4B98C]" />
              Montar proposta
            </button>

            <button
              type="button"
              onClick={onGenerateInternalPdf}
              className="px-3.5 py-2.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Gerar relatório interno
            </button>

            <button
              type="button"
              onClick={onGenerateClientPdf}
              className="px-3.5 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Gerar relatório do cliente
            </button>
          </div>
        </div>

        {/* 8-Step Stepper Navigation */}
        <div className="mt-5 pt-4 border-t border-[#2E2722]">
          <p className="text-xs text-[#A89F91] mb-2.5">
            Fluxo de Avaliação com Revisão Técnica (clique em qualquer etapa para navegar):
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {WORKFLOW_STEPS.map((st) => {
              const isCurrent = !showAllStepsMode && activeStep === st.id;
              const needsReview =
                (st.id === 3 && attendance.staleness?.defectsAnalysisNeedsReview) ||
                (st.id === 4 && attendance.staleness?.responsibleReviewNeedsUpdate) ||
                (st.id === 5 && attendance.staleness?.reuseNeedsReview) ||
                (st.id === 6 && attendance.staleness?.proposalNeedsReview) ||
                (st.id === 7 && attendance.staleness?.opinionNeedsReview);

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setShowAllStepsMode(false);
                    setStep(st.id);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                    isCurrent
                      ? 'bg-[#9A7138] text-white border-[#B88B4A]'
                      : needsReview
                      ? 'bg-amber-950/60 text-amber-200 border-amber-700/70 hover:bg-amber-900/50'
                      : 'bg-[#211C18] text-[#D6CFC5] border-[#342C25] hover:bg-[#2B2520]'
                  }`}
                >
                  {st.label}
                  {needsReview ? ' (Precisa revisar)' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Banners for Staleness / Configuration / Errors */}
      {!geminiConfigured && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Configuração externa pendente: Chave GEMINI_API_KEY</p>
            <p className="text-amber-800 mt-0.5">
              A variável de ambiente <code className="font-mono">GEMINI_API_KEY</code> não foi localizada no servidor. O cadastro, salvamento de fotos, revisão manual, cálculos de orçamento e geração de PDFs estão 100% operacionais, mas a análise automática por IA exige a configuração da chave nos Segredos do ambiente.
            </p>
          </div>
        </div>
      )}

      {(attendance.staleness?.defectsAnalysisNeedsReview ||
        attendance.staleness?.responsibleReviewNeedsUpdate) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Etapas dependentes marcadas como “Precisa revisar”</p>
              <p className="text-amber-800 mt-0.5">
                {attendance.staleness?.staleReason ||
                  'Fotos ou informações cadastrais foram alteradas. Uma aprovação antiga não é aplicada automaticamente ao novo conteúdo.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep(4)}
            className="px-3.5 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium whitespace-nowrap shrink-0"
          >
            Ir para Revisão
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm">
          <strong>Erro ao salvar atendimento:</strong> {saveError}
        </div>
      )}

      {aiError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong>Aviso do Serviço de Análise IA:</strong> {aiError}
          </div>
          <button
            type="button"
            disabled={isAnalyzingDefects || isAnalyzingReuse}
            onClick={() =>
              activeStep === 5 ? onRunReuseAnalysis() : onRunDefectsAnalysis()
            }
            className="px-3.5 py-1.5 rounded-lg bg-red-800 hover:bg-red-900 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar Novamente
          </button>
        </div>
      )}

      {/* ETAPA 1: CADASTRO DO ATENDIMENTO */}
      {shouldRenderStep(1) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                01. Cadastro do Atendimento e Dados do Móvel
              </h2>
              <p className="text-xs text-[#6B6257]">
                Preencha os dados informados pelo cliente. Campos em branco serão identificados como “não informado”.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-[#57534E]">Estado:</label>
              <select
                value={attendance.status || 'Rascunho'}
                onChange={(e) =>
                  handleFieldChange('status', e.target.value as AttendanceStatus, false)
                }
                className="rounded-lg border border-[#D6CFC5] bg-[#F9F6F0] px-3 py-1.5 text-xs font-medium text-[#1C1917]"
              >
                {ATTENDANCE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Número Automático do Atendimento
              </label>
              <input
                type="text"
                readOnly
                value={attendance.attendanceNumber}
                className="w-full rounded-lg border border-[#E5DEC9] bg-[#F3EFE6] px-3.5 py-2 text-sm font-mono text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={
                  attendance.clientName === 'não informado' ? '' : attendance.clientName
                }
                onChange={(e) =>
                  handleFieldChange('clientName', e.target.value || 'não informado', false)
                }
                placeholder="não informado"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={
                  attendance.clientPhone === 'não informado' ? '' : attendance.clientPhone
                }
                onChange={(e) =>
                  handleFieldChange('clientPhone', e.target.value || 'não informado', false)
                }
                placeholder="não informado"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Tipo de Móvel
              </label>
              <input
                type="text"
                value={
                  attendance.furnitureType === 'não informado'
                    ? ''
                    : attendance.furnitureType
                }
                onChange={(e) =>
                  handleFieldChange(
                    'furnitureType',
                    e.target.value || 'não informado',
                    true
                  )
                }
                placeholder="Ex: Sofá 3 Lugares, Poltrona, Cadeira, Puff, Cabeceira"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Quantidade de Peças
              </label>
              <input
                type="text"
                value={
                  attendance.piecesCount === 'não informado' ? '' : attendance.piecesCount
                }
                onChange={(e) =>
                  handleFieldChange('piecesCount', e.target.value || 'não informado', true)
                }
                placeholder="Ex: 1 sofá + 2 almofadas soltas (ou não informado)"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Medidas Aproximadas (L x P x A)
              </label>
              <input
                type="text"
                value={
                  attendance.approxMeasurements === 'não informado'
                    ? ''
                    : attendance.approxMeasurements
                }
                onChange={(e) =>
                  handleFieldChange(
                    'approxMeasurements',
                    e.target.value || 'não informado',
                    true
                  )
                }
                placeholder="Ex: 2,20m x 0,90m x 0,85m (ou não informado)"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Tempo de Uso Aproximado
              </label>
              <input
                type="text"
                value={attendance.usageTime === 'não informado' ? '' : attendance.usageTime}
                onChange={(e) =>
                  handleFieldChange('usageTime', e.target.value || 'não informado', true)
                }
                placeholder="Ex: 5 anos (ou não informado)"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Reformas Anteriores
              </label>
              <input
                type="text"
                value={
                  attendance.previousReforms === 'não informado'
                    ? ''
                    : attendance.previousReforms
                }
                onChange={(e) =>
                  handleFieldChange(
                    'previousReforms',
                    e.target.value || 'não informado',
                    true
                  )
                }
                placeholder="Informe se já foi reformado antes (ou não informado)"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Defeitos Relatados pelo Cliente
              </label>
              <textarea
                rows={3}
                value={
                  attendance.reportedDefects === 'não informado'
                    ? ''
                    : attendance.reportedDefects
                }
                onChange={(e) =>
                  handleFieldChange(
                    'reportedDefects',
                    e.target.value || 'não informado',
                    true
                  )
                }
                placeholder="Descreva os defeitos relatados pelo cliente (afundamento, rasgos, rangidos, etc.)"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Serviço Desejado pelo Cliente
              </label>
              <textarea
                rows={3}
                value={
                  attendance.desiredService === 'não informado'
                    ? ''
                    : attendance.desiredService
                }
                onChange={(e) =>
                  handleFieldChange(
                    'desiredService',
                    e.target.value || 'não informado',
                    true
                  )
                }
                placeholder="Ex: Troca total de tecido, troca de espumas do assento..."
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Preferência de Tecido e Conforto
              </label>
              <textarea
                rows={2}
                value={
                  attendance.fabricAndComfortPreference === 'não informado'
                    ? ''
                    : attendance.fabricAndComfortPreference
                }
                onChange={(e) =>
                  handleFieldChange(
                    'fabricAndComfortPreference',
                    e.target.value || 'não informado',
                    true
                  )
                }
                placeholder="Ex: Linho impermeabilizado, toque macio, espuma mais firme..."
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Observações Gerais
              </label>
              <textarea
                rows={2}
                value={attendance.notes === 'não informado' ? '' : attendance.notes}
                onChange={(e) =>
                  handleFieldChange('notes', e.target.value || 'não informado', false)
                }
                placeholder="Restrições de elevador, escada, horário, valor sentimental da peça..."
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#EFECE6] text-xs text-[#6B6257]">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <span>
                Criado em: {new Date(attendance.createdAt).toLocaleString('pt-BR')}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Última atualização: {new Date(attendance.updatedAt).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onPersistAttendance(attendance, 'Rascunho do cadastro salvo', 'Cadastro')
                }
                className="px-4 py-2 rounded-lg border border-[#D6CFC5] hover:bg-[#F3EFE6] text-[#1C1917] font-medium transition-colors"
              >
                {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onPersistAttendance(attendance, 'Cadastro salvo', 'Cadastro');
                  setStep(2);
                }}
                className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-medium flex items-center gap-1.5 transition-colors"
              >
                Avançar para Fotos
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ETAPA 2: FOTOS E SALVAMENTO */}
      {shouldRenderStep(2) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                02. Fotografias do Móvel e Estrutura ({attendance.photos.length})
              </h2>
              <p className="text-xs text-[#6B6257]">
                Selecione várias fotos da galeria ou use a câmera do celular. Cada foto recebe código automático, categoria, legenda e vínculo com o atendimento.
              </p>
            </div>
          </div>

          {/* Upload Controls Box */}
          <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Categoria Padrão para Novas Fotos
                </label>
                <select
                  value={selectedPhotoCategory}
                  onChange={(e) => setSelectedPhotoCategory(e.target.value as PhotoCategory)}
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-sm text-[#1C1917]"
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Móvel / Peça Vinculada
                </label>
                <input
                  type="text"
                  value={photoFurnitureInput}
                  onChange={(e) => setPhotoFurnitureInput(e.target.value)}
                  placeholder="Ex: Sofá 3 Lugares"
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-sm text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Legenda Inicial (opcional)
                </label>
                <input
                  type="text"
                  value={photoCaptionInput}
                  onChange={(e) => setPhotoCaptionInput(e.target.value)}
                  placeholder="Ex: Vista frontal com luz natural"
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-sm text-[#1C1917]"
                />
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultipleFilesSelected}
              className="hidden"
            />
            <input
              ref={mobileCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleMultipleFilesSelected}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-[#D4B98C]" />
                Selecionar Várias Imagens
              </button>

              <button
                type="button"
                onClick={() => mobileCameraInputRef.current?.click()}
                className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Câmera do Celular (Nativa)
              </button>

              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="px-4 py-2.5 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[#1C1917] text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-[#9A7138]" />
                Abrir Câmera no Navegador
              </button>
            </div>
          </div>

          {/* Photo Grid */}
          {attendance.photos.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#D6CFC5] text-center space-y-2">
              <p className="text-sm font-medium text-[#1C1917]">
                Nenhuma fotografia adicionada a este atendimento.
              </p>
              <p className="text-xs text-[#6B6257]">
                Adicione fotos de Frente, Costas, Laterais, Assento, Encosto, Braços, Pés/Base e Detalhes dos defeitos para habilitar a análise por IA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {attendance.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-xl border border-[#E5DEC9] bg-[#FDFBF7] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div
                      className="relative aspect-4/3 bg-[#EDE7DC] cursor-pointer group overflow-hidden"
                      onClick={() => setLightboxPhoto(photo)}
                    >
                      <ResilientImage
                        src={photo.imageUrl || photo.thumbnailDataUrl || ''}
                        alt={`${photo.code} - ${photo.caption}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        fallbackTitle={`${photo.code} — ${photo.category}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-90" />
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-white">
                        <span className="font-mono font-semibold bg-black/70 px-2 py-0.5 rounded">
                          {photo.code}
                        </span>
                        <span className="bg-black/70 px-2 py-0.5 rounded flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" />
                          Ampliar
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                        {photo.uploadStatus === 'uploading' && (
                          <span className="text-amber-200 bg-black/75 px-2 py-0.5 rounded flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Enviando...
                          </span>
                        )}
                        {photo.uploadStatus === 'saved' && (
                          <span className="text-emerald-300 bg-black/75 px-2 py-0.5 rounded flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Salvo no servidor
                          </span>
                        )}
                        {photo.uploadStatus === 'error' && (
                          <span className="text-red-300 bg-red-950/90 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Falha no envio
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[#6B6257] mb-0.5">
                          Categoria
                        </label>
                        <select
                          value={photo.category}
                          onChange={(e) =>
                            handleUpdatePhotoMeta(photo.id, {
                              category: e.target.value as PhotoCategory,
                            })
                          }
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs text-[#1C1917]"
                        >
                          {PHOTO_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#6B6257] mb-0.5">
                          Móvel Vinculado
                        </label>
                        <input
                          type="text"
                          value={photo.furnitureLabel}
                          onChange={(e) =>
                            handleUpdatePhotoMeta(photo.id, {
                              furnitureLabel: e.target.value,
                            })
                          }
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1 text-xs text-[#1C1917]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#6B6257] mb-0.5">
                          Legenda da Foto
                        </label>
                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) =>
                            handleUpdatePhotoMeta(photo.id, {
                              caption: e.target.value,
                            })
                          }
                          placeholder="Descreva o que esta foto mostra"
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1 text-xs text-[#1C1917]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 bg-[#F3EFE6] border-t border-[#E5DEC9] flex items-center justify-between">
                    {photo.uploadStatus === 'error' ? (
                      <button
                        type="button"
                        onClick={() =>
                          photo.thumbnailDataUrl &&
                          onUploadPhotoFile(
                            photo.thumbnailDataUrl,
                            photo.category,
                            photo.caption,
                            photo.furnitureLabel,
                            photo.id
                          )
                        }
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar novamente
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#6B6257] tabular-nums">
                        Atendimento {attendance.attendanceNumber}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="text-xs text-red-700 hover:text-red-900 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar ao Cadastro
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isAnalyzingDefects || attendance.photos.length === 0}
                onClick={async () => {
                  setStep(3);
                  await onRunDefectsAnalysis();
                }}
                className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzingDefects ? 'Analisando Imagens Reais...' : 'Analisar Fotos com Gemini'}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-medium flex items-center gap-1.5"
              >
                Avançar para Análise
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ETAPA 3: ANÁLISE DE DEFEITOS POR ÁREA */}
      {shouldRenderStep(3) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#9A7138] font-medium mb-1">
                <span>AGENTE ANALISTA DE ESTOFADOS</span>
                <span aria-hidden="true">·</span>
                <span>
                  {attendance.reviewCompleted
                    ? 'REVISADO PELO RESPONSÁVEL'
                    : 'ANÁLISE AUTOMÁTICA PRELIMINAR'}
                </span>
              </div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                03. Relatório de Defeitos por Área (11 Áreas Padronizadas)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isAnalyzingDefects || attendance.photos.length === 0}
                onClick={onRunDefectsAnalysis}
                className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzingDefects
                  ? 'Processando imagens no servidor...'
                  : 'Executar / Atualizar Análise com IA'}
              </button>
              <button
                type="button"
                onClick={handleAddManualFinding}
                className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] hover:bg-[#F3EFE6] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Achado Manual
              </button>
            </div>
          </div>

          {isAnalyzingDefects && (
            <div className="p-6 rounded-xl bg-[#181512] text-[#F9F6F0] flex items-center gap-4">
              <RefreshCw className="w-6 h-6 text-[#D4B98C] animate-spin shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">
                  Enviando binários das fotografias para análise técnica no servidor...
                </p>
                <p className="text-xs text-[#A89F91] mt-0.5">
                  O Agente Analista da Castros Interiores está inspecionando as 11 áreas do móvel. Solicitações duplicadas estão bloqueadas durante o processamento.
                </p>
              </div>
            </div>
          )}

          {/* Reference for Right and Left */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9]">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Referência Adotada para Direita e Esquerda
              </label>
              <input
                type="text"
                value={attendance.leftRightReference}
                onChange={(e) =>
                  handleFieldChange('leftRightReference', e.target.value, false)
                }
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-1.5 text-xs text-[#1C1917]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Resumo Técnico Preliminar
              </label>
              <p className="text-xs text-[#57534E] leading-relaxed">
                {attendance.aiPreliminarySummary ||
                  'Clique em "Executar / Atualizar Análise com IA" para analisar as fotos enviadas.'}
              </p>
            </div>
          </div>

          {/* Table of Defects by Area */}
          <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#181512] text-[#F9F6F0]">
                  <th className="py-3 px-3 font-semibold">Área</th>
                  <th className="py-3 px-3 font-semibold">Defeito ou suspeita</th>
                  <th className="py-3 px-3 font-semibold">Evidência e foto</th>
                  <th className="py-3 px-3 font-semibold">Origem da informação</th>
                  <th className="py-3 px-3 font-semibold">Gravidade aparente</th>
                  <th className="py-3 px-3 font-semibold">Serviço sugerido</th>
                  <th className="py-3 px-3 font-semibold">Verificação necessária</th>
                  <th className="py-3 px-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {attendance.defectFindings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-4 text-center text-[#6B6257]">
                      Nenhuma análise gerada ainda. Clique em <strong>Analisar fotos</strong> para inspecionar as imagens com o Gemini ou adicione achados manualmente.
                    </td>
                  </tr>
                ) : (
                  attendance.defectFindings.map((finding) => (
                    <tr
                      key={finding.id}
                      className={
                        finding.reviewStatus === 'Descartado'
                          ? 'bg-neutral-100 opacity-60 line-through'
                          : 'hover:bg-[#FAF7F2]'
                      }
                    >
                      <td className="py-2.5 px-3 font-semibold text-[#1C1917] whitespace-nowrap">
                        {finding.area}
                      </td>
                      <td className="py-2.5 px-3 text-[#292524]">
                        {finding.defectOrSuspicion}
                      </td>
                      <td className="py-2.5 px-3 text-[#57534E]">
                        {finding.evidenceAndPhoto}
                      </td>
                      <td className="py-2.5 px-3 text-[#1C1917] whitespace-nowrap">
                        {finding.origin}
                      </td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                        <span
                          className={
                            finding.severity === 'Grave'
                              ? 'text-red-700 font-semibold'
                              : finding.severity === 'Moderada'
                              ? 'text-amber-700 font-semibold'
                              : finding.severity === 'Leve'
                              ? 'text-emerald-700'
                              : 'text-[#6B6257]'
                          }
                        >
                          {finding.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#292524]">
                        {finding.suggestedService}
                      </td>
                      <td className="py-2.5 px-3 text-[#57534E]">
                        {finding.requiredVerification}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium">
                        {finding.reviewStatus}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Limitations & Requested Additional Photos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9]">
              <h3 className="text-xs font-bold text-[#1C1917] mb-2">
                Limitações Técnicas Registradas (Áreas Cobertas / Não Avaliáveis por Foto)
              </h3>
              {attendance.analysisLimitations.length === 0 ? (
                <p className="text-xs text-[#6B6257]">
                  Nenhuma limitação registrada ainda. Lembre-se: densidade real da espuma, resistência interna da madeira, cupins/mofo ocultos e odores nunca são determinados apenas por foto.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-[#44403C] list-disc pl-4">
                  {attendance.analysisLimitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9]">
              <h3 className="text-xs font-bold text-[#1C1917] mb-2">
                Fotos Adicionais Solicitadas para Completar Avaliação
              </h3>
              {attendance.requestedAdditionalPhotos.length === 0 ? (
                <p className="text-xs text-[#6B6257]">
                  Nenhuma foto complementar solicitada no momento.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-[#44403C] list-disc pl-4">
                  {attendance.requestedAdditionalPhotos.map((reqPhoto, i) => (
                    <li key={i}>{reqPhoto}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Fotos
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-medium flex items-center gap-1.5"
            >
              Avançar para Revisão do Responsável
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ETAPA 4: REVISÃO DO RESPONSÁVEL */}
      {shouldRenderStep(4) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                04. Revisão e Validação pelo Responsável
              </h2>
              <p className="text-xs text-[#6B6257]">
                Edite, confirme ou descarte cada achado da análise preliminar. A análise automática permanece marcada como preliminar até a homologação abaixo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddManualFinding}
              className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] hover:bg-[#F3EFE6] text-xs font-medium text-[#1C1917] flex items-center gap-1.5 self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              Incluir Achado da Oficina
            </button>
          </div>

          <div className="space-y-3">
            {attendance.defectFindings.map((finding) => {
              const isEditing = editingFindingId === finding.id;
              return (
                <div
                  key={finding.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    finding.reviewStatus === 'Descartado'
                      ? 'bg-neutral-100 border-neutral-200 opacity-65'
                      : finding.reviewStatus === 'Confirmado' || finding.reviewStatus === 'Editado'
                      ? 'bg-[#FAF8F5] border-emerald-700/30'
                      : 'bg-white border-[#E5DEC9]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-[#1C1917] text-sm">{finding.area}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#57534E]">Origem: {finding.origin}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#9A7138]">
                        Gravidade: {finding.severity}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-[#6B6257]">
                        Estado: {finding.reviewStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingFindingId(isEditing ? null : finding.id)
                        }
                        className="px-2.5 py-1 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-medium text-[#1C1917] flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditing ? 'Fechar Edição' : 'Editar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFindingStatusChange(finding.id, 'Confirmado')}
                        className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFindingStatusChange(finding.id, 'Descartado')}
                        className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-900 text-white text-xs font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Descartar
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#E5DEC9]">
                      <div>
                        <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Área do Móvel
                        </label>
                        <select
                          value={finding.area}
                          onChange={(e) =>
                            handleFindingEdit(finding.id, {
                              area: e.target.value as FurnitureArea,
                            })
                          }
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                        >
                          {FURNITURE_AREAS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Origem da Informação
                        </label>
                        <select
                          value={finding.origin}
                          onChange={(e) =>
                            handleFindingEdit(finding.id, {
                              origin: e.target.value as InformationOrigin,
                            })
                          }
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                        >
                          {ORIGINS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                          Gravidade Aparente
                        </label>
                        <select
                          value={finding.severity}
                          onChange={(e) =>
                            handleFindingEdit(finding.id, {
                              severity: e.target.value as ApparentSeverity,
                            })
                          }
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                        >
                          {SEVERITIES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                            Defeito ou Suspeita
                          </label>
                          <input
                            type="text"
                            value={finding.defectOrSuspicion}
                            onChange={(e) =>
                              handleFindingEdit(finding.id, {
                                defectOrSuspicion: e.target.value,
                              })
                            }
                            className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                            Evidência e Foto
                          </label>
                          <input
                            type="text"
                            value={finding.evidenceAndPhoto}
                            onChange={(e) =>
                              handleFindingEdit(finding.id, {
                                evidenceAndPhoto: e.target.value,
                              })
                            }
                            className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                            Serviço Sugerido
                          </label>
                          <input
                            type="text"
                            value={finding.suggestedService}
                            onChange={(e) =>
                              handleFindingEdit(finding.id, {
                                suggestedService: e.target.value,
                              })
                            }
                            className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#44403C] grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="font-semibold text-[#1C1917]">Diagnóstico: </span>
                        {finding.defectOrSuspicion}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Evidência: </span>
                        {finding.evidenceAndPhoto}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Serviço: </span>
                        {finding.suggestedService}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Responsible Reviewer Sign-off Box */}
          <div className="p-5 rounded-xl bg-[#F9F6F0] border border-[#D6CFC5] space-y-4">
            <h3 className="text-sm font-bold text-[#1C1917]">
              Homologação da Revisão pelo Responsável Técnico
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Nome do Responsável pela Revisão *
                </label>
                <input
                  type="text"
                  value={attendance.reviewerName}
                  onChange={(e) =>
                    handleFieldChange('reviewerName', e.target.value, false)
                  }
                  placeholder="Ex: Mestre Estofador Carlos Castro"
                  className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <input
                  id="internal-insp-check"
                  type="checkbox"
                  checked={attendance.internalInspectionCompleted}
                  onChange={(e) =>
                    handleFieldChange(
                      'internalInspectionCompleted',
                      e.target.checked,
                      false
                    )
                  }
                  className="w-4 h-4 rounded border-[#D6CFC5]"
                />
                <label
                  htmlFor="internal-insp-check"
                  className="text-xs font-medium text-[#1C1917]"
                >
                  Inspeção interna presencial na oficina já foi realizada (móvel aberto)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Observações Técnicas da Revisão
              </label>
              <textarea
                rows={2}
                value={attendance.reviewerGeneralNotes}
                onChange={(e) =>
                  handleFieldChange('reviewerGeneralNotes', e.target.value, false)
                }
                placeholder="Registre ressalvas, confirmações presenciais ou orientações para a bancada..."
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-sm text-[#1C1917]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#6B6257]">
                {attendance.reviewCompleted && attendance.reviewedAt
                  ? `Revisão confirmada por ${attendance.reviewerName} em ${new Date(
                      attendance.reviewedAt
                    ).toLocaleString('pt-BR')}`
                  : 'Aguardando confirmação do nome do responsável para validar a revisão.'}
              </span>

              <button
                type="button"
                disabled={!attendance.reviewerName.trim() || isSaving}
                onClick={handleCompleteResponsibleReview}
                className="px-5 py-2.5 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirmar Revisão do Responsável
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Análise
            </button>
            <button
              type="button"
              onClick={() => {
                handleInitializeDefaultReuseIfEmpty();
                setStep(5);
              }}
              className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-medium flex items-center gap-1.5"
            >
              Avançar para Reaproveitamento
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ETAPA 5: SEGUNDA AVALIAÇÃO — REAPROVEITAMENTO DE MATERIAIS */}
      {shouldRenderStep(5) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                05. Segunda Avaliação: Reaproveitamento de Materiais
              </h2>
              <p className="text-xs text-[#6B6257]">
                Avaliação técnica dos 10 componentes do estofado. Sem valores confirmados, nunca são apresentadas economias em reais ou percentuais.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isAnalyzingReuse}
                onClick={onRunReuseAnalysis}
                className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzingReuse
                  ? 'Avaliando Reaproveitamento com IA...'
                  : 'Gerar Avaliação de Reaproveitamento com IA'}
              </button>
              {attendance.reuseItems.length === 0 && (
                <button
                  type="button"
                  onClick={handleInitializeDefaultReuseIfEmpty}
                  className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917]"
                >
                  Preencher Tabela Manualmente
                </button>
              )}
            </div>
          </div>

          {/* Workshop Foam Inspection Panel (Mandatory per Section 8) */}
          <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#1C1917]">
                  Inspeção Técnica de Espumas pela Oficina (Obrigatória para Espumas Cobertas)
                </h3>
                <p className="text-[11px] text-[#6B6257]">
                  A densidade, retorno e integridade interna de espumas cobertas não podem ser determinadas apenas por foto.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#1C1917]">
                <input
                  type="checkbox"
                  checked={attendance.foamInspection.inspectedByWorkshop}
                  onChange={(e) =>
                    handleFieldChange('foamInspection', {
                      ...attendance.foamInspection,
                      inspectedByWorkshop: e.target.checked,
                    })
                  }
                  className="rounded border-[#D6CFC5]"
                />
                Espuma inspecionada presencialmente na bancada
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Deformação Permanente
                </label>
                <select
                  value={attendance.foamInspection.permanentDeformation}
                  onChange={(e) =>
                    handleFieldChange('foamInspection', {
                      ...attendance.foamInspection,
                      permanentDeformation: e.target.value as typeof attendance.foamInspection.permanentDeformation,
                    })
                  }
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="Não avaliado">Não avaliado</option>
                  <option value="Ausente">Ausente</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Severa">Severa</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Retorno após Compressão
                </label>
                <select
                  value={attendance.foamInspection.compressionReturn}
                  onChange={(e) =>
                    handleFieldChange('foamInspection', {
                      ...attendance.foamInspection,
                      compressionReturn: e.target.value as typeof attendance.foamInspection.compressionReturn,
                    })
                  }
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="Não avaliado">Não avaliado</option>
                  <option value="Adequado">Adequado</option>
                  <option value="Lento">Lento</option>
                  <option value="Sem retorno">Sem retorno</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Esfarelamento
                </label>
                <select
                  value={attendance.foamInspection.crumbling}
                  onChange={(e) =>
                    handleFieldChange('foamInspection', {
                      ...attendance.foamInspection,
                      crumbling: e.target.value as typeof attendance.foamInspection.crumbling,
                    })
                  }
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="Não avaliado">Não avaliado</option>
                  <option value="Ausente">Ausente</option>
                  <option value="Início de esfarelamento">Início de esfarelamento</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Odor
                </label>
                <select
                  value={attendance.foamInspection.odor}
                  onChange={(e) =>
                    handleFieldChange('foamInspection', {
                      ...attendance.foamInspection,
                      odor: e.target.value as typeof attendance.foamInspection.odor,
                    })
                  }
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="Não avaliado">Não avaliado</option>
                  <option value="Ausente">Ausente</option>
                  <option value="Presente">Presente</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Umidade / Mofo
                </label>
                <select
                  value={attendance.foamInspection.moisture}
                  onChange={(e) =>
                    handleFieldChange('foamInspection', {
                      ...attendance.foamInspection,
                      moisture: e.target.value as typeof attendance.foamInspection.moisture,
                    })
                  }
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option value="Não avaliado">Não avaliado</option>
                  <option value="Seca">Seca</option>
                  <option value="Úmida / sinais de mofo">Úmida / sinais de mofo</option>
                </select>
              </div>
            </div>
          </div>

          {/* 10-Component Reuse Table */}
          <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#181512] text-[#F9F6F0]">
                  <th className="py-3 px-3 font-semibold">Componente</th>
                  <th className="py-3 px-3 font-semibold">Condição</th>
                  <th className="py-3 px-3 font-semibold">Possibilidade de reaproveitamento</th>
                  <th className="py-3 px-3 font-semibold">Recuperação necessária</th>
                  <th className="py-3 px-3 font-semibold">Critério de aprovação</th>
                  <th className="py-3 px-3 font-semibold">Efeito esperado no custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {attendance.reuseItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-[#6B6257]">
                      Clique em <strong>Gerar Avaliação de Reaproveitamento com IA</strong> ou em <strong>Preencher Tabela Manualmente</strong> para avaliar os 10 componentes.
                    </td>
                  </tr>
                ) : (
                  attendance.reuseItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-3 font-semibold text-[#1C1917] whitespace-nowrap">
                        {item.component}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.condition}
                          onChange={(e) =>
                            handleReuseItemChange(item.id, { condition: e.target.value })
                          }
                          className="w-full rounded border border-[#E5DEC9] bg-white px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={item.classification}
                          onChange={(e) =>
                            handleReuseItemChange(item.id, {
                              classification: e.target.value as ReuseClassification,
                            })
                          }
                          className="w-full rounded border border-[#D6CFC5] bg-white px-2 py-1 text-xs font-medium"
                        >
                          {REUSE_CLASSIFICATIONS.map((cl) => (
                            <option key={cl} value={cl}>
                              {cl}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.requiredRecovery}
                          onChange={(e) =>
                            handleReuseItemChange(item.id, {
                              requiredRecovery: e.target.value,
                            })
                          }
                          className="w-full rounded border border-[#E5DEC9] bg-white px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.approvalCriteria}
                          onChange={(e) =>
                            handleReuseItemChange(item.id, {
                              approvalCriteria: e.target.value,
                            })
                          }
                          className="w-full rounded border border-[#E5DEC9] bg-white px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.expectedCostEffect}
                          onChange={(e) =>
                            handleReuseItemChange(item.id, {
                              expectedCostEffect: e.target.value,
                            })
                          }
                          className="w-full rounded border border-[#E5DEC9] bg-white px-2 py-1 text-xs"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1917] mb-1">
              Análise de Redução de Consumo de Material vs. Risco de Retrabalho
            </label>
            <textarea
              rows={3}
              value={attendance.materialConsumptionAndReworkAnalysis}
              onChange={(e) =>
                handleFieldChange(
                  'materialConsumptionAndReworkAnalysis',
                  e.target.value,
                  false
                )
              }
              placeholder="Explique onde há possibilidade real de reduzir consumo de material (ex: chassi de madeira e pés) e onde manter itens desgastados (ex: percintas frouxas ou espuma fadigada) geraria retrabalho..."
              className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3.5 py-2 text-xs text-[#1C1917]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Revisão
            </button>
            <button
              type="button"
              onClick={() => {
                handleInitializeDefaultProposalsIfEmpty();
                setStep(6);
              }}
              className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-medium flex items-center gap-1.5"
            >
              Avançar para Propostas e Orçamento
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ETAPA 6: PROPOSTAS DE REFORMA E ORÇAMENTO */}
      {shouldRenderStep(6) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                06. Propostas de Reforma (Essencial, Recomendada e Completa) e Orçamento
              </h2>
              <p className="text-xs text-[#6B6257]">
                Cálculos executados por código com separação estrita entre custo interno e preço de venda. Metragem de tecido sem plano de corte permanece como “quantidade a levantar”.
              </p>
            </div>
            {attendance.proposals.length === 0 && (
              <button
                type="button"
                onClick={handleInitializeDefaultProposalsIfEmpty}
                className="px-4 py-2 rounded-lg bg-[#9A7138] text-white text-xs font-semibold"
              >
                Inicializar 3 Propostas Padrão
              </button>
            )}
          </div>

          {/* 3 Reform Proposals Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {attendance.proposals.map((prop, idx) => {
              const isSelected = attendance.selectedProposalTier === prop.tier;
              return (
                <div
                  key={prop.tier}
                  className={`rounded-xl p-5 border flex flex-col justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#FAF6EE] border-[#9A7138]'
                      : 'bg-white border-[#E5DEC9]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-wider text-[#9A7138]">
                        PROPOSTA {prop.tier}
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-[#57534E]">
                        <input
                          type="checkbox"
                          checked={prop.justifiable}
                          onChange={(e) => {
                            const next = [...attendance.proposals];
                            next[idx] = { ...prop, justifiable: e.target.checked };
                            handleFieldChange('proposals', next, false);
                          }}
                        />
                        Justificável
                      </label>
                    </div>

                    <p className="text-sm font-semibold text-[#1C1917]">{prop.title}</p>

                    <div className="space-y-2 text-xs text-[#44403C]">
                      <div>
                        <span className="font-semibold text-[#1C1917]">Serviços: </span>
                        {prop.services.join(' • ')}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Manter: </span>
                        {prop.materialsToKeep.join(' • ')}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Recuperar: </span>
                        {prop.materialsToRecover.join(' • ')}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Substituir: </span>
                        {prop.materialsToReplace.join(' • ')}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">Pendências: </span>
                        {prop.pendingItems.join(' • ')}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1C1917]">
                          Benefícios e limitações:{' '}
                        </span>
                        {prop.benefitsAndLimitations}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#E5DEC9]">
                    <button
                      type="button"
                      disabled={!prop.justifiable}
                      onClick={() =>
                        handleFieldChange(
                          'selectedProposalTier',
                          prop.tier as ProposalTier,
                          false
                        )
                      }
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[#181512] text-white'
                          : 'bg-[#F3EFE6] hover:bg-[#E5DEC9] text-[#1C1917] disabled:opacity-40'
                      }`}
                    >
                      {isSelected
                        ? 'Proposta Selecionada para o Cliente'
                        : 'Selecionar esta Proposta'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Code-Calculated Budget Section */}
          <div className="p-5 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">
                  Planilha de Custos Internos e Formação do Preço de Venda
                </h3>
                <p className="text-xs text-[#6B6257]">
                  Custos internos e margem nunca aparecem no Relatório do Cliente.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-[#1C1917] bg-white px-3 py-2 rounded-lg border border-[#D6CFC5]">
                <input
                  type="checkbox"
                  checked={attendance.budget.cuttingPlanConfirmed}
                  onChange={(e) =>
                    onUpdateDraft({
                      ...attendance,
                      budget: {
                        ...attendance.budget,
                        cuttingPlanConfirmed: e.target.checked,
                      },
                    })
                  }
                />
                Medidas e Plano de Corte Confirmados (libera metragem exata de tecido)
              </label>
            </div>

            {/* Add Item from Catalog */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
                className="flex-1 min-w-[240px] rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs text-[#1C1917]"
              >
                {materialsCatalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.category}] {m.name} — {formatCurrencyBRL(m.unitCostCents)}/{m.unit}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddCatalogItemToBudget}
                className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Item Cadastrado
              </button>
            </div>

            {/* Budget Items Table */}
            <div className="overflow-x-auto bg-white border border-[#E5DEC9] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Item / Serviço</th>
                    <th className="py-2.5 px-3">Unid.</th>
                    <th className="py-2.5 px-3">Situação da Quantidade</th>
                    <th className="py-2.5 px-3 text-right">Qtd.</th>
                    <th className="py-2.5 px-3 text-right">Custo Unit. (R$)</th>
                    <th className="py-2.5 px-3 text-right">Subtotal Interno</th>
                    <th className="py-2.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {attendance.budget.items.map((item) => {
                    const lineCalc = calculateLineItemTotal(item);
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-2 px-3">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateBudgetLine(item.id, {
                                category: e.target.value as BudgetLineCategory,
                              })
                            }
                            className="rounded border border-[#D6CFC5] bg-white px-2 py-1 text-xs"
                          >
                            <option value="Material">Material</option>
                            <option value="Mão de obra">Mão de obra</option>
                            <option value="Serviço terceirizado">Serviço terceirizado</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Outro custo">Outro custo</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateBudgetLine(item.id, { name: e.target.value })
                            }
                            className="w-full rounded border border-[#E5DEC9] px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3">{item.unit}</td>
                        <td className="py-2 px-3">
                          <select
                            value={item.quantityStatus}
                            onChange={(e) => {
                              const status = e.target
                                .value as BudgetLineItem['quantityStatus'];
                              handleUpdateBudgetLine(item.id, {
                                quantityStatus: status,
                                quantity:
                                  status === 'Definida' ? item.quantity ?? 1 : null,
                              });
                            }}
                            className="rounded border border-[#D6CFC5] bg-white px-2 py-1 text-xs"
                          >
                            <option value="Definida">Definida</option>
                            <option value="A levantar (requer medidas e plano de corte)">
                              Quantidade a levantar (plano de corte)
                            </option>
                            <option value="Pendente">Pendente</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {item.quantityStatus === 'Definida' ? (
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.quantity ?? ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateBudgetLine(item.id, {
                                  quantity: Number.isNaN(val) ? null : val,
                                });
                              }}
                              className="w-20 text-right rounded border border-[#D6CFC5] px-2 py-1 text-xs tabular-nums"
                            />
                          ) : (
                            <span className="text-amber-800 font-medium">
                              {item.quantityStatus ===
                              'A levantar (requer medidas e plano de corte)'
                                ? 'quantidade a levantar'
                                : 'pendente'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              item.unitCostCents !== null
                                ? (item.unitCostCents / 100).toFixed(2)
                                : ''
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateBudgetLine(item.id, {
                                unitCostCents: Number.isNaN(val)
                                  ? null
                                  : Math.round(val * 100),
                              });
                            }}
                            placeholder="pendente"
                            className="w-24 text-right rounded border border-[#D6CFC5] px-2 py-1 text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-semibold tabular-nums">
                          {lineCalc.isPending ? (
                            <span className="text-amber-800">{lineCalc.pendingReason}</span>
                          ) : (
                            formatCurrencyBRL(lineCalc.totalCents)
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBudgetLine(item.id)}
                            className="text-red-700 hover:text-red-900 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Category Subtotals & Selling Price Confirmation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-2 text-xs">
                <h4 className="font-bold text-[#1C1917] mb-2">
                  Resumo do Custo Interno (Calculado por Código)
                </h4>
                {Object.values(budgetSummary.byCategory).map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between py-1 border-b border-[#F3EFE6]"
                  >
                    <span className="text-[#57534E]">{cat.category}:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrencyBRL(cat.subtotalCents)}
                      {cat.hasPendingItems ? ` (+ ${cat.pendingCount} pendente)` : ''}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 text-sm font-bold text-[#1C1917]">
                  <span>Custo Interno Total:</span>
                  <span className="tabular-nums">
                    {formatCurrencyBRL(budgetSummary.totalInternalCostCents)}
                    {budgetSummary.hasAnyPendingItems ? ' (Total Incompleto)' : ''}
                  </span>
                </div>
                {budgetSummary.hasAnyPendingItems && (
                  <p className="text-[11px] text-amber-800 pt-1">
                    Itens pendentes não são tratados como zero: {budgetSummary.pendingItemNames.join(', ')}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3 text-xs">
                <h4 className="font-bold text-[#1C1917]">
                  Preço de Venda e Condições Comerciais (Definidos pelo Responsável)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                      Preço de Venda ao Cliente (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={
                        attendance.budget.sellingPriceCents !== null
                          ? (attendance.budget.sellingPriceCents / 100).toFixed(2)
                          : ''
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateDraft({
                          ...attendance,
                          budget: {
                            ...attendance.budget,
                            sellingPriceCents:
                              Number.isNaN(val) || val <= 0
                                ? null
                                : Math.round(val * 100),
                          },
                        });
                      }}
                      placeholder="pendente"
                      className="w-full rounded border border-[#D6CFC5] px-3 py-1.5 text-sm font-semibold tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                      Prazo Estimado de Entrega
                    </label>
                    <input
                      type="text"
                      value={
                        attendance.budget.estimatedDeadline === 'não informado'
                          ? ''
                          : attendance.budget.estimatedDeadline
                      }
                      onChange={(e) =>
                        onUpdateDraft({
                          ...attendance,
                          budget: {
                            ...attendance.budget,
                            estimatedDeadline: e.target.value || 'não informado',
                          },
                        })
                      }
                      placeholder="Ex: 15 dias úteis após coleta"
                      className="w-full rounded border border-[#D6CFC5] px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                    Condições de Pagamento
                  </label>
                  <input
                    type="text"
                    value={
                      attendance.budget.paymentConditions === 'não informado'
                        ? ''
                        : attendance.budget.paymentConditions
                    }
                    onChange={(e) =>
                      onUpdateDraft({
                        ...attendance,
                        budget: {
                          ...attendance.budget,
                          paymentConditions: e.target.value || 'não informado',
                        },
                      })
                    }
                    placeholder="Ex: 50% de sinal na aprovação e 50% na entrega ou até 6x"
                    className="w-full rounded border border-[#D6CFC5] px-3 py-1.5 text-xs"
                  />
                </div>

                <div className="pt-2 border-t border-[#EFECE6] flex items-center justify-between">
                  <label className="flex items-center gap-2 font-semibold text-[#1C1917]">
                    <input
                      type="checkbox"
                      checked={attendance.budget.confirmedByResponsible}
                      onChange={(e) =>
                        onUpdateDraft({
                          ...attendance,
                          budget: {
                            ...attendance.budget,
                            confirmedByResponsible: e.target.checked,
                            responsibleName:
                              attendance.reviewerName ||
                              attendance.budget.responsibleName ||
                              'Responsável Castros Interiores',
                            confirmedAt: e.target.checked
                              ? new Date().toISOString()
                              : undefined,
                          },
                        })
                      }
                    />
                    Confirmar Preço, Pagamento e Prazo pelo Responsável
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Reaproveitamento
            </button>
            <button
              type="button"
              onClick={() => setStep(7)}
              className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-medium flex items-center gap-1.5"
            >
              Avançar para Parecer Técnico
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ETAPA 7: PARECER (COMPENSA REFORMAR?) E DANOS OCULTOS */}
      {shouldRenderStep(7) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#EFECE6]">
            <div>
              <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
                07. Parecer Técnico: Compensa Reformar?
              </h2>
              <p className="text-xs text-[#6B6257]">
                Avaliação multicritério sem percentual fixo universal. Sem inspeção interna e orçamento suficiente, o parecer permanece como Preliminar.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded bg-[#F3EFE6] text-[#1C1917]">
              {attendance.internalInspectionCompleted &&
              attendance.budget.confirmedByResponsible &&
              !budgetSummary.hasAnyPendingItems
                ? 'Parecer Confirmado'
                : 'Parecer Preliminar'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Conclusão do Parecer
              </label>
              <select
                value={attendance.opinion.conclusion}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      conclusion: e.target.value as OpinionConclusion,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] bg-[#F9F6F0] px-3 py-2 text-xs font-semibold text-[#1C1917]"
              >
                {OPINION_CONCLUSIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Complexidade Técnica Estimada
              </label>
              <select
                value={attendance.opinion.complexityLevel}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      complexityLevel: e.target
                        .value as typeof attendance.opinion.complexityLevel,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs text-[#1C1917]"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="A confirmar na oficina">A confirmar na oficina</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                Preço de Móvel Novo Equivalente (R$ — quando informado)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={
                  attendance.opinion.equivalentNewFurniturePriceCents != null
                    ? (attendance.opinion.equivalentNewFurniturePriceCents / 100).toFixed(2)
                    : ''
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      equivalentNewFurniturePriceCents:
                        Number.isNaN(val) || val <= 0 ? null : Math.round(val * 100),
                    },
                  });
                }}
                placeholder="não informado"
                className="w-full rounded-lg border border-[#D6CFC5] bg-white px-3 py-2 text-xs tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Estado da Estrutura e Extensão dos Danos
              </label>
              <textarea
                rows={2}
                value={attendance.opinion.structureStateSummary}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      structureStateSummary: e.target.value,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Interesse do Cliente em Conservar a Peça
              </label>
              <textarea
                rows={2}
                value={attendance.opinion.clientInterestInKeeping}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      clientInterestInKeeping: e.target.value,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Motivos Técnicos da Conclusão
              </label>
              <textarea
                rows={3}
                value={attendance.opinion.reasons}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: { ...attendance.opinion, reasons: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Pendências e O Que Pode Mudar a Conclusão
              </label>
              <textarea
                rows={3}
                value={attendance.opinion.whatCouldChangeConclusion}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      whatCouldChangeConclusion: e.target.value,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Parecer em Linguagem Simples (Para o Relatório do Cliente)
              </label>
              <textarea
                rows={3}
                value={attendance.opinion.clientPlainLanguageSummary}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      clientPlainLanguageSummary: e.target.value,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Próximo Passo Recomendado
              </label>
              <textarea
                rows={3}
                value={attendance.opinion.recommendedNextStep}
                onChange={(e) =>
                  onUpdateDraft({
                    ...attendance,
                    opinion: {
                      ...attendance.opinion,
                      recommendedNextStep: e.target.value,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Section 13: Registro de Danos Ocultos na Oficina */}
          <div className="p-5 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#1C1917]">
                Revisão de Proposta por Danos Ocultos Descobertos na Oficina
              </h3>
              <p className="text-xs text-[#6B6257]">
                Quando surgirem danos ocultos após a desmontagem, registre o aditivo abaixo e colha a aprovação do cliente antes de executar serviços adicionais.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Área Afetada
                </label>
                <select
                  value={newHiddenArea}
                  onChange={(e) => setNewHiddenArea(e.target.value as FurnitureArea)}
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                >
                  {FURNITURE_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Dano Oculto Constatado
                </label>
                <input
                  type="text"
                  value={newHiddenDesc}
                  onChange={(e) => setNewHiddenDesc(e.target.value)}
                  placeholder="Ex: Trinca interna na travessa traseira"
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Serviço Adicional Necessário
                </label>
                <input
                  type="text"
                  value={newHiddenServices}
                  onChange={(e) => setNewHiddenServices(e.target.value)}
                  placeholder="Ex: Substituição da travessa em eucalipto"
                  className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#57534E] mb-1">
                  Valor Adicional (R$)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newHiddenPriceReais}
                    onChange={(e) => setNewHiddenPriceReais(e.target.value)}
                    placeholder="Ex: 180,00"
                    className="w-full rounded border border-[#D6CFC5] bg-white px-2.5 py-1.5 text-xs tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={handleAddHiddenDamage}
                    className="px-3 py-1.5 rounded bg-[#181512] text-white text-xs font-medium whitespace-nowrap"
                  >
                    Registrar
                  </button>
                </div>
              </div>
            </div>

            {attendance.hiddenDamages.length > 0 && (
              <div className="space-y-2 pt-2">
                {attendance.hiddenDamages.map((hd) => (
                  <div
                    key={hd.id}
                    className="p-3 rounded-lg bg-white border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#1C1917]">{hd.affectedArea}: </span>
                      <span>{hd.description}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-[#57534E]">Serviço: {hd.additionalServices}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-semibold tabular-nums">
                        Adicional: {formatCurrencyBRL(hd.additionalPriceCents)}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 font-medium text-[#1C1917]">
                      <input
                        type="checkbox"
                        checked={hd.clientApproved}
                        onChange={(e) => {
                          const updatedList = attendance.hiddenDamages.map((item) =>
                            item.id === hd.id
                              ? {
                                  ...item,
                                  clientApproved: e.target.checked,
                                  clientApprovalDate: e.target.checked
                                    ? new Date().toISOString()
                                    : undefined,
                                  clientApprovalNotes: e.target.checked
                                    ? 'Aprovado pelo cliente antes do serviço adicional'
                                    : undefined,
                                }
                              : item
                          );
                          handleFieldChange('hiddenDamages', updatedList, false);
                        }}
                      />
                      Aprovação do Cliente Confirmada
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
            <button
              type="button"
              onClick={() => setStep(6)}
              className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar para Propostas e Orçamento
            </button>
            <button
              type="button"
              onClick={() => setStep(8)}
              className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-medium flex items-center gap-1.5"
            >
              Avançar para Relatórios PDF A4
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ETAPA 8: RELATÓRIOS PDF A4 E HISTÓRICO DE AUDITORIA */}
      {shouldRenderStep(8) && (
        <section className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6">
          <div className="pb-4 border-b border-[#EFECE6]">
            <h2 className="text-xl font-serif-display font-bold text-[#1C1917]">
              08. Emissão de Relatórios PDF A4 e Histórico de Revisões
            </h2>
            <p className="text-xs text-[#6B6257]">
              Gere os documentos em formato A4 paginado para uso interno da oficina ou para envio ao cliente.
            </p>
          </div>

          {!(attendance.reviewCompleted && attendance.budget.confirmedByResponsible) && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs">
              <strong>Aviso de Avaliação Preliminar incluído automaticamente nos PDFs:</strong>
              <p className="mt-1 italic">
                “Avaliação preliminar por fotos. Serviços e orçamento sujeitos à confirmação pelo responsável da Castros Interiores.”
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#1C1917]">
                  Relatório Técnico Interno (A4)
                </h3>
                <p className="text-xs text-[#57534E]">
                  Documento completo para a oficina e gestão da Castros Interiores. Inclui identificação, fotos numeradas proporcionais, tabela completa das 11 áreas, limitações, avaliação de reaproveitamento, inspeção de espuma, custos internos detalhados, parecer, pendências e responsável pela revisão.
                </p>
              </div>
              <button
                type="button"
                onClick={onGenerateInternalPdf}
                className="w-full py-3 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar Relatório Interno (PDF A4)
              </button>
            </div>

            <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[#1C1917]">
                  Relatório do Cliente (A4)
                </h3>
                <p className="text-xs text-[#57534E]">
                  Documento comercial e técnico claro para apresentação ao cliente. Inclui identificação, resumo dos problemas, fotos relevantes proporcionais, o que pode ser recuperado, substituições indicadas, proposta selecionada ({attendance.selectedProposalTier}), preço de venda confirmado (sem custos internos ou margem), parecer em linguagem simples e próximo passo.
                </p>
              </div>
              <button
                type="button"
                onClick={onGenerateClientPdf}
                className="w-full py-3 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar Relatório do Cliente (PDF A4)
              </button>
            </div>
          </div>

          {/* Audit History Log */}
          <div className="p-5 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] space-y-3">
            <h3 className="text-sm font-bold text-[#1C1917]">
              Histórico de Avaliações e Revisões deste Atendimento
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {attendance.auditHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg bg-white border border-[#E5DEC9] text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-[#1C1917]">{entry.action}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="text-[#57534E]">{entry.details}</span>
                  </div>
                  <div className="text-[11px] text-[#6B6257] tabular-nums shrink-0">
                    {entry.actor} · {new Date(entry.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      <CameraModal
        isOpen={isCameraModalOpen}
        defaultCategory={selectedPhotoCategory}
        defaultFurnitureLabel={photoFurnitureInput || attendance.furnitureType}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(dataUrl, cat, cap, furn) => {
          onUploadPhotoFile(dataUrl, cat, cap, furn);
        }}
      />

      <PhotoLightboxModal
        photo={lightboxPhoto}
        onClose={() => setLightboxPhoto(null)}
      />
    </div>
  );
};
