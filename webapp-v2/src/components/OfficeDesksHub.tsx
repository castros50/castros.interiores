import React, { useState, useEffect } from 'react';
import {
  Layers,
  Wrench,
  Package,
  Megaphone,
  ArrowRight,
  Send,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Clock,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight,
  FolderOpen,
  Wallet,
} from 'lucide-react';
import {
  AttendanceRecord,
  DepartmentId,
  OrderDeskStatus,
  OrderHandoffEntry,
  OrderType,
  SharedOfficeData,
  MaterialCatalogItem,
  WorkshopSettings,
} from '../types';
import { OFFICE_DESKS } from '../utils/officeDefaults';
import { formatCurrencyBRL } from '../utils/calculations';
import { LucasManufacturingDesk } from './LucasManufacturingDesk';
import { MilaFinancialDesk } from './MilaFinancialDesk';
import { CastroStrategyDesk } from './CastroStrategyDesk';
import { SupervisorDesk } from './SupervisorDesk';
import { AgentVoiceTextChat } from './AgentVoiceTextChat';
import { AgentPortrait } from './AgentPortrait';
import { TapeceiroTecnicoDesk } from './TapeceiroTecnicoDesk';
import { MilaFactoryFinanceView } from './MilaFactoryFinanceView';

interface OfficeDesksHubProps {
  attendances: AttendanceRecord[];
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  activeAttendanceId: string | null;
  onSelectAttendance: (id: string | null) => void;
  onUpdateAttendance: (updated: AttendanceRecord) => void;
  onNavigateTab: (tab: any) => void;
  onJumpToStep?: (step: number) => void;
  // Mesa a abrir ao chegar vinda de fora (ex.: cartão específico no Painel).
  // Consumida uma única vez e depois limpa via onDeskIdConsumed.
  initialDeskId?: DepartmentId | null;
  onDeskIdConsumed?: () => void;
}

export const OfficeDesksHub: React.FC<OfficeDesksHubProps> = ({
  attendances,
  materialsCatalog,
  settings,
  activeAttendanceId,
  onSelectAttendance,
  onUpdateAttendance,
  onNavigateTab,
  onJumpToStep,
  initialDeskId,
  onDeskIdConsumed,
}) => {
  const [selectedDeskId, setSelectedDeskId] = useState<DepartmentId>('lucas_projetos');
  const [deskFilter, setDeskFilter] = useState<'all' | DepartmentId>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Reforma' | 'Fabricação'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dados do Escritório
  const [officeData, setOfficeData] = useState<SharedOfficeData | null>(null);
  const [isLoadingOffice, setIsLoadingOffice] = useState(false);

  // Modal de Transferência / Encaminhamento
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [orderToTransfer, setOrderToTransfer] = useState<AttendanceRecord | null>(null);
  const [targetDesk, setTargetDesk] = useState<DepartmentId>('ana_compras');
  const [transferReason, setTransferReason] = useState('');
  const [transferSummary, setTransferSummary] = useState('');
  const [transferPending, setTransferPending] = useState('');
  const [transferNextAction, setTransferNextAction] = useState('');
  const [transferVersion, setTransferVersion] = useState('v1.0');
  const [isTransferring, setIsTransferring] = useState(false);

  // Modal de Novo Pedido Compartilhado
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [newOrderType, setNewOrderType] = useState<OrderType>('Fabricação');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newFurnitureType, setNewFurnitureType] = useState('');
  const [newPiecesCount, setNewPiecesCount] = useState('1 unidade');
  const [newMeasurements, setNewMeasurements] = useState('');
  const [newDesiredService, setNewDesiredService] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [categorizeModalOpen, setCategorizeModalOpen] = useState(false);
  const [orderToCategorize, setOrderToCategorize] = useState<AttendanceRecord | null>(null);

  // Carregar dados centrais do escritório
  const loadOfficeState = async () => {
    setIsLoadingOffice(true);
    try {
      const res = await fetch('/api/office');
      const data = await res.json();
      if (data.ok && data.officeData) {
        setOfficeData(data.officeData);
      }
    } catch (err) {
      console.error('Erro ao carregar escritório:', err);
    } finally {
      setIsLoadingOffice(false);
    }
  };

  useEffect(() => {
    loadOfficeState();
  }, []);

  // Ao chegar com uma mesa específica pedida de fora (ex.: "Abrir mesa"/"Conversar"
  // no cartão de um departamento no Painel), seleciona essa mesa e consome o pedido.
  useEffect(() => {
    if (initialDeskId) {
      setSelectedDeskId(initialDeskId);
      setDeskFilter(initialDeskId);
      onDeskIdConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeskId]);

  const activeOrder =
    attendances.find((a) => a.id === activeAttendanceId) ||
    attendances.find((a) => a.currentDesk === selectedDeskId && (selectedDeskId !== 'lucas_projetos' || a.orderType === 'Fabricação')) ||
    (selectedDeskId === 'lucas_projetos' || selectedDeskId === 'mila_financeiro' ? null : attendances[0]);

  // Contagem de pedidos por mesa
  const getOrdersCountByDesk = (deskId: DepartmentId) => {
    return attendances.filter((a) => a.currentDesk === deskId).length;
  };

  // Abrir Modal de Transferência
  const handleOpenTransfer = (order: AttendanceRecord, toDeskSuggestion?: string) => {
    setOrderToTransfer(order);
    if (toDeskSuggestion) {
      setTargetDesk(toDeskSuggestion as DepartmentId);
    } else {
      // Sugestão padrão dependendo da mesa atual
      if (order.currentDesk === 'lucas_projetos') setTargetDesk('ana_compras');
      else if (order.currentDesk === 'ana_compras') setTargetDesk('mila_financeiro');
      else if (order.currentDesk === 'mila_financeiro') setTargetDesk('castro_estrategia');
      else if (order.currentDesk === 'carla_atendimento') setTargetDesk('pedro_avaliacao');
      else if (order.currentDesk === 'pedro_avaliacao') setTargetDesk('mila_financeiro');
      else setTargetDesk('carla_atendimento');
    }
    setTransferReason('Etapa atual finalizada, encaminhando para análise e continuidade');
    setTransferSummary('Documentos técnicos e especificações atualizadas');
    setTransferPending('Aguardando conferência e validação na próxima mesa');
    setTransferNextAction('Análise técnica e orçamento/projeto');
    setTransferVersion(order.manufacturingData?.version || 'v1.0');
    setTransferModalOpen(true);
  };

  // Executar Transferência Real via API
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToTransfer) return;

    setIsTransferring(true);
    try {
      const res = await fetch('/api/orders/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderToTransfer.id,
          fromDesk: orderToTransfer.currentDesk || selectedDeskId,
          toDesk: targetDesk,
          reason: transferReason,
          completedSummary: transferSummary,
          pendingItems: transferPending ? [transferPending] : [],
          nextActionExpected: transferNextAction,
          documentVersion: transferVersion,
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateAttendance(data.order);
        if (data.officeData) setOfficeData(data.officeData);
        setTransferModalOpen(false);
        setOrderToTransfer(null);
        setSelectedDeskId(targetDesk);
      }
    } catch (err) {
      console.error('Erro na transferência:', err);
      alert('Erro ao encaminhar pedido.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Atualizar Status Operacional da Mesa
  const handleUpdateDeskStatus = async (
    orderId: string,
    deskStatus: OrderDeskStatus,
    note?: string
  ) => {
    try {
      const res = await fetch('/api/orders/desk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          deskStatus,
          note,
          actorName: `Mesa ${selectedDeskId}`,
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateAttendance(data.order);
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Classificar Pedido (Reforma/Fabricação)
  const handleCategorizeOrder = async (orderId: string, orderType: 'Reforma' | 'Fabricação') => {
    try {
      const res = await fetch('/api/orders/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderType,
          assignedDesk: orderType === 'Fabricação' ? 'lucas_projetos' : 'carla_atendimento',
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateAttendance(data.order);
        setCategorizeModalOpen(false);
        setOrderToCategorize(null);
      }
    } catch (err) {
      console.error('Erro ao classificar pedido:', err);
      alert('Erro ao classificar pedido.');
    }
  };

  // Criar Novo Pedido
  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newFurnitureType) {
      alert('Informe o nome do cliente e tipo de móvel.');
      return;
    }

    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/orders/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: newOrderType,
          clientName: newClientName,
          clientPhone: newClientPhone,
          furnitureType: newFurnitureType,
          piecesCount: newPiecesCount,
          approxMeasurements: newMeasurements,
          desiredService: newDesiredService,
          assignedDesk: selectedDeskId !== 'lucas_projetos' && newOrderType === 'Reforma' ? 'carla_atendimento' : 'lucas_projetos',
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateAttendance(data.order);
        onSelectAttendance(data.order.id);
        setSelectedDeskId(data.order.currentDesk);
        setNewOrderModalOpen(false);
        setNewClientName('');
        setNewFurnitureType('');
      }
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      alert('Erro ao cadastrar novo pedido.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Filtragem de Pedidos
  const filteredOrders = attendances.filter((att) => {
    const matchesDesk = deskFilter === 'all' || att.currentDesk === deskFilter;
    const matchesType = typeFilter === 'all' || att.orderType === typeFilter;
    const matchesSearch =
      !searchTerm ||
      att.attendanceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.furnitureType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDesk && matchesType && matchesSearch;
  });

  const selectedDeskMeta = OFFICE_DESKS.find((d) => d.id === selectedDeskId) || OFFICE_DESKS[2];

  return (
    <div className="space-y-6">
      {/* Top Banner de Escritório com Mesas */}
      <div className="rounded-xl bg-white border border-[#E5DEC9] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EFECE6]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#181512] text-white">
                Castros Interiores
              </span>
              <span className="text-xs text-[#6B6257]">Escritório Central Integrado</span>
            </div>
            <h1 className="text-2xl font-serif-display font-bold text-[#181512] mt-1">
              Escritório de Agentes: Mesas & Funções Operacionais
            </h1>
            <p className="text-xs text-[#57534E] max-w-3xl mt-1">
              Organização visual em mesas de trabalho interligadas. Cada agente administra seus pedidos,
              tarefas, pendências e transferências rastreáveis sobre a mesma base de dados, sem duplicar
              cadastros ou despesas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setNewOrderModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido (Reforma / Fabricação)
            </button>
          </div>
        </div>

        {/* Grade Visual das 7 Mesas de Escritório */}
        <div className="pt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B6257]">
              Mesas de Trabalho dos Agentes ({OFFICE_DESKS.length})
            </h2>
            <span className="text-[11px] text-[#57534E]">Clique na mesa para sentar e operar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {OFFICE_DESKS.map((desk) => {
              const count = getOrdersCountByDesk(desk.id);
              const isSelected = selectedDeskId === desk.id;

              return (
                <button
                  key={desk.id}
                  type="button"
                  onClick={() => {
                    setSelectedDeskId(desk.id);
                    setDeskFilter(desk.id);
                  }}
                  className={`relative p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#181512] text-white border-[#181512] shadow-md ring-2 ring-[#9A7138]'
                      : 'bg-[#FAF8F5] text-[#181512] border-[#E5DEC9] hover:bg-white hover:border-[#D6CFC5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <AgentPortrait
                      deskId={desk.id}
                      name={desk.name}
                      portraitUpdatedAt={settings.agentPortraitUpdatedAt?.[desk.id]}
                      size="sm"
                    />
                    {count > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isSelected
                            ? 'bg-[#E5DEC9] text-[#181512]'
                            : 'bg-[#181512] text-white'
                        }`}
                        title={`${count} pedido(s) aguardando nesta mesa`}
                      >
                        {count} na fila
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <p
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        isSelected ? 'text-[#D6CFC5]' : 'text-[#6B6257]'
                      }`}
                    >
                      Mesa {desk.number}
                    </p>
                    <p className="font-bold text-xs truncate mt-0.5">{desk.name}</p>
                    <p
                      className={`text-[10px] line-clamp-1 mt-0.5 ${
                        isSelected ? 'text-[#E5DEC9]' : 'text-[#57534E]'
                      }`}
                    >
                      {desk.role}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Seletor de Pedidos Compartilhados */}
      <div className="p-4 rounded-xl bg-white border border-[#E5DEC9] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Tipo */}
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-lg border border-[#E5DEC9]">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded font-medium ${
                typeFilter === 'all'
                  ? 'bg-[#181512] text-white'
                  : 'text-[#6B6257] hover:text-[#181512]'
              }`}
            >
              Todos ({attendances.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Fabricação')}
              className={`px-2.5 py-1 rounded font-medium ${
                typeFilter === 'Fabricação'
                  ? 'bg-[#9A7138] text-white'
                  : 'text-[#6B6257] hover:text-[#181512]'
              }`}
            >
              Fabricação (
              {attendances.filter((a) => a.orderType === 'Fabricação').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Reforma')}
              className={`px-2.5 py-1 rounded font-medium ${
                typeFilter === 'Reforma'
                  ? 'bg-purple-900 text-white'
                  : 'text-[#6B6257] hover:text-[#181512]'
              }`}
            >
              Reforma ({attendances.filter((a) => a.orderType !== 'Fabricação').length})
            </button>
          </div>

          {/* Atalhos para os 2 Cenários de Demonstração */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#E5DEC9]">
            <span className="text-[11px] font-semibold text-[#6B6257]">Cenários de Teste:</span>
            {attendances
              .filter((a) => a.isTestScenario)
              .map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    onSelectAttendance(sc.id);
                    if (sc.currentDesk) setSelectedDeskId(sc.currentDesk);
                  }}
                  className={`px-2.5 py-1 rounded border text-[11px] font-bold ${
                    activeOrder?.id === sc.id
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-[#FAF8F5] text-[#181512] border-[#D6CFC5] hover:bg-white'
                  }`}
                >
                  {sc.attendanceNumber}: {sc.furnitureType}
                </button>
              ))}
          </div>
        </div>

        {/* Busca por código ou cliente */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B6257]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido ou móvel..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D6CFC5] bg-white text-xs"
          />
        </div>
      </div>

      {/* Lista de Pedidos na Mesa Selecionada + Seletor de Foco */}
      <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E5DEC9] space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase text-[#181512]">
              Fila de Pedidos da Mesa {selectedDeskMeta.number} — {selectedDeskMeta.name}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5DEC9] text-[#181512]">
              {filteredOrders.filter((a) => a.currentDesk === selectedDeskId).length} pedido(s)
            </span>
          </div>
          <span className="text-[11px] text-[#6B6257]">
            Clique em um pedido para carregá-lo na área operacional da mesa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOrders.map((ord) => {
            const isCurrent = activeOrder?.id === ord.id;
            const isAssignedToThisDesk = ord.currentDesk === selectedDeskId;

            return (
              <div
                key={ord.id}
                onClick={() => {
                  if (!ord.orderType) {
                    setOrderToCategorize(ord);
                    setCategorizeModalOpen(true);
                  } else {
                    onSelectAttendance(ord.id);
                  }
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-white border-[#9A7138] shadow ring-1 ring-[#9A7138]'
                    : isAssignedToThisDesk
                    ? 'bg-white border-[#D6CFC5] hover:border-[#9A7138]'
                    : 'bg-[#FAF8F5] opacity-70 border-[#E5DEC9] hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-xs text-[#181512]">
                      {ord.attendanceNumber}
                    </span>
                    <span
                      className={`ml-1.5 px-2 py-0.2 rounded text-[10px] font-semibold ${
                        ord.orderType === 'Fabricação'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-purple-100 text-purple-900'
                      }`}
                    >
                      {ord.orderType}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ord.deskStatus === 'concluido_mesa'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.deskStatus === 'devolvido_correcao'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {ord.deskStatus?.replace(/_/g, ' ') || 'em andamento'}
                  </span>
                </div>

                <p className="font-semibold text-xs text-[#181512] mt-1.5 truncate">
                  {ord.furnitureType} — {ord.clientName}
                </p>

                <div className="mt-2 pt-2 border-t border-[#EFECE6] flex justify-between items-center text-[10px] text-[#6B6257]">
                  <span>Mesa Atual: {ord.assignedAgentName?.split(' ')[0] || ord.currentDesk}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTransfer(ord);
                    }}
                    className="px-2 py-1 rounded bg-[#F3EFE6] hover:bg-[#E5DEC9] text-[#181512] font-semibold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-[#9A7138]" />
                    Transferir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FINANCEIRO DA FÁBRICA — funciona sem nenhum pedido selecionado */}
      {!activeOrder && selectedDeskId === 'mila_financeiro' && (
        <div className="space-y-4">
          <MilaFactoryFinanceView
            settings={settings}
            onOpenOrder={(orderId) => onSelectAttendance(orderId)}
          />

          {/* Central de Conversa Funcional por Voz e Texto com a Mila — consulta o financeiro real */}
          <AgentVoiceTextChat
            deskId="mila_financeiro"
            agentName={selectedDeskMeta.name}
            agentRole={selectedDeskMeta.role}
            portraitUpdatedAt={settings.agentPortraitUpdatedAt?.mila_financeiro}
            suggestedQuestions={[
              'Quanto já entrou e quanto já saiu do caixa este mês?',
              'Quais contas estão pendentes de pagamento ou recebimento?',
              'Qual é a reserva do Edson este mês e quanto já foi retirado?',
              'Onde está o saldo da fábrica hoje, por conta?',
            ]}
          />
        </div>
      )}

      {/* SUPERVISORA GERAL (Helena) — função panorâmica, nunca depende de um pedido específico */}
      {selectedDeskId === 'supervisora_geral' && (
        <SupervisorDesk
          attendances={attendances}
          officeData={officeData}
          materialsCatalog={materialsCatalog}
          settings={settings}
          onUpdateAttendance={onUpdateAttendance}
          onOpenOrder={onSelectAttendance}
          onNavigateTab={onNavigateTab}
          onJumpToStep={onJumpToStep}
        />
      )}

      {/* Nenhum pedido ativo nesta mesa ainda — nunca deixar a área em branco sem explicação */}
      {!activeOrder && selectedDeskId !== 'mila_financeiro' && selectedDeskId !== 'supervisora_geral' && (
        <div className="p-8 rounded-xl bg-white border border-[#E5DEC9] shadow-sm text-center space-y-3">
          <p className="text-sm font-semibold text-[#181512]">
            Nenhum pedido ativo na Mesa {selectedDeskMeta.number} — {selectedDeskMeta.name} ainda.
          </p>
          <p className="text-xs text-[#6B6257] max-w-md mx-auto">
            Crie um novo atendimento ou clique num pedido da lista acima (quando houver algum nesta
            mesa) para abrir a área de trabalho.
          </p>
          <button
            type="button"
            onClick={() => setNewOrderModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Pedido (Reforma / Fabricação)
          </button>
        </div>
      )}

      {/* ÁREA OPERACIONAL DA MESA ATUAL */}
      {activeOrder && (
        <div className="space-y-4">
          {/* Barra de Ações Operacionais Reais na Mesa */}
          <div className="p-4 rounded-xl bg-[#181512] text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#9A7138] flex items-center justify-center font-bold text-white text-xs">
                {selectedDeskMeta.number}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#D6CFC5]">
                    Pedido Selecionado na Mesa:
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {activeOrder.attendanceNumber} ({activeOrder.orderType})
                  </span>
                  <span className="text-xs text-[#E5DEC9]">
                    — {activeOrder.clientName} ({activeOrder.furnitureType})
                  </span>
                </div>
                <p className="text-[11px] text-[#A8A29E] mt-0.5">
                  Responsável Atual: <strong>{activeOrder.assignedAgentName}</strong> | Status na Mesa:{' '}
                  <strong>{activeOrder.deskStatus || 'novo'}</strong>
                </p>
              </div>
            </div>

            {/* Botões de Ação na Mesa */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleUpdateDeskStatus(
                    activeOrder.id,
                    'aceito',
                    `Encaminhamento aceito por ${selectedDeskMeta.name}`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-semibold text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Aceitar Pedido
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateDeskStatus(
                    activeOrder.id,
                    'em_andamento',
                    `Trabalho iniciado na mesa de ${selectedDeskMeta.name}`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-semibold text-white border border-[#57534E] flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-[#E5DEC9]" />
                Iniciar Trabalho
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateDeskStatus(
                    activeOrder.id,
                    'devolvido_correcao',
                    `Devolvido para correção na mesa anterior`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs font-semibold text-red-300 border border-red-500/40 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Devolver p/ Correção
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectAttendance(activeOrder.id);
                  onNavigateTab('painel');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-xs font-semibold text-white border border-[#57534E] flex items-center gap-1.5"
                title="Abrir fluxo completo de 8 etapas para este pedido"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#E5DEC9]" />
                {activeOrder.orderType === 'Fabricação'
                  ? 'Abrir Fluxo de Fabricação (Lucas - 8 Etapas)'
                  : 'Abrir Fluxo de Reforma (Pedro - 8 Etapas)'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenTransfer(activeOrder)}
                className="px-3.5 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white shadow flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Encaminhar Pedido
              </button>
            </div>
          </div>

          {/* RENDERIZAÇÃO DA MESA ESPECÍFICA */}
          {selectedDeskId === 'lucas_projetos' && (
            <LucasManufacturingDesk
              order={activeOrder}
              materialsCatalog={materialsCatalog}
              settings={settings}
              onUpdateOrder={onUpdateAttendance}
              onRequestHandoff={(orderId, toDesk, reason) => {
                const target = attendances.find((a) => a.id === orderId);
                if (target) handleOpenTransfer(target, toDesk);
              }}
              onOpenFullWorkflow={() => {
                onSelectAttendance(activeOrder.id);
                onNavigateTab('painel');
              }}
            />
          )}

          {selectedDeskId === 'mila_financeiro' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onSelectAttendance(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E5DEC9] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-[#9A7138]" />
                ← Ver Financeiro da Fábrica (sem pedido)
              </button>
              <MilaFinancialDesk
                order={activeOrder}
                materialsCatalog={materialsCatalog}
                settings={settings}
                onUpdateOrder={onUpdateAttendance}
                onRequestHandoff={(orderId, toDesk, reason) => {
                  const target = attendances.find((a) => a.id === orderId);
                  if (target) handleOpenTransfer(target, toDesk);
                }}
              />
            </div>
          )}

          {selectedDeskId === 'castro_estrategia' && officeData && (
            <CastroStrategyDesk
              officeData={officeData}
              attendances={attendances}
              settings={settings}
              onUpdateOfficeData={setOfficeData}
              onRequestHandoff={(orderId, toDesk, reason) => {
                const target = attendances.find((a) => a.id === orderId);
                if (target) handleOpenTransfer(target, toDesk);
              }}
            />
          )}

          {selectedDeskId === 'tapeceiro_tecnico' && (
            <TapeceiroTecnicoDesk
              order={activeOrder}
              settings={settings}
              onUpdateOrder={onUpdateAttendance}
            />
          )}

          {/* Mesas de Atendimento (Carla), Avaliação (Pedro), Compras (Ana) ou Marketing (Júlia) */}
          {['carla_atendimento', 'pedro_avaliacao', 'ana_compras', 'julia_marketing'].includes(
            selectedDeskId
          ) && (
            <div className="p-6 rounded-xl bg-white border border-[#E5DEC9] shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#EFECE6]">
                <div className="flex items-center gap-3">
                  <AgentPortrait
                    deskId={selectedDeskMeta.id}
                    name={selectedDeskMeta.name}
                    portraitUpdatedAt={settings.agentPortraitUpdatedAt?.[selectedDeskMeta.id]}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-bold text-base text-[#181512]">
                      Mesa de {selectedDeskMeta.name} — {selectedDeskMeta.role}
                    </h3>
                    <p className="text-[10px] uppercase tracking-wide text-[#9A7138] font-semibold mt-0.5">
                      Assistente virtual
                    </p>
                    <p className="text-xs text-[#6B6257] mt-0.5">
                      {selectedDeskMeta.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDeskId === 'carla_atendimento' && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('atendimentos')}
                      className="px-3.5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Abrir Triagem & Fotos no Fluxo
                    </button>
                  )}

                  {selectedDeskId === 'pedro_avaliacao' && onJumpToStep && (
                    <button
                      type="button"
                      onClick={() => {
                        onJumpToStep(1);
                        onNavigateTab('painel');
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Abrir Vistoria das 11 Áreas
                    </button>
                  )}

                  {selectedDeskId === 'ana_compras' && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('materiais')}
                      className="px-3.5 py-2 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Package className="w-3.5 h-3.5" />
                      Gerenciar Catálogo de Materiais
                    </button>
                  )}

                  {selectedDeskId === 'julia_marketing' && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('agentes')}
                      className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      Abrir Anúncios Inteligentes
                    </button>
                  )}
                </div>
              </div>

              {/* Histórico de Transferências do Pedido */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">
                  Histórico de Transferências e Auditoria do Pedido
                </h4>
                {activeOrder.handoffHistory && activeOrder.handoffHistory.length > 0 ? (
                  <div className="space-y-2">
                    {activeOrder.handoffHistory.map((hnd) => (
                      <div
                        key={hnd.id}
                        className="p-3.5 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center text-[#6B6257]">
                          <span className="font-mono">
                            {new Date(hnd.timestamp).toLocaleString('pt-BR')} — Versão {hnd.documentVersion}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              hnd.status === 'aceito'
                                ? 'bg-emerald-100 text-emerald-800'
                                : hnd.status === 'devolvido'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {(hnd.status || 'pendente').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="font-semibold text-[#181512]">
                          De: <span className="text-[#9A7138]">{hnd.fromDesk}</span> ➔ Para:{' '}
                          <span className="text-[#9A7138]">{hnd.toDesk}</span>
                        </p>
                        <p className="text-[#57534E]">Motivo: {hnd.reason}</p>
                        <p className="text-[#57534E]">Concluído: {hnd.completedSummary}</p>
                        <p className="text-purple-800 font-medium">Próxima ação: {hnd.nextActionExpected}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B6257] italic">
                    Nenhuma transferência registrada para este pedido ainda.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Central de Conversa Funcional por Voz e Texto com o Agente da Mesa */}
          {selectedDeskId !== 'supervisora_geral' && (
            <div className="pt-2">
              <AgentVoiceTextChat
                deskId={selectedDeskId}
                agentName={selectedDeskMeta.name}
                agentRole={selectedDeskMeta.role}
                portraitUpdatedAt={settings.agentPortraitUpdatedAt?.[selectedDeskId]}
                attendanceId={activeOrder?.id}
                onActionExecuted={() => {
                  loadOfficeState();
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* MODAL DE TRANSFERÊNCIA ENTRE MESAS */}
      {transferModalOpen && orderToTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DEC9] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-[#EFECE6]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9A7138]">
                  Transferência Oficial de Mesa
                </span>
                <h3 className="text-lg font-serif-display font-bold text-[#181512]">
                  Encaminhar Pedido {orderToTransfer.attendanceNumber}
                </h3>
                <p className="text-xs text-[#6B6257]">
                  Cliente: {orderToTransfer.clientName} | Móvel: {orderToTransfer.furnitureType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="text-[#6B6257] hover:text-[#181512] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#57534E] font-medium mb-1">Mesa de Destino</label>
                <select
                  value={targetDesk}
                  onChange={(e) => setTargetDesk(e.target.value as DepartmentId)}
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5] bg-white font-medium"
                >
                  {OFFICE_DESKS.map((d) => (
                    <option key={d.id} value={d.id}>
                      Mesa {d.number} — {d.name} ({d.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Motivo do Encaminhamento</label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Ficha técnica concluída, necessário cotação de materiais..."
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Resumo do Trabalho Concluído</label>
                <textarea
                  rows={2}
                  required
                  value={transferSummary}
                  onChange={(e) => setTransferSummary(e.target.value)}
                  placeholder="Descreva o que já foi analisado e preenchido nesta mesa..."
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Pendências</label>
                  <input
                    type="text"
                    value={transferPending}
                    onChange={(e) => setTransferPending(e.target.value)}
                    placeholder="Ex: Validar bitolas na bancada"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Versão do Documento</label>
                  <input
                    type="text"
                    value={transferVersion}
                    onChange={(e) => setTransferVersion(e.target.value)}
                    placeholder="Ex: v1.0-rascunho"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Próxima Ação Esperada</label>
                <input
                  type="text"
                  required
                  value={transferNextAction}
                  onChange={(e) => setTransferNextAction(e.target.value)}
                  placeholder="Ex: Verificar estoque físico e cotação de frete com fornecedor"
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D6CFC5] font-medium text-xs text-[#57534E]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white font-semibold text-xs flex items-center gap-2 shadow"
                >
                  <Send className="w-4 h-4" />
                  Confirmar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO PEDIDO COMPARTILHADO */}
      {newOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DEC9] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-[#EFECE6]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#9A7138]">Cadastro Central</span>
                <h3 className="text-lg font-serif-display font-bold text-[#181512]">
                  Abrir Novo Pedido Compartilhado
                </h3>
                <p className="text-xs text-[#6B6257]">
                  Gera identificador único persistente (CI-2026-XXXX para Reforma ou FAB-2026-XXXX para Fabricação).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewOrderModalOpen(false)}
                className="text-[#6B6257] hover:text-[#181512] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#57534E] font-medium mb-1">Tipo de Pedido</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewOrderType('Fabricação')}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 ${
                      newOrderType === 'Fabricação'
                        ? 'bg-[#181512] text-white border-[#181512]'
                        : 'bg-[#FAF8F5] text-[#181512] border-[#D6CFC5]'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#9A7138]" />
                    Fabricação Nova (Lucas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOrderType('Reforma')}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 ${
                      newOrderType === 'Reforma'
                        ? 'bg-[#181512] text-white border-[#181512]'
                        : 'bg-[#FAF8F5] text-[#181512] border-[#D6CFC5]'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-purple-400" />
                    Reforma de Estofado (Carla)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ex: Marcos Vinícius"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Ex: (91) 98556-9841"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Tipo de Móvel *</label>
                  <input
                    type="text"
                    required
                    value={newFurnitureType}
                    onChange={(e) => setNewFurnitureType(e.target.value)}
                    placeholder="Ex: Sofá Living 3 Lugares"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Quantidade / Peças</label>
                  <input
                    type="text"
                    value={newPiecesCount}
                    onChange={(e) => setNewPiecesCount(e.target.value)}
                    placeholder="Ex: 1 unidade ou Lote 4 un"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Medidas Aproximadas</label>
                <input
                  type="text"
                  value={newMeasurements}
                  onChange={(e) => setNewMeasurements(e.target.value)}
                  placeholder="Ex: 2,10m x 0,90m x 0,95m"
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Serviço Desejado</label>
                <input
                  type="text"
                  value={newDesiredService}
                  onChange={(e) => setNewDesiredService(e.target.value)}
                  placeholder="Ex: Fabricação sob medida com tecido linho cru e pés torneados"
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D6CFC5] font-medium text-xs text-[#57534E]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="px-5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white font-semibold text-xs flex items-center gap-2 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Criar Pedido no Escritório
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {categorizeModalOpen && orderToCategorize && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DEC9] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-serif-display font-bold text-[#181512]">Classificar Pedido: {orderToCategorize.attendanceNumber || 'Sem número'}</h3>
            <p className="text-xs text-[#6B6257]">O pedido não possui tipo definido. Por favor, classifique-o:</p>
            <div className="flex gap-3">
              <button onClick={() => handleCategorizeOrder(orderToCategorize.id, 'Fabricação')} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Fabricação (Lucas)</button>
              <button onClick={() => handleCategorizeOrder(orderToCategorize.id, 'Reforma')} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold">Reforma (Pedro)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
