import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
// Migrado de @google/genai (Gemini) para a API da Anthropic (Claude) — ver getAnthropicApiKey()
// e generateContentWithRetryAndFallback() abaixo. O objeto Type abaixo reproduz os mesmos nomes
// de constante que o SDK do Gemini usava, para não precisar reescrever os ~80 schemas de resposta
// espalhados pelo arquivo — eles continuam descrevendo o formato esperado, só que agora viram uma
// ferramenta (tool) da Claude em vez de um responseSchema do Gemini.
const Type = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  ARRAY: 'ARRAY',
  BOOLEAN: 'BOOLEAN',
  INTEGER: 'INTEGER',
  NUMBER: 'NUMBER',
} as const;

type AiTextResponse = { text: string };

type AiSchema = {
  type: string;
  description?: string;
  properties?: Record<string, AiSchema>;
  items?: AiSchema;
  required?: string[];
};

function convertSchemaToJsonSchema(schema: AiSchema): Record<string, unknown> {
  const result: Record<string, unknown> = { type: schema.type.toLowerCase() };
  if (schema.description) result.description = schema.description;
  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, convertSchemaToJsonSchema(value)])
    );
  }
  if (schema.items) result.items = convertSchemaToJsonSchema(schema.items);
  if (schema.required) result.required = schema.required;
  return result;
}

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

// Initialize Firebase Admin
const existingApps = getApps();
const app = existingApps.length > 0
  ? existingApps[0]
  : initializeApp({
      credential: applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
// O estado da aplicação (store.json) tem muitos campos opcionais que ficam `undefined`
// em JS — JSON.stringify já os descarta normalmente, mas o Firestore rejeita `undefined`
// por padrão e lançaria erro em quase toda gravação. Isso faz o Firestore se comportar
// como o arquivo local: campos ausentes somem, em vez de quebrar a gravação.
db.settings({ ignoreUndefinedProperties: true });
const storageBucket = getStorage(app).bucket(firebaseConfig.storageBucket);
// Cliente "parecido com Firestore" só para reaproveitar tryClaimWhatsAppMessageId
// (primitivo de reivindicação atômica por .create(), já testado em
// migrations/) — as demais operações de leitura em massa e escrita com merge
// parcial usam `db` diretamente (API nativa do Admin SDK, que suporta
// set(..., {merge:true}), não exposto pela interface mínima da migração).
const firestoreLikeDb: FirestoreLikeClient = new RealFirestoreClient(db);





import { createServer as createViteServer } from 'vite';
import type {
  AttendanceRecord,
  MaterialCatalogItem,
  WorkshopSettings,
  DefectFinding,
  ReuseEvaluationItem,
  ReformProposal,
  FeasibilityOpinion,
  CorporateDeviceSession,
  DeviceFormFactor,
  RealtimeSyncEvent,
  JuliaDepartmentData,
  JuliaMarketingPhoto,
  JuliaSmartAdProject,
  SharedOfficeData,
  OrderHandoffEntry,
  ManufacturingProjectData,
  ManufacturingComponent,
  ManufacturingMaterialRequirement,
  ReuseComponentType,
  OrderFinancialData,
  DepartmentId,
  OrderDeskStatus,
  OrderType,
  JuliaTargetChannel,
  JuliaSocialMediaVersions,
  AgentChatMessage,
  AgentActionProposal,
  FinancialTransaction,
  BusinessStrategyRecommendation,
  WeeklyActionPlanItem,
  AssemblyManual,
  ReformMaterialsList,
  PurchaseRequestPackage,
  ReformComponentDecisionKey,
  ReformMaterialListItem,
  ReformMaterialComponentStatus,
  ProposalTier,
  FixedExpense,
  InitialBalanceRecord,
  CashAccount,
  CashTransfer,
  AttendanceRequestType,
  ComplaintEntry,
  BackgroundTask,
  BackgroundTaskStatus,
  IntegrationConnectionState,
  AgentVoiceConfig,
  PaidAdBudgetProposal,
  PaidAdObjective,
  JuliaCampaignScheduleItem,
  ClientRecord,
  ClientAddress,
  OrderProduct,
  ProductMaterialNeed,
  ProductTechnicalEvaluation,
  ItemizedBudgetEntry,
  ItemizedBudget,
  PaymentMethod,
  OrderPaymentStatus,
  OrderInstallment,
  OrderNegotiation,
  BudgetLineItem,
  BudgetLineCategory,
  FinancialPaymentEntry,
  PaymentStatus,
  InspectionComponentKey,
  InspectionMarking,
  InspectionComponentEntry,
  ManufacturingInspectionEntry,
  InspectionSheet,
  ChecklistFieldReadStatus,
  InspectionFormReadField,
  InspectionFormReadResult,
  TechnicalReassessment,
  ExecutionManualStep,
  ExecutionManual,
  QcResult,
  QcCheckEntry,
  QualityControlInspection,
  InformationOrigin,
  VisitInfoOrigin,
  VisitMeasurement,
  ProductMeasurementSet,
  ArmMeasurement,
  SeatMeasurement,
  BackrestMeasurement,
  LooseCushionMeasurement,
  RecliningModuleMeasurement,
  OtherPartMeasurement,
  VisitComponentEntry,
  TechnicalVisitSheet,
  TechnicalVisitOpinion,
  ExplodedViewComponentLabel,
  ExplodedViewSimulation,
  WhatsAppWebhookLogEntry,
  WhatsAppWebhookSignatureStatus,
} from './src/types.ts';
import { INSPECTION_COMPONENT_LABELS, INSPECTION_MARKING_LABELS } from './src/types.ts';
import { FURNITURE_AREAS, REUSE_COMPONENTS } from './src/types.ts';
import {
  createDemoSofa2Places,
  createDemoPoltronas4Un,
  createDefaultOfficeData,
} from './src/utils/officeDefaults.ts';
import { estimateFabricConsumption, estimateFoamConsumption } from './src/utils/materialEstimation.ts';
// Coleções novas (attendances_v2, agentChats_v2_*, whatsappMessageDedup) —
// mesmos nomes/lógica já testados em migrations/firestoreCollectionsMigration.ts
// (16/16 contra o emulador oficial) e usados pela migração real
// (migrations/run-production-migration.ts). Reaproveitado aqui, não duplicado:
// os nomes de coleção têm que ser EXATAMENTE os mesmos que a migração grava,
// senão o servidor nunca enxergaria o que foi migrado.
import {
  COLLECTION_ATTENDANCES,
  COLLECTION_CHAT_MESSAGE_PREFIX,
  COLLECTION_WHATSAPP_DEDUP,
  tryClaimWhatsAppMessageId,
  AlreadyExistsError,
  type FirestoreLikeClient,
} from './migrations/firestoreCollectionsMigration.ts';
import { RealFirestoreClient } from './migrations/realFirestoreClient.ts';

dotenv.config();

// Rede de segurança: a sincronização com o Firestore é "fire-and-forget" (não bloqueia
// a resposta HTTP) e tem seu próprio .catch(), mas bibliotecas internas do SDK do
// Firestore/Google Auth podem rejeitar promises por fora desse .catch() quando as
// credenciais do ambiente estão erradas ou ausentes — sem essa rede, isso derrubaria
// o processo inteiro do servidor. Os dados continuam seguros no arquivo local de
// qualquer forma; aqui só evitamos que uma falha de sincronização em segundo plano
// tire o site do ar.
process.on('unhandledRejection', (reason) => {
  console.error('[Servidor] Rejeição de Promise não tratada (processo mantido no ar):', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const JULIA_STORE_PATH = path.join(DATA_DIR, 'julia_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

interface PersistentStore {
  nextSequence: number;
  attendances: AttendanceRecord[];
  materials: MaterialCatalogItem[];
  settings: WorkshopSettings;
  juliaData?: JuliaDepartmentData;
  officeData?: SharedOfficeData;
  agentChats?: Record<string, AgentChatMessage[]>;
  backgroundTasks?: BackgroundTask[];
  clients?: ClientRecord[];
  // Diagnóstico do webhook do WhatsApp — mais recente primeiro, capado (ver
  // recordWhatsAppWebhookEvent). Nunca guarda token/segredo nem o payload bruto.
  whatsappWebhookLog?: WhatsAppWebhookLogEntry[];
}

// Normaliza telefone para comparação (só dígitos) — usado para não cadastrar o mesmo
// cliente duas vezes só porque o telefone foi digitado com formatação diferente.
function normalizePhoneDigits(phone: string | undefined | null): string {
  return (phone || '').replace(/\D/g, '');
}

function findClientByPhoneOrName(
  clients: ClientRecord[],
  phone: string | undefined,
  name: string | undefined
): ClientRecord | undefined {
  const phoneDigits = normalizePhoneDigits(phone);
  if (phoneDigits) {
    const byPhone = clients.find((c) => normalizePhoneDigits(c.phone) === phoneDigits);
    if (byPhone) return byPhone;
  }
  const nameLower = (name || '').trim().toLowerCase();
  if (!nameLower) return undefined;
  return clients.find((c) => c.name.trim().toLowerCase() === nameLower);
}

const DESK_AGENT_NAMES: Record<string, string> = {
  carla_atendimento: 'Carla (Atendimento ao Cliente)',
  pedro_avaliacao: 'Pedro (Avaliação Técnica)',
  lucas_projetos: 'Lucas (Projetos & Fabricação)',
  ana_compras: 'Ana (Compras & Suprimentos)',
  mila_financeiro: 'Mila (Administração Financeira)',
  castro_estrategia: 'Castro (Estratégia & Negócio)',
  julia_marketing: 'Júlia (Marketing & Divulgação)',
  supervisora_geral: 'Helena (Supervisora Geral)',
  tapeceiro_tecnico: 'Tapeceiro Técnico (Produção e Materiais)',
};

// Mecanismo genérico de encaminhamento entre mesas: só reatribui currentDesk/deskStatus
// e registra o histórico — nunca inicia trabalho algum na mesa de destino sozinho. Extraído
// de POST /api/orders/transfer para ser reaproveitado por outras rotas (ex.: a Mila
// homologando o orçamento itemizado e encaminhando automaticamente para a Carla).
// Quem chamar é responsável por dar saveStore(store)/broadcastRealtimeEvent depois, exceto
// quando alreadyTransferred=true (nada novo foi criado, não há o que salvar/avisar).
function createOrderHandoff(
  store: PersistentStore,
  order: AttendanceRecord,
  params: {
    fromDesk: DepartmentId;
    toDesk: DepartmentId;
    reason: string;
    completedSummary: string;
    pendingItems?: string[];
    nextActionExpected: string;
    documentVersion?: string;
    deskStatusOverride?: OrderDeskStatus;
  }
): { handoff: OrderHandoffEntry; alreadyTransferred: boolean } {
  const { fromDesk, toDesk, reason, completedSummary, pendingItems, nextActionExpected, documentVersion } = params;

  // Prevenção de duplicidade: se o encaminhamento mais recente já é para a mesma mesa,
  // pela mesma origem, e ainda está pendente de aceite (ninguém mexeu nele ainda), um
  // novo clique repetido não deve empilhar outro registro idêntico no histórico.
  const lastHandoff = order.handoffHistory && order.handoffHistory[0];
  if (
    lastHandoff &&
    lastHandoff.fromDesk === fromDesk &&
    lastHandoff.toDesk === toDesk &&
    (lastHandoff.status || 'pendente_aceite') === 'pendente_aceite'
  ) {
    return { handoff: lastHandoff, alreadyTransferred: true };
  }

  const now = new Date().toISOString();
  const entry: OrderHandoffEntry = {
    id: `hnd-${Date.now()}`,
    orderId: order.id,
    fromDesk,
    toDesk,
    timestamp: now,
    reason: reason || 'Transferência entre mesas operacionais',
    completedSummary: completedSummary || 'Etapa anterior finalizada na mesa.',
    pendingItems: Array.isArray(pendingItems) ? pendingItems : pendingItems ? [pendingItems] : [],
    nextActionExpected: nextActionExpected || 'Análise técnica e continuidade dos trabalhos.',
    documentVersion: documentVersion || order.manufacturingData?.version || 'v1.0',
    status: 'pendente_aceite',
  };

  if (!order.handoffHistory) order.handoffHistory = [];
  order.handoffHistory.unshift(entry);

  order.currentDesk = toDesk;
  order.deskStatus = params.deskStatusOverride || 'transferido';
  order.assignedAgentName = DESK_AGENT_NAMES[toDesk] || toDesk;
  order.updatedAt = now;

  order.auditHistory.unshift({
    id: `aud-${Date.now()}`,
    timestamp: now,
    actor: `${DESK_AGENT_NAMES[fromDesk] || fromDesk} ➔ ${DESK_AGENT_NAMES[toDesk] || toDesk}`,
    stage: 'Transferência de Mesa',
    action: `Pedido transferido de ${fromDesk} para ${toDesk}`,
    details: `Motivo: ${reason}. Próxima ação: ${nextActionExpected}`,
  });

  if (!store.officeData) {
    store.officeData = {
      handoffs: [],
      generalTransactions: [],
      strategyRecommendations: [],
      weeklyStrategyPlans: [],
      weeklyActionPlans: [],
      recommendations: [],
      activeBottlenecks: [],
      workshopCapacityHoursPerWeek: 80,
      currentPlannedHoursWeek: 42,
      lastReconciledAt: now,
    };
  }
  store.officeData.handoffs.unshift(entry);
  store.officeData.lastReconciledAt = now;

  return { handoff: entry, alreadyTransferred: false };
}

const DEFAULT_MATERIALS: MaterialCatalogItem[] = [
  // 1. ESPUMAS
  {
    id: 'mat-espuma-d28',
    ownerId: 'system',
    code: 'ESP-D28',
    name: 'Espuma D28 Certificada (Bloco/Lâmina 10cm)',
    specification: 'Densidade 28 kg/m³ real certificada para braços, encostos e almofadas',
    category: 'Material',
    rawCategory: 'espumas',
    unit: 'm²',
    consumptionUnit: 'm²',
    purchaseUnit: 'bloco (2,00 x 1,50m = 3m²)',
    purchasePackageQuantity: 3,
    conversionFactor: 3,
    purchasePriceCents: 43500,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 14500,
    calculationMemory: 'Bloco de 3m² a R$ 435,00 = R$ 145,00 por m²',
    lossMarginPercent: 10,
    foamDensity: 'D28 Certificada',
    foamType: 'Bloco',
    dimensionsMm: { length: 2000, width: 1500, thickness: 100 },
    physicalStock: 6,
    reservedStock: 0,
    supplier: 'Espumas Sul Brasil',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  ...([1, 2, 3, 5, 7].map((thicknessCm) => ({
    id: `mat-espuma-d28-${thicknessCm}cm`,
    ownerId: 'system',
    code: `ESP-D28-${String(thicknessCm).padStart(2, '0')}`,
    name: `Espuma D28 Certificada (Lâmina ${thicknessCm}cm)`,
    specification: 'Densidade 28 kg/m³ real certificada',
    category: 'Material' as const,
    rawCategory: 'espumas' as const,
    unit: 'm²',
    consumptionUnit: 'm²',
    purchaseUnit: 'lâmina',
    unitCostCents: 0,
    notes: 'Preço ainda não cadastrado com o fornecedor — confirme antes de usar em orçamento.',
    lossMarginPercent: 10,
    foamDensity: 'D28 Certificada',
    foamType: 'Lâmina' as const,
    dimensionsMm: { length: 2000, width: 1500, thickness: thicknessCm * 10 },
    physicalStock: 0,
    reservedStock: 0,
    supplier: '',
    priceOrigin: 'Estimativa pendente' as const,
    isActive: true,
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
  }))),
  {
    id: 'mat-espuma-d33',
    ownerId: 'system',
    code: 'ESP-D33',
    name: 'Espuma D33 Alta Resiliência (Assento 12cm)',
    specification: 'Densidade 33 kg/m³ alta resiliência para assentos de uso contínuo',
    category: 'Material',
    rawCategory: 'espumas',
    unit: 'm²',
    consumptionUnit: 'm²',
    purchaseUnit: 'bloco (2,00 x 1,50m = 3m²)',
    purchasePackageQuantity: 3,
    conversionFactor: 3,
    purchasePriceCents: 56700,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 18900,
    calculationMemory: 'Bloco de 3m² a R$ 567,00 = R$ 189,00 por m²',
    lossMarginPercent: 10,
    foamDensity: 'D33 Alta Resiliência',
    foamType: 'Bloco',
    dimensionsMm: { length: 2000, width: 1500, thickness: 120 },
    physicalStock: 9,
    reservedStock: 2,
    supplier: 'Espumas Sul Brasil',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'mat-espuma-d45',
    ownerId: 'system',
    code: 'ESP-D45',
    name: 'Espuma D45 Ortopédica / Alta Densidade (Assento 14cm)',
    specification: 'Densidade 45 kg/m³ para suporte ortopédico e resistência extrema',
    category: 'Material',
    rawCategory: 'espumas',
    unit: 'm²',
    consumptionUnit: 'm²',
    purchaseUnit: 'bloco (2,00 x 1,50m = 3m²)',
    purchasePackageQuantity: 3,
    conversionFactor: 3,
    purchasePriceCents: 73500,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 24500,
    calculationMemory: 'Bloco de 3m² a R$ 735,00 = R$ 245,00 por m²',
    lossMarginPercent: 12,
    foamDensity: 'D45 Ortopédica',
    foamType: 'Bloco',
    dimensionsMm: { length: 2000, width: 1500, thickness: 140 },
    physicalStock: 4,
    reservedStock: 0,
    supplier: 'Espumas Sul Brasil',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 2. TECIDOS E REVESTIMENTOS
  {
    id: 'mat-linho-misto',
    ownerId: 'system',
    code: 'TEC-LIN-01',
    name: 'Tecido Linho Rústico Impermeabilizado (Larg. 1,40m)',
    specification: 'Composição 65% poliéster e 35% linho natural com acabamento hidro-repelente',
    category: 'Material',
    rawCategory: 'tecidos_revestimentos',
    unit: 'm linear',
    consumptionUnit: 'm linear',
    purchaseUnit: 'rolo (50m lineares)',
    purchasePackageQuantity: 50,
    conversionFactor: 50,
    purchasePriceCents: 390000,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 7800,
    calculationMemory: 'Rolo de 50m a R$ 3.900,00 = R$ 78,00 por metro linear (larg. 1,40m)',
    lossMarginPercent: 15,
    fabricType: 'Linho Rústico',
    color: 'Cru / Fendi',
    usableWidthMeters: 1.4,
    salesUnit: 'Metro linear',
    patternDirection: 'Sentido do rolo',
    physicalStock: 15,
    reservedStock: 0,
    supplier: 'Castros Têxtil',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'mat-veludo-monaco',
    ownerId: 'system',
    code: 'TEC-VEL-02',
    name: 'Tecido Veludo Monaco Toque Macio (Larg. 1,40m)',
    specification: 'Veludo 100% poliéster de alto tráfego com toque aveludado e brilho discreto',
    category: 'Material',
    rawCategory: 'tecidos_revestimentos',
    unit: 'm linear',
    consumptionUnit: 'm linear',
    purchaseUnit: 'rolo (50m lineares)',
    purchasePackageQuantity: 50,
    conversionFactor: 50,
    purchasePriceCents: 445000,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 8900,
    calculationMemory: 'Rolo de 50m a R$ 4.450,00 = R$ 89,00 por metro linear (larg. 1,40m)',
    lossMarginPercent: 15,
    fabricType: 'Veludo',
    color: 'Grafite / Terracota',
    usableWidthMeters: 1.4,
    salesUnit: 'Metro linear',
    patternDirection: 'Sentido do rolo',
    physicalStock: 18,
    reservedStock: 0,
    supplier: 'Castros Têxtil',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'mat-acrilon',
    ownerId: 'system',
    code: 'TEC-ACR-01',
    name: 'Tecido Acrilon',
    specification: 'Tecido usado na oficina para revestimento',
    category: 'Material',
    rawCategory: 'tecidos_revestimentos',
    unit: 'm',
    consumptionUnit: 'm',
    purchaseUnit: 'rolo',
    unitCostCents: 0,
    notes: 'Preço ainda não cadastrado com o fornecedor — confirme antes de usar em orçamento.',
    lossMarginPercent: 15,
    fabricType: 'Acrilon',
    patternDirection: 'Sentido do rolo',
    physicalStock: 0,
    reservedStock: 0,
    supplier: '',
    priceOrigin: 'Estimativa pendente',
    isActive: true,
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
  },

  // 3. MADEIRAS E CHAPAS
  {
    id: 'mat-madeira-eucalipto',
    ownerId: 'system',
    code: 'MAD-EUC-25',
    name: 'Madeira Eucalipto Tratado e Seco (Seção 70x25mm)',
    specification: 'Sarrafo de eucalipto seco em estufa aparelhado em 4 faces para esqueleto estrutural',
    category: 'Material',
    rawCategory: 'madeira_chapas',
    unit: 'm linear',
    consumptionUnit: 'm linear',
    purchaseUnit: 'feixe (30m lineares)',
    purchasePackageQuantity: 30,
    conversionFactor: 30,
    purchasePriceCents: 55500,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 1850,
    calculationMemory: 'Feixe de 30m lineares a R$ 555,00 = R$ 18,50 por metro linear',
    lossMarginPercent: 10,
    woodSpecies: 'Eucalipto Tratado em Estufa',
    woodSection: '70 x 25 mm',
    woodLengthCm: 300,
    physicalStock: 60,
    reservedStock: 0,
    supplier: 'Madereira São José',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 4. PERCINTAS E MOLAS
  {
    id: 'mat-percinta-italiana',
    ownerId: 'system',
    code: 'PER-70',
    name: 'Percinta Elástica Italiana 70mm',
    specification: 'Percinta elástica 70mm com 3 fios de borracha vulcanizada de alta durabilidade',
    category: 'Material',
    rawCategory: 'percintas_molas',
    unit: 'm',
    consumptionUnit: 'm',
    purchaseUnit: 'rolo (100m)',
    purchasePackageQuantity: 100,
    conversionFactor: 100,
    purchasePriceCents: 68000,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 680,
    calculationMemory: 'Rolo de 100m a R$ 680,00 = R$ 6,80 por metro linear',
    lossMarginPercent: 5,
    physicalStock: 80,
    reservedStock: 12,
    supplier: 'Casa do Tapeceiro',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 5. GRAMPOS E FIXADORES
  {
    id: 'mat-grampo-8010',
    ownerId: 'system',
    code: 'GRA-8010',
    name: 'Grampo Pneumático 80/10 (Caixa 5.000 un)',
    specification: 'Grampo galvanizado coroa 12,8mm x perna 10mm para tapeçaria fina',
    category: 'Material',
    rawCategory: 'grampos_fixadores',
    unit: 'unidade',
    consumptionUnit: 'unidade',
    purchaseUnit: 'caixa (5.000 un)',
    purchasePackageQuantity: 5000,
    conversionFactor: 5000,
    purchasePriceCents: 4500,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 1, // R$ 0,009 arredondado para 1 centavo
    calculationMemory: 'Caixa com 5.000 un a R$ 45,00 = R$ 0,009 por grampo',
    lossMarginPercent: 5,
    stapleType: '80/10',
    stapleSize: '10mm',
    stapleCompatibility: 'Grampeadores pneumáticos tipo 80 (Rocama/Pacar)',
    stapleQuantityPerBox: 5000,
    physicalStock: 15000,
    reservedStock: 0,
    supplier: 'Casa do Tapeceiro',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'mat-grampo-8014',
    ownerId: 'system',
    code: 'GRA-8014',
    name: 'Grampo Pneumático 80/14',
    specification: 'Grampo galvanizado coroa 12,8mm x perna 14mm, intermediário entre o 80/10 e o estrutural 14/50',
    category: 'Material',
    rawCategory: 'grampos_fixadores',
    unit: 'unidade',
    consumptionUnit: 'unidade',
    purchaseUnit: 'caixa',
    unitCostCents: 0,
    notes: 'Preço ainda não cadastrado com o fornecedor — confirme antes de usar em orçamento.',
    lossMarginPercent: 5,
    stapleType: '80/14',
    stapleSize: '14mm',
    physicalStock: 0,
    reservedStock: 0,
    supplier: '',
    priceOrigin: 'Estimativa pendente',
    isActive: true,
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
  },
  {
    id: 'mat-grampo-1450',
    ownerId: 'system',
    code: 'GRA-1450',
    name: 'Grampo Estrutural 14/50 para Armação Pesada',
    specification: 'Grampo de alta fixação perna 50mm para montagem e travamento de esqueleto',
    category: 'Material',
    rawCategory: 'grampos_fixadores',
    unit: 'unidade',
    consumptionUnit: 'unidade',
    purchaseUnit: 'caixa (3.000 un)',
    purchasePackageQuantity: 3000,
    conversionFactor: 3000,
    purchasePriceCents: 7800,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 3,
    calculationMemory: 'Caixa com 3.000 un a R$ 78,00 = R$ 0,026 por grampo',
    lossMarginPercent: 5,
    stapleType: '14/50',
    stapleSize: '50mm',
    stapleCompatibility: 'Grampeadores estruturais pesados tipo 14',
    stapleQuantityPerBox: 3000,
    physicalStock: 6000,
    reservedStock: 0,
    supplier: 'Casa do Tapeceiro',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 6. COLAS E AUXILIARES
  {
    id: 'mat-cola-contato',
    ownerId: 'system',
    code: 'COL-CON-14',
    name: 'Cola de Contato Expley (Lata 14kg)',
    specification: 'Cola de contato de alta aderência para colagem de espumas e madeira, marca usada na oficina',
    brand: 'Expley',
    category: 'Material',
    rawCategory: 'colas_auxiliares',
    unit: 'kg',
    consumptionUnit: 'kg',
    purchaseUnit: 'lata (14 kg)',
    purchasePackageQuantity: 14,
    conversionFactor: 14,
    purchasePriceCents: 35000,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 2500,
    calculationMemory: 'Lata de 14kg a R$ 350,00 = R$ 25,00 por kg consumido',
    lossMarginPercent: 5,
    physicalStock: 28,
    reservedStock: 2,
    supplier: 'Química Estofados Brasil',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 7. MANTAS E ENCHIMENTOS
  {
    id: 'mat-manta-acrilica',
    ownerId: 'system',
    code: 'MNT-200',
    name: 'Manta Acrílica Siliconada 200g',
    specification: 'Gramatura 200g/m² siliconada antialérgica para acolchoamento e toque fofo',
    category: 'Material',
    rawCategory: 'mantas_enchimentos',
    unit: 'm',
    consumptionUnit: 'm',
    purchaseUnit: 'rolo (30m)',
    purchasePackageQuantity: 30,
    conversionFactor: 30,
    purchasePriceCents: 72000,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 2400,
    calculationMemory: 'Rolo de 30m a R$ 720,00 = R$ 24,00 por metro',
    lossMarginPercent: 8,
    physicalStock: 25,
    reservedStock: 0,
    supplier: 'Textil Estofados',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 8. PÉS E FERRAGENS
  {
    id: 'mat-pe-conico-15',
    ownerId: 'system',
    code: 'PE-CON-15',
    name: 'Pé Cônico de Madeira Maciça Torneada 15cm com Sapatilha',
    specification: 'Madeira nobre envernizada tom imbuia com chapa metálica de fixação angular e feltro',
    category: 'Material',
    rawCategory: 'pes_ferragens',
    unit: 'peça',
    consumptionUnit: 'peça',
    purchaseUnit: 'jogo (4 peças)',
    purchasePackageQuantity: 4,
    conversionFactor: 4,
    purchasePriceCents: 12800,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 3200,
    calculationMemory: 'Jogo com 4 pés a R$ 128,00 = R$ 32,00 por pé',
    lossMarginPercent: 0,
    physicalStock: 16,
    reservedStock: 0,
    supplier: 'Torneados Nobres',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },

  // 9. OUTROS MATERIAIS
  {
    id: 'mat-ziper',
    ownerId: 'system',
    code: 'ZIP-METRO',
    name: 'Zíper em Metro (Cadarço)',
    specification: 'Zíper vendido em metro, para abertura de almofadas e revestimentos removíveis',
    category: 'Material',
    rawCategory: 'outros_materiais',
    unit: 'm',
    consumptionUnit: 'm',
    purchaseUnit: 'm',
    unitCostCents: 0,
    notes: 'Preço ainda não cadastrado com o fornecedor — confirme antes de usar em orçamento.',
    lossMarginPercent: 5,
    physicalStock: 0,
    reservedStock: 0,
    supplier: '',
    priceOrigin: 'Estimativa pendente',
    isActive: true,
    createdAt: '2026-11-04T00:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
  },
  {
    id: 'mat-forro-tnt',
    ownerId: 'system',
    code: 'TNT-100',
    name: 'Forro Inferior TNT Gramatura 100g Preto',
    specification: 'TNT preto 100g para acabamento inferior respirável e proteção contra poeira',
    category: 'Material',
    rawCategory: 'outros_materiais',
    unit: 'm',
    consumptionUnit: 'm',
    purchaseUnit: 'rolo (100m)',
    purchasePackageQuantity: 100,
    conversionFactor: 100,
    purchasePriceCents: 95000,
    freightCents: 0,
    discountCents: 0,
    unitCostCents: 950,
    calculationMemory: 'Rolo de 100m a R$ 950,00 = R$ 9,50 por metro',
    lossMarginPercent: 5,
    physicalStock: 45,
    reservedStock: 0,
    supplier: 'Casa do Tapeceiro',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'mat-linha-costura',
    ownerId: 'system',
    code: 'LIN-040-060',
    name: 'Linha de Costura Industrial Bitola 040-060',
    specification: 'Linha para máquina industrial de tapeçaria, bitola 040-060 (a mais usada na oficina)',
    category: 'Material',
    rawCategory: 'outros_materiais',
    unit: 'm',
    consumptionUnit: 'm',
    purchaseUnit: 'cone',
    unitCostCents: 0,
    notes: 'Preço ainda não cadastrado com o fornecedor — confirme antes de usar em orçamento.',
    lossMarginPercent: 5,
    physicalStock: 0,
    reservedStock: 0,
    supplier: '',
    priceOrigin: 'Estimativa pendente',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-11-04T00:00:00.000Z',
  },

  // SERVIÇOS & LOGÍSTICA
  {
    id: 'srv-mao-obra-sofa',
    ownerId: 'system',
    code: 'SRV-TAP-01',
    name: 'Mão de Obra de Tapeçaria e Costura (Sofá 3 Lugares)',
    specification: 'Tapeçaria artesanal de atelier com acabamento rebatido e alinhamento milimétrico',
    category: 'Mão de obra',
    unit: 'serviço',
    consumptionUnit: 'serviço',
    unitCostCents: 85000,
    supplier: 'Oficina Castros Interiores',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'srv-marcenaria-reforco',
    ownerId: 'system',
    code: 'SRV-MAR-01',
    name: 'Reforço Estrutural de Marcenaria e Esquadro',
    specification: 'Esquadrejamento, colagem e travamento de chassi de madeira',
    category: 'Mão de obra',
    unit: 'serviço',
    consumptionUnit: 'serviço',
    unitCostCents: 28000,
    supplier: 'Oficina Castros Interiores',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'srv-transporte',
    ownerId: 'system',
    code: 'SRV-TRA-01',
    name: 'Coleta e Entrega Especializada (Ida e Volta)',
    specification: 'Logística com veículo furgão próprio, mantas de proteção acolchoadas e ajudantes',
    category: 'Transporte',
    unit: 'viagem',
    consumptionUnit: 'viagem',
    unitCostCents: 18000,
    supplier: 'Logística Castros Interiores',
    priceDate: '2026-10-20',
    priceOrigin: 'Fornecedor cadastrado',
    isActive: true,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
];

const INITIAL_SAMPLE_ATTENDANCE: AttendanceRecord = {
  id: 'att-ci-2026-0001',
  ownerId: 'system',
  attendanceNumber: 'CI-2026-0001',
  status: 'Pronto para análise',
  currentStep: 2,
  clientName: 'Helena Vasconcelos',
  clientPhone: '(91) 98556-9841',
  furnitureType: 'Sofá 3 Lugares Fixo com Almofadas Soltas',
  piecesCount: '1 estrutura principal + 3 almofadas de assento + 3 almofadas de encosto',
  approxMeasurements: '2,20m (largura) x 0,92m (profundidade) x 0,85m (altura)',
  usageTime: '6 anos de uso residencial',
  reportedDefects:
    'Afundamento acentuado na almofada de assento do lado direito, costura rasgada e desgaste intenso no braço direito (arranhaduras e tecido puído), além de sensação de perda de sustentação nas percintas centrais.',
  desiredService:
    'Reforma completa de revestimento, recuperação do conforto dos assentos e revisão das percintas e estrutura interna.',
  previousReforms: 'Nenhuma reforma anterior (revestimento e espumas originais de fábrica).',
  fabricAndComfortPreference:
    'Tecido linho misto bege ou cinza aquecido de fácil limpeza; conforto firme no assento (D33 com manta siliconada).',
  notes: 'Cliente tem interesse em preservar o sofá pois a madeira original é pesada e as medidas são exatas para a sala.',
  createdAt: '2026-10-21T14:00:00.000Z',
  updatedAt: '2026-10-21T14:30:00.000Z',
  photos: [
    {
      id: 'photo-sample-1',
      code: 'F-01',
      attendanceId: 'att-ci-2026-0001',
      furnitureLabel: 'Sofá 3 Lugares Fixo',
      category: 'Frente',
      caption: 'Vista frontal do sofá de 3 lugares mostrando afundamento no assento direito e desgaste severo no braço direito.',
      imageUrl: '/src/assets/images/sofa_desgaste_frente_1792622696230.jpg',
      mimeType: 'image/jpeg',
      uploadStatus: 'saved',
      createdAt: '2026-10-21T14:05:00.000Z',
    },
    {
      id: 'photo-sample-2',
      code: 'F-02',
      attendanceId: 'att-ci-2026-0001',
      furnitureLabel: 'Sofá 3 Lugares Fixo',
      category: 'Detalhes dos defeitos',
      caption: 'Detalhe aproximado do braço com costura aberta, tecido rasgado e espuma interna exposta e amarelada.',
      imageUrl: '/src/assets/images/sofa_detalhe_costura_braco_1792622696712.jpg',
      mimeType: 'image/jpeg',
      uploadStatus: 'saved',
      createdAt: '2026-10-21T14:06:00.000Z',
    },
    {
      id: 'photo-sample-3',
      code: 'F-03',
      attendanceId: 'att-ci-2026-0001',
      furnitureLabel: 'Poltrona / Estrutura de Referência na Oficina',
      category: 'Estrutura interna fotografada pela oficina',
      caption: 'Inspeção em bancada da oficina exibindo madeiramento aparente, percintas elásticas entrelaçadas e camada de espuma.',
      imageUrl: '/src/assets/images/poltrona_estrutura_oficina_1792622698076.jpg',
      mimeType: 'image/jpeg',
      uploadStatus: 'saved',
      createdAt: '2026-10-21T14:08:00.000Z',
    },
  ],
  leftRightReference: 'Olhando o móvel de frente (referência do observador posicionado diante da face frontal do estofado)',
  defectFindings: [],
  analysisLimitations: [],
  requestedAdditionalPhotos: [],
  aiPreliminarySummary: '',
  reviewCompleted: false,
  reviewerName: '',
  reviewerGeneralNotes: '',
  internalInspectionCompleted: false,
  reuseItems: [],
  foamInspection: {
    inspectedByWorkshop: false,
    permanentDeformation: 'Não avaliado',
    compressionReturn: 'Não avaliado',
    crumbling: 'Não avaliado',
    odor: 'Não avaliado',
    moisture: 'Não avaliado',
    workshopNotes: '',
  },
  materialConsumptionAndReworkAnalysis: '',
  proposals: [],
  selectedProposalTier: 'RECOMENDADA',
  budget: {
    items: [
      {
        id: 'bi-1',
        catalogItemId: 'mat-linho-misto',
        category: 'Material',
        name: 'Tecido Linho Misto Impermeabilizado (Larg. 1,40m)',
        unit: 'm',
        quantity: null,
        quantityStatus: 'A levantar (requer medidas e plano de corte)',
        unitCostCents: 7800,
      },
      {
        id: 'bi-2',
        catalogItemId: 'mat-espuma-d33',
        category: 'Material',
        name: 'Espuma D33 Alta Resiliência (Assento 12cm)',
        unit: 'm²',
        quantity: 2,
        quantityStatus: 'Definida',
        unitCostCents: 18900,
      },
      {
        id: 'bi-3',
        catalogItemId: 'mat-percinta-italiana',
        category: 'Material',
        name: 'Percinta Elástica Italiana 70mm',
        unit: 'm',
        quantity: 12,
        quantityStatus: 'Definida',
        unitCostCents: 680,
      },
      {
        id: 'bi-4',
        catalogItemId: 'srv-mao-obra-sofa',
        category: 'Mão de obra',
        name: 'Mão de Obra de Tapeçaria e Costura (Sofá 3 Lugares)',
        unit: 'serviço',
        quantity: 1,
        quantityStatus: 'Definida',
        unitCostCents: 85000,
      },
      {
        id: 'bi-5',
        catalogItemId: 'srv-transporte',
        category: 'Transporte',
        name: 'Coleta e Entrega Especializada (Ida e Volta)',
        unit: 'viagem',
        quantity: 1,
        quantityStatus: 'Definida',
        unitCostCents: 18000,
      },
    ],
    cuttingPlanConfirmed: false,
    sellingPriceCents: null,
    paymentConditions: 'não informado',
    estimatedDeadline: 'não informado',
    confirmedByResponsible: false,
    responsibleName: '',
  },
  opinion: {
    isPreliminary: true,
    structureStateSummary: 'Sujeito à confirmação após desmontagem completa do revestimento na oficina.',
    damageExtentSummary: 'Desgaste severo no revestimento externo, costura aberta no braço e deformação de espuma no assento.',
    possibleRecoverySummary: 'Recuperação plena de conforto e acabamento mediante troca do revestimento, recomposição de espumas e revisão de percintas.',
    reusableMaterialsSummary: 'Madeiramento principal e pés em madeira maciça são candidatos a reaproveitamento mediante inspeção interna.',
    complexityLevel: 'Média',
    expectedResultSummary: 'Renovação estética completa e restabelecimento da ergonomia dos assentos.',
    equivalentNewFurniturePriceCents: 580000,
    clientInterestInKeeping: 'Alto — peça com medidas exatas para o ambiente e estrutura robusta.',
    conclusion: 'Dados insuficientes para concluir',
    reasons: 'Análise e orçamento ainda dependem de revisão pelo responsável e confirmação da metragem no plano de corte.',
    pendingFactors: 'Inspeção interna integral do chassi de madeira e levantamento da metragem exata de tecido.',
    whatCouldChangeConclusion: 'Caso a inspeção na oficina identifique comprometimento severo oculto na estrutura de madeira (ex: trincas extensas ou xilófagos).',
    clientPlainLanguageSummary: 'Pelas fotos enviadas, seu sofá tem bom potencial de recuperação, especialmente por possuir formato clássico e pés de madeira preservados. O orçamento definitivo e a confirmação da estrutura interna dependem da conferência técnica do responsável.',
    recommendedNextStep: 'Executar a análise de fotos com IA, revisar pelo responsável e confirmar o plano de corte do tecido.',
  },
  hiddenDamages: [],
  auditHistory: [
    {
      id: 'log-init-1',
      timestamp: '2026-10-21T14:00:00.000Z',
      actor: 'Recepção Castros Interiores',
      stage: 'Cadastro',
      action: 'Atendimento registrado',
      details: 'Cadastro inicial do atendimento CI-2026-0001 com 3 fotos vinculadas.',
    },
  ],
  staleness: {
    defectsAnalysisNeedsReview: false,
    responsibleReviewNeedsUpdate: false,
    reuseNeedsReview: false,
    proposalNeedsReview: false,
    opinionNeedsReview: false,
  },
};

function stripPhoneFromCtaServer(ctaText: string, phoneNumber?: string): string {
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

function formatSingleWhatsAppBlockServer(
  ctaButtonText: string,
  whatsappDirectNumber: string
): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanCta = stripPhoneFromCtaServer(ctaButtonText, cleanPhone);
  return cleanCta
    ? `${cleanCta}\nWhatsApp: ${cleanPhone}`
    : `WhatsApp: ${cleanPhone}`;
}

function buildServerFaithfulFeedText(
  headline: string,
  copyText: string,
  ctaButtonText: string,
  whatsappDirectNumber: string,
  hashtags: string
): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanCopy = (copyText || '')
    .replace(
      new RegExp(
        `Falar no WhatsApp\\s*\\(?\\d{2}\\)?\\s*\\d{4,5}-?\\d{4}\\s*:\\s*\\(?\\d{2}\\)?\\s*\\d{4,5}-?\\d{4}`,
        'gi'
      ),
      `WhatsApp: ${cleanPhone}`
    )
    .trim();
  const contactBlock = formatSingleWhatsAppBlockServer(ctaButtonText, cleanPhone);
  return `${(headline || '').trim()}\n\n${cleanCopy}\n\n${contactBlock}\n\n${(hashtags || '').trim()}`.trim();
}

function buildServerFaithfulStoriesText(
  headline: string,
  copyText: string,
  ctaButtonText: string,
  whatsappDirectNumber: string
): string {
  const cleanPhone = (whatsappDirectNumber || '(91) 98556-9841')
    .replace(/^whatsapp\s*:\s*/i, '')
    .trim();
  const cleanCopy = (copyText || '').trim();
  const contactBlock = formatSingleWhatsAppBlockServer(ctaButtonText, cleanPhone);
  return `${(headline || '').trim()}\n\n${cleanCopy}\n\n${contactBlock}`.trim();
}

function stripHashtagsServer(text: string): string {
  return (text || '')
    .replace(/#[a-zA-Z0-9_\u00C0-\u00FF]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function generateSocialMediaVersionsServer(
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
  const cleanCopyNoHashtags = stripHashtagsServer(cleanCopy);
  const cleanCta = stripPhoneFromCtaServer(ctaButtonText, cleanPhone);
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

function createDefaultJuliaProject(id = 'proj-julia-01'): JuliaSmartAdProject {
  const today = new Date().toISOString().slice(0, 10);
  const defaultHeadline = 'Renove Seu Estofado com Qualidade Profissional — Para Casa e Empresa';
  const defaultCopy =
    'Renovamos sofás, poltronas e cadeiras com cuidado em cada detalhe, para a sua casa ou para o seu negócio. Na Castros Interiores, cada costura, alinhamento e textura recebe atenção e qualidade do início ao fim.';
  const defaultCta = 'Peça Seu Orçamento';
  const defaultPhone = '(91) 98556-9841';
  const defaultHashtags =
    '#CastrosInteriores #RenovacaoDeEstofados #EstofadosResidenciaisEComerciais #DecoracaoDeInteriores #SalaDeEstar #ConfortoENovaVida';

  const socialVersions = generateSocialMediaVersionsServer(
    defaultHeadline,
    defaultCopy,
    defaultCta,
    defaultPhone,
    defaultHashtags
  );

  return {
    id,
    name: 'Campanha Renovação de Estofados — Castros Interiores',
    currentStep: 1,
    selectedPhotoIds: [],
    campaignObjective:
      'Divulgar a qualidade, o cuidado e a confiança na renovação de sofás, poltronas e cadeiras da Castros Interiores, para clientes residenciais e comerciais.',
    targetAudience:
      'Famílias, escritórios, comércios e qualquer cliente que queira renovar o estofado em vez de comprar um novo.',
    pieceFormat: 'Anúncio',
    headline: defaultHeadline,
    copyText: defaultCopy,
    adFeedText: socialVersions.instagramFeed,
    adStoriesText: socialVersions.instagramStories,
    adFeedAdaptedByAi: false,
    adStoriesAdaptedByAi: false,
    targetChannel: 'Todas as redes sociais',
    socialMediaVersions: socialVersions,
    posterConfig: {
      headline: defaultHeadline,
      subheadline: 'Reforma e Renovação de Estofados — Residencial e Comercial',
      badgeText: 'QUALIDADE E CONFIANÇA NA RENOVAÇÃO DO SEU ESTOFADO',
      ctaText: 'Peça Seu Orçamento pelo WhatsApp',
      contactLine: '(91) 98556-9841',
      theme: 'noite_ouro',
    },
    carouselSlides: [
      {
        slideNumber: 1,
        title: defaultHeadline,
        body: 'Um estofado de presença transforma toda a atmosfera do ambiente com elegância e acolhimento.',
        theme: 'noite_ouro',
      },
      {
        slideNumber: 2,
        title: 'Qualidade Profissional em Cada Detalhe',
        body: 'Costuras alinhadas, caimento impecável e seleção criteriosa de texturas contemporâneas.',
        theme: 'noite_ouro',
      },
      {
        slideNumber: 3,
        title: 'Conforto e Ergonomia Sob Medida',
        body: 'A sensação de um estofado renovado pensado para os melhores momentos da sua família.',
        theme: 'noite_ouro',
      },
      {
        slideNumber: 4,
        title: 'Personalização para o Seu Estilo',
        body: 'Tons neutros aquecidos, linhos nobres e detalhes que valorizam a arquitetura do seu espaço.',
        theme: 'noite_ouro',
      },
      {
        slideNumber: 5,
        title: 'Fale com a Castros Interiores',
        body: 'Envie uma foto do seu estofado pelo WhatsApp (91) 98556-9841 e receba atendimento personalizado.',
        theme: 'noite_ouro',
      },
    ],
    catalogEntries: [],
    hashtags: defaultHashtags,
    ctaButtonText: defaultCta,
    whatsappDirectNumber: '(91) 98556-9841',
    scheduleChannel: 'Instagram Feed',
    scheduleDate: today,
    scheduleTime: '18:00',
    scheduleMode: 'planejada_manual',
    finalReviewNotes:
      'Campanha revisada e pronta para compartilhamento no Instagram, Status e Lista do WhatsApp.',
    stepStates: {
      1: { saved: true, savedAt: new Date().toISOString() },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultJuliaData(): JuliaDepartmentData {
  const defaultProject = createDefaultJuliaProject();
  const today = new Date().toISOString().slice(0, 10);
  return {
    photos: [],
    projects: [defaultProject],
    activeProjectId: defaultProject.id,
    chatHistory: [
      {
        id: 'msg-julia-welcome',
        sender: 'julia',
        modality: 'texto',
        text: 'Olá! Sou a Júlia, responsável por Marketing, Publicidade e Divulgação da Castros Interiores. Você pode enviar fotos direto do seu celular a qualquer momento (sem precisar de atendimento ativo), percorrer as 12 etapas do Anúncio Inteligente com os botões de Avançar, Voltar, Salvar e Corrigir, criar Anúncios, Pôsteres, Carrosséis e Catálogos, conversar comigo por voz ou texto, programar campanhas e emitir o Relatório Diário.',
        timestamp: new Date().toISOString(),
      },
    ],
    campaigns: [
      {
        id: 'camp-init-1',
        title: 'Vitrine Semanal — Alta Estofaria Castros Interiores',
        format: 'Carrossel',
        channel: 'Instagram Feed',
        scheduledDate: today,
        scheduledTime: '18:00',
        status: 'Programada',
        captionPreview:
          'A Arte de Renovar o Seu Estofado com Acabamento de Atelier. Fale conosco pelo WhatsApp (91) 98556-9841.',
        createdAt: new Date().toISOString(),
      },
    ],
    dailyReports: [
      {
        id: 'rep-init-1',
        date: today,
        summaryText:
          'Departamento Júlia Marketing, Publicidade e Divulgação ativo e sincronizado entre Celular, Tablet e Computador. Fluxo das 12 etapas do Anúncio Inteligente, estúdio de Pôsteres, Carrosséis e Catálogos e recepção direta de fotos do celular prontos para operação.',
        highlights: [
          'Canal direto de fotos do celular habilitado sem depender de atendimento ativo.',
          'Campanha de vitrine semanal estruturada nas 12 etapas do Anúncio Inteligente.',
          'Estúdio de Anúncios, Pôsteres, Carrosséis e Catálogos sincronizado.',
        ],
        nextDayRecommendations: [
          'Fotografar pelo celular um estofado finalizado na iluminação natural para publicar nos Stories e Status do WhatsApp.',
          'Compartilhar o Catálogo Digital com clientes na lista de transmissão do WhatsApp.',
        ],
        metricsSnapshot: {
          photosReceived: 0,
          adsCreated: 1,
          postersCreated: 1,
          carouselsCreated: 1,
          catalogsCreated: 1,
          scheduledCampaigns: 1,
          voiceTextInteractions: 1,
        },
        createdAt: new Date().toISOString(),
      },
    ],
    paidAdProposals: [],
  };
}

function reconcileJuliaPhotosFromDisk(juliaData: JuliaDepartmentData): boolean {
  let changed = false;
  try {
    if (fs.existsSync(PHOTOS_DIR)) {
      const files = fs
        .readdirSync(PHOTOS_DIR)
        .filter((f) => f.startsWith('julia_') && /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();

      for (const fileName of files) {
        const expectedUrl = `/api/photos/${fileName}`;
        const alreadyExists = juliaData.photos.some(
          (p) => p.imageUrl === expectedUrl || fileName.includes(p.id)
        );
        if (!alreadyExists) {
          const rawId = fileName
            .replace(/^julia_/, '')
            .replace(/\.(jpg|jpeg|png|webp)$/i, '');
          const stat = fs.statSync(path.join(PHOTOS_DIR, fileName));
          const ext = path.extname(fileName).toLowerCase();
          const mimeType =
            ext === '.png'
              ? 'image/png'
              : ext === '.webp'
              ? 'image/webp'
              : 'image/jpeg';
          const recoveredPhoto: JuliaMarketingPhoto = {
            id: rawId || `jphoto-${Date.now()}`,
            title: `Fotografia Castros Interiores #${juliaData.photos.length + 1}`,
            caption: 'Fotografia preservada na biblioteca da Castros Interiores.',
            tag: 'Estofado Pronto',
            imageUrl: expectedUrl,
            thumbnailDataUrl: '',
            mimeType,
            sourceDevice: 'Biblioteca Castros Interiores',
            createdAt: stat.mtime.toISOString(),
          };
          juliaData.photos.push(recoveredPhoto);
          changed = true;
        }
      }
    }

    // Ensure active project has selected photos & carousel slide photos linked if photos exist
    const activeProj =
      juliaData.projects.find((p) => p.id === juliaData.activeProjectId) ||
      juliaData.projects[0];
    if (activeProj && juliaData.photos.length > 0) {
      if (activeProj.selectedPhotoIds.length === 0) {
        activeProj.selectedPhotoIds = juliaData.photos.map((p) => p.id);
        changed = true;
      }
      if (!activeProj.posterConfig.photoId) {
        activeProj.posterConfig.photoId = juliaData.photos[0].id;
        changed = true;
      }
      activeProj.carouselSlides = activeProj.carouselSlides.map((slide, idx) => {
        if (!slide.photoId && juliaData.photos.length > 0) {
          changed = true;
          return {
            ...slide,
            photoId: juliaData.photos[idx % juliaData.photos.length].id,
            theme: slide.theme || 'noite_ouro',
          };
        }
        return {
          ...slide,
          theme: slide.theme || 'noite_ouro',
        };
      });
    }

    // CORREÇÃO 1 (FINAL): Eliminar qualquer duplicação do número de WhatsApp nos projetos salvos
    for (const proj of juliaData.projects) {
      const cleanPhone = (proj.whatsappDirectNumber || '(91) 98556-9841')
        .replace(/^whatsapp\s*:\s*/i, '')
        .trim();
      if (proj.whatsappDirectNumber !== cleanPhone) {
        proj.whatsappDirectNumber = cleanPhone;
        changed = true;
      }
      // Se o CTA contém o telefone embutido (ex: "Falar no WhatsApp (91) 98556-9841"), limpamos para evitar duplicação
      const strippedCta = stripPhoneFromCtaServer(proj.ctaButtonText, cleanPhone);
      const nextCta = strippedCta || 'Solicite Atendimento Exclusivo';
      if (proj.ctaButtonText !== nextCta && /\d{4}/.test(proj.ctaButtonText || '')) {
        proj.ctaButtonText = nextCta;
        changed = true;
      }
      if (!proj.adFeedAdaptedByAi) {
        const expectedFeed = buildServerFaithfulFeedText(
          proj.headline,
          proj.copyText,
          proj.ctaButtonText,
          cleanPhone,
          proj.hashtags
        );
        if (proj.adFeedText !== expectedFeed) {
          proj.adFeedText = expectedFeed;
          changed = true;
        }
      } else if (proj.adFeedText) {
        const dedupedFeed = proj.adFeedText.replace(
          /Falar no WhatsApp\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}\s*:\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}/gi,
          `WhatsApp: ${cleanPhone}`
        );
        if (dedupedFeed !== proj.adFeedText) {
          proj.adFeedText = dedupedFeed;
          changed = true;
        }
      }
      if (!proj.adStoriesAdaptedByAi) {
        const expectedStories = buildServerFaithfulStoriesText(
          proj.headline,
          proj.copyText,
          proj.ctaButtonText,
          cleanPhone
        );
        if (proj.adStoriesText !== expectedStories) {
          proj.adStoriesText = expectedStories;
          changed = true;
        }
      } else if (proj.adStoriesText) {
        const dedupedStories = proj.adStoriesText.replace(
          /Falar no WhatsApp\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}\s*:\s*\(?\d{2}\)?\s*\d{4,5}-?\d{4}/gi,
          `WhatsApp: ${cleanPhone}`
        );
        if (dedupedStories !== proj.adStoriesText) {
          proj.adStoriesText = dedupedStories;
          changed = true;
        }
      }

      if (!proj.targetChannel) {
        proj.targetChannel = 'Todas as redes sociais';
        changed = true;
      }
      if (!proj.socialMediaVersions || !proj.socialMediaVersions.whatsappMessage) {
        proj.socialMediaVersions = generateSocialMediaVersionsServer(
          proj.headline,
          proj.copyText,
          proj.ctaButtonText,
          cleanPhone,
          proj.hashtags
        );
        changed = true;
      } else {
        // Garantir que a versão WhatsApp nunca contenha hashtags
        const noHashMsg = stripHashtagsServer(proj.socialMediaVersions.whatsappMessage);
        const noHashStatus = stripHashtagsServer(proj.socialMediaVersions.whatsappStatus);
        if (
          noHashMsg !== proj.socialMediaVersions.whatsappMessage ||
          noHashStatus !== proj.socialMediaVersions.whatsappStatus
        ) {
          proj.socialMediaVersions.whatsappMessage = noHashMsg;
          proj.socialMediaVersions.whatsappStatus = noHashStatus;
          changed = true;
        }
      }
    }
  } catch (err) {
    console.error('Aviso ao reconciliar fotos da Júlia no disco:', err);
  }
  return changed;
}

// Guarda, por objeto `store` devolvido por loadStore(), uma cópia serializada
// de como ele estava no momento da leitura — saveStore() compara contra isto
// para saber EXATAMENTE quais chaves de topo a chamada em questão mudou, e
// só sincroniza essas chaves com o Firestore (ver persistStoreKeysTransac
// tionally). Um `store` nunca antes visto aqui (ex.: construído à mão, ou
// a chamada interna de loadStore() a si mesma durante reconciliação) trata
// TODAS as chaves como alteradas — comportamento seguro por omissão.
const pristineStoreSnapshots = new WeakMap<PersistentStore, string>();

// `attendances` e `agentChats` não são tratados como "mais uma chave de
// topo" — mesmo entre chamadas que mudam a MESMA chave (ex.: duas rotas
// diferentes editando atendimentos distintos, ou o webhook do WhatsApp
// escrevendo uma mensagem enquanto um humano edita OUTRO atendimento), uma
// substituição da chave inteira faria uma das duas gravações vencer por
// completo, perdendo a mutação da outra que não tinha chegado a ela ainda.
// Por isso o diff é calculado por ITEM (por id do atendimento; por id da
// mensagem dentro de cada mesa) — e, dentro de cada atendimento, por CAMPO
// de primeiro nível (ver AttendanceFieldUpdate abaixo): duas chamadas
// editando o MESMO atendimento em campos DIFERENTES (ex.: uma muda
// `reportedDefects`, outra muda `clientName`) agora também sobrevivem as
// duas — só colide de verdade se as duas mudarem exatamente o mesmo campo.
//
// LIMITE DECLARADO (não é resolvido pela migração para coleções por si só
// — ver migrations/README.md): o merge por campo para no PRIMEIRO nível do
// atendimento. Um objeto aninhado (`budget`, `opinion`, `foamInspection`,
// etc.) que mudou é tratado como um bloco só — duas edições concorrentes
// tocando campos DIFERENTES dentro do MESMO objeto aninhado (ex.: uma muda
// `budget.sellingPriceCents`, outra muda `budget.paymentConditions`, no
// mesmo atendimento, ao mesmo tempo) ainda colidem, porque `budget` conta
// como "um campo" nesta camada. Ir mais fundo exigiria merge recursivo
// (inclusive soldando arrays como `budget.items`/`proposals` pelo próprio
// id, recursivamente) — fora do escopo desta correção. Isso é verdade
// independente de o armazenamento ser um documento único ou coleções por
// entidade: só um merge de verdade (campo a campo, dentro de uma
// transação) fecha esse tipo de corrida — migrar para coleções sozinho
// reduz o "raio de alcance" de um `.set()` cego, mas não adiciona
// granularidade de campo a uma escrita que continue substituindo o
// registro inteiro.
interface AttendanceFieldUpdate {
  id: string;
  isNew: boolean;
  fields: Record<string, unknown>; // campos alterados (objeto completo se isNew)
}

interface StoreDiff {
  changedTopLevelKeys: string[]; // todas as outras chaves (settings, juliaData, materials, clients, backgroundTasks, whatsappWebhookLog, officeData) — substituição inteira, ver limitação abaixo
  attendanceUpdates: AttendanceFieldUpdate[];
  attendanceDeletes: string[];
  agentChatNewMessages: Record<string, AgentChatMessage[]>;
}

function computeStoreDiff(store: PersistentStore): StoreDiff {
  const pristineJson = pristineStoreSnapshots.get(store);
  const allKeys = Object.keys(store).filter((k) => k !== 'attendances' && k !== 'agentChats');
  let pristine: Record<string, unknown> | undefined;
  if (pristineJson) {
    try {
      pristine = JSON.parse(pristineJson) as Record<string, unknown>;
    } catch {
      pristine = undefined;
    }
  }
  const hasPristine = pristine !== undefined;

  const changedTopLevelKeys = hasPristine
    ? allKeys.filter((key) => JSON.stringify((store as unknown as Record<string, unknown>)[key]) !== JSON.stringify((pristine as Record<string, unknown>)[key]))
    : allKeys; // sem snapshot registrado — grava tudo, por segurança

  const attendanceUpdates: AttendanceFieldUpdate[] = [];
  const attendanceDeletes: string[] = [];
  const currentAttendances = Array.isArray(store.attendances) ? store.attendances : [];
  if (!hasPristine) {
    for (const a of currentAttendances) {
      attendanceUpdates.push({ id: a.id, isNew: true, fields: a as unknown as Record<string, unknown> });
    }
  } else {
    const pristineAttendances = Array.isArray((pristine as Record<string, unknown>).attendances)
      ? ((pristine as Record<string, unknown>).attendances as AttendanceRecord[])
      : [];
    const pristineById = new Map(pristineAttendances.map((a) => [a.id, a as unknown as Record<string, unknown>]));
    const currentIds = new Set<string>();
    for (const a of currentAttendances) {
      currentIds.add(a.id);
      const before = pristineById.get(a.id);
      const current = a as unknown as Record<string, unknown>;
      if (!before) {
        attendanceUpdates.push({ id: a.id, isNew: true, fields: current });
        continue;
      }
      const changedFields: Record<string, unknown> = {};
      let anyChange = false;
      for (const key of new Set([...Object.keys(current), ...Object.keys(before)])) {
        if (JSON.stringify(current[key]) !== JSON.stringify(before[key])) {
          changedFields[key] = current[key];
          anyChange = true;
        }
      }
      if (anyChange) attendanceUpdates.push({ id: a.id, isNew: false, fields: changedFields });
    }
    for (const before of pristineAttendances) {
      if (!currentIds.has(before.id)) attendanceDeletes.push(before.id);
    }
  }

  // Mensagens nunca são editadas, só acrescentadas — comparar por id já
  // detecta corretamente tudo que é novo desde o snapshot "pristine".
  const agentChatNewMessages: Record<string, AgentChatMessage[]> = {};
  const currentChats = store.agentChats || {};
  const pristineChats = (hasPristine ? (pristine as Record<string, unknown>).agentChats : undefined) as
    | Record<string, AgentChatMessage[]>
    | undefined;
  for (const [deskId, messages] of Object.entries(currentChats)) {
    const pristineIds = new Set(((pristineChats || {})[deskId] || []).map((m) => m.id));
    const newOnes = (messages || []).filter((m) => !pristineIds.has(m.id));
    if (newOnes.length > 0) agentChatNewMessages[deskId] = newOnes;
  }

  return { changedTopLevelKeys, attendanceUpdates, attendanceDeletes, agentChatNewMessages };
}

function loadStore(): PersistentStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistentStore;
      if (parsed && Array.isArray(parsed.attendances) && Array.isArray(parsed.materials)) {
        let storeModified = false;

        // Reconciliar Dados da Júlia
        if (!parsed.juliaData) {
          if (fs.existsSync(JULIA_STORE_PATH)) {
            try {
              parsed.juliaData = JSON.parse(
                fs.readFileSync(JULIA_STORE_PATH, 'utf-8')
              ) as JuliaDepartmentData;
            } catch {
              parsed.juliaData = getDefaultJuliaData();
            }
          } else {
            parsed.juliaData = getDefaultJuliaData();
          }
          reconcileJuliaPhotosFromDisk(parsed.juliaData);
          storeModified = true;
        } else {
          const reconciled = reconcileJuliaPhotosFromDisk(parsed.juliaData);
          if (reconciled) storeModified = true;
        }

        // Reconciliar Escritório de Agentes Compartilhado
        if (!parsed.officeData) {
          parsed.officeData = createDefaultOfficeData();
          storeModified = true;
        }
        if (!Array.isArray(parsed.officeData.fixedExpenses)) {
          parsed.officeData.fixedExpenses = [];
          storeModified = true;
        }
        if (parsed.officeData.initialBalance === undefined) {
          parsed.officeData.initialBalance = null;
          storeModified = true;
        }
        if (!Array.isArray(parsed.officeData.cashTransfers)) {
          parsed.officeData.cashTransfers = [];
          storeModified = true;
        }
        if (!Array.isArray(parsed.officeData.cashAccounts) || parsed.officeData.cashAccounts.length === 0) {
          const now = new Date().toISOString();
          parsed.officeData.cashAccounts = [
            {
              id: 'acc-caixa',
              name: 'Caixa',
              type: 'caixa',
              active: true,
              createdAt: now,
              updatedAt: now,
            },
          ];
          storeModified = true;
        }
        // Remove lançamentos de demonstração (nunca reais) deixados por uma versão
        // anterior do seed padrão, antes de o financeiro da fábrica passar a exibi-los de fato.
        if (Array.isArray(parsed.officeData.generalTransactions)) {
          const beforeCount = parsed.officeData.generalTransactions.length;
          parsed.officeData.generalTransactions = parsed.officeData.generalTransactions.filter(
            (t) => t.id !== 'gt-01' && t.id !== 'gt-02'
          );
          if (parsed.officeData.generalTransactions.length !== beforeCount) {
            storeModified = true;
          }
        } else {
          parsed.officeData.generalTransactions = [];
          storeModified = true;
        }

        // Reconciliar fila de tarefas em segundo plano (BackgroundTask)
        if (!Array.isArray(parsed.backgroundTasks)) {
          parsed.backgroundTasks = [];
          storeModified = true;
        }

        // Reconciliar configurações novas (integrações oficiais, voz por agente,
        // pausa de automação) sem sobrescrever o que já estiver salvo.
        if (!parsed.settings.integrations) {
          parsed.settings.integrations = {};
          storeModified = true;
        }
        if (!parsed.settings.agentVoiceSettings) {
          parsed.settings.agentVoiceSettings = {};
          storeModified = true;
        }
        if (parsed.settings.automationPaused === undefined) {
          parsed.settings.automationPaused = false;
          storeModified = true;
        }
        if (!parsed.settings.carlaAutoReply) {
          parsed.settings.carlaAutoReply = { enabled: false };
          storeModified = true;
        }

        // Reconciliar campos compartilhados de todos os pedidos
        for (const att of parsed.attendances) {
          // Só força orderType='Reforma' em registros antigos de verdade (sem requestType
          // nenhum). Atendimentos da Carla sem pedido operacional (compra de produto,
          // acompanhamento, reclamação) são assim por definição — orderType undefined é o
          // estado correto deles, nunca "esquecido".
          if (!att.orderType && !att.requestType) {
            att.orderType = 'Reforma';
            storeModified = true;
          }
          if (!att.currentDesk) {
            att.currentDesk =
              att.orderType === 'Fabricação'
                ? 'lucas_projetos'
                : 'carla_atendimento';
            storeModified = true;
          }
          if (!att.deskStatus) {
            att.deskStatus = 'em_andamento';
            storeModified = true;
          }
          if (!att.handoffHistory) {
            att.handoffHistory = [];
            storeModified = true;
          }
        }

        // Reconciliar códigos de materiais se ausentes
        for (const mat of parsed.materials) {
          const def = DEFAULT_MATERIALS.find((m) => m.id === mat.id);
          if (def) {
            if (!mat.code && def.code) {
              mat.code = def.code;
              storeModified = true;
            }
            if (mat.purchaseUnit === undefined && def.purchaseUnit) {
              mat.purchaseUnit = def.purchaseUnit;
              mat.conversionFactor = def.conversionFactor;
              storeModified = true;
            }
            if (mat.physicalStock === undefined) {
              mat.physicalStock = def.physicalStock ?? 10;
              mat.reservedStock = def.reservedStock ?? 0;
              storeModified = true;
            }
          }
        }

        // Adicionar ao catálogo persistido os itens padrão novos que ainda não existem nele
        // (ex.: um material novo cadastrado em uma atualização do código) — sem isso, um
        // item adicionado aqui só apareceria em instalações novas, nunca na já existente.
        // Nunca sobrescreve nem remove um item já salvo, só acrescenta os que faltam.
        const existingMaterialIds = new Set(parsed.materials.map((m) => m.id));
        const missingDefaults = DEFAULT_MATERIALS.filter((m) => !existingMaterialIds.has(m.id));
        if (missingDefaults.length > 0) {
          parsed.materials = [...parsed.materials, ...missingDefaults];
          storeModified = true;
        }

        // Cadastro geral de clientes: deriva/completa a partir dos atendimentos já
        // existentes, sem apagar nada. Toda vez que um atendimento tem nome/telefone de
        // cliente mas ainda não está vinculado a um ClientRecord (dados antigos, de antes
        // dessa funcionalidade existir, ou criados por outro caminho), vincula ao cliente
        // já cadastrado com o mesmo telefone/nome, ou cria um novo registro — nunca duplica.
        if (!parsed.clients) {
          parsed.clients = [];
          storeModified = true;
        }
        const clientReconcileNow = new Date().toISOString();
        for (const att of parsed.attendances) {
          if (att.clientId) continue;
          if (!att.clientName || att.clientName === 'não informado' || att.clientName === 'Cliente não informado') {
            continue;
          }
          const existingClient = findClientByPhoneOrName(parsed.clients, att.clientPhone, att.clientName);
          if (existingClient) {
            att.clientId = existingClient.id;
            // Completa o endereço do cadastro se o atendimento tiver dado que falta nele
            // (nunca sobrescreve um dado já preenchido, só completa o que está vazio).
            if (!existingClient.address.neighborhood && att.neighborhood) {
              existingClient.address.neighborhood = att.neighborhood;
            }
            if (!existingClient.address.city && att.city) {
              existingClient.address.city = att.city;
            }
            if (!existingClient.address.street && att.fullAddress) {
              existingClient.address.street = att.fullAddress;
            }
            if (!existingClient.phone && att.clientPhone) {
              existingClient.phone = att.clientPhone;
            }
            existingClient.updatedAt = att.updatedAt || existingClient.updatedAt;
          } else {
            const newClient: ClientRecord = {
              id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: att.clientName,
              phone: att.clientPhone || '',
              email: att.clientEmail || undefined,
              address: {
                neighborhood: att.neighborhood || undefined,
                city: att.city || undefined,
                street: att.fullAddress || undefined,
              },
              createdAt: att.createdAt || clientReconcileNow,
              updatedAt: clientReconcileNow,
            };
            parsed.clients.push(newClient);
            att.clientId = newClient.id;
          }
          storeModified = true;
        }

        if (storeModified) {
          try {
            saveStore(parsed);
          } catch {
            // best-effort (ex.: janela de manutenção ativa) — mesmo sem
            // conseguir persistir a reconciliação agora, `parsed` já está
            // correto em memória; nunca cair para o catch externo e perder
            // o dado real só por não ter conseguido salvar a reconciliação.
          }
        }
        pristineStoreSnapshots.set(parsed, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler store.json, recriando padrão:', err);
  }

  const defaultJulia = getDefaultJuliaData();
  reconcileJuliaPhotosFromDisk(defaultJulia);
  const initialStore: PersistentStore = {
    nextSequence: 3,
    attendances: [createDemoSofa2Places(), createDemoPoltronas4Un()],
    materials: DEFAULT_MATERIALS,
    clients: [],
    settings: {
      workshopName: 'Castros Interiores',
      responsibleDefaultName: '',
      phoneWhatsapp: '(91) 98556-9841',
      cityState: '',
      aiModel: 'claude-sonnet-5',
      integrations: {},
      agentVoiceSettings: {},
      automationPaused: false,
      carlaAutoReply: { enabled: false },
    },
    juliaData: defaultJulia,
    officeData: createDefaultOfficeData(),
    backgroundTasks: [],
  };
  try {
    saveStore(initialStore);
  } catch {
    // best-effort (ex.: janela de manutenção ativa) — ainda devolve o
    // store padrão em memória; uma leitura (GET /api/store) não deve
    // falhar por causa do bloqueio de gravação da manutenção.
  }
  return initialStore;
}

function writeStoreToLocalDisk(store: PersistentStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  if (store.juliaData) {
    try {
      fs.writeFileSync(
        JULIA_STORE_PATH,
        JSON.stringify(store.juliaData, null, 2),
        'utf-8'
      );
    } catch {
      // ignore backup write error
    }
  }
}

function saveStore(store: PersistentStore): void {
  if (isWriteMaintenanceModeActive()) {
    // Nada é gravado — nem localmente, nem no Firestore. É deliberado: a
    // janela de manutenção existe para congelar TODO o estado mutável
    // enquanto uma migração real roda (ver migrations/README.md); se o
    // disco local continuasse mudando enquanto o Firestore fica parado, o
    // app terminaria a janela com uma divergência que nunca mais sincroniza
    // (o código muda para ler das coleções novas depois da migração, sem
    // nenhum caminho de volta para esse estado só-local). As ~100 rotas que
    // chamam saveStore() sem tratar essa exceção respondem 500 em vez de um
    // falso sucesso — aceitável numa janela de manutenção curta e avisada.
    throw new Error(MAINTENANCE_MODE_ERROR_MESSAGE);
  }
  writeStoreToLocalDisk(store);
  const diff = computeStoreDiff(store);
  // Sincroniza com o Firestore em segundo plano — não bloqueia a resposta da
  // rota que chamou saveStore(), mas garante que o dado sobreviva a um
  // redeploy sem disco. Só o que esta chamada mudou, por item em
  // attendances/agentChats (ver persistStoreKeysTransactionally) — nunca o
  // documento inteiro às cegas.
  void persistStoreKeysTransactionally(store, diff);
  pristineStoreSnapshots.set(store, JSON.stringify(store));
}

// Em produção, observamos o backup do Firestore ficar mais de uma hora sem
// nenhum "savedAt" novo, sem nenhuma falha aparecer no log — nem confirmação
// de sucesso nem de erro. Isso é consistente com a chamada ao Firestore
// nunca settling (nem resolve, nem rejeita) em vez de falhar rápido — bem
// provável justamente pelo tamanho do documento estar praticamente no limite
// (ver FIRESTORE_SIZE_CRITICAL_THRESHOLD). Sem um limite de tempo explícito,
// aguardar essa chamada no webhook (ver abaixo) poderia travar a resposta
// indefinidamente, o que é pior que o problema original — por isso o
// Promise.race com este timeout.
const FIRESTORE_SYNC_AWAIT_TIMEOUT_MS = 8_000;

// ----------------------------------------------------------------------------
// TAREFAS EM SEGUNDO PLANO (BackgroundTask) — fila persistida no próprio store,
// processada por processDueBackgroundTasks(). Não há execução "no cliente": uma
// tarefa só avança quando algo chama essa função (rota /api/tasks/process-due,
// tipicamente disparada por um Cloud Scheduler externo — ver documentação).
// Isso é deliberado: no Cloud Run sem min-instances configurado, uma instância
// pode ser desligada quando ociosa, então um setInterval() no processo não é
// confiável para "roda com a página fechada e o servidor também ocioso".
// ----------------------------------------------------------------------------

function mapChannelToIntegrationKey(
  channel: string
): 'whatsapp' | 'instagram' | 'facebook' {
  if (channel.startsWith('Instagram')) return 'instagram';
  if (channel === 'Facebook') return 'facebook';
  return 'whatsapp';
}

function createBackgroundTask(
  store: PersistentStore,
  input: {
    type: BackgroundTask['type'];
    agentId: DepartmentId;
    action: string;
    authorization: string;
    scheduledFor: string;
    relatedOrderId?: string;
    relatedCampaignId?: string;
    channel?: BackgroundTask['channel'];
    idempotencyKey: string;
    maxAttempts?: number;
    createdBy?: string;
    payload?: Record<string, unknown>;
  }
): BackgroundTask {
  if (!Array.isArray(store.backgroundTasks)) store.backgroundTasks = [];

  // Nunca cria duas tarefas para a mesma idempotencyKey enquanto a anterior não
  // tiver terminado em estado definitivo de erro ou cancelamento — evita duplicar
  // a mesma publicação/envio em reprocessamentos repetidos (ex.: webhook reenviado).
  const existing = store.backgroundTasks.find(
    (t) => t.idempotencyKey === input.idempotencyKey && t.status !== 'falhou' && t.status !== 'cancelada'
  );
  if (existing) return existing;

  const task: BackgroundTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    agentId: input.agentId,
    relatedOrderId: input.relatedOrderId,
    relatedCampaignId: input.relatedCampaignId,
    channel: input.channel,
    action: input.action,
    authorization: input.authorization,
    scheduledFor: input.scheduledFor,
    status: 'na_fila',
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    idempotencyKey: input.idempotencyKey,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    payload: input.payload,
  };
  store.backgroundTasks.push(task);
  return task;
}

// Persona de vendas/atendimento da Carla quando conversa DIRETO com o cliente pelo
// WhatsApp oficial (não confundir com o systemPrompt dela em /api/chat/agent, que é
// pra um FUNCIONÁRIO conversar com ela internamente). Nunca inventa preço, prazo ou
// material — só cita o que estiver no bloco de dados reais injetado a cada chamada
// (ver buildCarlaWhatsAppFactualContext) ou o que o próprio cliente acabou de dizer.
const CARLA_WHATSAPP_SYSTEM_INSTRUCTION = `Você é a CARLA, assistente virtual de atendimento e vendas da Castros Interiores, conversando DIRETAMENTE com o cliente pelo WhatsApp oficial da empresa — isto não é um chat interno com um funcionário.

MISSÃO: acolher o cliente, entender a necessidade, apresentar soluções e acompanhar até o pós-venda.

TOM: educada, objetiva, acolhedora e comercial, sem pressionar. Uma pergunta de cada vez. Aproveite o que o cliente já contou nesta conversa ou que já está no bloco de dados reais — nunca repita uma pergunta cuja resposta você já tem.

REGRA MAIS IMPORTANTE — NUNCA INVENTE: nunca afirme preço, prazo de entrega/agendamento ou material/medida que não esteja explicitamente no bloco "DADOS REAIS" ou que o cliente não tenha acabado de dizer nesta conversa. Se não souber, diga que vai confirmar com a equipe e volta — nunca estime, arredonde ou "dê uma ideia" de valor.

PRIMEIRO CONTATO: cumprimente e pergunte como pode ajudar.

SE FOR REFORMA (reparo/revestimento de peça que o cliente já tem): peça fotos, medidas aproximadas e preferências aos poucos (uma coisa de cada vez), explicando que isso permite uma avaliação inicial. Quando já tiver tipo de móvel + indício de medidas ou fotos pedidas + serviço desejado, classifique como "reforma" e marque pronto para encaminhar ao Pedro (avaliação técnica).

SE FOR FABRICAÇÃO DE PEÇA NOVA (móvel sob medida, do zero): pergunte modelo/referência, medidas desejadas, fotos de referência e cidade. Quando já tiver isso, classifique como "fabricacao_nova" e marque pronto para encaminhar ao Lucas (projetos).

PREÇO E PRAZO: todo valor sempre passa pela Mila (financeiro) — você nunca cria, estima ou aprova preço sozinha. Só pode CITAR um valor em reais se o bloco de dados disser claramente que o orçamento já está homologado pelo responsável; caso contrário, diga que vai confirmar com a equipe. Prazo/agendamento só é confirmado quando o sistema mostrar aprovação e confirmação — nunca prometa uma data por conta própria.

NEGOCIAÇÃO: ouça as dúvidas do cliente e explique com clareza o que está incluso no serviço. Nunca desqualifique concorrentes.

FECHAMENTO: ao concluir, confirme um resumo do que foi combinado — mas só repita valores/prazos já confirmados pelo sistema, nunca um número novo criado por você.

PÓS-VENDA: acompanhe pedidos já em andamento e pergunte se está tudo certo quando apropriado.

RECLAMAÇÃO: se o cliente reclamar, reconheça o transtorno com empatia, reúna os dados (o que aconteceu, quando, qual pedido) para o responsável avaliar. NÃO tente resolver sozinha nem prometa reembolso/desconto/reparo — isso sempre vai para um humano.

MÍDIA: se o cliente mandar foto ou áudio, reconheça o recebimento mas não afirme ter analisado o conteúdo — isso fica para a avaliação presencial/técnica depois.

Você está preenchendo um formulário estruturado de resposta, nunca texto livre fora dele.`;

// Teto de segurança contra loop/excesso de mensagens automáticas — nunca existiu
// necessidade disso enquanto a resposta era um texto fixo e previsível; com IA
// gerando o texto a cada mensagem, um teto explícito evita qualquer cenário de
// disparo descontrolado. Acima do teto, a tarefa não falha — só não envia e marca
// para revisão humana (ver case 'responder_whatsapp_com_ia').
const CARLA_WHATSAPP_MAX_REPLIES_PER_DAY = 40;
function countCarlaWhatsAppRepliesLast24h(store: PersistentStore, attendanceId: string): number {
  const chat = store.agentChats?.['carla_atendimento'] || [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return chat.filter(
    (m) =>
      m.attendanceId === attendanceId &&
      m.sender === 'agent' &&
      m.externalChannel === 'whatsapp' &&
      new Date(m.timestamp).getTime() >= cutoff
  ).length;
}

// Bloco de dados reais injetado a cada chamada — mesmo papel do factualContext já
// usado em /api/chat/agent (ver DADOS DE ATENDIMENTO (CARLA) ali), mas focado só no
// que um cliente pelo WhatsApp precisa: o que já foi coletado (pra Carla não repetir
// pergunta) e se existe preço/prazo HOMOLOGADO que ela pode citar sem inventar nada.
// Mesma porta de segurança já usada pelas rotas de negociação (bloqueiam sem
// homologação da Mila) — só retorna um valor quando está de verdade confirmado
// pelo responsável, nunca um preço sugerido/calculado/provisório.
function getConfirmedPriceCents(attendance: AttendanceRecord): number | null {
  const isFab = attendance.orderType === 'Fabricação' || attendance.requestType === 'fabricacao_nova';
  return isFab
    ? attendance.financialData?.confirmedByResponsible
      ? attendance.financialData.approvedSellingPriceCents
      : null
    : attendance.budget?.confirmedByResponsible
    ? attendance.budget.sellingPriceCents
    : null;
}

function buildCarlaWhatsAppFactualContext(store: PersistentStore, attendance: AttendanceRecord): string {
  const confirmedPriceCents = getConfirmedPriceCents(attendance);
  const priceLine =
    confirmedPriceCents != null
      ? `R$ ${(confirmedPriceCents / 100).toFixed(2)} (HOMOLOGADO pelo responsável — pode ser citado ao cliente)`
      : 'Nenhum preço homologado ainda — NÃO cite nenhum valor em reais; diga que vai confirmar com a equipe.';
  const openComplaints = (attendance.complaints || []).filter((c) => c.status !== 'resolvida');
  const known = (value: string | undefined, placeholder = 'A definir') =>
    value && value !== placeholder ? value : 'ainda não informado pelo cliente';

  return `DADOS REAIS JÁ CADASTRADOS PARA ESTE CLIENTE (${attendance.attendanceNumber}):
- Nome: ${attendance.clientName || 'não informado ainda'}
- Classificação já identificada: ${attendance.requestType || 'ainda não classificada — pergunte se é reforma ou peça nova'}
- Tipo de móvel: ${known(attendance.furnitureType)}
- Quantidade: ${known(attendance.piecesCount)}
- Medidas informadas pelo cliente: ${known(attendance.approxMeasurements)}
- Serviço desejado: ${attendance.desiredService || 'ainda não informado'}
- Preferência de tecido/conforto: ${known(attendance.fabricAndComfortPreference, 'não informado')}
- Defeitos relatados: ${attendance.reportedDefects || 'ainda não informado'}
- Cidade/bairro: ${attendance.city || attendance.neighborhood || 'ainda não informado'}
- Mesa/status atual do pedido: ${attendance.currentDesk || 'carla_atendimento'} / ${attendance.deskStatus || 'em_andamento'}
- Preço: ${priceLine}
- Reclamações abertas: ${openComplaints.length === 0 ? 'nenhuma' : openComplaints.map((c) => `"${c.description}"`).join(' | ')}
`;
}

// Transcript simples em texto único — mesmo padrão já usado por TODOS os outros
// agentes deste projeto (Júlia, chat genérico de mesa, ver server.ts:8605-8608 e
// 8762-8765); generateContentWithRetryAndFallback não aceita messages multi-turno
// nativos, então não há ganho em desenhar algo diferente só pra Carla aqui.
function buildCarlaWhatsAppHistoryTranscript(store: PersistentStore, attendanceId: string): string {
  const chat = (store.agentChats?.['carla_atendimento'] || []).filter(
    (m) => m.attendanceId === attendanceId && m.externalChannel === 'whatsapp'
  );
  const recent = chat.slice(-20);
  if (recent.length === 0) return 'Início da conversa — esta é a primeira mensagem do cliente.';
  return recent.map((m) => `${m.sender === 'user' ? 'Cliente' : 'Carla'}: ${m.text}`).join('\n');
}

const CARLA_WHATSAPP_RESPONSE_SCHEMA: AiSchema = {
  type: Type.OBJECT,
  properties: {
    replyText: {
      type: Type.STRING,
      description: 'Mensagem a enviar ao cliente agora, em português brasileiro, pronta para WhatsApp.',
    },
    requestTypeDetected: {
      type: Type.STRING,
      description: 'reforma | fabricacao_nova | indefinido — classificação do pedido até agora.',
    },
    extractedFields: {
      type: Type.OBJECT,
      description:
        'Só os campos que o CLIENTE disse nesta troca — nunca invente um valor que ele não disse.',
      properties: {
        furnitureType: { type: Type.STRING },
        piecesCount: { type: Type.STRING },
        approxMeasurements: { type: Type.STRING },
        desiredService: { type: Type.STRING },
        fabricAndComfortPreference: { type: Type.STRING },
        reportedDefects: { type: Type.STRING },
        previousReforms: { type: Type.STRING },
        usageTime: { type: Type.STRING },
        city: { type: Type.STRING },
      },
    },
    readyForHandoff: {
      type: Type.BOOLEAN,
      description: 'Verdadeiro só quando já há informação suficiente pra encaminhar à mesa técnica.',
    },
    handoffSummary: {
      type: Type.STRING,
      description: 'Resumo do que foi coletado — obrigatório quando readyForHandoff é verdadeiro.',
    },
    pendingItemsForHandoff: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'O que ainda falta confirmar, mesmo encaminhando.',
    },
    complaintDetected: {
      type: Type.BOOLEAN,
      description: 'Verdadeiro se o cliente está reclamando de algo (pedido, prazo, qualidade, etc.).',
    },
  },
  required: ['replyText', 'requestTypeDetected', 'readyForHandoff', 'complaintDetected'],
};

// Nunca confia cegamente no JSON do modelo — mesmo padrão de correção server-side já
// usado em ANALYST_SYSTEM_INSTRUCTION (ver validação de origin/severity perto da
// linha 5713): qualquer campo inválido/ausente vira um estado seguro, nunca o que o
// modelo mandou sem checar. A trava de preço é reforço NOVO desta funcionalidade —
// diferente do chat interno, aqui ninguém revisa antes de sair pro cliente.
const CURRENCY_MENTION_PATTERN = /r\$\s?\d|\d+[.,]?\d*\s?reais\b/i;
function validateAndCoerceCarlaWhatsAppOutput(
  parsed: {
    replyText?: string;
    requestTypeDetected?: string;
    extractedFields?: Record<string, unknown>;
    readyForHandoff?: boolean;
    handoffSummary?: string;
    pendingItemsForHandoff?: string[];
    complaintDetected?: boolean;
  },
  hasConfirmedPrice: boolean
): {
  replyText: string;
  requestTypeDetected: 'reforma' | 'fabricacao_nova' | 'indefinido';
  extractedFields: Partial<
    Pick<
      AttendanceRecord,
      | 'furnitureType'
      | 'piecesCount'
      | 'approxMeasurements'
      | 'desiredService'
      | 'fabricAndComfortPreference'
      | 'reportedDefects'
      | 'previousReforms'
      | 'usageTime'
      | 'city'
    >
  >;
  readyForHandoff: boolean;
  handoffSummary: string;
  pendingItemsForHandoff: string[];
  complaintDetected: boolean;
  priceOverrideApplied: boolean;
} {
  const validRequestTypes = ['reforma', 'fabricacao_nova', 'indefinido'];
  const requestTypeDetected = validRequestTypes.includes(parsed.requestTypeDetected || '')
    ? (parsed.requestTypeDetected as 'reforma' | 'fabricacao_nova' | 'indefinido')
    : 'indefinido';

  const allowedKeys = [
    'furnitureType',
    'piecesCount',
    'approxMeasurements',
    'desiredService',
    'fabricAndComfortPreference',
    'reportedDefects',
    'previousReforms',
    'usageTime',
    'city',
  ] as const;
  const extractedFields: Record<string, string> = {};
  if (parsed.extractedFields && typeof parsed.extractedFields === 'object') {
    for (const key of allowedKeys) {
      const value = (parsed.extractedFields as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) extractedFields[key] = value.trim();
    }
  }

  // Não dá pra encaminhar sem saber se é reforma ou fabricação nova.
  const readyForHandoff = Boolean(parsed.readyForHandoff) && requestTypeDetected !== 'indefinido';

  let replyText = typeof parsed.replyText === 'string' && parsed.replyText.trim() ? parsed.replyText.trim() : '';
  let priceOverrideApplied = false;
  if (!replyText || (CURRENCY_MENTION_PATTERN.test(replyText) && !hasConfirmedPrice)) {
    priceOverrideApplied = Boolean(replyText) && !hasConfirmedPrice;
    replyText =
      'Obrigada por avisar! Vou confirmar essa informação com nossa equipe e te retorno em breve. Enquanto isso, pode me contar mais sobre o que você precisa?';
  }

  return {
    replyText,
    requestTypeDetected,
    extractedFields,
    readyForHandoff,
    handoffSummary: readyForHandoff && parsed.handoffSummary ? parsed.handoffSummary : '',
    pendingItemsForHandoff: Array.isArray(parsed.pendingItemsForHandoff)
      ? parsed.pendingItemsForHandoff.filter((p): p is string => typeof p === 'string')
      : [],
    complaintDetected: Boolean(parsed.complaintDetected),
    priceOverrideApplied,
  };
}

// Verifica uma integração oficial real (Meta Graph API) usando apenas credenciais
// vindas de variáveis de ambiente do servidor — nunca solicitadas pelo chat nem
// expostas ao navegador. Sem as variáveis configuradas, o resultado honesto é
// "não configurado": a tarefa falha com o motivo exato, nunca finge sucesso.
async function checkIntegrationConnection(
  channel: 'whatsapp' | 'instagram' | 'facebook'
): Promise<{ ok: boolean; state: IntegrationConnectionState; message: string; accountLabel?: string }> {
  // WhatsApp não fala mais direto com a Graph API da Meta — a conta roda via
  // YCloud (Provedor de Soluções/BSP), que tem endpoint e credenciais próprios.
  if (channel === 'whatsapp') {
    return checkYCloudWhatsAppConnection();
  }
  const envMap: Record<'instagram' | 'facebook', { token: string; id: string }> = {
    instagram: { token: 'META_ACCESS_TOKEN', id: 'META_IG_BUSINESS_ACCOUNT_ID' },
    facebook: { token: 'META_ACCESS_TOKEN', id: 'META_PAGE_ID' },
  };
  const { token: tokenVar, id: idVar } = envMap[channel];
  const token = process.env[tokenVar];
  const objectId = process.env[idVar];

  if (!token || !objectId) {
    const missing = [!token ? tokenVar : null, !objectId ? idVar : null].filter(Boolean);
    return {
      ok: false,
      state: 'nao_configurado',
      message: `Integração oficial não configurada no ambiente. Variável(is) ausente(s): ${missing.join(', ')}.`,
    };
  }

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${objectId}?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
    const data = (await resp.json()) as { id?: string; name?: string; error?: { message?: string } };
    if (!resp.ok || data.error) {
      return {
        ok: false,
        state: 'erro',
        message: data.error?.message || `Falha ao verificar integração (HTTP ${resp.status}).`,
      };
    }
    return {
      ok: true,
      state: 'conectado',
      message: 'Integração verificada com sucesso junto ao serviço oficial.',
      accountLabel: data.name || data.id,
    };
  } catch (err) {
    return {
      ok: false,
      state: 'erro',
      message: err instanceof Error ? err.message : 'Falha de rede ao verificar integração.',
    };
  }
}

// Verifica a conexão com a conta de anúncios da Meta (Marketing API) — distinta
// da verificação de publicação orgânica acima. Sem as variáveis de ambiente,
// resultado honesto "não configurado"; a CRIAÇÃO de campanha paga em si ainda
// não está implementada (ver executeBackgroundTask, case 'iniciar_campanha_paga')
// — esta função só confirma se a conta de anúncios existe e o token é válido.
async function checkPaidAdsIntegrationConnection(): Promise<{
  ok: boolean;
  message: string;
  accountLabel?: string;
}> {
  const token = process.env.META_ADS_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !adAccountId) {
    const missing = [!token ? 'META_ADS_ACCESS_TOKEN' : null, !adAccountId ? 'META_AD_ACCOUNT_ID' : null].filter(
      Boolean
    );
    return {
      ok: false,
      message: `Integração de anúncios pagos (Meta Marketing API) não configurada no ambiente. Variável(is) ausente(s): ${missing.join(', ')}.`,
    };
  }

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${adAccountId}?fields=id,name&access_token=${encodeURIComponent(token)}`
    );
    const data = (await resp.json()) as { id?: string; name?: string; error?: { message?: string } };
    if (!resp.ok || data.error) {
      return {
        ok: false,
        message: data.error?.message || `Falha ao verificar a conta de anúncios (HTTP ${resp.status}).`,
      };
    }
    return {
      ok: true,
      message: 'Conta de anúncios verificada com sucesso junto à Meta.',
      accountLabel: data.name || data.id,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Falha de rede ao verificar a conta de anúncios.',
    };
  }
}

// Verifica a integração do WhatsApp junto à YCloud (Provedor de Soluções/BSP
// oficial da Meta) usando só credenciais do ambiente do servidor — nunca
// solicitadas pelo chat nem expostas ao navegador. Sem as variáveis, resultado
// honesto "não configurado"; a chamada real confirma que a chave de API é
// válida (não confirma por si só que o número está "Conectado" na Meta — isso
// é visto em /api/whatsapp/diagnostics via o último evento de webhook real).
async function checkYCloudWhatsAppConnection(): Promise<{
  ok: boolean;
  state: IntegrationConnectionState;
  message: string;
  accountLabel?: string;
}> {
  const apiKey = process.env.YCLOUD_API_KEY;
  const fromNumber = process.env.YCLOUD_WHATSAPP_FROM;
  if (!apiKey || !fromNumber) {
    const missing = [!apiKey ? 'YCLOUD_API_KEY' : null, !fromNumber ? 'YCLOUD_WHATSAPP_FROM' : null].filter(Boolean);
    return {
      ok: false,
      state: 'nao_configurado',
      message: `Integração oficial (YCloud) não configurada no ambiente. Variável(is) ausente(s): ${missing.join(', ')}.`,
    };
  }
  try {
    const resp = await fetch('https://api.ycloud.com/v2/balance', {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
    });
    const data = (await resp.json()) as { error?: { message?: string } };
    if (!resp.ok || data.error) {
      return {
        ok: false,
        state: 'erro',
        message: data.error?.message || `Falha ao verificar integração YCloud (HTTP ${resp.status}).`,
      };
    }
    return {
      ok: true,
      state: 'conectado',
      message: 'Integração YCloud verificada com sucesso (chave de API válida).',
      accountLabel: fromNumber,
    };
  } catch (err) {
    return {
      ok: false,
      state: 'erro',
      message: err instanceof Error ? err.message : 'Falha de rede ao verificar integração YCloud.',
    };
  }
}

// Envia uma mensagem de texto REAL via YCloud (Provedor de Soluções do WhatsApp
// Business/BSP, não mais a Graph API da Meta direto). Exige YCLOUD_API_KEY e
// YCLOUD_WHATSAPP_FROM como variáveis de ambiente do servidor — nunca aceita
// essas credenciais vindas do chat, do corpo da requisição ou de qualquer
// entrada do navegador.
async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<{ ok: boolean; externalId?: string; errorMessage?: string }> {
  const apiKey = process.env.YCLOUD_API_KEY;
  const fromNumber = process.env.YCLOUD_WHATSAPP_FROM;
  if (!apiKey || !fromNumber) {
    return {
      ok: false,
      errorMessage:
        'Integração do WhatsApp não configurada no ambiente (YCLOUD_API_KEY/YCLOUD_WHATSAPP_FROM ausentes).',
    };
  }
  try {
    const resp = await fetch('https://api.ycloud.com/v2/whatsapp/messages/sendDirectly', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromNumber,
        to: to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = (await resp.json()) as {
      id?: string;
      wamid?: string;
      error?: { message?: string };
    };
    if (!resp.ok || data.error) {
      return { ok: false, errorMessage: data.error?.message || `Falha ao enviar (HTTP ${resp.status}).` };
    }
    return { ok: true, externalId: data.wamid || data.id };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Falha de rede ao enviar mensagem.' };
  }
}

// Envio de mensagem de TEMPLATE pré-aprovado pela Meta via YCloud — distinto de
// sendWhatsAppMessage (texto livre, só usado dentro da janela de 24h de uma conversa
// já aberta pelo cliente, como a Carla). Mandar marketing em massa fora dessa janela
// só é permitido pela política da Meta usando um template aprovado; nunca usar texto
// livre aqui. Formato idêntico ao da WhatsApp Cloud API oficial (a YCloud replica esse
// contrato como BSP) — não testável neste sandbox (api.ycloud.com inacessível daqui);
// precisa de validação com um template real já aprovado, direto em produção.
async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  bodyText: string,
  headerImageUrl?: string,
  bodyVariableName?: string
): Promise<{ ok: boolean; externalId?: string; errorMessage?: string }> {
  const apiKey = process.env.YCLOUD_API_KEY;
  const fromNumber = process.env.YCLOUD_WHATSAPP_FROM;
  if (!apiKey || !fromNumber) {
    return {
      ok: false,
      errorMessage:
        'Integração do WhatsApp não configurada no ambiente (YCLOUD_API_KEY/YCLOUD_WHATSAPP_FROM ausentes).',
    };
  }
  const components: Array<Record<string, unknown>> = [];
  if (headerImageUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: headerImageUrl } }],
    });
  }
  // Templates com variável NOMEADA (ex: "{{almofadas}}") exigem parameter_name no
  // parâmetro; templates com variável posicional ("{{1}}") não usam esse campo.
  components.push({
    type: 'body',
    parameters: [
      bodyVariableName
        ? { type: 'text', parameter_name: bodyVariableName, text: bodyText }
        : { type: 'text', text: bodyText },
    ],
  });
  try {
    const resp = await fetch('https://api.ycloud.com/v2/whatsapp/messages/sendDirectly', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromNumber,
        to: to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    });
    const data = (await resp.json()) as {
      id?: string;
      wamid?: string;
      error?: { message?: string };
    };
    if (!resp.ok || data.error) {
      return { ok: false, errorMessage: data.error?.message || `Falha ao enviar (HTTP ${resp.status}).` };
    }
    return { ok: true, externalId: data.wamid || data.id };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Falha de rede ao enviar mensagem.' };
  }
}

// Endereço público do app para montar URLs de imagem que a Graph API consiga buscar
// de fora — nunca derivado de uma requisição, pois tarefas em segundo plano não têm
// uma. Sem isso configurado no ambiente, a publicação real falha honestamente.
function getPublicBaseUrl(): string | null {
  const url = process.env.APP_URL;
  return url && url.trim() ? url.trim().replace(/\/$/, '') : null;
}

// Publica de verdade no Instagram (Feed ou Stories) via Meta Graph API — fluxo oficial
// em 2 passos: cria o container de mídia, depois publica o container. META_ACCESS_TOKEN
// e META_IG_BUSINESS_ACCOUNT_ID são as MESMAS variáveis já usadas por
// checkIntegrationConnection('instagram') — nunca inventa nomes novos.
async function publishToInstagram(
  imagePublicUrl: string,
  caption: string,
  variant: 'feed' | 'stories'
): Promise<{ ok: boolean; externalId?: string; errorMessage?: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const igBusinessId = process.env.META_IG_BUSINESS_ACCOUNT_ID;
  if (!token || !igBusinessId) {
    return {
      ok: false,
      errorMessage:
        'Integração do Instagram não configurada no ambiente (META_ACCESS_TOKEN/META_IG_BUSINESS_ACCOUNT_ID ausentes).',
    };
  }
  try {
    const containerResp = await fetch(`https://graph.facebook.com/v20.0/${igBusinessId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imagePublicUrl,
        caption,
        ...(variant === 'stories' ? { media_type: 'STORIES' } : {}),
        access_token: token,
      }),
    });
    const containerData = (await containerResp.json()) as { id?: string; error?: { message?: string } };
    if (!containerResp.ok || containerData.error || !containerData.id) {
      return {
        ok: false,
        errorMessage: containerData.error?.message || `Falha ao criar container de mídia (HTTP ${containerResp.status}).`,
      };
    }
    const publishResp = await fetch(`https://graph.facebook.com/v20.0/${igBusinessId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
    });
    const publishData = (await publishResp.json()) as { id?: string; error?: { message?: string } };
    if (!publishResp.ok || publishData.error || !publishData.id) {
      return {
        ok: false,
        errorMessage: publishData.error?.message || `Falha ao publicar o container de mídia (HTTP ${publishResp.status}).`,
      };
    }
    return { ok: true, externalId: publishData.id };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Falha de rede ao publicar no Instagram.' };
  }
}

// Publica de verdade na Página do Facebook via Meta Graph API. META_ACCESS_TOKEN e
// META_PAGE_ID são as MESMAS variáveis já usadas por checkIntegrationConnection('facebook').
async function publishToFacebookPage(
  imagePublicUrl: string,
  caption: string
): Promise<{ ok: boolean; externalId?: string; errorMessage?: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) {
    return {
      ok: false,
      errorMessage: 'Integração do Facebook não configurada no ambiente (META_ACCESS_TOKEN/META_PAGE_ID ausentes).',
    };
  }
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imagePublicUrl, caption, access_token: token }),
    });
    const data = (await resp.json()) as { id?: string; post_id?: string; error?: { message?: string } };
    if (!resp.ok || data.error || !(data.post_id || data.id)) {
      return { ok: false, errorMessage: data.error?.message || `Falha ao publicar (HTTP ${resp.status}).` };
    }
    return { ok: true, externalId: data.post_id || data.id };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Falha de rede ao publicar no Facebook.' };
  }
}

// Lista real e deduplicada de telefones de clientes cadastrados — usada como
// destinatários do disparo em massa via WhatsApp. Reaproveita store.clients (já
// deduplicado por findClientByPhoneOrName em todo o resto do sistema); nunca monta
// uma lista paralela. Não há hoje nenhum controle de opt-out/consentimento de
// marketing — todos os clientes cadastrados recebem.
function getBroadcastRecipientPhones(store: PersistentStore): string[] {
  const phones = (store.clients || [])
    .map((c) => normalizePhoneDigits(c.phone))
    .filter((p) => p.length >= 10);
  return Array.from(new Set(phones));
}

// Processa UMA mensagem inbound real do webhook do WhatsApp: identifica (ou
// cria) o atendimento pelo telefone, nunca duplica a mesma mensagem em
// reentregas do webhook (dedup por externalMessageId), identifica a campanha de
// origem SÓ quando a própria Meta informar um referral que bate com um
// referenceCode real já cadastrado — nunca por suposição a partir de um clique
// no anúncio, que não é mensagem do cliente. Também pode enfileirar uma resposta
// automática, mas só quando settings.carlaAutoReply.enabled estiver ligado e a
// conversa não estiver pausada para atendimento humano.
function handleInboundWhatsAppMessage(
  store: PersistentStore,
  value: {
    contacts?: Array<{ profile?: { name?: string }; referral?: Record<string, unknown> }>;
  },
  msg: Record<string, unknown>
): { status: 'processed' | 'duplicate' | 'ignored'; attendanceId?: string } {
  const externalMessageId = msg.id as string | undefined;
  const fromPhone = msg.from as string | undefined;
  if (!externalMessageId || !fromPhone) return { status: 'ignored' };

  if (!store.agentChats) store.agentChats = {};
  if (!store.agentChats['carla_atendimento']) store.agentChats['carla_atendimento'] = [];
  const carlaChat = store.agentChats['carla_atendimento'];

  if (carlaChat.some((m) => m.externalMessageId === externalMessageId && m.externalChannel === 'whatsapp')) {
    return { status: 'duplicate' }; // mesma mensagem já processada — webhook reentregue
  }

  const msgType = msg.type as string | undefined;
  const textBody = (msg.text as { body?: string } | undefined)?.body;
  const text = textBody || `[Mensagem do tipo "${msgType || 'desconhecido'}" recebida — anexo não processado automaticamente]`;

  const normalizedFrom = fromPhone.replace(/\D/g, '');
  let attendance = store.attendances.find((a) =>
    a.clientPhone && a.clientPhone.replace(/\D/g, '').endsWith(normalizedFrom.slice(-8))
  );

  const referral = (msg.referral as Record<string, unknown> | undefined) || value.contacts?.[0]?.referral;
  const sourceId = referral?.source_id as string | undefined;
  let originCampaignId: string | undefined;
  let originIdentified = false;
  if (sourceId && store.juliaData) {
    const matchingCampaign = store.juliaData.campaigns.find((c) => c.referenceCode === sourceId);
    if (matchingCampaign) {
      originCampaignId = matchingCampaign.projectId;
      originIdentified = true;
    }
  }

  if (!attendance) {
    const now = new Date();
    const count = store.attendances.length + 1;
    attendance = {
      id: `att-wa-${Date.now()}`,
      ownerId: 'system',
      attendanceNumber: `CI-2026-${String(count).padStart(4, '0')}`,
      status: 'Rascunho',
      currentStep: 1,
      clientName: value.contacts?.[0]?.profile?.name || 'Cliente via WhatsApp',
      clientPhone: fromPhone,
      // Neutro de propósito — a Carla ainda não conversou com o cliente pra saber
      // tipo de móvel/quantidade/medidas; assumir "Sofá"/"1 unidade" antes da
      // triagem induziria quem olhasse o atendimento a achar que já é dado
      // confirmado. Ela preenche de verdade via extractedFields (ver
      // executeBackgroundTask, case 'responder_whatsapp_com_ia').
      furnitureType: 'A definir',
      piecesCount: 'A definir',
      approxMeasurements: 'A definir',
      usageTime: '',
      reportedDefects: '',
      desiredService: '',
      previousReforms: '',
      fabricAndComfortPreference: 'não informado',
      notes: 'Atendimento iniciado automaticamente a partir de mensagem recebida pelo canal oficial do WhatsApp.',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      originChannel: 'whatsapp',
      originCampaignId,
      originIdentified: sourceId ? originIdentified : false,
      photos: [],
      leftRightReference: 'Olhando o móvel de frente',
      defectFindings: [],
      analysisLimitations: [],
      requestedAdditionalPhotos: [],
      aiPreliminarySummary: '',
      reviewCompleted: false,
      reviewerName: '',
      reviewerGeneralNotes: '',
      internalInspectionCompleted: false,
      reuseItems: [],
      foamInspection: {
        inspectedByWorkshop: false,
        permanentDeformation: 'Não avaliado',
        compressionReturn: 'Não avaliado',
        crumbling: 'Não avaliado',
        odor: 'Não avaliado',
        moisture: 'Não avaliado',
        workshopNotes: '',
      },
      materialConsumptionAndReworkAnalysis: '',
      proposals: [],
      selectedProposalTier: 'RECOMENDADA',
      budget: {
        items: [],
        cuttingPlanConfirmed: false,
        sellingPriceCents: null,
        paymentConditions: 'não informado',
        confirmedByResponsible: false,
      },
      opinion: {
        isPreliminary: true,
        structureStateSummary: 'não informado',
        damageExtentSummary: 'não informado',
        possibleRecoverySummary: 'não informado',
        reusableMaterialsSummary: 'não informado',
        complexityLevel: 'A confirmar na oficina',
        expectedResultSummary: 'não informado',
        conclusion: 'Dados insuficientes para concluir',
        reasons: 'Avaliação ainda não iniciada.',
        pendingFactors: 'Envio de fotos, análise de defeitos, inspeção interna e orçamento.',
        whatCouldChangeConclusion: 'Inspeção presencial na oficina e definição de custos.',
        clientPlainLanguageSummary: 'Avaliação em andamento.',
        recommendedNextStep: 'Concluir o cadastro e anexar fotos do móvel.',
      },
      hiddenDamages: [],
      auditHistory: [
        {
          id: `log-${Date.now()}`,
          timestamp: now.toISOString(),
          actor: 'Sistema (WhatsApp)',
          stage: 'Cadastro',
          action: 'Atendimento criado',
          details: 'Criado automaticamente a partir de mensagem recebida pelo canal oficial do WhatsApp.',
        },
      ],
      staleness: {
        defectsAnalysisNeedsReview: false,
        responsibleReviewNeedsUpdate: false,
        reuseNeedsReview: false,
        proposalNeedsReview: false,
        opinionNeedsReview: false,
      },
      handoffHistory: [],
      deskStatus: 'em_andamento',
      currentDesk: 'carla_atendimento',
    };
    store.attendances.push(attendance);
  } else if (originCampaignId && !attendance.originIdentified) {
    attendance.originChannel = 'whatsapp';
    attendance.originCampaignId = originCampaignId;
    attendance.originIdentified = true;
  }

  carlaChat.push({
    // Determinístico a partir do externalMessageId (não mais tempo+aleatório)
    // — necessário para a recuperação de racha em
    // claimWhatsAppMessagesTransactionally poder checar se esta mensagem
    // específica já foi gravada antes de decidir se uma reivindicação
    // "já existente" é uma reentrega legítima ou um racha para completar.
    id: `cmsg-wa-${externalMessageId}`,
    deskId: 'carla_atendimento',
    sender: 'user',
    agentName: attendance.clientName || 'Cliente via WhatsApp',
    text,
    modality: 'texto',
    timestamp: new Date().toISOString(),
    attendanceId: attendance.id,
    externalChannel: 'whatsapp',
    externalMessageId,
  });

  const autoReply = store.settings.carlaAutoReply;
  const isPaused = autoReply?.pausedConversationIds?.includes(attendance.id);
  if (autoReply?.enabled && !isPaused) {
    // Payload mínimo de propósito — o contexto completo (conversa, dados já
    // coletados, se há preço homologado) é recarregado FRESCO na hora de
    // executar (ver executeBackgroundTask, case 'responder_whatsapp_com_ia'),
    // nunca congelado aqui no momento do webhook.
    createBackgroundTask(store, {
      type: 'responder_whatsapp_com_ia',
      agentId: 'carla_atendimento',
      action: `Responder mensagem de ${attendance.clientName} via WhatsApp (com IA)`,
      authorization: 'Resposta automática autorizada em Configurações > Atendimento automático da Carla',
      scheduledFor: new Date().toISOString(),
      relatedOrderId: attendance.id,
      idempotencyKey: `wa-reply-${externalMessageId}`,
      payload: {
        to: fromPhone,
        attendanceId: attendance.id,
        inboundText: text,
      },
    });
  }

  return { status: 'processed', attendanceId: attendance.id };
}

// Mantém só os registros mais recentes do diagnóstico de webhook — nunca guarda
// token/segredo nem o corpo bruto do evento, só o suficiente para diagnosticar.
const WHATSAPP_WEBHOOK_LOG_MAX = 50;
function recordWhatsAppWebhookEvent(store: PersistentStore, entry: Omit<WhatsAppWebhookLogEntry, 'id' | 'receivedAt'>): void {
  if (!store.whatsappWebhookLog) store.whatsappWebhookLog = [];
  store.whatsappWebhookLog.unshift({
    id: `wal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receivedAt: new Date().toISOString(),
    ...entry,
  });
  if (store.whatsappWebhookLog.length > WHATSAPP_WEBHOOK_LOG_MAX) {
    store.whatsappWebhookLog.length = WHATSAPP_WEBHOOK_LOG_MAX;
  }
}

// Executa UMA tarefa já marcada como 'executando'. Lança erro em caso de falha —
// quem chama é responsável por capturar e registrar errorMessage/status.
async function executeBackgroundTask(
  store: PersistentStore,
  task: BackgroundTask
): Promise<string> {
  switch (task.type) {
    case 'verificar_integracao': {
      const channel = task.channel || 'whatsapp';
      const result = await checkIntegrationConnection(channel);
      if (!store.settings.integrations) store.settings.integrations = {};
      store.settings.integrations[channel] = {
        state: result.state,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: result.ok ? undefined : result.message,
        accountLabel: result.accountLabel,
      };
      if (!result.ok) throw new Error(result.message);
      return result.message;
    }
    case 'publicar_campanha': {
      const scheduleItemId = task.payload?.scheduleItemId as string | undefined;
      const scheduleItem = scheduleItemId
        ? store.juliaData?.campaigns.find((c) => c.id === scheduleItemId)
        : undefined;
      if (!scheduleItem) {
        throw new Error('Item de agenda não encontrado — a campanha pode ter sido removida ou editada.');
      }
      const project = scheduleItem.projectId
        ? store.juliaData?.projects.find((p) => p.id === scheduleItem.projectId)
        : undefined;
      const now = new Date().toISOString();

      // "Status" do WhatsApp nunca tem endpoint de publicação em nenhuma API oficial —
      // não existe o que conectar aqui. Sempre manual, nunca uma tentativa real.
      if (scheduleItem.channel === 'WhatsApp Status') {
        scheduleItem.status = 'Com Erro';
        scheduleItem.integrationNote =
          'O Status do WhatsApp não tem endpoint de publicação em nenhuma API oficial — nenhuma integração consegue automatizar esse canal. Envio manual obrigatório.';
        throw new Error(scheduleItem.integrationNote);
      }

      if (scheduleItem.channel === 'Instagram Feed' || scheduleItem.channel === 'Instagram Stories') {
        const baseUrl = getPublicBaseUrl();
        const photo = scheduleItem.photoId
          ? store.juliaData?.photos.find((p) => p.id === scheduleItem.photoId)
          : undefined;
        if (!baseUrl) {
          scheduleItem.integrationNote =
            'APP_URL não configurado no ambiente — não é possível montar a URL pública da imagem para a Graph API.';
          throw new Error(scheduleItem.integrationNote);
        }
        if (!photo) {
          scheduleItem.integrationNote = 'Nenhuma foto real vinculada a este item da agenda — não é possível publicar sem imagem.';
          throw new Error(scheduleItem.integrationNote);
        }
        const caption =
          (scheduleItem.channel === 'Instagram Stories'
            ? project?.socialMediaVersions?.instagramStories
            : project?.socialMediaVersions?.instagramFeed) ||
          project?.copyText ||
          scheduleItem.captionPreview;
        const result = await publishToInstagram(
          `${baseUrl}${photo.imageUrl}`,
          caption,
          scheduleItem.channel === 'Instagram Stories' ? 'stories' : 'feed'
        );
        if (!result.ok) {
          scheduleItem.status = 'Com Erro';
          scheduleItem.integrationNote = result.errorMessage || 'Falha ao publicar no Instagram.';
          throw new Error(scheduleItem.integrationNote);
        }
        scheduleItem.status = 'Concluída';
        scheduleItem.externalConfirmation = {
          confirmedAt: now,
          externalId: result.externalId,
          source: 'Meta Graph API (Instagram)',
        };
        scheduleItem.integrationNote = `Publicado com sucesso no Instagram (id: ${result.externalId || 'não informado'}).`;
        return scheduleItem.integrationNote;
      }

      if (scheduleItem.channel === 'Facebook') {
        const baseUrl = getPublicBaseUrl();
        const photo = scheduleItem.photoId
          ? store.juliaData?.photos.find((p) => p.id === scheduleItem.photoId)
          : undefined;
        if (!baseUrl) {
          scheduleItem.integrationNote =
            'APP_URL não configurado no ambiente — não é possível montar a URL pública da imagem para a Graph API.';
          throw new Error(scheduleItem.integrationNote);
        }
        if (!photo) {
          scheduleItem.integrationNote = 'Nenhuma foto real vinculada a este item da agenda — não é possível publicar sem imagem.';
          throw new Error(scheduleItem.integrationNote);
        }
        const caption = project?.socialMediaVersions?.facebook || project?.copyText || scheduleItem.captionPreview;
        const result = await publishToFacebookPage(`${baseUrl}${photo.imageUrl}`, caption);
        if (!result.ok) {
          scheduleItem.status = 'Com Erro';
          scheduleItem.integrationNote = result.errorMessage || 'Falha ao publicar no Facebook.';
          throw new Error(scheduleItem.integrationNote);
        }
        scheduleItem.status = 'Concluída';
        scheduleItem.externalConfirmation = {
          confirmedAt: now,
          externalId: result.externalId,
          source: 'Meta Graph API (Facebook)',
        };
        scheduleItem.integrationNote = `Publicado com sucesso no Facebook (id: ${result.externalId || 'não informado'}).`;
        return scheduleItem.integrationNote;
      }

      // 'Lista de Transmissão WhatsApp': dispara o template aprovado, individualmente,
      // pra cada cliente real cadastrado — nunca texto livre (violaria a política da
      // Meta fora da janela de 24h de conversa).
      const template = store.settings.juliaWhatsappBroadcastTemplate;
      if (!template || !template.name) {
        scheduleItem.integrationNote =
          'Nenhum template de WhatsApp aprovado configurado em Configurações — configure o nome do template antes de agendar o disparo automático.';
        throw new Error(scheduleItem.integrationNote);
      }
      const recipients = getBroadcastRecipientPhones(store);
      if (recipients.length === 0) {
        scheduleItem.integrationNote = 'Nenhum cliente cadastrado com telefone válido para o disparo.';
        throw new Error(scheduleItem.integrationNote);
      }
      const bodyText = project?.socialMediaVersions?.whatsappMessage || project?.copyText || scheduleItem.captionPreview;
      const baseUrl = getPublicBaseUrl();
      const photo = scheduleItem.photoId
        ? store.juliaData?.photos.find((p) => p.id === scheduleItem.photoId)
        : undefined;
      const headerImageUrl = template.hasImageHeader && baseUrl && photo ? `${baseUrl}${photo.imageUrl}` : undefined;

      let successCount = 0;
      for (const phone of recipients) {
        const result = await sendWhatsAppTemplateMessage(
          phone,
          template.name,
          template.languageCode || 'pt_BR',
          bodyText,
          headerImageUrl,
          template.bodyVariableName
        );
        if (result.ok) successCount++;
      }

      scheduleItem.integrationNote = `Disparo via template "${template.name}": ${successCount}/${recipients.length} destinatário(s) alcançado(s).`;
      if (successCount === 0) {
        scheduleItem.status = 'Com Erro';
        throw new Error(scheduleItem.integrationNote);
      }
      scheduleItem.status = 'Concluída';
      scheduleItem.externalConfirmation = {
        confirmedAt: now,
        source: 'YCloud (template WhatsApp)',
      };
      return scheduleItem.integrationNote;
    }
    case 'enviar_resposta_whatsapp': {
      const status = store.settings.integrations?.whatsapp;
      if (!status || status.state !== 'conectado') {
        throw new Error(
          'Integração oficial do WhatsApp não está conectada. Não é possível enviar resposta automática — use o compartilhamento manual.'
        );
      }
      const to = (task.payload?.to as string) || '';
      const text = (task.payload?.text as string) || '';
      if (!to || !text) {
        throw new Error('Tarefa sem telefone/texto de destino — não há o que enviar.');
      }
      const result = await sendWhatsAppMessage(to, text);
      if (!result.ok) throw new Error(result.errorMessage || 'Falha ao enviar mensagem.');

      if (task.relatedOrderId) {
        if (!store.agentChats) store.agentChats = {};
        if (!store.agentChats['carla_atendimento']) store.agentChats['carla_atendimento'] = [];
        store.agentChats['carla_atendimento'].push({
          id: `cmsg-wa-${Date.now()}`,
          deskId: 'carla_atendimento',
          sender: 'agent',
          agentName: 'Carla',
          text,
          modality: 'texto',
          timestamp: new Date().toISOString(),
          attendanceId: task.relatedOrderId,
          externalChannel: 'whatsapp',
          externalMessageId: result.externalId,
        });
      }
      return `Mensagem enviada ao canal oficial do WhatsApp (id externo: ${result.externalId || 'não informado'}).`;
    }
    case 'responder_whatsapp_com_ia': {
      const status = store.settings.integrations?.whatsapp;
      if (!status || status.state !== 'conectado') {
        throw new Error(
          'Integração oficial do WhatsApp não está conectada. Não é possível enviar resposta automática — use o compartilhamento manual.'
        );
      }
      // Defesa em profundidade: as configurações podem ter mudado entre o
      // momento em que o webhook enfileirou esta tarefa e agora.
      const autoReply = store.settings.carlaAutoReply;
      const attendanceId = (task.payload?.attendanceId as string) || task.relatedOrderId || '';
      const to = (task.payload?.to as string) || '';
      const inboundText = (task.payload?.inboundText as string) || '';
      if (!attendanceId || !to) {
        throw new Error('Tarefa sem atendimento/telefone de destino — não há o que responder.');
      }
      if (!autoReply?.enabled || autoReply.pausedConversationIds?.includes(attendanceId)) {
        return 'Resposta automática desligada ou conversa pausada para atendimento humano desde que esta tarefa foi criada — nada enviado.';
      }

      const attendance = store.attendances.find((a) => a.id === attendanceId);
      if (!attendance) {
        throw new Error(`Atendimento ${attendanceId} não encontrado — não há o que responder.`);
      }

      const repliesLast24h = countCarlaWhatsAppRepliesLast24h(store, attendanceId);
      if (repliesLast24h >= CARLA_WHATSAPP_MAX_REPLIES_PER_DAY) {
        attendance.notes = `${attendance.notes ? attendance.notes + '\n' : ''}[${new Date().toISOString()}] Resposta automática via WhatsApp pulada: limite de ${CARLA_WHATSAPP_MAX_REPLIES_PER_DAY} mensagens/24h atingido — revisão humana necessária.`;
        return `Limite de ${CARLA_WHATSAPP_MAX_REPLIES_PER_DAY} respostas automáticas em 24h atingido para este atendimento — nada enviado, sinalizado para revisão humana.`;
      }

      const factualContext = buildCarlaWhatsAppFactualContext(store, attendance);
      const historyTranscript = buildCarlaWhatsAppHistoryTranscript(store, attendanceId);
      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';

      const { response } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts: [
          {
            text: `${factualContext}\n\nHISTÓRICO DA CONVERSA COM ESTE CLIENTE PELO WHATSAPP:\n${historyTranscript}\n\nMENSAGEM MAIS RECENTE DO CLIENTE:\n"${inboundText}"`,
          },
        ],
        systemInstruction: CARLA_WHATSAPP_SYSTEM_INSTRUCTION,
        responseSchema: convertSchemaToJsonSchema(CARLA_WHATSAPP_RESPONSE_SCHEMA),
        lockKey: `carla-wa-${attendanceId}`,
      });

      const parsed = JSON.parse(response.text || '{}');
      const hasConfirmedPrice = getConfirmedPriceCents(attendance) != null;
      const coerced = validateAndCoerceCarlaWhatsAppOutput(parsed, hasConfirmedPrice);

      // 1. Aplica só os campos que o cliente de fato disse — ação de baixo risco,
      //    é a mesma coisa que o atendimento manual registraria.
      const now = new Date().toISOString();
      let anyFieldApplied = false;
      for (const [key, value] of Object.entries(coerced.extractedFields)) {
        (attendance as unknown as Record<string, unknown>)[key] = value;
        anyFieldApplied = true;
      }
      if (coerced.requestTypeDetected !== 'indefinido' && attendance.requestType !== coerced.requestTypeDetected) {
        attendance.requestType = coerced.requestTypeDetected;
        anyFieldApplied = true;
      }
      if (anyFieldApplied) {
        attendance.updatedAt = now;
        attendance.auditHistory.unshift({
          id: `aud-${Date.now()}`,
          timestamp: now,
          actor: 'Carla (IA — WhatsApp)',
          stage: 'Atendimento',
          action: 'Dados atualizados a partir da conversa no WhatsApp',
          details: `Campos preenchidos a partir do que o cliente relatou: ${Object.keys(coerced.extractedFields).join(', ') || 'classificação do pedido'}.`,
        });
      }

      // 2. Encaminha sozinha pra mesa técnica quando a triagem está completa —
      //    só reatribui mesa/status (createOrderHandoff), nunca compromisso
      //    financeiro algum.
      if (coerced.readyForHandoff && attendance.currentDesk === 'carla_atendimento') {
        const toDesk: DepartmentId = coerced.requestTypeDetected === 'fabricacao_nova' ? 'lucas_projetos' : 'pedro_avaliacao';
        createOrderHandoff(store, attendance, {
          fromDesk: 'carla_atendimento',
          toDesk,
          reason: 'Encaminhamento automático pela Carla (IA) após coleta inicial via WhatsApp',
          completedSummary: coerced.handoffSummary || 'Triagem inicial concluída via WhatsApp.',
          pendingItems: coerced.pendingItemsForHandoff,
          nextActionExpected: toDesk === 'lucas_projetos' ? 'Elaborar projeto de fabricação nova.' : 'Avaliação técnica da peça para reforma.',
        });
      }

      // 3. Reclamação detectada: Carla para de responder sozinha nesta conversa
      //    — reaproveita o mesmo campo que já existe pra um humano assumir.
      if (coerced.complaintDetected) {
        if (!autoReply.pausedConversationIds) autoReply.pausedConversationIds = [];
        if (!autoReply.pausedConversationIds.includes(attendanceId)) {
          autoReply.pausedConversationIds.push(attendanceId);
        }
        if (!attendance.complaints) attendance.complaints = [];
        attendance.complaints.push({
          id: `cmp-${Date.now()}`,
          createdAt: now,
          description: inboundText || 'Reclamação identificada pela Carla durante conversa no WhatsApp.',
          urgency: 'normal',
          status: 'aberta',
        });
      }

      // 4. Envia a resposta já validada (nunca o texto cru do modelo sem passar
      //    pela trava de preço acima) pelo mesmo caminho de sempre.
      const result = await sendWhatsAppMessage(to, coerced.replyText);
      if (!result.ok) throw new Error(result.errorMessage || 'Falha ao enviar mensagem.');

      if (!store.agentChats) store.agentChats = {};
      if (!store.agentChats['carla_atendimento']) store.agentChats['carla_atendimento'] = [];
      store.agentChats['carla_atendimento'].push({
        id: `cmsg-wa-${Date.now()}`,
        deskId: 'carla_atendimento',
        sender: 'agent',
        agentName: 'Carla',
        text: coerced.replyText,
        modality: 'texto',
        timestamp: now,
        attendanceId,
        externalChannel: 'whatsapp',
        externalMessageId: result.externalId,
      });

      return `Resposta da Carla (IA) enviada ao WhatsApp (id externo: ${result.externalId || 'não informado'})${
        coerced.priceOverrideApplied ? ' — ATENÇÃO: o texto original do modelo citava valor sem orçamento homologado; substituído pelo fallback seguro.' : ''
      }.`;
    }
    case 'iniciar_campanha_paga': {
      const proposalId = task.payload?.paidAdProposalId as string | undefined;
      const proposal = proposalId
        ? store.juliaData?.paidAdProposals?.find((p) => p.id === proposalId)
        : undefined;

      const result = await checkPaidAdsIntegrationConnection();
      if (!result.ok) {
        if (proposal) proposal.status = 'aguardando_integracao';
        throw new Error(result.message);
      }
      // A verificação da conta de anúncios passou, mas a chamada real de criação
      // de campanha/conjunto de anúncios/anúncio na Marketing API da Meta ainda
      // não está implementada — nunca afirmar que o anúncio foi ao ar sem esse
      // código existir de fato. Isso é código preparado, não uma automação ativa.
      if (proposal) proposal.status = 'aguardando_integracao';
      throw new Error(
        'Conta de anúncios verificada, mas a criação automática da campanha paga ainda não está implementada — crie manualmente na Meta por enquanto.'
      );
    }
    default:
      throw new Error(`Tipo de tarefa desconhecido: ${task.type}`);
  }
}

// Processa todas as tarefas vencidas ('na_fila' com scheduledFor <= agora). Chamado
// pela rota /api/tasks/process-due, pensada para ser disparada por um gatilho
// externo (Cloud Scheduler) em intervalos regulares.
async function processDueBackgroundTasks(
  store: PersistentStore
): Promise<Array<{ id: string; status: BackgroundTaskStatus; result?: string; errorMessage?: string }>> {
  if (!Array.isArray(store.backgroundTasks)) store.backgroundTasks = [];
  const now = new Date();
  const due = store.backgroundTasks.filter(
    (t) => t.status === 'na_fila' && new Date(t.scheduledFor).getTime() <= now.getTime()
  );

  const outcomes: Array<{ id: string; status: BackgroundTaskStatus; result?: string; errorMessage?: string }> = [];

  for (const task of due) {
    task.status = 'executando';
    task.startedAt = new Date().toISOString();
    task.attempts += 1;
    try {
      const result = await executeBackgroundTask(store, task);
      task.status = 'concluida';
      task.completedAt = new Date().toISOString();
      task.result = result;
      task.errorMessage = undefined;
      outcomes.push({ id: task.id, status: task.status, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha desconhecida.';
      task.errorMessage = message;
      // Nunca reentra em loop de retentativa sem limite: ao esgotar maxAttempts,
      // a tarefa fica definitivamente 'falhou' — só um humano pode recriá-la.
      if (task.attempts >= task.maxAttempts) {
        task.status = 'falhou';
        task.completedAt = new Date().toISOString();
      } else {
        task.status = 'na_fila';
      }
      outcomes.push({ id: task.id, status: task.status, errorMessage: message });
    }
  }

  if (due.length > 0) {
    saveStore(store);
  }
  return outcomes;
}

function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Configuração pendente: A variável de ambiente ANTHROPIC_API_KEY não está configurada no servidor. Configure a chave nos Segredos (Secrets) do ambiente para executar a análise real por IA.'
    );
  }
  return apiKey;
}

// Usada só pela Vista Explodida (geração de imagem) — serviço do Google, separado
// da Anthropic/Claude usada no restante do app, porque Claude não gera imagem.
function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Configuração pendente: A variável de ambiente GEMINI_API_KEY não está configurada no servidor. Configure uma chave do Google AI Studio nos Segredos (Secrets) do ambiente para gerar a Vista Explodida.'
    );
  }
  return apiKey;
}

// Mutex de concorrência para evitar disparos simultâneos na interface
const inFlightGeminiRequests = new Set<string>();

// Firestore Helpers — o estado inteiro (equivalente a data/store.json) é espelhado
// em um único documento do Firestore a cada gravação, para que os dados sobrevivam
// mesmo sem disco permanente no ambiente de hospedagem (ex.: Cloud Run sem volume
// montado). O arquivo local continua sendo a cópia rápida usada por todas as rotas
// (leitura/gravação síncrona, sem mudar a arquitetura existente) — o Firestore é o
// backup que entra em ação na inicialização do servidor.
const FIRESTORE_STORE_COLLECTION = 'appState';
const FIRESTORE_STORE_DOC = 'main';
// `juliaData` (biblioteca de fotos, campanhas) sozinha já passou perto do
// limite de 1MB do documento único appState/main — qualquer gravação de
// QUALQUER chave (settings, clients, backgroundTasks, o próprio log do
// webhook do WhatsApp) sobrescrevia o documento inteiro junto, então uma
// juliaData grande bastava para travar TODAS as outras gravações, inclusive
// o WhatsApp. Por isso juliaData tem seu próprio documento, com seu próprio
// orçamento de 1MB, independente do resto.
const FIRESTORE_JULIA_DOC = 'juliaData';

// Tamanho máximo de um documento do Firestore. Ultrapassar isso faz o .set()
// abaixo ser rejeitado (erro "entity too large"), silenciosamente capturado
// pelo .catch() — ou seja, o backup para de funcionar sem travar nenhuma rota,
// mas também sem avisar ninguém, a não ser pelo log do servidor. Por isso o
// tamanho atual é devolvido por getFirestoreStoreSizeInfo() para aparecer no
// diagnóstico do WhatsApp em Configurações.
const FIRESTORE_DOCUMENT_BYTE_LIMIT = 1_048_576;
const FIRESTORE_SIZE_WARNING_THRESHOLD = 900_000;
// Acima disto, a sobra até o limite real (1.048.576) já é menor que a franja de
// overhead que o Firestore soma por campo/índice em cima do tamanho do JSON —
// ou seja, falhas por "entity too large" já são esperadas a qualquer gravação,
// não apenas uma possibilidade futura. Visto em produção: 1.045.502 bytes
// (99,7%) ainda classificando como "nearLimit" não bastava para transmitir
// isso, por isso este segundo nível.
const FIRESTORE_SIZE_CRITICAL_THRESHOLD = 1_030_000;

// Chaves que REALMENTE continuam sendo gravadas em appState/main desde o
// corte para coleções por entidade (ver persistStoreKeysTransactionally e o
// comentário acima dela) — `attendances`/`agentChats` saíram de verdade para
// attendances_v2/agentChats_v2_*, nunca mais escritos neste documento único.
// Medir o tamanho usando o store local inteiro (que ainda carrega
// attendances/agentChats para servir a UI) sobrestimaria o documento real —
// ver DEPLOY_WHATSAPP_DURABILITY_FIX.md, seção "Espaço restante em
// appState/main", para o porquê disto importar de verdade (o documento real
// em produção já estava perto do limite com 0 atendimentos).
const FIRESTORE_MAIN_DOC_KEYS: Array<keyof PersistentStore> = [
  'nextSequence',
  'materials',
  'settings',
  'officeData',
  'backgroundTasks',
  'clients',
  'whatsappWebhookLog',
];

function buildFirestoreMainDocShape(store: PersistentStore): Record<string, unknown> {
  const shape: Record<string, unknown> = { savedAt: new Date().toISOString() };
  for (const key of FIRESTORE_MAIN_DOC_KEYS) {
    shape[key] = store[key];
  }
  return shape;
}

// Quebra por chave do que de fato vai para appState/main — nunca
// attendances/agentChats (ver FIRESTORE_MAIN_DOC_KEYS acima). Permite
// responder "o que está ocupando o espaço" sem precisar adivinhar: a chave
// com mais bytes aparece primeiro.
function getFirestoreMainDocKeyBreakdown(store: PersistentStore): Array<{ key: string; bytes: number }> {
  return FIRESTORE_MAIN_DOC_KEYS.map((key) => ({
    key,
    bytes: Buffer.byteLength(JSON.stringify(store[key] ?? null), 'utf-8'),
  })).sort((a, b) => b.bytes - a.bytes);
}

function getFirestoreStoreSizeInfo(store: PersistentStore): {
  bytes: number;
  limitBytes: number;
  percentUsed: number;
  nearLimit: boolean;
  critical: boolean;
  keyBreakdown: Array<{ key: string; bytes: number }>;
} {
  const bytes = Buffer.byteLength(JSON.stringify(buildFirestoreMainDocShape(store)), 'utf-8');
  return {
    bytes,
    limitBytes: FIRESTORE_DOCUMENT_BYTE_LIMIT,
    percentUsed: Math.round((bytes / FIRESTORE_DOCUMENT_BYTE_LIMIT) * 1000) / 10,
    nearLimit: bytes > FIRESTORE_SIZE_WARNING_THRESHOLD,
    critical: bytes > FIRESTORE_SIZE_CRITICAL_THRESHOLD,
    keyBreakdown: getFirestoreMainDocKeyBreakdown(store),
  };
}

// Mesmo limite/limiares do documento único, mas medindo só juliaData — agora
// que tem seu próprio documento (appState/juliaData), com seu próprio
// orçamento de 1MB, independente de appState/main.
function getJuliaDataSizeInfo(store: PersistentStore): {
  bytes: number;
  limitBytes: number;
  percentUsed: number;
  nearLimit: boolean;
  critical: boolean;
} {
  const bytes = Buffer.byteLength(JSON.stringify(store.juliaData ?? null), 'utf-8');
  return {
    bytes,
    limitBytes: FIRESTORE_DOCUMENT_BYTE_LIMIT,
    percentUsed: Math.round((bytes / FIRESTORE_DOCUMENT_BYTE_LIMIT) * 1000) / 10,
    nearLimit: bytes > FIRESTORE_SIZE_WARNING_THRESHOLD,
    critical: bytes > FIRESTORE_SIZE_CRITICAL_THRESHOLD,
  };
}

// Interruptor de manutenção para a janela de migração para coleções (ver
// migrations/README.md). Bloqueia TODA gravação no ponto central — nunca
// ligado por código algum, só por quem opera o deploy, exatamente durante
// uma migração real. Verificado antes de qualquer tentativa de rede, então
// o bloqueio é instantâneo (sem round-trip ao Firestore).
function isWriteMaintenanceModeActive(): boolean {
  return process.env.MAINTENANCE_MODE_WRITES_BLOCKED === '1';
}
const MAINTENANCE_MODE_ERROR_MESSAGE =
  'Gravação bloqueada: MAINTENANCE_MODE_WRITES_BLOCKED=1 (manutenção para migração de dados). Tente novamente quando a manutenção terminar.';

// Substitui o antigo .set() cego do documento inteiro. Desde a troca para
// coleções por entidade (ver migrations/README.md e DEPLOY_WHATSAPP_
// DURABILITY_FIX.md), isto grava em DOIS lugares diferentes, nunca mais um
// documento único:
//   1. Chaves comuns (settings, juliaData, materials, clients,
//      backgroundTasks, whatsappWebhookLog, officeData, nextSequence) —
//      continuam em appState/main, substituídas por inteiro dentro de uma
//      transação que lê o documento FRESCO primeiro (mesmo padrão de
//      sempre) — uma rota que só muda `settings` nunca toca as outras
//      chaves no documento fresco.
//   2. `attendances` e `agentChats` — cada item (cada atendimento, cada
//      mensagem) é o seu PRÓPRIO documento em `attendances_v2`/
//      `agentChats_v2_{deskId}`. Upsert de atendimento usa
//      `set(fields, {merge:true})` para uma atualização (o próprio
//      Firestore mescla os campos atomicamente, sem precisar de leitura
//      prévia nem transação — duas chamadas mudando CAMPOS DIFERENTES do
//      MESMO atendimento sobrevivem as duas, exatamente como antes) ou
//      `set(fields)` completo para um atendimento novo. Mensagem nova usa
//      `set()` simples (nunca editada depois de criada). Isso reduz o
//      "raio de alcance" de qualquer gravação a um único atendimento/
//      mensagem — a edição de um atendimento NUNCA pode mais, por
//      construção, sobrescrever outro atendimento que o webhook tenha
//      criado/atualizado concorrentemente.
//
// LIMITAÇÃO DECLARADA (residual, menor — ver migrations/README.md): o
// merge por campo para no PRIMEIRO NÍVEL. Um objeto aninhado (`budget`,
// `opinion`, `foamInspection`) que mudou é tratado como um bloco só — duas
// edições concorrentes tocando campos DIFERENTES dentro do MESMO objeto
// aninhado do MESMO atendimento ainda colidem (o `set(..., {merge:true})`
// do Firestore faz merge raso, não recursivo). E duas edições que mudam
// exatamente o MESMO campo seguem sendo última-escrita-vence, por ser uma
// decisão de negócio, não um bug.
async function persistStoreKeysTransactionally(
  store: PersistentStore,
  diff: StoreDiff
): Promise<{ ok: boolean; errorMessage?: string }> {
  const nothingChanged =
    diff.changedTopLevelKeys.length === 0 &&
    diff.attendanceUpdates.length === 0 &&
    diff.attendanceDeletes.length === 0 &&
    Object.keys(diff.agentChatNewMessages).length === 0;
  if (nothingChanged) {
    return { ok: true }; // nada para gravar
  }
  if (isWriteMaintenanceModeActive()) {
    return { ok: false, errorMessage: MAINTENANCE_MODE_ERROR_MESSAGE };
  }

  const errors: string[] = [];

  // `juliaData` tem documento próprio (appState/juliaData) — nunca mais vai
  // junto com o resto em appState/main (ver comentário acima de
  // FIRESTORE_JULIA_DOC). Como esse documento só guarda juliaData, um
  // sobrescrever simples (sem transação) é suficiente: não há outra chave
  // para colidir.
  if (diff.changedTopLevelKeys.includes('juliaData')) {
    try {
      await db
        .collection(FIRESTORE_STORE_COLLECTION)
        .doc(FIRESTORE_JULIA_DOC)
        .set({ juliaData: store.juliaData, savedAt: new Date().toISOString() });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[Firestore Sync] Falha ao sincronizar juliaData com appState/juliaData:', errorMessage);
      errors.push(errorMessage);
    }
  }

  const mainDocChangedKeys = diff.changedTopLevelKeys.filter((key) => key !== 'juliaData');
  if (mainDocChangedKeys.length > 0) {
    const docRef = db.collection(FIRESTORE_STORE_COLLECTION).doc(FIRESTORE_STORE_DOC);
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const fresh = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
        for (const key of mainDocChangedKeys) {
          fresh[key] = (store as unknown as Record<string, unknown>)[key];
        }
        fresh.savedAt = new Date().toISOString();
        tx.set(docRef, fresh);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[Firestore Sync] Falha ao sincronizar as chaves comuns com appState/main:', errorMessage);
      errors.push(errorMessage);
    }
  }

  if (diff.attendanceUpdates.length > 0 || diff.attendanceDeletes.length > 0) {
    const attendancesCol = db.collection(COLLECTION_ATTENDANCES);
    for (const update of diff.attendanceUpdates) {
      try {
        if (update.isNew) {
          await attendancesCol.doc(update.id).set(update.fields);
        } else {
          // merge:true = o próprio Firestore aplica só estes campos por
          // cima do documento existente, atomicamente — sem precisar ler
          // primeiro nem abrir transação (ver limitação declarada acima).
          await attendancesCol.doc(update.id).set(update.fields, { merge: true });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Firestore Sync] Falha ao gravar attendances_v2/${update.id}:`, errorMessage);
        errors.push(`attendances_v2/${update.id}: ${errorMessage}`);
      }
    }
    for (const delId of diff.attendanceDeletes) {
      try {
        await attendancesCol.doc(delId).delete();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Firestore Sync] Falha ao apagar attendances_v2/${delId}:`, errorMessage);
        errors.push(`attendances_v2/${delId} (delete): ${errorMessage}`);
      }
    }
  }

  if (Object.keys(diff.agentChatNewMessages).length > 0) {
    for (const [deskId, newMsgs] of Object.entries(diff.agentChatNewMessages)) {
      const chatCol = db.collection(`${COLLECTION_CHAT_MESSAGE_PREFIX}${deskId}`);
      for (const msg of newMsgs) {
        try {
          await chatCol.doc(msg.id).set(msg as unknown as Record<string, unknown>);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`[Firestore Sync] Falha ao gravar ${COLLECTION_CHAT_MESSAGE_PREFIX}${deskId}/${msg.id}:`, errorMessage);
          errors.push(`${COLLECTION_CHAT_MESSAGE_PREFIX}${deskId}/${msg.id}: ${errorMessage}`);
          continue;
        }
        // Mensagens do WhatsApp com externalMessageId também deveriam ter sido
        // reivindicadas atomicamente no caminho do webhook (ver
        // claimWhatsAppMessagesTransactionally) ANTES de chegar aqui — isto é
        // só uma segunda camada defensiva para qualquer outro caminho que
        // venha a acrescentar uma mensagem do WhatsApp a agentChats sem passar
        // por lá. AlreadyExistsError aqui é esperado e benigno (o marcador já
        // existe), nunca tratado como erro — mesmo padrão de
        // dedupMarkersAlreadyPresent na migração.
        if (msg.externalChannel === 'whatsapp' && msg.externalMessageId) {
          try {
            await firestoreLikeDb
              .collection(COLLECTION_WHATSAPP_DEDUP)
              .doc(msg.externalMessageId)
              .create({ attendanceId: msg.attendanceId, deskId, chatMessageId: msg.id });
          } catch (err) {
            if (!(err instanceof AlreadyExistsError)) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.error(`[Firestore Sync] Falha ao gravar marcador de dedup para ${msg.externalMessageId}:`, errorMessage);
              errors.push(`whatsappMessageDedup/${msg.externalMessageId}: ${errorMessage}`);
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errorMessage: errors.join(' | ') };
  }
  return { ok: true };
}

// Reivindicação de mensagens do WhatsApp — desde a troca para coleções por
// entidade, isto NÃO usa mais uma transação sobre um documento único.
// Substitui "ler o documento inteiro, procurar o id, sobrescrever o
// documento inteiro" por UMA ÚNICA transação real do Firestore que lê
// atendimentos + a existência de cada marcador de dedup candidato, decide o
// que processar em memória, e só então grava atendimentos, mensagens E os
// marcadores de dedup (`whatsappMessageDedup/{externalMessageId}`, via
// `tx.create()`) — tudo dentro da MESMA transação.
//
// Isto corrige uma versão anterior desta revisão, que reivindicava a
// mensagem com `tryClaimWhatsAppMessageId()` ANTES e FORA da transação de
// gravação (dois passos sequenciais, não atômicos entre si). Se o processo
// morresse entre os dois passos, a mensagem ficava "reivindicada" sem nunca
// ter sido gravada, e a próxima reentrega da Meta via `already_claimed` e
// descartava silenciosamente — perda real de mensagem, sem aviso. A versão
// atual fecha isso: como a reivindicação (`tx.create()` no marcador de
// dedup) só é aplicada se TODA a transação commitar junto com a mensagem e
// o atendimento, uma falha antes do commit não deixa nenhum rastro — nem o
// marcador existe — e a reentrega processa a mensagem do zero normalmente,
// sem descarte.
//
// Isso fecha as mesmas duas falhas de concorrência que a transação antiga
// (documento único) fechava, agora com uma transação só sobre os poucos
// documentos relevantes desta chamada (nunca o documento de ~1MB que
// causava o travamento original):
// 1. Concorrência entre instâncias/chamadas DISPUTANDO A MESMA MENSAGEM
//    (mesmo externalMessageId): a leitura da existência do marcador e a
//    gravação condicional dele acontecem na MESMA transação — se duas
//    chamadas concorrentes leem "não existe" ao mesmo tempo, o Firestore
//    detecta o conflito de escrita no commit e re-tenta automaticamente
//    uma delas, que então vê "já existe" e trata como duplicata.
// 2. Concorrência entre instâncias/chamadas processando mensagens
//    DIFERENTES do MESMO cliente ainda sem atendimento (ex.: duas primeiras
//    mensagens de um cliente novo chegando quase juntas): mesma proteção,
//    agora também sobre a leitura de atendimentos dentro da transação.
//    CONFIRMADO EXPERIMENTALMENTE nesta revisão: uma primeira versão deste
//    código SEM transação nenhuma (reivindicação solta, gravação solta),
//    testada com 10 chamadas verdadeiramente concorrentes para o MESMO
//    externalMessageId contra o emulador oficial, criou atendimentos
//    duplicados — uma tentativa de "recuperar" reivindicações sem gravação
//    correspondente tratava incorretamente concorrência real como se fosse
//    uma falha anterior, e todos os "perdedores" tentavam completar o
//    trabalho ao mesmo tempo. Removida em favor desta transação única.
//
// Isto NÃO protege contra uma escrita concorrente de OUTRA rota editando o
// MESMO atendimento ao mesmo tempo além do primeiro nível de campos — ver a
// limitação declarada em persistStoreKeysTransactionally.
interface WhatsAppTransactionResult {
  ok: boolean;
  errorMessage?: string;
  messagesProcessed: number;
  messagesDuplicated: number;
  attendanceIdsTouched: string[];
  // Devolvido só em sucesso — o store local (settings/materials/etc. do
  // disco local + attendances/agentChats atualizados) para a rota gravar
  // como cache local sem precisar de uma segunda leitura.
  mergedStore?: PersistentStore;
}

async function claimWhatsAppMessagesTransactionally(
  incomingMessages: Array<{
    value: { contacts?: Array<{ profile?: { name?: string }; referral?: Record<string, unknown> }> };
    msg: Record<string, unknown>;
  }>,
  timeoutMs: number
): Promise<WhatsAppTransactionResult> {
  if (isWriteMaintenanceModeActive()) {
    // Bloqueia antes de qualquer tentativa de rede — nenhuma mensagem é
    // marcada como concluída, a Meta reentrega depois da manutenção.
    return {
      ok: false,
      errorMessage: MAINTENANCE_MODE_ERROR_MESSAGE,
      messagesProcessed: 0,
      messagesDuplicated: 0,
      attendanceIdsTouched: [],
    };
  }

  const attendancesCol = db.collection(COLLECTION_ATTENDANCES);
  const chatCol = db.collection(`${COLLECTION_CHAT_MESSAGE_PREFIX}carla_atendimento`);
  const dedupCol = db.collection(COLLECTION_WHATSAPP_DEDUP);
  const storeDocRef = db.collection(FIRESTORE_STORE_COLLECTION).doc(FIRESTORE_STORE_DOC);

  const run = async (): Promise<WhatsAppTransactionResult> => {
    // Transação única: lê atendimentos + backgroundTasks frescos do
    // documento único + existência de cada marcador de dedup candidato,
    // decide em memória o que processar, e grava atendimentos, mensagens,
    // marcadores de dedup E a(s) tarefa(s) automática(s) nova(s) (ex.:
    // resposta automática) juntos. Nenhuma escrita acontece fora desta
    // transação — ver comentário acima. `backgroundTasks` é lido fresco do
    // Firestore (não do disco local) pelo mesmo motivo que `attendances`
    // já era: a checagem de idempotência de createBackgroundTask() só vale
    // alguma coisa contra o estado mais atual possível, não contra um cache
    // local potencialmente desatualizado entre instâncias.
    const txResult = await db.runTransaction(async (tx) => {
      // 1. LEITURAS primeiro (exigência do Firestore: toda leitura de uma
      //    transação precisa vir antes de qualquer escrita).
      const freshSnap = await tx.get(attendancesCol);
      const freshAttendances = freshSnap.docs.map((d) => d.data() as unknown as AttendanceRecord);
      const attendanceIdsBefore = new Set(freshAttendances.map((a) => a.id));

      // `settings`/`juliaData` (usados por handleInboundWhatsAppMessage para
      // resposta automática e casamento de campanha) vêm do disco local via
      // loadStore() — igual ao comportamento original — e NÃO do documento
      // único: o documento pode genuinamente não ter essas chaves ainda
      // (ex.: ainda não existe, ou nenhuma rota de /api/settings rodou desde
      // o corte para coleções), e workingStore.settings precisa sempre
      // existir (handleInboundWhatsAppMessage lê store.settings.carlaAutoReply
      // sem checagem de undefined). loadStore() sempre aplica os defaults.
      const localStore = loadStore();

      const storeDocSnap = await tx.get(storeDocRef);
      const storeDocData = (storeDocSnap.exists ? storeDocSnap.data() : {}) as Record<string, unknown>;
      const freshBackgroundTasks: BackgroundTask[] = Array.isArray(storeDocData.backgroundTasks)
        ? (storeDocData.backgroundTasks as BackgroundTask[])
        : [];

      const candidateExternalIds = incomingMessages
        .map((item) => item.msg.id as string | undefined)
        .filter((id): id is string => Boolean(id));
      const dedupSnaps =
        candidateExternalIds.length > 0
          ? await tx.getAll(...candidateExternalIds.map((id) => dedupCol.doc(id)))
          : [];
      const alreadyClaimedIds = new Set(dedupSnaps.filter((s) => s.exists).map((s) => s.id));

      // 2. PROCESSAMENTO em memória (nenhuma chamada ao Firestore aqui) —
      //    pula quem já tem marcador de dedup (duplicata real, confirmada
      //    pela MESMA leitura que vai virar a MESMA escrita abaixo).
      const workingAgentChats: Record<string, AgentChatMessage[]> = { carla_atendimento: [] };
      const carlaChatMessages = workingAgentChats['carla_atendimento'];
      const workingStore: PersistentStore = {
        ...localStore,
        attendances: freshAttendances,
        agentChats: workingAgentChats,
        backgroundTasks: [...freshBackgroundTasks],
      };

      let messagesProcessed = 0;
      let messagesDuplicated = 0;
      const attendanceIdsTouched = new Set<string>();
      const newMessages: AgentChatMessage[] = [];
      const dedupWrites: Array<{ externalMessageId: string; attendanceId?: string; chatMessageId: string }> = [];

      for (const { value, msg } of incomingMessages) {
        const externalMessageId = msg.id as string | undefined;
        if (externalMessageId && alreadyClaimedIds.has(externalMessageId)) {
          messagesDuplicated++;
          continue;
        }
        const beforeLength = carlaChatMessages.length;
        const result = handleInboundWhatsAppMessage(workingStore, value, msg);
        if (result.status === 'processed') {
          messagesProcessed++;
          if (result.attendanceId) attendanceIdsTouched.add(result.attendanceId);
          const added = carlaChatMessages.slice(beforeLength);
          newMessages.push(...added);
          if (externalMessageId) {
            dedupWrites.push({
              externalMessageId,
              attendanceId: result.attendanceId,
              chatMessageId: added[0]?.id ?? `cmsg-wa-${externalMessageId}`,
            });
          }
        } else if (result.status === 'duplicate') {
          // Não é só uma segunda camada redundante: isto é o que pega o
          // caso de DUAS mensagens com o MESMO externalMessageId dentro do
          // MESMO payload do webhook (raro, mas o formato do payload da
          // Meta permite). `alreadyClaimedIds` só reflete o que já existia
          // no Firestore ANTES desta chamada — não vê a primeira ocorrência
          // sendo processada agora, poucas linhas acima, dentro deste mesmo
          // loop. Quem pega isso é a checagem em memória de
          // handleInboundWhatsAppMessage, contra `carlaChatMessages`, que
          // vai acumulando as mensagens já processadas NESTA chamada.
          messagesDuplicated++;
        }
      }

      // 3. ESCRITAS — atendimentos, mensagens, marcadores de dedup e
      //    backgroundTasks novas, todos na mesma transação. tx.create()
      //    falha a transação INTEIRA se o marcador já existir no momento do
      //    commit (proteção extra contra uma corrida que a leitura do passo
      //    1 não pegou) — se isso acontecer, NADA aqui é gravado (nem
      //    atendimento, nem mensagem, nem marcador, nem tarefa) e o
      //    Firestore re-tenta a transação inteira automaticamente, desta
      //    vez vendo o marcador já existente.
      for (const a of workingStore.attendances) {
        if (attendanceIdsTouched.has(a.id)) {
          // merge:true aqui é redundante com o objeto inteiro (não é um
          // merge parcial de verdade) — `a` já veio da leitura fresca desta
          // MESMA transação (passo 1), então gravar o objeto inteiro de
          // volta, mesclado ou não, não arrisca sobrescrever uma mudança
          // concorrente: se outra transação tivesse tocado este atendimento
          // entre a leitura e aqui, o Firestore teria detectado o conflito
          // e re-tentado esta transação inteira antes de chegar a este
          // ponto. O merge:true só evita apagar campos que porventura não
          // tenham vindo no objeto (nenhum caso conhecido hoje).
          tx.set(attendancesCol.doc(a.id), a as unknown as Record<string, unknown>, {
            merge: attendanceIdsBefore.has(a.id),
          });
        }
      }
      for (const m of newMessages) {
        tx.set(chatCol.doc(m.id), m as unknown as Record<string, unknown>);
      }
      for (const d of dedupWrites) {
        tx.create(dedupCol.doc(d.externalMessageId), {
          attendanceId: d.attendanceId,
          deskId: 'carla_atendimento',
          chatMessageId: d.chatMessageId,
        });
      }
      const finalBackgroundTasks = workingStore.backgroundTasks || [];
      if (finalBackgroundTasks.length !== freshBackgroundTasks.length) {
        // Só a chave backgroundTasks do documento único — nunca settings,
        // juliaData, etc., que não foram lidos nesta transação e não devem
        // ser tocados por ela (outras rotas cuidam deles pelo caminho
        // genérico de saveStore()).
        tx.set(storeDocRef, { backgroundTasks: finalBackgroundTasks }, { merge: true });
      }

      return {
        messagesProcessed,
        messagesDuplicated,
        attendanceIdsTouched: Array.from(attendanceIdsTouched),
        touchedAttendances: workingStore.attendances.filter((a) => attendanceIdsTouched.has(a.id)),
        newMessages,
        backgroundTasksChanged: finalBackgroundTasks.length !== freshBackgroundTasks.length,
        backgroundTasks: finalBackgroundTasks,
      };
    });

    // Cache local: mescla o que esta chamada mudou (atendimentos tocados,
    // mensagens novas, backgroundTasks) por CIMA de uma leitura FRESCA do
    // disco local (feita só agora, depois do commit — não a capturada antes
    // da transação, que poderia já estar desatualizada quando a transação
    // finalmente commita, inclusive depois de re-tentativas). Precisa ser
    // assim e não um "mergedStore" pronto vindo de dentro da transação:
    // `workingStore.agentChats` dentro da transação só tem as mensagens
    // NOVAS desta chamada (não o histórico nem as outras mesas) — escrever
    // isso direto por cima do disco local apagaria o cache de toda mesa que
    // não fosse carla_atendimento, e todo histórico de mensagens antigas,
    // a cada webhook novo ou duplicado. Achado real desta revisão.
    const freshLocal = loadStore();
    const mergedAttendances = [...freshLocal.attendances];
    const attIndexById = new Map(mergedAttendances.map((a, i) => [a.id, i] as const));
    for (const a of txResult.touchedAttendances) {
      const idx = attIndexById.get(a.id);
      if (idx !== undefined) mergedAttendances[idx] = a;
      else mergedAttendances.push(a);
    }
    const mergedAgentChats: Record<string, AgentChatMessage[]> = { ...(freshLocal.agentChats || {}) };
    const existingCarla = mergedAgentChats['carla_atendimento'] || [];
    const existingCarlaIds = new Set(existingCarla.map((m) => m.id));
    mergedAgentChats['carla_atendimento'] = [
      ...existingCarla,
      ...txResult.newMessages.filter((m) => !existingCarlaIds.has(m.id)),
    ];
    const mergedStore: PersistentStore = {
      ...freshLocal,
      attendances: mergedAttendances,
      agentChats: mergedAgentChats,
      backgroundTasks: txResult.backgroundTasksChanged ? txResult.backgroundTasks : freshLocal.backgroundTasks,
    };

    return {
      ok: true,
      messagesProcessed: txResult.messagesProcessed,
      messagesDuplicated: txResult.messagesDuplicated,
      attendanceIdsTouched: txResult.attendanceIdsTouched,
      mergedStore,
    };
  };

  let timedOut = false;
  const result = await Promise.race([
    run().catch((err) => ({
      ok: false,
      errorMessage: err instanceof Error ? err.message : String(err),
      messagesProcessed: 0,
      messagesDuplicated: 0,
      attendanceIdsTouched: [],
    })),
    new Promise<WhatsAppTransactionResult>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve({
          ok: false,
          errorMessage: `Processamento do webhook sem resposta após ${timeoutMs}ms — abandonado sem bloquear a resposta; se terminar depois, a reivindicação atômica por mensagem garante que não duplica nada (ver RECUPERAÇÃO DE RACHA).`,
          messagesProcessed: 0,
          messagesDuplicated: 0,
          attendanceIdsTouched: [],
        });
      }, timeoutMs);
    }),
  ]);
  if (timedOut) {
    console.error(
      `[WhatsApp Webhook] Processamento travou além de ${timeoutMs}ms — tratado como falha para efeito da resposta (Meta reentrega); a chamada real pode ainda terminar depois, com segurança.`
    );
  }
  return result;
}

// Lê TODAS as mesas de conversa já conhecidas nas coleções novas — usa
// db.listCollections() (nível raiz) em vez de uma lista fixa de deskIds,
// porque novas mesas podem ser criadas depois desta revisão (ver
// DESK_AGENT_NAMES) sem precisar atualizar este código.
async function readAllAgentChatsFromCollections(): Promise<Record<string, AgentChatMessage[]>> {
  const result: Record<string, AgentChatMessage[]> = {};
  const collections = await db.listCollections();
  const chatCollections = collections.filter((c) => c.id.startsWith(COLLECTION_CHAT_MESSAGE_PREFIX));
  for (const col of chatCollections) {
    const deskId = col.id.slice(COLLECTION_CHAT_MESSAGE_PREFIX.length);
    const snap = await col.get();
    if (snap.empty) continue;
    result[deskId] = snap.docs.map((d) => d.data() as unknown as AgentChatMessage);
  }
  return result;
}

async function restoreStoreFromFirestoreIfNeeded(): Promise<void> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return; // já existe um arquivo local — não sobrescreve com o backup
    }
    const doc = await db.collection(FIRESTORE_STORE_COLLECTION).doc(FIRESTORE_STORE_DOC).get();
    const juliaDoc = await db.collection(FIRESTORE_STORE_COLLECTION).doc(FIRESTORE_JULIA_DOC).get();
    const attendancesSnap = await db.collection(COLLECTION_ATTENDANCES).get();
    const agentChats = await readAllAgentChatsFromCollections();

    if (!doc.exists && !juliaDoc.exists && attendancesSnap.empty && Object.keys(agentChats).length === 0) {
      console.log('[Firestore Sync] Nenhum backup encontrado no Firestore (nem no documento único, nem nas coleções) — iniciando com dados padrão.');
      return;
    }

    const docData = doc.exists ? doc.data() : {};
    const { savedAt, attendances: _oldDocAttendances, agentChats: _oldDocAgentChats, ...storeData } =
      (docData || {}) as Record<string, unknown> & { savedAt?: string; attendances?: unknown; agentChats?: unknown };
    // juliaData agora tem documento próprio (appState/juliaData) — prefere
    // ele; só cai para o campo antigo dentro de appState/main se o
    // documento novo ainda não existir (janela de transição antes da
    // migração de limpeza rodar — ver DEPLOY_WHATSAPP_DURABILITY_FIX.md).
    if (juliaDoc.exists) {
      (storeData as Record<string, unknown>).juliaData = juliaDoc.data()?.juliaData;
    }
    // `attendances`/`agentChats` do documento único são deliberadamente
    // ignorados aqui (nunca restaurados a partir deles) — desde a troca
    // para coleções, a fonte de verdade para essas duas chaves são
    // attendances_v2/agentChats_v2_*, abaixo. O documento único continua
    // existindo como histórico congelado (ver migrations/README.md), não
    // como fonte de restauração.

    const restoredAttendances = attendancesSnap.docs.map((d) => d.data() as unknown as AttendanceRecord);

    // Rede de segurança contra o risco de sequenciamento já documentado em
    // DEPLOY_WHATSAPP_DURABILITY_FIX.md: se este código for implantado ANTES
    // da migração real rodar, as coleções novas estão genuinamente vazias
    // enquanto o documento único ainda tem dados reais — restaurar como
    // "vazio" pareceria exatamente a perda de dados investigada nesta mesma
    // sessão, só que desta vez por sequenciamento errado, não por bug. Isto
    // não tenta adivinhar nem restaurar sozinho a partir do documento único
    // (poderia mascarar um problema real de permissão/nome de coleção) — só
    // torna o cenário IMPOSSÍVEL de passar despercebido.
    const oldDocHadAttendances = Array.isArray((docData as Record<string, unknown> | undefined)?.attendances)
      ? ((docData as Record<string, unknown>).attendances as unknown[]).length
      : 0;
    if (restoredAttendances.length === 0 && oldDocHadAttendances > 0) {
      console.error(
        `[Firestore Sync] ALERTA: attendances_v2 está vazia, mas o documento único appState/main tem ${oldDocHadAttendances} atendimento(s). ` +
          'Isto é esperado SÓ se a migração para coleções (ver migrations/README.md e DEPLOY_WHATSAPP_DURABILITY_FIX.md, Passo 6) ainda não rodou — ' +
          'se já rodou, isto indica um problema real (projeto/credencial errados, nome de coleção divergente). ' +
          'Prosseguindo mesmo assim com as coleções como fonte de verdade (pode ficar com 0 atendimentos nesta instância) — ' +
          'NÃO restaurando a partir do documento único automaticamente, para não mascarar a causa real.'
      );
    }

    const storeDataFull = { ...storeData, attendances: restoredAttendances, agentChats: agentChats };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(storeDataFull, null, 2), 'utf-8');
    console.log(
      `[Firestore Sync] Estado restaurado do Firestore (documento único de ${savedAt || 'data desconhecida'}; ` +
        `${restoredAttendances.length} atendimento(s) e ${Object.keys(agentChats).length} mesa(s) de conversa das coleções).`
    );
  } catch (err) {
    // Antes, isto só logava e retornava — a inicialização seguia normalmente
    // SEM nenhum arquivo local, e o primeiro loadStore() criaria o store
    // PADRÃO (com os dois atendimentos de demonstração) e o gravaria em
    // produção sem ninguém perceber. Uma falha de restauração de verdade
    // (rede, permissão, projeto errado) tem que impedir a inicialização
    // operacional, não ser tratada como "nada para restaurar" — por isso
    // isto agora relança, e quem chama (startServer) não deixa o processo
    // subir para servir tráfego nesse estado.
    throw new Error(
      `Falha ao restaurar o estado do Firestore na inicialização: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function formatGeminiErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('429') || raw.includes('rate_limit')) {
    return `Limite temporário de requisições atingido na API da Anthropic (código 429). Aguarde alguns instantes antes de enviar nova análise. Os formulários e fotos foram mantidos com segurança.`;
  }

  if (raw.includes('529') || raw.includes('overloaded')) {
    return 'O servidor do modelo Claude está com alta demanda temporária (código 529). Os dados do atendimento estão preservados. Tente novamente em instantes.';
  }

  if (raw.includes('503') || raw.includes('UNAVAILABLE')) {
    return 'O servidor do modelo Claude está indisponível temporariamente (código 503). Os dados do atendimento estão preservados. Tente novamente em instantes.';
  }

  return raw;
}

async function generateContentWithRetryAndFallback(params: {
  preferredModel: string;
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
    // PDF — sem precedente nesta base antes da leitura de ficha de verificação.
    // Content-block 'document' da própria API de Mensagens da Anthropic (REST cru,
    // sem SDK), não ligado a nenhum recurso específico de imagem.
    | { documentData: { mimeType: string; data: string } }
  >;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
  lockKey?: string;
}): Promise<{ response: AiTextResponse; usedModel: string }> {
  if (params.lockKey) {
    if (inFlightGeminiRequests.has(params.lockKey)) {
      throw new Error(
        'Uma análise por IA já está em processamento para este pedido. Aguarde a conclusão da solicitação em andamento para evitar chamadas duplicadas.'
      );
    }
    inFlightGeminiRequests.add(params.lockKey);
  }

  try {
    const apiKey = getAnthropicApiKey();
    const model = params.preferredModel || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
    const maxAttempts = 3;
    let lastError: unknown = null;

    const content = params.parts.map((part) => {
      if ('text' in part) return { type: 'text', text: part.text };
      if ('inlineData' in part) {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: part.inlineData.mimeType,
            data: part.inlineData.data,
          },
        };
      }
      return {
        type: 'document',
        source: {
          type: 'base64',
          media_type: part.documentData.mimeType,
          data: part.documentData.data,
        },
      };
    });
    const toolSchema = convertSchemaToJsonSchema(params.responseSchema as AiSchema);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            // Alguns formatos pedidos no app (ex.: avaliação de reaproveitamento, com 10
            // componentes + 3 propostas + parecer completo) são grandes demais para 4096
            // tokens — a resposta cortava no meio, resultando num campo ausente no JSON
            // (ex.: reuseItems undefined) e quebrando o .forEach() de quem consome o dado.
            // 16000 é o padrão recomendado pela documentação da Anthropic para chamadas
            // sem streaming (streaming só é exigido perto do teto de 128K).
            max_tokens: 16000,
            system: params.systemInstruction,
            messages: [{ role: 'user', content }],
            tools: [
              {
                name: 'responder_estruturado',
                description: 'Responde no formato estruturado exigido pela tarefa.',
                input_schema: toolSchema,
              },
            ],
            tool_choice: { type: 'tool', name: 'responder_estruturado' },
          }),
        });

        if (!apiResponse.ok) {
          const errBody = await apiResponse.text();
          const err: any = new Error(`Anthropic API error ${apiResponse.status}: ${errBody.slice(0, 300)}`);
          err.status = apiResponse.status;
          throw err;
        }

        const data = await apiResponse.json();
        const toolUse = (data.content || []).find((b: any) => b.type === 'tool_use');
        if (toolUse && toolUse.input) {
          return { response: { text: JSON.stringify(toolUse.input) }, usedModel: model };
        }
        throw new Error(`Resposta vazia recebida do modelo ${model}`);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransientServer =
          msg.includes('503') ||
          msg.includes('529') ||
          msg.includes('overloaded') ||
          msg.includes('500') ||
          msg.includes('504') ||
          msg.includes('fetch failed') ||
          msg.includes('429') ||
          msg.includes('rate_limit');

        console.warn(
          `[Anthropic Service] Tentativa ${attempt}/${maxAttempts} falhou para o modelo ${model}: ${msg.slice(0, 160)}`
        );

        if (attempt >= maxAttempts || !isTransientServer) {
          break;
        }

        // Exponential backoff progressivo com jitter:
        // tentativa 1 -> ~1500ms, tentativa 2 -> ~3500ms + jitter
        const waitMs = 1500 * Math.pow(2, attempt - 1) + Math.round(Math.random() * 600);

        console.log(
          `[Anthropic Service] Aplicando exponential backoff de ${waitMs}ms antes da tentativa ${attempt + 1}...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    throw new Error(formatGeminiErrorMessage(lastError));
  } finally {
    if (params.lockKey) {
      inFlightGeminiRequests.delete(params.lockKey);
    }
  }
}

// Fotos: o disco local é a cópia rápida usada para servir as imagens, mas sozinho
// tem o mesmo problema do store.json — sem disco permanente no deploy, as fotos
// somem a cada reinício. savePhotoFile() grava local (como já fazia) e também
// envia para o Firebase Storage em segundo plano; a rota de servir foto busca no
// Storage como última tentativa se o arquivo não existir mais localmente.
function savePhotoFile(fileName: string, buffer: Buffer, mimeType: string): void {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  fs.writeFileSync(path.join(PHOTOS_DIR, fileName), buffer);
  try {
    storageBucket
      .file(`photos/${fileName}`)
      .save(buffer, { contentType: mimeType, resumable: false })
      .catch((err) => {
        console.error(
          `[Storage Sync] Falha ao enviar a foto ${fileName} para o Firebase Storage:`,
          err instanceof Error ? err.message : err
        );
      });
  } catch (err) {
    console.error(
      `[Storage Sync] Falha síncrona ao preparar o envio da foto ${fileName}:`,
      err instanceof Error ? err.message : err
    );
  }
}

async function ensurePhotoFileAvailable(fileName: string): Promise<boolean> {
  const filePath = path.join(PHOTOS_DIR, fileName);
  if (fs.existsSync(filePath)) return true;
  try {
    const remoteFile = storageBucket.file(`photos/${fileName}`);
    const [exists] = await remoteFile.exists();
    if (!exists) return false;
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    await remoteFile.download({ destination: filePath });
    return true;
  } catch (err) {
    console.error(
      `[Storage Sync] Falha ao recuperar a foto ${fileName} do Firebase Storage:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// Detecta o tipo real da imagem pelos bytes iniciais (assinatura do formato), em vez de
// confiar na extensão do arquivo em disco — alguns arquivos foram salvos com extensão
// .jpg mesmo contendo PNG (ex.: retrato de agente e capa, que sempre gravam ".jpg"), e a
// API da Anthropic recusa a requisição se o mimeType declarado não bater com os bytes.
function detectImageMimeFromBuffer(buffer: Buffer, extFallback: string): string {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return extFallback === '.png' ? 'image/png' : extFallback === '.webp' ? 'image/webp' : 'image/jpeg';
}

function resolvePhotoBase64(imageUrl: string): { mimeType: string; data: string } | null {
  try {
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const buffer = Buffer.from(match[2], 'base64');
        const mimeType = detectImageMimeFromBuffer(buffer, '');
        return { mimeType, data: match[2] };
      }
    }
    if (imageUrl.startsWith('/api/photos/')) {
      const photoId = imageUrl.replace('/api/photos/', '').split('?')[0];
      const safeId = photoId.replace(/[^a-zA-Z0-9._-]/g, '');
      const filePath = path.join(PHOTOS_DIR, safeId);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const mimeType = detectImageMimeFromBuffer(buffer, path.extname(safeId).toLowerCase());
        return { mimeType, data: buffer.toString('base64') };
      }
    }
    if (imageUrl.startsWith('/src/assets/') || imageUrl.startsWith('/public/')) {
      const relPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      const fullPath = path.join(__dirname, relPath);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        const mimeType = detectImageMimeFromBuffer(buffer, path.extname(fullPath).toLowerCase());
        return { mimeType, data: buffer.toString('base64') };
      }
    }
  } catch (err) {
    console.error('Erro ao ler bytes da imagem para análise com IA:', err);
  }
  return null;
}

// Vista Explodida — chama a API do Google (Gemini 2.5 Flash Image: entrada
// multimodal foto+texto, saída imagem) para editar/recompor a(s) foto(s) real(is)
// do produto numa vista explodida ilustrativa, preservando a aparência observada.
// Nunca usa Claude/Anthropic aqui — Claude não gera imagem, só analisa.
// IMPORTANTE: sem uma GEMINI_API_KEY real configurada, esta chamada nunca foi
// exercida de ponta a ponta nesta sessão (o responsável pelo projeto optou por
// não fornecer uma chave de teste) — o contrato da API (nomes de campo, modelo)
// segue a documentação pública mais recente conhecida, mas pode precisar de
// ajuste fino na primeira execução real.
async function generateExplodedViewImage(params: {
  prompt: string;
  referencePhotos: Array<{ mimeType: string; data: string }>;
}): Promise<{ imageBase64: string; imageMimeType: string }> {
  const apiKey = getGeminiApiKey();
  const model = 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const parts: Array<Record<string, unknown>> = [{ text: params.prompt }];
  for (const photo of params.referencePhotos) {
    parts.push({ inlineData: { mimeType: photo.mimeType, data: photo.data } });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Erro ao gerar imagem com a API do Google (status ${res.status}): ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> };
    }>;
  };
  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const textPart = responseParts.find((p) => p.text)?.text;
    throw new Error(
      `A API do Google não retornou uma imagem nesta chamada.${
        textPart ? ` Resposta recebida: ${textPart.slice(0, 300)}` : ' Resposta sem conteúdo de imagem.'
      }`
    );
  }
  return {
    imageBase64: imagePart.inlineData.data,
    imageMimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

// Deriva a lista de materiais necessários a partir da avaliação de reaproveitamento (reuseItems,
// estruturada por componente) e dos arrays de texto livre da proposta escolhida (materialsToKeep/
// Recover/Replace). Não consulta IA nem inventa quantidade ou preço: tudo que não vem de um dado já
// existente no atendimento fica "Pendente de medição" / "A cotar". Os IDs são determinísticos
// (derivados da origem) para permitir atualizar a lista sem perder edições manuais do responsável.
function deriveMaterialsListItems(
  attendance: AttendanceRecord,
  proposal: ReformProposal,
  tier: ProposalTier
): ReformMaterialListItem[] {
  const now = new Date().toISOString();
  const items: ReformMaterialListItem[] = [];

  for (const reuseItem of attendance.reuseItems) {
    let componentStatus: ReformMaterialComponentStatus;
    let materialName: string;
    let purchaseQuantity: number | null = null;
    let consumptionQuantity: number | null = null;
    let quantityStatus: ReformMaterialListItem['quantityStatus'] = 'Pendente de medição';

    if (reuseItem.classification === 'Candidato a reaproveitamento, sujeito à inspeção') {
      if (attendance.internalInspectionCompleted) {
        componentStatus = 'Reaproveitado';
        purchaseQuantity = 0;
        consumptionQuantity = 0;
        quantityStatus = 'Confirmada';
      } else {
        componentStatus = 'Pendente de inspeção';
      }
      materialName = `${reuseItem.component} — peça original (candidata a reaproveitamento)`;
    } else if (reuseItem.classification === 'Recuperável com reparo, sujeito à inspeção') {
      componentStatus = attendance.internalInspectionCompleted ? 'Reparado' : 'Pendente de inspeção';
      materialName = `Material de reparo — ${reuseItem.component}`;
    } else if (reuseItem.classification === 'Substituição indicada') {
      componentStatus = 'Substituído';
      materialName = `Material de substituição — ${reuseItem.component}`;
    } else {
      componentStatus = 'Pendente de inspeção';
      materialName = `${reuseItem.component} — decisão pendente`;
    }

    items.push({
      id: `matitem-reuse-${reuseItem.id}`,
      component: reuseItem.component,
      reuseComponentType: reuseItem.component,
      sourceReuseItemId: reuseItem.id,
      materialName,
      justification: reuseItem.requiredRecovery || reuseItem.expectedCostEffect || reuseItem.condition,
      componentStatus,
      unit: 'un',
      consumptionQuantity,
      purchaseQuantity,
      quantitySource: 'informado_oficina',
      quantityStatus,
      unitCostCents: null,
      priceStatus: 'A cotar',
      createdAt: now,
      updatedAt: now,
    });
  }

  const freeTextGroups: Array<{
    list: string[];
    status: ReformMaterialComponentStatus;
    key: string;
    label: string;
  }> = [
    { list: proposal.materialsToReplace, status: 'Substituído', key: 'replace', label: 'a substituir' },
    { list: proposal.materialsToRecover, status: 'Reparado', key: 'recover', label: 'a recuperar' },
    { list: proposal.materialsToKeep, status: 'Reaproveitado', key: 'keep', label: 'a manter' },
  ];

  for (const group of freeTextGroups) {
    group.list.forEach((text, idx) => {
      const isKeep = group.status === 'Reaproveitado';
      items.push({
        id: `matitem-${tier}-${group.key}-${idx}`,
        component: text,
        materialName: text,
        justification: `Proposta ${tier}: item listado pela revisão do responsável como "${group.label}".`,
        componentStatus: group.status,
        unit: 'un',
        consumptionQuantity: isKeep ? 0 : null,
        purchaseQuantity: isKeep ? 0 : null,
        quantitySource: 'proposta_pendente',
        quantityStatus: isKeep ? 'Confirmada' : 'Pendente de medição',
        unitCostCents: null,
        priceStatus: 'A cotar',
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  // Insumos de bancada: praticamente toda reforma de estofado consome grampo, forro TNT,
  // linha de costura e cola de contato, mesmo quando nada disso aparece na avaliação de
  // reaproveitamento (que registra peças/componentes, não consumíveis de oficina). Sem essa
  // sugestão automática, o responsável tinha que lembrar e digitar cada um manualmente toda
  // vez. A quantidade continua sempre pendente de medição/confirmação — nunca inventada — e o
  // preço continua "A cotar", como todo o resto desta função; só o ITEM em si é sugerido.
  const STANDARD_CONSUMABLE_ITEMS: Array<{
    key: string;
    materialCatalogItemId: string;
    materialName: string;
    unit: string;
    justification: string;
  }> = [
    {
      key: 'grampo',
      materialCatalogItemId: 'mat-grampo-8010',
      materialName: 'Grampo Pneumático 80/10 (Caixa 5.000 un)',
      unit: 'unidade',
      justification:
        'Insumo padrão de bancada sugerido automaticamente (confirme a quantidade conforme a peça; se a armação precisar de travamento mais pesado, use o Grampo Estrutural 14/50 do catálogo em vez deste).',
    },
    {
      key: 'tnt',
      materialCatalogItemId: 'mat-forro-tnt',
      materialName: 'Forro Inferior TNT Gramatura 100g Preto',
      unit: 'm',
      justification: 'Insumo padrão de bancada sugerido automaticamente (confirme a metragem conforme a peça).',
    },
    {
      key: 'linha',
      materialCatalogItemId: 'mat-linha-costura',
      materialName: 'Linha de Costura Industrial Náilon Robusta (Cone 5.000m)',
      unit: 'm',
      justification: 'Insumo padrão de bancada sugerido automaticamente (confirme a metragem conforme a peça).',
    },
    {
      key: 'cola',
      materialCatalogItemId: 'mat-cola-contato',
      materialName: 'Adesivo de Contato Especial sem Toluol (Lata 14kg)',
      unit: 'kg',
      justification: 'Insumo padrão de bancada sugerido automaticamente (confirme a quantidade conforme a peça).',
    },
  ];

  for (const consumable of STANDARD_CONSUMABLE_ITEMS) {
    items.push({
      id: `matitem-${tier}-consumivel-${consumable.key}`,
      component: 'Insumo de bancada',
      materialCatalogItemId: consumable.materialCatalogItemId,
      materialName: consumable.materialName,
      justification: consumable.justification,
      componentStatus: 'Substituído',
      unit: consumable.unit,
      consumptionQuantity: null,
      purchaseQuantity: null,
      quantitySource: 'proposta_pendente',
      quantityStatus: 'Pendente de medição',
      unitCostCents: null,
      priceStatus: 'A cotar',
      createdAt: now,
      updatedAt: now,
    });
  }

  return items;
}

// ===================== Mesa do Tapeceiro Técnico — Plano de Produção e Materiais =====================
// Fase 1: lista técnica de peças/materiais + estados de revisão + PDFs reaproveitados.
// O mapa visual de corte (nesting vetorial real) e o manual ilustrado ficam para uma fase futura;
// aqui apenas sinalizamos "Pendente de mapa visual", nunca uma ilustração como se fosse o projeto.

function mapReuseComponentToManufacturingType(
  component: ReuseComponentType
): ManufacturingComponent['componentType'] {
  switch (component) {
    case 'Madeira':
      return 'Madeira';
    case 'Pés':
      return 'Acessório';
    case 'Ferragens':
      return 'Ferragem';
    case 'Mecanismos':
      return 'Ferragem';
    case 'Molas':
      return 'Sustentação';
    case 'Percintas':
      return 'Sustentação';
    case 'Espumas':
      return 'Espuma';
    case 'Enchimentos':
      return 'Espuma';
    case 'Revestimento':
      return 'Revestimento';
    case 'Zíperes e acabamentos':
      return 'Acessório';
    default:
      return 'Acessório';
  }
}

function buildComponentsFromReuseItems(attendance: AttendanceRecord): ManufacturingComponent[] {
  const now = new Date().toISOString();
  return attendance.reuseItems.map((item, idx) => {
    let reformStatus: ManufacturingComponent['reformStatus'];
    if (item.classification === 'Substituição indicada') {
      reformStatus = 'Substituir';
    } else if (
      item.classification === 'Candidato a reaproveitamento, sujeito à inspeção' ||
      item.classification === 'Recuperável com reparo, sujeito à inspeção'
    ) {
      reformStatus = attendance.internalInspectionCompleted ? 'Recuperar' : 'Aguardar desmontagem';
    } else {
      reformStatus = 'Aguardar desmontagem';
    }
    return {
      id: `comp-reuse-${item.id}`,
      code: `RF-${String(idx + 1).padStart(2, '0')}`,
      name: item.component,
      componentType: mapReuseComponentToManufacturingType(item.component),
      dimensionsMm: { length: null, width: null, thickness: null },
      specification: item.condition,
      quantityPerUnit: 1,
      totalQuantity: 1,
      source: attendance.internalInspectionCompleted ? 'informado_oficina' : 'proposta_pendente',
      notes:
        'Peça derivada automaticamente da avaliação de reaproveitamento (categoria, não peça individual). Desmembre em peças reais com código próprio e meça antes de liberar.',
      reformStatus,
      sourceReuseItemId: item.id,
    };
  });
}

function buildMaterialsFromReformList(list: ReformMaterialsList): ManufacturingMaterialRequirement[] {
  return list.items.map((item) => {
    const totalCostCents =
      item.unitCostCents != null && item.purchaseQuantity != null
        ? Math.round(item.unitCostCents * item.purchaseQuantity)
        : undefined;
    const availableStock =
      item.physicalStockAtCreation != null && item.reservedForThisOrder != null
        ? Math.max(0, item.physicalStockAtCreation - item.reservedForThisOrder)
        : undefined;
    return {
      id: `mr-${item.id}`,
      materialCode: item.materialCatalogItemId,
      code: item.materialCatalogItemId,
      materialName: item.materialName,
      name: item.materialName,
      category: 'Material',
      specification: item.specification,
      unit: item.unit,
      purchaseUnit: item.purchaseUnit,
      totalOrderRequirement: item.consumptionQuantity ?? undefined,
      totalRequired: item.consumptionQuantity ?? undefined,
      usableWidthMeters: item.fabricUsableWidthMeters,
      patternDirection: item.fabricPatternDirection,
      scrapLossPercentage: item.lossMarginPercent,
      physicalStock: item.physicalStockAtCreation,
      reservedStock: item.reservedForThisOrder,
      availableStock,
      toPurchaseQuantity: item.purchaseQuantity ?? undefined,
      unitCostCents: item.unitCostCents ?? undefined,
      totalCostCents,
      source: item.quantitySource,
      notes: item.notes,
    };
  });
}

function computeInitialPlanStatus(
  materials: ManufacturingMaterialRequirement[],
  components: ManufacturingComponent[]
): NonNullable<ManufacturingProjectData['planStatus']> {
  const hasPendingMaterial = materials.some(
    (m) => m.toPurchaseQuantity == null && m.totalRequired == null && m.totalOrderRequirement == null
  );
  const hasPendingComponent = components.some(
    (c) =>
      c.reformStatus === 'Aguardar desmontagem' ||
      (c.dimensionsMm.length == null && c.dimensionsMm.width == null && c.dimensionsMm.thickness == null)
  );
  return hasPendingMaterial || hasPendingComponent ? 'Pendente de medição' : 'Rascunho';
}

function bumpPlanVersion(version: string | undefined): string {
  const match = /^v(\d+)\.(\d+)/.exec(version || '');
  if (!match) return 'v1.0';
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  return `v${major}.${minor + 1}`;
}

function buildDraftAssemblyManual(attendance: AttendanceRecord, now: string): AssemblyManual {
  return {
    modelName: attendance.furnitureType || 'Estofado',
    version: 'v1.0',
    status: 'rascunho_tecnico',
    isDraft: true,
    lastUpdatedAt: now,
    referenceImages: [],
    steps: [],
    materialsAndTools: [],
    generalPreparationNotes: '',
    finalInspectionCriteria: '',
  };
}

// ===================== Mila — Financeiro da Fábrica (Fase 1) =====================
// Entradas/saídas/contas fixas/reserva do Edson calculados a partir dos MESMOS
// lançamentos já existentes (transações por pedido + lançamentos gerais da fábrica),
// nunca duplicados: cada lançamento vive em exatamente um lugar (attendance.financialData.transactions
// para os vinculados a pedido, officeData.generalTransactions para os gerais).

function monthKeyFromDateStr(dateStr: string | undefined | null): string | null {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

interface FactoryFinancialSummary {
  month: string;
  entradasRealizadoMesCents: number;
  saidasRealizadoMesCents: number;
  saldoOperacionalMesCents: number;
  totalReceitaClienteAllTimeCents: number;
  totalDespesasAllTimeCents: number;
  saldoCaixaTotalCents: number;
  contasAPagar: FinancialTransaction[];
  contasAReceber: FinancialTransaction[];
  edsonReserve: {
    month: string;
    baseCents: number;
    reserveCents: number;
    withdrawnCents: number;
    remainingCents: number;
  };
  initialBalance: InitialBalanceRecord | null;
  fixedExpenses: FixedExpense[];
  cashAccounts: CashAccount[];
  cashTransfers: CashTransfer[];
  accountBalancesCents: Record<string, number>;
  categories: string[];
  allTransactions: FinancialTransaction[];
}

// Um lançamento "realizado" de corpo inteiro conta como um único evento de caixa na
// sua própria data. Um lançamento com pagamentos parciais (payments[]) conta como
// VÁRIOS eventos, cada um na sua própria data — essencial para atribuir corretamente
// o mês de competência de cada parcela recebida/paga, inclusive pra reserva do Edson.
function getRealizedCashEvents(t: FinancialTransaction): Array<{ amountCents: number; date: string | undefined }> {
  if (t.payments && t.payments.length > 0) {
    return t.payments.map((p) => ({ amountCents: p.amountCents, date: p.paidDate }));
  }
  if (t.status === 'realizado') {
    return [{ amountCents: t.amountCents, date: t.paidDate || t.dueDate }];
  }
  return [];
}

function computeFactoryFinancialSummary(
  store: PersistentStore,
  month?: string,
  category?: string
): FactoryFinancialSummary {
  const office: SharedOfficeData = store.officeData || createDefaultOfficeData();
  const targetMonth = month || currentMonthKey();

  const orderTransactions: FinancialTransaction[] = store.attendances.flatMap((a) =>
    (a.financialData?.transactions || []).map((t) => ({
      ...t,
      orderId: a.id,
      orderNumber: a.attendanceNumber,
      clientName: a.clientName,
      source: 'pedido' as const,
    }))
  );

  const generalTransactions: FinancialTransaction[] = (office.generalTransactions || []).map(
    (t) => ({ ...t, source: 'fabrica' as const })
  );

  const allTransactionsUnfiltered = [...orderTransactions, ...generalTransactions];
  const categories = Array.from(
    new Set(allTransactionsUnfiltered.map((t) => t.category).filter((c): c is string => Boolean(c)))
  ).sort();
  const allTransactions = category
    ? allTransactionsUnfiltered.filter((t) => t.category === category)
    : allTransactionsUnfiltered;

  // Saldo inicial nunca entra como "entrada"/venda do mês — só compõe o saldo de caixa total.
  const isRevenueType = (t: FinancialTransaction) => t.type === 'receita_cliente';
  const isExpenseType = (t: FinancialTransaction) =>
    t.type !== 'receita_cliente' && t.type !== 'saldo_inicial' && t.type !== 'estorno_cliente';

  const sumEventsInMonth = (txs: FinancialTransaction[], m: string) =>
    txs.reduce(
      (s, t) =>
        s +
        getRealizedCashEvents(t)
          .filter((ev) => monthKeyFromDateStr(ev.date) === m)
          .reduce((es, ev) => es + ev.amountCents, 0),
      0
    );
  const sumEventsAllTime = (txs: FinancialTransaction[]) =>
    txs.reduce((s, t) => s + getRealizedCashEvents(t).reduce((es, ev) => es + ev.amountCents, 0), 0);

  const entradasRealizadoMesCents = sumEventsInMonth(allTransactions.filter(isRevenueType), targetMonth);
  const estornosRealizadoMesCents = sumEventsInMonth(
    allTransactions.filter((t) => t.type === 'estorno_cliente'),
    targetMonth
  );
  const saidasRealizadoMesCents = sumEventsInMonth(allTransactions.filter(isExpenseType), targetMonth);

  const totalReceitaClienteAllTimeCents = sumEventsAllTime(allTransactions.filter(isRevenueType));
  const totalEstornosAllTimeCents = sumEventsAllTime(
    allTransactions.filter((t) => t.type === 'estorno_cliente')
  );
  const totalDespesasAllTimeCents = sumEventsAllTime(allTransactions.filter(isExpenseType));
  const initialBalanceCents = office.initialBalance?.amountCents || 0;

  const saldoCaixaTotalCents =
    initialBalanceCents +
    totalReceitaClienteAllTimeCents -
    totalEstornosAllTimeCents -
    totalDespesasAllTimeCents;

  const isPending = (t: FinancialTransaction) => t.status === 'previsto' || t.status === 'parcial';

  const contasAPagar = allTransactions
    .filter((t) => isPending(t) && isExpenseType(t))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  const contasAReceber = allTransactions
    .filter((t) => isPending(t) && isRevenueType(t))
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  // Reserva do Edson: 10% dos recebimentos de clientes efetivamente confirmados no mês
  // (entradas + parcelas pagas), já descontando estornos do mesmo mês. Nunca inclui
  // saldo inicial, transferências, empréstimos, aportes ou valores ainda "previsto".
  const baseReservaCents = Math.max(0, entradasRealizadoMesCents - estornosRealizadoMesCents);
  const reserveCents = Math.round(baseReservaCents * 0.1);
  const withdrawnCents = generalTransactions
    .filter(
      (t) =>
        t.type === 'retirada_reserva_edson' &&
        t.status === 'realizado' &&
        t.referenceMonth === targetMonth
    )
    .reduce((s, t) => s + t.amountCents, 0);
  const remainingCents = Math.max(0, reserveCents - withdrawnCents);

  // Saldo por conta (caixa/banco cadastrados manualmente): soma dos eventos de caixa
  // vinculados à conta, mais transferências recebidas, menos transferências enviadas.
  const cashAccounts = office.cashAccounts || [];
  const cashTransfers = office.cashTransfers || [];
  const accountBalancesCents: Record<string, number> = {};
  for (const acc of cashAccounts) accountBalancesCents[acc.id] = 0;
  if (office.initialBalance?.accountId && accountBalancesCents[office.initialBalance.accountId] !== undefined) {
    accountBalancesCents[office.initialBalance.accountId] += office.initialBalance.amountCents;
  }
  for (const t of allTransactionsUnfiltered) {
    if (!t.accountId || accountBalancesCents[t.accountId] === undefined) continue;
    const sign = isRevenueType(t) ? 1 : isExpenseType(t) ? -1 : t.type === 'estorno_cliente' ? -1 : 0;
    const events = getRealizedCashEvents(t);
    accountBalancesCents[t.accountId] += sign * events.reduce((s, ev) => s + ev.amountCents, 0);
  }
  for (const tr of cashTransfers) {
    if (accountBalancesCents[tr.fromAccountId] !== undefined) accountBalancesCents[tr.fromAccountId] -= tr.amountCents;
    if (accountBalancesCents[tr.toAccountId] !== undefined) accountBalancesCents[tr.toAccountId] += tr.amountCents;
  }

  return {
    month: targetMonth,
    entradasRealizadoMesCents,
    saidasRealizadoMesCents,
    saldoOperacionalMesCents: entradasRealizadoMesCents - saidasRealizadoMesCents,
    totalReceitaClienteAllTimeCents,
    totalDespesasAllTimeCents,
    saldoCaixaTotalCents,
    contasAPagar,
    contasAReceber,
    edsonReserve: {
      month: targetMonth,
      baseCents: baseReservaCents,
      reserveCents,
      withdrawnCents,
      remainingCents,
    },
    initialBalance: office.initialBalance || null,
    fixedExpenses: office.fixedExpenses || [],
    cashAccounts,
    cashTransfers,
    accountBalancesCents,
    categories,
    allTransactions,
  };
}

const VALID_DESK_IDS: DepartmentId[] = [
  'carla_atendimento',
  'pedro_avaliacao',
  'lucas_projetos',
  'ana_compras',
  'mila_financeiro',
  'castro_estrategia',
  'julia_marketing',
  'supervisora_geral',
  'tapeceiro_tecnico',
];

const ANALYST_SYSTEM_INSTRUCTION = `Você é o analista técnico sênior de reforma de estofados da Castros Interiores.
Sua função é avaliar tecnicamente as fotografias reais enviadas e as informações do atendimento para identificar problemas por área, possibilidades de recuperação e materiais candidatos a reaproveitamento.

REGRAS OBRIGATÓRIAS E INEGOCIÁVEIS:
1. Diferencie rigorosamente a origem de cada informação entre:
   - "Observado na foto"
   - "Relatado pelo cliente"
   - "Suspeita a confirmar"
   - "Confirmado pela oficina"
   - "Não avaliável"
2. NUNCA afirme que a estrutura interna está boa apenas pela aparência externa. Se não houver foto da estrutura interna desmontada pela oficina, a condição da estrutura interna é no máximo "Suspeita a confirmar" ou "Não avaliável".
3. NÃO determine por fotografia:
   - Densidade ou firmeza real da espuma.
   - Resistência mecânica da madeira.
   - Presença confirmada de cupins ou mofo (no máximo registre suspeita visual sujeita à inspeção).
   - Odores.
   - Funcionamento real de componentes ocultos.
   - Estabilidade ou segurança definitiva do móvel.
4. NÃO confunda sombra, estampa de tecido, sujeira superficial ou objetos apoiados sobre o móvel com defeitos estruturais ou rasgos.
5. Se uma área estiver encoberta, ausente nas fotos ou mal fotografada, registre explicitamente a limitação e peça a foto necessária.
6. NÃO invente medidas, quantidades de material, preços, valores de economia em reais ou percentuais, nem tempo de vida útil.
7. NÃO recomende manter material comprometido apenas para reduzir custos.
8. NÃO oriente o cliente a desmontar mecanismos ou movimentar móveis pesados sem assistência profissional.
9. Examine obrigatoriamente TODAS as 11 áreas padronizadas:
   - "Estrutura"
   - "Base e pés"
   - "Assento"
   - "Encosto"
   - "Braços"
   - "Tecido e costuras"
   - "Espumas e enchimentos"
   - "Percintas, molas e sustentação"
   - "Ferragens"
   - "Mecanismos retráteis ou reclináveis"
   - "Forro inferior e acabamentos"
10. Além das áreas acima, identifique a configuração/modelo do móvel (ex: número de lugares, formato de braços e encosto, tipo de base/pés) sempre que as fotos permitirem, usando a mesma marcação de origem desta seção 1 — "Observado na foto" apenas para o que é visivelmente verificável, "Relatado pelo cliente" para o que o cliente informou, "Suspeita a confirmar" quando não houver certeza, nunca inventando configuração não verificável.`;

// Leitura de ficha de verificação fotografada/digitalizada (preenchida à mão ou
// digitalmente) — mesmo princípio de honestidade do ANALYST_SYSTEM_INSTRUCTION acima,
// adaptado para OCR/leitura de formulário em vez de análise visual de defeitos.
const CHECKLIST_READER_SYSTEM_INSTRUCTION = `Você está lendo uma ficha de verificação técnica da Castros Interiores, preenchida à mão ou digitalmente, e enviada como foto ou PDF digitalizado.

REGRAS OBRIGATÓRIAS E INEGOCIÁVEIS:
1. Para CADA campo listado no contexto (identificado por "entryId"), reporte exatamente um de três estados em "readStatus":
   - "lido": você conseguiu identificar com confiança razoável a marcação/valor escrito para esse campo.
   - "ilegivel": o campo foi preenchido mas a caligrafia, risco ou qualidade da imagem não permite ter certeza do que foi marcado.
   - "ausente": o campo não foi preenchido, está em branco, ou não aparece de forma legível no documento.
2. NUNCA marque "lido" por suposição, dedução do contexto, ou porque "faz sentido" aquele ser o valor — só marque "lido" quando a marcação/escrita estiver visualmente clara o bastante para transcrever com segurança.
3. Quando "lido" e o campo for uma marcação de condição (bom/reparar/substituir/reaproveitar/não verificado/não se aplica), reporte o valor em "readCondition" usando exatamente um desses seis valores em minúsculo sem acento: bom, reparar, substituir, reaproveitar, nao_verificado, nao_se_aplica.
4. Quando "lido" e o campo for uma medida escrita à mão, reporte o texto exatamente como está escrito em "readMeasurement", incluindo a unidade se estiver visível — nunca converta, arredonde ou complete uma unidade que não foi escrita.
5. Use "readNotes" só para transcrever observações/anotações manuscritas relacionadas àquele campo específico — nunca para adicionar interpretação sua.
6. Se o documento inteiro estiver ilegível, corrompido, ou não for reconhecível como esta ficha, reporte TODOS os campos como "ausente" e explique a situação em "overallNotes" — nunca invente conteúdo de um documento que não conseguiu processar.
7. Não avalie nem opine sobre a condição real do móvel — sua única tarefa é transcrever o que está escrito no formulário, nada além disso.`;

async function startServer() {
  // Antes de qualquer rota aceitar requisições: se o disco local estiver vazio
  // (ex.: container recém-criado, sem volume persistente), recupera o último
  // estado salvo no Firestore. Sem isso, qualquer redeploy sem disco permanente
  // perderia os dados do mesmo jeito que o sistema anterior perdia na VPS.
  //
  // Uma falha aqui é fatal de propósito: o processo encerra ANTES de abrir a
  // porta, nunca chega a aceitar tráfego nem a gravar nada. A alternativa
  // (seguir em frente) deixaria o primeiro loadStore() criar o store PADRÃO
  // de demonstração e gravá-lo em produção como se fosse o estado real — o
  // Cloud Run reinicia o contêiner automaticamente após uma falha de start,
  // então isto se comporta como uma reentrega seria, não como downtime
  // permanente, desde que a causa (rede/permissão/projeto) seja corrigida.
  try {
    await restoreStoreFromFirestoreIfNeeded();
  } catch (err) {
    console.error(
      '[Firestore Sync] FATAL — inicialização abortada, nenhuma rota vai aceitar tráfego:',
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  const app = express();
  app.use(
    express.json({
      limit: '50mb',
      // Guarda os bytes crus do corpo para a verificação de assinatura HMAC do
      // webhook do WhatsApp (YCloud-Signature) — não altera o comportamento
      // de nenhuma outra rota, que continua recebendo req.body já parseado.
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // Real-time Corporate Multi-Device Hub (Computador + Tablet + Celular)
  const activeDevices = new Map<string, CorporateDeviceSession>();
  const sseClients = new Set<{
    clientId: string;
    deviceId?: string;
    res: express.Response;
  }>();

  function getActiveDevicesList(): CorporateDeviceSession[] {
    const cutoff = Date.now() - 65000;
    for (const [id, dev] of activeDevices.entries()) {
      if (new Date(dev.lastSeenAt).getTime() < cutoff) {
        activeDevices.delete(id);
      }
    }
    return Array.from(activeDevices.values()).sort((a, b) =>
      a.formFactor.localeCompare(b.formFactor)
    );
  }

  function broadcastRealtimeEvent(event: RealtimeSyncEvent) {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of sseClients) {
      try {
        client.res.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // SSE stream for real-time connection between Computador, Tablet, and Celular
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined;
    const formFactor =
      req.query.formFactor === 'Celular' ||
      req.query.formFactor === 'Tablet' ||
      req.query.formFactor === 'Computador'
        ? (req.query.formFactor as DeviceFormFactor)
        : 'Computador';
    const stationName =
      typeof req.query.stationName === 'string' && req.query.stationName.trim()
        ? req.query.stationName.trim()
        : formFactor === 'Celular'
        ? 'Vistoria Móvel (Celular)'
        : formFactor === 'Tablet'
        ? 'Bancada Oficina (Tablet)'
        : 'Central Escritório (Computador)';

    if (deviceId) {
      activeDevices.set(deviceId, {
        deviceId,
        formFactor,
        stationName,
        lastSeenAt: new Date().toISOString(),
        isStandalonePwa: req.query.standalone === 'true',
      });
    }

    const clientEntry = {
      clientId: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      deviceId,
      res,
    };
    sseClients.add(clientEntry);

    const initEvent: RealtimeSyncEvent = {
      type: 'connected',
      timestamp: new Date().toISOString(),
      devices: getActiveDevicesList(),
    };
    res.write(`data: ${JSON.stringify(initEvent)}\n\n`);

    broadcastRealtimeEvent({
      type: 'devices:presence',
      timestamp: new Date().toISOString(),
      devices: getActiveDevicesList(),
    });

    const keepAliveTimer = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(keepAliveTimer);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      sseClients.delete(clientEntry);
      if (deviceId) {
        // Keep device entry briefly in case of quick page reload, or remove if no other SSE client shares deviceId
        const stillConnected = Array.from(sseClients).some((c) => c.deviceId === deviceId);
        if (!stillConnected) {
          activeDevices.delete(deviceId);
          broadcastRealtimeEvent({
            type: 'devices:presence',
            timestamp: new Date().toISOString(),
            devices: getActiveDevicesList(),
          });
        }
      }
    });
  });

  // Device heartbeat & station metadata update
  app.post('/api/devices/heartbeat', (req, res) => {
    const {
      deviceId,
      formFactor,
      stationName,
      activeAttendanceId,
      activeAttendanceNumber,
      activeStep,
      isStandalonePwa,
    } = req.body as Partial<CorporateDeviceSession>;

    if (deviceId) {
      const validFactor: DeviceFormFactor =
        formFactor === 'Celular' || formFactor === 'Tablet' || formFactor === 'Computador'
          ? formFactor
          : 'Computador';
      activeDevices.set(deviceId, {
        deviceId,
        formFactor: validFactor,
        stationName:
          stationName?.trim() ||
          (validFactor === 'Celular'
            ? 'Vistoria Móvel (Celular)'
            : validFactor === 'Tablet'
            ? 'Bancada Oficina (Tablet)'
            : 'Central Escritório (Computador)'),
        activeAttendanceId: activeAttendanceId || null,
        activeAttendanceNumber: activeAttendanceNumber || null,
        activeStep: activeStep || 1,
        lastSeenAt: new Date().toISOString(),
        isStandalonePwa: Boolean(isStandalonePwa),
      });
    }

    const devices = getActiveDevicesList();
    broadcastRealtimeEvent({
      type: 'devices:presence',
      timestamp: new Date().toISOString(),
      devices,
    });
    res.json({ ok: true, devices });
  });

  // Handoff / Focus Attendance across all connected devices (Computador, Tablet, Celular)
  app.post('/api/devices/focus-attendance', (req, res) => {
    const {
      attendanceId,
      step,
      sourceDeviceId,
      sourceStationName,
      sourceFormFactor,
    } = req.body as {
      attendanceId: string;
      step?: number;
      sourceDeviceId?: string;
      sourceStationName?: string;
      sourceFormFactor?: DeviceFormFactor;
    };

    const store = loadStore();
    const attendance = store.attendances.find((a) => a.id === attendanceId);
    if (!attendance) {
      res.status(404).json({ error: 'Atendimento não encontrado para transmissão.' });
      return;
    }

    broadcastRealtimeEvent({
      type: 'attendance:focus',
      timestamp: new Date().toISOString(),
      sourceDeviceId,
      sourceStationName,
      sourceFormFactor,
      attendanceId: attendance.id,
      attendance,
      step: step || attendance.currentStep || 1,
    });

    res.json({ ok: true });
  });

  // Explicit PWA Manifest & Service Worker routes so Android/Tablet/Desktop always install natively as an App (not a shortcut)
  app.get(['/manifest.json', '/manifest.webmanifest'], (_req, res) => {
    const manifestPath = path.join(__dirname, 'public', 'manifest.json');
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(manifestPath);
  });

  app.get('/sw.js', (_req, res) => {
    const swPath = path.join(__dirname, 'public', 'sw.js');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(swPath);
  });

  // Status endpoint (checks if ANTHROPIC_API_KEY is present without exposing it)
  app.get('/api/status', (req, res) => {
    const hasAnthropicKey = Boolean(
      process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 5
    );
    // Endereço público real usado para instalar o app em celular/tablet (QR code e link
    // compartilhado). Nunca um domínio fixo de outro serviço: usa APP_URL se configurado,
    // senão deriva do próprio host da requisição (correto automaticamente em qualquer
    // domínio que sirva o app, inclusive atrás do proxy do Cloud Run).
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    const host = req.get('host');
    const requestOrigin = host ? `${protocol}://${host}` : undefined;
    const activeAppUrl = process.env.APP_URL || requestOrigin;
    res.json({
      ok: true,
      geminiConfigured: hasAnthropicKey,
      aiConfigured: hasAnthropicKey,
      storageConfigured: true,
      configuredModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      appUrl: activeAppUrl,
      devices: getActiveDevicesList(),
    });
  });

  // Get full store data
  app.get('/api/store', (_req, res) => {
    const store = loadStore();
    res.json({
      ...store,
      devices: getActiveDevicesList(),
    });
  });

  // Cadastro geral de clientes — reutilizado na mesa da Carla (busca ao abrir um
  // atendimento novo, para não recadastrar a mesma pessoa) e na área Clientes.
  app.get('/api/clients', (req, res) => {
    const store = loadStore();
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const qDigits = normalizePhoneDigits(q);
    const clients = store.clients || [];
    const matches = q
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (qDigits && normalizePhoneDigits(c.phone).includes(qDigits)) ||
            (c.address.city || '').toLowerCase().includes(q)
        )
      : clients;
    res.json({ ok: true, clients: matches.slice(0, 50) });
  });

  app.post('/api/clients', (req, res) => {
    try {
      const store = loadStore();
      if (!store.clients) store.clients = [];
      const { name, phone, email, address, notes } = req.body as {
        name: string;
        phone?: string;
        email?: string;
        address?: ClientAddress;
        notes?: string;
      };
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Informe o nome do cliente.' });
        return;
      }
      // Evita duplicar: se já existe alguém com esse telefone (ou, sem telefone, esse
      // nome exato), reaproveita o cadastro existente e só completa o que estiver vazio,
      // em vez de criar um registro novo para a mesma pessoa.
      const existing = findClientByPhoneOrName(store.clients, phone, name);
      const now = new Date().toISOString();
      if (existing) {
        existing.name = name.trim() || existing.name;
        if (phone && !existing.phone) existing.phone = phone;
        if (email && !existing.email) existing.email = email;
        if (address) {
          existing.address = { ...existing.address, ...Object.fromEntries(Object.entries(address).filter(([, v]) => v)) };
        }
        if (notes && !existing.notes) existing.notes = notes;
        existing.updatedAt = now;
        saveStore(store);
        res.json({ ok: true, client: existing, reused: true });
        return;
      }
      const newClient: ClientRecord = {
        id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        phone: phone || '',
        email: email || undefined,
        address: address || {},
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now,
      };
      store.clients.push(newClient);
      saveStore(store);
      res.json({ ok: true, client: newClient, reused: false });
    } catch (err) {
      console.error('Erro ao cadastrar cliente:', err);
      res.status(500).json({ error: 'Erro ao cadastrar cliente.' });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    try {
      const store = loadStore();
      const client = (store.clients || []).find((c) => c.id === req.params.id);
      if (!client) {
        res.status(404).json({ error: 'Cliente não encontrado.' });
        return;
      }
      const { name, phone, email, address, notes } = req.body as Partial<ClientRecord>;
      if (name !== undefined) client.name = name;
      if (phone !== undefined) client.phone = phone;
      if (email !== undefined) client.email = email;
      if (address !== undefined) client.address = { ...client.address, ...address };
      if (notes !== undefined) client.notes = notes;
      client.updatedAt = new Date().toISOString();
      saveStore(store);
      res.json({ ok: true, client });
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
  });

  // Update workshop settings
  app.put('/api/settings', (req, res) => {
    const store = loadStore();
    const body = req.body as Partial<WorkshopSettings>;
    store.settings = {
      ...store.settings,
      ...body,
    };
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'settings:updated',
      timestamp: new Date().toISOString(),
      settings: store.settings,
    });
    res.json({ ok: true, settings: store.settings });
  });

  // Voz individual por agente — lida/salva separado de /api/settings para que
  // qualquer mesa possa ler sua própria voz sem precisar buscar as configurações
  // inteiras da oficina.
  app.get('/api/agent-voice-settings', (_req, res) => {
    const store = loadStore();
    res.json({ ok: true, agentVoiceSettings: store.settings.agentVoiceSettings || {} });
  });

  app.put('/api/agent-voice-settings/:deskId', (req, res) => {
    const store = loadStore();
    const deskId = req.params.deskId as DepartmentId;
    const { voiceURI, voiceName, lang, gender, rate, pitch } = req.body as {
      voiceURI: string;
      voiceName: string;
      lang: string;
      gender?: 'feminina' | 'masculina';
      rate?: number;
      pitch?: number;
    };
    if (!voiceURI || !voiceName) {
      res.status(400).json({ error: 'voiceURI e voiceName são obrigatórios.' });
      return;
    }
    if (!store.settings.agentVoiceSettings) store.settings.agentVoiceSettings = {};
    const config: AgentVoiceConfig = {
      voiceURI,
      voiceName,
      lang: lang || 'pt-BR',
      gender,
      rate: typeof rate === 'number' && rate > 0 ? rate : undefined,
      pitch: typeof pitch === 'number' && pitch >= 0 ? pitch : undefined,
      updatedAt: new Date().toISOString(),
    };
    store.settings.agentVoiceSettings[deskId] = config;
    saveStore(store);
    res.json({ ok: true, config });
  });

  // Identidade Visual dos Agentes — retrato por mesa/agente, arquivo fixo e durável
  // (sobrescrito a cada novo envio), servido pela rota já existente /api/photos/:fileName.
  app.post('/api/agent-portraits/:deskId', (req, res) => {
    try {
      const { deskId } = req.params;
      if (!VALID_DESK_IDS.includes(deskId as DepartmentId)) {
        res.status(400).json({ error: 'Identificador de agente desconhecido.' });
        return;
      }
      const { dataUrl, mimeType } = req.body as { dataUrl: string; mimeType?: string };
      if (!dataUrl) {
        res.status(400).json({ error: 'Imagem não enviada.' });
        return;
      }
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Formato de imagem inválido (esperado base64 dataURL).' });
        return;
      }
      // O prefixo da própria data URL (match[1]) descreve os bytes reais que seguem;
      // um "mimeType" enviado à parte é só uma alegação do cliente e pode estar errado
      // (ex.: miniatura sempre marcada como jpeg mesmo quando a imagem original é PNG).
      // Por isso o prefixo tem prioridade — nunca declarar um tipo que não bate com o conteúdo.
      const detectedMime = match[1] || mimeType || 'image/jpeg';
      const base64Data = match[2];
      const fileName = `agent-portrait-${deskId}.jpg`;
      savePhotoFile(fileName, Buffer.from(base64Data, 'base64'), detectedMime);

      const store = loadStore();
      const now = new Date().toISOString();
      store.settings.agentPortraitUpdatedAt = {
        ...(store.settings.agentPortraitUpdatedAt || {}),
        [deskId]: now,
      };
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'settings:updated',
        timestamp: now,
        settings: store.settings,
      });
      res.json({
        ok: true,
        imageUrl: `/api/photos/${fileName}`,
        settings: store.settings,
      });
    } catch (error) {
      console.error('Erro ao salvar retrato do agente:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao gravar o retrato no armazenamento do servidor.',
      });
    }
  });

  // Imagem de Capa do Escritório — mesmo padrão de arquivo fixo e durável
  app.post('/api/office-cover', (req, res) => {
    try {
      const { dataUrl, mimeType } = req.body as { dataUrl: string; mimeType?: string };
      if (!dataUrl) {
        res.status(400).json({ error: 'Imagem não enviada.' });
        return;
      }
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Formato de imagem inválido (esperado base64 dataURL).' });
        return;
      }
      // O prefixo da própria data URL (match[1]) descreve os bytes reais que seguem;
      // um "mimeType" enviado à parte é só uma alegação do cliente e pode estar errado
      // (ex.: miniatura sempre marcada como jpeg mesmo quando a imagem original é PNG).
      // Por isso o prefixo tem prioridade — nunca declarar um tipo que não bate com o conteúdo.
      const detectedMime = match[1] || mimeType || 'image/jpeg';
      const base64Data = match[2];
      const fileName = 'office-cover-image.jpg';
      savePhotoFile(fileName, Buffer.from(base64Data, 'base64'), detectedMime);

      const store = loadStore();
      const now = new Date().toISOString();
      store.settings.officeCoverImageUpdatedAt = now;
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'settings:updated',
        timestamp: now,
        settings: store.settings,
      });
      res.json({
        ok: true,
        imageUrl: `/api/photos/${fileName}`,
        settings: store.settings,
      });
    } catch (error) {
      console.error('Erro ao salvar imagem de capa do escritório:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao gravar a imagem de capa no armazenamento do servidor.',
      });
    }
  });

  // Create new attendance with automatic number
  app.post('/api/attendances', async (req, res) => {
    try {
      const store = loadStore();
      const incoming = req.body as AttendanceRecord;
      
      // Prevent duplicates by checking if ID already exists
      if (incoming.id && store.attendances.find(a => a.id === incoming.id)) {
        res.json({ ok: true, attendance: store.attendances.find(a => a.id === incoming.id) });
        return;
      }
      
      const now = new Date();
      const count = store.attendances.length + 1;
      const formattedSeq = String(count).padStart(4, '0');
      const attendanceNumber =
        incoming.orderType === 'Fabricação'
          ? `FAB-2026-${formattedSeq}`
          : `CI-2026-${formattedSeq}`;

      const newRecord: AttendanceRecord = {
        ...incoming,
        id: incoming.id || `att-${Date.now()}`,
        attendanceNumber: incoming.attendanceNumber || attendanceNumber,
        status: incoming.status || 'Rascunho',
        currentStep: incoming.currentStep || 1,
        clientName: incoming.clientName || 'Cliente não informado',
        clientPhone: incoming.clientPhone || '',
        furnitureType: incoming.furnitureType || 'Sofá',
        piecesCount: incoming.piecesCount || '1 unidade',
        approxMeasurements: incoming.approxMeasurements || 'A validar na oficina',
        reportedDefects: incoming.reportedDefects || '',
        desiredService: incoming.desiredService || '',
        previousReforms: incoming.previousReforms || '',
        fabricAndComfortPreference: incoming.fabricAndComfortPreference || 'não informado',
        notes: incoming.notes || '',
        photos: incoming.photos || [],
        leftRightReference: incoming.leftRightReference || 'Olhando o móvel de frente',
        defectFindings: incoming.defectFindings || [],
        analysisLimitations: incoming.analysisLimitations || [],
        requestedAdditionalPhotos: incoming.requestedAdditionalPhotos || [],
        aiPreliminarySummary: incoming.aiPreliminarySummary || '',
        reviewCompleted: false,
        reviewerName: incoming.reviewerName || '',
        reviewerGeneralNotes: '',
        internalInspectionCompleted: false,
        reuseItems: incoming.reuseItems || [],
        foamInspection: incoming.foamInspection || {
          inspectedByWorkshop: false,
          permanentDeformation: 'Não avaliado',
          compressionReturn: 'Não avaliado',
          crumbling: 'Não avaliado',
          odor: 'Não avaliado',
          moisture: 'Não avaliado',
          workshopNotes: '',
        },
        materialConsumptionAndReworkAnalysis: '',
        proposals: incoming.proposals || [],
        selectedProposalTier: incoming.selectedProposalTier || 'RECOMENDADA',
        budget: incoming.budget || {
          items: [],
          cuttingPlanConfirmed: false,
          sellingPriceCents: null,
          paymentConditions: 'não informado',
          confirmedByResponsible: false,
        },
        opinion: incoming.opinion || {
          isPreliminary: true,
          structureStateSummary: 'não informado',
          damageExtentSummary: 'não informado',
          possibleRecoverySummary: 'não informado',
          reusableMaterialsSummary: 'não informado',
          complexityLevel: 'A confirmar na oficina',
          expectedResultSummary: 'não informado',
          conclusion: 'Dados insuficientes para concluir',
          reasons: 'Avaliação ainda não iniciada.',
          pendingFactors: 'Envio de fotos, análise de defeitos, inspeção interna e orçamento.',
          whatCouldChangeConclusion: 'Inspeção presencial na oficina e definição de custos.',
          clientPlainLanguageSummary: 'Avaliação em andamento.',
          recommendedNextStep: 'Concluir o cadastro e anexar fotos do móvel.',
        },
        hiddenDamages: incoming.hiddenDamages || [],
        auditHistory: incoming.auditHistory || [
          {
            id: `log-${Date.now()}`,
            timestamp: now.toISOString(),
            actor: incoming.reviewerName || 'Sistema',
            stage: 'Cadastro',
            action: 'Atendimento criado',
            details: 'Cadastro inicial do atendimento.',
          },
        ],
        staleness: incoming.staleness || {
          defectsAnalysisNeedsReview: false,
          responsibleReviewNeedsUpdate: false,
          reuseNeedsReview: false,
          proposalNeedsReview: false,
          opinionNeedsReview: false,
        },
        orderType: incoming.orderType || 'Reforma',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      // Update store (saveStore já sincroniza o estado inteiro com o Firestore)
      store.attendances.push(newRecord);
      saveStore(store);
      res.json({ ok: true, attendance: newRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });









  // Update attendance
  app.put('/api/attendances/:id', (req, res) => {
    const store = loadStore();
    const { id } = req.params;
    const idx = store.attendances.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Atendimento não encontrado no armazenamento persistente.' });
      return;
    }
    const now = new Date().toISOString();
    const updated: AttendanceRecord = {
      ...store.attendances[idx],
      ...req.body,
      id,
      updatedAt: now,
    };
    store.attendances[idx] = updated;
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'attendance:updated',
      timestamp: now,
      sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
      sourceStationName: (req.headers['x-station-name'] as string) || undefined,
      attendance: updated,
    });
    res.json({ ok: true, attendance: updated });
  });

  // Delete all attendances
  app.delete('/api/attendances', (req, res) => {
    const store = loadStore();
    store.attendances = [];
    store.nextSequence = 1;
    saveStore(store);

    try {
      if (fs.existsSync(PHOTOS_DIR)) {
        for (const file of fs.readdirSync(PHOTOS_DIR)) {
          // NUNCA apagar fotografias da biblioteca da Júlia Marketing ao limpar atendimentos
          if (!file.startsWith('julia_')) {
            fs.unlinkSync(path.join(PHOTOS_DIR, file));
          }
        }
      }
    } catch (err) {
      console.error('Aviso ao limpar fotos:', err);
    }

    broadcastRealtimeEvent({
      type: 'attendance:cleared',
      timestamp: new Date().toISOString(),
      sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
      sourceStationName: (req.headers['x-station-name'] as string) || undefined,
    });
    res.json({ ok: true });
  });

  // Delete attendance
  app.delete('/api/attendances/:id', (req, res) => {
    const store = loadStore();
    const { id } = req.params;
    store.attendances = store.attendances.filter((a) => a.id !== id);
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'attendance:deleted',
      timestamp: new Date().toISOString(),
      sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
      attendanceId: id,
    });
    res.json({ ok: true });
  });

  // Private Photo Upload Endpoint
  app.post('/api/photos/upload', (req, res) => {
    try {
      const { attendanceId, photoId, dataUrl, mimeType } = req.body as {
        attendanceId: string;
        photoId: string;
        dataUrl: string;
        mimeType?: string;
      };
      if (!attendanceId || !photoId || !dataUrl) {
        res.status(400).json({ error: 'Dados incompletos para salvamento da foto.' });
        return;
      }
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Formato de imagem inválido (esperado base64 dataURL).' });
        return;
      }
      // O prefixo da própria data URL (match[1]) descreve os bytes reais que seguem;
      // um "mimeType" enviado à parte é só uma alegação do cliente e pode estar errado
      // (ex.: miniatura sempre marcada como jpeg mesmo quando a imagem original é PNG).
      // Por isso o prefixo tem prioridade — nunca declarar um tipo que não bate com o conteúdo.
      const detectedMime = match[1] || mimeType || 'image/jpeg';
      const base64Data = match[2];
      const ext = detectedMime.includes('png')
        ? '.png'
        : detectedMime.includes('webp')
        ? '.webp'
        : '.jpg';
      const safeFileName = `${attendanceId.replace(/[^a-zA-Z0-9_-]/g, '')}_${photoId.replace(
        /[^a-zA-Z0-9_-]/g,
        ''
      )}${ext}`;
      savePhotoFile(safeFileName, Buffer.from(base64Data, 'base64'), detectedMime);

      res.json({
        ok: true,
        imageUrl: `/api/photos/${safeFileName}`,
        mimeType: detectedMime,
      });
    } catch (error) {
      console.error('Erro ao salvar foto no armazenamento privado:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Falha ao gravar foto no armazenamento do servidor.',
      });
    }
  });

  // Serve Private Photo
  app.get('/api/photos/:fileName', async (req, res) => {
    const safeFileName = req.params.fileName.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = path.join(PHOTOS_DIR, safeFileName);
    // Se o arquivo não está mais no disco local (ex.: redeploy sem disco permanente),
    // tenta recuperar do Firebase Storage antes de desistir.
    const available = fs.existsSync(filePath) || (await ensurePhotoFileAvailable(safeFileName));
    if (!available) {
      res.status(404).json({ error: 'Foto não encontrada.' });
      return;
    }
    const ext = path.extname(safeFileName).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  });

  // Materials Catalog CRUD
  app.post('/api/materials', (req, res) => {
    const store = loadStore();
    const now = new Date().toISOString();
    const item: MaterialCatalogItem = {
      ...req.body,
      id: req.body.id || `mat-${Date.now()}`,
      ownerId: req.body.ownerId || 'system',
      code: req.body.code || `MAT-${Date.now().toString().slice(-4)}`,
      name: req.body.name || 'Item sem nome',
      category: req.body.category || 'Material',
      unit: req.body.unit || req.body.consumptionUnit || 'un',
      unitCostCents: Number(req.body.unitCostCents) || 0,
      supplier: req.body.supplier || 'não informado',
      isActive: req.body.isActive !== false,
      createdAt: req.body.createdAt || now,
      updatedAt: now,
    };
    store.materials.unshift(item);
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'materials:updated',
      timestamp: now,
      materials: store.materials,
    });
    res.json({ ok: true, material: item });
  });

  app.put('/api/materials/:id', (req, res) => {
    const store = loadStore();
    const { id } = req.params;
    const idx = store.materials.findIndex((m) => m.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Material ou serviço não encontrado.' });
      return;
    }
    const now = new Date().toISOString();
    store.materials[idx] = {
      ...store.materials[idx],
      ...req.body,
      id,
      updatedAt: now,
    };
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'materials:updated',
      timestamp: now,
      materials: store.materials,
    });
    res.json({ ok: true, material: store.materials[idx] });
  });

  app.delete('/api/materials/:id', (req, res) => {
    const store = loadStore();
    store.materials = store.materials.filter((m) => m.id !== req.params.id);
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'materials:updated',
      timestamp: new Date().toISOString(),
      materials: store.materials,
    });
    res.json({ ok: true });
  });

  // Recalcular orçamentos abertos com preços atuais vigentes do catálogo
  app.post('/api/orders/recalculate-budgets', (req, res) => {
    try {
      const store = loadStore();
      const now = new Date().toISOString();

      let recalculatedCount = 0;
      for (const att of store.attendances) {
        if (!att.budget || !Array.isArray(att.budget.items) || att.budget.items.length === 0) continue;

        let changed = false;
        att.budget.items = att.budget.items.map((it) => {
          const match =
            (it.catalogItemId ? store.materials.find((m) => m.id === it.catalogItemId) : null) ||
            store.materials.find(
              (m) =>
                m.name.toLowerCase() === it.name.toLowerCase() ||
                (m.code && it.name.toLowerCase().includes(m.code.toLowerCase()))
            );

          if (match && match.unitCostCents !== it.unitCostCents) {
            changed = true;
            return {
              ...it,
              catalogItemId: match.id,
              unitCostCents: match.unitCostCents,
            };
          }
          return it;
        });

        // Atualizar também manufacturingData se aplicável
        if (att.manufacturingData && Array.isArray(att.manufacturingData.materialRequirements)) {
          att.manufacturingData.materialRequirements = att.manufacturingData.materialRequirements.map((mr) => {
            const match = store.materials.find(
              (m) =>
                m.id === mr.materialId ||
                m.code === mr.materialCode ||
                m.name.toLowerCase() === (mr.materialName || '').toLowerCase()
            );
            if (match && match.unitCostCents !== mr.unitCostCents) {
              changed = true;
              return {
                ...mr,
                unitCostCents: match.unitCostCents,
                totalCostCents: Math.round(
                  (match.unitCostCents * (mr.totalOrderRequirement || mr.quantityPerUnit || 1))
                ),
              };
            }
            return mr;
          });
        }

        if (changed) {
          recalculatedCount++;
          let reviewNote = '';
          if (att.budget?.confirmedByResponsible) {
            att.budget.confirmedByResponsible = false;
            att.staleness = {
              ...att.staleness,
              budgetOrMaterialsNeedsReview: true,
            };
            reviewNote += ' A aprovação do orçamento foi desfeita e precisa ser conferida novamente pelo responsável.';
          }
          if (Array.isArray(att.materialsLists) && att.materialsLists.length > 0) {
            const lastList = att.materialsLists[att.materialsLists.length - 1];
            if (lastList.status === 'Lista aprovada') {
              lastList.status = 'Lista em preparação';
              lastList.updatedAt = now;
              att.staleness = {
                ...att.staleness,
                budgetOrMaterialsNeedsReview: true,
              };
              reviewNote += ' A lista de materiais aprovada voltou para "em preparação" e precisa ser revisada.';
            }
          }
          att.auditHistory = [
            ...(att.auditHistory || []),
            {
              id: `aud-recalc-${Date.now()}`,
              timestamp: now,
              actor: 'Mesa de Compras / Supervisão',
              stage: 'Recálculo Orçamentário',
              action: 'Orçamento recalculado com preços atuais do catálogo',
              details: `Valores unitários sincronizados com tabela de matérias-primas vigente.${reviewNote}`,
            },
          ];
          att.updatedAt = now;
        }
      }

      saveStore(store);
      res.json({
        ok: true,
        recalculatedOrdersCount: recalculatedCount,
        attendances: store.attendances,
      });
    } catch (err) {
      console.error('Erro ao recalcular orçamentos:', err);
      res.status(500).json({ error: 'Erro ao recalcular orçamentos.' });
    }
  });

  // Aprova as decisões por componente de uma proposta de reforma (precisa já ser a
  // proposta selecionada). Depois de aprovada, uma nova análise de reaproveitamento
  // nunca sobrescreve este objeto sem arquivá-lo primeiro (ver /api/ai/analyze-reuse).
  app.post('/api/attendances/:id/proposals/:tier/approve', (req, res) => {
    try {
      const store = loadStore();
      const { id, tier } = req.params;
      const { componentDecisions, actorName } = req.body as {
        componentDecisions?: Array<{ key: ReformComponentDecisionKey; decision: string; notes?: string }>;
        actorName?: string;
      };

      const attendance = store.attendances.find((a) => a.id === id);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      if (attendance.selectedProposalTier !== tier) {
        res.status(400).json({
          error: `A proposta ${tier} não é a proposta atualmente selecionada (${attendance.selectedProposalTier}). Selecione-a antes de aprovar.`,
        });
        return;
      }
      const proposal = attendance.proposals.find((p) => p.tier === tier);
      if (!proposal) {
        res.status(404).json({ error: 'Proposta não encontrada entre as propostas geradas.' });
        return;
      }

      const now = new Date().toISOString();
      const actor = actorName || attendance.reviewerName || 'Pedro (Avaliação Técnica)';

      if (Array.isArray(componentDecisions) && componentDecisions.length > 0) {
        proposal.componentDecisions = componentDecisions.map((cd) => ({
          key: cd.key,
          decision: cd.decision,
          decidedBy: actor,
          decidedAt: now,
          notes: cd.notes,
        }));
      }
      proposal.approved = true;
      proposal.approvedBy = actor;
      proposal.approvedAt = now;

      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor,
        stage: 'Propostas de Reforma',
        action: `Proposta ${tier} aprovada com decisões por componente`,
        details: `${(proposal.componentDecisions || []).length} decisão(ões) por componente registrada(s).`,
      });
      attendance.updatedAt = now;

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
        attendance,
      });
      res.json({ ok: true, proposal, attendance });
    } catch (err) {
      console.error('Erro ao aprovar proposta:', err);
      res.status(500).json({ error: 'Erro ao aprovar proposta.' });
    }
  });

  // Lista de Materiais da Reforma — "Preparar materiais da reforma"
  // Deriva (sem IA) a lista a partir da avaliação de reaproveitamento e da proposta escolhida.
  // Chamar de novo com a mesma proposta selecionada atualiza a lista existente sem perder edições
  // manuais (preserva quantidade, preço, catálogo vinculado e notas já preenchidos pelo responsável);
  // trocar a proposta selecionada cria uma nova revisão, mantendo as anteriores no histórico.
  app.post('/api/attendances/:id/materials-list/prepare', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { actorName } = req.body as { actorName?: string };
      const attendance = store.attendances.find((a) => a.id === id);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      if (attendance.orderType === 'Fabricação') {
        res.status(400).json({
          error: 'Este pedido é de Fabricação Nova e não possui lista de materiais de reforma.',
        });
        return;
      }
      const tier = attendance.selectedProposalTier;
      if (!tier) {
        res.status(400).json({
          error:
            'Nenhuma proposta selecionada ainda. Escolha a proposta (Essencial, Recomendada ou Completa) antes de preparar a lista de materiais.',
        });
        return;
      }
      const proposal = attendance.proposals.find((p) => p.tier === tier);
      if (!proposal) {
        res.status(400).json({
          error: 'A proposta selecionada não foi encontrada entre as propostas geradas. Gere as propostas novamente.',
        });
        return;
      }

      const now = new Date().toISOString();
      const derivedItems = deriveMaterialsListItems(attendance, proposal, tier);
      const existingLists = attendance.materialsLists || [];
      const latest = existingLists[existingLists.length - 1];
      const actor = actorName || attendance.reviewerName || 'Responsável pela avaliação';

      if (latest && latest.proposalTier === tier) {
        // Mesma proposta: atualiza a lista vigente preservando edições manuais já feitas.
        const existingById = new Map(latest.items.map((it) => [it.id, it]));
        const mergedItems: ReformMaterialListItem[] = derivedItems.map((derived) => {
          const prev = existingById.get(derived.id);
          if (!prev) return derived;
          if (prev.componentStatus !== derived.componentStatus) {
            // A avaliação mudou de fato (ex.: inspeção interna concluída depois da última
            // preparação) — a situação da peça não é mais a mesma, então a linha derivada
            // substitui a anterior em vez de manter dados que presumiam a situação antiga.
            return derived;
          }
          return { ...prev, component: derived.component, justification: derived.justification };
        });
        const derivedIds = new Set(derivedItems.map((d) => d.id));
        const keptManualItems = latest.items.filter((it) => !derivedIds.has(it.id));
        latest.items = [...mergedItems, ...keptManualItems];
        latest.updatedAt = now;

        attendance.auditHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp: now,
          actor,
          stage: 'Lista de materiais',
          action: 'Lista de materiais atualizada a partir da avaliação revisada',
          details: `Lista ${latest.listCode} (rev. ${latest.revision}) agora com ${latest.items.length} item(ns).`,
        });
        attendance.updatedAt = now;
        saveStore(store);
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: now,
          sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
          attendance,
        });
        res.json({ ok: true, created: false, materialsList: latest, attendance });
        return;
      }

      const revision = latest ? latest.revision + 1 : 1;
      const listCode = `${attendance.attendanceNumber}-LC-${String(revision).padStart(2, '0')}`;
      const newList: ReformMaterialsList = {
        id: `matlist-${Date.now()}`,
        attendanceId: attendance.id,
        attendanceNumber: attendance.attendanceNumber,
        clientName: attendance.clientName,
        furnitureType: attendance.furnitureType,
        proposalTier: tier,
        listCode,
        revision,
        status: 'Lista em preparação',
        items: derivedItems,
        preparedByName: actor,
        preparedAt: now,
        updatedAt: now,
      };
      attendance.materialsLists = [...existingLists, newList];
      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor,
        stage: 'Lista de materiais',
        action: 'Lista de materiais preparada',
        details: `Lista ${listCode} (rev. ${revision}) criada para a proposta ${tier} com ${derivedItems.length} item(ns).`,
      });
      attendance.updatedAt = now;
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
        attendance,
      });
      res.json({ ok: true, created: true, materialsList: newList, attendance });
    } catch (err) {
      console.error('Erro ao preparar lista de materiais:', err);
      res.status(500).json({ error: 'Erro ao preparar lista de materiais.' });
    }
  });

  // Edição manual dos itens da lista (inclusão, exclusão, ajuste) usa a rota genérica
  // PUT /api/attendances/:id já existente (mesmo caminho usado para os itens do orçamento),
  // já que materialsLists é apenas mais um campo do registro do atendimento.

  // Pedro envia um pedido de compra formal e estruturado para a Ana (Compras & Suprimentos),
  // a partir da lista de materiais vigente — nunca monta um pacote vazio ou inventado.
  app.post('/api/attendances/:id/purchase-requests', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { sourcingNotes, actorName } = req.body as { sourcingNotes?: string; actorName?: string };

      const attendance = store.attendances.find((a) => a.id === id);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      if (!sourcingNotes || !sourcingNotes.trim()) {
        res.status(400).json({
          error: 'Informe as notas de abastecimento (onde comprar, urgência, restrições) antes de enviar o pedido.',
        });
        return;
      }
      const existingLists = attendance.materialsLists || [];
      const latestList = existingLists[existingLists.length - 1];
      if (!latestList || latestList.items.length === 0) {
        res.status(400).json({
          error: 'Nenhuma lista de materiais preparada ainda. Prepare a lista de materiais antes de enviar o pedido de compra.',
        });
        return;
      }

      const now = new Date().toISOString();
      const actor = actorName || attendance.reviewerName || 'Pedro (Avaliação Técnica)';
      const pendingQuantities = latestList.items
        .filter((it) => it.quantityStatus !== 'Confirmada')
        .map((it) => `${it.component} (${it.materialName}): ${it.quantityStatus}`);

      const purchaseRequest: PurchaseRequestPackage = {
        id: `pr-${Date.now()}`,
        createdAt: now,
        createdBy: actor,
        attendanceId: attendance.id,
        attendanceNumber: attendance.attendanceNumber,
        clientName: attendance.clientName,
        furnitureType: attendance.furnitureType,
        proposalTier: latestList.proposalTier,
        materialsListId: latestList.id,
        materialsListRevision: latestList.revision,
        items: latestList.items.map((it) => ({
          component: it.component,
          materialName: it.materialName,
          specification: it.specification,
          unit: it.purchaseUnit || it.unit,
          purchaseQuantity: it.purchaseQuantity,
          quantityStatus: it.quantityStatus,
        })),
        technicalSummarySnapshot: {
          conclusion: attendance.opinion.conclusion,
          structureStateSummary: attendance.opinion.structureStateSummary,
          damageExtentSummary: attendance.opinion.damageExtentSummary,
          reasons: attendance.opinion.reasons,
        },
        visualReferencePhotoIds: attendance.photos.map((p) => p.id),
        visualBoardPending: true,
        pendingQuantities,
        sourcingNotes: sourcingNotes.trim(),
        status: 'aguardando_cotacao',
      };

      attendance.purchaseRequests = [...(attendance.purchaseRequests || []), purchaseRequest];

      const { handoff, alreadyTransferred } = createOrderHandoff(store, attendance, {
        fromDesk: 'pedro_avaliacao',
        toDesk: 'ana_compras',
        reason: `Pedido de compra ${purchaseRequest.id} para a lista de materiais ${latestList.listCode}.`,
        completedSummary: `Lista de materiais ${latestList.listCode} (rev. ${latestList.revision}) preparada com ${latestList.items.length} item(ns).`,
        pendingItems: pendingQuantities,
        nextActionExpected: 'Cotar os itens do pedido de compra e devolver o preço total ao Pedro.',
      });

      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor,
        stage: 'Pedido de Compra',
        action: 'Pedido de compra enviado para Ana (Compras & Suprimentos)',
        details: `Pedido ${purchaseRequest.id} com ${purchaseRequest.items.length} item(ns) da lista ${latestList.listCode}.`,
      });
      attendance.updatedAt = now;

      saveStore(store);
      if (!alreadyTransferred) {
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: now,
          sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
          attendance,
        });
      }
      res.json({ ok: true, purchaseRequest, handoff, attendance });
    } catch (err) {
      console.error('Erro ao enviar pedido de compra:', err);
      res.status(500).json({ error: 'Erro ao enviar pedido de compra.' });
    }
  });

  // Ana devolve a cotação real (consultada do catálogo, nunca estimada aqui) e o pedido
  // volta para o Pedro, fechando o loop entre avaliação e compras.
  app.post('/api/attendances/:id/purchase-requests/:requestId/quote', (req, res) => {
    try {
      const store = loadStore();
      const { id, requestId } = req.params;
      const { totalCostCents, lineCostsCents, notes, actorName } = req.body as {
        totalCostCents?: number;
        lineCostsCents?: Record<string, number>;
        notes?: string;
        actorName?: string;
      };

      const attendance = store.attendances.find((a) => a.id === id);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      const purchaseRequest = (attendance.purchaseRequests || []).find((pr) => pr.id === requestId);
      if (!purchaseRequest) {
        res.status(404).json({ error: 'Pedido de compra não encontrado.' });
        return;
      }
      if (typeof totalCostCents !== 'number' || !lineCostsCents || Object.keys(lineCostsCents).length === 0) {
        res.status(400).json({
          error: 'Informe o custo total e o custo de cada item cotado antes de devolver a cotação.',
        });
        return;
      }

      const now = new Date().toISOString();
      const actor = actorName || 'Ana (Compras & Suprimentos)';

      purchaseRequest.quote = {
        quotedAt: now,
        quotedBy: actor,
        totalCostCents,
        lineCostsCents,
        notes,
      };
      purchaseRequest.status = 'cotado';

      const { handoff, alreadyTransferred } = createOrderHandoff(store, attendance, {
        fromDesk: 'ana_compras',
        toDesk: 'pedro_avaliacao',
        reason: `Cotação do pedido de compra ${purchaseRequest.id} concluída.`,
        completedSummary: `Pedido ${purchaseRequest.id} cotado em R$ ${(totalCostCents / 100).toFixed(2)}.`,
        nextActionExpected: 'Conferir a cotação e seguir com a aprovação do orçamento/lista de materiais.',
      });

      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor,
        stage: 'Pedido de Compra',
        action: 'Cotação devolvida ao Pedro',
        details: `Pedido ${purchaseRequest.id} cotado em R$ ${(totalCostCents / 100).toFixed(2)}.`,
      });
      attendance.updatedAt = now;

      saveStore(store);
      if (!alreadyTransferred) {
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: now,
          sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
          attendance,
        });
      }
      res.json({ ok: true, purchaseRequest, handoff, attendance });
    } catch (err) {
      console.error('Erro ao devolver cotação do pedido de compra:', err);
      res.status(500).json({ error: 'Erro ao devolver cotação do pedido de compra.' });
    }
  });

  // Mesa do Tapeceiro Técnico — prepara o plano técnico a partir da avaliação revisada do
  // Pedro (Reforma) ou da ficha técnica revisada do Lucas (Fabricação). Sem IA: deriva
  // determinísticamente, sem inventar medida/encaixe/preço. Edição manual de componentes e
  // materiais usa a rota genérica PUT /api/attendances/:id, como no restante do app.
  app.post('/api/attendances/:id/technical-plan/prepare', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { actorName } = req.body as { actorName?: string };
      const attendance = store.attendances.find((a) => a.id === id);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }

      const now = new Date().toISOString();
      const actor = actorName || 'Tapeceiro Técnico';
      const existing = attendance.manufacturingData;
      let detailsForLog = '';

      if (attendance.orderType === 'Fabricação') {
        const sourceComponents = existing?.components || [];
        if (!existing || sourceComponents.length === 0) {
          res.status(400).json({
            error:
              'Lucas ainda não preparou a ficha técnica deste projeto (nenhum componente cadastrado). Prepare a ficha técnica na mesa de Projetos e Fabricação antes.',
          });
          return;
        }
        const signature = JSON.stringify(
          sourceComponents.map((c) => [c.code, c.dimensionsMm, c.quantityPerUnit, c.totalQuantity])
        );
        const sourceMaterials = existing.materialRequirements || existing.materials || [];

        if (existing.planStatus === 'Liberado pelo responsável' && existing.planSourceComponentsSignature !== signature) {
          attendance.technicalPlanRevisions = [...(attendance.technicalPlanRevisions || []), existing];
          attendance.manufacturingData = {
            ...existing,
            version: bumpPlanVersion(existing.version),
            planStatus: computeInitialPlanStatus(sourceMaterials, sourceComponents),
            planOrderType: 'Fabricação',
            planSourceComponentsSignature: signature,
            planPreparedByName: actor,
            planPreparedAt: now,
            planLiberatedByName: undefined,
            planLiberatedAt: undefined,
          };
          detailsForLog = `Ficha do Lucas mudou após liberação — nova revisão ${attendance.manufacturingData.version} criada.`;
        } else if (!existing.planStatus) {
          existing.planStatus = computeInitialPlanStatus(sourceMaterials, sourceComponents);
          existing.planOrderType = 'Fabricação';
          existing.planSourceComponentsSignature = signature;
          existing.planPreparedByName = actor;
          existing.planPreparedAt = now;
          detailsForLog = `Plano técnico iniciado a partir da ficha do Lucas com ${sourceComponents.length} componente(s).`;
        } else {
          detailsForLog = 'Plano técnico já em preparação; nenhuma mudança estrutural detectada na ficha do Lucas.';
        }
      } else {
        const tier = attendance.selectedProposalTier;
        if (!tier) {
          res.status(400).json({
            error: 'Nenhuma proposta selecionada ainda. Escolha a proposta com o Pedro antes de preparar o plano técnico.',
          });
          return;
        }
        const lists = attendance.materialsLists || [];
        const latestList = lists[lists.length - 1];
        if (!latestList || latestList.proposalTier !== tier) {
          res.status(400).json({
            error: 'Prepare a lista de materiais da reforma com o Pedro (mesa de Avaliação Técnica) antes de preparar o plano técnico.',
          });
          return;
        }

        const derivedComponents = buildComponentsFromReuseItems(attendance);
        const derivedMaterials = buildMaterialsFromReformList(latestList);

        if (!existing) {
          attendance.manufacturingData = {
            id: `mfg-${attendance.id}`,
            modelName: attendance.furnitureType || 'Reforma de estofado',
            version: 'v1.0',
            components: derivedComponents,
            materialRequirements: derivedMaterials,
            materials: derivedMaterials,
            assemblyManual: buildDraftAssemblyManual(attendance, now),
            qualityCheckpoints: [],
            planStatus: computeInitialPlanStatus(derivedMaterials, derivedComponents),
            planOrderType: 'Reforma',
            planSourceProposalTier: tier,
            planPreparedByName: actor,
            planPreparedAt: now,
          };
          detailsForLog = `Plano técnico criado a partir da avaliação do Pedro (proposta ${tier}) com ${derivedComponents.length} componente(s) e ${derivedMaterials.length} material(is).`;
        } else if (existing.planStatus === 'Liberado pelo responsável' && existing.planSourceProposalTier !== tier) {
          attendance.technicalPlanRevisions = [...(attendance.technicalPlanRevisions || []), existing];
          attendance.manufacturingData = {
            id: `mfg-${attendance.id}`,
            modelName: attendance.furnitureType || 'Reforma de estofado',
            version: bumpPlanVersion(existing.version),
            components: derivedComponents,
            materialRequirements: derivedMaterials,
            materials: derivedMaterials,
            assemblyManual: buildDraftAssemblyManual(attendance, now),
            qualityCheckpoints: [],
            planStatus: computeInitialPlanStatus(derivedMaterials, derivedComponents),
            planOrderType: 'Reforma',
            planSourceProposalTier: tier,
            planPreparedByName: actor,
            planPreparedAt: now,
          };
          detailsForLog = `Proposta mudou após liberação (agora ${tier}) — nova revisão ${attendance.manufacturingData.version} criada.`;
        } else {
          // Mesma proposta: mescla preservando edições manuais já feitas pelo tapeceiro.
          const existingComponentsById = new Map((existing.components || []).map((c) => [c.id, c]));
          const mergedComponents = derivedComponents.map((derived) => {
            const prev = existingComponentsById.get(derived.id);
            if (!prev) return derived;
            if (prev.reformStatus !== derived.reformStatus) return derived;
            return { ...prev, name: derived.name, specification: prev.specification };
          });
          const derivedComponentIds = new Set(derivedComponents.map((c) => c.id));
          const keptManualComponents = (existing.components || []).filter((c) => !derivedComponentIds.has(c.id));

          const existingMaterialsById = new Map(
            (existing.materialRequirements || existing.materials || []).map((m) => [m.id, m])
          );
          const mergedMaterials = derivedMaterials.map((derived) => {
            const prev = existingMaterialsById.get(derived.id);
            if (!prev) return derived;
            return { ...prev, materialName: derived.materialName, name: derived.name };
          });
          const derivedMaterialIds = new Set(derivedMaterials.map((m) => m.id));
          const keptManualMaterials = (existing.materialRequirements || existing.materials || []).filter(
            (m) => !derivedMaterialIds.has(m.id)
          );

          const finalComponents = [...mergedComponents, ...keptManualComponents];
          const finalMaterials = [...mergedMaterials, ...keptManualMaterials];
          existing.components = finalComponents;
          existing.materialRequirements = finalMaterials;
          existing.materials = finalMaterials;
          detailsForLog = 'Plano técnico atualizado a partir da avaliação revisada; edições manuais preservadas.';
        }
      }

      attendance.updatedAt = now;
      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor,
        stage: 'Tapeceiro Técnico',
        action: 'Plano técnico preparado/atualizado',
        details: detailsForLog,
      });
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
        attendance,
      });
      res.json({ ok: true, attendance });
    } catch (err) {
      console.error('Erro ao preparar plano técnico:', err);
      res.status(500).json({ error: 'Erro ao preparar plano técnico.' });
    }
  });

  // Libera o plano técnico para execução — exige revisão humana e bloqueia se houver
  // pendência de medição/quantidade (nunca libera com dado inventado).
  app.post('/api/attendances/:id/technical-plan/release', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { reviewerName } = req.body as { reviewerName?: string };
      const attendance = store.attendances.find((a) => a.id === id);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      const plan = attendance.manufacturingData;
      if (!plan) {
        res.status(400).json({ error: 'Nenhum plano técnico preparado ainda.' });
        return;
      }
      if (!reviewerName || !reviewerName.trim()) {
        res.status(400).json({ error: 'Informe o nome do responsável pela revisão antes de liberar.' });
        return;
      }

      const materials = plan.materialRequirements || plan.materials || [];
      const pendingMaterials = materials.filter(
        (m) => m.toPurchaseQuantity == null && m.totalRequired == null && m.totalOrderRequirement == null
      );
      const pendingComponents = (plan.components || []).filter(
        (c) =>
          c.reformStatus === 'Aguardar desmontagem' ||
          (c.dimensionsMm.length == null && c.dimensionsMm.width == null && c.dimensionsMm.thickness == null)
      );
      if (pendingMaterials.length > 0 || pendingComponents.length > 0) {
        res.status(400).json({
          error: 'Não é possível liberar: há medidas ou quantidades pendentes de revisão.',
          pendingMaterials: pendingMaterials.map((m) => m.materialName || m.name || m.id),
          pendingComponents: pendingComponents.map((c) => `${c.code} — ${c.name}`),
        });
        return;
      }

      const now = new Date().toISOString();
      plan.planStatus = 'Liberado pelo responsável';
      plan.planLiberatedByName = reviewerName.trim();
      plan.planLiberatedAt = now;
      plan.version = bumpPlanVersion(plan.version);
      plan.cuttingPlanStatus = 'Pendente de mapa visual';
      plan.financialHandoffStatus = 'Aguardando integração financeira';
      attendance.manufacturingData = plan;
      attendance.updatedAt = now;
      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor: reviewerName.trim(),
        stage: 'Tapeceiro Técnico',
        action: 'Plano técnico liberado para execução',
        details: `Revisão ${plan.version} liberada por ${reviewerName.trim()}.`,
      });
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
        attendance,
      });
      res.json({ ok: true, attendance });
    } catch (err) {
      console.error('Erro ao liberar plano técnico:', err);
      res.status(500).json({ error: 'Erro ao liberar plano técnico.' });
    }
  });

  // 1 & 6 & 7. Central AI Service (Claude): Analyze Defects by Area (sending actual image binaries)
  app.post('/api/ai/analyze-defects', async (req, res) => {
    try {
      const store = loadStore();
      const { attendanceId } = req.body as { attendanceId: string };
      const attendance = store.attendances.find((a) => a.id === attendanceId);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }

      if (attendance.orderType === 'Fabricação') {
        res.status(400).json({
          error:
            'Este pedido é de Fabricação Nova (Mesa do Lucas) e utiliza a Análise de Projeto e Modelo, sem avaliação de defeitos ou danos de móvel antigo.',
        });
        return;
      }

      const savedPhotos = attendance.photos.filter((p) => p.uploadStatus === 'saved');
      if (savedPhotos.length === 0) {
        res.status(400).json({
          error:
            'Nenhuma foto salva neste atendimento. Adicione ao menos uma foto antes de executar a análise por IA.',
        });
        return;
      }

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      let loadedImagesCount = 0;
      for (const photo of savedPhotos) {
        const resolved = resolvePhotoBase64(photo.imageUrl);
        if (resolved) {
          loadedImagesCount++;
          parts.push({
            text: `Foto Identificador: ${photo.code} | Categoria: ${photo.category} | Móvel: ${photo.furnitureLabel} | Legenda informada: ${photo.caption || 'Sem legenda'}`,
          });
          parts.push({
            inlineData: {
              mimeType: resolved.mimeType,
              data: resolved.data,
            },
          });
        }
      }

      if (loadedImagesCount === 0) {
        res.status(400).json({
          error:
            'Não foi possível ler os arquivos binários das imagens vinculadas ao atendimento. Reenvie as fotos e tente novamente.',
        });
        return;
      }

      const contextText = `
DADOS DO ATENDIMENTO (${attendance.attendanceNumber}):
- Cliente: ${attendance.clientName || 'não informado'}
- Tipo de móvel: ${attendance.furnitureType || 'não informado'}
- Quantidade de peças: ${attendance.piecesCount || 'não informado'}
- Medidas aproximadas: ${attendance.approxMeasurements || 'não informado'}
- Tempo de uso: ${attendance.usageTime || 'não informado'}
- Defeitos relatados pelo cliente: ${attendance.reportedDefects || 'não informado'}
- Serviço desejado: ${attendance.desiredService || 'não informado'}
- Reformas anteriores: ${attendance.previousReforms || 'não informado'}
- Preferência de tecido e conforto: ${attendance.fabricAndComfortPreference || 'não informado'}
- Observações: ${attendance.notes || 'não informado'}
- Referência direita/esquerda adotada: ${attendance.leftRightReference || 'Olhando o móvel de frente'}

TAREFA:
Examine as ${loadedImagesCount} imagens reais enviadas acima e gere o RELATÓRIO PRELIMINAR DE DEFEITOS POR ÁREA cobrindo obrigatoriamente todas as 11 áreas:
1. "Estrutura"
2. "Base e pés"
3. "Assento"
4. "Encosto"
5. "Braços"
6. "Tecido e costuras"
7. "Espumas e enchimentos"
8. "Percintas, molas e sustentação"
9. "Ferragens"
10. "Mecanismos retráteis ou reclináveis"
11. "Forro inferior e acabamentos"

Para cada área:
- Cite explicitamente o código da foto (ex: "Foto F-01", "Foto F-02") onde o problema foi observado ou se foi "Relatado pelo cliente" ou se a área está encoberta/ausente nas fotos.
- Use rigorosamente os valores permitidos em "origin" e "severity".
- Liste todas as limitações visuais das fotos e quais fotos adicionais devem ser solicitadas ao cliente ou à oficina.`;

      parts.push({ text: contextText });

      const customDefectRules = store.settings.defectAgentCustomInstructions?.trim();
      const defectSystemInstruction = customDefectRules
        ? `${ANALYST_SYSTEM_INSTRUCTION}\n\nDIRETRIZES ESPECÍFICAS DO AGENTE VISTORIADOR DE DEFEITOS (CASTROS INTERIORES):\n${customDefectRules}`
        : ANALYST_SYSTEM_INSTRUCTION;

      const { response, usedModel: modelName } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: defectSystemInstruction,
        lockKey: `defects:${attendance.id}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leftRightReference: {
              type: Type.STRING,
              description:
                'Referência clara adotada para direita e esquerda (ex: Olhando o móvel de frente).',
            },
            preliminarySummary: {
              type: Type.STRING,
              description:
                'Resumo técnico preliminar objetivo da análise das fotos e relatos.',
            },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: {
                    type: Type.STRING,
                    description: 'Uma das 11 áreas obrigatórias do móvel.',
                  },
                  defectOrSuspicion: {
                    type: Type.STRING,
                    description: 'Descrição técnica do defeito observado, suspeita ou limitação.',
                  },
                  evidenceAndPhoto: {
                    type: Type.STRING,
                    description: 'Referência à foto (ex: Foto F-01) e evidência visual ou relato.',
                  },
                  origin: {
                    type: Type.STRING,
                    description:
                      'Valores aceitos: "Observado na foto", "Relatado pelo cliente", "Suspeita a confirmar", "Confirmado pela oficina", "Não avaliável".',
                  },
                  severity: {
                    type: Type.STRING,
                    description:
                      'Valores aceitos: "Leve", "Moderada", "Grave", "Não avaliável".',
                  },
                  suggestedService: {
                    type: Type.STRING,
                    description: 'Serviço técnico sugerido ou condicionado à inspeção.',
                  },
                  requiredVerification: {
                    type: Type.STRING,
                    description: 'Verificação presencial ou foto adicional necessária na oficina.',
                  },
                },
                required: [
                  'area',
                  'defectOrSuspicion',
                  'evidenceAndPhoto',
                  'origin',
                  'severity',
                  'suggestedService',
                  'requiredVerification',
                ],
              },
            },
            analysisLimitations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Lista de limitações técnicas (áreas cobertas, iluminação, componentes internos ocultos).',
            },
            requestedAdditionalPhotos: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Fotos específicas necessárias para completar a avaliação visual.',
            },
            furnitureModelIdentification: {
              type: Type.OBJECT,
              description: 'Identificação descritiva da configuração/modelo do móvel a partir das fotos.',
              properties: {
                configuration: {
                  type: Type.STRING,
                  description: 'Ex: "sofá retrátil 3 lugares, módulo chaise". "A confirmar" se não verificável.',
                },
                seatsCount: { type: Type.STRING, description: 'Número de lugares/assentos, ou "A confirmar".' },
                armsShape: { type: Type.STRING, description: 'Formato dos braços, ou "A confirmar".' },
                backrestShape: { type: Type.STRING, description: 'Formato do encosto, ou "A confirmar".' },
                baseAndFeetShape: { type: Type.STRING, description: 'Formato da base e pés, ou "A confirmar".' },
                origin: {
                  type: Type.STRING,
                  description:
                    'Valores aceitos: "Observado na foto", "Relatado pelo cliente", "Suspeita a confirmar", "Confirmado pela oficina", "Não avaliável".',
                },
              },
              required: ['configuration', 'seatsCount', 'armsShape', 'backrestShape', 'baseAndFeetShape', 'origin'],
            },
          },
          required: [
            'leftRightReference',
            'preliminarySummary',
            'findings',
            'analysisLimitations',
            'requestedAdditionalPhotos',
            'furnitureModelIdentification',
          ],
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('O modelo de IA retornou uma resposta vazia.');
      }

      const parsed = JSON.parse(rawText) as {
        leftRightReference: string;
        preliminarySummary: string;
        findings: Array<{
          area: string;
          defectOrSuspicion: string;
          evidenceAndPhoto: string;
          origin: string;
          severity: string;
          suggestedService: string;
          requiredVerification: string;
        }>;
        analysisLimitations: string[];
        requestedAdditionalPhotos: string[];
        furnitureModelIdentification?: {
          configuration: string;
          seatsCount: string;
          armsShape: string;
          backrestShape: string;
          baseAndFeetShape: string;
          origin: string;
        };
      };

      const validOrigins = [
        'Observado na foto',
        'Relatado pelo cliente',
        'Suspeita a confirmar',
        'Confirmado pela oficina',
        'Não avaliável',
      ];
      const validSeverities = ['Leve', 'Moderada', 'Grave', 'Não avaliável'];

      // Ensure all 11 mandatory areas exist and validate values
      const findingsMap = new Map<string, DefectFinding>();
      (parsed.findings || []).forEach((f, idx) => {
        const matchedArea =
          FURNITURE_AREAS.find((a) => a.toLowerCase() === f.area.trim().toLowerCase()) ||
          FURNITURE_AREAS[idx % FURNITURE_AREAS.length];
        const origin = validOrigins.includes(f.origin)
          ? (f.origin as DefectFinding['origin'])
          : 'Suspeita a confirmar';
        const severity = validSeverities.includes(f.severity)
          ? (f.severity as DefectFinding['severity'])
          : 'Não avaliável';

        findingsMap.set(matchedArea, {
          id: `df-${Date.now()}-${idx}`,
          area: matchedArea,
          defectOrSuspicion: f.defectOrSuspicion || 'Não avaliável apenas pelas fotos atuais.',
          evidenceAndPhoto: f.evidenceAndPhoto || 'Sem foto específica da área',
          origin,
          severity,
          suggestedService: f.suggestedService || 'Aguardar inspeção presencial na oficina',
          requiredVerification:
            f.requiredVerification || 'Inspeção presencial na oficina após abertura',
          reviewStatus: 'Preliminar',
        });
      });

      const completeFindings: DefectFinding[] = FURNITURE_AREAS.map((area, idx) => {
        const existing = findingsMap.get(area);
        if (existing) return existing;
        return {
          id: `df-${Date.now()}-fallback-${idx}`,
          area,
          defectOrSuspicion: 'Área não visível nas fotografias atuais.',
          evidenceAndPhoto: 'Sem evidência fotográfica direta desta área',
          origin: 'Não avaliável',
          severity: 'Não avaliável',
          suggestedService: 'Avaliar durante inspeção presencial na oficina',
          requiredVerification: `Enviar foto da área (${area}) ou inspecionar na oficina`,
          reviewStatus: 'Preliminar',
        };
      });

      const modelIdentificationRaw = parsed.furnitureModelIdentification;
      const modelIdentificationOrigin = modelIdentificationRaw && validOrigins.includes(modelIdentificationRaw.origin)
        ? (modelIdentificationRaw.origin as InformationOrigin)
        : 'Suspeita a confirmar';
      attendance.furnitureModelIdentification = {
        configuration: modelIdentificationRaw?.configuration || 'A confirmar na oficina',
        seatsCount: modelIdentificationRaw?.seatsCount || 'A confirmar na oficina',
        armsShape: modelIdentificationRaw?.armsShape || 'A confirmar na oficina',
        backrestShape: modelIdentificationRaw?.backrestShape || 'A confirmar na oficina',
        baseAndFeetShape: modelIdentificationRaw?.baseAndFeetShape || 'A confirmar na oficina',
        origin: modelIdentificationOrigin,
      };

      const now = new Date().toISOString();
      attendance.leftRightReference =
        parsed.leftRightReference || attendance.leftRightReference;
      attendance.aiPreliminarySummary = parsed.preliminarySummary;
      attendance.defectFindings = completeFindings;
      attendance.analysisLimitations = parsed.analysisLimitations || [];
      attendance.requestedAdditionalPhotos = parsed.requestedAdditionalPhotos || [];
      attendance.lastAiAnalysisAt = now;
      attendance.status = 'Análise preliminar concluída';
      attendance.reviewCompleted = false;
      attendance.staleness = {
        ...attendance.staleness,
        defectsAnalysisNeedsReview: false,
        responsibleReviewNeedsUpdate: true,
        reuseNeedsReview: true,
        proposalNeedsReview: true,
        opinionNeedsReview: true,
        staleReason:
          'Nova análise preliminar gerada por IA. Necessária revisão do responsável.',
      };
      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor: `Agente Analista IA (${modelName})`,
        stage: 'Análise de defeitos',
        action: 'Análise preliminar de fotos concluída',
        details: `${loadedImagesCount} foto(s) analisada(s) e ${completeFindings.length} áreas examinadas.`,
      });
      attendance.updatedAt = now;

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: `IA Claude (${modelName})`,
        attendance,
      });
      res.json({ ok: true, attendance });
    } catch (error) {
      console.error('Erro na análise de defeitos:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao processar análise de imagens com IA.',
      });
    }
  });

  app.post('/api/ai/diagnose-gemini', async (req, res) => {
    try {
      const { response, usedModel } = await generateContentWithRetryAndFallback({
        preferredModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        parts: [{ text: 'Teste de diagnóstico — responda apenas com {"ok": true}.' }],
        systemInstruction: 'Diagnostic test',
        responseSchema: { type: Type.OBJECT, properties: { ok: { type: Type.BOOLEAN } } },
      });
      res.json({ ok: true, model: usedModel, response: JSON.parse(response.text), keySuffix: process.env.ANTHROPIC_API_KEY?.slice(-4) });
    } catch (err: any) {
      console.error('DIAGNOSTIC ERROR:', err);
      res.status(err.status || 500).json({
        message: err.message,
        status: err.status,
        keySuffix: process.env.ANTHROPIC_API_KEY?.slice(-4),
        requestDetails: { model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5' },
      });
    }
  });

  app.post('/api/ai/verify-firestore', async (req, res) => {
    try {
      await db.collection('test').doc('diag').set({ test: 'ok', timestamp: new Date() });
      const doc = await db.collection('test').doc('diag').get();
      res.json({ ok: true, data: doc.data() });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/ai/analyze-reuse', async (req, res) => {
    try {
      const store = loadStore();
      const { attendanceId } = req.body as { attendanceId: string };
      const attendance = store.attendances.find((a) => a.id === attendanceId);
      if (!attendance) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }

      if (attendance.orderType === 'Fabricação') {
        res.status(400).json({
          error:
            'Este pedido é de Fabricação Nova e não possui análise de reaproveitamento de componentes antigos.',
        });
        return;
      }

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      const savedPhotos = attendance.photos.filter((p) => p.uploadStatus === 'saved');
      for (const photo of savedPhotos) {
        const resolved = resolvePhotoBase64(photo.imageUrl);
        if (resolved) {
          parts.push({
            text: `Foto ${photo.code} (${photo.category}): ${photo.caption || 'Sem legenda'}`,
          });
          parts.push({
            inlineData: {
              mimeType: resolved.mimeType,
              data: resolved.data,
            },
          });
        }
      }

      const activeFindings = attendance.defectFindings.filter(
        (f) => f.reviewStatus !== 'Descartado'
      );

      const promptText = `
ATENDIMENTO: ${attendance.attendanceNumber} — ${attendance.furnitureType}
- Cliente: ${attendance.clientName}
- Tempo de uso: ${attendance.usageTime}
- Medidas aproximadas: ${attendance.approxMeasurements}
- Serviço desejado: ${attendance.desiredService}
- Preferência de tecido e conforto: ${attendance.fabricAndComfortPreference}
- Revisão do responsável concluída: ${attendance.reviewCompleted ? 'Sim' : 'Ainda preliminar'}
- Inspeção interna na oficina realizada: ${attendance.internalInspectionCompleted ? 'Sim' : 'Não'}
- Dados da inspeção de espuma na oficina: ${JSON.stringify(attendance.foamInspection)}

DEFEITOS CONSIDERADOS APÓS REVISÃO:
${activeFindings
  .map(
    (f) =>
      `- [${f.area}] (${f.origin} | Gravidade: ${f.severity} | Status: ${f.reviewStatus}): ${f.defectOrSuspicion} -> Serviço sugerido: ${f.suggestedService}`
  )
  .join('\n')}

TAREFA (SEGUNDA AVALIAÇÃO — REAPROVEITAMENTO, PROPOSTAS E PARECER PRELIMINAR):
1. Gere a tabela de avaliação de reaproveitamento para TODOS os 10 componentes obrigatórios:
   "Madeira", "Pés", "Ferragens", "Mecanismos", "Molas", "Percintas", "Espumas", "Enchimentos", "Revestimento", "Zíperes e acabamentos".
   - Classificações permitidas:
     * "Candidato a reaproveitamento, sujeito à inspeção"
     * "Recuperável com reparo, sujeito à inspeção"
     * "Substituição indicada"
     * "Decisão pendente"
   - Para espumas cobertas, registre obrigatoriamente que a inspeção presencial na oficina é necessária (deformação permanente, retorno após compressão, esfarelamento, odor e umidade).
   - NÃO apresente economia em Reais (R$) nem em percentuais (%). Descreva apenas o efeito técnico esperado no custo e onde o reaproveitamento pode gerar retrabalho.
2. Prepare as 3 propostas de reforma (ESSENCIAL, RECOMENDADA, COMPLETA), marcando se cada proposta é justificável com os dados atuais.
3. Elabore a sugestão de parecer técnico ("Reforma potencialmente vantajosa", "Reforma viável com ressalvas", "Reforma aparentemente pouco vantajosa" ou "Dados insuficientes para concluir"), sem aplicar percentual fixo universal.`;

      parts.push({ text: promptText });

      const customReuseRules = [
        store.settings.reuseAgentCustomInstructions?.trim()
          ? `DIRETRIZES DO AGENTE DE REAPROVEITAMENTO:\n${store.settings.reuseAgentCustomInstructions.trim()}`
          : '',
        store.settings.proposalAgentCustomInstructions?.trim()
          ? `DIRETRIZES DO AGENTE DE PROPOSTAS E PARECER:\n${store.settings.proposalAgentCustomInstructions.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const reuseSystemInstruction = customReuseRules
        ? `${ANALYST_SYSTEM_INSTRUCTION}\n\n${customReuseRules}`
        : ANALYST_SYSTEM_INSTRUCTION;

      const { response, usedModel: modelName } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: reuseSystemInstruction,
        lockKey: `reuse:${attendance.id}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reuseItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  component: { type: Type.STRING },
                  condition: { type: Type.STRING },
                  classification: {
                    type: Type.STRING,
                    description:
                      'Valores aceitos: "Candidato a reaproveitamento, sujeito à inspeção", "Recuperável com reparo, sujeito à inspeção", "Substituição indicada", "Decisão pendente".',
                  },
                  requiredRecovery: { type: Type.STRING },
                  approvalCriteria: { type: Type.STRING },
                  expectedCostEffect: {
                    type: Type.STRING,
                    description:
                      'Efeito qualitativo esperado no custo (PROIBIDO citar R$ ou percentuais).',
                  },
                },
                required: [
                  'component',
                  'condition',
                  'classification',
                  'requiredRecovery',
                  'approvalCriteria',
                  'expectedCostEffect',
                ],
              },
            },
            materialConsumptionAndReworkAnalysis: {
              type: Type.STRING,
              description:
                'Explicação detalhada de onde há possibilidade de reduzir consumo de material e onde o reaproveitamento pode gerar retrabalho futuro.',
            },
            proposals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tier: {
                    type: Type.STRING,
                    description: 'ESSENCIAL, RECOMENDADA ou COMPLETA',
                  },
                  title: { type: Type.STRING },
                  justifiable: { type: Type.BOOLEAN },
                  justificationNote: { type: Type.STRING },
                  services: { type: Type.ARRAY, items: { type: Type.STRING } },
                  materialsToKeep: { type: Type.ARRAY, items: { type: Type.STRING } },
                  materialsToRecover: { type: Type.ARRAY, items: { type: Type.STRING } },
                  materialsToReplace: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pendingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  benefitsAndLimitations: { type: Type.STRING },
                },
                required: [
                  'tier',
                  'title',
                  'justifiable',
                  'justificationNote',
                  'services',
                  'materialsToKeep',
                  'materialsToRecover',
                  'materialsToReplace',
                  'pendingItems',
                  'benefitsAndLimitations',
                ],
              },
            },
            opinionDraft: {
              type: Type.OBJECT,
              properties: {
                structureStateSummary: { type: Type.STRING },
                damageExtentSummary: { type: Type.STRING },
                possibleRecoverySummary: { type: Type.STRING },
                reusableMaterialsSummary: { type: Type.STRING },
                complexityLevel: {
                  type: Type.STRING,
                  description: 'Baixa, Média, Alta ou A confirmar na oficina',
                },
                expectedResultSummary: { type: Type.STRING },
                conclusion: {
                  type: Type.STRING,
                  description:
                    'Valores aceitos: "Reforma potencialmente vantajosa", "Reforma viável com ressalvas", "Reforma aparentemente pouco vantajosa", "Dados insuficientes para concluir".',
                },
                reasons: { type: Type.STRING },
                pendingFactors: { type: Type.STRING },
                whatCouldChangeConclusion: { type: Type.STRING },
                clientPlainLanguageSummary: { type: Type.STRING },
                recommendedNextStep: { type: Type.STRING },
              },
              required: [
                'structureStateSummary',
                'damageExtentSummary',
                'possibleRecoverySummary',
                'reusableMaterialsSummary',
                'complexityLevel',
                'expectedResultSummary',
                'conclusion',
                'reasons',
                'pendingFactors',
                'whatCouldChangeConclusion',
                'clientPlainLanguageSummary',
                'recommendedNextStep',
              ],
            },
          },
          required: [
            'reuseItems',
            'materialConsumptionAndReworkAnalysis',
            'proposals',
            'opinionDraft',
          ],
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('O modelo de IA retornou uma resposta vazia na avaliação de reaproveitamento.');
      }

      const parsed = JSON.parse(rawText) as {
        reuseItems: Array<{
          component: string;
          condition: string;
          classification: string;
          requiredRecovery: string;
          approvalCriteria: string;
          expectedCostEffect: string;
        }>;
        materialConsumptionAndReworkAnalysis: string;
        proposals: ReformProposal[];
        opinionDraft: Partial<FeasibilityOpinion>;
      };

      const validClassifications = [
        'Candidato a reaproveitamento, sujeito à inspeção',
        'Recuperável com reparo, sujeito à inspeção',
        'Substituição indicada',
        'Decisão pendente',
      ];

      const reuseMap = new Map<string, ReuseEvaluationItem>();
      (parsed.reuseItems || []).forEach((item, idx) => {
        const matchedComp =
          REUSE_COMPONENTS.find(
            (c) => c.toLowerCase() === item.component.trim().toLowerCase()
          ) || REUSE_COMPONENTS[idx % REUSE_COMPONENTS.length];
        const classification = validClassifications.includes(item.classification)
          ? (item.classification as ReuseEvaluationItem['classification'])
          : 'Decisão pendente';

        reuseMap.set(matchedComp, {
          id: `ru-${Date.now()}-${idx}`,
          component: matchedComp,
          condition: item.condition || 'Sujeito à abertura do estofado na oficina.',
          classification,
          requiredRecovery: item.requiredRecovery || 'Inspeção presencial na oficina.',
          approvalCriteria: item.approvalCriteria || 'Ausência de danos estruturais ou fadiga.',
          expectedCostEffect:
            item.expectedCostEffect ||
            'A definir conforme resultado da inspeção técnica presencial.',
        });
      });

      const completeReuseItems: ReuseEvaluationItem[] = REUSE_COMPONENTS.map((comp, idx) => {
        const existing = reuseMap.get(comp);
        if (existing) return existing;
        return {
          id: `ru-${Date.now()}-fallback-${idx}`,
          component: comp,
          condition:
            comp === 'Espumas'
              ? 'Espuma coberta pelo revestimento; inspeção presencial na oficina é obrigatória.'
              : 'Componente aguarda inspeção presencial na oficina.',
          classification: 'Decisão pendente',
          requiredRecovery: 'Verificar estado físico após abertura do móvel na oficina.',
          approvalCriteria: 'Integridade física, ausência de deformação, odor, umidade ou folgas.',
          expectedCostEffect: 'Impacto no custo depende de aprovação técnica na bancada.',
        };
      });

      const validConclusions = [
        'Reforma potencialmente vantajosa',
        'Reforma viável com ressalvas',
        'Reforma aparentemente pouco vantajosa',
        'Dados insuficientes para concluir',
      ];

      const draft = parsed.opinionDraft || {};
      const conclusion = validConclusions.includes(draft.conclusion || '')
        ? (draft.conclusion as FeasibilityOpinion['conclusion'])
        : 'Dados insuficientes para concluir';

      const now = new Date().toISOString();
      attendance.reuseItems = completeReuseItems;
      attendance.materialConsumptionAndReworkAnalysis =
        parsed.materialConsumptionAndReworkAnalysis || '';

      // Trava de aprovação: se a proposta atualmente selecionada já foi aprovada
      // (decisões por componente confirmadas), a nova análise nunca a sobrescreve
      // silenciosamente — o array inteiro é arquivado antes da substituição.
      const approvedProposal = attendance.proposals.find(
        (p) => p.tier === attendance.selectedProposalTier && p.approved === true
      );
      if (approvedProposal && attendance.proposals.length > 0) {
        attendance.proposalRevisions = [...(attendance.proposalRevisions || []), attendance.proposals];
        attendance.auditHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: 'Sistema',
          stage: 'Propostas de Reforma',
          action: 'Propostas anteriores arquivadas antes de nova análise',
          details: `A proposta ${approvedProposal.tier} já estava aprovada. As propostas anteriores foram preservadas em proposalRevisions antes da nova análise de reaproveitamento.`,
        });
      }
      attendance.proposals = parsed.proposals || [];
      attendance.opinion = {
        ...attendance.opinion,
        isPreliminary: !(
          attendance.internalInspectionCompleted && attendance.budget.confirmedByResponsible
        ),
        structureStateSummary:
          draft.structureStateSummary || attendance.opinion.structureStateSummary,
        damageExtentSummary:
          draft.damageExtentSummary || attendance.opinion.damageExtentSummary,
        possibleRecoverySummary:
          draft.possibleRecoverySummary || attendance.opinion.possibleRecoverySummary,
        reusableMaterialsSummary:
          draft.reusableMaterialsSummary || attendance.opinion.reusableMaterialsSummary,
        complexityLevel:
          draft.complexityLevel === 'Baixa' ||
          draft.complexityLevel === 'Média' ||
          draft.complexityLevel === 'Alta'
            ? draft.complexityLevel
            : 'A confirmar na oficina',
        expectedResultSummary:
          draft.expectedResultSummary || attendance.opinion.expectedResultSummary,
        conclusion,
        reasons: draft.reasons || attendance.opinion.reasons,
        pendingFactors: draft.pendingFactors || attendance.opinion.pendingFactors,
        whatCouldChangeConclusion:
          draft.whatCouldChangeConclusion || attendance.opinion.whatCouldChangeConclusion,
        clientPlainLanguageSummary:
          draft.clientPlainLanguageSummary || attendance.opinion.clientPlainLanguageSummary,
        recommendedNextStep:
          draft.recommendedNextStep || attendance.opinion.recommendedNextStep,
      };

      attendance.staleness = {
        ...attendance.staleness,
        reuseNeedsReview: false,
        proposalNeedsReview: false,
        opinionNeedsReview: false,
      };
      attendance.auditHistory.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        actor: `Agente Analista IA (${modelName})`,
        stage: 'Reaproveitamento e Propostas',
        action: 'Segunda avaliação de materiais e propostas gerada',
        details: 'Avaliação de 10 componentes, 3 propostas de reforma e parecer técnico.',
      });
      attendance.updatedAt = now;

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: `IA Claude (${modelName})`,
        attendance,
      });
      res.json({ ok: true, attendance });
    } catch (error) {
      console.error('Erro na avaliação de reaproveitamento:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao processar avaliação de reaproveitamento com IA.',
      });
    }
  });

  // Agente Lucas: Análise de Projeto & Modelo de Fabricação Nova (utilizando imagens reais de referência)
  app.post('/api/ai/analyze-manufacturing-project', async (req, res) => {
    try {
      const store = loadStore();
      const { attendanceId } = req.body as { attendanceId: string };
      const attendance = store.attendances.find((a) => a.id === attendanceId);
      if (!attendance) {
        res.status(404).json({ error: 'Pedido de fabricação não encontrado.' });
        return;
      }

      const savedPhotos = attendance.photos.filter((p) => p.uploadStatus === 'saved');
      if (savedPhotos.length === 0) {
        res.status(400).json({
          error:
            'Nenhuma foto de referência anexada. Adicione ao menos uma imagem do modelo ou desenho antes de solicitar a análise do Lucas IA.',
        });
        return;
      }

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      let loadedImagesCount = 0;
      for (const photo of savedPhotos) {
        const resolved = resolvePhotoBase64(photo.imageUrl);
        if (resolved) {
          loadedImagesCount++;
          parts.push({
            text: `Foto de Referência [${photo.code}] (${photo.category}) - Móvel: ${photo.furnitureLabel} - Legenda: ${photo.caption || 'Sem legenda'}`,
          });
          parts.push({
            inlineData: {
              mimeType: resolved.mimeType,
              data: resolved.data,
            },
          });
        }
      }

      if (loadedImagesCount === 0) {
        res.status(400).json({
          error: 'Não foi possível carregar os binários das imagens de referência anexadas. Verifique as fotos e tente novamente.',
        });
        return;
      }

      const briefingContext = `
DADOS DO PEDIDO DE FABRICAÇÃO SOB MEDIDA (${attendance.attendanceNumber}):
- Cliente: ${attendance.clientName || 'Não informado'}
- Tipo de Estofado: ${attendance.furnitureType || 'Estofado sob medida'}
- Quantidade do Lote: ${attendance.piecesCount || '1 unidade'}
- Medidas Desejadas pelo Cliente: ${attendance.approxMeasurements || 'A definir'}
- Acabamento e Conforto Solicitados: ${attendance.fabricAndComfortPreference || 'A definir'}
- Especificações do Briefing: ${attendance.desiredService || 'Fabricação própria artesanal sob medida'}
- Notas da Oficina: ${attendance.notes || 'Sem observações'}

TAREFA DO ENGENHEIRO DE PROJETOS LUCAS (CASTROS INTERIORES):
Examine as ${loadedImagesCount} imagens reais de referência anexadas acima e estruture o PROJETO TÉCNICO PRELIMINAR DE FABRICAÇÃO:

REGRAS DE CONFIABILIDADE TÉCNICA (INVIOLÁVEIS):
1. A foto é apenas referência para reproduzir a aparência estética do modelo.
2. DISTINGUA RIGOROSAMENTE as 4 fontes de informação:
   - "analise_imagem": o que é estritamente visível na foto (formato do braço, almofadas soltas ou fixas, rodapé ou pés, vivos de acabamento).
   - "informado_cliente" ou "informado_oficina": o que foi explicitamente informado no briefing.
   - "calculado": derivado geometricamente a partir de dados confirmados.
   - "proposta_pendente": TODAS as medidas internas, bitolas de madeira maciça, densidades de espuma (ex: D28 ou D33) e componentes não validados na bancada.
3. JAMAIS afirme conhecer medidas exatas, construção interna, ferragens ocultas ou resistência estrutural apenas pela foto.
4. NUNCA faça perguntas ou gere resultados sobre desgaste, defeitos, reaproveitamento ou danos ocultos (este pedido é FABRICAÇÃO NOVA DO ZERO).
5. Solicite formalmente todas as informações técnicas faltantes (perguntas para o cliente ou marceneiro).
6. Para tecidos, considere a largura útil comercial padrão de 1,40m e perdas justificadas entre 10% e 15%. Para espumas e madeira, registre a especificação técnica proposta pendente de validação.
`;

      parts.push({ text: briefingContext });

      const LUCAS_SYSTEM_INSTRUCTION = `Você é o AGENTE LUCAS — Engenheiro de Projetos e Fabricação de Produtos Novos da Castros Interiores.
Sua missão é desenvolver a ficha técnica do modelo, lista de peças numeradas com medidas em milímetros, plano de corte preliminar de tecidos e espumas, e manual de fabricação sequencial em 12 etapas para a marcenaria e tapeçaria.
Você é técnico, meticuloso e nunca inventa dados de estrutura interna como conhecidos apenas por fotografia.`;

      const { response, usedModel } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: LUCAS_SYSTEM_INSTRUCTION,
        lockKey: `mfg_project:${attendance.id}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectTitle: { type: Type.STRING },
            visibleFeatures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Características estéticas visíveis nas fotos de referência.',
            },
            missingTechnicalInformation: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Perguntas e dados técnicos que precisam ser confirmados com o cliente ou oficina.',
            },
            dimensionsProposal: {
              type: Type.OBJECT,
              properties: {
                widthMm: { type: Type.NUMBER },
                depthMm: { type: Type.NUMBER },
                heightMm: { type: Type.NUMBER },
                seatHeightMm: { type: Type.NUMBER },
                seatDepthMm: { type: Type.NUMBER },
                notes: { type: Type.STRING },
              },
              required: ['widthMm', 'depthMm', 'heightMm', 'seatHeightMm'],
            },
            proposedComponents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  name: { type: Type.STRING },
                  componentType: {
                    type: Type.STRING,
                    description: 'Madeira, Espuma, Revestimento, Ferragem, Sustentação ou Acessório',
                  },
                  lengthMm: { type: Type.NUMBER },
                  widthMm: { type: Type.NUMBER },
                  thicknessMm: { type: Type.NUMBER },
                  specification: { type: Type.STRING },
                  quantityPerUnit: { type: Type.NUMBER },
                  source: {
                    type: Type.STRING,
                    description: 'analise_imagem, informado_oficina, calculado ou proposta_pendente',
                  },
                },
                required: [
                  'code',
                  'name',
                  'componentType',
                  'lengthMm',
                  'widthMm',
                  'thicknessMm',
                  'specification',
                  'quantityPerUnit',
                  'source',
                ],
              },
            },
            proposedMaterials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  consumptionUnit: { type: Type.STRING },
                  requiredPerProduct: { type: Type.NUMBER },
                  usableWidthMeters: { type: Type.NUMBER },
                  justifiedLossPercent: { type: Type.NUMBER },
                  specification: { type: Type.STRING },
                  source: { type: Type.STRING },
                },
                required: [
                  'code',
                  'name',
                  'category',
                  'consumptionUnit',
                  'requiredPerProduct',
                  'specification',
                  'source',
                ],
              },
            },
            technicalDraftNotes: { type: Type.STRING },
          },
          required: [
            'projectTitle',
            'visibleFeatures',
            'missingTechnicalInformation',
            'dimensionsProposal',
            'proposedComponents',
            'proposedMaterials',
            'technicalDraftNotes',
          ],
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const now = new Date().toISOString();

      // Normalizar número de unidades do lote
      const unitsMatch = attendance.piecesCount?.match(/\d+/);
      const unitsCount = unitsMatch ? Math.max(1, parseInt(unitsMatch[0], 10)) : 1;

      // Montar objeto de projeto técnico sem dados inventados
      const currentMfg = attendance.manufacturingData || {
        id: `mfg-${Date.now()}`,
        modelName: attendance.furnitureType || 'Estofado Sob Encomenda',
        productCategory: 'Sofá Fixo' as const,
        unitsCount,
        version: 'v1.0-rascunho',
        technicalDraftStatus: 'rascunho_tecnico' as const,
        dimensions: {
          widthCm: 160,
          depthCm: 88,
          heightCm: 92,
          seatHeightCm: 45,
          seatDepthCm: 55,
          armWidthCm: 15,
          rawText: '',
          source: 'proposta_pendente' as const,
        },
        finishingWishes: attendance.fabricAndComfortPreference || '',
        workshopMethodNotes: '',
        referencePhotos: [],
        components: [],
        materials: [],
        assemblyManual: {
          modelName: attendance.furnitureType || 'Estofado Sob Encomenda',
          version: 'v1.0-rascunho',
          status: 'rascunho_tecnico' as const,
          lastUpdatedAt: now,
          referenceImages: [],
          steps: [],
          generalPreparationNotes: '',
          finalInspectionCriteria: '',
        },
        qualityCheckpoints: [],
      };

      const existingDims = currentMfg.dimensions || {
        widthCm: null,
        depthCm: null,
        heightCm: null,
        seatHeightCm: null,
        seatDepthCm: null,
        armWidthCm: 15,
        rawText: '',
        source: 'informado_cliente' as const,
      };
      const dp = parsed.dimensionsProposal || {};
      currentMfg.dimensions = {
        widthCm: dp.widthMm ? Math.round(dp.widthMm / 10) : existingDims.widthCm,
        depthCm: dp.depthMm ? Math.round(dp.depthMm / 10) : existingDims.depthCm,
        heightCm: dp.heightMm ? Math.round(dp.heightMm / 10) : existingDims.heightCm,
        seatHeightCm: dp.seatHeightMm ? Math.round(dp.seatHeightMm / 10) : existingDims.seatHeightCm,
        seatDepthCm: dp.seatDepthMm ? Math.round(dp.seatDepthMm / 10) : existingDims.seatDepthCm,
        armWidthCm: existingDims.armWidthCm || 15,
        rawText: `${dp.widthMm || 1600} x ${dp.depthMm || 880} x ${dp.heightMm || 920} mm (proposta pendente de validação)`,
        source: 'proposta_pendente',
      };
      currentMfg.unitsCount = unitsCount;

      if (Array.isArray(parsed.proposedComponents) && parsed.proposedComponents.length > 0) {
        currentMfg.components = (parsed.proposedComponents || []).map((c: any, idx: number) => ({
          id: `comp-${Date.now()}-${idx}`,
          code: c.code || `P-${String(idx + 1).padStart(2, '0')}`,
          name: c.name || `Peça ${idx + 1}`,
          componentType: (['Madeira', 'Espuma', 'Revestimento', 'Ferragem', 'Sustentação', 'Acessório'].includes(c.componentType)
            ? c.componentType
            : 'Madeira') as any,
          dimensionsMm: {
            length: Number(c.lengthMm) || null,
            width: Number(c.widthMm) || null,
            thickness: Number(c.thicknessMm) || null,
          },
          specification: c.specification || 'Especificação técnica da oficina',
          quantityPerUnit: Number(c.quantityPerUnit) || 1,
          totalQuantity: (Number(c.quantityPerUnit) || 1) * unitsCount,
          source: 'proposta_pendente',
        }));
      }

      if (Array.isArray(parsed.proposedMaterials) && parsed.proposedMaterials.length > 0) {
        currentMfg.materials = (parsed.proposedMaterials || []).map((m: any, idx: number) => {
          const reqPerProd = Number(m.requiredPerProduct) || 1;
          const totalReq = reqPerProd * unitsCount;
          const matchingCat = store.materials.find(
            (cat) => cat.code === m.code || cat.name.toLowerCase().includes(m.name.toLowerCase())
          );
          const physical = matchingCat?.physicalStock || 0;
          const reserved = matchingCat?.reservedStock || 0;
          const available = Math.max(0, physical - reserved);
          const toBuy = Math.max(0, totalReq - available);
          const costCents = matchingCat?.unitCostCents || 5500;

          return {
            id: `mat-req-${Date.now()}-${idx}`,
            materialId: matchingCat?.id,
            code: m.code || `MAT-${String(idx + 1).padStart(2, '0')}`,
            name: m.name || `Material ${idx + 1}`,
            category: (m.category === 'Mão de obra' ? 'Mão de obra' : 'Material') as any,
            consumptionUnit: m.consumptionUnit || matchingCat?.unit || 'm',
            requiredPerProduct: reqPerProd,
            totalRequired: totalReq,
            usableWidthMeters: m.usableWidthMeters || (m.consumptionUnit === 'm' ? 1.4 : undefined),
            justifiedLossPercent: m.justifiedLossPercent || (m.consumptionUnit === 'm' ? 12 : 5),
            physicalStock: physical,
            availableStock: available,
            toPurchaseQuantity: toBuy,
            effectivePurchasedQuantity: 0,
            effectiveConsumedQuantity: 0,
            unitCostCents: costCents,
            totalCostCents: Math.round(costCents * totalReq),
            purchaseDisbursementCents: Math.round(costCents * toBuy),
            source: 'proposta_pendente',
            specification: m.specification || matchingCat?.specification || 'Proposta técnica de insumo',
          };
        });
      }

      currentMfg.workshopMethodNotes = parsed.technicalDraftNotes || '';
      currentMfg.technicalDraftStatus = 'rascunho_tecnico';
      currentMfg.version = 'v1.0-rascunho';

      attendance.manufacturingData = currentMfg;
      attendance.aiPreliminarySummary = `Projeto preliminar estruturado pelo Agente Lucas (${usedModel}). ${parsed.visibleFeatures?.length || 0} características visíveis identificadas nas fotos; ${parsed.missingTechnicalInformation?.length || 0} pendências técnicas para validação da oficina.`;
      attendance.lastAiAnalysisAt = now;
      attendance.updatedAt = now;

      // Registrar histórico auditável
      attendance.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: `Lucas (Projetos & Fabricação) — ${usedModel}`,
        stage: 'Projeto Preliminar',
        action: 'Análise de fotos e modelo executada',
        details: `Ficha técnica: ${(currentMfg.components || []).length} componentes preliminares e ${(currentMfg.materials || []).length} requisitos de insumos. Todas as medidas internas mantidas como propostas pendentes de validação.`,
      });

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Lucas (Projetos IA)',
        attendance,
      });

      res.json({
        ok: true,
        usedModel,
        manufacturingData: attendance.manufacturingData,
        analysis: parsed,
        attendance,
      });
    } catch (error) {
      console.error('Erro ao analisar projeto de fabricação com Lucas IA:', error);
      const message = error instanceof Error ? error.message : 'Erro ao processar análise do modelo com Lucas IA.';
      if (message === 'LIMITE_RATE_LIMIT') {
        res.status(429).json({ error: 'Limite de requisições atingido. Tente novamente em alguns minutos.' });
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  // Specialized AI Agent Consultation Endpoint (Agente 1, Agente 2, Agente 3 + 5 Departamentos)
  app.post('/api/ai/agent-consult', async (req, res) => {
    try {
      const store = loadStore();
      const { attendanceId, agentId, customPrompt } = req.body as {
        attendanceId?: string;
        agentId:
          | 'vistoriador_defeitos'
          | 'especialista_reaproveitamento'
          | 'consultor_propostas'
          | 'julia_marketing'
          | 'carla_atendimento'
          | 'pedro_avaliacao'
          | 'ana_compras'
          | 'mila_financeiro'
          | 'lucas_projetos'
          | 'castro_estrategia'
          | 'supervisora_geral';
        customPrompt: string;
      };

      if (!customPrompt || !customPrompt.trim()) {
        res.status(400).json({ error: 'Informe a solicitação ou comando para o Agente.' });
        return;
      }

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const attendance = attendanceId
        ? store.attendances.find((a) => a.id === attendanceId)
        : undefined;

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      let loadedImagesCount = 0;
      if (attendance) {
        const savedPhotos = attendance.photos.filter((p) => p.uploadStatus === 'saved');
        for (const photo of savedPhotos) {
          const resolved = resolvePhotoBase64(photo.imageUrl);
          if (resolved) {
            loadedImagesCount++;
            parts.push({
              text: `Foto ${photo.code} (${photo.category}) - Móvel: ${photo.furnitureLabel} - Legenda: ${photo.caption || 'Sem legenda'}`,
            });
            parts.push({
              inlineData: {
                mimeType: resolved.mimeType,
                data: resolved.data,
              },
            });
          }
        }
      }

      const roleMap: Record<string, string> = {
        vistoriador_defeitos: `VOCÊ ATUA AGORA COMO: AGENTE 1 — VISTORIADOR TÉCNICO DE DEFEITOS POR ÁREA DA CASTROS INTERIORES.\n${
          store.settings.defectAgentCustomInstructions || ''
        }`,
        especialista_reaproveitamento: `VOCÊ ATUA AGORA COMO: AGENTE 2 — ESPECIALISTA DE OFICINA E REAPROVEITAMENTO DE MATERIAIS DA CASTROS INTERIORES.\n${
          store.settings.reuseAgentCustomInstructions || ''
        }`,
        consultor_propostas: `VOCÊ ATUA AGORA COMO: AGENTE 3 — CONSULTOR DE PROPOSTAS DE REFORMA E PARECER COMERCIAL DA CASTROS INTERIORES.\n${
          store.settings.proposalAgentCustomInstructions || ''
        }`,
        julia_marketing: `VOCÊ ATUA AGORA COMO: JÚLIA — DEPARTAMENTO DE MARKETING E DIVULGAÇÃO DA CASTROS INTERIORES.
Sua missão é criar estratégias de divulgação, textos de apresentação de projetos (antes/depois), legendas para Instagram, campanhas de valorização da reforma artesanal de alto padrão e conteúdos educativos para clientes da Castros Interiores, sempre respeitando a veracidade técnica sem inventar dados.
REGRAS OBRIGATÓRIAS E INEGOCIÁVEIS SOBRE PUBLICAÇÃO E MÉTRICAS:
1. Você PREPARA conteúdo (textos, peças, agendamento). Você NUNCA publica nada sozinha e NUNCA deve dizer "publiquei", "já postei" ou "está no ar" — só o status real do sistema (abaixo, em DADOS REAIS) determina isso.
2. Status "Planejada" ou "Agendada" significa que NADA foi publicado ainda. Status "Enviada Manualmente" significa que um humano confirmou que enviou na mão — não é prova de publicação pelo canal. Status "Concluída" só existe quando há confirmação registrada do serviço externo (id/link); se não houver essa confirmação nos dados reais, trate como NÃO publicado, mesmo que o status pareça "Concluída".
3. NUNCA diga que está "monitorando resultados", "acompanhando métricas" ou cite número de cliques, vendas, alcance ou resultado de teste A/B, a menos que os DADOS REAIS abaixo tragam uma métrica explícita com fonte conectada, período e data de atualização. Sem isso, diga claramente: "métricas indisponíveis — nenhum canal conectado está enviando dados de desempenho".
4. Diferencie sempre: compartilhamento manual (abre o WhatsApp com texto pronto, para a pessoa enviar) de atendimento/publicação integrada (feita automaticamente pelo sistema via API oficial conectada). Se um canal não aparecer como conectado nos DADOS REAIS, o envio nesse canal é sempre manual.
5. Você pode AJUDAR a montar uma proposta de orçamento de anúncio pago (objetivo, público, valor, duração) quando pedirem, mas essa proposta sempre nasce "Aguardando Aprovação de Orçamento" — você nunca aprova, nunca inicia o anúncio nem altera um orçamento já existente. A aprovação só acontece por um botão humano nas mesas de Helena ou Castro, nunca pelo chat.
6. Mesmo depois de aprovado, o anúncio só é veiculado de verdade quando houver uma conta de anúncios da Meta conectada (variáveis de ambiente do servidor). Sem isso, diga claramente que a veiculação está pendente de integração — nunca diga que o anúncio está no ar.
7. Se não souber o estado real de algo, diga que não tem esse dado em mãos em vez de estimar ou supor.`,
        carla_atendimento: `VOCÊ ATUA AGORA COMO: CARLA — DEPARTAMENTO DE ATENDIMENTO AO CLIENTE DA CASTROS INTERIORES.
Sua missão é realizar o acolhimento de excelência do cliente, organizar a triagem inicial (reforma, fabricação nova, compra de produto, acompanhamento ou reclamação), orientar o envio correto das fotos por ângulo, responder dúvidas com empatia e clareza, e preparar rascunhos de mensagem para o cliente.
REGRAS OBRIGATÓRIAS:
1. Faça uma pergunta de cada vez e aproveite os dados já informados — nunca peça de novo o que o cliente já disse.
2. Nunca invente orçamento, preço, desconto, prazo de entrega ou disponibilidade. Use somente o que está confirmado pelo responsável nos dados reais informados abaixo. Se faltar, diga claramente que está pendente e que vai encaminhar ao responsável.
3. Distinga sempre medida informada pelo cliente (não confirmada) de medida conferida na oficina — nunca afirme uma medida exata só por foto ou relato.
4. Nunca prometa reembolso, desconto ou nova data de entrega numa reclamação sem autorização do responsável — registre a reclamação e diga que vai encaminhar.
5. Receber uma imagem de comprovante de pagamento NUNCA significa que o pagamento foi confirmado — a confirmação é sempre da Mila, depois de conferência.
6. O WhatsApp não está integrado para envio automático: qualquer mensagem ao cliente é um rascunho para copiar, revisar e enviar manualmente.
7. Diferencie claramente, na sua resposta, o que é informação interna para o responsável do que é um rascunho de mensagem pronta para o cliente. Numa mensagem para o cliente, NUNCA inclua custos internos, margem, markup ou qualquer dado de outro cliente — só preço final aprovado, condições, prazo e status, quando já confirmados.`,
        pedro_avaliacao: `VOCÊ ATUA AGORA COMO: PEDRO — DEPARTAMENTO DE AVALIAÇÃO TÉCNICA DA CASTROS INTERIORES.
Sua missão é coordenar a vistoria técnica das 11 áreas do estofado, a inspeção de abertura em bancada na oficina, a avaliação física de espumas, madeiramento, percintas e molas, e a definição técnica das propostas de reforma.\n${
          store.settings.defectAgentCustomInstructions || ''
        }\n${store.settings.reuseAgentCustomInstructions || ''}`,
        ana_compras: `VOCÊ ATUA AGORA COMO: ANA — DEPARTAMENTO DE COMPRAS E SUPRIMENTOS DA CASTROS INTERIORES.
Sua missão é planejar a requisição de materiais (tecidos, espumas certificadas, percintas, manta siliconada, ferragens), organizar cotações junto aos fornecedores cadastrados, verificar itens com quantidade a levantar no plano de corte e evitar desperdício ou falta de insumos na oficina.`,
        mila_financeiro: `VOCÊ ATUA AGORA COMO: MILA — DEPARTAMENTO DE ADMINISTRAÇÃO FINANCEIRA DA CASTROS INTERIORES.
Sua missão é gerenciar contas a pagar e receber, fluxo de caixa previsto e realizado, composição de custos por pedido, formação de preço (margem sobre venda vs markup sobre custo), controle de parcelas e recebimentos parciais, sem jamais inventar valores e sempre separando custos de despesas.`,
        lucas_projetos: `VOCÊ ATUA AGORA COMO: LUCAS — DEPARTAMENTO DE PROJETOS E FABRICAÇÃO DE PRODUTOS NOVOS DA CASTROS INTERIORES.
Sua missão é detalhar projetos de sofás, poltronas, cadeiras, puffs e cabeceiras para fabricação sob encomenda.
Você produz fichas técnicas, lista de peças numeradas com medidas em milímetros, relação de materiais e plano de corte preliminar (com margem de perda e largura útil de tecidos), manual de montagem sequencial em 12 etapas e pontos de conferência de qualidade.
REGRA INVIOLÁVEL: Diferencie rigorosamente o que foi informado pela oficina, o que é visível na foto, o que foi calculado e o que é PROPOSTA PENDENTE DE VALIDAÇÃO TÉCNICA. Jamais invente resistência estrutural ou densidades como fatos consumados.`,
        castro_estrategia: `VOCÊ ATUA AGORA COMO: CASTRO (ROBERTO CASTRO) — DEPARTAMENTO DE ESTRATÉGIA, PLANEJAMENTO E GESTÃO DO NEGÓCIO DA CASTROS INTERIORES.
Sua missão é coordenar metas de vendas e rentabilidade, capacidade produtiva da oficina (base 80h/semana), priorização de pedidos de reforma vs novos, identificação de gargalos de produção, plano de ação semanal e recomendações estruturadas (Situação observada, Dados que sustentam, Ação proposta, Responsável sugerido, Prazo, Indicador KPI e Informações ainda necessárias). Sem dados históricos suficientes, aponte claramente como hipótese ou cenário de planejamento.`,
        supervisora_geral: `VOCÊ ATUA AGORA COMO: HELENA — SUPERVISORA GERAL DE PEDIDOS, CAMPANHAS E COMPRAS DA CASTROS INTERIORES.
Sua missão é dar o panorama de todos os pedidos de reforma e fabricação em andamento, apontar prazos em risco e mesas sem retorno recente, cobrar retornos pendentes de forma objetiva e registrável, e mediar decisões entre mesas (avaliação, compras, fabricação, financeiro, marketing). Nunca aprove ou confirme pagamentos, lançamentos financeiros ou envios em nome de outra mesa — apenas sinalize, cobre e registre.`,
      };

      const agentRoleHeader =
        roleMap[agentId] || roleMap.consultor_propostas;

      const catalogSummary = store.materials
        .map(
          (m) =>
            `- ${m.name} (${m.category}) | Unidade: ${m.unit} | Custo unitário: R$ ${(
              m.unitCostCents / 100
            ).toFixed(2)} | Fornecedor: ${m.supplier}`
        )
        .join('\n');

      const attendanceContext = attendance
        ? `
CONTEXTO DO ATENDIMENTO SELECIONADO (${attendance.attendanceNumber}):
- Cliente: ${attendance.clientName || 'não informado'} | Telefone: ${attendance.clientPhone || 'não informado'}
- Status atual: ${attendance.status} | Etapa atual: ${attendance.currentStep}/8
- Móvel: ${attendance.furnitureType || 'não informado'} (${attendance.piecesCount || 'não informado'})
- Medidas aproximadas: ${attendance.approxMeasurements || 'não informado'}
- Tempo de uso: ${attendance.usageTime || 'não informado'}
- Defeitos relatados: ${attendance.reportedDefects || 'não informado'}
- Serviço desejado: ${attendance.desiredService || 'não informado'}
- Preferência de tecido e conforto: ${attendance.fabricAndComfortPreference || 'não informado'}
- Fotos enviadas analisadas: ${loadedImagesCount}
- Resumo preliminar atual: ${attendance.aiPreliminarySummary || 'Ainda não executado'}
- Inspeção interna na oficina concluída: ${attendance.internalInspectionCompleted ? 'Sim' : 'Não'}
- Itens no orçamento deste atendimento: ${
            attendance.budget.items.length > 0
              ? attendance.budget.items
                  .map(
                    (i) =>
                      `${i.name} (${i.quantity !== null ? `${i.quantity} ${i.unit}` : i.quantityStatus})`
                  )
                  .join('; ')
              : 'Nenhum item lançado ainda'
          }
- Preço de venda definido: ${
            attendance.budget.sellingPriceCents !== null
              ? `R$ ${(attendance.budget.sellingPriceCents / 100).toFixed(2)}`
              : 'Ainda não definido pelo responsável'
          }
`
        : 'Nenhum atendimento específico selecionado (consulta departamental geral da oficina Castros Interiores).';

      parts.push({
        text: `${attendanceContext}\n\nCATÁLOGO ATUAL DE MATERIAIS E SERVIÇOS (${store.materials.length} itens):\n${catalogSummary}\n\nSOLICITAÇÃO DO OPERADOR PARA O DEPARTAMENTO / AGENTE:\n${customPrompt.trim()}`,
      });

      const { response, usedModel } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: `${ANALYST_SYSTEM_INSTRUCTION}\n\n${agentRoleHeader}`,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agentTitle: {
              type: Type.STRING,
              description: 'Título do Agente Especialista que respondeu.',
            },
            technicalAnalysis: {
              type: Type.STRING,
              description: 'Diagnóstico ou resposta técnica detalhada para a equipe da Castros Interiores.',
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de passos práticos recomendados para a oficina ou atendimento.',
            },
            clientMessageSuggestion: {
              type: Type.STRING,
              description: 'Sugestão de mensagem clara e profissional pronta para enviar ao cliente (ex: via WhatsApp), sem jargões excessivos e respeitando que estrutura interna depende de desmontagem.',
            },
          },
          required: [
            'agentTitle',
            'technicalAnalysis',
            'recommendedActions',
            'clientMessageSuggestion',
          ],
        },
      });

      const parsed = JSON.parse(response.text || '{}');

      if (attendance) {
        const now = new Date().toISOString();
        attendance.auditHistory.unshift({
          id: `log-${Date.now()}`,
          timestamp: now,
          actor: `${parsed.agentTitle || 'Agente Especialista IA'} (${usedModel})`,
          stage: 'Central de Agentes',
          action: 'Consulta ao Agente Especialista executada',
          details: customPrompt.trim().slice(0, 140),
        });
        attendance.updatedAt = now;
        saveStore(store);
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: now,
          sourceStationName: parsed.agentTitle || 'Agente IA',
          attendance,
        });
      }

      res.json({
        ok: true,
        usedModel,
        result: parsed,
        attendance,
      });
    } catch (error) {
      console.error('Erro na consulta ao Agente Especialista:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao consultar o Agente Especialista com IA.',
      });
    }
  });

  // ============================================================================
  // DEPARTAMENTO JÚLIA MARKETING, PUBLICIDADE E DIVULGAÇÃO (INDEPENDENTE)
  // Recebe fotos direto do celular sem depender de atendimento ativo.
  // Sem avaliação técnica, sem materiais, sem defeitos e sem custos internos.
  // ============================================================================
  const JULIA_MARKETING_SYSTEM_INSTRUCTION = `Você é a JÚLIA, diretora do departamento de Marketing, Publicidade e Divulgação da Castros Interiores.
Sua missão exclusiva é criar e aperfeiçoar campanhas publicitárias, as 12 etapas do Anúncio Inteligente, Pôsteres promocionais, Carrosséis de engajamento, Catálogos digitais de portfólio, programação de campanhas, comunicação por voz/texto com a equipe e Relatórios Diários de divulgação.

REGRAS ESTRITAS E INEGOCIÁVEIS DA JÚLIA:
1. PROIBIDO incluir avaliação técnica de defeitos, diagnóstico estrutural, lista de materiais de oficina, defeitos ou custos/orçamentos internos.
2. Foque 100% em valorização estética, design de interiores, conforto, estilo, elegância artesanal, desejo de compra, posicionamento de marca da Castros Interiores e engajamento em redes sociais (Instagram, WhatsApp, Facebook).
3. Use linguagem publicitária refinada, acolhedora e persuasiva em português do Brasil.
4. Você PREPARA conteúdo (textos, peças, agendamento). Você NUNCA publica nada sozinha e NUNCA deve dizer "publiquei", "já postei" ou "está no ar" — só o status real do sistema determina isso. "Planejada"/"Agendada" significa que nada foi publicado; "Enviada Manualmente" é só uma autodeclaração humana, não prova de publicação; "Concluída" só existe com confirmação registrada do canal externo.
5. NUNCA diga que está "monitorando resultados" ou cite cliques/vendas/alcance sem uma métrica real, com fonte conectada, período e data de atualização nos dados fornecidos. Sem isso, diga "métricas indisponíveis".
6. Você pode AJUDAR a montar uma proposta de orçamento de anúncio pago (objetivo, público, valor, duração), mas essa proposta sempre nasce "Aguardando Aprovação de Orçamento" — você nunca aprova, nunca inicia o anúncio nem altera um orçamento existente; aprovação só acontece por um botão humano nas mesas de Helena ou Castro. Mesmo aprovado, só é veiculado de verdade com uma conta de anúncios da Meta conectada — sem isso, diga que está pendente de integração.`;

  app.get('/api/julia', (_req, res) => {
    const store = loadStore();
    if (!store.juliaData) {
      store.juliaData = getDefaultJuliaData();
      saveStore(store);
    }
    res.json({ ok: true, juliaData: store.juliaData });
  });

  app.get('/api/julia/integrations-status', (_req, res) => {
    const hasInstagramApi = Boolean(
      process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN &&
        process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
    );
    const hasFacebookApi = Boolean(
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID
    );
    // A variável real usada para enviar/verificar o WhatsApp é YCLOUD_API_KEY +
    // YCLOUD_WHATSAPP_FROM (ver sendWhatsAppMessage/checkYCloudWhatsAppConnection
    // acima) — a integração roda via YCloud (BSP), não mais direto na Graph API.
    const hasWhatsAppCloudApi = Boolean(
      process.env.YCLOUD_API_KEY && process.env.YCLOUD_WHATSAPP_FROM
    );

    res.json({
      ok: true,
      integrations: {
        instagram: {
          connected: hasInstagramApi,
          autoPublishSupported: hasInstagramApi,
          statusMessage: hasInstagramApi
            ? 'Integração oficial Instagram Graph API ativa.'
            : 'Publicação planejada. Envio manual necessário.',
        },
        facebook: {
          connected: hasFacebookApi,
          autoPublishSupported: hasFacebookApi,
          statusMessage: hasFacebookApi
            ? 'Integração oficial Facebook Graph API ativa.'
            : 'Publicação planejada. Envio manual necessário.',
        },
        whatsapp: {
          connected: hasWhatsAppCloudApi,
          autoPublishSupported: hasWhatsAppCloudApi,
          directShareSupported: true,
          statusMessage: hasWhatsAppCloudApi
            ? 'Integração oficial WhatsApp Business Cloud API ativa.'
            : 'Publicação planejada. Envio manual necessário.',
        },
      },
    });
  });

  app.put('/api/julia', (req, res) => {
    const store = loadStore();
    const incoming = req.body as Partial<JuliaDepartmentData>;
    const current = store.juliaData || getDefaultJuliaData();
    store.juliaData = {
      ...current,
      ...incoming,
    };

    // Toda publicação marcada 'Agendada' (modo automático, integração oficial já
    // conectada no servidor) precisa de uma BackgroundTask real vinculada — nunca
    // basta o status no calendário. Idempotente: cada item de campanha só recebe
    // uma tarefa (idempotencyKey = o próprio id do item).
    if (Array.isArray(store.juliaData.campaigns)) {
      store.juliaData.campaigns = store.juliaData.campaigns.map((camp) => {
        if (camp.status === 'Agendada' && !camp.backgroundTaskId) {
          const channel = mapChannelToIntegrationKey(camp.channel);
          const task = createBackgroundTask(store, {
            type: 'publicar_campanha',
            agentId: 'julia_marketing',
            action: `Publicar "${camp.title}" em ${camp.channel}`,
            authorization: `Agendamento automático solicitado via painel por ${
              (req.headers['x-station-name'] as string) || 'estação não identificada'
            }`,
            scheduledFor: `${camp.scheduledDate}T${camp.scheduledTime || '00:00'}:00`,
            relatedCampaignId: camp.projectId,
            channel,
            idempotencyKey: `julia-publicar-${camp.id}`,
            createdBy: (req.headers['x-station-name'] as string) || undefined,
            payload: { scheduleItemId: camp.id },
          });
          return { ...camp, backgroundTaskId: task.id };
        }
        return camp;
      });
    }

    saveStore(store);
    broadcastRealtimeEvent({
      type: 'julia:updated',
      timestamp: new Date().toISOString(),
      sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
      sourceStationName: (req.headers['x-station-name'] as string) || 'Júlia Marketing',
      juliaData: store.juliaData,
    });
    res.json({ ok: true, juliaData: store.juliaData });
  });

  // --------------------------------------------------------------------------
  // ANÚNCIOS PAGOS — proposta de orçamento sempre nasce travada; só uma rota
  // separada, acionada por um botão humano (nunca pelo chat da Júlia), pode
  // aprovar. Ver PaidAdBudgetProposal em types.ts e o plano aprovado desta
  // funcionalidade.
  // --------------------------------------------------------------------------

  app.post('/api/julia/paid-ads/propose', (req, res) => {
    const store = loadStore();
    if (!store.juliaData) store.juliaData = getDefaultJuliaData();
    const {
      projectId,
      campaignScheduleItemId,
      objective,
      targetAudienceDescription,
      budgetCents,
      budgetPeriod,
      durationDays,
      channel,
      proposedBy,
    } = req.body as {
      projectId: string;
      campaignScheduleItemId?: string;
      objective: PaidAdObjective;
      targetAudienceDescription: string;
      budgetCents: number;
      budgetPeriod: 'diario' | 'total';
      durationDays: number;
      channel: JuliaCampaignScheduleItem['channel'];
      proposedBy?: string;
    };

    if (
      !projectId ||
      !objective ||
      !targetAudienceDescription?.trim() ||
      !budgetCents ||
      budgetCents <= 0 ||
      !budgetPeriod ||
      !durationDays ||
      durationDays <= 0 ||
      !channel
    ) {
      res.status(400).json({
        error:
          'Campos obrigatórios ausentes ou inválidos para propor um orçamento de anúncio pago (objetivo, público-alvo, orçamento, período, duração e canal).',
      });
      return;
    }

    const now = new Date().toISOString();
    const proposal: PaidAdBudgetProposal = {
      id: `paidad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      campaignScheduleItemId,
      objective,
      targetAudienceDescription: targetAudienceDescription.trim(),
      budgetCents,
      budgetPeriod,
      durationDays,
      channel,
      status: 'aguardando_aprovacao',
      proposedBy: proposedBy || (req.headers['x-station-name'] as string) || 'Estação não identificada',
      proposedAt: now,
      createdAt: now,
    };

    if (!store.juliaData.paidAdProposals) store.juliaData.paidAdProposals = [];
    store.juliaData.paidAdProposals.push(proposal);
    saveStore(store);
    res.json({ ok: true, proposal });
  });

  app.post('/api/julia/paid-ads/:id/approve', (req, res) => {
    const store = loadStore();
    const proposal = store.juliaData?.paidAdProposals?.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Proposta de anúncio pago não encontrada.' });
      return;
    }
    if (proposal.status !== 'aguardando_aprovacao') {
      res.status(400).json({
        error: `Esta proposta já está em estado "${proposal.status}" e não pode ser aprovada novamente.`,
      });
      return;
    }

    const { approvedBy, notes } = req.body as { approvedBy?: string; notes?: string };
    const approver = approvedBy || (req.headers['x-station-name'] as string);
    if (!approver || !approver.trim()) {
      res.status(400).json({
        error: 'É obrigatório identificar quem está aprovando este orçamento (approvedBy).',
      });
      return;
    }

    const now = new Date().toISOString();
    proposal.approval = {
      approved: true,
      approvedBy: approver,
      approvedAt: now,
      notes: notes || '',
    };
    proposal.status = 'aprovado';

    const task = createBackgroundTask(store, {
      type: 'iniciar_campanha_paga',
      agentId: 'julia_marketing',
      action: `Iniciar anúncio pago (${proposal.objective}) aprovado por ${approver}`,
      authorization: `Orçamento de R$ ${(proposal.budgetCents / 100).toFixed(2)} (${proposal.budgetPeriod}) aprovado por ${approver} em ${now}`,
      scheduledFor: now,
      relatedCampaignId: proposal.projectId,
      idempotencyKey: `paidad-iniciar-${proposal.id}`,
      payload: { paidAdProposalId: proposal.id },
      createdBy: approver,
    });
    proposal.backgroundTaskId = task.id;

    saveStore(store);
    res.json({ ok: true, proposal });
  });

  app.post('/api/julia/paid-ads/:id/reject', (req, res) => {
    const store = loadStore();
    const proposal = store.juliaData?.paidAdProposals?.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Proposta de anúncio pago não encontrada.' });
      return;
    }
    if (proposal.status !== 'aguardando_aprovacao') {
      res.status(400).json({
        error: `Esta proposta já está em estado "${proposal.status}" e não pode ser rejeitada.`,
      });
      return;
    }

    const { rejectedBy, notes } = req.body as { rejectedBy?: string; notes?: string };
    const rejecter = rejectedBy || (req.headers['x-station-name'] as string);
    if (!rejecter || !rejecter.trim()) {
      res.status(400).json({ error: 'É obrigatório identificar quem está rejeitando esta proposta (rejectedBy).' });
      return;
    }

    const now = new Date().toISOString();
    proposal.approval = {
      approved: false,
      approvedBy: rejecter,
      approvedAt: now,
      notes: notes || '',
    };
    proposal.status = 'rejeitado';

    saveStore(store);
    res.json({ ok: true, proposal });
  });

  // --------------------------------------------------------------------------
  // TAREFAS EM SEGUNDO PLANO (BackgroundTask)
  // --------------------------------------------------------------------------

  app.get('/api/tasks', (req, res) => {
    const store = loadStore();
    const { agentId, status } = req.query as { agentId?: string; status?: string };
    let tasks = store.backgroundTasks || [];
    if (agentId) tasks = tasks.filter((t) => t.agentId === agentId);
    if (status) tasks = tasks.filter((t) => t.status === status);
    res.json({ ok: true, tasks });
  });

  app.post('/api/tasks', (req, res) => {
    const store = loadStore();
    const body = req.body as {
      type: BackgroundTask['type'];
      agentId: DepartmentId;
      action: string;
      authorization: string;
      scheduledFor: string;
      relatedOrderId?: string;
      relatedCampaignId?: string;
      channel?: BackgroundTask['channel'];
      idempotencyKey?: string;
      maxAttempts?: number;
      payload?: Record<string, unknown>;
    };
    if (!body.type || !body.agentId || !body.action || !body.authorization || !body.scheduledFor) {
      res.status(400).json({ error: 'Campos obrigatórios ausentes para criar a tarefa.' });
      return;
    }
    const task = createBackgroundTask(store, {
      ...body,
      idempotencyKey: body.idempotencyKey || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdBy: (req.headers['x-station-name'] as string) || undefined,
    });
    saveStore(store);
    res.json({ ok: true, task });
  });

  app.post('/api/tasks/:id/cancel', (req, res) => {
    const store = loadStore();
    const task = (store.backgroundTasks || []).find((t) => t.id === req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Tarefa não encontrada.' });
      return;
    }
    if (task.status === 'concluida' || task.status === 'falhou') {
      res.status(400).json({ error: `Tarefa já está em estado definitivo (${task.status}) e não pode ser cancelada.` });
      return;
    }
    task.status = 'cancelada';
    task.completedAt = new Date().toISOString();
    saveStore(store);
    res.json({ ok: true, task });
  });

  // Alvo do gatilho externo (Cloud Scheduler) que mantém a fila avançando mesmo
  // com o app fechado e sem ninguém olhando a tela. Protegido por um segredo que
  // só existe como variável de ambiente do servidor — nunca pedido pelo chat nem
  // enviado pelo navegador. Ver documentação de configuração do Cloud Scheduler.
  app.post('/api/tasks/process-due', async (req, res) => {
    const expectedSecret = process.env.BACKGROUND_TASKS_SECRET;
    if (!expectedSecret) {
      res.status(503).json({
        error:
          'BACKGROUND_TASKS_SECRET não configurado no ambiente do servidor. A fila de tarefas em segundo plano existe, mas não está sendo processada automaticamente até essa variável ser definida e um gatilho externo (ex.: Cloud Scheduler) ser configurado para chamar esta rota periodicamente.',
      });
      return;
    }
    const providedSecret = req.headers['x-tasks-secret'];
    if (providedSecret !== expectedSecret) {
      res.status(403).json({ error: 'Segredo inválido.' });
      return;
    }
    if (isWriteMaintenanceModeActive()) {
      // Checado ANTES de executar qualquer tarefa — não só antes de salvar.
      // Uma tarefa devida pode ter um efeito colateral externo real (ex.:
      // enviar uma mensagem de WhatsApp de resposta automática); bloquear
      // só o saveStore() do final deixaria esse envio acontecer sem
      // nenhum jeito de registrar que aconteceu. O Cloud Scheduler, que
      // chama esta rota periodicamente, trata 503 como "tentar de novo
      // depois" conforme a própria política de retentativa configurada.
      res.status(503).json({
        error: MAINTENANCE_MODE_ERROR_MESSAGE,
      });
      return;
    }
    const store = loadStore();
    const outcomes = await processDueBackgroundTasks(store);
    res.json({ ok: true, processed: outcomes.length, outcomes });
  });

  // Correção pontual e idempotente: appState/main passou do limite de 1MB do
  // Firestore (quase todo o excesso era o campo juliaData), travando toda
  // gravação nova — incluindo o webhook do WhatsApp. server.ts já não lê/
  // escreve mais juliaData nesse documento único (ver FIRESTORE_JULIA_DOC),
  // mas o campo antigo precisa ser removido explicitamente para o documento
  // voltar a caber no limite. Roda direto no servidor (credenciais do
  // próprio Cloud Run, já comprovadamente funcionando) em vez de depender de
  // login/ADC fora daqui. Protegida pelo mesmo segredo do Scheduler — não
  // precisa de outro. Rodar de novo depois de já ter rodado é inofensivo
  // (não acha mais o campo, não faz nada).
  app.post('/api/admin/migrate-julia-data-to-own-doc', async (req, res) => {
    const expectedSecret = process.env.BACKGROUND_TASKS_SECRET;
    if (!expectedSecret) {
      res.status(503).json({ error: 'BACKGROUND_TASKS_SECRET não configurado.' });
      return;
    }
    if (req.headers['x-tasks-secret'] !== expectedSecret) {
      res.status(403).json({ error: 'Segredo inválido.' });
      return;
    }
    try {
      const mainRef = db.collection(FIRESTORE_STORE_COLLECTION).doc(FIRESTORE_STORE_DOC);
      const mainSnap = await mainRef.get();
      if (!mainSnap.exists) {
        res.json({ ok: true, action: 'nenhum_documento', message: 'appState/main não existe.' });
        return;
      }
      const mainData = mainSnap.data() || {};
      const mainBytesBefore = Buffer.byteLength(JSON.stringify(mainData), 'utf-8');
      if (!('juliaData' in mainData)) {
        res.json({
          ok: true,
          action: 'ja_migrado',
          mainBytesBefore,
          message: 'appState/main já não tem o campo juliaData.',
        });
        return;
      }
      const juliaData = (mainData as Record<string, unknown>).juliaData;
      const juliaBytes = Buffer.byteLength(JSON.stringify(juliaData ?? null), 'utf-8');
      await db
        .collection(FIRESTORE_STORE_COLLECTION)
        .doc(FIRESTORE_JULIA_DOC)
        .set({ juliaData, savedAt: new Date().toISOString() });
      await mainRef.update({ juliaData: FieldValue.delete() });
      const mainSnapAfter = await mainRef.get();
      const mainBytesAfter = Buffer.byteLength(JSON.stringify(mainSnapAfter.data() || {}), 'utf-8');
      res.json({
        ok: true,
        action: 'migrado',
        juliaBytes,
        mainBytesBefore,
        mainBytesAfter,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: errorMessage });
    }
  });

  // --------------------------------------------------------------------------
  // WEBHOOK OFICIAL DO WHATSAPP (via YCloud, Provedor de Soluções/BSP da Meta)
  // — recebe mensagens reais de clientes e as entrega à Carla. Totalmente
  // implementado, mas SÓ funciona quando o usuário configurar as credenciais
  // reais como variáveis de ambiente do servidor (nunca pelo chat):
  // YCLOUD_WEBHOOK_SECRET, YCLOUD_API_KEY, YCLOUD_WHATSAPP_FROM, e registrar
  // esta URL como endpoint de webhook no painel da YCloud (Developers >
  // Webhook). Sem elas, esta rota nunca recebe tráfego real.
  // --------------------------------------------------------------------------

  // Verifica a assinatura HMAC-SHA256 dos webhooks da YCloud (cabeçalho
  // "YCloud-Signature: t=<timestamp>,s=<hex>"), usando sempre os bytes crus do
  // corpo (nunca o JSON reserializado — espaços/ordem de chaves mudam o hash)
  // e comparação em tempo constante. Tolerância de 5 minutos contra replay,
  // igual ao exemplo oficial da documentação da YCloud.
  function verifyYCloudWebhookSignature(
    rawBody: Buffer | undefined,
    header: string | undefined,
    secret: string
  ): boolean {
    if (!rawBody || !header) return false;
    const fields = header.split(',').map((part) => part.trim().split('='));
    const timestamps = fields.filter(([key]) => key === 't').map(([, value]) => value);
    const signatures = fields.filter(([key]) => key === 's').map(([, value]) => value);
    if (timestamps.length !== 1 || !timestamps[0] || !/^\d+$/.test(timestamps[0])) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamps[0])) > 300) return false;
    const expected = crypto.createHmac('sha256', secret).update(timestamps[0] + '.').update(rawBody).digest();
    return signatures.some((signature) => {
      if (!signature || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
      const sigBuf = Buffer.from(signature, 'hex');
      return sigBuf.length === expected.length && crypto.timingSafeEqual(expected, sigBuf);
    });
  }

  app.post('/api/webhooks/whatsapp', async (req, res) => {
    const webhookSecret = process.env.YCLOUD_WEBHOOK_SECRET;

    // Sem YCLOUD_WEBHOOK_SECRET configurada, não há como verificar que a
    // chamada é mesmo da YCloud — processar mesmo assim aceitaria qualquer
    // POST de qualquer origem como se fosse mensagem real de cliente (a URL
    // do webhook é pública, conhecida). Mesmo padrão já usado em todo o resto
    // do app para configuração ausente (ver getAnthropicApiKey/getGeminiApiKey):
    // rejeita explicitamente, nunca processa "no escuro".
    if (!webhookSecret) {
      // Sem mensagem de cliente em jogo aqui (a chamada já é rejeitada) — o
      // registro é só para diagnóstico, por isso gravação local best-effort
      // (saveStore) é suficiente; não precisa esperar o Firestore para
      // responder 401.
      const store = loadStore();
      recordWhatsAppWebhookEvent(store, {
        signatureStatus: 'rejeitado_sem_app_secret',
        entryCount: 0,
        messagesFound: 0,
        messagesProcessed: 0,
        messagesDuplicated: 0,
        attendanceIdsTouched: [],
        errorMessage: 'YCLOUD_WEBHOOK_SECRET não configurada no servidor — evento rejeitado sem verificar assinatura.',
      });
      try {
        saveStore(store);
      } catch {
        // best-effort (ex.: janela de manutenção ativa) — a rejeição de
        // segurança abaixo precisa acontecer de qualquer forma.
      }
      res.sendStatus(401);
      return;
    }

    const signatureHeader = req.headers['ycloud-signature'] as string | undefined;
    const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
    const signatureValid = verifyYCloudWebhookSignature(rawBody, signatureHeader, webhookSecret);

    // MODO TEMPORÁRIO (ver conversa com o suporte da YCloud em andamento): o
    // formato de assinatura documentado pela YCloud (HMAC-SHA256 de
    // "timestamp.corpo" com o secret do endpoint) não bate com o que eles
    // realmente enviam — testado exaustivamente (secret confirmado idêntico
    // via API, corpo e timestamp corretos, várias variações de formato,
    // nenhuma bate). Enquanto o suporte deles não esclarece, processamos a
    // mensagem mesmo sem poder confirmar a assinatura — NUNCA chamado de
    // "valida" no diagnóstico, pra ficar visível que a verificação real está
    // efetivamente desligada. Assim que a YCloud confirmar o formato certo,
    // reverter para rejeitar (como nas revisões anteriores desta rota).
    const signatureStatus: WhatsAppWebhookSignatureStatus = signatureValid
      ? 'valida'
      : 'invalida_processada_mesmo_assim';
    if (!signatureValid) {
      console.warn(
        '[WhatsApp Webhook] Assinatura não confere (modo temporário: processando mesmo assim — ver aviso no diagnóstico).'
      );
    }

    // Extrai as mensagens do payload ANTES de tocar em qualquer estado — a
    // leitura real do store acontece dentro da transação (claimWhatsAppMessages
    // Transactionally), nunca aqui, para garantir que o dedup e a gravação
    // vejam sempre o estado mais recente no momento exato do commit, não um
    // snapshot local possivelmente desatualizado.
    let entryCount = 0;
    let parseErrorMessage: string | undefined;
    const incomingMessages: Array<{
      value: { contacts?: Array<{ profile?: { name?: string }; referral?: Record<string, unknown> }> };
      msg: Record<string, unknown>;
    }> = [];
    try {
      // A YCloud entrega UM evento por chamada (não um lote estilo
      // entry[].changes[].value.messages[] da Meta). Só
      // "whatsapp.inbound_message.received" vira mensagem de atendimento aqui
      // — outros tipos (status de entrega, preferência de marketing, SMS,
      // etc.) são reconhecidos e ignorados silenciosamente, mas ainda recebem
      // 200 OK pra YCloud não reentregar o mesmo evento à toa.
      const event = req.body as {
        type?: string;
        whatsappInboundMessage?: Record<string, unknown>;
      };
      if (event?.type === 'whatsapp.inbound_message.received' && event.whatsappInboundMessage) {
        entryCount = 1;
        const inbound = event.whatsappInboundMessage;
        // externalMessageId precisa ser o wamid (ID original na própria rede
        // do WhatsApp) e não o "id" interno da YCloud — é esse valor que já
        // era usado como chave de dedup/documento do Firestore desde a
        // integração direta com a Meta, e reentregas do mesmo wamid (de
        // qualquer provedor) precisam continuar batendo na mesma chave.
        const wamid = (inbound.wamid as string | undefined) || (inbound.id as string | undefined);
        if (wamid) {
          incomingMessages.push({
            value: {
              contacts: [
                {
                  profile: { name: (inbound.customerProfile as { name?: string } | undefined)?.name },
                  referral: inbound.referral as Record<string, unknown> | undefined,
                },
              ],
            },
            msg: { ...inbound, id: wamid },
          });
        }
      }
    } catch (err) {
      parseErrorMessage = err instanceof Error ? err.message : String(err);
      console.error('[WhatsApp Webhook] Erro ao interpretar payload recebido:', err);
    }
    const messagesFound = incomingMessages.length;

    // Transação do Firestore: lê fresco, reivindica (reaproveitando
    // handleInboundWhatsAppMessage) e escreve de volta — tudo atômico, com
    // timeout para nunca travar a resposta (ver claimWhatsAppMessages
    // Transactionally para o porquê disto fechar as duas falhas revisadas
    // nesta sessão: resultado incerto após timeout, e concorrência entre
    // instâncias/chamadas).
    const transactionResult = await claimWhatsAppMessagesTransactionally(incomingMessages, FIRESTORE_SYNC_AWAIT_TIMEOUT_MS);

    if (!transactionResult.ok || parseErrorMessage) {
      // Nada foi commitado no Firestore (fonte durável) — não existe
      // "mensagem processada" sem isso. Responder 200 aqui diria à Meta
      // "não precisa reentregar" sobre algo que não existe em nenhuma cópia
      // durável; por isso HTTP 503. O disco local NÃO é tocado agora — se a
      // transação abandonada (por timeout) ainda commitar depois, ela
      // mesma garante não duplicar nada (ver comentário da função);
      // continuar sem gravar aqui evita que esta instância fique com um
      // cache local inconsistente com o que pode vir a existir no Firestore.
      const combinedError = parseErrorMessage || transactionResult.errorMessage;
      console.error(
        `[WhatsApp Webhook] Reivindicação transacional falhou (${combinedError}) — respondendo erro para a Meta reentregar; nenhuma mensagem foi marcada como concluída.`
      );
      // Ainda registra o evento no diagnóstico — best-effort, numa cópia
      // local independente (não afeta a decisão de dedup, só visibilidade).
      const diagnosticOnlyStore = loadStore();
      recordWhatsAppWebhookEvent(diagnosticOnlyStore, {
        signatureStatus,
        entryCount,
        messagesFound,
        messagesProcessed: 0,
        messagesDuplicated: 0,
        attendanceIdsTouched: [],
        errorMessage: combinedError || 'Reivindicação transacional falhou — reentrega esperada.',
        firestoreSyncError: transactionResult.errorMessage,
      });
      try {
        writeStoreToLocalDisk(diagnosticOnlyStore);
      } catch {
        // best-effort — só para visibilidade no diagnóstico, não é a falha principal.
      }
      res.sendStatus(503);
      return;
    }

    // Sucesso confirmado pelo Firestore — agora sim atualiza o cache local
    // (best-effort: se falhar, o Firestore já é a fonte de verdade) e
    // registra o evento no mesmo snapshot que acabou de ser commitado.
    const mergedStore = transactionResult.mergedStore as PersistentStore;
    recordWhatsAppWebhookEvent(mergedStore, {
      signatureStatus,
      entryCount,
      messagesFound,
      messagesProcessed: transactionResult.messagesProcessed,
      messagesDuplicated: transactionResult.messagesDuplicated,
      attendanceIdsTouched: transactionResult.attendanceIdsTouched,
    });
    try {
      writeStoreToLocalDisk(mergedStore);
    } catch (err) {
      console.error(
        '[Store] Firestore confirmado, mas a cópia local (cache) falhou — sem perda de dado:',
        err instanceof Error ? err.message : err
      );
    }
    // A entrada de diagnóstico (log do evento) foi adicionada DEPOIS do
    // commit da transação — só existe localmente até aqui. Sincroniza em
    // segundo plano (fire-and-forget, best-effort, como saveStore()), e só a
    // chave do log em si — a mensagem/atendimento já estão duráveis desde a
    // transação acima, não precisam ser regravados, e não gravar as outras
    // chaves evita sobrescrever por cima do que outra rota tenha mudado
    // nesse meio-tempo.
    void persistStoreKeysTransactionally(mergedStore, {
      changedTopLevelKeys: ['whatsappWebhookLog'],
      attendanceUpdates: [],
      attendanceDeletes: [],
      agentChatNewMessages: {},
    });

    res.sendStatus(200);

    // Atualiza a mesa da Carla (e qualquer outro dispositivo já aberto) ao vivo —
    // antes, a mensagem era salva mas só aparecia depois de um F5 manual. Isto
    // acontece depois da resposta por ser só uma notificação best-effort — o
    // dado em si já está persistido com segurança no passo acima.
    for (const attendanceId of transactionResult.attendanceIdsTouched) {
      const attendance = mergedStore.attendances.find((a) => a.id === attendanceId);
      if (attendance) {
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: new Date().toISOString(),
          sourceStationName: 'WhatsApp (webhook)',
          attendance,
        });
      }
    }
  });

  // Diagnóstico do WhatsApp para Configurações — só presença de variável (nunca o
  // valor), último evento de webhook recebido e os mais recentes. Leitura rápida,
  // sem chamada de rede: serve para abrir a tela sem custo nem demora.
  app.get('/api/whatsapp/diagnostics', (_req, res) => {
    const store = loadStore();
    const log = store.whatsappWebhookLog || [];
    res.json({
      ok: true,
      config: {
        webhookSecret: Boolean(process.env.YCLOUD_WEBHOOK_SECRET),
        apiKey: Boolean(process.env.YCLOUD_API_KEY),
        fromNumber: Boolean(process.env.YCLOUD_WHATSAPP_FROM),
      },
      webhookCallbackPath: '/api/webhooks/whatsapp',
      integrationStatus: store.settings.integrations?.whatsapp || null,
      lastEvent: log[0] || null,
      recentEvents: log.slice(0, 10),
      // Acima do limite, o backup no Firestore (restaurado quando a instância
      // do Cloud Run sobe sem disco local) passa a falhar silenciosamente —
      // ver persistStoreKeysTransactionally(). nearLimit vira o aviso visível aqui.
      // juliaData tem documento (e orçamento de 1MB) próprio desde a
      // separação de appState/juliaData — reportado à parte, nunca mais
      // somado ao de appState/main.
      firestoreBackup: getFirestoreStoreSizeInfo(store),
      juliaDataBackup: getJuliaDataSizeInfo(store),
    });
  });

  // Checagem viva (chama a Graph API de verdade) — separada da leitura acima pra
  // não fazer uma chamada de rede toda vez que alguém só abre Configurações.
  app.post('/api/whatsapp/diagnostics/verify-connection', async (_req, res) => {
    const store = loadStore();
    const result = await checkIntegrationConnection('whatsapp');
    if (!store.settings.integrations) store.settings.integrations = {};
    store.settings.integrations.whatsapp = {
      state: result.state,
      lastCheckedAt: new Date().toISOString(),
      errorMessage: result.ok ? undefined : result.message,
      accountLabel: result.accountLabel,
    };
    saveStore(store);
    res.json({ ok: true, result: store.settings.integrations.whatsapp });
  });

  // Checagem viva (chama a Graph API de verdade) para Instagram/Facebook — mesmo
  // padrão exato da rota de verificação do WhatsApp acima, só parametrizada por canal.
  app.post('/api/integrations/:channel/verify-connection', async (req, res) => {
    const { channel } = req.params as { channel: string };
    if (channel !== 'instagram' && channel !== 'facebook') {
      res.status(400).json({ error: 'Canal inválido. Use "instagram" ou "facebook".' });
      return;
    }
    const store = loadStore();
    const result = await checkIntegrationConnection(channel);
    if (!store.settings.integrations) store.settings.integrations = {};
    store.settings.integrations[channel] = {
      state: result.state,
      lastCheckedAt: new Date().toISOString(),
      errorMessage: result.ok ? undefined : result.message,
      accountLabel: result.accountLabel,
    };
    saveStore(store);
    res.json({ ok: true, result: store.settings.integrations[channel] });
  });

  // Configura o template de WhatsApp aprovado pela Meta usado no disparo automático em
  // massa (Lista de Transmissão) — nunca aceita texto livre nesse fluxo; só o nome do
  // template, que precisa já existir aprovado no WhatsApp Business Manager/YCloud.
  app.put('/api/settings/julia-whatsapp-template', (req, res) => {
    const { name, languageCode, hasImageHeader, bodyVariableName, actorName } = req.body as {
      name?: string;
      languageCode?: string;
      hasImageHeader?: boolean;
      bodyVariableName?: string;
      actorName?: string;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Informe o nome do template aprovado pela Meta.' });
      return;
    }
    const store = loadStore();
    store.settings.juliaWhatsappBroadcastTemplate = {
      name: name.trim(),
      languageCode: (languageCode || 'pt_BR').trim(),
      hasImageHeader: Boolean(hasImageHeader),
      bodyVariableName: bodyVariableName?.trim() || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: actorName,
    };
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'settings:updated',
      timestamp: new Date().toISOString(),
      settings: store.settings,
    });
    res.json({ ok: true, juliaWhatsappBroadcastTemplate: store.settings.juliaWhatsappBroadcastTemplate });
  });

  // Envio imediato pelo canal OFICIAL e integrado do WhatsApp — diferente do
  // link manual wa.me (que só abre o WhatsApp do atendente para ele mandar com
  // a própria mão). Só funciona quando a integração estiver realmente conectada;
  // caso contrário recusa com o motivo exato, nunca finge sucesso.
  app.post('/api/whatsapp/send-now', async (req, res) => {
    const store = loadStore();
    const { attendanceId, to, text } = req.body as {
      attendanceId?: string;
      to: string;
      text: string;
    };
    if (!to || !text) {
      res.status(400).json({ error: 'Telefone e texto são obrigatórios.' });
      return;
    }
    const status = store.settings.integrations?.whatsapp;
    if (!status || status.state !== 'conectado') {
      res.status(409).json({
        error:
          'Integração oficial do WhatsApp não está conectada. Use o compartilhamento manual (abre o WhatsApp para você enviar) enquanto a integração não estiver configurada.',
      });
      return;
    }
    const result = await sendWhatsAppMessage(to, text);
    if (!result.ok) {
      res.status(502).json({ error: result.errorMessage || 'Falha ao enviar mensagem.' });
      return;
    }
    if (attendanceId) {
      if (!store.agentChats) store.agentChats = {};
      if (!store.agentChats['carla_atendimento']) store.agentChats['carla_atendimento'] = [];
      store.agentChats['carla_atendimento'].push({
        id: `cmsg-wa-${Date.now()}`,
        deskId: 'carla_atendimento',
        sender: 'agent',
        agentName: (req.headers['x-station-name'] as string) || 'Carla',
        text,
        modality: 'texto',
        timestamp: new Date().toISOString(),
        attendanceId,
        externalChannel: 'whatsapp',
        externalMessageId: result.externalId,
      });
      saveStore(store);
    }
    res.json({ ok: true, externalId: result.externalId });
  });

  // Direct mobile photo upload for Júlia Marketing (NO active attendance required!)
  app.post('/api/julia/photos', (req, res) => {
    try {
      const store = loadStore();
      if (!store.juliaData) {
        store.juliaData = getDefaultJuliaData();
      }
      const {
        title,
        caption,
        tag,
        dataUrl,
        thumbnailDataUrl,
        mimeType,
        sourceDevice,
      } = req.body as {
        title?: string;
        caption?: string;
        tag?: JuliaMarketingPhoto['tag'];
        dataUrl: string;
        thumbnailDataUrl?: string;
        mimeType?: string;
        sourceDevice?: string;
      };

      if (!dataUrl) {
        res.status(400).json({ error: 'Imagem não enviada.' });
        return;
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        res.status(400).json({ error: 'Formato de imagem inválido.' });
        return;
      }

      // O prefixo da própria data URL (match[1]) descreve os bytes reais que seguem;
      // um "mimeType" enviado à parte é só uma alegação do cliente e pode estar errado
      // (ex.: miniatura sempre marcada como jpeg mesmo quando a imagem original é PNG).
      // Por isso o prefixo tem prioridade — nunca declarar um tipo que não bate com o conteúdo.
      const detectedMime = match[1] || mimeType || 'image/jpeg';
      const base64Data = match[2];
      const ext = detectedMime.includes('png')
        ? '.png'
        : detectedMime.includes('webp')
        ? '.webp'
        : '.jpg';

      const photoId = `jphoto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const safeFileName = `julia_${photoId}${ext}`;
      savePhotoFile(safeFileName, Buffer.from(base64Data, 'base64'), detectedMime);

      const newPhoto: JuliaMarketingPhoto = {
        id: photoId,
        title: title?.trim() || `Foto Publicitária #${store.juliaData.photos.length + 1}`,
        caption:
          caption?.trim() ||
          'Recebida diretamente na galeria de Marketing e Divulgação da Júlia.',
        tag: tag || 'Estofado Pronto',
        imageUrl: `/api/photos/${safeFileName}`,
        thumbnailDataUrl: thumbnailDataUrl || '',
        mimeType: detectedMime,
        sourceDevice: sourceDevice || 'Celular',
        createdAt: new Date().toISOString(),
      };

      store.juliaData.photos.unshift(newPhoto);

      // Automatically link to the active Smart Ad project so it's immediately ready in Step 1..12
      const activeProj = store.juliaData.projects.find(
        (p) => p.id === store.juliaData?.activeProjectId
      );
      if (activeProj) {
        if (!activeProj.selectedPhotoIds.includes(newPhoto.id)) {
          activeProj.selectedPhotoIds.unshift(newPhoto.id);
        }
        if (!activeProj.posterConfig.photoId) {
          activeProj.posterConfig.photoId = newPhoto.id;
        }
      }

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'julia:updated',
        timestamp: new Date().toISOString(),
        sourceDeviceId: (req.headers['x-device-id'] as string) || undefined,
        sourceStationName: sourceDevice || 'Celular — Júlia Marketing',
        juliaData: store.juliaData,
      });

      res.json({ ok: true, photo: newPhoto, juliaData: store.juliaData });
    } catch (error) {
      console.error('Erro ao salvar foto da Júlia Marketing:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao salvar foto na galeria da Júlia.',
      });
    }
  });

  app.delete('/api/julia/photos/:photoId', (req, res) => {
    const store = loadStore();
    if (!store.juliaData) {
      store.juliaData = getDefaultJuliaData();
    }
    const { photoId } = req.params;
    store.juliaData.photos = store.juliaData.photos.filter((p) => p.id !== photoId);
    store.juliaData.projects = store.juliaData.projects.map((proj) => ({
      ...proj,
      selectedPhotoIds: proj.selectedPhotoIds.filter((id) => id !== photoId),
    }));
    saveStore(store);
    broadcastRealtimeEvent({
      type: 'julia:updated',
      timestamp: new Date().toISOString(),
      juliaData: store.juliaData,
    });
    res.json({ ok: true, juliaData: store.juliaData });
  });

  // Generate or Correct (Corrigir) any of the 12 steps of Anúncio Inteligente with Claude
  app.post('/api/julia/ai-step', async (req, res) => {
    try {
      const store = loadStore();
      if (!store.juliaData) {
        store.juliaData = getDefaultJuliaData();
      }
      const { projectId, stepNumber, correctionInstruction, mode } = req.body as {
        projectId: string;
        stepNumber?: number;
        correctionInstruction?: string;
        mode?: 'generate_all' | 'correct_step';
      };

      const project =
        store.juliaData.projects.find((p) => p.id === projectId) ||
        store.juliaData.projects[0];
      if (!project) {
        res.status(404).json({ error: 'Projeto de Anúncio Inteligente não encontrado.' });
        return;
      }

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      // Attach selected photos from Júlia's independent gallery
      const selectedPhotos = store.juliaData.photos.filter((p) =>
        project.selectedPhotoIds.includes(p.id)
      );
      const photosToUse =
        selectedPhotos.length > 0
          ? selectedPhotos.slice(0, 4)
          : store.juliaData.photos.slice(0, 3);

      for (const photo of photosToUse) {
        const resolved = resolvePhotoBase64(photo.imageUrl);
        if (resolved) {
          parts.push({
            text: `Foto de Divulgação da Júlia: "${photo.title}" (${photo.tag}) — Legenda: ${photo.caption}`,
          });
          parts.push({
            inlineData: {
              mimeType: resolved.mimeType,
              data: resolved.data,
            },
          });
        }
      }

      const promptText = `
PROJETO ATUAL DO ANÚNCIO INTELIGENTE (12 ETAPAS):
- Nome da Campanha: ${project.name}
- Etapa em foco: ${stepNumber ? `Etapa ${stepNumber} de 12` : 'Todas as 12 Etapas'}
- Objetivo: ${project.campaignObjective}
- Público-Alvo: ${project.targetAudience}
- Formato Principal: ${project.pieceFormat}
- Título Atual (Headline): ${project.headline}
- Texto Publicitário (Copy): ${project.copyText}
- Anúncio Feed: ${project.adFeedText}
- Anúncio Stories: ${project.adStoriesText}
- Pôster: ${project.posterConfig.headline} / ${project.posterConfig.subheadline}
- WhatsApp de Contato da Castros Interiores: ${store.settings.phoneWhatsapp || '(91) 98556-9841'}
${
  correctionInstruction
    ? `\nINSTRUÇÃO DE CORREÇÃO / REFINAMENTO SOLICITADA PELO OPERADOR NA ETAPA ${stepNumber || ''}:\n"${correctionInstruction}"\nAplique exatamente esta correção e melhore o conteúdo publicitário!`
    : '\nCrie ou aperfeiçoe o conteúdo completo de marketing, publicidade e divulgação (Anúncio, Pôster, Carrossel de 5 lâminas, Catálogo, Hashtags e CTA) para a Castros Interiores.'
}
Lembre-se: NUNCA mencione avaliação técnica de defeitos, problemas estruturais, materiais de oficina ou custos internos.`;

      parts.push({ text: promptText });

      const { response, usedModel } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: JULIA_MARKETING_SYSTEM_INSTRUCTION,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaignObjective: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            headline: { type: Type.STRING },
            copyText: { type: Type.STRING },
            adFeedText: { type: Type.STRING },
            adStoriesText: { type: Type.STRING },
            posterHeadline: { type: Type.STRING },
            posterSubheadline: { type: Type.STRING },
            posterBadgeText: { type: Type.STRING },
            posterCtaText: { type: Type.STRING },
            carouselSlides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slideNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                },
                required: ['slideNumber', 'title', 'body'],
              },
            },
            catalogEntries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  collectionLine: { type: Type.STRING },
                  styleDescription: { type: Type.STRING },
                  highlightTag: { type: Type.STRING },
                },
                required: [
                  'title',
                  'collectionLine',
                  'styleDescription',
                  'highlightTag',
                ],
              },
            },
            hashtags: { type: Type.STRING },
            ctaButtonText: { type: Type.STRING },
            finalReviewNotes: { type: Type.STRING },
          },
          required: [
            'campaignObjective',
            'targetAudience',
            'headline',
            'copyText',
            'adFeedText',
            'adStoriesText',
            'posterHeadline',
            'posterSubheadline',
            'posterBadgeText',
            'posterCtaText',
            'carouselSlides',
            'catalogEntries',
            'hashtags',
            'ctaButtonText',
            'finalReviewNotes',
          ],
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const now = new Date().toISOString();

      // CORREÇÃO 5 — FIDELIDADE AOS TEXTOS:
      // Nunca substituir silenciosamente textos aprovados pelo usuário em outras etapas.
      // Quando mode === 'correct_step' e stepNumber for informado, atualizar APENAS a etapa solicitada.
      const isTargetedStep = mode === 'correct_step' && typeof stepNumber === 'number';

      if (!isTargetedStep || stepNumber === 2) {
        project.campaignObjective = parsed.campaignObjective || project.campaignObjective;
        project.targetAudience = parsed.targetAudience || project.targetAudience;
      }

      if (!isTargetedStep || stepNumber === 4) {
        const nextHeadline = parsed.headline || project.headline;
        project.headline = nextHeadline;
        project.posterConfig = {
          ...project.posterConfig,
          headline: nextHeadline,
        };
        if (!project.adFeedAdaptedByAi) {
          project.adFeedText = buildServerFaithfulFeedText(
            nextHeadline,
            project.copyText,
            project.ctaButtonText,
            project.whatsappDirectNumber,
            project.hashtags
          );
        }
        if (!project.adStoriesAdaptedByAi) {
          project.adStoriesText = buildServerFaithfulStoriesText(
            nextHeadline,
            project.copyText,
            project.ctaButtonText,
            project.whatsappDirectNumber
          );
        }
      }

      if (!isTargetedStep || stepNumber === 5) {
        const nextCopy = parsed.copyText || project.copyText;
        project.copyText = nextCopy;
        if (!project.adFeedAdaptedByAi) {
          project.adFeedText = buildServerFaithfulFeedText(
            project.headline,
            nextCopy,
            project.ctaButtonText,
            project.whatsappDirectNumber,
            project.hashtags
          );
        }
        if (!project.adStoriesAdaptedByAi) {
          project.adStoriesText = buildServerFaithfulStoriesText(
            project.headline,
            nextCopy,
            project.ctaButtonText,
            project.whatsappDirectNumber
          );
        }
      }

      if (!isTargetedStep || stepNumber === 6) {
        // Na Etapa 6, garantimos que o Título da Etapa 4 esteja presente e identificamos que foi adaptado pela IA
        const feedBody = parsed.adFeedText || project.copyText;
        const storiesBody = parsed.adStoriesText || project.copyText;
        project.adFeedText = feedBody.includes(project.headline)
          ? feedBody
          : `${project.headline}\n\n${feedBody}`;
        project.adStoriesText = storiesBody.includes(project.headline)
          ? storiesBody
          : `${project.headline}\n\n${storiesBody}`;
        project.adFeedAdaptedByAi = true;
        project.adStoriesAdaptedByAi = true;
      }

      if (!isTargetedStep || stepNumber === 7) {
        project.posterConfig = {
          ...project.posterConfig,
          headline: parsed.posterHeadline || project.headline || project.posterConfig.headline,
          subheadline: parsed.posterSubheadline || project.posterConfig.subheadline,
          badgeText: parsed.posterBadgeText || project.posterConfig.badgeText,
          ctaText: parsed.posterCtaText || project.posterConfig.ctaText,
        };
      }

      if (!isTargetedStep || stepNumber === 8) {
        if (Array.isArray(parsed.carouselSlides) && parsed.carouselSlides.length > 0) {
          project.carouselSlides = parsed.carouselSlides
            .slice(0, 5)
            .map(
              (
                s: { slideNumber?: number; title?: string; body?: string },
                i: number
              ) => ({
                slideNumber: i + 1,
                title:
                  i === 0
                    ? project.headline || s.title || `Lâmina 1`
                    : s.title || `Lâmina ${i + 1}`,
                body: s.body || '',
                photoId:
                  project.carouselSlides[i]?.photoId ||
                  photosToUse[i % Math.max(1, photosToUse.length)]?.id,
                theme: project.carouselSlides[i]?.theme || 'noite_ouro',
              })
            );
        }
      }

      if (stepNumber === 9 && Array.isArray(parsed.catalogEntries) && parsed.catalogEntries.length > 0) {
        // Somente atualiza textos dos produtos existentes se solicitado na Etapa 9, sem inventar produtos fictícios
        if (project.catalogEntries.length > 0) {
          project.catalogEntries = project.catalogEntries.map((existing, i) => {
            const suggestion = parsed.catalogEntries[i];
            if (!suggestion) return existing;
            return {
              ...existing,
              styleDescription: suggestion.styleDescription || existing.styleDescription,
              highlightTag: suggestion.highlightTag || existing.highlightTag,
            };
          });
        }
      }

      if (!isTargetedStep || stepNumber === 10) {
        project.hashtags = parsed.hashtags || project.hashtags;
        const incomingCta = parsed.ctaButtonText || project.ctaButtonText;
        project.ctaButtonText =
          stripPhoneFromCtaServer(incomingCta, project.whatsappDirectNumber) ||
          'Solicite Atendimento Exclusivo';
        if (!project.adFeedAdaptedByAi) {
          project.adFeedText = buildServerFaithfulFeedText(
            project.headline,
            project.copyText,
            project.ctaButtonText,
            project.whatsappDirectNumber,
            project.hashtags
          );
        }
        if (!project.adStoriesAdaptedByAi) {
          project.adStoriesText = buildServerFaithfulStoriesText(
            project.headline,
            project.copyText,
            project.ctaButtonText,
            project.whatsappDirectNumber
          );
        }
      }

      if (!isTargetedStep || stepNumber === 12) {
        project.finalReviewNotes = parsed.finalReviewNotes || project.finalReviewNotes;
      }

      project.updatedAt = now;

      if (stepNumber) {
        project.stepStates[stepNumber] = {
          ...project.stepStates[stepNumber],
          saved: true,
          savedAt: now,
          correctedAt: now,
          correctionNote:
            correctionInstruction ||
            (mode === 'correct_step'
              ? `Etapa ${stepNumber} corrigida pela Júlia (${usedModel})`
              : `Gerado pela Júlia (${usedModel})`),
        };
      }

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'julia:updated',
        timestamp: now,
        sourceStationName: `Júlia IA (${usedModel})`,
        juliaData: store.juliaData,
      });

      res.json({
        ok: true,
        usedModel,
        project,
        juliaData: store.juliaData,
      });
    } catch (error) {
      console.error('Erro ao gerar/corrigir etapa com Júlia IA:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao acionar a Júlia para o Anúncio Inteligente.',
      });
    }
  });

  // Adapt texts automatically to chosen target social network (WhatsApp, Instagram, Facebook, etc.)
  app.post('/api/julia/adapt-channel', async (req, res) => {
    try {
      const store = loadStore();
      if (!store.juliaData) {
        store.juliaData = getDefaultJuliaData();
      }
      const { projectId, targetChannel } = req.body as {
        projectId?: string;
        targetChannel: JuliaTargetChannel;
      };

      const project =
        store.juliaData.projects.find(
          (p) => p.id === (projectId || store.juliaData?.activeProjectId)
        ) || store.juliaData.projects[0];

      if (!project) {
        res.status(404).json({ error: 'Projeto da campanha não encontrado.' });
        return;
      }

      project.targetChannel = targetChannel || 'Todas as redes sociais';

      // Gerar versões independentes e adequadas para cada canal
      const generated = generateSocialMediaVersionsServer(
        project.headline,
        project.copyText,
        project.ctaButtonText,
        project.whatsappDirectNumber,
        project.hashtags
      );

      project.socialMediaVersions = {
        ...generated,
        // Garantir que as versões WhatsApp nunca tenham hashtags
        whatsappMessage: stripHashtagsServer(generated.whatsappMessage),
        whatsappStatus: stripHashtagsServer(generated.whatsappStatus),
        updatedAt: new Date().toISOString(),
      };

      // Se for selecionado um canal específico, alinhar o texto principal do anúncio e a programação
      if (targetChannel === 'WhatsApp') {
        project.scheduleChannel = 'Lista de Transmissão WhatsApp';
      } else if (targetChannel === 'WhatsApp Status') {
        project.scheduleChannel = 'WhatsApp Status';
      } else if (targetChannel === 'Instagram Feed') {
        project.scheduleChannel = 'Instagram Feed';
        project.adFeedText = project.socialMediaVersions?.instagramFeed || '';
      } else if (targetChannel === 'Instagram Stories') {
        project.scheduleChannel = 'Instagram Stories';
        project.adStoriesText = project.socialMediaVersions?.instagramStories || '';
      } else if (targetChannel === 'Facebook') {
        project.scheduleChannel = 'Facebook';
        project.adFeedText = project.socialMediaVersions?.facebook || '';
      }

      project.updatedAt = new Date().toISOString();
      saveStore(store);

      broadcastRealtimeEvent({
        type: 'julia:updated',
        timestamp: project.updatedAt,
        sourceStationName: `Júlia — Canal ${targetChannel}`,
        juliaData: store.juliaData,
      });

      res.json({
        ok: true,
        targetChannel: project.targetChannel,
        project,
        socialMediaVersions: project.socialMediaVersions,
        juliaData: store.juliaData,
      });
    } catch (err) {
      console.error('Erro ao adaptar canais de divulgação:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao adaptar canais de divulgação.',
      });
    }
  });

  // Universal Agent Chat History Endpoint
  app.get('/api/chat/history', (req, res) => {
    try {
      const store = loadStore();
      if (!store.agentChats) store.agentChats = {};
      const deskId = req.query.deskId as DepartmentId | undefined;
      if (deskId) {
        res.json({ ok: true, messages: store.agentChats[deskId] || [] });
        return;
      }
      res.json({ ok: true, agentChats: store.agentChats });
    } catch (err) {
      console.error('Erro ao buscar histórico de chat:', err);
      res.status(500).json({ error: 'Erro ao carregar histórico.' });
    }
  });

  // Limpa todo o histórico de conversa de UMA mesa. Na mesa da Carla (carla_atendimento)
  // essa mesma lista também guarda o histórico real das mensagens trocadas por WhatsApp
  // com os clientes — a confirmação em duas etapas desse caso específico acontece no
  // front-end; aqui só executa o que foi confirmado, sem adivinhar intenção.
  app.delete('/api/chat/history', (req, res) => {
    try {
      const { deskId, actorName } = req.body as { deskId?: DepartmentId; actorName?: string };
      if (!deskId) {
        res.status(400).json({ error: 'Informe a mesa (deskId) cuja conversa deve ser apagada.' });
        return;
      }
      const store = loadStore();
      if (!store.agentChats) store.agentChats = {};
      const previousCount = (store.agentChats[deskId] || []).length;
      store.agentChats[deskId] = [];
      saveStore(store);
      console.log(
        `[chat] Conversa da mesa "${deskId}" apagada por "${actorName || 'não identificado'}" (${previousCount} mensagem(ns) removida(s)).`
      );
      res.json({ ok: true, removedCount: previousCount });
    } catch (err) {
      console.error('Erro ao limpar histórico de chat:', err);
      res.status(500).json({ error: 'Erro ao limpar a conversa.' });
    }
  });

  // Execute Confirmed Agent Action Proposal
  app.post('/api/chat/execute-action', (req, res) => {
    try {
      const store = loadStore();
      const {
        deskId,
        messageId,
        proposalId,
        userApproved,
        actorName,
      } = req.body as {
        deskId: DepartmentId;
        messageId: string;
        proposalId: string;
        userApproved: boolean;
        actorName?: string;
      };

      if (!userApproved) {
        res.json({ ok: true, status: 'rejected', message: 'Ação cancelada pelo usuário.' });
        return;
      }

      if (!store.agentChats) store.agentChats = {};
      const deskMessages = store.agentChats[deskId] || [];
      const msg = deskMessages.find((m) => m.id === messageId || m.actionProposal?.id === proposalId);
      const proposal = msg?.actionProposal;

      if (!proposal) {
        res.status(404).json({ error: 'Proposta de ação não encontrada ou já executada.' });
        return;
      }

      const now = new Date().toISOString();
      const executor = actorName || 'Responsável Operacional';

      let affectedOrder: AttendanceRecord | undefined;

      if (proposal.type === 'transfer_order' && proposal.targetAttendanceId && proposal.targetDesk) {
        const order = store.attendances.find((a) => a.id === proposal.targetAttendanceId);
        if (order) {
          const from = order.currentDesk || deskId;
          const to = proposal.targetDesk;
          order.currentDesk = to;
          order.deskStatus = 'transferido';
          order.updatedAt = now;
          if (!order.handoffHistory) order.handoffHistory = [];
          order.handoffHistory.unshift({
            id: `hnd-${Date.now()}`,
            orderId: order.id,
            orderNumber: order.attendanceNumber,
            fromDesk: from,
            toDesk: to,
            timestamp: now,
            reason: proposal.description || 'Transferência solicitada pelo agente',
            pendingItems: [],
            documentVersion: order.manufacturingData?.version || 'v1.0',
            status: 'pendente_aceite',
          });
          order.auditHistory.unshift({
            id: `aud-${Date.now()}`,
            timestamp: now,
            actor: executor,
            stage: 'Transferência Homologada',
            action: `Pedido transferido de ${from} para ${to}`,
            details: proposal.description,
          });
          affectedOrder = order;
        }
      } else if (proposal.type === 'approve_technical' && proposal.targetAttendanceId) {
        const order = store.attendances.find((a) => a.id === proposal.targetAttendanceId);
        if (order) {
          order.reviewCompleted = true;
          order.deskStatus = 'concluido_mesa';
          order.updatedAt = now;
          order.auditHistory.unshift({
            id: `aud-${Date.now()}`,
            timestamp: now,
            actor: executor,
            stage: 'Homologação Técnica',
            action: 'Vistoria e ficha técnica homologadas',
            details: proposal.description,
          });
          affectedOrder = order;
        }
      } else if (proposal.type === 'approve_budget' && proposal.targetAttendanceId) {
        const order = store.attendances.find((a) => a.id === proposal.targetAttendanceId);
        if (order) {
          if (order.financialData) {
            order.financialData.confirmedByResponsible = true;
            if (proposal.payload?.approvedPriceCents) {
              order.financialData.approvedSellingPriceCents = proposal.payload.approvedPriceCents;
            }
          }
          if (order.budget) {
            order.budget.confirmedByResponsible = true;
            order.budget.responsibleName = executor;
          }
          order.deskStatus = 'concluido_mesa';
          order.updatedAt = now;
          order.auditHistory.unshift({
            id: `aud-${Date.now()}`,
            timestamp: now,
            actor: executor,
            stage: 'Homologação Orçamentária',
            action: 'Orçamento e formação de preço aprovados',
            details: proposal.description,
          });
          affectedOrder = order;
        }
      } else if (proposal.type === 'send_reminder' && proposal.targetAttendanceId) {
        const order = store.attendances.find((a) => a.id === proposal.targetAttendanceId);
        if (order) {
          order.auditHistory.unshift({
            id: `aud-${Date.now()}`,
            timestamp: now,
            actor: `${executor} (via Mesa Supervisora)`,
            stage: 'Aviso Formal',
            action: proposal.title || 'Aviso formal registrado',
            details: proposal.description,
          });
          affectedOrder = order;
        }
      } else if (proposal.type === 'update_status' && proposal.targetAttendanceId) {
        const order = store.attendances.find((a) => a.id === proposal.targetAttendanceId);
        if (order && proposal.payload?.deskStatus) {
          order.deskStatus = proposal.payload.deskStatus;
          order.updatedAt = now;
          order.auditHistory.unshift({
            id: `aud-${Date.now()}`,
            timestamp: now,
            actor: executor,
            stage: `Mesa ${deskId}`,
            action: `Status alterado para: ${proposal.payload.deskStatus}`,
            details: proposal.description,
          });
          affectedOrder = order;
        }
      }

      proposal.confirmed = true;
      proposal.executedAt = now;
      proposal.executedBy = executor;

      msg.actionExecuted = {
        type: proposal.type,
        details: proposal.description,
        executedAt: now,
        executedBy: executor,
      };

      saveStore(store);

      if (affectedOrder) {
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: now,
          sourceStationName: `Mesa ${deskId}`,
          attendance: affectedOrder,
        });
      }

      res.json({
        ok: true,
        status: 'executed',
        order: affectedOrder,
        proposal,
      });
    } catch (err) {
      console.error('Erro ao executar ação proposta:', err);
      res.status(500).json({ error: 'Erro ao executar a ação proposta.' });
    }
  });

  // Universal Voice & Text Chat Endpoint for All 8 Desks
  app.post('/api/chat/agent', async (req, res) => {
    try {
      const store = loadStore();
      const {
        deskId,
        userText,
        modality = 'texto',
        orderId,
        projectId,
        materialId,
      } = req.body as {
        deskId: DepartmentId;
        userText: string;
        modality?: 'voz' | 'texto';
        orderId?: string;
        projectId?: string;
        materialId?: string;
      };

      if (!userText || !userText.trim()) {
        res.status(400).json({ error: 'Mensagem vazia informada.' });
        return;
      }

      if (!store.agentChats) store.agentChats = {};
      if (!store.agentChats[deskId]) store.agentChats[deskId] = [];

      const deskMetaMap: Record<
        DepartmentId,
        { name: string; title: string; systemPrompt: string }
      > = {
        carla_atendimento: {
          name: 'Carla',
          title: 'Carla (Atendimento ao Cliente)',
          systemPrompt: `Você é a CARLA, responsável pelo Atendimento ao Cliente na Castros Interiores.
Missão: Acolhimento cordial, triagem de pedidos, coleta de dados do cliente, histórico de contato, dúvidas sobre prazos e comunicados via WhatsApp.
Responda com base nos clientes e pedidos reais do sistema. Nunca invente dados que não existam.`,
        },
        pedro_avaliacao: {
          name: 'Pedro',
          title: 'Pedro (Avaliação Técnica de Reforma)',
          systemPrompt: `Você é o PEDRO, analista técnico sênior de avaliação de reformas da Castros Interiores.
Missão: Examinar as 11 áreas do estofado, identificar defeitos visíveis vs suspeitas, avaliar reaproveitamento de componentes e estruturar propostas de reforma.
Regra: NUNCA afirme que a estrutura interna está íntegra sem abertura na oficina. Apenas observe fotos e fatos reais.`,
        },
        lucas_projetos: {
          name: 'Lucas',
          title: 'Lucas (Projetos & Fabricação Nova)',
          systemPrompt: `Você é o LUCAS, engenheiro e projetista de estofados novos sob medida da Castros Interiores.
Missão: Elaborar projetos novos nas 8 etapas de fabricação (briefing, referências, modelo, revisão do responsável, plano de corte/materiais, custos, aprovação e manual de montagem).
Regra: NUNCA confunda fabricação nova com reforma. Não fale de defeitos ou reaproveitamento; detalhe medidas em mm, tecidos com margem de perda e componentes novos.`,
        },
        ana_compras: {
          name: 'Ana',
          title: 'Ana (Compras & Suprimentos)',
          systemPrompt: `Você é a ANA, coordenadora de Compras, Catálogo e Suprimentos da Castros Interiores.
Missão: Gerenciar o catálogo de matérias-primas nas 9 categorias (espumas, tecidos, madeira, percintas/molas, grampos, colas, mantas, pés/ferragens, outros), conferir estoques, fornecedores e identificar orçamentos incompletos sem preço cadastrado.
Regra: NUNCA invente preços ou assuma custo zero para matérias-primas faltantes. Aponte com precisão o que falta cotar.`,
        },
        mila_financeiro: {
          name: 'Mila',
          title: 'Mila (Administração Financeira)',
          systemPrompt: `Você é a MILA, diretora de Administração Financeira da Castros Interiores.
Missão: Gerenciar o financeiro geral da fábrica (entradas, saídas, contas, reserva do Edson) e o financeiro de cada pedido (formação de preços, custos diretos, mão de obra, rateio de despesas fixas, impostos, pagamentos e parcelas).
Regra: NUNCA misture custos diretos com despesas de oficina. Sempre apresente cálculos claros em Reais (R$) sem arredondar arbitrariamente. Distinga sempre valores já REALIZADOS (recebidos/pagos de fato) de valores apenas PREVISTOS ou de orçamento aprovado — orçamento aprovado nunca é dinheiro recebido. Você pode sugerir lançamentos, retiradas ou transferências, mas NUNCA os confirma ou registra sozinha: toda movimentação real exige a confirmação explícita do responsável pelos próprios botões da mesa, nunca pela conversa.`,
        },
        castro_estrategia: {
          name: 'Roberto Castro',
          title: 'Castro (Estratégia & Organização do Negócio)',
          systemPrompt: `Você é o ROBERTO CASTRO, gestor de Estratégia e Planejamento da Castros Interiores.
Missão: Coordenar a capacidade produtiva da oficina (base de 80 horas/semana), identificar gargalos de produção, balancear pedidos de reforma vs fabricação nova, definir planos de ação semanais e orientar o crescimento rentável do negócio.`,
        },
        julia_marketing: {
          name: 'Júlia',
          title: 'Júlia (Marketing & Divulgação)',
          systemPrompt: JULIA_MARKETING_SYSTEM_INSTRUCTION,
        },
        supervisora_geral: {
          name: 'Helena',
          title: 'Helena (Supervisora Geral — Mesa 8)',
          systemPrompt: `Você é a HELENA, Supervisora Geral da Central de Agentes da Castros Interiores (Mesa 8).
Missão: Governança transversal de toda a operação. Você acompanha o trâmite de pedidos entre todas as mesas, prazos de entrega, estoques críticos de materiais, campanhas de divulgação e atua na homologação de decisões técnicas e orçamentárias.
Regra: Forneça diagnósticos objetivos baseados estritamente nos dados reais da oficina. Quando uma intervenção for necessária, proponha uma ação formal estruturada com confirmação.`,
        },
        tapeceiro_tecnico: {
          name: 'Tapeceiro Técnico',
          title: 'Tapeceiro Técnico (Planejamento de Produção e Materiais — Mesa 9)',
          systemPrompt: `Você é o TAPECEIRO TÉCNICO da Castros Interiores (Mesa 9), responsável por transformar a avaliação revisada do Pedro (reforma) ou a ficha técnica revisada do Lucas (fabricação) em lista técnica de peças, cálculo de materiais e instruções de montagem.
Regra: Nunca invente medida, encaixe, furação ou especificação estrutural a partir de foto. Diferencie dimensão acabada de dimensão de corte. Quantidade ou preço desconhecidos ficam pendentes, nunca zero ou estimativa apresentada como definitiva.`,
        },
      };

      const meta = deskMetaMap[deskId] || deskMetaMap.carla_atendimento;
      const now = new Date().toISOString();

      // Montar contexto factual rico do banco de dados real
      let relevantOrder: AttendanceRecord | undefined;
      if (orderId) {
        relevantOrder = store.attendances.find((a) => a.id === orderId || a.attendanceNumber === orderId);
      }
      if (!relevantOrder && store.attendances.length > 0) {
        relevantOrder = store.attendances.find((a) => a.currentDesk === deskId);
      }

      let relevantCampaign: JuliaSmartAdProject | undefined;
      if (store.juliaData) {
        if (projectId) {
          relevantCampaign = store.juliaData.projects.find((p) => p.id === projectId);
        }
        if (!relevantCampaign) {
          relevantCampaign =
            store.juliaData.projects.find((p) => p.id === store.juliaData?.activeProjectId) ||
            store.juliaData.projects[0];
        }
      }

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      // Contexto de Fotos
      if (deskId === 'pedro_avaliacao' && relevantOrder) {
        const savedPhotos = relevantOrder.photos.filter((p) => p.uploadStatus === 'saved').slice(0, 3);
        for (const photo of savedPhotos) {
          const resolved = resolvePhotoBase64(photo.imageUrl);
          if (resolved) {
            parts.push({
              text: `Foto da avaliação técnica: ${photo.code} (${photo.category}) - ${photo.caption || 'Sem legenda'}`,
            });
            parts.push({
              inlineData: {
                mimeType: resolved.mimeType,
                data: resolved.data,
              },
            });
          }
        }
      } else if (deskId === 'julia_marketing' && store.juliaData) {
        const photosToAttach = store.juliaData.photos.slice(0, 3);
        for (const photo of photosToAttach) {
          const resolved = resolvePhotoBase64(photo.imageUrl);
          if (resolved) {
            parts.push({
              text: `Foto publicitária da Júlia: ${photo.title} (${photo.tag}) - ${photo.caption}`,
            });
            parts.push({
              inlineData: {
                mimeType: resolved.mimeType,
                data: resolved.data,
              },
            });
          }
        }
      }

      // Montar bloco factual contextual
      let factualContext = `DADOS REAIS CADASTRADOS NO SISTEMA DA CASTROS INTERIORES:\n`;

      if (relevantOrder) {
        factualContext += `
PEDIDO EM FOCO (${relevantOrder.attendanceNumber} - ${relevantOrder.orderType}):
- Cliente: ${relevantOrder.clientName} | Telefone: ${relevantOrder.clientPhone || 'não cadastrado'}
- Móvel: ${relevantOrder.furnitureType} (${relevantOrder.piecesCount || '1 un'})
- Medidas: ${relevantOrder.approxMeasurements || 'não informado'}
- Mesa atual: ${relevantOrder.currentDesk} | Status na mesa: ${relevantOrder.deskStatus || 'novo'}
- Defeitos relatados: ${relevantOrder.reportedDefects || 'Nenhum'}
- Serviço desejado: ${relevantOrder.desiredService}
- Preferência de tecido/conforto: ${relevantOrder.fabricAndComfortPreference}
- Revisão técnica concluída: ${relevantOrder.reviewCompleted ? 'Sim' : 'Não (preliminar)'}
- Orçamento confirmado pelo responsável: ${relevantOrder.budget?.confirmedByResponsible ? 'Sim' : 'Pendente'}
- Preço de venda: ${
          relevantOrder.financialData?.approvedSellingPriceCents
            ? `R$ ${(relevantOrder.financialData.approvedSellingPriceCents / 100).toFixed(2)}`
            : relevantOrder.financialData?.suggestedSellingPriceCents
            ? `R$ ${(relevantOrder.financialData.suggestedSellingPriceCents / 100).toFixed(2)} (sugerido)`
            : 'Ainda não calculado'
        }
- Total recebido: R$ ${((relevantOrder.financialData?.totalPaidCents || 0) / 100).toFixed(2)} | Saldo a pagar: R$ ${((relevantOrder.financialData?.remainingBalanceCents || 0) / 100).toFixed(2)}
`;
      }

      if (deskId === 'carla_atendimento' && relevantOrder) {
        const isFab = relevantOrder.orderType === 'Fabricação';
        const currentPrice = isFab
          ? relevantOrder.financialData?.approvedSellingPriceCents
          : relevantOrder.budget?.sellingPriceCents;
        const decisionSnapshot = isFab
          ? relevantOrder.financialData?.clientDecisionPriceCentsSnapshot
          : relevantOrder.budget?.clientDecisionPriceCentsSnapshot;
        const decision = isFab ? relevantOrder.financialData?.clientDecision : relevantOrder.budget?.clientDecision;
        const decisionStale = decision && decisionSnapshot !== undefined && decisionSnapshot !== currentPrice;
        const openComplaints = (relevantOrder.complaints || []).filter((c) => c.status !== 'resolvida');
        const pendingFields: string[] = [];
        if (!relevantOrder.clientPhone) pendingFields.push('telefone do cliente');
        if (!relevantOrder.neighborhood && !relevantOrder.fullAddress) pendingFields.push('bairro/endereço');
        if (relevantOrder.approxMeasurements === 'A validar na oficina') pendingFields.push('medidas informadas pelo cliente');
        if (!relevantOrder.workshopConfirmedMeasurements) pendingFields.push('medidas conferidas na oficina');
        factualContext += `
DADOS DE ATENDIMENTO (CARLA) PARA ${relevantOrder.attendanceNumber}:
- Tipo de solicitação: ${relevantOrder.requestType || 'não classificado'}
- Bairro/Cidade: ${relevantOrder.neighborhood || 'não informado'}${relevantOrder.city ? ` / ${relevantOrder.city}` : ''}
- Endereço completo: ${relevantOrder.fullAddress || 'não informado'}
- Medidas conferidas na oficina (diferente da informada pelo cliente): ${relevantOrder.workshopConfirmedMeasurements || 'ainda não conferidas'}
- Pendências de cadastro: ${pendingFields.length > 0 ? pendingFields.join(', ') : 'nenhuma pendência de cadastro'}
- Decisão do cliente sobre o orçamento: ${decision ? `${decision}${decisionStale ? ' — ATENÇÃO: o preço mudou depois dessa decisão, precisa de nova conferência com o cliente' : ''}` : 'ainda não decidiu'}
- Reclamações abertas/encaminhadas: ${openComplaints.length === 0 ? 'nenhuma' : openComplaints.map((c) => `"${c.description}" (${c.urgency}, ${c.status})`).join(' | ')}
REGRA: ao preparar uma mensagem para o cliente, use somente o preço e condições já CONFIRMADOS pelo responsável (nunca o sugerido). Se o cliente perguntar algo que depende de outra mesa (ex.: data exata de entrega ainda não definida), diga que vai confirmar e volta.
`;
      }

      if (deskId === 'ana_compras' || deskId === 'supervisora_geral') {
        const incompleteCount = store.materials.filter((m) => !m.unitCostCents || m.unitCostCents === 0).length;
        factualContext += `
ESTOQUE E MATÉRIAS-PRIMAS (TOTAL DE ${store.materials.length} ITENS):
- Itens sem preço ou com cotação pendente: ${incompleteCount}
- Principais itens cadastrados:
${store.materials
  .slice(0, 10)
  .map(
    (m) =>
      `  * [${m.rawCategory || m.category}] ${m.name} | Custo: R$ ${(m.unitCostCents / 100).toFixed(2)}/${m.unit} | Estoque físico: ${m.physicalStock ?? 'N/D'} | Reservado: ${m.reservedStock ?? 0}`
  )
  .join('\n')}
`;
      }

      if (deskId === 'mila_financeiro') {
        const fin = computeFactoryFinancialSummary(store);
        factualContext += `
FINANCEIRO GERAL DA FÁBRICA — ${fin.month} (dados reais, atualizados agora):
- Entradas realizadas no mês: R$ ${(fin.entradasRealizadoMesCents / 100).toFixed(2)}
- Saídas realizadas no mês: R$ ${(fin.saidasRealizadoMesCents / 100).toFixed(2)}
- Saldo operacional do mês: R$ ${(fin.saldoOperacionalMesCents / 100).toFixed(2)}
- Saldo de caixa total (todas as contas): R$ ${(fin.saldoCaixaTotalCents / 100).toFixed(2)}
- Contas a pagar pendentes: ${fin.contasAPagar.length} (soma R$ ${(fin.contasAPagar.reduce((s, t) => s + (t.amountCents - (t.amountPaidCents || 0)), 0) / 100).toFixed(2)})
- Valores a receber pendentes: ${fin.contasAReceber.length} (soma R$ ${(fin.contasAReceber.reduce((s, t) => s + (t.amountCents - (t.amountPaidCents || 0)), 0) / 100).toFixed(2)})
- Reserva do Edson no mês (10% dos recebimentos realizados): R$ ${(fin.edsonReserve.reserveCents / 100).toFixed(2)} | já retirado: R$ ${(fin.edsonReserve.withdrawnCents / 100).toFixed(2)} | restante: R$ ${(fin.edsonReserve.remainingCents / 100).toFixed(2)}
- Saldo inicial registrado: ${fin.initialBalance ? `R$ ${(fin.initialBalance.amountCents / 100).toFixed(2)} em ${fin.initialBalance.referenceDate}` : 'ainda não registrado'}
REGRA CRÍTICA: distinga sempre valores REALIZADOS (já recebidos/pagos) de PREVISTOS (ainda pendentes) — nunca trate orçamento aprovado como dinheiro recebido. Se a pergunta exigir um dado que não está nesta lista, diga explicitamente que não tem esse dado em mãos em vez de estimar. Você pode sugerir um lançamento, uma retirada ou uma transferência, mas NUNCA registre, confirme ou quite nada sozinha — toda ação financeira real exige confirmação explícita do responsável pelos botões da mesa.
`;
      }

      if (deskId === 'julia_marketing') {
        if (relevantCampaign) {
          factualContext += `
CAMPANHA PUBLICITÁRIA SELECIONADA:
- Nome: ${relevantCampaign.name}
- Objetivo: ${relevantCampaign.campaignObjective}
- Público-Alvo: ${relevantCampaign.targetAudience}
- Formato: ${relevantCampaign.pieceFormat}
- Canal principal: ${relevantCampaign.targetChannel || 'Todas as redes sociais'}
- Título (Headline): "${relevantCampaign.headline}"
- Texto (Copy): "${relevantCampaign.copyText}"
- CTA: "${relevantCampaign.ctaButtonText}"
- Fotos vinculadas: ${relevantCampaign.selectedPhotoIds.length} foto(s)
- Etapa atual do Anúncio Inteligente: ${relevantCampaign.currentStep}/12
`;
        } else {
          factualContext += `Nenhuma campanha publicitária específica cadastrada no momento.\n`;
        }

        const integ = store.settings.integrations || {};
        const chanLabel = (s?: { state: string }) =>
          !s || s.state === 'nao_configurado'
            ? 'não configurado'
            : s.state === 'pendente'
            ? 'pendente de verificação'
            : s.state === 'erro'
            ? 'com erro'
            : 'conectado';
        factualContext += `
STATUS REAL DAS INTEGRAÇÕES DE CANAL (único critério válido para "publicação automática"):
- WhatsApp: ${chanLabel(integ.whatsapp)}
- Instagram: ${chanLabel(integ.instagram)}
- Facebook: ${chanLabel(integ.facebook)}
`;

        const calendarItems = (store.juliaData?.campaigns || []).slice(0, 8);
        if (calendarItems.length > 0) {
          factualContext += `
PUBLICAÇÕES NO CALENDÁRIO (até 8 mais recentes — status real, não uma intenção):
${calendarItems
  .map((c) => {
    const confirmed = c.externalConfirmation
      ? `CONFIRMADA pelo canal externo em ${c.externalConfirmation.confirmedAt}${c.externalConfirmation.externalLink ? ` (${c.externalConfirmation.externalLink})` : ''}`
      : c.manualSendConfirmation
      ? `enviada manualmente por um humano em ${c.manualSendConfirmation.confirmedAt} — NÃO é confirmação do canal`
      : 'sem nenhuma confirmação de envio';
    return `  * "${c.title}" | ${c.channel} | ${c.scheduledDate} ${c.scheduledTime} | status cadastrado: ${c.status} | ${confirmed}`;
  })
  .join('\n')}
`;
        } else {
          factualContext += `\nNenhuma publicação cadastrada no calendário ainda.\n`;
        }
      }

      if (deskId === 'supervisora_geral') {
        const totalOrders = store.attendances.length;
        const pendingHandoffs = store.attendances.filter(
          (a) => a.deskStatus === 'transferido' || a.deskStatus === 'na_fila'
        ).length;
        const pendingApprovals = store.attendances.filter(
          (a) => !a.reviewCompleted || (a.budget && !a.budget.confirmedByResponsible)
        ).length;
        factualContext += `
PANORAMA GERAL DA EMPRESA (CASTROS INTERIORES):
- Total de pedidos no sistema: ${totalOrders} (${store.attendances.filter((a) => a.orderType === 'Fabricação').length} fabricação nova, ${store.attendances.filter((a) => a.orderType !== 'Fabricação').length} reformas)
- Pedidos aguardando aceite ou em trâmite entre mesas: ${pendingHandoffs}
- Pedidos aguardando homologação técnica ou de orçamento: ${pendingApprovals}
- Campanhas de marketing ativas: ${store.juliaData?.projects.length || 0}
- Capacidade semanal da oficina: ${store.officeData?.workshopCapacityHoursPerWeek || 80}h/semana
`;
      }

      // Histórico recente da mesa
      const recentChat = (store.agentChats[deskId] || [])
        .slice(-8)
        .map((m) => `${m.sender === 'user' ? 'Operador' : m.agentName}: ${m.text}`)
        .join('\n');

      const userMessageObj: AgentChatMessage = {
        id: `cmsg-u-${Date.now()}`,
        deskId,
        sender: 'user',
        agentName: 'Operador',
        text: userText.trim(),
        modality,
        timestamp: now,
        attendanceId: relevantOrder?.id,
        campaignId: relevantCampaign?.id,
      };
      store.agentChats[deskId].push(userMessageObj);

      const promptDirective = `
${factualContext}

HISTÓRICO RECENTE DA CONVERSA NESTA MESA:
${recentChat || 'Início da conversa.'}

MENSAGEM DO OPERADOR (${modality === 'voz' ? 'Falada por Voz' : 'Digitada em Texto'}):
"${userText.trim()}"

DIRETRIZES DE RESPOSTA:
1. Responda em português brasileiro de forma factual, clara e profissional como ${meta.title}.
2. Se o usuário perguntar algo sobre um pedido, material ou campanha e a informação não estiver cadastrada, informe claramente que o dado não foi encontrado no sistema e indique onde cadastrar. NÃO invente informações.
3. Se o usuário estiver na mesa da Júlia e disser "avalie esta campanha", avalie a campanha ativa acima com base em clareza, gancho de atenção, adequação ao público e proposta de valor. Se nenhuma campanha existir, solicite que ele cadastre uma campanha ou forneça o tema.
4. Se o usuário solicitar uma alteração ou ação operacional (ex: transferir pedido, aprovar orçamento, enviar aviso formal, alterar status), monte uma proposta estruturada (actionProposal) para que o operador confirme no botão antes de executar. NUNCA execute compras ou transferências sem confirmação expressa.`;

      parts.push({ text: promptDirective });

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const { response } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: meta.systemPrompt,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: 'Resposta factual e humanizada do agente em português brasileiro.',
            },
            hasActionProposal: {
              type: Type.BOOLEAN,
              description: 'Verdadeiro se o agente sugere uma ação que precisa de confirmação do operador.',
            },
            actionProposal: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description:
                    'transfer_order | approve_technical | approve_budget | send_reminder | request_quotation | update_status',
                },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                targetDesk: { type: Type.STRING },
                targetAttendanceId: { type: Type.STRING },
              },
            },
          },
          required: ['replyText', 'hasActionProposal'],
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const replyText =
        parsed.replyText ||
        `Entendido. Estou à disposição na mesa de ${meta.name} para prosseguir com os trabalhos.`;

      let actionProposal: AgentActionProposal | undefined;
      if (parsed.hasActionProposal && parsed.actionProposal?.type) {
        actionProposal = {
          id: `prop-${Date.now()}`,
          type: parsed.actionProposal.type,
          title: parsed.actionProposal.title || 'Confirmação de Ação Operacional',
          description:
            parsed.actionProposal.description ||
            'O agente propôs uma ação no sistema que requer sua autorização.',
          targetDesk: parsed.actionProposal.targetDesk || deskId,
          targetAttendanceId:
            parsed.actionProposal.targetAttendanceId || relevantOrder?.id,
          requiresConfirmation: true,
          confirmed: false,
        };
      }

      const agentMessageObj: AgentChatMessage = {
        id: `cmsg-a-${Date.now()}`,
        deskId,
        sender: 'agent',
        agentName: meta.name,
        text: replyText,
        modality,
        timestamp: new Date().toISOString(),
        attendanceId: relevantOrder?.id,
        campaignId: relevantCampaign?.id,
        actionProposal,
      };

      store.agentChats[deskId].push(agentMessageObj);
      saveStore(store);

      res.json({
        ok: true,
        message: agentMessageObj,
        replyText: agentMessageObj.text,
        actionProposal,
      });
    } catch (err) {
      console.error('Erro no processamento do chat do agente:', err);
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Erro ao se comunicar com o agente de IA.',
      });
    }
  });

  // Voice & Text Chat with Persistent History for Júlia (Compatible & Enhanced)
  app.post('/api/julia/chat', async (req, res) => {
    try {
      const store = loadStore();
      if (!store.juliaData) {
        store.juliaData = getDefaultJuliaData();
      }
      const {
        text,
        modality = 'texto',
        projectId,
      } = req.body as {
        text: string;
        modality?: 'voz' | 'texto';
        projectId?: string;
      };

      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Mensagem vazia.' });
        return;
      }

      const userMsg = {
        id: `jmsg-u-${Date.now()}`,
        sender: 'operador' as const,
        modality: modality || 'texto',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };
      store.juliaData.chatHistory.push(userMsg);

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const recentHistory = store.juliaData.chatHistory
        .slice(-10)
        .map((m) => `${m.sender === 'operador' ? 'Operador' : 'Júlia'} (${m.modality}): ${m.text}`)
        .join('\n');

      const activeProj =
        (projectId && store.juliaData.projects.find((p) => p.id === projectId)) ||
        store.juliaData.projects.find((p) => p.id === store.juliaData?.activeProjectId) ||
        store.juliaData.projects[0];

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      // Anexar fotos reais da galeria da Júlia
      for (const photo of store.juliaData.photos.slice(0, 3)) {
        const resolved = resolvePhotoBase64(photo.imageUrl);
        if (resolved) {
          parts.push({
            text: `Foto disponível no acervo da Júlia: ${photo.title} (${photo.tag}) - ${photo.caption}`,
          });
          parts.push({
            inlineData: {
              mimeType: resolved.mimeType,
              data: resolved.data,
            },
          });
        }
      }

      const campaignDetails = activeProj
        ? `
CAMPANHA EM FOCO PARA AVALIAÇÃO / TRABALHO:
- Nome: ${activeProj.name}
- Objetivo: ${activeProj.campaignObjective}
- Público-Alvo: ${activeProj.targetAudience}
- Formato: ${activeProj.pieceFormat}
- Canal de divulgação: ${activeProj.targetChannel || 'Todas as redes sociais'}
- Título (Headline): "${activeProj.headline}"
- Texto publicitário (Copy): "${activeProj.copyText}"
- Chamada para ação (CTA): "${activeProj.ctaButtonText}"
- WhatsApp de contato: ${activeProj.whatsappDirectNumber || store.settings.phoneWhatsapp}
- Quantidade de fotos anexadas à campanha: ${activeProj.selectedPhotoIds.length}
`
        : `Nenhuma campanha específica selecionada no momento. Total de campanhas na biblioteca: ${store.juliaData.projects.length}`;

      parts.push({
        text: `ESTADO DO DEPARTAMENTO JÚLIA MARKETING, PUBLICIDADE E DIVULGAÇÃO:
- Fotos recebidas direto na galeria da Júlia: ${store.juliaData.photos.length}
- Campanhas programadas no calendário: ${store.juliaData.campaigns.length}
${campaignDetails}

HISTÓRICO RECENTE DA CONVERSA:
${recentHistory}

NOVA MENSAGEM DO OPERADOR (${modality === 'voz' ? 'Falada por Voz' : 'Digitada em Texto'}):
"${text.trim()}"

INSTRUÇÕES ESPECIAIS:
- Se o operador pedir "avalie esta campanha", forneça um parecer publicitário aprofundado e construtivo sobre o título, o texto, o público e o apelo visual da campanha acima.
- Responda como a Júlia (Marketing, Publicidade e Divulgação da Castros Interiores) de forma prestativa, criativa e acolhedora.
- NUNCA mencione avaliação técnica de defeitos estruturais, madeiramento de oficina ou custos internos de produção.`,
      });

      const { response, usedModel } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts,
        systemInstruction: JULIA_MARKETING_SYSTEM_INSTRUCTION,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: 'Resposta da Júlia em português brasileiro, natural para ser lida e falada em voz alta.',
            },
          },
          required: ['replyText'],
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const replyText =
        parsed.replyText ||
        'Perfeito! Registrei sua orientação aqui no departamento de Marketing, Publicidade e Divulgação.';

      const juliaMsg = {
        id: `jmsg-j-${Date.now()}`,
        sender: 'julia' as const,
        modality: modality || 'texto',
        text: replyText,
        timestamp: new Date().toISOString(),
      };
      store.juliaData.chatHistory.push(juliaMsg);

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'julia:updated',
        timestamp: new Date().toISOString(),
        sourceStationName: `Júlia (${usedModel})`,
        juliaData: store.juliaData,
      });

      res.json({
        ok: true,
        reply: juliaMsg,
        juliaData: store.juliaData,
      });
    } catch (error) {
      console.error('Erro no chat de voz/texto da Júlia:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao conversar com a Júlia.',
      });
    }
  });

  // Generate Daily Marketing & Advertising Report for Júlia
  app.post('/api/julia/daily-report', async (req, res) => {
    try {
      const store = loadStore();
      if (!store.juliaData) {
        store.juliaData = getDefaultJuliaData();
      }
      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const today = new Date().toISOString().slice(0, 10);

      const metricsSnapshot = {
        photosReceived: store.juliaData.photos.length,
        adsCreated: store.juliaData.projects.length,
        postersCreated: store.juliaData.projects.filter((p) => p.posterConfig.headline).length,
        carouselsCreated: store.juliaData.projects.filter((p) => p.carouselSlides.length > 0).length,
        catalogsCreated: store.juliaData.projects.filter((p) => p.catalogEntries.length > 0).length,
        scheduledCampaigns: store.juliaData.campaigns.length,
        voiceTextInteractions: store.juliaData.chatHistory.length,
      };

      const promptText = `Gere o RELATÓRIO DIÁRIO DE MARKETING, PUBLICIDADE E DIVULGAÇÃO da Castros Interiores (${today}).
Dados consolidados do departamento da Júlia hoje:
- Fotos recebidas diretamente do celular na galeria de marketing: ${metricsSnapshot.photosReceived}
- Projetos do Anúncio Inteligente (12 etapas): ${metricsSnapshot.adsCreated}
- Pôsteres configurados: ${metricsSnapshot.postersCreated}
- Carrosséis estruturados: ${metricsSnapshot.carouselsCreated}
- Catálogos de divulgação: ${metricsSnapshot.catalogsCreated}
- Campanhas programadas no calendário: ${metricsSnapshot.scheduledCampaigns} (${store.juliaData.campaigns.map((c) => `${c.title} em ${c.channel} [${c.status}]`).join('; ')})
- Interações por voz e texto no histórico: ${metricsSnapshot.voiceTextInteractions}

Lembre-se: NUNCA mencione defeitos técnicos, materiais de oficina ou custos internos.`;

      const { response } = await generateContentWithRetryAndFallback({
        preferredModel,
        parts: [{ text: promptText }],
        systemInstruction: JULIA_MARKETING_SYSTEM_INSTRUCTION,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryText: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            nextDayRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['summaryText', 'highlights', 'nextDayRecommendations'],
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const newReport = {
        id: `jrep-${Date.now()}`,
        date: today,
        summaryText:
          parsed.summaryText ||
          'Relatório diário de Marketing, Publicidade e Divulgação consolidado com sucesso.',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        nextDayRecommendations: Array.isArray(parsed.nextDayRecommendations)
          ? parsed.nextDayRecommendations
          : [],
        metricsSnapshot,
        createdAt: new Date().toISOString(),
      };

      store.juliaData.dailyReports.unshift(newReport);
      saveStore(store);

      broadcastRealtimeEvent({
        type: 'julia:updated',
        timestamp: new Date().toISOString(),
        sourceStationName: 'Júlia — Relatório Diário',
        juliaData: store.juliaData,
      });

      res.json({ ok: true, report: newReport, juliaData: store.juliaData });
    } catch (error) {
      console.error('Erro ao gerar relatório diário da Júlia:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao gerar Relatório Diário da Júlia.',
      });
    }
  });

  // ==========================================
  // ESCRITÓRIO INTEGRADO DE AGENTES & PEDIDOS COMPARTILHADOS
  // ==========================================

  // Obter visão completa do Escritório (mesas, pedidos compartilhados, catálogo)
  app.get('/api/office', (_req, res) => {
    try {
      const store = loadStore();
      res.json({
        ok: true,
        officeData: store.officeData,
        attendances: store.attendances,
        materials: store.materials,
      });
    } catch (error) {
      console.error('Erro ao carregar escritório:', error);
      res.status(500).json({ error: 'Erro ao carregar dados do escritório.' });
    }
  });

  // Transferência real e rastreável entre mesas de agentes
  app.post('/api/orders/transfer', (req, res) => {
    try {
      const store = loadStore();
      const {
        orderId,
        fromDesk,
        toDesk,
        reason,
        completedSummary,
        pendingItems,
        nextActionExpected,
        documentVersion,
      } = req.body as {
        orderId: string;
        fromDesk: DepartmentId;
        toDesk: DepartmentId;
        reason: string;
        completedSummary: string;
        pendingItems?: string[];
        nextActionExpected: string;
        documentVersion?: string;
      };

      const order = store.attendances.find((a) => a.id === orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido/atendimento não encontrado.' });
        return;
      }

      const { handoff, alreadyTransferred } = createOrderHandoff(store, order, {
        fromDesk,
        toDesk,
        reason,
        completedSummary,
        pendingItems,
        nextActionExpected,
        documentVersion,
      });

      if (!alreadyTransferred) {
        saveStore(store);
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: new Date().toISOString(),
          sourceStationName: `Mesa ${toDesk}`,
          attendance: order,
        });
      }

      res.json({ ok: true, handoff, order, officeData: store.officeData, alreadyTransferred });
    } catch (error) {
      console.error('Erro ao transferir pedido entre mesas:', error);
      res.status(500).json({ error: 'Erro ao transferir pedido entre mesas.' });
    }
  });

  // Atualizar status na mesa (Aceitar, Devolver p/ correção, Iniciar trabalho, Aprovação)
  app.post('/api/orders/desk-status', (req, res) => {
    try {
      const store = loadStore();
      const { orderId, deskStatus, note, actorName } = req.body as {
        orderId: string;
        deskStatus: OrderDeskStatus;
        note?: string;
        actorName?: string;
      };

      const order = store.attendances.find((a) => a.id === orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido/atendimento não encontrado.' });
        return;
      }

      const now = new Date().toISOString();
      order.deskStatus = deskStatus;
      order.updatedAt = now;

      // Se houver último handoff pendente, atualizar status
      if (order.handoffHistory && order.handoffHistory.length > 0) {
        const lastHandoff = order.handoffHistory[0];
        if (deskStatus === 'aceito' || deskStatus === 'em_andamento') {
          lastHandoff.status = 'aceito';
          lastHandoff.acknowledgedAt = now;
        } else if (deskStatus === 'devolvido_correcao') {
          lastHandoff.status = 'devolvido';
          lastHandoff.acknowledgedAt = now;
        } else if (deskStatus === 'concluido_mesa') {
          lastHandoff.status = 'concluido';
        }
      }

      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: actorName || order.assignedAgentName || 'Responsável',
        stage: `Mesa ${order.currentDesk}`,
        action: `Status alterado para: ${deskStatus}`,
        details: note || `Ação na mesa registrada com sucesso.`,
      });

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: order.assignedAgentName || 'Mesa',
        attendance: order,
      });

      res.json({ ok: true, order });
    } catch (error) {
      console.error('Erro ao atualizar status da mesa:', error);
      res.status(500).json({ error: 'Erro ao atualizar status da mesa.' });
    }
  });

  // Atualização Financeira com a Agente Mila
  app.post('/api/orders/financial', (req, res) => {
    try {
      const store = loadStore();
      const {
        orderId,
        financialUpdates,
        newTransaction,
      } = req.body as {
        orderId: string;
        financialUpdates?: Partial<OrderFinancialData>;
        newTransaction?: Omit<FinancialTransaction, 'id' | 'createdAt'>;
      };

      const order = store.attendances.find((a) => a.id === orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido/atendimento não encontrado.' });
        return;
      }

      if (!order.financialData) {
        order.financialData = {
          pricingMethod: 'margem_sobre_venda',
          costDirectCents: 0,
          overheadShareCents: 0,
          ownerLaborCents: 0,
          logisticsFreightCents: 0,
          taxesPercent: 0,
          totalCalculatedCostCents: 0,
          suggestedSellingPriceCents: 0,
          approvedSellingPriceCents: null,
          confirmedByResponsible: false,
          targetMarginPercent: 25,
          markupPercent: 35,
          discountsCents: 0,
          paymentConditions: '50% entrada e 50% na entrega',
          transactions: [],
          totalPaidCents: 0,
          remainingBalanceCents: 0,
          notes: '',
        };
      }

      const fin = order.financialData;

      if (financialUpdates) {
        Object.assign(fin, financialUpdates);
      }

      if (newTransaction) {
        const trans: FinancialTransaction = {
          id: `tx-${Date.now()}`,
          orderId,
          type: newTransaction.type,
          amountCents: Number(newTransaction.amountCents) || 0,
          status: newTransaction.status || 'previsto',
          dueDate: newTransaction.dueDate,
          paidDate: newTransaction.paidDate,
          description: newTransaction.description || 'Lançamento financeiro',
          receiptNotes: newTransaction.receiptNotes,
          createdAt: new Date().toISOString(),
          history: [],
        };
        fin.transactions.push(trans);
      }

      // Recalcular totais financeiros
      const direct = Number(fin.costDirectCents) || 0;
      const overhead = Number(fin.overheadShareCents) || 0;
      const owner = Number(fin.ownerLaborCents) || 0;
      const freight = Number(fin.logisticsFreightCents) || 0;
      fin.totalCalculatedCostCents = direct + overhead + owner + freight;

      // Cálculo de Preço de Venda
      // 1. Margem sobre Venda: PV = Custo / (1 - (Margem% + Impostos%) / 100)
      // 2. Markup sobre Custo: PV = Custo * (1 + Markup% / 100)
      const cost = fin.totalCalculatedCostCents;
      const taxRate = (Number(fin.taxesPercent) || 0) / 100;

      if (fin.pricingMethod === 'markup_sobre_custo') {
        const markupRate = (Number(fin.markupPercent) || 35) / 100;
        fin.suggestedSellingPriceCents = Math.round(cost * (1 + markupRate) * (1 + taxRate));
      } else {
        // Margem sobre venda
        const marginRate = (Number(fin.targetMarginPercent) || 25) / 100;
        const denominator = 1 - (marginRate + taxRate);
        if (denominator > 0.05) {
          fin.suggestedSellingPriceCents = Math.round(cost / denominator);
        } else {
          fin.suggestedSellingPriceCents = Math.round(cost * 1.4);
        }
      }

      // Se o responsável aprovou um preço explícito
      const activeSellingPrice = fin.approvedSellingPriceCents !== null && fin.approvedSellingPriceCents !== undefined
        ? fin.approvedSellingPriceCents
        : fin.suggestedSellingPriceCents;

      // Calcular realizados vs pendentes
      const totalPaid = fin.transactions
        .filter((t) => t.type === 'receita_cliente' && t.status === 'realizado')
        .reduce((sum, t) => sum + (Number(t.amountCents) || 0), 0);

      fin.totalPaidCents = totalPaid;
      fin.remainingBalanceCents = Math.max(0, activeSellingPrice - totalPaid);

      // Sincronizar com budget do atendimento para retrocompatibilidade
      if (order.budget) {
        order.budget.sellingPriceCents = activeSellingPrice;
        order.budget.paymentTerms = fin.paymentConditions;
        order.budget.confirmedByResponsible = Boolean(fin.confirmedByResponsible);
      }

      const now = new Date().toISOString();
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: 'Mila (Administração Financeira)',
        stage: 'Mesa Financeira',
        action: 'Atualização financeira do pedido calculada',
        details: `Custo total: R$ ${(cost / 100).toFixed(2)} | Preço: R$ ${(activeSellingPrice / 100).toFixed(2)} (${fin.pricingMethod === 'margem_sobre_venda' ? 'Margem s/ Venda' : 'Markup s/ Custo'}) | Pago: R$ ${(totalPaid / 100).toFixed(2)}`,
      });

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Mila Financeiro',
        attendance: order,
      });

      res.json({ ok: true, order, financialData: fin });
    } catch (error) {
      console.error('Erro ao atualizar dados financeiros:', error);
      res.status(500).json({ error: 'Erro ao atualizar dados financeiros.' });
    }
  });

  // ===================== Mila — Financeiro da Fábrica (Fase 1) =====================

  // Resumo financeiro da fábrica: funciona sem nenhum pedido selecionado.
  // Consulta os MESMOS lançamentos usados pela área por pedido (sem duplicar).
  app.get('/api/office/financial-summary', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const month = typeof req.query.month === 'string' ? req.query.month : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const summary = computeFactoryFinancialSummary(store, month, category);
      res.json({ ok: true, summary });
    } catch (error) {
      console.error('Erro ao calcular resumo financeiro da fábrica:', error);
      res.status(500).json({ error: 'Erro ao calcular resumo financeiro da fábrica.' });
    }
  });

  // Saldo inicial: registrado uma única vez, com data de referência e confirmação explícita.
  // Nunca tratado como venda/recebimento de cliente (entra só no saldo de caixa total).
  app.post('/api/office/initial-balance', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { amountCents, referenceDate, confirmedBy, accountId } = req.body as {
        amountCents: number;
        referenceDate: string;
        confirmedBy?: string;
        accountId?: string;
      };

      if (store.officeData.initialBalance) {
        res.status(400).json({
          error: 'Saldo inicial já registrado anteriormente. Não é possível registrar novamente.',
          initialBalance: store.officeData.initialBalance,
        });
        return;
      }
      if (!amountCents || amountCents <= 0) {
        res.status(400).json({ error: 'Informe um valor de saldo inicial válido.' });
        return;
      }
      if (!referenceDate) {
        res.status(400).json({ error: 'Informe a data de referência do saldo inicial.' });
        return;
      }

      const now = new Date().toISOString();
      const resolvedAccountId =
        accountId && (store.officeData.cashAccounts || []).some((a) => a.id === accountId)
          ? accountId
          : (store.officeData.cashAccounts || [])[0]?.id;
      store.officeData.initialBalance = {
        amountCents,
        referenceDate,
        recordedAt: now,
        recordedBy: confirmedBy || undefined,
        accountId: resolvedAccountId,
      };

      if (!store.officeData.generalTransactions) store.officeData.generalTransactions = [];
      store.officeData.generalTransactions.unshift({
        id: `gt-saldo-inicial-${Date.now()}`,
        type: 'saldo_inicial',
        description: 'Saldo inicial de caixa da fábrica (não é venda nem recebimento de cliente)',
        amountCents,
        dueDate: referenceDate,
        paidDate: referenceDate,
        status: 'realizado',
        createdAt: now,
        source: 'fabrica',
        accountId: resolvedAccountId,
        history: [
          {
            action: 'Saldo inicial registrado',
            timestamp: now,
            notes: confirmedBy ? `Confirmado por ${confirmedBy}` : undefined,
          },
        ],
      });

      saveStore(store);
      res.json({ ok: true, initialBalance: store.officeData.initialBalance });
    } catch (error) {
      console.error('Erro ao registrar saldo inicial:', error);
      res.status(500).json({ error: 'Erro ao registrar saldo inicial.' });
    }
  });

  // Contas fixas: cadastro das despesas recorrentes da fábrica (definição, não o lançamento mensal).
  app.post('/api/office/fixed-expenses', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { name, category, amountCents, isVariableAmount, dueDayOfMonth, notes } = req.body as {
        name: string;
        category: string;
        amountCents: number | null;
        isVariableAmount: boolean;
        dueDayOfMonth: number;
        notes?: string;
      };

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Informe o nome da conta fixa.' });
        return;
      }
      if (!dueDayOfMonth || dueDayOfMonth < 1 || dueDayOfMonth > 31) {
        res.status(400).json({ error: 'Informe um dia de vencimento válido (1 a 31).' });
        return;
      }

      const now = new Date().toISOString();
      const expense: FixedExpense = {
        id: `fix-${Date.now()}`,
        name: name.trim(),
        category: category || 'Outro',
        amountCents: isVariableAmount ? null : amountCents ?? null,
        isVariableAmount: Boolean(isVariableAmount),
        dueDayOfMonth,
        active: true,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      if (!store.officeData.fixedExpenses) store.officeData.fixedExpenses = [];
      store.officeData.fixedExpenses.push(expense);
      saveStore(store);
      res.json({ ok: true, fixedExpense: expense, fixedExpenses: store.officeData.fixedExpenses });
    } catch (error) {
      console.error('Erro ao cadastrar conta fixa:', error);
      res.status(500).json({ error: 'Erro ao cadastrar conta fixa.' });
    }
  });

  app.put('/api/office/fixed-expenses/:id', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { id } = req.params;
      const updates = req.body as Partial<FixedExpense>;
      const expense = (store.officeData.fixedExpenses || []).find((f) => f.id === id);
      if (!expense) {
        res.status(404).json({ error: 'Conta fixa não encontrada.' });
        return;
      }
      Object.assign(expense, updates, { updatedAt: new Date().toISOString() });
      if (expense.isVariableAmount) expense.amountCents = null;
      saveStore(store);
      res.json({ ok: true, fixedExpense: expense, fixedExpenses: store.officeData.fixedExpenses });
    } catch (error) {
      console.error('Erro ao atualizar conta fixa:', error);
      res.status(500).json({ error: 'Erro ao atualizar conta fixa.' });
    }
  });

  app.delete('/api/office/fixed-expenses/:id', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { id } = req.params;
      store.officeData.fixedExpenses = (store.officeData.fixedExpenses || []).filter((f) => f.id !== id);
      saveStore(store);
      res.json({ ok: true, fixedExpenses: store.officeData.fixedExpenses });
    } catch (error) {
      console.error('Erro ao remover conta fixa:', error);
      res.status(500).json({ error: 'Erro ao remover conta fixa.' });
    }
  });

  // Gera as contas pendentes do mês para as contas fixas de valor conhecido.
  // Recorrência não significa pagamento realizado: toda conta nasce "previsto".
  // Contas de valor variável não são geradas automaticamente (nunca lançar R$ 0,00 fictício);
  // ficam como pendência para lançamento manual quando o valor real for conhecido.
  app.post('/api/office/fixed-expenses/generate-bills', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { referenceMonth } = req.body as { referenceMonth?: string };
      const month = referenceMonth || currentMonthKey();
      const [yearStr, monthStr] = month.split('-');

      if (!store.officeData.generalTransactions) store.officeData.generalTransactions = [];
      const fixedExpenses = store.officeData.fixedExpenses || [];

      let createdCount = 0;
      const pendingManual: string[] = [];
      const now = new Date().toISOString();

      for (const fe of fixedExpenses) {
        if (!fe.active) continue;
        const alreadyExists = store.officeData.generalTransactions.some(
          (t) => t.fixedExpenseId === fe.id && t.referenceMonth === month
        );
        if (alreadyExists) continue;

        if (fe.isVariableAmount || fe.amountCents == null) {
          pendingManual.push(fe.name);
          continue;
        }

        const day = String(Math.min(fe.dueDayOfMonth, 28)).padStart(2, '0');
        store.officeData.generalTransactions.push({
          id: `gt-fix-${fe.id}-${month}`,
          type: 'despesa_fixa',
          description: fe.name,
          amountCents: fe.amountCents,
          dueDate: `${yearStr}-${monthStr}-${day}`,
          status: 'previsto',
          createdAt: now,
          fixedExpenseId: fe.id,
          referenceMonth: month,
          source: 'fabrica',
          history: [{ action: 'Conta do mês gerada a partir da conta fixa cadastrada', timestamp: now }],
        });
        createdCount++;
      }

      saveStore(store);
      res.json({
        ok: true,
        createdCount,
        pendingManual,
        generalTransactions: store.officeData.generalTransactions,
      });
    } catch (error) {
      console.error('Erro ao gerar contas do mês:', error);
      res.status(500).json({ error: 'Erro ao gerar contas do mês.' });
    }
  });

  // Lançamento geral da fábrica (não vinculado a um pedido específico).
  app.post('/api/office/general-transaction', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const newTransaction = req.body.newTransaction as Omit<FinancialTransaction, 'id' | 'createdAt' | 'history'>;
      const confirmDespiteDuplicate = Boolean(req.body.confirmDespiteDuplicate);
      if (!newTransaction || !newTransaction.amountCents) {
        res.status(400).json({ error: 'Informe um valor válido para o lançamento.' });
        return;
      }

      if (!store.officeData.generalTransactions) store.officeData.generalTransactions = [];

      // Alerta de possível duplicidade: mesmo valor e tipo lançado nos últimos 3 dias,
      // com descrição ou pagador/favorecido parecidos. Nunca bloqueia — só avisa, e só
      // efetivamente registra se o pedido vier com confirmDespiteDuplicate=true.
      const now = new Date().toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const normalize = (s?: string) => (s || '').trim().toLowerCase();
      const possibleDuplicates = store.officeData.generalTransactions.filter(
        (t) =>
          t.type === newTransaction.type &&
          t.amountCents === Number(newTransaction.amountCents) &&
          (t.createdAt || '') >= threeDaysAgo &&
          (normalize(t.description) === normalize(newTransaction.description) ||
            (newTransaction.payerOrPayee && normalize(t.payerOrPayee) === normalize(newTransaction.payerOrPayee)))
      );
      if (possibleDuplicates.length > 0 && !confirmDespiteDuplicate) {
        res.json({
          ok: false,
          possibleDuplicate: true,
          duplicates: possibleDuplicates,
          message: 'Encontramos lançamento(s) parecido(s) nos últimos 3 dias. Confirme se não é duplicado.',
        });
        return;
      }

      const trans: FinancialTransaction = {
        id: `gt-${Date.now()}`,
        type: newTransaction.type,
        description: newTransaction.description || 'Lançamento geral da fábrica',
        amountCents: Number(newTransaction.amountCents) || 0,
        status: newTransaction.status || 'previsto',
        dueDate: newTransaction.dueDate || now.slice(0, 10),
        paidDate: newTransaction.paidDate,
        paymentMethod: newTransaction.paymentMethod,
        receiptNotes: newTransaction.receiptNotes,
        category: newTransaction.category,
        payerOrPayee: newTransaction.payerOrPayee,
        accountId: newTransaction.accountId,
        receiptImageUrl: newTransaction.receiptImageUrl,
        receiptMimeType: newTransaction.receiptMimeType,
        createdAt: now,
        source: 'fabrica',
        amountPaidCents: newTransaction.status === 'realizado' ? Number(newTransaction.amountCents) || 0 : 0,
        payments:
          newTransaction.status === 'realizado'
            ? [
                {
                  id: `pay-${Date.now()}`,
                  amountCents: Number(newTransaction.amountCents) || 0,
                  paidDate: newTransaction.paidDate || now.slice(0, 10),
                  paymentMethod: newTransaction.paymentMethod,
                },
              ]
            : [],
        history: [{ action: 'Lançamento geral registrado', timestamp: now }],
      };
      store.officeData.generalTransactions.unshift(trans);
      saveStore(store);
      res.json({ ok: true, transaction: trans, generalTransactions: store.officeData.generalTransactions });
    } catch (error) {
      console.error('Erro ao registrar lançamento geral:', error);
      res.status(500).json({ error: 'Erro ao registrar lançamento geral.' });
    }
  });

  // Registrar um pagamento (total ou parcial) numa conta geral pendente — nunca cria
  // outra despesa/receita: só atualiza o lançamento já existente. Também usada para
  // anexar um comprovante a uma conta pendente e quitá-la ao mesmo tempo.
  app.put('/api/office/general-transaction/:id/pay', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { id } = req.params;
      const {
        amountCents,
        paidDate,
        paymentMethod,
        receiptNotes,
        receiptImageUrl,
        receiptMimeType,
      } = req.body as {
        amountCents?: number;
        paidDate?: string;
        paymentMethod?: string;
        receiptNotes?: string;
        receiptImageUrl?: string;
        receiptMimeType?: string;
      };
      const trans = (store.officeData.generalTransactions || []).find((t) => t.id === id);
      if (!trans) {
        res.status(404).json({ error: 'Lançamento não encontrado.' });
        return;
      }
      if (trans.status === 'realizado') {
        res.status(400).json({ error: 'Este lançamento já está totalmente quitado.' });
        return;
      }
      const now = new Date().toISOString();
      const alreadyPaid = trans.amountPaidCents || 0;
      const remaining = Math.max(0, trans.amountCents - alreadyPaid);
      const payAmount = amountCents != null ? Number(amountCents) : remaining;
      if (!payAmount || payAmount <= 0) {
        res.status(400).json({ error: 'Informe um valor de pagamento válido.' });
        return;
      }
      if (payAmount > remaining) {
        res.status(400).json({
          error: `Valor informado (R$ ${(payAmount / 100).toFixed(2)}) excede o saldo pendente (R$ ${(remaining / 100).toFixed(2)}).`,
        });
        return;
      }

      if (!trans.payments) trans.payments = [];
      trans.payments.push({
        id: `pay-${Date.now()}`,
        amountCents: payAmount,
        paidDate: paidDate || now.slice(0, 10),
        paymentMethod,
        notes: receiptNotes,
      });
      trans.amountPaidCents = alreadyPaid + payAmount;
      trans.status = trans.amountPaidCents >= trans.amountCents ? 'realizado' : 'parcial';
      trans.paidDate = paidDate || now.slice(0, 10);
      if (paymentMethod) trans.paymentMethod = paymentMethod;
      if (receiptNotes) trans.receiptNotes = receiptNotes;
      if (receiptImageUrl) {
        trans.receiptImageUrl = receiptImageUrl;
        trans.receiptMimeType = receiptMimeType;
      }
      trans.history.push({
        action: trans.status === 'realizado' ? 'Conta quitada' : 'Pagamento parcial registrado',
        timestamp: now,
        notes: `R$ ${(payAmount / 100).toFixed(2)}`,
      });
      saveStore(store);
      res.json({ ok: true, transaction: trans, generalTransactions: store.officeData.generalTransactions });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      res.status(500).json({ error: 'Erro ao registrar pagamento.' });
    }
  });

  // Excluir um lançamento geral da fábrica (lançado por engano, duplicado, etc.).
  // Só atua sobre store.officeData.generalTransactions — nunca alcança lançamentos
  // vinculados a um pedido (esses vivem em attendance.financialData.transactions).
  // O saldo inicial não pode ser excluído por aqui para não dessincronizar com
  // officeData.initialBalance.
  app.delete('/api/office/general-transaction/:id', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { id } = req.params;
      const list = store.officeData.generalTransactions || [];
      const trans = list.find((t) => t.id === id);
      if (!trans) {
        res.status(404).json({ error: 'Lançamento não encontrado.' });
        return;
      }
      if (trans.type === 'saldo_inicial') {
        res.status(400).json({
          error: 'O saldo inicial não pode ser excluído por aqui. Fale com o suporte técnico para corrigi-lo.',
        });
        return;
      }
      store.officeData.generalTransactions = list.filter((t) => t.id !== id);
      saveStore(store);
      res.json({ ok: true, generalTransactions: store.officeData.generalTransactions });
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      res.status(500).json({ error: 'Erro ao excluir lançamento.' });
    }
  });

  // Retirada confirmada da reserva do Edson — gera saída real de caixa, uma única vez por valor confirmado.
  // Bloqueia se o valor pedido exceder o saldo de reserva restante do mês (nunca permite "estourar" a reserva).
  app.post('/api/office/edson-reserve/withdraw', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { referenceMonth, amountCents, confirmedBy, notes, accountId } = req.body as {
        referenceMonth?: string;
        amountCents: number;
        confirmedBy?: string;
        notes?: string;
        accountId?: string;
      };
      const month = referenceMonth || currentMonthKey();

      if (!amountCents || amountCents <= 0) {
        res.status(400).json({ error: 'Informe um valor de retirada válido.' });
        return;
      }
      if (!confirmedBy || !confirmedBy.trim()) {
        res.status(400).json({ error: 'Informe o nome de quem confirma a retirada.' });
        return;
      }

      const summary = computeFactoryFinancialSummary(store, month);
      if (amountCents > summary.edsonReserve.remainingCents) {
        res.status(400).json({
          error: `Valor solicitado (R$ ${(amountCents / 100).toFixed(2)}) excede a reserva restante do mês (R$ ${(summary.edsonReserve.remainingCents / 100).toFixed(2)}).`,
          remainingCents: summary.edsonReserve.remainingCents,
        });
        return;
      }

      if (!store.officeData.generalTransactions) store.officeData.generalTransactions = [];
      const now = new Date().toISOString();
      const trans: FinancialTransaction = {
        id: `gt-retirada-edson-${Date.now()}`,
        type: 'retirada_reserva_edson',
        description: `Retirada confirmada da reserva do Edson — ${month}`,
        amountCents,
        status: 'realizado',
        dueDate: now.slice(0, 10),
        paidDate: now.slice(0, 10),
        receiptNotes: notes,
        createdAt: now,
        referenceMonth: month,
        source: 'fabrica',
        accountId,
        amountPaidCents: amountCents,
        payments: [{ id: `pay-${Date.now()}`, amountCents, paidDate: now.slice(0, 10) }],
        history: [
          { action: 'Retirada confirmada pelo responsável', timestamp: now, notes: `Confirmado por ${confirmedBy}` },
        ],
      };
      store.officeData.generalTransactions.unshift(trans);
      saveStore(store);

      const updatedSummary = computeFactoryFinancialSummary(store, month);
      res.json({ ok: true, transaction: trans, edsonReserve: updatedSummary.edsonReserve });
    } catch (error) {
      console.error('Erro ao registrar retirada da reserva do Edson:', error);
      res.status(500).json({ error: 'Erro ao registrar retirada da reserva do Edson.' });
    }
  });

  // Contas (caixa/banco) onde o dinheiro da fábrica está fisicamente.
  app.post('/api/office/accounts', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { name, type } = req.body as { name: string; type?: CashAccount['type'] };
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Informe o nome da conta.' });
        return;
      }
      const now = new Date().toISOString();
      const account: CashAccount = {
        id: `acc-${Date.now()}`,
        name: name.trim(),
        type: type || 'outro',
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      if (!store.officeData.cashAccounts) store.officeData.cashAccounts = [];
      store.officeData.cashAccounts.push(account);
      saveStore(store);
      res.json({ ok: true, account, cashAccounts: store.officeData.cashAccounts });
    } catch (error) {
      console.error('Erro ao cadastrar conta:', error);
      res.status(500).json({ error: 'Erro ao cadastrar conta.' });
    }
  });

  app.put('/api/office/accounts/:id', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { id } = req.params;
      const updates = req.body as Partial<CashAccount>;
      const account = (store.officeData.cashAccounts || []).find((a) => a.id === id);
      if (!account) {
        res.status(404).json({ error: 'Conta não encontrada.' });
        return;
      }
      Object.assign(account, updates, { updatedAt: new Date().toISOString() });
      saveStore(store);
      res.json({ ok: true, account, cashAccounts: store.officeData.cashAccounts });
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      res.status(500).json({ error: 'Erro ao atualizar conta.' });
    }
  });

  // Transferência entre contas: só move o saldo individual de cada uma, nunca entra
  // como receita/despesa no consolidado geral da fábrica.
  app.post('/api/office/transfer', (req, res) => {
    try {
      const store = loadStore();
      if (!store.officeData) store.officeData = createDefaultOfficeData();
      const { fromAccountId, toAccountId, amountCents, date, notes, createdBy } = req.body as {
        fromAccountId: string;
        toAccountId: string;
        amountCents: number;
        date?: string;
        notes?: string;
        createdBy?: string;
      };
      const accounts = store.officeData.cashAccounts || [];
      if (!accounts.some((a) => a.id === fromAccountId) || !accounts.some((a) => a.id === toAccountId)) {
        res.status(400).json({ error: 'Conta de origem ou destino inválida.' });
        return;
      }
      if (fromAccountId === toAccountId) {
        res.status(400).json({ error: 'A conta de origem e destino não podem ser a mesma.' });
        return;
      }
      if (!amountCents || amountCents <= 0) {
        res.status(400).json({ error: 'Informe um valor de transferência válido.' });
        return;
      }
      const now = new Date().toISOString();
      const transfer: CashTransfer = {
        id: `trf-${Date.now()}`,
        fromAccountId,
        toAccountId,
        amountCents,
        date: date || now.slice(0, 10),
        notes,
        createdAt: now,
        createdBy,
      };
      if (!store.officeData.cashTransfers) store.officeData.cashTransfers = [];
      store.officeData.cashTransfers.unshift(transfer);
      saveStore(store);
      res.json({ ok: true, transfer, cashTransfers: store.officeData.cashTransfers });
    } catch (error) {
      console.error('Erro ao registrar transferência:', error);
      res.status(500).json({ error: 'Erro ao registrar transferência.' });
    }
  });

  // Atualização de Projetos & Fabricação com o Agente Lucas
  app.post('/api/orders/manufacturing', (req, res) => {
    try {
      const store = loadStore();
      const { orderId, manufacturingData, actorLabel, stageLabel } = req.body as {
        orderId: string;
        manufacturingData: Partial<ManufacturingProjectData>;
        actorLabel?: string;
        stageLabel?: string;
      };

      const order = store.attendances.find((a) => a.id === orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido/atendimento não encontrado.' });
        return;
      }

      const now = new Date().toISOString();

      if (!order.manufacturingData) {
        order.manufacturingData = {
          modelCode: `MOD-${order.attendanceNumber}`,
          modelName: order.furnitureType || 'Estofado Sob Encomenda',
          category: 'sofa',
          version: 'v1.0-rascunho',
          isDraft: true,
          unitDimensions: {
            widthMm: 1600,
            depthMm: 880,
            heightMm: 920,
            seatHeightMm: 450,
            source: 'proposta_pendente',
          },
          components: [],
          materialRequirements: [],
          assemblyManual: {
            version: 'v1.0-rascunho',
            isDraft: true,
            modelCode: `MOD-${order.attendanceNumber}`,
            modelName: order.furnitureType || 'Estofado Sob Encomenda',
            status: 'rascunho_tecnico',
            lastUpdatedAt: now,
            referenceImages: [],
            steps: [],
            materialsAndTools: [],
            generalPreparationNotes: '',
            finalInspectionCriteria: '',
          },
          qualityCheckpoints: [],
          technicalNotes: '',
        };
      }

      if (manufacturingData) {
        Object.assign(order.manufacturingData, manufacturingData);
      }

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: actorLabel || 'Lucas (Projetos & Fabricação)',
        stage: stageLabel || 'Mesa de Projetos',
        action: `Ficha técnica e projeto atualizados (${order.manufacturingData?.version || 'v1.0'})`,
        details: `${order.manufacturingData?.components?.length || 0} componentes | ${order.manufacturingData?.materialRequirements?.length || 0} requisitos de materiais`,
      });

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: stageLabel || 'Lucas Projetos',
        attendance: order,
      });

      res.json({ ok: true, order, manufacturingData: order.manufacturingData });
    } catch (error) {
      console.error('Erro ao atualizar projeto de fabricação:', error);
      res.status(500).json({ error: 'Erro ao atualizar projeto de fabricação.' });
    }
  });

  // Atualização Estratégica com Castro
  app.post('/api/orders/strategy', (req, res) => {
    try {
      const store = loadStore();
      const {
        officeDataUpdates,
        newRecommendation,
        updateRecommendationStatus,
        newWeeklyPlanItem,
      } = req.body as {
        officeDataUpdates?: Partial<SharedOfficeData>;
        newRecommendation?: BusinessStrategyRecommendation;
        updateRecommendationStatus?: { id: string; status: BusinessStrategyRecommendation['status'] };
        newWeeklyPlanItem?: WeeklyActionPlanItem;
      };

      if (!store.officeData) {
        store.officeData = {
          handoffs: [],
          generalTransactions: [],
          strategyRecommendations: [],
          weeklyStrategyPlans: [],
          weeklyActionPlans: [],
          recommendations: [],
          activeBottlenecks: [],
          workshopCapacityHoursPerWeek: 80,
          currentPlannedHoursWeek: 42,
          lastReconciledAt: new Date().toISOString(),
        };
      }
      if (!store.officeData.recommendations) {
        store.officeData.recommendations = [];
      }
      if (!store.officeData.weeklyActionPlans) {
        store.officeData.weeklyActionPlans = [];
      }

      if (officeDataUpdates && store.officeData) {
        Object.assign(store.officeData, officeDataUpdates);
      }

      if (newRecommendation && store.officeData.recommendations) {
        store.officeData.recommendations.unshift(newRecommendation);
      }

      if (updateRecommendationStatus && store.officeData.recommendations) {
        const target = store.officeData.recommendations.find(
          (r) => r.id === updateRecommendationStatus.id
        );
        if (target) {
          target.status = updateRecommendationStatus.status;
        }
      }

      if (newWeeklyPlanItem && store.officeData.weeklyActionPlans && store.officeData.weeklyActionPlans.length > 0) {
        store.officeData.weeklyActionPlans[0].actions.push(newWeeklyPlanItem);
      }

      if (store.officeData) {
        store.officeData.lastReconciledAt = new Date().toISOString();
      }
      saveStore(store);

      broadcastRealtimeEvent({
        type: 'strategy:updated',
        timestamp: new Date().toISOString(),
        sourceStationName: 'Castro Estratégia',
      });

      res.json({ ok: true, officeData: store.officeData });
    } catch (error) {
      console.error('Erro ao atualizar estratégia:', error);
      res.status(500).json({ error: 'Erro ao atualizar dados estratégicos.' });
    }
  });

  // Reserva de materiais e controle de estoque compartilhado
  app.post('/api/materials/reserve', (req, res) => {
    try {
      const store = loadStore();
      const { materialId, deltaReserved, deltaPhysical, reason } = req.body as {
        materialId: string;
        deltaReserved?: number;
        deltaPhysical?: number;
        reason?: string;
      };

      const material = store.materials.find(
        (m) => m.id === materialId || m.code === materialId
      );
      if (!material) {
        res.status(404).json({ error: 'Material não encontrado no catálogo compartilhado.' });
        return;
      }

      if (deltaReserved !== undefined) {
        material.reservedStock = Math.max(0, (material.reservedStock || 0) + deltaReserved);
      }
      if (deltaPhysical !== undefined) {
        material.physicalStock = Math.max(0, (material.physicalStock || 0) + deltaPhysical);
      }
      material.updatedAt = new Date().toISOString();

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'materials:updated',
        timestamp: new Date().toISOString(),
        sourceStationName: 'Estoque Central Castros',
        materials: store.materials,
      });

      res.json({ ok: true, material, reason });
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      res.status(500).json({ error: 'Erro ao atualizar estoque.' });
    }
  });

  // Criar novo pedido (Reforma ou Fabricação Nova) com roteamento de mesa
  app.post('/api/orders/create-order', (req, res) => {
    try {
      const store = loadStore();
      if (!store.clients) store.clients = [];
      const {
        requestType,
        orderType: incomingOrderType,
        clientId: incomingClientId,
        clientName,
        clientPhone,
        clientEmail,
        furnitureType,
        piecesCount,
        approxMeasurements,
        desiredService,
        fabricAndComfortPreference,
        neighborhood,
        city,
        fullAddress,
        address,
        notes,
        assignedDesk,
        additionalProducts: incomingAdditionalProducts,
      } = req.body as {
        requestType?: AttendanceRequestType;
        orderType?: OrderType;
        clientId?: string;
        clientName: string;
        clientPhone?: string;
        clientEmail?: string;
        furnitureType?: string;
        piecesCount?: string;
        approxMeasurements?: string;
        desiredService?: string;
        fabricAndComfortPreference?: string;
        neighborhood?: string;
        city?: string;
        fullAddress?: string;
        address?: ClientAddress;
        notes?: string;
        assignedDesk?: DepartmentId;
        additionalProducts?: Array<Partial<OrderProduct>>;
      };

      // Produtos além do principal (ex.: sofá + 2 poltronas no mesmo pedido) — o produto
      // principal continua sendo furnitureType/piecesCount/approxMeasurements acima.
      // Só exige a descrição; quantidade/medidas ficam pendentes se não vierem, igual ao
      // resto do cadastro da Carla.
      const now0 = new Date().toISOString();
      const normalizedAdditionalProducts: OrderProduct[] = Array.isArray(incomingAdditionalProducts)
        ? incomingAdditionalProducts
            .filter((p) => p && typeof p.description === 'string' && p.description.trim())
            .map((p, idx) => ({
              id: p.id || `prod-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              description: p.description!.trim(),
              quantity: p.quantity || '1 unidade',
              measurements: p.measurements || undefined,
              notes: p.notes || undefined,
              createdAt: p.createdAt || now0,
            }))
        : [];

      // Carla deve poder salvar o atendimento mesmo com dados faltando, mostrando as
      // pendências depois — nunca rejeitar o cadastro por falta de campos secundários.
      // O único dado indispensável para existir um registro localizável é o nome do cliente.
      if (!clientName || !clientName.trim()) {
        res.status(400).json({ error: 'Informe ao menos o nome do cliente para registrar o atendimento.' });
        return;
      }

      // requestType é a classificação da Carla no atendimento; orderType só existe para
      // pedidos operacionais reais (reforma/fabricação) que seguem o fluxo de mesas.
      const effectiveRequestType: AttendanceRequestType = requestType || (incomingOrderType === 'Fabricação' ? 'fabricacao_nova' : 'reforma');

      // Para um pedido operacional (reforma/fabricação), a escolha do tipo é obrigatória —
      // o formulário tem que mandar o orderType explicitamente, nunca um valor adivinhado
      // aqui no servidor. Só não se aplica a solicitações que não são um pedido (compra de
      // produto, acompanhamento, reclamação), que não têm orderType mesmo.
      if (
        (effectiveRequestType === 'reforma' || effectiveRequestType === 'fabricacao_nova') &&
        incomingOrderType !== 'Reforma' &&
        incomingOrderType !== 'Fabricação'
      ) {
        res.status(400).json({
          error: 'Escolha o tipo do atendimento (Reforma de estofado ou Fabricação de móvel novo) antes de concluir.',
        });
        return;
      }
      const orderType: OrderType | undefined =
        incomingOrderType ||
        (effectiveRequestType === 'fabricacao_nova'
          ? 'Fabricação'
          : effectiveRequestType === 'reforma'
          ? 'Reforma'
          : undefined);

      // Cadastro de clientes: reaproveita o cliente indicado (por id, ou por telefone/nome
      // já cadastrado) em vez de duplicar a pessoa a cada atendimento novo.
      let linkedClient = incomingClientId ? store.clients.find((c) => c.id === incomingClientId) : undefined;
      if (!linkedClient) {
        linkedClient = findClientByPhoneOrName(store.clients, clientPhone, clientName);
      }
      const clientNowTs = new Date().toISOString();
      if (linkedClient) {
        // Completa (nunca sobrescreve) o cadastro existente com dado novo informado agora.
        if (clientPhone && !linkedClient.phone) linkedClient.phone = clientPhone;
        if (clientEmail && !linkedClient.email) linkedClient.email = clientEmail;
        if (address) {
          linkedClient.address = {
            ...linkedClient.address,
            ...Object.fromEntries(Object.entries(address).filter(([, v]) => v)),
          };
        }
        if (neighborhood && !linkedClient.address.neighborhood) linkedClient.address.neighborhood = neighborhood;
        if (city && !linkedClient.address.city) linkedClient.address.city = city;
        if (fullAddress && !linkedClient.address.street) linkedClient.address.street = fullAddress;
        linkedClient.updatedAt = clientNowTs;
      } else {
        linkedClient = {
          id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: clientName.trim(),
          phone: clientPhone || '',
          email: clientEmail || undefined,
          address: {
            ...(address || {}),
            neighborhood: address?.neighborhood || neighborhood || undefined,
            city: address?.city || city || undefined,
            street: address?.street || fullAddress || undefined,
          },
          createdAt: clientNowTs,
          updatedAt: clientNowTs,
        };
        store.clients.push(linkedClient);
      }
      // Endereço efetivo deste atendimento: o do cadastro do cliente (já mesclado acima),
      // com prioridade para o que foi digitado agora especificamente neste atendimento.
      const effectiveNeighborhood = neighborhood || linkedClient.address.neighborhood;
      const effectiveCity = city || linkedClient.address.city;
      const effectiveFullAddress =
        fullAddress ||
        [
          linkedClient.address.street,
          linkedClient.address.number,
          linkedClient.address.complement,
        ]
          .filter(Boolean)
          .join(', ') || undefined;

      const now = new Date().toISOString();
      const count = store.attendances.length + 1;
      const formattedSeq = String(count).padStart(4, '0');
      const orderNumber =
        orderType === 'Fabricação'
          ? `FAB-2026-${formattedSeq}`
          : `CI-2026-${formattedSeq}`;

      // Encaminhamento automático: Reforma vai direto para a avaliação técnica do Pedro,
      // Fabricação vai direto para projetos do Lucas — sem precisar abrir a mesa de destino
      // para repetir o cadastro. Para solicitações que não são um pedido operacional
      // (compra de produto, acompanhamento, reclamação), a Carla continua responsável
      // direta, já que não existe mesa técnica para rotear.
      const desk =
        assignedDesk ||
        (orderType === 'Fabricação' ? 'lucas_projetos' : orderType === 'Reforma' ? 'pedro_avaliacao' : 'carla_atendimento');
      const agentNames: Record<string, string> = {
        carla_atendimento: 'Carla (Atendimento ao Cliente)',
        pedro_avaliacao: 'Pedro (Avaliação Técnica)',
        lucas_projetos: 'Lucas (Projetos & Fabricação)',
        ana_compras: 'Ana (Compras & Suprimentos)',
        mila_financeiro: 'Mila (Administração Financeira)',
        castro_estrategia: 'Castro (Estratégia & Negócio)',
        julia_marketing: 'Júlia (Marketing & Divulgação)',
        tapeceiro_tecnico: 'Tapeceiro Técnico (Produção e Materiais)',
      };
      const orderId = `ord-${Date.now()}`;
      const resolvedFurnitureType = furnitureType || 'A confirmar';

      const newOrder: AttendanceRecord = {
        id: orderId,
        ownerId: 'default-owner',
        attendanceNumber: orderNumber,
        status: 'em_andamento',
        currentStep: 1,
        clientName,
        clientPhone: clientPhone || linkedClient.phone || '',
        clientEmail: clientEmail || linkedClient.email || '',
        clientId: linkedClient.id,
        requestType: effectiveRequestType,
        neighborhood: effectiveNeighborhood,
        city: effectiveCity,
        fullAddress: effectiveFullAddress,
        furnitureType: resolvedFurnitureType,
        piecesCount: piecesCount || '1 unidade',
        approxMeasurements: approxMeasurements || 'A validar na oficina',
        usageTime: orderType === 'Fabricação' ? 'Novo (fabricação sob medida)' : 'A confirmar',
        reportedDefects: orderType === 'Fabricação' ? 'N/A - Produto novo' : effectiveRequestType === 'compra_produto' ? 'N/A - Compra de produto' : 'Desgaste / reforma',
        desiredService:
          desiredService ||
          (orderType === 'Fabricação'
            ? 'Fabricação completa sob encomenda'
            : effectiveRequestType === 'compra_produto'
            ? 'Compra de produto já pronto'
            : effectiveRequestType === 'acompanhamento'
            ? 'Acompanhamento de pedido em andamento'
            : effectiveRequestType === 'reclamacao'
            ? 'Registro de reclamação'
            : 'Reforma e estofamento'),
        previousReforms: '',
        fabricAndComfortPreference: fabricAndComfortPreference || 'A definir',
        notes: notes || '',
        createdAt: now,
        updatedAt: now,
        photos: [],
        leftRightReference: '',
        defectFindings: [],
        analysisLimitations: [],
        requestedAdditionalPhotos: [],
        aiPreliminarySummary: '',
        reviewCompleted: false,
        reviewerName: 'Responsável',
        reviewerGeneralNotes: '',
        internalInspectionCompleted: false,
        reuseItems: [],
        foamInspection: {
          inspectedByWorkshop: false,
          permanentDeformation: 'Não avaliado',
          compressionReturn: 'Não avaliado',
          crumbling: 'Não avaliado',
          odor: 'Não avaliado',
          moisture: 'Não avaliado',
          workshopNotes: 'Avaliação inicial pendente',
        },
        materialConsumptionAndReworkAnalysis: '',
        proposals: [],
        selectedProposalTier: 'ESSENCIAL',
        budget: {
          items: [],
          cuttingPlanConfirmed: false,
          sellingPriceCents: null,
          paymentConditions: '50% entrada e 50% na entrega',
          estimatedDeadline: '15 dias úteis',
          confirmedByResponsible: false,
          responsibleName: 'Oficina Castros',
          subtotalCents: 0,
          discountsCents: 0,
          laborCents: 0,
          overheadCents: 0,
          paymentTerms: '50% entrada e 50% na entrega',
        },
        opinion: {
          isPreliminary: true,
          structureStateSummary: '',
          damageExtentSummary: '',
          possibleRecoverySummary: '',
          reusableMaterialsSummary: '',
          complexityLevel: 'A confirmar na oficina',
          expectedResultSummary: '',
          conclusion: 'Dados insuficientes para concluir',
          reasons: 'Inspeção e briefing inicial',
          pendingFactors: 'Inspeção e detalhamento de projeto',
          whatCouldChangeConclusion: 'Validação de dimensões e materiais',
          clientPlainLanguageSummary: 'Novo pedido registrado no sistema.',
          recommendedNextStep: `Análise técnica na mesa ${desk}`,
        },
        hiddenDamages: [],
        auditHistory: [
          {
            id: `aud-${Date.now()}`,
            timestamp: now,
            actor: 'Recepção / Escritório',
            stage: 'Abertura de Pedido',
            action: `Atendimento ${orderNumber} (${effectiveRequestType}) criado`,
            details: `Cliente: ${clientName} | Móvel/produto: ${resolvedFurnitureType} | Mesa inicial: ${desk}`,
          },
        ],
        staleness: {
          defectsAnalysisNeedsReview: true,
          responsibleReviewNeedsUpdate: true,
          reuseNeedsReview: true,
          proposalNeedsReview: true,
          opinionNeedsReview: true,
        },
        orderType,
        currentDesk: desk,
        deskStatus: 'novo',
        assignedAgentName: agentNames[desk] || desk,
        handoffHistory:
          desk !== 'carla_atendimento'
            ? [
                {
                  id: `hnd-${Date.now()}`,
                  orderId,
                  orderNumber: orderNumber,
                  fromDesk: 'carla_atendimento',
                  fromAgentName: 'Carla',
                  toDesk: desk,
                  toAgentName: agentNames[desk] || desk,
                  timestamp: now,
                  reason: 'Abertura e direcionamento do novo pedido',
                  summaryOfCompletedWork: 'Dados cadastrais coletados',
                  completedSummary: 'Dados cadastrais coletados',
                  pendingItems: ['Ficha técnica', 'Levantamento de materiais', 'Cotação'],
                  expectedNextAction: 'Abertura dos trabalhos na mesa correspondente',
                  nextActionExpected: 'Abertura dos trabalhos na mesa correspondente',
                  documentVersion: 'v1.0',
                  status: 'pendente_aceite',
                },
              ]
            : [],
        financialData: {
          pricingMethod: 'margem_sobre_venda',
          targetMarginPercent: 30,
          markupMultiplier: 1.45,
          totalCalculatedCostCents: 0,
          suggestedSellingPriceCents: 0,
          approvedSellingPriceCents: null,
          paymentConditions: '50% entrada e 50% na entrega',
          transactions: [],
        },
        additionalProducts: normalizedAdditionalProducts.length ? normalizedAdditionalProducts : undefined,
      };

      store.attendances.unshift(newOrder);
      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:created',
        timestamp: now,
        sourceStationName: 'Abertura de Pedido',
        attendance: newOrder,
      });

      res.json({ ok: true, order: newOrder, client: linkedClient });
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: 'Erro ao criar pedido.' });
    }
  });

  // Lista de produtos (principal + adicionais) de um pedido, usada pelas rotas de
  // avaliação técnica / orçamento itemizado abaixo para validar productId e montar as
  // listas que o front mostra (Pedro/Lucas/Mila).
  function listOrderProducts(order: AttendanceRecord): Array<{ id: string; label: string }> {
    const list: Array<{ id: string; label: string }> = [
      { id: 'primary', label: `${order.furnitureType} (${order.piecesCount})` },
    ];
    for (const p of order.additionalProducts || []) {
      list.push({ id: p.id, label: `${p.description} (${p.quantity})` });
    }
    return list;
  }

  // Pedro/Lucas — avaliação técnica enxuta por produto: serviços, materiais, mão de
  // obra e prazo. Não exige preencher todos os produtos de uma vez — grava um de cada
  // vez por productId, sem apagar avaliações já feitas de outros produtos do mesmo pedido.
  app.post('/api/orders/:id/technical-evaluation', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const { productId, servicesNeeded, materials, laborHours, laborCostCents, estimatedDeadlineDays, notes, evaluatedBy } =
        req.body as {
          productId: string;
          servicesNeeded?: string;
          materials?: ProductMaterialNeed[];
          laborHours?: number | null;
          laborCostCents?: number | null;
          estimatedDeadlineDays?: number | null;
          notes?: string;
          evaluatedBy?: string;
        };

      const validIds = listOrderProducts(order).map((p) => p.id);
      if (!productId || !validIds.includes(productId)) {
        res.status(400).json({ error: 'Produto do pedido não encontrado (productId inválido).' });
        return;
      }

      const now = new Date().toISOString();
      const evaluation: ProductTechnicalEvaluation = {
        productId,
        servicesNeeded: servicesNeeded || '',
        // Nunca inventa custo: todo material sem unitCostCents vindo do front fica null
        // (pendente), nunca preenchido aqui com um palpite.
        materials: Array.isArray(materials)
          ? materials.map((m) => ({
              catalogItemId: m.catalogItemId,
              name: m.name,
              quantity: m.quantity ?? null,
              unit: m.unit || 'un',
              unitCostCents: m.unitCostCents ?? null,
            }))
          : [],
        laborHours: laborHours ?? null,
        laborCostCents: laborCostCents ?? null,
        estimatedDeadlineDays: estimatedDeadlineDays ?? null,
        notes: notes || undefined,
        evaluatedBy: evaluatedBy || undefined,
        evaluatedAt: now,
      };

      if (!order.productEvaluations) order.productEvaluations = {};
      order.productEvaluations[productId] = evaluation;
      order.updatedAt = now;

      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: evaluatedBy || 'Avaliação Técnica',
        stage: 'Avaliação Técnica por Produto',
        action: `Avaliação técnica salva para o produto ${productId}`,
        details: servicesNeeded || 'Sem descrição de serviços informada.',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Avaliação Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, evaluation });
    } catch (error) {
      console.error('Erro ao salvar avaliação técnica por produto:', error);
      res.status(500).json({ error: 'Erro ao salvar avaliação técnica por produto.' });
    }
  });

  // Pedro/Lucas — encaminhar o pedido para a Mila depois da avaliação técnica, mantendo
  // o mesmo pedido e todos os anexos (não cria nada novo, só reatribui a mesa — mesmo
  // mecanismo genérico já usado em /api/orders/transfer).
  app.post('/api/orders/:id/forward-to-mila', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const { fromDesk } = req.body as { fromDesk: DepartmentId };
      const { handoff, alreadyTransferred } = createOrderHandoff(store, order, {
        fromDesk: fromDesk || order.currentDesk || 'pedro_avaliacao',
        toDesk: 'mila_financeiro',
        reason: 'Avaliação técnica concluída — encaminhado para orçamento.',
        completedSummary: 'Avaliação técnica por produto registrada (serviços, materiais, mão de obra, prazo).',
        nextActionExpected: 'Montar orçamento itemizado e homologar.',
      });
      if (!alreadyTransferred) {
        saveStore(store);
        broadcastRealtimeEvent({
          type: 'attendance:updated',
          timestamp: new Date().toISOString(),
          sourceStationName: 'Mesa mila_financeiro',
          attendance: order,
        });
      }
      res.json({ ok: true, order, handoff, alreadyTransferred });
    } catch (error) {
      console.error('Erro ao encaminhar pedido para a Mila:', error);
      res.status(500).json({ error: 'Erro ao encaminhar pedido para a Mila.' });
    }
  });

  // Mila — monta/atualiza o orçamento itemizado (por produto + total), a partir das
  // avaliações técnicas (productEvaluations) e do catálogo de materiais. Nunca inventa
  // custo: todo material sem preço no catálogo entra com unitCostCents: null e o produto
  // fica com costsPending: true. Ao homologar (confirmedByResponsible: true), encaminha
  // automaticamente o pedido para a Carla com status 'aguardando_negociacao_cliente'.
  app.post('/api/orders/:id/itemized-budget', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const {
        discountCents,
        appliedMarginPercent,
        appliedFeeCents,
        confirmedByResponsible,
        responsibleName,
        fromDesk,
      } = req.body as {
        discountCents?: number;
        appliedMarginPercent?: number;
        appliedFeeCents?: number;
        confirmedByResponsible?: boolean;
        responsibleName?: string;
        fromDesk?: DepartmentId;
      };

      const products = listOrderProducts(order);
      const evaluations = order.productEvaluations || {};
      const policy = store.settings?.negotiationPolicy;
      const marginPercent = appliedMarginPercent ?? policy?.defaultMarginPercent ?? 0;

      const byProduct: ItemizedBudgetEntry[] = products.map((p) => {
        const evaluation = evaluations[p.id];
        const materials = evaluation?.materials || [];
        const items: BudgetLineItem[] = materials.map((m, idx) => {
          const catalogMatch =
            (m.catalogItemId ? store.materials.find((cm) => cm.id === m.catalogItemId) : null) ||
            store.materials.find(
              (cm) =>
                cm.name.toLowerCase() === m.name.toLowerCase() ||
                (cm.code && m.name.toLowerCase().includes(cm.code.toLowerCase()))
            );
          const unitCostCents = m.unitCostCents ?? catalogMatch?.unitCostCents ?? null;
          return {
            id: `ibi-${p.id}-${idx}`,
            catalogItemId: catalogMatch?.id || m.catalogItemId,
            category: 'Material' as BudgetLineCategory,
            name: m.name,
            unit: m.unit || 'un',
            quantity: m.quantity ?? null,
            quantityStatus: m.quantity == null ? 'A levantar (requer medidas e plano de corte)' : 'Definida',
            unitCostCents,
          };
        });
        if (evaluation?.laborCostCents != null) {
          items.push({
            id: `ibi-${p.id}-labor`,
            category: 'Mão de obra' as BudgetLineCategory,
            name: 'Mão de obra',
            unit: 'serviço',
            quantity: 1,
            quantityStatus: 'Definida',
            unitCostCents: evaluation.laborCostCents,
          });
        }
        // Produto sem avaliação técnica nenhuma ainda não pode ser homologado — um preço de
        // R$0,00 silencioso seria inventar que o produto não custa nada, não "pendente".
        const costsPending =
          !evaluation || items.some((it) => it.unitCostCents == null || it.quantity == null);
        const materialsCostCents = items.reduce(
          (sum, it) => sum + (it.unitCostCents || 0) * (it.quantity || 0),
          0
        );
        const sellingPriceCents = costsPending
          ? null
          : Math.round(materialsCostCents * (1 + marginPercent / 100));
        return { productId: p.id, items, sellingPriceCents, costsPending };
      });

      const anyPending = byProduct.some((b) => b.costsPending);
      const subtotalCents = byProduct.reduce((sum, b) => sum + (b.sellingPriceCents || 0), 0);
      const feeCents = appliedFeeCents ?? (policy?.feePercent ? Math.round(subtotalCents * (policy.feePercent / 100)) : 0);
      const discount = discountCents || 0;
      const totalSellingPriceCents = anyPending ? null : Math.max(0, subtotalCents + feeCents - discount);

      const now = new Date().toISOString();
      const itemizedBudget: ItemizedBudget = {
        byProduct,
        appliedMarginPercent: marginPercent,
        appliedFeeCents: feeCents,
        discountCents: discount,
        totalSellingPriceCents,
        confirmedByResponsible: Boolean(confirmedByResponsible) && !anyPending,
        responsibleName: confirmedByResponsible ? responsibleName : order.itemizedBudget?.responsibleName,
        confirmedAt: confirmedByResponsible && !anyPending ? now : order.itemizedBudget?.confirmedAt,
      };

      if (confirmedByResponsible && anyPending) {
        res.status(400).json({
          error: 'Existem custos pendentes (não cadastrados no catálogo) — resolva antes de homologar o orçamento.',
        });
        return;
      }

      order.itemizedBudget = itemizedBudget;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: responsibleName || 'Mila (Administração Financeira)',
        stage: 'Orçamento Itemizado',
        action: itemizedBudget.confirmedByResponsible
          ? 'Orçamento itemizado homologado'
          : 'Orçamento itemizado atualizado (rascunho)',
        details: `Total: ${totalSellingPriceCents != null ? (totalSellingPriceCents / 100).toFixed(2) : 'pendente'}`,
      });

      let handoff = null;
      if (itemizedBudget.confirmedByResponsible) {
        const result = createOrderHandoff(store, order, {
          fromDesk: fromDesk || order.currentDesk || 'mila_financeiro',
          toDesk: 'carla_atendimento',
          reason: 'Orçamento itemizado homologado — pronto para negociação com o cliente.',
          completedSummary: 'Orçamento por produto e total calculados e homologados pela Mila.',
          nextActionExpected: 'Negociar condições com o cliente (entrada, parcelas, aceite).',
          deskStatusOverride: 'aguardando_negociacao_cliente',
        });
        handoff = result.handoff;
      }

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Mila (Administração Financeira)',
        attendance: order,
      });

      res.json({ ok: true, order, itemizedBudget, handoff });
    } catch (error) {
      console.error('Erro ao montar orçamento itemizado:', error);
      res.status(500).json({ error: 'Erro ao montar orçamento itemizado.' });
    }
  });

  // Carla — salva os termos de negociação (valor final, desconto, entrada, forma de
  // pagamento, parcelas/integral/saldo na entrega, data de entrega). Exige orçamento já
  // homologado pela Mila, mesmo princípio de dupla trava do /api/orders/:id/budget-decision.
  app.post('/api/orders/:id/negotiation', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      if (!order.itemizedBudget?.confirmedByResponsible) {
        res.status(400).json({ error: 'O orçamento itemizado ainda não foi homologado pela Mila.' });
        return;
      }
      const {
        finalPriceCents,
        discountCents,
        downPayment,
        balanceMode,
        installments,
        deliveryDate,
        deliveryDateValidatedBy,
      } = req.body as {
        finalPriceCents: number;
        discountCents?: number;
        downPayment?: OrderNegotiation['downPayment'];
        balanceMode: OrderNegotiation['balanceMode'];
        installments?: OrderInstallment[];
        deliveryDate?: string;
        deliveryDateValidatedBy?: string;
      };

      if (typeof finalPriceCents !== 'number' || finalPriceCents <= 0) {
        res.status(400).json({ error: 'Informe o valor final da negociação.' });
        return;
      }
      if (!balanceMode) {
        res.status(400).json({ error: 'Escolha a forma do saldo: parcelado, integral ou na entrega.' });
        return;
      }

      // Fora da política aprovada pelo proprietário (desconto acima do máximo configurado)
      // trava em requiresOwnerApproval até alguém aprovar explicitamente a exceção.
      const policy = store.settings?.negotiationPolicy;
      const appliedDiscount = discountCents || 0;
      const homologatedTotal = order.itemizedBudget.totalSellingPriceCents || 0;
      const discountPercent = homologatedTotal > 0 ? (appliedDiscount / homologatedTotal) * 100 : 0;
      const requiresOwnerApproval = Boolean(
        policy?.maxDiscountPercent != null && discountPercent > policy.maxDiscountPercent
      );

      const now = new Date().toISOString();
      const negotiation: OrderNegotiation = {
        finalPriceCents,
        discountCents: appliedDiscount,
        downPayment,
        balanceMode,
        installments: Array.isArray(installments) ? installments : [],
        deliveryDate,
        deliveryDateValidatedBy,
        requiresOwnerApproval,
        ownerApproval: requiresOwnerApproval ? undefined : order.negotiation?.ownerApproval,
        clientDecision: undefined, // qualquer alteração nos termos invalida uma decisão anterior
        clientDecisionAt: undefined,
        clientDecisionBy: undefined,
        clientDecisionPriceCentsSnapshot: undefined,
        transactions: order.negotiation?.transactions || [],
        updatedAt: now,
      };

      order.negotiation = negotiation;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: 'Carla (Atendimento ao Cliente)',
        stage: 'Negociação',
        action: requiresOwnerApproval
          ? 'Termos de negociação salvos — fora da política, aguardando aprovação do proprietário'
          : 'Termos de negociação salvos',
        details: `Valor final: ${(finalPriceCents / 100).toFixed(2)}. Desconto: ${(appliedDiscount / 100).toFixed(2)}.`,
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Carla (Atendimento ao Cliente)',
        attendance: order,
      });

      res.json({ ok: true, order, negotiation });
    } catch (error) {
      console.error('Erro ao salvar termos de negociação:', error);
      res.status(500).json({ error: 'Erro ao salvar termos de negociação.' });
    }
  });

  // Proprietário — aprova (ou rejeita) uma exceção de política (ex.: desconto acima do
  // máximo configurado). Só depois disso o aceite/recusa do cliente pode ser registrado.
  app.post('/api/orders/:id/negotiation/approve-exception', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order?.negotiation) {
        res.status(404).json({ error: 'Negociação não encontrada para este pedido.' });
        return;
      }
      const { approved, approvedBy, notes } = req.body as { approved: boolean; approvedBy: string; notes?: string };
      if (!approvedBy || !approvedBy.trim()) {
        res.status(400).json({ error: 'Informe quem está aprovando/rejeitando a exceção.' });
        return;
      }
      const now = new Date().toISOString();
      order.negotiation.ownerApproval = { approved: Boolean(approved), approvedBy, approvedAt: now, notes };
      if (approved) {
        order.negotiation.requiresOwnerApproval = false;
      }
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: approvedBy,
        stage: 'Negociação — Exceção de Política',
        action: approved ? 'Exceção de desconto/preço aprovada pelo proprietário' : 'Exceção rejeitada pelo proprietário',
        details: notes || '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Proprietário',
        attendance: order,
      });

      res.json({ ok: true, order, negotiation: order.negotiation });
    } catch (error) {
      console.error('Erro ao aprovar exceção de negociação:', error);
      res.status(500).json({ error: 'Erro ao aprovar exceção de negociação.' });
    }
  });

  // Carla — registra o aceite ou recusa do cliente, com o mesmo padrão de snapshot de
  // preço (para detectar obsolescência) já usado em BudgetData.clientDecisionPriceCentsSnapshot.
  app.post('/api/orders/:id/negotiation/decision', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order?.negotiation) {
        res.status(404).json({ error: 'Negociação não encontrada para este pedido.' });
        return;
      }
      const { decision, decidedBy } = req.body as { decision: 'aceito' | 'recusado'; decidedBy?: string };
      if (decision !== 'aceito' && decision !== 'recusado') {
        res.status(400).json({ error: 'Decisão inválida.' });
        return;
      }
      if (order.negotiation.requiresOwnerApproval && !order.negotiation.ownerApproval?.approved) {
        res.status(400).json({
          error: 'Os termos estão fora da política aprovada e ainda dependem de aprovação do proprietário.',
        });
        return;
      }
      const now = new Date().toISOString();
      order.negotiation.clientDecision = decision;
      order.negotiation.clientDecisionAt = now;
      order.negotiation.clientDecisionBy = decidedBy;
      order.negotiation.clientDecisionPriceCentsSnapshot = order.negotiation.finalPriceCents;
      order.negotiation.updatedAt = now;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: decidedBy || 'Carla (Atendimento ao Cliente)',
        stage: 'Negociação — Decisão do Cliente',
        action: decision === 'aceito' ? 'Cliente aceitou a proposta' : 'Cliente recusou a proposta',
        details: `Valor na decisão: ${(order.negotiation.finalPriceCents / 100).toFixed(2)}.`,
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Carla (Atendimento ao Cliente)',
        attendance: order,
      });

      res.json({ ok: true, order, negotiation: order.negotiation });
    } catch (error) {
      console.error('Erro ao registrar decisão do cliente:', error);
      res.status(500).json({ error: 'Erro ao registrar decisão do cliente.' });
    }
  });

  // Mila — registra um pagamento (entrada ou parcela) com valor/data/forma/responsável/
  // comprovante. Cria negotiation sob demanda (mesmo padrão de lazy-create já usado em
  // /api/orders/financial para financialData) para permitir registrar um adiantamento
  // mesmo antes de existir negociação formal.
  app.post('/api/orders/:id/payments', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const {
        amountCents,
        paidDate,
        paymentMethod,
        registeredBy,
        receiptImageUrl,
        receiptMimeType,
        installmentIndex,
        targetsDownPayment,
        status,
      } = req.body as {
        amountCents: number;
        paidDate: string;
        paymentMethod: PaymentMethod;
        registeredBy: string;
        receiptImageUrl?: string;
        receiptMimeType?: string;
        installmentIndex?: number;
        targetsDownPayment?: boolean;
        status?: OrderPaymentStatus;
      };

      if (!amountCents || amountCents <= 0) {
        res.status(400).json({ error: 'Informe um valor de pagamento maior que zero.' });
        return;
      }
      if (!registeredBy || !registeredBy.trim()) {
        res.status(400).json({ error: 'Informe quem está registrando o pagamento.' });
        return;
      }

      const now = new Date().toISOString();
      if (!order.negotiation) {
        order.negotiation = {
          finalPriceCents: 0,
          discountCents: 0,
          balanceMode: 'integral',
          installments: [],
          requiresOwnerApproval: false,
          transactions: [],
          updatedAt: now,
        };
      }

      const resolvedStatus: OrderPaymentStatus = status || 'informada_aguardando_confirmacao';
      const paymentEntry: FinancialPaymentEntry = {
        id: `pay-${Date.now()}`,
        amountCents,
        paidDate: paidDate || now,
        paymentMethod,
        notes: registeredBy,
      };

      const transaction: FinancialTransaction = {
        id: `fin-${Date.now()}`,
        orderId: order.id,
        orderNumber: order.attendanceNumber,
        clientName: order.clientName,
        type: 'receita_cliente',
        description: targetsDownPayment
          ? 'Entrada'
          : installmentIndex != null
          ? `Parcela ${installmentIndex}`
          : 'Pagamento',
        amountCents,
        dueDate: paidDate || now,
        paidDate: paidDate || now,
        createdAt: now,
        status: resolvedStatus === 'confirmada' ? 'realizado' : 'previsto',
        installmentIndex,
        paymentMethod,
        receiptImageUrl,
        receiptMimeType,
        history: [{ action: 'Pagamento registrado', timestamp: now, notes: registeredBy }],
        amountPaidCents: amountCents,
        payments: [paymentEntry],
      };

      order.negotiation.transactions.push(transaction);

      // Atualiza o status da entrada ou da parcela correspondente, nos mesmos 4 estados
      // pedidos: combinada / informada aguardando confirmação / confirmada / saldo a receber.
      // Permite registrar um adiantamento mesmo sem entrada formalmente combinada ainda
      // (ex.: pagamento integral, ou sinal dado antes da negociação) — cria a entrada
      // sob demanda em vez de descartar o registro silenciosamente.
      if (targetsDownPayment) {
        if (!order.negotiation.downPayment) {
          order.negotiation.downPayment = { amountCents, method: paymentMethod, status: resolvedStatus };
        } else {
          order.negotiation.downPayment.status = resolvedStatus;
        }
      } else if (installmentIndex != null) {
        const inst = order.negotiation.installments.find((i) => i.index === installmentIndex);
        if (inst) inst.status = resolvedStatus;
      }

      order.negotiation.updatedAt = now;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: registeredBy,
        stage: 'Pagamento',
        action: `Pagamento registrado: ${(amountCents / 100).toFixed(2)} via ${paymentMethod}`,
        details: resolvedStatus,
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Mila (Administração Financeira)',
        attendance: order,
      });

      res.json({ ok: true, order, negotiation: order.negotiation, transaction });
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      res.status(500).json({ error: 'Erro ao registrar pagamento.' });
    }
  });

  // Mapeamento best-effort de FurnitureArea (11 áreas já existentes na vistoria de 11
  // áreas) para os 14 componentes novos da ficha de verificação — usado só para
  // pré-preencher condição/defeito quando já existe um achado prévio; nunca inventa
  // um achado novo. Mapeamento 1-para-N porque as 11 áreas agrupam mais largo.
  const FURNITURE_AREA_TO_INSPECTION_COMPONENTS: Record<string, InspectionComponentKey[]> = {
    'Estrutura': ['estrutura'],
    'Base e pés': ['base', 'pes'],
    'Assento': ['assento'],
    'Encosto': ['encosto'],
    'Braços': ['bracos'],
    'Tecido e costuras': ['revestimento', 'costuras'],
    'Espumas e enchimentos': ['espumas', 'enchimentos'],
    'Percintas, molas e sustentação': ['percintas', 'molas'],
    'Ferragens': ['fixacoes'],
    'Mecanismos retráteis ou reclináveis': ['mecanismos'],
    'Forro inferior e acabamentos': ['revestimento'],
  };
  const ALL_INSPECTION_COMPONENTS: InspectionComponentKey[] = [
    'estrutura', 'base', 'assento', 'encosto', 'bracos', 'pes',
    'percintas', 'molas', 'mecanismos', 'espumas', 'enchimentos',
    'revestimento', 'costuras', 'fixacoes',
  ];

  // Pedro/Lucas — gerar ficha de verificação na fábrica, uma por peça individual
  // dentro da quantidade do produto (ex.: "Cadeira 1 de 4" ≠ "Cadeira 2 de 4").
  // Nunca inventa condição nova: todo componente sem achado prévio correspondente
  // nasce 'nao_verificado'. Toda geração nova nasce com version incrementada —
  // versões anteriores do mesmo productId+unitIndex continuam em inspectionSheets.
  app.post('/api/orders/:id/inspection-sheets', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const { productId, unitsCount, responsibleName } = req.body as {
        productId: string;
        unitsCount?: number;
        responsibleName?: string;
      };
      const validIds = listOrderProducts(order).map((p) => p.id);
      if (!productId || !validIds.includes(productId)) {
        res.status(400).json({ error: 'Produto do pedido não encontrado (productId inválido).' });
        return;
      }
      const kind: 'reforma' | 'fabricacao_nova' =
        order.orderType === 'Fabricação' ? 'fabricacao_nova' : 'reforma';
      const count = Math.max(1, Math.min(50, Math.round(unitsCount || 1)));
      const now = new Date().toISOString();

      if (!order.inspectionSheets) order.inspectionSheets = [];
      const productLabel =
        listOrderProducts(order).find((p) => p.id === productId)?.label || order.furnitureType;

      const newSheets: InspectionSheet[] = [];
      for (let unitIndex = 1; unitIndex <= count; unitIndex++) {
        // Versão: se já existe ficha gerada para este productId+unitIndex, a nova
        // nasce com version incrementada — a anterior continua no array, nunca é
        // removida/sobrescrita.
        const previous = order.inspectionSheets
          .filter((s) => s.productId === productId && s.unitIndex === unitIndex)
          .sort((a, b) => b.version - a.version)[0];
        const version = (previous?.version || 0) + 1;

        let components: InspectionComponentEntry[] | undefined;
        let manufacturingChecks: ManufacturingInspectionEntry[] | undefined;

        if (kind === 'reforma') {
          components = ALL_INSPECTION_COMPONENTS.map((component, idx) => {
            // Procura um achado prévio (defectFindings) cuja área mapeia para este
            // componente — só usa o PRIMEIRO achado correspondente, só como ponto de
            // partida; nunca inventa um achado que não existe.
            const matchingFinding = order.defectFindings.find((f) =>
              (FURNITURE_AREA_TO_INSPECTION_COMPONENTS[f.area] || []).includes(component)
            );
            return {
              id: `insc-${Date.now()}-${unitIndex}-${idx}`,
              component,
              measurementStatus: 'a_medir',
              // A marcação (bom/reparar/substituir/...) exige verificação presencial —
              // mesmo havendo um achado prévio por foto, nasce sempre 'nao_verificado'.
              condition: 'nao_verificado',
              defectObserved: matchingFinding?.defectOrSuspicion,
              possibleCause: undefined,
              causeConfirmed: false,
              discoveredAfterDisassembly: false,
              actionRequired: matchingFinding?.suggestedService,
              notes: matchingFinding ? `A partir do achado prévio: ${matchingFinding.evidenceAndPhoto}` : undefined,
              origin: matchingFinding ? matchingFinding.origin : 'Não avaliável',
            };
          });
        } else {
          const evaluation = order.productEvaluations?.[productId];
          const materialItems: ManufacturingInspectionEntry[] = (evaluation?.materials || []).map((m, idx) => ({
            id: `mic-${Date.now()}-${unitIndex}-mat-${idx}`,
            item: `Material: ${m.name}`,
            specification: `${m.quantity ?? 'a levantar'} ${m.unit}`,
            status: 'nao_verificado',
            isNonConformance: false,
          }));
          manufacturingChecks = [
            {
              id: `mic-${Date.now()}-${unitIndex}-projeto`,
              item: 'Projeto e medidas conforme ficha técnica',
              specification: evaluation?.servicesNeeded || 'A conferir',
              status: 'nao_verificado',
              isNonConformance: false,
            },
            ...materialItems,
            {
              id: `mic-${Date.now()}-${unitIndex}-componentes`,
              item: 'Componentes e requisitos de fabricação',
              status: 'nao_verificado',
              isNonConformance: false,
            },
          ];
        }

        const sheet: InspectionSheet = {
          id: `isheet-${Date.now()}-${unitIndex}`,
          orderId: order.id,
          productId,
          unitIndex,
          unitLabel: count > 1 ? `${productLabel.split(' (')[0]} ${unitIndex} de ${count}` : productLabel,
          kind,
          responsibleName,
          version,
          status: 'gerada',
          components,
          manufacturingChecks,
          createdAt: now,
        };
        order.inspectionSheets.push(sheet);
        newSheets.push(sheet);
      }

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: responsibleName || 'Vistoria de Fábrica',
        stage: 'Ficha de Verificação',
        action: `${count} ficha(s) de verificação gerada(s) para ${productLabel}`,
        details: `Tipo: ${kind}`,
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Vistoria de Fábrica',
        attendance: order,
      });

      res.json({ ok: true, order, sheets: newSheets });
    } catch (error) {
      console.error('Erro ao gerar ficha de verificação:', error);
      res.status(500).json({ error: 'Erro ao gerar ficha de verificação.' });
    }
  });

  // Devolução da ficha de verificação: aceita dados digitados diretamente, uma foto da
  // ficha marcada à mão, ou um PDF da ficha, além de novas fotos do móvel. Quando há
  // foto/PDF, dispara leitura por IA — mas o resultado nunca é aplicado direto: fica em
  // aiReadResult, pendente de confirmação humana via /confirm-reading abaixo.
  app.post('/api/orders/:id/inspection-sheets/:sheetId/submit', async (req, res) => {
    try {
      const store = loadStore();
      const { id, sheetId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const sheet = (order.inspectionSheets || []).find((s) => s.id === sheetId);
      if (!sheet) {
        res.status(404).json({ error: 'Ficha de verificação não encontrada.' });
        return;
      }

      const {
        digitizedComponents,
        digitizedManufacturingChecks,
        formPhotoDataUrl,
        formPdfDataUrl,
        newPhotoIds,
        confirmedBy,
      } = req.body as {
        digitizedComponents?: InspectionComponentEntry[];
        digitizedManufacturingChecks?: ManufacturingInspectionEntry[];
        formPhotoDataUrl?: string;
        formPdfDataUrl?: string;
        newPhotoIds?: string[];
        confirmedBy?: string;
      };

      const now = new Date().toISOString();
      if (Array.isArray(newPhotoIds)) sheet.submittedPhotoIds = newPhotoIds;
      sheet.status = 'enviada_para_reavaliacao';

      // Caminho 1: preenchimento digital direto — o operador já confirmou ao digitar,
      // aplica sem passar pela IA. Sem leitura por IA não há nada para confirmar depois
      // em /confirm-reading — a ficha já nasce 'reavaliada' aqui, nunca fica parada
      // esperando uma confirmação que nunca chegaria.
      const isDigitalOnly = Boolean(
        (digitizedComponents || digitizedManufacturingChecks) && !formPhotoDataUrl && !formPdfDataUrl
      );
      if (digitizedComponents) sheet.components = digitizedComponents;
      if (digitizedManufacturingChecks) sheet.manufacturingChecks = digitizedManufacturingChecks;
      if (isDigitalOnly) {
        sheet.status = 'reavaliada';
        sheet.confirmedAt = now;
        sheet.confirmedBy = confirmedBy || sheet.responsibleName;
      }

      let aiReadResult: InspectionFormReadResult | undefined;

      // Caminho 2/3: foto ou PDF da ficha marcada manualmente.
      if (formPhotoDataUrl || formPdfDataUrl) {
        const entries: Array<{ id: string; label: string }> =
          sheet.kind === 'reforma'
            ? (sheet.components || []).map((c) => ({
                id: c.id,
                label: `${INSPECTION_COMPONENT_LABELS[c.component]}${c.locationLabel ? ' - ' + c.locationLabel : ''}`,
              }))
            : (sheet.manufacturingChecks || []).map((c) => ({ id: c.id, label: c.item }));

        const parts: Array<
          { text: string } | { inlineData: { mimeType: string; data: string } } | { documentData: { mimeType: string; data: string } }
        > = [
          {
            text: `CAMPOS DA FICHA (um por linha, "entryId: rótulo"):\n${entries
              .map((e) => `${e.id}: ${e.label}`)
              .join('\n')}\n\nLeia a ficha anexada e reporte o estado de cada entryId listado acima.`,
          },
        ];

        if (formPhotoDataUrl) {
          const match = formPhotoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        } else if (formPdfDataUrl) {
          const match = formPdfDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) parts.push({ documentData: { mimeType: 'application/pdf', data: match[2] } });
        }

        const readSchema = {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  entryId: { type: Type.STRING },
                  readStatus: { type: Type.STRING, description: "'lido' | 'ilegivel' | 'ausente'" },
                  readCondition: {
                    type: Type.STRING,
                    description: 'bom | reparar | substituir | reaproveitar | nao_verificado | nao_se_aplica',
                  },
                  readMeasurement: { type: Type.STRING },
                  readNotes: { type: Type.STRING },
                },
                required: ['entryId', 'readStatus'],
              },
            },
            overallNotes: { type: Type.STRING },
          },
          required: ['fields'],
        };

        try {
          const { response } = await generateContentWithRetryAndFallback({
            preferredModel: store.settings.aiModel || 'claude-sonnet-5',
            parts,
            systemInstruction: CHECKLIST_READER_SYSTEM_INSTRUCTION,
            responseSchema: readSchema,
            lockKey: `checklist-read:${sheetId}`,
          });
          const parsed = JSON.parse(response.text) as {
            fields: InspectionFormReadField[];
            overallNotes?: string;
          };
          const validStatuses: ChecklistFieldReadStatus[] = ['lido', 'ilegivel', 'ausente'];
          const validConditions: InspectionMarking[] = [
            'bom', 'reparar', 'substituir', 'reaproveitar', 'nao_verificado', 'nao_se_aplica',
          ];
          const byEntryId = new Map((parsed.fields || []).map((f) => [f.entryId, f]));
          // Nunca deixa um campo "esquecido" pela IA desaparecer — todo entry não
          // reportado vira 'ausente' explicitamente aqui, nunca fica indefinido.
          const fields: InspectionFormReadField[] = entries.map((e) => {
            const f = byEntryId.get(e.id);
            const readStatus: ChecklistFieldReadStatus =
              f && validStatuses.includes(f.readStatus) ? f.readStatus : 'ausente';
            return {
              entryId: e.id,
              readStatus,
              readCondition:
                readStatus === 'lido' && f?.readCondition && validConditions.includes(f.readCondition)
                  ? f.readCondition
                  : undefined,
              readMeasurement: readStatus === 'lido' ? f?.readMeasurement : undefined,
              readNotes: f?.readNotes,
            };
          });
          aiReadResult = { readAt: now, fields, overallNotes: parsed.overallNotes };
        } catch (aiError) {
          console.error('Erro ao ler ficha por IA:', aiError);
          if (formPdfDataUrl) {
            // Fallback honesto: se a leitura de PDF falhar (ex.: tipo document não
            // aceito nesta conta), nunca finge sucesso — sinaliza e orienta foto.
            aiReadResult = {
              readAt: now,
              fields: entries.map((e) => ({ entryId: e.id, readStatus: 'ausente' as ChecklistFieldReadStatus })),
              overallNotes:
                'Leitura de PDF indisponível no momento. Envie uma foto da ficha marcada em vez do PDF.',
              pdfReadUnavailable: true,
            };
          } else {
            res.status(502).json({
              error: aiError instanceof Error ? aiError.message : 'Erro ao ler ficha por IA.',
            });
            return;
          }
        }
      }

      if (aiReadResult) sheet.aiReadResult = aiReadResult;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: confirmedBy || 'Reavaliação Técnica',
        stage: 'Devolução da Ficha de Verificação',
        action: `Ficha ${sheet.unitLabel || sheet.id} enviada para reavaliação`,
        details: aiReadResult ? 'Leitura por IA gerada — pendente de confirmação humana.' : 'Dados digitados diretamente.',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Reavaliação Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, sheet });
    } catch (error) {
      console.error('Erro ao devolver ficha de verificação:', error);
      res.status(500).json({ error: 'Erro ao devolver ficha de verificação.' });
    }
  });

  // Confirma (ou descarta) campos lidos pela IA na devolução da ficha — nenhum campo
  // lido por IA se torna definitivo sem passar por aqui, e campos 'ilegivel'/'ausente'
  // nunca são aplicados mesmo que o operador tente aceitá-los.
  app.post('/api/orders/:id/inspection-sheets/:sheetId/confirm-reading', (req, res) => {
    try {
      const store = loadStore();
      const { id, sheetId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const sheet = (order.inspectionSheets || []).find((s) => s.id === sheetId);
      if (!sheet || !sheet.aiReadResult) {
        res.status(404).json({ error: 'Nenhuma leitura pendente de confirmação para esta ficha.' });
        return;
      }
      const { acceptedEntryIds, confirmedBy } = req.body as {
        acceptedEntryIds: string[];
        confirmedBy: string;
      };
      if (!confirmedBy || !confirmedBy.trim()) {
        res.status(400).json({ error: 'Informe quem está confirmando a leitura.' });
        return;
      }

      const fieldsById = new Map(sheet.aiReadResult.fields.map((f) => [f.entryId, f]));
      for (const entryId of acceptedEntryIds || []) {
        const field = fieldsById.get(entryId);
        if (!field || field.readStatus !== 'lido') continue; // nunca aplica ilegível/ausente
        const componentEntry = sheet.components?.find((c) => c.id === entryId);
        if (componentEntry) {
          if (field.readCondition) componentEntry.condition = field.readCondition;
          if (field.readMeasurement) {
            componentEntry.measurementValue = field.readMeasurement;
            componentEntry.measurementStatus = 'medido';
          }
          if (field.readNotes) {
            componentEntry.notes = [componentEntry.notes, field.readNotes].filter(Boolean).join(' | ');
          }
          componentEntry.causeConfirmed = true;
          componentEntry.origin = 'Confirmado pela oficina';
        }
        const manufacturingEntry = sheet.manufacturingChecks?.find((c) => c.id === entryId);
        if (manufacturingEntry) {
          if (field.readCondition) manufacturingEntry.status = field.readCondition;
          if (field.readNotes) {
            manufacturingEntry.notes = [manufacturingEntry.notes, field.readNotes].filter(Boolean).join(' | ');
          }
        }
      }

      const now = new Date().toISOString();
      sheet.status = 'reavaliada';
      sheet.confirmedAt = now;
      sheet.confirmedBy = confirmedBy;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: confirmedBy,
        stage: 'Confirmação de Leitura da Ficha',
        action: `${(acceptedEntryIds || []).length} campo(s) confirmado(s) na ficha ${sheet.unitLabel || sheet.id}`,
        details: '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Reavaliação Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, sheet });
    } catch (error) {
      console.error('Erro ao confirmar leitura da ficha:', error);
      res.status(500).json({ error: 'Erro ao confirmar leitura da ficha.' });
    }
  });

  // Pedro/Lucas — reavaliação técnica: compara a avaliação inicial com os dados
  // confirmados na devolução da ficha e gera diagnóstico/serviços/materiais revisados.
  // Toda versão anterior é preservada (technicalReassessments é um array só de
  // inclusão, nunca sobrescrito). Sincroniza productEvaluations[productId] com a
  // revisão (vira a "atual"), e se o pedido já tinha negociação aceita, reabre.
  app.post('/api/orders/:id/reassessment', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const {
        inspectionSheetId,
        revisedDiagnosis,
        updatedServicesNeeded,
        updatedMaterials,
        pendingItems,
        changesFromPrevious,
        costImpact,
        deadlineImpactDays,
        createdBy,
      } = req.body as {
        inspectionSheetId: string;
        revisedDiagnosis: string;
        updatedServicesNeeded: string;
        updatedMaterials?: ProductMaterialNeed[];
        pendingItems?: string[];
        changesFromPrevious?: string[];
        costImpact: TechnicalReassessment['costImpact'];
        deadlineImpactDays?: number | null;
        createdBy: string;
      };

      const sheet = (order.inspectionSheets || []).find((s) => s.id === inspectionSheetId);
      if (!sheet) {
        res.status(404).json({ error: 'Ficha de verificação não encontrada.' });
        return;
      }
      if (!revisedDiagnosis || !revisedDiagnosis.trim()) {
        res.status(400).json({ error: 'Informe o diagnóstico/especificação técnica revisada.' });
        return;
      }
      if (!createdBy || !createdBy.trim()) {
        res.status(400).json({ error: 'Informe o responsável pela reavaliação.' });
        return;
      }

      const productId = sheet.productId;
      if (!order.technicalReassessments) order.technicalReassessments = [];
      const priorForSameUnit = order.technicalReassessments.filter(
        (r) => r.productId === productId && r.unitIndex === sheet.unitIndex
      );
      const version = priorForSameUnit.length + 1;

      // Detecta se o escopo realmente muda em relação ao que está vigente — só então
      // mexe na negociação já aceita.
      const currentEvaluation = order.productEvaluations?.[productId];
      const servicesChanged = (currentEvaluation?.servicesNeeded || '') !== (updatedServicesNeeded || '');
      const materialsChanged =
        JSON.stringify(currentEvaluation?.materials || []) !== JSON.stringify(updatedMaterials || []);
      const scopeChanged = servicesChanged || materialsChanged;
      const requiresNegotiationReview = Boolean(
        scopeChanged && order.negotiation?.clientDecision === 'aceito'
      );

      const now = new Date().toISOString();
      const reassessment: TechnicalReassessment = {
        id: `reass-${Date.now()}`,
        inspectionSheetId,
        productId,
        unitIndex: sheet.unitIndex,
        version,
        comparedToSheetVersion: sheet.version,
        revisedDiagnosis,
        updatedServicesNeeded,
        updatedMaterials: updatedMaterials || [],
        pendingItems: pendingItems || [],
        changesFromPrevious: changesFromPrevious || [],
        costImpact,
        deadlineImpactDays: deadlineImpactDays ?? null,
        requiresNegotiationReview,
        createdBy,
        createdAt: now,
      };
      order.technicalReassessments.push(reassessment);

      // productEvaluations[productId] é sempre a avaliação "vigente" (mesmo princípio
      // de manufacturingData vs. technicalPlanRevisions) — a reavaliação a atualiza.
      if (scopeChanged && order.productEvaluations?.[productId]) {
        order.productEvaluations[productId] = {
          ...order.productEvaluations[productId],
          servicesNeeded: updatedServicesNeeded,
          materials: updatedMaterials || order.productEvaluations[productId].materials,
          evaluatedBy: createdBy,
          evaluatedAt: now,
        };
      }

      // Escopo/preço já aceitos pelo cliente mudando: reabre a negociação (mesma trava
      // já usada quando os termos de negociação mudam) e marca o orçamento itemizado
      // como precisando de nova homologação da Mila, sem apagar o que já existia.
      if (requiresNegotiationReview && order.negotiation) {
        order.negotiation.clientDecision = undefined;
        order.negotiation.clientDecisionAt = undefined;
        order.negotiation.clientDecisionBy = undefined;
        order.negotiation.clientDecisionPriceCentsSnapshot = undefined;
        order.negotiation.updatedAt = now;
      }
      if (requiresNegotiationReview && order.itemizedBudget) {
        order.itemizedBudget.confirmedByResponsible = false;
      }

      sheet.status = 'reavaliada';
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: createdBy,
        stage: 'Reavaliação Técnica',
        action: `Reavaliação técnica v${version} gerada para ${sheet.unitLabel || productId}`,
        details: requiresNegotiationReview
          ? 'Escopo mudou com negociação já aceita — negociação reaberta, orçamento precisa ser re-homologado pela Mila.'
          : `Impacto de custo: ${costImpact}.`,
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Reavaliação Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, reassessment });
    } catch (error) {
      console.error('Erro ao gerar reavaliação técnica:', error);
      res.status(500).json({ error: 'Erro ao gerar reavaliação técnica.' });
    }
  });

  // ----------------------------------------------------------------------------
  // FICHA DE VISITA TÉCNICA E LEVANTAMENTO DE MEDIDAS (fase 2 da avaliação de
  // reforma — móvel ainda montado, entre a avaliação preliminar por fotos e a
  // inspeção pós-desmontagem já existente acima). Pedro gera, o operador leva ao
  // tablet/imprime, preenche com medidas reais, devolve e confirma antes do parecer
  // ir ao Tapeceiro Técnico. Nunca exige desmontagem para ser útil.
  // ----------------------------------------------------------------------------

  function emptyMeasurementSet(): ProductMeasurementSet {
    return {
      overall: {},
      arms: [
        { id: `arm-esq-${Date.now()}`, side: 'esquerdo' },
        { id: `arm-dir-${Date.now()}`, side: 'direito' },
      ],
      seats: [{ id: `seat-${Date.now()}-1`, label: 'Assento 1' }],
      backrests: [{ id: `back-${Date.now()}-1`, label: 'Encosto 1' }],
      looseCushions: [],
      recliningModules: [],
      otherParts: [],
    };
  }

  // Gera uma ficha de visita por peça individual dentro da quantidade do produto
  // (ex.: "Cadeira 1 de 4" ≠ "Cadeira 2 de 4"). Pré-preenche o checklist a partir de
  // achados prévios (defectFindings) quando houver correspondência clara por área —
  // nunca inventa condição nova: componente sem achado nasce 'nao_verificado'/'pendente'.
  app.post('/api/orders/:id/technical-visit-sheets', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const { productId, unitsCount, operatorName, visitAddress, visitDate } = req.body as {
        productId: string;
        unitsCount?: number;
        operatorName?: string;
        visitAddress?: string;
        visitDate?: string;
      };
      const validIds = listOrderProducts(order).map((p) => p.id);
      if (!productId || !validIds.includes(productId)) {
        res.status(400).json({ error: 'Produto do pedido não encontrado (productId inválido).' });
        return;
      }
      const count = Math.max(1, Math.min(50, Math.round(unitsCount || 1)));
      const now = new Date().toISOString();
      const productLabel =
        listOrderProducts(order).find((p) => p.id === productId)?.label || order.furnitureType;

      if (!order.technicalVisitSheets) order.technicalVisitSheets = [];
      const newSheets: TechnicalVisitSheet[] = [];

      for (let unitIndex = 1; unitIndex <= count; unitIndex++) {
        const previous = order.technicalVisitSheets
          .filter((s) => s.productId === productId && s.unitIndex === unitIndex)
          .sort((a, b) => b.version - a.version)[0];
        const version = (previous?.version || 0) + 1;

        const components: VisitComponentEntry[] = ALL_INSPECTION_COMPONENTS.map((component, idx) => {
          const matchingFinding = order.defectFindings.find((f) =>
            (FURNITURE_AREA_TO_INSPECTION_COMPONENTS[f.area] || []).includes(component)
          );
          const origin: VisitInfoOrigin =
            matchingFinding?.origin === 'Observado na foto' ? 'observado_foto' : 'pendente';
          return {
            id: `vce-${Date.now()}-${unitIndex}-${idx}`,
            component,
            condition: 'nao_verificado',
            checkStatus: 'nao_verificado',
            defectObserved: matchingFinding?.defectOrSuspicion,
            notes: matchingFinding ? `A partir do achado prévio: ${matchingFinding.evidenceAndPhoto}` : undefined,
            origin,
          };
        });

        const sheet: TechnicalVisitSheet = {
          id: `tvs-${Date.now()}-${unitIndex}`,
          orderId: order.id,
          productId,
          unitIndex,
          unitLabel: count > 1 ? `${productLabel.split(' (')[0]} ${unitIndex} de ${count}` : productLabel,
          visitAddress: visitAddress || order.fullAddress,
          operatorName,
          visitDate,
          version,
          status: 'gerada',
          measurements: emptyMeasurementSet(),
          components,
          createdAt: now,
        };
        order.technicalVisitSheets.push(sheet);
        newSheets.push(sheet);
      }

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: operatorName || 'Visita Técnica',
        stage: 'Ficha de Visita Técnica',
        action: `${count} ficha(s) de visita técnica gerada(s) para ${productLabel}`,
        details: 'Móvel ainda montado — medidas e condições a levantar presencialmente.',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Visita Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, sheets: newSheets });
    } catch (error) {
      console.error('Erro ao gerar ficha de visita técnica:', error);
      res.status(500).json({ error: 'Erro ao gerar ficha de visita técnica.' });
    }
  });

  // Lista plana de entradas legíveis por IA (medidas + checklist) de uma ficha de
  // visita — usada tanto para montar o prompt de leitura quanto para aplicar o
  // resultado de volta na ficha.
  function flattenVisitSheetEntries(
    sheet: TechnicalVisitSheet
  ): Array<{ id: string; label: string; kind: 'measurement' | 'component' }> {
    const entries: Array<{ id: string; label: string; kind: 'measurement' | 'component' }> = [];
    const m = sheet.measurements;
    entries.push({ id: 'overall-width', label: 'Produto completo — largura', kind: 'measurement' });
    entries.push({ id: 'overall-height', label: 'Produto completo — altura', kind: 'measurement' });
    entries.push({ id: 'overall-depth', label: 'Produto completo — profundidade', kind: 'measurement' });
    entries.push({ id: 'overall-depthOpen', label: 'Produto completo — profundidade aberto', kind: 'measurement' });
    for (const arm of m.arms) {
      entries.push({ id: `${arm.id}-length`, label: `Braço ${arm.side} — comprimento`, kind: 'measurement' });
      entries.push({ id: `${arm.id}-width`, label: `Braço ${arm.side} — largura`, kind: 'measurement' });
      entries.push({ id: `${arm.id}-height`, label: `Braço ${arm.side} — altura`, kind: 'measurement' });
    }
    for (const seat of m.seats) {
      entries.push({ id: `${seat.id}-width`, label: `${seat.label || seat.id} — largura`, kind: 'measurement' });
      entries.push({ id: `${seat.id}-depth`, label: `${seat.label || seat.id} — profundidade`, kind: 'measurement' });
      entries.push({
        id: `${seat.id}-cushionThickness`,
        label: `${seat.label || seat.id} — espessura da almofada`,
        kind: 'measurement',
      });
      entries.push({
        id: `${seat.id}-heightFromFloor`,
        label: `${seat.label || seat.id} — altura ao piso`,
        kind: 'measurement',
      });
    }
    for (const back of m.backrests) {
      entries.push({ id: `${back.id}-width`, label: `${back.label || back.id} — largura`, kind: 'measurement' });
      entries.push({ id: `${back.id}-height`, label: `${back.label || back.id} — altura`, kind: 'measurement' });
      entries.push({ id: `${back.id}-thickness`, label: `${back.label || back.id} — espessura`, kind: 'measurement' });
    }
    for (const cushion of m.looseCushions) {
      entries.push({ id: `${cushion.id}-width`, label: `${cushion.identification} — largura`, kind: 'measurement' });
      entries.push({
        id: `${cushion.id}-heightOrDepth`,
        label: `${cushion.identification} — altura/profundidade`,
        kind: 'measurement',
      });
      entries.push({
        id: `${cushion.id}-thickness`,
        label: `${cushion.identification} — espessura`,
        kind: 'measurement',
      });
    }
    if (m.baseAndFeet) {
      entries.push({ id: 'baseAndFeet-feetHeight', label: 'Base e pés — altura dos pés', kind: 'measurement' });
    }
    for (const mod of m.recliningModules) {
      entries.push({ id: `${mod.id}`, label: `Módulo retrátil/reclinável ${mod.moduleLabel}`, kind: 'measurement' });
    }
    for (const other of m.otherParts) {
      entries.push({ id: `${other.id}`, label: `Outra parte — ${other.name}`, kind: 'measurement' });
    }
    for (const c of sheet.components) {
      entries.push({
        id: c.id,
        label: `${INSPECTION_COMPONENT_LABELS[c.component]}${c.locationLabel ? ' - ' + c.locationLabel : ''}`,
        kind: 'component',
      });
    }
    return entries;
  }

  // Aplica um valor de medida lido (ou digitado) de volta na estrutura da ficha,
  // pelo id composto gerado em flattenVisitSheetEntries — nunca cria campo novo.
  function applyMeasurementValue(sheet: TechnicalVisitSheet, entryId: string, value: string, origin: VisitInfoOrigin) {
    const m = sheet.measurements;
    const set = (target: VisitMeasurement | undefined, v: string, o: VisitInfoOrigin): VisitMeasurement => ({
      value: v,
      origin: o,
    });
    if (entryId === 'overall-width') m.overall.width = set(m.overall.width, value, origin);
    else if (entryId === 'overall-height') m.overall.height = set(m.overall.height, value, origin);
    else if (entryId === 'overall-depth') m.overall.depth = set(m.overall.depth, value, origin);
    else if (entryId === 'overall-depthOpen') m.overall.depthOpen = set(m.overall.depthOpen, value, origin);
    else {
      for (const arm of m.arms) {
        if (entryId === `${arm.id}-length`) arm.length = set(arm.length, value, origin);
        else if (entryId === `${arm.id}-width`) arm.width = set(arm.width, value, origin);
        else if (entryId === `${arm.id}-height`) arm.height = set(arm.height, value, origin);
      }
      for (const seat of m.seats) {
        if (entryId === `${seat.id}-width`) seat.width = set(seat.width, value, origin);
        else if (entryId === `${seat.id}-depth`) seat.depth = set(seat.depth, value, origin);
        else if (entryId === `${seat.id}-cushionThickness`) seat.cushionThickness = set(seat.cushionThickness, value, origin);
        else if (entryId === `${seat.id}-heightFromFloor`) seat.heightFromFloor = set(seat.heightFromFloor, value, origin);
      }
      for (const back of m.backrests) {
        if (entryId === `${back.id}-width`) back.width = set(back.width, value, origin);
        else if (entryId === `${back.id}-height`) back.height = set(back.height, value, origin);
        else if (entryId === `${back.id}-thickness`) back.thickness = set(back.thickness, value, origin);
      }
      for (const cushion of m.looseCushions) {
        if (entryId === `${cushion.id}-width`) cushion.width = set(cushion.width, value, origin);
        else if (entryId === `${cushion.id}-heightOrDepth`) cushion.heightOrDepth = set(cushion.heightOrDepth, value, origin);
        else if (entryId === `${cushion.id}-thickness`) cushion.thickness = set(cushion.thickness, value, origin);
      }
      if (m.baseAndFeet && entryId === 'baseAndFeet-feetHeight') {
        m.baseAndFeet.feetHeight = set(m.baseAndFeet.feetHeight, value, origin);
      }
      for (const other of m.otherParts) {
        if (entryId === other.id) other.measurement = set(other.measurement, value, origin);
      }
    }
  }

  // Devolução da ficha de visita: aceita dados digitados diretamente (digitalComponents
  // + digitalMeasurements já com origin='medido_pelo_operador'), ou uma foto/PDF da ficha
  // marcada à mão — neste caso dispara leitura por IA, mas o resultado nunca é aplicado
  // direto: fica em aiReadResult, pendente de confirmação humana via /confirm abaixo.
  app.post('/api/orders/:id/technical-visit-sheets/:sheetId/submit', async (req, res) => {
    try {
      const store = loadStore();
      const { id, sheetId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const sheet = (order.technicalVisitSheets || []).find((s) => s.id === sheetId);
      if (!sheet) {
        res.status(404).json({ error: 'Ficha de visita técnica não encontrada.' });
        return;
      }

      const {
        digitalMeasurements,
        digitalComponents,
        formPhotoDataUrl,
        formPdfDataUrl,
        newPhotoIds,
        confirmedBy,
      } = req.body as {
        digitalMeasurements?: ProductMeasurementSet;
        digitalComponents?: VisitComponentEntry[];
        confirmedBy?: string;
        formPhotoDataUrl?: string;
        formPdfDataUrl?: string;
        newPhotoIds?: string[];
      };

      const now = new Date().toISOString();
      if (Array.isArray(newPhotoIds)) sheet.submittedPhotoIds = newPhotoIds;
      sheet.status = 'enviada_para_reavaliacao';

      // Caminho 1: preenchimento digital direto no tablet — já é o operador digitando
      // ao vivo, aplica sem passar pela IA. Como não há leitura por IA para confirmar
      // depois, a ficha já nasce 'reavaliada' aqui (nunca fica parada esperando uma
      // confirmação que nunca vai chegar quando não há foto/PDF envolvido).
      const isDigitalOnly = Boolean((digitalMeasurements || digitalComponents) && !formPhotoDataUrl && !formPdfDataUrl);
      if (digitalMeasurements) sheet.measurements = digitalMeasurements;
      if (digitalComponents) sheet.components = digitalComponents;
      if (isDigitalOnly) {
        sheet.status = 'reavaliada';
        sheet.confirmedAt = now;
        sheet.confirmedBy = confirmedBy || sheet.operatorName;
      }

      let aiReadResult: InspectionFormReadResult | undefined;

      // Caminho 2/3: foto ou PDF da ficha marcada manualmente.
      if (formPhotoDataUrl || formPdfDataUrl) {
        const entries = flattenVisitSheetEntries(sheet);

        const parts: Array<
          { text: string } | { inlineData: { mimeType: string; data: string } } | { documentData: { mimeType: string; data: string } }
        > = [
          {
            text: `CAMPOS DA FICHA (um por linha, "entryId: rótulo"):\n${entries
              .map((e) => `${e.id}: ${e.label}`)
              .join('\n')}\n\nLeia a ficha anexada e reporte o estado de cada entryId listado acima. Campos de medida (kind: measurement) devem usar "readMeasurement" com a medida escrita, incluindo a unidade. Campos de checklist (kind: component) devem usar "readCondition".`,
          },
        ];

        if (formPhotoDataUrl) {
          const match = formPhotoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        } else if (formPdfDataUrl) {
          const match = formPdfDataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) parts.push({ documentData: { mimeType: 'application/pdf', data: match[2] } });
        }

        const readSchema = {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  entryId: { type: Type.STRING },
                  readStatus: { type: Type.STRING, description: "'lido' | 'ilegivel' | 'ausente'" },
                  readCondition: {
                    type: Type.STRING,
                    description: 'bom | reparar | substituir | reaproveitar | nao_verificado | nao_se_aplica',
                  },
                  readMeasurement: { type: Type.STRING },
                  readNotes: { type: Type.STRING },
                },
                required: ['entryId', 'readStatus'],
              },
            },
            overallNotes: { type: Type.STRING },
          },
          required: ['fields'],
        };

        try {
          const { response } = await generateContentWithRetryAndFallback({
            preferredModel: store.settings.aiModel || 'claude-sonnet-5',
            parts,
            systemInstruction: CHECKLIST_READER_SYSTEM_INSTRUCTION,
            responseSchema: readSchema,
            lockKey: `visit-sheet-read:${sheetId}`,
          });
          const parsed = JSON.parse(response.text) as {
            fields: InspectionFormReadField[];
            overallNotes?: string;
          };
          const validStatuses: ChecklistFieldReadStatus[] = ['lido', 'ilegivel', 'ausente'];
          const validConditions: InspectionMarking[] = [
            'bom', 'reparar', 'substituir', 'reaproveitar', 'nao_verificado', 'nao_se_aplica',
          ];
          const byEntryId = new Map((parsed.fields || []).map((f) => [f.entryId, f]));
          const fields: InspectionFormReadField[] = entries.map((e) => {
            const f = byEntryId.get(e.id);
            const readStatus: ChecklistFieldReadStatus =
              f && validStatuses.includes(f.readStatus) ? f.readStatus : 'ausente';
            return {
              entryId: e.id,
              readStatus,
              readCondition:
                readStatus === 'lido' && f?.readCondition && validConditions.includes(f.readCondition)
                  ? f.readCondition
                  : undefined,
              readMeasurement: readStatus === 'lido' ? f?.readMeasurement : undefined,
              readNotes: f?.readNotes,
            };
          });
          aiReadResult = { readAt: now, fields, overallNotes: parsed.overallNotes };
        } catch (aiError) {
          console.error('Erro ao ler ficha de visita por IA:', aiError);
          if (formPdfDataUrl) {
            aiReadResult = {
              readAt: now,
              fields: entries.map((e) => ({ entryId: e.id, readStatus: 'ausente' as ChecklistFieldReadStatus })),
              overallNotes:
                'Leitura de PDF indisponível no momento. Envie uma foto da ficha marcada em vez do PDF.',
              pdfReadUnavailable: true,
            };
          } else {
            res.status(502).json({
              error: aiError instanceof Error ? aiError.message : 'Erro ao ler ficha de visita por IA.',
            });
            return;
          }
        }
      }

      if (aiReadResult) sheet.aiReadResult = aiReadResult;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: 'Visita Técnica',
        stage: 'Devolução da Ficha de Visita',
        action: `Ficha ${sheet.unitLabel || sheet.id} enviada para reavaliação`,
        details: aiReadResult ? 'Leitura por IA gerada — pendente de confirmação humana.' : 'Dados digitados diretamente.',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Visita Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, sheet });
    } catch (error) {
      console.error('Erro ao devolver ficha de visita técnica:', error);
      res.status(500).json({ error: 'Erro ao devolver ficha de visita técnica.' });
    }
  });

  // Confirma (ou descarta) campos lidos pela IA na devolução da ficha de visita —
  // nenhum campo lido por IA se torna definitivo sem passar por aqui, e campos
  // 'ilegivel'/'ausente' nunca são aplicados mesmo que o operador tente aceitá-los.
  app.post('/api/orders/:id/technical-visit-sheets/:sheetId/confirm', (req, res) => {
    try {
      const store = loadStore();
      const { id, sheetId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const sheet = (order.technicalVisitSheets || []).find((s) => s.id === sheetId);
      if (!sheet || !sheet.aiReadResult) {
        res.status(404).json({ error: 'Nenhuma leitura pendente de confirmação para esta ficha.' });
        return;
      }
      const { acceptedEntryIds, confirmedBy } = req.body as {
        acceptedEntryIds: string[];
        confirmedBy: string;
      };
      if (!confirmedBy || !confirmedBy.trim()) {
        res.status(400).json({ error: 'Informe quem está confirmando a leitura.' });
        return;
      }

      const entryKindById = new Map(flattenVisitSheetEntries(sheet).map((e) => [e.id, e.kind]));
      const fieldsById = new Map(sheet.aiReadResult.fields.map((f) => [f.entryId, f]));
      for (const entryId of acceptedEntryIds || []) {
        const field = fieldsById.get(entryId);
        if (!field || field.readStatus !== 'lido') continue; // nunca aplica ilegível/ausente
        const kind = entryKindById.get(entryId);
        if (kind === 'measurement' && field.readMeasurement) {
          applyMeasurementValue(sheet, entryId, field.readMeasurement, 'medido_pelo_operador');
        } else if (kind === 'component') {
          const componentEntry = sheet.components.find((c) => c.id === entryId);
          if (componentEntry) {
            if (field.readCondition) componentEntry.condition = field.readCondition;
            componentEntry.checkStatus = 'verificado';
            if (field.readNotes) {
              componentEntry.notes = [componentEntry.notes, field.readNotes].filter(Boolean).join(' | ');
            }
            componentEntry.origin = 'medido_pelo_operador';
          }
        }
      }

      const now = new Date().toISOString();
      sheet.status = 'reavaliada';
      sheet.confirmedAt = now;
      sheet.confirmedBy = confirmedBy;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: confirmedBy,
        stage: 'Confirmação da Ficha de Visita',
        action: `${(acceptedEntryIds || []).length} campo(s) confirmado(s) na ficha ${sheet.unitLabel || sheet.id}`,
        details: '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Visita Técnica',
        attendance: order,
      });

      res.json({ ok: true, order, sheet });
    } catch (error) {
      console.error('Erro ao confirmar ficha de visita técnica:', error);
      res.status(500).json({ error: 'Erro ao confirmar ficha de visita técnica.' });
    }
  });

  // Pedro — parecer técnico a partir da ficha de visita confirmada: descrição,
  // condições, serviços recomendados, materiais a manter/reparar/substituir,
  // pendências de desmontagem e o que já basta/falta para o orçamento. Calcula
  // estimativa de tecido/espuma a partir das medidas (nunca aplica automaticamente
  // ao plano — fica disponível para o Tapeceiro Técnico decidir incorporar) e
  // encaminha o pedido para a mesa dele. Reabre negociação já aceita se o escopo mudar.
  app.post('/api/orders/:id/technical-visit-opinions', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const {
        visitSheetId,
        productDescription,
        verifiedConditionsSummary,
        recommendedServices,
        servicesJustification,
        materialsToKeep,
        materialsToRepair,
        materialsToReplace,
        pendingDisassemblyItems,
        sufficientForBudget,
        missingForBudget,
        fabricUsableWidthCm,
        fabricPatternDirection,
        fabricSeamMarginCm,
        fabricJustifiedLossPercent,
        createdBy,
      } = req.body as {
        visitSheetId: string;
        productDescription: string;
        verifiedConditionsSummary: string;
        recommendedServices: string;
        servicesJustification?: string;
        materialsToKeep?: string[];
        materialsToRepair?: string[];
        materialsToReplace?: string[];
        pendingDisassemblyItems?: string[];
        sufficientForBudget?: string[];
        missingForBudget?: string[];
        fabricUsableWidthCm?: number;
        fabricPatternDirection?: 'Vertical' | 'Horizontal' | 'Indiferente';
        fabricSeamMarginCm?: number;
        fabricJustifiedLossPercent?: number;
        createdBy: string;
      };

      const sheet = (order.technicalVisitSheets || []).find((s) => s.id === visitSheetId);
      if (!sheet) {
        res.status(404).json({ error: 'Ficha de visita técnica não encontrada.' });
        return;
      }
      if (!recommendedServices || !recommendedServices.trim()) {
        res.status(400).json({ error: 'Informe os serviços recomendados.' });
        return;
      }
      if (!createdBy || !createdBy.trim()) {
        res.status(400).json({ error: 'Informe o responsável pelo parecer.' });
        return;
      }

      const productId = sheet.productId;
      if (!order.technicalVisitOpinions) order.technicalVisitOpinions = [];
      const priorForSameUnit = order.technicalVisitOpinions.filter(
        (o) => o.productId === productId && o.unitIndex === sheet.unitIndex
      );
      const version = priorForSameUnit.length + 1;

      // Estimativa de tecido: usa as peças de revestimento marcadas na ficha (assentos,
      // encostos, braços) cujas medidas já foram levantadas — nunca inventa a largura
      // útil nem a direção do desenho, usa só o que foi informado no parecer.
      const m = sheet.measurements;
      const parseCm = (v?: string | null): number | null => {
        if (!v) return null;
        const match = v.match(/([\d.,]+)/);
        if (!match) return null;
        return parseFloat(match[1].replace(',', '.'));
      };
      const fabricParts = [
        ...m.seats.map((s) => ({
          label: s.label || 'Assento',
          widthCm: parseCm(s.width?.value),
          heightCm: parseCm(s.depth?.value),
        })),
        ...m.backrests.map((b) => ({
          label: b.label || 'Encosto',
          widthCm: parseCm(b.width?.value),
          heightCm: parseCm(b.height?.value),
        })),
        ...m.arms.map((a) => ({
          label: `Braço ${a.side}`,
          widthCm: parseCm(a.width?.value),
          heightCm: parseCm(a.length?.value),
        })),
      ];
      const fabricEstimate = estimateFabricConsumption({
        parts: fabricParts,
        usableWidthCm: fabricUsableWidthCm,
        patternDirection: fabricPatternDirection,
        seamMarginCm: fabricSeamMarginCm,
        justifiedLossPercent: fabricJustifiedLossPercent,
      });

      const foamParts = sheet.components
        .filter((c) => c.component === 'espumas' && c.foamAccessibleMeasurement)
        .map((c) => {
          const dims = (c.foamAccessibleMeasurement || '').match(/([\d.,]+)\s*x\s*([\d.,]+)/i);
          return {
            label: c.locationLabel || INSPECTION_COMPONENT_LABELS.espumas,
            widthCm: dims ? parseFloat(dims[1].replace(',', '.')) : null,
            depthCm: dims ? parseFloat(dims[2].replace(',', '.')) : null,
            thicknessCm: c.foamThicknessCm ?? null,
            densitySpecification: c.foamDensity || c.foamDensitySpecification,
          };
        });
      const foamEstimate = foamParts.length > 0 ? estimateFoamConsumption(foamParts) : null;

      const estimatedMaterials: ProductMaterialNeed[] = [];
      if (fabricEstimate.totalLinearMeters != null) {
        estimatedMaterials.push({
          name: 'Tecido de revestimento (estimado pela visita técnica)',
          quantity: fabricEstimate.totalLinearMeters,
          unit: 'm linear',
          unitCostCents: null,
          quantityStatus: 'estimada',
          calculationMemo: fabricEstimate.calculationMemo,
        });
      }
      // Uma linha por densidade+espessura (ex.: "Espuma D28 (1 cm)") — nunca soma
      // espumas diferentes numa única quantidade genérica, pois são itens de compra
      // distintos (o número exato vai direto pro Tapeceiro Técnico).
      if (foamEstimate && foamEstimate.totalAreaM2 != null) {
        for (const [spec, areaM2] of Object.entries(foamEstimate.bySpecification)) {
          estimatedMaterials.push({
            name: `Espuma ${spec} (estimada pela visita técnica)`,
            quantity: Number(areaM2.toFixed(2)),
            unit: 'm²',
            unitCostCents: null,
            quantityStatus: 'estimada',
            calculationMemo: foamEstimate.calculationMemo,
          });
        }
      }

      const currentEvaluation = order.productEvaluations?.[productId];
      const servicesChanged = (currentEvaluation?.servicesNeeded || '') !== (recommendedServices || '');
      const requiresNegotiationReview = Boolean(
        servicesChanged && order.negotiation?.clientDecision === 'aceito'
      );

      const now = new Date().toISOString();
      const opinion: TechnicalVisitOpinion = {
        id: `tvo-${Date.now()}`,
        visitSheetId,
        productId,
        unitIndex: sheet.unitIndex,
        version,
        productDescription: productDescription || '',
        verifiedConditionsSummary: verifiedConditionsSummary || '',
        recommendedServices,
        servicesJustification: servicesJustification || '',
        materialsToKeep: materialsToKeep || [],
        materialsToRepair: materialsToRepair || [],
        materialsToReplace: materialsToReplace || [],
        pendingDisassemblyItems: pendingDisassemblyItems || [],
        sufficientForBudget: sufficientForBudget || [],
        missingForBudget: missingForBudget || [],
        estimatedMaterials,
        requiresNegotiationReview,
        createdBy,
        createdAt: now,
      };
      order.technicalVisitOpinions.push(opinion);

      if (requiresNegotiationReview && order.negotiation) {
        order.negotiation.clientDecision = undefined;
        order.negotiation.clientDecisionAt = undefined;
        order.negotiation.clientDecisionBy = undefined;
        order.negotiation.clientDecisionPriceCentsSnapshot = undefined;
        order.negotiation.updatedAt = now;
      }
      if (requiresNegotiationReview && order.itemizedBudget) {
        order.itemizedBudget.confirmedByResponsible = false;
      }

      const { handoff, alreadyTransferred } = createOrderHandoff(store, order, {
        fromDesk: 'pedro_avaliacao',
        toDesk: 'tapeceiro_tecnico',
        reason: 'Parecer da visita técnica concluído — compor materiais, mão de obra e orçamento.',
        completedSummary: `Parecer v${version} para ${sheet.unitLabel || productId}: ${recommendedServices}`,
        pendingItems: [...(pendingDisassemblyItems || []), ...(missingForBudget || [])],
        nextActionExpected: 'Compor materiais, mão de obra e orçamento preliminar a partir do parecer.',
      });

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: createdBy,
        stage: 'Parecer da Visita Técnica',
        action: `Parecer v${version} gerado para ${sheet.unitLabel || productId} e encaminhado ao Tapeceiro Técnico`,
        details: requiresNegotiationReview
          ? 'Escopo mudou com negociação já aceita — negociação reaberta.'
          : '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Mesa tapeceiro_tecnico',
        attendance: order,
      });

      res.json({ ok: true, order, opinion, handoff, alreadyTransferred });
    } catch (error) {
      console.error('Erro ao gerar parecer da visita técnica:', error);
      res.status(500).json({ error: 'Erro ao gerar parecer da visita técnica.' });
    }
  });

  // ----------------------------------------------------------------------------
  // VISTA EXPLODIDA — ESTADO ATUAL (simulação ilustrativa gerada por IA a partir
  // de fotos reais, vinculada ao pedido do produto de reforma). Usa a API do
  // Google (Gemini 2.5 Flash Image) — nunca a Anthropic, que não gera imagem.
  // ----------------------------------------------------------------------------

  const EXPLODED_VIEW_PROMPT =
    'Crie uma vista explodida ilustrativa deste mesmo móvel no estado atual. ' +
    'Separe visualmente os componentes identificáveis, mantendo sua relação de posição e montagem. ' +
    'Preserve a aparência observada nas fotos, incluindo revestimento e desgaste. ' +
    'Não transforme o produto em novo ou reformado. ' +
    'Não apresente componentes internos desconhecidos como se tivessem sido fotografados ou inspecionados.';

  // Gera (nova versão) a vista explodida a partir das fotos de referência
  // selecionadas. Nunca aplica nada automaticamente além de salvar a tentativa —
  // numeração dos componentes é um passo humano separado (/labels), aprovação é
  // outro (/approve), encaminhamento é outro (/forward).
  app.post('/api/orders/:id/exploded-view', async (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const { productId, unitIndex, sourcePhotoIds, createdBy } = req.body as {
        productId: string;
        unitIndex?: number;
        sourcePhotoIds: string[];
        createdBy?: string;
      };
      const validIds = listOrderProducts(order).map((p) => p.id);
      if (!productId || !validIds.includes(productId)) {
        res.status(400).json({ error: 'Produto do pedido não encontrado (productId inválido).' });
        return;
      }
      if (!Array.isArray(sourcePhotoIds) || sourcePhotoIds.length === 0) {
        res.status(400).json({ error: 'Selecione ao menos uma foto de referência.' });
        return;
      }
      const sourcePhotos = order.photos.filter((p) => sourcePhotoIds.includes(p.id));
      if (sourcePhotos.length === 0) {
        res.status(400).json({ error: 'Nenhuma das fotos selecionadas foi encontrada neste pedido.' });
        return;
      }

      const referencePhotos: Array<{ mimeType: string; data: string }> = [];
      for (const photo of sourcePhotos) {
        const resolved = resolvePhotoBase64(photo.imageUrl);
        if (resolved) referencePhotos.push(resolved);
      }
      if (referencePhotos.length === 0) {
        res.status(400).json({ error: 'Não foi possível ler os arquivos das fotos selecionadas.' });
        return;
      }

      let generatedImageUrl: string | undefined;
      let generationError: string | undefined;
      try {
        const { imageBase64, imageMimeType } = await generateExplodedViewImage({
          prompt: EXPLODED_VIEW_PROMPT,
          referencePhotos,
        });
        const ext = imageMimeType.includes('png') ? '.png' : imageMimeType.includes('webp') ? '.webp' : '.jpg';
        const fileName = `explodedview-${order.id}-${productId}-${Date.now()}${ext}`;
        savePhotoFile(fileName, Buffer.from(imageBase64, 'base64'), imageMimeType);
        generatedImageUrl = `/api/photos/${fileName}`;
      } catch (genError) {
        generationError = genError instanceof Error ? genError.message : 'Erro ao gerar a vista explodida.';
      }

      if (!generatedImageUrl) {
        // Nunca grava uma tentativa fantasma no histórico — devolve o erro
        // honesto (ex.: GEMINI_API_KEY ausente) direto pra tela, sem fingir
        // que um recurso existe quando a configuração ainda não foi feita.
        res.status(502).json({ error: generationError || 'Erro ao gerar a vista explodida.' });
        return;
      }

      const unit = unitIndex || 1;
      if (!order.explodedViewSimulations) order.explodedViewSimulations = [];
      const previous = order.explodedViewSimulations
        .filter((s) => s.productId === productId && s.unitIndex === unit)
        .sort((a, b) => b.version - a.version)[0];
      const version = (previous?.version || 0) + 1;

      const now = new Date().toISOString();
      const simulation: ExplodedViewSimulation = {
        id: `evs-${Date.now()}`,
        orderId: order.id,
        productId,
        unitIndex: unit,
        version,
        status: 'gerada',
        sourcePhotoIds: sourcePhotos.map((p) => p.id),
        generatedImageUrl,
        generationPrompt: EXPLODED_VIEW_PROMPT,
        componentLabels: [],
        createdBy,
        createdAt: now,
      };
      order.explodedViewSimulations.push(simulation);
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: createdBy || 'Vista Explodida',
        stage: 'Vista Explodida',
        action: `Simulação v${version} gerada a partir de ${sourcePhotos.length} foto(s)`,
        details: 'SIMULAÇÃO DE VISTA EXPLODIDA — NÃO É FOTO DE DESMONTAGEM REAL.',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Vista Explodida',
        attendance: order,
      });

      res.json({ ok: true, order, simulation });
    } catch (error) {
      console.error('Erro ao gerar vista explodida:', error);
      res.status(500).json({ error: 'Erro ao gerar vista explodida.' });
    }
  });

  // Numerar/identificar componentes na simulação — edição livre enquanto não
  // aprovada (não versiona a cada clique, só grava o estado atual dos rótulos).
  app.post('/api/orders/:id/exploded-view/:simId/labels', (req, res) => {
    try {
      const store = loadStore();
      const { id, simId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const simulation = (order.explodedViewSimulations || []).find((s) => s.id === simId);
      if (!simulation) {
        res.status(404).json({ error: 'Simulação de vista explodida não encontrada.' });
        return;
      }
      const { componentLabels } = req.body as { componentLabels: ExplodedViewComponentLabel[] };
      simulation.componentLabels = Array.isArray(componentLabels) ? componentLabels : [];
      order.updatedAt = new Date().toISOString();
      saveStore(store);
      res.json({ ok: true, order, simulation });
    } catch (error) {
      console.error('Erro ao atualizar rótulos da vista explodida:', error);
      res.status(500).json({ error: 'Erro ao atualizar rótulos da vista explodida.' });
    }
  });

  // Rejeita a simulação (modelo alterado, defeito apagado, parte duplicada ou
  // componente incompatível) — preserva no histórico, nunca apaga. Uma nova
  // chamada a /exploded-view gera a próxima versão normalmente.
  app.post('/api/orders/:id/exploded-view/:simId/reject', (req, res) => {
    try {
      const store = loadStore();
      const { id, simId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const simulation = (order.explodedViewSimulations || []).find((s) => s.id === simId);
      if (!simulation) {
        res.status(404).json({ error: 'Simulação de vista explodida não encontrada.' });
        return;
      }
      const { reason } = req.body as { reason?: string };
      if (!reason || !reason.trim()) {
        res.status(400).json({ error: 'Informe o motivo da rejeição.' });
        return;
      }
      simulation.status = 'rejeitada';
      simulation.rejectedReason = reason;
      order.updatedAt = new Date().toISOString();
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: order.updatedAt,
        actor: 'Vista Explodida',
        stage: 'Vista Explodida',
        action: `Simulação v${simulation.version} rejeitada`,
        details: reason,
      });
      saveStore(store);
      res.json({ ok: true, order, simulation });
    } catch (error) {
      console.error('Erro ao rejeitar vista explodida:', error);
      res.status(500).json({ error: 'Erro ao rejeitar vista explodida.' });
    }
  });

  // Aprova/salva a versão revisada — a aprovação visual NÃO equivale à validação
  // técnica do interior do móvel (isso continua dependendo da ficha de visita e
  // da inspeção pós-desmontagem já existentes).
  app.post('/api/orders/:id/exploded-view/:simId/approve', (req, res) => {
    try {
      const store = loadStore();
      const { id, simId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const simulation = (order.explodedViewSimulations || []).find((s) => s.id === simId);
      if (!simulation) {
        res.status(404).json({ error: 'Simulação de vista explodida não encontrada.' });
        return;
      }
      const { approvedBy } = req.body as { approvedBy?: string };
      if (!approvedBy || !approvedBy.trim()) {
        res.status(400).json({ error: 'Informe quem está salvando/aprovando esta versão.' });
        return;
      }
      simulation.status = 'aprovada';
      simulation.approvedBy = approvedBy;
      simulation.approvedAt = new Date().toISOString();
      order.updatedAt = simulation.approvedAt;
      saveStore(store);
      res.json({ ok: true, order, simulation });
    } catch (error) {
      console.error('Erro ao salvar versão da vista explodida:', error);
      res.status(500).json({ error: 'Erro ao salvar versão da vista explodida.' });
    }
  });

  // Encaminha a simulação aprovada (junto das fotos originais) à Carla e ao
  // Pedro — não move o pedido de mesa (as duas já têm acesso de leitura ao
  // pedido), só marca como encaminhada e notifica em tempo real.
  app.post('/api/orders/:id/exploded-view/:simId/forward', (req, res) => {
    try {
      const store = loadStore();
      const { id, simId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const simulation = (order.explodedViewSimulations || []).find((s) => s.id === simId);
      if (!simulation) {
        res.status(404).json({ error: 'Simulação de vista explodida não encontrada.' });
        return;
      }
      if (simulation.status !== 'aprovada') {
        res.status(400).json({ error: 'Salve/aprove a versão antes de encaminhar.' });
        return;
      }
      const { forwardedBy } = req.body as { forwardedBy?: string };
      const now = new Date().toISOString();
      simulation.forwardedAt = now;
      simulation.forwardedBy = forwardedBy;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: forwardedBy || 'Vista Explodida',
        stage: 'Vista Explodida',
        action: `Simulação v${simulation.version} encaminhada à Carla e ao Pedro, com as fotos originais`,
        details: `Fotos de referência: ${simulation.sourcePhotoIds.join(', ')}`,
      });
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Vista Explodida',
        attendance: order,
      });
      res.json({ ok: true, order, simulation });
    } catch (error) {
      console.error('Erro ao encaminhar vista explodida:', error);
      res.status(500).json({ error: 'Erro ao encaminhar vista explodida.' });
    }
  });

  // Salva/atualiza o rascunho do manual de execução por produto. Enquanto estiver em
  // rascunho, salvar de novo atualiza a MESMA versão (edição contínua); uma vez
  // aprovado, qualquer nova edição cria uma versão nova (nunca sobrescreve o que já
  // foi liberado para execução — mesmo princípio de technicalPlanRevisions).
  app.post('/api/orders/:id/execution-manual', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const {
        productId,
        coverResponsibles,
        views,
        explodedView,
        partsList,
        cuttingPlanNote,
        fabricGrainDirection,
        sewingInstructions,
        steps,
      } = req.body as {
        productId: string;
        coverResponsibles?: string[];
        views?: ExecutionManual['views'];
        explodedView?: ExecutionManual['explodedView'];
        partsList?: BudgetLineItem[];
        cuttingPlanNote?: string;
        fabricGrainDirection?: ExecutionManual['fabricGrainDirection'];
        sewingInstructions?: ExecutionManual['sewingInstructions'];
        steps?: ExecutionManualStep[];
      };
      const validIds = listOrderProducts(order).map((p) => p.id);
      if (!productId || !validIds.includes(productId)) {
        res.status(400).json({ error: 'Produto do pedido não encontrado (productId inválido).' });
        return;
      }

      if (!order.executionManuals) order.executionManuals = [];
      const forProduct = order.executionManuals.filter((m) => m.productId === productId);
      const latest = forProduct.sort((a, b) => b.version - a.version)[0];
      const now = new Date().toISOString();

      let manual: ExecutionManual;
      if (latest && latest.status === 'rascunho') {
        latest.coverResponsibles = coverResponsibles ?? latest.coverResponsibles;
        latest.views = views ?? latest.views;
        latest.explodedView = explodedView ?? latest.explodedView;
        latest.partsList = partsList ?? latest.partsList;
        latest.cuttingPlanNote = cuttingPlanNote ?? latest.cuttingPlanNote;
        latest.fabricGrainDirection = fabricGrainDirection ?? latest.fabricGrainDirection;
        latest.sewingInstructions = sewingInstructions ?? latest.sewingInstructions;
        latest.steps = steps ?? latest.steps;
        manual = latest;
      } else {
        manual = {
          id: `manual-${Date.now()}`,
          orderId: order.id,
          productId,
          version: (latest?.version || 0) + 1,
          status: 'rascunho',
          coverResponsibles: coverResponsibles || [],
          views: views || [],
          explodedView,
          partsList: partsList || [],
          cuttingPlanNote: cuttingPlanNote || 'Pendente de medição.',
          fabricGrainDirection,
          sewingInstructions: sewingInstructions || {},
          steps: steps || [],
          createdAt: now,
        };
        order.executionManuals.push(manual);
      }

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: 'Manual de Execução',
        stage: 'Manual de Execução',
        action: `Rascunho do manual v${manual.version} atualizado para ${productId}`,
        details: '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Manual de Execução',
        attendance: order,
      });

      res.json({ ok: true, order, manual });
    } catch (error) {
      console.error('Erro ao salvar manual de execução:', error);
      res.status(500).json({ error: 'Erro ao salvar manual de execução.' });
    }
  });

  // Aprova o manual de execução — só um responsável técnico explícito pode liberar
  // para execução (mesmo padrão de planStatus: 'Liberado pelo responsável' já usado
  // no plano do Tapeceiro Técnico).
  app.post('/api/orders/:id/execution-manual/:manualId/approve', (req, res) => {
    try {
      const store = loadStore();
      const { id, manualId } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const manual = (order.executionManuals || []).find((m) => m.id === manualId);
      if (!manual) {
        res.status(404).json({ error: 'Manual de execução não encontrado.' });
        return;
      }
      const { approvedBy } = req.body as { approvedBy: string };
      if (!approvedBy || !approvedBy.trim()) {
        res.status(400).json({ error: 'Informe o responsável técnico que está aprovando o manual.' });
        return;
      }
      const now = new Date().toISOString();
      manual.status = 'aprovado';
      manual.approvedBy = approvedBy;
      manual.approvedAt = now;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: approvedBy,
        stage: 'Manual de Execução',
        action: `Manual de execução v${manual.version} aprovado e liberado para execução`,
        details: '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Manual de Execução',
        attendance: order,
      });

      res.json({ ok: true, order, manual });
    } catch (error) {
      console.error('Erro ao aprovar manual de execução:', error);
      res.status(500).json({ error: 'Erro ao aprovar manual de execução.' });
    }
  });

  // Controle de qualidade: checklist derivado do manual de execução APROVADO (medida
  // prevista vem só dele, nunca inventada aqui). Nunca libera 'aprovado' havendo item
  // 'nao_conforme' — validado no servidor, não só na UI. Retrabalho cria uma NOVA
  // inspeção com reworkOfInspectionId apontando pra anterior — qualityControlHistory
  // é só de inclusão, nenhuma inspeção anterior é sobrescrita ou removida.
  app.post('/api/orders/:id/quality-control', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      const {
        productId,
        unitIndex,
        checks,
        responsibleName,
        outcome: requestedOutcome,
        reworkOfInspectionId,
      } = req.body as {
        productId: string;
        unitIndex: number;
        checks: QcCheckEntry[];
        responsibleName: string;
        outcome?: QualityControlInspection['outcome'];
        reworkOfInspectionId?: string;
      };
      if (!responsibleName || !responsibleName.trim()) {
        res.status(400).json({ error: 'Informe o responsável pela inspeção.' });
        return;
      }
      if (!Array.isArray(checks) || checks.length === 0) {
        res.status(400).json({ error: 'Informe ao menos um item de verificação.' });
        return;
      }

      const approvedManual = (order.executionManuals || [])
        .filter((m) => m.productId === productId && m.status === 'aprovado')
        .sort((a, b) => b.version - a.version)[0];
      if (!approvedManual) {
        res.status(400).json({
          error: 'Não há manual de execução aprovado para este produto — libere o manual antes do controle de qualidade.',
        });
        return;
      }

      const hasNonConformance = checks.some((c) => c.result === 'nao_conforme');
      const allFilled = checks.every((c) => c.result != null);
      let outcome: QualityControlInspection['outcome'];
      if (hasNonConformance) {
        // Nunca libera aprovado com não conformidade, mesmo que o cliente peça isso.
        outcome = 'retrabalho';
      } else if (requestedOutcome === 'aprovado') {
        if (!allFilled) {
          res.status(400).json({
            error: 'Existem itens ainda sem resultado — não é possível aprovar com verificação pendente.',
          });
          return;
        }
        outcome = 'aprovado';
      } else {
        outcome = 'aguardando_verificacao';
      }

      const now = new Date().toISOString();
      const inspection: QualityControlInspection = {
        id: `qc-${Date.now()}`,
        orderId: order.id,
        productId,
        unitIndex,
        manualVersion: approvedManual.version,
        checks,
        responsibleName,
        date: now,
        outcome,
        reworkOfInspectionId,
      };
      if (!order.qualityControlHistory) order.qualityControlHistory = [];
      order.qualityControlHistory.push(inspection);

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: responsibleName,
        stage: 'Controle de Qualidade',
        action: `Inspeção de QC registrada — resultado: ${outcome}`,
        details: reworkOfInspectionId ? `Reinspeção após retrabalho de ${reworkOfInspectionId}` : '',
      });

      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Controle de Qualidade',
        attendance: order,
      });

      res.json({ ok: true, order, inspection });
    } catch (error) {
      console.error('Erro ao registrar inspeção de controle de qualidade:', error);
      res.status(500).json({ error: 'Erro ao registrar inspeção de controle de qualidade.' });
    }
  });

  // Carla — registrar reclamação do cliente num atendimento já existente (nunca cria um
  // atendimento novo para isso: evita duplicar cadastro do mesmo cliente/pedido).
  app.post('/api/orders/:id/complaint', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { description, urgency } = req.body as {
        description: string;
        urgency?: 'normal' | 'urgente';
      };
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      if (!description || !description.trim()) {
        res.status(400).json({ error: 'Descreva a reclamação antes de registrar.' });
        return;
      }
      const now = new Date().toISOString();
      const complaint: ComplaintEntry = {
        id: `cmp-${Date.now()}`,
        createdAt: now,
        description: description.trim(),
        urgency: urgency === 'urgente' ? 'urgente' : 'normal',
        status: 'aberta',
      };
      if (!order.complaints) order.complaints = [];
      order.complaints.unshift(complaint);
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: 'Carla (Atendimento ao Cliente)',
        stage: 'Reclamação',
        action: `Reclamação registrada (${complaint.urgency})`,
        details: complaint.description,
      });
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Carla (Atendimento ao Cliente)',
        attendance: order,
      });
      res.json({ ok: true, order, complaint });
    } catch (error) {
      console.error('Erro ao registrar reclamação:', error);
      res.status(500).json({ error: 'Erro ao registrar reclamação.' });
    }
  });

  // Carla — atualizar status de uma reclamação (encaminhar ao responsável / marcar resolvida).
  // Nunca promete reembolso/desconto/nova data sozinha: isso é só registro de status.
  app.put('/api/orders/:id/complaint/:complaintId', (req, res) => {
    try {
      const store = loadStore();
      const { id, complaintId } = req.params;
      const { status, handledBy, resolutionNotes } = req.body as {
        status: 'aberta' | 'encaminhada' | 'resolvida';
        handledBy?: string;
        resolutionNotes?: string;
      };
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      const complaint = (order.complaints || []).find((c) => c.id === complaintId);
      if (!complaint) {
        res.status(404).json({ error: 'Reclamação não encontrada.' });
        return;
      }
      const now = new Date().toISOString();
      if (status) complaint.status = status;
      if (handledBy) complaint.handledBy = handledBy;
      if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
      if (status === 'resolvida') complaint.resolvedAt = now;
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: handledBy || 'Carla (Atendimento ao Cliente)',
        stage: 'Reclamação',
        action: `Reclamação atualizada: ${complaint.status}`,
        details: resolutionNotes || '',
      });
      saveStore(store);
      res.json({ ok: true, order, complaint });
    } catch (error) {
      console.error('Erro ao atualizar reclamação:', error);
      res.status(500).json({ error: 'Erro ao atualizar reclamação.' });
    }
  });

  // Carla — registrar a aceitação/recusa do cliente para o orçamento vigente, vinculada
  // ao preço exibido no momento da decisão (clientDecisionPriceCentsSnapshot). Se o preço
  // mudar depois, a decisão fica desatualizada e precisa de nova conferência — ver
  // isClientBudgetDecisionStale em calculations.ts.
  app.post('/api/orders/:id/budget-decision', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { decision, decidedBy, notes } = req.body as {
        decision: 'aceito' | 'recusado';
        decidedBy?: string;
        notes?: string;
      };
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      if (decision !== 'aceito' && decision !== 'recusado') {
        res.status(400).json({ error: 'Decisão inválida — use "aceito" ou "recusado".' });
        return;
      }
      const now = new Date().toISOString();
      const isFabricacao = order.orderType === 'Fabricação';
      if (isFabricacao && order.financialData) {
        if (!order.financialData.confirmedByResponsible && order.financialData.approvedSellingPriceCents == null) {
          res.status(400).json({ error: 'Ainda não há preço aprovado pelo responsável para o cliente decidir sobre ele.' });
          return;
        }
        order.financialData.clientDecision = decision;
        order.financialData.clientDecisionAt = now;
        order.financialData.clientDecisionBy = decidedBy;
        order.financialData.clientDecisionNotes = notes;
        order.financialData.clientDecisionPriceCentsSnapshot = order.financialData.approvedSellingPriceCents;
        order.financialData.clientApproved = decision === 'aceito';
        order.financialData.clientApprovedAt = decision === 'aceito' ? now : order.financialData.clientApprovedAt;
      } else {
        if (!order.budget.confirmedByResponsible) {
          res.status(400).json({ error: 'Ainda não há orçamento aprovado pelo responsável para o cliente decidir sobre ele.' });
          return;
        }
        order.budget.clientDecision = decision;
        order.budget.clientDecisionAt = now;
        order.budget.clientDecisionBy = decidedBy;
        order.budget.clientDecisionNotes = notes;
        order.budget.clientDecisionPriceCentsSnapshot = order.budget.sellingPriceCents;
      }
      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: decidedBy || 'Carla (Atendimento ao Cliente)',
        stage: 'Decisão do Cliente sobre Orçamento',
        action: `Cliente ${decision === 'aceito' ? 'aceitou' : 'recusou'} o orçamento`,
        details: notes || '',
      });
      saveStore(store);
      res.json({ ok: true, order });
    } catch (error) {
      console.error('Erro ao registrar decisão do cliente sobre o orçamento:', error);
      res.status(500).json({ error: 'Erro ao registrar decisão do cliente sobre o orçamento.' });
    }
  });

  // Carla — anexar comprovante recebido do cliente a um pedido. Isso NUNCA confirma
  // pagamento sozinho: se vinculado a uma parcela pendente existente, só anexa a imagem
  // sem mexer em status/valor pago (a conferência financeira é da Mila); se não houver
  // parcela correspondente, cria um lançamento novo já como "previsto", marcado como
  // aguardando conferência — nunca "realizado" por aqui.
  app.post('/api/orders/:id/receipt', (req, res) => {
    try {
      const store = loadStore();
      const { id } = req.params;
      const { receiptImageUrl, receiptMimeType, transactionId, amountCents, description } = req.body as {
        receiptImageUrl: string;
        receiptMimeType?: string;
        transactionId?: string;
        amountCents?: number;
        description?: string;
      };
      const order = store.attendances.find((a) => a.id === id);
      if (!order) {
        res.status(404).json({ error: 'Atendimento não encontrado.' });
        return;
      }
      if (!receiptImageUrl) {
        res.status(400).json({ error: 'Nenhum comprovante enviado.' });
        return;
      }
      if (!order.financialData) {
        res.status(400).json({ error: 'Este atendimento ainda não tem dados financeiros iniciados.' });
        return;
      }
      const now = new Date().toISOString();

      if (transactionId) {
        const trans = order.financialData.transactions.find((t) => t.id === transactionId);
        if (!trans) {
          res.status(404).json({ error: 'Lançamento pendente não encontrado neste pedido.' });
          return;
        }
        if (trans.status === 'realizado') {
          res.status(400).json({ error: 'Este lançamento já está confirmado — anexe o comprovante em um lançamento pendente.' });
          return;
        }
        trans.receiptImageUrl = receiptImageUrl;
        trans.receiptMimeType = receiptMimeType;
        trans.history.push({
          action: 'Comprovante anexado pela Carla — aguardando conferência da Mila',
          timestamp: now,
        });
      } else {
        if (!amountCents || amountCents <= 0) {
          res.status(400).json({ error: 'Informe o valor do comprovante para registrar como pendente de conferência.' });
          return;
        }
        const trans: FinancialTransaction = {
          id: `tx-${Date.now()}`,
          orderId: id,
          type: 'receita_cliente',
          amountCents,
          status: 'previsto',
          dueDate: now.slice(0, 10),
          description: description || 'Comprovante recebido via Carla — aguardando conferência financeira',
          receiptImageUrl,
          receiptMimeType,
          createdAt: now,
          history: [
            { action: 'Comprovante recebido pela Carla — aguardando conferência da Mila (não confirma pagamento)', timestamp: now },
          ],
        };
        order.financialData.transactions.push(trans);
      }

      order.updatedAt = now;
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: 'Carla (Atendimento ao Cliente)',
        stage: 'Comprovante Recebido',
        action: 'Comprovante anexado — aguardando conferência da Mila',
        details: 'Recebimento de comprovante não confirma pagamento automaticamente.',
      });
      saveStore(store);
      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Carla (Atendimento ao Cliente)',
        attendance: order,
      });
      res.json({ ok: true, order });
    } catch (error) {
      console.error('Erro ao anexar comprovante:', error);
      res.status(500).json({ error: 'Erro ao anexar comprovante.' });
    }
  });

  // Classificar Pedido (Reforma/Fabricação)
  app.post('/api/orders/categorize', (req, res) => {
    try {
      const store = loadStore();
      const { orderId, orderType, assignedDesk } = req.body as { orderId: string, orderType: 'Reforma' | 'Fabricação', assignedDesk: DepartmentId };
      const order = store.attendances.find(a => a.id === orderId);
      if (!order) {
        res.status(404).json({ error: 'Pedido não encontrado' });
        return;
      }
      order.orderType = orderType;
      order.currentDesk = assignedDesk;
      order.updatedAt = new Date().toISOString();
      saveStore(store);
      res.json({ ok: true, order });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao classificar pedido.' });
    }
  });

  // Vite middleware in development or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // O Cloud Run injeta a porta real via variável de ambiente PORT — sem isso, o
  // servidor sempre escutaria em 3000 e o deploy falharia na checagem de saúde.
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Castros Interiores rodando na porta ${PORT}`);
  });
}

startServer();
