import React, { useState } from 'react';
import { FileText, Printer, Upload, Check, AlertCircle, Plus, Send } from 'lucide-react';
import {
  AttendanceRecord,
  WorkshopSettings,
  TechnicalVisitSheet,
  VisitComponentEntry,
  ProductMeasurementSet,
  VisitMeasurement,
  InspectionMarking,
  INSPECTION_COMPONENT_LABELS,
  INSPECTION_MARKING_LABELS,
  ChecklistFieldReadStatus,
} from '../types';
import { generateTechnicalVisitSheetPdf } from '../utils/pdfGenerator';

interface TechnicalVisitSheetFormProps {
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
const CHECK_STATUS_OPTIONS: Array<{ value: VisitComponentEntry['checkStatus']; label: string }> = [
  { value: 'verificado', label: 'Verificado' },
  { value: 'nao_verificado', label: 'Não verificado' },
  { value: 'nao_se_aplica', label: 'Não se aplica' },
];
const ACTION_PROPOSED_OPTIONS: Array<{ value: NonNullable<VisitComponentEntry['actionProposed']>; label: string }> = [
  { value: 'manter', label: 'Manter' },
  { value: 'reparar', label: 'Reparar' },
  { value: 'substituir', label: 'Substituir' },
  { value: 'pendente', label: 'Pendente' },
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

function mSet(value: string): VisitMeasurement {
  return { value: value || null, origin: value ? 'medido_pelo_operador' : 'pendente' };
}

interface OpinionDraft {
  productDescription: string;
  verifiedConditionsSummary: string;
  recommendedServices: string;
  servicesJustification: string;
  materialsToKeep: string;
  materialsToRepair: string;
  materialsToReplace: string;
  pendingDisassemblyItems: string;
  sufficientForBudget: string;
  missingForBudget: string;
  fabricUsableWidthCm: string;
  fabricPatternDirection: 'Vertical' | 'Horizontal' | 'Indiferente';
  fabricSeamMarginCm: string;
  fabricJustifiedLossPercent: string;
}

const EMPTY_OPINION_DRAFT: OpinionDraft = {
  productDescription: '',
  verifiedConditionsSummary: '',
  recommendedServices: '',
  servicesJustification: '',
  materialsToKeep: '',
  materialsToRepair: '',
  materialsToReplace: '',
  pendingDisassemblyItems: '',
  sufficientForBudget: '',
  missingForBudget: '',
  fabricUsableWidthCm: '',
  fabricPatternDirection: 'Indiferente',
  fabricSeamMarginCm: '',
  fabricJustifiedLossPercent: '',
};

export const TechnicalVisitSheetForm: React.FC<TechnicalVisitSheetFormProps> = ({
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
  const [draftMeasurements, setDraftMeasurements] = useState<Record<string, ProductMeasurementSet>>({});
  const [draftComponents, setDraftComponents] = useState<Record<string, VisitComponentEntry[]>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [acceptedFields, setAcceptedFields] = useState<Record<string, Set<string>>>({});
  const [opinionDrafts, setOpinionDrafts] = useState<Record<string, OpinionDraft>>({});
  const [showOpinionForm, setShowOpinionForm] = useState<string | null>(null);

  const sheetsByProduct = (productId: string) =>
    (order.technicalVisitSheets || [])
      .filter((s) => s.productId === productId)
      .sort((a, b) => a.unitIndex - b.unitIndex || b.version - a.version);

  const handleGenerate = async (productId: string) => {
    setIsGenerating(productId);
    setError(null);
    try {
      const unitsCount = parseInt(unitsCountByProduct[productId] || '1', 10) || 1;
      const res = await fetch(`/api/orders/${order.id}/technical-visit-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, unitsCount, operatorName: defaultResponsibleName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao gerar ficha de visita técnica.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao gerar ficha.');
    } finally {
      setIsGenerating(null);
    }
  };

  const openSheetEditor = (sheet: TechnicalVisitSheet) => {
    setExpandedSheetId(expandedSheetId === sheet.id ? null : sheet.id);
    setDraftMeasurements((prev) => ({
      ...prev,
      [sheet.id]: prev[sheet.id] || JSON.parse(JSON.stringify(sheet.measurements)),
    }));
    setDraftComponents((prev) => ({
      ...prev,
      [sheet.id]: prev[sheet.id] || sheet.components.map((c) => ({ ...c })),
    }));
  };

  const updateMeasurements = (sheetId: string, mutate: (m: ProductMeasurementSet) => void) => {
    setDraftMeasurements((prev) => {
      const current = prev[sheetId];
      if (!current) return prev;
      const next: ProductMeasurementSet = JSON.parse(JSON.stringify(current));
      mutate(next);
      return { ...prev, [sheetId]: next };
    });
  };

  const updateComponentEntry = (sheetId: string, entryId: string, patch: Partial<VisitComponentEntry>) => {
    setDraftComponents((prev) => ({
      ...prev,
      [sheetId]: (prev[sheetId] || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    }));
  };

  const handlePhotoUpload = async (
    sheetId: string,
    file: File,
    apply: (imageUrl: string) => void,
    uploadKey: string
  ) => {
    setUploadingFor(uploadKey);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: order.id, photoId: `tvs-${sheetId}-${Date.now()}`, dataUrl }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) apply(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto.');
    } finally {
      setUploadingFor(null);
    }
  };

  const handleSaveDigitized = async (sheet: TechnicalVisitSheet) => {
    setIsSaving(sheet.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/technical-visit-sheets/${sheet.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digitalMeasurements: draftMeasurements[sheet.id],
          digitalComponents: draftComponents[sheet.id],
          confirmedBy: defaultResponsibleName,
        }),
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

  const handleSubmitScannedForm = async (sheet: TechnicalVisitSheet, file: File, isPdf: boolean) => {
    setIsSaving(sheet.id);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const body: Record<string, unknown> = {};
      if (isPdf) body.formPdfDataUrl = dataUrl;
      else body.formPhotoDataUrl = dataUrl;
      const res = await fetch(`/api/orders/${order.id}/technical-visit-sheets/${sheet.id}/submit`, {
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

  const handleConfirmReading = async (sheet: TechnicalVisitSheet) => {
    setIsSaving(sheet.id);
    setError(null);
    try {
      const acceptedEntryIds = Array.from(acceptedFields[sheet.id] || []);
      const res = await fetch(`/api/orders/${order.id}/technical-visit-sheets/${sheet.id}/confirm`, {
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

  const getOpinionDraft = (sheetId: string): OpinionDraft => opinionDrafts[sheetId] || EMPTY_OPINION_DRAFT;
  const patchOpinionDraft = (sheetId: string, patch: Partial<OpinionDraft>) => {
    setOpinionDrafts((prev) => ({ ...prev, [sheetId]: { ...getOpinionDraft(sheetId), ...patch } }));
  };
  const splitList = (text: string): string[] =>
    text.split(',').map((s) => s.trim()).filter(Boolean);

  const handleCreateOpinion = async (sheet: TechnicalVisitSheet) => {
    const draft = getOpinionDraft(sheet.id);
    if (!draft.recommendedServices.trim()) {
      setError('Informe os serviços recomendados para gerar o parecer.');
      return;
    }
    setIsSaving(sheet.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/technical-visit-opinions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitSheetId: sheet.id,
          productDescription: draft.productDescription,
          verifiedConditionsSummary: draft.verifiedConditionsSummary,
          recommendedServices: draft.recommendedServices,
          servicesJustification: draft.servicesJustification,
          materialsToKeep: splitList(draft.materialsToKeep),
          materialsToRepair: splitList(draft.materialsToRepair),
          materialsToReplace: splitList(draft.materialsToReplace),
          pendingDisassemblyItems: splitList(draft.pendingDisassemblyItems),
          sufficientForBudget: splitList(draft.sufficientForBudget),
          missingForBudget: splitList(draft.missingForBudget),
          fabricUsableWidthCm: draft.fabricUsableWidthCm ? parseFloat(draft.fabricUsableWidthCm) : undefined,
          fabricPatternDirection: draft.fabricPatternDirection,
          fabricSeamMarginCm: draft.fabricSeamMarginCm ? parseFloat(draft.fabricSeamMarginCm) : undefined,
          fabricJustifiedLossPercent: draft.fabricJustifiedLossPercent
            ? parseFloat(draft.fabricJustifiedLossPercent)
            : undefined,
          createdBy: defaultResponsibleName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao gerar parecer da visita técnica.');
        return;
      }
      onUpdateOrder(data.order);
      setShowOpinionForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao gerar parecer.');
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6B6257]">
        Fase 2 da avaliação: visita com o móvel ainda montado. Gera uma ficha por peça individual dentro da
        quantidade do produto, com medidas reais e testes de funcionamento feitos pelo operador — nunca exige
        desmontagem para ser útil. Imprima em A4 ou preencha direto no tablet.
      </p>

      {products.map((p) => {
        const sheets = sheetsByProduct(p.id);
        const latestByUnit = new Map<number, TechnicalVisitSheet>();
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
                  Gerar Ficha de Visita
                </button>
              </div>
            </div>

            {Array.from(latestByUnit.values()).map((sheet) => {
              const isExpanded = expandedSheetId === sheet.id;
              const measurements = draftMeasurements[sheet.id] || sheet.measurements;
              const components = draftComponents[sheet.id] || sheet.components;
              const opinions = (order.technicalVisitOpinions || []).filter((o) => o.visitSheetId === sheet.id);

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
                        onClick={() => generateTechnicalVisitSheetPdf(order, sheet, settings)}
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
                      {/* ---------------- Quadro de medidas ---------------- */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase text-[#6B6257]">
                          Quadro de medidas do produto montado (sempre com unidade — cm)
                        </p>

                        <div className="grid grid-cols-4 gap-1.5">
                          {(['width', 'height', 'depth', 'depthOpen'] as const).map((field) => (
                            <input
                              key={field}
                              placeholder={
                                field === 'width'
                                  ? 'Largura (ex.: 180 cm)'
                                  : field === 'height'
                                  ? 'Altura'
                                  : field === 'depth'
                                  ? 'Profundidade'
                                  : 'Profundidade aberto'
                              }
                              value={measurements.overall[field]?.value || ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  m.overall[field] = mSet(e.target.value);
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                          ))}
                        </div>

                        {measurements.arms.map((arm) => (
                          <div key={arm.id} className="grid grid-cols-4 gap-1.5 items-center">
                            <span className="text-[10px] font-semibold text-[#181512]">Braço {arm.side}</span>
                            {(['length', 'width', 'height'] as const).map((field) => (
                              <input
                                key={field}
                                placeholder={field === 'length' ? 'Comprimento' : field === 'width' ? 'Largura' : 'Altura'}
                                value={arm[field]?.value || ''}
                                onChange={(e) =>
                                  updateMeasurements(sheet.id, (m) => {
                                    const a = m.arms.find((x) => x.id === arm.id);
                                    if (a) a[field] = mSet(e.target.value);
                                  })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                            ))}
                          </div>
                        ))}

                        {measurements.seats.map((seat, idx) => (
                          <div key={seat.id} className="grid grid-cols-5 gap-1.5 items-center">
                            <input
                              value={seat.label || `Assento ${idx + 1}`}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const s = m.seats.find((x) => x.id === seat.id);
                                  if (s) s.label = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px] font-semibold"
                            />
                            {(['width', 'depth', 'cushionThickness', 'heightFromFloor'] as const).map((field) => (
                              <input
                                key={field}
                                placeholder={
                                  field === 'width'
                                    ? 'Largura'
                                    : field === 'depth'
                                    ? 'Profundidade'
                                    : field === 'cushionThickness'
                                    ? 'Esp. almofada'
                                    : 'Altura ao piso'
                                }
                                value={seat[field]?.value || ''}
                                onChange={(e) =>
                                  updateMeasurements(sheet.id, (m) => {
                                    const s = m.seats.find((x) => x.id === seat.id);
                                    if (s) s[field] = mSet(e.target.value);
                                  })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                            ))}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateMeasurements(sheet.id, (m) => {
                              m.seats.push({ id: `seat-${Date.now()}`, label: `Assento ${m.seats.length + 1}` });
                            })
                          }
                          className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar assento
                        </button>

                        {measurements.backrests.map((back, idx) => (
                          <div key={back.id} className="grid grid-cols-4 gap-1.5 items-center">
                            <input
                              value={back.label || `Encosto ${idx + 1}`}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const b = m.backrests.find((x) => x.id === back.id);
                                  if (b) b.label = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px] font-semibold"
                            />
                            {(['width', 'height', 'thickness'] as const).map((field) => (
                              <input
                                key={field}
                                placeholder={field === 'width' ? 'Largura' : field === 'height' ? 'Altura' : 'Espessura'}
                                value={back[field]?.value || ''}
                                onChange={(e) =>
                                  updateMeasurements(sheet.id, (m) => {
                                    const b = m.backrests.find((x) => x.id === back.id);
                                    if (b) b[field] = mSet(e.target.value);
                                  })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                            ))}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateMeasurements(sheet.id, (m) => {
                              m.backrests.push({ id: `back-${Date.now()}`, label: `Encosto ${m.backrests.length + 1}` });
                            })
                          }
                          className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar encosto
                        </button>

                        {measurements.looseCushions.map((cushion) => (
                          <div key={cushion.id} className="grid grid-cols-5 gap-1.5 items-center">
                            <input
                              value={cushion.identification}
                              placeholder="Identificação"
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const c = m.looseCushions.find((x) => x.id === cushion.id);
                                  if (c) c.identification = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px] font-semibold"
                            />
                            <input
                              type="number"
                              placeholder="Qtd"
                              value={cushion.quantity ?? ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const c = m.looseCushions.find((x) => x.id === cushion.id);
                                  if (c) c.quantity = e.target.value ? parseInt(e.target.value, 10) : null;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                            {(['width', 'heightOrDepth', 'thickness'] as const).map((field) => (
                              <input
                                key={field}
                                placeholder={field === 'width' ? 'Largura' : field === 'heightOrDepth' ? 'Alt./Prof.' : 'Espessura'}
                                value={cushion[field]?.value || ''}
                                onChange={(e) =>
                                  updateMeasurements(sheet.id, (m) => {
                                    const c = m.looseCushions.find((x) => x.id === cushion.id);
                                    if (c) c[field] = mSet(e.target.value);
                                  })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                            ))}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateMeasurements(sheet.id, (m) => {
                              m.looseCushions.push({ id: `cush-${Date.now()}`, identification: 'Almofada solta' });
                            })
                          }
                          className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar almofada solta
                        </button>

                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            placeholder="Base e pés — medidas acessíveis"
                            value={measurements.baseAndFeet?.accessibleMeasurements || ''}
                            onChange={(e) =>
                              updateMeasurements(sheet.id, (m) => {
                                m.baseAndFeet = { ...(m.baseAndFeet || {}), accessibleMeasurements: e.target.value };
                              })
                            }
                            className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                          />
                          <input
                            placeholder="Altura dos pés"
                            value={measurements.baseAndFeet?.feetHeight?.value || ''}
                            onChange={(e) =>
                              updateMeasurements(sheet.id, (m) => {
                                m.baseAndFeet = { ...(m.baseAndFeet || {}), feetHeight: mSet(e.target.value) };
                              })
                            }
                            className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                          />
                          <input
                            type="number"
                            placeholder="Quantidade de pés"
                            value={measurements.baseAndFeet?.feetQuantity ?? ''}
                            onChange={(e) =>
                              updateMeasurements(sheet.id, (m) => {
                                m.baseAndFeet = {
                                  ...(m.baseAndFeet || {}),
                                  feetQuantity: e.target.value ? parseInt(e.target.value, 10) : null,
                                };
                              })
                            }
                            className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                          />
                        </div>

                        {measurements.recliningModules.map((mod) => (
                          <div key={mod.id} className="grid grid-cols-4 gap-1.5 items-center">
                            <input
                              value={mod.moduleLabel}
                              placeholder="Módulo"
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const r = m.recliningModules.find((x) => x.id === mod.id);
                                  if (r) r.moduleLabel = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px] font-semibold"
                            />
                            <input
                              placeholder="Medidas fechado"
                              value={mod.closedMeasurements || ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const r = m.recliningModules.find((x) => x.id === mod.id);
                                  if (r) r.closedMeasurements = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                            <input
                              placeholder="Medidas aberto"
                              value={mod.openMeasurements || ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const r = m.recliningModules.find((x) => x.id === mod.id);
                                  if (r) r.openMeasurements = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                            <input
                              placeholder="Funcionamento observado"
                              value={mod.observedFunction || ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const r = m.recliningModules.find((x) => x.id === mod.id);
                                  if (r) r.observedFunction = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateMeasurements(sheet.id, (m) => {
                              m.recliningModules.push({ id: `recl-${Date.now()}`, moduleLabel: 'Módulo' });
                            })
                          }
                          className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar módulo retrátil/reclinável
                        </button>

                        {measurements.otherParts.map((other) => (
                          <div key={other.id} className="grid grid-cols-4 gap-1.5 items-center">
                            <input
                              value={other.name}
                              placeholder="Nome da parte"
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const o = m.otherParts.find((x) => x.id === other.id);
                                  if (o) o.name = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px] font-semibold"
                            />
                            <input
                              placeholder="Localização"
                              value={other.location || ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const o = m.otherParts.find((x) => x.id === other.id);
                                  if (o) o.location = e.target.value;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                            <input
                              type="number"
                              placeholder="Quantidade"
                              value={other.quantity ?? ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const o = m.otherParts.find((x) => x.id === other.id);
                                  if (o) o.quantity = e.target.value ? parseInt(e.target.value, 10) : null;
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                            <input
                              placeholder="Medida"
                              value={other.measurement?.value || ''}
                              onChange={(e) =>
                                updateMeasurements(sheet.id, (m) => {
                                  const o = m.otherParts.find((x) => x.id === other.id);
                                  if (o) o.measurement = mSet(e.target.value);
                                })
                              }
                              className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateMeasurements(sheet.id, (m) => {
                              m.otherParts.push({ id: `other-${Date.now()}`, name: '' });
                            })
                          }
                          className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Adicionar outra parte
                        </button>

                        <div className="p-2.5 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1.5">
                          <p className="text-[10px] font-semibold text-[#181512]">
                            Desenho à mão (identifique as medidas e referencie as fotos)
                          </p>
                          <textarea
                            placeholder="Identificação das medidas no desenho"
                            value={measurements.freehandSketch?.measurementLabels || ''}
                            onChange={(e) =>
                              updateMeasurements(sheet.id, (m) => {
                                m.freehandSketch = { ...(m.freehandSketch || {}), measurementLabels: e.target.value };
                              })
                            }
                            rows={2}
                            className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                          />
                          <label className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] cursor-pointer flex items-center gap-1 w-fit">
                            <Upload className="w-3 h-3" />
                            {uploadingFor === `sketch-${sheet.id}` ? 'Enviando...' : 'Foto do desenho à mão'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handlePhotoUpload(
                                    sheet.id,
                                    file,
                                    (imageUrl) =>
                                      updateMeasurements(sheet.id, (m) => {
                                        m.freehandSketch = { ...(m.freehandSketch || {}), photoId: imageUrl };
                                      }),
                                    `sketch-${sheet.id}`
                                  );
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {measurements.freehandSketch?.photoId && (
                            <img
                              src={measurements.freehandSketch.photoId}
                              alt="Desenho à mão"
                              className="h-20 rounded border border-[#D6CFC5]"
                            />
                          )}
                        </div>
                      </div>

                      {/* ---------------- Checklist de materiais e condições ---------------- */}
                      <div className="space-y-2 pt-2 border-t border-[#EFECE6]">
                        <p className="text-[10px] font-semibold uppercase text-[#6B6257]">
                          Checklist de materiais e condições
                        </p>
                        {components.map((entry) => (
                          <div key={entry.id} className="p-2.5 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1.5">
                            <p className="text-[11px] font-bold text-[#181512]">
                              {INSPECTION_COMPONENT_LABELS[entry.component]}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <input
                                placeholder="Localização"
                                value={entry.locationLabel || ''}
                                onChange={(e) => updateComponentEntry(sheet.id, entry.id, { locationLabel: e.target.value })}
                                className="p-1.5 rounded border border-[#D6CFC5]"
                              />
                              <input
                                type="number"
                                placeholder="Quantidade"
                                value={entry.quantity ?? ''}
                                onChange={(e) =>
                                  updateComponentEntry(sheet.id, entry.id, {
                                    quantity: e.target.value ? parseInt(e.target.value, 10) : null,
                                  })
                                }
                                className="p-1.5 rounded border border-[#D6CFC5]"
                              />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {MARKING_ORDER.map((mk) => (
                                <button
                                  key={mk}
                                  type="button"
                                  onClick={() => updateComponentEntry(sheet.id, entry.id, { condition: mk })}
                                  className={`px-2 py-1 rounded text-[9.5px] font-semibold border ${
                                    entry.condition === mk
                                      ? 'bg-[#9A7138] text-white border-[#9A7138]'
                                      : 'bg-white border-[#D6CFC5] text-[#181512]'
                                  }`}
                                >
                                  {INSPECTION_MARKING_LABELS[mk]}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {CHECK_STATUS_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateComponentEntry(sheet.id, entry.id, { checkStatus: opt.value })}
                                  className={`px-2 py-1 rounded text-[9.5px] font-semibold border ${
                                    entry.checkStatus === opt.value
                                      ? 'bg-[#181512] text-white border-[#181512]'
                                      : 'bg-white border-[#D6CFC5] text-[#181512]'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ACTION_PROPOSED_OPTIONS.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateComponentEntry(sheet.id, entry.id, { actionProposed: opt.value })}
                                  className={`px-2 py-1 rounded text-[9.5px] font-semibold border ${
                                    entry.actionProposed === opt.value
                                      ? 'bg-[#845E2B] text-white border-[#845E2B]'
                                      : 'bg-white border-[#D6CFC5] text-[#181512]'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <input
                              placeholder="Defeito observado / observações"
                              value={entry.defectObserved || ''}
                              onChange={(e) => updateComponentEntry(sheet.id, entry.id, { defectObserved: e.target.value })}
                              className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                            />

                            {entry.component === 'espumas' && (
                              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-white border border-[#EFECE6]">
                                <input
                                  placeholder="Medida acessível (ex.: 50x45 cm)"
                                  value={entry.foamAccessibleMeasurement || ''}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, { foamAccessibleMeasurement: e.target.value })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="Espessura (cm) — ex.: 1"
                                  value={entry.foamThicknessCm ?? ''}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, {
                                      foamThicknessCm: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Densidade (ex.: D28, D33)"
                                  value={entry.foamDensity || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { foamDensity: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder='Outras observações de especificação (opcional)'
                                  value={entry.foamDensitySpecification || ''}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, { foamDensitySpecification: e.target.value })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <select
                                  value={entry.foamDeformation || 'nao_avaliado'}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, {
                                      foamDeformation: e.target.value as VisitComponentEntry['foamDeformation'],
                                    })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px] bg-white"
                                >
                                  <option value="nao_avaliado">Deformação: não avaliado</option>
                                  <option value="ausente">Deformação: ausente</option>
                                  <option value="parcial">Deformação: parcial</option>
                                  <option value="severa">Deformação: severa</option>
                                </select>
                                <select
                                  value={entry.foamSinking || 'nao_avaliado'}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, {
                                      foamSinking: e.target.value as VisitComponentEntry['foamSinking'],
                                    })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px] bg-white"
                                >
                                  <option value="nao_avaliado">Afundamento: não avaliado</option>
                                  <option value="ausente">Afundamento: ausente</option>
                                  <option value="presente">Afundamento: presente</option>
                                </select>
                              </div>
                            )}

                            {(entry.component === 'revestimento' || entry.component === 'costuras') && (
                              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-white border border-[#EFECE6]">
                                <input
                                  placeholder="Revestimento atual"
                                  value={entry.fabricCurrentCovering || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { fabricCurrentCovering: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Revestimento desejado"
                                  value={entry.fabricDesiredCovering || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { fabricDesiredCovering: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Cor"
                                  value={entry.fabricColor || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { fabricColor: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Estampa"
                                  value={entry.fabricPattern || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { fabricPattern: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <select
                                  value={entry.fabricPatternDirection || ''}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, {
                                      fabricPatternDirection: e.target.value as VisitComponentEntry['fabricPatternDirection'],
                                    })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px] bg-white"
                                >
                                  <option value="">Sentido do desenho...</option>
                                  <option value="Vertical">Vertical</option>
                                  <option value="Horizontal">Horizontal</option>
                                  <option value="Indiferente">Indiferente</option>
                                </select>
                                <input
                                  type="number"
                                  placeholder="Largura útil do tecido (cm)"
                                  value={entry.fabricUsableWidthCm ?? ''}
                                  onChange={(e) =>
                                    updateComponentEntry(sheet.id, entry.id, {
                                      fabricUsableWidthCm: e.target.value ? parseFloat(e.target.value) : null,
                                    })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Desgaste/rasgos"
                                  value={entry.fabricWear || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { fabricWear: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Partes a revestir"
                                  value={entry.fabricPartsToRecover || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { fabricPartsToRecover: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                              </div>
                            )}

                            {(entry.component === 'estrutura' || entry.component === 'mecanismos') && (
                              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded bg-white border border-[#EFECE6]">
                                <input
                                  placeholder="Folgas"
                                  value={entry.structurePlay || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { structurePlay: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Ruídos"
                                  value={entry.structureNoise || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { structureNoise: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Instabilidade"
                                  value={entry.structureInstability || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { structureInstability: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  placeholder="Funcionamento observado"
                                  value={entry.observedFunction || ''}
                                  onChange={(e) => updateComponentEntry(sheet.id, entry.id, { observedFunction: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                              </div>
                            )}

                            <label className="px-2 py-1 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[9.5px] font-medium text-[#181512] cursor-pointer flex items-center gap-1 w-fit">
                              <Upload className="w-3 h-3" />
                              {uploadingFor === entry.id ? 'Enviando...' : 'Foto do detalhe'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handlePhotoUpload(
                                      sheet.id,
                                      file,
                                      (imageUrl) => updateComponentEntry(sheet.id, entry.id, { detailPhotoId: imageUrl }),
                                      entry.id
                                    );
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {entry.detailPhotoId && (
                              <img src={entry.detailPhotoId} alt="" className="h-16 rounded border border-[#D6CFC5]" />
                            )}
                          </div>
                        ))}
                      </div>

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
                          {sheet.aiReadResult.fields.map((f) => (
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
                              <span className="text-[#181512]">{f.entryId}</span>
                              {f.readCondition && (
                                <span className="text-[#6B6257]">→ {INSPECTION_MARKING_LABELS[f.readCondition]}</span>
                              )}
                              {f.readMeasurement && <span className="text-[#6B6257]">({f.readMeasurement})</span>}
                            </div>
                          ))}
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
                          {opinions.map((o) => (
                            <div key={o.id} className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] space-y-1">
                              <p className="font-bold text-emerald-900">
                                Parecer v{o.version}
                                {o.requiresNegotiationReview ? ' — negociação reaberta' : ''} — encaminhado ao Tapeceiro Técnico
                              </p>
                              <p className="text-emerald-800">{o.recommendedServices}</p>
                              {o.estimatedMaterials.map((mat, i) => (
                                <p key={i} className="text-emerald-700">
                                  {mat.name}: {mat.quantity} {mat.unit} — <em>{mat.calculationMemo}</em>
                                </p>
                              ))}
                            </div>
                          ))}
                          {showOpinionForm === sheet.id ? (
                            <div className="p-2.5 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1.5">
                              <textarea
                                placeholder="Descrição do produto e medidas levantadas"
                                value={getOpinionDraft(sheet.id).productDescription}
                                onChange={(e) => patchOpinionDraft(sheet.id, { productDescription: e.target.value })}
                                rows={2}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <textarea
                                placeholder="Condições verificadas por componente (resumo)"
                                value={getOpinionDraft(sheet.id).verifiedConditionsSummary}
                                onChange={(e) => patchOpinionDraft(sheet.id, { verifiedConditionsSummary: e.target.value })}
                                rows={2}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <textarea
                                placeholder="Serviços recomendados"
                                value={getOpinionDraft(sheet.id).recommendedServices}
                                onChange={(e) => patchOpinionDraft(sheet.id, { recommendedServices: e.target.value })}
                                rows={2}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <textarea
                                placeholder="Justificativa dos serviços"
                                value={getOpinionDraft(sheet.id).servicesJustification}
                                onChange={(e) => patchOpinionDraft(sheet.id, { servicesJustification: e.target.value })}
                                rows={2}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Materiais a manter (separados por vírgula)"
                                value={getOpinionDraft(sheet.id).materialsToKeep}
                                onChange={(e) => patchOpinionDraft(sheet.id, { materialsToKeep: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Materiais a reparar (separados por vírgula)"
                                value={getOpinionDraft(sheet.id).materialsToRepair}
                                onChange={(e) => patchOpinionDraft(sheet.id, { materialsToRepair: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Materiais a substituir (separados por vírgula)"
                                value={getOpinionDraft(sheet.id).materialsToReplace}
                                onChange={(e) => patchOpinionDraft(sheet.id, { materialsToReplace: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Pendências que dependem de desmontagem (separadas por vírgula)"
                                value={getOpinionDraft(sheet.id).pendingDisassemblyItems}
                                onChange={(e) => patchOpinionDraft(sheet.id, { pendingDisassemblyItems: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Informações já suficientes para o orçamento (separadas por vírgula)"
                                value={getOpinionDraft(sheet.id).sufficientForBudget}
                                onChange={(e) => patchOpinionDraft(sheet.id, { sufficientForBudget: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <input
                                placeholder="Informações ainda ausentes para o orçamento (separadas por vírgula)"
                                value={getOpinionDraft(sheet.id).missingForBudget}
                                onChange={(e) => patchOpinionDraft(sheet.id, { missingForBudget: e.target.value })}
                                className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                              />
                              <p className="text-[9.5px] font-semibold uppercase text-[#6B6257] pt-1">
                                Parâmetros para estimar consumo de tecido (opcional — sem isso, fica pendente)
                              </p>
                              <div className="grid grid-cols-3 gap-1.5">
                                <input
                                  type="number"
                                  placeholder="Largura útil do tecido (cm)"
                                  value={getOpinionDraft(sheet.id).fabricUsableWidthCm}
                                  onChange={(e) => patchOpinionDraft(sheet.id, { fabricUsableWidthCm: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <select
                                  value={getOpinionDraft(sheet.id).fabricPatternDirection}
                                  onChange={(e) =>
                                    patchOpinionDraft(sheet.id, {
                                      fabricPatternDirection: e.target.value as OpinionDraft['fabricPatternDirection'],
                                    })
                                  }
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px] bg-white"
                                >
                                  <option value="Indiferente">Sentido: indiferente</option>
                                  <option value="Vertical">Sentido: vertical</option>
                                  <option value="Horizontal">Sentido: horizontal</option>
                                </select>
                                <input
                                  type="number"
                                  placeholder="Margem de costura (cm)"
                                  value={getOpinionDraft(sheet.id).fabricSeamMarginCm}
                                  onChange={(e) => patchOpinionDraft(sheet.id, { fabricSeamMarginCm: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                                <input
                                  type="number"
                                  placeholder="Perda justificada (%)"
                                  value={getOpinionDraft(sheet.id).fabricJustifiedLossPercent}
                                  onChange={(e) => patchOpinionDraft(sheet.id, { fabricJustifiedLossPercent: e.target.value })}
                                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCreateOpinion(sheet)}
                                disabled={isSaving === sheet.id}
                                className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Gerar Parecer e Encaminhar ao Tapeceiro Técnico
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowOpinionForm(sheet.id)}
                              className="text-[10px] font-semibold text-[#9A7138] underline"
                            >
                              + Gerar parecer técnico desta ficha
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
