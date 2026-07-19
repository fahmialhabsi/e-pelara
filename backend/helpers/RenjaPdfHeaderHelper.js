'use strict';

function renderDocumentHeader(pdf, meta, dok, docVersion) {
  pdf.fontSize(9).fillColor('#333333');

  pdf.fontSize(14).text('DOKUMEN RESMI — RENJA OPD', {
    align: 'center',
  });

  pdf.moveDown(0.5);

  pdf.fontSize(11).text(meta.judulResmi, {
    align: 'center',
  });

  pdf.moveDown(1);

  pdf.fontSize(9).text(`Versi dokumen: ${docVersion} · Status: ${dok.status}`, {
    align: 'center',
  });

  pdf.moveDown(1.2);
}

module.exports = {
  renderDocumentHeader,
};
