// backend/routes/mr_planningReportRoutes.js

const express = require("express");

const controller = require("../controllers/mr_planningReportController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const HISTORY = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];

router.get(
  "/context/:contextId/summary",
  verifyToken,
  allowRoles(READ),
  controller.getSummary
);

router.get(
  "/context/:contextId/lampiran",
  verifyToken,
  allowRoles(READ),
  controller.getLampiran
);

router.get(
  "/context/:contextId/full",
  verifyToken,
  allowRoles(READ),
  controller.getFullReport
);

router.get(
  "/context/:contextId/integrity-scan",
  verifyToken,
  allowRoles(READ),
  controller.getIntegrityScan
);

router.post(
  "/context/:contextId/repair-draft-from-findings",
  verifyToken,
  allowRoles(READ),
  controller.repairDraftFromFindings
);

router.get(
  "/context/:contextId/export-history",
  verifyToken,
  allowRoles(HISTORY),
  controller.getExportHistory
);

router.get(
  "/context/:contextId/export-excel",
  verifyToken,
  allowRoles(READ),
  controller.exportExcel
);

router.get(
  "/context/:contextId/export-excel-inspektorat",
  verifyToken,
  allowRoles(READ),
  controller.exportExcelInspektorat
);

router.get(
  "/context/:contextId/export-word",
  verifyToken,
  allowRoles(READ),
  controller.exportWord
);

router.get(
  "/context/:contextId/export-pdf",
  verifyToken,
  allowRoles(READ),
  controller.exportPdf
);

router.post(
  "/context/:contextId/quick-repair",
  verifyToken,
  allowRoles(READ),
  controller.quickRepair
);

module.exports = router;
