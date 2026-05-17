// backend/routes/mr_planningMonitoringRoutes.js
"use strict";

/**
 * MR Planning Monitoring Routes
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 14F Routes Foundation
 *
 * Route foundation untuk MR Planning Monitoring e-Pelara.
 *
 * Prinsip:
 * - Semua endpoint wajib memakai verifyToken.
 * - Semua endpoint wajib memakai allowRoles.
 * - Controller hanya HTTP layer.
 * - Business logic tetap berada di mrPlanningMonitoringService.
 * - Tidak membuat endpoint workflow submit/verify/approve pada STEP 14F.
 * - Tidak membuat endpoint dashboard/export/laporan pada fase foundation.
 * - Route spesifik wajib diletakkan sebelum route dinamis /:id.
 */

const express = require("express");

const controller = require("../controllers/mr_planningMonitoringController");
const evidenceController = require("../controllers/mr_planningMonitoringEvidenceController");

const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const {
  uploadDokumen,
  handleUploadError,
} = require("../middlewares/uploadDokumen");

const router = express.Router();

/**
 * Role Group
 * ---------------------------------------------------------------------------
 * Mengikuti gold standard routes Renstra/MR:
 *
 * READ:
 * - SUPER_ADMIN
 * - ADMINISTRATOR
 * - PENGAWAS
 * - PELAKSANA
 *
 * WRITE:
 * - SUPER_ADMIN
 * - ADMINISTRATOR
 *
 * Catatan:
 * Monitoring foundation belum membuka approval workflow.
 */

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

/**
 * READ ROUTES
 * ---------------------------------------------------------------------------
 * GET /risk/:riskId
 * GET /mitigation/:mitigationId
 * GET /:id
 *
 * Penting:
 * - /risk/:riskId wajib sebelum /:id
 * - /mitigation/:mitigationId wajib sebelum /:id
 */

// =====================================================
// PHASE 4 — STEP 14F MONITORING READ ROUTES
// =====================================================

router.get(
  "/risk/:riskId",
  verifyToken,
  allowRoles(READ),
  controller.getMonitoringsByRisk
);

router.get(
  "/mitigation/:mitigationId",
  verifyToken,
  allowRoles(READ),
  controller.getMonitoringsByMitigation
);

// =====================================================
// PHASE REPORT 2026 — STEP R17B-4C-4I
// MONITORING/REALISASI — BUKTI REALISASI AKTUAL
// =====================================================
// Guard:
// - Bukti Realisasi berbeda dari Dokumen RTP.
// - Bukti Realisasi melekat ke Monitoring/Realisasi.
// - Route evidence wajib sebelum route dinamis /:id.
// - Tidak ada hard delete; cancel memakai soft cancel.

router.get(
  "/evidence/:evidenceId",
  verifyToken,
  allowRoles(READ),
  evidenceController.getEvidenceDetail
);

router.get(
  "/evidence/:evidenceId/download",
  verifyToken,
  allowRoles(READ),
  evidenceController.downloadEvidence
);

router.get(
  "/:id/evidence",
  verifyToken,
  allowRoles(READ),
  evidenceController.getEvidencesByMonitoring
);

router.post(
  "/:id/evidence",
  verifyToken,
  allowRoles(WRITE),
  uploadDokumen.single("file"),
  handleUploadError,
  evidenceController.uploadEvidence
);

router.patch(
  "/evidence/:evidenceId/cancel",
  verifyToken,
  allowRoles(WRITE),
  evidenceController.cancelEvidence
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getMonitoringDetail
);

/**
 * WRITE ROUTES
 * ---------------------------------------------------------------------------
 * POST /risk/:riskId
 * PUT /:id/draft
 *
 * Catatan:
 * - Create monitoring wajib berbasis risk route.
 * - Update hanya untuk draft.
 * - Field teknis/calculated/workflow/audit diblokir di service.
 */

// =====================================================
// PHASE REPORT 2026 — STEP R17B-4C-4I
// MONITORING DRAFT PREVIEW FROM RISK + RTP
// =====================================================

router.post(
  "/risk/:riskId/draft-preview",
  verifyToken,
  allowRoles(WRITE),
  controller.buildDraftPreviewFromRisk
);

// =====================================================
// PHASE 4 — STEP 14F MONITORING CREATE ROUTE
// =====================================================

router.post(
  "/risk/:riskId",
  verifyToken,
  allowRoles(WRITE),
  controller.createMonitoringFromRisk
);

// =====================================================
// PHASE 4 — STEP 14F MONITORING DRAFT UPDATE ROUTE
// =====================================================

router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftMonitoring
);

module.exports = router;