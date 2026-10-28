import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  FolderOpen,
  Calendar,
  Package,
  Megaphone,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  UserCheck,
  Bell,
  ArrowRight,
  TrendingUp,
  FileCheck,
  RotateCcw,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AttendanceRecord,
  MaterialCatalogItem,
  SharedOfficeData,
  JuliaDepartmentData,
  DepartmentId,
  OrderHandoffEntry,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';
import { AgentVoiceTextChat } from './AgentVoiceTextChat';

interface SupervisorDeskProps {
  attendances: AttendanceRecord[];
  materialsCatalog: MaterialCatalogItem[];
  officeData?: SharedOfficeData | null;
  juliaData?: JuliaDepartmentData | null;
  onUpdateAttendance: (updated: AttendanceRecord) => void;
  onNavigateTab: (tab: any) => void;
  onRequestHandoff?: (orderId: string, toDesk: DepartmentId, reason: string) => void;
  onOpenOrder?: (attendanceId: string) => void;
  onOpenOrderWorkflow?: (attendanceId: string) => void;
  onJumpToStep?: (step: number) => void;
  className?: string;
}

export const SupervisorDesk: React.FC<SupervisorDeskProps> = ({
  attendances,
  materialsCatalog,
  officeData,
  juliaData,
  onUpdateAttendance,
  onNavigateTab,
  onRequestHandoff,
  onOpenOrder,
  onOpenOrderWorkflow,
  onJumpToStep,
  className = '',
}) => {
  const handleOpenAttendance = onOpenOrder || onOpenOrderWorkflow;
  const [activeTab, setActiveTab] = useState<'painel' | 'pedidos' | 'campanhas' | 'compras' | 'chat'>('painel');
  const [searchTerm, setSearchTerm] = useState('');

  // Cálculos para o Gráfico de Atendimentos por Mês
  const last12MonthsData = useMemo(() => {
    const now = new Date();
    const data: { name: string; count: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('pt-BR', { month: 'short' });
      
      const count = attendances.filter((a) => {
        const createdAt = new Date(a.createdAt);
        return (
          createdAt.getMonth() === monthDate.getMonth() &&
          createdAt.getFullYear() === monthDate.getFullYear()
        );
      }).length;
      
      data.push({ name: monthName, count });
    }
    return data;
  }, [attendances]);

  // Modal para Cobrar Retorno / Enviar Recado Formal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<AttendanceRecord | null>(null);
  const [reminderAgent, setReminderAgent] = useState<DepartmentId>('lucas_projetos');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderDeadline, setReminderDeadline] = useState('Hoje até 17h');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modal para Homologar / Aprovar Decisão Pendente
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [orderToApprove, setOrderToApprove] = useState<AttendanceRecord | null>(null);
  const [approvalType, setApprovalType] = useState<'tecnica' | 'orcamento'>('tecnica');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Cálculos de Status em Tempo Real
  const totalOrders = attendances.length;
  const manufacturingOrders = attendances.filter((a) => a.orderType === 'Fabricação');
  const reformOrders = attendances.filter((a) => a.orderType !== 'Fabricação');

  // Pedidos com aprovações pendentes
  const pendingApprovalOrders = attendances.filter(
    (a) =>
      (a.orderType === 'Fabricação' && !a.manufacturingData?.responsibleApproval?.approved) ||
      (a.budget && !a.budget.confirmedByResponsible) ||
      a.deskStatus === 'aguardando_aprovacao'
  );

  // Materiais com estoque baixo ou a comprar
  const criticalMaterials = materialsCatalog.filter((m) => {
    const available = (m.physicalStock || 0) - (m.reservedStock || 0);
    return available <= 2;
  });

  // Campanhas ativas da Júlia
  const scheduledCampaigns = juliaData?.campaigns || [];

  // Enviar cobrança de retorno formal / recado
  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderMessage.trim()) return;

    setIsSendingReminder(true);
    try {
      const now = new Date().toISOString();
      const order = targetOrder || attendances[0];

      if (order) {
        const handoffNotice: OrderHandoffEntry = {
          id: `rem-${Date.now()}`,
          orderId: order.id,
          orderNumber: order.attendanceNumber,
          fromDesk: 'supervisora_geral',
          fromAgentName: 'Helena (Supervisora)',
          toDesk: reminderAgent,
          toAgentName: reminderAgent.replace(/_/g, ' '),
          timestamp: now,
          reason: `COBRANÇA DE RETORNO / RECADO FORMAL DA SUPERVISÃO: ${reminderMessage}`,
          summaryOfCompletedWork: `Supervisora Helena cobrou retorno com prazo: ${reminderDeadline}`,
          pendingItems: ['Atendimento prioritário solicitado pela supervisão'],
          expectedNextAction: 'Retorno formal ou conclusão da pendência pelo responsável',
          documentVersion: 'v-supervisao',
          status: 'pendente_retorno',
        };

        const updatedHistory = [...(order.handoffHistory || []), handoffNotice];
        const updatedOrder: AttendanceRecord = {
          ...order,
          handoffHistory: updatedHistory,
          updatedAt: now,
        };

        await onUpdateAttendance(updatedOrder);
      }

      setSuccessNotice(`Recado formal e cobrança de retorno registrados para a mesa selecionada.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      setReminderModalOpen(false);
      setReminderMessage('');
    } catch (err) {
      alert(`Falha ao registrar cobrança de retorno: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Homologar Aprovação Formal da Supervisora
  const handleExecuteApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToApprove) return;

    setIsApproving(true);
    try {
      const now = new Date().toISOString();
      const order = { ...orderToApprove };

      if (approvalType === 'tecnica' && order.manufacturingData) {
        order.manufacturingData = {
          ...order.manufacturingData,
          technicalDraftStatus: 'aprovado_responsavel',
          responsibleApproval: {
            approved: true,
            approvedBy: 'Helena (Supervisora Geral)',
            approvedAt: now,
            version: order.manufacturingData.version || 'v1.0',
            notes: approvalNotes.trim() || 'Aprovado formalmente pela mesa de Supervisão Geral.',
          },
        };
      }

      if (approvalType === 'orcamento' && order.budget) {
        order.budget = {
          ...order.budget,
          confirmedByResponsible: true,
          responsibleName: 'Helena (Supervisora Geral)',
          confirmedAt: now,
        };
      }

      // Adicionar log na auditoria do pedido
      const auditEntry = {
        id: `aud-sup-${Date.now()}`,
        timestamp: now,
        actor: 'Helena (Supervisora Geral)',
        stage: 'Homologação e Governança',
        action: `Decisão de ${approvalType === 'tecnica' ? 'Projeto Técnico' : 'Orçamento'} Homologada`,
        details: approvalNotes || 'Validação formal concluída sem objeções.',
      };

      order.auditHistory = [...(order.auditHistory || []), auditEntry];
      order.deskStatus = 'em_andamento';
      order.updatedAt = now;

      await onUpdateAttendance(order);
      setSuccessNotice(`Aprovação formal do pedido ${order.attendanceNumber} homologada e registrada.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      setApprovalModalOpen(false);
      setApprovalNotes('');
    } catch (err) {
      alert(`Falha na homologação: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Banner de Identidade da Mesa Supervisora */}
      <div className="bg-[#181512] text-[#F9F6F0] rounded-xl border border-[#2E2722] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#9A7138] flex items-center justify-center text-white shrink-0 shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#D8C5A3] border border-[#57534E]">
                  Mesa 8 — Supervisão Geral & Governança
                </span>
                <span className="text-xs text-[#E5DEC9]">
                  Responsável: <strong>Helena (Supervisora Central)</strong>
                </span>
              </div>
              <h2 className="text-xl font-serif-display font-bold text-white mt-1">
                Central de Governança, Prazos & Decisões
              </h2>
              <p className="text-xs text-[#A8A29E] max-w-2xl mt-0.5">
                Supervisão cruzada de todos os pedidos de reforma e fabricação, campanhas da Júlia e compras da Ana.
                Cobrança de retornos com registro auditável e homologação de aprovações técnicas e orçamentárias.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTargetOrder(attendances[0] || null);
                setReminderModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#2E2722] hover:bg-[#3D352E] text-xs font-semibold text-white border border-[#57534E] flex items-center gap-1.5 shadow"
            >
              <Bell className="w-3.5 h-3.5 text-[#D8C5A3]" />
              <span>Cobrar Retorno / Enviar Recado</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className="px-4 py-2 rounded-xl bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <span>Conversar com a Supervisora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Tabs da Mesa Supervisora */}
      <div className="border-b border-[#E5DEC9] bg-[#FAF8F5] px-6 flex flex-wrap gap-2 pt-3 rounded-t-xl">
        {[
          { id: 'painel', label: '1. Painel Panorâmico & Prazos' },
          { id: 'pedidos', label: `2. Todos os Pedidos (${totalOrders})` },
          { id: 'campanhas', label: `3. Campanhas Marketing (${scheduledCampaigns.length})` },
          { id: 'compras', label: `4. Compras & Estoque Crítico (${criticalMaterials.length})` },
          { id: 'chat', label: '5. Chat de Voz & Texto com Helena' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
              activeTab === t.id
                ? 'bg-white border-[#E5DEC9] border-b-white text-[#181512] -mb-px'
                : 'border-transparent text-[#6B6257] hover:text-[#181512] hover:bg-[#F3EFE6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="bg-white rounded-b-xl border border-t-0 border-[#E5DEC9] p-6 shadow-sm">
        {/* ABA 1: PAINEL PANORÂMICO */}
        {activeTab === 'painel' && (
          <div className="space-y-6">
            {/* Cartões de Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-[10px] font-bold text-[#6B6257] uppercase tracking-wider">Total de Pedidos</span>
                <p className="text-2xl font-bold font-mono text-[#181512] mt-1">{totalOrders}</p>
                <p className="text-[11px] text-[#57534E] mt-1">
                  {manufacturingOrders.length} Fabricação · {reformOrders.length} Reforma
                </p>
              </div>

              <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Aprovações Pendentes</span>
                <p className="text-2xl font-bold font-mono text-amber-900 mt-1">{pendingApprovalOrders.length}</p>
                <p className="text-[11px] text-amber-800 mt-1">Aguardam homologação técnica ou de preço</p>
              </div>

              <div className="p-5 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Campanhas no Calendário</span>
                <p className="text-2xl font-bold font-mono text-purple-900 mt-1">{scheduledCampaigns.length}</p>
                <p className="text-[11px] text-purple-800 mt-1">Divulgações programadas pela Júlia</p>
              </div>

              <div className="p-5 rounded-xl bg-red-50 border border-red-200">
                <span className="text-[10px] font-bold text-red-900 uppercase tracking-wider">Insumos em Alerta</span>
                <p className="text-2xl font-bold font-mono text-red-900 mt-1">{criticalMaterials.length}</p>
                <p className="text-[11px] text-red-800 mt-1">Estoque crítico no quadro de suprimentos</p>
              </div>
            </div>

            {/* Gráfico de Atendimentos por Mês */}
            <div className="p-5 rounded-xl bg-white border border-[#E5DEC9] shadow-sm">
              <h3 className="font-bold text-sm text-[#181512] mb-4">Atendimentos Abertos por Mês (Últimos 12 meses)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last12MonthsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFECE6" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: '#F9F6F0' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="#9A7138" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pedidos que aguardam aprovação formal */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-[#181512] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#9A7138]" />
                <span>Pedidos que Requerem Decisão ou Homologação da Supervisão</span>
              </h3>

              {pendingApprovalOrders.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] text-xs text-[#6B6257] text-center">
                  Nenhum pedido pendente de aprovação neste momento. Todos os fluxos estão em conformidade.
                </div>
              ) : (
                <div className="divide-y divide-[#EFECE6] border border-[#E5DEC9] rounded-xl overflow-hidden">
                  {pendingApprovalOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#9A7138]">{ord.attendanceNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ord.orderType === 'Fabricação'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {ord.orderType || 'Reforma'}
                          </span>
                          <span className="text-xs font-semibold text-[#181512]">{ord.clientName}</span>
                        </div>
                        <p className="text-xs text-[#57534E]">
                          Móvel: <strong>{ord.furnitureType}</strong> · Mesa atual:{' '}
                          <span className="font-semibold text-[#9A7138]">{ord.currentDesk || 'carla_atendimento'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {ord.orderType === 'Fabricação' && !ord.manufacturingData?.responsibleApproval?.approved && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderToApprove(ord);
                              setApprovalType('tecnica');
                              setApprovalModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1 shadow"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Homologar Ficha Técnica</span>
                          </button>
                        )}

                        {ord.budget && !ord.budget.confirmedByResponsible && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderToApprove(ord);
                              setApprovalType('orcamento');
                              setApprovalModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Homologar Orçamento</span>
                          </button>
                        )}

                        {handleOpenAttendance && (
                          <button
                            type="button"
                            onClick={() => handleOpenAttendance(ord.id)}
                            className="px-3 py-1.5 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#181512] hover:bg-[#FAF8F5]"
                          >
                            Ver Fluxo Completo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: TODOS OS PEDIDOS & PRAZOS */}
        {activeTab === 'pedidos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-[#181512]">Auditoria Geral de Pedidos em Aberto</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por cliente, número ou móvel..."
                className="w-72 p-2 rounded-lg border border-[#D6CFC5] text-xs bg-[#FAF8F5]"
              />
            </div>

            <div className="border border-[#E5DEC9] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-3">Cliente & Móvel</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Mesa Atual</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {attendances
                    .filter((a) => {
                      if (!searchTerm.trim()) return true;
                      const q = searchTerm.toLowerCase();
                      return (
                        a.attendanceNumber.toLowerCase().includes(q) ||
                        a.clientName.toLowerCase().includes(q) ||
                        a.furnitureType.toLowerCase().includes(q)
                      );
                    })
                    .map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#9A7138]">{ord.attendanceNumber}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-[#181512]">{ord.clientName}</p>
                          <p className="text-[11px] text-[#6B6257]">{ord.furnitureType}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ord.orderType === 'Fabricação'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {ord.orderType || 'Reforma'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#181512]">{ord.currentDesk || 'carla_atendimento'}</span>
                          <span className="text-[10px] text-[#6B6257] block">{ord.assignedAgentName || ''}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-800">
                            {(ord.deskStatus || ord.status).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetOrder(ord);
                                setReminderModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-[#D6CFC5] hover:bg-[#EFECE6] text-[#181512]"
                              title="Cobrar retorno ou enviar recado formal"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                            {handleOpenAttendance && (
                              <button
                                type="button"
                                onClick={() => handleOpenAttendance(ord.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#181512] text-white text-[11px] font-semibold hover:bg-[#2E2722]"
                              >
                                Abrir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: CAMPANHAS DE MARKETING */}
        {activeTab === 'campanhas' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#181512]">Supervisão do Calendário de Divulgação da Júlia</h3>

            {scheduledCampaigns.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] text-xs text-[#6B6257] text-center">
                Nenhuma publicação agendada no calendário de marketing no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduledCampaigns.map((camp) => (
                  <div key={camp.id} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7138]">
                          {camp.channel}
                        </span>
                        <h4 className="font-bold text-sm text-[#181512]">{camp.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-900">
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-[#57534E] line-clamp-2">{camp.captionPreview}</p>
                    <div className="pt-2 border-t border-[#EFECE6] flex justify-between items-center text-[11px] text-[#6B6257]">
                      <span>Programada para: <strong>{camp.scheduledDate} às {camp.scheduledTime}</strong></span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('agentes')}
                        className="text-[#9A7138] font-semibold hover:underline"
                      >
                        Ver no Marketing ➔
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 4: COMPRAS & ESTOQUE CRÍTICO */}
        {activeTab === 'compras' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#181512]">Auditoria de Suprimentos & Insumos Críticos</h3>
              <button
                type="button"
                onClick={() => onNavigateTab('materiais')}
                className="text-xs font-semibold text-[#9A7138] hover:underline"
              >
                Abrir Catálogo de Matérias-Primas ➔
              </button>
            </div>

            <div className="border border-[#E5DEC9] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3 text-right">Custo Unitário</th>
                    <th className="py-2.5 px-3 text-right">Estoque Disp.</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {materialsCatalog.map((mat) => {
                    const available = (mat.physicalStock || 0) - (mat.reservedStock || 0);
                    return (
                      <tr key={mat.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#9A7138]">{mat.code || 'S/C'}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#181512]">{mat.name}</td>
                        <td className="py-2.5 px-3 text-[#6B6257]">{mat.rawCategory || mat.category}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrencyBRL(mat.unitCostCents)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={available <= 2 ? 'text-red-700' : 'text-emerald-700'}>
                            {available} {mat.consumptionUnit || mat.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              available <= 2 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {available <= 2 ? 'Reposição Necessária' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 5: CHAT DE VOZ E TEXTO COM HELENA */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <AgentVoiceTextChat
              deskId="supervisora_geral"
              agentName="Helena (Supervisora)"
              agentRole="Supervisão Geral de Pedidos, Campanhas e Compras"
              suggestedQuestions={[
                'Qual é a situação geral dos pedidos da oficina?',
                'Existem aprovações técnicas ou financeiras pendentes?',
                'Quais materiais estão com estoque crítico para compra?',
                'Como estão as publicações no calendário de marketing da Júlia?',
              ]}
            />
          </div>
        )}
      </div>

      {/* MODAL COBRAR RETORNO / ENVIAR RECADO */}
      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DEC9] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-[#EFECE6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7138]">Mesa Supervisora</span>
                <h3 className="text-lg font-serif-display font-bold text-[#181512]">
                  Cobrar Retorno / Enviar Recado Formal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="text-[#6B6257] hover:text-[#181512] font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReminder} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#57534E] font-medium mb-1">Mesa Destinatária</label>
                <select
                  value={reminderAgent}
                  onChange={(e) => setReminderAgent(e.target.value as DepartmentId)}
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5] bg-white font-medium"
                >
                  <option value="lucas_projetos">Lucas (Projetos & Fabricação Nova)</option>
                  <option value="pedro_avaliacao">Pedro (Avaliação & Reforma)</option>
                  <option value="ana_compras">Ana (Compras & Suprimentos)</option>
                  <option value="mila_financeiro">Mila (Administração Financeira)</option>
                  <option value="castro_estrategia">Castro (Roberto - Estratégia)</option>
                  <option value="julia_marketing">Júlia (Marketing & Anúncios)</option>
                  <option value="carla_atendimento">Carla (Atendimento & Recepção)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Recado / Pendência a Cobrar *</label>
                <textarea
                  rows={3}
                  required
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="Ex: Favor concluir a relação de materiais do pedido FAB-2026-0001 para liberação de compras..."
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Prazo de Resposta Esperado</label>
                <input
                  type="text"
                  value={reminderDeadline}
                  onChange={(e) => setReminderDeadline(e.target.value)}
                  placeholder="Ex: Hoje até 17h, Amanhã cedo"
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReminderModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-[#57534E] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingReminder}
                  className="px-5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Registrar Cobrança Formal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HOMOLOGAR APROVAÇÃO PENDENTE */}
      {approvalModalOpen && orderToApprove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DEC9] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-[#EFECE6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7138]">Supervisão Geral</span>
                <h3 className="text-lg font-serif-display font-bold text-[#181512]">
                  Homologar Decisão do Pedido {orderToApprove.attendanceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="text-[#6B6257] hover:text-[#181512] font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteApproval} className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-1">
                <p className="font-semibold text-[#181512]">Cliente: {orderToApprove.clientName}</p>
                <p className="text-[#6B6257]">Móvel: {orderToApprove.furnitureType}</p>
                <p className="text-[#9A7138] font-bold">
                  Tipo de Homologação: {approvalType === 'tecnica' ? 'Ficha Técnica de Fabricação' : 'Orçamento'}
                </p>
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Parecer / Notas de Homologação</label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Registre as notas de conformidade ou ressalvas técnicas aprovadas..."
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D6CFC5] text-[#57534E] font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-5 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Confirmar Homologação Formal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
