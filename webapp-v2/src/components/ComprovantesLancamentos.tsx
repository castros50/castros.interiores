import React, { useCallback, useEffect, useState } from 'react';
import {
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Link2,
  Ban,
  PackageCheck,
  ArrowDownLeft,
  Clock,
  Paperclip,
  Undo2,
} from 'lucide-react';
import {
  AttendanceRecord,
  MaterialCatalogItem,
  WorkshopSettings,
  ReceiptDocument,
  ReceiptExtractedData,
  ReceiptKind,
  ReceiptDirection,
  MaterialReceiptEntry,
  FinancialTransaction,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';

interface ComprovantesLancamentosProps {
  attendances: AttendanceRecord[];
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  onOpenOrder?: (orderId: string) => void;
}

const KIND_LABELS: Record<ReceiptKind, string> = {
  comprovante_pagamento: 'Comprovante de Pagamento',
  nota_fiscal: 'Nota Fiscal',
  recibo: 'Recibo',
  outro: 'Outro',
};

const STATUS_LABELS: Record<ReceiptDocument['status'], string> = {
  pendente_analise: 'Pendente de Análise',
  pendente_revisao: 'Pendente de Revisão',
  vinculado: 'Vinculado',
  ignorado: 'Ignorado',
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function centsToReais(cents?: number | null): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function reaisToCents(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100) || 0;
}

export const ComprovantesLancamentos: React.FC<ComprovantesLancamentosProps> = ({
  attendances,
  materialsCatalog,
  settings,
  onOpenOrder,
}) => {
  const [documents, setDocuments] = useState<ReceiptDocument[]>([]);
  const [materialEntries, setMaterialEntries] = useState<MaterialReceiptEntry[]>([]);
  const [contasAReceber, setContasAReceber] = useState<FinancialTransaction[]>([]);
  const [recentConfirmed, setRecentConfirmed] = useState<FinancialTransaction[]>([]);
  const [payingReceivableId, setPayingReceivableId] = useState<string | null>(null);
  const [payingAmount, setPayingAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'pendentes' | 'vinculados' | 'ignorados'>('pendentes');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<'cliente' | 'material' | 'existente' | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<FinancialTransaction[] | null>(null);

  // Rascunho de conferência do documento expandido
  const [draft, setDraft] = useState<ReceiptExtractedData>({});
  const [draftKind, setDraftKind] = useState<ReceiptKind>('outro');
  const [draftDirection, setDraftDirection] = useState<ReceiptDirection>('indefinido');

  // Form: vincular a pagamento de cliente
  const [clientOrderId, setClientOrderId] = useState('');
  const [clientPaidDate, setClientPaidDate] = useState(new Date().toISOString().slice(0, 10));

  // Form: vincular a compra de material
  const [matMaterialId, setMatMaterialId] = useState('');
  const [matQuantity, setMatQuantity] = useState('');
  const [matUnit, setMatUnit] = useState('');
  const [matTotalCost, setMatTotalCost] = useState('');
  const [matMarkPaid, setMatMarkPaid] = useState(true);
  const [matPendingQty, setMatPendingQty] = useState('');
  const [matFoamDensity, setMatFoamDensity] = useState('');
  const [matThickness, setMatThickness] = useState('');
  const [matWidth, setMatWidth] = useState('');
  const [matLength, setMatLength] = useState('');
  const [matPaidDate, setMatPaidDate] = useState(new Date().toISOString().slice(0, 10));

  // Form: anexar a lançamento existente
  const [targetTransactionId, setTargetTransactionId] = useState('');

  const flash = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docsRes, entriesRes, summaryRes] = await Promise.all([
        fetch('/api/receipts'),
        fetch('/api/material-receipts'),
        fetch(`/api/office/financial-summary?month=${new Date().toISOString().slice(0, 7)}`),
      ]);
      const docsData = await docsRes.json();
      const entriesData = await entriesRes.json();
      const summaryData = await summaryRes.json();
      if (docsData.ok) setDocuments(docsData.documents);
      if (entriesData.ok) setMaterialEntries(entriesData.entries);
      if (summaryData.ok) {
        setContasAReceber((summaryData.summary.contasAReceber || []).filter((t: FinancialTransaction) => (t as any).source !== 'fabrica' || t.orderId));
        setRecentConfirmed(
          (summaryData.summary.allTransactions || [])
            .filter((t: FinancialTransaction) => t.type === 'receita_cliente' && t.status === 'realizado' && t.orderId)
            .sort((a: FinancialTransaction, b: FinancialTransaction) => (b.paidDate || '').localeCompare(a.paidDate || ''))
            .slice(0, 8)
        );
      }
    } catch (err) {
      console.error(err);
      setError('Erro de comunicação ao carregar comprovantes e lançamentos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleFiles = async (fileList: FileList | null, kindHint?: ReceiptKind) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const files = await Promise.all(
        Array.from(fileList).map(async (f) => ({
          dataUrl: await fileToDataUrl(f),
          fileName: f.name,
          kindHint,
        }))
      );
      const res = await fetch('/api/receipts/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, uploadedBy: settings.responsibleDefaultName || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        flash(`${data.documents.length} documento(s) recebido(s) e analisado(s).`);
        await loadAll();
      } else {
        setError(data.error || 'Erro ao enviar documentos.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de comunicação ao enviar documentos.');
    } finally {
      setIsUploading(false);
    }
  };

  const openReview = (doc: ReceiptDocument) => {
    setExpandedId(doc.id);
    setLinkMode(null);
    setDuplicateWarning(null);
    const base = doc.reviewed || doc.extracted || {};
    setDraft(base);
    setDraftKind(doc.kind);
    setDraftDirection(doc.direction);
    setClientOrderId('');
    setMatMaterialId('');
    setMatQuantity('');
    setMatTotalCost(base.amountCents != null ? centsToReais(base.amountCents) : '');
    setMatMarkPaid(true);
    setMatPendingQty('');
    setMatFoamDensity('');
    setTargetTransactionId('');
  };

  const saveReview = async (id: string) => {
    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewed: draft,
          kind: draftKind,
          direction: draftDirection,
          actor: settings.responsibleDefaultName || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Dados conferidos e salvos.');
        await loadAll();
      } else {
        alert(data.error || 'Erro ao salvar conferência.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao salvar conferência.');
    }
  };

  const handleDiscard = async (doc: ReceiptDocument) => {
    const reason = window.prompt('Motivo do descarte (ex: ilegível, duplicado, não se aplica):');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/receipts/${doc.id}/discard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, actor: settings.responsibleDefaultName || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Documento descartado.');
        setExpandedId(null);
        await loadAll();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitClientLink = async (confirmDespiteDuplicate: boolean) => {
    if (!expandedId) return;
    if (!clientOrderId) {
      alert('Selecione o pedido/cliente.');
      return;
    }
    try {
      const res = await fetch(`/api/receipts/${expandedId}/link-client-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: clientOrderId,
          amountCents: draft.amountCents,
          description: draft.description,
          paymentMethod: draft.paymentMethod,
          documentNumber: draft.documentNumber,
          paidDate: clientPaidDate,
          actor: settings.responsibleDefaultName || undefined,
          confirmDespiteDuplicate,
        }),
      });
      const data = await res.json();
      if (data.possibleDuplicate) {
        setDuplicateWarning(data.duplicates);
        return;
      }
      if (data.ok) {
        setDuplicateWarning(null);
        flash('Comprovante vinculado ao pedido — aguardando confirmação do recebimento.');
        setExpandedId(null);
        await loadAll();
      } else {
        alert(data.error || 'Erro ao vincular comprovante.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao vincular comprovante.');
    }
  };

  const submitMaterialLink = async (confirmDespiteDuplicate: boolean) => {
    if (!expandedId) return;
    if (!matMaterialId) {
      alert('Selecione o material.');
      return;
    }
    const totalCostCents = reaisToCents(matTotalCost);
    if (!totalCostCents) {
      alert('Informe o valor pago.');
      return;
    }
    try {
      const res = await fetch(`/api/receipts/${expandedId}/link-material-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: matMaterialId,
          quantityReceived: matQuantity ? parseFloat(matQuantity.replace(',', '.')) : 0,
          unit: matUnit || undefined,
          totalCostCents,
          specification: draft.description,
          foamDensity: matFoamDensity || undefined,
          dimensionsMm:
            matThickness || matWidth || matLength
              ? {
                  thickness: matThickness ? parseFloat(matThickness.replace(',', '.')) : undefined,
                  width: matWidth ? parseFloat(matWidth.replace(',', '.')) : undefined,
                  length: matLength ? parseFloat(matLength.replace(',', '.')) : undefined,
                }
              : undefined,
          supplier: draft.payee || undefined,
          paymentMethod: draft.paymentMethod,
          documentNumber: draft.documentNumber,
          paidDate: matPaidDate,
          markPaid: matMarkPaid,
          pendingQuantity: matPendingQty ? parseFloat(matPendingQty.replace(',', '.')) : undefined,
          actor: settings.responsibleDefaultName || undefined,
          confirmDespiteDuplicate,
        }),
      });
      const data = await res.json();
      if (data.possibleDuplicate) {
        setDuplicateWarning(data.duplicates);
        return;
      }
      if (data.ok) {
        setDuplicateWarning(null);
        flash('Compra de material registrada e vinculada.');
        setExpandedId(null);
        await loadAll();
      } else {
        alert(data.error || 'Erro ao vincular compra de material.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao vincular compra de material.');
    }
  };

  const submitAttachExisting = async () => {
    if (!expandedId || !targetTransactionId) {
      alert('Informe o lançamento ao qual anexar este documento.');
      return;
    }
    try {
      const res = await fetch(`/api/receipts/${expandedId}/attach-additional`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTransactionId, actor: settings.responsibleDefaultName || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Documento anexado ao lançamento existente — nenhum valor duplicado.');
        setExpandedId(null);
        await loadAll();
      } else {
        alert(data.error || 'Erro ao anexar documento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao anexar documento.');
    }
  };

  const handleConfirmReceivable = async (t: FinancialTransaction, full: boolean, amountStr?: string) => {
    if (!t.orderId) return;
    const remaining = t.amountCents - (t.amountPaidCents || 0);
    const amountCents = full ? remaining : reaisToCents(amountStr || '');
    if (!amountCents || amountCents <= 0) {
      alert('Informe um valor de recebimento válido.');
      return;
    }
    try {
      const res = await fetch(`/api/orders/${t.orderId}/transactions/${t.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          paidDate: new Date().toISOString().slice(0, 10),
          actor: settings.responsibleDefaultName || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        flash(data.transaction.status === 'realizado' ? 'Recebimento confirmado.' : 'Recebimento parcial confirmado.');
        await loadAll();
      } else {
        alert(data.error || 'Erro ao confirmar recebimento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao confirmar recebimento.');
    }
  };

  const handleReverse = async (t: FinancialTransaction) => {
    const reason = window.prompt('Motivo do estorno:');
    if (!reason || !reason.trim() || !t.orderId) return;
    try {
      const res = await fetch(`/api/orders/${t.orderId}/transactions/${t.id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, actor: settings.responsibleDefaultName || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Lançamento estornado.');
        await loadAll();
      } else {
        alert(data.error || 'Erro ao estornar lançamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao estornar lançamento.');
    }
  };

  const handleCompleteDelivery = async (entry: MaterialReceiptEntry) => {
    const qtyStr = window.prompt(`Quantidade recebida agora (pendente: ${entry.pendingQuantity} ${entry.unit}):`);
    if (!qtyStr) return;
    const qty = parseFloat(qtyStr.replace(',', '.'));
    if (!qty || qty <= 0) return;
    try {
      const res = await fetch(`/api/material-receipts/${entry.id}/complete-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityReceived: qty }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Entrega registrada e estoque atualizado.');
        await loadAll();
      } else {
        alert(data.error || 'Erro ao registrar entrega.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDocuments = documents.filter((d) => {
    if (listFilter === 'pendentes') return d.status === 'pendente_analise' || d.status === 'pendente_revisao';
    if (listFilter === 'vinculados') return d.status === 'vinculado';
    return d.status === 'ignorado';
  });

  const pendingCount = documents.filter((d) => d.status === 'pendente_analise' || d.status === 'pendente_revisao').length;
  const pendingDeliveries = materialEntries.filter((e) => (e.pendingQuantity || 0) > 0);
  const expandedDoc = documents.find((d) => d.id === expandedId);
  const selectedMaterial = materialsCatalog.find((m) => m.id === matMaterialId);
  const isFoamMaterial = selectedMaterial?.rawCategory === 'espumas';

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {actionMessage}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload */}
      <div className="p-4 rounded-xl border border-dashed border-[#C9BFA8] bg-[#FAF8F5] space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512] flex items-center gap-1.5">
          <Upload className="w-4 h-4 text-[#9A7138]" />
          Enviar Comprovantes, Notas Fiscais e Recibos
        </h4>
        <p className="text-xs text-[#6B6257]">
          Envie fotos tiradas pelo celular/tablet ou arquivos (imagem ou PDF), um por um ou em lote. A leitura automática
          prepara os dados para conferência — nenhum lançamento é criado sem você revisar e vincular.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Camera className="w-4 h-4" />
            Tirar Foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <label className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Paperclip className="w-4 h-4" />
            Selecionar Arquivos (lote)
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {isUploading && (
            <span className="text-xs text-[#6B6257] flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Enviando e lendo documento(s)...
            </span>
          )}
        </div>
      </div>

      {/* Valores a receber de clientes (pedidos) — confirmação explícita */}
      <div>
        <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
          Recebimentos de Clientes Pendentes de Confirmação ({contasAReceber.length})
        </h4>
        <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {contasAReceber.length === 0 ? (
            <p className="p-3 text-xs text-[#6B6257]">Nenhum recebimento pendente de confirmação.</p>
          ) : (
            contasAReceber.map((t) => {
              const remaining = t.amountCents - (t.amountPaidCents || 0);
              return (
                <div key={t.id} className="p-3 border-b border-[#EFECE6] last:border-0 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={t.orderId && onOpenOrder ? 'cursor-pointer hover:underline' : ''}
                      onClick={() => t.orderId && onOpenOrder?.(t.orderId)}
                    >
                      <p className="font-medium text-[#181512]">{t.description}</p>
                      <p className="text-[10px] text-[#6B6257]">
                        {t.orderNumber ? `${t.orderNumber} · ${t.clientName}` : ''} · vence {t.dueDate}
                        {t.status === 'parcial' ? ' · recebido parcialmente' : ''}
                        {(t.receiptDocumentIds?.length || t.receiptImageUrl) ? ' · comprovante anexado' : ' · sem comprovante anexado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-800">{formatCurrencyBRL(remaining)}</span>
                      {payingReceivableId !== t.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setPayingReceivableId(t.id); setPayingAmount((remaining / 100).toFixed(2)); }}
                            className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold"
                          >
                            Confirmar Recebimento
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {payingReceivableId === t.id && (
                    <div className="mt-2 flex items-center gap-2 bg-[#FAF8F5] p-2 rounded">
                      <input
                        type="text"
                        value={payingAmount}
                        onChange={(e) => setPayingAmount(e.target.value)}
                        className="w-24 p-1.5 rounded border border-[#D6CFC5] font-mono text-right text-xs"
                      />
                      <button
                        type="button"
                        onClick={async () => { await handleConfirmReceivable(t, false, payingAmount); setPayingReceivableId(null); }}
                        className="px-2 py-1 rounded bg-[#181512] text-white font-semibold text-xs"
                      >
                        Confirmar Valor
                      </button>
                      <button
                        type="button"
                        onClick={async () => { await handleConfirmReceivable(t, true); setPayingReceivableId(null); }}
                        className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold text-xs"
                      >
                        Confirmar Tudo
                      </button>
                      <button type="button" onClick={() => setPayingReceivableId(null)} className="px-2 py-1 text-[#6B6257] text-xs">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recebimentos confirmados recentemente — permite estornar */}
      {recentConfirmed.length > 0 && (
        <div>
          <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Recebimentos Confirmados Recentemente
          </h4>
          <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            {recentConfirmed.map((t) => (
              <div key={t.id} className="p-3 border-b border-[#EFECE6] last:border-0 text-xs flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[#181512]">{t.description}</p>
                  <p className="text-[10px] text-[#6B6257]">
                    {t.orderNumber ? `${t.orderNumber} · ${t.clientName}` : ''} · recebido em {t.paidDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-emerald-800">{formatCurrencyBRL(t.amountCents)}</span>
                  <button
                    type="button"
                    onClick={() => handleReverse(t)}
                    className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Estornar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entregas de material aguardando conclusão */}
      {pendingDeliveries.length > 0 && (
        <div>
          <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Materiais Aguardando Entrega ({pendingDeliveries.length})
          </h4>
          <div className="border border-[#E5DEC9] rounded-xl overflow-hidden">
            {pendingDeliveries.map((e) => {
              const material = materialsCatalog.find((m) => m.id === e.materialId);
              return (
                <div key={e.id} className="p-3 border-b border-[#EFECE6] last:border-0 text-xs flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#181512]">{material?.name || e.materialId}</p>
                    <p className="text-[10px] text-[#6B6257]">
                      Já recebido: {e.quantityReceived} {e.unit} · Pendente: {e.pendingQuantity} {e.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCompleteDelivery(e)}
                    className="px-2 py-1 rounded bg-[#181512] hover:bg-[#2E2722] text-white text-[10px] font-semibold flex items-center gap-1"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    Registrar Chegada
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de documentos */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {([
            ['pendentes', `Pendentes (${pendingCount})`],
            ['vinculados', 'Vinculados'],
            ['ignorados', 'Ignorados'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setListFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                listFilter === key ? 'bg-[#181512] text-white' : 'bg-[#F3EFE6] text-[#57534E]'
              }`}
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={loadAll} className="p-1.5 rounded-lg bg-[#F3EFE6] hover:bg-[#EADFC9] ml-auto">
            <RefreshCw className={`w-3.5 h-3.5 text-[#57534E] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          {filteredDocuments.length === 0 ? (
            <p className="p-3 text-xs text-[#6B6257]">Nenhum documento nesta categoria.</p>
          ) : (
            filteredDocuments.map((doc) => {
              const data = doc.reviewed || doc.extracted;
              const isExpanded = expandedId === doc.id;
              return (
                <div key={doc.id} className="border border-[#E5DEC9] rounded-xl overflow-hidden bg-white">
                  <div
                    className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#FAF7F2]"
                    onClick={() => (isExpanded ? setExpandedId(null) : openReview(doc))}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#9A7138] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#181512] truncate">
                          {doc.fileName || doc.id} · {KIND_LABELS[doc.kind]}
                        </p>
                        <p className="text-[10px] text-[#6B6257]">
                          {data?.amountCents != null ? formatCurrencyBRL(data.amountCents) : 'valor não lido'} ·{' '}
                          {data?.date || 'data não lida'} · enviado {doc.uploadedAt.slice(0, 10)}
                          {doc.possibleDuplicateOf && doc.possibleDuplicateOf.length > 0 ? ' · possível duplicidade' : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                        doc.status === 'vinculado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.status === 'ignorado'
                          ? 'bg-[#E5DEC9] text-[#6B6257]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#EFECE6] p-4 space-y-4">
                      {doc.extractionError && (
                        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                          Falha na leitura automática: {doc.extractionError}. Preencha manualmente abaixo.
                        </div>
                      )}
                      {doc.possibleDuplicateOf && doc.possibleDuplicateOf.length > 0 && (
                        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
                          Parecido com {doc.possibleDuplicateOf.length} documento(s) já enviado(s) — confira antes de vincular.
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Preview do documento */}
                        <div className="rounded-lg overflow-hidden border border-[#E5DEC9] bg-[#F3EFE6] max-h-96 flex items-center justify-center">
                          {doc.mimeType.includes('pdf') ? (
                            <iframe src={doc.fileUrl} title={doc.fileName || doc.id} className="w-full h-96" />
                          ) : (
                            <img src={doc.fileUrl} alt={doc.fileName || doc.id} className="max-h-96 w-full object-contain" />
                          )}
                        </div>

                        {/* Dados conferidos */}
                        <div className="space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Valor (R$)</label>
                              <input
                                type="text"
                                value={draft.amountCents != null ? centsToReais(draft.amountCents) : ''}
                                onChange={(e) => setDraft({ ...draft, amountCents: reaisToCents(e.target.value) })}
                                className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                placeholder="Pendente"
                              />
                            </div>
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Data</label>
                              <input
                                type="date"
                                value={draft.date || ''}
                                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                                className="w-full p-2 rounded border border-[#D6CFC5]"
                              />
                            </div>
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Pagador</label>
                              <input
                                type="text"
                                value={draft.payer || ''}
                                onChange={(e) => setDraft({ ...draft, payer: e.target.value })}
                                className="w-full p-2 rounded border border-[#D6CFC5]"
                                placeholder="Pendente"
                              />
                            </div>
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Recebedor</label>
                              <input
                                type="text"
                                value={draft.payee || ''}
                                onChange={(e) => setDraft({ ...draft, payee: e.target.value })}
                                className="w-full p-2 rounded border border-[#D6CFC5]"
                                placeholder="Pendente"
                              />
                            </div>
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Forma de Pagamento</label>
                              <input
                                type="text"
                                value={draft.paymentMethod || ''}
                                onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value })}
                                className="w-full p-2 rounded border border-[#D6CFC5]"
                                placeholder="Pix, dinheiro..."
                              />
                            </div>
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Nº Documento/Transação</label>
                              <input
                                type="text"
                                value={draft.documentNumber || ''}
                                onChange={(e) => setDraft({ ...draft, documentNumber: e.target.value })}
                                className="w-full p-2 rounded border border-[#D6CFC5]"
                                placeholder="Pendente"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[#57534E] font-medium mb-1">Descrição</label>
                            <input
                              type="text"
                              value={draft.description || ''}
                              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                              className="w-full p-2 rounded border border-[#D6CFC5]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Tipo de Documento</label>
                              <select
                                value={draftKind}
                                onChange={(e) => setDraftKind(e.target.value as ReceiptKind)}
                                className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                              >
                                {Object.entries(KIND_LABELS).map(([k, l]) => (
                                  <option key={k} value={k}>{l}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[#57534E] font-medium mb-1">Direção (lida do conteúdo)</label>
                              <select
                                value={draftDirection}
                                onChange={(e) => setDraftDirection(e.target.value as ReceiptDirection)}
                                className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                              >
                                <option value="indefinido">Indefinido</option>
                                <option value="entrada">Entrada (recebimento)</option>
                                <option value="saida">Saída (pagamento)</option>
                              </select>
                            </div>
                          </div>
                          {(doc.extracted?.missingFields?.length || 0) > 0 && (
                            <p className="text-[10px] text-amber-700">
                              Campos não lidos automaticamente: {doc.extracted!.missingFields!.join(', ')}
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => saveReview(doc.id)}
                              className="px-3 py-1.5 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-[11px]"
                            >
                              Salvar Conferência
                            </button>
                            {doc.status !== 'vinculado' && doc.status !== 'ignorado' && (
                              <button
                                type="button"
                                onClick={() => handleDiscard(doc)}
                                className="px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-[11px] flex items-center gap-1"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Descartar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {doc.status !== 'vinculado' && doc.status !== 'ignorado' && (
                        <div className="pt-2 border-t border-[#EFECE6] space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => { setLinkMode('cliente'); setDuplicateWarning(null); }}
                              className={`px-3 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1 ${
                                linkMode === 'cliente' ? 'bg-emerald-700 text-white' : 'bg-[#F3EFE6] text-[#57534E]'
                              }`}
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Vincular a Pagamento de Cliente
                            </button>
                            <button
                              type="button"
                              onClick={() => { setLinkMode('material'); setDuplicateWarning(null); }}
                              className={`px-3 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1 ${
                                linkMode === 'material' ? 'bg-amber-700 text-white' : 'bg-[#F3EFE6] text-[#57534E]'
                              }`}
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Vincular a Compra de Material
                            </button>
                            <button
                              type="button"
                              onClick={() => { setLinkMode('existente'); setDuplicateWarning(null); }}
                              className={`px-3 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1 ${
                                linkMode === 'existente' ? 'bg-blue-700 text-white' : 'bg-[#F3EFE6] text-[#57534E]'
                              }`}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              Anexar a Lançamento Já Registrado
                            </button>
                          </div>

                          {duplicateWarning && (
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 space-y-2">
                              <div className="flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-4 h-4" />
                                Possível lançamento duplicado
                              </div>
                              <ul className="list-disc list-inside">
                                {duplicateWarning.map((d) => (
                                  <li key={d.id}>{d.description} — {formatCurrencyBRL(d.amountCents)} ({d.dueDate})</li>
                                ))}
                              </ul>
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    linkMode === 'cliente' ? submitClientLink(true) : submitMaterialLink(true)
                                  }
                                  className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold"
                                >
                                  Não é duplicado, vincular mesmo assim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDuplicateWarning(null)}
                                  className="px-3 py-1.5 rounded border border-amber-400 text-amber-900"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {linkMode === 'cliente' && (
                            <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2 text-[11px]">
                              <div>
                                <label className="block text-[#57534E] font-medium mb-1">Pedido / Cliente</label>
                                <select
                                  value={clientOrderId}
                                  onChange={(e) => setClientOrderId(e.target.value)}
                                  className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                                >
                                  <option value="">Selecione...</option>
                                  {attendances
                                    .filter((a) => a.financialData)
                                    .map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.attendanceNumber} — {a.clientName}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[#57534E] font-medium mb-1">Data do Recebimento</label>
                                <input
                                  type="date"
                                  value={clientPaidDate}
                                  onChange={(e) => setClientPaidDate(e.target.value)}
                                  className="w-full p-2 rounded border border-[#D6CFC5]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => submitClientLink(false)}
                                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                              >
                                Vincular Comprovante ao Pedido
                              </button>
                              <p className="text-[10px] text-[#6B6257]">
                                Isto anexa o comprovante e deixa pendente de confirmação — a confirmação do recebimento é
                                feita separadamente na lista "Recebimentos Pendentes de Confirmação" acima.
                              </p>
                            </div>
                          )}

                          {linkMode === 'material' && (
                            <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2 text-[11px]">
                              <div>
                                <label className="block text-[#57534E] font-medium mb-1">Material</label>
                                <select
                                  value={matMaterialId}
                                  onChange={(e) => {
                                    setMatMaterialId(e.target.value);
                                    const m = materialsCatalog.find((mm) => mm.id === e.target.value);
                                    if (m) setMatUnit(m.unit);
                                  }}
                                  className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                                >
                                  <option value="">Selecione...</option>
                                  {materialsCatalog.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[#57534E] font-medium mb-1">Qtd. Recebida</label>
                                  <input
                                    type="text"
                                    value={matQuantity}
                                    onChange={(e) => setMatQuantity(e.target.value)}
                                    placeholder="0 = aguardando"
                                    className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[#57534E] font-medium mb-1">Unidade</label>
                                  <input
                                    type="text"
                                    value={matUnit}
                                    onChange={(e) => setMatUnit(e.target.value)}
                                    className="w-full p-2 rounded border border-[#D6CFC5]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[#57534E] font-medium mb-1">Qtd. Pendente</label>
                                  <input
                                    type="text"
                                    value={matPendingQty}
                                    onChange={(e) => setMatPendingQty(e.target.value)}
                                    placeholder="0"
                                    className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[#57534E] font-medium mb-1">Valor Pago (R$)</label>
                                  <input
                                    type="text"
                                    value={matTotalCost}
                                    onChange={(e) => setMatTotalCost(e.target.value)}
                                    className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[#57534E] font-medium mb-1">Data do Pagamento</label>
                                  <input
                                    type="date"
                                    value={matPaidDate}
                                    onChange={(e) => setMatPaidDate(e.target.value)}
                                    className="w-full p-2 rounded border border-[#D6CFC5]"
                                  />
                                </div>
                              </div>
                              {isFoamMaterial && (
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[#57534E] font-medium mb-1">Densidade</label>
                                    <input
                                      type="text"
                                      value={matFoamDensity}
                                      onChange={(e) => setMatFoamDensity(e.target.value)}
                                      placeholder="D28, D33..."
                                      className="w-full p-2 rounded border border-[#D6CFC5]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[#57534E] font-medium mb-1">Espessura (mm)</label>
                                    <input
                                      type="text"
                                      value={matThickness}
                                      onChange={(e) => setMatThickness(e.target.value)}
                                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[#57534E] font-medium mb-1">Largura (mm)</label>
                                    <input
                                      type="text"
                                      value={matWidth}
                                      onChange={(e) => setMatWidth(e.target.value)}
                                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                    />
                                  </div>
                                </div>
                              )}
                              <label className="flex items-center gap-2 text-[#181512] font-medium">
                                <input type="checkbox" checked={matMarkPaid} onChange={(e) => setMatMarkPaid(e.target.checked)} />
                                Pagamento já realizado (senão fica "previsto")
                              </label>
                              <button
                                type="button"
                                onClick={() => submitMaterialLink(false)}
                                className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold"
                              >
                                Registrar Compra e Vincular
                              </button>
                            </div>
                          )}

                          {linkMode === 'existente' && (
                            <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] space-y-2 text-[11px]">
                              <div>
                                <label className="block text-[#57534E] font-medium mb-1">ID do Lançamento Já Registrado</label>
                                <input
                                  type="text"
                                  value={targetTransactionId}
                                  onChange={(e) => setTargetTransactionId(e.target.value)}
                                  placeholder="Ex: gt-1699999999999 ou tx-1699999999999"
                                  className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={submitAttachExisting}
                                className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold"
                              >
                                Anexar Sem Duplicar
                              </button>
                              <p className="text-[10px] text-[#6B6257]">
                                Use quando o pagamento ou recebimento de material já foi registrado (ex.: a nota fiscal chegou
                                depois do Pix já lançado) — só anexa o documento, não soma o valor de novo.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {doc.status === 'vinculado' && (
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Vinculado{doc.linkedOrderId ? ` ao pedido (clique para abrir)` : ''}.
                          {doc.linkedOrderId && onOpenOrder && (
                            <button type="button" onClick={() => onOpenOrder(doc.linkedOrderId!)} className="underline ml-1">
                              Abrir pedido
                            </button>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#EFECE6]">
                        <p className="text-[10px] font-bold uppercase text-[#6B6257] mb-1">Histórico</p>
                        <ul className="text-[10px] text-[#6B6257] space-y-0.5 max-h-24 overflow-y-auto">
                          {doc.history.slice().reverse().map((h, idx) => (
                            <li key={idx}>
                              {h.timestamp.slice(0, 16).replace('T', ' ')} — {h.action}
                              {h.notes ? ` (${h.notes})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
