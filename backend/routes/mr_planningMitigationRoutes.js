// backend/routes/mr_planningMitigationRoutes.js

"use strict";

/**
 * MR Planning Mitigation Routes
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 13E
 *
 * Endpoint:
 * - GET  /api/mr-planning-mitigation/risk/:riskId
 * - GET  /api/mr-planning-mitigation/:id
 * - POST /api/mr-planning-mitigation/risk/:riskId
 * - PUT  /api/mr-planning-mitigation/:id/draft
 */

const express = require("express");
const controller = require("../controllers/mr_planningMitigationController");
const documentRoutes = require("./mr_planningMitigationDocumentRoutes");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

/**
 * Dokumen Rencana Tindak Pengendalian.
 *
 * Guard:
 * - Wajib dipasang sebelum route "/:id".
 * - Jika diletakkan setelah "/:id", path "/documents/:documentId"
 *   dapat tertangkap sebagai detail Rencana Tindak Pengendalian.
 */
router.use("/", documentRoutes);

// ========================= READ =========================
router.get(
  "/risk/:riskId",
  verifyToken,
  allowRoles(READ),
  controller.getMitigationsByRisk
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getMitigationDetail
);

// ========================= WRITE =========================

router.post(
  "/risk/:riskId/draft-preview",
  verifyToken,
  allowRoles(WRITE),
  controller.previewDraftFromRisk
);

router.post(
  "/risk/:riskId",
  verifyToken,
  allowRoles(WRITE),
  controller.createMitigationFromRisk
);

router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftMitigation
);

/**
 * PATCH /api/mr-planning-mitigation/:id/cancel
 *
 * Batalkan Draft Rencana Tindak Pengendalian.
 *
 * Guard:
 * - Hanya status_revisi = draft yang boleh dibatalkan.
 * - Tidak hard delete.
 * - Data disoft delete melalui is_active = false.
 */
router.patch(
  "/:id/cancel",
  verifyToken,
  allowRoles(WRITE),
  controller.cancelDraftMitigation
);

module.exports = router;