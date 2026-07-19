'use strict';

const { nextLandscape } = require('./RenjaPdfLayoutHelper');
const { drawPdfGridTable } = require('./RenjaPdfTableHelper');
const { buildRenjaBab4 } = require('./RenjaBab4StructureHelper');
const { buildRenjaBab4Table } = require('./RenjaBab4TableHelper');

function renderBab4(pdf, { meta, items }) {
  const bab4 = buildRenjaBab4(meta, items);
  nextLandscape(pdf);

  pdf.fontSize(12).fillColor('#000000').text(bab4.title, { underline: true });

  pdf.moveDown(0.5);

  pdf.fontSize(11).text(bab4.policy.heading);

  pdf.moveDown(0.3);

  pdf.fontSize(9).text(bab4.policy.body, {
    align: 'justify',
  });

  pdf.moveDown(0.8);

  pdf.fontSize(11).text(bab4.table.heading);

  pdf.moveDown(0.3);

  pdf.fontSize(9).text(
    `${bab4.table.caption}

${bab4.table.note}`,
    {
      align: 'left',
    },
  );

  pdf.moveDown(0.4);

  pdf.moveDown(0.35);

  const table = buildRenjaBab4Table(bab4.table.rows);

  const estRowH = 42;
  const maxY = 720;

  let yStart = pdf.y;

  if (yStart > 560) {
    nextLandscape(pdf);
    yStart = pdf.y;
  }

  for (let off = 0; off < table.rows.length; off += 10) {
    const chunk = table.rows.slice(off, off + 10);
    const estH = estRowH * (chunk.length + 1);

    if (yStart + estH > maxY) {
      nextLandscape(pdf);
      yStart = pdf.y;
    }

    drawPdfGridTable(pdf, {
      left: 50,
      yStart,
      cols: table.widths,
      headers: table.headers,
      rows: chunk,
      fontSize: 6,
    });

    yStart = pdf.y;

    if (off + 10 < table.rows.length) {
      nextLandscape(pdf);
      yStart = pdf.y;
    }
  }
}

module.exports = {
  renderBab4,
};
