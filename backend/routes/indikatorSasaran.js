const express = require("express");
const router = express.Router();
const indikatorSasaranController = require("../controllers/indikatorSasaranController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Boleh diakses semua level setelah login
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorSasaranController.findAll
);

router.get(
  "/:sasaran_id/next-kode",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorSasaranController.getNextKode
);

router.get(
  "/sasaran",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorSasaranController.findByTujuan
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorSasaranController.findOne
);

// Hanya level paling tinggi untuk mutasi data
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorSasaranController.create
);

// Bulk detail
router.post(
  "/wizard/:indikatorId/detail",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorSasaranController.bulkCreateDetail
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorSasaranController.update
);
router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorSasaranController.delete
);

module.exports = router;
