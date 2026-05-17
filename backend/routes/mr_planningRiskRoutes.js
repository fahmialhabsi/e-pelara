// backend/routes/mr_planningRiskRoutes.js
"use strict";

/**
 * MR Planning Risk Routes
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 5 Routes Foundation
 *
 * Route foundation untuk MR Planning Risk Register e-Pelara.
 *
 * Prinsip:
 * - Semua endpoint wajib memakai verifyToken.
 * - Semua endpoint wajib memakai allowRoles.
 * - Approval wajib berbasis history_id.
 * - Revisi wajib memakai POST /:id/revisi.
 * - Rebuild wajib memakai POST /:id/rebuild-active-from-history.
 * - Route spesifik wajib diletakkan sebelum route dinamis /:id jika berpotensi bentrok.
 * - Tidak membuat endpoint dashboard/export/laporan pada fase foundation.
 */

const express = require("express");

const controller = require("../controllers/mr_planningRiskController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

/**
 * Role Group
 * ---------------------------------------------------------------------------
 * Mengikuti gold standard routes Renstra:
 *
 * READ:
 * - SUPER_ADMIN
 * - ADMINISTRATOR
 * - PENGAWAS
 * - PELAKSANA
 *
 * HISTORY_READ:
 * - SUPER_ADMIN
 * - ADMINISTRATOR
 * - PENGAWAS
 *
 * WRITE:
 * - SUPER_ADMIN
 * - ADMINISTRATOR
 *
 * DELETE / APPROVE / REBUILD:
 * - SUPER_ADMIN
 */

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const HISTORY_READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];
const APPROVE = ["SUPER_ADMIN"];
const DELETE = ["SUPER_ADMIN"];
const REBUILD = ["SUPER_ADMIN"];

/**
 * READ ROUTES
 * ---------------------------------------------------------------------------
 * GET /
 * GET /:id
 */

router.get(
  "/",
  verifyToken,
  allowRoles(READ),
  controller.findAll
);

// =====================================================
// PHASE 4 — STEP 10A CONTEXT-BASED READ ROUTES
// =====================================================

router.get(
  "/context/:contextId",
  verifyToken,
  allowRoles(READ),
  controller.getRisksByContext
);

/**
 * HISTORY ROUTES
 * ---------------------------------------------------------------------------
 * Penting:
 * Route /history/:history_id harus diletakkan sebelum /:id
 * agar tidak tertangkap sebagai dynamic id route.
 */

router.get(
  "/history/:history_id",
  verifyToken,
  allowRoles(HISTORY_READ),
  controller.getHistoryDetail
);

router.patch(
  "/history/:history_id/verifikasi",
  verifyToken,
  allowRoles(WRITE),
  controller.verifikasiHistory
);

router.patch(
  "/history/:history_id/approve",
  verifyToken,
  allowRoles(APPROVE),
  controller.approveHistory
);

router.patch(
  "/history/:history_id/tolak",
  verifyToken,
  allowRoles(APPROVE),
  controller.tolakHistory
);

/**
 * DETAIL & ACTIVE HISTORY ROUTES
 * ---------------------------------------------------------------------------
 * GET /:id/history
 * GET /:id
 *
 * Catatan:
 * /:id/history harus diletakkan sebelum /:id.
 */

router.get(
  "/:id/history",
  verifyToken,
  allowRoles(HISTORY_READ),
  controller.getHistory
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.findById
);

/**
 * WRITE ROUTES
 * ---------------------------------------------------------------------------
 * POST /
 * PUT /:id
 * POST /:id/revisi
 *
 * Catatan:
 * Data approved tidak boleh diubah langsung via PUT /:id.
 * Revisi data approved wajib memakai POST /:id/revisi.
 */

// =====================================================
// PHASE 4 — STEP 10A CONTEXT-BASED CREATE ROUTE
// =====================================================

router.post(
  "/context/:contextId",
  verifyToken,
  allowRoles(WRITE),
  controller.createRiskFromContext
);

// =====================================================
// PHASE REPORT 2026 — STEP R17A-2B PROPOSAL INTAKE ROUTE
// =====================================================

router.post(
  "/proposal-intake",
  verifyToken,
  allowRoles(WRITE),
  controller.createProposalIntake
);

router.post(
  "/",
  verifyToken,
  allowRoles(WRITE),
  controller.create
);

router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftRiskFromContextService
);

router.put(
  "/:id",
  verifyToken,
  allowRoles(WRITE),
  controller.update
);

// =====================================================
// PHASE 4 — STEP 10A CONTEXT-BASED WORKFLOW ROUTES
// =====================================================

router.post(
  "/:id/submit",
  verifyToken,
  allowRoles(WRITE),
  controller.submitRiskForVerification
);

router.post(
  "/:id/verify",
  verifyToken,
  allowRoles(WRITE),
  controller.verifyRiskFromContextService
);

router.post(
  "/:id/approve",
  verifyToken,
  allowRoles(APPROVE),
  controller.approveRiskFromContextService
);

router.post(
  "/:id/reject",
  verifyToken,
  allowRoles(APPROVE),
  controller.rejectRiskFromContextService
);

// =====================================================
// PHASE 4 — STEP 10D CONTEXT-BASED REVISION ROUTE
// =====================================================

router.post(
  "/:id/revision-from-approved",
  verifyToken,
  allowRoles(WRITE),
  controller.createRevisionFromApprovedRiskContextService
);

router.post(
  "/:id/revisi",
  verifyToken,
  allowRoles(WRITE),
  controller.createRevisionFromApprovedRiskContextService
);

router.post(
  "/repair-placeholder-sources",
  verifyToken,
  allowRoles(WRITE),
  controller.repairPlaceholderRiskSources
);

/**
 * REBUILD ROUTE
 * ---------------------------------------------------------------------------
 * POST /:id/rebuild-active-from-history
 *
 * Rebuild hanya boleh dari history approved terakhir,
 * bukan dari payload frontend.
 */

router.post(
  "/:id/rebuild-active-from-history",
  verifyToken,
  allowRoles(REBUILD),
  controller.rebuildActiveFromHistory
);

/**
 * DELETE ROUTE
 * ---------------------------------------------------------------------------
 * DELETE /:id
 *
 * Delete dibatasi SUPER_ADMIN.
 * Service tetap akan memblokir data approved.
 */

router.delete(
  "/:id",
  verifyToken,
  allowRoles(DELETE),
  controller.delete
);

module.exports = router;
