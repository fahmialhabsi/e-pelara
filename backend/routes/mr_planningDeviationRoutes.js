// backend/routes/mr_planningDeviationRoutes.js
"use strict";

/**
 * MR Planning Deviation Routes
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 15E Routes Foundation
 *
 * Route foundation untuk MR Planning Deviation e-Pelara.
 *
 * Prinsip:
 * - Semua endpoint wajib memakai verifyToken.
 * - Semua endpoint wajib memakai allowRoles.
 * - Controller hanya HTTP layer.
 * - Business logic tetap berada di mrPlanningDeviationService.
 * - Tidak membuat endpoint workflow submit/verify/approve pada STEP 15E.
 * - Tidak membuat endpoint dashboard/export/laporan pada fase foundation.
 * - Route spesifik wajib diletakkan sebelum route dinamis /:id.
 */

const express = require("express");

const controller = require("../controllers/mr_planningDeviationController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

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
 * Deviation foundation belum membuka approval workflow.
 */

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

/**
 * READ ROUTES
 * ---------------------------------------------------------------------------
 * GET /risk/:riskId
 * GET /monitoring/:monitoringId
 * GET /context/:contextId
 * GET /:id
 *
 * Penting:
 * - /risk/:riskId wajib sebelum /:id
 * - /monitoring/:monitoringId wajib sebelum /:id
 * - /context/:contextId wajib sebelum /:id
 */

// =====================================================
// PHASE 4 — STEP 15E DEVIATION READ ROUTES
// =====================================================

router.get(
  "/risk/:riskId",
  verifyToken,
  allowRoles(READ),
  controller.getDeviationsByRisk
);

router.get(
  "/monitoring/:monitoringId",
  verifyToken,
  allowRoles(READ),
  controller.getDeviationsByMonitoring
);

router.get(
  "/context/:contextId",
  verifyToken,
  allowRoles(READ),
  controller.getDeviationsByContext
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getDeviationDetail
);

/**
 * WRITE ROUTES
 * ---------------------------------------------------------------------------
 * POST /risk/:riskId
 * POST /monitoring/:monitoringId
 * PUT /:id/draft
 *
 * Catatan:
 * - Create deviation bisa berbasis risk.
 * - Create deviation bisa berbasis monitoring.
 * - Field teknis/calculated/audit diblokir di service.
 */

// =====================================================
// PHASE 4 — STEP 15E DEVIATION CREATE ROUTES
// =====================================================

router.post(
  "/risk/:riskId",
  verifyToken,
  allowRoles(WRITE),
  controller.createDeviationFromRisk
);

router.post(
  "/monitoring/:monitoringId",
  verifyToken,
  allowRoles(WRITE),
  controller.createDeviationFromMonitoring
);

// =====================================================
// PHASE 4 — STEP 15E DEVIATION DRAFT UPDATE ROUTE
// =====================================================

router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftDeviation
);

module.exports = router;