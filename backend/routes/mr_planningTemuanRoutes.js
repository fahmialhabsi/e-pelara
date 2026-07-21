// backend/routes/mr_planningTemuanRoutes.js
"use strict";

/**
 * MR Planning Temuan Routes — Modul TLHP
 * Mounted at /api/mr-planning-temuan
 *
 * Catatan: route history/nested (mengikuti mr_planningRiskRoutes.js) wajib
 * diletakkan sebelum /:id agar tidak tertangkap sebagai dynamic id route.
 */

const express = require("express");

const controller = require("../controllers/mrPlanningTemuanController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const HISTORY_READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];
const APPROVE = ["SUPER_ADMIN"];
const DELETE = ["SUPER_ADMIN"];

router.get("/lhp/:lhpId", verifyToken, allowRoles(READ), controller.findByLhp);
router.post("/lhp/:lhpId", verifyToken, allowRoles(WRITE), controller.createFromLhp);

router.get("/history/:history_id", verifyToken, allowRoles(HISTORY_READ), controller.getHistoryDetail);
router.patch("/history/:history_id/verifikasi", verifyToken, allowRoles(WRITE), controller.verifikasiHistory);
router.patch("/history/:history_id/approve", verifyToken, allowRoles(APPROVE), controller.approveHistory);
router.patch("/history/:history_id/tolak", verifyToken, allowRoles(APPROVE), controller.tolakHistory);

router.put("/rekomendasi/:rekomendasiId", verifyToken, allowRoles(WRITE), controller.updateRekomendasi);
router.patch("/rekomendasi/:rekomendasiId/cancel", verifyToken, allowRoles(WRITE), controller.cancelRekomendasi);

router.get("/:id/history", verifyToken, allowRoles(HISTORY_READ), controller.getHistory);
router.get("/:id/rekomendasi", verifyToken, allowRoles(READ), controller.getRekomendasiList);
router.post("/:id/rekomendasi", verifyToken, allowRoles(WRITE), controller.createRekomendasi);

router.get("/:id", verifyToken, allowRoles(READ), controller.findById);
router.put("/:id", verifyToken, allowRoles(WRITE), controller.update);
router.post("/:id/submit", verifyToken, allowRoles(WRITE), controller.submit);
router.post("/:id/revisi", verifyToken, allowRoles(WRITE), controller.revisi);
router.post("/:id/escalate-to-risk", verifyToken, allowRoles(WRITE), controller.escalateToRisk);

router.delete("/:id", verifyToken, allowRoles(DELETE), controller.destroy);

module.exports = router;
