"use strict";

const ROLE_RANK = Object.freeze({
  PELAKSANA: 10,
  PENGAWAS: 20,
  ADMINISTRATOR: 30,
  SUPER_ADMIN: 40,
});

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function roleRank(role) {
  return ROLE_RANK[normalizeRole(role)] || 0;
}

function isKnownRole(role) {
  return roleRank(role) > 0;
}

function canManageTarget(actorRole, targetRole, { allowSameRole = false } = {}) {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!isKnownRole(actor) || !isKnownRole(target)) return false;
  if (actor === "SUPER_ADMIN") return true;
  if (target === "SUPER_ADMIN") return false;
  return allowSameRole ? roleRank(actor) >= roleRank(target) : roleRank(actor) > roleRank(target);
}

function resolvePrincipalTenant(req) {
  const candidate = req?.tenantId ?? req?.user?.tenant_id ?? req?.user?.tenantId;
  const tenantId = Number(candidate);
  if (!Number.isInteger(tenantId) || tenantId <= 0) return null;
  return tenantId;
}

function assertTenantMatch(req, targetTenantId) {
  const actorRole = normalizeRole(req?.user?.role);
  if (actorRole === "SUPER_ADMIN") return { ok: true, superAdmin: true };
  const tenantId = resolvePrincipalTenant(req);
  const target = Number(targetTenantId);
  if (!tenantId || !Number.isInteger(target) || target <= 0) {
    return {
      ok: false,
      status: 403,
      body: { message: "Konteks tenant tidak dapat diverifikasi.", code: "TENANT_CONTEXT_REQUIRED" },
    };
  }
  if (tenantId !== target) {
    return {
      ok: false,
      status: 403,
      body: { message: "Akses ditolak.", code: "TENANT_BOUNDARY_FORBIDDEN" },
    };
  }
  return { ok: true, tenantId, superAdmin: false };
}

function assertActorCanManageTarget(req, targetRole, options = {}) {
  const actorRole = normalizeRole(req?.user?.role);
  if (!canManageTarget(actorRole, targetRole, options)) {
    return {
      ok: false,
      status: 403,
      body: {
        message: "Aktor tidak berwenang mengelola role target tersebut.",
        code: "ROLE_HIERARCHY_FORBIDDEN",
      },
    };
  }
  return { ok: true, actorRole, targetRole: normalizeRole(targetRole) };
}

module.exports = {
  ROLE_RANK,
  assertActorCanManageTarget,
  assertTenantMatch,
  canManageTarget,
  isKnownRole,
  normalizeRole,
  resolvePrincipalTenant,
  roleRank,
};
