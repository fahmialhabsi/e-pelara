// backend/routes/dashboardAgregatPaguRoutes.js
const express = require("express");
const router = express.Router();

const dashboardAgregatPaguController = require("../controllers/dashboardAgregatPaguController");
const paguCachedSyncController = require("../controllers/paguCachedSyncController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");


router.get(
  "/pagu",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardAgregatPaguController.getDashboardPagu
);

router.post(
  "/pagu-cached/sync",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR"]),
  paguCachedSyncController.syncAll
);

module.exports = router;