import { BudgetData, BudgetLineCategory, BudgetLineItem } from '../types';

export interface CategoryCostBreakdown {
  category: BudgetLineCategory;
  subtotalCents: number;
  hasPendingItems: boolean;
  pendingCount: number;
}

export interface BudgetSummaryResult {
  byCategory: Record<BudgetLineCategory, CategoryCostBreakdown>;
  totalInternalCostCents: number;
  hasAnyPendingItems: boolean;
  pendingItemNames: string[];
  sellingPriceCents: number | null;
  estimatedMarginCents: number | null;
  confirmedByResponsible: boolean;
}

export function formatCurrencyBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) {
    return 'pendente';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function formatMissingText(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join('; ') : 'não informado';
  }
  if (!value || value.trim() === '') {
    return 'não informado';
  }
  return value.trim();
}

export function calculateLineItemTotal(item: BudgetLineItem): {
  totalCents: number | null;
  isPending: boolean;
  pendingReason?: string;
} {
  if (item.quantityStatus !== 'Definida' || item.quantity === null || item.quantity === undefined) {
    return {
      totalCents: null,
      isPending: true,
      pendingReason:
        item.quantityStatus === 'A levantar (requer medidas e plano de corte)'
          ? 'quantidade a levantar'
          : 'quantidade pendente',
    };
  }
  if (item.unitCostCents === null || item.unitCostCents === undefined) {
    return {
      totalCents: null,
      isPending: true,
      pendingReason: 'custo unitário pendente',
    };
  }
  return {
    totalCents: Math.round(item.quantity * item.unitCostCents),
    isPending: false,
  };
}

const ALL_CATEGORIES: BudgetLineCategory[] = [
  'Material',
  'Mão de obra',
  'Serviço terceirizado',
  'Transporte',
  'Outro custo',
];

export function calculateBudgetSummary(budget: BudgetData): BudgetSummaryResult {
  if (!budget) {
    return {
      byCategory: {} as Record<BudgetLineCategory, CategoryCostBreakdown>,
      totalInternalCostCents: 0,
      hasAnyPendingItems: false,
      pendingItemNames: [],
      sellingPriceCents: null,
      estimatedMarginCents: null,
      confirmedByResponsible: false,
    };
  }
  const byCategory = {} as Record<BudgetLineCategory, CategoryCostBreakdown>;
  for (const cat of ALL_CATEGORIES) {
    byCategory[cat] = {
      category: cat,
      subtotalCents: 0,
      hasPendingItems: false,
      pendingCount: 0,
    };
  }

  let totalInternalCostCents = 0;
  let hasAnyPendingItems = false;
  const pendingItemNames: string[] = [];

  for (const item of (budget?.items || [])) {
    const cat = byCategory[item.category] ? item.category : 'Outro custo';
    const lineCalc = calculateLineItemTotal(item);
    if (lineCalc.isPending || lineCalc.totalCents === null) {
      byCategory[cat].hasPendingItems = true;
      byCategory[cat].pendingCount += 1;
      hasAnyPendingItems = true;
      pendingItemNames.push(`${item.name} (${lineCalc.pendingReason || 'pendente'})`);
    } else {
      byCategory[cat].subtotalCents += lineCalc.totalCents;
      totalInternalCostCents += lineCalc.totalCents;
    }
  }

  const sellingPriceCents =
    budget.sellingPriceCents !== null && budget.sellingPriceCents !== undefined && budget.sellingPriceCents > 0
      ? budget.sellingPriceCents
      : null;

  const estimatedMarginCents =
    sellingPriceCents !== null && !hasAnyPendingItems
      ? sellingPriceCents - totalInternalCostCents
      : null;

  return {
    byCategory,
    totalInternalCostCents,
    hasAnyPendingItems,
    pendingItemNames,
    sellingPriceCents,
    estimatedMarginCents,
    confirmedByResponsible: Boolean(budget.confirmedByResponsible),
  };
}
