import React, { useEffect, useState } from 'react';
import {
  Plus,
  Package,
  ShoppingCart,
  Send,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Search,
  ImageIcon,
  Pencil,
  X,
} from 'lucide-react';
import { ClientRecord, ProductSale, ProductSalePaymentMethod, ReadyMadeProduct } from '../types';
import { formatCurrencyBRL } from '../utils/calculations';

const PAYMENT_METHODS: ProductSalePaymentMethod[] = ['Pix', 'Dinheiro', 'Cartão', 'Transferência'];

interface CartItem {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  availableStock: number;
}

interface ProductDetailsDraft {
  name: string;
  description: string;
  category: string;
  color: string;
  size: string;
  style: string;
  widthCm: string;
  heightCm: string;
  depthCm: string;
}

function draftFromProduct(p: ReadyMadeProduct): ProductDetailsDraft {
  return {
    name: p.name,
    description: p.description || '',
    category: p.category || '',
    color: p.color || '',
    size: p.size || '',
    style: p.style || '',
    widthCm: p.widthCm != null ? String(p.widthCm) : '',
    heightCm: p.heightCm != null ? String(p.heightCm) : '',
    depthCm: p.depthCm != null ? String(p.depthCm) : '',
  };
}

function formatDimensions(p: ReadyMadeProduct): string | null {
  if (!p.widthCm && !p.heightCm && !p.depthCm) return null;
  const parts = [p.widthCm, p.heightCm, p.depthCm].filter((v): v is number => typeof v === 'number');
  return `${parts.join(' × ')} cm (L × A × P)`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const JulianoVendasDesk: React.FC = () => {
  const [products, setProducts] = useState<ReadyMadeProduct[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [tab, setTab] = useState<'catalogo' | 'venda' | 'historico'>('catalogo');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulário de novo produto
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductColor, setNewProductColor] = useState('');
  const [newProductSize, setNewProductSize] = useState('');
  const [newProductStyle, setNewProductStyle] = useState('');
  const [newProductWidth, setNewProductWidth] = useState('');
  const [newProductHeight, setNewProductHeight] = useState('');
  const [newProductDepth, setNewProductDepth] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductCode, setNewProductCode] = useState('');
  const [newProductModel, setNewProductModel] = useState('');
  const [newProductMinStock, setNewProductMinStock] = useState('');
  const [newProductTargetStock, setNewProductTargetStock] = useState('');
  const [newProductPhotos, setNewProductPhotos] = useState<File[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [sendingToJuliaId, setSendingToJuliaId] = useState<string | null>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);

  // Edição de detalhes de um produto já cadastrado
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProductDetailsDraft | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Formulário de nova venda
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<ClientRecord[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [freeformClientName, setFreeformClientName] = useState('');
  const [freeformClientPhone, setFreeformClientPhone] = useState('');
  const [useFreeformClient, setUseFreeformClient] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleProductId, setSaleProductId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<ProductSalePaymentMethod>('Pix');
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [saleFeedback, setSaleFeedback] = useState<string | null>(null);

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, salesRes] = await Promise.all([
        fetch('/api/juliano/products'),
        fetch('/api/juliano/sales'),
      ]);
      const productsData = await productsRes.json();
      const salesData = await salesRes.json();
      if (!productsRes.ok || !productsData.ok) throw new Error(productsData.error || 'Erro ao carregar catálogo.');
      if (!salesRes.ok || !salesData.ok) throw new Error(salesData.error || 'Erro ao carregar vendas.');
      setProducts(productsData.products || []);
      setSales(salesData.sales || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do Juliano.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (useFreeformClient || !clientQuery.trim()) {
      setClientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(clientQuery.trim())}`);
        const data = await res.json();
        setClientResults(data.clients || data.matches || []);
      } catch {
        setClientResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientQuery, useFreeformClient]);

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      setError('Informe o nome do produto.');
      return;
    }
    const priceCents = Math.round(parseFloat(newProductPrice.replace(',', '.')) * 100);
    const stockQuantity = parseInt(newProductStock, 10);
    if (!priceCents || priceCents <= 0) {
      setError('Informe um preço de venda válido.');
      return;
    }
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      setError('Informe uma quantidade em estoque válida.');
      return;
    }
    setIsSavingProduct(true);
    setError(null);
    try {
      const [firstPhoto, ...restPhotos] = newProductPhotos;
      const dataUrl = firstPhoto ? await fileToDataUrl(firstPhoto) : undefined;
      const res = await fetch('/api/juliano/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName.trim(),
          description: newProductDescription.trim() || undefined,
          category: newProductCategory.trim() || undefined,
          color: newProductColor.trim() || undefined,
          size: newProductSize.trim() || undefined,
          style: newProductStyle.trim() || undefined,
          widthCm: newProductWidth ? parseFloat(newProductWidth.replace(',', '.')) : undefined,
          heightCm: newProductHeight ? parseFloat(newProductHeight.replace(',', '.')) : undefined,
          depthCm: newProductDepth ? parseFloat(newProductDepth.replace(',', '.')) : undefined,
          priceCents,
          stockQuantity,
          code: newProductCode.trim() || undefined,
          model: newProductModel.trim() || undefined,
          minStockQuantity: newProductMinStock ? parseFloat(newProductMinStock.replace(',', '.')) : undefined,
          targetStockQuantity: newProductTargetStock ? parseFloat(newProductTargetStock.replace(',', '.')) : undefined,
          dataUrl,
          mimeType: firstPhoto?.type,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao cadastrar produto.');

      let finalProduct: ReadyMadeProduct = data.product;
      for (const extraPhoto of restPhotos) {
        const extraDataUrl = await fileToDataUrl(extraPhoto);
        const photoRes = await fetch(`/api/juliano/products/${finalProduct.id}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: extraDataUrl, mimeType: extraPhoto.type }),
        });
        const photoData = await photoRes.json();
        if (photoRes.ok && photoData.ok) finalProduct = photoData.product;
      }

      setProducts((prev) => [finalProduct, ...prev]);
      setShowNewProduct(false);
      setNewProductName('');
      setNewProductDescription('');
      setNewProductCategory('');
      setNewProductColor('');
      setNewProductSize('');
      setNewProductStyle('');
      setNewProductWidth('');
      setNewProductHeight('');
      setNewProductDepth('');
      setNewProductPrice('');
      setNewProductStock('');
      setNewProductCode('');
      setNewProductModel('');
      setNewProductMinStock('');
      setNewProductTargetStock('');
      setNewProductPhotos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleUpdateStock = async (product: ReadyMadeProduct, value: number) => {
    try {
      const res = await fetch(`/api/juliano/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao atualizar produto.');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto.');
    }
  };

  const handleAddPhotos = async (product: ReadyMadeProduct, files: FileList) => {
    setUploadingPhotoId(product.id);
    setError(null);
    try {
      let finalProduct: ReadyMadeProduct = product;
      for (const file of Array.from(files)) {
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch(`/api/juliano/products/${product.id}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao enviar a foto.');
        finalProduct = data.product;
      }
      setProducts((prev) => prev.map((p) => (p.id === product.id ? finalProduct : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar a foto.');
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handleDeletePhoto = async (product: ReadyMadeProduct, index: number) => {
    try {
      const res = await fetch(`/api/juliano/products/${product.id}/photos/${index}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao remover a foto.');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover a foto.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const res = await fetch(`/api/juliano/products/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao remover produto.');
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover produto.');
    }
  };

  const handleSendToJulia = async (product: ReadyMadeProduct) => {
    setSendingToJuliaId(product.id);
    setError(null);
    try {
      const res = await fetch(`/api/juliano/products/${product.id}/send-to-julia`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao enviar foto para a Júlia.');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto para a Júlia.');
    } finally {
      setSendingToJuliaId(null);
    }
  };

  const handleStartEdit = (product: ReadyMadeProduct) => {
    setEditingProductId(product.id);
    setEditDraft(draftFromProduct(product));
  };

  const handleSaveEdit = async (product: ReadyMadeProduct) => {
    if (!editDraft) return;
    if (!editDraft.name.trim()) {
      setError('Informe o nome do produto.');
      return;
    }
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/juliano/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          description: editDraft.description.trim(),
          category: editDraft.category.trim(),
          color: editDraft.color.trim(),
          size: editDraft.size.trim(),
          style: editDraft.style.trim(),
          widthCm: editDraft.widthCm ? parseFloat(editDraft.widthCm.replace(',', '.')) : null,
          heightCm: editDraft.heightCm ? parseFloat(editDraft.heightCm.replace(',', '.')) : null,
          depthCm: editDraft.depthCm ? parseFloat(editDraft.depthCm.replace(',', '.')) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao salvar os detalhes do produto.');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
      setEditingProductId(null);
      setEditDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar os detalhes do produto.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const addToCart = () => {
    const product = products.find((p) => p.id === saleProductId);
    const quantity = parseInt(saleQuantity, 10);
    if (!product) {
      setError('Selecione um produto.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Informe uma quantidade válida.');
      return;
    }
    const alreadyInCart = cart.find((c) => c.productId === product.id)?.quantity || 0;
    if (alreadyInCart + quantity > product.stockQuantity) {
      setError(`Estoque insuficiente de "${product.name}": disponível ${product.stockQuantity}.`);
      return;
    }
    setError(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) => (c.productId === product.id ? { ...c, quantity: c.quantity + quantity } : c));
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPriceCents: product.priceCents,
          quantity,
          availableStock: product.stockQuantity,
        },
      ];
    });
    setSaleQuantity('1');
  };

  const cartTotalCents = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      setError('Adicione ao menos um produto à venda.');
      return;
    }
    if (!useFreeformClient && !selectedClient) {
      setError('Selecione um cliente cadastrado ou use "Cliente sem cadastro".');
      return;
    }
    if (useFreeformClient && !freeformClientName.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }
    setIsSavingSale(true);
    setError(null);
    setSaleFeedback(null);
    try {
      const res = await fetch('/api/juliano/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: useFreeformClient ? undefined : selectedClient?.id,
          clientName: useFreeformClient ? freeformClientName.trim() : undefined,
          clientPhone: useFreeformClient ? freeformClientPhone.trim() : undefined,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao registrar a venda.');
      setSales((prev) => [data.sale, ...prev]);
      setCart([]);
      setSelectedClient(null);
      setClientQuery('');
      setFreeformClientName('');
      setFreeformClientPhone('');
      setSaleFeedback(
        `Venda ${data.sale.saleNumber} registrada (${formatCurrencyBRL(data.sale.totalCents)}) — lançamento já enviado ao financeiro da Mila.`
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar a venda.');
    } finally {
      setIsSavingSale(false);
    }
  };

  return (
    <div className="rounded-xl bg-white border border-[#E5DEC9] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif-display font-bold text-[#181512]">
            Juliano — Vendas de Produtos Prontos
          </h2>
          <p className="text-xs text-[#6B6257]">
            Catálogo próprio de produtos novos já fabricados. Cada venda gera automaticamente o
            lançamento financeiro no caixa da fábrica.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#EFECE6] pb-2">
        {[
          { id: 'catalogo' as const, label: 'Catálogo', icon: Package },
          { id: 'venda' as const, label: 'Nova Venda', icon: ShoppingCart },
          { id: 'historico' as const, label: `Histórico (${sales.length})`, icon: CheckCircle2 },
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
      ) : tab === 'catalogo' ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowNewProduct((v) => !v)}
            className="px-3 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Produto Pronto
          </button>

          {showNewProduct && (
            <div className="p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] space-y-2">
              <input
                type="text"
                placeholder="Nome do produto"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
              />
              <textarea
                placeholder="Descrição (opcional)"
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                rows={2}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Categoria (ex: Puff)"
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="text"
                  placeholder="Cor (ex: Rose)"
                  value={newProductColor}
                  onChange={(e) => setNewProductColor(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="text"
                  placeholder="Tamanho (ex: Único, P/M/G)"
                  value={newProductSize}
                  onChange={(e) => setNewProductSize(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
              <input
                type="text"
                placeholder="Estilo (ex: Rústico, Moderno)"
                value={newProductStyle}
                onChange={(e) => setNewProductStyle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
              />
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6257] pt-1">
                Medidas (cm) — opcional, cada uma em seu campo
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Largura (cm)"
                  value={newProductWidth}
                  onChange={(e) => setNewProductWidth(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="text"
                  placeholder="Altura (cm)"
                  value={newProductHeight}
                  onChange={(e) => setNewProductHeight(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="text"
                  placeholder="Profundidade (cm)"
                  value={newProductDepth}
                  onChange={(e) => setNewProductDepth(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Preço (R$)"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="number"
                  placeholder="Estoque (unid.)"
                  value={newProductStock}
                  onChange={(e) => setNewProductStock(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6257] pt-1">
                Controle de produção (Henrique) — opcional
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Código/referência"
                  value={newProductCode}
                  onChange={(e) => setNewProductCode(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={newProductModel}
                  onChange={(e) => setNewProductModel(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="number"
                  placeholder="Estoque mínimo"
                  value={newProductMinStock}
                  onChange={(e) => setNewProductMinStock(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="number"
                  placeholder="Meta de reposição"
                  value={newProductTargetStock}
                  onChange={(e) => setNewProductTargetStock(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6257] pt-1">
                Fotos do Produto (pode escolher várias — tirar foto agora ou pegar do computador/galeria)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setNewProductPhotos(Array.from(e.target.files || []))}
                className="text-xs"
              />
              {newProductPhotos.length > 0 && (
                <p className="text-[10px] text-[#6B6257]">{newProductPhotos.length} foto(s) selecionada(s).</p>
              )}
              <button
                type="button"
                disabled={isSavingProduct}
                onClick={handleCreateProduct}
                className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2A2420] text-white text-xs font-semibold disabled:opacity-50"
              >
                {isSavingProduct ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          )}

          {products.length === 0 ? (
            <p className="text-xs text-[#6B6257]">Nenhum produto cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((product) => {
                const dims = formatDimensions(product);
                const isEditing = editingProductId === product.id;
                return (
                  <div key={product.id} className="p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] space-y-2">
                    {product.photoUrls.length > 0 ? (
                      <label className="block relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploadingPhotoId === product.id}
                          onChange={(e) => {
                            const files = e.target.files;
                            e.target.value = '';
                            if (files && files.length > 0) handleAddPhotos(product, files);
                          }}
                        />
                        <img
                          src={product.photoUrls[0]}
                          alt={product.name}
                          className="w-full h-28 object-cover rounded"
                        />
                        <div className="absolute inset-0 rounded flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                          <span className="hidden group-hover:block text-[10px] font-semibold text-white px-2 py-1 rounded bg-black/60">
                            {uploadingPhotoId === product.id ? 'Enviando...' : 'Toque para adicionar outra foto'}
                          </span>
                        </div>
                      </label>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploadingPhotoId === product.id}
                          onChange={(e) => {
                            const files = e.target.files;
                            e.target.value = '';
                            if (files && files.length > 0) handleAddPhotos(product, files);
                          }}
                        />
                        <div className="w-full h-28 flex flex-col items-center justify-center gap-1 rounded bg-[#EFECE6] text-[#9A9388] hover:bg-[#E5DEC9]">
                          <ImageIcon className="w-6 h-6" />
                          <span className="text-[10px] font-semibold">
                            {uploadingPhotoId === product.id ? 'Enviando...' : 'Toque para tirar foto ou escolher arquivo'}
                          </span>
                        </div>
                      </label>
                    )}

                    {product.photoUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-0.5 pb-1">
                        {product.photoUrls.map((url, index) => (
                          <div key={url} className="relative flex-shrink-0 w-14 h-14">
                            <img
                              src={url}
                              alt={`${product.name} ${index + 1}`}
                              className={`w-14 h-14 object-cover rounded ${
                                index === 0 ? 'ring-2 ring-[#9A7138]' : 'border border-[#D6CFC5]'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(product, index)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                              title="Remover esta foto"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <label className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded border border-dashed border-[#D6CFC5] text-[#9A7138] cursor-pointer hover:bg-[#F3EFE6]">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingPhotoId === product.id}
                            onChange={(e) => {
                              const files = e.target.files;
                              e.target.value = '';
                              if (files && files.length > 0) handleAddPhotos(product, files);
                            }}
                          />
                          <Plus className="w-4 h-4" />
                        </label>
                      </div>
                    )}

                    {isEditing && editDraft ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Nome do produto"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                        />
                        <textarea
                          placeholder="Descrição"
                          value={editDraft.description}
                          onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          rows={2}
                        />
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            placeholder="Categoria"
                            value={editDraft.category}
                            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                            className="px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Cor"
                            value={editDraft.color}
                            onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                            className="px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Tamanho"
                            value={editDraft.size}
                            onChange={(e) => setEditDraft({ ...editDraft, size: e.target.value })}
                            className="px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Estilo"
                          value={editDraft.style}
                          onChange={(e) => setEditDraft({ ...editDraft, style: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                        />
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            placeholder="Larg. (cm)"
                            value={editDraft.widthCm}
                            onChange={(e) => setEditDraft({ ...editDraft, widthCm: e.target.value })}
                            className="px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Alt. (cm)"
                            value={editDraft.heightCm}
                            onChange={(e) => setEditDraft({ ...editDraft, heightCm: e.target.value })}
                            className="px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Prof. (cm)"
                            value={editDraft.depthCm}
                            onChange={(e) => setEditDraft({ ...editDraft, depthCm: e.target.value })}
                            className="px-2 py-1 rounded border border-[#D6CFC5] text-xs"
                          />
                        </div>
                        <div className="flex gap-1.5 pt-0.5">
                          <button
                            type="button"
                            disabled={isSavingEdit}
                            onClick={() => handleSaveEdit(product)}
                            className="px-2 py-1 rounded bg-[#181512] text-white text-[10px] font-semibold disabled:opacity-50"
                          >
                            {isSavingEdit ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProductId(null);
                              setEditDraft(null);
                            }}
                            className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-xs text-[#181512]">{product.name}</p>
                        <div className="flex flex-wrap gap-1 text-[10px] text-[#6B6257]">
                          {product.category && <span>{product.category}</span>}
                          {product.color && <span>• {product.color}</span>}
                          {product.size && <span>• Tam. {product.size}</span>}
                          {product.style && <span>• {product.style}</span>}
                        </div>
                        {dims && <p className="text-[10px] text-[#6B6257]">{dims}</p>}
                        <p className="text-xs font-semibold text-[#9A7138]">{formatCurrencyBRL(product.priceCents)}</p>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded-full font-bold ${
                              product.stockQuantity === 0
                                ? 'bg-red-100 text-red-800'
                                : product.stockQuantity <= 3
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {product.stockQuantity} em estoque
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const value = window.prompt('Novo estoque (unidades):', String(product.stockQuantity));
                              if (value === null) return;
                              const n = parseInt(value, 10);
                              if (!Number.isNaN(n) && n >= 0) handleUpdateStock(product, n);
                            }}
                            className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold hover:bg-[#F3EFE6]"
                          >
                            Ajustar Estoque
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(product)}
                            className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold hover:bg-[#F3EFE6] flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3 text-[#9A7138]" />
                            Editar Detalhes
                          </button>
                          {product.photoUrls.length > 0 && (
                            <button
                              type="button"
                              disabled={sendingToJuliaId === product.id}
                              onClick={() => handleSendToJulia(product)}
                              className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold hover:bg-[#F3EFE6] flex items-center gap-1 disabled:opacity-50"
                            >
                              <Send className="w-3 h-3 text-[#9A7138]" />
                              {product.juliaPhotoId ? 'Reenviar p/ Júlia' : 'Enviar p/ Júlia'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold hover:bg-red-50 text-red-700 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remover
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === 'venda' ? (
        <div className="space-y-3">
          {saleFeedback && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {saleFeedback}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B6257]">Cliente</label>
              <button
                type="button"
                onClick={() => setUseFreeformClient((v) => !v)}
                className="text-[10px] text-[#9A7138] font-semibold underline"
              >
                {useFreeformClient ? 'Buscar cliente cadastrado' : 'Cliente sem cadastro'}
              </button>
            </div>
            {useFreeformClient ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  value={freeformClientName}
                  onChange={(e) => setFreeformClientName(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
                <input
                  type="text"
                  placeholder="Telefone (opcional)"
                  value={freeformClientPhone}
                  onChange={(e) => setFreeformClientPhone(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-[#D6CFC5]">
                  <Search className="w-3.5 h-3.5 text-[#9A9388]" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={selectedClient ? `${selectedClient.name} — ${selectedClient.phone}` : clientQuery}
                    onChange={(e) => {
                      setSelectedClient(null);
                      setClientQuery(e.target.value);
                    }}
                    className="flex-1 text-xs outline-none"
                  />
                </div>
                {clientResults.length > 0 && !selectedClient && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#E5DEC9] rounded-lg shadow-md max-h-40 overflow-y-auto">
                    {clientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientResults([]);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-[#FAF8F5]"
                      >
                        {c.name} — {c.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B6257]">
              Adicionar Produto
            </label>
            <div className="flex gap-2">
              <select
                value={saleProductId}
                onChange={(e) => setSaleProductId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
              >
                <option value="">Selecione um produto...</option>
                {products
                  .filter((p) => p.stockQuantity > 0)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrencyBRL(p.priceCents)} ({p.stockQuantity} em estoque)
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={1}
                value={saleQuantity}
                onChange={(e) => setSaleQuantity(e.target.value)}
                className="w-20 px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
              />
              <button
                type="button"
                onClick={addToCart}
                className="px-3 py-1.5 rounded-lg bg-[#181512] hover:bg-[#2A2420] text-white text-xs font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>

          {cart.length > 0 && (
            <div className="space-y-1.5">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#FAF8F5] border border-[#E5DEC9] text-xs"
                >
                  <span>
                    {item.quantity}x {item.productName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrencyBRL(item.unitPriceCents * item.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => setCart((prev) => prev.filter((c) => c.productId !== item.productId))}
                      className="text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold text-[#181512] px-2.5">
                <span>Total</span>
                <span>{formatCurrencyBRL(cartTotalCents)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B6257]">
              Forma de Pagamento
            </label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                    paymentMethod === method
                      ? 'bg-[#181512] text-white border-[#181512]'
                      : 'bg-white text-[#57534E] border-[#D6CFC5]'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingSale || cart.length === 0}
            onClick={handleSubmitSale}
            className="px-4 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSavingSale ? 'Registrando...' : 'Confirmar Venda'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.length === 0 ? (
            <p className="text-xs text-[#6B6257]">Nenhuma venda registrada ainda.</p>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="p-2.5 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-[#181512]">
                      {sale.saleNumber} — {sale.clientName}
                    </p>
                    <p className="text-[10px] text-[#6B6257]">
                      {sale.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#9A7138]">{formatCurrencyBRL(sale.totalCents)}</p>
                    <p className="text-[10px] text-[#6B6257]">{sale.paymentMethod}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
