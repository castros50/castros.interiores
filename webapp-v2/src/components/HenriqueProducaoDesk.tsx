import React, { useEffect, useState } from 'react';
import {
  Factory,
  Package,
  ClipboardList,
  History,
  AlertTriangle,
  CheckCircle2,
  Play,
  XCircle,
  Plus,
} from 'lucide-react';
import { HenriqueDepartmentData, ProductionOrder, ProductionOrderPriority, ReadyMadeProduct } from '../types';

const PRIORITY_ORDER: Record<ProductionOrderPriority, number> = {
  Urgente: 0,
  Alta: 1,
  Normal: 2,
};

const PRIORITY_BADGE: Record<ProductionOrderPriority, string> = {
  Urgente: 'bg-red-100 text-red-800 border-red-300',
  Alta: 'bg-amber-100 text-amber-900 border-amber-300',
  Normal: 'bg-stone-100 text-stone-700 border-stone-300',
};

export const HenriqueProducaoDesk: React.FC = () => {
  const [products, setProducts] = useState<ReadyMadeProduct[]>([]);
  const [henriqueData, setHenriqueData] = useState<HenriqueDepartmentData>({ productionOrders: [], stockEntries: [] });
  const [tab, setTab] = useState<'diaria' | 'estoque' | 'concluidas' | 'entradas'>('diaria');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Concluir ordem (quantidade real + quem confirma)
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [completeQuantity, setCompleteQuantity] = useState('');
  const [completeBy, setCompleteBy] = useState('');

  // Ordem manual
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [manualProductId, setManualProductId] = useState('');
  const [manualQuantity, setManualQuantity] = useState('');
  const [manualPriority, setManualPriority] = useState<ProductionOrderPriority>('Normal');
  const [manualReason, setManualReason] = useState('');

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        fetch('/api/juliano/products'),
        fetch('/api/henrique/production-orders'),
      ]);
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      if (!productsRes.ok || !productsData.ok) throw new Error(productsData.error || 'Erro ao carregar o estoque.');
      if (!ordersRes.ok || !ordersData.ok) throw new Error(ordersData.error || 'Erro ao carregar as ordens de produção.');
      setProducts(productsData.products || []);
      setHenriqueData(ordersData.henriqueData || { productionOrders: [], stockEntries: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do Henrique.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openOrders = henriqueData.productionOrders
    .filter((o) => o.status === 'Pendente' || o.status === 'Em Fabricação')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const closedOrders = henriqueData.productionOrders.filter((o) => o.status === 'Concluída' || o.status === 'Cancelada');
  const belowMinProducts = products.filter((p) => p.minStockQuantity != null && p.stockQuantity <= p.minStockQuantity);

  const handleStart = async (order: ProductionOrder) => {
    try {
      const res = await fetch(`/api/henrique/production-orders/${order.id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao iniciar a ordem.');
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao iniciar a ordem.');
    }
  };

  const handleCancel = async (order: ProductionOrder) => {
    if (!window.confirm(`Cancelar a ordem ${order.orderNumber} (${order.productName})?`)) return;
    try {
      const res = await fetch(`/api/henrique/production-orders/${order.id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao cancelar a ordem.');
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cancelar a ordem.');
    }
  };

  const handleComplete = async (order: ProductionOrder) => {
    const qty = parseFloat(completeQuantity);
    if (!qty || qty <= 0) {
      alert('Informe a quantidade efetivamente fabricada.');
      return;
    }
    if (!completeBy.trim()) {
      alert('Informe quem confirma que o produto está pronto.');
      return;
    }
    try {
      const res = await fetch(`/api/henrique/production-orders/${order.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualQuantityProduced: qty, completedBy: completeBy.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao concluir a ordem.');
      setCompletingOrderId(null);
      setCompleteQuantity('');
      setCompleteBy('');
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao concluir a ordem.');
    }
  };

  const handleUpdateProductField = async (product: ReadyMadeProduct, updates: Record<string, string | number | undefined>) => {
    try {
      const res = await fetch(`/api/juliano/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao atualizar o produto.');
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar o produto.');
    }
  };

  const handleCreateManualOrder = async () => {
    const qty = parseFloat(manualQuantity);
    if (!manualProductId || !qty || qty <= 0) {
      alert('Selecione o produto e informe uma quantidade válida.');
      return;
    }
    try {
      const res = await fetch('/api/henrique/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: manualProductId,
          quantityToProduce: qty,
          priority: manualPriority,
          reason: manualReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao criar a ordem.');
      setShowManualOrder(false);
      setManualProductId('');
      setManualQuantity('');
      setManualReason('');
      setManualPriority('Normal');
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar a ordem.');
    }
  };

  return (
    <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif-display font-bold text-[#181512] flex items-center gap-2">
            <Factory className="w-5 h-5 text-amber-700" />
            Henrique — Produção e Controle de Estoque
          </h2>
          <p className="text-xs text-[#6B6257]">
            Mesmo catálogo de produtos prontos do Juliano. Ordens de reposição são geradas sozinhas quando o
            estoque cai no mínimo cadastrado — a entrada no estoque só acontece depois da confirmação de que o
            produto foi fabricado.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#EFECE6] pb-2 flex-wrap">
        {[
          { id: 'diaria' as const, label: `Lista Diária (${openOrders.length})`, icon: ClipboardList },
          { id: 'estoque' as const, label: 'Estoque & Reposição', icon: Package },
          { id: 'concluidas' as const, label: `Concluídas/Canceladas (${closedOrders.length})`, icon: CheckCircle2 },
          { id: 'entradas' as const, label: 'Entradas no Estoque', icon: History },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
              tab === id ? 'bg-[#181512] text-white' : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFE6]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-[#6B6257]">Carregando...</p>
      ) : tab === 'diaria' ? (
        <div className="space-y-3">
          {belowMinProducts.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Atenção:</strong> {belowMinProducts.map((p) => p.name).join(', ')}{' '}
              {belowMinProducts.length === 1 ? 'está' : 'estão'} no ou abaixo do estoque mínimo.
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowManualOrder((v) => !v)}
            className="px-3 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Abrir Ordem de Produção Manual
          </button>

          {showManualOrder && (
            <div className="p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] space-y-2">
              <select
                value={manualProductId}
                onChange={(e) => setManualProductId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
              >
                <option value="">Selecione o produto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (estoque atual: {p.stockQuantity})
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Quantidade a fabricar"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <select
                  value={manualPriority}
                  onChange={(e) => setManualPriority(e.target.value as ProductionOrderPriority)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                >
                  <option value="Normal">Prioridade Normal</option>
                  <option value="Alta">Prioridade Alta</option>
                  <option value="Urgente">Prioridade Urgente</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Motivo (opcional)"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
              />
              <button
                type="button"
                onClick={handleCreateManualOrder}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
              >
                Criar Ordem
              </button>
            </div>
          )}

          <div className="space-y-2">
            {openOrders.length === 0 && (
              <p className="text-xs text-[#6B6257]">Nenhuma ordem pendente ou em fabricação no momento.</p>
            )}
            {openOrders.map((order) => (
              <div key={order.id} className="p-3 rounded-lg border border-[#E5DEC9] bg-white space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-[#181512]">
                      {order.orderNumber} — {order.productName}
                      {order.productCode ? ` [${order.productCode}]` : ''}
                    </p>
                    <p className="text-xs text-[#6B6257]">
                      Quantidade: {order.quantityToProduce}
                      {order.model ? ` | Modelo: ${order.model}` : ''}
                      {order.officialMeasurements &&
                      (order.officialMeasurements.widthCm || order.officialMeasurements.heightCm || order.officialMeasurements.depthCm)
                        ? ` | Medidas: ${[order.officialMeasurements.widthCm, order.officialMeasurements.heightCm, order.officialMeasurements.depthCm]
                            .filter((v) => v)
                            .join('×')} cm`
                        : ''}
                    </p>
                    <p className="text-[10px] text-[#6B6257]">{order.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_BADGE[order.priority]}`}>
                      {order.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-900 border border-sky-300">
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {order.status === 'Pendente' && (
                    <button
                      type="button"
                      onClick={() => handleStart(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Iniciar Fabricação
                    </button>
                  )}
                  {completingOrderId === order.id ? (
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#FAF7F2] border border-[#E5DEC9]">
                      <input
                        type="number"
                        placeholder="Qtd. fabricada"
                        value={completeQuantity}
                        onChange={(e) => setCompleteQuantity(e.target.value)}
                        className="w-28 px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Confirmado por"
                        value={completeBy}
                        onChange={(e) => setCompleteBy(e.target.value)}
                        className="w-32 px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleComplete(order)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                      >
                        Confirmar Entrada no Estoque
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletingOrderId(null)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#D6CFC5] text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCompletingOrderId(order.id);
                        setCompleteQuantity(String(order.quantityToProduce));
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Marcar como Concluída
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCancel(order)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D6CFC5] text-[#57534E] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'estoque' ? (
        <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181512] text-[#F9F6F0]">
                <th className="py-2 px-3">Produto</th>
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Modelo</th>
                <th className="py-2 px-3 text-right">Estoque Atual</th>
                <th className="py-2 px-3 text-right">Mínimo</th>
                <th className="py-2 px-3 text-right">Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              {products.map((p) => {
                const isBelowMin = p.minStockQuantity != null && p.stockQuantity <= p.minStockQuantity;
                return (
                  <tr key={p.id} className={isBelowMin ? 'bg-red-50/50' : ''}>
                    <td className="py-2 px-3 font-semibold text-[#181512]">{p.name}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        defaultValue={p.code || ''}
                        onBlur={(e) => e.target.value !== (p.code || '') && handleUpdateProductField(p, { code: e.target.value })}
                        className="w-20 px-1.5 py-1 rounded border border-[#D6CFC5] text-xs"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        defaultValue={p.model || ''}
                        onBlur={(e) => e.target.value !== (p.model || '') && handleUpdateProductField(p, { model: e.target.value })}
                        className="w-24 px-1.5 py-1 rounded border border-[#D6CFC5] text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{p.stockQuantity}</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        defaultValue={p.minStockQuantity ?? ''}
                        onBlur={(e) =>
                          handleUpdateProductField(p, {
                            minStockQuantity: e.target.value === '' ? undefined : parseFloat(e.target.value),
                          })
                        }
                        className="w-16 px-1.5 py-1 rounded border border-[#D6CFC5] text-right text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        defaultValue={p.targetStockQuantity ?? ''}
                        onBlur={(e) =>
                          handleUpdateProductField(p, {
                            targetStockQuantity: e.target.value === '' ? undefined : parseFloat(e.target.value),
                          })
                        }
                        className="w-16 px-1.5 py-1 rounded border border-[#D6CFC5] text-right text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-3 text-center text-[#6B6257]">
                    Nenhum produto cadastrado ainda (cadastre na mesa do Juliano).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : tab === 'concluidas' ? (
        <div className="space-y-1.5">
          {closedOrders.length === 0 && <p className="text-xs text-[#6B6257]">Nenhuma ordem concluída ou cancelada ainda.</p>}
          {closedOrders.map((o) => (
            <div key={o.id} className="p-2.5 rounded-lg border border-[#E5DEC9] bg-[#FAF7F2] text-xs flex justify-between items-center">
              <span>
                {o.orderNumber} — {o.productName}
                {o.status === 'Concluída' && o.actualQuantityProduced != null ? ` | ${o.actualQuantityProduced} unid. produzidas` : ''}
                {o.status === 'Cancelada' && o.cancelReason ? ` | Motivo: ${o.cancelReason}` : ''}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  o.status === 'Concluída' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-stone-100 text-stone-600 border-stone-300'
                }`}
              >
                {o.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {henriqueData.stockEntries.length === 0 && <p className="text-xs text-[#6B6257]">Nenhuma entrada registrada ainda.</p>}
          {henriqueData.stockEntries.map((e) => (
            <div key={e.id} className="p-2.5 rounded-lg border border-[#E5DEC9] bg-[#FAF7F2] text-xs flex justify-between items-center">
              <span>
                {e.productName} — +{e.quantity} unid. ({new Date(e.enteredAt).toLocaleDateString('pt-BR')})
              </span>
              <span className="text-[#6B6257]">Confirmado por {e.enteredBy || 'não informado'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
