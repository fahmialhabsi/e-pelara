/**
 * lkdRoutes.js — Dashboard LKD
 * Mounted at /api/lkd
 */
const express = require("express");
const router  = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles  = require("../middlewares/allowRoles");
const ctrl = require("../controllers/dashboardLkdController");

const ALL   = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

router.use(verifyToken);

router.get("/summary",            allowRoles(ALL), ctrl.getSummary);
router.get("/per-program",        allowRoles(ALL), ctrl.getPerProgram);
router.get("/top-kegiatan",       allowRoles(ALL), ctrl.getTopKegiatan);
router.get("/indikator-progress", allowRoles(ALL), ctrl.getIndikatorProgress);
router.get("/tahun-list",         allowRoles(ALL), ctrl.getTahunList);
router.get("/program-list",       allowRoles(ALL), ctrl.getProgramList);
router.get("/export/csv",         allowRoles(ALL), ctrl.exportCsv);
router.get("/export/excel",       allowRoles(ALL), ctrl.exportExcel);

module.exports = router;
