import React, { useState } from 'react';
import { ClipboardCheck, Plus, Trash2, Check, X, AlertCircle, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { AttendanceRecord, WorkshopSettings, QcCheckEntry, QcResult, QualityControlInspection } from '../types';

interface QualityControlBoardProps {
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

const RESULT_LABELS: Record<QcResult, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  nao_se_aplica: 'Não se aplica',
};
const OUTCOME_LABELS: Record<QualityControlInspection['outcome'], string> = {
  aprovado: 'Aprovado',
  retrabalho: 'Retrabalho',
  aguardando_verificacao: 'Aguardando verificação',
};
const OUTCOME_STYLES: Record<QualityControlInspection['outcome'], string> = {
  aprovado: 'bg-emerald-100 text-emerald-800',
  retrabalho: 'bg-red-100 text-red-800',
  aguardando_verificacao: 'bg-amber-100 text-amber-800',
};

const GENERIC_CHECK_ITEMS = [
  'Estabilidade',
  'Funcionamento dos mecanismos',
  'Costuras',
  'Alinhamento do revestimento',
  'Acabamento',
  'Limpeza',
];

function emptyCheck(item: string, plannedValue?: string): QcCheckEntry {
  return { id: `qcc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, item, plannedValue };
}

export const QualityControlBoard: React.FC<QualityControlBoardProps> = ({
  order,
  settings,
  defaultResponsibleName,
  onUpdateOrder,
}) => {
  const products = listOrderProductsLocal(order);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [activeInspectionKey, setActiveInspectionKey] = useState<string | null>(null); // `${productId}:${unitIndex}`
  const [draftChecks, setDraftChecks] = useState<Record<string, QcCheckEntry[]>>({});
  const [uploadingCheckId, setUploadingCheckId] = useState<string | null>(null);

  const approvedManualFor = (productId: string) =>
    (order.executionManuals || [])
      .filter((m) => m.productId === productId && m.status === 'aprovado')
      .sort((a, b) => b.version - a.version)[0];

  const inspectionsFor = (productId: string, unitIndex: number) =>
    (order.qualityControlHistory || [])
      .filter((q) => q.productId === productId && q.unitIndex === unitIndex)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const unitIndexesFor = (productId: string): number[] => {
    const fromSheets = (order.inspectionSheets || [])
      .filter((s) => s.productId === productId)
      .map((s) => s.unitIndex);
    const fromQc = (order.qualityControlHistory || [])
      .filter((q) => q.productId === productId)
      .map((q) => q.unitIndex);
    const all = Array.from(new Set([...fromSheets, ...fromQc]));
    return all.length > 0 ? all.sort((a, b) => a - b) : [1];
  };

  const startNewInspection = (productId: string, unitIndex: number, reworkOf?: QualityControlInspection) => {
    const key = `${productId}:${unitIndex}`;
    const manual = approvedManualFor(productId);
    const checks: QcCheckEntry[] = reworkOf
      ? reworkOf.checks.map((c) => ({ ...c, result: undefined, foundValue: undefined, notes: undefined, photoId: undefined }))
      : [
          ...(manual?.partsList || []).map((part) =>
            emptyCheck(`Medida: ${part.name}`, part.quantity != null ? `${part.quantity} ${part.unit}` : undefined)
          ),
          ...GENERIC_CHECK_ITEMS.map((item) => emptyCheck(item)),
        ];
    setDraftChecks((prev) => ({ ...prev, [key]: checks }));
    setActiveInspectionKey(key);
  };

  const updateCheck = (key: string, checkId: string, patch: Partial<QcCheckEntry>) => {
    setDraftChecks((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((c) => (c.id === checkId ? { ...c, ...patch } : c)),
    }));
  };

  const handlePhotoUpload = async (key: string, checkId: string, file: File) => {
    setUploadingCheckId(checkId);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId: order.id, photoId: `qc-${Date.now()}`, dataUrl }),
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        updateCheck(key, checkId, { photoId: data.imageUrl });
      }
    } finally {
      setUploadingCheckId(null);
    }
  };

  const handleSubmitInspection = async (productId: string, unitIndex: number, outcome: 'aprovado' | 'aguardando_verificacao', reworkOfInspectionId?: string) => {
    const key = `${productId}:${unitIndex}`;
    const checks = draftChecks[key] || [];
    if (!defaultResponsibleName?.trim()) {
      setError('Configure o nome do responsável padrão antes de registrar a inspeção.');
      return;
    }
    setIsSaving(key);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/quality-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          unitIndex,
          checks,
          responsibleName: defaultResponsibleName,
          outcome,
          reworkOfInspectionId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao registrar inspeção de controle de qualidade.');
        return;
      }
      onUpdateOrder(data.order);
      setActiveInspectionKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao registrar inspeção.');
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6B6257]">
        Checklist derivado do manual de execução aprovado — medida prevista vem só dele, nunca inventada aqui.
        Nunca libera "aprovado" havendo item não conforme sem resolver.
      </p>

      {products.map((p) => {
        const manual = approvedManualFor(p.id);
        const units = unitIndexesFor(p.id);
        return (
          <div key={p.id} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
            <h4 className="font-bold text-xs text-[#181512] flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-[#9A7138]" /> {p.label}
            </h4>
            {!manual && (
              <p className="text-[10px] text-amber-700">Sem manual de execução aprovado ainda — não é possível iniciar o controle de qualidade.</p>
            )}
            {manual && (
              <p className="text-[10px] text-[#6B6257]">Manual aprovado: v{manual.version}</p>
            )}

            {units.map((unitIndex) => {
              const key = `${p.id}:${unitIndex}`;
              const inspections = inspectionsFor(p.id, unitIndex);
              const latest = inspections[0];
              const isActive = activeInspectionKey === key;
              const checks = draftChecks[key] || [];

              return (
                <div key={unitIndex} className="p-3 rounded-lg bg-white border border-[#E5DEC9] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#181512]">Peça {unitIndex}</span>
                    {latest && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${OUTCOME_STYLES[latest.outcome]}`}>
                        {OUTCOME_LABELS[latest.outcome]}
                      </span>
                    )}
                  </div>

                  {inspections.map((insp) => (
                    <div key={insp.id} className="text-[10px] text-[#6B6257]">
                      {new Date(insp.date).toLocaleString('pt-BR')} — {insp.responsibleName} —{' '}
                      <span className="font-semibold">{OUTCOME_LABELS[insp.outcome]}</span>
                      {insp.reworkOfInspectionId && ' (reinspeção pós-retrabalho)'}
                    </div>
                  ))}

                  {!isActive && manual && (
                    <button
                      type="button"
                      onClick={() => startNewInspection(p.id, unitIndex, latest?.outcome === 'retrabalho' ? latest : undefined)}
                      className="px-3 py-1.5 rounded bg-[#9A7138] hover:bg-[#845E2B] text-white text-[10px] font-semibold flex items-center gap-1.5"
                    >
                      {latest?.outcome === 'retrabalho' ? (
                        <>
                          <RotateCcw className="w-3 h-3" /> Registrar Reinspeção Pós-Retrabalho
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Nova Inspeção
                        </>
                      )}
                    </button>
                  )}

                  {isActive && (
                    <div className="space-y-2 pt-2 border-t border-[#EFECE6]">
                      {checks.map((c) => (
                        <div key={c.id} className="p-2 rounded bg-[#FAF8F5] border border-[#EFECE6] space-y-1">
                          <p className="text-[10.5px] font-semibold text-[#181512]">{c.item}</p>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <input
                              placeholder="Medida/valor previsto"
                              value={c.plannedValue || ''}
                              readOnly
                              className="p-1.5 rounded border border-[#D6CFC5] bg-[#F3EFE6] text-[#6B6257]"
                            />
                            <input
                              placeholder="Encontrado"
                              value={c.foundValue || ''}
                              onChange={(e) => updateCheck(key, c.id, { foundValue: e.target.value })}
                              className="p-1.5 rounded border border-[#D6CFC5]"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(['conforme', 'nao_conforme', 'nao_se_aplica'] as QcResult[]).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => updateCheck(key, c.id, { result: r })}
                                className={`px-2 py-1 rounded text-[9.5px] font-semibold border ${
                                  c.result === r
                                    ? r === 'nao_conforme'
                                      ? 'bg-red-700 text-white border-red-700'
                                      : 'bg-[#9A7138] text-white border-[#9A7138]'
                                    : 'bg-white border-[#D6CFC5] text-[#181512]'
                                }`}
                              >
                                {RESULT_LABELS[r]}
                              </button>
                            ))}
                          </div>
                          <input
                            placeholder="Observações"
                            value={c.notes || ''}
                            onChange={(e) => updateCheck(key, c.id, { notes: e.target.value })}
                            className="w-full p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                          />
                          <div className="flex items-center gap-2">
                            <label className="px-2 py-1 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[9px] font-medium text-[#181512] cursor-pointer flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> {uploadingCheckId === c.id ? 'Enviando...' : 'Foto'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(key, c.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            {c.photoId && <img src={c.photoId} alt="" className="w-8 h-8 object-cover rounded border border-[#D6CFC5]" />}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSubmitInspection(p.id, unitIndex, 'aguardando_verificacao', latest?.outcome === 'retrabalho' ? latest.id : undefined)}
                          disabled={isSaving === key}
                          className="px-3 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-xs font-semibold text-[#181512]"
                        >
                          Salvar como Aguardando Verificação
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitInspection(p.id, unitIndex, 'aprovado', latest?.outcome === 'retrabalho' ? latest.id : undefined)}
                          disabled={isSaving === key}
                          className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Tentar Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveInspectionKey(null)}
                          className="px-3 py-1.5 rounded text-xs font-semibold text-[#6B6257] flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
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
