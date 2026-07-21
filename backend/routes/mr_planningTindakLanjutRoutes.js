// backend/routes/mr_planningTindakLanjutRoutes.js
"use strict";

/**
 * MR Planning Tindak Lanjut Routes — Modul TLHP
 * Mounted at /api/mr-planning-tindak-lanjut
 */

const express = require("express");

const controller = require("../controllers/mrPlanningTindakLanjutController");
const documentRoutes = require("./mr_planningTindakLanjutDocumentRoutes");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const HISTORY_READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];
const APPROVE = ["SUPER_ADMIN"];
const DELETE = ["SUPER_ADMIN"];

router.get("/rekomendasi/:rekomendasiId", verifyToken, allowRoles(READ), controller.findByRekomendasi);
router.post("/rekomendasi/:rekomendasiId", verifyToken, allowRoles(WRITE), controller.createFromRekomendasi);

router.get("/history/:history_id", verifyToken, allowRoles(HISTORY_READ), controller.getHistoryDetail);
router.patch("/history/:history_id/verifikasi", verifyToken, allowRoles(WRITE), controller.verifikasiHistory);
router.patch("/history/:history_id/approve", verifyToken, allowRoles(APPROVE), controller.approveHistory);
router.patch("/history/:history_id/tolak", verifyToken, allowRoles(APPROVE), controller.tolakHistory);

// Sub-router dokumen bukti dukung (POST/GET /:id/documents, /documents/:documentId, dst)
router.use("/", documentRoutes);

router.get("/:id/history", verifyToken, allowRoles(HISTORY_READ), controller.getHistory);
router.get("/:id", verifyToken, allowRoles(READ), controller.findById);
router.put("/:id", verifyToken, allowRoles(WRITE), controller.update);
router.post("/:id/submit", verifyToken, allowRoles(WRITE), controller.submit);

router.delete("/:id", verifyToken, allowRoles(DELETE), controller.destroy);

module.exports = router;
