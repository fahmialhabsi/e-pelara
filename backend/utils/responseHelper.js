// utils/responseHelper.js

const isListEnvelope = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const keys = Object.keys(payload);
  return (
    Array.isArray(payload.data) &&
    keys.every((key) => key === "data" || key === "meta")
  );
};

exports.successResponse = (
  res,
  status = 200,
  message = "Berhasil",
  data = null,
  meta = undefined
) => {
  if (meta !== undefined) {
    return res.status(status).json({ message, data, meta });
  }

  if (isListEnvelope(data)) {
    return res.status(status).json({
      message,
      data: data.data,
      ...(data.meta ? { meta: data.meta } : {}),
    });
  }

  return res.status(status).json({ message, data });
};

exports.listResponse = (
  res,
  status = 200,
  message = "Berhasil mengambil data",
  data = [],
  meta = undefined
) => {
  return res.status(status).json({
    message,
    data: Array.isArray(data) ? data : [],
    ...(meta ? { meta } : {}),
  });
};

exports.errorResponse = (
  res,
  status = 500,
  message = "Terjadi kesalahan",
  error = null
) => {
  return res.status(status).json({ message, error });
};

/**
 * Error JSON konsisten untuk API master & modul lain (audit / frontend mapping).
 * @param {import('express').Response} res
 * @param {number} status
 * @param {{ code: string, message: string, field?: string|null, details?: unknown }} body
 */
exports.structuredErrorResponse = (res, status, body) => {
  const { code, message, field, details } = body || {};
  const payload = {
    code: code || "UNKNOWN_ERROR",
    message: message || "Terjadi kesalahan",
  };
  if (field !== undefined && field !== null) payload.field = field;
  if (details !== undefined) payload.details = details;
  return res.status(status).json(payload);
};
