const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const divisionController = require("../controllers/divisionController");

// Sprint 3 — S3-05: allowRoles() di seluruh file ini sebelumnya dipanggil
// dengan argumen string terpisah (mis. allowRoles("SUPER_ADMIN")), padahal
// allowRoles() mensyaratkan satu argumen array (lihat Array.isArray check
// di middlewares/allowRoles.js). Ini membuat 5 dari 6 route di bawah gagal
// dengan 500 MR_ALLOWED_ROLES_CONFIG_INVALID untuk semua caller. Perbaikan
// ini murni mengonversi ke bentuk array sesuai role yang sudah dimaksud di
// masing-masing route — tidak ada role yang diperluas/dipersempit.
router.post(
  "/divisions",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  divisionController.createDivision
);
router.get(
  "/divisions",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  divisionController.getDivisions
);
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  divisionController.getDivisions
);
router.get(
  "/divisions/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  divisionController.getDivisionById
);
router.put(
  "/divisions/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  divisionController.updateDivision
);
router.delete(
  "/divisions/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  divisionController.deleteDivision
);

module.exports = router;
