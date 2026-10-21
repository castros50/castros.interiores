const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { UPLOAD_ROOT } = require('../middleware/upload');

const POSSIBILIDADE_SIMPLES = {
  candidato: 'Pode ser reaproveitado (sujeito à confirmação na oficina)',
  recuperavel: 'Pode ser recuperado com reparo (sujeito à confirmação na oficina)',
  substituicao: 'Substituição indicada',
  pendente: 'Decisão pendente'
};
const CONCLUSAO_SIMPLES = {
  vantajosa: 'A reforma parece vantajosa.',
  viavel_com_ressalvas: 'A reforma é viável, com alguns pontos de atenção.',
  pouco_vantajosa: 'A reforma parece pouco vantajosa neste caso.',
  dados_insuficientes: 'Ainda não há dados suficientes para concluir.'
};
const AVISO_PRELIMINAR = 'Avaliação preliminar por fotos. Serviços e orçamento sujeitos à confirmação pelo responsável da Castros Interiores.';

function fmtMoeda(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

function adicionarNumeracao(doc) {
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    const margemInferiorOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // evita que o texto do rodapé crie uma página extra
    doc.fontSize(8).fillColor('#666').text(
      'Castros Interiores — Página ' + (i + 1) + ' de ' + paginas.count,
      40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80, lineBreak: false }
    );
    doc.page.margins.bottom = margemInferiorOriginal;
  }
}

function tituloSecao(doc, texto) {
  doc.moveDown(0.5);
  doc.fontSize(13).fillColor('#4f3620').text(texto);
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#000');
}

function gerar(atendimento, helpers) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const revisado = !!atendimento.revisado_em;

  doc.fontSize(16).fillColor('#4f3620').text('Castros Interiores');
  doc.fontSize(12).fillColor('#000').text('Relatório de Avaliação do Estofado');
  doc.fontSize(10).fillColor('#555').text('Avaliação nº ' + atendimento.numero + ' — ' + new Date().toLocaleDateString('pt-BR'));
  doc.moveDown(0.3);
  if (!revisado) {
    doc.fontSize(10).fillColor('#8a5a00').text(AVISO_PRELIMINAR);
  }
  doc.fillColor('#000');

  tituloSecao(doc, 'Identificação');
  doc.fontSize(10).text('Cliente: ' + (atendimento.cliente_nome || 'Não informado'));
  doc.text('Móvel: ' + (atendimento.tipo_movel || 'Não informado') + (atendimento.quantidade_pecas ? (' — ' + atendimento.quantidade_pecas + ' peça(s)') : ''));

  tituloSecao(doc, 'Resumo dos problemas identificados');
  const achadosValidos = atendimento.achados.filter(a => a.status_revisao !== 'pendente' || !revisado);
  if (achadosValidos.length === 0) {
    doc.text('Ainda não há defeitos registrados para este atendimento.');
  } else {
    for (const a of achadosValidos) {
      doc.fontSize(10).text('• ' + helpers.mapAreaRotulo(a.area) + ': ' + a.descricao);
    }
  }

  tituloSecao(doc, 'Fotos');
  let numeroFoto = 1;
  const fotosRelevantes = atendimento.fotos.slice(0, 12);
  if (fotosRelevantes.length === 0) {
    doc.text('Nenhuma foto disponível.');
  }
  for (const foto of fotosRelevantes) {
    const caminho = path.join(UPLOAD_ROOT, String(atendimento.id), foto.arquivo);
    const ext = path.extname(foto.arquivo).toLowerCase();
    doc.fontSize(9).font('Helvetica-Bold').text('Foto ' + numeroFoto + ' — ' + foto.categoria);
    if (fs.existsSync(caminho) && ['.jpg', '.jpeg', '.png'].includes(ext)) {
      try { doc.image(caminho, { fit: [220, 160] }); } catch (_) { doc.font('Helvetica').text('(imagem indisponível)'); }
    }
    doc.moveDown(0.2);
    numeroFoto++;
  }

  tituloSecao(doc, 'O que poderá ser recuperado');
  const recuperaveis = atendimento.reaproveitamento.filter(r => r.possibilidade === 'candidato' || r.possibilidade === 'recuperavel');
  if (recuperaveis.length === 0) {
    doc.font('Helvetica').fontSize(10).text('Ainda não há itens confirmados como recuperáveis.');
  } else {
    for (const r of recuperaveis) {
      doc.fontSize(10).text('• ' + helpers.mapComponenteRotulo(r.componente) + ' — ' + POSSIBILIDADE_SIMPLES[r.possibilidade]);
    }
  }

  tituloSecao(doc, 'O que tem substituição indicada');
  const substituir = atendimento.reaproveitamento.filter(r => r.possibilidade === 'substituicao');
  if (substituir.length === 0) {
    doc.fontSize(10).text('Nenhum item com substituição indicada até o momento.');
  } else {
    for (const r of substituir) {
      doc.fontSize(10).text('• ' + helpers.mapComponenteRotulo(r.componente));
    }
  }

  tituloSecao(doc, 'Proposta');
  const propostaSelecionada = atendimento.propostas.find(p => p.id === atendimento.proposta_selecionada_id);
  const ROTULO_PROPOSTA = { essencial: 'Essencial', recomendada: 'Recomendada', completa: 'Completa' };
  if (propostaSelecionada) {
    doc.fontSize(10).font('Helvetica-Bold').text('Proposta ' + ROTULO_PROPOSTA[propostaSelecionada.tipo]);
    doc.font('Helvetica');
    doc.text('Serviços: ' + (propostaSelecionada.servicos || 'A detalhar'));
    doc.text('Benefícios: ' + (propostaSelecionada.beneficios || 'A detalhar'));
    if (propostaSelecionada.limitacoes) doc.text('Limitações: ' + propostaSelecionada.limitacoes);
  } else {
    doc.fontSize(10).text('Nenhuma proposta selecionada ainda.');
  }

  tituloSecao(doc, 'Preço e condições');
  const preco = fmtMoeda(atendimento.preco_venda);
  if (revisado && preco) {
    doc.fontSize(10).text('Valor aprovado: ' + preco);
  } else {
    doc.fontSize(10).text('Valor ainda não aprovado pelo responsável.');
  }

  tituloSecao(doc, 'Parecer');
  if (atendimento.parecer) {
    doc.fontSize(10).text(CONCLUSAO_SIMPLES[atendimento.parecer.conclusao] || '');
    if (atendimento.parecer.texto) doc.text(atendimento.parecer.texto);
  } else {
    doc.fontSize(10).text('Parecer ainda não disponível.');
  }
  if (!revisado) {
    doc.moveDown(0.2).fillColor('#8a5a00').text(AVISO_PRELIMINAR).fillColor('#000');
  }

  tituloSecao(doc, 'Próximo passo');
  doc.fontSize(10).text(revisado
    ? 'Entre em contato com a Castros Interiores para confirmar a proposta e combinar os próximos passos.'
    : 'Aguarde o contato da Castros Interiores após a revisão desta avaliação pelo responsável.');

  adicionarNumeracao(doc);
  doc.end();
  return doc;
}

module.exports = { gerar };
