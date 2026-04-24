const express = require("express");
const router = express.Router();
const indikatorStrategiController = require("../controllers/indikatorStrategiController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Boleh diakses semua level setelah login
router.get(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorStrategiController.findAll
);

router.get(
  "/by-strategi",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorStrategiController.findByStrategi
);

router.get(
  "/:strategi_id/next-kode",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorStrategiController.getNextKode
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  indikatorStrategiController.findOne
);

// Hanya level paling tinggi untuk mutasi data
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorStrategiController.create
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorStrategiController.update
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  indikatorStrategiController.delete
);

module.exports = router;
