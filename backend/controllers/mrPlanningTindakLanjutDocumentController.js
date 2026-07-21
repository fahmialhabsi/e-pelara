"use strict";

const documentService = require("../services/mr/mrPlanningTindakLanjutDocumentService");

const sendSuccess = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, error, fallbackMessage) => {
  const statusCode = error?.status || error?.statusCode || 500;

  const response = {
    success: false,
    message: error?.message || fallbackMessage,
  };

  if (error?.code) response.code = error.code;
  if (error?.allowed_document_types) response.allowed_document_types = error.allowed_document_types;

  return res.status(statusCode).json(response);
};

const uploadTindakLanjutDocument = async (req, res) => {
  try {
    const data = await documentService.createDocument({
      tindakLanjutId: req.params.id,
      body: req.body,
      file: req.file,
      user: req.user,
    });

    return sendSuccess(res, 201, "Bukti dukung Tindak Lanjut berhasil diunggah.", data);
  } catch (error) {
    return sendError(res, error, "Bukti dukung Tindak Lanjut belum dapat diunggah.");
  }
};

const getTindakLanjutDocuments = async (req, res) => {
  try {
    const data = await documentService.listDocumentsByTindakLanjut({ tindakLanjutId: req.params.id });
    return sendSuccess(res, 200, "Daftar bukti dukung Tindak Lanjut berhasil dimuat.", data);
  } catch (error) {
    return sendError(res, error, "Daftar bukti dukung Tindak Lanjut belum dapat dimuat.");
  }
};

const getTindakLanjutDocumentDetail = async (req, res) => {
  try {
    const data = await documentService.getDocumentDetail({ documentId: req.params.documentId });
    return sendSuccess(res, 200, "Detail bukti dukung Tindak Lanjut berhasil dimuat.", data);
  } catch (error) {
    return sendError(res, error, "Detail bukti dukung Tindak Lanjut belum dapat dimuat.");
  }
};

const cancelTindakLanjutDocument = async (req, res) => {
  try {
    const data = await documentService.cancelDocument({
      documentId: req.params.documentId,
      body: req.body,
      user: req.user,
    });
    return sendSuccess(res, 200, "Bukti dukung Tindak Lanjut berhasil dibatalkan.", data);
  } catch (error) {
    return sendError(res, error, "Bukti dukung Tindak Lanjut belum dapat dibatalkan.");
  }
};

const downloadTindakLanjutDocument = async (req, res) => {
  try {
    const { absolutePath, originalFileName, mimeType } = await documentService.getDocumentForDownload({
      documentId: req.params.documentId,
    });

    const dispositionType = req.query.mode === "view" ? "inline" : "attachment";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(originalFileName)}"`);

    return res.sendFile(absolutePath);
  } catch (error) {
    return sendError(res, error, "Bukti dukung Tindak Lanjut belum dapat dibuka atau diunduh.");
  }
};

module.exports = {
  uploadTindakLanjutDocument,
  getTindakLanjutDocuments,
  getTindakLanjutDocumentDetail,
  cancelTindakLanjutDocument,
  downloadTindakLanjutDocument,
};
