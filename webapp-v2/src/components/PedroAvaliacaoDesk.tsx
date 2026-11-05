import React, { useState } from 'react';
import { AttendanceRecord, MaterialCatalogItem, WorkshopSettings } from '../types';
import { ProductTechnicalEvaluationForm } from './ProductTechnicalEvaluationForm';
import { InspectionSheetForm } from './InspectionSheetForm';
import { ExecutionManualView } from './ExecutionManualView';
import { QualityControlBoard } from './QualityControlBoard';

interface PedroAvaliacaoDeskProps {
  order: AttendanceRecord;
  materialsCatalog: MaterialCatalogItem[];
  settings: WorkshopSettings;
  onUpdateOrder: (updated: AttendanceRecord) => void;
}

type PedroTab = 'avaliacao' | 'vistoria' | 'manual' | 'qualidade';

export const PedroAvaliacaoDesk: React.FC<PedroAvaliacaoDeskProps> = ({
  order,
  materialsCatalog,
  settings,
  onUpdateOrder,
}) => {
  const [activeTab, setActiveTab] = useState<PedroTab>('avaliacao');

  const handleForwardToMila = async (orderId: string, fromDesk: string) => {
    const res = await fetch(`/api/orders/${orderId}/forward-to-mila`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromDesk }),
    });
    const data = await res.json();
    if (res.ok && data.order) onUpdateOrder(data.order);
  };

  const tabs: Array<{ id: PedroTab; label: string }> = [
    { id: 'avaliacao', label: '1. Avaliação Técnica' },
    { id: 'vistoria', label: '2. Ficha de Verificação & Reavaliação' },
    { id: 'manual', label: '3. Manual de Execução' },
    { id: 'qualidade', label: '4. Controle de Qualidade' },
  ];

  return (
    <div className="rounded-xl bg-white border border-[#E5DEC9] shadow-sm">
      <div className="p-6 pb-0">
        <h3 className="font-bold text-sm text-[#181512]">Mesa de Avaliação Técnica — {order.attendanceNumber}</h3>
        <p className="text-xs text-[#6B6257] mt-0.5">
          Para uma análise de defeitos completa (11 áreas), use o botão "Abrir Vistoria das 11 Áreas" acima.
        </p>
      </div>

      <div className="px-6 flex flex-wrap gap-2 pt-3 border-b border-[#E5DEC9] mt-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
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
        {activeTab === 'avaliacao' && (
          <ProductTechnicalEvaluationForm
            order={order}
            materialsCatalog={materialsCatalog}
            defaultEvaluatorName={settings.responsibleDefaultName}
            onUpdateOrder={onUpdateOrder}
            onForwardToMila={handleForwardToMila}
            fromDesk="pedro_avaliacao"
          />
        )}
        {activeTab === 'vistoria' && (
          <InspectionSheetForm
            order={order}
            settings={settings}
            defaultResponsibleName={settings.responsibleDefaultName}
            onUpdateOrder={onUpdateOrder}
          />
        )}
        {activeTab === 'manual' && (
          <ExecutionManualView
            order={order}
            settings={settings}
            defaultResponsibleName={settings.responsibleDefaultName}
            onUpdateOrder={onUpdateOrder}
          />
        )}
        {activeTab === 'qualidade' && (
          <QualityControlBoard
            order={order}
            settings={settings}
            defaultResponsibleName={settings.responsibleDefaultName}
            onUpdateOrder={onUpdateOrder}
          />
        )}
      </div>
    </div>
  );
};
