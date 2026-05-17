// backend/routes/mr_planningWarningRoutes.js
"use strict";

/**
 * MR Planning Warning Routes
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 16E Routes Foundation
 *
 * Route foundation untuk MR Planning Warning e-Pelara.
 *
 * Prinsip:
 * - Semua endpoint wajib memakai verifyToken.
 * - Semua endpoint wajib memakai allowRoles.
 * - Route spesifik wajib diletakkan sebelum route dinamis /:id.
 * - Warning read/resolve dipisahkan dari update draft.
 * - Tidak membuat endpoint dashboard/export/laporan pada fase foundation.
 */

const express = require("express");

const controller = require("../controllers/mr_planningWarningController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

/**
 * Role Group
 * ---------------------------------------------------------------------------
 * Mengikuti gold standard routes MR/Renstra:
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
 * ACTION:
 * - SUPER_ADMIN
 * - ADMINISTRATOR
 * - PENGAWAS
 *
 * DELETE:
 * - Tidak dibuat pada foundation warning.
 */

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];
const ACTION = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS"];

/**
 * READ ROUTES
 * ---------------------------------------------------------------------------
 * Route spesifik wajib sebelum /:id.
 */

router.get(
  "/risk/:riskId",
  verifyToken,
  allowRoles(READ),
  controller.getWarningsByRisk
);

router.get(
  "/context/:contextId",
  verifyToken,
  allowRoles(READ),
  controller.getWarningsByContext
);

router.get(
  "/monitoring/:monitoringId",
  verifyToken,
  allowRoles(READ),
  controller.getWarningsByMonitoring
);

router.get(
  "/mitigation/:mitigationId",
  verifyToken,
  allowRoles(READ),
  controller.getWarningsByMitigation
);

router.get(
  "/source/:sourceTable/:sourceId",
  verifyToken,
  allowRoles(READ),
  controller.getWarningsBySource
);

router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getWarningDetail
);

/**
 * CREATE ROUTES
 * ---------------------------------------------------------------------------
 * Warning bisa dibuat dari:
 * - risk
 * - monitoring
 * - mitigation
 * - source fleksibel dengan risk sebagai anchor
 */

router.post(
  "/risk/:riskId",
  verifyToken,
  allowRoles(WRITE),
  controller.createWarningFromRisk
);

router.post(
  "/monitoring/:monitoringId",
  verifyToken,
  allowRoles(WRITE),
  controller.createWarningFromMonitoring
);

router.post(
  "/mitigation/:mitigationId",
  verifyToken,
  allowRoles(WRITE),
  controller.createWarningFromMitigation
);

router.post(
  "/risk/:riskId/source/:sourceTable/:sourceId",
  verifyToken,
  allowRoles(WRITE),
  controller.createWarningFromSource
);

/**
 * UPDATE / ACTION ROUTES
 * ---------------------------------------------------------------------------
 * PUT /:id/draft hanya untuk update field bisnis warning.
 * PATCH /:id/read hanya untuk read status.
 * PATCH /:id/resolve hanya untuk resolve status.
 */

router.put(
  "/:id/draft",
  verifyToken,
  allowRoles(WRITE),
  controller.updateDraftWarning
);

router.patch(
  "/:id/read",
  verifyToken,
  allowRoles(ACTION),
  controller.markWarningAsRead
);

router.patch(
  "/:id/resolve",
  verifyToken,
  allowRoles(ACTION),
  controller.resolveWarning
);

router.patch(
  "/:id/reopen",
  verifyToken,
  allowRoles(ACTION),
  controller.reopenWarning
);


module.exports = router;