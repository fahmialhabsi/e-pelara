// backend/controllers/mr_riskSingleExportController.js
'use strict';

const riskSingleExportService = require('../services/mr/mrPlanningRiskSingleExportService');

const getErrorStatus = (error) => error.status || error.statusCode || 500;

const sendError = (res, error) => {
  const status = getErrorStatus(error);
  return res.status(status).json({
    success: false,
    message: error.message || 'Terjadi kesalahan saat export laporan risiko.',
    code: error.code || 'MR_RISK_SINGLE_EXPORT_ERROR',
  });
};

const exportWord = async (req, res) => {
  const { id } = req.params;
  try {
    const { buffer, filename } = await riskSingleExportService.buildWordDocument(id);
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(res, error);
  }
};

const exportExcel = async (req, res) => {
  const { id } = req.params;
  try {
    const { workbook, filename } = await riskSingleExportService.buildExcelWorkbook(id);
    const buffer = await workbook.xlsx.writeBuffer();
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(res, error);
  }
};

const exportPdf = async (req, res) => {
  const { id } = req.params;
  try {
    const { buffer, filename } = await riskSingleExportService.buildPdfFromWord(id);
    const mimeType = 'application/pdf';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  exportWord,
  exportExcel,
  exportPdf,
};
