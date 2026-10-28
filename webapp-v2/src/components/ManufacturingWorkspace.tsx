import React, { useRef, useState } from 'react';
import {
  Layers,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Download,
  Plus,
  Trash2,
  HelpCircle,
  Scissors,
  Check,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Camera,
  Upload,
  Eye,
  Send,
  RotateCcw,
  Clock,
  Printer,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  AttendanceRecord,
  ManufacturingProjectData,
  ManufacturingComponent,
  ManufacturingMaterialRequirement,
  AssemblyManualStep,
  QualityCheckpoint,
  SpecificationSource,
  MaterialCatalogItem,
  WorkshopSettings,
  AttendancePhoto,
  PhotoCategory,
  DepartmentId,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';
import { ResilientImage, PhotoLightboxModal } from './ResilientImage';
import { CameraModal } from './CameraModal';

interface ManufacturingWorkspaceProps {
  attendance: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  geminiConfigured: boolean;
  isSaving: boolean;
  lastSavedSuccessAt: string | null;
  saveError: string | null;
  onUpdateDraft: (updated: AttendanceRecord) => void;
  onPersistAttendance: (recordToSave: AttendanceRecord, logAction?: string, logStage?: string) => Promise<boolean>;
  onUploadPhotoFile: (
    fileOrDataUrl: File | string,
    category: PhotoCategory,
    caption: string,
    furnitureLabel: string,
    existingFailedPhotoId?: string
  ) => Promise<void>;
  onGenerateInternalPdf: () => Promise<void>;
  onGenerateClientPdf: () => Promise<void>;
  onNavigateToDesk?: (deskId: DepartmentId) => void;
}

const MANUFACTURING_STEPS = [
  { id: 1, label: '01. Cadastro & Briefing' },
  { id: 2, label: '02. Referências & Fotos' },
  { id: 3, label: '03. Análise & Projeto Preliminar' },
  { id: 4, label: '04. Revisão do Responsável' },
  { id: 5, label: '05. Peças, Materiais & Corte' },
  { id: 6, label: '06. Custos & Orçamento' },
  { id: 7, label: '07. Manual de Montagem (12 Passos)' },
  { id: 8, label: '08. Ficha Técnica & PDF A4' },
];

const DEFAULT_12_STEPS: AssemblyManualStep[] = [
  {
    stepNumber: 1,
    title: 'Corte e Esquadrejamento da Madeira',
    description: 'Corte preciso dos elementos estruturais de madeira maciça tratada conforme dimensões em mm da lista de peças.',
    piecesUsed: ['P-01', 'P-02', 'P-03', 'P-04'],
    toolsRequired: ['Serra esquadrejadeira', 'Trena milimétrica', 'Esquadro metálico de precisão'],
    sequenceOrder: 1,
    pointsOfAttention: ['Tolerância máxima de corte: +/- 1mm', 'Garantir que as peças estejam livres de nós soltos ou umidade excessiva'],
    qualityCheckCriteria: 'Conferir diagonal do corte para ângulo exato de 90°',
    hasUncertainties: false,
  },
  {
    stepNumber: 2,
    title: 'Montagem do Chassi e Quadro Estrutural',
    description: 'Fixação e colagem das longarinas, travessas frontais, traseiras e laterais da base.',
    piecesUsed: ['P-01', 'P-02', 'P-03', 'P-04'],
    toolsRequired: ['Grampeador pneumático pesado', 'Cola PVA D3 estrutural', 'Grampos de aperto sargento'],
    sequenceOrder: 2,
    pointsOfAttention: ['Distribuir adesivo estrutural uniformemente em todas as respigas e encaixes', 'Manter sob prensagem pelo tempo de cura'],
    qualityCheckCriteria: 'Esquadro perfeito na caixa do chassi',
    hasUncertainties: false,
  },
  {
    stepNumber: 3,
    title: 'Travamento dos Cantos e Reforços de Apoio',
    description: 'Instalação de cantoneiras triangulares maciças nos 4 cantos internos e pontos de fixação dos pés.',
    piecesUsed: ['P-05', 'P-06'],
    toolsRequired: ['Parafusadeira de alto torque', 'Parafusos estruturais autoatarraxantes', 'Cola estrutural'],
    sequenceOrder: 3,
    pointsOfAttention: ['Parafusar com pré-furo para evitar trincamento na madeira', 'Posicionar calço maciço onde receberá a bucha dos pés'],
    qualityCheckCriteria: 'Rigidez torsional completa — sem torção ou jogo',
    hasUncertainties: false,
  },
  {
    stepNumber: 4,
    title: 'Instalação da Sustentação (Percintas / Molas)',
    description: 'Aplicação e tensionamento pneumático das percintas elásticas italianas cruzadas em trama.',
    piecesUsed: ['Percinta Italiana 70mm'],
    toolsRequired: ['Tensionador pneumático de percintas', 'Grampeador pneumático', 'Grampos 14/12'],
    sequenceOrder: 4,
    pointsOfAttention: ['Tensão uniforme entre 70% e 75% da elasticidade nominal', 'Trança entrelaçada em xadrez uniforme no assento'],
    qualityCheckCriteria: 'Deflexão firme e uniforme sob carga sem ceder',
    hasUncertainties: false,
  },
  {
    stepNumber: 5,
    title: 'Aplicação de Forro Protetor e Isolamento',
    description: 'Fixação de tela de ráfia e manta protetora sobre as percintas para proteger as espumas de atrito.',
    piecesUsed: ['Tela ráfia / Feltro agulhado'],
    toolsRequired: ['Grampeador pneumático', 'Tesoura de alfaiate'],
    sequenceOrder: 5,
    pointsOfAttention: ['Esticar sem rugas cobrindo todo o trançado de percintas', 'Evitar contato direto do bloco de espuma com as percintas'],
    qualityCheckCriteria: 'Isolamento completo e fixação firme nas bordas',
    hasUncertainties: false,
  },
  {
    stepNumber: 6,
    title: 'Corte e Colagem das Espumas Estruturais da Base',
    description: 'Corte e aplicação das espumas de suporte (D33/D28) no chassi, bordas e frente do assento.',
    piecesUsed: ['Espuma D33', 'Adesivo de contato para estofaria'],
    toolsRequired: ['Serra fita / Faca elétrica para espuma', 'Pistola de pulverização de cola'],
    sequenceOrder: 6,
    pointsOfAttention: ['Alinhamento no bordo frontal para apoio ergonômico', 'Aguardar evaporação do solvente antes da união'],
    qualityCheckCriteria: 'Borda firme e contínua sem desníveis perceptíveis ao toque',
    hasUncertainties: false,
  },
  {
    stepNumber: 7,
    title: 'Modelagem e Camada de Conforto (Soft / Manta)',
    description: 'Aplicação de espuma soft ou manta siliconada sobre a base para maciez inicial ao sentar.',
    piecesUsed: ['Manta acrílica siliconada 150g', 'Espuma soft D26'],
    toolsRequired: ['Cola spray para estofaria', 'Tesoura'],
    sequenceOrder: 7,
    pointsOfAttention: ['Suavizar todas as quinas e transições da estrutura', 'Evitar dobras na manta'],
    qualityCheckCriteria: 'Toque arredondado e macio em toda a extensão do assento e encosto',
    hasUncertainties: false,
  },
  {
    stepNumber: 8,
    title: 'Corte do Revestimento e Plano de Enfesto',
    description: 'Corte das peças do tecido conforme gabaritos, respeitando o sentido da trama/estampa e margens de costura.',
    piecesUsed: ['Tecido de Revestimento (Larg. 1,40m)'],
    toolsRequired: ['Mesa de enfesto e corte', 'Cortador rotativo', 'Giz de alfaiate', 'Gabaritos'],
    sequenceOrder: 8,
    pointsOfAttention: ['Respeitar sentido padrão vertical do fio do tecido', 'Margem de costura padronizada de 1,5cm em todas as uniões'],
    qualityCheckCriteria: 'Cortes limpos sem desfiamento e medidas idênticas para peças pareadas',
    hasUncertainties: false,
  },
  {
    stepNumber: 9,
    title: 'Costura Técnica, Pespontos, Vivos e Zíperes',
    description: 'União das partes de tecido na máquina de transporte duplo com linha de poliamida nº 40/60.',
    piecesUsed: ['Linha de alta tenacidade', 'Zíperes', 'Vivo de acabamento'],
    toolsRequired: ['Máquina industrial transporte duplo', 'Agulha ponta redonda', 'Guia de costura'],
    sequenceOrder: 9,
    pointsOfAttention: ['Pesponto com passo constante de 4 a 5 pontos por centímetro', 'Reforçar início e fim das costuras com travete'],
    qualityCheckCriteria: 'Linhas retas e pespontos perfeitamente alinhados',
    hasUncertainties: false,
  },
  {
    stepNumber: 10,
    title: 'Tapeçaria e Encapamento da Estrutura',
    description: 'Vestimento da capa sobre a estrutura de madeira estofada, ajuste de tensão e grampeamento final.',
    piecesUsed: ['Capa costurada da estrutura'],
    toolsRequired: ['Grampeador pneumático', 'Puxador de tecido / Espátula de tapeceiro'],
    sequenceOrder: 10,
    pointsOfAttention: ['Tracionar com tensão simétrica de ambos os lados para centralizar as costuras', 'Grampeamento uniforme a cada 2cm'],
    qualityCheckCriteria: 'Ausência total de rugas, repuxos ou desalinhamentos nas costuras',
    hasUncertainties: false,
  },
  {
    stepNumber: 11,
    title: 'Enchimento de Almofadas e Fechamento',
    description: 'Inserção dos blocos de espuma revestidos em TNT nas capas de almofadas e fechamento dos zíperes.',
    piecesUsed: ['Almofadas com capas', 'Forro TNT interno'],
    toolsRequired: ['Compensador de vácuo / Funil de enchimento'],
    sequenceOrder: 11,
    pointsOfAttention: ['Encaixar perfeitamente os cantos das espumas nos bicos das capas', 'Zíperes correndo livremente sem prender tecido'],
    qualityCheckCriteria: 'Almofadas com preenchimento pleno, cantos vivos e toque equilibrado',
    hasUncertainties: false,
  },
  {
    stepNumber: 12,
    title: 'Fixação de Pés, Forro Inferior, Limpeza e Embalagem',
    description: 'Aplicação do forro TNT inferior (poeira), parafusamento dos pés nivelados, limpeza minuciosa e embalagem protetora.',
    piecesUsed: ['Pés', 'Forro inferior TNT 80g', 'Feltros protetores de piso', 'Plástico bolha e papelão'],
    toolsRequired: ['Parafusadeira', 'Nível de bolha', 'Aspirador', 'Escova para estofados'],
    sequenceOrder: 12,
    pointsOfAttention: ['Conferir nivelamento nos 4 pontos de apoio para zero balanço', 'Remover fiapos de linha e resíduos de cola'],
    qualityCheckCriteria: 'Apoio perfeitamente estável e embalagem estanque contra umidade e arranhões',
    hasUncertainties: false,
  },
];

export const ManufacturingWorkspace: React.FC<ManufacturingWorkspaceProps> = ({
  attendance,
  materialsCatalog,
  settings,
  geminiConfigured,
  isSaving,
  lastSavedSuccessAt,
  saveError,
  onUpdateDraft,
  onPersistAttendance,
  onUploadPhotoFile,
  onGenerateInternalPdf,
  onGenerateClientPdf,
  onNavigateToDesk,
}) => {
  const activeStep = attendance.currentStep || 1;
  const [lightboxPhoto, setLightboxPhoto] = useState<AttendancePhoto | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<PhotoCategory>('Foto de Referência Principal');
  const [photoCaptionInput, setPhotoCaptionInput] = useState('');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Inicializar dados do projeto se ainda não existirem
  const project: ManufacturingProjectData = attendance.manufacturingData || {
    id: `mfg-${attendance.id}`,
    modelName: attendance.furnitureType || 'Sofá Fixo sob Medida',
    productCategory: 'Sofá Fixo',
    unitsCount: parseInt(attendance.piecesCount, 10) || 1,
    version: 'v1.0-rascunho',
    technicalDraftStatus: 'rascunho_tecnico',
    dimensions: {
      widthCm: 160,
      depthCm: 88,
      heightCm: 90,
      seatHeightCm: 45,
      seatDepthCm: 56,
      armWidthCm: 15,
      rawText: attendance.approxMeasurements || '160cm (L) x 88cm (P) x 90cm (A)',
      source: 'proposta_pendente',
    },
    finishingWishes: attendance.fabricAndComfortPreference || 'Tecido linho misto, conforto firme D33',
    workshopMethodNotes: attendance.notes || 'Fabricação própria de alta durabilidade com madeira maciça tratada.',
    referencePhotos: [],
    components: [],
    materials: [],
    cuttingPlanSummary: 'Plano de corte padrão de atelier com aproveitamento máximo de 1,40m de largura útil.',
    assemblyManual: {
      modelName: attendance.furnitureType || 'Estofado Sob Encomenda',
      version: 'v1.0',
      status: 'rascunho_tecnico',
      lastUpdatedAt: new Date().toISOString(),
      referenceImages: [],
      steps: DEFAULT_12_STEPS,
      generalPreparationNotes: 'Conferir esquadro e umidade da madeira antes de iniciar a montagem.',
      finalInspectionCriteria: 'Tolerância dimensional de +/- 2mm em relação ao projeto executivo aprovado.',
    },
    qualityCheckpoints: [
      { id: 'qc-1', stage: 'Marcenaria', checkpoint: 'Esquadro das diagonais do chassi', toleranceStandard: 'Diferença máxima de 2mm', checked: false },
      { id: 'qc-2', stage: 'Sustentação', checkpoint: 'Tensão das percintas elásticas', toleranceStandard: 'Tensão homogênea (70-75%)', checked: false },
      { id: 'qc-3', stage: 'Espumação', checkpoint: 'Alinhamento das quinas do assento', toleranceStandard: 'Transição suave sem desnível', checked: false },
      { id: 'qc-4', stage: 'Costura', checkpoint: 'Alinhamento dos vivos e pespontos', toleranceStandard: 'Alinhamento reto sem desvios', checked: false },
      { id: 'qc-5', stage: 'Acabamento', checkpoint: 'Nivelamento dos 4 pés no piso plano', toleranceStandard: 'Zero balanço ou folga', checked: false },
    ],
    aiVisibleObservations: [],
    aiMissingQuestions: [],
  };

  const setStep = (step: number) => {
    const clamped = Math.max(1, Math.min(8, step));
    onUpdateDraft({
      ...attendance,
      currentStep: clamped,
    });
  };

  const handleUpdateProject = (updatedProj: Partial<ManufacturingProjectData>) => {
    const mergedProj = { ...project, ...updatedProj };
    const updatedAttendance: AttendanceRecord = {
      ...attendance,
      furnitureType: mergedProj.modelName || attendance.furnitureType,
      manufacturingData: mergedProj,
      updatedAt: new Date().toISOString(),
    };
    onUpdateDraft(updatedAttendance);
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
        project.modelName || 'Produto Novo'
      );
    }
    setPhotoCaptionInput('');
  };

  // Executar Análise Inteligente do Projeto de Fabricação com Lucas
  const handleRunManufacturingAi = async () => {
    if (isAnalyzingAi) return;
    setIsAnalyzingAi(true);
    setAiAnalysisError(null);

    try {
      const res = await fetch('/api/ai/analyze-manufacturing-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: attendance.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 429) {
          throw new Error('Limite de requisições atingido. Tente novamente em alguns minutos.');
        }
        throw new Error(data.error || 'Falha ao analisar referências do projeto.');
      }

      if (data.project) {
        const nextComponents = (data.project.components || []).map((c: any, idx: number) => ({
          ...c,
          id: c.id || `p-${Date.now()}-${idx}`,
          totalQuantity: (c.quantityPerUnit || 1) * (project.unitsCount ?? 1),
        }));

        const nextMaterials = (data.project.materials || []).map((m: any, idx: number) => {
          const matchedCatalog = materialsCatalog.find(
            (cat) => cat.name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(cat.name.toLowerCase())
          );
          const unitCost = matchedCatalog ? matchedCatalog.unitCostCents : (m.unitCostCents || 5000);
          const totalReq = (m.requiredPerProduct || 1) * (project.unitsCount ?? 1);
          const physicalStock = matchedCatalog?.physicalStock ?? 0;
          const reservedStock = matchedCatalog?.reservedStock ?? 0;
          const availableStock = Math.max(0, physicalStock - reservedStock);
          const toPurchase = Math.max(0, totalReq - availableStock);

          return {
            ...m,
            id: m.id || `mat-${Date.now()}-${idx}`,
            materialId: matchedCatalog?.id,
            totalRequired: totalReq,
            physicalStock,
            availableStock,
            toPurchaseQuantity: toPurchase,
            unitCostCents: unitCost,
            totalCostCents: Math.round(totalReq * unitCost),
            purchaseDisbursementCents: Math.round(toPurchase * unitCost),
          };
        });

        const nextDimensions = {
          ...project.dimensions,
          ...(data.project.dimensions || {}),
        };

        const updatedProj: ManufacturingProjectData = {
          ...project,
          dimensions: nextDimensions,
          components: nextComponents.length > 0 ? nextComponents : project.components,
          materials: nextMaterials.length > 0 ? nextMaterials : project.materials,
          cuttingPlanSummary: data.project.cuttingPlanSummary || project.cuttingPlanSummary,
          aiVisibleObservations: data.project.visibleObservations || [],
          aiMissingQuestions: data.project.missingTechnicalQuestions || [],
          workshopMethodNotes: data.project.manualAssemblyNotes || project.workshopMethodNotes,
        };

        handleUpdateProject(updatedProj);
      }
    } catch (err: any) {
      console.error('Erro na análise de fabricação do Lucas:', err);
      setAiAnalysisError(err.message || 'Erro ao processar análise.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Helpers para adicionar componentes e materiais manualmente
  const handleAddComponent = () => {
    const newCode = `P-${String((project.components?.length || 0) + 1).padStart(2, '0')}`;
    const newComp: ManufacturingComponent = {
      id: `p-${Date.now()}`,
      code: newCode,
      name: 'Novo Componente Estrutural',
      componentType: 'Madeira',
      dimensionsMm: {
        length: 1200,
        width: 70,
        thickness: 25,
      },
      specification: 'Eucalipto tratado seco em estufa',
      quantityPerUnit: 2,
      totalQuantity: 2 * (project.unitsCount ?? 1),
      source: 'informado_cliente',
    };
    handleUpdateProject({
      components: [...(project.components || []), newComp],
    });
  };

  const handleAddMaterial = () => {
    const units = project.unitsCount ?? 1;
    const newMat: ManufacturingMaterialRequirement = {
      id: `mat-${Date.now()}`,
      code: `MAT-${(project.materials?.length || 0) + 1}`,
      name: 'Material Adicional',
      category: 'Material',
      consumptionUnit: 'm',
      requiredPerProduct: 1.5,
      totalRequired: 1.5 * units,
      usableWidthMeters: 1.4,
      justifiedLossPercent: 10,
      physicalStock: 0,
      availableStock: 0,
      toPurchaseQuantity: 1.5 * units,
      effectivePurchasedQuantity: 1.5 * units,
      effectiveConsumedQuantity: 1.5 * units,
      unitCostCents: 4500,
      totalCostCents: Math.round(1.5 * units * 4500),
      purchaseDisbursementCents: Math.round(1.5 * units * 4500),
      source: 'informado_cliente',
    };
    handleUpdateProject({
      materials: [...(project.materials || []), newMat],
    });
  };

  // Cálculo de Custos
  const totalMaterialsCostCents = (project.materials || []).reduce(
    (sum, m) => sum + (m.totalCostCents || 0),
    0
  );
  const totalPurchaseDisbursementCents = (project.materials || []).reduce(
    (sum, m) => sum + (m.purchaseDisbursementCents || 0),
    0
  );

  const finData = attendance.financialData || {
    pricingMethod: 'margem_sobre_venda' as const,
    targetMarginPercent: 30,
    markupMultiplier: 1.45,
    materialsConsumptionCostCents: totalMaterialsCostCents,
    purchaseDisbursementCents: totalPurchaseDisbursementCents,
    laborWorkshopCostCents: 65000 * (project.unitsCount ?? 1),
    ownerLaborCostCents: 25000 * (project.unitsCount ?? 1),
    overheadApportionmentCents: 15000 * (project.unitsCount ?? 1),
    transportFreightCents: 18000,
    taxesCents: 0,
    totalInternalCostCents: 0,
    hasUnknownCosts: false,
    unknownCostDetails: [],
    calculatedPriceCents: 0,
    approvedSellingPriceCents: null,
    proposedDiscountCents: 0,
    finalContractPriceCents: 0,
    internalResponsibleApproved: false,
    clientApproved: false,
    paymentConditions: '50% de entrada na aprovação + 50% na entrega',
    transactions: [],
    totalReceivedCents: 0,
    balanceDueCents: 0,
    realizedCostCents: 0,
    realizedResultCents: 0,
  };

  const internalCostTotal =
    totalMaterialsCostCents +
    (finData.laborWorkshopCostCents || 0) +
    (finData.ownerLaborCostCents || 0) +
    (finData.overheadApportionmentCents || 0) +
    (finData.transportFreightCents || 0);

  const calculatedSellingPrice =
    finData.pricingMethod === 'markup_sobre_custo'
      ? Math.round(internalCostTotal * (finData.markupMultiplier || 1.45))
      : Math.round(internalCostTotal / (1 - (finData.targetMarginPercent || 30) / 100));

  const finalClientPrice = finData.approvedSellingPriceCents || calculatedSellingPrice;

  // Source Badge
  const renderSourceBadge = (source: SpecificationSource) => {
    switch (source) {
      case 'analise_imagem':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            <Eye className="w-3 h-3" /> Visível na foto
          </span>
        );
      case 'informado_cliente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Informado pela Oficina
          </span>
        );
      case 'calculado_tecnico':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">
            <Wrench className="w-3 h-3" /> Calculado tecnicamente
          </span>
        );
      case 'proposta_pendente':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <HelpCircle className="w-3 h-3" /> Proposta pendente de validação
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PROJETO DE FABRICAÇÃO */}
      <header className="rounded-xl bg-[#181512] text-[#F9F6F0] p-6 shadow-md border border-[#2E2722]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2E2722] pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 rounded bg-[#9A7138] text-white font-mono text-xs font-bold tracking-wider">
                {attendance.attendanceNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900/60 text-blue-200 border border-blue-400/40">
                Fabricação Própria — Mesa de Projetos (Lucas)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#2E2722] text-[#D6CFC5]">
                {project.version}
              </span>
              {project.responsibleApproval?.approved ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Projeto Aprovado
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Aguardando Revisão Técnica
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-serif-display font-bold text-white">
              {project.modelName}
            </h1>
            <p className="text-xs text-[#D6CFC5] mt-1">
              Cliente: <strong className="text-white">{attendance.clientName}</strong> · Telefone: {attendance.clientPhone || 'Não informado'} · Quantidade do Lote:{' '}
              <strong className="text-white">{project.unitsCount} unidade(s)</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={onGenerateInternalPdf}
              className="px-3.5 py-2 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-semibold text-white border border-[#57534E] flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#E5DEC9]" />
              Ficha & Manual PDF
            </button>
            <button
              type="button"
              onClick={onGenerateClientPdf}
              className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Proposta Cliente PDF
            </button>
            <button
              type="button"
              onClick={() => onPersistAttendance(attendance, 'Salvo pelo operador', 'Mesa de Projetos')}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Gravando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

        {/* Status de Gravação e Alertas */}
        {lastSavedSuccessAt && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-[#A8A29E]">
            <span>Alterações sincronizadas com o banco local e Firestore em {new Date(lastSavedSuccessAt).toLocaleTimeString('pt-BR')}.</span>
            {saveError && <span className="text-red-400 font-semibold">{saveError}</span>}
          </div>
        )}

        {/* NAVEGADOR DAS 8 ETAPAS DO FLUXO DO LUCAS */}
        <div className="mt-5 pt-4 border-t border-[#2E2722] overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {MANUFACTURING_STEPS.map((s) => {
              const isCurrent = activeStep === s.id;
              const isPast = activeStep > s.id;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#9A7138] text-white shadow'
                      : isPast
                      ? 'bg-[#2E2722] text-[#D6CFC5] hover:bg-[#3D352E]'
                      : 'bg-transparent text-[#A8A29E] hover:bg-[#2E2722]'
                  }`}
                >
                  <span>{s.label}</span>
                  {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (RENDERIZA A ETAPA SELECIONADA) */}
      <main className="rounded-xl bg-white border border-[#E5DEC9] p-6 shadow-sm space-y-6">

        {/* ETAPA 1: CADASTRO E BRIEFING */}
        {activeStep === 1 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 01 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Cadastro, Especificações e Briefing do Modelo
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Definição do cliente, categoria do estofado, quantidade de unidades (lote), dimensões desejadas e acabamentos.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  value={attendance.clientName || ''}
                  onChange={(e) => onUpdateDraft({ ...attendance, clientName: e.target.value })}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={attendance.clientPhone || ''}
                  onChange={(e) => onUpdateDraft({ ...attendance, clientPhone: e.target.value })}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Quantidade de Unidades (Lote) *</label>
                <input
                  type="number"
                  min="1"
                  value={project.unitsCount || 1}
                  onChange={(e) => {
                    const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                    const updatedComps = (project.components || []).map((c) => ({
                      ...c,
                      totalQuantity: c.quantityPerUnit * count,
                    }));
                    const updatedMats = (project.materials || []).map((m) => {
                      const totalReq = (m.requiredPerProduct ?? 1) * count;
                      const toPurchase = Math.max(0, totalReq - (m.availableStock ?? 0));
                      const unitCost = m.unitCostCents ?? 0;
                      return {
                        ...m,
                        totalRequired: totalReq,
                        toPurchaseQuantity: toPurchase,
                        totalCostCents: Math.round(totalReq * unitCost),
                        purchaseDisbursementCents: Math.round(toPurchase * unitCost),
                      };
                    });
                    handleUpdateProject({
                      unitsCount: count,
                      components: updatedComps,
                      materials: updatedMats,
                    });
                  }}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5] font-bold"
                />
              </div>
            </div>

            {/* Categoria e Nome do Modelo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Categoria do Produto</label>
                <select
                  value={project.productCategory}
                  onChange={(e) => handleUpdateProject({ productCategory: e.target.value as any })}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                >
                  <option value="Sofá Fixo">Sofá Fixo</option>
                  <option value="Sofá Retrátil">Sofá Retrátil / Reclinável</option>
                  <option value="Poltrona">Poltrona</option>
                  <option value="Cadeira">Cadeira de Jantar / Banqueta</option>
                  <option value="Puff">Puff / Banco</option>
                  <option value="Cabeceira">Cabeceira Estofada</option>
                  <option value="Estofado Sob Medida">Estofado Especial Sob Medida</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Nome Comercial do Modelo</label>
                <input
                  type="text"
                  value={project.modelName}
                  onChange={(e) => handleUpdateProject({ modelName: e.target.value })}
                  placeholder="Ex: Sofá Fixo 2 Lugares Linho Bege"
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                />
              </div>
            </div>

            {/* Dimensões Desejadas */}
            {(() => {
              const currentDims = {
                widthCm: project.dimensions?.widthCm ?? null,
                depthCm: project.dimensions?.depthCm ?? null,
                heightCm: project.dimensions?.heightCm ?? null,
                seatHeightCm: project.dimensions?.seatHeightCm ?? null,
                seatDepthCm: project.dimensions?.seatDepthCm ?? null,
                armWidthCm: project.dimensions?.armWidthCm ?? null,
                rawText: project.dimensions?.rawText ?? '',
                source: project.dimensions?.source ?? ('informado_cliente' as const),
              };

              return (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#181512] uppercase tracking-wide">
                      Medidas e Dimensões Desejadas pelo Cliente / Projeto
                    </h4>
                    {renderSourceBadge(project.dimensions?.source || 'informado_cliente')}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#6B6257] mb-1">Largura Total (cm)</label>
                      <input
                        type="number"
                        value={project.dimensions?.widthCm || ''}
                        onChange={(e) =>
                          handleUpdateProject({
                            dimensions: {
                              ...currentDims,
                              widthCm: parseFloat(e.target.value) || null,
                            },
                          })
                        }
                        className="w-full rounded border border-[#D6CFC5] p-1.5 text-xs bg-white text-center font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#6B6257] mb-1">Profundidade (cm)</label>
                      <input
                        type="number"
                        value={project.dimensions?.depthCm || ''}
                        onChange={(e) =>
                          handleUpdateProject({
                            dimensions: {
                              ...currentDims,
                              depthCm: parseFloat(e.target.value) || null,
                            },
                          })
                        }
                        className="w-full rounded border border-[#D6CFC5] p-1.5 text-xs bg-white text-center font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#6B6257] mb-1">Altura Total (cm)</label>
                      <input
                        type="number"
                        value={project.dimensions?.heightCm || ''}
                        onChange={(e) =>
                          handleUpdateProject({
                            dimensions: {
                              ...currentDims,
                              heightCm: parseFloat(e.target.value) || null,
                            },
                          })
                        }
                        className="w-full rounded border border-[#D6CFC5] p-1.5 text-xs bg-white text-center font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#6B6257] mb-1">Altura Assento (cm)</label>
                      <input
                        type="number"
                        value={project.dimensions?.seatHeightCm || ''}
                        onChange={(e) =>
                          handleUpdateProject({
                            dimensions: {
                              ...currentDims,
                              seatHeightCm: parseFloat(e.target.value) || null,
                            },
                          })
                        }
                        className="w-full rounded border border-[#D6CFC5] p-1.5 text-xs bg-white text-center font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#6B6257] mb-1">Prof. Assento (cm)</label>
                      <input
                        type="number"
                        value={project.dimensions?.seatDepthCm || ''}
                        onChange={(e) =>
                          handleUpdateProject({
                            dimensions: {
                              ...currentDims,
                              seatDepthCm: parseFloat(e.target.value) || null,
                            },
                          })
                        }
                        className="w-full rounded border border-[#D6CFC5] p-1.5 text-xs bg-white text-center font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#6B6257] mb-1">Largura Braço (cm)</label>
                      <input
                        type="number"
                        value={project.dimensions?.armWidthCm || ''}
                        onChange={(e) =>
                          handleUpdateProject({
                            dimensions: {
                              ...currentDims,
                              armWidthCm: parseFloat(e.target.value) || null,
                            },
                          })
                        }
                        className="w-full rounded border border-[#D6CFC5] p-1.5 text-xs bg-white text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Acabamentos Desejados e Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Preferências de Tecido, Conforto e Pés
                </label>
                <textarea
                  rows={3}
                  value={project.finishingWishes}
                  onChange={(e) => handleUpdateProject({ finishingWishes: e.target.value })}
                  placeholder="Ex: Tecido linho misto bege claro, vivo nos braços, pés em madeira maciça jequitibá 12cm..."
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Observações Técnicas do Briefing
                </label>
                <textarea
                  rows={3}
                  value={project.workshopMethodNotes}
                  onChange={(e) => handleUpdateProject({ workshopMethodNotes: e.target.value })}
                  placeholder="Ex: O cliente tem restrição de vão de porta (80cm) para passagem do sofá..."
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                />
              </div>
            </div>
          </section>
        )}

        {/* ETAPA 2: REFERÊNCIAS E FOTOS */}
        {activeStep === 2 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 02 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Referências Visuais, Desenhos e Fotos de Inspiração
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Adicione fotos de referência do modelo, croquis de projeto, vista explodida e detalhes desejados para reprodução.
                </p>
              </div>
            </div>

            {/* Aviso Obrigatório sobre Fotos na Fabricação */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Diretriz da Fabricação Castros Interiores:</strong>
                <p className="mt-0.5 text-blue-800">
                  A fotografia serve como referência visual estética para reproduzir a aparência externa do modelo.
                  Medidas estruturais em mm, tipo de madeiramento, densidade de espumas e ferragens internas exigem especificação confirmada da oficina e não são inferidas das fotos.
                </p>
              </div>
            </div>

            {/* Formulário de Upload */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-4">
              <h4 className="font-bold text-xs text-[#181512] uppercase tracking-wide">
                Adicionar Nova Foto de Referência ou Desenho
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[#6B6257] mb-1">Categoria da Referência</label>
                  <select
                    value={selectedPhotoCategory}
                    onChange={(e) => setSelectedPhotoCategory(e.target.value as PhotoCategory)}
                    className="w-full rounded-lg border border-[#D6CFC5] p-2 text-xs bg-white"
                  >
                    <option value="Foto de Referência Principal">Foto de Referência Principal</option>
                    <option value="Detalhe de Acabamento e Costura">Detalhe de Acabamento e Costura</option>
                    <option value="Desenho Técnico / Croqui">Desenho Técnico / Croqui</option>
                    <option value="Vista Explodida">Vista Explodida</option>
                    <option value="Frente">Vista Frontal</option>
                    <option value="Laterais">Vista Lateral</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[#6B6257] mb-1">Legenda / Descrição da Referência</label>
                  <input
                    type="text"
                    value={photoCaptionInput}
                    onChange={(e) => setPhotoCaptionInput(e.target.value)}
                    placeholder="Ex: Detalhe do vivo rebatido no braço do sofá de referência"
                    className="w-full rounded-lg border border-[#D6CFC5] p-2 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={handleMultipleFilesSelected}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={mobileCameraInputRef}
                  capture="environment"
                  accept="image/*"
                  onChange={handleMultipleFilesSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Carregar Fotos / Desenhos
                </button>

                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="px-4 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4 text-[#9A7138]" />
                  Fotografar na Oficina (Câmera)
                </button>
              </div>
            </div>

            {/* Galeria de Fotos */}
            <div>
              <h4 className="font-bold text-xs text-[#181512] uppercase tracking-wide mb-3">
                Fotos de Referência Cadastradas ({attendance.photos.length})
              </h4>

              {attendance.photos.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[#D6CFC5] bg-[#FAF8F5]">
                  <Camera className="w-8 h-8 text-[#9A7138] mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-[#6B6257]">
                    Nenhuma foto de referência anexada ainda. Adicione fotos do modelo ou croquis para alimentar a análise técnica de Lucas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {attendance.photos.map((ph) => (
                    <div
                      key={ph.id}
                      className="rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] overflow-hidden flex flex-col group relative"
                    >
                      <div
                        className="relative aspect-4/3 bg-stone-200 cursor-pointer overflow-hidden"
                        onClick={() => setLightboxPhoto(ph)}
                      >
                        <ResilientImage
                          src={ph.imageUrl}
                          alt={ph.caption}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#181512]/80 text-white">
                          {ph.code}
                        </span>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#9A7138] uppercase block">
                            {ph.category}
                          </span>
                          <p className="text-xs text-[#181512] font-medium line-clamp-2 mt-0.5">
                            {ph.caption}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#EFECE6]">
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto(ph)}
                            className="text-[11px] font-semibold text-[#181512] hover:text-[#9A7138] flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedPhotos = attendance.photos.filter((p) => p.id !== ph.id);
                              onUpdateDraft({ ...attendance, photos: updatedPhotos });
                            }}
                            className="text-[11px] font-semibold text-red-700 hover:text-red-900 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ETAPA 3: ANÁLISE DO MODELO E PROJETO PRELIMINAR */}
        {activeStep === 3 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 03 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Análise do Modelo e Projeto Preliminar
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Diferenciação clara entre o que é visível nas referências, o que foi informado pela oficina e propostas técnicas pendentes de validação.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunManufacturingAi}
                disabled={isAnalyzingAi}
                className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 shadow self-start sm:self-auto"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzingAi ? 'Analisando Referências...' : 'Analisar Referências com Lucas IA'}
              </button>
            </div>

            {aiAnalysisError && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Aviso sobre a análise:</strong>
                  <p className="mt-1">{aiAnalysisError}</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Todos os formulários, medidas e dados preenchidos permanecem preservados integralmente.
                  </p>
                </div>
              </div>
            )}

            {/* Quatro Categorias de Informação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Características Visíveis na Foto */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#181512] uppercase tracking-wide flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    Características Visíveis na Foto
                  </h4>
                  {renderSourceBadge('analise_imagem')}
                </div>

                <div className="space-y-1.5 text-xs text-[#57534E]">
                  {(project.aiVisibleObservations && project.aiVisibleObservations.length > 0) ? (
                    project.aiVisibleObservations.map((obs, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded border border-[#EFECE6]">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{obs}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#A8A29E] italic p-2">
                      Nenhuma observação automática ainda. Clique no botão de análise acima para extrair traços visuais das fotos.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. Dúvidas Técnicas & Informações Faltantes */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#181512] uppercase tracking-wide flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    Perguntas & Informações Faltantes
                  </h4>
                  {renderSourceBadge('proposta_pendente')}
                </div>

                <div className="space-y-1.5 text-xs text-[#57534E]">
                  {(project.aiMissingQuestions && project.aiMissingQuestions.length > 0) ? (
                    project.aiMissingQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-amber-50/70 p-2 rounded border border-amber-200 text-amber-900">
                        <span className="font-bold text-amber-700">?</span>
                        <span>{q}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#A8A29E] italic p-2">
                      Nenhuma pendência técnica listada.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Dimensões Preliminares Propostas (Editáveis) */}
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-[#181512] uppercase tracking-wide">
                  Dimensões Preliminares do Projeto (Editáveis)
                </h4>
                {renderSourceBadge(project.dimensions?.source || 'calculado_tecnico')}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <span className="text-[11px] text-[#6B6257] block">Largura</span>
                  <span className="font-mono text-sm font-bold text-[#181512]">{project.dimensions?.widthCm || 0} cm</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B6257] block">Profundidade</span>
                  <span className="font-mono text-sm font-bold text-[#181512]">{project.dimensions?.depthCm || 0} cm</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B6257] block">Altura</span>
                  <span className="font-mono text-sm font-bold text-[#181512]">{project.dimensions?.heightCm || 0} cm</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B6257] block">Assento Alt.</span>
                  <span className="font-mono text-sm text-[#181512]">{project.dimensions?.seatHeightCm || 0} cm</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B6257] block">Assento Prof.</span>
                  <span className="font-mono text-sm text-[#181512]">{project.dimensions?.seatDepthCm || 0} cm</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#6B6257] block">Braço Larg.</span>
                  <span className="font-mono text-sm text-[#181512]">{project.dimensions?.armWidthCm || 0} cm</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ETAPA 4: REVISÃO DO PROJETO PELO RESPONSÁVEL */}
        {activeStep === 4 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 04 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Revisão e Validação do Projeto pelo Responsável Técnico
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Aprovação formal do projeto executivo antes do corte e liberação para compra de materiais.
                </p>
              </div>
            </div>

            {/* Painel de Status de Aprovação */}
            <div className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              project.responsibleApproval?.approved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-start gap-3">
                {project.responsibleApproval?.approved ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-7 h-7 text-amber-600 shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-sm">
                    {project.responsibleApproval?.approved
                      ? `Projeto Aprovado para Fabricação (${project.responsibleApproval.version})`
                      : 'Projeto Aguardando Revisão e Homologação Técnica'}
                  </h3>
                  <p className="text-xs mt-0.5">
                    {project.responsibleApproval?.approved
                      ? `Homologado por ${project.responsibleApproval.approvedBy} em ${new Date(project.responsibleApproval.approvedAt).toLocaleDateString('pt-BR')}`
                      : 'Nenhuma peça deve ser cortada antes da validação formal do responsável técnico da marcenaria e tapeçaria.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!project.responsibleApproval?.approved ? (
                  <button
                    type="button"
                    onClick={() => {
                      const approver = settings.responsibleDefaultName || 'Responsável Técnico Castros';
                      handleUpdateProject({
                        version: 'v1.0-aprovada',
                        technicalDraftStatus: 'aprovado_responsavel',
                        responsibleApproval: {
                          approved: true,
                          approvedBy: approver,
                          approvedAt: new Date().toISOString(),
                          version: 'v1.0-aprovada',
                          notes: project.responsibleApproval?.notes || 'Projeto verificado e aprovado para corte e produção.',
                        },
                      });
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white flex items-center gap-1.5 shadow"
                  >
                    <Check className="w-4 h-4" />
                    Aprovar Projeto Técnico
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateProject({
                        technicalDraftStatus: 'aguardando_validacao',
                        responsibleApproval: {
                          ...project.responsibleApproval!,
                          approved: false,
                        },
                      });
                    }}
                    className="px-3.5 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-xs font-semibold text-red-800 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Devolver para Ajustes
                  </button>
                )}
              </div>
            </div>

            {/* Dados da Homologação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Responsável Técnico pela Validação</label>
                <input
                  type="text"
                  value={project.responsibleApproval?.approvedBy || settings.responsibleDefaultName || ''}
                  onChange={(e) =>
                    handleUpdateProject({
                      responsibleApproval: {
                        approved: project.responsibleApproval?.approved || false,
                        approvedBy: e.target.value,
                        approvedAt: project.responsibleApproval?.approvedAt || new Date().toISOString(),
                        version: project.version,
                        notes: project.responsibleApproval?.notes || '',
                      },
                    })
                  }
                  placeholder="Nome do avaliador responsável"
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Versão do Projeto</label>
                <input
                  type="text"
                  value={project.version}
                  onChange={(e) => handleUpdateProject({ version: e.target.value })}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">Estado do Rascunho</label>
                <select
                  value={project.technicalDraftStatus}
                  onChange={(e) => handleUpdateProject({ technicalDraftStatus: e.target.value as any })}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
                >
                  <option value="rascunho_tecnico">Rascunho Preliminar</option>
                  <option value="aguardando_validacao">Aguardando Validação da Oficina</option>
                  <option value="aprovado_responsavel">Aprovado pelo Responsável</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">Notas de Revisão e Diretrizes da Oficina</label>
              <textarea
                rows={3}
                value={project.responsibleApproval?.notes || ''}
                onChange={(e) =>
                  handleUpdateProject({
                    responsibleApproval: {
                      approved: project.responsibleApproval?.approved || false,
                      approvedBy: project.responsibleApproval?.approvedBy || '',
                      approvedAt: project.responsibleApproval?.approvedAt || new Date().toISOString(),
                      version: project.version,
                      notes: e.target.value,
                    },
                  })
                }
                placeholder="Ex: Verificar lote de eucalipto seco; reforçar o apoio central do chassi por causa do vão livre..."
                className="w-full rounded-lg border border-[#D6CFC5] p-2.5 text-xs bg-[#FAF8F5]"
              />
            </div>
          </section>
        )}

        {/* ETAPA 5: PEÇAS, MATERIAIS E PLANO DE CORTE */}
        {activeStep === 5 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 05 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Lista de Peças em mm, Materiais e Plano de Corte
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Componentes dimensionados em mm por unidade e por lote ({project.unitsCount} un), consumo com largura útil (1,40m) e verificação de estoque.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Peça (mm)
                </button>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Material
                </button>
              </div>
            </div>

            {/* TABELA DE COMPONENTES ESTRUTURAIS EM MM */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wide text-[#181512] flex items-center justify-between">
                <span>Peças da Estrutura (Dimensões em mm)</span>
                <span className="text-[11px] text-[#6B6257] font-normal">
                  Total multiplicado pelo lote: <strong className="text-[#181512]">{project.unitsCount} unidade(s)</strong>
                </span>
              </h3>

              <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#181512] text-[#F9F6F0]">
                      <th className="p-2.5">Código</th>
                      <th className="p-2.5">Nome da Peça</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Dimensões em mm (C x L x E)</th>
                      <th className="p-2.5">Especificação</th>
                      <th className="p-2.5 text-center">Qtd/Un</th>
                      <th className="p-2.5 text-center">Total Lote</th>
                      <th className="p-2.5">Origem</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {(project.components && project.components.length > 0) ? (
                      project.components.map((c, idx) => (
                        <tr key={c.id || idx} className="hover:bg-[#FAF8F5]">
                          <td className="p-2.5 font-mono font-bold text-[#181512]">{c.code}</td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => {
                                const comps = [...project.components];
                                comps[idx] = { ...comps[idx], name: e.target.value };
                                handleUpdateProject({ components: comps });
                              }}
                              className="w-full bg-transparent border-b border-dashed border-[#D6CFC5] p-1 text-xs"
                            />
                          </td>
                          <td className="p-2.5">{c.componentType}</td>
                          <td className="p-2.5 font-mono">
                            {c.dimensionsMm?.length || '-'} x {c.dimensionsMm?.width || '-'} x {c.dimensionsMm?.thickness || '-'} mm
                          </td>
                          <td className="p-2.5 text-[#6B6257]">{c.specification}</td>
                          <td className="p-2.5 text-center font-bold">{c.quantityPerUnit}</td>
                          <td className="p-2.5 text-center font-bold text-[#9A7138]">{c.totalQuantity}</td>
                          <td className="p-2.5">{renderSourceBadge(c.source)}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const comps = project.components.filter((_, i) => i !== idx);
                                handleUpdateProject({ components: comps });
                              }}
                              className="text-red-700 hover:text-red-900 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-[#A8A29E] italic">
                          Nenhum componente listado. Clique em "Nova Peça" ou execute a Análise do Lucas na Etapa 3.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABELA DE MATERIAIS E INSUMOS COM ESTOQUE E COMPRAS */}
            <div className="space-y-3 pt-4 border-t border-[#EFECE6]">
              <h3 className="font-bold text-xs uppercase tracking-wide text-[#181512] flex items-center justify-between">
                <span>Materiais, Tecidos (1,40m útil) e Suprimentos</span>
                <span className="text-[11px] text-[#6B6257] font-normal">
                  Consumo Total vs Estoque Disponível
                </span>
              </h3>

              <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#181512] text-[#F9F6F0]">
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5">Larg. Útil / Perda</th>
                      <th className="p-2.5 text-center">Consumo Un</th>
                      <th className="p-2.5 text-center">Total Lote</th>
                      <th className="p-2.5 text-center">Estoque Disp.</th>
                      <th className="p-2.5 text-center">Comprar</th>
                      <th className="p-2.5 text-right">Custo Unit.</th>
                      <th className="p-2.5 text-right">Custo Total</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {(project.materials && project.materials.length > 0) ? (
                      project.materials.map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-[#FAF8F5]">
                          <td className="p-2.5 font-medium text-[#181512]">{m.name}</td>
                          <td className="p-2.5 text-[#6B6257]">
                            {m.usableWidthMeters ? `${m.usableWidthMeters}m útil` : 'N/A'} · +{m.justifiedLossPercent || 10}% perda
                          </td>
                          <td className="p-2.5 text-center">
                            {m.requiredPerProduct} {m.consumptionUnit}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {m.totalRequired} {m.consumptionUnit}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              (m.availableStock ?? 0) >= (m.totalRequired ?? 0)
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}>
                              {m.availableStock ?? 0} {m.consumptionUnit}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              (m.toPurchaseQuantity ?? 0) > 0
                                ? 'bg-red-100 text-red-900 font-mono'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}>
                              {(m.toPurchaseQuantity ?? 0) > 0 ? `${m.toPurchaseQuantity} ${m.consumptionUnit}` : 'OK'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {formatCurrencyBRL(m.unitCostCents)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#181512]">
                            {formatCurrencyBRL(m.totalCostCents)}
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const mats = (project.materials || []).filter((_, i) => i !== idx);
                                handleUpdateProject({ materials: mats });
                              }}
                              className="text-red-700 hover:text-red-900 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-4 text-center text-[#A8A29E] italic">
                          Nenhum material cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Resumo do Plano de Corte */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-2 mt-4">
                <h4 className="font-bold text-xs uppercase text-[#181512] flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-[#9A7138]" />
                  Diretrizes do Plano de Corte e Encaixe
                </h4>
                <textarea
                  rows={2}
                  value={project.cuttingPlanSummary || ''}
                  onChange={(e) => handleUpdateProject({ cuttingPlanSummary: e.target.value })}
                  className="w-full rounded-lg border border-[#D6CFC5] p-2 text-xs bg-white"
                  placeholder="Instruções de corte, sentido do fio e aproveitamento..."
                />
              </div>
            </div>
          </section>
        )}

        {/* ETAPA 6: CUSTOS E PROPOSTA DE ORÇAMENTO */}
        {activeStep === 6 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 06 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Custos Internos e Proposta de Orçamento Comercial
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Integração com a mesa da Mila: custos diretos, indiretos e frete separados da proposta apresentada ao cliente.
                </p>
              </div>
            </div>

            {/* SEPARAÇÃO: PAINEL INTERNO VS PROPOSTA CLIENTE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Custos Internos da Oficina (Confidencial) */}
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5DEC9]">
                  <h3 className="font-bold text-xs uppercase tracking-wide text-[#181512] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#9A7138]" />
                    Custos Internos da Oficina (Confidencial)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5DEC9] text-[#181512]">
                    Interno
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#EFECE6]">
                    <span className="text-[#57534E]">Consumo de Materiais e Insumos</span>
                    <span className="font-mono font-bold">{formatCurrencyBRL(totalMaterialsCostCents)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#EFECE6]">
                    <span className="text-[#57534E]">Mão de Obra Tapeçaria/Costura (Oficina)</span>
                    <span className="font-mono font-bold">{formatCurrencyBRL(finData.laborWorkshopCostCents || 0)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#EFECE6]">
                    <span className="text-[#57534E]">Mão de Obra do Mestre/Proprietário</span>
                    <span className="font-mono font-bold">{formatCurrencyBRL(finData.ownerLaborCostCents || 0)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#EFECE6]">
                    <span className="text-[#57534E]">Rateio de Custos Fixos</span>
                    <span className="font-mono font-bold">{formatCurrencyBRL(finData.overheadApportionmentCents || 0)}</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-[#EFECE6]">
                    <span className="text-[#57534E]">Transporte / Coleta / Entrega</span>
                    <span className="font-mono font-bold">{formatCurrencyBRL(finData.transportFreightCents || 0)}</span>
                  </div>

                  <div className="flex justify-between pt-2 text-sm font-bold text-[#181512]">
                    <span>Custo Total Interno Apurado</span>
                    <span className="font-mono text-emerald-800">{formatCurrencyBRL(internalCostTotal)}</span>
                  </div>
                </div>

                {/* Método de Precificação */}
                <div className="pt-3 border-t border-[#E5DEC9] space-y-3">
                  <span className="block text-xs font-bold text-[#181512]">Método de Formação de Preço</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const updatedFin = { ...finData, pricingMethod: 'margem_sobre_venda' as const };
                        onUpdateDraft({ ...attendance, financialData: updatedFin });
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-left ${
                        finData.pricingMethod === 'margem_sobre_venda'
                          ? 'border-[#9A7138] bg-amber-50 text-[#181512]'
                          : 'border-[#D6CFC5] bg-white text-[#6B6257]'
                      }`}
                    >
                      <span className="block font-bold">Margem s/ Venda</span>
                      <span className="text-[11px] opacity-75">{finData.targetMarginPercent}% margem</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updatedFin = { ...finData, pricingMethod: 'markup_sobre_custo' as const };
                        onUpdateDraft({ ...attendance, financialData: updatedFin });
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-semibold text-left ${
                        finData.pricingMethod === 'markup_sobre_custo'
                          ? 'border-[#9A7138] bg-amber-50 text-[#181512]'
                          : 'border-[#D6CFC5] bg-white text-[#6B6257]'
                      }`}
                    >
                      <span className="block font-bold">Markup s/ Custo</span>
                      <span className="text-[11px] opacity-75">{finData.markupMultiplier}x multiplicador</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Proposta Comercial Apresentada ao Cliente */}
              <div className="p-5 rounded-xl bg-white border border-[#9A7138] shadow space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6]">
                  <h3 className="font-bold text-xs uppercase tracking-wide text-[#9A7138] flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Proposta Comercial ao Cliente
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9A7138] text-white">
                    Visível no PDF do Cliente
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#FAF8F5] text-center space-y-1">
                    <span className="text-xs text-[#6B6257] uppercase font-semibold">Valor Total da Proposta ({project.unitsCount ?? 1} un)</span>
                    <div className="text-3xl font-serif-display font-bold text-[#181512]">
                      {formatCurrencyBRL(finalClientPrice)}
                    </div>
                    {(project.unitsCount ?? 1) > 1 && (
                      <span className="text-xs text-[#6B6257] block">
                        ({formatCurrencyBRL(Math.round(finalClientPrice / (project.unitsCount || 1)))} por unidade)
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Preço Aprovado Manualmente pelo Responsável (Opcional)
                    </label>
                    <input
                      type="number"
                      value={finData.approvedSellingPriceCents ? finData.approvedSellingPriceCents / 100 : ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const cents = isNaN(val) ? null : Math.round(val * 100);
                        const updatedFin = { ...finData, approvedSellingPriceCents: cents };
                        onUpdateDraft({ ...attendance, financialData: updatedFin });
                      }}
                      placeholder={`Calculado: ${formatCurrencyBRL(calculatedSellingPrice)}`}
                      className="w-full rounded-lg border border-[#D6CFC5] p-2 text-xs bg-[#FAF8F5] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Condições de Pagamento
                    </label>
                    <input
                      type="text"
                      value={finData.paymentConditions || ''}
                      onChange={(e) => {
                        const updatedFin = { ...finData, paymentConditions: e.target.value };
                        onUpdateDraft({ ...attendance, financialData: updatedFin });
                      }}
                      className="w-full rounded-lg border border-[#D6CFC5] p-2 text-xs bg-[#FAF8F5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Prazo Estimado de Entrega
                    </label>
                    <input
                      type="text"
                      value={attendance.budget?.estimatedDeadline || '15 a 20 dias úteis'}
                      onChange={(e) => {
                        onUpdateDraft({
                          ...attendance,
                          budget: {
                            ...attendance.budget,
                            estimatedDeadline: e.target.value,
                          },
                        });
                      }}
                      className="w-full rounded-lg border border-[#D6CFC5] p-2 text-xs bg-[#FAF8F5]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ETAPA 7: MANUAL DE FABRICAÇÃO E MONTAGEM (12 PASSOS) */}
        {activeStep === 7 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 07 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Manual de Fabricação e Montagem (12 Passos Padronizados)
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Sequência executiva da bancada Castros Interiores com ferramentas necessárias, peças e conferência de tolerância em mm.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(project.assemblyManual?.steps || DEFAULT_12_STEPS).map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EFECE6]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#181512] text-white flex items-center justify-center font-bold text-xs">
                        {step.stepNumber}
                      </span>
                      <h4 className="font-bold text-xs text-[#181512]">{step.title}</h4>
                    </div>

                    <span className="text-[11px] font-semibold text-[#9A7138]">
                      Tolerância: {step.qualityCheckCriteria}
                    </span>
                  </div>

                  <p className="text-xs text-[#57534E]">{step.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-[#EFECE6]">
                      <span className="text-[10px] font-bold uppercase text-[#6B6257] block mb-1">
                        Ferramentas & Equipamentos
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {step.toolsRequired.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-stone-100 text-[#181512]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#EFECE6]">
                      <span className="text-[10px] font-bold uppercase text-[#6B6257] block mb-1">
                        Pontos de Atenção na Bancada
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-[#57534E] space-y-0.5">
                        {step.pointsOfAttention.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkpoints de Qualidade */}
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wide text-[#181512]">
                Checkpoints de Qualidade com Tolerância Milimétrica
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(project.qualityCheckpoints || []).map((qc) => (
                  <label
                    key={qc.id}
                    className="p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] flex items-start gap-2.5 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={qc.checked}
                      onChange={(e) => {
                        const updated = project.qualityCheckpoints.map((q) =>
                          q.id === qc.id ? { ...q, checked: e.target.checked } : q
                        );
                        handleUpdateProject({ qualityCheckpoints: updated });
                      }}
                      className="rounded border-[#D6CFC5] text-[#9A7138] focus:ring-[#9A7138] mt-0.5"
                    />
                    <div>
                      <span className="font-bold block text-[#181512]">{qc.checkpoint}</span>
                      <span className="text-[11px] text-[#6B6257] block mt-0.5">
                        Padrão: {qc.toleranceStandard}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ETAPA 8: RELATÓRIO E EXPORTAÇÃO PDF A4 */}
        {activeStep === 8 && (
          <section className="space-y-6">
            <div className="pb-4 border-b border-[#EFECE6] flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7138]">Etapa 08 de 08</span>
                <h2 className="text-xl font-serif-display font-bold text-[#181512]">
                  Relatório Consolidado e Exportação PDF A4
                </h2>
                <p className="text-xs text-[#6B6257]">
                  Emissão da ficha técnica de fabricação com manual de montagem para a bancada e proposta comercial em PDF para o cliente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documento 1: Ficha Técnica Interna */}
              <div className="p-6 rounded-xl border border-[#181512] bg-[#FAF8F5] space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5DEC9]">
                    <span className="font-bold text-xs uppercase tracking-wide text-[#181512]">
                      Documento da Oficina (Interno)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181512] text-white">
                      PDF A4 Completo
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#181512] mt-3">
                    Ficha Técnica & Manual de Fabricação
                  </h3>
                  <p className="text-xs text-[#6B6257] mt-1">
                    Inclui dimensões em mm, lista de peças codificadas por unidade e por lote, relação de tecidos (1,40m útil), plano de corte, 12 passos do manual e custos apurados.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onGenerateInternalPdf}
                  className="w-full py-3 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-xs font-semibold text-white flex items-center justify-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  Baixar Ficha Técnica & Manual (PDF A4)
                </button>
              </div>

              {/* Documento 2: Proposta Comercial ao Cliente */}
              <div className="p-6 rounded-xl border border-[#9A7138] bg-white space-y-4 flex flex-col justify-between shadow">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6]">
                    <span className="font-bold text-xs uppercase tracking-wide text-[#9A7138]">
                      Proposta do Cliente (Comercial)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#9A7138] text-white">
                      PDF A4 Comercial
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#181512] mt-3">
                    Orçamento & Especificação de Fabricação
                  </h3>
                  <p className="text-xs text-[#6B6257] mt-1">
                    Apresentação executiva sem margens internas: fotos do modelo, especificações de conforto, valor de investimento final, condições de pagamento e garantias.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onGenerateClientPdf}
                  className="w-full py-3 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center justify-center gap-2 shadow"
                >
                  <Download className="w-4 h-4" />
                  Baixar Proposta Comercial (PDF A4)
                </button>
              </div>
            </div>

            {/* Ação de Encaminhamento para Outras Mesas */}
            {onNavigateToDesk && (
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-xs text-[#181512]">
                    Encaminhar Projeto para Outras Mesas do Escritório
                  </h4>
                  <p className="text-xs text-[#6B6257]">
                    Direcione este pedido para Ana (Compras) cotar insumos ou Mila (Financeiro) para emissão de nota e cobrança.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToDesk('lucas_projetos')}
                  className="px-4 py-2.5 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-4 h-4 text-[#9A7138]" />
                  Acessar Escritório de Agentes
                </button>
              </div>
            )}
          </section>
        )}

        {/* NAVEGAÇÃO ANTERIOR / PRÓXIMO */}
        <div className="flex items-center justify-between pt-6 border-t border-[#EFECE6]">
          <button
            type="button"
            disabled={activeStep <= 1}
            onClick={() => setStep(activeStep - 1)}
            className="px-4 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] disabled:opacity-40 text-xs font-semibold text-[#181512] flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Etapa Anterior
          </button>

          <span className="text-xs text-[#6B6257] font-medium">
            Etapa {activeStep} de 8 — {MANUFACTURING_STEPS[activeStep - 1]?.label}
          </span>

          <button
            type="button"
            disabled={activeStep >= 8}
            onClick={() => setStep(activeStep + 1)}
            className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            Próxima Etapa
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <PhotoLightboxModal
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}

      {/* Modal de Câmera */}
      {isCameraModalOpen && (
        <CameraModal
          isOpen={isCameraModalOpen}
          defaultCategory={selectedPhotoCategory}
          defaultFurnitureLabel={project.modelName}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={async (dataUrl, cat, caption, label) => {
            setIsCameraModalOpen(false);
            await onUploadPhotoFile(
              dataUrl,
              cat,
              caption || `${selectedPhotoCategory} — Foto tirada na oficina`,
              label || project.modelName
            );
          }}
        />
      )}
    </div>
  );
};
