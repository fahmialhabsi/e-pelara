"use strict";

const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");
const requireFeature = require("../middlewares/requireFeature");
const ctrl = require("../controllers/rpjmdMonitoringController");

const roles = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.get(
  "/opd/:periodeId",
  verifyToken,
  allowRoles(roles),
  requireFeature("monitoring_opd"),
  ctrl.getMonitoringByOpd,
);
router.get(
  "/heatmap/:periodeId",
  verifyToken,
  allowRoles(roles),
  requireFeature("heatmap"),
  ctrl.getMonitoringHeatmap,
);
router.get(
  "/alerts/:periodeId",
  verifyToken,
  allowRoles(roles),
  requireFeature("early_warning"),
  ctrl.getMonitoringAlerts,
);

router.get(
  "/indikator/:periodeId/detail/:indikatorSasaranId",
  verifyToken,
  allowRoles(roles),
  ctrl.getIndikatorDrilldown,
);
router.get("/indikator/:periodeId", verifyToken, allowRoles(roles), ctrl.getIndikatorMonitoring);
router.get("/indikator", verifyToken, allowRoles(roles), ctrl.getIndikatorMonitoring);

router.get(
  "/export/:periodeId",
  verifyToken,
  allowRoles(roles),
  requireFeature("export"),
  ctrl.exportMonitoring,
);
router.get(
  "/export",
  verifyToken,
  allowRoles(roles),
  requireFeature("export"),
  ctrl.exportMonitoring,
);

module.exports = router;
