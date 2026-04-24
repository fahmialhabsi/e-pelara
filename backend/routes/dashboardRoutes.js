// routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const kpiController = require("../controllers/kpiController");
const trendController = require("../controllers/trendController");
const dashboardRenjaRkpdController = require("../controllers/dashboardRenjaRkpdController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

// Endpoint: GET /api/dashboard-stats (KPI cards real data)
router.get(
  "/dashboard-stats",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardController.getDashboardStats
);

// Endpoint: GET /api/dashboard-anggaran-realisasi
router.get(
  "/dashboard-anggaran-realisasi",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardController.getAnggaranVsRealisasi
);

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

router.get(
  "/dashboard/renja-summary",
  verifyToken,
  allowRoles(["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"]),
  dashboardRenjaRkpdController.getRenjaRkpdSummary
);

module.exports = router;
