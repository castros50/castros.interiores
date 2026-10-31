import React, { useState } from 'react';
import { Search, UserPlus, Plus, AlertCircle, Phone, MapPin } from 'lucide-react';
import { AttendanceRecord, AttendanceRequestType, WorkshopSettings } from '../types';

interface CarlaAtendimentoDeskProps {
  attendances: AttendanceRecord[];
  settings: WorkshopSettings;
  onSelectOrder: (id: string) => void;
}

const REQUEST_TYPE_LABELS: Record<AttendanceRequestType, string> = {
  reforma: 'Reforma de estofado',
  fabricacao_nova: 'Fabricação nova',
  compra_produto: 'Compra de produto pronto',
  acompanhamento: 'Acompanhamento de pedido existente',
  reclamacao: 'Reclamação',
};

function pendingFieldsOf(a: AttendanceRecord): string[] {
  const pending: string[] = [];
  if (!a.clientPhone) pending.push('telefone');
  if (!a.neighborhood && !a.fullAddress) pending.push('bairro/endereço');
  if (a.approxMeasurements === 'A validar na oficina') pending.push('medidas');
  if (a.furnitureType === 'A confirmar') pending.push('tipo de móvel/produto');
  return pending;
}

export const CarlaAtendimentoDesk: React.FC<CarlaAtendimentoDeskProps> = ({ attendances, settings, onSelectOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestType, setRequestType] = useState<AttendanceRequestType>('reforma');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [furnitureType, setFurnitureType] = useState('');
  const [piecesCount, setPiecesCount] = useState('');
  const [approxMeasurements, setApproxMeasurements] = useState('');
  const [desiredService, setDesiredService] = useState('');
  const [fabricAndComfortPreference, setFabricAndComfortPreference] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [notes, setNotes] = useState('');

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

  const isTrackingOrComplaint = requestType === 'acompanhamento' || requestType === 'reclamacao';

  const resetForm = () => {
    setClientName('');
    setClientPhone('');
    setFurnitureType('');
    setPiecesCount('');
    setApproxMeasurements('');
    setDesiredService('');
    setFabricAndComfortPreference('');
    setNeighborhood('');
    setCity('');
    setFullAddress('');
    setNotes('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clientName.trim()) {
      setError('Informe ao menos o nome do cliente.');
      return;
    }
    setIsCreating(true);
    try {
      const orderType = requestType === 'fabricacao_nova' ? 'Fabricação' : requestType === 'reforma' ? 'Reforma' : undefined;
      const res = await fetch('/api/orders/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          orderType,
          clientName,
          clientPhone,
          furnitureType: furnitureType || undefined,
          piecesCount: piecesCount || undefined,
          approxMeasurements: approxMeasurements || undefined,
          desiredService: desiredService || undefined,
          fabricAndComfortPreference: fabricAndComfortPreference || undefined,
          neighborhood: neighborhood || undefined,
          city: city || undefined,
          fullAddress: fullAddress || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.order) {
        resetForm();
        setShowNewForm(false);
        onSelectOrder(data.order.id);
      } else {
        setError(data.error || 'Erro ao registrar atendimento.');
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

      {/* Busca */}
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
                    {a.requestType ? REQUEST_TYPE_LABELS[a.requestType] : a.orderType || 'não classificado'}
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
        <form onSubmit={handleCreate} className="p-4 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5] space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#181512]">Novo Atendimento</h4>

          <div>
            <label className="block text-[#57534E] font-medium mb-1 text-xs">Tipo de Solicitação</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as AttendanceRequestType)}
              className="w-full p-2 rounded border border-[#D6CFC5] bg-white text-xs"
            >
              {(Object.keys(REQUEST_TYPE_LABELS) as AttendanceRequestType[]).map((rt) => (
                <option key={rt} value={rt}>{REQUEST_TYPE_LABELS[rt]}</option>
              ))}
            </select>
          </div>

          {isTrackingOrComplaint ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Acompanhamento e reclamação são sobre um atendimento que já existe — use a busca acima para encontrar o
              cliente e abrir o atendimento dele. Não crie um atendimento novo para isso.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Nome do Cliente *</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Telefone</label>
                  <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(91) 9xxxx-xxxx" className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">
                    {requestType === 'compra_produto' ? 'Produto Desejado' : 'Tipo de Móvel'}
                  </label>
                  <input type="text" value={furnitureType} onChange={(e) => setFurnitureType(e.target.value)} placeholder="Ex: Sofá 3 lugares" className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Quantidade</label>
                  <input type="text" value={piecesCount} onChange={(e) => setPiecesCount(e.target.value)} placeholder="Ex: 1 unidade" className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                {requestType !== 'compra_produto' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[#57534E] font-medium mb-1">
                      Medidas Informadas pelo Cliente (não confirmadas — a oficina confere depois)
                    </label>
                    <input type="text" value={approxMeasurements} onChange={(e) => setApproxMeasurements(e.target.value)} placeholder="Ex: aproximadamente 2m de largura" className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-[#57534E] font-medium mb-1">O que o cliente deseja</label>
                  <textarea value={desiredService} onChange={(e) => setDesiredService(e.target.value)} rows={2} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                {requestType !== 'compra_produto' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[#57534E] font-medium mb-1">Preferência de Tecido, Cor e Acabamento</label>
                    <input type="text" value={fabricAndComfortPreference} onChange={(e) => setFabricAndComfortPreference(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                  </div>
                )}
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Bairro</label>
                  <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Cidade</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[#57534E] font-medium mb-1">Endereço Completo (para retirada/entrega, se necessário)</label>
                  <input type="text" value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[#57534E] font-medium mb-1">Observações</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full p-2 rounded border border-[#D6CFC5]" />
                </div>
              </div>

              {error && <p className="text-xs text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 rounded bg-[#181512] hover:bg-[#2E2722] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Salvar Atendimento
              </button>
              <p className="text-[10px] text-[#6B6257]">
                Pode salvar mesmo com dados faltando — as pendências ficam visíveis na lista acima para completar depois.
              </p>
            </>
          )}
        </form>
      )}
    </div>
  );
};
