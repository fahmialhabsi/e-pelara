// backend/routes/mr_planningTlhpReportRoutes.js
"use strict";

/**
 * MR Planning TLHP Report Routes — "Laporan Pemantauan TLHP"
 * Mounted at /api/mr-tlhp-report
 */

const express = require("express");

const controller = require("../controllers/mr_planningTlhpReportController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const HISTORY = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];

router.get("/summary", verifyToken, allowRoles(READ), controller.getSummary);
router.get("/full", verifyToken, allowRoles(READ), controller.getFullReport);
router.get("/export-history", verifyToken, allowRoles(HISTORY), controller.getExportHistory);
router.get("/export-word", verifyToken, allowRoles(READ), controller.exportWord);
router.get("/export-pdf", verifyToken, allowRoles(READ), controller.exportPdf);

module.exports = router;
