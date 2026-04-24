"use strict";

const { QueryTypes } = require("sequelize");
const { sequelize, TenantAuditLog, PlanningAuditEvent, User } = require("../models");
const { enrichPlanningAuditRow } = require("./planningDocumentAuditService");

/** Aksi compliance terkait RPJMD / sync (filter default; bisa diperluas via query). */
const DEFAULT_COMPLIANCE_ACTIONS = Object.freeze([
  "RPJMD_BULK_MASTER_PREVIEW",
  "RPJMD_BULK_MASTER_COMMIT",
  "RPJMD_BACKFILL_PREVIEW",
  "RPJMD_BACKFILL_EXECUTE",
  "RPJMD_BACKFILL_EXECUTE_REJECTED",
  "RPJMD_PROGRAM_AUTO_MAP_PREVIEW",
  "RPJMD_PROGRAM_AUTO_MAP_EXECUTE",
  "RPJMD_PROGRAM_AUTO_MAP_EXECUTE_REJECTED",
  "RPJMD_KEGIATAN_AUTO_MAP_PREVIEW",
  "RPJMD_KEGIATAN_AUTO_MAP_EXECUTE",
  "RPJMD_KEGIATAN_AUTO_MAP_EXECUTE_REJECTED",
  "RPJMD_SUB_AUTO_MAP_PREVIEW",
  "RPJMD_SUB_AUTO_MAP_EXECUTE",
  "RPJMD_SUB_AUTO_MAP_EXECUTE_REJECTED",
  "RPJMD_RKPD_SYNC_PREVIEW",
  "RPJMD_RKPD_SYNC_COMMIT",
  "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
]);

function isSuperAdmin(role) {
  return (
    String(role || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_") === "SUPER_ADMIN"
  );
}

function parseDate(s) {
  if (s == null || String(s).trim() === "") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function deriveComplianceUiStatus(aksi, payload) {
  const a = String(aksi || "");
  if (/REJECTED/i.test(a)) return "rejected";
  if (/PREVIEW/i.test(a)) return "preview";
  if (payload && payload.success === false) return "failure";
  if (payload && payload.success === true) return "success";
  return "other";
}

function derivePlanningUiStatus(actionType) {
  const t = String(actionType || "").toUpperCase();
  if (t === "DELETE") return "delete";
  if (t === "CREATE") return "create";
  if (t === "UPDATE" || t === "PATCH") return "update";
  return "other";
}

function escapeSqlIn(values) {
  return values.map((v) => sequelize.escape(String(v))).join(", ");
}

function buildComplianceStatusSql(status) {
  const s = String(status || "").toLowerCase();
  if (!s || s === "all") return "1=1";
  if (s === "rejected") return "tal.aksi LIKE '%REJECTED%'";
  if (s === "failure")
    return "(tal.aksi NOT LIKE '%REJECTED%' AND JSON_EXTRACT(tal.payload, '$.success') = false)";
  if (s === "success")
    return "(JSON_EXTRACT(tal.payload, '$.success') = true AND tal.aksi NOT LIKE '%PREVIEW%' AND tal.aksi NOT LIKE '%REJECTED%')";
  if (s === "preview") return "tal.aksi LIKE '%PREVIEW%'";
  return "1=1";
}

function buildPlanningStatusSql(status) {
  const s = String(status || "").toLowerCase();
  if (!s || s === "all") return "1=1";
  if (s === "rejected") return "1=0";
  if (s === "failure") return "p.action_type IN ('ROLLBACK','ERROR')";
  if (s === "success") return "p.action_type IN ('CREATE','UPDATE','PATCH','RESTORE')";
  if (s === "preview") return "1=0";
  if (s === "delete") return "p.action_type = 'DELETE'";
  return "1=1";
}

/**
 * @param {object} q - query params from req
 */
async function listAuditDashboard(req) {
  const q = req.query || {};
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
  const source = String(q.source || "all").toLowerCase();
  const tenantId = req.tenantId != null ? Number(req.tenantId) : null;
  const superAdm = isSuperAdmin(req.user?.role);
  const filterTenantId =
    superAdm && q.tenant_id != null && String(q.tenant_id).trim() !== ""
      ? Number(q.tenant_id)
      : null;
  const effectiveTenantId = filterTenantId || tenantId;

  const dateFrom = parseDate(q.date_from);
  const dateTo = parseDate(q.date_to);
  const action = q.action != null && String(q.action).trim() !== "" ? String(q.action).trim() : null;
  const changeOrigin =
    q.change_origin != null && String(q.change_origin).trim() !== ""
      ? String(q.change_origin).trim()
      : null;
  const userId = q.user_id != null && String(q.user_id).trim() !== "" ? Number(q.user_id) : null;
  const correlationId =
    q.correlation_id != null && String(q.correlation_id).trim() !== ""
      ? String(q.correlation_id).trim()
      : null;
  const entityScope =
    q.entity_scope != null && String(q.entity_scope).trim() !== ""
      ? `%${String(q.entity_scope).trim()}%`
      : null;
  const entityType =
    q.entity_type != null && String(q.entity_type).trim() !== ""
      ? `%${String(q.entity_type).trim()}%`
      : null;
  const status = q.status != null && String(q.status).trim() !== "" ? String(q.status).trim() : "all";

  const parts = [];
  const replacements = { limit, offset };

  if (dateFrom) replacements.dateFrom = dateFrom;
  if (dateTo) replacements.dateTo = dateTo;
  if (userId && Number.isFinite(userId)) replacements.userId = userId;
  if (correlationId) replacements.correlationId = correlationId;
  if (changeOrigin) replacements.changeOrigin = changeOrigin;
  if (entityScope) replacements.entityScope = entityScope;
  if (entityType) replacements.entityType = entityType;

  if (source === "all" || source === "compliance") {
    const cw = [];
    if (!superAdm || filterTenantId) {
      cw.push("(tal.tenant_id_asal = :effectiveTenantId OR tal.tenant_id_tujuan = :effectiveTenantId)");
      replacements.effectiveTenantId = effectiveTenantId;
    }
    if (dateFrom) cw.push("tal.created_at >= :dateFrom");
    if (dateTo) cw.push("tal.created_at <= :dateTo");
    if (action) {
      cw.push("tal.aksi LIKE :actionLike");
      replacements.actionLike = `%${action}%`;
    } else {
      cw.push(`tal.aksi IN (${escapeSqlIn(DEFAULT_COMPLIANCE_ACTIONS)})`);
    }
    if (userId && Number.isFinite(userId)) cw.push("tal.user_id = :userId");
    if (correlationId) {
      cw.push(
        "JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.correlation_id')) = :correlationId",
      );
    }
    if (changeOrigin) {
      cw.push(
        "JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.change_origin')) = :changeOrigin",
      );
    }
    if (entityScope) {
      cw.push(
        "JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.entity_scope')) LIKE :entityScope",
      );
    }
    if (entityType) {
      cw.push(
        "JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.entity_type')) LIKE :entityType",
      );
    }
    cw.push(buildComplianceStatusSql(status));

    parts.push(`
      SELECT
        tal.id AS row_id,
        'compliance' AS src,
        tal.aksi AS act,
        tal.created_at AS evt_at,
        tal.user_id AS actor_id,
        uc.username AS actor_username,
        tal.tenant_id_asal AS tid_asal,
        JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.admin_message')) AS headline,
        JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.correlation_id')) AS correlation_id,
        JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.change_origin')) AS change_origin,
        JSON_UNQUOTE(JSON_EXTRACT(tal.payload, '$.entity_scope')) AS entity_scope,
        tal.payload AS raw_payload,
        NULL AS planning_action_type
      FROM tenant_audit_logs tal
      LEFT JOIN users uc ON uc.id = tal.user_id
      WHERE ${cw.join(" AND ")}
    `);
  }

  if (source === "all" || source === "planning") {
    const pw = [];
    if (!superAdm || filterTenantId) {
      pw.push("(p.changed_by IS NULL OR u.tenant_id = :effectiveTenantIdP)");
      replacements.effectiveTenantIdP = effectiveTenantId;
    }
    if (dateFrom) pw.push("p.changed_at >= :dateFrom");
    if (dateTo) pw.push("p.changed_at <= :dateTo");
    if (action) {
      pw.push(
        "(p.module_name LIKE :actionLikeP OR p.action_type LIKE :actionLikeP OR p.table_name LIKE :actionLikeP)",
      );
      replacements.actionLikeP = `%${action}%`;
    }
    if (userId && Number.isFinite(userId)) pw.push("p.changed_by = :userId");
    if (entityType) {
      pw.push("(p.module_name LIKE :entityType OR p.table_name LIKE :entityType)");
    }
    if (entityScope) {
      pw.push("CONCAT(UPPER(p.table_name), ':', p.record_id) LIKE :entityScope");
    }
    if (correlationId || changeOrigin) {
      pw.push("1=0");
    }
    pw.push(buildPlanningStatusSql(status));

    parts.push(`
      SELECT
        p.id AS row_id,
        'planning' AS src,
        CONCAT(p.module_name, ' · ', p.action_type) AS act,
        p.changed_at AS evt_at,
        p.changed_by AS actor_id,
        u.username AS actor_username,
        u.tenant_id AS tid_asal,
        COALESCE(
          JSON_UNQUOTE(JSON_EXTRACT(p.snapshot, '$.summary')),
          p.change_reason_text,
          CONCAT('Perubahan ', p.table_name, ' #', p.record_id)
        ) AS headline,
        NULL AS correlation_id,
        NULL AS change_origin,
        CONCAT(UPPER(p.table_name), ':', p.record_id) AS entity_scope,
        NULL AS raw_payload,
        p.action_type AS planning_action_type
      FROM planning_audit_events p
      LEFT JOIN users u ON u.id = p.changed_by
      WHERE ${pw.join(" AND ")}
    `);
  }

  if (!parts.length) {
    return { rows: [], total: 0, limit, offset };
  }

  const unionSql = `
    SELECT * FROM (
      ${parts.join(" UNION ALL ")}
    ) AS u
    ORDER BY evt_at DESC
    LIMIT :limit OFFSET :offset
  `;

  const countSql = `
    SELECT COUNT(*) AS c FROM (
      ${parts.join(" UNION ALL ")}
    ) AS cnt
  `;

  const rows = await sequelize.query(unionSql, {
    replacements,
    type: QueryTypes.SELECT,
  });

  const countRepl = { ...replacements };
  delete countRepl.limit;
  delete countRepl.offset;
  const countRows = await sequelize.query(countSql, {
    replacements: countRepl,
    type: QueryTypes.SELECT,
  });
  const total = countRows[0]?.c != null ? Number(countRows[0].c) : 0;

  const normalized = rows.map((r) => {
    let payload = null;
    try {
      if (r.raw_payload != null) {
        payload = typeof r.raw_payload === "string" ? JSON.parse(r.raw_payload) : r.raw_payload;
      }
    } catch {
      payload = null;
    }
    const ui_status =
      r.src === "compliance"
        ? deriveComplianceUiStatus(r.act, payload)
        : derivePlanningUiStatus(r.planning_action_type);
    const record_key = r.src === "compliance" ? `t-${r.row_id}` : `p-${r.row_id}`;
    return {
      record_key,
      source: r.src,
      event_at: r.evt_at,
      action: r.act,
      actor: {
        id: r.actor_id,
        username: r.actor_username || null,
      },
      tenant_id: r.tid_asal != null ? Number(r.tid_asal) : null,
      headline: r.headline || r.act,
      correlation_id: r.correlation_id || null,
      change_origin: r.change_origin || null,
      entity_scope: r.entity_scope || null,
      ui_status,
    };
  });

  return { rows: normalized, total, limit, offset };
}

async function getAuditSummary(req) {
  const q = req.query || {};
  const tenantId = req.tenantId != null ? Number(req.tenantId) : null;
  const superAdm = isSuperAdmin(req.user?.role);
  const filterTenantId =
    superAdm && q.tenant_id != null && String(q.tenant_id).trim() !== ""
      ? Number(q.tenant_id)
      : null;
  const effectiveTenantId = filterTenantId || tenantId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dateFrom = parseDate(q.date_from) || startOfToday;
  const dateTo = parseDate(q.date_to) || new Date();

  const baseRep = { dateFrom, dateTo };
  if (!superAdm || filterTenantId) {
    baseRep.effectiveTenantId = effectiveTenantId;
  }
  const tenantClauseTal =
    !superAdm || filterTenantId
      ? "(tal.tenant_id_asal = :effectiveTenantId OR tal.tenant_id_tujuan = :effectiveTenantId)"
      : "1=1";
  const tenantClauseP =
    !superAdm || filterTenantId
      ? "(p.changed_by IS NULL OR u.tenant_id = :effectiveTenantId)"
      : "1=1";

  const complianceTodaySql = `
    SELECT
      COUNT(*) AS total_rows,
      SUM(CASE WHEN tal.aksi LIKE '%PREVIEW%' THEN 1 ELSE 0 END) AS previews,
      SUM(CASE WHEN tal.aksi LIKE '%REJECTED%' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN JSON_EXTRACT(tal.payload, '$.success') = true AND tal.aksi NOT LIKE '%PREVIEW%' AND tal.aksi NOT LIKE '%REJECTED%' THEN 1 ELSE 0 END) AS commits_ok,
      SUM(CASE WHEN JSON_EXTRACT(tal.payload, '$.success') = false AND tal.aksi NOT LIKE '%REJECTED%' THEN 1 ELSE 0 END) AS failed
    FROM tenant_audit_logs tal
    WHERE ${tenantClauseTal}
      AND tal.created_at >= :dateFrom AND tal.created_at <= :dateTo
      AND tal.aksi IN (${escapeSqlIn(DEFAULT_COMPLIANCE_ACTIONS)})
  `;

  const planningSql = `
    SELECT COUNT(*) AS planning_events
    FROM planning_audit_events p
    LEFT JOIN users u ON u.id = p.changed_by
    WHERE ${tenantClauseP}
      AND p.changed_at >= :dateFrom AND p.changed_at <= :dateTo
  `;

  const topUsersSql = `
    SELECT tal.user_id AS uid, uc.username AS uname, COUNT(*) AS cnt
    FROM tenant_audit_logs tal
    LEFT JOIN users uc ON uc.id = tal.user_id
    WHERE ${tenantClauseTal}
      AND tal.created_at >= :dateFrom AND tal.created_at <= :dateTo
      AND tal.aksi IN (${escapeSqlIn(DEFAULT_COMPLIANCE_ACTIONS)})
      AND tal.user_id IS NOT NULL
    GROUP BY tal.user_id, uc.username
    ORDER BY cnt DESC
    LIMIT 8
  `;

  const [cRow] = await sequelize.query(complianceTodaySql, {
    replacements: baseRep,
    type: QueryTypes.SELECT,
  });
  const [pRow] = await sequelize.query(planningSql, {
    replacements: baseRep,
    type: QueryTypes.SELECT,
  });
  const topUsers = await sequelize.query(topUsersSql, {
    replacements: baseRep,
    type: QueryTypes.SELECT,
  });

  const syncCommitsSql = `
    SELECT COUNT(*) AS c FROM tenant_audit_logs tal
    WHERE ${tenantClauseTal}
      AND tal.created_at >= :dateFrom AND tal.created_at <= :dateTo
      AND tal.aksi = 'RPJMD_RKPD_SYNC_COMMIT'
      AND JSON_EXTRACT(tal.payload, '$.success') = true
  `;
  const backfillSql = `
    SELECT COUNT(*) AS c FROM tenant_audit_logs tal
    WHERE ${tenantClauseTal}
      AND tal.created_at >= :dateFrom AND tal.created_at <= :dateTo
      AND tal.aksi = 'RPJMD_BACKFILL_EXECUTE'
      AND JSON_EXTRACT(tal.payload, '$.success') = true
  `;
  const [syncRow] = await sequelize.query(syncCommitsSql, {
    replacements: baseRep,
    type: QueryTypes.SELECT,
  });
  const [bfRow] = await sequelize.query(backfillSql, {
    replacements: baseRep,
    type: QueryTypes.SELECT,
  });

  return {
    period: { date_from: dateFrom, date_to: dateTo },
    compliance: {
      total_rows: Number(cRow?.total_rows || 0),
      previews: Number(cRow?.previews || 0),
      rejected: Number(cRow?.rejected || 0),
      commits_ok: Number(cRow?.commits_ok || 0),
      failed: Number(cRow?.failed || 0),
      sync_commits_ok: Number(syncRow?.c || 0),
      backfill_execute_ok: Number(bfRow?.c || 0),
    },
    planning: {
      events: Number(pRow?.planning_events || 0),
    },
    top_users_compliance: (topUsers || []).map((u) => ({
      user_id: u.uid,
      username: u.uname,
      count: Number(u.cnt || 0),
    })),
  };
}

function parseCompositeKey(key) {
  const s = String(key || "").trim();
  const m = /^([tp])-(\d+)$/i.exec(s);
  if (!m) return null;
  return { source: m[1].toLowerCase() === "t" ? "compliance" : "planning", id: Number(m[2]) };
}

async function getAuditDetail(req, compositeKey) {
  const parsed = parseCompositeKey(compositeKey);
  if (!parsed) return { ok: false, error: "ID tidak valid (gunakan t-… atau p-…)." };

  if (parsed.source === "compliance") {
    const row = await TenantAuditLog.findByPk(parsed.id, {
      include: [{ model: User, as: "user", attributes: ["id", "username", "email"] }],
    });
    if (!row) return { ok: false, error: "Data tidak ditemukan." };
    const plain = row.toJSON();
    const payload = plain.payload || {};
    const ui_status = deriveComplianceUiStatus(plain.aksi, payload);
    return {
      ok: true,
      data: {
        record_key: `t-${plain.id}`,
        source: "compliance",
        event_at: plain.created_at,
        action: plain.aksi,
        actor: plain.user
          ? { id: plain.user.id, username: plain.user.username, email: plain.user.email }
          : { id: plain.user_id, username: null },
        tenant_id_asal: plain.tenant_id_asal,
        tenant_id_tujuan: plain.tenant_id_tujuan,
        ui_status,
        correlation_id: payload.correlation_id || null,
        change_origin: payload.change_origin || null,
        entity_scope: payload.entity_scope || null,
        entity_type: payload.entity_type || null,
        reason: payload.reason || null,
        admin_message: payload.admin_message || null,
        success: payload.success,
        old_state_summary: payload.old_state_summary ?? null,
        new_state_summary: payload.new_state_summary ?? null,
        request_digest: payload.request_digest ?? null,
        result_compact: payload.result_compact ?? null,
        classification_counts: payload.classification_counts ?? null,
        affected_ids: payload.affected_ids ?? null,
        payload_full: payload,
      },
    };
  }

  const row = await PlanningAuditEvent.findByPk(parsed.id);
  if (!row) return { ok: false, error: "Data tidak ditemukan." };
  const enriched = enrichPlanningAuditRow(row);
  const ui_status = derivePlanningUiStatus(enriched.action_type);
  const actor = enriched.changed_by
    ? await User.findByPk(enriched.changed_by, {
        attributes: ["id", "username", "email", "tenant_id"],
      })
    : null;

  return {
    ok: true,
    data: {
      record_key: `p-${enriched.id}`,
      source: "planning",
      event_at: enriched.changed_at,
      action: `${enriched.module_name} · ${enriched.action_type}`,
      actor: actor
        ? {
            id: actor.id,
            username: actor.username,
            email: actor.email,
            tenant_id: actor.tenant_id,
          }
        : { id: enriched.changed_by, username: null },
      ui_status,
      correlation_id: null,
      change_origin: "planning_document_mutation",
      entity_scope: `${String(enriched.table_name || "").toUpperCase()}:${enriched.record_id}`,
      module_name: enriched.module_name,
      table_name: enriched.table_name,
      record_id: enriched.record_id,
      reason: enriched.change_reason_text || null,
      version_before: enriched.version_before,
      version_after: enriched.version_after,
      snapshot: enriched.normalized || enriched.snapshot || null,
      old_value_compact: enriched.old_value,
      new_value_compact: enriched.new_value,
    },
  };
}

module.exports = {
  DEFAULT_COMPLIANCE_ACTIONS,
  listAuditDashboard,
  getAuditSummary,
  getAuditDetail,
  parseCompositeKey,
  deriveComplianceUiStatus,
  derivePlanningUiStatus,
};
