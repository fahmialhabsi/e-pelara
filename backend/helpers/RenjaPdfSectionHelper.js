'use strict';

const { renderMarkdownToPdf } = require('./RenjaPdfTableHelper');

function renderSection(pdf, bab, body) {
  pdf.fontSize(12).fillColor('#000000').text(bab, {
    underline: true,
  });

  pdf.moveDown(0.4);

  renderMarkdownToPdf(pdf, body);

  pdf.moveDown(0.8);
}

module.exports = {
  renderSection,
};
