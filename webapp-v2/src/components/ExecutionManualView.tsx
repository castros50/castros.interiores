import React, { useState } from 'react';
import { FileText, Printer, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { AttendanceRecord, WorkshopSettings, ExecutionManual, ExecutionManualStep, BudgetLineItem } from '../types';
import { generateExecutionManualPdf } from '../utils/pdfGenerator';

interface ExecutionManualViewProps {
  order: AttendanceRecord;
  settings: WorkshopSettings;
  defaultResponsibleName?: string;
  onUpdateOrder: (updated: AttendanceRecord) => void;
}

interface ProductRef {
  id: string;
  label: string;
}

function listOrderProductsLocal(order: AttendanceRecord): ProductRef[] {
  const list: ProductRef[] = [{ id: 'primary', label: `${order.furnitureType} (${order.piecesCount})` }];
  for (const p of order.additionalProducts || []) {
    list.push({ id: p.id, label: `${p.description} (${p.quantity})` });
  }
  return list;
}

const STAGE_LABELS: Record<ExecutionManualStep['stage'], string> = {
  preparacao: 'Preparação',
  montagem: 'Montagem',
  estofamento: 'Estofamento',
  acabamento: 'Acabamento',
};

function emptyManualDraft(productId: string): Omit<ExecutionManual, 'id' | 'orderId' | 'version' | 'status' | 'createdAt'> {
  return {
    productId,
    coverResponsibles: [],
    views: [],
    explodedView: { available: false, note: 'Dados insuficientes para representar a vista explodida com precisão.' },
    partsList: [],
    cuttingPlanNote: 'Pendente de medição.',
    fabricGrainDirection: undefined,
    sewingInstructions: {},
    steps: [],
  };
}

export const ExecutionManualView: React.FC<ExecutionManualViewProps> = ({
  order,
  settings,
  defaultResponsibleName,
  onUpdateOrder,
}) => {
  const products = listOrderProductsLocal(order);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReturnType<typeof emptyManualDraft>>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const latestManualFor = (productId: string): ExecutionManual | undefined =>
    (order.executionManuals || [])
      .filter((m) => m.productId === productId)
      .sort((a, b) => b.version - a.version)[0];

  const startEditing = (productId: string) => {
    const existing = latestManualFor(productId);
    setDrafts((prev) => ({
      ...prev,
      [productId]:
        existing && existing.status === 'rascunho'
          ? {
              productId,
              coverResponsibles: existing.coverResponsibles,
              views: existing.views,
              explodedView: existing.explodedView,
              partsList: existing.partsList,
              cuttingPlanNote: existing.cuttingPlanNote,
              fabricGrainDirection: existing.fabricGrainDirection,
              sewingInstructions: existing.sewingInstructions,
              steps: existing.steps,
            }
          : prev[productId] || emptyManualDraft(productId),
    }));
    setEditingProductId(productId);
  };

  const updateDraft = (productId: string, patch: Partial<ReturnType<typeof emptyManualDraft>>) => {
    setDrafts((prev) => ({ ...prev, [productId]: { ...(prev[productId] || emptyManualDraft(productId)), ...patch } }));
  };

  const addPart = (productId: string) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    const newPart: BudgetLineItem = {
      id: `part-${Date.now()}`,
      category: 'Material',
      name: '',
      unit: 'un',
      quantity: null,
      quantityStatus: 'A levantar (requer medidas e plano de corte)',
      unitCostCents: null,
    };
    updateDraft(productId, { partsList: [...draft.partsList, newPart] });
  };
  const updatePart = (productId: string, idx: number, patch: Partial<BudgetLineItem>) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    const partsList = [...draft.partsList];
    partsList[idx] = { ...partsList[idx], ...patch };
    updateDraft(productId, { partsList });
  };
  const removePart = (productId: string, idx: number) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    updateDraft(productId, { partsList: draft.partsList.filter((_, i) => i !== idx) });
  };

  const addStep = (productId: string) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    const newStep: ExecutionManualStep = {
      stepNumber: draft.steps.length + 1,
      stage: 'preparacao',
      title: '',
      description: '',
      isIllustrative: false,
      inspectionPoints: [],
    };
    updateDraft(productId, { steps: [...draft.steps, newStep] });
  };
  const updateStep = (productId: string, idx: number, patch: Partial<ExecutionManualStep>) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    const steps = [...draft.steps];
    steps[idx] = { ...steps[idx], ...patch };
    updateDraft(productId, { steps });
  };
  const removeStep = (productId: string, idx: number) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    const steps = draft.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    updateDraft(productId, { steps });
  };

  const handleSaveDraft = async (productId: string) => {
    const draft = drafts[productId] || emptyManualDraft(productId);
    setIsSaving(productId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/execution-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao salvar manual de execução.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao salvar manual.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleApprove = async (manual: ExecutionManual) => {
    if (!defaultResponsibleName?.trim()) {
      setError('Configure o nome do responsável técnico padrão para aprovar manuais.');
      return;
    }
    setIsSaving(manual.productId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/execution-manual/${manual.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: defaultResponsibleName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao aprovar manual de execução.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao aprovar manual.');
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6B6257]">
        Manual de execução (montagem/costura) a partir da ficha técnica validada. Nasce rascunho — só vira
        aprovado por ação explícita do responsável técnico. Dados ausentes ficam pendentes, nunca inventados.
      </p>

      {products.map((p) => {
        const manual = latestManualFor(p.id);
        const draft = drafts[p.id];
        const productPhotos = (order.photos || []).filter((ph) =>
          p.id === 'primary' ? !ph.productId : ph.productId === p.id
        );
        return (
          <div key={p.id} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-xs text-[#181512]">{p.label}</h4>
                {manual && (
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      manual.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    v{manual.version} — {manual.status === 'aprovado' ? 'Aprovado' : 'Rascunho'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {manual && (
                  <button
                    type="button"
                    onClick={() => generateExecutionManualPdf(order, manual, settings)}
                    className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" /> PDF A4
                  </button>
                )}
                {manual?.status === 'aprovado' ? (
                  <button
                    type="button"
                    onClick={() => startEditing(p.id)}
                    className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512]"
                  >
                    Nova revisão
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(p.id)}
                    className="px-2.5 py-1.5 rounded bg-[#9A7138] hover:bg-[#845E2B] text-white text-[10px] font-semibold flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" /> {manual ? 'Editar rascunho' : 'Criar Manual de Execução'}
                  </button>
                )}
                {manual?.status === 'rascunho' && (
                  <button
                    type="button"
                    onClick={() => handleApprove(manual)}
                    disabled={isSaving === p.id}
                    className="px-2.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Aprovar
                  </button>
                )}
              </div>
            </div>

            {editingProductId === p.id && draft && (
              <div className="space-y-3 pt-2 border-t border-[#EFECE6]">
                <input
                  placeholder="Responsáveis (separados por vírgula)"
                  value={draft.coverResponsibles.join(', ')}
                  onChange={(e) => updateDraft(p.id, { coverResponsibles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
                />

                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#6B6257] mb-1">Vistas do produto</p>
                  {draft.views.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto_28px] gap-1.5 items-center mb-1">
                      <input
                        placeholder="Rótulo (ex: Vista frontal)"
                        value={v.label}
                        onChange={(e) => {
                          const views = [...draft.views];
                          views[idx] = { ...views[idx], label: e.target.value };
                          updateDraft(p.id, { views });
                        }}
                        className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                      />
                      <select
                        value={v.photoId || ''}
                        onChange={(e) => {
                          const views = [...draft.views];
                          views[idx] = { ...views[idx], photoId: e.target.value || undefined };
                          updateDraft(p.id, { views });
                        }}
                        className="p-1.5 rounded border border-[#D6CFC5] text-[10px] bg-white"
                      >
                        <option value="">Sem foto</option>
                        {productPhotos.map((ph) => (
                          <option key={ph.id} value={ph.id}>{ph.code} — {ph.caption || ph.category}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-[9px] text-[#57534E]">
                        <input
                          type="checkbox"
                          checked={v.isIllustrative}
                          onChange={(e) => {
                            const views = [...draft.views];
                            views[idx] = { ...views[idx], isIllustrative: e.target.checked };
                            updateDraft(p.id, { views });
                          }}
                        />
                        Ilustrativo
                      </label>
                      <button type="button" onClick={() => updateDraft(p.id, { views: draft.views.filter((_, i) => i !== idx) })} className="p-1 text-[#6B6257] hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateDraft(p.id, { views: [...draft.views, { label: '', isIllustrative: false }] })}
                    className="text-[10px] font-semibold text-[#9A7138] underline"
                  >
                    + Adicionar vista
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-[10px] text-[#57534E]">
                  <input
                    type="checkbox"
                    checked={draft.explodedView?.available || false}
                    onChange={(e) =>
                      updateDraft(p.id, {
                        explodedView: {
                          available: e.target.checked,
                          note: e.target.checked ? 'Vista explodida disponível a partir dos componentes cadastrados.' : 'Dados insuficientes para representar a vista explodida com precisão.',
                        },
                      })
                    }
                  />
                  Há dados suficientes para a vista explodida
                </label>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#6B6257] mb-1">Lista de peças e materiais</p>
                  {draft.partsList.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_60px_28px] gap-1.5 mb-1">
                      <input
                        placeholder="Nome"
                        value={item.name}
                        onChange={(e) => updatePart(p.id, idx, { name: e.target.value })}
                        className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                      />
                      <input
                        type="number"
                        placeholder="Qtd"
                        value={item.quantity ?? ''}
                        onChange={(e) => updatePart(p.id, idx, { quantity: e.target.value === '' ? null : parseFloat(e.target.value) })}
                        className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                      />
                      <input
                        placeholder="un"
                        value={item.unit}
                        onChange={(e) => updatePart(p.id, idx, { unit: e.target.value })}
                        className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                      />
                      <button type="button" onClick={() => removePart(p.id, idx)} className="p-1 text-[#6B6257] hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addPart(p.id)} className="text-[10px] font-semibold text-[#9A7138] underline">
                    + Adicionar peça/material
                  </button>
                </div>

                <textarea
                  placeholder="Plano de corte (estrutura, espuma, revestimento) — deixe em branco se pendente"
                  value={draft.cuttingPlanNote}
                  onChange={(e) => updateDraft(p.id, { cuttingPlanNote: e.target.value })}
                  rows={2}
                  className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
                />
                <select
                  value={draft.fabricGrainDirection || ''}
                  onChange={(e) => updateDraft(p.id, { fabricGrainDirection: (e.target.value || undefined) as any })}
                  className="w-full p-2 rounded border border-[#D6CFC5] text-xs bg-white"
                >
                  <option value="">Sentido da estampa/fio — pendente de definição</option>
                  <option value="Vertical">Vertical</option>
                  <option value="Horizontal">Horizontal</option>
                  <option value="Indiferente">Indiferente</option>
                </select>

                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    placeholder="Tipo de costura/acabamento"
                    value={draft.sewingInstructions.seamType || ''}
                    onChange={(e) => updateDraft(p.id, { sewingInstructions: { ...draft.sewingInstructions, seamType: e.target.value } })}
                    className="p-2 rounded border border-[#D6CFC5] text-xs"
                  />
                  <input
                    placeholder="Linha"
                    value={draft.sewingInstructions.thread || ''}
                    onChange={(e) => updateDraft(p.id, { sewingInstructions: { ...draft.sewingInstructions, thread: e.target.value } })}
                    className="p-2 rounded border border-[#D6CFC5] text-xs"
                  />
                  <input
                    placeholder="Ponto"
                    value={draft.sewingInstructions.stitch || ''}
                    onChange={(e) => updateDraft(p.id, { sewingInstructions: { ...draft.sewingInstructions, stitch: e.target.value } })}
                    className="p-2 rounded border border-[#D6CFC5] text-xs"
                  />
                  <input
                    placeholder="Margens"
                    value={draft.sewingInstructions.marginsNote || ''}
                    onChange={(e) => updateDraft(p.id, { sewingInstructions: { ...draft.sewingInstructions, marginsNote: e.target.value } })}
                    className="p-2 rounded border border-[#D6CFC5] text-xs"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase text-[#6B6257] mb-1">Sequência de execução</p>
                  {draft.steps.map((step, idx) => (
                    <div key={idx} className="p-2 rounded bg-white border border-[#EFECE6] space-y-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#181512]">{step.stepNumber}.</span>
                        <select
                          value={step.stage}
                          onChange={(e) => updateStep(p.id, idx, { stage: e.target.value as ExecutionManualStep['stage'] })}
                          className="p-1 rounded border border-[#D6CFC5] text-[10px] bg-white"
                        >
                          {(Object.keys(STAGE_LABELS) as ExecutionManualStep['stage'][]).map((s) => (
                            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Título"
                          value={step.title}
                          onChange={(e) => updateStep(p.id, idx, { title: e.target.value })}
                          className="flex-1 p-1 rounded border border-[#D6CFC5] text-[10px]"
                        />
                        <label className="flex items-center gap-1 text-[9px] text-[#57534E]">
                          <input type="checkbox" checked={step.isIllustrative} onChange={(e) => updateStep(p.id, idx, { isIllustrative: e.target.checked })} />
                          Ilustrativo
                        </label>
                        <button type="button" onClick={() => removeStep(p.id, idx)} className="p-1 text-[#6B6257] hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea
                        placeholder="Descrição"
                        value={step.description}
                        onChange={(e) => updateStep(p.id, idx, { description: e.target.value })}
                        rows={2}
                        className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                      />
                      <input
                        placeholder="Pontos de inspeção (separados por vírgula)"
                        value={step.inspectionPoints.join(', ')}
                        onChange={(e) => updateStep(p.id, idx, { inspectionPoints: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                      />
                    </div>
                  ))}
                  <button type="button" onClick={() => addStep(p.id)} className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar etapa
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveDraft(p.id)}
                  disabled={isSaving === p.id}
                  className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {isSaving === p.id ? 'Salvando...' : 'Salvar Rascunho do Manual'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <p className="text-xs text-red-700 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
};
