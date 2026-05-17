"use strict";

/**
 * MR Planning Root Cause Routes
 *
 * Guard:
 * - Routes hanya mengatur endpoint, auth, dan role access.
 * - Business logic tetap di service.
 * - Controller aktual:
 *   backend/controllers/mr_planningRootCauseController.js
 */

const express = require("express");
const controller = require("../controllers/mr_planningRootCauseController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

// =====================================================
// READ
// =====================================================

/**
 * GET /api/mr-planning-root-cause/risk/:riskId
 *
 * Ambil seluruh root cause aktif berdasarkan MR Planning Risk.
 */
router.get(
  "/risk/:riskId",
  verifyToken,
  allowRoles(READ),
  controller.getRootCausesByRisk
);

/**
 * GET /api/mr-planning-root-cause/:id
 *
 * Ambil detail root cause.
 *
 * Catatan:
 * Route ini diletakkan setelah /risk/:riskId agar tidak bentrok.
 */
router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getRootCauseDetail
);

// =====================================================
// WRITE
// =====================================================

/**
 * POST /api/mr-planning-root-cause/risk/:riskId
 *
 * Buat MR Planning Root Cause dari MR Planning Risk.
 */
router.post(
  "/risk/:riskId",
  verifyToken,
  allowRoles(WRITE),
  controller.createRootCauseFromRisk
);

/**
 * PUT /api/mr-planning-root-cause/:id/draft
 *
 * Update draft MR Planning Root Cause.
 */
router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftRootCause
);

module.exports = router;