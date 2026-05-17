"use strict";

const normalizeRole = (role) =>
  typeof role === "string"
    ? role.trim().toUpperCase().replace(/\s+/g, "_")
    : "";

// Mapping role SIGAP → role e-Pelara untuk SSO.
// SIGAP role (uppercase) → e-Pelara equivalent.
const SIGAP_TO_EPELARA = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMINISTRATOR",
  KEPALA_DINAS: "ADMINISTRATOR",
  SEKRETARIS: "ADMINISTRATOR",
  KEPALA_BIDANG: "PENGAWAS",
  KEPALA_BIDANG_KETERSEDIAAN: "PENGAWAS",
  KEPALA_BIDANG_DISTRIBUSI: "PENGAWAS",
  KEPALA_BIDANG_KONSUMSI: "PENGAWAS",
  KEPALA_UPTD: "PENGAWAS",
  FUNGSIONAL: "PELAKSANA",
  FUNGSIONAL_PERENCANA: "PELAKSANA",
  FUNGSIONAL_ANALIS: "PELAKSANA",
  PELAKSANA: "PELAKSANA",
  KASUBBAG: "PELAKSANA",
  KASI_UPTD: "PELAKSANA",
  VIEWER: "PELAKSANA",
  GUBERNUR: "PENGAWAS",
};

const roleErrorResponse = ({
  res,
  statusCode = 403,
  message = "Akses ditolak.",
  code = "MR_FORBIDDEN",
  details = {},
}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    blocked: true,
    audit_mode: false,
    code,
    details,
    meta: {},
  });
};

const extractUserRole = (req) => {
  return (
    req.user?.role ||
    req.user?.role_name ||
    req.user?.roleName ||
    req.user?.role_code ||
    req.user?.roleCode ||
    req.userRole ||
    req.role ||
    null
  );
};

const allowRoles = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!Array.isArray(allowedRoles)) {
        return roleErrorResponse({
          res,
          statusCode: 500,
          message: "Konfigurasi role endpoint tidak valid.",
          code: "MR_ALLOWED_ROLES_CONFIG_INVALID",
        });
      }

      // req.user sudah di-set oleh verifyToken — tidak perlu re-verify JWT lagi.
      // Re-verifikasi independen akan selalu gagal untuk SSO token (beda secret).
      if (!req.user) {
        return roleErrorResponse({
          res,
          statusCode: 401,
          message: "Akses ditolak. User belum terautentikasi.",
          code: "MR_USER_NOT_AUTHENTICATED",
        });
      }

      const rawRole = normalizeRole(extractUserRole(req));

      if (!rawRole) {
        return roleErrorResponse({
          res,
          statusCode: 403,
          message: "Akses ditolak. Role user tidak tersedia.",
          code: "MR_USER_ROLE_MISSING",
        });
      }

      // Terjemahkan role SIGAP ke role e-Pelara jika perlu.
      const userRole = SIGAP_TO_EPELARA[rawRole] || rawRole;
      const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

      if (!normalizedAllowedRoles.includes(userRole)) {
        return roleErrorResponse({
          res,
          statusCode: 403,
          message: "Akses ditolak. Role user tidak memiliki izin.",
          code: "MR_ROLE_FORBIDDEN",
          details: {
            role: userRole,
            raw_role: rawRole,
            allowed_roles: normalizedAllowedRoles,
          },
        });
      }

      return next();
    } catch (error) {
      console.error("[allowRoles]", error?.message);

      return roleErrorResponse({
        res,
        statusCode: 403,
        message: "Akses ditolak.",
        code: "MR_ROLE_CHECK_FAILED",
      });
    }
  };
};

module.exports = allowRoles;