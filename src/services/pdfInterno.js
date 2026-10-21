const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { UPLOAD_ROOT } = require('../middleware/upload');

const GRAVIDADE_ROTULO = { leve: 'Leve', moderada: 'Moderada', grave: 'Grave', nao_avaliavel: 'Não avaliável' };
const ORIGEM_ROTULO = {
  observado_foto: 'Observado na foto', relatado_cliente: 'Relatado pelo cliente',
  suspeita: 'Suspeita a confirmar', confirmado_oficina: 'Confirmado pela oficina', nao_avaliavel: 'Não avaliável'
};
const STATUS_REVISAO_ROTULO = { pendente: 'Pendente de revisão', confirmado: 'Confirmado', editado: 'Editado', descartado: 'Descartado' };
const POSSIBILIDADE_ROTULO = {
  candidato: 'Candidato a reaproveitamento, sujeito à inspeção',
  recuperavel: 'Recuperável com reparo, sujeito à inspeção',
  substituicao: 'Substituição indicada',
  pendente: 'Decisão pendente'
};
const CONCLUSAO_ROTULO = {
  vantajosa: 'Reforma potencialmente vantajosa',
  viavel_com_ressalvas: 'Reforma viável com ressalvas',
  pouco_vantajosa: 'Reforma aparentemente pouco vantajosa',
  dados_insuficientes: 'Dados insuficientes para concluir'
};

function fmtMoeda(v) {
  if (v === null || v === undefined || isNaN(v)) return 'Pendente';
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

function adicionarNumeracao(doc) {
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    const margemInferiorOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que o texto do rodapé crie uma página extra
    doc.fontSize(8).fillColor('#666').text(
      'Castros Interiores — Relatório interno — Página ' + (i + 1) + ' de ' + paginas.count,
      40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80, lineBreak: false }
    );
    doc.page.margins.bottom = margemInferiorOriginal;
  }
}

function tituloSecao(doc, texto) {
  doc.moveDown(0.5);
  doc.fontSize(13).fillColor('#4f3620').text(texto, { underline: false });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#000');
}

function campo(doc, rotulo, valor) {
  doc.font('Helvetica-Bold').text(rotulo + ': ', { continued: true }).font('Helvetica').text(valor || 'Não informado');
}

function gerar(atendimento, helpers) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

  doc.fontSize(16).fillColor('#4f3620').text('Castros Interiores', { align: 'left' });
  doc.fontSize(12).fillColor('#000').text('Relatório Interno de Avaliação de Estofado');
  doc.fontSize(10).fillColor('#555').text('Avaliação nº ' + atendimento.numero + ' — gerado em ' + new Date().toLocaleString('pt-BR'));
  doc.moveDown();

  tituloSecao(doc, '1. Identificação do atendimento');
  campo(doc, 'Número', atendimento.numero);
  campo(doc, 'Status', atendimento.status);
  campo(doc, 'Cliente', atendimento.cliente_nome);
  campo(doc, 'Telefone', atendimento.cliente_telefone);
  campo(doc, 'Tipo de móvel', atendimento.tipo_movel);
  campo(doc, 'Quantidade de peças', atendimento.quantidade_pecas);
  campo(doc, 'Medidas aproximadas', atendimento.medidas);
  campo(doc, 'Tempo de uso', atendimento.tempo_uso);
  campo(doc, 'Defeitos relatados pelo cliente', atendimento.defeitos_relatados);
  campo(doc, 'Serviço desejado', atendimento.servico_desejado);
  campo(doc, 'Histórico de reformas', atendimento.historico_reformas);
  campo(doc, 'Preferência de tecido/conforto', atendimento.preferencia_tecido);
  campo(doc, 'Observações', atendimento.observacoes);
  campo(doc, 'Criado em', atendimento.criado_em);
  campo(doc, 'Atualizado em', atendimento.atualizado_em);
  campo(doc, 'Responsável pela revisão', atendimento.responsavel_nome);
  campo(doc, 'Revisado em', atendimento.revisado_em);

  tituloSecao(doc, '2. Fotos registradas');
  if (atendimento.fotos.length === 0) {
    doc.text('Nenhuma foto registrada.');
  }
  let numeroFoto = 1;
  for (const foto of atendimento.fotos) {
    const caminho = path.join(UPLOAD_ROOT, String(atendimento.id), foto.arquivo);
    const ext = path.extname(foto.arquivo).toLowerCase();
    doc.font('Helvetica-Bold').fontSize(9).text('Foto ' + numeroFoto + ' — ' + foto.categoria + (foto.legenda ? (' — ' + foto.legenda) : ''));
    if (fs.existsSync(caminho) && ['.jpg', '.jpeg', '.png'].includes(ext)) {
      try {
        doc.image(caminho, { fit: [250, 180] });
      } catch (_) {
        doc.font('Helvetica').fontSize(9).fillColor('#a32626').text('(não foi possível incluir esta imagem no PDF)').fillColor('#000');
      }
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#a32626').text('(formato de imagem não suportado na exportação em PDF)').fillColor('#000');
    }
    doc.moveDown(0.3);
    numeroFoto++;
  }

  tituloSecao(doc, '3. Defeitos por área');
  if (atendimento.achados.length === 0) {
    doc.fontSize(10).text('Nenhum achado registrado até o momento.');
  }
  for (const a of atendimento.achados) {
    doc.fontSize(10).font('Helvetica-Bold').text(helpers.mapAreaRotulo(a.area));
    doc.font('Helvetica').fontSize(9);
    doc.text('Descrição: ' + a.descricao);
    doc.text('Origem da informação: ' + (ORIGEM_ROTULO[a.origem] || a.origem));
    doc.text('Gravidade aparente: ' + (GRAVIDADE_ROTULO[a.gravidade] || a.gravidade));
    doc.text('Intervenção sugerida: ' + (a.intervencao_sugerida || 'Não informado'));
    doc.text('Inspeção/teste necessário: ' + (a.inspecao_necessaria || 'Não informado'));
    doc.text('Situação da revisão: ' + (STATUS_REVISAO_ROTULO[a.status_revisao] || a.status_revisao) + (a.gerado_por_ia ? ' (sugerido por IA)' : ' (registrado manualmente)'));
    doc.moveDown(0.3);
  }
  if (atendimento.achadosDescartados.length > 0) {
    doc.fontSize(9).font('Helvetica-Bold').text('Achados descartados pelo responsável (mantidos para histórico):');
    doc.font('Helvetica');
    for (const a of atendimento.achadosDescartados) {
      doc.text('- ' + helpers.mapAreaRotulo(a.area) + ': ' + a.descricao);
    }
  }
  doc.text('Referência de lateralidade: direita e esquerda consideradas a partir da posição de quem está sentado no móvel, de frente para o ambiente.');

  tituloSecao(doc, '4. Reaproveitamento de materiais');
  if (atendimento.reaproveitamento.length === 0) {
    doc.fontSize(10).text('Nenhuma avaliação de reaproveitamento registrada.');
  }
  for (const r of atendimento.reaproveitamento) {
    doc.fontSize(9).font('Helvetica-Bold').text(helpers.mapComponenteRotulo(r.componente));
    doc.font('Helvetica');
    doc.text('Condição: ' + (r.condicao || 'Não informado'));
    doc.text('Possibilidade: ' + (POSSIBILIDADE_ROTULO[r.possibilidade] || r.possibilidade));
    doc.text('Reparo necessário: ' + (r.reparo_necessario || 'Não informado'));
    doc.text('Critério para aprovação: ' + (r.criterio_aprovacao || 'Não informado'));
    doc.text('Efeito esperado no custo: ' + (r.efeito_custo || 'Não informado'));
    doc.moveDown(0.3);
  }

  tituloSecao(doc, '5. Propostas de reforma');
  const ROTULO_PROPOSTA = { essencial: 'Essencial', recomendada: 'Recomendada', completa: 'Completa' };
  if (atendimento.propostas.length === 0) {
    doc.fontSize(10).text('Nenhuma proposta montada.');
  }
  for (const p of atendimento.propostas) {
    const selecionada = atendimento.proposta_selecionada_id === p.id;
    doc.fontSize(10).font('Helvetica-Bold').text('Proposta ' + ROTULO_PROPOSTA[p.tipo] + (selecionada ? ' (selecionada)' : ''));
    doc.font('Helvetica').fontSize(9);
    doc.text('Serviços: ' + (p.servicos || 'Não informado'));
    doc.text('Componentes a manter: ' + (p.manter || 'Não informado'));
    doc.text('Componentes a recuperar: ' + (p.recuperar || 'Não informado'));
    doc.text('Componentes a substituir: ' + (p.substituir || 'Não informado'));
    doc.text('Pendências: ' + (p.pendencias || 'Não informado'));
    doc.text('Benefícios: ' + (p.beneficios || 'Não informado'));
    doc.text('Limitações: ' + (p.limitacoes || 'Não informado'));
    doc.moveDown(0.3);
  }

  tituloSecao(doc, '6. Materiais e custos internos');
  if (atendimento.orcamentoItens.length === 0) {
    doc.fontSize(10).text('Nenhum item de orçamento lançado.');
  } else {
    let total = 0;
    let temPendente = false;
    for (const item of atendimento.orcamentoItens) {
      doc.fontSize(9).text(
        '[' + item.tipo + '] ' + item.descricao + ' — qtd: ' + item.quantidade +
        (item.unidade ? (' ' + item.unidade) : '') + ' — custo unit.: ' + fmtMoeda(item.custo_unitario) +
        ' — subtotal: ' + fmtMoeda(item.subtotal)
      );
      if (item.subtotal === null) temPendente = true;
      else total += item.subtotal;
    }
    doc.moveDown(0.2);
    doc.font('Helvetica-Bold').text('Custo interno total (itens definidos): ' + fmtMoeda(total) + (temPendente ? ' — há itens pendentes de valor' : ''));
    doc.font('Helvetica').text('Preço de venda informado: ' + fmtMoeda(atendimento.preco_venda));
  }

  tituloSecao(doc, '7. Parecer de viabilidade');
  if (atendimento.parecer) {
    doc.fontSize(10).font('Helvetica-Bold').text(CONCLUSAO_ROTULO[atendimento.parecer.conclusao] || atendimento.parecer.conclusao);
    doc.font('Helvetica').fontSize(9).text(atendimento.parecer.texto || 'Sem observações adicionais.');
    if (atendimento.parecer.preco_movel_novo) doc.text('Preço de móvel novo equivalente informado: ' + fmtMoeda(atendimento.parecer.preco_movel_novo));
    if (atendimento.parecer.preliminar) {
      doc.fillColor('#8a5a00').text('Parecer preliminar — sujeito a inspeção e orçamento completos.').fillColor('#000');
    }
  } else {
    doc.fontSize(10).text('Parecer ainda não registrado.');
  }

  tituloSecao(doc, '8. Pendências gerais');
  const pendencias = [];
  if (atendimento.fotos.length === 0) pendencias.push('Fotos ainda não enviadas.');
  if (!atendimento.revisado_em) pendencias.push('Análise ainda não revisada pelo responsável.');
  if (atendimento.orcamentoItens.some(i => i.subtotal === null)) pendencias.push('Há itens de orçamento sem valor definido.');
  if (!atendimento.parecer) pendencias.push('Parecer de viabilidade não registrado.');
  doc.fontSize(9).text(pendencias.length ? pendencias.join('\n') : 'Nenhuma pendência identificada neste momento.');

  doc.moveDown();
  doc.fontSize(9).fillColor('#555').text('Responsável pela revisão: ' + (atendimento.responsavel_nome || 'Não preenchido'));

  adicionarNumeracao(doc);
  doc.end();
  return doc;
}

module.exports = { gerar };
