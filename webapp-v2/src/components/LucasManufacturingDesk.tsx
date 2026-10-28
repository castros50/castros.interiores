import React, { useState } from 'react';
import {
  Layers,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Send,
  Plus,
  Trash2,
  HelpCircle,
  Scissors,
  Check,
  ShieldCheck,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import {
  AttendanceRecord,
  ManufacturingProjectData,
  ManufacturingComponent,
  ManufacturingMaterialRequirement,
  AssemblyManualStep,
  QualityCheckpoint,
  SourceClassification,
  MaterialCatalogItem,
} from '../types';
import { formatCurrencyBRL } from '../utils/calculations';

interface LucasManufacturingDeskProps {
  order: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  onUpdateOrder: (updated: AttendanceRecord) => void;
  onRequestHandoff: (orderId: string, toDesk: string, reason: string) => void;
  onOpenFullWorkflow?: () => void;
}

export const LucasManufacturingDesk: React.FC<LucasManufacturingDeskProps> = ({
  order,
  materialsCatalog,
  onUpdateOrder,
  onRequestHandoff,
  onOpenFullWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<
    'ficha' | 'pecas' | 'materiais' | 'manual' | 'qualidade'
  >('ficha');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Se não possuir manufacturingData, inicializar modelo rascunho
  const project: ManufacturingProjectData = order.manufacturingData || {
    id: `mfg-${order.id}`,
    modelCode: `MOD-${order.attendanceNumber}`,
    modelName: order.furnitureType || 'Estofado Sob Encomenda',
    category: 'sofa',
    productCategory: 'Sofá Fixo',
    unitsCount: 1,
    version: 'v1.0-rascunho',
    technicalDraftStatus: 'rascunho_tecnico',
    isDraft: true,
    dimensions: {
      widthCm: 160,
      depthCm: 88,
      heightCm: 92,
      seatHeightCm: 45,
      seatDepthCm: 55,
      armWidthCm: 20,
      rawText: '160cm x 88cm x 92cm',
      source: 'proposta_pendente',
    },
    unitDimensions: {
      widthMm: 1600,
      depthMm: 880,
      heightMm: 920,
      seatHeightMm: 450,
      source: 'proposta_pendente',
    },
    finishingWishes: 'Tecido linho ou veludo, toque macio',
    workshopMethodNotes: 'Montagem estrutural em eucalipto',
    components: [],
    materials: [],
    materialRequirements: [],
    assemblyManual: {
      version: 'v1.0-rascunho',
      status: 'rascunho_tecnico',
      isDraft: true,
      modelCode: `MOD-${order.attendanceNumber}`,
      modelName: order.furnitureType || 'Estofado Sob Encomenda',
      steps: [],
      materialsAndTools: [],
      lastUpdatedAt: new Date().toISOString(),
      referenceImages: [],
      generalPreparationNotes: '',
      finalInspectionCriteria: '',
    },
    qualityCheckpoints: [],
    technicalNotes: '',
  };

  const handleSaveProject = async (updatedProject: ManufacturingProjectData) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/orders/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          manufacturingData: updatedProject,
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        onUpdateOrder(data.order);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao salvar projeto de fabricação:', err);
      alert('Erro ao salvar projeto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleValidation = (itemType: string, id: string) => {
    const next = { ...project };
    if (itemType === 'component') {
      next.components = next.components.map((c) =>
        c.id === id
          ? {
              ...c,
              source: (c.source === 'proposta_pendente'
                ? 'informado_oficina'
                : 'proposta_pendente') as SourceClassification,
            }
          : c
      );
    } else if (itemType === 'material') {
      next.materialRequirements = (next.materialRequirements || []).map((m) =>
        m.id === id
          ? {
              ...m,
              source: (m.source === 'proposta_pendente'
                ? 'informado_oficina'
                : 'proposta_pendente') as SourceClassification,
            }
          : m
      );
    }
    handleSaveProject(next);
  };

  const handleApproveDraft = () => {
    const next = {
      ...project,
      isDraft: false,
      version: 'v1.0-aprovada',
      approvedByResponsible: 'Oficina Técnica Castros',
      approvedAt: new Date().toISOString(),
    };
    handleSaveProject(next);
  };

  const getSourceBadge = (source: SourceClassification) => {
    switch (source) {
      case 'informado_oficina':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Informado pela Oficina
          </span>
        );
      case 'analise_imagem':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            Visual na Imagem
          </span>
        );
      case 'calculado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            Calculado com Margem
          </span>
        );
      case 'proposta_pendente':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-700" /> Proposta Pendente de Validação
          </span>
        );
    }
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5DEC9] shadow-sm overflow-hidden">
      {/* Header da Mesa de Projetos */}
      <div className="bg-[#181512] text-[#F9F6F0] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#9A7138] flex items-center justify-center text-white shrink-0 shadow">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#2E2722] text-[#E5DEC9] border border-[#57534E]">
                  Mesa 3 — Projetos & Fabricação
                </span>
                <span className="text-xs text-[#E5DEC9]">
                  Responsável: <strong>Lucas</strong>
                </span>
                {project.isDraft ? (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Rascunho Técnico ({project.version})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    Projeto Aprovado ({project.version})
                  </span>
                )}
              </div>
              <h2 className="text-xl font-serif-display font-bold text-white mt-1">
                {project.modelName} ({project.modelCode})
              </h2>
              <p className="text-xs text-[#D6CFC5] mt-0.5">
                Pedido: <strong>{order.attendanceNumber}</strong> | Cliente:{' '}
                <strong>{order.clientName}</strong> | Tipo: <strong>{order.orderType}</strong> | Quantidade:{' '}
                <strong>{order.piecesCount}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenFullWorkflow && (
              <button
                type="button"
                onClick={onOpenFullWorkflow}
                className="px-3 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5 shadow"
              >
                <FolderOpen className="w-4 h-4" />
                Abrir Fluxo de 8 Etapas (Lucas)
              </button>
            )}

            <button
              type="button"
              onClick={printDocument}
              className="px-3 py-2 rounded-lg bg-[#2E2722] hover:bg-[#3D352E] text-xs font-medium text-white flex items-center gap-1.5 border border-[#57534E]"
            >
              <Printer className="w-4 h-4 text-[#E5DEC9]" />
              Imprimir Ficha A4
            </button>

            {project.isDraft && (
              <button
                type="button"
                onClick={handleApproveDraft}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white flex items-center gap-1.5 shadow"
              >
                <ShieldCheck className="w-4 h-4" />
                Aprovar Rascunho Técnico
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onRequestHandoff(
                  order.id,
                  'ana_compras',
                  'Ficha técnica e lista de compras concluídas por Lucas'
                )
              }
              className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5 shadow"
            >
              <Send className="w-4 h-4" />
              Encaminhar p/ Ana (Compras)
            </button>
          </div>
        </div>

        {/* Alerta de Ética Técnica */}
        <div className="mt-4 p-3 rounded-lg bg-[#2E2722] border border-[#57534E] text-xs flex items-start gap-2.5 text-[#E5DEC9]">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Diretriz Técnica Castros Interiores:</strong> Medidas exatas,
            construção interna e resistência estrutural nunca são deduzidas apenas por foto. Todos os itens não
            validados fisicamente na oficina permanecem rotulados como <em>Proposta Pendente de Validação</em>.
          </div>
        </div>
      </div>

      {/* Tabs de Navegação da Mesa */}
      <div className="border-b border-[#E5DEC9] bg-[#FAF8F5] px-6 flex flex-wrap gap-2 pt-3">
        {[
          { id: 'ficha', label: '1. Ficha Técnica do Modelo', count: null },
          { id: 'pecas', label: '2. Lista de Peças & Componentes', count: project.components.length },
          {
            id: 'materiais',
            label: '3. Relação de Materiais & Corte',
            count: (project.materialRequirements || []).length,
          },
          {
            id: 'manual',
            label: '4. Manual de Montagem (12 Etapas)',
            count: project.assemblyManual?.steps?.length || 0,
          },
          {
            id: 'qualidade',
            label: '5. Conferência de Qualidade',
            count: project.qualityCheckpoints.length,
          },
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
            {t.count !== null && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-[#E5DEC9] text-[#181512]">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo das Abas */}
      <div className="p-6">
        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Dados da Mesa de Projetos salvos e sincronizados com sucesso no pedido compartilhado.
          </div>
        )}

        {/* ABA 1: FICHA TÉCNICA */}
        {activeTab === 'ficha' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-[11px] text-[#6B6257] uppercase font-semibold">Largura Externa</span>
                <p className="text-xl font-bold font-mono text-[#181512] mt-1">
                  {project.unitDimensions?.widthMm} mm
                </p>
                <div className="mt-2">{getSourceBadge(project.unitDimensions?.source || 'informado_cliente')}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-[11px] text-[#6B6257] uppercase font-semibold">Profundidade Externa</span>
                <p className="text-xl font-bold font-mono text-[#181512] mt-1">
                  {project.unitDimensions?.depthMm} mm
                </p>
                <div className="mt-2">{getSourceBadge(project.unitDimensions?.source || 'informado_cliente')}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-[11px] text-[#6B6257] uppercase font-semibold">Altura Total</span>
                <p className="text-xl font-bold font-mono text-[#181512] mt-1">
                  {project.unitDimensions?.heightMm} mm
                </p>
                <div className="mt-2">{getSourceBadge(project.unitDimensions?.source || 'informado_cliente')}</div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DEC9]">
                <span className="text-[11px] text-[#6B6257] uppercase font-semibold">Altura do Assento</span>
                <p className="text-xl font-bold font-mono text-[#181512] mt-1">
                  {project.unitDimensions?.seatHeightMm} mm
                </p>
                <div className="mt-2">{getSourceBadge(project.unitDimensions?.source || 'informado_cliente')}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl border border-[#E5DEC9] bg-white space-y-3">
                <h3 className="font-bold text-sm text-[#181512] flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#9A7138]" />
                  Especificações Construtivas Informadas
                </h3>
                <dl className="divide-y divide-[#EFECE6] text-xs">
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#6B6257]">Estrutura</dt>
                    <dd className="font-medium text-[#181512] text-right">
                      {project.structuralSystem || 'Eucalipto tratado aparelhado e compensado 15mm'}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#6B6257]">Sustentação do Assento</dt>
                    <dd className="font-medium text-[#181512] text-right">
                      {project.seatComfort || 'Percintas elásticas italianas entrelaçadas'}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#6B6257]">Espumação do Assento</dt>
                    <dd className="font-medium text-[#181512] text-right">
                      Espuma D-33 Prorelax certificada + Manta siliconada
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#6B6257]">Espumação do Encosto</dt>
                    <dd className="font-medium text-[#181512] text-right">
                      {project.backrestComfort || 'Espuma D-28 Soft ou fibra siliconada virgem'}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#6B6257]">Pés / Ferragens</dt>
                    <dd className="font-medium text-[#181512] text-right">
                      {project.feetSpecification || 'Madeira maciça torneada 120mm com sapatas de feltro'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-5 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
                <h3 className="font-bold text-sm text-[#181512] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#9A7138]" />
                  Notas Técnicas de Engenharia & Oficina
                </h3>
                <textarea
                  rows={6}
                  value={project.technicalNotes}
                  onChange={(e) => {
                    const next = { ...project, technicalNotes: e.target.value };
                    onUpdateOrder({ ...order, manufacturingData: next });
                  }}
                  placeholder="Registre observações técnicas sobre o protótipo, folgas de costura, sentido de corte do tecido e cuidados na furação..."
                  className="w-full text-xs p-3 rounded-lg border border-[#D6CFC5] bg-white text-[#181512]"
                />
                <button
                  type="button"
                  onClick={() => handleSaveProject(project)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-[#181512] hover:bg-[#2E2722] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Notas Técnicas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: LISTA DE PEÇAS & COMPONENTES */}
        {activeTab === 'pecas' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <p className="text-xs text-[#6B6257]">
                Identificação numerada de cada peça com medidas em milímetros (Comprimento x Largura x Espessura) e
                quantidade calculada para o lote total ({order.piecesCount}).
              </p>
              <span className="text-xs font-semibold text-[#181512] bg-[#F3EFE6] px-3 py-1 rounded-full">
                Total de Peças no Lote:{' '}
                {project.components.reduce(
                  (sum, c) => sum + (c.totalQuantityForOrder || c.quantityPerUnit),
                  0
                )}
              </span>
            </div>

            <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Nome do Componente</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3 text-right">Dimensões (mm)</th>
                    <th className="py-2.5 px-3 text-center">Qtd / Móvel</th>
                    <th className="py-2.5 px-3 text-center font-bold">Qtd Total Lote</th>
                    <th className="py-2.5 px-3">Origem dos Dados</th>
                    <th className="py-2.5 px-3 text-center">Validação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {project.components.map((comp) => (
                    <tr key={comp.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2 px-3 font-mono font-bold text-[#181512]">{comp.code}</td>
                      <td className="py-2 px-3 font-medium text-[#181512]">{comp.name}</td>
                      <td className="py-2 px-3 text-[#57534E]">{comp.material}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {comp.dimensionsMm.length} × {comp.dimensionsMm.width} × {comp.dimensionsMm.thickness}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{comp.quantityPerUnit}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-[#9A7138]">
                        {comp.totalQuantityForOrder}
                      </td>
                      <td className="py-2 px-3">{getSourceBadge(comp.source)}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleValidation('component', comp.id)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                            comp.source === 'informado_oficina'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                          title="Alternar validação da oficina"
                        >
                          {comp.source === 'informado_oficina' ? 'Validado' : 'Validar na Bancada'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: RELAÇÃO DE MATERIAIS, ESTOQUE & PLANO DE CORTE */}
        {activeTab === 'materiais' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#F9F6F0] border border-[#E5DEC9] text-xs text-[#57534E] flex flex-col md:flex-row justify-between gap-3">
              <div>
                <strong className="text-[#181512]">Critérios de Corte & Estoque:</strong> Tecidos consideram largura
                útil padrão de 1,40m com folgas de costura e perdas justificadas de 10% a 15%. Para comprar:
                compara o consumo total com estoque físico e reservas existentes, arredondando para unidades
                comerciais.
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="font-bold text-[#181512]">
                  Custo Total de Consumo Estimado:{' '}
                  {formatCurrencyBRL(
                    (project.materialRequirements || []).reduce(
                      (acc, m) =>
                        acc +
                        (m.unitCostCents || 0) *
                          (m.totalOrderRequirement || m.quantityPerUnit || m.totalRequired || m.requiredPerProduct || 0),
                      0
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Material & Especificação</th>
                    <th className="py-2.5 px-3 text-right">Qtd / Móvel</th>
                    <th className="py-2.5 px-3 text-right font-bold">Consumo Lote</th>
                    <th className="py-2.5 px-3 text-right">Perda Prevista</th>
                    <th className="py-2.5 px-3 text-right">Estoque Disp.</th>
                    <th className="py-2.5 px-3 text-right font-bold text-amber-300">Necessidade Compra</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {(project.materialRequirements || []).map((mat) => {
                    const reqQty = mat.totalOrderRequirement || mat.quantityPerUnit || mat.totalRequired || mat.requiredPerProduct || 0;
                    const availableStock = Math.max(0, (mat.physicalStock || 0) - (mat.reservedStock || 0));
                    const toBuy = Math.max(0, reqQty - availableStock);

                    return (
                      <tr key={mat.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-2 px-3 font-mono font-bold text-[#181512]">{mat.materialCode}</td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-[#181512]">{mat.materialName}</p>
                          <p className="text-[10px] text-[#6B6257]">{mat.specification}</p>
                          {mat.usableWidthMeters && (
                            <p className="text-[10px] text-purple-700">
                              Largura útil: {mat.usableWidthMeters}m | Sentido: {mat.patternDirection || 'comprimento'}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {mat.quantityPerUnit} {mat.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#181512]">
                          {mat.totalOrderRequirement} {mat.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#57534E]">
                          +{mat.scrapLossPercentage}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {availableStock} {mat.unit}
                          <span className="text-[10px] text-[#6B6257] block">
                            (Físico: {mat.physicalStock || 0} / Res: {mat.reservedStock || 0})
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/50">
                          {toBuy > 0 ? `${toBuy.toFixed(1)} ${mat.unit}` : 'Suficiente em estoque'}
                        </td>
                        <td className="py-2 px-3">{getSourceBadge(mat.source)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 4: MANUAL DE MONTAGEM SEQUENCIAL (12 ETAPAS) */}
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-[#181512]">
                  Manual de Montagem Sequencial Padronizado — 12 Etapas de Fabricação
                </h3>
                <p className="text-xs text-[#6B6257]">
                  Organizado por modelo e versão. Cada etapa define componentes, sequência, pontos de atenção e
                  critério de conferência.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                Status: {project.assemblyManual?.isDraft ? 'Rascunho Técnico de Oficina' : 'Aprovado'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {project.assemblyManual?.steps?.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] hover:bg-white transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EFECE6]">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#181512] text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {step.stepNumber}
                      </span>
                      <h4 className="font-bold text-sm text-[#181512]">{step.title}</h4>
                    </div>
                    {step.estimatedMinutes && (
                      <span className="text-xs text-[#6B6257] font-mono">
                        Tempo estimado: ~{step.estimatedMinutes} min
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#181512] mt-2.5 leading-relaxed">{step.description}</p>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {step.piecesUsed && step.piecesUsed.length > 0 && (
                      <div className="p-2.5 rounded bg-white border border-[#E5DEC9]">
                        <span className="font-semibold text-[#6B6257] block mb-1">Peças Numeradas Utilizadas:</span>
                        <div className="flex flex-wrap gap-1">
                          {step.piecesUsed.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#D6CFC5] font-mono font-medium text-[#181512]"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {step.attentionPoints && (
                      <div className="p-2.5 rounded bg-amber-50 border border-amber-200">
                        <span className="font-semibold text-amber-900 block mb-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Ponto de Atenção Crítico:
                        </span>
                        <p className="text-amber-800 text-[11px]">{step.attentionPoints}</p>
                      </div>
                    )}
                  </div>

                  {step.qualityCheckCriteria && (
                    <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Critério de aprovação: {step.qualityCheckCriteria}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 5: CONFERÊNCIA DE QUALIDADE */}
        {activeTab === 'qualidade' && (
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-[#181512]">
              Checkpoints de Tolerância e Qualidade Castros Interiores
            </h3>
            <p className="text-xs text-[#6B6257]">
              Cada lote de fabricação é inspecionado antes da embalagem e faturamento.
            </p>

            <div className="overflow-x-auto border border-[#E5DEC9] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] text-[#F9F6F0]">
                    <th className="py-2.5 px-3">Item / Checkpoint</th>
                    <th className="py-2.5 px-3">Critério de Inspeção</th>
                    <th className="py-2.5 px-3">Tolerância Máxima</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {project.qualityCheckpoints.map((qc) => (
                    <tr key={qc.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-3 font-semibold text-[#181512]">{qc.item}</td>
                      <td className="py-2.5 px-3 text-[#57534E]">{qc.criteria}</td>
                      <td className="py-2.5 px-3 font-mono text-[#181512]">{qc.tolerance || 'Zero defeito'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            qc.status === 'aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : qc.status === 'reprovado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {(qc.status || 'pendente').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
