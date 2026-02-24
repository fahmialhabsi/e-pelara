// routes/clonePeriodeRoutes.js
const express = require("express");
const router = express.Router();
const clonePeriodeController = require("../controllers/clonePeriodeController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// POST /api/clone-periode
router.post(
  "/",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  clonePeriodeController.clone
);

// registrasi router
router.get(
  "/cloned-tujuan",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  clonePeriodeController.getClonedTujuan
);

router.get(
  "/cloned-sasaran",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  clonePeriodeController.getClonedSasaran
);

router.get(
  "/cloned-:jenis",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  clonePeriodeController.getCloned
);

module.exports = router;
