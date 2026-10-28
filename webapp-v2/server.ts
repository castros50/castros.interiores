import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
} from './src/types.ts';
import { FURNITURE_AREAS, REUSE_COMPONENTS } from './src/types.ts';
import {
  createDemoSofa2Places,
  createDemoPoltronas4Un,
  createDefaultOfficeData,
} from './src/utils/officeDefaults.ts';

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
    name: 'Adesivo de Contato Especial sem Toluol (Lata 14kg)',
    specification: 'Cola de contato de alta aderência para colagem de espumas e madeira sem odor tóxico',
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
  const defaultHeadline = 'A Arte de Renovar o Seu Estofado com Acabamento de Atelier';
  const defaultCopy =
    'Transforme o ambiente da sua sala preservando o design e o conforto do seu estofado favorito. Na Castros Interiores, cada costura, alinhamento e textura recebe cuidado artesanal de alto padrão.';
  const defaultCta = 'Solicite Atendimento Exclusivo';
  const defaultPhone = '(91) 98556-9841';
  const defaultHashtags =
    '#CastrosInteriores #EstofadosDeAltoPadrao #DesignDeInteriores #DecoracaoElegante #SalaDeEstar #AtelierDeEstofados';

  const socialVersions = generateSocialMediaVersionsServer(
    defaultHeadline,
    defaultCopy,
    defaultCta,
    defaultPhone,
    defaultHashtags
  );

  return {
    id,
    name: 'Campanha Alta Estofaria Artesanal — Castros Interiores',
    currentStep: 1,
    selectedPhotoIds: [],
    campaignObjective:
      'Divulgar a excelência estética, conforto sob medida e renovação de alto padrão em sofás, poltronas e cadeiras da Castros Interiores.',
    targetAudience:
      'Clientes residenciais exigentes, arquitetos e apaixonados por decoração de interiores.',
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
      subheadline: 'Alta Estofaria & Design Artesanal Sob Medida — Castros Interiores',
      badgeText: 'COLEÇÃO & RENOVAÇÃO DE ALTO PADRÃO',
      ctaText: 'Solicite Atendimento Exclusivo pelo WhatsApp',
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
        title: 'Acabamento Artesanal de Atelier',
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

        // Reconciliar campos compartilhados de todos os pedidos
        for (const att of parsed.attendances) {
          if (!att.orderType) {
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

        if (storeModified) {
          saveStore(parsed);
        }
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
    settings: {
      workshopName: 'Castros Interiores',
      responsibleDefaultName: '',
      phoneWhatsapp: '(91) 98556-9841',
      cityState: '',
      aiModel: 'claude-sonnet-5',
    },
    juliaData: defaultJulia,
    officeData: createDefaultOfficeData(),
  };
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: PersistentStore): void {
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
  // Sincroniza com o Firestore em segundo plano — não bloqueia a resposta da rota
  // que chamou saveStore(), mas garante que o dado sobreviva a um redeploy sem disco.
  persistStoreToFirestore(store);
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

function persistStoreToFirestore(store: PersistentStore): void {
  const payload = { ...store, savedAt: new Date().toISOString() };
  const json = JSON.stringify(payload);
  if (json.length > 900_000) {
    console.warn(
      `[Firestore Sync] O estado está com ${json.length} bytes, perto do limite de 1MB por documento do Firestore. Se continuar crescendo, será necessário migrar para coleções separadas.`
    );
  }
  try {
    db.collection(FIRESTORE_STORE_COLLECTION)
      .doc(FIRESTORE_STORE_DOC)
      .set(payload)
      .catch((err) => {
        console.error(
          '[Firestore Sync] Falha ao sincronizar o estado com o Firestore:',
          err instanceof Error ? err.message : err
        );
      });
  } catch (err) {
    // .set() pode lançar de forma síncrona (ex.: dado inválido) antes mesmo de
    // devolver uma promise — sem este try/catch, isso derrubaria a rota que
    // chamou saveStore(), mesmo com os dados já salvos com segurança no disco.
    console.error(
      '[Firestore Sync] Falha síncrona ao preparar a sincronização com o Firestore:',
      err instanceof Error ? err.message : err
    );
  }
}

async function restoreStoreFromFirestoreIfNeeded(): Promise<void> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return; // já existe um arquivo local — não sobrescreve com o backup
    }
    const doc = await db.collection(FIRESTORE_STORE_COLLECTION).doc(FIRESTORE_STORE_DOC).get();
    if (!doc.exists) {
      console.log('[Firestore Sync] Nenhum backup encontrado no Firestore — iniciando com dados padrão.');
      return;
    }
    const data = doc.data();
    if (!data) return;
    const { savedAt, ...storeData } = data as Record<string, unknown> & { savedAt?: string };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(storeData, null, 2), 'utf-8');
    console.log(`[Firestore Sync] Estado restaurado do Firestore (backup de ${savedAt || 'data desconhecida'}).`);
  } catch (err) {
    console.error(
      '[Firestore Sync] Falha ao restaurar o estado do Firestore na inicialização:',
      err instanceof Error ? err.message : err
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
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
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

    const content = params.parts.map((part) =>
      'text' in part
        ? { type: 'text', text: part.text }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: part.inlineData.mimeType,
              data: part.inlineData.data,
            },
          }
    );
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

function resolvePhotoBase64(imageUrl: string): { mimeType: string; data: string } | null {
  try {
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
    }
    if (imageUrl.startsWith('/api/photos/')) {
      const photoId = imageUrl.replace('/api/photos/', '').split('?')[0];
      const safeId = photoId.replace(/[^a-zA-Z0-9._-]/g, '');
      const filePath = path.join(PHOTOS_DIR, safeId);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(safeId).toLowerCase();
        const mimeType =
          ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return { mimeType, data: buffer.toString('base64') };
      }
    }
    if (imageUrl.startsWith('/src/assets/') || imageUrl.startsWith('/public/')) {
      const relPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      const fullPath = path.join(__dirname, relPath);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const mimeType =
          ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return { mimeType, data: buffer.toString('base64') };
      }
    }
  } catch (err) {
    console.error('Erro ao ler bytes da imagem para análise com IA:', err);
  }
  return null;
}

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
   - "Forro inferior e acabamentos"`;

async function startServer() {
  // Antes de qualquer rota aceitar requisições: se o disco local estiver vazio
  // (ex.: container recém-criado, sem volume persistente), recupera o último
  // estado salvo no Firestore. Sem isso, qualquer redeploy sem disco permanente
  // perderia os dados do mesmo jeito que o sistema anterior perdia na VPS.
  await restoreStoreFromFirestoreIfNeeded();

  const app = express();
  app.use(express.json({ limit: '50mb' }));

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
  app.get('/api/status', (_req, res) => {
    const store = loadStore();
    const hasAnthropicKey = Boolean(
      process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 5
    );
    const activeAppUrl =
      process.env.APP_URL ||
      'https://ais-dev-5eeb75lqrgyidj3iykztd7-90595154148.us-west2.run.app';
    const sharedPreUrl = activeAppUrl.replace('://ais-dev-', '://ais-pre-');
    res.json({
      ok: true,
      geminiConfigured: hasAnthropicKey,
      aiConfigured: hasAnthropicKey,
      storageConfigured: true,
      configuredModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      appUrl: activeAppUrl,
      sharedPreUrl,
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
      const detectedMime = mimeType || match[1] || 'image/jpeg';
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
          att.auditHistory = [
            ...(att.auditHistory || []),
            {
              id: `aud-recalc-${Date.now()}`,
              timestamp: now,
              actor: 'Mesa de Compras / Supervisão',
              stage: 'Recálculo Orçamentário',
              action: 'Orçamento recalculado com preços atuais do catálogo',
              details: `Valores unitários sincronizados com tabela de matérias-primas vigente.`,
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
          },
          required: [
            'leftRightReference',
            'preliminarySummary',
            'findings',
            'analysisLimitations',
            'requestedAdditionalPhotos',
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
          | 'castro_estrategia';
        customPrompt: string;
      };

      if (!customPrompt || !customPrompt.trim()) {
        res.status(400).json({ error: 'Informe a solicitação ou comando para o Agente.' });
        return;
      }

      const preferredModel = store.settings.aiModel || 'claude-sonnet-5';
      const attendance = attendanceId
        ? store.attendances.find((a) => a.id === attendanceId)
        : store.attendances[0];

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
Sua missão é criar estratégias de divulgação, textos de apresentação de projetos (antes/depois), legendas para Instagram, campanhas de valorização da reforma artesanal de alto padrão e conteúdos educativos para clientes da Castros Interiores, sempre respeitando a veracidade técnica sem inventar dados.`,
        carla_atendimento: `VOCÊ ATUA AGORA COMO: CARLA — DEPARTAMENTO DE ATENDIMENTO AO CLIENTE DA CASTROS INTERIORES.
Sua missão é realizar o acolhimento de excelência do cliente, organizar a triagem inicial do móvel, orientar o envio correto das fotos por ângulo, responder dúvidas com empatia e clareza e redigir comunicados de acompanhamento pelo WhatsApp.`,
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
3. Use linguagem publicitária refinada, acolhedora e persuasiva em português do Brasil.`;

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
    const hasWhatsAppCloudApi = Boolean(
      process.env.WHATSAPP_CLOUD_API_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID
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

      const detectedMime = mimeType || match[1] || 'image/jpeg';
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
Missão: Gerenciar formação de preços de venda (margem sobre venda vs markup sobre custo), custos diretos de materiais, mão de obra, rateio de despesas fixas, impostos, pagamentos e parcelas.
Regra: NUNCA misture custos diretos com despesas de oficina. Sempre apresente cálculos claros em Reais (R$) sem arredondar arbitrariamente.`,
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
      };

      const meta = deskMetaMap[deskId] || deskMetaMap.carla_atendimento;
      const now = new Date().toISOString();

      // Montar contexto factual rico do banco de dados real
      let relevantOrder: AttendanceRecord | undefined;
      if (orderId) {
        relevantOrder = store.attendances.find((a) => a.id === orderId || a.attendanceNumber === orderId);
      }
      if (!relevantOrder && store.attendances.length > 0) {
        relevantOrder = store.attendances.find((a) => a.currentDesk === deskId) || store.attendances[0];
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

      const deskAgentNames: Record<string, string> = {
        carla_atendimento: 'Carla (Atendimento ao Cliente)',
        pedro_avaliacao: 'Pedro (Avaliação Técnica)',
        lucas_projetos: 'Lucas (Projetos & Fabricação)',
        ana_compras: 'Ana (Compras & Suprimentos)',
        mila_financeiro: 'Mila (Administração Financeira)',
        castro_estrategia: 'Castro (Estratégia & Negócio)',
        julia_marketing: 'Júlia (Marketing & Divulgação)',
      };

      const now = new Date().toISOString();
      const handoffId = `hnd-${Date.now()}`;
      const entry: OrderHandoffEntry = {
        id: handoffId,
        orderId,
        fromDesk,
        toDesk,
        timestamp: now,
        reason: reason || 'Transferência entre mesas operacionais',
        completedSummary: completedSummary || 'Etapa anterior finalizada na mesa.',
        pendingItems: Array.isArray(pendingItems)
          ? pendingItems
          : pendingItems
          ? [pendingItems]
          : [],
        nextActionExpected:
          nextActionExpected || 'Análise técnica e continuidade dos trabalhos.',
        documentVersion: documentVersion || order.manufacturingData?.version || 'v1.0',
        status: 'pendente_aceite',
      };

      if (!order.handoffHistory) order.handoffHistory = [];
      order.handoffHistory.unshift(entry);

      order.currentDesk = toDesk;
      order.deskStatus = 'transferido';
      order.assignedAgentName = deskAgentNames[toDesk] || toDesk;
      order.updatedAt = now;

      // Registrar auditoria
      order.auditHistory.unshift({
        id: `aud-${Date.now()}`,
        timestamp: now,
        actor: `${deskAgentNames[fromDesk] || fromDesk} ➔ ${deskAgentNames[toDesk] || toDesk}`,
        stage: 'Transferência de Mesa',
        action: `Pedido transferido de ${fromDesk} para ${toDesk}`,
        details: `Motivo: ${reason}. Próxima ação: ${nextActionExpected}`,
      });

      // Atualizar lista central de handoffs no officeData
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

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: `Mesa ${toDesk}`,
        attendance: order,
      });

      res.json({ ok: true, handoff: entry, order, officeData: store.officeData });
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

  // Atualização de Projetos & Fabricação com o Agente Lucas
  app.post('/api/orders/manufacturing', (req, res) => {
    try {
      const store = loadStore();
      const { orderId, manufacturingData } = req.body as {
        orderId: string;
        manufacturingData: Partial<ManufacturingProjectData>;
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
        actor: 'Lucas (Projetos & Fabricação)',
        stage: 'Mesa de Projetos',
        action: `Ficha técnica e projeto atualizados (${order.manufacturingData?.version || 'v1.0'})`,
        details: `${order.manufacturingData?.components?.length || 0} componentes | ${order.manufacturingData?.materialRequirements?.length || 0} requisitos de materiais`,
      });

      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:updated',
        timestamp: now,
        sourceStationName: 'Lucas Projetos',
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
      const {
        orderType,
        clientName,
        clientPhone,
        clientEmail,
        furnitureType,
        piecesCount,
        approxMeasurements,
        desiredService,
        fabricAndComfortPreference,
        assignedDesk,
      } = req.body as {
        orderType: OrderType;
        clientName: string;
        clientPhone?: string;
        clientEmail?: string;
        furnitureType: string;
        piecesCount?: string;
        approxMeasurements?: string;
        desiredService?: string;
        fabricAndComfortPreference?: string;
        assignedDesk?: DepartmentId;
      };

      if (!clientName || !furnitureType) {
        res.status(400).json({ error: 'Nome do cliente e tipo de móvel são obrigatórios.' });
        return;
      }

      const now = new Date().toISOString();
      const count = store.attendances.length + 1;
      const formattedSeq = String(count).padStart(4, '0');
      const orderNumber =
        orderType === 'Fabricação'
          ? `FAB-2026-${formattedSeq}`
          : `CI-2026-${formattedSeq}`;

      const desk = assignedDesk || (orderType === 'Fabricação' ? 'lucas_projetos' : 'carla_atendimento');
      const agentNames: Record<string, string> = {
        carla_atendimento: 'Carla (Atendimento ao Cliente)',
        pedro_avaliacao: 'Pedro (Avaliação Técnica)',
        lucas_projetos: 'Lucas (Projetos & Fabricação)',
        ana_compras: 'Ana (Compras & Suprimentos)',
        mila_financeiro: 'Mila (Administração Financeira)',
        castro_estrategia: 'Castro (Estratégia & Negócio)',
        julia_marketing: 'Júlia (Marketing & Divulgação)',
      };

      const newOrder: AttendanceRecord = {
        id: `ord-${Date.now()}`,
        ownerId: 'default-owner',
        attendanceNumber: orderNumber,
        status: 'em_andamento',
        currentStep: 1,
        clientName,
        clientPhone: clientPhone || '',
        clientEmail: clientEmail || '',
        furnitureType,
        piecesCount: piecesCount || '1 unidade',
        approxMeasurements: approxMeasurements || 'A validar na oficina',
        usageTime: orderType === 'Fabricação' ? 'Novo (fabricação sob medida)' : 'A confirmar',
        reportedDefects: orderType === 'Fabricação' ? 'N/A - Produto novo' : 'Desgaste / reforma',
        desiredService: desiredService || (orderType === 'Fabricação' ? 'Fabricação completa sob encomenda' : 'Reforma e estofamento'),
        previousReforms: '',
        fabricAndComfortPreference: fabricAndComfortPreference || 'A definir',
        notes: '',
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
            action: `Pedido ${orderNumber} (${orderType}) criado`,
            details: `Cliente: ${clientName} | Móvel: ${furnitureType} | Mesa inicial: ${desk}`,
          },
        ],
        staleness: {
          defectsAnalysisNeedsReview: true,
          responsibleReviewNeedsUpdate: true,
          reuseNeedsReview: true,
          proposalNeedsReview: true,
          opinionNeedsReview: true,
        },
        orderType: orderType || 'Reforma',
        currentDesk: desk,
        deskStatus: 'novo',
        assignedAgentName: agentNames[desk] || desk,
        handoffHistory: [
          {
            id: `hnd-${Date.now()}`,
            orderId: `ord-${Date.now()}`,
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
        ],
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
      };

      store.attendances.unshift(newOrder);
      saveStore(store);

      broadcastRealtimeEvent({
        type: 'attendance:created',
        timestamp: now,
        sourceStationName: 'Abertura de Pedido',
        attendance: newOrder,
      });

      res.json({ ok: true, order: newOrder });
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: 'Erro ao criar pedido.' });
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
