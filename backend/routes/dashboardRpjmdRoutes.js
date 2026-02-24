const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardRpjmdController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

router.get(
  "/perencanaan",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardController.getIndikatorPerencanaan
);
router.get(
  "/pelaksanaan",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardController.getIndikatorPelaksanaan
);
router.get(
  "/evaluasi",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardController.getIndikatorEvaluasi
);

module.exports = router;
