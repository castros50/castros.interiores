import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  DollarSign,
  Calculator,
  RefreshCw,
  Eye,
  EyeOff,
  Tag,
  Layers,
  Archive,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import {
  MaterialCatalogItem,
  RawMaterialCategory,
  AttendanceRecord,
  BudgetLineCategory,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';

interface RawMaterialsAndPricingProps {
  materials: MaterialCatalogItem[];
  attendances: AttendanceRecord[];
  onSaveMaterial: (material: MaterialCatalogItem) => Promise<void>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
  onRecalculateBudgets?: (updatedCatalog: MaterialCatalogItem[]) => Promise<void>;
  className?: string;
}

const RAW_CATEGORIES_META: Array<{
  id: RawMaterialCategory;
  label: string;
  budgetCategory: BudgetLineCategory;
  defaultUnit: string;
  defaultPurchaseUnit: string;
  description: string;
}> = [
  {
    id: 'espumas',
    label: 'Espumas e Enchimentos Bloco',
    budgetCategory: 'Material',
    defaultUnit: 'm²',
    defaultPurchaseUnit: 'bloco (3m²)',
    description: 'Espumas laminadas e blocos (D28, D33, D45, Soft, HR) com densidade e espessura controladas.',
  },
  {
    id: 'tecidos_revestimentos',
    label: 'Tecidos e Revestimentos',
    budgetCategory: 'Material',
    defaultUnit: 'm linear',
    defaultPurchaseUnit: 'rolo (50m)',
    description: 'Linho, veludo, suede, corino e tecidos nobres com largura útil padrão (ex: 1,40m) e sentido de estampa.',
  },
  {
    id: 'madeira_chapas',
    label: 'Madeiras, Ripas e Chapas',
    budgetCategory: 'Material',
    defaultUnit: 'm linear',
    defaultPurchaseUnit: 'feixe (30m)',
    description: 'Eucalipto tratado seco em estufa, pinus aparelhado, compensado naval e MDF estrutural.',
  },
  {
    id: 'percintas_molas',
    label: 'Percintas, Molas e Sustentação',
    budgetCategory: 'Material',
    defaultUnit: 'm',
    defaultPurchaseUnit: 'rolo (100m)',
    description: 'Percintas elásticas italianas de alta tração (50mm/70mm), molas bonnel e molas ensacadas.',
  },
  {
    id: 'grampos_fixadores',
    label: 'Grampos, Parafusos e Fixadores',
    budgetCategory: 'Material',
    defaultUnit: 'unidade',
    defaultPurchaseUnit: 'caixa (5.000 un)',
    description: 'Grampos pneumáticos 80/10, 80/12, 14/50 estruturais, parafusos soberbos e porcas borboleta.',
  },
  {
    id: 'colas_auxiliares',
    label: 'Colas e Produtos Químicos Auxiliares',
    budgetCategory: 'Material',
    defaultUnit: 'kg',
    defaultPurchaseUnit: 'lata (14 kg)',
    description: 'Adesivo de contato sem toluol, cola PVA branca D3 para marcenaria e solventes ecológicos.',
  },
  {
    id: 'mantas_enchimentos',
    label: 'Mantas Siliconadas e Fibras',
    budgetCategory: 'Material',
    defaultUnit: 'm',
    defaultPurchaseUnit: 'rolo (30m)',
    description: 'Mantas acrílicas siliconadas 150g/200g antialérgicas e fibra siliconada plumante para almofadas.',
  },
  {
    id: 'pes_ferragens',
    label: 'Pés, Mecanismos e Ferragens',
    budgetCategory: 'Material',
    defaultUnit: 'peça',
    defaultPurchaseUnit: 'jogo / caixa',
    description: 'Pés cônicos de madeira nobre, sapatilhas de nylon, cantoneiras de aço e mecanismos articulados.',
  },
  {
    id: 'outros_materiais',
    label: 'Outros Materiais da Oficina',
    budgetCategory: 'Material',
    defaultUnit: 'un',
    defaultPurchaseUnit: 'un',
    description: 'Zíperes náuticos, vivos, cordões de algodão, feltros protetores e forros inferiores TNT.',
  },
];

export const RawMaterialsAndPricing: React.FC<RawMaterialsAndPricingProps> = ({
  materials,
  attendances,
  onSaveMaterial,
  onDeleteMaterial,
  onRecalculateBudgets,
  className = '',
}) => {
  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<'all' | RawMaterialCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Estados do Formulário
  const [formCategory, setFormCategory] = useState<RawMaterialCategory>('espumas');
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formSpecification, setFormSpecification] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('bloco (3m²)');
  const [formPurchasePackageQty, setFormPurchasePackageQty] = useState('3');
  const [formConsumptionUnit, setFormConsumptionUnit] = useState('m²');
  const [formPurchasePriceReais, setFormPurchasePriceReais] = useState('180,00');
  const [formFreightReais, setFormFreightReais] = useState('0,00');
  const [formDiscountReais, setFormDiscountReais] = useState('0,00');
  const [formLossMarginPercent, setFormLossMarginPercent] = useState('10');
  const [formPriceOrigin, setFormPriceOrigin] = useState<MaterialCatalogItem['priceOrigin']>('Fornecedor cadastrado');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // Campos específicos
  const [foamDensity, setFoamDensity] = useState('D33 Certificada');
  const [foamType, setFoamType] = useState<'Lâmina' | 'Bloco' | 'Flocos' | 'Modelada'>('Bloco');
  const [dimensionsMm, setDimensionsMm] = useState({ length: 2000, width: 1500, thickness: 100 });

  const [fabricType, setFabricType] = useState('Linho Rústico');
  const [fabricColor, setFabricColor] = useState('Areia / Cru');
  const [usableWidthMeters, setUsableWidthMeters] = useState('1.40');
  const [patternDirection, setPatternDirection] = useState<'Sentido do rolo' | 'Largura / Atravessado' | 'Indiferente'>('Sentido do rolo');

  const [stapleType, setStapleType] = useState('80/10');
  const [stapleQuantityPerBox, setStapleQuantityPerBox] = useState('5000');

  const [woodSpecies, setWoodSpecies] = useState('Eucalipto Tratado em Estufa');
  const [woodSection, setWoodSection] = useState('70 x 25 mm');

  // Recalculo de orçamentos
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateNotice, setRecalculateNotice] = useState<string | null>(null);

  // Helper para converter string de reais em centavos
  const parseCurrencyInputToCents = (input: string): number => {
    if (!input || !input.trim()) return 0;
    const clean = input.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  // Cálculo de Custo por Unidade de Consumo em Tempo Real com Memória
  const calculationSummary = useMemo(() => {
    const purchaseCents = parseCurrencyInputToCents(formPurchasePriceReais);
    const freightCents = parseCurrencyInputToCents(formFreightReais);
    const discountCents = parseCurrencyInputToCents(formDiscountReais);
    const pkgQty = parseFloat(formPurchasePackageQty.replace(',', '.')) || 1;

    if (pkgQty <= 0) {
      return {
        unitCostCents: 0,
        memoryText: 'Quantidade por embalagem inválida (deve ser maior que zero).',
      };
    }

    const netPurchaseCents = Math.max(0, purchaseCents + freightCents - discountCents);
    const unitCostCents = Math.round(netPurchaseCents / pkgQty);

    const memoryText = `Custo por ${formConsumptionUnit || 'unidade'}: R$ ${(unitCostCents / 100).toFixed(
      unitCostCents < 100 ? 3 : 2
    )} = (R$ ${(purchaseCents / 100).toFixed(2)} compra + R$ ${(freightCents / 100).toFixed(2)} frete - R$ ${(
      discountCents / 100
    ).toFixed(2)} desc.) ÷ ${pkgQty} ${formConsumptionUnit} contidos na embalagem`;

    return {
      unitCostCents,
      memoryText,
    };
  }, [
    formPurchasePriceReais,
    formFreightReais,
    formDiscountReais,
    formPurchasePackageQty,
    formConsumptionUnit,
  ]);

  // Abrir Modal para Criar
  const handleOpenCreateModal = (catId?: RawMaterialCategory) => {
    const targetCat = catId || 'espumas';
    const catMeta = RAW_CATEGORIES_META.find((c) => c.id === targetCat)!;

    setEditingItem(null);
    setFormCategory(targetCat);
    setFormCode(`MAT-${targetCat.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`);
    setFormName('');
    setFormSpecification('');
    setFormBrand('');
    setFormSupplier('Fornecedor Oficina');
    setFormPurchaseUnit(catMeta.defaultPurchaseUnit);
    setFormPurchasePackageQty(targetCat === 'grampos_fixadores' ? '5000' : targetCat === 'espumas' ? '3' : '1');
    setFormConsumptionUnit(catMeta.defaultUnit);
    setFormPurchasePriceReais('0,00');
    setFormFreightReais('0,00');
    setFormDiscountReais('0,00');
    setFormLossMarginPercent('10');
    setFormPriceOrigin('Fornecedor cadastrado');
    setFormIsActive(true);
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEditModal = (item: MaterialCatalogItem) => {
    setEditingItem(item);
    setFormCategory(item.rawCategory || 'outros_materiais');
    setFormCode(item.code || '');
    setFormName(item.name);
    setFormSpecification(item.specification || '');
    setFormBrand(item.brand || '');
    setFormSupplier(item.supplier || '');
    setFormPurchaseUnit(item.purchaseUnit || item.unit);
    setFormPurchasePackageQty(String(item.purchasePackageQuantity || item.conversionFactor || 1));
    setFormConsumptionUnit(item.consumptionUnit || item.unit);
    setFormPurchasePriceReais(
      item.purchasePriceCents !== undefined
        ? (item.purchasePriceCents / 100).toFixed(2).replace('.', ',')
        : ((item.unitCostCents * (item.purchasePackageQuantity || 1)) / 100).toFixed(2).replace('.', ',')
    );
    setFormFreightReais(((item.freightCents || 0) / 100).toFixed(2).replace('.', ','));
    setFormDiscountReais(((item.discountCents || 0) / 100).toFixed(2).replace('.', ','));
    setFormLossMarginPercent(String(item.lossMarginPercent || 10));
    setFormPriceOrigin(item.priceOrigin || 'Fornecedor cadastrado');
    setFormIsActive(item.isActive !== false);
    setFormNotes(item.notes || '');

    // Específicos
    if (item.foamDensity) setFoamDensity(item.foamDensity);
    if (item.foamType) setFoamType(item.foamType);
    if (item.dimensionsMm) setDimensionsMm(item.dimensionsMm);
    if (item.fabricType) setFabricType(item.fabricType);
    if (item.color) setFabricColor(item.color);
    if (item.usableWidthMeters) setUsableWidthMeters(String(item.usableWidthMeters));
    if (item.patternDirection) setPatternDirection(item.patternDirection as any);
    if (item.stapleType) setStapleType(item.stapleType);
    if (item.stapleQuantityPerBox) setStapleQuantityPerBox(String(item.stapleQuantityPerBox));
    if (item.woodSpecies) setWoodSpecies(item.woodSpecies);
    if (item.woodSection) setWoodSection(item.woodSection);

    setIsModalOpen(true);
  };

  // Salvar Item do Catálogo
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const catMeta = RAW_CATEGORIES_META.find((c) => c.id === formCategory);

      const pkgQty = parseFloat(formPurchasePackageQty.replace(',', '.')) || 1;
      const purchasePriceCents = parseCurrencyInputToCents(formPurchasePriceReais);
      const freightCents = parseCurrencyInputToCents(formFreightReais);
      const discountCents = parseCurrencyInputToCents(formDiscountReais);

      const newItem: MaterialCatalogItem = {
        id: editingItem ? editingItem.id : `mat-${Date.now()}`,
        ownerId: 'system',
        code: formCode.trim() || `MAT-${Date.now().toString().slice(-4)}`,
        name: formName.trim(),
        category: catMeta?.budgetCategory || 'Material',
        rawCategory: formCategory,
        specification: formSpecification.trim(),
        brand: formBrand.trim(),
        supplier: formSupplier.trim() || 'Fornecedor Oficina',
        unit: formConsumptionUnit.trim() || 'un',
        consumptionUnit: formConsumptionUnit.trim() || 'un',
        purchaseUnit: formPurchaseUnit.trim() || 'un',
        purchasePackageQuantity: pkgQty,
        conversionFactor: pkgQty,
        purchasePriceCents,
        freightCents,
        discountCents,
        unitCostCents: calculationSummary.unitCostCents,
        calculationMemory: calculationSummary.memoryText,
        priceDate: now.split('T')[0],
        priceOrigin: formPriceOrigin,
        lossMarginPercent: parseFloat(formLossMarginPercent) || 0,
        isActive: formIsActive,
        notes: formNotes.trim(),
        physicalStock: editingItem?.physicalStock ?? 10,
        reservedStock: editingItem?.reservedStock ?? 0,
        updatedAt: now,
        createdAt: editingItem?.createdAt || now,

        // Específicos
        ...(formCategory === 'espumas'
          ? {
              foamDensity,
              foamType,
              dimensionsMm,
            }
          : {}),
        ...(formCategory === 'tecidos_revestimentos'
          ? {
              fabricType,
              color: fabricColor,
              usableWidthMeters: parseFloat(usableWidthMeters) || 1.4,
              patternDirection,
            }
          : {}),
        ...(formCategory === 'grampos_fixadores'
          ? {
              stapleType,
              stapleQuantityPerBox: parseInt(stapleQuantityPerBox) || 5000,
            }
          : {}),
        ...(formCategory === 'madeira_chapas'
          ? {
              woodSpecies,
              woodSection,
            }
          : {}),
      };

      await onSaveMaterial(newItem);
      setSaveSuccessNotice(`Material "${newItem.name}" salvo com sucesso e disponível para orçamentos.`);
      setTimeout(() => setSaveSuccessNotice(null), 4000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar material:', err);
      alert(`Erro ao salvar material: ${err instanceof Error ? err.message : 'Falha interna'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtragem dos Materiais
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      // Filtro categoria
      if (selectedCategory !== 'all' && m.rawCategory !== selectedCategory) {
        return false;
      }
      // Filtro status
      if (statusFilter === 'active' && m.isActive === false) return false;
      if (statusFilter === 'inactive' && m.isActive !== false) return false;

      // Busca por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesCode = (m.code || '').toLowerCase().includes(query);
        const matchesName = m.name.toLowerCase().includes(query);
        const matchesSpec = (m.specification || '').toLowerCase().includes(query);
        const matchesSupplier = (m.supplier || '').toLowerCase().includes(query);
        const matchesBrand = (m.brand || '').toLowerCase().includes(query);
        return matchesCode || matchesName || matchesSpec || matchesSupplier || matchesBrand;
      }
      return true;
    });
  }, [materials, selectedCategory, statusFilter, searchTerm]);

  // Auditoria de orçamentos incompletos por falta de preço
  const incompleteBudgetsCount = useMemo(() => {
    let count = 0;
    for (const att of attendances) {
      const hasMissingPrice = att.budget?.items?.some(
        (it) => it.unitCostCents === null || it.unitCostCents === undefined || it.unitCostCents <= 0
      );
      if (hasMissingPrice) count++;
    }
    return count;
  }, [attendances]);

  // Recalcular orçamentos com os preços atuais
  const handleRecalculateCurrentPrices = async () => {
    if (!onRecalculateBudgets) return;
    if (
      !confirm(
        'Deseja recalcular os itens orçados em pedidos com os preços atuais da oficina? Isso gerará uma nova versão técnica sem alterar os orçamentos históricos já aprovados pelo cliente.'
      )
    ) {
      return;
    }
    setIsRecalculating(true);
    setRecalculateNotice(null);
    try {
      await onRecalculateBudgets(materials);
      setRecalculateNotice('Orçamentos recalculados com os preços atuais vigentes da oficina.');
      setTimeout(() => setRecalculateNotice(null), 4000);
    } catch (err) {
      alert(`Falha ao recalcular orçamentos: ${err instanceof Error ? err.message : 'Erro'}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cabeçalho da Seção */}
      <div className="bg-white rounded-xl border border-[#E5DEC9] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#9A7138] flex items-center justify-center text-white shrink-0 shadow">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F9F6F0] text-[#9A7138] border border-[#E5DEC9]">
                Quadro Oficial de Suprimentos
              </span>
              <span className="text-xs text-[#6B6257]">
                Base Única Compartilhada: <strong>Ana (Compras), Lucas (Projetos), Pedro (Reformas), Mila (Financeiro)</strong>
              </span>
            </div>
            <h2 className="text-xl font-serif-display font-bold text-[#181512] mt-1">
              Matérias-Primas, Preços & Memória de Cálculo
            </h2>
            <p className="text-xs text-[#57534E] max-w-2xl mt-0.5">
              Cadastro rigoroso de espumas, tecidos, madeiras, grampos e insumos com preço de compra, frete, embalagem e conversão matemática para custo unitário de consumo nos orçamentos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRecalculateBudgets && (
            <button
              type="button"
              onClick={handleRecalculateCurrentPrices}
              disabled={isRecalculating}
              className="px-3.5 py-2 rounded-xl border border-[#D6CFC5] hover:bg-[#FAF8F5] text-xs font-semibold text-[#181512] flex items-center gap-1.5 transition-colors"
              title="Aplica preços atuais aos orçamentos abertos sem apagar histórico"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-[#9A7138]' : 'text-[#6B6257]'}`} />
              <span>Recalcular com Preços Atuais</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 rounded-xl bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Material</span>
          </button>
        </div>
      </div>

      {/* Avisos de Sucesso ou Orçamento Incompleto */}
      {saveSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {recalculateNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{recalculateNotice}</span>
        </div>
      )}

      {incompleteBudgetsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-900">
                Atenção: {incompleteBudgetsCount} orçamento(s) marcado(s) como INCOMPLETO(S) por falta de preço
              </p>
              <p className="text-[11px] text-amber-800">
                A regra da Castros Interiores impede preencher silenciosamente preços não cadastrados como zero. Cadastre os preços abaixo para completar os orçamentos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grade de Categorias Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedCategory === 'all'
              ? 'bg-[#181512] text-white border-[#181512] shadow'
              : 'bg-white hover:bg-[#FAF8F5] border-[#E5DEC9] text-[#181512]'
          }`}
        >
          <span className="text-[10px] font-bold uppercase opacity-75 block">Geral</span>
          <p className="font-bold text-xs mt-0.5">Todas as Categorias</p>
          <span className="text-[10px] opacity-75 mt-1 block font-mono">{materials.length} itens</span>
        </button>

        {RAW_CATEGORIES_META.map((cat) => {
          const count = materials.filter((m) => m.rawCategory === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-[#9A7138] text-white border-[#9A7138] shadow'
                  : 'bg-white hover:bg-[#FAF8F5] border-[#E5DEC9] text-[#181512]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase opacity-75 block">{cat.defaultUnit}</span>
              <p className="font-bold text-xs mt-0.5 line-clamp-1">{cat.label}</p>
              <span className="text-[10px] opacity-75 mt-1 block font-mono">{count} cadastrados</span>
            </button>
          );
        })}
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white rounded-xl border border-[#E5DEC9] p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por código (ESP-D33, TEC-LIN), nome, fornecedor ou especificação..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D6CFC5] text-xs bg-[#FAF8F5] text-[#181512] focus:ring-1 focus:ring-[#9A7138] focus:border-[#9A7138] outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#D6CFC5] rounded-lg p-0.5 text-xs text-[#57534E]">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded ${statusFilter === 'all' ? 'bg-[#181512] text-white font-semibold' : 'hover:text-[#181512]'}`}
            >
              Todos ({materials.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded ${statusFilter === 'active' ? 'bg-[#181512] text-white font-semibold' : 'hover:text-[#181512]'}`}
            >
              Ativos ({materials.filter((m) => m.isActive !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 rounded ${statusFilter === 'inactive' ? 'bg-[#181512] text-white font-semibold' : 'hover:text-[#181512]'}`}
            >
              Inativos ({materials.filter((m) => m.isActive === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Matérias-Primas e Preços */}
      <div className="bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181512] text-[#F9F6F0]">
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Código / Item</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Categoria & Specs</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Embalagem Compra</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Preço Compra</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right font-mono text-amber-300">
                  Custo Consumo
                </th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Estoque</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-center">Status</th>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#78716C]">
                    Nenhum material encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => {
                  const available = Math.max(0, (mat.physicalStock || 0) - (mat.reservedStock || 0));

                  return (
                    <tr key={mat.id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Código e Nome */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-[#9A7138] text-[11px] block">{mat.code || 'S/C'}</span>
                        <p className="font-bold text-[#181512] text-xs">{mat.name}</p>
                        {mat.brand && <span className="text-[10px] text-[#78716C]">Marca: {mat.brand}</span>}
                      </td>

                      {/* Especificação e Detalhes */}
                      <td className="py-3 px-3.5 max-w-xs">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F3EFE6] text-[#6B6257] inline-block mb-1">
                          {mat.rawCategory ? mat.rawCategory.replace(/_/g, ' ') : mat.category}
                        </span>
                        <p className="text-[11px] text-[#57534E] line-clamp-2">{mat.specification || 'Sem especificação adicional'}</p>
                        {mat.usableWidthMeters && (
                          <span className="text-[10px] text-purple-700 block font-medium">
                            Largura útil: {mat.usableWidthMeters}m ({mat.patternDirection || 'sentido do rolo'})
                          </span>
                        )}
                        {mat.foamDensity && (
                          <span className="text-[10px] text-emerald-800 block font-medium">
                            Densidade: {mat.foamDensity} ({mat.foamType || 'Bloco'})
                          </span>
                        )}
                      </td>

                      {/* Embalagem de Compra */}
                      <td className="py-3 px-3.5">
                        <p className="font-medium text-[#181512]">{mat.purchaseUnit || mat.unit}</p>
                        <span className="text-[10px] text-[#78716C] block">
                          Contém: {mat.purchasePackageQuantity || mat.conversionFactor || 1} {mat.consumptionUnit || mat.unit}
                        </span>
                        <span className="text-[10px] text-[#78716C] block">Fornecedor: {mat.supplier}</span>
                      </td>

                      {/* Preço de Compra */}
                      <td className="py-3 px-3.5 text-right font-mono">
                        {mat.purchasePriceCents !== undefined ? (
                          <span className="font-semibold text-[#181512]">{formatCurrencyBRL(mat.purchasePriceCents)}</span>
                        ) : (
                          <span className="text-[#78716C]">—</span>
                        )}
                        <span className="text-[10px] text-[#78716C] block">
                          Frete: {formatCurrencyBRL(mat.freightCents || 0)}
                        </span>
                      </td>

                      {/* Custo de Consumo (Calculado e com Memória) */}
                      <td className="py-3 px-3.5 text-right font-mono">
                        <span className="font-bold text-sm text-[#181512] block">
                          {formatCurrencyBRL(mat.unitCostCents)}
                        </span>
                        <span className="text-[10px] text-[#9A7138] block font-sans">
                          por {mat.consumptionUnit || mat.unit}
                        </span>
                        {mat.calculationMemory && (
                          <span
                            className="text-[9px] text-[#78716C] block mt-0.5 max-w-[200px] ml-auto font-sans line-clamp-1 hover:line-clamp-none cursor-help"
                            title={mat.calculationMemory}
                          >
                            ℹ️ {mat.calculationMemory}
                          </span>
                        )}
                      </td>

                      {/* Estoque */}
                      <td className="py-3 px-3.5 text-right font-mono">
                        <span className={`font-bold ${available > 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                          {available} {mat.consumptionUnit || mat.unit}
                        </span>
                        <span className="text-[10px] text-[#78716C] block">
                          (Fís: {mat.physicalStock || 0} / Res: {mat.reservedStock || 0})
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            mat.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {mat.isActive !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(mat)}
                            className="p-1.5 rounded-lg border border-[#D6CFC5] hover:bg-[#EFECE6] text-[#181512]"
                            title="Editar especificações e preços"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Excluir material "${mat.name}" do catálogo?`)) {
                                onDeleteMaterial(mat.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-700"
                            title="Excluir do catálogo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E5DEC9] max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-[#EFECE6]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7138]">
                  Catálogo Oficial de Materiais da Oficina
                </span>
                <h3 className="text-lg font-serif-display font-bold text-[#181512]">
                  {editingItem ? 'Editar Matéria-Prima & Preço' : 'Cadastrar Nova Matéria-Prima'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#78716C] hover:text-[#181512] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Seleção de Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Categoria do Material *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const newCat = e.target.value as RawMaterialCategory;
                      setFormCategory(newCat);
                      const catMeta = RAW_CATEGORIES_META.find((c) => c.id === newCat);
                      if (catMeta) {
                        setFormConsumptionUnit(catMeta.defaultUnit);
                        setFormPurchaseUnit(catMeta.defaultPurchaseUnit);
                      }
                    }}
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5] bg-white font-semibold"
                  >
                    {RAW_CATEGORIES_META.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Código Único de Identificação *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ESP-D33, TEC-LIN-01, GRA-8010"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5] font-mono font-bold"
                  />
                </div>
              </div>

              {/* Nome e Especificação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Nome Comercial do Material *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Espuma D33 Alta Resiliência 12cm"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>

                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Ex: Espumas Sul Brasil / Castros Têxtil"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#57534E] font-medium mb-1">Especificação Técnica Detalhada</label>
                <textarea
                  rows={2}
                  value={formSpecification}
                  onChange={(e) => setFormSpecification(e.target.value)}
                  placeholder="Descreva densidade, composição, tratamento, espessura ou bitola..."
                  className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                />
              </div>

              {/* CAMPOS ESPECÍFICOS POR CATEGORIA */}
              {formCategory === 'espumas' && (
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
                  <span className="font-bold text-[#9A7138] block text-[11px] uppercase tracking-wider">
                    Parâmetros Específicos: Espuma de Estofamento
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[#57534E] mb-1">Densidade Real</label>
                      <input
                        type="text"
                        value={foamDensity}
                        onChange={(e) => setFoamDensity(e.target.value)}
                        placeholder="Ex: D33 Certificada"
                        className="w-full p-2 rounded border border-[#D6CFC5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Tipo de Peça</label>
                      <select
                        value={foamType}
                        onChange={(e) => setFoamType(e.target.value as any)}
                        className="w-full p-2 rounded border border-[#D6CFC5]"
                      >
                        <option value="Bloco">Bloco Comercial</option>
                        <option value="Lâmina">Lâmina Cortada</option>
                        <option value="Flocos">Flocos</option>
                        <option value="Modelada">Modelada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Comp x Larg (mm)</label>
                      <input
                        type="text"
                        value={`${dimensionsMm.length}x${dimensionsMm.width}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('x');
                          setDimensionsMm((prev) => ({
                            ...prev,
                            length: parseInt(parts[0]) || prev.length,
                            width: parseInt(parts[1]) || prev.width,
                          }));
                        }}
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Espessura (mm)</label>
                      <input
                        type="number"
                        value={dimensionsMm.thickness}
                        onChange={(e) =>
                          setDimensionsMm((prev) => ({ ...prev, thickness: parseInt(e.target.value) || 0 }))
                        }
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formCategory === 'tecidos_revestimentos' && (
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
                  <span className="font-bold text-[#9A7138] block text-[11px] uppercase tracking-wider">
                    Parâmetros Específicos: Tecido e Revestimento
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[#57534E] mb-1">Tipo de Tecido</label>
                      <input
                        type="text"
                        value={fabricType}
                        onChange={(e) => setFabricType(e.target.value)}
                        placeholder="Ex: Linho, Veludo"
                        className="w-full p-2 rounded border border-[#D6CFC5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Cor / Ref</label>
                      <input
                        type="text"
                        value={fabricColor}
                        onChange={(e) => setFabricColor(e.target.value)}
                        placeholder="Ex: Cru / 04"
                        className="w-full p-2 rounded border border-[#D6CFC5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Largura Útil (m)</label>
                      <input
                        type="text"
                        value={usableWidthMeters}
                        onChange={(e) => setUsableWidthMeters(e.target.value)}
                        placeholder="Ex: 1.40"
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Sentido Estampa</label>
                      <select
                        value={patternDirection}
                        onChange={(e) => setPatternDirection(e.target.value as any)}
                        className="w-full p-2 rounded border border-[#D6CFC5]"
                      >
                        <option value="Sentido do rolo">Sentido do rolo</option>
                        <option value="Largura / Atravessado">Largura / Atravessado</option>
                        <option value="Indiferente">Indiferente</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formCategory === 'grampos_fixadores' && (
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-2">
                  <span className="font-bold text-[#9A7138] block text-[11px] uppercase tracking-wider">
                    Parâmetros Específicos: Grampos e Fixadores
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#57534E] mb-1">Tipo / Medida do Grampo</label>
                      <input
                        type="text"
                        value={stapleType}
                        onChange={(e) => setStapleType(e.target.value)}
                        placeholder="Ex: 80/10, 80/12, 14/50"
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[#57534E] mb-1">Qtd na Caixa Fechada</label>
                      <input
                        type="number"
                        value={stapleQuantityPerBox}
                        onChange={(e) => {
                          setStapleQuantityPerBox(e.target.value);
                          setFormPurchasePackageQty(e.target.value);
                        }}
                        className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* BLOCO DE EMBALAGEM, PREÇO E CONVERSÃO */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9] space-y-3">
                <span className="font-bold text-[#181512] block text-[11px] uppercase tracking-wider">
                  Conversão de Embalagem & Preços em Reais (R$)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[#57534E] mb-1">Unidade de Compra *</label>
                    <input
                      type="text"
                      required
                      value={formPurchaseUnit}
                      onChange={(e) => setFormPurchaseUnit(e.target.value)}
                      placeholder="Ex: caixa, rolo, lata"
                      className="w-full p-2 rounded border border-[#D6CFC5]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#57534E] mb-1">Qtd na Embalagem *</label>
                    <input
                      type="text"
                      required
                      value={formPurchasePackageQty}
                      onChange={(e) => setFormPurchasePackageQty(e.target.value)}
                      placeholder="Ex: 5000, 50, 14, 3"
                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#57534E] mb-1">Unidade de Consumo *</label>
                    <input
                      type="text"
                      required
                      value={formConsumptionUnit}
                      onChange={(e) => setFormConsumptionUnit(e.target.value)}
                      placeholder="Ex: m, m², kg, un"
                      className="w-full p-2 rounded border border-[#D6CFC5] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#57534E] mb-1">Preço Compra (R$) *</label>
                    <input
                      type="text"
                      required
                      value={formPurchasePriceReais}
                      onChange={(e) => setFormPurchasePriceReais(e.target.value)}
                      placeholder="Ex: 180,00"
                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[#57534E] mb-1">Frete Atribuído (R$)</label>
                    <input
                      type="text"
                      value={formFreightReais}
                      onChange={(e) => setFormFreightReais(e.target.value)}
                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#57534E] mb-1">Desconto Atribuído (R$)</label>
                    <input
                      type="text"
                      value={formDiscountReais}
                      onChange={(e) => setFormDiscountReais(e.target.value)}
                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#57534E] mb-1">Margem de Perda / Corte (%)</label>
                    <input
                      type="number"
                      value={formLossMarginPercent}
                      onChange={(e) => setFormLossMarginPercent(e.target.value)}
                      className="w-full p-2 rounded border border-[#D6CFC5] font-mono"
                    />
                  </div>
                </div>

                {/* MEMÓRIA DE CÁLCULO EXIBIDA */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Calculator className="w-4 h-4 text-emerald-700" />
                    <span>Memória de Cálculo do Custo Unitário:</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed">{calculationSummary.memoryText}</p>
                </div>
              </div>

              {/* Fornecedor, Origem do Preço e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#57534E] mb-1">Fornecedor Habitual</label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="Ex: Espumas Sul Brasil"
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5]"
                  />
                </div>

                <div>
                  <label className="block text-[#57534E] mb-1">Origem do Preço</label>
                  <select
                    value={formPriceOrigin}
                    onChange={(e) => setFormPriceOrigin(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-[#D6CFC5] bg-white"
                  >
                    <option value="Fornecedor cadastrado">Fornecedor cadastrado</option>
                    <option value="Nota Fiscal">Nota Fiscal recente</option>
                    <option value="Cotação confirmada">Cotação confirmada</option>
                    <option value="Estimativa pendente">Estimativa pendente de cotação</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#9A7138] focus:ring-[#9A7138]"
                    />
                    <span className="font-semibold text-[#181512]">Item Ativo no Catálogo</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D6CFC5] font-medium text-xs text-[#57534E]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white font-semibold text-xs flex items-center gap-1.5 shadow"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
