const express = require("express");
const router = express.Router();
const PenatausahaanController = require("../controllers/penatausahaanController");
const { importPdf, importPdfBatch } = require("../controllers/realisasiImportController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const upload = require("../middlewares/upload");

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  PenatausahaanController.getAll
);

// Import Realisasi Anggaran dari PDF "Laporan Realisasi per Sub Kegiatan" SIPD
// (1 berkas). Wajib didaftarkan sebelum "/:id" generik di bawah.
router.post(
  "/import-pdf",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  upload.single("file"),
  importPdf
);

// Import banyak berkas PDF realisasi sekaligus.
router.post(
  "/import-pdf-batch",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  upload.array("files", 30),
  importPdfBatch
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  PenatausahaanController.getById
);

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  PenatausahaanController.create
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  PenatausahaanController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  PenatausahaanController.destroy
);

module.exports = router;
