import React from 'react';
import { AttendanceRecord, MaterialCatalogItem, WorkshopSettings } from '../types';
import { ProductTechnicalEvaluationForm } from './ProductTechnicalEvaluationForm';

interface PedroAvaliacaoDeskProps {
  order: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  onUpdateOrder: (updated: AttendanceRecord) => void;
}

export const PedroAvaliacaoDesk: React.FC<PedroAvaliacaoDeskProps> = ({
  order,
  materialsCatalog,
  settings,
  onUpdateOrder,
}) => {
  const handleForwardToMila = async (orderId: string, fromDesk: string) => {
    const res = await fetch(`/api/orders/${orderId}/forward-to-mila`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromDesk }),
    });
    const data = await res.json();
    if (res.ok && data.order) onUpdateOrder(data.order);
  };

  return (
    <div className="p-6 rounded-xl bg-white border border-[#E5DEC9] shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-sm text-[#181512]">Avaliação Técnica por Produto — {order.attendanceNumber}</h3>
        <p className="text-xs text-[#6B6257] mt-0.5">
          Para uma análise de defeitos completa (11 áreas), use o botão "Abrir Vistoria das 11 Áreas" acima. Esta
          seção é o registro enxuto pedido para encaminhar à Mila: serviços, materiais, mão de obra e prazo.
        </p>
      </div>
      <ProductTechnicalEvaluationForm
        order={order}
        materialsCatalog={materialsCatalog}
        defaultEvaluatorName={settings.responsibleDefaultName}
        onUpdateOrder={onUpdateOrder}
        onForwardToMila={handleForwardToMila}
        fromDesk="pedro_avaliacao"
      />
    </div>
  );
};
