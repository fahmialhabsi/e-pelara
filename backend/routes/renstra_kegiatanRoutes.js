const express = require("express");
const controller = require("../controllers/renstra_kegiatanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const router = express.Router();

router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  controller.create
);

router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.findAll
);

router.get(
  "/kode-nama",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.getKodeNamaKegiatan
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.findOne
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  controller.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN"]),
  controller.delete
);

// Ambil kegiatan berdasarkan programId
router.get(
  "/by-program/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.findByProgramKode
);

// Ambil kode & nama kegiatan sederhana (dropdown frontend)
router.get(
  "/kode-nama",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  controller.getKodeNamaKegiatan
);

module.exports = router;
