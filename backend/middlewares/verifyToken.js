// middlewares/verifyToken.js

"use strict";

const jwt = require("jsonwebtoken");
const tenantContext = require("../lib/tenantContext");
const { Tenant } = require("../models");
const { writeTenantAudit } = require("../services/tenantAuditService");

function isSuperAdminRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_") === "SUPER_ADMIN";
}

function normalizeAuthRoleValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object") {
    return normalizeAuthRoleValue(
      value.name ??
        value.nama_role ??
        value.role_name ??
        value.roleName ??
        value.role_code ??
        value.roleCode ??
        value.label ??
        null,
    );
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "SUPERADMIN") {
    return "SUPER_ADMIN";
  }

  return normalized || null;
}

function resolveAuthRole(decoded = {}) {
  const roleSources = [
    decoded.role,
    decoded.role_name,
    decoded.roleName,
    decoded.role_code,
    decoded.roleCode,
    decoded?.Role?.nama_role,
    decoded?.Role?.namaRole,
    decoded?.Role?.name,
    decoded?.role?.name,
    decoded?.role?.nama_role,
  ];

  for (const candidate of roleSources) {
    const normalized = normalizeAuthRoleValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function isExemptFromInactiveTenantCheck(urlPath) {
  const u = String(urlPath || "").split("?")[0];
  return u.startsWith("/api/auth") || u.startsWith("/api/tenants");
}

const authErrorResponse = ({
  res,
  statusCode = 401,
  message = "Autentikasi gagal.",
  code = "MR_AUTHENTICATION_FAILED",
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

const extractBearerToken = (authHeader) => {
  if (!authHeader) return null;

  const raw = String(authHeader).trim();

  if (!raw) return null;

  const [scheme, token] = raw.split(" ");

  if (scheme !== "Bearer" || !token) {
    return {
      invalidFormat: true,
      token: null,
    };
  }

  return {
    invalidFormat: false,
    token,
  };
};

const verifyToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  const bearer = extractBearerToken(authHeader);

  if (bearer?.invalidFormat) {
    return authErrorResponse({
      res,
      statusCode: 401,
      message: "Format token tidak valid. Gunakan Bearer token.",
      code: "MR_TOKEN_FORMAT_INVALID",
    });
  }

  const token = bearer?.token || req.cookies?.token || req.query?._token || null;

  if (!token) {
    return authErrorResponse({
      res,
      statusCode: 401,
      message: "Akses ditolak. Token tidak tersedia.",
      code: "MR_TOKEN_MISSING",
    });
  }

  try {
    const unverified = jwt.decode(token);
    const isSsoToken = unverified && unverified.type === "sso";

    console.log(
      `[verifyToken] type=${unverified?.type || "local"} isSso=${isSsoToken} ssoConfigured=${!!process.env.SSO_SHARED_SECRET} role=${unverified?.role || "N/A"}`,
    );

    let decoded;

    if (isSsoToken) {
      const ssoSecret = process.env.SSO_SHARED_SECRET;

      if (!ssoSecret) {
        console.error("[verifyToken] SSO_SHARED_SECRET tidak dikonfigurasi");

        return authErrorResponse({
          res,
          statusCode: 500,
          message: "Konfigurasi SSO tidak lengkap.",
          code: "MR_SSO_CONFIG_MISSING",
        });
      }

      decoded = jwt.verify(token, ssoSecret);
      console.log(`[verifyToken] SSO verified OK. role=${decoded.role}`);
    } else {
      if (!process.env.JWT_SECRET) {
        return authErrorResponse({
          res,
          statusCode: 500,
          message: "Konfigurasi autentikasi server belum tersedia.",
          code: "MR_AUTH_CONFIG_MISSING",
        });
      }

      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }

    const rawTid = decoded.tenant_id != null ? Number(decoded.tenant_id) : 1;
    const jwtBaseTenantId = Number.isFinite(rawTid) && rawTid > 0 ? rawTid : 1;
    let effectiveTenantId = jwtBaseTenantId;

    const switchHeaderRaw = req.get("x-tenant-id");
    const switchHeader =
      switchHeaderRaw != null && String(switchHeaderRaw).trim() !== ""
        ? String(switchHeaderRaw).trim()
        : null;

    if (switchHeader != null) {
      if (!isSuperAdminRole(decoded.role)) {
        console.warn(
          `[tenant] X-Tenant-Id="${switchHeader}" diabaikan — user ${decoded.id} bukan SUPER_ADMIN (role=${decoded.role}).`,
        );
      } else {
        const parsed = parseInt(switchHeader, 10);

        if (!Number.isFinite(parsed) || parsed < 1) {
          console.warn(
            `[tenant] X-Tenant-Id="${switchHeader}" tidak valid — diabaikan.`,
          );
        } else {
          const row = await Tenant.findByPk(parsed, { attributes: ["id"] });

          if (!row) {
            console.warn(
              `[tenant] X-Tenant-Id=${parsed} tidak merujuk tenant yang ada — diabaikan.`,
            );
          } else {
            effectiveTenantId = parsed;
          }
        }
      }
    }

    req.jwtTenantId = jwtBaseTenantId;
    req.tenantId = effectiveTenantId;
    const canonicalRole = resolveAuthRole(decoded);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: canonicalRole || decoded.role || null,
      role_name: decoded.role_name || decoded.roleName || decoded?.Role?.nama_role || null,
      roleName: decoded.roleName || decoded.role_name || decoded?.Role?.namaRole || null,
      role_code: decoded.role_code || decoded.roleCode || null,
      roleCode: decoded.roleCode || decoded.role_code || null,
      role_label: decoded.role_label || decoded.roleLabel || decoded?.Role?.label || null,
      role_id: decoded.role_id,
      divisions_id: decoded.divisions_id,
      opd: decoded.opd_penanggung_jawab,
      bidang_opd_penanggung_jawab: decoded.bidang_opd_penanggung_jawab,
      tahun: decoded.tahun,
      periode_id: decoded.periode_id,
      tenant_id: effectiveTenantId,
    };

    // Compatibility guard untuk controller/service existing.
    req.userId = decoded.id;
    req.userRole = canonicalRole || decoded.role || null;
    req.role = canonicalRole || decoded.role || null;

    if (
      switchHeader != null &&
      isSuperAdminRole(decoded.role) &&
      effectiveTenantId !== jwtBaseTenantId
    ) {
      writeTenantAudit({
        user_id: decoded.id,
        aksi: "SWITCH_TENANT",
        tenant_id_asal: jwtBaseTenantId,
        tenant_id_tujuan: effectiveTenantId,
        payload: { path: req.originalUrl?.split("?")[0] || null },
      });
    }

    const urlPath = req.originalUrl || req.url || "";

    if (!isExemptFromInactiveTenantCheck(urlPath)) {
      const tmeta = await Tenant.findByPk(effectiveTenantId, {
        attributes: ["id", "is_active"],
      });

      if (!tmeta || tmeta.is_active === false) {
        return authErrorResponse({
          res,
          statusCode: 403,
          message:
            "Tenant tidak aktif atau tidak ditemukan. Hubungi administrator.",
          code: "MR_TENANT_INACTIVE",
          details: {
            tenant_id: effectiveTenantId,
          },
        });
      }
    }

    return tenantContext.run({ tenantId: effectiveTenantId }, () => next());
  } catch (error) {
    console.error("Token verification failed:", error?.message);

    if (error?.name === "TokenExpiredError") {
      return authErrorResponse({
        res,
        statusCode: 401,
        message: "Sesi login telah berakhir. Silakan login kembali.",
        code: "MR_TOKEN_EXPIRED",
      });
    }

    if (error?.name === "JsonWebTokenError") {
      return authErrorResponse({
        res,
        statusCode: 401,
        message: "Token tidak valid.",
        code: "MR_TOKEN_INVALID",
      });
    }

    if (error?.name === "NotBeforeError") {
      return authErrorResponse({
        res,
        statusCode: 401,
        message: "Token belum aktif.",
        code: "MR_TOKEN_NOT_ACTIVE",
      });
    }

    return authErrorResponse({
      res,
      statusCode: 401,
      message: "Autentikasi gagal.",
      code: "MR_AUTHENTICATION_FAILED",
    });
  }
};

module.exports = verifyToken;
