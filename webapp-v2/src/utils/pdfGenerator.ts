import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceRecord,
  WorkshopSettings,
  ManufacturingProjectData,
  ReformMaterialsList,
} from '../types';
import {
  calculateBudgetSummary,
  calculateLineItemTotal,
  formatCurrencyBRL,
  formatMissingText,
} from './calculations';

interface LoadedImageInfo {
  dataUrl: string;
  width: number;
  height: number;
}

async function loadProportionalImage(url: string): Promise<LoadedImageInfo | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let w = img.naturalWidth || 600;
        let h = img.naturalHeight || 450;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: w,
          height: h,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const PRELIMINARY_DISCLAIMER =
  'Avaliação preliminar por fotos. Serviços e orçamento sujeitos à confirmação pelo responsável da Castros Interiores.';

function addPageNumbersAndFooter(doc: jsPDF, isConfirmed: boolean, attendanceNumber: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(215, 208, 198);
    doc.line(15, 282, 195, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 95, 90);

    if (!isConfirmed) {
      doc.text(PRELIMINARY_DISCLAIMER, 15, 286.5);
    } else {
      doc.text(`Castros Interiores — Atendimento ${attendanceNumber}`, 15, 286.5);
    }

    doc.text(`Página ${i} de ${pageCount}`, 195, 286.5, { align: 'right' });
  }
}

export async function generateInternalReportPdf(
  attendance: AttendanceRecord,
  settings: WorkshopSettings
): Promise<void> {
  if (attendance.orderType === 'Fabricação') {
    return generateManufacturingInternalPdf(attendance, settings);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isConfirmed =
    attendance.reviewCompleted && attendance.budget.confirmedByResponsible;

  // Header Banner
  doc.setFillColor(24, 21, 18);
  doc.rect(15, 14, 180, 22, 'F');
  doc.setTextColor(249, 246, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `${(settings.workshopName || 'CASTROS INTERIORES').toUpperCase()} — RELATÓRIO TÉCNICO INTERNO`,
    20,
    23
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 185, 140);
  doc.text(
    `Atendimento: ${attendance.attendanceNumber}   |   Estado: ${attendance.status}   |   Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
    20,
    30
  );

  let cursorY = 42;

  // Preliminary Disclaimer Box if not confirmed
  if (!isConfirmed) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(15, cursorY, 180, 11, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(PRELIMINARY_DISCLAIMER, 18, cursorY + 7);
    cursorY += 16;
  }

  // 1. Identificação do Atendimento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('1. IDENTIFICAÇÃO DO ATENDIMENTO E DO MÓVEL', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [28, 25, 23],
      lineColor: [220, 214, 205],
    },
    headStyles: {
      fillColor: [45, 40, 35],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    body: [
      ['Número do Atendimento', attendance.attendanceNumber, 'Estado Atual', attendance.status],
      [
        'Cliente',
        formatMissingText(attendance.clientName),
        'Telefone',
        formatMissingText(attendance.clientPhone),
      ],
      [
        'Tipo de Móvel',
        formatMissingText(attendance.furnitureType),
        'Quantidade de Peças',
        formatMissingText(attendance.piecesCount),
      ],
      [
        'Medidas Aproximadas',
        formatMissingText(attendance.approxMeasurements),
        'Tempo de Uso',
        formatMissingText(attendance.usageTime),
      ],
      [
        'Reformas Anteriores',
        formatMissingText(attendance.previousReforms),
        'Responsável pela Revisão',
        attendance.reviewCompleted && attendance.reviewerName
          ? `${attendance.reviewerName} (Revisado)`
          : formatMissingText(attendance.reviewerName || 'Pendente de revisão'),
      ],
      ['Defeitos Relatados', { content: formatMissingText(attendance.reportedDefects), colSpan: 3 }],
      ['Serviço Desejado', { content: formatMissingText(attendance.desiredService), colSpan: 3 }],
      [
        'Preferência Tecido / Conforto',
        { content: formatMissingText(attendance.fabricAndComfortPreference), colSpan: 3 },
      ],
      ['Observações', { content: formatMissingText(attendance.notes), colSpan: 3 }],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 2. Fotos Numeradas
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`2. FOTOS NUMERADAS VINCULADAS AO ATENDIMENTO (${attendance.photos.length})`, 15, cursorY);
  cursorY += 5;

  if (attendance.photos.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhuma fotografia anexada até o momento.', 15, cursorY + 4);
    cursorY += 10;
  } else {
    const colWidth = 87;
    const boxHeight = 64;
    let col = 0;

    for (let i = 0; i < attendance.photos.length; i++) {
      const photo = attendance.photos[i];
      if (col === 0 && cursorY + boxHeight > 272) {
        doc.addPage();
        cursorY = 20;
      }
      const x = 15 + col * (colWidth + 6);
      doc.setDrawColor(215, 208, 198);
      doc.setFillColor(252, 250, 247);
      doc.rect(x, cursorY, colWidth, boxHeight, 'FD');

      const imgSource = photo.imageUrl || photo.thumbnailDataUrl || '';
      const loaded = imgSource ? await loadProportionalImage(imgSource) : null;

      if (loaded) {
        const maxImgW = colWidth - 6;
        const maxImgH = 42;
        const ratio = Math.min(maxImgW / loaded.width, maxImgH / loaded.height);
        const drawW = loaded.width * ratio;
        const drawH = loaded.height * ratio;
        const offsetX = x + (colWidth - drawW) / 2;
        const offsetY = cursorY + 3 + (maxImgH - drawH) / 2;
        doc.addImage(loaded.dataUrl, 'JPEG', offsetX, offsetY, drawW, drawH);
      } else {
        doc.setFontSize(8);
        doc.setTextColor(120, 113, 108);
        doc.text('[Imagem registrada no atendimento]', x + 6, cursorY + 22);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(28, 25, 23);
      doc.text(`${photo.code} — ${photo.category}`, x + 3, cursorY + 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(87, 83, 78);
      const captionLines = doc.splitTextToSize(
        `${photo.furnitureLabel}: ${photo.caption || 'Sem legenda'}`,
        colWidth - 6
      );
      doc.text(captionLines.slice(0, 2), x + 3, cursorY + 55);

      col++;
      if (col >= 2) {
        col = 0;
        cursorY += boxHeight + 5;
      }
    }
    if (col !== 0) {
      cursorY += boxHeight + 5;
    }
  }

  // 3. Defeitos por Área
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('3. RELATÓRIO DE DEFEITOS POR ÁREA E ORIGEM DA INFORMAÇÃO', 15, cursorY);
  cursorY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `Referência Direita/Esquerda: ${formatMissingText(attendance.leftRightReference)}`,
    15,
    cursorY
  );
  cursorY += 3;

  const activeFindings = attendance.defectFindings.filter(
    (f) => f.reviewStatus !== 'Descartado'
  );

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [28, 25, 23],
      lineColor: [220, 214, 205],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [45, 40, 35],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    head: [
      [
        'Área',
        'Defeito ou Suspeita',
        'Evidência e Foto',
        'Origem',
        'Gravidade',
        'Serviço Sugerido',
        'Verificação Necessária',
        'Revisão',
      ],
    ],
    body:
      activeFindings.length > 0
        ? activeFindings.map((f) => [
            f.area,
            f.defectOrSuspicion,
            f.evidenceAndPhoto,
            f.origin,
            f.severity,
            f.suggestedService,
            f.requiredVerification,
            f.reviewStatus,
          ])
        : [['—', 'Nenhum defeito analisado até o momento', '—', '—', '—', '—', '—', 'Pendente']],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 4. Evidências, Limitações e Fotos Solicitadas
  if (cursorY > 240) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('4. EVIDÊNCIAS, LIMITAÇÕES TÉCNICAS E FOTOS ADICIONAIS SOLICITADAS', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [28, 25, 23] },
    headStyles: { fillColor: [87, 76, 63], textColor: [255, 255, 255] },
    head: [['Tipo de Registro', 'Detalhamento']],
    body: [
      [
        'Resumo da Análise',
        formatMissingText(attendance.aiPreliminarySummary),
      ],
      [
        'Limitações Visuais Registradas',
        attendance.analysisLimitations.length > 0
          ? attendance.analysisLimitations.join(' • ')
          : 'Nenhuma limitação específica registrada.',
      ],
      [
        'Fotos Adicionais Solicitadas',
        attendance.requestedAdditionalPhotos.length > 0
          ? attendance.requestedAdditionalPhotos.join(' • ')
          : 'Nenhuma foto complementar pendente.',
      ],
      [
        'Observações da Revisão Técnica',
        formatMissingText(attendance.reviewerGeneralNotes),
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 5. Recuperação e Reaproveitamento de Materiais
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('5. AVALIAÇÃO DE RECUPERAÇÃO E REAPROVEITAMENTO DE MATERIAIS', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [28, 25, 23] },
    headStyles: { fillColor: [45, 40, 35], textColor: [255, 255, 255] },
    head: [
      [
        'Componente',
        'Condição',
        'Possibilidade de Reaproveitamento',
        'Recuperação Necessária',
        'Critério de Aprovação',
        'Efeito Esperado no Custo',
      ],
    ],
    body:
      attendance.reuseItems.length > 0
        ? attendance.reuseItems.map((r) => [
            r.component,
            r.condition,
            r.classification,
            r.requiredRecovery,
            r.approvalCriteria,
            r.expectedCostEffect,
          ])
        : [['—', 'Avaliação de reaproveitamento pendente', '—', '—', '—', '—']],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // Inspeção de Espumas pela Oficina
  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [28, 25, 23] },
    headStyles: { fillColor: [87, 76, 63], textColor: [255, 255, 255] },
    head: [['Inspeção Presencial de Espumas na Oficina', 'Resultado']],
    body: [
      [
        'Inspeção interna realizada pela oficina?',
        attendance.foamInspection.inspectedByWorkshop ? 'Sim' : 'Não (espuma coberta — inspeção necessária)',
      ],
      ['Deformação permanente', attendance.foamInspection.permanentDeformation],
      ['Retorno após compressão', attendance.foamInspection.compressionReturn],
      ['Esfarelamento', attendance.foamInspection.crumbling],
      ['Odor / Umidade', `${attendance.foamInspection.odor} / ${attendance.foamInspection.moisture}`],
      [
        'Análise de Consumo e Risco de Retrabalho',
        formatMissingText(attendance.materialConsumptionAndReworkAnalysis),
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 6. Custos Internos, Serviços e Materiais
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('6. SERVIÇOS, MATERIAIS E CUSTOS INTERNOS (USO EXCLUSIVO INTERNO)', 15, cursorY);
  cursorY += 3;

  const summary = calculateBudgetSummary(attendance.budget);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, textColor: [28, 25, 23] },
    headStyles: { fillColor: [45, 40, 35], textColor: [255, 255, 255] },
    head: [['Categoria', 'Item / Serviço', 'Unid.', 'Quantidade', 'Custo Unitário', 'Subtotal Interno']],
    body:
      attendance.budget.items.length > 0
        ? attendance.budget.items.map((item) => {
            const calc = calculateLineItemTotal(item);
            const qtyDisplay =
              item.quantityStatus === 'Definida' && item.quantity !== null
                ? String(item.quantity)
                : item.quantityStatus === 'A levantar (requer medidas e plano de corte)'
                ? 'quantidade a levantar'
                : 'pendente';
            return [
              item.category,
              item.name,
              item.unit,
              qtyDisplay,
              formatCurrencyBRL(item.unitCostCents),
              calc.isPending ? `pendente (${calc.pendingReason})` : formatCurrencyBRL(calc.totalCents),
            ];
          })
        : [['—', 'Nenhum item lançado no orçamento', '—', '—', 'pendente', 'pendente']],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [28, 25, 23] },
    body: [
      [
        'Custo Interno Total Apurado',
        summary.hasAnyPendingItems
          ? `${formatCurrencyBRL(summary.totalInternalCostCents)} (TOTAL INCOMPLETO — há itens pendentes)`
          : formatCurrencyBRL(summary.totalInternalCostCents),
        'Preço de Venda Definido pelo Responsável',
        formatCurrencyBRL(summary.sellingPriceCents),
      ],
      [
        'Condições de Pagamento',
        formatMissingText(attendance.budget.paymentConditions),
        'Prazo Estimado',
        formatMissingText(attendance.budget.estimatedDeadline),
      ],
      [
        'Confirmação do Orçamento pelo Responsável',
        attendance.budget.confirmedByResponsible
          ? `Confirmado por ${formatMissingText(attendance.budget.responsibleName)}`
          : 'Pendente de confirmação pelo responsável',
        'Plano de Corte Confirmado?',
        attendance.budget.cuttingPlanConfirmed ? 'Sim' : 'Não (metragem de tecido a levantar)',
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 7. Parecer e Pendências
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('7. PARECER TÉCNICO (COMPENSA REFORMAR?) E PENDÊNCIAS', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [28, 25, 23] },
    body: [
      [
        'Conclusão do Parecer',
        `${attendance.opinion.conclusion} (${
          attendance.opinion.isPreliminary ? 'PARECER PRELIMINAR' : 'CONFIRMADO'
        })`,
      ],
      ['Estado da Estrutura', formatMissingText(attendance.opinion.structureStateSummary)],
      ['Extensão dos Danos', formatMissingText(attendance.opinion.damageExtentSummary)],
      ['Complexidade Técnica', attendance.opinion.complexityLevel],
      [
        'Preço de Móvel Novo Equivalente',
        attendance.opinion.equivalentNewFurniturePriceCents
          ? formatCurrencyBRL(attendance.opinion.equivalentNewFurniturePriceCents)
          : 'não informado',
      ],
      [
        'Interesse do Cliente em Conservar a Peça',
        formatMissingText(attendance.opinion.clientInterestInKeeping),
      ],
      ['Motivos da Conclusão', formatMissingText(attendance.opinion.reasons)],
      ['Pendências Atuais', formatMissingText(attendance.opinion.pendingFactors)],
      [
        'O que Pode Mudar a Conclusão',
        formatMissingText(attendance.opinion.whatCouldChangeConclusion),
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Danos Ocultos (se houver)
  if (attendance.hiddenDamages && attendance.hiddenDamages.length > 0) {
    if (cursorY > 235) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('8. REGISTRO DE DANOS OCULTOS IDENTIFICADOS NA OFICINA', 15, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [146, 64, 14], textColor: [255, 255, 255] },
      head: [['Data', 'Área', 'Dano Oculto', 'Serviço Adicional', 'Valor Adicional', 'Aprovação do Cliente']],
      body: attendance.hiddenDamages.map((hd) => [
        new Date(hd.discoveredAt).toLocaleDateString('pt-BR'),
        hd.affectedArea,
        hd.description,
        hd.additionalServices,
        formatCurrencyBRL(hd.additionalPriceCents),
        hd.clientApproved
          ? `Aprovado (${hd.clientApprovalNotes || 'Confirmado'})`
          : 'Aguardando aprovação do cliente',
      ]),
    });
  }

  addPageNumbersAndFooter(doc, isConfirmed, attendance.attendanceNumber);
  doc.save(`Relatorio_Interno_${attendance.attendanceNumber}.pdf`);
}

export async function generateClientReportPdf(
  attendance: AttendanceRecord,
  settings: WorkshopSettings
): Promise<void> {
  if (attendance.orderType === 'Fabricação') {
    return generateManufacturingClientPdf(attendance, settings);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isConfirmed =
    attendance.reviewCompleted && attendance.budget.confirmedByResponsible;

  // Header Banner
  doc.setFillColor(24, 21, 18);
  doc.rect(15, 14, 180, 24, 'F');
  doc.setTextColor(249, 246, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(
    `${(settings.workshopName || 'CASTROS INTERIORES').toUpperCase()} — AVALIAÇÃO E PROPOSTA`,
    20,
    24
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 185, 140);
  doc.text(
    `Atendimento: ${attendance.attendanceNumber}   |   Cliente: ${formatMissingText(
      attendance.clientName
    )}   |   Data: ${new Date().toLocaleDateString('pt-BR')}`,
    20,
    31.5
  );

  let cursorY = 44;

  // Mandatory Preliminary Disclaimer when not confirmed
  if (!isConfirmed) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(217, 119, 6);
    doc.rect(15, cursorY, 180, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(PRELIMINARY_DISCLAIMER, 18, cursorY + 7.5);
    cursorY += 17;
  }

  // 1. Identificação
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('1. IDENTIFICAÇÃO DO ATENDIMENTO', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [28, 25, 23],
      lineColor: [220, 214, 205],
    },
    body: [
      ['Número do Atendimento', attendance.attendanceNumber, 'Data', new Date(attendance.createdAt).toLocaleDateString('pt-BR')],
      ['Cliente', formatMissingText(attendance.clientName), 'Telefone', formatMissingText(attendance.clientPhone)],
      ['Móvel Avaliado', formatMissingText(attendance.furnitureType), 'Quantidade de Peças', formatMissingText(attendance.piecesCount)],
      ['Medidas Informadas', formatMissingText(attendance.approxMeasurements), 'Preferência de Tecido/Conforto', formatMissingText(attendance.fabricAndComfortPreference)],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 2. Resumo dos Problemas Identificados
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('2. RESUMO DOS PROBLEMAS OBSERVADOS E RELATADOS', 15, cursorY);
  cursorY += 3;

  const activeFindings = attendance.defectFindings.filter(
    (f) => f.reviewStatus !== 'Descartado' && f.origin !== 'Não avaliável'
  );

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [28, 25, 23] },
    headStyles: { fillColor: [45, 40, 35], textColor: [255, 255, 255] },
    head: [['Área do Móvel', 'Diagnóstico / Observação', 'Origem', 'Serviço Recomendado']],
    body:
      activeFindings.length > 0
        ? activeFindings.map((f) => [
            f.area,
            f.defectOrSuspicion,
            f.origin,
            f.suggestedService,
          ])
        : [
            [
              'Geral',
              formatMissingText(attendance.reportedDefects),
              'Relatado pelo cliente',
              formatMissingText(attendance.desiredService),
            ],
          ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 3. Fotos Relevantes
  if (attendance.photos.length > 0) {
    if (cursorY > 220) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(28, 25, 23);
    doc.text('3. REGISTRO FOTOGRÁFICO DO MÓVEL', 15, cursorY);
    cursorY += 5;

    const relevantPhotos = attendance.photos.slice(0, 4);
    const colWidth = 87;
    const boxHeight = 60;
    let col = 0;

    for (const photo of relevantPhotos) {
      if (col === 0 && cursorY + boxHeight > 272) {
        doc.addPage();
        cursorY = 20;
      }
      const x = 15 + col * (colWidth + 6);
      doc.setDrawColor(215, 208, 198);
      doc.setFillColor(252, 250, 247);
      doc.rect(x, cursorY, colWidth, boxHeight, 'FD');

      const imgSource = photo.imageUrl || photo.thumbnailDataUrl || '';
      const loaded = imgSource ? await loadProportionalImage(imgSource) : null;
      if (loaded) {
        const maxImgW = colWidth - 6;
        const maxImgH = 40;
        const ratio = Math.min(maxImgW / loaded.width, maxImgH / loaded.height);
        const drawW = loaded.width * ratio;
        const drawH = loaded.height * ratio;
        const offsetX = x + (colWidth - drawW) / 2;
        const offsetY = cursorY + 3 + (maxImgH - drawH) / 2;
        doc.addImage(loaded.dataUrl, 'JPEG', offsetX, offsetY, drawW, drawH);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(28, 25, 23);
      doc.text(`${photo.code} — ${photo.category}`, x + 3, cursorY + 48);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(87, 83, 78);
      const lines = doc.splitTextToSize(photo.caption || photo.furnitureLabel, colWidth - 6);
      doc.text(lines.slice(0, 2), x + 3, cursorY + 53);

      col++;
      if (col >= 2) {
        col = 0;
        cursorY += boxHeight + 5;
      }
    }
    if (col !== 0) {
      cursorY += boxHeight + 5;
    }
  }

  // 4. O que pode ser recuperado e Substituições indicadas
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('4. COMPONENTES A RECUPERAR E SUBSTITUIÇÕES INDICADAS', 15, cursorY);
  cursorY += 3;

  const recoverableList = attendance.reuseItems
    .filter(
      (r) =>
        r.classification === 'Candidato a reaproveitamento, sujeito à inspeção' ||
        r.classification === 'Recuperável com reparo, sujeito à inspeção'
    )
    .map((r) => `${r.component}: ${r.classification} (${r.requiredRecovery})`);

  const replaceList = attendance.reuseItems
    .filter((r) => r.classification === 'Substituição indicada')
    .map((r) => `${r.component}: ${r.condition}`);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [28, 25, 23] },
    headStyles: { fillColor: [87, 76, 63], textColor: [255, 255, 255] },
    head: [['O que pode ser preservado / recuperado (sujeito à inspeção)', 'Substituições Indicadas']],
    body: [
      [
        recoverableList.length > 0
          ? recoverableList.join('\n• ')
          : 'Sujeito à abertura do estofado na oficina.',
        replaceList.length > 0
          ? replaceList.join('\n• ')
          : 'A definir após confirmação da proposta.',
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 5. Proposta Selecionada
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  const selectedProp =
    attendance.proposals.find((p) => p.tier === attendance.selectedProposalTier) ||
    attendance.proposals[0];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text(
    `5. PROPOSTA DE REFORMA SELECIONADA: ${attendance.selectedProposalTier}`,
    15,
    cursorY
  );
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [28, 25, 23] },
    body: selectedProp
      ? [
          ['Escopo da Proposta', `${selectedProp.tier} — ${selectedProp.title}`],
          ['Serviços Inclusos', selectedProp.services.join(' • ') || 'Conforme avaliação técnica'],
          ['Materiais a Manter', selectedProp.materialsToKeep.join(' • ') || 'Nenhum / A confirmar'],
          ['Materiais a Recuperar', selectedProp.materialsToRecover.join(' • ') || 'Nenhum / A confirmar'],
          ['Materiais a Substituir', selectedProp.materialsToReplace.join(' • ') || 'Conforme necessário'],
          ['Benefícios e Limitações', selectedProp.benefitsAndLimitations],
          ['Pendências Técnicas', selectedProp.pendingItems.join(' • ') || 'Nenhuma pendência'],
        ]
      : [['Proposta', 'Em elaboração pela equipe técnica da Castros Interiores.']],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 6. Preço e Condições Confirmadas (NUNCA inclui custos internos ou margem!)
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('6. INVESTIMENTO E CONDIÇÕES COMERCIAIS', 15, cursorY);
  cursorY += 3;

  const clientPriceDisplay =
    attendance.budget.confirmedByResponsible && attendance.budget.sellingPriceCents
      ? formatCurrencyBRL(attendance.budget.sellingPriceCents)
      : 'Sujeito à confirmação pelo responsável';

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [28, 25, 23] },
    body: [
      ['Valor Total da Proposta', clientPriceDisplay],
      [
        'Condições de Pagamento',
        attendance.budget.confirmedByResponsible
          ? formatMissingText(attendance.budget.paymentConditions)
          : 'A confirmar após validação final do escopo',
      ],
      [
        'Prazo Estimado de Execução',
        attendance.budget.confirmedByResponsible
          ? formatMissingText(attendance.budget.estimatedDeadline)
          : 'A confirmar',
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 7. Parecer em linguagem simples e Próximo Passo
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('7. PARECER TÉCNICO E PRÓXIMO PASSO', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [28, 25, 23] },
    body: [
      [
        'Conclusão da Avaliação',
        `${attendance.opinion.conclusion}${
          attendance.opinion.isPreliminary ? ' (Avaliação Preliminar)' : ''
        }`,
      ],
      [
        'Resumo para o Cliente',
        formatMissingText(attendance.opinion.clientPlainLanguageSummary),
      ],
      ['Próximo Passo Recomendado', formatMissingText(attendance.opinion.recommendedNextStep)],
    ],
  });

  addPageNumbersAndFooter(doc, isConfirmed, attendance.attendanceNumber);
  doc.save(`Relatorio_Cliente_${attendance.attendanceNumber}.pdf`);
}

export async function generateShoppingListPdf(
  attendance: AttendanceRecord,
  materialsList: ReformMaterialsList,
  settings: WorkshopSettings,
  buyerName?: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(24, 21, 18);
  doc.rect(15, 14, 180, 24, 'F');
  doc.setTextColor(249, 246, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `${(settings.workshopName || 'CASTROS INTERIORES').toUpperCase()} — LISTA DE COMPRAS`,
    20,
    23
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 185, 140);
  doc.text(
    `Atendimento: ${attendance.attendanceNumber}   |   Lista: ${materialsList.listCode} (rev. ${materialsList.revision})   |   Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
    20,
    30
  );
  doc.text(
    `Comprador responsável: ${formatMissingText(buyerName || materialsList.preparedByName)}`,
    20,
    35
  );

  let cursorY = 46;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [28, 25, 23],
      lineColor: [220, 214, 205],
    },
    headStyles: {
      fillColor: [45, 40, 35],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    body: [
      ['Cliente', formatMissingText(attendance.clientName), 'Móvel', formatMissingText(attendance.furnitureType)],
      ['Proposta Selecionada', materialsList.proposalTier, 'Revisão da Lista', `${materialsList.revision}`],
    ],
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text(
    'Quantidade e preço previstos pelo aplicativo são estimativas internas, nunca o gasto real. Preencha "Qtd. Comprada", "Preço Unit. Real" e "Total Real" à mão na loja.',
    15,
    cursorY
  );
  cursorY += 5;

  const purchasableItems = materialsList.items.filter(
    (item) => item.componentStatus !== 'Reaproveitado'
  );
  const reusedCount = materialsList.items.length - purchasableItems.length;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [28, 25, 23],
      lineColor: [220, 214, 205],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [45, 40, 35],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    head: [
      [
        'Item / Material e Especificação',
        'Qtd. Prevista (Compra)',
        'Unid.',
        'Qtd. Comprada (preencher)',
        'Preço Unit. Real (preencher)',
        'Total Real (preencher)',
      ],
    ],
    body: purchasableItems.map((item) => [
      {
        content: `${item.component} — ${item.materialName}${item.specification ? `\n${item.specification}` : ''}${
          item.unitCostCents !== null
            ? `\n(estimado no app: ${formatCurrencyBRL(item.unitCostCents)}/${item.unit})`
            : ''
        }`,
      },
      item.purchaseQuantity === null ? 'Pendente de medição' : `${item.purchaseQuantity}`,
      item.purchaseUnit || item.unit,
      '',
      '',
      '',
    ]),
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 26, halign: 'right' },
      2: { cellWidth: 16 },
      3: { cellWidth: 26, minCellHeight: 10 },
      4: { cellWidth: 26, minCellHeight: 10 },
      5: { cellWidth: 26, minCellHeight: 10 },
    },
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  if (purchasableItems.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Nenhum item de compra: todos os componentes avaliados foram marcados para reaproveitamento.', 15, cursorY);
    cursorY += 6;
  }
  if (reusedCount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(87, 83, 78);
    doc.text(
      `${reusedCount} peça(s) marcada(s) como reaproveitada(s) não entraram nesta lista de compras.`,
      15,
      cursorY
    );
    cursorY += 6;
  }

  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('CONFERÊNCIA DA COMPRA (preencher na loja ou ao retornar)', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [28, 25, 23], minCellHeight: 8 },
    body: [
      ['Loja / Fornecedor', '', 'Data da Compra', ''],
      ['Nº da Nota ou Recibo', '', 'Forma de Pagamento', ''],
      ['Frete (R$)', '', 'Desconto (R$)', ''],
      ['Outros Valores Identificados (R$)', '', 'Total Pago (R$)', ''],
      ['Valor Pago (R$)', '', 'Saldo Pendente (R$)', ''],
    ],
  });
  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  if (cursorY > 255) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Observações', 15, cursorY);
  cursorY += 2;
  doc.setDrawColor(215, 208, 198);
  doc.rect(15, cursorY, 180, 20, 'S');
  cursorY += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Assinatura do Comprador: _______________________________________', 15, cursorY);
  doc.text('Data: ____/____/______', 150, cursorY);
  cursorY += 8;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text(
    `Código de identificação desta lista para conferência: ${materialsList.listCode} — revisão ${materialsList.revision}.`,
    15,
    cursorY
  );

  addPageNumbersAndFooter(doc, true, attendance.attendanceNumber);
  doc.save(`Lista_Compras_${attendance.attendanceNumber}_rev${materialsList.revision}.pdf`);
}

export async function generateManufacturingInternalPdf(
  attendance: AttendanceRecord,
  settings: WorkshopSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const proj: ManufacturingProjectData = attendance.manufacturingData || {
    id: `mfg-${attendance.id}`,
    modelName: attendance.furnitureType || 'Estofado sob Medida',
    productCategory: 'Sofá Fixo',
    unitsCount: parseInt(attendance.piecesCount, 10) || 1,
    version: 'v1.0',
    technicalDraftStatus: 'rascunho_tecnico',
    dimensions: {
      widthCm: 160,
      depthCm: 88,
      heightCm: 90,
      seatHeightCm: 45,
      seatDepthCm: 56,
      armWidthCm: 15,
      rawText: attendance.approxMeasurements || '',
      source: 'informado_cliente',
    },
    finishingWishes: attendance.fabricAndComfortPreference || '',
    workshopMethodNotes: attendance.notes || '',
    referencePhotos: [],
    components: [],
    materials: [],
    assemblyManual: {
      modelName: attendance.furnitureType || 'Estofado sob Medida',
      version: 'v1.0',
      status: 'rascunho_tecnico',
      lastUpdatedAt: new Date().toISOString(),
      referenceImages: [],
      steps: [],
      generalPreparationNotes: '',
      finalInspectionCriteria: '',
    },
    qualityCheckpoints: [],
  };

  const isConfirmed = Boolean(proj.responsibleApproval?.approved);

  // Banner Cabeçalho
  doc.setFillColor(24, 21, 18);
  doc.rect(15, 14, 180, 24, 'F');
  doc.setTextColor(249, 246, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `${(settings.workshopName || 'CASTROS INTERIORES').toUpperCase()} — FICHA TÉCNICA E MANUAL DE MONTAGEM`,
    20,
    23
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 185, 140);
  doc.text(
    `Pedido: ${attendance.attendanceNumber} (Fabricação Própria)   |   Lote: ${proj.unitsCount} un   |   Versão: ${proj.version}   |   ${new Date().toLocaleDateString('pt-BR')}`,
    20,
    30.5
  );

  let cursorY = 44;

  // 1. Briefing e Especificações do Projeto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('1. ESPECIFICAÇÕES DO PROJETO E BRIEFING TÉCNICO', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [28, 25, 23] },
    body: [
      ['Cliente / Contato', `${formatMissingText(attendance.clientName)} — ${formatMissingText(attendance.clientPhone)}`],
      ['Modelo / Categoria', `${proj.modelName} (${proj.productCategory})`],
      ['Tamanho do Lote', `${proj.unitsCount} unidade(s)`],
      [
        'Dimensões Principais',
        `${proj.dimensions?.widthCm || '-'} cm (L) x ${proj.dimensions?.depthCm || '-'} cm (P) x ${proj.dimensions?.heightCm || '-'} cm (A) | Assento: ${proj.dimensions?.seatHeightCm || '-'}cm alt / ${proj.dimensions?.seatDepthCm || '-'}cm prof | Braço: ${proj.dimensions?.armWidthCm || '-'}cm`,
      ],
      ['Acabamento e Conforto', formatMissingText(proj.finishingWishes)],
      ['Homologação Técnica', proj.responsibleApproval?.approved ? `Aprovado por ${proj.responsibleApproval.approvedBy} (${proj.responsibleApproval.version}) em ${new Date(proj.responsibleApproval.approvedAt).toLocaleDateString('pt-BR')}` : 'Aguardando validação formal do responsável técnico'],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 2. Fotos de Referência do Modelo
  const validPhotos = (attendance.photos || []).filter((p) => Boolean(p.imageUrl));
  if (validPhotos.length > 0) {
    if (cursorY > 210) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(28, 25, 23);
    doc.text('2. REFERÊNCIAS VISUAIS DO MODELO', 15, cursorY);
    cursorY += 4;

    const maxPhotosToPrint = Math.min(validPhotos.length, 3);
    const photoWidth = 55;
    const photoHeight = 42;
    const gap = 6;
    let startX = 15;

    for (let i = 0; i < maxPhotosToPrint; i++) {
      const ph = validPhotos[i];
      try {
        const imgInfo = await loadProportionalImage(ph.imageUrl);
        if (imgInfo) {
          doc.addImage(imgInfo.dataUrl, 'JPEG', startX, cursorY, photoWidth, photoHeight);
          doc.setFontSize(7.5);
          doc.setTextColor(80, 75, 70);
          doc.text(`${ph.code}: ${ph.category}`, startX, cursorY + photoHeight + 3.5);
        }
      } catch {
        // ignore
      }
      startX += photoWidth + gap;
    }
    cursorY += photoHeight + 8;
  }

  // 3. Lista de Peças e Componentes em mm
  if (cursorY > 220) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('3. LISTA DE PEÇAS DA ESTRUTURA (DIMENSÕES EM MM)', 15, cursorY);
  cursorY += 3;

  const compRows = (proj.components && proj.components.length > 0)
    ? proj.components.map((c) => [
        c.code,
        c.name,
        c.componentType,
        `${c.dimensionsMm?.length || '-'} x ${c.dimensionsMm?.width || '-'} x ${c.dimensionsMm?.thickness || '-'} mm`,
        c.specification || 'Padrão',
        String(c.quantityPerUnit),
        String(c.totalQuantity),
      ])
    : [['P-01', 'Quadro estrutural básico', 'Madeira', '1600 x 70 x 25 mm', 'Eucalipto tratado seco', '2', String(2 * (proj.unitsCount ?? 1))]];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    head: [['Código', 'Peça', 'Tipo', 'Dimensões (C x L x E)', 'Especificação', 'Qtd/Un', 'Total Lote']],
    headStyles: { fillColor: [24, 21, 18], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2, textColor: [28, 25, 23] },
    body: compRows,
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 4. Materiais, Tecidos (1,40m) e Consumo
  if (cursorY > 220) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('4. MATERIAIS, TECIDOS E ESTIMATIVA DE COMPRA', 15, cursorY);
  cursorY += 3;

  const matRows: string[][] = (proj.materials && proj.materials.length > 0)
    ? proj.materials.map((m) => [
        m.name || '',
        m.usableWidthMeters ? `${m.usableWidthMeters}m (+${m.justifiedLossPercent || 10}%)` : `+${m.justifiedLossPercent || 10}%`,
        `${m.requiredPerProduct ?? 0} ${m.consumptionUnit || 'un'}`,
        `${m.totalRequired ?? 0} ${m.consumptionUnit || 'un'}`,
        `${m.availableStock ?? 0} ${m.consumptionUnit || 'un'}`,
        (m.toPurchaseQuantity ?? 0) > 0 ? `${m.toPurchaseQuantity ?? 0} ${m.consumptionUnit || 'un'}` : 'Disponível',
        formatCurrencyBRL(m.unitCostCents ?? 0),
        formatCurrencyBRL(m.totalCostCents ?? 0),
      ])
    : [['Tecido Linho Misto', '1,40m (+10%)', '8 m', `${8 * (proj.unitsCount ?? 1)} m`, '12 m', 'Disponível', 'R$ 78,00', formatCurrencyBRL(8 * (proj.unitsCount ?? 1) * 7800)]];

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    head: [['Material', 'Larg. Útil / Perda', 'Consumo Un', 'Total Lote', 'Estoque', 'Comprar', 'Custo Un', 'Total']],
    headStyles: { fillColor: [24, 21, 18], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2, textColor: [28, 25, 23] },
    body: matRows,
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 5. Custos Internos e Precificação (Oficina)
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('5. APURAÇÃO DE CUSTOS INTERNOS E FORMAÇÃO DE PREÇO', 15, cursorY);
  cursorY += 3;

  const fin = attendance.financialData;
  const totalMatsCost = (proj.materials || []).reduce((sum, m) => sum + (m.totalCostCents || 0), 0);
  const laborOficina = fin?.laborWorkshopCostCents ?? (65000 * (proj.unitsCount ?? 1));
  const laborMestre = fin?.ownerLaborCostCents ?? (25000 * (proj.unitsCount ?? 1));
  const rateioFixos = fin?.overheadApportionmentCents ?? (15000 * (proj.unitsCount ?? 1));
  const frete = fin?.transportFreightCents ?? 18000;
  const custoTotal = totalMatsCost + laborOficina + laborMestre + rateioFixos + frete;

  const precoFinal = fin?.approvedSellingPriceCents || (
    fin?.pricingMethod === 'markup_sobre_custo'
      ? Math.round(custoTotal * (fin.markupMultiplier || 1.45))
      : Math.round(custoTotal / (1 - (fin?.targetMarginPercent || 30) / 100))
  );

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [28, 25, 23] },
    body: [
      ['Consumo Total de Materiais', formatCurrencyBRL(totalMatsCost)],
      ['Mão de Obra Tapeçaria e Costura', formatCurrencyBRL(laborOficina)],
      ['Mão de Obra Especializada do Mestre', formatCurrencyBRL(laborMestre)],
      ['Rateio de Custos Fixos da Oficina', formatCurrencyBRL(rateioFixos)],
      ['Logística de Transporte e Entrega', formatCurrencyBRL(frete)],
      ['Custo Total Interno Apurado', formatCurrencyBRL(custoTotal)],
      ['Método / Parâmetro de Margem', fin?.pricingMethod === 'markup_sobre_custo' ? `Markup s/ Custo (${fin.markupMultiplier || 1.45}x)` : `Margem s/ Venda (${fin?.targetMarginPercent || 30}%)`],
      ['Preço Final de Venda Homologado', formatCurrencyBRL(precoFinal)],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 6. Manual de Montagem em 12 Passos
  doc.addPage();
  cursorY = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('6. MANUAL DE FABRICAÇÃO E MONTAGEM (12 ETAPAS PADRONIZADAS)', 15, cursorY);
  cursorY += 3;

  const stepsToPrint = (proj.assemblyManual?.steps && proj.assemblyManual.steps.length > 0)
    ? proj.assemblyManual.steps
    : [
        { stepNumber: 1, title: 'Corte e Esquadrejamento da Madeira', description: 'Corte preciso dos elementos estruturais conforme dimensões em mm.', sequenceOrder: 1, piecesUsed: ['P-01'], toolsRequired: ['Esquadrejadeira', 'Trena'], pointsOfAttention: ['Tolerância de +/- 1mm'], qualityCheckCriteria: 'Ângulo de 90°', hasUncertainties: false },
        { stepNumber: 2, title: 'Montagem do Chassi Estrutural', description: 'Fixação e colagem das longarinas e travessas.', sequenceOrder: 2, piecesUsed: ['P-01', 'P-02'], toolsRequired: ['Grampeador pneumático', 'Cola PVA D3'], pointsOfAttention: ['Esquadro perfeito na caixa'], qualityCheckCriteria: 'Zero torção', hasUncertainties: false },
      ];

  const manualRows = stepsToPrint.map((s) => [
    `Passo ${s.stepNumber}\n${s.title}`,
    `${s.description}\n\nFerramentas: ${s.toolsRequired.join(', ')}\nPontos de Atenção: ${s.pointsOfAttention.join('; ')}\nTolerância: ${s.qualityCheckCriteria}`,
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [28, 25, 23] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 130 },
    },
    body: manualRows,
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 7. Liberação e Assinatura
  if (cursorY > 240) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(28, 25, 23);
  doc.text('7. TERMO DE HOMOLOGAÇÃO E LIBERAÇÃO PARA CORTE', 15, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [28, 25, 23] },
    body: [
      ['Status do Projeto', proj.responsibleApproval?.approved ? 'HOMOLOGADO E LIBERADO PARA CORTE' : 'PENDENTE DE HOMOLOGAÇÃO'],
      ['Responsável Técnico Homologador', proj.responsibleApproval?.approvedBy || settings.responsibleDefaultName || 'Responsável Castros Interiores'],
      ['Data de Homologação', proj.responsibleApproval?.approvedAt ? new Date(proj.responsibleApproval.approvedAt).toLocaleDateString('pt-BR') : 'Aguardando aprovação'],
      ['Observações Finais da Oficina', proj.responsibleApproval?.notes || 'Conferir alinhamento das costuras e lote da espuma antes do fechamento.'],
    ],
  });

  addPageNumbersAndFooter(doc, isConfirmed, attendance.attendanceNumber);
  doc.save(`Ficha_Tecnica_Fabricacao_${attendance.attendanceNumber}.pdf`);
}

export async function generateManufacturingClientPdf(
  attendance: AttendanceRecord,
  settings: WorkshopSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const proj: ManufacturingProjectData = attendance.manufacturingData || {
    id: `mfg-${attendance.id}`,
    modelName: attendance.furnitureType || 'Estofado sob Medida',
    productCategory: 'Sofá Fixo',
    unitsCount: parseInt(attendance.piecesCount, 10) || 1,
    version: 'v1.0',
    technicalDraftStatus: 'rascunho_tecnico',
    dimensions: {
      widthCm: 160,
      depthCm: 88,
      heightCm: 90,
      seatHeightCm: 45,
      seatDepthCm: 56,
      armWidthCm: 15,
      rawText: attendance.approxMeasurements || '',
      source: 'informado_cliente',
    },
    finishingWishes: attendance.fabricAndComfortPreference || '',
    workshopMethodNotes: '',
    referencePhotos: [],
    components: [],
    materials: [],
    assemblyManual: {
      modelName: attendance.furnitureType || 'Estofado sob Medida',
      version: 'v1.0',
      status: 'rascunho_tecnico',
      lastUpdatedAt: new Date().toISOString(),
      referenceImages: [],
      steps: [],
      generalPreparationNotes: '',
      finalInspectionCriteria: '',
    },
    qualityCheckpoints: [],
  };

  const isConfirmed = Boolean(proj.responsibleApproval?.approved);

  // Banner Cabeçalho
  doc.setFillColor(24, 21, 18);
  doc.rect(15, 14, 180, 24, 'F');
  doc.setTextColor(249, 246, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(
    `${(settings.workshopName || 'CASTROS INTERIORES').toUpperCase()} — PROPOSTA DE FABRICAÇÃO SOB MEDIDA`,
    20,
    24
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(212, 185, 140);
  doc.text(
    `Proposta: ${attendance.attendanceNumber}   |   Cliente: ${formatMissingText(attendance.clientName)}   |   Data: ${new Date().toLocaleDateString('pt-BR')}`,
    20,
    31.5
  );

  let cursorY = 44;

  // 1. Apresentação do Modelo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('1. ESPECIFICAÇÕES DO ESTOFADO SOB MEDIDA', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.8, textColor: [28, 25, 23] },
    body: [
      ['Modelo Solicitado', proj.modelName || 'Estofado Sob Medida'],
      ['Tipo de Estofado', proj.productCategory || 'Estofado Sob Medida'],
      ['Quantidade Contratada', `${proj.unitsCount ?? 1} unidade(s)`],
      [
        'Dimensões Externas',
        `${proj.dimensions?.widthCm || '-'} cm (largura) x ${proj.dimensions?.depthCm || '-'} cm (profundidade) x ${proj.dimensions?.heightCm || '-'} cm (altura total)`,
      ],
      ['Ergonomia do Assento', `Altura do assento ao piso: ${proj.dimensions?.seatHeightCm || '-'} cm | Profundidade útil: ${proj.dimensions?.seatDepthCm || '-'} cm`],
      ['Revestimento e Acabamento', formatMissingText(proj.finishingWishes)],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 2. Fotos de Referência do Modelo
  const validPhotos = (attendance.photos || []).filter((p) => Boolean(p.imageUrl));
  if (validPhotos.length > 0) {
    if (cursorY > 200) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(28, 25, 23);
    doc.text('2. REFERÊNCIAS VISUAIS DE DESIGN E MODELO', 15, cursorY);
    cursorY += 4;

    const maxPhotosToPrint = Math.min(validPhotos.length, 3);
    const photoWidth = 55;
    const photoHeight = 42;
    const gap = 6;
    let startX = 15;

    for (let i = 0; i < maxPhotosToPrint; i++) {
      const ph = validPhotos[i];
      try {
        const imgInfo = await loadProportionalImage(ph.imageUrl);
        if (imgInfo) {
          doc.addImage(imgInfo.dataUrl, 'JPEG', startX, cursorY, photoWidth, photoHeight);
          doc.setFontSize(7.5);
          doc.setTextColor(80, 75, 70);
          doc.text(ph.caption || ph.category, startX, cursorY + photoHeight + 3.5);
        }
      } catch {
        // ignore
      }
      startX += photoWidth + gap;
    }
    cursorY += photoHeight + 8;
  }

  // 3. Padrão Construtivo e Materiais de Alta Durabilidade
  if (cursorY > 215) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('3. PADRÃO CONSTRUTIVO E MATERIAIS SELECIONADOS', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.8, textColor: [28, 25, 23] },
    body: [
      ['Estrutura Principal', 'Madeira maciça tratada e seca em estufa com travamento por cantoneiras e cola D3 estrutural.'],
      ['Sistema de Sustentação', 'Percintas elásticas italianas entrelaçadas em trama fechada com tensionamento pneumático balanceado.'],
      ['Conforto e Assentos', 'Espumas de alta resiliência certificadas com densidade adequada e manta acrílica siliconada para maciez e toque suave.'],
      ['Costura e Tapeçaria', 'Tapeçaria artesanal de atelier com costuras rebatidas, alinhamento rigoroso e acabamento impecável.'],
      ['Base e Pés', 'Pés nivelados com proteção de feltro para preservação do piso e estabilidade absoluta.'],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 4. Investimento e Condições Comerciais (SEM custos internos ou margens!)
  if (cursorY > 215) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('4. INVESTIMENTO E CONDIÇÕES COMERCIAIS', 15, cursorY);
  cursorY += 3;

  const fin = attendance.financialData;
  const precoTotal = fin?.approvedSellingPriceCents || fin?.calculatedPriceCents || 485000;
  const precoUnitario = Math.round(precoTotal / Math.max(1, proj.unitsCount || 1));

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [28, 25, 23] },
    body: [
      ['Investimento Total da Proposta', formatCurrencyBRL(precoTotal)],
      ...((proj.unitsCount ?? 1) > 1 ? [['Valor Unitário do Lote', `${formatCurrencyBRL(precoUnitario)} por unidade (${proj.unitsCount ?? 1} un)`]] : []),
      ['Condições de Pagamento', fin?.paymentConditions || attendance.budget?.paymentConditions || '50% de entrada na aprovação e 50% na entrega'],
      ['Prazo Estimado de Execução', attendance.budget?.estimatedDeadline || '15 a 20 dias úteis após aprovação técnica'],
      ['Validade da Proposta', '15 dias corridos a partir da data de emissão'],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

  // 5. Garantia e Atendimento Especializado
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text('5. GARANTIA E ATENDIMENTO CASTROS INTERIORES', 15, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.8, textColor: [28, 25, 23] },
    body: [
      ['Garantia Estrutural', 'Garantia de 1 ano contra defeitos de fabricação no chassi de madeira e sustentação.'],
      ['Atendimento e Dúvidas', 'WhatsApp oficial: (91) 98556-9841 — Atendimento direto com a equipe Castros Interiores.'],
      ['Entrega Técnica', 'Entrega e montagem no local com conferência de nivelamento e cuidados de conservação.'],
    ],
  });

  addPageNumbersAndFooter(doc, isConfirmed, attendance.attendanceNumber);
  doc.save(`Proposta_Comercial_Fabricacao_${attendance.attendanceNumber}.pdf`);
}
