import React, { useState } from 'react';
import { AlertCircle, Check, X, Plus, Trash2, CreditCard } from 'lucide-react';
import { AttendanceRecord, OrderInstallment, PaymentMethod, OrderPaymentStatus } from '../types';
import { formatCurrencyBRL } from '../utils/calculations';

interface OrderNegotiationPanelProps {
  order: AttendanceRecord;
  defaultOperatorName?: string;
  onUpdateOrder: (updated: AttendanceRecord) => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  outro: 'Outro',
};

const STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  combinada: 'Combinada',
  informada_aguardando_confirmacao: 'Informada — aguardando conferência',
  confirmada: 'Confirmada',
};

const STATUS_STYLES: Record<OrderPaymentStatus, string> = {
  combinada: 'bg-stone-100 text-stone-700',
  informada_aguardando_confirmacao: 'bg-amber-100 text-amber-800',
  confirmada: 'bg-emerald-100 text-emerald-800',
};

export const OrderNegotiationPanel: React.FC<OrderNegotiationPanelProps> = ({
  order,
  defaultOperatorName,
  onUpdateOrder,
}) => {
  const itemizedBudget = order.itemizedBudget;
  const negotiation = order.negotiation;

  const [finalPriceCents, setFinalPriceCents] = useState(
    (negotiation?.finalPriceCents ?? itemizedBudget?.totalSellingPriceCents ?? 0) / 100
  );
  const [discountCents, setDiscountCents] = useState((negotiation?.discountCents ?? 0) / 100);
  const [downPaymentAmount, setDownPaymentAmount] = useState((negotiation?.downPayment?.amountCents ?? 0) / 100);
  const [downPaymentMethod, setDownPaymentMethod] = useState<PaymentMethod>(negotiation?.downPayment?.method || 'pix');
  const [balanceMode, setBalanceMode] = useState<'parcelado' | 'integral' | 'na_entrega'>(
    negotiation?.balanceMode || 'integral'
  );
  const [installments, setInstallments] = useState<OrderInstallment[]>(negotiation?.installments || []);
  const [deliveryDate, setDeliveryDate] = useState(negotiation?.deliveryDate || '');
  const [deliveryDateValidatedBy, setDeliveryDateValidatedBy] = useState(negotiation?.deliveryDateValidatedBy || '');

  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [isApprovingException, setIsApprovingException] = useState(false);
  const [exceptionApproverName, setExceptionApproverName] = useState(defaultOperatorName || '');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentTarget, setPaymentTarget] = useState<'entrada' | number>('entrada');
  const [paymentStatus, setPaymentStatus] = useState<OrderPaymentStatus>('informada_aguardando_confirmacao');
  const [paymentRegisteredBy, setPaymentRegisteredBy] = useState(defaultOperatorName || '');
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);

  if (!itemizedBudget) {
    return (
      <div className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] text-xs text-[#6B6257]">
        O orçamento itemizado ainda não foi montado pela Mila — a negociação começa depois de homologado.
      </div>
    );
  }

  const addInstallmentRow = () => {
    setInstallments((prev) => [
      ...prev,
      { index: prev.length + 1, valueCents: 0, dueDate: '', method: 'pix', status: 'combinada' },
    ]);
  };
  const updateInstallment = (idx: number, patch: Partial<OrderInstallment>) => {
    setInstallments((prev) => prev.map((inst, i) => (i === idx ? { ...inst, ...patch } : inst)));
  };
  const removeInstallment = (idx: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== idx).map((inst, i) => ({ ...inst, index: i + 1 })));
  };

  const handleSaveTerms = async () => {
    setIsSavingTerms(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/negotiation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalPriceCents: Math.round(finalPriceCents * 100),
          discountCents: Math.round(discountCents * 100),
          downPayment: downPaymentAmount > 0 ? { amountCents: Math.round(downPaymentAmount * 100), method: downPaymentMethod, status: 'combinada' } : undefined,
          balanceMode,
          installments,
          deliveryDate: deliveryDate || undefined,
          deliveryDateValidatedBy: deliveryDateValidatedBy || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao salvar termos de negociação.');
        return;
      }
      onUpdateOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de comunicação ao salvar negociação.');
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleDecision = async (decision: 'aceito' | 'recusado') => {
    setIsDeciding(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/negotiation/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decidedBy: defaultOperatorName }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao registrar decisão do cliente.');
        return;
      }
      onUpdateOrder(data.order);
    } finally {
      setIsDeciding(false);
    }
  };

  const handleApproveException = async (approved: boolean) => {
    if (!exceptionApproverName.trim()) {
      setError('Informe quem está aprovando/rejeitando a exceção.');
      return;
    }
    setIsApprovingException(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/negotiation/approve-exception`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, approvedBy: exceptionApproverName, notes: exceptionNotes }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao registrar aprovação.');
        return;
      }
      onUpdateOrder(data.order);
    } finally {
      setIsApprovingException(false);
    }
  };

  const handleRegisterPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError('Informe um valor de pagamento maior que zero.');
      return;
    }
    if (!paymentRegisteredBy.trim()) {
      setError('Informe quem está registrando o pagamento.');
      return;
    }
    setIsRegisteringPayment(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(amount * 100),
          paidDate: new Date().toISOString(),
          paymentMethod,
          registeredBy: paymentRegisteredBy,
          targetsDownPayment: paymentTarget === 'entrada',
          installmentIndex: paymentTarget === 'entrada' ? undefined : paymentTarget,
          status: paymentStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setError(data.error || 'Erro ao registrar pagamento.');
        return;
      }
      onUpdateOrder(data.order);
      setPaymentAmount('');
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  const canDecide = negotiation && (!negotiation.requiresOwnerApproval || negotiation.ownerApproval?.approved);
  // Saldo a receber calculado a partir dos lançamentos confirmados de verdade (nunca da
  // estrutura de entrada/parcelas isoladamente, que pode ficar vazia mesmo com dinheiro já
  // recebido — ex.: pagamento integral sem entrada formalmente combinada).
  const confirmedPaidCents = (negotiation?.transactions || [])
    .filter((t) => t.status === 'realizado')
    .reduce((sum, t) => sum + (t.amountPaidCents ?? t.amountCents ?? 0), 0);
  const balanceDueCents = Math.max(0, (negotiation?.finalPriceCents ?? 0) - confirmedPaidCents);

  return (
    <div className="space-y-4">
      {/* Resumo do orçamento homologado */}
      <div className="p-3.5 rounded-lg bg-[#F3EFE6] border border-[#D6CFC5] text-xs space-y-1">
        <p className="font-semibold text-[#181512]">Orçamento homologado por {itemizedBudget.responsibleName || 'Mila'}</p>
        {itemizedBudget.byProduct.map((b) => (
          <p key={b.productId} className="text-[#57534E]">
            {b.productId === 'primary' ? order.furnitureType : order.additionalProducts?.find((p) => p.id === b.productId)?.description || b.productId}: {b.sellingPriceCents != null ? formatCurrencyBRL(b.sellingPriceCents) : 'pendente'}
          </p>
        ))}
        <p className="font-bold text-[#181512]">
          Total homologado: {itemizedBudget.totalSellingPriceCents != null ? formatCurrencyBRL(itemizedBudget.totalSellingPriceCents) : 'pendente'}
        </p>
      </div>

      {/* Termos de negociação */}
      <div className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Termos da Negociação</h4>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <label className="block text-[#57534E] font-medium mb-1">Valor Final (R$)</label>
            <input type="number" value={finalPriceCents} onChange={(e) => setFinalPriceCents(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded border border-[#D6CFC5]" />
          </div>
          <div>
            <label className="block text-[#57534E] font-medium mb-1">Desconto (R$)</label>
            <input type="number" value={discountCents} onChange={(e) => setDiscountCents(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded border border-[#D6CFC5]" />
          </div>
          <div>
            <label className="block text-[#57534E] font-medium mb-1">Entrada (R$)</label>
            <input type="number" value={downPaymentAmount} onChange={(e) => setDownPaymentAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 rounded border border-[#D6CFC5]" />
          </div>
          <div>
            <label className="block text-[#57534E] font-medium mb-1">Forma da Entrada</label>
            <select value={downPaymentMethod} onChange={(e) => setDownPaymentMethod(e.target.value as PaymentMethod)} className="w-full p-2 rounded border border-[#D6CFC5] bg-white">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[#57534E] font-medium mb-1">Saldo</label>
            <div className="flex gap-2">
              {(['parcelado', 'integral', 'na_entrega'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBalanceMode(m)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-semibold border ${
                    balanceMode === m ? 'bg-[#9A7138] text-white border-[#9A7138]' : 'bg-white border-[#D6CFC5] text-[#181512]'
                  }`}
                >
                  {m === 'parcelado' ? 'Parcelado' : m === 'integral' ? 'Pagamento Integral' : 'Saldo na Entrega'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[#57534E] font-medium mb-1">Data de Entrega</label>
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
          </div>
          <div>
            <label className="block text-[#57534E] font-medium mb-1">Validada por</label>
            <input type="text" value={deliveryDateValidatedBy} onChange={(e) => setDeliveryDateValidatedBy(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
          </div>
        </div>

        {balanceMode === 'parcelado' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[#57534E] font-medium text-xs">Parcelas</label>
              <button type="button" onClick={addInstallmentRow} className="text-[10px] font-semibold text-[#9A7138] underline">+ Adicionar parcela</button>
            </div>
            {installments.map((inst, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_28px] gap-1.5 items-center">
                <input type="number" placeholder="Valor (R$)" value={inst.valueCents / 100 || ''} onChange={(e) => updateInstallment(idx, { valueCents: Math.round((parseFloat(e.target.value) || 0) * 100) })} className="p-1.5 rounded border border-[#D6CFC5] text-[11px]" />
                <input type="date" value={inst.dueDate} onChange={(e) => updateInstallment(idx, { dueDate: e.target.value })} className="p-1.5 rounded border border-[#D6CFC5] text-[11px]" />
                <select value={inst.method} onChange={(e) => updateInstallment(idx, { method: e.target.value as PaymentMethod })} className="p-1.5 rounded border border-[#D6CFC5] text-[11px] bg-white">
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeInstallment(idx)} className="p-1 text-[#6B6257] hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={handleSaveTerms} disabled={isSavingTerms} className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold">
          {isSavingTerms ? 'Salvando...' : 'Salvar Termos'}
        </button>
      </div>

      {negotiation?.requiresOwnerApproval && !negotiation.ownerApproval?.approved && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-xs space-y-2">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Fora da política configurada — precisa de aprovação do proprietário antes do aceite.</p>
          <input type="text" value={exceptionApproverName} onChange={(e) => setExceptionApproverName(e.target.value)} placeholder="Nome de quem aprova" className="w-full p-2 rounded border border-amber-300" />
          <input type="text" value={exceptionNotes} onChange={(e) => setExceptionNotes(e.target.value)} placeholder="Observação (opcional)" className="w-full p-2 rounded border border-amber-300" />
          <div className="flex gap-2">
            <button type="button" onClick={() => handleApproveException(true)} disabled={isApprovingException} className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold">Aprovar Exceção</button>
            <button type="button" onClick={() => handleApproveException(false)} disabled={isApprovingException} className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-semibold">Rejeitar</button>
          </div>
        </div>
      )}

      {negotiation && (
        <div className="p-3.5 rounded-lg bg-white border border-[#E5DEC9] text-xs space-y-2">
          <p className="font-semibold text-[#181512]">Decisão do Cliente</p>
          {negotiation.clientDecision ? (
            <p className={negotiation.clientDecision === 'aceito' ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
              {negotiation.clientDecision === 'aceito' ? 'Cliente aceitou' : 'Cliente recusou'} em {negotiation.clientDecisionAt ? new Date(negotiation.clientDecisionAt).toLocaleString('pt-BR') : ''}
            </p>
          ) : (
            <div className="flex gap-2">
              <button type="button" disabled={!canDecide || isDeciding} onClick={() => handleDecision('aceito')} className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Cliente Aceitou</button>
              <button type="button" disabled={!canDecide || isDeciding} onClick={() => handleDecision('recusado')} className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cliente Recusou</button>
            </div>
          )}
        </div>
      )}

      {/* Acompanhamento de pagamento */}
      {negotiation && (
        <div className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512] flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Acompanhamento de Pagamento</h4>

          {negotiation.downPayment && (
            <div className="flex items-center justify-between text-xs p-2 rounded bg-white border border-[#E5DEC9]">
              <span>Entrada: {formatCurrencyBRL(negotiation.downPayment.amountCents)} ({PAYMENT_METHOD_LABELS[negotiation.downPayment.method]})</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[negotiation.downPayment.status]}`}>{STATUS_LABELS[negotiation.downPayment.status]}</span>
            </div>
          )}
          {negotiation.installments.map((inst) => (
            <div key={inst.index} className="flex items-center justify-between text-xs p-2 rounded bg-white border border-[#E5DEC9]">
              <span>Parcela {inst.index}: {formatCurrencyBRL(inst.valueCents)} — venc. {inst.dueDate} ({PAYMENT_METHOD_LABELS[inst.method]})</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[inst.status]}`}>{STATUS_LABELS[inst.status]}</span>
            </div>
          ))}
          <p className="text-xs font-semibold text-[#181512]">Saldo a receber: {formatCurrencyBRL(balanceDueCents)}</p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E5DEC9]">
            <div>
              <label className="block text-[#57534E] font-medium mb-1">Destino</label>
              <select value={String(paymentTarget)} onChange={(e) => setPaymentTarget(e.target.value === 'entrada' ? 'entrada' : parseInt(e.target.value, 10))} className="w-full p-2 rounded border border-[#D6CFC5] bg-white">
                <option value="entrada">Entrada</option>
                {negotiation.installments.map((inst) => (
                  <option key={inst.index} value={inst.index}>Parcela {inst.index}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#57534E] font-medium mb-1">Valor (R$)</label>
              <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
            </div>
            <div>
              <label className="block text-[#57534E] font-medium mb-1">Forma</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full p-2 rounded border border-[#D6CFC5] bg-white">
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#57534E] font-medium mb-1">Status</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as OrderPaymentStatus)} className="w-full p-2 rounded border border-[#D6CFC5] bg-white">
                <option value="informada_aguardando_confirmacao">Informada — aguardando conferência</option>
                <option value="confirmada">Confirmada</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[#57534E] font-medium mb-1">Registrado por</label>
              <input type="text" value={paymentRegisteredBy} onChange={(e) => setPaymentRegisteredBy(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
            </div>
          </div>
          <button type="button" onClick={handleRegisterPayment} disabled={isRegisteringPayment} className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {isRegisteringPayment ? 'Registrando...' : 'Registrar Pagamento'}
          </button>

          {negotiation.transactions.length > 0 && (
            <div className="pt-2 border-t border-[#E5DEC9] space-y-1">
              <p className="text-[10px] font-semibold uppercase text-[#6B6257]">Histórico de lançamentos</p>
              {negotiation.transactions.map((t) => (
                <p key={t.id} className="text-[10px] text-[#57534E]">
                  {t.description}: {formatCurrencyBRL(t.amountCents)} — {t.paymentMethod ? PAYMENT_METHOD_LABELS[t.paymentMethod as PaymentMethod] : ''} — {t.status}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
};
