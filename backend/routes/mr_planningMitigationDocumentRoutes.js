"use strict";

/**
 * MR Planning Mitigation Document Routes
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R17B-4C-4H-1C
 *
 * Endpoint:
 * - POST  /api/mr-planning-mitigation/:id/documents
 * - GET   /api/mr-planning-mitigation/:id/documents
 * - GET   /api/mr-planning-mitigation/documents/:documentId
 * - PATCH /api/mr-planning-mitigation/documents/:documentId/cancel
 *
 * Guard:
 * - Dokumen ini adalah Dokumen Rencana Tindak Pengendalian.
 * - Bukan bukti realisasi monitoring.
 * - Tidak memakai hard delete.
 */

const express = require("express");
const controller = require("../controllers/mr_planningMitigationDocumentController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const { uploadDokumen } = require("../middlewares/uploadDokumen");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

const uploadSingleDocument = (req, res, next) => {
  const handler = uploadDokumen.any();

  handler(req, res, (error) => {
    if (error) {
      let message = "Dokumen belum dapat diunggah.";

      if (error.code === "LIMIT_FILE_SIZE") {
        message = "Ukuran dokumen melebihi batas maksimal 10 MB.";
      } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
        message =
          error.field && error.field !== "file"
            ? error.field
            : "Tipe dokumen tidak diizinkan. Gunakan dokumen PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, atau PNG.";
      } else if (error.message) {
        message = error.message;
      }

      return res.status(400).json({
        success: false,
        message,
        code: error.code || "MR_MITIGATION_DOCUMENT_UPLOAD_ERROR",
      });
    }

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dokumen wajib diunggah.",
        code: "MR_MITIGATION_DOCUMENT_FILE_REQUIRED",
      });
    }

    const selectedFile =
      req.files.find((item) => item.fieldname === "file") || req.files[0];

    req.file = selectedFile;

    return next();
  });
};

/**
 * Detail dokumen harus diletakkan sebelum "/:id/documents"
 * agar tidak tertangkap sebagai id Rencana Tindak Pengendalian.
 */

router.get(
  "/documents/:documentId/download",
  verifyToken,
  allowRoles(READ),
  controller.downloadMitigationDocument
);

router.get(
  "/documents/:documentId",
  verifyToken,
  allowRoles(READ),
  controller.getMitigationDocumentDetail
);

router.patch(
  "/documents/:documentId/cancel",
  verifyToken,
  allowRoles(WRITE),
  controller.cancelMitigationDocument
);

router.get(
  "/:id/documents",
  verifyToken,
  allowRoles(READ),
  controller.getMitigationDocuments
);


router.post(
  "/:id/documents",
  verifyToken,
  allowRoles(WRITE),
  uploadSingleDocument,
  controller.uploadMitigationDocument
);

module.exports = router;