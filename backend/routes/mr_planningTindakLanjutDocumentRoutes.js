"use strict";

/**
 * MR Planning Tindak Lanjut Document Routes — Modul TLHP
 *
 * Endpoint:
 * - POST  /api/mr-planning-tindak-lanjut/:id/documents
 * - GET   /api/mr-planning-tindak-lanjut/:id/documents
 * - GET   /api/mr-planning-tindak-lanjut/documents/:documentId
 * - GET   /api/mr-planning-tindak-lanjut/documents/:documentId/download
 * - PATCH /api/mr-planning-tindak-lanjut/documents/:documentId/cancel
 */

const express = require("express");
const controller = require("../controllers/mrPlanningTindakLanjutDocumentController");
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
      let message = "Bukti dukung belum dapat diunggah.";

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
        code: error.code || "MR_TINDAK_LANJUT_DOCUMENT_UPLOAD_ERROR",
      });
    }

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dokumen wajib diunggah.",
        code: "MR_TINDAK_LANJUT_DOCUMENT_FILE_REQUIRED",
      });
    }

    req.file = req.files.find((item) => item.fieldname === "file") || req.files[0];
    return next();
  });
};

router.get(
  "/documents/:documentId/download",
  verifyToken,
  allowRoles(READ),
  controller.downloadTindakLanjutDocument,
);

router.get("/documents/:documentId", verifyToken, allowRoles(READ), controller.getTindakLanjutDocumentDetail);

router.patch(
  "/documents/:documentId/cancel",
  verifyToken,
  allowRoles(WRITE),
  controller.cancelTindakLanjutDocument,
);

router.get("/:id/documents", verifyToken, allowRoles(READ), controller.getTindakLanjutDocuments);

router.post(
  "/:id/documents",
  verifyToken,
  allowRoles(WRITE),
  uploadSingleDocument,
  controller.uploadTindakLanjutDocument,
);

module.exports = router;
