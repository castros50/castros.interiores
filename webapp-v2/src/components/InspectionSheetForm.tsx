import React, { useState } from 'react';
import { FileText, Printer, Upload, Check, AlertCircle } from 'lucide-react';
import {
  AttendanceRecord,
  WorkshopSettings,
  InspectionSheet,
  InspectionComponentEntry,
  ManufacturingInspectionEntry,
  InspectionMarking,
  INSPECTION_COMPONENT_LABELS,
  INSPECTION_MARKING_LABELS,
  ChecklistFieldReadStatus,
} from '../types';
import { generateInspectionSheetPdf } from '../utils/pdfGenerator';

interface InspectionSheetFormProps {
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

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MARKING_ORDER: InspectionMarking[] = [
  'bom', 'reparar', 'substituir', 'reaproveitar', 'nao_verificado', 'nao_se_aplica',
];

const READ_STATUS_STYLES: Record<ChecklistFieldReadStatus, string> = {
  lido: 'bg-emerald-100 text-emerald-800',
  ilegivel: 'bg-amber-100 text-amber-800',
  ausente: 'bg-stone-100 text-stone-600',
};
const READ_STATUS_LABELS: Record<ChecklistFieldReadStatus, string> = {
  lido: 'Lido',
  ilegivel: 'Ilegível',
  ausente: 'Ausente',
};

export const InspectionSheetForm: React.FC<InspectionSheetFormProps> = ({
  order,
  settings,
  defaultResponsibleName,
  onUpdateOrder,
}) => {
  const products = listOrderProductsLocal(order);
  const [unitsCountByProduct, setUnitsCountByProduct] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(null);
  const [draftComponents, setDraftComponents] = useState<Record<string, InspectionComponentEntry[]>>({});
  const [draftManufChecks, setDraftManufChecks] = useState<Record<string, ManufacturingInspectionEntry[]>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [acceptedFields, setAcceptedFields] = useState<Record<string, Set<string>>>({});
  const [reassessmentDrafts, setReassessmentDrafts] = useState<
    Record<string, { revisedDiagnosis: string; updatedServicesNeeded: string; pendingItems: string; changesFromPrevious: string; costImpact: string; deadlineImpactDays: string }>
  >({});
  const [showReassessmentForm, setShowReassessmentForm] = useState<string | null>(null);

  const handleGenerate = async (productId: string) => {
    setIsGenerating(productId);
    setError(null);
    try {
      const unitsCount = parseInt(unitsCountByProduct[productId] || '1', 10) || 1;
      const res = await fetch(`/api/orders/${order.id}/inspection-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, unitsCount, responsibleName: defaultResponsibleName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao gerar ficha de verificação.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao gerar ficha.');
    } finally {
      setIsGenerating(null);
    }
  };

  const openSheetEditor = (sheet: InspectionSheet) => {
    setExpandedSheetId(expandedSheetId === sheet.id ? null : sheet.id);
    if (sheet.kind === 'reforma' && sheet.components) {
      setDraftComponents((prev) => ({ ...prev, [sheet.id]: prev[sheet.id] || sheet.components!.map((c) => ({ ...c })) }));
    }
    if (sheet.kind === 'fabricacao_nova' && sheet.manufacturingChecks) {
      setDraftManufChecks((prev) => ({
        ...prev,
        [sheet.id]: prev[sheet.id] || sheet.manufacturingChecks!.map((c) => ({ ...c })),
      }));
    }
  };

  const updateComponentEntry = (sheetId: string, entryId: string, patch: Partial<InspectionComponentEntry>) => {
    setDraftComponents((prev) => ({
      ...prev,
      [sheetId]: (prev[sheetId] || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    }));
  };
  const updateManufEntry = (sheetId: string, entryId: string, patch: Partial<ManufacturingInspectionEntry>) => {
    setDraftManufChecks((prev) => ({
      ...prev,
      [sheetId]: (prev[sheetId] || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    }));
  };

  const handleSaveDigitized = async (sheet: InspectionSheet) => {
    setIsSaving(sheet.id);
    setError(null);
    try {
      const body: Record<string, unknown> = { confirmedBy: defaultResponsibleName };
      if (sheet.kind === 'reforma') body.digitizedComponents = draftComponents[sheet.id];
      if (sheet.kind === 'fabricacao_nova') body.digitizedManufacturingChecks = draftManufChecks[sheet.id];
      const res = await fetch(`/api/orders/${order.id}/inspection-sheets/${sheet.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao salvar ficha preenchida.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao salvar ficha.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleSubmitScannedForm = async (sheet: InspectionSheet, file: File, isPdf: boolean) => {
    setIsSaving(sheet.id);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const body: Record<string, unknown> = { confirmedBy: defaultResponsibleName };
      if (isPdf) body.formPdfDataUrl = dataUrl;
      else body.formPhotoDataUrl = dataUrl;
      const res = await fetch(`/api/orders/${order.id}/inspection-sheets/${sheet.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao enviar ficha para leitura.');
        return;
      }
      onUpdateOrder(data.order);
      setExpandedSheetId(sheet.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao enviar ficha.');
    } finally {
      setIsSaving(null);
    }
  };

  const toggleAcceptedField = (sheetId: string, entryId: string) => {
    setAcceptedFields((prev) => {
      const set = new Set(prev[sheetId] || []);
      if (set.has(entryId)) set.delete(entryId);
      else set.add(entryId);
      return { ...prev, [sheetId]: set };
    });
  };

  const handleConfirmReading = async (sheet: InspectionSheet) => {
    setIsSaving(sheet.id);
    setError(null);
    try {
      const acceptedEntryIds = Array.from(acceptedFields[sheet.id] || []);
      const res = await fetch(`/api/orders/${order.id}/inspection-sheets/${sheet.id}/confirm-reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedEntryIds, confirmedBy: defaultResponsibleName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao confirmar leitura.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao confirmar leitura.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleCreateReassessment = async (sheet: InspectionSheet) => {
    const draft = reassessmentDrafts[sheet.id];
    if (!draft?.revisedDiagnosis?.trim()) {
      setError('Informe o diagnóstico/especificação técnica revisada.');
      return;
    }
    setIsSaving(sheet.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/reassessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectionSheetId: sheet.id,
          revisedDiagnosis: draft.revisedDiagnosis,
          updatedServicesNeeded: draft.updatedServicesNeeded,
          pendingItems: draft.pendingItems.split(',').map((s) => s.trim()).filter(Boolean),
          changesFromPrevious: draft.changesFromPrevious.split(',').map((s) => s.trim()).filter(Boolean),
          costImpact: draft.costImpact || 'a_avaliar',
          deadlineImpactDays: draft.deadlineImpactDays ? parseInt(draft.deadlineImpactDays, 10) : null,
          createdBy: defaultResponsibleName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao gerar reavaliação técnica.');
        return;
      }
      onUpdateOrder(data.order);
      setShowReassessmentForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao gerar reavaliação.');
    } finally {
      setIsSaving(null);
    }
  };

  const sheetsByProduct = (productId: string) =>
    (order.inspectionSheets || [])
      .filter((s) => s.productId === productId)
      .sort((a, b) => a.unitIndex - b.unitIndex || b.version - a.version);

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6B6257]">
        Gera uma ficha de verificação por peça individual dentro da quantidade do produto — permite identificar
        peças da mesma quantidade com condições diferentes. Imprima em A4 ou preencha direto no tablet.
      </p>

      {products.map((p) => {
        const sheets = sheetsByProduct(p.id);
        const latestByUnit = new Map<number, InspectionSheet>();
        for (const s of sheets) if (!latestByUnit.has(s.unitIndex)) latestByUnit.set(s.unitIndex, s);

        return (
          <div key={p.id} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-xs text-[#181512]">{p.label}</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Qtd de peças"
                  value={unitsCountByProduct[p.id] || ''}
                  onChange={(e) => setUnitsCountByProduct((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="w-24 p-1.5 rounded border border-[#D6CFC5] text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => handleGenerate(p.id)}
                  disabled={isGenerating === p.id}
                  className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Gerar Ficha de Verificação na Fábrica
                </button>
              </div>
            </div>

            {Array.from(latestByUnit.values()).map((sheet) => {
              const isExpanded = expandedSheetId === sheet.id;
              const components = draftComponents[sheet.id] || sheet.components;
              const manufChecks = draftManufChecks[sheet.id] || sheet.manufacturingChecks;
              return (
                <div key={sheet.id} className="p-3 rounded-lg bg-white border border-[#E5DEC9] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-[#181512]">{sheet.unitLabel}</span>
                      <span className="ml-2 text-[10px] text-[#9A7138] font-semibold uppercase">v{sheet.version}</span>
                      <span className="ml-2 text-[10px] text-[#6B6257]">{sheet.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => generateInspectionSheetPdf(order, sheet, settings)}
                        className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" /> PDF A4
                      </button>
                      <button
                        type="button"
                        onClick={() => openSheetEditor(sheet)}
                        className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512]"
                      >
                        {isExpanded ? 'Fechar' : 'Preencher / Devolver'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-[#EFECE6]">
                      {sheet.kind === 'reforma' &&
                        components?.map((entry) => (
                          <div key={entry.id} className="p-2.5 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1.5">
                            <p className="text-[11px] font-bold text-[#181512]">
                              {INSPECTION_COMPONENT_LABELS[entry.component]}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <input
                                placeholder="Identificação/local"
                                value={entry.locationLabel || ''}
                                onChange={(e) => updateComponentEntry(sheet.id, entry.id, { locationLabel: e.target.value })}
                                className="p-1.5 rounded border border-[#D6CFC5]"
                              />
                              <input
                                placeholder="Material/especificação"
                                value={entry.materialSpecification || ''}
                                onChange={(e) =>
                                  updateComponentEntry(sheet.id, entry.id, { materialSpecification: e.target.value })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5]"
                              />
                              <input
                                placeholder="Medida real (com unidade)"
                                value={entry.measurementValue || ''}
                                onChange={(e) =>
                                  updateComponentEntry(sheet.id, entry.id, {
                                    measurementValue: e.target.value,
                                    measurementStatus: e.target.value ? 'medido' : 'a_medir',
                                  })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5]"
                              />
                              <input
                                placeholder="Defeito observado"
                                value={entry.defectObserved || ''}
                                onChange={(e) => updateComponentEntry(sheet.id, entry.id, { defectObserved: e.target.value })}
                                className="p-1.5 rounded border border-[#D6CFC5]"
                              />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {MARKING_ORDER.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => updateComponentEntry(sheet.id, entry.id, { condition: m })}
                                  className={`px-2 py-1 rounded text-[9.5px] font-semibold border ${
                                    entry.condition === m
                                      ? 'bg-[#9A7138] text-white border-[#9A7138]'
                                      : 'bg-white border-[#D6CFC5] text-[#181512]'
                                  }`}
                                >
                                  {INSPECTION_MARKING_LABELS[m]}
                                </button>
                              ))}
                            </div>
                            <label className="flex items-center gap-1.5 text-[10px] text-[#57534E]">
                              <input
                                type="checkbox"
                                checked={entry.discoveredAfterDisassembly}
                                onChange={(e) =>
                                  updateComponentEntry(sheet.id, entry.id, { discoveredAfterDisassembly: e.target.checked })
                                }
                              />
                              Dano descoberto após desmontagem
                            </label>
                            <label className="flex items-center gap-1.5 text-[10px] text-[#57534E]">
                              <input
                                type="checkbox"
                                checked={entry.causeConfirmed}
                                onChange={(e) => updateComponentEntry(sheet.id, entry.id, { causeConfirmed: e.target.checked })}
                              />
                              Causa confirmada presencialmente (desmarcado = hipótese)
                            </label>
                          </div>
                        ))}

                      {sheet.kind === 'fabricacao_nova' &&
                        manufChecks?.map((entry) => (
                          <div key={entry.id} className="p-2.5 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1.5">
                            <p className="text-[11px] font-bold text-[#181512]">{entry.item}</p>
                            <p className="text-[10px] text-[#6B6257]">{entry.specification}</p>
                            <input
                              placeholder="Encontrado"
                              value={entry.found || ''}
                              onChange={(e) => updateManufEntry(sheet.id, entry.id, { found: e.target.value })}
                              className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                            <label className="flex items-center gap-1.5 text-[10px] text-[#57534E]">
                              <input
                                type="checkbox"
                                checked={entry.isNonConformance}
                                onChange={(e) => updateManufEntry(sheet.id, entry.id, { isNonConformance: e.target.checked })}
                              />
                              Não conformidade
                            </label>
                          </div>
                        ))}

                      <button
                        type="button"
                        onClick={() => handleSaveDigitized(sheet)}
                        disabled={isSaving === sheet.id}
                        className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold"
                      >
                        {isSaving === sheet.id ? 'Salvando...' : 'Salvar Preenchimento Digital'}
                      </button>

                      <div className="pt-2 border-t border-[#EFECE6] space-y-2">
                        <p className="text-[10px] font-semibold uppercase text-[#6B6257]">
                          Ou devolva uma foto/PDF da ficha marcada à mão
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <label className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] cursor-pointer flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Foto da ficha
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleSubmitScannedForm(sheet, file, false);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <label className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] cursor-pointer flex items-center gap-1">
                            <Upload className="w-3 h-3" /> PDF da ficha
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleSubmitScannedForm(sheet, file, true);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {sheet.aiReadResult && sheet.status !== 'reavaliada' && (
                        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 space-y-2">
                          <p className="text-[10px] font-semibold text-amber-900">
                            Leitura por IA — confirme os campos antes de aplicar (nunca aplicado automaticamente)
                          </p>
                          {sheet.aiReadResult.overallNotes && (
                            <p className="text-[10px] text-amber-800">{sheet.aiReadResult.overallNotes}</p>
                          )}
                          {sheet.aiReadResult.fields.map((f) => {
                            const label =
                              components?.find((c) => c.id === f.entryId) &&
                              INSPECTION_COMPONENT_LABELS[components.find((c) => c.id === f.entryId)!.component];
                            return (
                              <div key={f.entryId} className="flex items-center gap-2 text-[10px]">
                                {f.readStatus === 'lido' && (
                                  <input
                                    type="checkbox"
                                    checked={(acceptedFields[sheet.id] || new Set()).has(f.entryId)}
                                    onChange={() => toggleAcceptedField(sheet.id, f.entryId)}
                                  />
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${READ_STATUS_STYLES[f.readStatus]}`}>
                                  {READ_STATUS_LABELS[f.readStatus]}
                                </span>
                                <span className="text-[#181512]">{label || f.entryId}</span>
                                {f.readCondition && (
                                  <span className="text-[#6B6257]">→ {INSPECTION_MARKING_LABELS[f.readCondition]}</span>
                                )}
                                {f.readMeasurement && <span className="text-[#6B6257]">({f.readMeasurement})</span>}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleConfirmReading(sheet)}
                            disabled={isSaving === sheet.id}
                            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirmar Campos Selecionados
                          </button>
                        </div>
                      )}

                      {sheet.status === 'reavaliada' && (
                        <div className="pt-2 border-t border-[#EFECE6] space-y-2">
                          {(order.technicalReassessments || [])
                            .filter((r) => r.inspectionSheetId === sheet.id)
                            .map((r) => (
                              <div key={r.id} className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] space-y-0.5">
                                <p className="font-bold text-emerald-900">
                                  Reavaliação v{r.version} — impacto: {r.costImpact}
                                  {r.requiresNegotiationReview ? ' — negociação reaberta' : ''}
                                </p>
                                <p className="text-emerald-800">{r.revisedDiagnosis}</p>
                              </div>
                            ))}
                          {showReassessmentForm === sheet.id ? (
                            <div className="p-2.5 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1.5">
                              <textarea
                                placeholder="Diagnóstico/especificação técnica revisada"
                                value={reassessmentDrafts[sheet.id]?.revisedDiagnosis || ''}
                                onChange={(e) =>
                                  setReassessmentDrafts((prev) => ({
                                    ...prev,
                                    [sheet.id]: { ...(prev[sheet.id] || { revisedDiagnosis:'', updatedServicesNeeded:'', pendingItems:'', changesFromPrevious:'', costImpact:'a_avaliar', deadlineImpactDays:'' }), revisedDiagnosis: e.target.value },
                                  }))
                                }
                                rows={2}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <textarea
                                placeholder="Serviços/materiais atualizados"
                                value={reassessmentDrafts[sheet.id]?.updatedServicesNeeded || ''}
                                onChange={(e) =>
                                  setReassessmentDrafts((prev) => ({
                                    ...prev,
                                    [sheet.id]: { ...(prev[sheet.id] || { revisedDiagnosis:'', updatedServicesNeeded:'', pendingItems:'', changesFromPrevious:'', costImpact:'a_avaliar', deadlineImpactDays:'' }), updatedServicesNeeded: e.target.value },
                                  }))
                                }
                                rows={2}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Mudanças em relação à versão anterior (separadas por vírgula)"
                                value={reassessmentDrafts[sheet.id]?.changesFromPrevious || ''}
                                onChange={(e) =>
                                  setReassessmentDrafts((prev) => ({
                                    ...prev,
                                    [sheet.id]: { ...(prev[sheet.id] || { revisedDiagnosis:'', updatedServicesNeeded:'', pendingItems:'', changesFromPrevious:'', costImpact:'a_avaliar', deadlineImpactDays:'' }), changesFromPrevious: e.target.value },
                                  }))
                                }
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <select
                                  value={reassessmentDrafts[sheet.id]?.costImpact || 'a_avaliar'}
                                  onChange={(e) =>
                                    setReassessmentDrafts((prev) => ({
                                      ...prev,
                                      [sheet.id]: { ...(prev[sheet.id] || { revisedDiagnosis:'', updatedServicesNeeded:'', pendingItems:'', changesFromPrevious:'', costImpact:'a_avaliar', deadlineImpactDays:'' }), costImpact: e.target.value },
                                    }))
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px] bg-white"
                                >
                                  <option value="sem_impacto">Sem impacto de custo</option>
                                  <option value="aumento">Aumento de custo</option>
                                  <option value="reducao">Redução de custo</option>
                                  <option value="a_avaliar">Impacto a avaliar</option>
                                </select>
                                <input
                                  type="number"
                                  placeholder="Impacto no prazo (dias)"
                                  value={reassessmentDrafts[sheet.id]?.deadlineImpactDays || ''}
                                  onChange={(e) =>
                                    setReassessmentDrafts((prev) => ({
                                      ...prev,
                                      [sheet.id]: { ...(prev[sheet.id] || { revisedDiagnosis:'', updatedServicesNeeded:'', pendingItems:'', changesFromPrevious:'', costImpact:'a_avaliar', deadlineImpactDays:'' }), deadlineImpactDays: e.target.value },
                                    }))
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCreateReassessment(sheet)}
                                disabled={isSaving === sheet.id}
                                className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold"
                              >
                                Salvar Reavaliação Técnica
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowReassessmentForm(sheet.id)}
                              className="text-[10px] font-semibold text-[#9A7138] underline"
                            >
                              + Gerar reavaliação técnica para esta ficha
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
