/**
 * Format error validasi terstandar untuk konsumsi frontend (Formik / UI).
 * Bentuk: { errors: { field_name: ["pesan"] }, message?: string }
 */

/**
 * @param {import("sequelize").ValidationErrorItem[]} items
 * @returns {Record<string, string[]>}
 */
function sequelizeItemsToErrors(items = []) {
  const errors = {};
  for (const item of items) {
    const path = item.path || "_error";
    if (!errors[path]) errors[path] = [];
    errors[path].push(item.message || "Validasi gagal");
  }
  return errors;
}

/**
 * @param {Error & { errors?: import("sequelize").ValidationErrorItem[] }} err
 */
function fromSequelizeValidationError(err) {
  return sequelizeItemsToErrors(err?.errors || []);
}

/**
 * Gabungkan beberapa map field → string[] menjadi satu objek `errors`.
 * @param {Record<string, string | string[]>[]} parts
 */
function mergeErrorMaps(...parts) {
  const out = {};
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    for (const [k, v] of Object.entries(part)) {
      const arr = Array.isArray(v) ? v : [v];
      if (!out[k]) out[k] = [];
      out[k].push(...arr.filter(Boolean));
    }
  }
  return out;
}

/**
 * @param {import("express").Response} res
 * @param {number} statusCode
 * @param {Record<string, string | string[]>} fieldErrors
 * @param {{ message?: string }} [opts]
 */
function sendValidationErrors(res, statusCode, fieldErrors, opts = {}) {
  const errors = mergeErrorMaps(fieldErrors);
  const payload = {
    errors,
    ...(opts.message ? { message: opts.message } : {}),
  };
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendValidationErrors,
  mergeErrorMaps,
  fromSequelizeValidationError,
  sequelizeItemsToErrors,
};
