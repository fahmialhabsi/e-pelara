// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const kpiController = require("../controllers/kpiController");
const trendController = require("../controllers/trendController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Endpoint: GET /api/dashboard-monitoring
router.get(
  "/dashboard-monitoring",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardController.getDashboardMonitoring
);
router.get(
  "/kpi",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  kpiController.getKPI
);
router.get(
  "/trend",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  trendController.getTrend
);

module.exports = router;
