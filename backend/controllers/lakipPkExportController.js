'use strict';

const puppeteer = require('puppeteer');
const lakipPkService = require('../services/lakipPkService');
const { buildPkHtml } = require('../services/lakipPkExportService');
const { buildPkDocxBuffer } = require('../services/lakipPkDocxService');

const PRINT_CSS = `
<style>
  @page { size: A4 portrait; margin: 0; }
  body { font-size: 11pt; }
</style>
`;

const injectPrintCss = (html) => html.replace('</head>', PRINT_CSS + '</head>');

exports.preview = async (req, res) => {
  try {
    const { renstraId, tahun } = req.query;
    if (!renstraId || !tahun) {
      return res.status(400).send('renstraId dan tahun wajib diisi.');
    }
    const detail = await lakipPkService.getPkDetail(renstraId, tahun);
    const html = buildPkHtml(detail, tahun);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (err) {
    console.error('[lakipPkExport] preview:', err);
    return res.status(500).send(`<h2>Gagal generate preview PK</h2><pre>${err.message}</pre>`);
  }
};

exports.exportPdf = async (req, res) => {
  const { renstraId, tahun } = req.query;
  let browser;
  try {
    if (!renstraId || !tahun) {
      return res.status(400).json({ success: false, message: 'renstraId dan tahun wajib diisi.' });
    }
    const detail = await lakipPkService.getPkDetail(renstraId, tahun);
    const html = injectPrintCss(buildPkHtml(detail, tahun));

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '20mm', right: '15mm' },
    });

    const filename = `Perjanjian_Kinerja_${detail.nama_opd}_${tahun}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('[lakipPkExport] exportPdf:', err);
    return res.status(500).json({ success: false, message: 'Gagal generate PDF: ' + err.message });
  } finally {
    if (browser) await browser.close();
  }
};

exports.exportDocx = async (req, res) => {
  const { renstraId, tahun } = req.query;
  try {
    if (!renstraId || !tahun) {
      return res.status(400).json({ success: false, message: 'renstraId dan tahun wajib diisi.' });
    }
    const detail = await lakipPkService.getPkDetail(renstraId, tahun);
    const docxBuffer = await buildPkDocxBuffer(detail, tahun);

    const filename = `Perjanjian_Kinerja_${detail.nama_opd}_${tahun}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.end(docxBuffer);
  } catch (err) {
    console.error('[lakipPkExport] exportDocx:', err);
    return res.status(500).json({ success: false, message: 'Gagal generate DOCX: ' + err.message });
  }
};
