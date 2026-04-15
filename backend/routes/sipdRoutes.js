/**
 * sipdRoutes.js — SIPD Internal Module routes
 * Endpoint /api/sipd/*
 */
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const allowRoles  = require("../middlewares/allowRoles");
const sipdController = require("../controllers/sipdController");

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMINISTRATOR"];
const ALL_ROLES   = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];

// Semua endpoint SIPD butuh login
router.use(verifyToken);

// === Referensi Nomenklatur (read — semua role) ===
router.get("/ref/program",       allowRoles(ALL_ROLES), sipdController.getProgram);
router.get("/ref/kegiatan",      allowRoles(ALL_ROLES), sipdController.getKegiatan);
router.get("/ref/subkegiatan",   allowRoles(ALL_ROLES), sipdController.getSubKegiatan);
router.get("/ref/kode-rekening", allowRoles(ALL_ROLES), sipdController.getKodeRekening);
router.get("/ref/neraca",        allowRoles(ALL_ROLES), sipdController.getKodeNeraca);

// === Anggaran & Realisasi (read — semua role) ===
router.get("/realisasi",  allowRoles(ALL_ROLES), sipdController.getRealisasi);
router.get("/summary",    allowRoles(ALL_ROLES), sipdController.getSummary);
router.get("/sync",       allowRoles(ADMIN_ROLES), sipdController.syncMock);

// === Write endpoints (admin only) ===
router.post("/realisasi",      allowRoles(ADMIN_ROLES), sipdController.createRealisasi);
router.put("/realisasi/:id",   allowRoles(ADMIN_ROLES), sipdController.updateRealisasi);
router.delete("/realisasi/:id",allowRoles(ADMIN_ROLES), sipdController.deleteRealisasi);

module.exports = router;
