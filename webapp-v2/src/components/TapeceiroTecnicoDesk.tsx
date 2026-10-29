import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Download,
  Send,
  Clock,
} from 'lucide-react';
import {
  AttendanceRecord,
  WorkshopSettings,
  ManufacturingComponent,
  ManufacturingMaterialRequirement,
  AssemblyManualStep,
} from '../types';
import { AgentPortrait } from './AgentPortrait';
import {
  generateShoppingListPdf,
  generateManufacturingInternalPdf,
} from '../utils/pdfGenerator';

interface TapeceiroTecnicoDeskProps {
  order: AttendanceRecord;
  settings: WorkshopSettings;
  onUpdateOrder: (updated: AttendanceRecord) => void;
}

const PLAN_STATUS_STYLE: Record<string, string> = {
  'Rascunho': 'bg-stone-100 text-stone-800 border-stone-300',
  'Pendente de medição': 'bg-amber-100 text-amber-900 border-amber-400',
  'Em revisão': 'bg-blue-100 text-blue-900 border-blue-400',
  'Liberado pelo responsável': 'bg-emerald-100 text-emerald-900 border-emerald-400',
};

export const TapeceiroTecnicoDesk: React.FC<TapeceiroTecnicoDeskProps> = ({
  order,
  settings,
  onUpdateOrder,
}) => {
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingList, setPendingList] = useState<{ materials: string[]; components: string[] } | null>(null);
  const [reviewerName, setReviewerName] = useState(order.reviewerName || '');
  const [activeTab, setActiveTab] = useState<'pecas' | 'materiais' | 'montagem'>('pecas');

  const plan = order.manufacturingData;
  const components = plan?.components || [];
  const materials = plan?.materialRequirements || plan?.materials || [];
  const assemblySteps = plan?.assemblyManual?.steps || [];
  const planStatus = plan?.planStatus;
  const isLiberado = planStatus === 'Liberado pelo responsável';

  const canPrepare =
    order.orderType === 'Fabricação'
      ? !!plan && (plan.components?.length || 0) > 0
      : !!order.selectedProposalTier &&
        !!(order.materialsLists && order.materialsLists.length > 0) &&
        order.materialsLists[order.materialsLists.length - 1].proposalTier === order.selectedProposalTier;

  const persistPlan = async (updatedPlan: typeof plan, actionLabel: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          manufacturingData: updatedPlan,
          actorLabel: 'Tapeceiro Técnico',
          stageLabel: actionLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Não foi possível salvar o plano técnico.');
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o plano técnico.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrepare = async () => {
    setIsPreparing(true);
    setError(null);
    setPendingList(null);
    try {
      const res = await fetch(`/api/attendances/${order.id}/technical-plan/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName: 'Tapeceiro Técnico' }),
      });
      const data = await res.json();
      if (!res.ok || !data.attendance) {
        throw new Error(data.error || 'Não foi possível preparar o plano técnico.');
      }
      onUpdateOrder(data.attendance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao preparar o plano técnico.');
    } finally {
      setIsPreparing(false);
    }
  };

  const handleRelease = async () => {
    if (!reviewerName.trim()) {
      setError('Informe o nome do responsável pela revisão antes de liberar.');
      return;
    }
    setIsReleasing(true);
    setError(null);
    setPendingList(null);
    try {
      const res = await fetch(`/api/attendances/${order.id}/technical-plan/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.pendingMaterials || data.pendingComponents) {
          setPendingList({ materials: data.pendingMaterials || [], components: data.pendingComponents || [] });
        }
        throw new Error(data.error || 'Não foi possível liberar o plano técnico.');
      }
      onUpdateOrder(data.attendance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao liberar o plano técnico.');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleSetStatus = (status: 'Em revisão') => {
    if (!plan) return;
    persistPlan({ ...plan, planStatus: status }, 'Status do plano técnico atualizado');
  };

  const handleUpdateComponent = (id: string, updates: Partial<ManufacturingComponent>) => {
    if (!plan) return;
    const updated = components.map((c) => (c.id === id ? { ...c, ...updates } : c));
    persistPlan({ ...plan, components: updated }, 'Peça do plano técnico ajustada');
  };

  const handleRemoveComponent = (id: string) => {
    if (!plan) return;
    persistPlan({ ...plan, components: components.filter((c) => c.id !== id) }, 'Peça removida do plano técnico');
  };

  const handleAddComponent = () => {
    if (!plan) return;
    const newComponent: ManufacturingComponent = {
      id: `comp-manual-${Date.now()}`,
      code: `P-${String(components.length + 1).padStart(2, '0')}`,
      name: 'Nova peça (preencher)',
      componentType: 'Acessório',
      dimensionsMm: { length: null, width: null, thickness: null },
      specification: '',
      quantityPerUnit: 1,
      totalQuantity: 1,
      source: 'proposta_pendente',
      notes: 'Incluída manualmente pelo tapeceiro.',
    };
    persistPlan({ ...plan, components: [...components, newComponent] }, 'Peça incluída manualmente no plano técnico');
  };

  const handleUpdateMaterial = (id: string, updates: Partial<ManufacturingMaterialRequirement>) => {
    if (!plan) return;
    const updated = materials.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m, ...updates };
      const qty = next.toPurchaseQuantity ?? next.totalRequired ?? next.totalOrderRequirement;
      next.totalCostCents =
        next.unitCostCents != null && qty != null ? Math.round(next.unitCostCents * qty) : undefined;
      return next;
    });
    persistPlan(
      { ...plan, materialRequirements: updated, materials: updated },
      'Material do plano técnico ajustado'
    );
  };

  const handleRemoveMaterial = (id: string) => {
    if (!plan) return;
    const updated = materials.filter((m) => m.id !== id);
    persistPlan({ ...plan, materialRequirements: updated, materials: updated }, 'Material removido do plano técnico');
  };

  const handleAddAssemblyStep = () => {
    if (!plan) return;
    const newStep: AssemblyManualStep = {
      stepNumber: assemblySteps.length + 1,
      title: 'Nova etapa (preencher)',
      description: '',
      piecesUsed: [],
      toolsRequired: [],
      sequenceOrder: assemblySteps.length + 1,
      pointsOfAttention: [],
      qualityCheckCriteria: '',
      hasUncertainties: true,
      uncertaintyNotes: 'Etapa incluída manualmente, ainda não validada na oficina.',
    };
    persistPlan(
      {
        ...plan,
        assemblyManual: { ...plan.assemblyManual, steps: [...assemblySteps, newStep] },
      },
      'Etapa de montagem incluída'
    );
  };

  const handleUpdateAssemblyStep = (stepNumber: number, updates: Partial<AssemblyManualStep>) => {
    if (!plan) return;
    const updated = assemblySteps.map((s) => (s.stepNumber === stepNumber ? { ...s, ...updates } : s));
    persistPlan({ ...plan, assemblyManual: { ...plan.assemblyManual, steps: updated } }, 'Etapa de montagem ajustada');
  };

  const handleRemoveAssemblyStep = (stepNumber: number) => {
    if (!plan) return;
    const updated = assemblySteps.filter((s) => s.stepNumber !== stepNumber);
    persistPlan({ ...plan, assemblyManual: { ...plan.assemblyManual, steps: updated } }, 'Etapa de montagem removida');
  };

  const handleSendToPurchasing = async () => {
    if (!plan) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          fromDesk: 'tapeceiro_tecnico',
          toDesk: 'ana_compras',
          reason: 'Lista de materiais do plano técnico liberada para compra',
          completedSummary: `Plano técnico ${plan.version} liberado, com ${materials.length} material(is) a conferir.`,
          pendingItems: [],
          nextActionExpected: 'Cotar e confirmar compra dos materiais listados.',
          documentVersion: plan.version,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Não foi possível encaminhar para Compras.');
      }
      await persistPlan(
        {
          ...data.order.manufacturingData,
          purchasingHandoffStatus: 'Encaminhado para Compras',
          purchasingHandoffAt: new Date().toISOString(),
        },
        'Lista encaminhada para Compras'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao encaminhar para Compras.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintShoppingList = () => {
    if (!plan) return;
    const items = materials.map((m) => ({
      id: m.id,
      component: m.category || 'Material',
      materialName: m.materialName || m.name || 'Material não identificado',
      specification: m.specification,
      justification: 'Item do plano técnico do Tapeceiro.',
      componentStatus: 'Pendente de inspeção' as const,
      unit: m.unit || 'un',
      consumptionQuantity: m.totalRequired ?? m.totalOrderRequirement ?? null,
      purchaseUnit: m.purchaseUnit,
      purchaseQuantity: m.toPurchaseQuantity ?? null,
      lossMarginPercent: m.scrapLossPercentage,
      quantitySource: m.source,
      quantityStatus:
        m.toPurchaseQuantity != null ? ('Confirmada' as const) : ('Pendente de medição' as const),
      unitCostCents: m.unitCostCents ?? null,
      priceStatus: m.unitCostCents != null ? ('Confirmado' as const) : ('A cotar' as const),
      notes: m.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
    generateShoppingListPdf(
      order,
      {
        id: `techplan-${order.id}`,
        attendanceId: order.id,
        attendanceNumber: order.attendanceNumber,
        clientName: order.clientName,
        furnitureType: order.furnitureType,
        proposalTier: order.selectedProposalTier,
        listCode: `${order.attendanceNumber}-TAP-${plan.version}`,
        revision: parseInt(plan.version.split('.')[1] || '0', 10) + 1,
        status: 'Lista em preparação',
        items,
        preparedByName: plan.planPreparedByName,
        preparedAt: plan.planPreparedAt || order.updatedAt,
        updatedAt: order.updatedAt,
      },
      settings,
      plan.planPreparedByName
    );
  };

  const handlePrintProductionSheet = () => {
    generateManufacturingInternalPdf(order, settings);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden">
      <div className="bg-[#181512] text-[#F9F6F0] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AgentPortrait
              deskId="tapeceiro_tecnico"
              name="Tapeceiro Técnico"
              portraitUpdatedAt={settings.agentPortraitUpdatedAt?.tapeceiro_tecnico}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#E5DEC9] border border-[#57534E]">
                  Mesa 9 — Planejamento de Produção e Materiais
                </span>
                <span className="text-xs text-[#E5DEC9]">
                  Responsável: <strong>Tapeceiro Técnico</strong>
                </span>
                {planStatus && (
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${PLAN_STATUS_STYLE[planStatus] || ''}`}
                  >
                    {planStatus}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif-display font-bold text-white mt-1">
                Plano Técnico — {order.furnitureType}
              </h2>
              <p className="text-xs text-[#D6CFC5] mt-0.5">
                Pedido: <strong>{order.attendanceNumber}</strong> | Cliente:{' '}
                <strong>{order.clientName}</strong> | Tipo: <strong>{order.orderType}</strong>
                {plan?.version && (
                  <>
                    {' '}| Revisão: <strong>{plan.version}</strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrepare}
              disabled={isPreparing || !canPrepare}
              title={
                !canPrepare
                  ? order.orderType === 'Fabricação'
                    ? 'Lucas ainda não preparou a ficha técnica deste projeto.'
                    : 'Prepare a lista de materiais com o Pedro antes.'
                  : undefined
              }
              className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              {isPreparing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {plan ? 'Atualizar Plano Técnico' : 'Preparar Plano Técnico'}
            </button>
          </div>
        </div>
      </div>

      {!plan ? (
        <div className="p-6 text-xs text-[#57534E] space-y-2">
          <p>
            Nenhum plano técnico preparado ainda para este atendimento.{' '}
            {order.orderType === 'Fabricação'
              ? 'Ele será montado a partir da ficha técnica já revisada pelo Lucas (Projetos e Fabricação).'
              : 'Ele será montado a partir da avaliação de reaproveitamento e da lista de materiais já revisadas pelo Pedro (Avaliação Técnica).'}
          </p>
          {!canPrepare && (
            <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {order.orderType === 'Fabricação'
                ? 'A ficha técnica do Lucas ainda não tem componentes cadastrados.'
                : 'Escolha a proposta e prepare a lista de materiais com o Pedro antes de continuar aqui.'}
            </p>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
              <p className="font-semibold">{error}</p>
              {pendingList && (pendingList.materials.length > 0 || pendingList.components.length > 0) && (
                <ul className="list-disc pl-4 space-y-0.5">
                  {pendingList.components.map((c) => (
                    <li key={c}>Peça pendente de medição: {c}</li>
                  ))}
                  {pendingList.materials.map((m) => (
                    <li key={m}>Material pendente de quantidade: {m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-b border-[#EFECE6] pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('pecas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === 'pecas' ? 'bg-[#181512] text-white' : 'bg-[#F3EFE6] text-[#57534E]'
              }`}
            >
              Peças ({components.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('materiais')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === 'materiais' ? 'bg-[#181512] text-white' : 'bg-[#F3EFE6] text-[#57534E]'
              }`}
            >
              Materiais ({materials.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('montagem')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === 'montagem' ? 'bg-[#181512] text-white' : 'bg-[#F3EFE6] text-[#57534E]'
              }`}
            >
              Montagem ({assemblySteps.length})
            </button>
            {isSaving && (
              <span className="ml-auto text-[11px] text-[#6B6257] flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Salvando...
              </span>
            )}
          </div>

          {activeTab === 'pecas' && (
            <div className="space-y-3">
              <div className="overflow-x-auto bg-white border border-[#E5DEC9] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#181512] text-[#F9F6F0]">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Peça</th>
                      <th className="py-2 px-3">Tipo</th>
                      {order.orderType === 'Reforma' && <th className="py-2 px-3">Situação</th>}
                      <th className="py-2 px-3">Dim. Acabada (mm)</th>
                      <th className="py-2 px-3">Dim. de Corte (mm)</th>
                      <th className="py-2 px-3">Qtd.</th>
                      <th className="py-2 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {components.map((c) => (
                      <tr key={c.id} className="hover:bg-[#FAF7F2] align-top">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={c.code}
                            onChange={(e) => handleUpdateComponent(c.id, { code: e.target.value })}
                            className="w-16 rounded border border-[#E5DEC9] px-1.5 py-1 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-3 space-y-1">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => handleUpdateComponent(c.id, { name: e.target.value })}
                            className="w-40 rounded border border-[#E5DEC9] px-1.5 py-1 text-xs"
                          />
                          <p className="text-[10px] text-[#6B6257]">{c.specification}</p>
                          {c.notes && <p className="text-[10px] text-amber-800">{c.notes}</p>}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={c.componentType}
                            onChange={(e) =>
                              handleUpdateComponent(c.id, {
                                componentType: e.target.value as ManufacturingComponent['componentType'],
                              })
                            }
                            className="rounded border border-[#D6CFC5] bg-white px-1.5 py-1 text-xs"
                          >
                            <option value="Madeira">Madeira</option>
                            <option value="Espuma">Espuma</option>
                            <option value="Revestimento">Revestimento</option>
                            <option value="Ferragem">Ferragem</option>
                            <option value="Sustentação">Sustentação</option>
                            <option value="Acessório">Acessório</option>
                          </select>
                        </td>
                        {order.orderType === 'Reforma' && (
                          <td className="py-2 px-3">
                            <select
                              value={c.reformStatus || 'Aguardar desmontagem'}
                              onChange={(e) =>
                                handleUpdateComponent(c.id, {
                                  reformStatus: e.target.value as ManufacturingComponent['reformStatus'],
                                })
                              }
                              className="rounded border border-[#D6CFC5] bg-white px-1.5 py-1 text-xs"
                            >
                              <option value="Recuperar">Recuperar</option>
                              <option value="Substituir">Substituir</option>
                              <option value="Aguardar desmontagem">Aguardar desmontagem</option>
                            </select>
                          </td>
                        )}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            {(['length', 'width', 'thickness'] as const).map((dim) => (
                              <input
                                key={dim}
                                type="number"
                                placeholder={dim === 'length' ? 'C' : dim === 'width' ? 'L' : 'E'}
                                value={c.dimensionsMm[dim] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                  handleUpdateComponent(c.id, {
                                    dimensionsMm: { ...c.dimensionsMm, [dim]: val },
                                  });
                                }}
                                className="w-14 rounded border border-[#D6CFC5] px-1 py-1 text-xs tabular-nums"
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            {(['length', 'width', 'thickness'] as const).map((dim) => (
                              <input
                                key={dim}
                                type="number"
                                placeholder={dim === 'length' ? 'C' : dim === 'width' ? 'L' : 'E'}
                                value={c.cutDimensionsMm?.[dim] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                  handleUpdateComponent(c.id, {
                                    cutDimensionsMm: {
                                      length: c.cutDimensionsMm?.length ?? null,
                                      width: c.cutDimensionsMm?.width ?? null,
                                      thickness: c.cutDimensionsMm?.thickness ?? null,
                                      [dim]: val,
                                    },
                                  });
                                }}
                                className="w-14 rounded border border-[#D6CFC5] px-1 py-1 text-xs tabular-nums"
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={c.totalQuantity}
                            onChange={(e) =>
                              handleUpdateComponent(c.id, { totalQuantity: parseFloat(e.target.value) || 0 })
                            }
                            className="w-14 text-right rounded border border-[#D6CFC5] px-1.5 py-1 text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button type="button" onClick={() => handleRemoveComponent(c.id)} className="text-red-700 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {components.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-4 px-3 text-center text-[#6B6257]">
                          Nenhuma peça cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={handleAddComponent}
                className="px-3 py-1.5 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Incluir Peça Manualmente
              </button>
              <p className="text-[11px] text-[#6B6257]">
                Dimensão acabada = tamanho final da peça. Dimensão de corte = tamanho a cortar, já com margens de costura/dobra/fixação incluídas separadamente.
              </p>
            </div>
          )}

          {activeTab === 'materiais' && (
            <div className="space-y-3">
              <div className="overflow-x-auto bg-white border border-[#E5DEC9] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#181512] text-[#F9F6F0]">
                      <th className="py-2 px-3">Material</th>
                      <th className="py-2 px-3 text-right">Consumo Previsto</th>
                      <th className="py-2 px-3 text-right">Estoque</th>
                      <th className="py-2 px-3 text-right">A Comprar</th>
                      <th className="py-2 px-3">Unid.</th>
                      <th className="py-2 px-3 text-right">Preço Unit.</th>
                      <th className="py-2 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {materials.map((m) => (
                      <tr key={m.id} className="hover:bg-[#FAF7F2] align-top">
                        <td className="py-2 px-3 space-y-1">
                          <input
                            type="text"
                            value={m.materialName || m.name || ''}
                            onChange={(e) => handleUpdateMaterial(m.id, { materialName: e.target.value, name: e.target.value })}
                            className="w-44 rounded border border-[#E5DEC9] px-1.5 py-1 text-xs"
                          />
                          {m.specification && <p className="text-[10px] text-[#6B6257]">{m.specification}</p>}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {m.totalRequired == null && m.totalOrderRequirement == null ? (
                            <span className="text-amber-800 font-medium">pendente</span>
                          ) : (
                            <input
                              type="number"
                              value={m.totalRequired ?? m.totalOrderRequirement ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                handleUpdateMaterial(m.id, { totalRequired: val, totalOrderRequirement: val });
                              }}
                              className="w-20 text-right rounded border border-[#D6CFC5] px-1.5 py-1 text-xs tabular-nums"
                            />
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={m.availableStock ?? ''}
                            placeholder="—"
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                              handleUpdateMaterial(m.id, { availableStock: val });
                            }}
                            className="w-16 text-right rounded border border-[#D6CFC5] px-1.5 py-1 text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          {m.toPurchaseQuantity == null ? (
                            <span className="text-amber-800 font-medium">pendente</span>
                          ) : (
                            <input
                              type="number"
                              value={m.toPurchaseQuantity}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                handleUpdateMaterial(m.id, { toPurchaseQuantity: val });
                              }}
                              className="w-20 text-right rounded border border-[#D6CFC5] px-1.5 py-1 text-xs tabular-nums"
                            />
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={m.unit || ''}
                            onChange={(e) => handleUpdateMaterial(m.id, { unit: e.target.value })}
                            className="w-14 rounded border border-[#E5DEC9] px-1.5 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          {m.unitCostCents == null ? (
                            <span className="text-amber-800 font-medium">a cotar</span>
                          ) : (
                            <input
                              type="number"
                              value={(m.unitCostCents / 100).toFixed(2)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleUpdateMaterial(m.id, {
                                  unitCostCents: Number.isNaN(val) ? undefined : Math.round(val * 100),
                                });
                              }}
                              className="w-20 text-right rounded border border-[#D6CFC5] px-1.5 py-1 text-xs tabular-nums"
                            />
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button type="button" onClick={() => handleRemoveMaterial(m.id)} className="text-red-700 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {materials.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 px-3 text-center text-[#6B6257]">
                          Nenhum material cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#6B6257]">
                Perda/margem comercial já embutida no cálculo de origem (Pedro ou Lucas) — não é aplicada de novo aqui.
              </p>
            </div>
          )}

          {activeTab === 'montagem' && (
            <div className="space-y-3">
              {assemblySteps.map((step) => (
                <div key={step.stepNumber} className="p-3 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#9A7138]">Etapa {step.stepNumber}</span>
                    <button type="button" onClick={() => handleRemoveAssemblyStep(step.stepNumber)} className="text-red-700 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => handleUpdateAssemblyStep(step.stepNumber, { title: e.target.value })}
                    className="w-full rounded border border-[#E5DEC9] px-2 py-1 text-xs font-semibold"
                    placeholder="Título da etapa"
                  />
                  <textarea
                    value={step.description}
                    onChange={(e) => handleUpdateAssemblyStep(step.stepNumber, { description: e.target.value })}
                    className="w-full rounded border border-[#E5DEC9] px-2 py-1 text-xs"
                    rows={2}
                    placeholder="Descrição do que fazer nesta etapa"
                  />
                  {step.hasUncertainties && (
                    <p className="text-[11px] text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {step.uncertaintyNotes || 'Etapa ainda não validada na oficina.'}
                    </p>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAssemblyStep}
                className="px-3 py-1.5 rounded-lg border border-[#D6CFC5] text-xs font-medium text-[#1C1917] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Incluir Etapa de Montagem
              </button>
              <p className="text-[11px] text-[#6B6257] bg-[#F3EFE6] rounded-lg px-3 py-2">
                Desenho esquemático: ainda não disponível nesta fase (não usar nenhuma imagem como molde). Mapa visual de corte: {plan.cuttingPlanStatus || 'Pendente de mapa visual'}.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#EFECE6] space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintShoppingList}
                className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] text-xs font-semibold text-[#1C1917] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Lista de Compras (PDF A4)
              </button>
              <button
                type="button"
                onClick={handlePrintProductionSheet}
                className="px-3.5 py-2 rounded-lg border border-[#D6CFC5] text-xs font-semibold text-[#1C1917] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Ficha de Produção (PDF A4)
              </button>
              <button
                type="button"
                onClick={handleSendToPurchasing}
                disabled={isSaving || !isLiberado}
                title={!isLiberado ? 'Libere o plano antes de encaminhar para Compras.' : undefined}
                className="px-3.5 py-2 rounded-lg bg-[#1F5E3B] hover:bg-[#184B2F] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Encaminhar para Compras
              </button>
              {plan.purchasingHandoffStatus === 'Encaminhado para Compras' && (
                <span className="text-[11px] text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Encaminhado em{' '}
                  {plan.purchasingHandoffAt ? new Date(plan.purchasingHandoffAt).toLocaleDateString('pt-BR') : ''}
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#6B6257] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Financeiro: {plan.financialHandoffStatus || 'Aguardando integração financeira'} — nenhum envio ou baixa é simulado enquanto a integração com a Mila não existir.
            </p>

            {!isLiberado && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#F3EFE6] border border-[#E5DEC9]">
                {planStatus !== 'Em revisão' && (
                  <button
                    type="button"
                    onClick={() => handleSetStatus('Em revisão')}
                    className="px-3 py-1.5 rounded-lg border border-[#9A7138] text-xs font-semibold text-[#845E2B]"
                  >
                    Marcar como Em Revisão
                  </button>
                )}
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Nome do responsável pela revisão"
                  className="rounded-lg border border-[#D6CFC5] px-2.5 py-1.5 text-xs flex-1 min-w-[180px]"
                />
                <button
                  type="button"
                  onClick={handleRelease}
                  disabled={isReleasing}
                  className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {isReleasing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Liberar Plano para Execução
                </button>
              </div>
            )}
            {isLiberado && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                Liberado por <strong>{plan.planLiberatedByName}</strong> em{' '}
                {plan.planLiberatedAt ? new Date(plan.planLiberatedAt).toLocaleDateString('pt-BR') : ''}.
              </p>
            )}

            {order.technicalPlanRevisions && order.technicalPlanRevisions.length > 0 && (
              <div className="text-[11px] text-[#6B6257]">
                <p className="font-semibold text-[#181512] mb-1">Revisões anteriores preservadas:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {order.technicalPlanRevisions.map((rev, idx) => (
                    <li key={idx}>
                      {rev.version} — liberado por {rev.planLiberatedByName || 'não liberado'} em{' '}
                      {rev.planLiberatedAt ? new Date(rev.planLiberatedAt).toLocaleDateString('pt-BR') : '—'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
