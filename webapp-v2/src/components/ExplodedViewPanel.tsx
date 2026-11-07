import React, { useState } from 'react';
import { Sparkles, Printer, Download, Send, Check, X, Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import {
  AttendanceRecord,
  WorkshopSettings,
  ExplodedViewSimulation,
  ExplodedViewComponentLabel,
  EXPLODED_VIEW_SIMULATION_CAPTION,
} from '../types';
import { generateExplodedViewPdf } from '../utils/pdfGenerator';

interface ExplodedViewPanelProps {
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

const STATUS_LABELS: Record<ExplodedViewSimulation['status'], string> = {
  gerada: 'Gerada (pendente de revisão)',
  rejeitada: 'Rejeitada',
  aprovada: 'Aprovada',
};
const STATUS_STYLES: Record<ExplodedViewSimulation['status'], string> = {
  gerada: 'bg-amber-100 text-amber-900 border-amber-300',
  rejeitada: 'bg-red-100 text-red-900 border-red-300',
  aprovada: 'bg-emerald-100 text-emerald-900 border-emerald-300',
};

export const ExplodedViewPanel: React.FC<ExplodedViewPanelProps> = ({
  order,
  settings,
  defaultResponsibleName,
  onUpdateOrder,
}) => {
  const products = listOrderProductsLocal(order);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || 'primary');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, ExplodedViewComponentLabel[]>>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState('');

  const photosForProduct = order.photos.filter((p) =>
    selectedProductId === 'primary' ? !p.productId : p.productId === selectedProductId
  );

  const togglePhoto = (photoId: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedPhotoIds.size === 0) {
      setError('Selecione ao menos uma foto de referência antes de gerar.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/exploded-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          unitIndex: 1,
          sourcePhotoIds: Array.from(selectedPhotoIds),
          createdBy: defaultResponsibleName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao gerar vista explodida.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao gerar vista explodida.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getLabels = (sim: ExplodedViewSimulation): ExplodedViewComponentLabel[] =>
    labelDrafts[sim.id] || sim.componentLabels;

  const openLabelsEditor = (sim: ExplodedViewSimulation) => {
    setLabelDrafts((prev) => ({ ...prev, [sim.id]: prev[sim.id] || sim.componentLabels.map((c) => ({ ...c })) }));
  };

  const addLabel = (sim: ExplodedViewSimulation) => {
    openLabelsEditor(sim);
    setLabelDrafts((prev) => {
      const list = prev[sim.id] || sim.componentLabels.map((c) => ({ ...c }));
      const nextNumber = list.length > 0 ? Math.max(...list.map((l) => l.number)) + 1 : 1;
      return {
        ...prev,
        [sim.id]: [...list, { id: `label-${Date.now()}`, number: nextNumber, name: '', isHypothesis: false }],
      };
    });
  };

  const updateLabel = (simId: string, labelId: string, patch: Partial<ExplodedViewComponentLabel>) => {
    setLabelDrafts((prev) => ({
      ...prev,
      [simId]: (prev[simId] || []).map((l) => (l.id === labelId ? { ...l, ...patch } : l)),
    }));
  };

  const removeLabel = (simId: string, labelId: string) => {
    setLabelDrafts((prev) => ({ ...prev, [simId]: (prev[simId] || []).filter((l) => l.id !== labelId) }));
  };

  const handleSaveLabels = async (sim: ExplodedViewSimulation) => {
    setIsSaving(sim.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/exploded-view/${sim.id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentLabels: labelDrafts[sim.id] || sim.componentLabels }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao salvar numeração dos componentes.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao salvar numeração.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleReject = async (sim: ExplodedViewSimulation) => {
    if (!rejectReasonDraft.trim()) {
      setError('Informe o motivo da rejeição.');
      return;
    }
    setIsSaving(sim.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/exploded-view/${sim.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReasonDraft }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao rejeitar vista explodida.');
        return;
      }
      onUpdateOrder(data.order);
      setShowRejectForm(null);
      setRejectReasonDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao rejeitar.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleApprove = async (sim: ExplodedViewSimulation) => {
    setIsSaving(sim.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/exploded-view/${sim.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: defaultResponsibleName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao salvar versão.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao salvar versão.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleForward = async (sim: ExplodedViewSimulation) => {
    setIsSaving(sim.id);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/exploded-view/${sim.id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forwardedBy: defaultResponsibleName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao encaminhar vista explodida.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao encaminhar.');
    } finally {
      setIsSaving(null);
    }
  };

  const simulationsForProduct = (order.explodedViewSimulations || [])
    .filter((s) => s.productId === selectedProductId)
    .sort((a, b) => b.version - a.version);
  const latest = simulationsForProduct[0];
  const olderVersions = simulationsForProduct.slice(1);

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#6B6257]">
        Simulação ilustrativa gerada por IA a partir das fotos reais do produto, só para localizar e organizar os
        componentes antes da conferência — nunca confirma condição interna nem substitui a ficha de visita técnica
        ou a inspeção pós-desmontagem.
      </p>

      <div className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
        <select
          value={selectedProductId}
          onChange={(e) => {
            setSelectedProductId(e.target.value);
            setSelectedPhotoIds(new Set());
          }}
          className="w-full text-xs border border-[#D9CBAE] rounded-lg px-2 py-1.5 bg-white"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <div>
          <p className="text-[10px] font-semibold uppercase text-[#6B6257] mb-1.5">
            Selecione as fotos de referência ({selectedPhotoIds.size} selecionada{selectedPhotoIds.size !== 1 ? 's' : ''})
          </p>
          {photosForProduct.length === 0 ? (
            <p className="text-[11px] text-[#6B6257] italic">Nenhuma foto vinculada a este produto ainda.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {photosForProduct.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => togglePhoto(photo.id)}
                  className={`relative rounded-lg overflow-hidden border-2 ${
                    selectedPhotoIds.has(photo.id) ? 'border-[#9A7138]' : 'border-transparent'
                  }`}
                >
                  <img src={photo.imageUrl} alt={photo.code} className="w-full h-16 object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5">
                    {photo.code}
                  </span>
                  {selectedPhotoIds.has(photo.id) && (
                    <span className="absolute top-0.5 right-0.5 bg-[#9A7138] rounded-full p-0.5">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || selectedPhotoIds.size === 0}
          className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isGenerating ? 'Gerando...' : latest ? 'Gerar Nova Versão' : 'Gerar Vista Explodida'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-700 flex items-center gap-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      {latest && (
        <div className="p-4 rounded-xl border border-[#E5DEC9] bg-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#181512]">Versão v{latest.version}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[latest.status]}`}>
                {STATUS_LABELS[latest.status]}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={latest.generatedImageUrl}
                download
                className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Baixar imagem
              </a>
              <button
                type="button"
                onClick={() => generateExplodedViewPdf(order, latest, settings)}
                className="px-2.5 py-1.5 rounded border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] text-[10px] font-medium text-[#181512] flex items-center gap-1"
              >
                <Printer className="w-3 h-3" /> PDF A4
              </button>
            </div>
          </div>

          {latest.generatedImageUrl ? (
            <div className="space-y-1.5">
              <img
                src={latest.generatedImageUrl}
                alt="Vista explodida simulada"
                className="w-full max-w-md rounded-lg border border-[#D6CFC5]"
              />
              <p className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded px-2 py-1 inline-block">
                {EXPLODED_VIEW_SIMULATION_CAPTION}
              </p>
            </div>
          ) : (
            <p className="text-xs text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {latest.generationError || 'Geração não concluída.'}
            </p>
          )}

          {latest.rejectedReason && (
            <p className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              Rejeitada: {latest.rejectedReason}
            </p>
          )}

          <div className="space-y-2 pt-2 border-t border-[#EFECE6]">
            <p className="text-[10px] font-semibold uppercase text-[#6B6257]">Numerar e identificar componentes</p>
            {getLabels(latest).map((label) => (
              <div key={label.id} className="grid grid-cols-[32px_1fr_auto_28px] gap-1.5 items-center">
                <input
                  type="number"
                  value={label.number}
                  onChange={(e) => updateLabel(latest.id, label.id, { number: parseInt(e.target.value, 10) || 0 })}
                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px] text-center"
                />
                <input
                  placeholder="Nome do componente"
                  value={label.name}
                  onChange={(e) => updateLabel(latest.id, label.id, { name: e.target.value })}
                  className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                />
                <label className="flex items-center gap-1 text-[9.5px] text-[#57534E] whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={label.isHypothesis}
                    onChange={(e) => updateLabel(latest.id, label.id, { isHypothesis: e.target.checked })}
                  />
                  Hipótese ilustrativa
                </label>
                <button type="button" onClick={() => removeLabel(latest.id, label.id)} className="p-1 text-[#6B6257] hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addLabel(latest)}
                className="text-[10px] font-semibold text-[#9A7138] underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar componente
              </button>
              <button
                type="button"
                onClick={() => handleSaveLabels(latest)}
                disabled={isSaving === latest.id}
                className="px-2.5 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-[10px] font-semibold"
              >
                Salvar numeração
              </button>
            </div>
          </div>

          {latest.status !== 'aprovada' && latest.generatedImageUrl && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EFECE6]">
              <button
                type="button"
                onClick={() => handleApprove(latest)}
                disabled={isSaving === latest.id}
                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Aprovar / Salvar Versão
              </button>
              {showRejectForm === latest.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    placeholder="Motivo da rejeição"
                    value={rejectReasonDraft}
                    onChange={(e) => setRejectReasonDraft(e.target.value)}
                    className="p-1.5 rounded border border-[#D6CFC5] text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleReject(latest)}
                    disabled={isSaving === latest.id}
                    className="px-2.5 py-1.5 rounded bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-[10px] font-semibold"
                  >
                    Confirmar rejeição
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRejectForm(latest.id)}
                  className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Rejeitar e Gerar Novamente
                </button>
              )}
            </div>
          )}

          {latest.status === 'aprovada' && (
            <div className="pt-2 border-t border-[#EFECE6]">
              {latest.forwardedAt ? (
                <p className="text-[11px] text-emerald-800">
                  Encaminhada à Carla e ao Pedro em {new Date(latest.forwardedAt).toLocaleString('pt-BR')}, junto com as{' '}
                  {latest.sourcePhotoIds.length} foto(s) original(is).
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleForward(latest)}
                  disabled={isSaving === latest.id}
                  className="px-3 py-1.5 rounded bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Encaminhar à Carla e ao Pedro
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {olderVersions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase text-[#6B6257]">Versões anteriores</p>
          {olderVersions.map((sim) => (
            <div key={sim.id} className="flex items-center gap-2 text-[10px] text-[#6B6257]">
              <span className={`px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[sim.status]}`}>v{sim.version}</span>
              <span>{STATUS_LABELS[sim.status]}</span>
              {sim.rejectedReason && <span className="italic">— {sim.rejectedReason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
