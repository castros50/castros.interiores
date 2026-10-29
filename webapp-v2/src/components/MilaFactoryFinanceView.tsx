import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Percent,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { FinancialTransaction, FinancialTransactionType, FixedExpense, WorkshopSettings } from '../types';
import { formatCurrencyBRL } from '../utils/calculations';
import { AgentPortrait } from './AgentPortrait';

interface EdsonReserveSummary {
  month: string;
  baseCents: number;
  reserveCents: number;
  withdrawnCents: number;
  remainingCents: number;
}

interface FactoryFinancialSummary {
  month: string;
  entradasRealizadoMesCents: number;
  saidasRealizadoMesCents: number;
  saldoOperacionalMesCents: number;
  totalReceitaClienteAllTimeCents: number;
  totalDespesasAllTimeCents: number;
  saldoCaixaTotalCents: number;
  contasAPagar: FinancialTransaction[];
  contasAReceber: FinancialTransaction[];
  edsonReserve: EdsonReserveSummary;
  initialBalance: { amountCents: number; referenceDate: string; recordedAt: string; recordedBy?: string } | null;
  fixedExpenses: FixedExpense[];
  allTransactions: FinancialTransaction[];
}

interface MilaFactoryFinanceViewProps {
  settings: WorkshopSettings;
  onOpenOrder?: (orderId: string) => void;
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m} de ${y}`;
}

const TX_TYPE_LABELS: Partial<Record<FinancialTransactionType, string>> = {
  receita_cliente: 'Receita de Cliente',
  despesa_material: 'Despesa: Material',
  despesa_servico: 'Despesa: Serviço',
  despesa_mao_de_obra: 'Despesa: Mão de Obra',
  retirada_proprietario: 'Retirada Proprietário',
  despesa_fixa: 'Despesa Fixa',
  despesa_geral_fabrica: 'Despesa Geral da Fábrica',
  saldo_inicial: 'Saldo Inicial',
  retirada_reserva_edson: 'Retirada Reserva Edson',
  estorno_cliente: 'Estorno de Cliente',
  outro: 'Outro',
};

export const MilaFactoryFinanceView: React.FC<MilaFactoryFinanceViewProps> = ({ settings, onOpenOrder }) => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'contas_fixas' | 'reserva_edson' | 'saldo_inicial'>('resumo');
  const [month, setMonth] = useState(currentMonthKey());
  const [summary, setSummary] = useState<FactoryFinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Lançamento geral
  const [newType, setNewType] = useState<FinancialTransactionType>('despesa_geral_fabrica');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatus, setNewStatus] = useState<'previsto' | 'realizado'>('previsto');

  // Contas fixas
  const [feName, setFeName] = useState('');
  const [feCategory, setFeCategory] = useState('');
  const [feAmount, setFeAmount] = useState('');
  const [feVariable, setFeVariable] = useState(false);
  const [feDueDay, setFeDueDay] = useState('10');

  // Saldo inicial
  const [initAmount, setInitAmount] = useState('1000,00');
  const [initDate, setInitDate] = useState(new Date().toISOString().slice(0, 10));
  const [initConfirmed, setInitConfirmed] = useState(false);
  const [initConfirmedBy, setInitConfirmedBy] = useState(settings.responsibleDefaultName || '');

  // Reserva do Edson
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBy, setWithdrawBy] = useState(settings.responsibleDefaultName || '');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const loadSummary = useCallback(async (m: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/office/financial-summary?month=${encodeURIComponent(m)}`);
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Erro ao carregar resumo financeiro da fábrica.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de comunicação ao carregar resumo financeiro da fábrica.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary(month);
  }, [month, loadSummary]);

  const flash = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const handleAddGeneralTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(newAmount.replace(',', '.')) * 100);
    if (!amountCents || isNaN(amountCents)) {
      alert('Informe um valor válido.');
      return;
    }
    try {
      const res = await fetch('/api/office/general-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTransaction: {
            type: newType,
            amountCents,
            status: newStatus,
            dueDate: newDueDate || new Date().toISOString().slice(0, 10),
            paidDate: newStatus === 'realizado' ? new Date().toISOString().slice(0, 10) : undefined,
            description: newDesc || 'Lançamento geral da fábrica',
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewAmount('');
        setNewDesc('');
        flash('Lançamento registrado.');
        loadSummary(month);
      } else {
        alert(data.error || 'Erro ao registrar lançamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar lançamento.');
    }
  };

  const handleSettle = async (id: string) => {
    try {
      const res = await fetch(`/api/office/general-transaction/${id}/settle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidDate: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Conta quitada.');
        loadSummary(month);
      } else {
        alert(data.error || 'Erro ao quitar conta.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao quitar conta.');
    }
  };

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feName.trim()) {
      alert('Informe o nome da conta fixa.');
      return;
    }
    const dueDay = parseInt(feDueDay, 10);
    if (!dueDay || dueDay < 1 || dueDay > 31) {
      alert('Informe um dia de vencimento válido (1 a 31).');
      return;
    }
    const amountCents = feVariable ? null : Math.round(parseFloat(feAmount.replace(',', '.')) * 100) || null;
    try {
      const res = await fetch('/api/office/fixed-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feName,
          category: feCategory || 'Outro',
          amountCents,
          isVariableAmount: feVariable,
          dueDayOfMonth: dueDay,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeName('');
        setFeCategory('');
        setFeAmount('');
        setFeVariable(false);
        flash('Conta fixa cadastrada.');
        loadSummary(month);
      } else {
        alert(data.error || 'Erro ao cadastrar conta fixa.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao cadastrar conta fixa.');
    }
  };

  const handleToggleFixedExpenseActive = async (fe: FixedExpense) => {
    try {
      const res = await fetch(`/api/office/fixed-expenses/${fe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !fe.active }),
      });
      const data = await res.json();
      if (data.ok) loadSummary(month);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFixedExpense = async (id: string) => {
    if (!confirm('Remover esta conta fixa cadastrada? As contas já geradas no histórico não são apagadas.')) return;
    try {
      const res = await fetch(`/api/office/fixed-expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) loadSummary(month);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateBills = async () => {
    try {
      const res = await fetch('/api/office/fixed-expenses/generate-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceMonth: month }),
      });
      const data = await res.json();
      if (data.ok) {
        let msg = `${data.createdCount} conta(s) gerada(s) para ${formatMonthLabel(month)}.`;
        if (data.pendingManual?.length) {
          msg += ` Valor variável a lançar manualmente: ${data.pendingManual.join(', ')}.`;
        }
        flash(msg);
        loadSummary(month);
      } else {
        alert(data.error || 'Erro ao gerar contas do mês.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao gerar contas do mês.');
    }
  };

  const handleRegisterInitialBalance = async () => {
    const amountCents = Math.round(parseFloat(initAmount.replace(',', '.')) * 100);
    if (!amountCents || amountCents <= 0) {
      alert('Informe um valor de saldo inicial válido.');
      return;
    }
    if (!initDate) {
      alert('Informe a data de referência.');
      return;
    }
    if (!initConfirmed) {
      alert('Confirme explicitamente antes de registrar o saldo inicial — essa ação não pode ser repetida.');
      return;
    }
    try {
      const res = await fetch('/api/office/initial-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, referenceDate: initDate, confirmedBy: initConfirmedBy || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Saldo inicial registrado.');
        loadSummary(month);
      } else {
        alert(data.error || 'Erro ao registrar saldo inicial.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar saldo inicial.');
    }
  };

  const handleWithdrawReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(withdrawAmount.replace(',', '.')) * 100);
    if (!amountCents || amountCents <= 0) {
      alert('Informe um valor de retirada válido.');
      return;
    }
    if (!withdrawBy.trim()) {
      alert('Informe o nome de quem confirma a retirada.');
      return;
    }
    try {
      const res = await fetch('/api/office/edson-reserve/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceMonth: month,
          amountCents,
          confirmedBy: withdrawBy,
          notes: withdrawNotes || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setWithdrawAmount('');
        setWithdrawNotes('');
        flash('Retirada confirmada e registrada.');
        loadSummary(month);
      } else {
        alert(data.error || 'Erro ao registrar retirada.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar retirada.');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden">
      {/* Cabeçalho */}
      <div className="bg-[#181512] text-[#F9F6F0] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <AgentPortrait
              deskId="mila_financeiro"
              name="Mila"
              portraitUpdatedAt={settings.agentPortraitUpdatedAt?.mila_financeiro}
              size="lg"
            />
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#E5DEC9] border border-[#57534E]">
                Mesa 5 — Financeiro da Fábrica
              </span>
              <h2 className="text-xl font-serif-display font-bold text-white mt-1">
                Entradas, Saídas e Contas da Oficina
              </h2>
              <p className="text-xs text-[#D6CFC5] mt-0.5">
                Consulta os mesmos lançamentos usados no financeiro de cada pedido, sem duplicar nenhum.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D8C5A3]" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg bg-[#2E2722] border border-[#57534E] text-white text-xs px-2.5 py-2"
            />
            <button
              type="button"
              onClick={() => loadSummary(month)}
              className="p-2 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] border border-[#57534E]"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 text-[#E5DEC9] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5DEC9] bg-[#FAF8F5] px-6 flex flex-wrap gap-2 pt-3">
        {[
          { id: 'resumo', label: `1. Resumo do Mês` },
          { id: 'contas_fixas', label: `2. Contas Fixas (${summary?.fixedExpenses.length ?? 0})` },
          { id: 'reserva_edson', label: '3. Reserva do Edson (10%)' },
          { id: 'saldo_inicial', label: '4. Saldo Inicial' },
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

      <div className="p-6">
        {actionMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {actionMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            {error}
          </div>
        )}

        {isLoading && !summary ? (
          <div className="flex items-center justify-center py-10 text-xs text-[#78716C] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#9A7138]" />
            Carregando financeiro da fábrica...
          </div>
        ) : summary ? (
          <>
            {/* ABA 1: RESUMO DO MÊS */}
            {activeTab === 'resumo' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] text-emerald-900 uppercase font-semibold">Entradas do Mês</span>
                    <p className="text-xl font-bold font-mono text-emerald-900 mt-1">
                      {formatCurrencyBRL(summary.entradasRealizadoMesCents)}
                    </p>
                    <span className="text-[10px] text-emerald-700">Recebimentos de clientes já confirmados</span>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <span className="text-[11px] text-red-900 uppercase font-semibold">Saídas do Mês</span>
                    <p className="text-xl font-bold font-mono text-red-900 mt-1">
                      {formatCurrencyBRL(summary.saidasRealizadoMesCents)}
                    </p>
                    <span className="text-[10px] text-red-700">Despesas já pagas no mês</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                    <span className="text-[11px] text-[#181512] uppercase font-semibold">Saldo Operacional do Mês</span>
                    <p
                      className={`text-xl font-bold font-mono mt-1 ${
                        summary.saldoOperacionalMesCents >= 0 ? 'text-emerald-800' : 'text-red-800'
                      }`}
                    >
                      {formatCurrencyBRL(summary.saldoOperacionalMesCents)}
                    </p>
                    <span className="text-[10px] text-[#6B6257]">Entradas − Saídas do mês</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-[11px] text-purple-900 uppercase font-semibold">Saldo de Caixa Total</span>
                    <p className="text-xl font-bold font-mono text-purple-900 mt-1">
                      {formatCurrencyBRL(summary.saldoCaixaTotalCents)}
                    </p>
                    <span className="text-[10px] text-purple-700">
                      {summary.initialBalance ? 'Inclui saldo inicial' : 'Saldo inicial não registrado'}
                    </span>
                  </div>
                </div>

                {/* Lançar movimentação geral */}
                <form onSubmit={handleAddGeneralTransaction} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">
                    Registrar Movimentação Geral da Fábrica (não vinculada a um pedido)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Tipo</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as FinancialTransactionType)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      >
                        <option value="despesa_geral_fabrica">Despesa Geral da Fábrica</option>
                        <option value="despesa_material">Despesa: Compra de Estoque</option>
                        <option value="despesa_mao_de_obra">Despesa: Mão de Obra</option>
                        <option value="retirada_proprietario">Retirada do Proprietário</option>
                        <option value="estorno_cliente">Estorno de Cliente</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        required
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="Ex: 250,00"
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Descrição</label>
                      <input
                        type="text"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Ex: Compra de estoque geral de espuma"
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Vencimento</label>
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
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
                        <option value="previsto">Previsto (a vencer)</option>
                        <option value="realizado">Realizado (já pago)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Lançar
                  </button>
                </form>

                {/* Contas a pagar / receber */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-red-700" />
                      Contas a Pagar ({summary.contasAPagar.length})
                    </h4>
                    <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                      {summary.contasAPagar.length === 0 ? (
                        <p className="p-3 text-xs text-[#6B6257]">Nenhuma conta pendente.</p>
                      ) : (
                        summary.contasAPagar.map((t) => (
                          <div key={t.id} className="p-3 border-b border-[#EFECE6] last:border-0 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <p className="font-medium text-[#181512]">{t.description}</p>
                              <p className="text-[10px] text-[#6B6257]">
                                {TX_TYPE_LABELS[t.type] || t.type} · vence {t.dueDate}
                                {t.orderNumber ? ` · ${t.orderNumber}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-red-800">{formatCurrencyBRL(t.amountCents)}</span>
                              {t.source === 'fabrica' && (
                                <button
                                  type="button"
                                  onClick={() => handleSettle(t.id)}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                      Valores a Receber ({summary.contasAReceber.length})
                    </h4>
                    <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                      {summary.contasAReceber.length === 0 ? (
                        <p className="p-3 text-xs text-[#6B6257]">Nenhum valor pendente de recebimento.</p>
                      ) : (
                        summary.contasAReceber.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => t.orderId && onOpenOrder?.(t.orderId)}
                            className={`p-3 border-b border-[#EFECE6] last:border-0 flex items-center justify-between gap-2 text-xs ${t.orderId ? 'cursor-pointer hover:bg-[#FAF7F2]' : ''}`}
                          >
                            <div>
                              <p className="font-medium text-[#181512]">{t.description}</p>
                              <p className="text-[10px] text-[#6B6257]">
                                vence {t.dueDate}{t.orderNumber ? ` · ${t.orderNumber} (${t.clientName})` : ''}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-emerald-800 shrink-0">
                              {formatCurrencyBRL(t.amountCents)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: CONTAS FIXAS */}
            {activeTab === 'contas_fixas' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-[#6B6257] max-w-lg">
                    Cadastre as despesas recorrentes da oficina. Gerar as contas do mês cria lançamentos
                    "previsto" — recorrência não significa pagamento realizado.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateBills}
                    className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5 shadow shrink-0"
                  >
                    <Calendar className="w-4 h-4" />
                    Gerar Contas de {formatMonthLabel(month)}
                  </button>
                </div>

                <form onSubmit={handleAddFixedExpense} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Nova Conta Fixa</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Nome</label>
                      <input
                        type="text"
                        value={feName}
                        onChange={(e) => setFeName(e.target.value)}
                        placeholder="Ex: Aluguel do Galpão"
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Categoria</label>
                      <input
                        type="text"
                        value={feCategory}
                        onChange={(e) => setFeCategory(e.target.value)}
                        placeholder="Ex: Aluguel, Energia, Água"
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Dia de Vencimento</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={feDueDay}
                        onChange={(e) => setFeDueDay(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Valor Fixo (R$)</label>
                      <input
                        type="text"
                        disabled={feVariable}
                        value={feAmount}
                        onChange={(e) => setFeAmount(e.target.value)}
                        placeholder={feVariable ? 'Valor variável' : 'Ex: 3500,00'}
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono bg-white disabled:bg-[#F3EFE6] disabled:text-[#A8A29E]"
                      />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 text-[#57534E] font-medium">
                        <input
                          type="checkbox"
                          checked={feVariable}
                          onChange={(e) => setFeVariable(e.target.checked)}
                        />
                        Valor variável mês a mês
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar Conta Fixa
                  </button>
                </form>

                <div className="border border-[#E5DEC9] rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#181512] text-[#F9F6F0]">
                        <th className="py-2.5 px-3">Nome</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-center">Vencimento</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFECE6]">
                      {summary.fixedExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-[#6B6257]">
                            Nenhuma conta fixa cadastrada ainda.
                          </td>
                        </tr>
                      ) : (
                        summary.fixedExpenses.map((fe) => (
                          <tr key={fe.id} className="hover:bg-[#FAF7F2]">
                            <td className="py-2.5 px-3 font-medium text-[#181512]">{fe.name}</td>
                            <td className="py-2.5 px-3 text-[#6B6257]">{fe.category}</td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {fe.amountCents != null ? (
                                formatCurrencyBRL(fe.amountCents)
                              ) : (
                                <span className="text-amber-800 font-medium">variável</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">dia {fe.dueDayOfMonth}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleFixedExpenseActive(fe)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  fe.active ? 'bg-emerald-100 text-emerald-800' : 'bg-[#E5DEC9] text-[#6B6257]'
                                }`}
                              >
                                {fe.active ? 'ATIVA' : 'INATIVA'}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFixedExpense(fe.id)}
                                className="text-red-700 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 3: RESERVA DO EDSON */}
            {activeTab === 'reserva_edson' && (
              <div className="space-y-6">
                <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] text-xs text-[#57534E] flex items-start gap-2">
                  <Percent className="w-4 h-4 text-[#9A7138] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#181512]">Regra da reserva:</strong> 10% dos recebimentos de clientes
                    efetivamente confirmados em {formatMonthLabel(month)} (entradas + parcelas pagas). Saldo inicial,
                    transferências, empréstimos, aportes e valores ainda não recebidos não entram na base. A reserva
                    não reduz o saldo de caixa — só a retirada confirmada gera saída, uma única vez.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                    <span className="text-[11px] text-[#6B6257] uppercase font-semibold">Base (Recebido no Mês)</span>
                    <p className="text-xl font-bold font-mono text-[#181512] mt-1">
                      {formatCurrencyBRL(summary.edsonReserve.baseCents)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                    <span className="text-[11px] text-purple-900 uppercase font-semibold">Reserva Calculada (10%)</span>
                    <p className="text-xl font-bold font-mono text-purple-900 mt-1">
                      {formatCurrencyBRL(summary.edsonReserve.reserveCents)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[11px] text-amber-900 uppercase font-semibold">Retiradas Confirmadas</span>
                    <p className="text-xl font-bold font-mono text-amber-900 mt-1">
                      {formatCurrencyBRL(summary.edsonReserve.withdrawnCents)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] text-emerald-900 uppercase font-semibold">Restante Disponível</span>
                    <p className="text-xl font-bold font-mono text-emerald-900 mt-1">
                      {formatCurrencyBRL(summary.edsonReserve.remainingCents)}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleWithdrawReserve} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">
                    Confirmar Retirada de {formatMonthLabel(month)}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Valor a Retirar (R$)</label>
                      <input
                        type="text"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder={`Até ${formatCurrencyBRL(summary.edsonReserve.remainingCents)}`}
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Confirmado por</label>
                      <input
                        type="text"
                        value={withdrawBy}
                        onChange={(e) => setWithdrawBy(e.target.value)}
                        placeholder="Nome do responsável"
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Observações</label>
                      <input
                        type="text"
                        value={withdrawNotes}
                        onChange={(e) => setWithdrawNotes(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={summary.edsonReserve.remainingCents <= 0}
                    className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Retirada
                  </button>
                </form>
              </div>
            )}

            {/* ABA 4: SALDO INICIAL */}
            {activeTab === 'saldo_inicial' && (
              <div className="space-y-6 max-w-lg">
                {summary.initialBalance ? (
                  <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <Lock className="w-4 h-4" />
                      Saldo Inicial Já Registrado
                    </div>
                    <p className="text-xs text-emerald-800">
                      Valor: <strong className="font-mono">{formatCurrencyBRL(summary.initialBalance.amountCents)}</strong>
                    </p>
                    <p className="text-xs text-emerald-800">
                      Data de referência: <strong>{summary.initialBalance.referenceDate}</strong>
                    </p>
                    {summary.initialBalance.recordedBy && (
                      <p className="text-xs text-emerald-800">
                        Confirmado por: <strong>{summary.initialBalance.recordedBy}</strong>
                      </p>
                    )}
                    <p className="text-[10px] text-emerald-700 pt-1">
                      Este valor é tratado apenas como saldo de caixa — nunca como venda ou recebimento de cliente.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-[#E5DEC9] bg-white space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-[#181512]">Preparar Saldo Inicial</h4>
                      <p className="text-xs text-[#6B6257] mt-1">
                        Esse valor entra apenas no saldo de caixa — nunca é contado como venda, recebimento de
                        cliente, ou base para a reserva do Edson. Esta ação só pode ser feita uma vez.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[#57534E] font-medium mb-1">Valor (R$)</label>
                        <input
                          type="text"
                          value={initAmount}
                          onChange={(e) => setInitAmount(e.target.value)}
                          className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[#57534E] font-medium mb-1">Data de Referência</label>
                        <input
                          type="date"
                          value={initDate}
                          onChange={(e) => setInitDate(e.target.value)}
                          className="w-full p-2 rounded border border-[#D6CFC5]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[#57534E] font-medium mb-1">Confirmado por</label>
                        <input
                          type="text"
                          value={initConfirmedBy}
                          onChange={(e) => setInitConfirmedBy(e.target.value)}
                          placeholder="Nome do responsável"
                          className="w-full p-2 rounded border border-[#D6CFC5]"
                        />
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-xs text-[#181512] font-medium">
                      <input
                        type="checkbox"
                        checked={initConfirmed}
                        onChange={(e) => setInitConfirmed(e.target.checked)}
                        className="mt-0.5"
                      />
                      Confirmo o valor e a data acima. Entendo que este saldo inicial será registrado uma única vez
                      e não será tratado como venda ou recebimento de cliente.
                    </label>
                    <button
                      type="button"
                      onClick={handleRegisterInitialBalance}
                      disabled={!initConfirmed}
                      className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Wallet className="w-4 h-4" />
                      Registrar Saldo Inicial
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
