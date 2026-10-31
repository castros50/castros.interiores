import React, { useState } from 'react';
import {
  MessageSquareText,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Receipt,
  Copy,
  Phone,
  ClipboardList,
} from 'lucide-react';
import { AttendanceRecord, WorkshopSettings, DepartmentId } from '../types';
import { formatCurrencyBRL } from '../utils/calculations';

interface CarlaOrderPanelProps {
  order: AttendanceRecord;
  settings: WorkshopSettings;
  onUpdateOrder: (updated: AttendanceRecord) => void;
  onRequestHandoff: (orderId: string, toDesk: DepartmentId, reason: string) => void;
}

function cleanPhone(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export const CarlaOrderPanel: React.FC<CarlaOrderPanelProps> = ({ order, settings, onUpdateOrder, onRequestHandoff }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintUrgency, setComplaintUrgency] = useState<'normal' | 'urgente'>('normal');
  const [decisionBy, setDecisionBy] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptTxId, setReceiptTxId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [messageCopied, setMessageCopied] = useState(false);

  const isFab = order.orderType === 'Fabricação';
  const budgetConfirmed = isFab
    ? Boolean(order.financialData?.confirmedByResponsible) || order.financialData?.approvedSellingPriceCents != null
    : Boolean(order.budget?.confirmedByResponsible);
  const currentPrice = isFab ? order.financialData?.approvedSellingPriceCents : order.budget?.sellingPriceCents;
  const paymentConditions = isFab ? order.financialData?.paymentConditions : (order.budget?.paymentTerms || order.budget?.paymentConditions);
  const estimatedDeadline = order.budget?.estimatedDeadline;
  const clientDecision = isFab ? order.financialData?.clientDecision : order.budget?.clientDecision;
  const decisionSnapshot = isFab
    ? order.financialData?.clientDecisionPriceCentsSnapshot
    : order.budget?.clientDecisionPriceCentsSnapshot;
  const decisionStale = Boolean(clientDecision) && decisionSnapshot !== undefined && decisionSnapshot !== currentPrice;

  const pendingTransactions = (order.financialData?.transactions || []).filter(
    (t) => t.status !== 'realizado' && t.type === 'receita_cliente'
  );

  const handleBudgetDecision = async (decision: 'aceito' | 'recusado') => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/budget-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decidedBy: decisionBy || undefined, notes: decisionNotes || undefined }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
        setDecisionNotes('');
      } else {
        alert(data.error || 'Erro ao registrar decisão do cliente.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar decisão do cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDesc.trim()) {
      alert('Descreva a reclamação.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: complaintDesc, urgency: complaintUrgency }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
        setComplaintDesc('');
        setComplaintUrgency('normal');
      } else {
        alert(data.error || 'Erro ao registrar reclamação.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar reclamação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateComplaint = async (complaintId: string, status: 'encaminhada' | 'resolvida') => {
    try {
      const res = await fetch(`/api/orders/${order.id}/complaint/${complaintId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttachReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) {
      alert('Selecione a imagem ou PDF do comprovante.');
      return;
    }
    if (!receiptTxId) {
      const amountCents = Math.round(parseFloat(receiptAmount.replace(',', '.')) * 100);
      if (!amountCents || isNaN(amountCents) || amountCents <= 0) {
        alert('Informe o valor do comprovante, ou selecione uma pendência existente para vincular.');
        return;
      }
    }
    setIsSaving(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(receiptFile);
      });
      const uploadRes = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: order.id,
          photoId: `receipt-${Date.now()}`,
          dataUrl,
          mimeType: receiptFile.type,
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) {
        alert(uploadData.error || 'Erro ao enviar o comprovante.');
        return;
      }
      const amountCents = receiptTxId ? undefined : Math.round(parseFloat(receiptAmount.replace(',', '.')) * 100);
      const res = await fetch(`/api/orders/${order.id}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptImageUrl: uploadData.imageUrl,
          receiptMimeType: uploadData.mimeType,
          transactionId: receiptTxId || undefined,
          amountCents,
          description: 'Comprovante recebido via Carla',
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
        setReceiptFile(null);
        setReceiptAmount('');
        setReceiptTxId('');
      } else {
        alert(data.error || 'Erro ao anexar o comprovante.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao anexar o comprovante.');
    } finally {
      setIsSaving(false);
    }
  };

  const readyMessage = (() => {
    const lines: string[] = [];
    lines.push(`Olá, ${order.clientName}! Aqui é da Castros Interiores sobre o atendimento ${order.attendanceNumber}.`);
    if (budgetConfirmed && currentPrice != null) {
      lines.push(`Orçamento aprovado: ${formatCurrencyBRL(currentPrice)}${paymentConditions ? ` — condições: ${paymentConditions}` : ''}.`);
      if (estimatedDeadline) lines.push(`Prazo estimado: ${estimatedDeadline}.`);
    } else {
      lines.push('Seu orçamento ainda está em análise — assim que o responsável confirmar, te avisamos por aqui.');
    }
    lines.push(`Status atual: ${order.deskStatus || 'em andamento'} (mesa: ${order.currentDesk || 'atendimento'}).`);
    lines.push('Qualquer dúvida, é só responder por aqui. Obrigado pela confiança!');
    return lines.join('\n');
  })();

  const handoffTargets: { label: string; desk: DepartmentId; reason: string }[] = [
    { label: 'Encaminhar à Avaliação (Pedro) — reforma', desk: 'pedro_avaliacao', reason: 'Triagem concluída: fotos, medidas e solicitação do cliente prontas para avaliação técnica.' },
    { label: 'Encaminhar aos Projetos (Lucas) — fabricação nova', desk: 'lucas_projetos', reason: 'Referências, medidas e características desejadas coletadas para o projeto.' },
    { label: 'Encaminhar ao Planejamento Técnico (Tapeceiro)', desk: 'tapeceiro_tecnico', reason: 'Dados técnicos disponíveis para cálculo de materiais, mapa de corte e montagem.' },
    { label: 'Encaminhar às Compras (Ana)', desk: 'ana_compras', reason: 'Necessidades técnicas aprovadas, encaminhando para cotação e compras.' },
  ];

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E5DEC9] shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-3 border-b border-[#EFECE6]">
        <ClipboardList className="w-4 h-4 text-[#9A7138]" />
        <h3 className="font-bold text-sm text-[#181512]">Atendimento ao Cliente — {order.attendanceNumber}</h3>
      </div>

      {/* Encaminhamento rápido */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Encaminhar Para</h4>
        <div className="flex flex-wrap gap-2">
          {handoffTargets.map((t) => (
            <button
              key={t.desk}
              type="button"
              onClick={() => onRequestHandoff(order.id, t.desk, t.reason)}
              className="px-3 py-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#E5DEC9] border border-[#D6CFC5] text-xs font-semibold text-[#181512] flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-[#9A7138]" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orçamento e decisão do cliente */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Orçamento e Acompanhamento</h4>
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] text-xs space-y-1.5">
          <p>
            <strong>Preço:</strong>{' '}
            {budgetConfirmed && currentPrice != null ? (
              <span className="text-emerald-800 font-mono font-bold">{formatCurrencyBRL(currentPrice)}</span>
            ) : (
              <span className="text-amber-700 font-semibold">Aguardando aprovação do responsável — não informar valor ao cliente</span>
            )}
          </p>
          <p><strong>Condições:</strong> {budgetConfirmed ? (paymentConditions || 'não informado') : 'pendente de aprovação'}</p>
          <p><strong>Prazo estimado:</strong> {estimatedDeadline || 'ainda não definido'}</p>
          <p><strong>Status na mesa:</strong> {order.deskStatus || 'novo'} ({order.currentDesk || 'atendimento'})</p>

          {clientDecision && (
            <p className={`font-semibold ${clientDecision === 'aceito' ? 'text-emerald-800' : 'text-red-800'}`}>
              Cliente {clientDecision === 'aceito' ? 'aceitou' : 'recusou'} este orçamento.
              {decisionStale && (
                <span className="block text-amber-700 font-normal mt-0.5">
                  ⚠ O preço mudou desde essa decisão — é preciso conferir de novo com o cliente.
                </span>
              )}
            </p>
          )}
        </div>

        {budgetConfirmed && (!clientDecision || decisionStale) && (
          <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
            <input
              type="text"
              value={decisionBy}
              onChange={(e) => setDecisionBy(e.target.value)}
              placeholder="Quem está registrando (opcional)"
              className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
            />
            <input
              type="text"
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Observações (opcional)"
              className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleBudgetDecision('aceito')}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cliente Aceitou
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleBudgetDecision('recusado')}
                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cliente Recusou
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reclamações */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
          Reclamações ({(order.complaints || []).length})
        </h4>
        {(order.complaints || []).length > 0 && (
          <div className="space-y-2">
            {(order.complaints || []).map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${c.urgency === 'urgente' ? 'bg-red-100 text-red-800' : 'bg-[#E5DEC9] text-[#181512]'}`}>
                    {c.urgency}
                  </span>
                  <span className="text-[10px] text-[#6B6257]">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-[#181512]">{c.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase text-[#9A7138]">{c.status}</span>
                  {c.status !== 'resolvida' && (
                    <div className="flex gap-1.5">
                      {c.status === 'aberta' && (
                        <button type="button" onClick={() => handleUpdateComplaint(c.id, 'encaminhada')} className="px-2 py-1 rounded bg-[#181512] text-white text-[10px] font-semibold">
                          Encaminhar
                        </button>
                      )}
                      <button type="button" onClick={() => handleUpdateComplaint(c.id, 'resolvida')} className="px-2 py-1 rounded bg-emerald-700 text-white text-[10px] font-semibold">
                        Marcar Resolvida
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddComplaint} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
          <textarea
            value={complaintDesc}
            onChange={(e) => setComplaintDesc(e.target.value)}
            placeholder="Descreva a reclamação ou o atraso relatado pelo cliente..."
            rows={2}
            className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
          />
          <div className="flex items-center gap-2">
            <select
              value={complaintUrgency}
              onChange={(e) => setComplaintUrgency(e.target.value as 'normal' | 'urgente')}
              className="p-2 rounded border border-[#D6CFC5] text-xs bg-white"
            >
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
            <button type="submit" disabled={isSaving} className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white text-xs font-semibold">
              Registrar Reclamação
            </button>
          </div>
          <p className="text-[10px] text-[#6B6257]">
            Isto só registra a reclamação e encaminha; nenhum reembolso, desconto ou nova data é prometido automaticamente.
          </p>
        </form>
      </div>

      {/* Comprovante */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512] flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-[#9A7138]" />
          Comprovante Recebido do Cliente
        </h4>
        <form onSubmit={handleAttachReceipt} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            className="w-full text-xs"
          />
          {pendingTransactions.length > 0 ? (
            <select
              value={receiptTxId}
              onChange={(e) => setReceiptTxId(e.target.value)}
              className="w-full p-2 rounded border border-[#D6CFC5] text-xs bg-white"
            >
              <option value="">— Vincular a uma pendência existente (recomendado) —</option>
              {pendingTransactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.description} — {formatCurrencyBRL(t.amountCents - (t.amountPaidCents || 0))} pendente
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[10px] text-[#6B6257]">Nenhuma pendência cadastrada neste pedido ainda.</p>
          )}
          {!receiptTxId && (
            <input
              type="text"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(e.target.value)}
              placeholder="Valor do comprovante (R$), se não houver pendência para vincular"
              className="w-full p-2 rounded border border-[#D6CFC5] text-xs"
            />
          )}
          <button type="submit" disabled={isSaving} className="px-3 py-1.5 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-50 text-white text-xs font-semibold">
            Anexar Comprovante
          </button>
          <p className="text-[10px] text-[#6B6257]">
            Anexar o comprovante NÃO confirma o pagamento — a conferência final é feita pela Mila no financeiro.
          </p>
        </form>
      </div>

      {/* Mensagem pronta */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512] flex items-center gap-1.5">
          <MessageSquareText className="w-3.5 h-3.5 text-[#9A7138]" />
          Mensagem Pronta para o Cliente (envio manual)
        </h4>
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
          <pre className="whitespace-pre-wrap text-xs text-[#181512] font-sans">{readyMessage}</pre>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(readyMessage).catch(() => {});
                setMessageCopied(true);
                setTimeout(() => setMessageCopied(false), 2000);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {messageCopied ? 'Copiado!' : 'Copiar Mensagem'}
            </button>
            {order.clientPhone && (
              <a
                href={`https://wa.me/55${cleanPhone(order.clientPhone)}?text=${encodeURIComponent(readyMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                Abrir no WhatsApp (envio manual)
              </a>
            )}
          </div>
          <p className="text-[10px] text-[#6B6257] mt-2">
            O WhatsApp não está integrado para envio automático — isso só abre a conversa com o texto pronto para você revisar e enviar.
          </p>
        </div>
      </div>
    </div>
  );
};
