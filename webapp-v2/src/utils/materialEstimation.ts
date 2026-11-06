// Estimativa de consumo de tecido e espuma a partir das medidas levantadas na
// Ficha de Visita Técnica — nunca inventa quantidade: todo cálculo documenta
// exatamente quais entradas usou (memória de cálculo) e lista o que faltou
// para as partes que não puderam ser calculadas, em vez de "chutar" um valor
// ou travar a estimativa inteira por causa de uma peça sem medida.

export interface FabricPartInput {
  label: string;
  widthCm: number | null;
  heightCm: number | null; // segunda dimensão do corte (altura/profundidade da peça)
}

export interface FabricEstimateResult {
  status: 'estimado' | 'pendente';
  totalLinearMeters?: number;
  calculationMemo: string;
  missingInputs: string[];
}

function roundUpToStep(value: number, stepCm: number): number {
  return Math.ceil(value / stepCm) * stepCm;
}

export function estimateFabricConsumption(params: {
  parts: FabricPartInput[];
  usableWidthCm?: number | null;
  patternDirection?: 'Vertical' | 'Horizontal' | 'Indiferente' | null;
  seamMarginCm?: number | null; // aplicada nas duas pontas de cada peça
  justifiedLossPercent?: number | null;
}): FabricEstimateResult {
  const { parts, usableWidthCm, patternDirection, seamMarginCm, justifiedLossPercent } = params;
  const missingInputs: string[] = [];
  const memoLines: string[] = [];

  if (!usableWidthCm || usableWidthCm <= 0) {
    missingInputs.push('largura útil do tecido escolhido');
    return {
      status: 'pendente',
      calculationMemo:
        'Não foi possível estimar: a largura útil do tecido escolhido não foi informada. ' +
        'Informe a largura útil (cm) do rolo para calcular o consumo.',
      missingInputs,
    };
  }

  const margin = seamMarginCm && seamMarginCm > 0 ? seamMarginCm : 0;
  const lossPercent = justifiedLossPercent && justifiedLossPercent > 0 ? justifiedLossPercent : 0;
  let totalLengthCm = 0;
  let computedCount = 0;

  for (const part of parts) {
    if (!part.widthCm || !part.heightCm) {
      missingInputs.push(`${part.label}: medida ausente`);
      continue;
    }
    let lengthAlongRoll: number;
    let widthAcrossRoll: number;
    if (patternDirection === 'Vertical') {
      lengthAlongRoll = part.heightCm;
      widthAcrossRoll = part.widthCm;
    } else if (patternDirection === 'Horizontal') {
      lengthAlongRoll = part.widthCm;
      widthAcrossRoll = part.heightCm;
    } else {
      // 'Indiferente' ou não informado: escolhe a orientação que usa menos tecido.
      const optionA = { length: part.heightCm, width: part.widthCm };
      const optionB = { length: part.widthCm, width: part.heightCm };
      const aFits = optionA.width <= usableWidthCm;
      const bFits = optionB.width <= usableWidthCm;
      if (aFits && bFits) {
        const chosen = optionA.length <= optionB.length ? optionA : optionB;
        lengthAlongRoll = chosen.length;
        widthAcrossRoll = chosen.width;
      } else if (aFits) {
        lengthAlongRoll = optionA.length;
        widthAcrossRoll = optionA.width;
      } else {
        lengthAlongRoll = optionB.length;
        widthAcrossRoll = optionB.width;
      }
    }
    if (widthAcrossRoll > usableWidthCm) {
      missingInputs.push(
        `${part.label}: não cabe na largura útil de ${usableWidthCm} cm (precisa de ${widthAcrossRoll} cm) — requer emenda ou tecido mais largo, a confirmar com o responsável`
      );
      continue;
    }
    const partLengthWithMargin = lengthAlongRoll + margin * 2;
    totalLengthCm += partLengthWithMargin;
    computedCount++;
    memoLines.push(
      `${part.label}: ${lengthAlongRoll} cm + ${margin * 2} cm de margem de costura = ${partLengthWithMargin} cm`
    );
  }

  if (computedCount === 0) {
    return {
      status: 'pendente',
      calculationMemo:
        'Não foi possível estimar: nenhuma peça tinha as duas medidas necessárias ou nenhuma cabe na largura útil informada.',
      missingInputs,
    };
  }

  const withLoss = totalLengthCm * (1 + lossPercent / 100);
  const totalLinearMeters = roundUpToStep(withLoss, 10) / 100; // arredonda para a dezena de cm acima

  const memo =
    `Largura útil usada: ${usableWidthCm} cm. Sentido do desenho: ${patternDirection || 'indiferente'}. ` +
    `${memoLines.join('; ')}. Soma: ${totalLengthCm.toFixed(0)} cm` +
    (lossPercent > 0 ? ` + ${lossPercent}% de perda justificada = ${withLoss.toFixed(0)} cm` : '') +
    `, arredondado para ${totalLinearMeters.toFixed(2)} m lineares.` +
    (missingInputs.length > 0
      ? ` Pendente para: ${missingInputs.join('; ')} (não incluído nesta estimativa).`
      : '');

  return { status: 'estimado', totalLinearMeters, calculationMemo: memo, missingInputs };
}

export interface FoamPartInput {
  label: string;
  widthCm: number | null;
  depthCm: number | null;
  thicknessCm: number | null;
  densitySpecification?: string | null; // só preenchido quando identificado por fonte confiável
}

export interface FoamEstimateResult {
  status: 'estimado' | 'pendente';
  totalAreaM2?: number;
  bySpecification: Record<string, number>; // chave: especificação (ou "Não identificada") -> área m²
  calculationMemo: string;
  missingInputs: string[];
}

export function estimateFoamConsumption(parts: FoamPartInput[]): FoamEstimateResult {
  const missingInputs: string[] = [];
  const memoLines: string[] = [];
  const bySpecification: Record<string, number> = {};
  let totalAreaM2 = 0;
  let computedCount = 0;

  for (const part of parts) {
    if (!part.widthCm || !part.depthCm) {
      missingInputs.push(`${part.label}: medida ausente`);
      continue;
    }
    const areaM2 = (part.widthCm * part.depthCm) / 10000;
    const spec = part.densitySpecification?.trim() || 'Não identificada';
    bySpecification[spec] = (bySpecification[spec] || 0) + areaM2;
    totalAreaM2 += areaM2;
    computedCount++;
    memoLines.push(
      `${part.label}: ${part.widthCm} x ${part.depthCm} cm` +
        (part.thicknessCm ? ` x ${part.thicknessCm} cm de espessura` : '') +
        ` = ${areaM2.toFixed(2)} m² (especificação: ${spec})`
    );
  }

  if (computedCount === 0) {
    return {
      status: 'pendente',
      bySpecification,
      calculationMemo: 'Não foi possível estimar: nenhuma peça tinha largura e profundidade medidas.',
      missingInputs,
    };
  }

  const specSummary = Object.entries(bySpecification)
    .map(([spec, area]) => `${spec}: ${area.toFixed(2)} m²`)
    .join('; ');
  const memo =
    `${memoLines.join('; ')}. Total: ${totalAreaM2.toFixed(2)} m² (${specSummary}).` +
    (missingInputs.length > 0
      ? ` Pendente para: ${missingInputs.join('; ')} (não incluído nesta estimativa).`
      : '') +
    (Object.keys(bySpecification).includes('Não identificada')
      ? ' Densidade/especificação "não identificada" não deve ser tratada como confirmada — confirme com etiqueta/nota fiscal antes de comprar.'
      : '');

  return { status: 'estimado', totalAreaM2, bySpecification, calculationMemo: memo, missingInputs };
}
