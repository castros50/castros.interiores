import {
  AttendanceRecord,
  DepartmentId,
  OrderHandoffEntry,
  SharedOfficeData,
  ManufacturingProjectData,
  OrderFinancialData,
  MaterialCatalogItem,
} from '../types';

export interface DeskMeta {
  id: DepartmentId;
  number: number;
  name: string;
  role: string;
  roomTitle: string;
  summary: string;
  iconName: 'carla' | 'pedro' | 'lucas' | 'ana' | 'mila' | 'castro' | 'julia' | 'supervisora';
  colorBadge: string;
  accentBg: string;
  description: string;
  responsibilities: string[];
  sampleActions: string[];
}

export const OFFICE_DESKS: DeskMeta[] = [
  {
    id: 'carla_atendimento',
    number: 1,
    name: 'Carla',
    role: 'Atendimento ao Cliente e Triagem',
    roomTitle: 'Mesa de Atendimento & Recepção',
    summary: 'Acolhimento humanizado, abertura de pedidos de reforma e fabricação e triagem de fotos.',
    iconName: 'carla',
    colorBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    accentBg: 'from-emerald-50 to-white',
    description:
      'Acolhimento humanizado, abertura de pedidos de reforma e fabricação, orientação sobre fotos e triagem das necessidades do cliente.',
    responsibilities: [
      'Abertura de novos pedidos com identificador único (CI-2026-XXXX ou FAB-2026-XXXX)',
      'Organização de dados do cliente, canal de contato e preferências',
      'Triagem de fotos de ângulos obrigatórios e referências visuais',
      'Encaminhamento formal para a mesa de Avaliação (Pedro) ou Projetos (Lucas)',
    ],
    sampleActions: [
      'Cadastrar Novo Pedido',
      'Enviar Mensagem WhatsApp de Boas-Vindas',
      'Solicitar Fotos Adicionais ao Cliente',
      'Encaminhar para Avaliação ou Projetos',
    ],
  },
  {
    id: 'pedro_avaliacao',
    number: 2,
    name: 'Pedro',
    role: 'Avaliação Técnica de Reformas',
    roomTitle: 'Mesa de Avaliação Técnica de Estofados',
    summary: 'Inspeção minuciosa das 11 áreas, teste de resiliência de espumas e reaproveitamento.',
    iconName: 'pedro',
    colorBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    accentBg: 'from-amber-50 to-white',
    description:
      'Inspeção minuciosa das 11 áreas do estofado, revisão presencial na bancada, teste de resiliência de espumas e reaproveitamento de componentes.',
    responsibilities: [
      'Vistoria técnica detalhada das 11 áreas do móvel',
      'Avaliação física de reaproveitamento de madeiramento, molas, pés e mecanismos',
      'Teste de deformação permanente e resiliência de espumas na bancada',
      'Formulação das 3 propostas de reforma (Essencial, Recomendada, Completa)',
      'Encaminhamento para Compras (Ana) e Financeiro (Mila)',
    ],
    sampleActions: [
      'Executar Análise de Defeitos por Área (IA)',
      'Registrar Teste Físico de Espuma na Bancada',
      'Definir Propostas Essencial, Recomendada e Completa',
      'Encaminhar para Compras e Orçamento',
    ],
  },
  {
    id: 'lucas_projetos',
    number: 3,
    name: 'Lucas',
    role: 'Projetos e Fabricação de Produtos Novos',
    roomTitle: 'Mesa de Projetos e Engenharia de Fabricação',
    summary: 'Desenvolvimento de produtos novos sob medida com lista de peças em mm, materiais e manual de montagem.',
    iconName: 'lucas',
    colorBadge: 'bg-blue-100 text-blue-900 border-blue-300',
    accentBg: 'from-blue-50 to-white',
    description:
      'Desenvolvimento técnico de sofás, poltronas, cadeiras, puffs e cabeceiras sob medida com fichas técnicas, lista de peças, plano de corte e manual de montagem.',
    responsibilities: [
      'Ficha técnica do modelo com diferenciação clara entre informado, visto em fotos, calculado e proposto',
      'Lista de peças codificadas com dimensões em mm por produto e total do lote',
      'Relação de materiais com larguras úteis, sentido de estampa e perdas justificadas',
      'Manual de montagem estruturado em 12 passos com pontos de atenção',
      'Definição de pontos de conferência e tolerância de qualidade',
      'Envio para aprovação do responsável técnico antes do corte',
    ],
    sampleActions: [
      'Gerar Ficha Técnica do Modelo',
      'Calcular Lista de Peças por Unidade e Lote',
      'Estruturar Manual de Montagem em 12 Etapas',
      'Exportar Ficha Técnica e Manual em PDF A4',
      'Encaminhar Lista de Insumos para Ana (Compras)',
    ],
  },
  {
    id: 'ana_compras',
    number: 4,
    name: 'Ana',
    role: 'Compras, Suprimentos e Estoque',
    roomTitle: 'Mesa de Suprimentos & Controle de Estoque',
    summary: 'Catálogo de materiais, conversão de unidades, controle de estoque físico e reservado.',
    iconName: 'ana',
    colorBadge: 'bg-purple-100 text-purple-900 border-purple-300',
    accentBg: 'from-purple-50 to-white',
    description:
      'Gestão do catálogo compartilhado de materiais, conversão entre unidades de consumo e compra, controle de estoque físico e reservado e lista de compras.',
    responsibilities: [
      'Catálogo compartilhado com código, especificações, preços atualizados e fornecedores',
      'Conversão de unidades (ex: metros lineares de tecido para rolos; lâminas para blocos)',
      'Separação entre necessário, estoque físico, estoque reservado e compra líquida',
      'Consolidação de listas de compras sem duplicidade entre pedidos',
      'Preparação de pedidos de cotação para fornecedores (sem disparo automático)',
    ],
    sampleActions: [
      'Verificar Estoque Disponível vs Reservado',
      'Gerar Lista de Compras do Pedido',
      'Gerar Lista de Compras Consolidada da Oficina',
      'Cotar Insumos com Fornecedores',
      'Encaminhar Custos de Insumos para Mila (Financeiro)',
    ],
  },
  {
    id: 'mila_financeiro',
    number: 5,
    name: 'Mila',
    role: 'Administração Financeira e Formação de Preço',
    roomTitle: 'Mesa de Administração Financeira',
    summary: 'Contas a pagar e receber, fluxo de caixa, custos por pedido e formação de preço.',
    iconName: 'mila',
    colorBadge: 'bg-emerald-100 text-emerald-950 border-emerald-400',
    accentBg: 'from-emerald-50 to-white',
    description:
      'Contas a pagar e receber, fluxo de caixa previsto e realizado, custos por pedido, formação de preço por margem ou markup e emissão de orçamentos e relatórios em PDF A4.',
    responsibilities: [
      'Formação técnica de preço (Margem sobre Preço de Venda vs Markup sobre Custo)',
      'Apuração de custos diretos (materiais, mão de obra inclusive proprietário, rateio fixo, transporte, tributos)',
      'Contas a pagar e receber vinculadas ao pedido com vencimentos e parcelas',
      'Diferenciação clara entre orçamento, compromisso financeiro e dinheiro recebido em caixa',
      'Separação entre despesas empresariais e retiradas pro-labore do proprietário',
      'Emissão do Orçamento ao Cliente (sem margens internas) e Relatório Financeiro Interno',
    ],
    sampleActions: [
      'Calcular Formação de Preço por Margem/Markup',
      'Registrar Recebimento de Sinal ou Parcela',
      'Auditar Custos e Pendências do Pedido',
      'Emitir Orçamento ao Cliente em PDF A4',
      'Emitir Relatório Financeiro Interno em PDF A4',
      'Encaminhar para Aprovação do Responsável / Direção',
    ],
  },
  {
    id: 'castro_estrategia',
    number: 6,
    name: 'Castro (Roberto)',
    role: 'Estratégia, Direção e Organização do Negócio',
    roomTitle: 'Mesa de Direção Estratégica & Planejamento',
    summary: 'Análise executiva de metas, capacidade produtiva, prazos, gargalos e plano semanal.',
    iconName: 'castro',
    colorBadge: 'bg-stone-200 text-stone-900 border-stone-400',
    accentBg: 'from-stone-100 to-white',
    description:
      'Análise executiva de metas, capacidade produtiva da oficina, priorização de fabricação vs reforma, prazos, gargalos, redução de desperdício e plano semanal.',
    responsibilities: [
      'Definição e acompanhamento de metas de faturamento e rentabilidade',
      'Dimensionamento de capacidade produtiva em horas da equipe do atelier',
      'Identificação de gargalos de produção e compras pendentes que travam entregas',
      'Recomendações estratégicas estruturadas (Situação, Dados, Ação, Responsável, Prazo, KPI)',
      'Elaboração do Plano Semanal de Ações da Oficina revisável pelo proprietário',
      'Diferenciação rigorosa entre dados históricos apurados e hipóteses de planejamento',
    ],
    sampleActions: [
      'Revisar Capacidade e Gargalos da Semana',
      'Aprovar Plano Semanal de Ações',
      'Analisar Rentabilidade de Fabricação vs Reforma',
      'Homologar Projetos e Preços Finais',
      'Exportar Plano Estratégico em PDF A4',
    ],
  },
  {
    id: 'julia_marketing',
    number: 7,
    name: 'Júlia',
    role: 'Marketing, Publicidade e Divulgação Inteligente',
    roomTitle: 'Mesa de Marketing & Comunicação Social',
    summary: 'Divulgação inteligente multi-canal, 12 etapas do anúncio, catálogos e pôsteres.',
    iconName: 'julia',
    colorBadge: 'bg-amber-100 text-amber-950 border-amber-300',
    accentBg: 'from-amber-50 to-white',
    description:
      'Divulgação inteligente multi-canal com 8 redes adaptadas (WhatsApp sem hashtags com telefone oficial, Instagram, Facebook, Catálogo comercial e Pôsteres).',
    responsibilities: [
      '12 etapas integradas do Anúncio Inteligente com biblioteca de fotos reais',
      'Adaptação automática para os 8 canais oficiais da Castros Interiores',
      'Garantia inegociável de zero hashtags no WhatsApp e telefone (91) 98556-9841 padronizado',
      'Geração de Catálogos Digitais em PDF A4 e Pôsteres em alta resolução PNG',
      'Programação de publicações no calendário com envio assistido',
    ],
    sampleActions: [
      'Abrir Anúncio Inteligente (12 Etapas)',
      'Preparar Divulgação para WhatsApp (Zero Hashtags)',
      'Gerar Catálogo Comercial em PDF A4',
      'Baixar Pôster em PNG em Alta Resolução',
    ],
  },
  {
    id: 'supervisora_geral',
    number: 8,
    name: 'Helena (Supervisora)',
    role: 'Supervisão Geral de Pedidos, Campanhas e Compras',
    roomTitle: 'Mesa de Supervisão Geral & Governança',
    summary: 'Monitoramento integrado de prazos, cobrança de retornos, aprovação formal de decisões e mediação entre mesas.',
    iconName: 'supervisora',
    colorBadge: 'bg-amber-100 text-amber-950 border-amber-400 font-semibold',
    accentBg: 'from-amber-50 to-white',
    description:
      'Mesa de governança e supervisão central da Castros Interiores, acompanhando pedidos, campanhas publicitárias e compras em tempo real.',
    responsibilities: [
      'Visão panorâmica e auditoria do andamento de todos os pedidos (Reforma e Fabricação)',
      'Identificação preventiva de gargalos e pedidos estagnados em qualquer mesa',
      'Encaminhamento formal de recados e cobrança de retorno com registro auditável',
      'Aprovação de decisões pendentes que já exigem validação (projetos, orçamentos e compras)',
      'Supervisão integrada das publicações no calendário de marketing da Júlia',
    ],
    sampleActions: [
      'Verificar Situação Geral de Pedidos e Prazos',
      'Cobrar Retorno de Agente com Recado Auditado',
      'Homologar Aprovações Técnicas Pendentes',
      'Auditar Status de Campanhas e Compras',
    ],
  },
];

// ============================================================================
// CENÁRIOS DE DEMONSTRAÇÃO / TESTE OBRIGATÓRIOS (REQUISITO 13)
// ============================================================================

export function createDemoSofa2Places(): AttendanceRecord {
  const now = new Date().toISOString();
  return {
    id: 'att-demo-fab-sofa-2l',
    ownerId: 'system',
    attendanceNumber: 'FAB-2026-0001',
    status: 'Pronto para análise',
    currentStep: 2,
    orderType: 'Fabricação',
    currentDesk: 'lucas_projetos',
    deskStatus: 'em_andamento',
    assignedAgentName: 'Lucas',
    isTestScenario: true,

    clientName: 'Demonstração Técnica — Sofá Fixo 2 Lugares',
    clientPhone: '(91) 98556-9841',
    furnitureType: 'Sofá Fixo 2 Lugares sob Medida',
    piecesCount: '1 unidade (Prototipagem / Piloto)',
    approxMeasurements:
      'Aguardando medidas e especificações definitivas da oficina (proposta pendente)',
    usageTime: 'Produto novo (Fabricação própria)',
    reportedDefects: 'Nenhum (Fabricação própria de alta durabilidade)',
    desiredService:
      'Fabricação completa de estofado sob medida com estrutura de madeira maciça tratada e acabamento de atelier',
    previousReforms: 'Não aplicável — Produto novo',
    fabricAndComfortPreference:
      'Tecido e densidade a confirmar na validação técnica com o marceneiro',
    notes:
      'CENÁRIO DE TESTE DE FABRICAÇÃO: Medidas, fotos e preços reais serão definidos posteriormente pela oficina. Não preencher essas informações como se já fossem conhecidas.',
    createdAt: now,
    updatedAt: now,
    photos: [],

    leftRightReference: 'Visão frontal do estofado',
    defectFindings: [],
    analysisLimitations: [
      'Medidas definitivas pendentes de validação presencial na bancada da oficina',
      'Espessuras de madeira sujeitas a confirmação do lote fornecido',
    ],
    requestedAdditionalPhotos: [
      'Foto ou desenho de referência do braço desejado',
      'Foto do ambiente onde o sofá será instalado',
    ],
    aiPreliminarySummary:
      'Cenário de fabricação própria iniciado. Ficha técnica e lista de peças preliminares organizadas pelo agente Lucas.',
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
      workshopNotes: 'Produto novo — espumas certificadas a especificar.',
    },
    materialConsumptionAndReworkAnalysis: '',
    proposals: [],
    selectedProposalTier: 'RECOMENDADA',
    budget: {
      items: [
        {
          id: 'b-demo-1',
          catalogItemId: 'mat-mad-euc',
          category: 'Material',
          name: 'Madeira Eucalipto Tratado e Seco (Estrutura)',
          unit: 'm linear',
          quantity: null,
          quantityStatus: 'A levantar (requer medidas e plano de corte)',
          unitCostCents: 1850,
        },
        {
          id: 'b-demo-2',
          catalogItemId: 'mat-espuma-d33',
          category: 'Material',
          name: 'Espuma D33 Alta Resiliência Certificada',
          unit: 'm²',
          quantity: null,
          quantityStatus: 'A levantar (requer medidas e plano de corte)',
          unitCostCents: 18900,
        },
      ],
      cuttingPlanConfirmed: false,
      sellingPriceCents: null,
      paymentConditions: '50% de entrada na aprovação + 50% na entrega',
      estimatedDeadline: '15 a 20 dias úteis após validação técnica',
      confirmedByResponsible: false,
      responsibleName: '',
    },
    opinion: {
      isPreliminary: true,
      structureStateSummary: 'Estrutura nova a ser montada na marcenaria.',
      damageExtentSummary: 'Não aplicável (produto novo).',
      possibleRecoverySummary: 'Não aplicável.',
      reusableMaterialsSummary: 'Não aplicável.',
      complexityLevel: 'Média',
      expectedResultSummary: 'Estofado de alto padrão com acabamento de atelier.',
      equivalentNewFurniturePriceCents: null,
      clientInterestInKeeping: 'Fabricação sob medida encomendada.',
      conclusion: 'Dados insuficientes para concluir',
      reasons:
        'Aguardando validação das medidas exatas, escolha do tecido pelo cliente e conferência técnica do marceneiro.',
      pendingFactors:
        'Medidas de largura/profundidade, densidade aprovada e plano de corte.',
      whatCouldChangeConclusion:
        'Definição do tecido escolhido (largura útil e sentido de estampa).',
      clientPlainLanguageSummary:
        'O projeto do Sofá Fixo de 2 Lugares está em rascunho técnico inicial. O orçamento definitivo e o prazo serão homologados após a confirmação das medidas.',
      recommendedNextStep:
        'Lucas (Projetos) concluir a ficha técnica e encaminhar a necessidade de compras para Ana.',
    },
    hiddenDamages: [],
    auditHistory: [
      {
        id: `aud-${Date.now()}-1`,
        timestamp: now,
        actor: 'Carla (Atendimento)',
        stage: 'Abertura do Pedido',
        action: 'Pedido de fabricação registrado',
        details:
          'Abertura de atendimento piloto FAB-2026-0001 (Sofá Fixo 2 Lugares).',
      },
      {
        id: `aud-${Date.now()}-2`,
        timestamp: now,
        actor: 'Carla (Atendimento)',
        stage: 'Transferência de Mesa',
        action: 'Encaminhado para Projetos',
        details:
          'Transferido para a mesa de Lucas (Projetos e Fabricação) para estruturação da Ficha Técnica.',
      },
    ],
    staleness: {
      defectsAnalysisNeedsReview: false,
      responsibleReviewNeedsUpdate: true,
      reuseNeedsReview: false,
      proposalNeedsReview: false,
      opinionNeedsReview: false,
      staleReason: 'Aguardando validação técnica pelo responsável da oficina.',
    },

    handoffHistory: [
      {
        id: `hand-${Date.now()}-1`,
        orderId: 'att-demo-fab-sofa-2l',
        orderNumber: 'FAB-2026-0001',
        fromDesk: 'carla_atendimento',
        fromAgentName: 'Carla',
        toDesk: 'lucas_projetos',
        toAgentName: 'Lucas',
        timestamp: now,
        reason: 'Estruturação do projeto técnico e dimensionamento do móvel novo.',
        summaryOfCompletedWork:
          'Cadastro inicial realizado, cliente confirmou interesse em sofá fixo de 2 lugares.',
        pendingItems: [
          'Confirmação de medidas externas (largura, profundidade, altura)',
          'Escolha do padrão de tecido pelo cliente',
        ],
        expectedNextAction:
          'Elaborar Ficha Técnica preliminar, lista de peças e manual de montagem.',
        documentVersion: 'v1.0-rascunho',
        acceptedAt: now,
      },
    ],

    manufacturingData: {
      id: 'mfg-sofa-2l',
      modelName: 'Sofá Fixo 2 Lugares Linha Atelier',
      productCategory: 'Sofá Fixo',
      unitsCount: 1,
      version: 'v1.0-rascunho',
      technicalDraftStatus: 'rascunho_tecnico',
      dimensions: {
        widthCm: null,
        depthCm: null,
        heightCm: null,
        seatHeightCm: null,
        seatDepthCm: null,
        armWidthCm: null,
        rawText: 'Dimensões a confirmar com o cliente / oficina',
        source: 'proposta_pendente',
      },
      finishingWishes: 'Linho misto, costura rebatida com vivo opcional',
      workshopMethodNotes:
        'Esqueleto de eucalipto seco em estufa, percintas elásticas italianas no assento, almofadas soltas com zíper oculto.',
      referencePhotos: [],
      components: [
        {
          id: 'comp-1',
          code: 'P-01',
          name: 'Longarina Frontal da Base',
          componentType: 'Madeira',
          dimensionsMm: {
            length: null,
            width: 70,
            thickness: 25,
            rawText: 'Comprimento a confirmar pela largura final do sofá',
          },
          specification: 'Eucalipto tratado aparelhado e seco em estufa',
          quantityPerUnit: 1,
          totalQuantity: 1,
          source: 'proposta_pendente',
          notes: 'Peça estrutural principal sujeita a validação de esquadro.',
        },
        {
          id: 'comp-2',
          code: 'P-02',
          name: 'Longarina Traseira da Base',
          componentType: 'Madeira',
          dimensionsMm: {
            length: null,
            width: 70,
            thickness: 25,
            rawText: 'Comprimento igual à frontal',
          },
          specification: 'Eucalipto tratado aparelhado e seco em estufa',
          quantityPerUnit: 1,
          totalQuantity: 1,
          source: 'proposta_pendente',
        },
        {
          id: 'comp-3',
          code: 'P-03',
          name: 'Bloco de Espuma do Assento (D33)',
          componentType: 'Espuma',
          dimensionsMm: {
            length: null,
            width: null,
            thickness: 120,
            rawText: 'Espessura 12cm certificada',
          },
          specification: 'Espuma D33 Alta Resiliência com selo de qualidade',
          quantityPerUnit: 2,
          totalQuantity: 2,
          source: 'proposta_pendente',
          notes: 'Dois blocos de assento almofadado.',
        },
      ],
      materials: [
        {
          id: 'matreq-1',
          code: 'MAT-TEC-LINHO',
          name: 'Tecido Linho Misto Impermeabilizado',
          category: 'Material',
          consumptionUnit: 'm',
          purchaseUnit: 'rolo (50m)',
          conversionFactor: 50,
          requiredPerProduct: 12,
          totalRequired: 12,
          usableWidthMeters: 1.4,
          patternDirection: 'Vertical',
          seamMarginCm: 1.5,
          justifiedLossPercent: 10,
          physicalStock: 0,
          availableStock: 0,
          toPurchaseQuantity: 12,
          effectivePurchasedQuantity: 0,
          effectiveConsumedQuantity: 0,
          unitCostCents: 7800,
          totalCostCents: 93600,
          purchaseDisbursementCents: 93600,
          source: 'proposta_pendente',
          notes:
            'Metragem estimada com 10% de perda para corte e encaixe de costura. Depende de confirmação do rolo.',
        },
      ],
      assemblyManual: {
        modelName: 'Sofá Fixo 2 Lugares Linha Atelier',
        version: 'v1.0-rascunho',
        status: 'rascunho_tecnico',
        lastUpdatedAt: now,
        referenceImages: [],
        generalPreparationNotes:
          'Conferir umidade do madeiramento (< 14%), esquadro de bancada e calibração da grampeadora pneumática (80 a 90 PSI).',
        finalInspectionCriteria:
          'Alinhamento de costuras retas, ausência de pregas involuntárias, estabilidade dos pés e toque macio sem pontas de grampo aparentes.',
        steps: [
          {
            stepNumber: 1,
            title: 'Preparação e Conferência de Matéria-Prima',
            description:
              'Inspecionar ripas de madeira, checar ausência de nós soltos ou empenamentos e conferir lote de tecidos e espumas.',
            piecesUsed: ['P-01', 'P-02'],
            toolsRequired: ['Trena', 'Esquadro metálico', 'Medidor de umidade'],
            sequenceOrder: 1,
            pointsOfAttention: [
              'Rejeitar qualquer sarrafo com trincas ou nós na linha de carga',
            ],
            qualityCheckCriteria: 'Esquadro perfeito em 90 graus',
            hasUncertainties: true,
            uncertaintyNotes:
              'Dimensões exatas de comprimento a confirmar no projeto aprovado.',
          },
          {
            stepNumber: 2,
            title: 'Montagem do Chassi da Estrutura',
            description:
              'Unir longarinas e travessas com encaixe meia-madeira, cola PVA D3 profissional e reforço de cavilhas ou parafusos estruturais.',
            piecesUsed: ['P-01', 'P-02'],
            toolsRequired: ['Parafusadeira', 'Grampeadora pesada', 'Grampos de aperto'],
            sequenceOrder: 2,
            pointsOfAttention: [
              'Aplicar cantoneiras triangulares de reforço em todos os 4 cantos internos',
            ],
            qualityCheckCriteria:
              'Estrutura rígida sem folga torsional ao ser suspensa por um dos cantos',
            hasUncertainties: false,
          },
          {
            stepNumber: 3,
            title: 'Instalação da Sustentação de Percintas',
            description:
              'Esticar percintas italianas entrelaçadas (70mm) com tensionador mecânico a 75% de tensão.',
            piecesUsed: [],
            toolsRequired: ['Esticador de percinta pneumático/manual', 'Grampos 80/12'],
            sequenceOrder: 3,
            pointsOfAttention: [
              'Mínimo de 3 grampos de cada lado dobrando a fita na ponta para não desfiar',
            ],
            qualityCheckCriteria: 'Tensão uniforme sem afundamento excessivo',
            hasUncertainties: false,
          },
          {
            stepNumber: 4,
            title: 'Isolamento com Ráfia e TNT 100g',
            description:
              'Cobrir o trançado de percintas com tecido estrutural para evitar atrito direto com a espuma.',
            piecesUsed: [],
            toolsRequired: ['Grampeadora leve', 'Tesoura de tapeceiro'],
            sequenceOrder: 4,
            pointsOfAttention: ['Não deixar grampos salientes'],
            qualityCheckCriteria: 'Camada de proteção firme',
            hasUncertainties: false,
          },
          {
            stepNumber: 5,
            title: 'Aplicação de Espumas de Base e Braços',
            description:
              'Colar blocos de espuma D33 nos assentos e D28 nos braços com cola de contato sem tolueno.',
            piecesUsed: ['P-03'],
            toolsRequired: ['Pistola de cola de contato', 'Estilete de precisão'],
            sequenceOrder: 5,
            pointsOfAttention: [
              'Tempo de cura de 5 minutos antes da junção das peças',
            ],
            qualityCheckCriteria: 'Aderência total sem bolhas de ar nas quinas',
            hasUncertainties: false,
          },
          {
            stepNumber: 6,
            title: 'Revestimento com Manta Acrílica Siliconada',
            description:
              'Envolver toda a espuma com manta siliconada 200g para toque aveludado e suavização de arestas.',
            piecesUsed: [],
            toolsRequired: ['Cola spray para estofamento', 'Tesoura'],
            sequenceOrder: 6,
            pointsOfAttention: [
              'Uniformidade da manta nas quinas para não criar calombos',
            ],
            qualityCheckCriteria: 'Transição suave ao passar a mão',
            hasUncertainties: false,
          },
          {
            stepNumber: 7,
            title: 'Corte e Conferência do Revestimento',
            description:
              'Realizar o corte das peças de tecido respeitando a largura útil de 1,40m e margem de costura de 1,5cm.',
            piecesUsed: [],
            toolsRequired: ['Mesa de corte', 'Tesoura de alfaiate / cortador rotativo'],
            sequenceOrder: 7,
            pointsOfAttention: [
              'Verificar sentido do fio e desenho do linho antes de cortar',
            ],
            qualityCheckCriteria: 'Medidas de corte fiéis ao gabarito',
            hasUncertainties: true,
            uncertaintyNotes: 'Gabarito depende da aprovação das medidas finais.',
          },
          {
            stepNumber: 8,
            title: 'Costura e Fechamento das Capas',
            description:
              'Costurar as peças na máquina de pesponto com linha de nylon 40 e vivo estruturado.',
            piecesUsed: [],
            toolsRequired: ['Máquina de costura industrial pesada', 'Linha de nylon 40'],
            sequenceOrder: 8,
            pointsOfAttention: [
              'Arremates reforçados nas aberturas e colocação de zíper oculto nas almofadas',
            ],
            qualityCheckCriteria: 'Pesponto retilíneo com 3,5 pontos por polegada',
            hasUncertainties: false,
          },
          {
            stepNumber: 9,
            title: 'Estofamento e Tapeçamento Final',
            description:
              'Vestir o chassi com o revestimento, tracionando uniformemente até a fixação com grampos inferiores.',
            piecesUsed: [],
            toolsRequired: ['Grampeadora pneumática', 'Alavanca de tapeceiro'],
            sequenceOrder: 9,
            pointsOfAttention: [
              'Tensão balanceada de ambos os lados para a costura não ficar torta',
            ],
            qualityCheckCriteria: 'Vivo perfeitamente alinhado com a borda de madeira',
            hasUncertainties: false,
          },
          {
            stepNumber: 10,
            title: 'Fechamento Inferior com TNT Respirável',
            description:
              'Grampear forro de TNT 100g preto na face inferior do sofá para acabamento higiênico.',
            piecesUsed: [],
            toolsRequired: ['Grampeadora', 'Tesoura'],
            sequenceOrder: 10,
            pointsOfAttention: ['Dobrar borda de 1cm do TNT para acabamento limpo'],
            qualityCheckCriteria: 'Fundo limpo e esticado',
            hasUncertainties: false,
          },
          {
            stepNumber: 11,
            title: 'Instalação de Pés e Sapatas de Feltro',
            description:
              'Fixar os 4 pés de madeira com parafuso central e aplicar feltro protetor.',
            piecesUsed: [],
            toolsRequired: ['Parafusadeira com bit Philips', 'Feltros adesivos'],
            sequenceOrder: 11,
            pointsOfAttention: [
              'Nivelamento perfeito dos 4 pontos de apoio no piso de referência',
            ],
            qualityCheckCriteria: 'Zero jogo ou manco no chão nivelado',
            hasUncertainties: false,
          },
          {
            stepNumber: 12,
            title: 'Conferência Final de Qualidade e Embalagem',
            description:
              'Higienizar, inspecionar sob luz direta, checar conforto de assentamento e embalar com plástico bolha e cantoneiras.',
            piecesUsed: [],
            toolsRequired: ['Escova de tecido', 'Aspirador', 'Plástico bolha reforçado'],
            sequenceOrder: 12,
            pointsOfAttention: [
              'Checklist de 8 pontos de conferência assinado pelo responsável',
            ],
            qualityCheckCriteria: 'Liberado para entrega ao cliente',
            hasUncertainties: false,
          },
        ],
      },
      qualityCheckpoints: [
        {
          id: 'qc-1',
          stage: 'Marcenaria',
          checkpoint: 'Esquadro das diagonais da estrutura',
          toleranceStandard: 'Variação máxima de 2mm',
          checked: false,
        },
        {
          id: 'qc-2',
          stage: 'Percintas',
          checkpoint: 'Tensão de assentamento com peso de teste (80kg)',
          toleranceStandard: 'Deflexão elástica máxima de 3cm com retorno imediato',
          checked: false,
        },
        {
          id: 'qc-3',
          stage: 'Tapeçaria',
          checkpoint: 'Alinhamento longitudinal das costuras e vivos',
          toleranceStandard: 'Desvio retilíneo máximo de 1,5mm em todo o vão',
          checked: false,
        },
        {
          id: 'qc-4',
          stage: 'Final',
          checkpoint: 'Estabilidade sobre piso plano e ausência de ruídos',
          toleranceStandard: 'Apoio firme nos 4 pés sem rangidos',
          checked: false,
        },
      ],
    },

    financialData: {
      pricingMethod: 'margem_sobre_venda',
      targetMarginPercent: 35,
      materialsConsumptionCostCents: 93600,
      purchaseDisbursementCents: 93600,
      laborWorkshopCostCents: 65000,
      ownerLaborCostCents: 20000,
      overheadApportionmentCents: 18000,
      transportFreightCents: 15000,
      taxesCents: 12000,
      totalInternalCostCents: 223600,
      hasUnknownCosts: true,
      unknownCostDetails: [
        'Metragem final de tecido sujeita à confirmação do plano de corte',
        'Cotação definitiva de pés em madeira torneada pendente de fornecedor',
      ],
      calculatedPriceCents: 344000,
      approvedSellingPriceCents: null,
      proposedDiscountCents: 0,
      finalContractPriceCents: 344000,
      internalResponsibleApproved: false,
      clientApproved: false,
      paymentConditions: '50% entrada na aprovação + 50% na entrega',
      transactions: [],
      totalReceivedCents: 0,
      balanceDueCents: 344000,
      realizedCostCents: 0,
      realizedResultCents: 0,
    },
  };
}

export function createDemoPoltronas4Un(): AttendanceRecord {
  const now = new Date().toISOString();
  return {
    id: 'att-demo-fab-poltronas-4un',
    ownerId: 'system',
    attendanceNumber: 'FAB-2026-0002',
    status: 'Pronto para análise',
    currentStep: 3,
    orderType: 'Fabricação',
    currentDesk: 'ana_compras',
    deskStatus: 'na_fila',
    assignedAgentName: 'Ana',
    isTestScenario: true,

    clientName: 'Demonstração Técnica — Lote de 4 Poltronas',
    clientPhone: '(91) 98556-9841',
    furnitureType: 'Poltrona Decorativa de Atelier',
    piecesCount: '4 unidades (Lote)',
    approxMeasurements:
      'Aguardando projeto executivo (proposta pendente de validação técnica)',
    usageTime: 'Produto novo (Lote de fabricação própria)',
    reportedDefects: 'Nenhum (Lote de fabricação nova)',
    desiredService:
      'Fabricação seriada de 4 poltronas decorativas com pés de madeira maciça e tecido de alto padrão',
    previousReforms: 'Não aplicável — Produto novo',
    fabricAndComfortPreference:
      'Veludo cotelê ou bouclé bege claro com assento firme e encosto ergonômico',
    notes:
      'CENÁRIO DE TESTE DE LOTE (4 UNIDADES): Quantidades por unidade e totais por lote testadas sem duplicidade de insumos.',
    createdAt: now,
    updatedAt: now,
    photos: [],

    leftRightReference: 'Visão frontal',
    defectFindings: [],
    analysisLimitations: [
      'Cotação de compra para volume de 4 unidades em negociação com distribuidores de tecido e espuma',
    ],
    requestedAdditionalPhotos: [
      'Referência do encosto curvo pretendido',
    ],
    aiPreliminarySummary:
      'Lote de 4 poltronas encaminhado por Lucas para Ana para cotação e reserva de estoque.',
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
      workshopNotes: 'Lote novo — espumas certificadas em cotação.',
    },
    materialConsumptionAndReworkAnalysis: '',
    proposals: [],
    selectedProposalTier: 'RECOMENDADA',
    budget: {
      items: [
        {
          id: 'b-lot-1',
          catalogItemId: 'mat-espuma-d33',
          category: 'Material',
          name: 'Espuma D33 Alta Resiliência (4 assentos)',
          unit: 'm²',
          quantity: 4,
          quantityStatus: 'Definida',
          unitCostCents: 18900,
        },
      ],
      cuttingPlanConfirmed: false,
      sellingPriceCents: null,
      paymentConditions: 'A combinar após cotação de insumos',
      estimatedDeadline: '25 dias úteis para o lote',
      confirmedByResponsible: false,
      responsibleName: '',
    },
    opinion: {
      isPreliminary: true,
      structureStateSummary: '4 estruturas idênticas em marcenaria.',
      damageExtentSummary: 'Não aplicável.',
      possibleRecoverySummary: 'Não aplicável.',
      reusableMaterialsSummary: 'Não aplicável.',
      complexityLevel: 'Alta',
      expectedResultSummary: 'Conjunto homogêneo de poltronas de atelier.',
      equivalentNewFurniturePriceCents: null,
      clientInterestInKeeping: 'Fabricação de lote comercial.',
      conclusion: 'Dados insuficientes para concluir',
      reasons: 'Cotação de tecido em rolo fechado em andamento por Ana.',
      pendingFactors: 'Confirmação do fornecedor de tecido e pés torneados.',
      whatCouldChangeConclusion: 'Variação no custo do rolo de tecido.',
      clientPlainLanguageSummary:
        'O lote de 4 poltronas está na mesa de Compras para cotação em escala de fornecedores.',
      recommendedNextStep:
        'Ana confirmar as cotações e encaminhar a formação de preço para Mila.',
    },
    hiddenDamages: [],
    auditHistory: [
      {
        id: `aud-lot-${Date.now()}-1`,
        timestamp: now,
        actor: 'Carla (Atendimento)',
        stage: 'Abertura de Lote',
        action: 'Pedido de 4 poltronas criado',
        details: 'Abertura do pedido FAB-2026-0002 para lote de 4 poltronas.',
      },
      {
        id: `aud-lot-${Date.now()}-2`,
        timestamp: now,
        actor: 'Lucas (Projetos)',
        stage: 'Projetos e Insumos',
        action: 'Relação de materiais calculada para 4 unidades',
        details:
          'Cálculo de componentes por unidade (x4) e envio para mesa de Compras.',
      },
    ],
    staleness: {
      defectsAnalysisNeedsReview: false,
      responsibleReviewNeedsUpdate: true,
      reuseNeedsReview: false,
      proposalNeedsReview: false,
      opinionNeedsReview: false,
    },

    handoffHistory: [
      {
        id: `hand-lot-${Date.now()}-1`,
        orderId: 'att-demo-fab-poltronas-4un',
        orderNumber: 'FAB-2026-0002',
        fromDesk: 'carla_atendimento',
        fromAgentName: 'Carla',
        toDesk: 'lucas_projetos',
        toAgentName: 'Lucas',
        timestamp: now,
        reason: 'Dimensionamento do modelo de poltrona e cálculo do lote de 4 un.',
        summaryOfCompletedWork: 'Abertura do pedido de fabricação de lote.',
        pendingItems: ['Projeto técnico do encosto curvo'],
        expectedNextAction: 'Gerar lista de materiais multiplicada por 4 unidades.',
        documentVersion: 'v1.0',
        acceptedAt: now,
      },
      {
        id: `hand-lot-${Date.now()}-2`,
        orderId: 'att-demo-fab-poltronas-4un',
        orderNumber: 'FAB-2026-0002',
        fromDesk: 'lucas_projetos',
        fromAgentName: 'Lucas',
        toDesk: 'ana_compras',
        toAgentName: 'Ana',
        timestamp: now,
        reason: 'Cotação de tecido e verificação de estoque físico para 4 poltronas.',
        summaryOfCompletedWork:
          'Lista de peças e materiais calculada: 18m de tecido (4,5m por poltrona) e 4m² de espuma D33.',
        pendingItems: ['Cotação de rolo fechado com fornecedor Castros Têxtil'],
        expectedNextAction:
          'Verificar estoque disponível, reservar insumos e levantar necessidade líquida de compra.',
        documentVersion: 'v1.1-compras',
      },
    ],

    manufacturingData: {
      id: 'mfg-poltrona-4un',
      modelName: 'Poltrona Decorativa Curva Linha Atelier',
      productCategory: 'Poltrona',
      unitsCount: 4,
      version: 'v1.1',
      technicalDraftStatus: 'aguardando_validacao',
      dimensions: {
        widthCm: null,
        depthCm: null,
        heightCm: null,
        seatHeightCm: null,
        seatDepthCm: null,
        armWidthCm: null,
        rawText: 'Dimensões padrão de poltrona a confirmar pela oficina',
        source: 'proposta_pendente',
      },
      finishingWishes: 'Tecido bouclé, pés palito de madeira maciça freijó',
      workshopMethodNotes:
        'Gabarito único de curvatura para garantir padronização rigorosa nas 4 peças.',
      referencePhotos: [],
      components: [
        {
          id: 'c-pol-1',
          code: 'POL-01',
          name: 'Arco Curvo Estrutural do Encosto',
          componentType: 'Madeira',
          dimensionsMm: {
            length: null,
            width: 80,
            thickness: 20,
            rawText: 'Compensado multilaminado curvado em prensa',
          },
          specification: 'Compensado naval multilaminado prensado em molde',
          quantityPerUnit: 1,
          totalQuantity: 4,
          source: 'proposta_pendente',
          notes: '4 unidades para o lote completo.',
        },
        {
          id: 'c-pol-2',
          code: 'POL-02',
          name: 'Pés Palito Cônicos (Jogo de 4 por poltrona)',
          componentType: 'Acessório',
          dimensionsMm: {
            length: 350,
            width: null,
            thickness: null,
            rawText: 'Altura 35cm com sapata metálica articulada',
          },
          specification: 'Madeira maciça torneada com acabamento verniz PU fosco',
          quantityPerUnit: 4,
          totalQuantity: 16,
          source: 'proposta_pendente',
          notes: 'Total de 16 pés para o lote de 4 poltronas.',
        },
      ],
      materials: [
        {
          id: 'm-pol-1',
          code: 'MAT-TEC-BOUCLE',
          name: 'Tecido Bouclé Texturizado Alta Gramatura',
          category: 'Material',
          consumptionUnit: 'm',
          purchaseUnit: 'peça/rolo (25m)',
          conversionFactor: 25,
          requiredPerProduct: 4.5,
          totalRequired: 18,
          usableWidthMeters: 1.4,
          patternDirection: 'Indiferente',
          seamMarginCm: 1.5,
          justifiedLossPercent: 8,
          physicalStock: 0,
          availableStock: 0,
          toPurchaseQuantity: 18,
          effectivePurchasedQuantity: 0,
          effectiveConsumedQuantity: 0,
          unitCostCents: 8900,
          totalCostCents: 160200,
          purchaseDisbursementCents: 160200,
          source: 'proposta_pendente',
          notes:
            'Consumo de 4,5m por poltrona x 4 = 18m totais necessários. Compra pode requerer rolo fechado.',
        },
        {
          id: 'm-pol-2',
          code: 'MAT-ESP-D33',
          name: 'Espuma D33 Alta Resiliência Certificada (Assento)',
          category: 'Material',
          consumptionUnit: 'm²',
          purchaseUnit: 'bloco (2,00 x 1,50m = 3m²)',
          conversionFactor: 3,
          requiredPerProduct: 1,
          totalRequired: 4,
          usableWidthMeters: 1.5,
          physicalStock: 0,
          availableStock: 0,
          toPurchaseQuantity: 4,
          effectivePurchasedQuantity: 0,
          effectiveConsumedQuantity: 0,
          unitCostCents: 18900,
          totalCostCents: 75600,
          purchaseDisbursementCents: 75600,
          source: 'proposta_pendente',
        },
      ],
      assemblyManual: {
        modelName: 'Poltrona Decorativa Curva Linha Atelier',
        version: 'v1.1',
        status: 'rascunho_tecnico',
        lastUpdatedAt: now,
        referenceImages: [],
        generalPreparationNotes:
          'Utilizar molde padrão da oficina para conferência do raio de curvatura dos 4 encostos.',
        finalInspectionCriteria:
          'Homogeneidade visual estrita entre as 4 poltronas quando dispostas lado a lado.',
        steps: [
          {
            stepNumber: 1,
            title: 'Conferência do Lote de Pés e Formato dos Chassis',
            description:
              'Verificar a uniformidade de altura dos 16 pés e o esquadro dos 4 chassis.',
            piecesUsed: ['POL-01', 'POL-02'],
            toolsRequired: ['Gabarito de curvatura', 'Trena'],
            sequenceOrder: 1,
            pointsOfAttention: ['Não misturar lotes de pés torneados'],
            qualityCheckCriteria: 'Tolerância milimétrica entre as 4 bases',
            hasUncertainties: false,
          },
          {
            stepNumber: 2,
            title: 'Montagem e Travamento das Estruturas do Lote',
            description:
              'Montar as 4 estruturas em série com cola D3 e reforço nas uniões.',
            piecesUsed: ['POL-01'],
            toolsRequired: ['Grampeadora pesada', 'Parafusadeira'],
            sequenceOrder: 2,
            pointsOfAttention: ['Cura mínima de 12 horas sob sargentos'],
            qualityCheckCriteria: 'Rigidez estrutural idêntica nas 4 peças',
            hasUncertainties: false,
          },
        ],
      },
      qualityCheckpoints: [
        {
          id: 'qc-pol-1',
          stage: 'Série',
          checkpoint: 'Padronização milimétrica de altura de assento entre as 4 poltronas',
          toleranceStandard: 'Diferença máxima de 2mm entre qualquer das 4 peças',
          checked: false,
        },
      ],
    },

    financialData: {
      pricingMethod: 'margem_sobre_venda',
      targetMarginPercent: 38,
      materialsConsumptionCostCents: 235800,
      purchaseDisbursementCents: 235800,
      laborWorkshopCostCents: 120000,
      ownerLaborCostCents: 40000,
      overheadApportionmentCents: 32000,
      transportFreightCents: 24000,
      taxesCents: 28000,
      totalInternalCostCents: 479800,
      hasUnknownCosts: true,
      unknownCostDetails: [
        'Desconto por volume de tecido em negociação com a fábrica',
      ],
      calculatedPriceCents: 773870,
      approvedSellingPriceCents: null,
      proposedDiscountCents: 0,
      finalContractPriceCents: 773870,
      internalResponsibleApproved: false,
      clientApproved: false,
      paymentConditions: '40% de entrada + 30% no meio da produção + 30% na entrega',
      transactions: [],
      totalReceivedCents: 0,
      balanceDueCents: 773870,
      realizedCostCents: 0,
      realizedResultCents: 0,
    },
  };
}

export function createDefaultOfficeData(): SharedOfficeData {
  const now = new Date().toISOString();
  return {
    handoffs: [],
    generalTransactions: [
      {
        id: 'gt-01',
        type: 'despesa_fixa',
        description: 'Aluguel e IPTU do Galpão / Atelier Castros Interiores',
        amountCents: 350000,
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        status: 'previsto',
        paymentMethod: 'Boleto Bancário',
        receiptNotes: 'Despesa fixa da oficina rateada proporcionalmente aos pedidos do mês.',
        history: [{ action: 'Despesa fixa cadastrada', timestamp: now }],
      },
      {
        id: 'gt-02',
        type: 'despesa_fixa',
        description: 'Energia Elétrica Trifásica (Compressores e Máquinas da Oficina)',
        amountCents: 68000,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        status: 'previsto',
        paymentMethod: 'Débito em Conta',
        receiptNotes: 'Rateio de despesa operacional de maquinário.',
        history: [{ action: 'Despesa fixa cadastrada', timestamp: now }],
      },
    ],
    strategyRecommendations: [
      {
        id: 'rec-1',
        category: 'priorizacao',
        title: 'Organização do Fluxo Contínuo de Fabricação e Reforma',
        observedSituation:
          'Atelier atende pedidos de reforma artesanal e novas encomendas de fabricação própria no mesmo ambiente físico.',
        supportingData:
          'Catálogo com insumos compartilhados (espumas D33, percintas e linho) e 2 pedidos piloto de fabricação sob medida.',
        proposedAction:
          'Padronizar a transferência de pedidos pelas 7 mesas com passagem de bastão formal, garantindo que o corte só inicie após conferência de saldo de estoque por Ana.',
        suggestedResponsible: 'Lucas (Projetos) e Ana (Compras)',
        suggestedDeadline: 'Próximos 3 dias',
        kpiIndicator:
          'Zero interrupções de montagem na bancada por falta de insumo ou parafuso',
        missingInformation:
          'Validação presencial das seções de madeira no marceneiro.',
        isScenarioHypothesis: false,
        createdAt: now,
      },
      {
        id: 'rec-2',
        category: 'capacidade',
        title: 'Alocação Semanal de Horas da Equipe de Tapeçaria',
        observedSituation:
          'Equipe de tapeceiros e costureiras precisa equilibrar reformas complexas com fabricação de lotes seriados.',
        supportingData:
          'Capacidade estimada de 80 horas produtivas semanais da oficina.',
        proposedAction:
          'Reservar blocos dedicados: 2 dias fixos na semana para esqueleto de fabricação nova e 3 dias para desmontagem, revisão e estofamento de reformas.',
        suggestedResponsible: 'Castro / Responsável Técnico da Oficina',
        suggestedDeadline: 'Revisão toda segunda-feira no início do expediente',
        kpiIndicator:
          'Taxa de pontualidade de entregas acima de 95% sem retrabalho',
        missingInformation:
          'Apontamento de horas efetivas por modelo na bancada.',
        isScenarioHypothesis: true,
        createdAt: now,
      },
      {
        id: 'rec-3',
        category: 'compras',
        title: 'Política de Compras em Escala de Tecidos e Espumas',
        observedSituation:
          'Comprar tecidos em metragem fracionada aumenta o custo por metro em até 22% em relação a rolos fechados.',
        supportingData:
          'Consumo contínuo de linho misto bege e cinza em mais de 70% dos pedidos da Castros Interiores.',
        proposedAction:
          'Homologar compra de rolos de 50m dos 2 tecidos mais procurados, mantendo estoque reservado para pedidos em carteira e apurando o custo de consumo sem duplicar despesa no caixa.',
        suggestedResponsible: 'Ana (Compras) e Mila (Financeiro)',
        suggestedDeadline: 'Em até 7 dias úteis',
        kpiIndicator: 'Economia direta mínima de 15% no custo unitário de tecido',
        missingInformation:
          'Confirmação da tabela de preços para faturado 28 dias do fornecedor Castros Têxtil.',
        isScenarioHypothesis: false,
        createdAt: now,
      },
    ],
    weeklyStrategyPlans: [
      {
        weekLabel: 'Semana Operacional Vigente — Oficina & Atelier',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        productionCapacityTargetHours: 80,
        scheduledOrdersCount: 2,
        actions: [
          {
            id: 'act-1',
            action:
              'Validar Ficha Técnica do Sofá Fixo 2L junto ao marceneiro antes da liberação do corte',
            responsible: 'Lucas (Projetos)',
            priority: 'alta',
            deadline: 'Em 48 horas',
            status: 'planejada',
            impactArea: 'Fabricação Própria',
          },
          {
            id: 'act-2',
            action:
              'Cotar lote de tecidos e espumas D33 para as 4 poltronas com os fornecedores homologados',
            responsible: 'Ana (Compras)',
            priority: 'alta',
            deadline: 'Em 72 horas',
            status: 'planejada',
            impactArea: 'Suprimentos & Estoque',
          },
          {
            id: 'act-3',
            action:
              'Auditar formação de preço e fluxo de recebimento de sinal (50%) dos orçamentos abertos',
            responsible: 'Mila (Financeiro)',
            priority: 'media',
            deadline: 'Até o fechamento da semana',
            status: 'planejada',
            impactArea: 'Administração Financeira',
          },
          {
            id: 'act-4',
            action:
              'Disparar campanha de valorização da fabricação artesanal sob medida no WhatsApp e Instagram',
            responsible: 'Júlia (Marketing)',
            priority: 'media',
            deadline: 'Sexta-feira às 18h',
            status: 'planejada',
            impactArea: 'Divulgação & Vendas',
          },
        ],
        reviewedByOwner: true,
        ownerNotes:
          'Plano semanal aprovado para alinhamento das 7 mesas de trabalho.',
        updatedAt: now,
      },
    ],
  };
}
