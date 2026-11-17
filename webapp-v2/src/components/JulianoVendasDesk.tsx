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
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductPhoto, setNewProductPhoto] = useState<File | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [sendingToJuliaId, setSendingToJuliaId] = useState<string | null>(null);

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
      const dataUrl = newProductPhoto ? await fileToDataUrl(newProductPhoto) : undefined;
      const res = await fetch('/api/juliano/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProductName.trim(),
          description: newProductDescription.trim() || undefined,
          category: newProductCategory.trim() || undefined,
          priceCents,
          stockQuantity,
          dataUrl,
          mimeType: newProductPhoto?.type,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao cadastrar produto.');
      setProducts((prev) => [data.product, ...prev]);
      setShowNewProduct(false);
      setNewProductName('');
      setNewProductDescription('');
      setNewProductCategory('');
      setNewProductPrice('');
      setNewProductStock('');
      setNewProductPhoto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleUpdateStockOrPrice = async (product: ReadyMadeProduct, field: 'priceCents' | 'stockQuantity', value: number) => {
    try {
      const res = await fetch(`/api/juliano/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao atualizar produto.');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto.');
    }
  };

  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);

  const handleUploadPhoto = async (product: ReadyMadeProduct, file: File) => {
    setUploadingPhotoId(product.id);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch(`/api/juliano/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erro ao enviar a foto.');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar a foto.');
    } finally {
      setUploadingPhotoId(null);
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
                  placeholder="Categoria (opcional)"
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-[#D6CFC5] text-xs"
                />
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6B6257]">
                Foto do Produto (tirar foto agora ou escolher do computador/galeria)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewProductPhoto(e.target.files?.[0] || null)}
                className="text-xs"
              />
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
              {products.map((product) => (
                <div key={product.id} className="p-3 rounded-lg border border-[#E5DEC9] bg-[#FAF8F5] space-y-2">
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhotoId === product.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) handleUploadPhoto(product, file);
                      }}
                    />
                    {product.photoUrl ? (
                      <img src={product.photoUrl} alt={product.name} className="w-full h-28 object-cover rounded" />
                    ) : (
                      <div className="w-full h-28 flex flex-col items-center justify-center gap-1 rounded bg-[#EFECE6] text-[#9A9388] hover:bg-[#E5DEC9]">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[10px] font-semibold">
                          {uploadingPhotoId === product.id ? 'Enviando...' : 'Toque para tirar foto ou escolher arquivo'}
                        </span>
                      </div>
                    )}
                  </label>
                  <p className="font-bold text-xs text-[#181512]">{product.name}</p>
                  {product.category && <p className="text-[10px] text-[#6B6257]">{product.category}</p>}
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
                        if (!Number.isNaN(n) && n >= 0) handleUpdateStockOrPrice(product, 'stockQuantity', n);
                      }}
                      className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold hover:bg-[#F3EFE6]"
                    >
                      Ajustar Estoque
                    </button>
                    <label className="px-2 py-1 rounded bg-white border border-[#D6CFC5] text-[10px] font-semibold hover:bg-[#F3EFE6] flex items-center gap-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingPhotoId === product.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) handleUploadPhoto(product, file);
                        }}
                      />
                      <ImageIcon className="w-3 h-3 text-[#9A7138]" />
                      {uploadingPhotoId === product.id
                        ? 'Enviando...'
                        : product.photoUrl
                        ? 'Trocar Foto'
                        : 'Adicionar Foto'}
                    </label>
                    {product.photoUrl && (
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
                </div>
              ))}
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
