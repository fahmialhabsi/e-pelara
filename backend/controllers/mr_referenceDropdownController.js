"use strict";

/**
 * MR Reference Dropdown Controller
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 18B-0
 */

const mrReferenceDropdownService = require("../services/mr/mrReferenceDropdownService");

const getStatusCode = (error) => error?.statusCode || error?.status || 500;

const successResponse = ({ res, message, data = null, meta = {} }) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta,
  });
};

const errorResponse = ({ res, error }) => {
  const statusCode = getStatusCode(error);

  return res.status(statusCode).json({
    success: false,
    message: error?.message || "Terjadi kesalahan pada reference MR.",
    blocked: Boolean(error?.blocked),
    audit_mode: Boolean(error?.audit_mode),
    code: error?.code || error?.name || "MR_REFERENCE_ERROR",
    details: error?.details || {},
    meta: {},
  });
};

const getItemsByGroup = async (req, res) => {
  try {
    const result = await mrReferenceDropdownService.getItemsByGroup(
      req.params.kodeGroup
    );

    return successResponse({
      res,
      message: "Daftar reference item MR berhasil dimuat.",
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  getItemsByGroup,
};