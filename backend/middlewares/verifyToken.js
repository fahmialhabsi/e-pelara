// middlewares/verifyToken.js

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

function isExemptFromInactiveTenantCheck(urlPath) {
  const u = String(urlPath || "").split("?")[0];
  return u.startsWith("/api/auth") || u.startsWith("/api/tenants");
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader
    ? authHeader.replace("Bearer ", "")
    : (req.cookies?.token || req.query?._token || null);

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token tidak ditemukan atau salah format." });
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
        return res
          .status(500)
          .json({ message: "Konfigurasi SSO tidak lengkap" });
      }
      decoded = jwt.verify(token, ssoSecret);
      console.log(`[verifyToken] SSO verified OK. role=${decoded.role}`);
    } else {
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
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      role_id: decoded.role_id,
      divisions_id: decoded.divisions_id,
      opd: decoded.opd_penanggung_jawab,
      bidang_opd_penanggung_jawab: decoded.bidang_opd_penanggung_jawab,
      tahun: decoded.tahun,
      periode_id: decoded.periode_id,
      tenant_id: effectiveTenantId,
    };

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
        return res.status(403).json({
          message:
            "Tenant tidak aktif atau tidak ditemukan. Hubungi administrator.",
        });
      }
    }

    tenantContext.run({ tenantId: effectiveTenantId }, () => next());
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};
module.exports = verifyToken;
