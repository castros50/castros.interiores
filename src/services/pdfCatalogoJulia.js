const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { UPLOAD_ROOT } = require('../middleware/upload');

function adicionarNumeracao(doc) {
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);
    const margemOriginal = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(8).fillColor('#666').text(
      'Castros Interiores — Catálogo — Página ' + (i + 1) + ' de ' + paginas.count,
      40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80, lineBreak: false }
    );
    doc.page.margins.bottom = margemOriginal;
  }
}

function caminhoFoto(fotoArquivo) {
  const caminho = path.join(UPLOAD_ROOT, 'marketing', fotoArquivo);
  return fs.existsSync(caminho) ? caminho : null;
}

// itens: [{ titulo, categoria, colecao, descricao, medidas, cores, preco_texto, destaque, fotos: [arquivo,...] }]
function gerar(campanha, itens, contato) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });

  doc.fontSize(22).fillColor('#4f3620').text('Castros Interiores', { align: 'center' });
  doc.fontSize(14).fillColor('#000').text('Catálogo — ' + (campanha.nome || 'Coleção'), { align: 'center' });
  doc.fontSize(10).fillColor('#555').text(new Date().toLocaleDateString('pt-BR'), { align: 'center' });
  doc.moveDown(2);

  if (itens.length === 0) {
    doc.fontSize(12).fillColor('#a32626').text('Nenhum produto cadastrado neste catálogo ainda.', { align: 'center' });
  }

  itens.forEach((item, idx) => {
    if (idx > 0) doc.addPage();
    doc.fontSize(16).fillColor('#4f3620').text(item.titulo);
    doc.fontSize(9).fillColor('#6a6258').text([item.categoria, item.colecao].filter(Boolean).join(' · ') || 'Categoria não informada');
    doc.moveDown(0.5);

    const fotosValidas = (item.fotos || []).map(caminhoFoto).filter(Boolean);
    if (fotosValidas.length > 0) {
      const largura = fotosValidas.length > 1 ? 240 : 400;
      let x = doc.x;
      fotosValidas.slice(0, 2).forEach((caminho) => {
        try { doc.image(caminho, x, doc.y, { fit: [largura, 300] }); } catch (_) { /* ignora foto corrompida */ }
        x += largura + 15;
      });
      doc.moveDown(fotosValidas.length > 1 ? 16 : 20);
    } else {
      doc.fontSize(9).fillColor('#a32626').text('(sem fotografia cadastrada para este produto)');
      doc.moveDown(0.5);
    }

    doc.fontSize(10).fillColor('#000');
    doc.text('Descrição: ' + (item.descricao || 'Não informada'));
    if (item.medidas) doc.text('Medidas: ' + item.medidas);
    if (item.cores) doc.text('Cores disponíveis: ' + item.cores);
    doc.text('Preço: ' + (item.preco_texto ? item.preco_texto : 'Consulte-nos'));
    if (item.destaque) doc.fontSize(9).fillColor('#9a7138').text(item.destaque);
    doc.fillColor('#000');
  });

  doc.addPage();
  doc.fontSize(14).fillColor('#4f3620').text('Contato', { align: 'center' });
  doc.moveDown();
  doc.fontSize(11).fillColor('#000').text('WhatsApp: ' + (contato.whatsapp || 'Não informado'), { align: 'center' });
  doc.text('Castros Interiores — oficina de reforma de estofados', { align: 'center' });

  adicionarNumeracao(doc);
  doc.end();
  return doc;
}

module.exports = { gerar };
