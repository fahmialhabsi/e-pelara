"use strict";

const { TenantAuditLog } = require("../models");

/**
 * Audit trail operasional tenant (bukan filter isolasi data).
 * Fire-and-forget aman untuk request path — gagal hanya di-log.
 */
function writeTenantAudit(entry) {
  const row = {
    user_id: entry.user_id ?? null,
    aksi: entry.aksi,
    tenant_id_asal: entry.tenant_id_asal ?? null,
    tenant_id_tujuan: entry.tenant_id_tujuan ?? null,
    payload: entry.payload != null ? entry.payload : null,
  };
  return TenantAuditLog.create(row).catch((e) => {
    console.warn("[tenantAuditService]", e?.message || e);
  });
}

module.exports = {
  writeTenantAudit,
};
