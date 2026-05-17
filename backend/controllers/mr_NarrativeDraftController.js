"use strict";

/**
 * MR Narrative Draft Controller
 *
 * PHASE 4 — STEP 18C-1C
 * Controller untuk preview draft narasi proposal-intake.
 *
 * Guard:
 * - Endpoint ini hanya membuat preview draft narasi.
 * - Tidak menyimpan data ke mr_planning_risk.
 * - Tidak menghitung skor risiko.
 * - Tidak mengubah workflow.
 * - Tidak menerima field teknis governance.
 */

const mrNarrativeDraftService = require("../services/mr/mrNarrativeDraftService");

const getHttpStatus = (error) => {
  return Number(error?.statusCode || error?.status || 500);
};

const buildErrorCode = (statusCode) => {
  if (statusCode === 400) return "MR_NARRATIVE_VALIDATION_ERROR";
  if (statusCode === 401) return "MR_UNAUTHORIZED";
  if (statusCode === 403) return "MR_FORBIDDEN";
  if (statusCode === 404) return "MR_NARRATIVE_NOT_FOUND";
  if (statusCode === 501) return "MR_NARRATIVE_PROVIDER_NOT_IMPLEMENTED";
  if (statusCode === 502) return "MR_NARRATIVE_PROVIDER_ERROR";
  if (statusCode === 503) return "MR_NARRATIVE_PROVIDER_DISABLED";

  return "MR_NARRATIVE_INTERNAL_SERVER_ERROR";
};

const errorResponse = ({ res, error }) => {
  const statusCode = getHttpStatus(error);
  const details = error?.details || {};

  return res.status(statusCode).json({
    success: false,
    message: error?.message || "Terjadi kesalahan saat membuat draft narasi.",
    blocked: true,
    audit_mode: false,
    code: buildErrorCode(statusCode),

    ...(Array.isArray(details?.missing_fields)
      ? { missing_fields: details.missing_fields }
      : {}),

    ...(Array.isArray(details?.blocked_fields)
      ? { blocked_fields: details.blocked_fields }
      : {}),

    ...(Array.isArray(details?.blocked_output_fields)
      ? { blocked_output_fields: details.blocked_output_fields }
      : {}),

    ...(Array.isArray(details?.missing_output_fields)
      ? { missing_output_fields: details.missing_output_fields }
      : {}),

    details,
    meta: {},
  });
};

const previewProposalNarrative = async (req, res) => {
  try {
    const result = await mrNarrativeDraftService.previewProposalNarrative({
      body: req.body,
      user: req.user || null,
    });

    return res.status(200).json(result);
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  previewProposalNarrative,
};