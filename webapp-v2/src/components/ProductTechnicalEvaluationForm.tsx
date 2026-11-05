import React, { useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { AttendanceRecord, MaterialCatalogItem, ProductMaterialNeed, ProductTechnicalEvaluation } from '../types';

interface ProductTechnicalEvaluationFormProps {
  order: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  defaultEvaluatorName?: string;
  onUpdateOrder: (updated: AttendanceRecord) => void;
  onForwardToMila?: (orderId: string, fromDesk: string) => Promise<void>;
  fromDesk: string;
}

interface ProductRef {
  id: string;
  label: string;
}

function listOrderProducts(order: AttendanceRecord): ProductRef[] {
  const list: ProductRef[] = [{ id: 'primary', label: `${order.furnitureType} (${order.piecesCount})` }];
  for (const p of order.additionalProducts || []) {
    list.push({ id: p.id, label: `${p.description} (${p.quantity})` });
  }
  return list;
}

function emptyMaterial(): ProductMaterialNeed {
  return { name: '', quantity: null, unit: 'un', unitCostCents: null };
}

export const ProductTechnicalEvaluationForm: React.FC<ProductTechnicalEvaluationFormProps> = ({
  order,
  materialsCatalog,
  defaultEvaluatorName,
  onUpdateOrder,
  onForwardToMila,
  fromDesk,
}) => {
  const products = listOrderProducts(order);
  const [drafts, setDrafts] = useState<Record<string, ProductTechnicalEvaluation>>(() => {
    const initial: Record<string, ProductTechnicalEvaluation> = {};
    for (const p of products) {
      initial[p.id] = order.productEvaluations?.[p.id] || {
        productId: p.id,
        servicesNeeded: '',
        materials: [],
        laborHours: null,
        laborCostCents: null,
        estimatedDeadlineDays: null,
      };
    }
    return initial;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDraft = (productId: string, patch: Partial<ProductTechnicalEvaluation>) => {
    setDrafts((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  };

  const updateMaterial = (productId: string, idx: number, patch: Partial<ProductMaterialNeed>) => {
    setDrafts((prev) => {
      const materials = [...(prev[productId].materials || [])];
      materials[idx] = { ...materials[idx], ...patch };
      return { ...prev, [productId]: { ...prev[productId], materials } };
    });
  };

  const addMaterialRow = (productId: string) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], materials: [...(prev[productId].materials || []), emptyMaterial()] },
    }));
  };

  const removeMaterialRow = (productId: string, idx: number) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], materials: prev[productId].materials.filter((_, i) => i !== idx) },
    }));
  };

  const handleSave = async (productId: string) => {
    setSavingId(productId);
    setError(null);
    try {
      const draft = drafts[productId];
      const res = await fetch(`/api/orders/${order.id}/technical-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, productId, evaluatedBy: defaultEvaluatorName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao salvar avaliação técnica.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao salvar avaliação técnica.');
    } finally {
      setSavingId(null);
    }
  };

  const handleForward = async () => {
    if (!onForwardToMila) return;
    setIsForwarding(true);
    setError(null);
    try {
      await onForwardToMila(order.id, fromDesk);
    } finally {
      setIsForwarding(false);
    }
  };

  const materialOptionsListId = `catalog-materials-${order.id}`;

  return (
    <div className="space-y-4">
      <datalist id={materialOptionsListId}>
        {materialsCatalog.map((m) => (
          <option key={m.id} value={m.name} />
        ))}
      </datalist>

      <p className="text-xs text-[#6B6257]">
        Avaliação técnica enxuta por produto — serviços, materiais (com sugestão automática de preço pelo
        catálogo quando o nome bater), mão de obra e prazo estimado. Material sem preço no catálogo fica
        pendente — a Mila nunca inventa esse valor.
      </p>

      {products.map((p) => {
        const draft = drafts[p.id];
        const evaluated = Boolean(order.productEvaluations?.[p.id]?.evaluatedAt);
        return (
          <div key={p.id} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-[#181512]">{p.label}</h4>
              {evaluated && (
                <span className="text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Avaliado
                </span>
              )}
            </div>

            <div>
              <label className="block text-[#57534E] font-medium mb-1 text-xs">Serviços necessários</label>
              <textarea
                value={draft.servicesNeeded}
                onChange={(e) => updateDraft(p.id, { servicesNeeded: e.target.value })}
                rows={2}
                className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
                placeholder="Ex: troca de espuma do assento, reestofamento do encosto..."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[#57534E] font-medium text-xs">Materiais necessários</label>
                <button
                  type="button"
                  onClick={() => addMaterialRow(p.id)}
                  className="text-[10px] font-semibold text-[#9A7138] underline hover:text-[#845E2B]"
                >
                  + Adicionar material
                </button>
              </div>
              {draft.materials.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_60px_28px] gap-1.5 items-center">
                  <input
                    type="text"
                    list={materialOptionsListId}
                    value={m.name}
                    onChange={(e) => updateMaterial(p.id, idx, { name: e.target.value })}
                    placeholder="Nome do material"
                    className="p-1.5 rounded border border-[#D6CFC5] text-[11px]"
                  />
                  <input
                    type="number"
                    value={m.quantity ?? ''}
                    onChange={(e) =>
                      updateMaterial(p.id, idx, { quantity: e.target.value === '' ? null : parseFloat(e.target.value) })
                    }
                    placeholder="Qtd"
                    className="p-1.5 rounded border border-[#D6CFC5] text-[11px]"
                  />
                  <input
                    type="text"
                    value={m.unit}
                    onChange={(e) => updateMaterial(p.id, idx, { unit: e.target.value })}
                    placeholder="un"
                    className="p-1.5 rounded border border-[#D6CFC5] text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeMaterialRow(p.id, idx)}
                    className="p-1 text-[#6B6257] hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {draft.materials.length === 0 && (
                <p className="text-[10px] text-[#6B6257] italic">Nenhum material adicionado ainda.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#57534E] font-medium mb-1 text-xs">Mão de obra (R$)</label>
                <input
                  type="number"
                  value={draft.laborCostCents != null ? (draft.laborCostCents / 100).toFixed(2) : ''}
                  onChange={(e) =>
                    updateDraft(p.id, {
                      laborCostCents: e.target.value === '' ? null : Math.round(parseFloat(e.target.value) * 100),
                    })
                  }
                  className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
              <div>
                <label className="block text-[#57534E] font-medium mb-1 text-xs">Prazo técnico estimado (dias)</label>
                <input
                  type="number"
                  value={draft.estimatedDeadlineDays ?? ''}
                  onChange={(e) =>
                    updateDraft(p.id, {
                      estimatedDeadlineDays: e.target.value === '' ? null : parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(p.id)}
              disabled={savingId === p.id}
              className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold"
            >
              {savingId === p.id ? 'Salvando...' : 'Salvar Avaliação deste Produto'}
            </button>
          </div>
        );
      })}

      {error && <p className="text-xs text-red-700">{error}</p>}

      {onForwardToMila && (
        <button
          type="button"
          onClick={handleForward}
          disabled={isForwarding}
          className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {isForwarding ? 'Encaminhando...' : 'Encaminhar para Mila (Orçamento)'}
        </button>
      )}
    </div>
  );
};
