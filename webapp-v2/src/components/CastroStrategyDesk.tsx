import React, { useState } from 'react';
import {
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Send,
  Plus,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  Check,
  User,
  HelpCircle,
} from 'lucide-react';
import {
  AttendanceRecord,
  BusinessStrategyRecommendation,
  SharedOfficeData,
  WeeklyActionPlanItem,
  WeeklyStrategyPlan,
  WorkshopSettings,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';
import { AgentPortrait } from './AgentPortrait';

interface CastroStrategyDeskProps {
  officeData: SharedOfficeData;
  attendances: AttendanceRecord[];
  settings: WorkshopSettings;
  onUpdateOfficeData: (updated: SharedOfficeData) => void;
  onRequestHandoff: (orderId: string, toDesk: string, reason: string) => void;
}

export const CastroStrategyDesk: React.FC<CastroStrategyDeskProps> = ({
  officeData,
  attendances,
  settings,
  onUpdateOfficeData,
  onRequestHandoff,
}) => {
  const [activeTab, setActiveTab] = useState<'capacidade' | 'plano_semanal' | 'recomendacoes'>('capacidade');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Formulário para nova ação semanal
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionResponsible, setNewActionResponsible] = useState('Lucas (Projetos)');
  const [newActionPriority, setNewActionPriority] = useState<'alta' | 'media' | 'baixa'>('alta');

  const currentPlan = officeData.weeklyActionPlans?.[0] || {
    id: 'wp-default',
    weekLabel: 'Semana Operacional Vigente',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    focusTheme: 'Equilíbrio entre Fabricação Sob Encomenda e Reformas de Alto Padrão',
    actions: [],
  };

  const handleUpdateRecommendationStatus = async (
    id: string,
    status: BusinessStrategyRecommendation['status']
  ) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/orders/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateRecommendationStatus: { id, status },
        }),
      });
      const data = await res.json();
      if (data.ok && data.officeData) {
        onUpdateOfficeData(data.officeData);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao atualizar recomendação:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddActionPlanItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    const newItem: WeeklyActionPlanItem = {
      id: `act-${Date.now()}`,
      title: newActionTitle.trim(),
      responsibleAgent: newActionResponsible,
      priority: newActionPriority,
      status: 'planejada',
      deadline: 'Sexta-feira',
    };

    setIsSaving(true);
    try {
      const res = await fetch('/api/orders/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newWeeklyPlanItem: newItem,
        }),
      });
      const data = await res.json();
      if (data.ok && data.officeData) {
        onUpdateOfficeData(data.officeData);
        setNewActionTitle('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao adicionar ação semanal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const totalReformOrders = attendances.filter((a) => a.orderType !== 'Fabricação').length;
  const totalMfgOrders = attendances.filter((a) => a.orderType === 'Fabricação').length;

  const capacityHours = officeData.workshopCapacityHoursPerWeek || 80;
  const plannedHours = officeData.currentPlannedHoursWeek || 42;
  const utilizationPercent = Math.round((plannedHours / capacityHours) * 100);

  return (
    <div className="bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden">
      {/* Header da Mesa de Estratégia */}
      <div className="bg-[#181512] text-[#F9F6F0] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AgentPortrait
              deskId="castro_estrategia"
              name="Castro (Roberto)"
              portraitUpdatedAt={settings.agentPortraitUpdatedAt?.castro_estrategia}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#E5DEC9] border border-[#57534E]">
                  Mesa 6 — Estratégia & Organização do Negócio
                </span>
                <span className="text-xs text-[#E5DEC9]">
                  Responsável: <strong>Roberto Castro (Castro)</strong>
                </span>
              </div>
              <h2 className="text-xl font-serif-display font-bold text-white mt-1">
                Planejamento de Oficina, Metas & Gargalos
              </h2>
              <p className="text-xs text-[#D6CFC5] mt-0.5">
                Capacidade Semanal: <strong>{capacityHours}h/semana</strong> | Ocupação Atual:{' '}
                <strong className="text-emerald-400 font-mono">
                  {plannedHours}h ({utilizationPercent}%)
                </strong>{' '}
                | Mix: <strong>{totalReformOrders} Reformas</strong> /{' '}
                <strong>{totalMfgOrders} Fabricação Nova</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Alerta de Veracidade Estratégica */}
        <div className="mt-4 p-3 rounded-lg bg-[#2E2722] border border-[#57534E] text-xs flex items-start gap-2.5 text-[#E5DEC9]">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Diretriz Estratégica Castro:</strong> Sem histórico consolidado de
            meses anteriores, as projeções são apresentadas como <em>Cenários ou Hipóteses de Planejamento</em>. Não
            inventamos vendas futuras nem capacidades ilusórias. Toda decisão deve ser revisada pelo responsável.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5DEC9] bg-[#FAF8F5] px-6 flex flex-wrap gap-2 pt-3">
        {[
          { id: 'capacidade', label: '1. Capacidade Produtiva & Gargalos' },
          { id: 'plano_semanal', label: `2. Plano de Ação Semanal (${currentPlan.actions?.length || 0})` },
          {
            id: 'recomendacoes',
            label: `3. Recomendações Estruturadas (${
              officeData.recommendations?.length || officeData.strategyRecommendations?.length || 0
            })`,
          },
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

      {/* Conteúdo */}
      <div className="p-6">
        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Decisão estratégica gravada e distribuída às mesas dos agentes.
          </div>
        )}

        {/* ABA 1: CAPACIDADE & GARGALOS */}
        {activeTab === 'capacidade' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-xs font-bold text-[#6B6257] uppercase">Capacidade Nominal de Oficina</span>
                <p className="text-2xl font-bold font-mono text-[#181512] mt-1">{capacityHours} horas / semana</p>
                <p className="text-[11px] text-[#57534E] mt-1">2 postos de tapeçaria (40h x 2)</p>
              </div>

              <div className="p-5 rounded-xl bg-purple-50 border border-purple-200">
                <span className="text-xs font-bold text-purple-900 uppercase">Horas Comprometidas</span>
                <p className="text-2xl font-bold font-mono text-purple-900 mt-1">{plannedHours} horas alocadas</p>
                <div className="w-full bg-purple-200 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-purple-800 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                  />
                </div>
              </div>

              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 uppercase">Folga Operacional Segura</span>
                <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">
                  {Math.max(0, capacityHours - plannedHours)} horas livres
                </p>
                <p className="text-[11px] text-emerald-800 mt-1">Para imprevistos, correções e novos pedidos</p>
              </div>
            </div>

            {/* Diagnóstico de Gargalos Ativos */}
            <div className="p-5 rounded-xl border border-[#E5DEC9] bg-white space-y-4">
              <h3 className="font-bold text-sm text-[#181512] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Mapeamento de Gargalos Ativos na Produção
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {(officeData.activeBottlenecks || []).map((b: any) => (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border ${
                      b.impact === 'alto'
                        ? 'bg-red-50/60 border-red-200'
                        : b.impact === 'medio'
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-blue-50/60 border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-[#181512]">{b.stage}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.impact === 'alto'
                            ? 'bg-red-200 text-red-900'
                            : b.impact === 'medio'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-blue-200 text-blue-900'
                        }`}
                      >
                        Impacto {b.impact}
                      </span>
                    </div>
                    <p className="text-[#57534E] mt-2 leading-relaxed">{b.issue}</p>
                    <div className="mt-3 pt-2 border-t border-black/10 text-[11px]">
                      <strong className="text-[#181512]">Ação Mitigadora:</strong> {b.actionMitigation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: PLANO DE AÇÃO SEMANAL */}
        {activeTab === 'plano_semanal' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-sm text-[#181512]">{currentPlan.weekLabel}</h3>
                <p className="text-xs text-[#6B6257]">Tema central: {currentPlan.focusTheme}</p>
              </div>
              <span className="text-xs text-[#57534E] font-mono">
                Período: {currentPlan.startDate} a {currentPlan.endDate}
              </span>
            </div>

            {/* Formulário de Nova Ação */}
            <form onSubmit={handleAddActionPlanItem} className="p-4 rounded-xl border border-[#E5DEC9] bg-white space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#181512]">Adicionar Tarefa ao Plano Semanal</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={newActionTitle}
                    onChange={(e) => setNewActionTitle(e.target.value)}
                    placeholder="Descreva a meta ou ação operacional desta semana..."
                    className="w-full p-2 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
                <div>
                  <select
                    value={newActionResponsible}
                    onChange={(e) => setNewActionResponsible(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] bg-white"
                  >
                    <option value="Carla (Atendimento)">Carla (Atendimento)</option>
                    <option value="Pedro (Avaliação)">Pedro (Avaliação Técnica)</option>
                    <option value="Lucas (Projetos)">Lucas (Projetos & Fabricação)</option>
                    <option value="Ana (Compras)">Ana (Compras & Suprimentos)</option>
                    <option value="Mila (Financeiro)">Mila (Financeiro)</option>
                    <option value="Castro (Estratégia)">Castro (Estratégia)</option>
                  </select>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Incluir Ação
                  </button>
                </div>
              </div>
            </form>

            {/* Lista de Ações */}
            <div className="space-y-3">
              {(currentPlan.actions || []).map((act: any) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          act.priority === 'alta'
                            ? 'bg-red-500'
                            : act.priority === 'media'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <h4 className="font-semibold text-xs text-[#181512]">{act.title || act.action}</h4>
                    </div>
                    <p className="text-[11px] text-[#6B6257]">
                      Responsável: <strong>{act.responsibleAgent || act.responsible}</strong> | Prazo: {act.deadline}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        act.status === 'concluido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : act.status === 'em_andamento'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {(act.status || 'planejada').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 3: RECOMENDAÇÕES ESTRUTURADAS (7 CAMPOS OBRIGATÓRIOS) */}
        {activeTab === 'recomendacoes' && (
          <div className="space-y-4">
            <p className="text-xs text-[#6B6257]">
              Cada recomendação emitida pela mesa de estratégia contém os 7 pilares técnicos auditáveis: Situação,
              Dados, Ação, Responsável, Prazo, Indicador e Informações pendentes.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {(officeData.recommendations || officeData.strategyRecommendations || []).map((rec: any) => (
                <div key={rec.id} className="p-5 rounded-xl border border-[#E5DEC9] bg-white space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-[#EFECE6]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7138]">
                        Recomendação Estratégica {(rec.area || rec.category || 'Geral').toUpperCase()}
                      </span>
                      <h4 className="font-bold text-sm text-[#181512]">{rec.title}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={rec.status}
                        onChange={(e) => handleUpdateRecommendationStatus(rec.id, e.target.value as any)}
                        className="text-xs p-1.5 rounded border border-[#D6CFC5] bg-[#FAF8F5] font-semibold"
                      >
                        <option value="proposta">Proposta Pendente</option>
                        <option value="aprovada">Aprovada pelo Responsável</option>
                        <option value="em_execucao">Em Execução</option>
                        <option value="concluida">Concluída</option>
                      </select>
                    </div>
                  </div>

                  {/* 7 Pilares */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-1">
                      <strong className="text-[#181512] block">1. Situação Observada:</strong>
                      <p className="text-[#57534E]">{rec.situationObserved}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-1">
                      <strong className="text-[#181512] block">2. Dados que Sustentam a Análise:</strong>
                      <p className="text-[#57534E]">{rec.supportingData}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-1">
                      <strong className="text-emerald-950 block">3. Ação Proposta:</strong>
                      <p className="text-emerald-900 font-medium">{rec.proposedAction}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
                      <div>
                        <strong className="text-[#181512]">4. Responsável Sugerido:</strong>{' '}
                        <span className="text-[#57534E] font-medium">{rec.suggestedResponsible}</span>
                      </div>
                      <div>
                        <strong className="text-[#181512]">5. Prazo Proposto:</strong>{' '}
                        <span className="text-[#57534E] font-mono">{rec.proposedDeadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F9F6F0] border border-[#E5DEC9] flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div>
                      <strong className="text-[#181512]">6. Indicador (KPI) de Acompanhamento:</strong>{' '}
                      <span className="text-purple-800 font-semibold">{rec.kpiToTrack}</span>
                    </div>
                    {rec.missingInformation && (
                      <div className="text-amber-900">
                        <strong>7. Informações Pendentes:</strong> {rec.missingInformation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
