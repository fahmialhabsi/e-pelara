"use strict";

/**
 * MR Planning Context Routes
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R13A
 * MR Planning Risk Source Selector & Context Item Auto Mapping Foundation
 *
 * Fokus:
 * - Tetap menjaga route read context yang sudah hijau.
 * - Menambah route list context items.
 * - Menambah route generate context items dari Renstra.
 * - Route spesifik wajib diletakkan sebelum /:id.
 */

const express = require("express");
const controller = require("../controllers/mr_planningContextController");
const verifyToken = require("../middlewares/verifyToken");
const allowRoles = require("../middlewares/allowRoles");

const router = express.Router();

const READ = ["SUPER_ADMIN", "ADMINISTRATOR", "PENGAWAS", "PELAKSANA"];
const WRITE = ["SUPER_ADMIN", "ADMINISTRATOR"];

/**
 * READ ROUTES
 * ---------------------------------------------------------------------------
 */

router.get(
  "/",
  verifyToken,
  allowRoles(READ),
  controller.getContexts
);

/**
 * PHASE REPORT 2026 — STEP R17C-3B
 * Membuat atau mengambil context laporan periodik resmi.
 *
 * Contoh:
 * POST /api/mr-planning-context/report-period
 *
 * Body:
 * {
 *   "tahun": 2026,
 *   "periode_type": "tahunan",
 *   "opd_id": 348,
 *   "nama_opd": "Dinas Pangan"
 * }
 *
 * Route ini wajib diletakkan sebelum /:id agar tidak tertangkap sebagai dynamic id.
 */
router.post(
  "/report-period",
  verifyToken,
  allowRoles(WRITE),
  controller.createReportPeriodContext
);

/**
 * PHASE REPORT 2026 — STEP R16H-0H
 * Submit context/report untuk verifikasi.
 *
 * Contoh:
 * POST /api/mr-planning-context/2/submit
 */
router.post(
  "/:id/submit",
  verifyToken,
  allowRoles(WRITE),
  controller.submitContext
);

/**
 * PHASE REPORT 2026 — STEP R16H-0H
 * Verifikasi context/report sebelum approval final.
 *
 * Contoh:
 * POST /api/mr-planning-context/2/verify
 */
router.post(
  "/:id/verify",
  verifyToken,
  allowRoles(WRITE),
  controller.verifyContext
);

/**
 * PHASE REPORT 2026 — STEP R16H-0H
 * Approve context/report agar report quality gate dapat menjadi ready_for_pdf.
 *
 * Contoh:
 * POST /api/mr-planning-context/2/approve
 */
router.post(
  "/:id/approve",
  verifyToken,
  allowRoles(WRITE),
  controller.approveContext
);

/**
 * PHASE REPORT 2026 — STEP R16H-0H
 * Tolak context/report jika hasil review belum dapat disetujui.
 *
 * Contoh:
 * POST /api/mr-planning-context/2/reject
 */
router.post(
  "/:id/reject",
  verifyToken,
  allowRoles(WRITE),
  controller.rejectContext
);

/**
 * STEP R13A
 * List sumber perencanaan/context item untuk dropdown frontend.
 *
 * Contoh:
 * GET /api/mr-planning-context/2/items
 */
router.get(
  "/:contextId/items",
  verifyToken,
  allowRoles(READ),
  controller.getContextItems
);

/**
 * STEP R13A
 * Generate context item dari sumber Renstra existing.
 *
 * Contoh:
 * POST /api/mr-planning-context/2/generate-items
 */
router.post(
  "/:contextId/generate-items",
  verifyToken,
  allowRoles(WRITE),
  controller.generateContextItems
);

/**
 * Detail context.
 * Route /:id wajib diletakkan setelah route spesifik seperti /:contextId/items.
 */
router.get(
  "/:id",
  verifyToken,
  allowRoles(READ),
  controller.getContextDetail
);

module.exports = router;