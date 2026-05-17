"use strict";

/**
 * MR Planning Risk Analysis Routes
 *
 * Guard:
 * - Routes hanya mengatur endpoint, auth, dan role access.
 * - Business logic tetap di service.
 * - Controller aktual:
 *   backend/controllers/mrPlanningRiskAnalysisController.js
 */

const express = require("express");
const controller = require("../controllers/mrPlanningRiskAnalysisController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

// =====================================================
// READ
// =====================================================

/**
 * GET /api/mr-planning-risk-analysis/risk/:riskId
 *
 * Ambil seluruh analysis aktif berdasarkan MR Planning Risk.
 */
router.get(
  "/risk/:riskId",
  verifyToken,
  allowRoles(READ),
  controller.getAnalysesByRisk
);

/**
 * GET /api/mr-planning-risk-analysis/:id
 *
 * Ambil detail risk analysis.
 *
 * Catatan:
 * Route ini diletakkan setelah /risk/:riskId agar tidak bentrok.
 */
router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getAnalysisDetail
);

// =====================================================
// WRITE
// =====================================================

/**
 * POST /api/mr-planning-risk-analysis/risk/:riskId
 *
 * Buat MR Planning Risk Analysis dari MR Planning Risk.
 */
router.post(
  "/risk/:riskId",
  verifyToken,
  allowRoles(WRITE),
  controller.createAnalysisFromRisk
);

/**
 * PUT /api/mr-planning-risk-analysis/:id/draft
 *
 * Update draft MR Planning Risk Analysis.
 */
router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftAnalysis
);

module.exports = router;