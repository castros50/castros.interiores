import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  HelpCircle,
  Percent,
} from 'lucide-react';
import {
  AttendanceRecord,
  FinancialTransaction,
  OrderFinancialData,
  MaterialCatalogItem,
  WorkshopSettings,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';
import { generateClientReportPdf, generateInternalReportPdf } from '../utils/pdfGenerator';

interface MilaFinancialDeskProps {
  order: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  onUpdateOrder: (updated: AttendanceRecord) => void;
  onRequestHandoff: (orderId: string, toDesk: string, reason: string) => void;
}

export const MilaFinancialDesk: React.FC<MilaFinancialDeskProps> = ({
  order,
  materialsCatalog,
  settings,
  onUpdateOrder,
  onRequestHandoff,
}) => {
  const [activeTab, setActiveTab] = useState<'formacao' | 'transacoes' | 'fluxo'>('formacao');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Formulário de nova transação
  const [newType, setNewType] = useState<'receita_cliente' | 'despesa_material' | 'despesa_mao_de_obra' | 'despesa_frete' | 'retirada_proprietario'>('receita_cliente');
  const [newAmountReais, setNewAmountReais] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatus, setNewStatus] = useState<'previsto' | 'realizado'>('realizado');

  const fin: OrderFinancialData = order.financialData || {
    pricingMethod: 'margem_sobre_venda',
    costDirectCents: 0,
    overheadShareCents: 0,
    ownerLaborCents: 0,
    logisticsFreightCents: 0,
    taxesPercent: 0,
    totalCalculatedCostCents: 0,
    suggestedSellingPriceCents: 0,
    approvedSellingPriceCents: null,
    confirmedByResponsible: false,
    targetMarginPercent: 25,
    markupPercent: 35,
    discountsCents: 0,
    paymentConditions: '50% entrada e 50% na entrega',
    transactions: [],
    totalPaidCents: 0,
    remainingBalanceCents: 0,
    notes: '',
  };

  const handleSaveFinancial = async (updates: Partial<OrderFinancialData>) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/orders/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          financialUpdates: updates,
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao salvar dados financeiros:', err);
      alert('Erro ao salvar dados financeiros.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(newAmountReais.replace(',', '.')) * 100);
    if (!amountCents || isNaN(amountCents)) {
      alert('Informe um valor válido.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/orders/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          newTransaction: {
            type: newType,
            category: newType === 'receita_cliente' ? 'receita' : 'despesa',
            amountCents,
            status: newStatus,
            dueDate: newDueDate || new Date().toISOString().split('T')[0],
            paidDate: newStatus === 'realizado' ? new Date().toISOString().split('T')[0] : undefined,
            description: newDesc || (newType === 'receita_cliente' ? 'Recebimento de cliente' : 'Pagamento de despesa'),
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
        setNewAmountReais('');
        setNewDesc('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao adicionar transação:', err);
      alert('Erro ao registrar lançamento financeiro.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeSellingPrice =
    fin.approvedSellingPriceCents !== null && fin.approvedSellingPriceCents !== undefined
      ? fin.approvedSellingPriceCents
      : fin.suggestedSellingPriceCents;

  const totalRevenueRealized = fin.transactions
    .filter((t) => t.type === 'receita_cliente' && t.status === 'realizado')
    .reduce((sum, t) => sum + t.amountCents, 0);

  const totalExpenseRealized = fin.transactions
    .filter((t) => t.type !== 'receita_cliente' && t.status === 'realizado')
    .reduce((sum, t) => sum + t.amountCents, 0);

  const realizedCashBalance = totalRevenueRealized - totalExpenseRealized;

  return (
    <div className="bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden">
      {/* Header da Mesa Financeira */}
      <div className="bg-[#181512] text-[#F9F6F0] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1F5E3B] flex items-center justify-center text-white shrink-0 shadow">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#E5DEC9] border border-[#57534E]">
                  Mesa 5 — Administração Financeira
                </span>
                <span className="text-xs text-[#E5DEC9]">
                  Responsável: <strong>Mila</strong>
                </span>
                {fin.confirmedByResponsible ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Orçamento Homologado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Aguardando Aprovação do Responsável
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif-display font-bold text-white mt-1">
                Controle Financeiro & Formação de Preço
              </h2>
              <p className="text-xs text-[#D6CFC5] mt-0.5">
                Pedido: <strong>{order.attendanceNumber}</strong> | Cliente:{' '}
                <strong>{order.clientName}</strong> | Preço Ativo:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrencyBRL(activeSellingPrice)}
                </strong>{' '}
                | Recebido Real:{' '}
                <strong className="text-white font-mono">
                  {formatCurrencyBRL(totalRevenueRealized)}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => generateClientReportPdf(order, settings)}
              className="px-3 py-2 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-medium text-white flex items-center gap-1.5 border border-[#57534E]"
            >
              <Download className="w-4 h-4 text-[#E5DEC9]" />
              PDF Orçamento Cliente
            </button>
            <button
              type="button"
              onClick={() => generateInternalReportPdf(order, settings)}
              className="px-3 py-2 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-medium text-white flex items-center gap-1.5 border border-[#57534E]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              PDF Financeiro Interno
            </button>
            <button
              type="button"
              onClick={() =>
                onRequestHandoff(
                  order.id,
                  'castro_estrategia',
                  'Financeiro consolidado por Mila, pronto para revisão estratégica'
                )
              }
              className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5 shadow"
            >
              <Send className="w-4 h-4" />
              Encaminhar p/ Castro
            </button>
          </div>
        </div>

        {/* Alerta de Rigor Contábil */}
        <div className="mt-4 p-3 rounded-lg bg-[#2E2722] border border-[#57534E] text-xs flex items-start gap-2.5 text-[#E5DEC9]">
          <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Diretriz Contábil Mila:</strong> Orçamento aprovado NÃO equivale a dinheiro
            recebido. Compra de estoque para o galpão e consumo de material na peça são calculados separadamente
            para não duplicar despesas. Retiradas do proprietário são segregadas de custos operacionais.
          </div>
        </div>
      </div>

      {/* Tabs da Mesa Financeira */}
      <div className="border-b border-[#E5DEC9] bg-[#FAF8F5] px-6 flex flex-wrap gap-2 pt-3">
        {[
          { id: 'formacao', label: '1. Formação de Preço & Custos' },
          { id: 'transacoes', label: `2. Lançamentos & Parcelas (${fin.transactions.length})` },
          { id: 'fluxo', label: '3. Fluxo de Caixa: Previsto vs Realizado' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
              activeTab === t.id
                ? 'bg-white border-[#E5DEC9] border-b-white text-[#181512] -mb-px'
                : 'border-transparent text-[#6B6257] hover:text-[#181512] hover:bg-[#F3EFE6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Cálculos financeiros da Agente Mila recalculados e gravados com sucesso.
          </div>
        )}

        {/* ABA 1: FORMAÇÃO DE PREÇO */}
        {activeTab === 'formacao' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-[11px] text-[#6B6257] uppercase font-semibold">Custo Total Calculado</span>
                <p className="text-xl font-bold font-mono text-[#181512] mt-1">
                  {formatCurrencyBRL(fin.totalCalculatedCostCents)}
                </p>
                <span className="text-[10px] text-[#6B6257]">Direto + Indireto + Mão de Obra + Frete</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200">
                <span className="text-[11px] text-purple-900 uppercase font-semibold">Preço Sugerido (Fórmula)</span>
                <p className="text-xl font-bold font-mono text-purple-900 mt-1">
                  {formatCurrencyBRL(fin.suggestedSellingPriceCents)}
                </p>
                <span className="text-[10px] text-purple-700">
                  Método: {fin.pricingMethod === 'margem_sobre_venda' ? 'Margem s/ Venda' : 'Markup s/ Custo'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-900 uppercase font-semibold">Preço Aprovado / Ativo</span>
                <p className="text-xl font-bold font-mono text-emerald-900 mt-1">
                  {formatCurrencyBRL(activeSellingPrice)}
                </p>
                <span className="text-[10px] text-emerald-700">
                  {fin.confirmedByResponsible ? 'Validado pelo responsável' : 'Pendente de homologação'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[11px] text-amber-900 uppercase font-semibold">Saldo Devedor do Cliente</span>
                <p className="text-xl font-bold font-mono text-amber-900 mt-1">
                  {formatCurrencyBRL(fin.remainingBalanceCents)}
                </p>
                <span className="text-[10px] text-amber-800">
                  {formatCurrencyBRL(totalRevenueRealized)} já recebidos
                </span>
              </div>
            </div>

            {/* Painel de Configuração de Formação de Preço */}
            <div className="p-5 rounded-xl border border-[#E5DEC9] bg-white space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#EFECE6]">
                <div>
                  <h3 className="font-bold text-sm text-[#181512]">
                    Regras de Precificação & Rateio de Custos
                  </h3>
                  <p className="text-xs text-[#6B6257]">
                    Altere os parâmetros e a fórmula matemática recalcula os resultados automaticamente.
                  </p>
                </div>

                {/* Seletor de Método */}
                <div className="flex items-center gap-2 bg-[#F3EFE6] p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleSaveFinancial({ pricingMethod: 'margem_sobre_venda' })}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      fin.pricingMethod === 'margem_sobre_venda'
                        ? 'bg-[#181512] text-white shadow'
                        : 'text-[#6B6257] hover:text-[#181512]'
                    }`}
                  >
                    Margem sobre Venda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveFinancial({ pricingMethod: 'markup_sobre_custo' })}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${
                      fin.pricingMethod === 'markup_sobre_custo'
                        ? 'bg-[#181512] text-white shadow'
                        : 'text-[#6B6257] hover:text-[#181512]'
                    }`}
                  >
                    Markup sobre Custo
                  </button>
                </div>
              </div>

              {/* Linhas de Custo Detalhadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Custo Direto de Materiais (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(((fin.costDirectCents || 0)) / 100).toFixed(2)}
                    onChange={(e) =>
                      handleSaveFinancial({ costDirectCents: Math.round(parseFloat(e.target.value || '0') * 100) })
                    }
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] font-mono tabular-nums"
                  />
                  <span className="text-[10px] text-[#6B6257]">Tecido, espuma, madeira, insumos</span>
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Mão de Obra do Proprietário (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(((fin.ownerLaborCents || 0)) / 100).toFixed(2)}
                    onChange={(e) =>
                      handleSaveFinancial({ ownerLaborCents: Math.round(parseFloat(e.target.value || '0') * 100) })
                    }
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] font-mono tabular-nums"
                  />
                  <span className="text-[10px] text-[#6B6257]">Classificação separada de lucro</span>
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Rateio de Custos Fixos / Indiretos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(((fin.overheadShareCents || 0)) / 100).toFixed(2)}
                    onChange={(e) =>
                      handleSaveFinancial({ overheadShareCents: Math.round(parseFloat(e.target.value || '0') * 100) })
                    }
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] font-mono tabular-nums"
                  />
                  <span className="text-[10px] text-[#6B6257]">Energia, aluguel, manutenção oficina</span>
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Logística / Transporte (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(((fin.logisticsFreightCents || 0)) / 100).toFixed(2)}
                    onChange={(e) =>
                      handleSaveFinancial({ logisticsFreightCents: Math.round(parseFloat(e.target.value || '0') * 100) })
                    }
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] font-mono tabular-nums"
                  />
                  <span className="text-[10px] text-[#6B6257]">Coleta e entrega do estofado</span>
                </div>
              </div>

              {/* Margens e Impostos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">
                    {fin.pricingMethod === 'margem_sobre_venda'
                      ? 'Margem de Lucro Desejada (% s/ Venda)'
                      : 'Markup sobre o Custo (%)'}
                  </label>
                  <input
                    type="number"
                    value={
                      fin.pricingMethod === 'margem_sobre_venda'
                        ? fin.targetMarginPercent || 25
                        : fin.markupPercent || 35
                    }
                    onChange={(e) =>
                      handleSaveFinancial(
                        fin.pricingMethod === 'margem_sobre_venda'
                          ? { targetMarginPercent: parseFloat(e.target.value || '0') }
                          : { markupPercent: parseFloat(e.target.value || '0') }
                      )
                    }
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Alíquota de Tributos / Taxas (%)</label>
                  <input
                    type="number"
                    value={fin.taxesPercent || 0}
                    onChange={(e) =>
                      handleSaveFinancial({ taxesPercent: parseFloat(e.target.value || '0') })
                    }
                    className="w-full p-2 rounded-lg border border-[#D6CFC5] font-mono"
                  />
                  <span className="text-[10px] text-[#6B6257]">Simples Nacional / Taxa de cartão</span>
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Condições de Pagamento</label>
                  <input
                    type="text"
                    value={fin.paymentConditions || ''}
                    onChange={(e) => handleSaveFinancial({ paymentConditions: e.target.value })}
                    placeholder="Ex: 50% entrada + 50% entrega"
                    className="w-full p-2 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
              </div>

              {/* Homologação do Preço */}
              <div className="pt-4 border-t border-[#EFECE6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF8F5] p-3.5 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="confirmResponsible"
                    checked={fin.confirmedByResponsible}
                    onChange={(e) => handleSaveFinancial({ confirmedByResponsible: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="confirmResponsible" className="text-xs font-semibold text-[#181512] cursor-pointer">
                    Homologar e aprovar preço final de venda para apresentação ao cliente
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B6257]">Preço Aprovado Manual:</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="R$ sugerido"
                    value={
                      fin.approvedSellingPriceCents !== null && fin.approvedSellingPriceCents !== undefined
                        ? (fin.approvedSellingPriceCents / 100).toFixed(2)
                        : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      handleSaveFinancial({
                        approvedSellingPriceCents: val ? Math.round(parseFloat(val) * 100) : null,
                      });
                    }}
                    className="w-28 p-1.5 rounded border border-[#D6CFC5] text-xs font-mono text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: TRANSAÇÕES & PARCELAS */}
        {activeTab === 'transacoes' && (
          <div className="space-y-6">
            {/* Lançar nova transação */}
            <form onSubmit={handleAddTransaction} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">
                Registrar Movimentação Financeira Vinculada ao Pedido
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Tipo de Lançamento</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                  >
                    <option value="receita_cliente">Receita: Pagamento Cliente</option>
                    <option value="despesa_material">Despesa: Compra Insumos</option>
                    <option value="despesa_mao_de_obra">Despesa: Mão de Obra Oficina</option>
                    <option value="despesa_frete">Despesa: Transporte / Logística</option>
                    <option value="retirada_proprietario">Retirada Proprietário (Pró-labore)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    value={newAmountReais}
                    onChange={(e) => setNewAmountReais(e.target.value)}
                    placeholder="Ex: 850,00"
                    className="w-full p-2 rounded border border-[#D6CFC5] font-mono tabular-nums bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Descrição</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Ex: Entrada 50% via Pix"
                    className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                  >
                    <option value="realizado">Realizado (Efetivado no Caixa)</option>
                    <option value="previsto">Previsto (A vencer)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 px-4 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Lançar Transação
                  </button>
                </div>
              </div>
            </form>

            {/* Tabela de Lançamentos */}
            <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Tipo / Categoria</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {fin.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#6B6257]">
                        Nenhum lançamento financeiro registrado neste pedido ainda.
                      </td>
                    </tr>
                  ) : (
                    fin.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-2.5 px-3 font-mono text-[#6B6257]">
                          {tx.paidDate || tx.dueDate || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('pt-BR') : '-')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              tx.type === 'receita_cliente'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'retirada_proprietario'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {tx.type === 'receita_cliente' ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {tx.type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#181512]">{tx.description}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.status === 'realizado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            tx.type === 'receita_cliente' ? 'text-emerald-800' : 'text-red-800'
                          }`}
                        >
                          {tx.type === 'receita_cliente' ? '+' : '-'} {formatCurrencyBRL(tx.amountCents)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: FLUXO DE CAIXA PREVISTO VS REALIZADO */}
        {activeTab === 'fluxo' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900 uppercase">Recebimentos Realizados</span>
                <p className="text-2xl font-bold font-mono text-emerald-800 mt-1">
                  {formatCurrencyBRL(totalRevenueRealized)}
                </p>
                <p className="text-[11px] text-emerald-700 mt-1">Entradas liquidadas no caixa</p>
              </div>

              <div className="p-5 rounded-xl bg-red-50 border border-red-200">
                <span className="text-xs font-bold text-red-900 uppercase">Desembolsos Realizados</span>
                <p className="text-2xl font-bold font-mono text-red-800 mt-1">
                  {formatCurrencyBRL(totalExpenseRealized)}
                </p>
                <p className="text-[11px] text-red-700 mt-1">Materiais e despesas pagos</p>
              </div>

              <div className="p-5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-xs font-bold text-[#181512] uppercase">Saldo Operacional do Pedido</span>
                <p
                  className={`text-2xl font-bold font-mono mt-1 ${
                    realizedCashBalance >= 0 ? 'text-emerald-800' : 'text-red-800'
                  }`}
                >
                  {formatCurrencyBRL(realizedCashBalance)}
                </p>
                <p className="text-[11px] text-[#6B6257] mt-1">Caixa líquido efetivo</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#E5DEC9] bg-white space-y-3">
              <h3 className="font-bold text-sm text-[#181512]">
                Comparativo de Resultado Previsto vs Realizado
              </h3>
              <dl className="divide-y divide-[#EFECE6] text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B6257]">Preço de Venda Contratado</dt>
                  <dd className="font-mono font-bold text-[#181512]">{formatCurrencyBRL(activeSellingPrice)}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B6257]">Custo Total Orçado (Materiais + Mão de Obra + Rateio)</dt>
                  <dd className="font-mono text-[#181512]">{formatCurrencyBRL(fin.totalCalculatedCostCents)}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-[#6B6257]">Lucro Operacional Bruto Previsto</dt>
                  <dd className="font-mono font-bold text-purple-900">
                    {formatCurrencyBRL(Math.max(0, (activeSellingPrice ?? 0) - (fin.totalCalculatedCostCents ?? 0)))}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between bg-emerald-50/50 p-2 rounded">
                  <dt className="text-emerald-950 font-semibold">Saldo Pendente a Receber na Entrega</dt>
                  <dd className="font-mono font-bold text-emerald-900">
                    {formatCurrencyBRL(fin.remainingBalanceCents)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
