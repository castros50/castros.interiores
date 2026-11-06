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
  productId?: string; // id de um OrderProduct — ausente = foto do produto principal
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

// Cadastro geral de clientes (mesa da Carla e área Clientes) — reutilizado em qualquer
// atendimento novo, para não recadastrar a mesma pessoa a cada pedido.
export interface ClientAddress {
  cep?: string;
  street?: string; // rua
  number?: string;
  complement?: string;
  neighborhood?: string; // bairro
  city?: string;
  state?: string; // UF
  referencePoint?: string; // ponto de referência (opcional)
}

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: ClientAddress;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Produtos além do principal, no mesmo pedido (ex.: Carla cadastra sofá + 2 poltronas
// num só atendimento). O produto principal continua sendo os campos já existentes
// (furnitureType/piecesCount/approxMeasurements/photos sem productId) — isto é só a
// lista de produtos ADICIONAIS, para não exigir migração de nenhum registro antigo.
export interface OrderProduct {
  id: string;
  description: string;
  quantity: string; // texto livre, igual a piecesCount
  measurements?: string;
  notes?: string;
  createdAt: string;
}

// Avaliação técnica enxuta por produto (Pedro/Lucas), identificada por productId:
// 'primary' para o produto principal, ou o id de um OrderProduct.
export interface ProductMaterialNeed {
  catalogItemId?: string;
  name: string;
  quantity: number | null; // null = a levantar
  unit: string;
  unitCostCents: number | null; // null = pendente — nunca inventado
  // Distingue quantidade confirmada de estimativa técnica (ex.: calculada a
  // partir das medidas da visita) — nunca tratadas como a mesma certeza.
  quantityStatus?: 'confirmada' | 'estimada' | 'pendente';
  calculationMemo?: string; // memória do cálculo quando quantityStatus === 'estimada'
}

export interface ProductTechnicalEvaluation {
  productId: string; // 'primary' | OrderProduct.id
  servicesNeeded: string;
  materials: ProductMaterialNeed[];
  laborHours?: number | null;
  laborCostCents?: number | null;
  estimatedDeadlineDays?: number | null;
  notes?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
  // Fase da avaliação: preliminar por fotos, visita com o móvel montado (ficha de
  // medidas), ou inspeção após desmontagem — nunca exige a última para ser útil.
  evaluationPhase?: 'preliminar_fotos' | 'visita_montado' | 'inspecao_desmontagem';
}

// Orçamento itemizado (Mila), paralelo a BudgetData/OrderFinancialData — não os
// substitui. Só existe quando o atendimento passa pelo fluxo de negociação novo.
export interface ItemizedBudgetEntry {
  productId: string; // 'primary' | OrderProduct.id
  items: BudgetLineItem[];
  sellingPriceCents: number | null;
  costsPending: boolean; // true se algum item tiver unitCostCents: null
}

export interface ItemizedBudget {
  byProduct: ItemizedBudgetEntry[];
  appliedMarginPercent?: number;
  appliedFeeCents?: number;
  discountCents?: number;
  totalSellingPriceCents: number | null;
  confirmedByResponsible: boolean;
  responsibleName?: string;
  confirmedAt?: string;
}

// Negociação + acompanhamento de pagamento — uma única área, usada tanto na mesa da
// Carla quanto na mesa da Mila (mesmos dados, mesmas rotas, sem duplicar).
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'outro';
export type OrderPaymentStatus = 'combinada' | 'informada_aguardando_confirmacao' | 'confirmada';

export interface OrderInstallment {
  index: number;
  valueCents: number;
  dueDate: string;
  method: PaymentMethod;
  status: OrderPaymentStatus;
}

export interface OrderNegotiation {
  finalPriceCents: number;
  discountCents: number;
  downPayment?: {
    amountCents: number;
    method: PaymentMethod;
    status: OrderPaymentStatus;
  };
  balanceMode: 'parcelado' | 'integral' | 'na_entrega';
  installments: OrderInstallment[];
  deliveryDate?: string;
  deliveryDateValidatedBy?: string;
  // Trava de exceção: true quando o desconto/preço sai da política configurada em
  // WorkshopSettings.negotiationPolicy — bloqueia clientDecision até aprovação do dono.
  requiresOwnerApproval: boolean;
  ownerApproval?: { approved: boolean; approvedBy: string; approvedAt: string; notes?: string };
  clientDecision?: 'aceito' | 'recusado';
  clientDecisionAt?: string;
  clientDecisionBy?: string;
  // Mesmo padrão de "staleness" já usado em BudgetData.clientDecisionPriceCentsSnapshot.
  clientDecisionPriceCentsSnapshot?: number | null;
  transactions: FinancialTransaction[];
  updatedAt: string;
}

// Vistoria presencial, reavaliação técnica, manual de execução e controle de
// qualidade — tudo aditivo, por produto (productId: 'primary' | OrderProduct.id)
// e por peça individual dentro da quantidade (unitIndex), integrado às mesas
// de Pedro e Lucas sem alterar o fluxo de 11 áreas nem o de negociação já
// existentes.

// Componentes aplicáveis à vistoria (14 itens), reaproveitando nomes já
// usados em FurnitureArea/ReuseComponentType onde fazem sentido.
export type InspectionComponentKey =
  | 'estrutura' | 'base' | 'assento' | 'encosto' | 'bracos' | 'pes'
  | 'percintas' | 'molas' | 'mecanismos' | 'espumas' | 'enchimentos'
  | 'revestimento' | 'costuras' | 'fixacoes';

export const INSPECTION_COMPONENT_LABELS: Record<InspectionComponentKey, string> = {
  estrutura: 'Estrutura',
  base: 'Base',
  assento: 'Assento',
  encosto: 'Encosto',
  bracos: 'Braços',
  pes: 'Pés',
  percintas: 'Percintas',
  molas: 'Molas',
  mecanismos: 'Mecanismos',
  espumas: 'Espumas',
  enchimentos: 'Enchimentos',
  revestimento: 'Revestimento',
  costuras: 'Costuras',
  fixacoes: 'Fixações',
};

export type InspectionMarking =
  | 'bom' | 'reparar' | 'substituir' | 'reaproveitar' | 'nao_verificado' | 'nao_se_aplica';

export const INSPECTION_MARKING_LABELS: Record<InspectionMarking, string> = {
  bom: 'Bom',
  reparar: 'Reparar',
  substituir: 'Substituir',
  reaproveitar: 'Reaproveitar',
  nao_verificado: 'Não verificado',
  nao_se_aplica: 'Não se aplica',
};

// Reforma: um registro por componente aplicável, por peça individual.
export interface InspectionComponentEntry {
  id: string;
  component: InspectionComponentKey;
  locationLabel?: string;              // identificação/localização na peça
  materialSpecification?: string;      // material e especificação verificados
  quantity?: number | null;
  unit?: string;
  measurementValue?: string;           // medida real, com unidade explícita no texto
  measurementStatus: 'medido' | 'a_medir'; // nunca "medido" só por foto
  condition: InspectionMarking;
  defectObserved?: string;
  possibleCause?: string;
  causeConfirmed: boolean;             // hipótese vs. confirmado presencialmente
  discoveredAfterDisassembly: boolean; // dano descoberto após desmontagem
  detailPhotoId?: string;              // referencia AttendancePhoto.id
  actionRequired?: string;
  responsibleForCheck?: string;
  notes?: string;
  origin: InformationOrigin;           // reaproveita o enum já existente
}

// Fabricação nova: ficha própria conferindo projeto/medidas/componentes/
// materiais/requisitos — defeitos encontrados viram não conformidade.
export interface ManufacturingInspectionEntry {
  id: string;
  item: string;
  specification?: string;  // o que a ficha técnica/projeto pede
  found?: string;           // o que foi conferido de fato
  status: InspectionMarking;
  isNonConformance: boolean;
  detailPhotoId?: string;
  notes?: string;
}

export interface InspectionSheet {
  id: string;
  orderId: string;
  productId: string;   // 'primary' | OrderProduct.id
  unitIndex: number;   // identifica a peça individual dentro da quantidade do produto
  unitLabel?: string;  // ex.: "Cadeira 1 de 4"
  kind: 'reforma' | 'fabricacao_nova';
  responsibleName?: string;
  version: number;     // nunca sobrescrita — nova versão arquiva a anterior
  status: 'gerada' | 'enviada_para_reavaliacao' | 'reavaliada';
  components?: InspectionComponentEntry[];              // reforma
  manufacturingChecks?: ManufacturingInspectionEntry[];  // fabricação nova
  createdAt: string;
  submittedPhotoIds?: string[];     // novas fotos enviadas junto com a devolução
  submittedFormImageId?: string;    // foto da ficha marcada manualmente
  aiReadResult?: InspectionFormReadResult;
  confirmedAt?: string;
  confirmedBy?: string;
}

export type ChecklistFieldReadStatus = 'lido' | 'ilegivel' | 'ausente';
export interface InspectionFormReadField {
  entryId: string; // id do InspectionComponentEntry/ManufacturingInspectionEntry correspondente
  readStatus: ChecklistFieldReadStatus;
  readCondition?: InspectionMarking;
  readMeasurement?: string;
  readNotes?: string;
}
export interface InspectionFormReadResult {
  readAt: string;
  fields: InspectionFormReadField[];
  overallNotes?: string;
  pdfReadUnavailable?: boolean; // true quando a tentativa de leitura de PDF falhou (fallback honesto)
}

// Reavaliação técnica: compara avaliação inicial x dados confirmados na devolução.
export interface TechnicalReassessment {
  id: string;
  inspectionSheetId: string;
  productId: string;
  unitIndex: number;
  version: number;
  comparedToSheetVersion: number;
  revisedDiagnosis: string;
  updatedServicesNeeded: string;
  updatedMaterials: ProductMaterialNeed[];
  pendingItems: string[];
  changesFromPrevious: string[];
  costImpact: 'sem_impacto' | 'aumento' | 'reducao' | 'a_avaliar';
  deadlineImpactDays?: number | null;
  requiresNegotiationReview: boolean; // true se escopo/preço já aceitos mudam
  createdBy: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// FICHA DE VISITA TÉCNICA E LEVANTAMENTO DE MEDIDAS (fase 2 da avaliação de
// reforma, entre a avaliação preliminar por fotos e a inspeção pós-desmontagem
// já existente em InspectionSheet). Visita com o móvel ainda montado: medidas
// reais e testes de funcionamento feitos pelo operador, nunca confirmação de
// condição interna por foto. Tudo aditivo, por produto/peça (unitIndex).
// ----------------------------------------------------------------------------

// Origem de cada dado da ficha de visita — vocabulário próprio desta ficha
// (distinto de InformationOrigin, que é da análise por foto/11 áreas), porque
// aqui a fonte típica é o operador medindo presencialmente, não a oficina.
export type VisitInfoOrigin =
  | 'observado_foto'
  | 'medido_pelo_operador'
  | 'estimativa_tecnica'
  | 'confirmado_apos_desmontagem'
  | 'pendente';

export const VISIT_INFO_ORIGIN_LABELS: Record<VisitInfoOrigin, string> = {
  observado_foto: 'Observado por foto',
  medido_pelo_operador: 'Medido pelo operador',
  estimativa_tecnica: 'Estimativa técnica',
  confirmado_apos_desmontagem: 'Confirmado após desmontagem',
  pendente: 'Pendente',
};

// Toda medida carrega a unidade no próprio texto (ex.: "58 cm") — nunca um
// número solto — e sua origem, para nunca confundir estimativa com medida real.
export interface VisitMeasurement {
  value: string | null; // ex.: "58 cm"; null = ainda não levantada
  origin: VisitInfoOrigin;
}

export interface ProductOverallMeasurements {
  width?: VisitMeasurement;
  height?: VisitMeasurement;
  depth?: VisitMeasurement;
  depthOpen?: VisitMeasurement; // quando aplicável (ex.: sofá-cama, reclinável)
}

export interface ArmMeasurement {
  id: string;
  side: 'esquerdo' | 'direito';
  length?: VisitMeasurement;
  width?: VisitMeasurement;
  height?: VisitMeasurement;
}

export interface SeatMeasurement {
  id: string;
  label?: string; // ex.: "Assento 1"
  width?: VisitMeasurement;
  depth?: VisitMeasurement;
  cushionThickness?: VisitMeasurement;
  heightFromFloor?: VisitMeasurement;
}

export interface BackrestMeasurement {
  id: string;
  label?: string;
  width?: VisitMeasurement;
  height?: VisitMeasurement;
  thickness?: VisitMeasurement;
}

export interface LooseCushionMeasurement {
  id: string;
  identification: string; // ex.: "Almofada decorativa 1"
  quantity?: number | null;
  width?: VisitMeasurement;
  heightOrDepth?: VisitMeasurement;
  thickness?: VisitMeasurement;
}

export interface BaseAndFeetMeasurement {
  accessibleMeasurements?: string;
  feetHeight?: VisitMeasurement;
  feetQuantity?: number | null;
}

export interface RecliningModuleMeasurement {
  id: string;
  moduleLabel: string;
  closedMeasurements?: string;
  openMeasurements?: string;
  observedFunction?: string; // funcionamento observado pelo operador, nunca presumido
}

export interface OtherPartMeasurement {
  id: string;
  name: string;
  location?: string;
  quantity?: number | null;
  measurement?: VisitMeasurement;
}

export interface FreehandSketch {
  photoId?: string; // foto do desenho à mão (AttendancePhoto.id)
  measurementLabels?: string; // identificação das medidas no desenho
  referencedPhotoIds?: string[]; // referência às fotos do produto já vinculadas
}

export interface ProductMeasurementSet {
  overall: ProductOverallMeasurements;
  arms: ArmMeasurement[];
  seats: SeatMeasurement[];
  backrests: BackrestMeasurement[];
  looseCushions: LooseCushionMeasurement[];
  baseAndFeet?: BaseAndFeetMeasurement;
  recliningModules: RecliningModuleMeasurement[];
  otherParts: OtherPartMeasurement[];
  freehandSketch?: FreehandSketch;
}

// Checklist de materiais e condições da visita — por componente aplicável,
// reaproveitando o mesmo vocabulário de 14 componentes e 6 marcações já usado
// na ficha de verificação pós-desmontagem (InspectionComponentKey/InspectionMarking).
export interface VisitComponentEntry {
  id: string;
  component: InspectionComponentKey;
  locationLabel?: string;
  quantity?: number | null;
  condition: InspectionMarking;
  // Situação da conferência, distinta da condição: uma peça inacessível fica
  // 'nao_verificado' mesmo que alguém "ache" que está boa — nunca se presume.
  checkStatus: 'verificado' | 'nao_verificado' | 'nao_se_aplica';
  defectObserved?: string;
  detailPhotoId?: string;
  actionProposed?: 'manter' | 'reparar' | 'substituir' | 'pendente';
  notes?: string;
  origin: VisitInfoOrigin;

  // Espuma: densidade/especificação só confirmada quando identificada por fonte
  // confiável (etiqueta, nota fiscal) — senão fica "não identificada", nunca
  // estimada pela aparência/toque.
  foamAccessibleMeasurement?: string;
  foamDeformation?: 'nao_avaliado' | 'ausente' | 'parcial' | 'severa';
  foamSinking?: 'nao_avaliado' | 'ausente' | 'presente';
  foamDensitySpecification?: string;

  // Tecido
  fabricCurrentCovering?: string;
  fabricDesiredCovering?: string;
  fabricColor?: string;
  fabricPattern?: string;
  fabricPatternDirection?: 'Vertical' | 'Horizontal' | 'Indiferente';
  fabricWear?: string;
  fabricTears?: string;
  fabricPartsToRecover?: string;
  fabricUsableWidthCm?: number | null;

  // Estrutura e mecanismos — partes inacessíveis ficam 'nao_verificado', nunca
  // presumidas boas ou danificadas.
  structurePlay?: string; // folgas
  structureNoise?: string; // ruídos
  structureInstability?: string;
  observedFunction?: string; // funcionamento observado
}

export type TechnicalVisitSheetStatus = 'gerada' | 'enviada_para_reavaliacao' | 'reavaliada';

export interface TechnicalVisitSheet {
  id: string;
  orderId: string;
  productId: string; // 'primary' | OrderProduct.id
  unitIndex: number; // identifica a peça individual dentro da quantidade do produto
  unitLabel?: string; // ex.: "Cadeira 1 de 4"
  visitAddress?: string;
  operatorName?: string;
  visitDate?: string;
  version: number; // nunca sobrescrita — nova versão arquiva a anterior
  status: TechnicalVisitSheetStatus;
  measurements: ProductMeasurementSet;
  components: VisitComponentEntry[];
  createdAt: string;
  submittedPhotoIds?: string[]; // novas fotos de detalhe enviadas junto com a devolução
  submittedFormImageId?: string; // foto da ficha marcada manualmente
  aiReadResult?: InspectionFormReadResult; // reaproveita o mesmo resultado de leitura
  confirmedAt?: string;
  confirmedBy?: string;
}

// Parecer do Pedro após confirmar a ficha de visita — encaminhado ao Tapeceiro
// Técnico para compor materiais/mão de obra/orçamento preliminar.
export interface TechnicalVisitOpinion {
  id: string;
  visitSheetId: string;
  productId: string;
  unitIndex: number;
  version: number;
  productDescription: string;
  verifiedConditionsSummary: string;
  recommendedServices: string;
  servicesJustification: string;
  materialsToKeep: string[];
  materialsToRepair: string[];
  materialsToReplace: string[];
  pendingDisassemblyItems: string[]; // pendências que só se resolvem após desmontagem
  sufficientForBudget: string[]; // informações já suficientes para o orçamento
  missingForBudget: string[]; // informações ainda ausentes, explicadas (nunca só "faltam dados")
  // Materiais estimados a partir das medidas da visita (tecido/espuma), com
  // memória de cálculo — nunca aplicados automaticamente: o Tapeceiro Técnico
  // decide incorporar ou não ao plano.
  estimatedMaterials: ProductMaterialNeed[];
  requiresNegotiationReview: boolean;
  createdBy: string;
  createdAt: string;
}

// Manual de execução — PDF A4, rascunho até aprovação.
export interface ExecutionManualStep {
  stepNumber: number;
  stage: 'preparacao' | 'montagem' | 'estofamento' | 'acabamento';
  title: string;
  description: string;
  isIllustrative: boolean; // true = desenho ilustrativo, identificado como tal no PDF
  referencePhotoId?: string;
  inspectionPoints: string[];
}
export interface ExecutionManual {
  id: string;
  orderId: string;
  productId: string;
  version: number;
  status: 'rascunho' | 'aprovado';
  approvedBy?: string;
  approvedAt?: string;
  coverResponsibles: string[];
  views: Array<{ label: string; photoId?: string; isIllustrative: boolean }>;
  explodedView?: { available: boolean; note: string };
  partsList: BudgetLineItem[];
  cuttingPlanNote: string;
  fabricGrainDirection?: 'Vertical' | 'Horizontal' | 'Indiferente';
  sewingInstructions: { seamType?: string; thread?: string; stitch?: string; marginsNote?: string; notes?: string };
  steps: ExecutionManualStep[];
  createdAt: string;
}

// Controle de qualidade — resultado fechado, nunca "aprovado" com pendência.
export type QcResult = 'conforme' | 'nao_conforme' | 'nao_se_aplica';
export interface QcCheckEntry {
  id: string;
  item: string;
  plannedValue?: string;  // vem só da ficha técnica/manual já validados
  foundValue?: string;
  toleranceFromManual?: string;
  result?: QcResult; // ausente = ainda não verificado; servidor exige todos preenchidos para aprovar
  photoId?: string;
  notes?: string;
}
export interface QualityControlInspection {
  id: string;
  orderId: string;
  productId: string;
  unitIndex: number;
  manualVersion: number;
  checks: QcCheckEntry[];
  responsibleName: string;
  date: string;
  outcome: 'aprovado' | 'retrabalho' | 'aguardando_verificacao';
  reworkOfInspectionId?: string;
}

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
  clientId?: string; // vínculo com o cadastro geral de clientes (ClientRecord), quando houver
  neighborhood?: string; // bairro
  city?: string;
  fullAddress?: string; // endereço completo, quando necessário para retirada/entrega
  complaints?: ComplaintEntry[];

  // Origem do contato quando vindo de um canal integrado (ex.: WhatsApp). Só preenchido
  // quando a origem puder ser identificada de verdade — nunca "chute" a partir de um clique
  // no anúncio, que não é mensagem enviada pelo cliente.
  originChannel?: 'whatsapp' | 'manual';
  originCampaignId?: string;
  originIdentified?: boolean; // false => exibir "origem não identificada"

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

  // Vários produtos no mesmo pedido (além do principal, que são os campos já
  // existentes acima). Avaliação técnica/orçamento por produto e a negociação são
  // aditivos — um atendimento sem nenhum desses campos continua funcionando
  // exatamente como hoje, usando budget/financialData normalmente.
  additionalProducts?: OrderProduct[];
  productEvaluations?: Record<string, ProductTechnicalEvaluation>; // chave: 'primary' | OrderProduct.id
  itemizedBudget?: ItemizedBudget;
  negotiation?: OrderNegotiation;

  // Vistoria presencial, reavaliação, manual de execução e controle de
  // qualidade — todos acumulados (nenhuma versão é sobrescrita/perdida).
  inspectionSheets?: InspectionSheet[];
  technicalReassessments?: TechnicalReassessment[];
  executionManuals?: ExecutionManual[];
  qualityControlHistory?: QualityControlInspection[];

  // Ficha de visita técnica e levantamento de medidas (fase 2, móvel montado) —
  // acumulada por produto/peça, igual ao padrão de inspectionSheets acima.
  technicalVisitSheets?: TechnicalVisitSheet[];
  technicalVisitOpinions?: TechnicalVisitOpinion[];
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
  // Id da mensagem no canal externo (ex.: WhatsApp Cloud API) — usado só para evitar
  // processar o mesmo evento de webhook duas vezes, nunca para provar nada por si só.
  externalMessageId?: string;
  externalChannel?: 'whatsapp';
}

// ----------------------------------------------------------------------------
// TAREFAS EM SEGUNDO PLANO — execução persistente no servidor, independente de
// qualquer página aberta. Ver processBackgroundTasks() em server.ts.
// ----------------------------------------------------------------------------
export type BackgroundTaskType =
  | 'publicar_campanha'
  | 'enviar_resposta_whatsapp'
  | 'verificar_integracao'
  | 'iniciar_campanha_paga';

export type BackgroundTaskStatus =
  | 'aguardando_aprovacao'
  | 'na_fila'
  | 'executando'
  | 'concluida'
  | 'falhou'
  | 'cancelada';

export interface BackgroundTask {
  id: string;
  type: BackgroundTaskType;
  agentId: DepartmentId;
  relatedOrderId?: string;
  relatedCampaignId?: string;
  channel?: 'whatsapp' | 'instagram' | 'facebook'; // canal afetado, quando aplicável
  action: string; // descrição curta da ação solicitada
  authorization: string; // quem/o que autorizou (ex.: "Aprovado por Edson em 30/10")
  scheduledFor: string; // ISO — horário previsto de execução
  startedAt?: string;
  completedAt?: string;
  status: BackgroundTaskStatus;
  result?: string;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string; // evita duplicar a mesma tarefa em reprocessamentos
  createdAt: string;
  createdBy?: string;
  // Dados específicos de execução por tipo (ex.: telefone/texto de uma mensagem de
  // WhatsApp a enviar) — evita um campo dedicado por tipo de tarefa.
  payload?: Record<string, unknown>;
}

// Voz própria de um agente — uma voz REAL e distinta do sintetizador do navegador
// (nunca apenas velocidade/tom diferentes de uma voz compartilhada).
export interface AgentVoiceConfig {
  voiceURI: string;
  voiceName: string;
  lang: string;
  gender?: 'feminina' | 'masculina';
  // Velocidade (0.5–2, padrão 1.05) e tom/expressividade (0–2, padrão 1.0) da fala —
  // só fazem sentido combinados com uma voz distinta de verdade (acima), nunca como
  // substituto dela.
  rate?: number;
  pitch?: number;
  updatedAt: string;
}

// Status de uma integração oficial externa (WhatsApp Cloud API, Meta Graph API para
// Instagram/Facebook, etc.). "conectado" só pode ser true depois de uma verificação real
// contra o serviço — nunca setado manualmente "porque deveria funcionar".
export type IntegrationConnectionState = 'nao_configurado' | 'pendente' | 'conectado' | 'erro';

export interface IntegrationStatus {
  state: IntegrationConnectionState;
  lastCheckedAt?: string;
  errorMessage?: string;
  accountLabel?: string; // ex.: número do WhatsApp conectado, sem expor token
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
  // Voz individual por agente (ver AgentVoiceConfig)
  agentVoiceSettings?: Partial<Record<DepartmentId, AgentVoiceConfig>>;
  // Status real das integrações oficiais externas, por canal
  integrations?: {
    whatsapp?: IntegrationStatus;
    instagram?: IntegrationStatus;
    facebook?: IntegrationStatus;
  };
  // Controles globais de automação (pausar/retomar sem reenviar tarefas concluídas)
  automationPaused?: boolean;
  automationPausedAt?: string;
  automationPausedBy?: string;
  // Atendimento automático da Carla: escopo, autorização e pausa — carla pode estar
  // pausada mesmo com o resto da automação ativo (e vice-versa).
  carlaAutoReply?: {
    enabled: boolean;
    scopeNote?: string;
    pausedConversationIds?: string[]; // atendimentos com humano assumindo a conversa
    updatedAt?: string;
    updatedBy?: string;
  };
  // Política de margem/desconto/taxa aprovada pelo proprietário, aplicada pela Mila
  // ao montar o orçamento itemizado. Sem isso configurado, a Mila usa os valores que
  // digitar manualmente por pedido — nada é assumido silenciosamente.
  negotiationPolicy?: {
    defaultMarginPercent?: number;
    maxDiscountPercent?: number;
    feePercent?: number;
    updatedAt?: string;
    updatedBy?: string;
  };
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
  | 'Enviada Manualmente'
  | 'Concluída'
  | 'Com Erro'
  | 'Cancelada'
  // valores legados — mantidos só para não quebrar dados antigos; normalizedCampaignStatus()
  // os trata como sinônimos de 'Planejada'/'Concluída' na exibição.
  | 'Programada'
  | 'Publicada';

// Confirmação de que a publicação realmente saiu no canal externo — só preenchido pelo
// processador de tarefas em segundo plano (BackgroundTask), nunca por um clique humano direto.
// "Concluída" sem este campo não deveria existir; é o que distingue uma publicação
// comprovada de uma mensagem de intenção.
export interface ExternalPublicationConfirmation {
  confirmedAt: string; // quando o serviço externo confirmou (não quando o humano clicou)
  externalId?: string; // id do post/mensagem no serviço externo, quando disponível
  externalLink?: string; // link público do post, quando disponível
  source: string; // ex.: "Meta Graph API", "WhatsApp Cloud API"
}

// Confirmação de que um humano enviou manualmente (ex.: abriu o WhatsApp Web e mandou na mão).
// Distinta de ExternalPublicationConfirmation: é uma autodeclaração do humano, não uma prova
// do serviço externo — por isso o status correspondente é "Enviada Manualmente", nunca "Concluída".
export interface ManualSendConfirmation {
  confirmedAt: string;
  confirmedBy?: string;
}

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
  // Código de referência embutido no link/mensagem do anúncio, usado para identificar a
  // campanha de origem quando o cliente responde (ver AttendanceRecord.originCampaignId).
  referenceCode?: string;
  externalConfirmation?: ExternalPublicationConfirmation;
  manualSendConfirmation?: ManualSendConfirmation;
  // Tarefa em segundo plano vinculada (quando agendada para publicação automática).
  backgroundTaskId?: string;
}

// ----------------------------------------------------------------------------
// ANÚNCIOS PAGOS — distintos da publicação orgânica acima. Uma proposta nasce
// sempre travada ('aguardando_aprovacao'); só uma pessoa, nunca a IA, pode
// aprovar (ver approval abaixo). Só depois de aprovada nasce uma BackgroundTask
// do tipo 'iniciar_campanha_paga', e mesmo essa só executa de verdade quando
// houver uma conta de anúncios da Meta conectada — sem isso, falha honestamente
// como "aguardando_integracao", nunca finge veiculação nem gasta dinheiro.
// ----------------------------------------------------------------------------
export type PaidAdApprovalStatus =
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'rejeitado'
  | 'aguardando_integracao'
  | 'em_veiculacao'
  | 'pausado'
  | 'encerrado'
  | 'falhou';

export type PaidAdObjective = 'Alcance' | 'Tráfego' | 'Mensagens' | 'Conversões';

export interface PaidAdBudgetApproval {
  approved: boolean;
  approvedBy: string;
  approvedAt: string;
  notes: string;
}

export interface PaidAdBudgetProposal {
  id: string;
  projectId: string;
  campaignScheduleItemId?: string;
  objective: PaidAdObjective;
  targetAudienceDescription: string;
  budgetCents: number;
  budgetPeriod: 'diario' | 'total';
  durationDays: number;
  channel: JuliaCampaignScheduleItem['channel'];
  status: PaidAdApprovalStatus;
  proposedBy: string;
  proposedAt: string;
  approval?: PaidAdBudgetApproval;
  backgroundTaskId?: string;
  // Só preenchido depois de uma confirmação real da Meta — nunca estimado.
  externalCampaignId?: string;
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
  paidAdProposals?: PaidAdBudgetProposal[];
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
  | 'novo'
  | 'aguardando_negociacao_cliente';

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
  // Memória do cálculo quando source === 'calculado_tecnico' (ex.: estimativa de
  // tecido/espuma a partir da ficha de visita técnica) — nunca um número solto.
  calculationMemo?: string;
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


