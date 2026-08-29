"use strict";

/**
 * Server-derived OPD ownership helpers.
 *
 * Scope is resolved from the authenticated principal (req.user.opd) and the
 * authoritative OPD registry. Client-supplied tenant/opd values are never
 * accepted by these helpers. A missing or unverifiable scope fails closed.
 */

function forbidden(code, error = "Anda tidak memiliki kewenangan untuk data OPD ini.") {
  return {
    ok: false,
    status: 403,
    body: { success: false, error, code },
  };
}

function unavailable(code = "OPD_BOUNDARY_UNAVAILABLE") {
  return {
    ok: false,
    status: 503,
    body: {
      success: false,
      error: "Batas kewenangan OPD tidak dapat diverifikasi saat ini. Aksi ditolak sementara demi keamanan data — silakan coba lagi.",
      code,
    },
  };
}

function isSuperAdmin(req) {
  return req?.user?.role === "SUPER_ADMIN";
}

async function resolveCallerOpdId(req, OpdPenanggungJawab) {
  if (isSuperAdmin(req)) return { ok: true, callerOpdId: null, isSuperAdmin: true };

  const opdName = req?.user?.opd;
  if (!opdName || !OpdPenanggungJawab || typeof OpdPenanggungJawab.findOne !== "function") {
    return forbidden("OPD_CONTEXT_REQUIRED");
  }

  try {
    const opdRow = await OpdPenanggungJawab.findOne({ where: { nama_opd: opdName } });
    const callerOpdId = opdRow?.id ?? null;
    if (callerOpdId == null) return forbidden("OPD_CONTEXT_NOT_FOUND");
    return { ok: true, callerOpdId, isSuperAdmin: false };
  } catch (error) {
    return unavailable();
  }
}

async function assertOpdBoundary(req, row, OpdPenanggungJawab, options = {}) {
  const field = options.field || "opd_id";
  if (isSuperAdmin(req)) return { ok: true, isSuperAdmin: true };

  const targetOpdId = row?.[field] ?? null;
  if (targetOpdId == null) return unavailable("OPD_OWNER_MISSING");

  const scope = await resolveCallerOpdId(req, OpdPenanggungJawab);
  if (!scope.ok) return scope;
  if (String(scope.callerOpdId) !== String(targetOpdId)) {
    return forbidden(options.code || "OPD_BOUNDARY_FORBIDDEN");
  }
  return { ok: true, callerOpdId: scope.callerOpdId, isSuperAdmin: false };
}

async function resolveOpdScope(req, OpdPenanggungJawab, options = {}) {
  const scope = await resolveCallerOpdId(req, OpdPenanggungJawab);
  if (!scope.ok || scope.isSuperAdmin) return scope;
  return {
    ...scope,
    where: { [options.field || "opd_id"]: scope.callerOpdId },
  };
}

function sendBoundaryFailure(res, result) {
  return res.status(result.status || 403).json(result.body || {
    success: false,
    error: "Anda tidak memiliki kewenangan untuk data ini.",
    code: "OPD_BOUNDARY_FORBIDDEN",
  });
}

module.exports = {
  assertOpdBoundary,
  forbidden,
  isSuperAdmin,
  resolveCallerOpdId,
  resolveOpdScope,
  sendBoundaryFailure,
};
