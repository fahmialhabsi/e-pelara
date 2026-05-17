"use strict";

/**
 * MR Response Helper
 * ---------------------------------------------------------------------------
 * Standarisasi response API MR e-Pelara.
 *
 * Tujuan:
 * - response sukses konsisten;
 * - response error konsisten;
 * - blocked flag terlihat;
 * - audit_mode terlihat;
 * - warning/blocked/missing fields terbaca frontend;
 * - stack trace, SQL, parent/original Sequelize error, password, token,
 *   secret, dan api key tidak bocor ke response.
 */

const DEFAULT_SUCCESS_STATUS = 200;
const DEFAULT_CREATED_STATUS = 201;
const DEFAULT_ERROR_STATUS = 500;

const SENSITIVE_DETAIL_KEYS = Object.freeze([
  "stack",
  "sql",
  "parent",
  "original",
  "errors",
  "password",
  "password_reset_token",
  "password_reset_expires",
  "reset_password_token",
  "reset_password_expires",
  "remember_token",
  "refresh_token",
  "access_token",
  "token",
  "secret",
  "api_key",
  "api_secret",
]);

const ERROR_STATUS_BY_CODE = Object.freeze({
  MR_USER_ACTOR_NOT_FOUND: 401,

  MR_FORBIDDEN: 403,
  MR_ROLE_FORBIDDEN: 403,
  MR_ACCESS_DENIED: 403,

  MR_NOT_FOUND: 404,
  MR_RECORD_NOT_FOUND: 404,
  MR_APPROVED_HISTORY_NOT_FOUND: 404,
  MR_REFERENCE_NOT_FOUND: 404,

  MR_REQUIRED_FIELDS_MISSING: 400,
  MR_BLOCKED_FIELDS: 400,
  MR_GOVERNANCE_FIELDS_BLOCKED: 400,
  MR_VALIDATION_ERROR: 400,
  MR_INVALID_INTEGER_ID: 400,
  MR_ID_REQUIRED: 400,
  MR_INVALID_STAGE: 400,
  MR_INVALID_STATUS_REVISI: 400,
  MR_REFERENCE_LINKAGE_INVALID: 400,
  MR_REFERENCE_WHERE_EMPTY: 400,
  MR_APPROVED_DIRECT_UPDATE_BLOCKED: 400,
  MR_REBUILD_HISTORY_NOT_APPROVED: 400,
  MR_REBUILD_AFTER_JSON_INVALID: 400,
  MR_SYSTEM_CODE_REQUIRED: 400,
  MR_INVALID_SYSTEM_CODE: 400,
});

const isObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const normalizeErrorStatus = (error = {}) => {
  const rawStatus =
    error.status ||
    error.statusCode ||
    error.httpStatus ||
    ERROR_STATUS_BY_CODE[error.code];

  const numericStatus = Number(rawStatus);

  if (
    Number.isInteger(numericStatus) &&
    numericStatus >= 400 &&
    numericStatus <= 599
  ) {
    return numericStatus;
  }

  return DEFAULT_ERROR_STATUS;
};

const normalizeErrorCode = (error = {}, statusCode = DEFAULT_ERROR_STATUS) => {
  if (error.code) return error.code;

  const rawDetails = isObject(error.details) ? error.details : {};

  if (
    error.blocked === true ||
    rawDetails.blocked === true ||
    error.blocked_fields ||
    rawDetails.blocked_fields ||
    error.missing_fields ||
    rawDetails.missing_fields
  ) {
    return "MR_VALIDATION_ERROR";
  }

  if (Number(statusCode) === 400) {
    return "MR_VALIDATION_ERROR";
  }

  if (Number(statusCode) === 401) {
    return "MR_UNAUTHORIZED";
  }

  if (Number(statusCode) === 403) {
    return "MR_FORBIDDEN";
  }

  if (Number(statusCode) === 404) {
    return "MR_NOT_FOUND";
  }

  if (Number(statusCode) === 409) {
    return "MR_CONFLICT";
  }

  if (error.name === "SequelizeValidationError") {
    return "MR_SEQUELIZE_VALIDATION_ERROR";
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return "MR_DUPLICATE_DATA";
  }

  if (error.name === "SequelizeForeignKeyConstraintError") {
    return "MR_FOREIGN_KEY_CONSTRAINT_ERROR";
  }

  return "MR_INTERNAL_SERVER_ERROR";
};

const shouldExposeErrorMessage = (statusCode) => {
  return Number(statusCode) >= 400 && Number(statusCode) < 500;
};

const sanitizeErrorDetails = (details = {}) => {
  if (!isObject(details)) return {};

  return Object.keys(details).reduce((safeDetails, key) => {
    if (SENSITIVE_DETAIL_KEYS.includes(key)) {
      return safeDetails;
    }

    const value = details[key];

    if (isObject(value)) {
      safeDetails[key] = sanitizeErrorDetails(value);
      return safeDetails;
    }

    if (Array.isArray(value)) {
      safeDetails[key] = value.map((item) => {
        if (isObject(item)) return sanitizeErrorDetails(item);
        return item;
      });
      return safeDetails;
    }

    safeDetails[key] = value;
    return safeDetails;
  }, {});
};

const pickLegacyErrorArrays = (error = {}, details = {}) => {
  const payload = {};

  if (error.blocked_fields || details.blocked_fields) {
    payload.blocked_fields = error.blocked_fields || details.blocked_fields;
  }

  if (error.missing_fields || details.missing_fields) {
    payload.missing_fields = error.missing_fields || details.missing_fields;
  }

  if (error.warnings || details.warnings) {
    payload.warnings = error.warnings || details.warnings;
  }

  if (error.allowed_fields || details.allowed_fields) {
    payload.allowed_fields = error.allowed_fields || details.allowed_fields;
  }

  return payload;
};

const buildErrorPayload = ({
  error = {},
  fallbackMessage = "Terjadi kesalahan server.",
  meta = {},
} = {}) => {
  const statusCode = normalizeErrorStatus(error);
  const rawDetails = isObject(error.details) ? error.details : {};
  const details = sanitizeErrorDetails(rawDetails);

  const message = shouldExposeErrorMessage(statusCode)
    ? error.message || fallbackMessage
    : fallbackMessage;

  const code = normalizeErrorCode(error, statusCode);

  const payload = {
    success: false,
    message,
    blocked:
      error.blocked !== undefined
        ? Boolean(error.blocked)
        : details.blocked !== undefined
          ? Boolean(details.blocked)
          : true,
    audit_mode:
      error.audit_mode !== undefined
        ? Boolean(error.audit_mode)
        : Boolean(error.auditMode),
    code,
    ...pickLegacyErrorArrays(error, details),
    details,
    meta,
  };

  return {
    statusCode,
    payload,
  };
};

const successResponse = ({
  res,
  message = "Berhasil.",
  data = null,
  meta = {},
  statusCode = DEFAULT_SUCCESS_STATUS,
}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

const createdResponse = ({
  res,
  message = "Data berhasil dibuat.",
  data = null,
  meta = {},
}) => {
  return successResponse({
    res,
    message,
    data,
    meta,
    statusCode: DEFAULT_CREATED_STATUS,
  });
};

const noContentResponse = ({ res }) => {
  return res.status(204).send();
};

const errorResponse = ({
  res,
  error = {},
  fallbackMessage = "Terjadi kesalahan server.",
  meta = {},
}) => {
  const { statusCode, payload } = buildErrorPayload({
    error,
    fallbackMessage,
    meta,
  });

  return res.status(statusCode).json(payload);
};

const notFoundResponse = ({
  res,
  message = "Data tidak ditemukan.",
  details = {},
  meta = {},
}) => {
  return errorResponse({
    res,
    error: {
      status: 404,
      message,
      blocked: true,
      audit_mode: false,
      code: "MR_NOT_FOUND",
      details,
    },
    meta,
  });
};

const blockedResponse = ({
  res,
  message = "Aksi diblokir oleh governance.",
  code = "MR_GOVERNANCE_BLOCKED",
  auditMode = true,
  details = {},
  statusCode = 400,
  meta = {},
}) => {
  return errorResponse({
    res,
    error: {
      status: statusCode,
      message,
      blocked: true,
      audit_mode: auditMode,
      code,
      details,
    },
    meta,
  });
};

const validationErrorResponse = ({
  res,
  message = "Validasi gagal.",
  blockedFields = [],
  missingFields = [],
  details = {},
  meta = {},
}) => {
  return errorResponse({
    res,
    error: {
      status: 400,
      message,
      blocked: true,
      audit_mode: false,
      code: "MR_VALIDATION_ERROR",
      blocked_fields: blockedFields.length ? blockedFields : undefined,
      missing_fields: missingFields.length ? missingFields : undefined,
      details: {
        ...details,
        blocked_fields: blockedFields.length ? blockedFields : undefined,
        missing_fields: missingFields.length ? missingFields : undefined,
      },
    },
    meta,
  });
};

const paginatedResponse = ({
  res,
  message = "Data berhasil dimuat.",
  data = [],
  page = 1,
  limit = 10,
  total = 0,
  extraMeta = {},
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 10;
  const numericTotal = Number(total) || 0;

  return successResponse({
    res,
    message,
    data,
    meta: {
      page: numericPage,
      limit: numericLimit,
      total: numericTotal,
      total_pages: Math.ceil(numericTotal / numericLimit),
      ...extraMeta,
    },
  });
};

const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      if (typeof next === "function") {
        return next(error);
      }

      return errorResponse({ res, error });
    }
  };
};

module.exports = {
  DEFAULT_SUCCESS_STATUS,
  DEFAULT_CREATED_STATUS,
  DEFAULT_ERROR_STATUS,
  SENSITIVE_DETAIL_KEYS,
  ERROR_STATUS_BY_CODE,

  normalizeErrorStatus,
  normalizeErrorCode,
  sanitizeErrorDetails,
  buildErrorPayload,

  successResponse,
  createdResponse,
  noContentResponse,
  errorResponse,
  notFoundResponse,
  blockedResponse,
  validationErrorResponse,
  paginatedResponse,
  asyncHandler,
};