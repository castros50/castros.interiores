export type AttendanceStatus =
  | 'Rascunho'
  | 'Aguardando fotos'
  | 'Pronto para análise'
  | 'Análise preliminar concluída'
  | 'Aguardando inspeção'
  | 'Revisado pelo responsável'
  | 'Concluído'
  | 'em_andamento'
  | 'aguardando_aprovacao'
  | 'aguardando_informacao'
  | 'novo';

export type PhotoCategory =
  | 'Frente'
  | 'Costas'
  | 'Laterais'
  | 'Assento'
  | 'Encosto'
  | 'Braços'
  | 'Pés e base'
  | 'Parte inferior'
  | 'Detalhes dos defeitos'
  | 'Estrutura interna fotografada pela oficina'
  | 'Foto de Referência Principal'
  | 'Detalhe de Acabamento e Costura'
  | 'Desenho Técnico / Croqui'
  | 'Vista Explodida';

export const PHOTO_CATEGORIES: PhotoCategory[] = [
  'Frente',
  'Costas',
  'Laterais',
  'Assento',
  'Encosto',
  'Braços',
  'Pés e base',
  'Parte inferior',
  'Detalhes dos defeitos',
  'Estrutura interna fotografada pela oficina',
  'Foto de Referência Principal',
  'Detalhe de Acabamento e Costura',
  'Desenho Técnico / Croqui',
  'Vista Explodida',
];

export type FurnitureArea =
  | 'Estrutura'
  | 'Base e pés'
  | 'Assento'
  | 'Encosto'
  | 'Braços'
  | 'Tecido e costuras'
  | 'Espumas e enchimentos'
  | 'Percintas, molas e sustentação'
  | 'Ferragens'
  | 'Mecanismos retráteis ou reclináveis'
  | 'Forro inferior e acabamentos';

export const FURNITURE_AREAS: FurnitureArea[] = [
  'Estrutura',
  'Base e pés',
  'Assento',
  'Encosto',
  'Braços',
  'Tecido e costuras',
  'Espumas e enchimentos',
  'Percintas, molas e sustentação',
  'Ferragens',
  'Mecanismos retráteis ou reclináveis',
  'Forro inferior e acabamentos',
];

export type InformationOrigin =
  | 'Observado na foto'
  | 'Relatado pelo cliente'
  | 'Suspeita a confirmar'
  | 'Confirmado pela oficina'
  | 'Não avaliável';

export type ApparentSeverity = 'Leve' | 'Moderada' | 'Grave' | 'Não avaliável';

export type FindingReviewStatus = 'Preliminar' | 'Confirmado' | 'Editado' | 'Descartado';

export interface DefectFinding {
  id: string;
  area: FurnitureArea;
  defectOrSuspicion: string;
  evidenceAndPhoto: string; // e.g., "Foto F-01 (Frente) / Relato do cliente"
  origin: InformationOrigin;
  severity: ApparentSeverity;
  suggestedService: string;
  requiredVerification: string;
  reviewStatus: FindingReviewStatus;
  reviewerNotes?: string;
  updatedAt?: string;
}

export type ReuseClassification =
  | 'Candidato a reaproveitamento, sujeito à inspeção'
  | 'Recuperável com reparo, sujeito à inspeção'
  | 'Substituição indicada'
  | 'Decisão pendente';

export type ReuseComponentType =
  | 'Madeira'
  | 'Pés'
  | 'Ferragens'
  | 'Mecanismos'
  | 'Molas'
  | 'Percintas'
  | 'Espumas'
  | 'Enchimentos'
  | 'Revestimento'
  | 'Zíperes e acabamentos';

export const REUSE_COMPONENTS: ReuseComponentType[] = [
  'Madeira',
  'Pés',
  'Ferragens',
  'Mecanismos',
  'Molas',
  'Percintas',
  'Espumas',
  'Enchimentos',
  'Revestimento',
  'Zíperes e acabamentos',
];

export interface ReuseEvaluationItem {
  id: string;
  component: ReuseComponentType;
  condition: string;
  classification: ReuseClassification;
  requiredRecovery: string;
  approvalCriteria: string;
  expectedCostEffect: string;
}

export interface FoamWorkshopInspection {
  inspectedByWorkshop: boolean;
  permanentDeformation: 'Não avaliado' | 'Ausente' | 'Parcial' | 'Severa';
  compressionReturn: 'Não avaliado' | 'Adequado' | 'Lento' | 'Sem retorno';
  crumbling: 'Não avaliado' | 'Ausente' | 'Início de esfarelamento' | 'Avançado';
  odor: 'Não avaliado' | 'Ausente' | 'Presente';
  moisture: 'Não avaliado' | 'Seca' | 'Úmida / sinais de mofo';
  workshopNotes: string;
}

export type ProposalTier = 'ESSENCIAL' | 'RECOMENDADA' | 'COMPLETA';

export interface ReformProposal {
  tier: ProposalTier;
  title: string;
  justifiable: boolean;
  justificationNote: string;
  services: string[];
  materialsToKeep: string[];
  materialsToRecover: string[];
  materialsToReplace: string[];
  pendingItems: string[];
  benefitsAndLimitations: string;
}

export type BudgetLineCategory =
  | 'Material'
  | 'Mão de obra'
  | 'Serviço terceirizado'
  | 'Transporte'
  | 'Outro custo';

export interface BudgetLineItem {
  id: string;
  catalogItemId?: string;
  category: BudgetLineCategory;
  name: string;
  unit: string;
  quantity: number | null; // null means "quantidade a levantar" / pendente
  quantityStatus: 'Definida' | 'A levantar (requer medidas e plano de corte)' | 'Pendente';
  unitCostCents: number | null; // null means "pendente"
}

export interface BudgetData {
  items: BudgetLineItem[];
  cuttingPlanConfirmed?: boolean;
  sellingPriceCents: number | null; // Defined by responsible person
  paymentConditions?: string;
  paymentTerms?: string;
  estimatedDeadline?: string;
  estimatedDays?: number;
  validityDays?: number;
  confirmedByResponsible: boolean;
  responsibleName?: string;
  confirmedAt?: string;
  subtotalCents?: number;
  discountsCents?: number;
  laborCents?: number;
  overheadCents?: number;
  // Aceitação/recusa do orçamento pelo cliente, vinculada ao preço vigente no momento da
  // decisão. Se sellingPriceCents mudar depois, a decisão fica desatualizada (ver
  // isClientDecisionStale em calculations.ts) e exige nova conferência com o cliente.
  clientDecision?: 'aceito' | 'recusado';
  clientDecisionAt?: string;
  clientDecisionBy?: string;
  clientDecisionNotes?: string;
  clientDecisionPriceCentsSnapshot?: number | null;
}

export type OpinionConclusion =
  | 'Reforma potencialmente vantajosa'
  | 'Reforma viável com ressalvas'
  | 'Reforma aparentemente pouco vantajosa'
  | 'Dados insuficientes para concluir';

export interface FeasibilityOpinion {
  isPreliminary: boolean;
  structureStateSummary: string;
  damageExtentSummary: string;
  possibleRecoverySummary: string;
  reusableMaterialsSummary: string;
  complexityLevel: 'Baixa' | 'Média' | 'Alta' | 'A confirmar na oficina';
  expectedResultSummary: string;
  equivalentNewFurniturePriceCents?: number | null;
  clientInterestInKeeping?: string; // Ex: Alto valor afetivo, madeira maciça antiga, medida especial
  conclusion: OpinionConclusion;
  reasons: string | string[];
  pendingFactors: string | string[];
  whatCouldChangeConclusion: string;
  clientPlainLanguageSummary: string;
  recommendedNextStep: string;
}

export interface AttendancePhoto {
  id: string;
  code: string; // F-01, F-02...
  attendanceId: string;
  furnitureLabel: string;
  category: PhotoCategory;
  caption: string;
  imageUrl: string;
  thumbnailDataUrl?: string;
  mimeType: string;
  uploadStatus: 'uploading' | 'saved' | 'error';
  errorMessage?: string;
  createdAt: string;
}

export interface HiddenDamageAddendum {
  id: string;
  discoveredAt: string;
  description: string;
  affectedArea: FurnitureArea;
  additionalServices: string;
  additionalPriceCents: number | null;
  clientApproved: boolean;
  clientApprovalDate?: string;
  clientApprovalNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  stage: string;
  action: string;
  details: string;
}

export interface StageStalenessFlags {
  defectsAnalysisNeedsReview: boolean;
  responsibleReviewNeedsUpdate: boolean;
  reuseNeedsReview: boolean;
  proposalNeedsReview: boolean;
  opinionNeedsReview: boolean;
  staleReason?: string;
}

// Classificação inicial feita pela Carla no atendimento — mais ampla que orderType
// ('Reforma' | 'Fabricação'), que só existe quando há um pedido operacional de fato.
export type AttendanceRequestType =
  | 'reforma'
  | 'fabricacao_nova'
  | 'compra_produto'
  | 'acompanhamento'
  | 'reclamacao';

export interface ComplaintEntry {
  id: string;
  createdAt: string;
  description: string;
  urgency: 'normal' | 'urgente';
  status: 'aberta' | 'encaminhada' | 'resolvida';
  handledBy?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  relatedHandoffId?: string;
}

export interface AttendanceRecord {
  id: string;
  ownerId: string;
  attendanceNumber: string; // Ex: CI-2026-0001
  status: AttendanceStatus;
  currentStep: number; // 1 to 8

  // 3. Cadastro do Atendimento
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  furnitureType: string;
  piecesCount: string;
  approxMeasurements: string; // medidas INFORMADAS PELO CLIENTE — nunca medida exata confirmada
  workshopConfirmedMeasurements?: string; // medidas CONFERIDAS NA OFICINA — só a oficina preenche
  usageTime: string;
  reportedDefects: string;
  desiredService: string;
  previousReforms: string;
  fabricAndComfortPreference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;

  // Cadastro inicial feito pela Carla (Atendimento ao Cliente)
  requestType?: AttendanceRequestType;
  neighborhood?: string; // bairro
  city?: string;
  fullAddress?: string; // endereço completo, quando necessário para retirada/entrega
  complaints?: ComplaintEntry[];

  // 4. Fotos
  photos: AttendancePhoto[];

  // 6 & 7. Análise de Defeitos
  leftRightReference: string;
  defectFindings: DefectFinding[];
  analysisLimitations: string[];
  requestedAdditionalPhotos: string[];
  aiPreliminarySummary: string;
  lastAiAnalysisAt?: string;

  // 4 (Fluxo). Revisão do Responsável
  reviewCompleted: boolean;
  reviewerName: string;
  reviewedAt?: string;
  reviewerGeneralNotes: string;
  internalInspectionCompleted: boolean;

  // 8. Segunda Avaliação: Reaproveitamento
  reuseItems: ReuseEvaluationItem[];
  foamInspection: FoamWorkshopInspection;
  materialConsumptionAndReworkAnalysis: string;

  // 9. Propostas de Reforma
  proposals: ReformProposal[];
  selectedProposalTier: ProposalTier;

  // 10. Orçamento
  budget: BudgetData;

  // 10b. Lista de Materiais da Reforma (Catálogo de Tapeçaria)
  materialsLists?: ReformMaterialsList[]; // revisões acumuladas; a última é a vigente

  // 11. Parecer
  opinion: FeasibilityOpinion;

  // 13. Histórico e Danos Ocultos
  hiddenDamages: HiddenDamageAddendum[];
  auditHistory: AuditLogEntry[];
  staleness: StageStalenessFlags;

  // 14. Escritório Compartilhado & Mesas de Trabalho
  orderType?: OrderType; // 'Reforma' | 'Fabricação'
  currentDesk?: DepartmentId;
  deskStatus?: OrderDeskStatus;
  assignedAgentName?: string;
  handoffHistory?: OrderHandoffEntry[];
  manufacturingData?: ManufacturingProjectData;
  // Versões anteriores do plano do Tapeceiro Técnico, arquivadas quando a proposta/ficha de
  // origem muda e invalida uma liberação já feita. manufacturingData é sempre a vigente.
  technicalPlanRevisions?: ManufacturingProjectData[];
  financialData?: OrderFinancialData;
  isTestScenario?: boolean;
}

export type RawMaterialCategory =
  | 'espumas'
  | 'tecidos_revestimentos'
  | 'madeira_chapas'
  | 'percintas_molas'
  | 'grampos_fixadores'
  | 'colas_auxiliares'
  | 'mantas_enchimentos'
  | 'pes_ferragens'
  | 'outros_materiais';

export interface MaterialCatalogItem {
  id: string;
  ownerId: string;
  code?: string;
  name: string;
  category: BudgetLineCategory;
  rawCategory?: RawMaterialCategory;
  specification?: string;
  brand?: string;
  supplier: string;
  photoUrl?: string;

  // Unidades e Conversão
  unit: string; // Unidade de consumo (m, m², un, kg, g)
  consumptionUnit?: string;
  purchaseUnit?: string; // Unidade de compra (rolo, bloco, caixa, lata, barra)
  purchasePackageQuantity?: number; // Qtd na embalagem (ex: 5000 un/caixa, 50 m/rolo, 14 kg/lata)
  conversionFactor?: number; // Fator de conversão

  // Preços e Custos em Moeda Brasileira (R$)
  unitCostCents: number; // Custo por unidade de consumo (em centavos)
  purchasePriceCents?: number; // Preço de compra da embalagem/unidade comercial
  discountCents?: number; // Desconto atribuído
  freightCents?: number; // Frete atribuído
  calculationMemory?: string; // Memória de cálculo detalhada exibida ao usuário
  priceDate?: string; // Data do preço registrado
  priceOrigin?: 'Fornecedor cadastrado' | 'Nota Fiscal' | 'Cotação confirmada' | 'Estimativa pendente';
  lossMarginPercent?: number; // Perda / margem de corte (%)

  // Estoque
  physicalStock?: number; // Estoque físico
  reservedStock?: number; // Quantidade reservada por pedidos

  // Status e Auditoria
  isActive?: boolean;
  notes?: string;
  updatedAt: string;
  createdAt?: string;

  // Campos Específicos por Categoria
  // 1. Espuma
  foamDensity?: string; // Ex: D28, D33 Certificada, D45, Soft
  foamType?: 'Bloco' | 'Lâmina' | 'Flocos' | 'Modelada';
  dimensionsMm?: {
    length: number;
    width: number;
    thickness: number;
  };

  // 2. Tecido
  fabricType?: string; // Linho, Veludo, Suede, Couro Ecológico, Sarja
  color?: string;
  referenceCode?: string;
  usableWidthMeters?: number; // Ex: 1.40m
  salesUnit?: 'Metro linear' | 'Rolo comercial';
  patternDirection?: 'Sentido do rolo' | 'Largura / Atravessado' | 'Indiferente';

  // 3. Grampo e Fixadores
  stapleType?: string; // Ex: 80/10, 80/12, 14/50
  stapleSize?: string; // Ex: 10mm
  stapleCompatibility?: string; // Ex: Grampeadores pneumáticos tipo 80
  stapleQuantityPerBox?: number; // Ex: 5000

  // 4. Madeira e Chapas
  woodSpecies?: string; // Eucalipto tratado em estufa, Pinus, MDF, Compensado naval
  woodSection?: string; // Ex: 2,5 x 5,0 cm
  woodLengthCm?: number; // Ex: 300 cm
}

// ===================== Lista de Materiais da Reforma (Catálogo de Tapeçaria) =====================

export type ReformMaterialComponentStatus =
  | 'Reaproveitado'
  | 'Reparado'
  | 'Substituído'
  | 'Pendente de inspeção';

export type ReformMaterialQuantityStatus =
  | 'Estimada'
  | 'Medida'
  | 'Confirmada'
  | 'Pendente de medição';

export type ReformMaterialPriceStatus = 'Confirmado' | 'A cotar';

export interface ReformMaterialListItem {
  id: string;
  component: string; // Ex: Assento, Encosto, Braço esquerdo
  reuseComponentType?: ReuseComponentType;
  sourceReuseItemId?: string; // id do ReuseEvaluationItem que originou esta linha, quando houver
  materialCatalogItemId?: string; // vínculo opcional ao catálogo de matérias-primas
  materialName: string;
  specification?: string;
  justification: string; // por que este material é necessário (derivado da proposta/revisão do responsável)
  componentStatus: ReformMaterialComponentStatus;

  // Quantidade e unidade
  unit: string; // unidade de consumo
  consumptionQuantity: number | null; // null = pendente de medição
  purchaseUnit?: string; // unidade comercial de compra, quando distinta da unidade de consumo
  purchaseQuantity: number | null; // null = pendente de medição; já considera arredondamento comercial
  lossMarginPercent?: number; // margem de perda configurável, aplicada uma única vez
  expectedLeftoverQuantity?: number | null; // sobra prevista após arredondar para a unidade comercial
  quantitySource: SpecificationSource;
  quantityStatus: ReformMaterialQuantityStatus;

  // Específico de tecido/revestimento
  fabricUsableWidthMeters?: number;
  fabricPiecesCount?: number;
  fabricPatternDirection?: 'Sentido do rolo' | 'Largura / Atravessado' | 'Indiferente';
  fabricPatternRepeatCm?: number;
  cuttingPlanConfirmed?: boolean;

  // Específico de espuma
  foamThicknessMm?: number;
  foamPieceDimensionsMm?: { length: number; width: number; thickness: number };
  foamCommercialFormat?: 'Bloco' | 'Lâmina' | 'Flocos' | 'Modelada';

  // Específico de madeira
  woodDimensionsMm?: { length: number; width: number; thickness: number };
  woodCuttingPlanConfirmed?: boolean;

  // Estoque (somente quando há controle confiável e confirmado manualmente)
  physicalStockAtCreation?: number;
  reservedForThisOrder?: number;
  stockConfirmedManually?: boolean;

  // Preço (opcional; nunca fabricado)
  unitCostCents: number | null; // null = a cotar
  priceStatus: ReformMaterialPriceStatus;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReformMaterialsListStatus =
  | 'Lista em preparação'
  | 'Lista aprovada';

export interface ReformMaterialsList {
  id: string;
  attendanceId: string; // vínculo imutável ao atendimento
  attendanceNumber: string;
  clientName: string;
  furnitureType: string;
  proposalTier: ProposalTier;
  listCode: string; // código legível de identificação (ex: CI-2026-0001-LC-01)
  revision: number; // revisão da lista, incrementada a cada nova preparação após mudança de proposta
  status: ReformMaterialsListStatus;
  items: ReformMaterialListItem[];
  preparedByName?: string;
  preparedAt: string;
  updatedAt: string;
  notes?: string;
}

export type DepartmentId =
  | 'carla_atendimento'
  | 'pedro_avaliacao'
  | 'lucas_projetos'
  | 'ana_compras'
  | 'mila_financeiro'
  | 'castro_estrategia'
  | 'julia_marketing'
  | 'supervisora_geral'
  | 'tapeceiro_tecnico';

export type SpecialistAgentId =
  | 'vistoriador_defeitos'
  | 'especialista_reaproveitamento'
  | 'consultor_propostas'
  | DepartmentId;

export interface AgentActionProposal {
  id: string;
  type:
    | 'transfer_order'
    | 'approve_technical'
    | 'approve_budget'
    | 'send_reminder'
    | 'request_quotation'
    | 'update_status';
  title: string;
  description: string;
  targetDesk?: DepartmentId;
  targetAttendanceId?: string;
  targetCampaignId?: string;
  targetMaterialId?: string;
  payload?: any;
  requiresConfirmation: boolean;
  confirmed?: boolean;
  executedAt?: string;
  executedBy?: string;
}

export interface AgentChatMessage {
  id: string;
  deskId: DepartmentId;
  sender: 'user' | 'agent';
  agentName: string;
  text: string;
  modality: 'texto' | 'voz';
  timestamp: string;
  attendanceId?: string;
  campaignId?: string;
  actionProposal?: AgentActionProposal;
  actionExecuted?: {
    type: string;
    details: string;
    executedAt: string;
    executedBy: string;
  };
}

export interface WorkshopSettings {
  workshopName: string;
  responsibleDefaultName: string;
  phoneWhatsapp: string;
  cityState: string;
  aiModel: 'claude-sonnet-5' | 'claude-opus-5-5' | 'claude-haiku-5-5';
  defectAgentCustomInstructions?: string;
  reuseAgentCustomInstructions?: string;
  proposalAgentCustomInstructions?: string;
  // Identidade Visual dos Agentes
  agentPortraitUpdatedAt?: Partial<Record<DepartmentId, string>>;
  officeCoverImageUpdatedAt?: string;
}

export type DeviceFormFactor = 'Computador' | 'Tablet' | 'Celular';

export interface CorporateDeviceSession {
  deviceId: string;
  formFactor: DeviceFormFactor;
  stationName: string; // Ex: "Escritório Central", "Bancada Oficina", "Vistoria Externa"
  activeAttendanceId?: string | null;
  activeAttendanceNumber?: string | null;
  activeStep?: number;
  lastSeenAt: string;
  isStandalonePwa?: boolean;
}

export type JuliaPhotoTag =
  | 'Estofado Pronto'
  | 'Transformação Estética'
  | 'Ambiente Decorado'
  | 'Detalhe de Acabamento'
  | 'Vitrine / Catálogo';

export interface JuliaMarketingPhoto {
  id: string;
  title: string;
  caption: string;
  tag: JuliaPhotoTag;
  imageUrl: string;
  thumbnailDataUrl?: string;
  mimeType: string;
  sourceDevice?: string;
  createdAt: string;
}

export type JuliaPieceFormat = 'Anúncio' | 'Pôster' | 'Carrossel' | 'Catálogo';

export type JuliaSlideTheme =
  | 'noite_ouro'
  | 'editorial_creme'
  | 'atelier_bronze'
  | 'verde_esmeralda';

export interface JuliaCarouselSlide {
  slideNumber: number;
  title: string;
  body: string;
  photoId?: string;
  theme?: JuliaSlideTheme;
}

export interface JuliaCatalogEntry {
  id: string;
  title: string; // Nome do produto
  category?: string; // Categoria (Sofá, Poltrona, Cadeira, etc.)
  collectionLine: string; // Coleção
  styleDescription: string; // Descrição
  measurements?: string; // Medidas opcionais
  availableColors?: string; // Cores disponíveis
  priceText?: string; // Preço opcional (exibido somente quando informado)
  highlightTag: string;
  photoId?: string; // Foto principal (compatibilidade)
  photoIds?: string[]; // Uma ou mais fotografias reais do produto
}

export interface JuliaPosterConfig {
  headline: string;
  subheadline: string;
  badgeText: string;
  ctaText: string;
  contactLine: string;
  theme: 'editorial_creme' | 'noite_ouro' | 'atelier_bronze';
  photoId?: string;
}

export interface JuliaStepStatus {
  saved: boolean;
  savedAt?: string;
  correctedAt?: string;
  correctionNote?: string;
}

export type JuliaTargetChannel =
  | 'Instagram Feed'
  | 'Instagram Stories'
  | 'Facebook'
  | 'WhatsApp'
  | 'WhatsApp Status'
  | 'Catálogo comercial'
  | 'Pôster publicitário'
  | 'Todas as redes sociais';

export interface JuliaSocialMediaVersions {
  instagramFeed: string;
  instagramStories: string;
  instagramReels: string;
  facebook: string;
  whatsappMessage: string;
  whatsappStatus: string;
  catalogNotes?: string;
  posterNotes?: string;
  updatedAt?: string;
}

export interface JuliaSmartAdProject {
  id: string;
  name: string;
  currentStep: number; // 1 to 12
  selectedPhotoIds: string[];
  campaignObjective: string;
  targetAudience: string;
  pieceFormat: JuliaPieceFormat;
  headline: string;
  copyText: string;
  adFeedText: string;
  adStoriesText: string;
  adFeedAdaptedByAi?: boolean;
  adStoriesAdaptedByAi?: boolean;
  posterConfig: JuliaPosterConfig;
  carouselSlides: JuliaCarouselSlide[];
  catalogEntries: JuliaCatalogEntry[];
  hashtags: string;
  ctaButtonText: string;
  whatsappDirectNumber: string;
  targetChannel?: JuliaTargetChannel;
  socialMediaVersions?: JuliaSocialMediaVersions;
  scheduleChannel:
    | 'Instagram Feed'
    | 'Instagram Stories'
    | 'WhatsApp Status'
    | 'Lista de Transmissão WhatsApp'
    | 'Facebook';
  scheduleDate: string;
  scheduleTime: string;
  scheduleMode?: 'planejada_manual' | 'automatica';
  finalReviewNotes: string;
  stepStates: Record<number, JuliaStepStatus>;
  createdAt: string;
  updatedAt: string;
}

export interface JuliaVoiceTextMessage {
  id: string;
  sender: 'operador' | 'julia';
  modality: 'voz' | 'texto';
  text: string;
  timestamp: string;
}

export type JuliaCampaignStatus =
  | 'Planejada'
  | 'Agendada'
  | 'Concluída'
  | 'Com Erro'
  | 'Programada'
  | 'Publicada';

export interface JuliaCampaignScheduleItem {
  id: string;
  projectId?: string;
  title: string;
  format: JuliaPieceFormat;
  channel:
    | 'Instagram Feed'
    | 'Instagram Stories'
    | 'WhatsApp Status'
    | 'Lista de Transmissão WhatsApp'
    | 'Facebook';
  scheduledDate: string;
  scheduledTime: string;
  publishMode?: 'planejada_manual' | 'automatica';
  status: JuliaCampaignStatus;
  integrationNote?: string;
  captionPreview: string;
  photoId?: string;
  createdAt: string;
}

export interface JuliaDailyReport {
  id: string;
  date: string;
  summaryText: string;
  highlights: string[];
  nextDayRecommendations: string[];
  metricsSnapshot: {
    photosReceived: number;
    adsCreated: number;
    postersCreated: number;
    carouselsCreated: number;
    catalogsCreated: number;
    scheduledCampaigns: number;
    voiceTextInteractions: number;
  };
  createdAt: string;
}

export interface JuliaDepartmentData {
  photos: JuliaMarketingPhoto[];
  projects: JuliaSmartAdProject[];
  activeProjectId: string;
  chatHistory: JuliaVoiceTextMessage[];
  campaigns: JuliaCampaignScheduleItem[];
  dailyReports: JuliaDailyReport[];
}

export interface RealtimeSyncEvent {
  type:
    | 'connected'
    | 'attendance:created'
    | 'attendance:updated'
    | 'attendance:deleted'
    | 'attendance:cleared'
    | 'attendance:focus'
    | 'materials:updated'
    | 'settings:updated'
    | 'devices:presence'
    | 'julia:updated'
    | 'handoff:created'
    | 'financial:updated'
    | 'manufacturing:updated'
    | 'office:updated'
    | 'strategy:updated';
  timestamp: string;
  sourceDeviceId?: string;
  sourceStationName?: string;
  sourceFormFactor?: DeviceFormFactor;
  attendance?: AttendanceRecord;
  attendanceId?: string;
  step?: number;
  materials?: MaterialCatalogItem[];
  settings?: WorkshopSettings;
  devices?: CorporateDeviceSession[];
  juliaData?: JuliaDepartmentData;
}

// ============================================================================
// ESCRITÓRIO DE AGENTES — CASTROS INTERIORES
// ============================================================================

export type OrderType = 'Reforma' | 'Fabricação';

export type OrderDeskStatus =
  | 'na_fila'
  | 'em_andamento'
  | 'aguardando_aprovacao'
  | 'aguardando_informacao'
  | 'concluido'
  | 'devolvido_correcao'
  | 'concluido_mesa'
  | 'aceito'
  | 'transferido'
  | 'novo';

export interface OrderHandoffEntry {
  id: string;
  orderId: string;
  orderNumber?: string;
  fromDesk: DepartmentId;
  fromAgentName?: string;
  toDesk: DepartmentId;
  toAgentName?: string;
  timestamp: string;
  reason: string;
  summaryOfCompletedWork?: string;
  pendingItems: string[];
  expectedNextAction?: string;
  documentVersion: string;
  acceptedAt?: string;
  acknowledgedAt?: string;
  returnedForCorrection?: boolean;
  correctionNotes?: string;
  status?: string;
  completedSummary?: string;
  nextActionExpected?: string;
}

// ----------------------------------------------------------------------------
// AGENTE LUCAS — PROJETOS E FABRICAÇÃO DE PRODUTOS NOVOS
// ----------------------------------------------------------------------------

export type SpecificationSource =
  | 'informado_cliente'
  | 'informado_oficina'
  | 'analise_imagem'
  | 'calculado_tecnico'
  | 'calculado'
  | 'proposta_pendente';

export type SourceClassification = SpecificationSource;

export interface ManufacturingComponent {
  id: string;
  code: string; // Ex: P-01 (Longarina frontal)
  name: string;
  componentType:
    | 'Madeira'
    | 'Espuma'
    | 'Revestimento'
    | 'Ferragem'
    | 'Sustentação'
    | 'Acessório';
  dimensionsMm: {
    length: number | null;
    width: number | null;
    thickness: number | null;
    rawText?: string;
  };
  specification: string; // Ex: Eucalipto tratado seco em estufa / Espuma D33 certificada
  quantityPerUnit: number;
  totalQuantity: number;
  totalQuantityForOrder?: number;
  material?: string;
  source: SpecificationSource;
  notes?: string;
  // Dimensão de corte (com margens) vs. dimensionsMm acima (dimensão acabada/nominal)
  cutDimensionsMm?: {
    length: number | null;
    width: number | null;
    thickness: number | null;
  };
  seamAllowanceMm?: number; // margem de costura
  foldAllowanceMm?: number; // margem de dobra
  fixingAllowanceMm?: number; // margem de fixação/grampeamento
  // Reaproveitamento (somente relevante em atendimentos de Reforma)
  reformStatus?: 'Recuperar' | 'Substituir' | 'Aguardar desmontagem';
  sourceReuseItemId?: string; // vínculo ao ReuseEvaluationItem de origem, quando houver
}

export interface ManufacturingMaterialRequirement {
  id: string;
  materialId?: string;
  materialCode?: string;
  code?: string;
  materialName?: string;
  name?: string;
  category?: BudgetLineCategory;
  specification?: string;
  unit?: string;
  consumptionUnit?: string;
  purchaseUnit?: string;
  conversionFactor?: number;
  quantityPerUnit?: number;
  requiredPerProduct?: number;
  totalOrderRequirement?: number;
  totalRequired?: number;
  usableWidthMeters?: number; // Para tecidos (ex: 1,40m)
  patternDirection?: 'Vertical' | 'Horizontal' | 'Indiferente' | string;
  seamMarginCm?: number;
  scrapLossPercentage?: number;
  justifiedLossPercent?: number; // Perdas justificadas
  physicalStock?: number;
  reservedStock?: number;
  availableStock?: number;
  toPurchaseQuantity?: number;
  effectivePurchasedQuantity?: number;
  effectiveConsumedQuantity?: number;
  unitCostCents?: number;
  totalCostCents?: number;
  purchaseDisbursementCents?: number;
  source: SpecificationSource;
  notes?: string;
}

export interface AssemblyManualStep {
  stepNumber: number; // 1 to 12
  title: string;
  description: string;
  piecesUsed: string[];
  toolsRequired: string[];
  sequenceOrder: number;
  pointsOfAttention: string[];
  attentionPoints?: string[];
  estimatedMinutes?: number;
  qualityCheckCriteria: string;
  hasUncertainties: boolean;
  uncertaintyNotes?: string;
}

export interface AssemblyManual {
  modelName: string;
  version: string;
  status: 'rascunho_tecnico' | 'em_revisao' | 'aprovado_oficina';
  isDraft?: boolean;
  modelCode?: string;
  materialsAndTools?: string[];
  lastUpdatedAt: string;
  reviewedByResponsible?: string;
  reviewedAt?: string;
  referenceImages: string[];
  steps: AssemblyManualStep[];
  generalPreparationNotes: string;
  finalInspectionCriteria: string;
}

export interface QualityCheckpoint {
  id: string;
  stage: string;
  checkpoint: string;
  toleranceStandard: string;
  checked: boolean;
  status?: 'conforme' | 'pendente' | 'em_ajuste' | 'aprovado' | 'reprovado';
  item?: string;
  criteria?: string;
  tolerance?: string;
  inspectedBy?: string;
  notes?: string;
}

export interface ManufacturingProjectData {
  id?: string;
  modelName: string;
  modelCode?: string;
  category?: string;
  isDraft?: boolean;
  productCategory?:
    | 'Sofá Fixo'
    | 'Sofá Retrátil'
    | 'Poltrona'
    | 'Cadeira'
    | 'Puff'
    | 'Cabeceira'
    | 'Estofado Sob Medida';
  unitsCount?: number;
  version: string;
  technicalDraftStatus?:
    | 'rascunho_tecnico'
    | 'aguardando_validacao'
    | 'aprovado_responsavel';
  responsibleApproval?: {
    approved: boolean;
    approvedBy: string;
    approvedAt: string;
    version: string;
    notes: string;
  };
  approvedByResponsible?: string;
  approvedAt?: string;
  dimensions?: {
    widthCm: number | null;
    depthCm: number | null;
    heightCm: number | null;
    seatHeightCm: number | null;
    seatDepthCm: number | null;
    armWidthCm: number | null;
    rawText: string;
    source: SpecificationSource;
  };
  unitDimensions?: any;
  structuralSystem?: string;
  seatComfort?: string;
  backrestComfort?: string;
  feetSpecification?: string;
  finishingWishes?: string;
  workshopMethodNotes?: string;
  technicalNotes?: string;
  referencePhotos?: string[];
  explodedViewPhotoUrl?: string;
  technicalDrawingsUrls?: string[];
  components: ManufacturingComponent[];
  materials?: ManufacturingMaterialRequirement[];
  materialRequirements?: ManufacturingMaterialRequirement[];
  cuttingPlanSummary?: string;
  assemblyManual: AssemblyManual;
  qualityCheckpoints: QualityCheckpoint[];
  aiVisibleObservations?: string[];
  aiMissingQuestions?: string[];

  // Mesa do Tapeceiro Técnico — plano de produção e materiais (Fase 1: sem mapa visual de corte)
  planStatus?: 'Rascunho' | 'Pendente de medição' | 'Em revisão' | 'Liberado pelo responsável';
  planOrderType?: 'Reforma' | 'Fabricação';
  planSourceProposalTier?: ProposalTier; // para detectar mudança de proposta (Reforma) e invalidar liberação
  planSourceComponentsSignature?: string; // para detectar mudança na ficha do Lucas (Fabricação) e invalidar liberação
  planPreparedByName?: string;
  planPreparedAt?: string;
  planLiberatedByName?: string;
  planLiberatedAt?: string;
  // Mapa de corte: Fase 1 não produz desenho vetorial real; nunca declarar aproveitamento sem cálculo
  cuttingPlanStatus?: 'Pendente de mapa visual';
  purchasingHandoffStatus?: 'Não encaminhado' | 'Encaminhado para Compras';
  purchasingHandoffAt?: string;
  financialHandoffStatus?: 'Aguardando integração financeira';
}

// ----------------------------------------------------------------------------
// AGENTE MILA — ADMINISTRAÇÃO FINANCEIRA
// ----------------------------------------------------------------------------

export type FinancialTransactionType =
  | 'receita_cliente'
  | 'despesa_material'
  | 'despesa_servico'
  | 'despesa_mao_de_obra'
  | 'retirada_proprietario'
  | 'despesa_fixa'
  | 'despesa_geral_fabrica'
  | 'saldo_inicial'
  | 'retirada_reserva_edson'
  | 'estorno_cliente'
  | 'outro';

export type PaymentStatus = 'previsto' | 'parcial' | 'confirmado' | 'cancelado' | 'realizado';

export interface FinancialPaymentEntry {
  id: string;
  amountCents: number;
  paidDate: string;
  paymentMethod?: string;
  notes?: string;
}

export interface FinancialTransaction {
  id: string;
  orderId?: string;
  orderNumber?: string;
  clientName?: string;
  type: FinancialTransactionType;
  description: string;
  amountCents: number;
  dueDate: string;
  paymentDate?: string;
  paidDate?: string;
  createdAt?: string;
  status: PaymentStatus;
  installmentIndex?: number;
  totalInstallments?: number;
  paymentMethod?: string;
  receiptNotes?: string;
  history: Array<{ action: string; timestamp: string; notes?: string }>;
  // Financeiro da fábrica (lançamentos gerais, não vinculados a um pedido específico)
  source?: 'pedido' | 'fabrica';
  fixedExpenseId?: string;
  referenceMonth?: string; // "YYYY-MM" — mês de competência (conta fixa gerada / reserva do Edson)
  // Categorização e rastreio detalhado do lançamento
  category?: string;
  payerOrPayee?: string;
  accountId?: string; // conta (caixa/banco) usada — ver CashAccount
  receiptImageUrl?: string; // comprovante anexado (foto/PDF), quando houver
  receiptMimeType?: string;
  // Pagamento parcial: soma de "payments" é o valor já efetivamente pago;
  // status vira 'parcial' enquanto amountPaidCents < amountCents.
  amountPaidCents?: number;
  payments?: FinancialPaymentEntry[];
}

// ----------------------------------------------------------------------------
// MILA — FINANCEIRO DA FÁBRICA (contas fixas, saldo inicial, reserva do Edson)
// ----------------------------------------------------------------------------

export interface FixedExpense {
  id: string;
  name: string; // Ex: Aluguel, Energia, Água
  category: string;
  amountCents: number | null; // null quando o valor varia mês a mês (nunca tratar como zero)
  isVariableAmount: boolean;
  dueDayOfMonth: number; // 1–31
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitialBalanceRecord {
  amountCents: number;
  referenceDate: string; // data de referência informada pelo usuário
  recordedAt: string;
  recordedBy?: string;
  accountId?: string; // conta onde o saldo inicial foi registrado (ex.: Caixa)
}

// Onde o dinheiro da fábrica está fisicamente — caixa, contas bancárias cadastradas
// manualmente (nunca conectadas a banco real). Transferência entre contas move o
// saldo individual de cada uma sem contar como receita/despesa no consolidado.
export interface CashAccount {
  id: string;
  name: string;
  type: 'caixa' | 'banco' | 'outro';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface OrderFinancialData {
  pricingMethod: 'margem_sobre_venda' | 'markup_sobre_custo';
  targetMarginPercent: number; // Ex: 35%
  markupMultiplier?: number;
  markupPercent?: number;

  // Custos apurados
  materialsConsumptionCostCents?: number;
  purchaseDisbursementCents?: number;
  laborWorkshopCostCents?: number;
  ownerLaborCostCents?: number;
  overheadApportionmentCents?: number;
  transportFreightCents?: number;
  taxesCents?: number;
  totalInternalCostCents?: number;
  hasUnknownCosts?: boolean;
  unknownCostDetails?: string[];

  // Compatibilidade com Mila e Escritório
  costDirectCents?: number;
  suggestedSellingPriceCents?: number;
  totalCalculatedCostCents?: number;
  remainingBalanceCents?: number;
  totalPaidCents?: number;
  ownerLaborCents?: number;
  overheadShareCents?: number;
  logisticsFreightCents?: number;
  taxesPercent?: number;
  confirmedByResponsible?: boolean;
  discountsCents?: number;
  notes?: string;

  // Preço e Condições
  calculatedPriceCents?: number;
  approvedSellingPriceCents: number | null;
  proposedDiscountCents?: number;
  finalContractPriceCents?: number;

  // Aprovações
  internalResponsibleApproved?: boolean;
  internalResponsibleName?: string;
  internalApprovedAt?: string;
  clientApproved?: boolean;
  clientApprovedAt?: string;
  // Mesma lógica de decisão vinculada a versão usada em BudgetData (ver clientDecision lá) —
  // aqui para o preço de fabricação (approvedSellingPriceCents).
  clientDecision?: 'aceito' | 'recusado';
  clientDecisionAt?: string;
  clientDecisionBy?: string;
  clientDecisionNotes?: string;
  clientDecisionPriceCentsSnapshot?: number | null;

  // Fluxo de pagamento
  paymentConditions: string;
  transactions: FinancialTransaction[];
  totalReceivedCents?: number;
  balanceDueCents?: number;
  realizedCostCents?: number;
  realizedResultCents?: number;
}

// ----------------------------------------------------------------------------
// AGENTE CASTRO (ROBERTO) — ESTRATÉGIA E ORGANIZAÇÃO DO NEGÓCIO
// ----------------------------------------------------------------------------

export interface BusinessStrategyRecommendation {
  id: string;
  category:
    | 'metas'
    | 'priorizacao'
    | 'capacidade'
    | 'compras'
    | 'gargalos'
    | 'desperdicio';
  area?: string;
  title: string;
  observedSituation: string;
  supportingData: string;
  proposedAction: string;
  suggestedResponsible: string;
  suggestedDeadline: string;
  kpiIndicator: string;
  missingInformation: string;
  isScenarioHypothesis: boolean;
  createdAt: string;
  status?: 'pendente' | 'em_andamento' | 'concluida' | 'planejada';
}

export interface WeeklyActionPlanItem {
  id: string;
  title?: string;
  action?: string;
  responsible?: string;
  responsibleAgent?: string;
  priority: 'alta' | 'media' | 'baixa';
  deadline: string;
  status: 'planejada' | 'em_andamento' | 'concluida' | 'pendente';
  impactArea?: string;
}

export interface WeeklyStrategyPlan {
  id?: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  focusTheme?: string;
  productionCapacityTargetHours?: number;
  scheduledOrdersCount?: number;
  actions: WeeklyActionPlanItem[];
  reviewedByOwner?: boolean;
  ownerNotes?: string;
  updatedAt?: string;
}

export interface SharedOfficeData {
  handoffs: OrderHandoffEntry[];
  generalTransactions: FinancialTransaction[];
  strategyRecommendations: BusinessStrategyRecommendation[];
  weeklyStrategyPlans: WeeklyStrategyPlan[];
  recommendations?: BusinessStrategyRecommendation[];
  weeklyActionPlans?: WeeklyStrategyPlan[];
  workshopCapacityHoursPerWeek?: number;
  currentPlannedHoursWeek?: number;
  activeBottlenecks?: any[];
  lastReconciledAt?: string;
  fixedExpenses?: FixedExpense[];
  initialBalance?: InitialBalanceRecord | null;
  cashAccounts?: CashAccount[];
  cashTransfers?: CashTransfer[];
}


