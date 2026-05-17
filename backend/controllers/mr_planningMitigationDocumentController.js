"use strict";

const documentService = require("../services/mr/mrPlanningMitigationDocumentService");

const sendSuccess = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, error, fallbackMessage) => {
  const statusCode = error?.status || error?.statusCode || 500;

  const response = {
    success: false,
    message: error?.message || fallbackMessage,
  };

  if (error?.code) {
    response.code = error.code;
  }

  if (error?.allowed_document_types) {
    response.allowed_document_types = error.allowed_document_types;
  }

  if (process.env.NODE_ENV !== "production" && error?.stack) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * POST /api/mr-planning-mitigation/:id/documents
 *
 * Unggah Dokumen Rencana Tindak Pengendalian.
 */
const uploadMitigationDocument = async (req, res) => {
  try {
    const data = await documentService.createDocument({
      mitigationId: req.params.id,
      body: req.body,
      file: req.file,
      user: req.user,
    });

    return sendSuccess(
      res,
      201,
      "Dokumen Rencana Tindak Pengendalian berhasil diunggah.",
      data
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Dokumen Rencana Tindak Pengendalian belum dapat diunggah."
    );
  }
};

/**
 * GET /api/mr-planning-mitigation/:id/documents
 *
 * Daftar Dokumen Rencana Tindak Pengendalian.
 */
const getMitigationDocuments = async (req, res) => {
  try {
    const data = await documentService.listDocumentsByMitigation({
      mitigationId: req.params.id,
    });

    return sendSuccess(
      res,
      200,
      "Daftar Dokumen Rencana Tindak Pengendalian berhasil dimuat.",
      data
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Daftar Dokumen Rencana Tindak Pengendalian belum dapat dimuat."
    );
  }
};

/**
 * GET /api/mr-planning-mitigation/documents/:documentId
 *
 * Detail Dokumen Rencana Tindak Pengendalian.
 */
const getMitigationDocumentDetail = async (req, res) => {
  try {
    const data = await documentService.getDocumentDetail({
      documentId: req.params.documentId,
    });

    return sendSuccess(
      res,
      200,
      "Detail Dokumen Rencana Tindak Pengendalian berhasil dimuat.",
      data
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Detail Dokumen Rencana Tindak Pengendalian belum dapat dimuat."
    );
  }
};

/**
 * PATCH /api/mr-planning-mitigation/documents/:documentId/cancel
 *
 * Batalkan Dokumen Rencana Tindak Pengendalian.
 */
const cancelMitigationDocument = async (req, res) => {
  try {
    const data = await documentService.cancelDocument({
      documentId: req.params.documentId,
      body: req.body,
      user: req.user,
    });

    return sendSuccess(
      res,
      200,
      "Dokumen Rencana Tindak Pengendalian berhasil dibatalkan.",
      data
    );
  } catch (error) {
    return sendError(
      res,
      error,
      "Dokumen Rencana Tindak Pengendalian belum dapat dibatalkan."
    );
  }
};

const downloadMitigationDocument = async (req, res) => {
  try {
    const { document, absolutePath, originalFileName, mimeType } =
      await documentService.getDocumentForDownload({
        documentId: req.params.documentId,
      });

    const dispositionType =
      req.query.mode === "view" ? "inline" : "attachment";

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `${dispositionType}; filename="${encodeURIComponent(originalFileName)}"`
    );

    return res.sendFile(absolutePath);
  } catch (error) {
    return sendError(
      res,
      error,
      "Dokumen Rencana Tindak Pengendalian belum dapat dibuka atau diunduh."
    );
  }
};

module.exports = {
  uploadMitigationDocument,
  getMitigationDocuments,
  getMitigationDocumentDetail,
  cancelMitigationDocument,
  downloadMitigationDocument,
};