// routes/renstra_opd.js
const express = require("express");
const router = express.Router();
const renstraOpdController = require("../controllers/renstra_opdController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Buat data baru
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  renstraOpdController.create
);

// Ambil semua data
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  renstraOpdController.findAll
);

// Ambil renstra aktif
router.get(
  "/aktif",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  renstraOpdController.getAktif
);

// Ambil detail per ID
router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  renstraOpdController.findOne
);

// Update data
router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  renstraOpdController.update
);

// Set aktif
router.put(
  "/:id/set-aktif",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  renstraOpdController.setAktif
);

// Hapus data
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  renstraOpdController.delete
);

module.exports = router;
