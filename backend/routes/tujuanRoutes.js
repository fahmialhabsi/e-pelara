const express = require("express");
const router = express.Router();
const tujuanController = require("../controllers/tujuanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Rute utama GET (dengan filter opsional)
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  tujuanController.getAll
);

// Ekspor Excel
router.get(
  "/export/excel",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  tujuanController.exportTujuan
);

// Ekspor PDF
router.get(
  "/export/pdf",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  tujuanController.exportTujuanPdf
);

// Dapatkan nomor tujuan berikutnya
router.get(
  "/next-no",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  tujuanController.getNextNo
);

// Get by Periode
router.get(
  "/by-periode",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  tujuanController.getByPeriode
);

// Get by ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  tujuanController.getById
);

// Tambah data
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  tujuanController.create
);

// Perbarui data
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  tujuanController.update
);

// Hapus data
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  tujuanController.delete
);

// Get berdasarkan Misi
router.get(
  "/by-misi/:misi_id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  tujuanController.getByMisi
);
router.get(
  "/misi/:misi_id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  tujuanController.getByMisi
);

module.exports = router;
