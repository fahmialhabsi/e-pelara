"use strict";

/**
 * MR Planning Monitoring Evidence Controller
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R17B-4C-4I
 * Monitoring/Realisasi — Bukti Realisasi Aktual Rencana Tindak Pengendalian
 *
 * Guard:
 * - Controller hanya HTTP layer.
 * - Business logic tetap di mrPlanningMonitoringEvidenceService.
 * - Bukti realisasi aktual berbeda dari Dokumen RTP.
 * - Bukti realisasi aktual berada di modul Monitoring/Realisasi.
 * - Tidak ada hard delete.
 * - Upload, list, detail, view/download, dan cancel diserahkan ke service.
 */

const evidenceService = require("../services/mr/mrPlanningMonitoringEvidenceService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const {
  createGovernanceError,
} = require("../helpers/mr/mrApprovalHelper");

/**
 * Actor Helper
 * ---------------------------------------------------------------------------
 * User actor wajib berasal dari middleware verifyToken.
 */

const getUserId = (req) => {
  const userId =
    req.user?.id ||
    req.user?.user_id ||
    req.user?.userId ||
    req.auth?.id ||
    req.auth?.user_id ||
    null;

  if (!userId) {
    throw createGovernanceError({
      message: "User actor tidak ditemukan. Pastikan endpoint memakai verifyToken.",
      status: 401,
      blocked: true,
      auditMode: true,
      code: "MR_USER_ACTOR_NOT_FOUND",
    });
  }

  return userId;
};

/**
 * CREATE: Upload Bukti Realisasi
 * ---------------------------------------------------------------------------
 * POST /api/mr-planning-monitoring/:id/evidence
 */

const uploadEvidence = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await evidenceService.uploadEvidence({
      monitoringId: req.params.id,
      body: req.body,
      file: req.file,
      userId,
    });

    return createdResponse({
      res,
      message: result?.message || "Bukti Realisasi berhasil diunggah.",
      data: result?.data || result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: List Bukti Realisasi by Monitoring
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-monitoring/:id/evidence
 */

const getEvidencesByMonitoring = async (req, res) => {
  try {
    const result = await evidenceService.getEvidencesByMonitoring(req.params.id);

    return successResponse({
      res,
      message: result?.message || "Daftar Bukti Realisasi berhasil dimuat.",
      data: result?.data || [],
      meta:
        result?.meta || {
          mr_planning_monitoring_id: Number(req.params.id),
          total: Array.isArray(result?.data) ? result.data.length : 0,
        },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: Detail Bukti Realisasi
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-monitoring/evidence/:evidenceId
 */

const getEvidenceDetail = async (req, res) => {
  try {
    const result = await evidenceService.getEvidenceDetail(
      req.params.evidenceId
    );

    return successResponse({
      res,
      message: result?.message || "Detail Bukti Realisasi berhasil dimuat.",
      data: result?.data || result,
      meta: {
        evidence_id: Number(req.params.evidenceId),
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: View/Download Bukti Realisasi
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-monitoring/evidence/:evidenceId/download?mode=view
 * GET /api/mr-planning-monitoring/evidence/:evidenceId/download?mode=download
 */

const downloadEvidence = async (req, res) => {
  try {
    const result = await evidenceService.prepareEvidenceDownload({
      evidenceId: req.params.evidenceId,
      mode: req.query?.mode,
    });

    const data = result?.data || {};
    const mode = data.mode === "view" ? "view" : "download";

    if (data.mime_type) {
      res.setHeader("Content-Type", data.mime_type);
    }

    if (mode === "view") {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(data.original_file_name || "bukti-realisasi")}"`
      );
    } else {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(data.original_file_name || "bukti-realisasi")}"`
      );
    }

    return res.sendFile(data.file_path);
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * UPDATE: Cancel Bukti Realisasi
 * ---------------------------------------------------------------------------
 * PATCH /api/mr-planning-monitoring/evidence/:evidenceId/cancel
 *
 * Guard:
 * - Tidak hard delete.
 * - Pembatalan memakai:
 *   is_active=false
 *   status_bukti=dibatalkan
 *   cancelled_by
 *   cancelled_at
 *   cancel_reason
 */

const cancelEvidence = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await evidenceService.cancelEvidence({
      evidenceId: req.params.evidenceId,
      body: req.body,
      userId,
    });

    return successResponse({
      res,
      message: result?.message || "Bukti Realisasi berhasil dibatalkan.",
      data: result?.data || result,
      meta: {
        evidence_id: Number(req.params.evidenceId),
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  uploadEvidence,
  getEvidencesByMonitoring,
  getEvidenceDetail,
  downloadEvidence,
  cancelEvidence,
};