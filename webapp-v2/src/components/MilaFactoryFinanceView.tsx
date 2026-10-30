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
  Landmark,
  ArrowRightLeft,
  Download,
  Filter,
} from 'lucide-react';
import { FinancialTransaction, FinancialTransactionType, FixedExpense, WorkshopSettings } from '../types';
import { formatCurrencyBRL } from '../utils/calculations';
import { AgentPortrait } from './AgentPortrait';
import { generateMonthlyFinancialReportPdf } from '../utils/pdfGenerator';

interface EdsonReserveSummary {
  month: string;
  baseCents: number;
  reserveCents: number;
  withdrawnCents: number;
  remainingCents: number;
}

interface CashAccountSummary {
  id: string;
  name: string;
  type: 'caixa' | 'banco' | 'outro';
  active: boolean;
}

interface CashTransferSummary {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  notes?: string;
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
  initialBalance: { amountCents: number; referenceDate: string; recordedAt: string; recordedBy?: string; accountId?: string } | null;
  fixedExpenses: FixedExpense[];
  cashAccounts: CashAccountSummary[];
  cashTransfers: CashTransferSummary[];
  accountBalancesCents: Record<string, number>;
  categories: string[];
  allTransactions: FinancialTransaction[];
}

interface MilaFactoryFinanceViewProps {
  settings: WorkshopSettings;
  onOpenOrder?: (orderId: string) => void;
}

function isOverdue(t: FinancialTransaction): boolean {
  if (t.status !== 'previsto' && t.status !== 'parcial') return false;
  return t.dueDate < new Date().toISOString().slice(0, 10);
}

function remainingCentsOf(t: FinancialTransaction): number {
  return Math.max(0, t.amountCents - (t.amountPaidCents || 0));
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
  const [activeTab, setActiveTab] = useState<'resumo' | 'contas_fixas' | 'reserva_edson' | 'saldo_inicial' | 'contas_caixa'>('resumo');
  const [month, setMonth] = useState(currentMonthKey());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [summary, setSummary] = useState<FactoryFinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Lançamento geral (entrada ou saída)
  const [newKind, setNewKind] = useState<'entrada' | 'saida'>('saida');
  const [newType, setNewType] = useState<FinancialTransactionType>('despesa_geral_fabrica');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPayerOrPayee, setNewPayerOrPayee] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatus, setNewStatus] = useState<'previsto' | 'realizado'>('previsto');
  const [duplicateWarning, setDuplicateWarning] = useState<FinancialTransaction[] | null>(null);

  // Contas de caixa/banco e transferências
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'caixa' | 'banco' | 'outro'>('banco');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Pagamento (total ou parcial) de uma conta pendente
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

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
  const [initAccountId, setInitAccountId] = useState('');

  // Reserva do Edson
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBy, setWithdrawBy] = useState(settings.responsibleDefaultName || '');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const loadSummary = useCallback(async (m: string, cat?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month: m });
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/office/financial-summary?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary);
        if (!newAccountId && data.summary.cashAccounts?.[0]) {
          setNewAccountId(data.summary.cashAccounts[0].id);
        }
        if (!initAccountId && data.summary.cashAccounts?.[0]) {
          setInitAccountId(data.summary.cashAccounts[0].id);
        }
      } else {
        setError(data.error || 'Erro ao carregar resumo financeiro da fábrica.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de comunicação ao carregar resumo financeiro da fábrica.');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSummary(month, categoryFilter || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, categoryFilter]);

  const flash = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const submitGeneralTransaction = async (confirmDespiteDuplicate: boolean) => {
    const amountCents = Math.round(parseFloat(newAmount.replace(',', '.')) * 100);
    if (!amountCents || isNaN(amountCents)) {
      alert('Informe um valor válido.');
      return;
    }
    const effectiveType: FinancialTransactionType = newKind === 'entrada' ? 'receita_cliente' : newType;
    try {
      const res = await fetch('/api/office/general-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmDespiteDuplicate,
          newTransaction: {
            type: effectiveType,
            amountCents,
            status: newStatus,
            dueDate: newDueDate || new Date().toISOString().slice(0, 10),
            paidDate: newStatus === 'realizado' ? new Date().toISOString().slice(0, 10) : undefined,
            description: newDesc || (newKind === 'entrada' ? 'Entrada geral da fábrica' : 'Saída geral da fábrica'),
            category: newCategory || undefined,
            payerOrPayee: newPayerOrPayee || undefined,
            accountId: newAccountId || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.possibleDuplicate) {
        setDuplicateWarning(data.duplicates);
        return;
      }
      if (data.ok) {
        setNewAmount('');
        setNewDesc('');
        setNewPayerOrPayee('');
        setDuplicateWarning(null);
        flash(newKind === 'entrada' ? 'Entrada registrada.' : 'Saída registrada.');
        loadSummary(month, categoryFilter || undefined);
      } else {
        alert(data.error || 'Erro ao registrar lançamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar lançamento.');
    }
  };

  const handleAddGeneralTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitGeneralTransaction(false);
  };

  const handlePay = async (id: string, full: boolean) => {
    const trans = summary?.allTransactions.find((t) => t.id === id);
    if (!trans) return;
    const remaining = remainingCentsOf(trans);
    const amountCents = full ? remaining : Math.round(parseFloat(payAmount.replace(',', '.')) * 100);
    if (!amountCents || amountCents <= 0) {
      alert('Informe um valor de pagamento válido.');
      return;
    }
    try {
      const res = await fetch(`/api/office/general-transaction/${id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, paidDate: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (data.ok) {
        flash(data.transaction.status === 'realizado' ? 'Conta quitada.' : 'Pagamento parcial registrado.');
        setPayingId(null);
        setPayAmount('');
        loadSummary(month, categoryFilter || undefined);
      } else {
        alert(data.error || 'Erro ao registrar pagamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar pagamento.');
    }
  };

  const handleDeleteTransaction = async (t: FinancialTransaction) => {
    if (!window.confirm(`Excluir o lançamento "${t.description}" (${formatCurrencyBRL(t.amountCents)})? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/office/general-transaction/${t.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        flash('Lançamento excluído.');
        loadSummary(month, categoryFilter || undefined);
      } else {
        alert(data.error || 'Erro ao excluir lançamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao excluir lançamento.');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      alert('Informe o nome da conta.');
      return;
    }
    try {
      const res = await fetch('/api/office/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: accName, type: accType }),
      });
      const data = await res.json();
      if (data.ok) {
        setAccName('');
        flash('Conta cadastrada.');
        loadSummary(month, categoryFilter || undefined);
      } else {
        alert(data.error || 'Erro ao cadastrar conta.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao cadastrar conta.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(transferAmount.replace(',', '.')) * 100);
    if (!transferFrom || !transferTo) {
      alert('Selecione as contas de origem e destino.');
      return;
    }
    if (!amountCents || amountCents <= 0) {
      alert('Informe um valor de transferência válido.');
      return;
    }
    try {
      const res = await fetch('/api/office/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: transferFrom,
          toAccountId: transferTo,
          amountCents,
          notes: transferNotes || undefined,
          createdBy: settings.responsibleDefaultName || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTransferAmount('');
        setTransferNotes('');
        flash('Transferência registrada.');
        loadSummary(month, categoryFilter || undefined);
      } else {
        alert(data.error || 'Erro ao registrar transferência.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de comunicação ao registrar transferência.');
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
        loadSummary(month, categoryFilter || undefined);
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
      if (data.ok) loadSummary(month, categoryFilter || undefined);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFixedExpense = async (id: string) => {
    if (!confirm('Remover esta conta fixa cadastrada? As contas já geradas no histórico não são apagadas.')) return;
    try {
      const res = await fetch(`/api/office/fixed-expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) loadSummary(month, categoryFilter || undefined);
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
        loadSummary(month, categoryFilter || undefined);
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
        body: JSON.stringify({
          amountCents,
          referenceDate: initDate,
          confirmedBy: initConfirmedBy || undefined,
          accountId: initAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        flash('Saldo inicial registrado.');
        loadSummary(month, categoryFilter || undefined);
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
          accountId: newAccountId || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setWithdrawAmount('');
        setWithdrawNotes('');
        flash('Retirada confirmada e registrada.');
        loadSummary(month, categoryFilter || undefined);
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

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[#D8C5A3]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg bg-[#2E2722] border border-[#57534E] text-white text-xs px-2.5 py-2"
            >
              <option value="">Todas as categorias</option>
              {(summary?.categories || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Calendar className="w-4 h-4 text-[#D8C5A3]" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg bg-[#2E2722] border border-[#57534E] text-white text-xs px-2.5 py-2"
            />
            <button
              type="button"
              onClick={() => loadSummary(month, categoryFilter || undefined)}
              className="p-2 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] border border-[#57534E]"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 text-[#E5DEC9] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              disabled={!summary || isGeneratingPdf}
              onClick={async () => {
                if (!summary) return;
                setIsGeneratingPdf(true);
                try {
                  await generateMonthlyFinancialReportPdf(summary, month, settings);
                } finally {
                  setIsGeneratingPdf(false);
                }
              }}
              className="px-3 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
              title="Baixar relatório mensal em PDF A4"
            >
              <Download className="w-4 h-4" />
              Relatório PDF
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
          { id: 'contas_caixa', label: `5. Contas / Caixa (${summary?.cashAccounts.length ?? 0})` },
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">
                      Registrar Movimentação Geral da Fábrica (não vinculada a um pedido)
                    </h4>
                    <div className="flex items-center bg-[#EDE7DC] rounded-lg p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => { setNewKind('entrada'); setNewType('receita_cliente'); }}
                        className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1 ${
                          newKind === 'entrada' ? 'bg-emerald-700 text-white' : 'text-[#57534E]'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Registrar Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNewKind('saida'); setNewType('despesa_geral_fabrica'); }}
                        className={`px-3 py-1.5 rounded font-semibold flex items-center gap-1 ${
                          newKind === 'saida' ? 'bg-red-700 text-white' : 'text-[#57534E]'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Registrar Saída
                      </button>
                    </div>
                  </div>

                  {duplicateWarning && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        Possível lançamento duplicado
                      </div>
                      <ul className="list-disc list-inside">
                        {duplicateWarning.map((d) => (
                          <li key={d.id}>{d.description} — {formatCurrencyBRL(d.amountCents)} em {d.dueDate}</li>
                        ))}
                      </ul>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => submitGeneralTransaction(true)}
                          className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold"
                        >
                          Não é duplicado, lançar mesmo assim
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {newKind === 'saida' && (
                      <div>
                        <label className="block text-[#57534E] font-medium mb-1">Tipo de Saída</label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as FinancialTransactionType)}
                          className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                        >
                          <option value="despesa_geral_fabrica">Despesa Geral da Fábrica</option>
                          <option value="despesa_material">Despesa: Compra de Estoque</option>
                          <option value="despesa_mao_de_obra">Despesa: Mão de Obra</option>
                          <option value="retirada_proprietario">Retirada do Proprietário</option>
                          <option value="estorno_cliente">Estorno de Cliente (ajusta a base do Edson)</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    )}
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
                      <label className="block text-[#57534E] font-medium mb-1">Categoria</label>
                      <input
                        type="text"
                        list="categorias-existentes"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Ex: Material, Salário"
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                      <datalist id="categorias-existentes">
                        {(summary?.categories || []).map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">
                        {newKind === 'entrada' ? 'Pagador (quem pagou)' : 'Favorecido (para quem)'}
                      </label>
                      <input
                        type="text"
                        value={newPayerOrPayee}
                        onChange={(e) => setNewPayerOrPayee(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Conta Utilizada</label>
                      <select
                        value={newAccountId}
                        onChange={(e) => setNewAccountId(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      >
                        {(summary?.cashAccounts || []).map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
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
                        <option value="realizado">Realizado (já {newKind === 'entrada' ? 'recebido' : 'pago'})</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Lançar {newKind === 'entrada' ? 'Entrada' : 'Saída'}
                  </button>
                </form>

                {/* Contas a pagar / receber */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-red-700" />
                      Contas a Pagar ({summary.contasAPagar.length})
                    </h4>
                    <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                      {summary.contasAPagar.length === 0 ? (
                        <p className="p-3 text-xs text-[#6B6257]">Nenhuma conta pendente.</p>
                      ) : (
                        summary.contasAPagar.map((t) => {
                          const overdue = isOverdue(t);
                          const remaining = remainingCentsOf(t);
                          return (
                            <div key={t.id} className="p-3 border-b border-[#EFECE6] last:border-0 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium text-[#181512]">{t.description}</p>
                                  <p className="text-[10px] text-[#6B6257]">
                                    {TX_TYPE_LABELS[t.type] || t.type} · vence {t.dueDate}
                                    {t.orderNumber ? ` · ${t.orderNumber}` : ''}
                                    {t.status === 'parcial' ? ' · pago parcialmente' : ''}
                                  </p>
                                  {overdue && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-red-700 text-white text-[9px] font-bold uppercase">
                                      Vencida
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-red-800">{formatCurrencyBRL(remaining)}</span>
                                  {t.source === 'fabrica' && payingId !== t.id && (
                                    <button
                                      type="button"
                                      onClick={() => { setPayingId(t.id); setPayAmount((remaining / 100).toFixed(2)); }}
                                      className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold"
                                    >
                                      Pagar
                                    </button>
                                  )}
                                </div>
                              </div>
                              {payingId === t.id && (
                                <div className="mt-2 flex items-center gap-2 bg-[#FAF8F5] p-2 rounded">
                                  <input
                                    type="text"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-24 p-1.5 rounded border border-[#D6CFC5] font-mono text-right"
                                  />
                                  <button type="button" onClick={() => handlePay(t.id, false)} className="px-2 py-1 rounded bg-[#181512] text-white font-semibold">
                                    Confirmar
                                  </button>
                                  <button type="button" onClick={() => handlePay(t.id, true)} className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold">
                                    Pagar Tudo
                                  </button>
                                  <button type="button" onClick={() => setPayingId(null)} className="px-2 py-1 text-[#6B6257]">
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

                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#181512] mb-2 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                      Valores a Receber ({summary.contasAReceber.length})
                    </h4>
                    <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                      {summary.contasAReceber.length === 0 ? (
                        <p className="p-3 text-xs text-[#6B6257]">Nenhum valor pendente de recebimento.</p>
                      ) : (
                        summary.contasAReceber.map((t) => {
                          const overdue = isOverdue(t);
                          const remaining = remainingCentsOf(t);
                          return (
                            <div key={t.id} className="p-3 border-b border-[#EFECE6] last:border-0 text-xs">
                              <div
                                onClick={() => t.orderId && onOpenOrder?.(t.orderId)}
                                className={`flex items-center justify-between gap-2 ${t.orderId ? 'cursor-pointer hover:bg-[#FAF7F2]' : ''}`}
                              >
                                <div>
                                  <p className="font-medium text-[#181512]">{t.description}</p>
                                  <p className="text-[10px] text-[#6B6257]">
                                    vence {t.dueDate}{t.orderNumber ? ` · ${t.orderNumber} (${t.clientName})` : ''}
                                    {t.status === 'parcial' ? ' · recebido parcialmente' : ''}
                                  </p>
                                  {overdue && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-red-700 text-white text-[9px] font-bold uppercase">
                                      Vencida
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-emerald-800">{formatCurrencyBRL(remaining)}</span>
                                  {t.source === 'fabrica' && payingId !== t.id && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setPayingId(t.id); setPayAmount((remaining / 100).toFixed(2)); }}
                                      className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold"
                                    >
                                      Receber
                                    </button>
                                  )}
                                </div>
                              </div>
                              {payingId === t.id && (
                                <div className="mt-2 flex items-center gap-2 bg-[#FAF8F5] p-2 rounded">
                                  <input
                                    type="text"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-24 p-1.5 rounded border border-[#D6CFC5] font-mono text-right"
                                  />
                                  <button type="button" onClick={() => handlePay(t.id, false)} className="px-2 py-1 rounded bg-[#181512] text-white font-semibold">
                                    Confirmar
                                  </button>
                                  <button type="button" onClick={() => handlePay(t.id, true)} className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold">
                                    Receber Tudo
                                  </button>
                                  <button type="button" onClick={() => setPayingId(null)} className="px-2 py-1 text-[#6B6257]">
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
                </div>

                {/* Últimos lançamentos gerais da fábrica — inclui já realizados, para poder excluir um lançamento por engano */}
                <div>
                  <h4 className="font-bold text-xs uppercase text-[#181512] mb-2">
                    Últimos Lançamentos Gerais da Fábrica
                  </h4>
                  <div className="border border-[#E5DEC9] rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                    {summary.allTransactions.filter((t) => t.source === 'fabrica' && t.type !== 'saldo_inicial').length === 0 ? (
                      <p className="p-3 text-xs text-[#6B6257]">Nenhum lançamento geral neste mês.</p>
                    ) : (
                      summary.allTransactions
                        .filter((t) => t.source === 'fabrica' && t.type !== 'saldo_inicial')
                        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                        .slice(0, 30)
                        .map((t) => {
                          const isEntrada = t.type === 'receita_cliente';
                          return (
                            <div key={t.id} className="p-3 border-b border-[#EFECE6] last:border-0 text-xs flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-[#181512] truncate">{t.description}</p>
                                <p className="text-[10px] text-[#6B6257]">
                                  {TX_TYPE_LABELS[t.type] || t.type} · {t.status === 'realizado' ? 'realizado' : t.status === 'parcial' ? 'parcial' : 'previsto'} · vence {t.dueDate}
                                  {t.category ? ` · ${t.category}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`font-mono font-bold ${isEntrada ? 'text-emerald-800' : 'text-red-800'}`}>
                                  {formatCurrencyBRL(t.amountCents)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(t)}
                                  title="Excluir lançamento"
                                  className="p-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
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
                      <div>
                        <label className="block text-[#57534E] font-medium mb-1">Confirmado por</label>
                        <input
                          type="text"
                          value={initConfirmedBy}
                          onChange={(e) => setInitConfirmedBy(e.target.value)}
                          placeholder="Nome do responsável"
                          className="w-full p-2 rounded border border-[#D6CFC5]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#57534E] font-medium mb-1">Onde está esse dinheiro</label>
                        <select
                          value={initAccountId}
                          onChange={(e) => setInitAccountId(e.target.value)}
                          className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                        >
                          {(summary?.cashAccounts || []).map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
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

            {/* ABA 5: CONTAS / CAIXA */}
            {activeTab === 'contas_caixa' && (
              <div className="space-y-6">
                <p className="text-xs text-[#6B6257] max-w-xl">
                  Onde o dinheiro da fábrica está fisicamente — caixa e contas cadastradas manualmente
                  (nunca conectadas a banco real). Transferir entre contas só move o saldo de cada uma;
                  nunca entra como receita ou despesa no consolidado.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {summary.cashAccounts.map((acc) => (
                    <div key={acc.id} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B6257] uppercase font-semibold">
                        <Landmark className="w-3.5 h-3.5 text-[#9A7138]" />
                        {acc.type === 'caixa' ? 'Caixa' : acc.type === 'banco' ? 'Banco' : 'Outro'}
                      </div>
                      <p className="font-bold text-sm text-[#181512] mt-1">{acc.name}</p>
                      <p
                        className={`text-xl font-bold font-mono mt-1 ${
                          (summary.accountBalancesCents[acc.id] || 0) >= 0 ? 'text-emerald-800' : 'text-red-800'
                        }`}
                      >
                        {formatCurrencyBRL(summary.accountBalancesCents[acc.id] || 0)}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreateAccount} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Nova Conta</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Nome</label>
                      <input
                        type="text"
                        value={accName}
                        onChange={(e) => setAccName(e.target.value)}
                        placeholder="Ex: Banco Principal"
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Tipo</label>
                      <select
                        value={accType}
                        onChange={(e) => setAccType(e.target.value as any)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      >
                        <option value="caixa">Caixa</option>
                        <option value="banco">Banco (cadastro manual)</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar
                      </button>
                    </div>
                  </div>
                </form>

                <form onSubmit={handleTransfer} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512] flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-[#9A7138]" />
                    Transferência Entre Contas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">De</label>
                      <select
                        value={transferFrom}
                        onChange={(e) => setTransferFrom(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      >
                        <option value="">Selecione</option>
                        {summary.cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Para</label>
                      <select
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      >
                        <option value="">Selecione</option>
                        {summary.cashAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="Ex: 500,00"
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] font-medium mb-1">Observação</label>
                      <input
                        type="text"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        className="w-full p-2 rounded border border-[#D6CFC5] bg-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Transferir
                  </button>
                </form>

                {summary.cashTransfers.length > 0 && (
                  <div className="border border-[#E5DEC9] rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#181512] text-[#F9F6F0]">
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3">De</th>
                          <th className="py-2.5 px-3">Para</th>
                          <th className="py-2.5 px-3 text-right">Valor</th>
                          <th className="py-2.5 px-3">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFECE6]">
                        {summary.cashTransfers.map((tr) => (
                          <tr key={tr.id}>
                            <td className="py-2 px-3 font-mono">{tr.date}</td>
                            <td className="py-2 px-3">
                              {summary.cashAccounts.find((a) => a.id === tr.fromAccountId)?.name || tr.fromAccountId}
                            </td>
                            <td className="py-2 px-3">
                              {summary.cashAccounts.find((a) => a.id === tr.toAccountId)?.name || tr.toAccountId}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">{formatCurrencyBRL(tr.amountCents)}</td>
                            <td className="py-2 px-3 text-[#6B6257]">{tr.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
