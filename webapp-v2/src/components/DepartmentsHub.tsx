import React, { useState } from 'react';
import {
  Megaphone,
  Headphones,
  Wrench,
  Package,
  DollarSign,
  Plus,
  Camera,
  Play,
  FileText,
  Download,
  FolderOpen,
  Send,
  Copy,
  Check,
  AlertTriangle,
  Users,
  CheckCircle2,
  Layers,
  TrendingUp,
} from 'lucide-react';
import {
  AttendanceRecord,
  DepartmentId,
  JuliaDepartmentData,
  MaterialCatalogItem,
  WorkshopSettings,
} from '../types';
import {
  calculateBudgetSummary,
  formatCurrencyBRL,
  formatMissingText,
} from '../utils/calculations';
import { JuliaMarketingDepartment } from './JuliaMarketingDepartment';
import { AgentPortrait } from './AgentPortrait';

// Mesas com conversa por voz/texto já implementada (ver AgentVoiceTextChat em OfficeDesksHub.tsx)
const DEPTS_WITH_CHAT = new Set<DepartmentId>([
  'carla_atendimento',
  'pedro_avaliacao',
  'ana_compras',
  'julia_marketing',
  'supervisora_geral',
]);

interface DepartmentsHubProps {
  attendances: AttendanceRecord[];
  activeAttendance: AttendanceRecord | null;
  materials: MaterialCatalogItem[];
  settings: WorkshopSettings;
  isSaving: boolean;
  isAnalyzingDefects: boolean;
  isAnalyzingReuse: boolean;
  deviceFormFactor?: string;
  stationName?: string;
  juliaData?: JuliaDepartmentData | null;
  onSelectAttendance: (id: string) => void;
  onNewAttendance: (orderType?: 'Reforma' | 'Fabricação') => Promise<void>;
  onJumpToStep: (step: number) => void;
  onNavigateTab: (
    tab:
      | 'painel'
      | 'atendimentos'
      | 'agentes'
      | 'clientes'
      | 'materiais'
      | 'relatorios'
      | 'configuracoes'
      | 'escritorio'
  ) => void;
  onRunDefectsAnalysis: () => Promise<void>;
  onRunReuseAnalysis: () => Promise<void>;
  onGenerateInternalPdf: (att?: AttendanceRecord) => void;
  onGenerateClientPdf: (att?: AttendanceRecord) => void;
  onAttendanceUpdated: (updated: AttendanceRecord) => void;
}

interface DepartmentConsultResponse {
  agentTitle: string;
  technicalAnalysis: string;
  recommendedActions: string[];
  clientMessageSuggestion: string;
  usedModel?: string;
}

interface DepartmentMeta {
  id: DepartmentId;
  buttonLabel: string;
  personName: string;
  departmentRole: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  quickPrompts: Array<{ label: string; prompt: string }>;
}

export const DEPARTMENTS_LIST: DepartmentMeta[] = [
  {
    id: 'julia_marketing',
    buttonLabel: 'Júlia Marketing e Divulgação',
    personName: 'Júlia',
    departmentRole: 'Marketing, Publicidade e Divulgação',
    summary:
      '12 etapas do Anúncio Inteligente, Pôsteres, Carrosséis, Catálogos, Voz/Texto, Campanhas, Relatório Diário e fotos direto do celular.',
    icon: Megaphone,
    quickPrompts: [
      {
        label: 'Criar post de Antes/Depois deste estofado',
        prompt:
          'Com base nas fotos e nos dados reais deste atendimento, crie uma publicação atraente para o Instagram e status do WhatsApp da Castros Interiores destacando o potencial de transformação artesanal deste móvel.',
      },
      {
        label: 'Campanha de valorização de reforma artesanal',
        prompt:
          'Elabore um roteiro de divulgação para clientes explicando por que reformar um sofá de estrutura nobre na Castros Interiores é vantajoso e como funciona nossa avaliação técnica em 8 etapas.',
      },
      {
        label: 'Mensagem de captação para clientes antigos',
        prompt:
          'Crie uma mensagem elegante e persuasiva para enviar a clientes da base da Castros Interiores apresentando a temporada de renovação de estofados, poltronas e cadeiras.',
      },
    ],
  },
  {
    id: 'carla_atendimento',
    buttonLabel: 'Carla Atendimento ao Cliente',
    personName: 'Carla',
    departmentRole: 'Atendimento ao Cliente',
    summary:
      'Recepção, cadastro de novos atendimentos, coleta de fotos por ângulo e relacionamento via WhatsApp.',
    icon: Headphones,
    quickPrompts: [
      {
        label: 'Boas-vindas e orientação de fotos no WhatsApp',
        prompt:
          'Redija uma mensagem acolhedora em nome da Carla (Atendimento ao Cliente da Castros Interiores) para o cliente deste atendimento, confirmando o cadastro e orientando quais fotos adicionais do móvel ajudarão na avaliação.',
      },
      {
        label: 'Atualização de andamento do atendimento',
        prompt:
          'Escreva um comunicado cordial para o cliente informando o status atual do atendimento e explicando os próximos passos da avaliação pela equipe da Castros Interiores.',
      },
      {
        label: 'Roteiro de triagem inicial de cliente',
        prompt:
          'Monte um checklist rápido de perguntas que o atendimento deve fazer ao cliente para completar todas as informações de uso, medidas e preferência de tecido e conforto.',
      },
    ],
  },
  {
    id: 'pedro_avaliacao',
    buttonLabel: 'Pedro Avaliação Técnica',
    personName: 'Pedro',
    departmentRole: 'Avaliação Técnica',
    summary:
      'Inspeção das 11 áreas do móvel, revisão na bancada da oficina, teste de espuma e reaproveitamento.',
    icon: Wrench,
    quickPrompts: [
      {
        label: 'Resumo técnico de defeitos e pontos de atenção',
        prompt:
          'Analise tecnicamente as fotos e os defeitos relatados neste atendimento e apresente o parecer do Pedro (Avaliação Técnica) sobre os pontos críticos que devem ser conferidos na abertura do estofado na oficina.',
      },
      {
        label: 'Plano de verificação de estrutura e espumas',
        prompt:
          'Liste o protocolo técnico para conferência presencial de madeiramento, percintas, molas e teste físico da espuma deste estofado na bancada da oficina.',
      },
      {
        label: 'Comparativo técnico das 3 propostas de reforma',
        prompt:
          'Explique tecnicamente a diferença de escopo e durabilidade entre as propostas Essencial, Recomendada e Completa para este móvel.',
      },
    ],
  },
  {
    id: 'ana_compras',
    buttonLabel: 'Ana Compras e Suprimentos',
    personName: 'Ana',
    departmentRole: 'Compras e Suprimentos',
    summary:
      'Gestão do catálogo de materiais, tecidos, espumas, fornecedores, cotações e plano de corte.',
    icon: Package,
    quickPrompts: [
      {
        label: 'Lista de compra e cotação de insumos do atendimento',
        prompt:
          'Com base no móvel deste atendimento e no nosso catálogo de materiais, monte a relação de insumos necessários (tecidos, espumas, percintas, manta, forro TNT) e indique o que depende de confirmação no plano de corte.',
      },
      {
        label: 'Pedido de cotação para fornecedores',
        prompt:
          'Elabore uma mensagem formal da Ana (Compras e Suprimentos da Castros Interiores) para enviar aos fornecedores solicitando cotação e prazo de entrega dos materiais deste atendimento.',
      },
      {
        label: 'Checklist de conferência de recebimento de materiais',
        prompt:
          'Crie um checklist prático para conferência de lote, largura de rolo de tecido, gramatura e densidade certificada das espumas no recebimento da oficina.',
      },
    ],
  },
  {
    id: 'mila_financeiro',
    buttonLabel: 'Mila Administração Financeira',
    personName: 'Mila',
    departmentRole: 'Administração Financeira',
    summary:
      'Consolidação de custos internos, definição de preço de venda, condições de pagamento e PDFs A4.',
    icon: DollarSign,
    quickPrompts: [
      {
        label: 'Análise de composição de custos e fechamento de orçamento',
        prompt:
          'Analise os itens lançados no orçamento deste atendimento, verifique se há itens pendentes de quantidade ou preço de venda e oriente o fechamento financeiro seguro sem inventar números.',
      },
      {
        label: 'Mensagem comercial de apresentação do orçamento',
        prompt:
          'Elabore uma mensagem comercial elegante em nome da Mila (Administração Financeira da Castros Interiores) para acompanhar o envio do Relatório em PDF ao cliente, destacando transparência e condições de pagamento.',
      },
      {
        label: 'Auditoria de pendências financeiras do atendimento',
        prompt:
          'Verifique todas as pendências financeiras e cadastrais deste atendimento antes da homologação final e emissão dos relatórios em PDF A4.',
      },
    ],
  },
  {
    id: 'lucas_projetos',
    buttonLabel: 'Lucas Projetos e Fabricação',
    personName: 'Lucas',
    departmentRole: 'Projetos e Fabricação de Produtos Novos',
    summary:
      'Ficha técnica, componentes em milímetros, plano de corte preliminar, 12 etapas do manual de montagem e tolerâncias de qualidade.',
    icon: Layers,
    quickPrompts: [
      {
        label: 'Gerar ficha técnica e plano de corte preliminar',
        prompt:
          'Com base nas especificações e fotos deste pedido, detalhe a ficha técnica construtiva, componentes em milímetros, largura útil de tecido 1,40m com margem de perda e lista de compras preliminar.',
      },
      {
        label: 'Manual de montagem sequencial em 12 etapas',
        prompt:
          'Estruture o manual de montagem sequencial para oficina com as 12 etapas padronizadas, indicando componentes, sequência e pontos de inspeção de qualidade.',
      },
      {
        label: 'Auditar propostas pendentes de validação',
        prompt:
          'Identifique na ficha técnica quais medidas e espumas foram confirmadas pela oficina e quais permanecem como propostas pendentes de validação física.',
      },
    ],
  },
  {
    id: 'castro_estrategia',
    buttonLabel: 'Castro Estratégia e Negócio',
    personName: 'Castro (Roberto)',
    departmentRole: 'Estratégia e Organização do Negócio',
    summary:
      'Metas de vendas e rentabilidade, capacidade produtiva (base 80h/sem), mapa de gargalos e plano de ação semanal revisável.',
    icon: TrendingUp,
    quickPrompts: [
      {
        label: 'Análise de capacidade de oficina e gargalos ativos',
        prompt:
          'Avalie a carga horária atual dos pedidos de reforma e fabricação frente à capacidade semanal da oficina de 80h e identifique onde estão os gargalos.',
      },
      {
        label: 'Recomendação estruturada nos 7 pilares',
        prompt:
          'Elabore uma recomendação estratégica estruturada contendo Situação, Dados, Ação, Responsável, Prazo, Indicador KPI e Informações pendentes.',
      },
      {
        label: 'Plano de ação semanal de priorização de pedidos',
        prompt:
          'Defina o plano de ação semanal priorizando pedidos com entrega próxima, materiais já disponíveis em estoque e prazos de fornecedores.',
      },
    ],
  },
];

export const DepartmentsHub: React.FC<DepartmentsHubProps> = ({
  attendances,
  activeAttendance,
  materials,
  settings,
  isSaving,
  isAnalyzingDefects,
  isAnalyzingReuse,
  deviceFormFactor = 'Computador',
  stationName = 'Central Castros Interiores',
  juliaData = null,
  onSelectAttendance,
  onNewAttendance,
  onJumpToStep,
  onNavigateTab,
  onRunDefectsAnalysis,
  onRunReuseAnalysis,
  onGenerateInternalPdf,
  onGenerateClientPdf,
  onAttendanceUpdated,
}) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentId>('julia_marketing');
  const [customPromptsByDept, setCustomPromptsByDept] = useState<
    Record<DepartmentId, string>
  >({
    julia_marketing: '',
    carla_atendimento: '',
    pedro_avaliacao: '',
    ana_compras: '',
    mila_financeiro: '',
    lucas_projetos: '',
    castro_estrategia: '',
    supervisora_geral: '',
    tapeceiro_tecnico: '',
  });
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [resultsByDept, setResultsByDept] = useState<
    Partial<Record<DepartmentId, DepartmentConsultResponse>>
  >({});
  const [copiedMsg, setCopiedMsg] = useState(false);

  const currentDeptMeta =
    DEPARTMENTS_LIST.find((d) => d.id === selectedDept) || DEPARTMENTS_LIST[0];

  const totalPhotosCount = attendances.reduce((acc, a) => acc + (a.photos?.length || 0), 0);
  const totalEvaluatedAreas = activeAttendance?.defectFindings?.length || 0;
  const activeBudgetSummary = activeAttendance
    ? calculateBudgetSummary(activeAttendance.budget)
    : null;

  const handleConsultDepartmentAgent = async (
    deptId: DepartmentId,
    overridePrompt?: string
  ) => {
    const promptText = (overridePrompt ?? customPromptsByDept[deptId] ?? '').trim();
    if (!promptText) return;

    if (overridePrompt) {
      setCustomPromptsByDept((prev) => ({ ...prev, [deptId]: overridePrompt }));
    }

    setIsConsulting(true);
    setConsultError(null);
    try {
      const res = await fetch('/api/ai/agent-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: activeAttendance?.id,
          agentId: deptId,
          customPrompt: promptText,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(
          data.error || 'Não foi possível consultar o departamento no momento.'
        );
      }
      setResultsByDept((prev) => ({
        ...prev,
        [deptId]: {
          ...data.result,
          usedModel: data.usedModel,
        },
      }));
      if (data.attendance) {
        onAttendanceUpdated(data.attendance);
      }
    } catch (err) {
      setConsultError(
        err instanceof Error
          ? err.message
          : 'Erro ao processar solicitação do departamento.'
      );
    } finally {
      setIsConsulting(false);
    }
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      // ignore
    }
  };

  const currentConsultResult = resultsByDept[selectedDept];

  return (
    <section
      aria-label="Cinco Departamentos Principais da Castros Interiores"
      className="rounded-xl bg-white border border-[#E5DEC9] p-6 space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-[#EFECE6]">
        <div>
          <h1 className="text-2xl font-serif-display font-bold text-[#181512]">
            Departamentos Operacionais — Castros Interiores
          </h1>
          <p className="text-xs text-[#6B6257] mt-0.5">
            Selecione um dos cinco departamentos principais abaixo para acessar suas ferramentas, dados vinculados e assistente especialista sem perder nenhum dado atual.
          </p>
        </div>

        { (attendances?.length || 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#181512]">
              Atendimento Ativo:
            </span>
            <select
              value={activeAttendance?.id || ''}
              onChange={(e) => onSelectAttendance(e.target.value)}
              className="rounded-lg border border-[#D6CFC5] bg-[#F9F6F0] px-3 py-1.5 text-xs font-medium text-[#181512]"
            >
              {attendances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.attendanceNumber} — {formatMissingText(a.clientName)} ({a.furnitureType})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* OS CINCO BOTÕES PRINCIPAIS DOS DEPARTAMENTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DEPARTMENTS_LIST.map((dept) => {
          const isSelected = selectedDept === dept.id;

          let metricLine = '';
          if (dept.id === 'julia_marketing') {
            metricLine = '12 Etapas · Fotos Celular';
          } else if (dept.id === 'carla_atendimento') {
            metricLine = `${attendances?.length || 0} atendimento(s) registrado(s)`;
          } else if (dept.id === 'pedro_avaliacao') {
            metricLine = activeAttendance
              ? `${totalEvaluatedAreas}/11 áreas avaliadas`
              : '11 áreas padronizadas';
          } else if (dept.id === 'ana_compras') {
            metricLine = `${materials?.length || 0} itens no catálogo`;
          } else if (dept.id === 'mila_financeiro') {
            metricLine = activeBudgetSummary
              ? formatCurrencyBRL(activeBudgetSummary.totalInternalCostCents)
              : 'Orçamentos & PDF A4';
          }

          const hasChat = DEPTS_WITH_CHAT.has(dept.id);

          return (
            <div
              key={dept.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-[#181512] text-[#F9F6F0] border-[#181512] shadow-sm'
                  : 'bg-[#FAF8F5] text-[#181512] border-[#E5DEC9] hover:bg-[#F3EFE6]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDept(dept.id);
                  setConsultError(null);
                }}
                className="text-left space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <AgentPortrait
                    deskId={dept.id}
                    name={dept.personName}
                    portraitUpdatedAt={settings.agentPortraitUpdatedAt?.[dept.id]}
                    size="sm"
                  />
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      isSelected ? 'text-[#D8C5A3]' : 'text-[#6B6257]'
                    }`}
                  >
                    {metricLine}
                  </span>
                </div>

                <div className="font-bold text-sm leading-snug">
                  {dept.buttonLabel}
                </div>
                <p
                  className={`text-[10px] uppercase tracking-wide font-semibold ${
                    isSelected ? 'text-[#9A7138]' : 'text-[#9A7138]'
                  }`}
                >
                  Assistente virtual
                </p>

                <p
                  className={`text-xs leading-relaxed ${
                    isSelected ? 'text-[#D6CFC5]' : 'text-[#57534E]'
                  }`}
                >
                  {dept.summary}
                </p>
              </button>

              <div
                className={`pt-2 border-t flex items-center gap-2 ${
                  isSelected ? 'border-[#2E2722]' : 'border-[#E5DEC9]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onNavigateTab('escritorio')}
                  className={`flex-1 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 text-center ${
                    isSelected
                      ? 'bg-[#9A7138] text-white'
                      : 'bg-[#EDE7DC] text-[#181512] hover:bg-[#E5DEC9]'
                  }`}
                >
                  Abrir mesa
                </button>
                {hasChat && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('escritorio')}
                    className={`flex-1 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 text-center border ${
                      isSelected
                        ? 'border-[#9A7138] text-[#D8C5A3]'
                        : 'border-[#9A7138] text-[#845E2B] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    Conversar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PAINEL OPERACIONAL DO DEPARTAMENTO SELECIONADO */}
      {selectedDept === 'julia_marketing' ? (
        <JuliaMarketingDepartment
          deviceFormFactor={deviceFormFactor}
          stationName={stationName}
          workshopPhone={settings.phoneWhatsapp || '(91) 98556-9841'}
          externalJuliaData={juliaData}
        />
      ) : (
      <div className="rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5DEC9]">
          <div>
            <div className="text-xs font-mono font-semibold text-[#9A7138]">
              DEPARTAMENTO ATIVO · {currentDeptMeta.personName.toUpperCase()}
            </div>
            <h2 className="text-lg font-serif-display font-bold text-[#181512]">
              {currentDeptMeta.buttonLabel}
            </h2>
            <p className="text-xs text-[#57534E]">
              {currentDeptMeta.summary}
            </p>
          </div>

          {/* Atalhos diretos de cada departamento para o fluxo existente */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedDept === 'carla_atendimento' && (
              <>
                <button
                  type="button"
                  onClick={() => onNewAttendance('Reforma')}
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(1)}
                  className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#9A7138]" />
                  Ficha de Cadastro (Etapa 1)
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('clientes')}
                  className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#9A7138]" />
                  Base de Clientes
                </button>
              </>
            )}

            {selectedDept === 'pedro_avaliacao' && (
              <>
                <button
                  type="button"
                  disabled={!activeAttendance || isAnalyzingDefects}
                  onClick={onRunDefectsAnalysis}
                  className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isAnalyzingDefects
                    ? 'Analisando 11 Áreas...'
                    : 'Analisar Defeitos por Área (IA)'}
                </button>
                <button
                  type="button"
                  disabled={!activeAttendance || isAnalyzingReuse}
                  onClick={onRunReuseAnalysis}
                  className="px-3.5 py-2 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isAnalyzingReuse
                    ? 'Avaliando Reaproveitamento...'
                    : 'Avaliar Reaproveitamento e Propostas'}
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(4)}
                  className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512]"
                >
                  Revisão Técnica (Etapa 4)
                </button>
              </>
            )}

            {selectedDept === 'ana_compras' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('materiais')}
                  className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5 text-[#9A7138]" />
                  Abrir Catálogo de Materiais ({materials?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(7)}
                  className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512]"
                >
                  Plano de Corte e Insumos (Etapa 7)
                </button>
              </>
            )}

            {selectedDept === 'mila_financeiro' && (
              <>
                <button
                  type="button"
                  onClick={() => onJumpToStep(7)}
                  className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5 text-[#9A7138]" />
                  Orçamento e Preço de Venda (Etapa 7)
                </button>
                {activeAttendance && (
                  <>
                    <button
                      type="button"
                      onClick={() => onGenerateInternalPdf(activeAttendance)}
                      className="px-3.5 py-2 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF Interno
                    </button>
                    <button
                      type="button"
                      onClick={() => onGenerateClientPdf(activeAttendance)}
                      className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF do Cliente
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Visão contextual dos dados reais do departamento selecionado */}
        {selectedDept === 'carla_atendimento' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Cliente em Atendimento</span>
              <p className="text-base font-bold text-[#181512]">
                {activeAttendance
                  ? formatMissingText(activeAttendance.clientName)
                  : 'Nenhum atendimento ativo'}
              </p>
              <p className="text-[#57534E] tabular-nums">
                Telefone/WhatsApp:{' '}
                {activeAttendance
                  ? formatMissingText(activeAttendance.clientPhone)
                  : 'não informado'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Solicitação do Cliente</span>
              <p className="text-sm font-semibold text-[#181512]">
                {activeAttendance
                  ? formatMissingText(activeAttendance.desiredService)
                  : 'Inicie um novo atendimento para registrar o pedido'}
              </p>
              <p className="text-[#57534E]">
                Estado atual:{' '}
                <strong className="text-[#9A7138]">
                  {activeAttendance ? activeAttendance.status : 'Aguardando cadastro'}
                </strong>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Ações Rápidas da Recepção</span>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onJumpToStep(1)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  1. Dados do Cliente
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(2)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  2. Anexar Fotos ({activeAttendance?.photos?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('atendimentos')}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  Todos ({attendances?.length || 0})
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedDept === 'pedro_avaliacao' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Vistoria das 11 Áreas do Estofado</span>
              <p className="text-base font-bold text-[#181512] tabular-nums">
                {activeAttendance
                  ? `${activeAttendance?.defectFindings?.length || 0} de 11 áreas preenchidas`
                  : 'Selecione um atendimento'}
              </p>
              <p className="text-[#57534E]">
                {activeAttendance?.reviewCompleted
                  ? `Revisado por ${activeAttendance.reviewerName || 'Responsável'}`
                  : 'Sujeito à revisão técnica e abertura na oficina'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Inspeção de Oficina & Espuma</span>
              <p className="text-base font-bold text-[#181512]">
                {activeAttendance?.internalInspectionCompleted
                  ? 'Estrutura Interna Inspecionada'
                  : 'Abertura Interna Pendente'}
              </p>
              <p className="text-[#57534E]">
                Teste físico de espuma:{' '}
                {activeAttendance?.foamInspection.inspectedByWorkshop
                  ? 'Realizado na bancada'
                  : 'Pendente na oficina'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Etapas Técnicas Diretas</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onJumpToStep(3)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  Etapa 3: Defeitos
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(4)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  Etapa 4: Oficina
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(5)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  Etapa 5: Reaproveitamento
                </button>
                <button
                  type="button"
                  onClick={() => onJumpToStep(6)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] hover:bg-[#F3EFE6] font-medium text-[#181512]"
                >
                  Etapa 6: Propostas
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedDept === 'ana_compras' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Catálogo de Materiais e Suprimentos</span>
              <p className="text-base font-bold text-[#181512] tabular-nums">
                {materials?.length || 0} itens cadastrados
              </p>
              <p className="text-[#57534E]">
                Espumas certificadas, tecidos, percintas, manta siliconada, mão de obra e transporte.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Insumos do Atendimento Ativo</span>
              <p className="text-base font-bold text-[#181512] tabular-nums">
                {activeAttendance
                  ? `${activeAttendance?.budget?.items?.length || 0} item(ns) vinculado(s)`
                  : 'Nenhum atendimento ativo'}
              </p>
              <p className="text-[#57534E]">
                Plano de corte confirmado:{' '}
                <strong>
                  {activeAttendance?.budget.cuttingPlanConfirmed ? 'Sim' : 'Pendente'}
                </strong>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Principais Fornecedores Atuais</span>
              <p className="text-[#181512] font-medium line-clamp-2">
                {Array.from(
                  new Set(
                    materials
                      .map((m) => m.supplier.trim())
                      .filter((s) => s && s !== 'não informado')
                  )
                ).join(' · ') || 'Nenhum fornecedor informado'}
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('materiais')}
                className="text-xs font-semibold text-[#9A7138] underline pt-1"
              >
                Gerenciar tabela de materiais e preços →
              </button>
            </div>
          </div>
        )}

        {selectedDept === 'mila_financeiro' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Custo Interno Calculado (Atendimento Ativo)</span>
              <p className="text-base font-bold text-[#181512] font-mono tabular-nums">
                {activeBudgetSummary
                  ? formatCurrencyBRL(activeBudgetSummary.totalInternalCostCents)
                  : 'R$ 0,00'}
              </p>
              <p className="text-[#57534E]">
                {activeBudgetSummary?.hasAnyPendingItems
                  ? 'Cálculo parcial (há itens com quantidade ou custo a levantar)'
                  : 'Todos os itens lançados possuem custo definido'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Preço de Venda ao Cliente</span>
              <p className="text-base font-bold text-emerald-800 font-mono tabular-nums">
                {activeBudgetSummary
                  ? formatCurrencyBRL(activeBudgetSummary.sellingPriceCents)
                  : 'Pendente'}
              </p>
              <p className="text-[#57534E]">
                Condições:{' '}
                {activeAttendance
                  ? formatMissingText(activeAttendance.budget.paymentConditions)
                  : 'não informado'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-1">
              <span className="text-[#6B6257]">Homologação & Emissão A4</span>
              <p className="text-sm font-bold text-[#181512] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#9A7138] shrink-0" />
                <span>
                  {activeAttendance?.budget.confirmedByResponsible
                    ? `Confirmado por ${activeAttendance.budget.responsibleName}`
                    : 'Aguardando confirmação do responsável'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onJumpToStep(8)}
                  className="text-xs font-semibold text-[#9A7138] underline"
                >
                  Ir para Parecer e PDFs (Etapa 8) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assistente IA Especialista do Departamento Selecionado */}
        <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#181512]">
              Solicitar Tarefa para {currentDeptMeta.buttonLabel}:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {currentDeptMeta.quickPrompts?.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isConsulting}
                  onClick={() =>
                    handleConsultDepartmentAgent(selectedDept, qp.prompt)
                  }
                  className="px-2.5 py-1 rounded-lg border border-[#D8C5A3] bg-[#FAF6EE] hover:bg-[#F3EFE6] text-[11px] font-medium text-[#181512] transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customPromptsByDept[selectedDept] || ''}
              onChange={(e) =>
                setCustomPromptsByDept((prev) => ({
                  ...prev,
                  [selectedDept]: e.target.value,
                }))
              }
              placeholder={`Digite uma solicitação para ${currentDeptMeta.buttonLabel}...`}
              className="flex-1 rounded-lg border border-[#D6CFC5] px-3 py-2 text-xs"
            />
            <button
              type="button"
              disabled={
                isConsulting || !(customPromptsByDept[selectedDept] || '').trim()
              }
              onClick={() => handleConsultDepartmentAgent(selectedDept)}
              className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-[#9A7138]" />
              {isConsulting
                ? `Consultando ${currentDeptMeta.personName}...`
                : `Acionar ${currentDeptMeta.personName}`}
            </button>
          </div>

          {consultError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{consultError}</span>
            </div>
          )}

          {currentConsultResult && (
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#D8C5A3] space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DEC9] pb-2">
                <span className="font-bold text-sm text-[#181512]">
                  {currentConsultResult.agentTitle}
                </span>
                {currentConsultResult.usedModel && (
                  <span className="font-mono text-[#6B6257]">
                    Modelo: {currentConsultResult.usedModel}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[#181512]">
                  Resposta / Plano do Departamento:
                </h4>
                <p className="text-[#292524] whitespace-pre-line leading-relaxed">
                  {currentConsultResult.technicalAnalysis}
                </p>
              </div>

              {Array.isArray(currentConsultResult.recommendedActions) &&
                (currentConsultResult?.recommendedActions?.length || 0) > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#181512]">
                      Próximos Passos Recomendados:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-[#292524]">
                      {currentConsultResult.recommendedActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {currentConsultResult.clientMessageSuggestion && (
                <div className="p-3.5 rounded-lg bg-white border border-[#E5DEC9] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#181512]">
                      Texto Pronto para WhatsApp / Divulgação / Cotação:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyMessage(
                          currentConsultResult.clientMessageSuggestion
                        )
                      }
                      className="px-3 py-1 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold flex items-center gap-1"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar Texto
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[#292524] whitespace-pre-line leading-relaxed">
                    {currentConsultResult.clientMessageSuggestion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </section>
  );
};
