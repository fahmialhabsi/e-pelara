// backend/routes/mr_planningTlhpImportRoutes.js
"use strict";

/**
 * Import PDF "Matriks Pemantauan TLHP BPK" -> LHP/Temuan/Rekomendasi/Tindak
 * Lanjut otomatis (parsing + dedup, lihat mrPlanningTlhpImportService.js).
 * Mounted at /api/mr-planning-tlhp-import.
 */

const express = require("express");
const multer = require("multer");

const controller = require("../controllers/mrPlanningTlhpImportController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

const uploadMatriksPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Hanya file PDF yang diizinkan untuk import Matriks TLHP."));
    }
    return cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  uploadMatriksPdf.single("file")(req, res, (error) => {
    if (error) {
      let message = "File Matriks TLHP belum dapat diunggah.";
      if (error.code === "LIMIT_FILE_SIZE") {
        message = "Ukuran berkas melebihi batas maksimal 15 MB.";
      } else if (error.message) {
        message = error.message;
      }
      return res.status(400).json({
        success: false,
        message,
        code: error.code || "MR_TLHP_IMPORT_UPLOAD_ERROR",
      });
    }
    return next();
  });
};

router.post("/matriks-pdf", verifyToken, allowRoles(WRITE), handleUpload, controller.importMatriksPdf);

module.exports = router;
