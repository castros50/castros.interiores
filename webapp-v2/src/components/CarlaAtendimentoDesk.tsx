import React, { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Plus, AlertCircle, Phone, MapPin, Wrench, Hammer, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { AttendanceRecord, AttendanceRequestType, ClientAddress, ClientRecord, OrderType, WorkshopSettings } from '../types';

interface DraftProduct {
  id: string;
  description: string;
  quantity: string;
  measurements: string;
  photoFiles: File[];
}

function newDraftProductId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface CarlaAtendimentoDeskProps {
  attendances: AttendanceRecord[];
  settings: WorkshopSettings;
  onSelectOrder: (id: string) => void;
  onCreateOrder?: (
    payload: Record<string, unknown>,
    photoFiles: File[],
    additionalProductPhotos?: Record<string, File[]>
  ) => Promise<{ ok: true; order: AttendanceRecord } | { ok: false; error: string }>;
}

const OTHER_REQUEST_TYPE_LABELS: Record<'compra_produto' | 'acompanhamento' | 'reclamacao', string> = {
  compra_produto: 'Compra de produto pronto',
  acompanhamento: 'Acompanhamento de pedido existente',
  reclamacao: 'Reclamação',
};

const REQUEST_TYPE_LABELS: Record<AttendanceRequestType, string> = {
  reforma: 'Reforma de estofado',
  fabricacao_nova: 'Fabricação nova',
  ...OTHER_REQUEST_TYPE_LABELS,
};

function pendingFieldsOf(a: AttendanceRecord): string[] {
  const pending: string[] = [];
  if (!a.clientPhone) pending.push('telefone');
  if (!a.neighborhood && !a.fullAddress) pending.push('bairro/endereço');
  if (a.approxMeasurements === 'A validar na oficina') pending.push('medidas');
  if (a.furnitureType === 'A confirmar') pending.push('tipo de móvel/produto');
  return pending;
}

function emptyAddress(): ClientAddress {
  return { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', referencePoint: '' };
}

export const CarlaAtendimentoDesk: React.FC<CarlaAtendimentoDeskProps> = ({
  attendances,
  settings,
  onSelectOrder,
  onCreateOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tipo do atendimento: nenhuma opção vem pré-selecionada — tem que escolher.
  const [orderTypeChoice, setOrderTypeChoice] = useState<OrderType | null>(null);
  const [showOtherContactType, setShowOtherContactType] = useState(false);
  const [otherRequestType, setOtherRequestType] = useState<'compra_produto' | 'acompanhamento' | 'reclamacao'>('compra_produto');

  // Cliente: busca no cadastro geral para reaproveitar, ou registra um novo.
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<ClientRecord[]>([]);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState<ClientAddress>(emptyAddress());

  const [furnitureType, setFurnitureType] = useState('');
  const [piecesCount, setPiecesCount] = useState('');
  const [approxMeasurements, setApproxMeasurements] = useState('');
  const [desiredService, setDesiredService] = useState('');
  const [fabricAndComfortPreference, setFabricAndComfortPreference] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Produtos adicionais no mesmo pedido (ex.: sofá + poltronas num só atendimento) — o
  // produto principal continua sendo os campos acima (furnitureType/piecesCount/...).
  const [additionalProducts, setAdditionalProducts] = useState<DraftProduct[]>([]);

  const handleAddProductRow = () => {
    setAdditionalProducts((prev) => [
      ...prev,
      { id: newDraftProductId(), description: '', quantity: '1 unidade', measurements: '', photoFiles: [] },
    ]);
  };
  const handleRemoveProductRow = (id: string) => {
    setAdditionalProducts((prev) => prev.filter((p) => p.id !== id));
  };
  const handleUpdateProductRow = (id: string, patch: Partial<DraftProduct>) => {
    setAdditionalProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const handleProductPhotosSelected = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleUpdateProductRow(id, {
      photoFiles: [...(additionalProducts.find((p) => p.id === id)?.photoFiles || []), ...Array.from(files)],
    });
    e.target.value = '';
  };

  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? attendances.filter(
        (a) =>
          a.clientName.toLowerCase().includes(term) ||
          (a.clientPhone || '').toLowerCase().includes(term) ||
          a.attendanceNumber.toLowerCase().includes(term) ||
          a.furnitureType.toLowerCase().includes(term)
      )
    : attendances.slice(0, 12);

  // Busca de clientes já cadastrados (com debounce), pra não recadastrar a mesma pessoa.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = clientQuery.trim();
    if (q.length < 2) {
      setClientResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearchingClient(true);
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.clients)) {
          setClientResults(data.clients);
        }
      } catch {
        // busca falhou em silêncio — o operador ainda pode cadastrar manualmente
      } finally {
        setIsSearchingClient(false);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [clientQuery]);

  const handleSelectClient = (client: ClientRecord) => {
    setSelectedClient(client);
    setClientName(client.name);
    setClientPhone(client.phone || '');
    setAddress({ ...emptyAddress(), ...client.address });
    setClientResults([]);
    setClientQuery('');
  };

  const handleClearSelectedClient = () => {
    setSelectedClient(null);
    setClientName('');
    setClientPhone('');
    setAddress(emptyAddress());
  };

  const resetForm = () => {
    setOrderTypeChoice(null);
    setShowOtherContactType(false);
    setOtherRequestType('compra_produto');
    handleClearSelectedClient();
    setFurnitureType('');
    setPiecesCount('');
    setApproxMeasurements('');
    setDesiredService('');
    setFabricAndComfortPreference('');
    setNotes('');
    setPhotoFiles([]);
    setAdditionalProducts([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addressIsIncomplete = !address.street || !address.neighborhood || !address.city;

  const handlePhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isCreating) return; // trava contra clique duplicado

    if (showOtherContactType) {
      if (!clientName.trim()) {
        setError('Informe ao menos o nome do cliente.');
        return;
      }
    } else {
      if (!clientName.trim()) {
        setError('Informe ao menos o nome do cliente.');
        return;
      }
      if (!orderTypeChoice) {
        setError('Escolha o tipo de atendimento: Reforma de estofado ou Fabricação de móvel novo.');
        return;
      }
    }

    setIsCreating(true);
    try {
      const requestType: AttendanceRequestType = showOtherContactType
        ? otherRequestType
        : orderTypeChoice === 'Fabricação'
        ? 'fabricacao_nova'
        : 'reforma';
      const payload = {
        requestType,
        orderType: showOtherContactType ? undefined : orderTypeChoice,
        clientId: selectedClient?.id,
        clientName,
        clientPhone,
        furnitureType: furnitureType || undefined,
        piecesCount: piecesCount || undefined,
        approxMeasurements: approxMeasurements || undefined,
        desiredService: desiredService || undefined,
        fabricAndComfortPreference: fabricAndComfortPreference || undefined,
        neighborhood: address.neighborhood || undefined,
        city: address.city || undefined,
        fullAddress: [address.street, address.number, address.complement].filter(Boolean).join(', ') || undefined,
        address,
        notes: notes || undefined,
        additionalProducts: additionalProducts
          .filter((p) => p.description.trim())
          .map((p) => ({ id: p.id, description: p.description.trim(), quantity: p.quantity, measurements: p.measurements || undefined })),
      };

      if (!onCreateOrder) {
        setError('Encaminhamento de cadastro indisponível nesta tela.');
        return;
      }
      const additionalProductPhotos: Record<string, File[]> = {};
      additionalProducts.forEach((p) => {
        if (p.description.trim() && p.photoFiles.length > 0) additionalProductPhotos[p.id] = p.photoFiles;
      });
      const result = await onCreateOrder(payload, photoFiles, additionalProductPhotos);
      if (result.ok) {
        resetForm();
        setShowNewForm(false);
        onSelectOrder(result.order.id);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error(err);
      setError('Erro de comunicação ao registrar atendimento.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E5DEC9] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EFECE6]">
        <div>
          <h3 className="font-bold text-base text-[#181512]">Mesa de Atendimento ao Cliente — Carla</h3>
          <p className="text-xs text-[#6B6257] mt-0.5">
            Busque um atendimento existente por nome, telefone ou número, ou registre um novo contato.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm((v) => !v)}
          className="px-3.5 py-2 rounded-lg bg-[#9A7138] hover:bg-[#845E2B] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {showNewForm ? 'Fechar Novo Atendimento' : 'Novo Atendimento'}
        </button>
      </div>

      {/* Busca de atendimentos já existentes */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B6257] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou número do atendimento..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D6CFC5] text-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-[#6B6257] italic col-span-2">Nenhum atendimento encontrado para essa busca.</p>
          )}
          {filtered.map((a) => {
            const pending = pendingFieldsOf(a);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectOrder(a.id)}
                className="text-left p-3.5 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] hover:bg-white hover:border-[#D6CFC5] transition-colors space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-[#181512]">{a.attendanceNumber}</span>
                  <span className="text-[10px] font-semibold uppercase text-[#9A7138]">
                    {a.orderType || (a.requestType ? REQUEST_TYPE_LABELS[a.requestType] : 'Tipo não informado')}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#181512]">{a.clientName}</p>
                <p className="text-[10px] text-[#6B6257] flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {a.clientPhone || 'sem telefone'}
                  {(a.neighborhood || a.city) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <MapPin className="w-3 h-3" /> {[a.neighborhood, a.city].filter(Boolean).join(', ')}
                    </>
                  )}
                </p>
                <p className="text-[10px] text-[#57534E]">{a.furnitureType} · {a.deskStatus || 'novo'} · mesa {a.currentDesk}</p>
                {(a.complaints || []).some((c) => c.status !== 'resolvida') && (
                  <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[9px] font-bold uppercase">
                    Reclamação em aberto
                  </span>
                )}
                {pending.length > 0 && (
                  <p className="text-[10px] text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Pendente: {pending.join(', ')}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Novo atendimento */}
      {showNewForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Novo Atendimento</h4>

          {/* 1. Tipo do atendimento — nenhuma opção pré-selecionada */}
          {!showOtherContactType && (
            <div>
              <label className="block text-[#57534E] font-medium mb-1.5 text-xs">
                Tipo do atendimento <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setOrderTypeChoice('Reforma')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-colors flex items-start gap-2.5 ${
                    orderTypeChoice === 'Reforma'
                      ? 'border-[#9A7138] bg-[#9A7138]/10'
                      : 'border-[#D6CFC5] bg-white hover:border-[#9A7138]/50'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-[#9A7138] mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold text-[#181512]">Reforma de estofado</span>
                    <span className="block text-[10px] text-[#6B6257] mt-0.5">Vai para a mesa do Pedro (Avaliação Técnica)</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderTypeChoice('Fabricação')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-colors flex items-start gap-2.5 ${
                    orderTypeChoice === 'Fabricação'
                      ? 'border-[#9A7138] bg-[#9A7138]/10'
                      : 'border-[#D6CFC5] bg-white hover:border-[#9A7138]/50'
                  }`}
                >
                  <Hammer className="w-4 h-4 text-[#9A7138] mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-xs font-bold text-[#181512]">Fabricação de móvel novo</span>
                    <span className="block text-[10px] text-[#6B6257] mt-0.5">Vai para a mesa do Lucas (Projetos & Fabricação)</span>
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowOtherContactType(true)}
                className="mt-2 text-[10px] text-[#6B6257] underline hover:text-[#181512]"
              >
                Não é reforma nem fabricação? Registrar outro tipo de contato
              </button>
            </div>
          )}

          {showOtherContactType && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#57534E] font-medium text-xs">Tipo de contato</label>
                <button
                  type="button"
                  onClick={() => setShowOtherContactType(false)}
                  className="text-[10px] text-[#6B6257] underline hover:text-[#181512]"
                >
                  Voltar para Reforma/Fabricação
                </button>
              </div>
              <select
                value={otherRequestType}
                onChange={(e) => setOtherRequestType(e.target.value as typeof otherRequestType)}
                className="w-full p-2 rounded border border-[#D6CFC5] bg-white text-xs"
              >
                {(Object.keys(OTHER_REQUEST_TYPE_LABELS) as Array<keyof typeof OTHER_REQUEST_TYPE_LABELS>).map((rt) => (
                  <option key={rt} value={rt}>{OTHER_REQUEST_TYPE_LABELS[rt]}</option>
                ))}
              </select>
              {(otherRequestType === 'acompanhamento' || otherRequestType === 'reclamacao') && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
                  Acompanhamento e reclamação são sobre um atendimento que já existe — use a busca acima para encontrar o
                  cliente e abrir o atendimento dele. Não crie um atendimento novo para isso.
                </p>
              )}
            </div>
          )}

          {(showOtherContactType ? otherRequestType === 'compra_produto' : Boolean(orderTypeChoice)) && (
            <>
              {/* 2. Cliente: buscar e reaproveitar, ou cadastrar novo */}
              <div className="p-3 rounded-lg bg-white border border-[#E5DEC9] space-y-2">
                <label className="block text-[#57534E] font-medium text-xs">Cliente</label>
                {selectedClient ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F3EFE6] border border-[#D6CFC5]">
                    <div className="text-xs">
                      <p className="font-semibold text-[#181512]">{selectedClient.name} <span className="text-[10px] font-normal text-[#9A7138]">(cadastro existente)</span></p>
                      <p className="text-[10px] text-[#6B6257]">{selectedClient.phone || 'sem telefone'}</p>
                    </div>
                    <button type="button" onClick={handleClearSelectedClient} className="p-1 text-[#6B6257] hover:text-red-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#6B6257] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={clientQuery}
                      onChange={(e) => setClientQuery(e.target.value)}
                      placeholder="Buscar cliente já cadastrado por nome ou telefone..."
                      className="w-full pl-8 pr-3 py-2 rounded border border-[#D6CFC5] text-xs"
                    />
                    {isSearchingClient && <p className="text-[10px] text-[#6B6257] mt-1">Buscando...</p>}
                    {clientResults.length > 0 && (
                      <div className="mt-1.5 rounded-lg border border-[#D6CFC5] bg-white divide-y divide-[#EFECE6] max-h-48 overflow-y-auto">
                        {clientResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className="w-full text-left px-3 py-2 hover:bg-[#FAF8F5] text-xs"
                          >
                            <span className="font-semibold text-[#181512]">{c.name}</span>
                            <span className="text-[#6B6257]"> · {c.phone || 'sem telefone'}</span>
                            {c.address.city && <span className="text-[#6B6257]"> · {c.address.city}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Nome do Cliente *</label>
                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Telefone/WhatsApp (com DDD)</label>
                    <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(91) 9xxxx-xxxx" className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                </div>

                {/* Endereço completo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">CEP</label>
                    <input type="text" value={address.cep} onChange={(e) => setAddress((a) => ({ ...a, cep: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[#57534E] font-medium mb-1">Rua</label>
                    <input type="text" value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Número</label>
                    <input type="text" value={address.number} onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Complemento</label>
                    <input type="text" value={address.complement} onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Bairro</label>
                    <input type="text" value={address.neighborhood} onChange={(e) => setAddress((a) => ({ ...a, neighborhood: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Cidade</label>
                    <input type="text" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div>
                    <label className="block text-[#57534E] font-medium mb-1">Estado</label>
                    <input type="text" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} maxLength={2} placeholder="UF" className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <label className="block text-[#57534E] font-medium mb-1">Ponto de referência (opcional)</label>
                    <input type="text" value={address.referencePoint} onChange={(e) => setAddress((a) => ({ ...a, referencePoint: e.target.value }))} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                </div>
                {addressIsIncomplete && (
                  <p className="text-[10px] text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Endereço incompleto — dá pra salvar mesmo assim como rascunho; a pendência fica visível na lista depois.
                  </p>
                )}
              </div>

              {/* 3. Móvel, quantidade, descrição e fotos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">
                    {showOtherContactType ? 'Produto Desejado' : 'Tipo de Móvel'}
                  </label>
                  <input type="text" value={furnitureType} onChange={(e) => setFurnitureType(e.target.value)} placeholder="Ex: Sofá 3 lugares" className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Quantidade</label>
                  <input type="text" value={piecesCount} onChange={(e) => setPiecesCount(e.target.value)} placeholder="Ex: 1 unidade" className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                {!showOtherContactType && (
                  <div className="sm:col-span-2">
                    <label className="block text-[#57534E] font-medium mb-1">
                      Medidas Informadas pelo Cliente (não confirmadas — a oficina confere depois)
                    </label>
                    <input type="text" value={approxMeasurements} onChange={(e) => setApproxMeasurements(e.target.value)} placeholder="Ex: aproximadamente 2m de largura" className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-[#57534E] font-medium mb-1">Descrição do pedido</label>
                  <textarea value={desiredService} onChange={(e) => setDesiredService(e.target.value)} rows={2} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                {!showOtherContactType && (
                  <div className="sm:col-span-2">
                    <label className="block text-[#57534E] font-medium mb-1">Preferência de Tecido, Cor e Acabamento</label>
                    <input type="text" value={fabricAndComfortPreference} onChange={(e) => setFabricAndComfortPreference(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-[#57534E] font-medium mb-1">Observações</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[#57534E] font-medium mb-1.5">Fotos</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoFilesSelected}
                    className="hidden"
                    id="carla-new-order-photos"
                  />
                  <label
                    htmlFor="carla-new-order-photos"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] cursor-pointer text-xs font-medium text-[#181512]"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Selecionar fotos
                  </label>
                  {photoFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {photoFiles.map((f, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#F3EFE6] text-[10px] text-[#181512]">
                          {f.name}
                          <button
                            type="button"
                            onClick={() => setPhotoFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-[#6B6257] hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Produtos adicionais no mesmo pedido (sofá + poltronas, por exemplo) */}
              {!showOtherContactType && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[#57534E] font-medium text-xs">Outros produtos neste pedido (opcional)</label>
                    <button
                      type="button"
                      onClick={handleAddProductRow}
                      className="text-[10px] font-semibold text-[#9A7138] underline hover:text-[#845E2B]"
                    >
                      + Adicionar outro produto
                    </button>
                  </div>
                  {additionalProducts.map((p, idx) => (
                    <div key={p.id} className="p-3 rounded-lg bg-white border border-[#E5DEC9] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase text-[#9A7138]">Produto adicional {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductRow(p.id)}
                          className="p-1 text-[#6B6257] hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="sm:col-span-2">
                          <label className="block text-[#57534E] font-medium mb-1">Descrição *</label>
                          <input
                            type="text"
                            value={p.description}
                            onChange={(e) => handleUpdateProductRow(p.id, { description: e.target.value })}
                            placeholder="Ex: Poltrona de canto"
                            className="w-full p-2 rounded border border-[#D6CFC5]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#57534E] font-medium mb-1">Quantidade</label>
                          <input
                            type="text"
                            value={p.quantity}
                            onChange={(e) => handleUpdateProductRow(p.id, { quantity: e.target.value })}
                            className="w-full p-2 rounded border border-[#D6CFC5]"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[#57534E] font-medium mb-1">Medidas (opcional)</label>
                          <input
                            type="text"
                            value={p.measurements}
                            onChange={(e) => handleUpdateProductRow(p.id, { measurements: e.target.value })}
                            className="w-full p-2 rounded border border-[#D6CFC5]"
                          />
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleProductPhotosSelected(p.id, e)}
                          className="hidden"
                          id={`carla-product-photos-${p.id}`}
                        />
                        <label
                          htmlFor={`carla-product-photos-${p.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#D6CFC5] bg-white hover:bg-[#F3EFE6] cursor-pointer text-[10px] font-medium text-[#181512]"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Selecionar fotos deste produto
                        </label>
                        {p.photoFiles.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {p.photoFiles.map((f, fi) => (
                              <span key={fi} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#F3EFE6] text-[10px] text-[#181512]">
                                {f.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateProductRow(p.id, { photoFiles: p.photoFiles.filter((_, i) => i !== fi) })
                                  }
                                  className="text-[#6B6257] hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Salvando...' : 'Salvar e Encaminhar Atendimento'}
              </button>
              <p className="text-[10px] text-[#6B6257]">
                Pode salvar mesmo com dados faltando — as pendências ficam visíveis na lista acima para completar depois.
                {!showOtherContactType && ' O atendimento já é encaminhado automaticamente para a mesa certa.'}
              </p>
            </>
          )}
        </form>
      )}
    </div>
  );
};
