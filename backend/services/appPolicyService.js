"use strict";

const { Op } = require("sequelize");
const { AppPolicy, SubKegiatan, ComplianceSnapshotHistory } = require("../models");

const OPERATIONAL_MODE_KEY = "operational_mode";
/** Override khusus jalur `sub_kegiatan` (API + clone). Kosong / tidak ada baris = ikut global. */
const OPERATIONAL_MODE_SUB_KEGIATAN_KEY = "operational_mode_sub_kegiatan";

const VALID_OPERATIONAL_MODES = Object.freeze([
  "LEGACY",
  "TRANSITION",
  "MASTER",
]);

const policyCache = new Map();

/** @returns {number} ms; 0 = cache off */
function policyCacheTtlMs() {
  const n = Number(process.env.EPELARA_POLICY_CACHE_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return 10000;
}

function clearPolicyCache() {
  policyCache.clear();
}

function normalizeOperationalModeValue(val) {
  const s = String(val || "").trim().toUpperCase();
  return VALID_OPERATIONAL_MODES.includes(s) ? s : null;
}

/**
 * @param {string} policyKey
 * @returns {Promise<string|null>}
 */
async function getPolicy(policyKey) {
  const key = String(policyKey || "").trim();
  if (!key) return null;

  const ttl = policyCacheTtlMs();
  if (ttl > 0) {
    const hit = policyCache.get(key);
    if (hit && hit.exp > Date.now()) {
      return hit.val;
    }
  }

  const row = await AppPolicy.findOne({
    where: { policy_key: key, is_active: true },
    order: [["updated_at", "DESC"]],
  });
  const val = row ? String(row.policy_value) : null;

  if (ttl > 0) {
    policyCache.set(key, { val, exp: Date.now() + ttl });
  }
  return val;
}

/**
 * @param {string} policyKey
 * @param {string} value
 * @param {number|null|undefined} userId
 */
async function setPolicy(policyKey, value, userId) {
  const key = String(policyKey || "").trim();
  if (!key) {
    throw new Error("policy_key wajib");
  }
  const val = String(value);
  const [row, created] = await AppPolicy.findOrCreate({
    where: { policy_key: key },
    defaults: {
      policy_key: key,
      policy_value: val,
      is_active: true,
      updated_by: userId ?? null,
    },
  });
  if (!created) {
    await row.update({
      policy_value: val,
      is_active: true,
      updated_by: userId ?? null,
    });
  }
  clearPolicyCache();
  return row;
}

/**
 * Hapus baris policy (kembali inherit / default aplikasi).
 * @param {string} policyKey
 */
async function deletePolicyKey(policyKey) {
  const key = String(policyKey || "").trim();
  if (!key) return 0;
  const n = await AppPolicy.destroy({ where: { policy_key: key } });
  clearPolicyCache();
  return n;
}

/**
 * @returns {Promise<'LEGACY'|'TRANSITION'|'MASTER'>}
 */
async function getOperationalMode() {
  const raw = await getPolicy(OPERATIONAL_MODE_KEY);
  const norm = normalizeOperationalModeValue(raw);
  return norm || "LEGACY";
}

/**
 * Mode efektif untuk SubKegiatan (soft launch):
 * 1) `EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN` env (staging)
 * 2) policy `operational_mode_sub_kegiatan`
 * 3) policy global `operational_mode`
 */
async function getEffectiveOperationalModeForSubKegiatan() {
  const env = normalizeOperationalModeValue(
    process.env.EPELARA_OPERATIONAL_MODE_SUB_KEGIATAN,
  );
  if (env) return env;
  const sub = await getPolicy(OPERATIONAL_MODE_SUB_KEGIATAN_KEY);
  const subN = normalizeOperationalModeValue(sub);
  if (subN) return subN;
  return getOperationalMode();
}

/**
 * @param {string} mode
 * @returns {boolean}
 */
function isValidOperationalMode(mode) {
  return normalizeOperationalModeValue(mode) != null;
}

/**
 * Inti agregat snapshot (tanpa histori / trend).
 * @returns {Promise<object>}
 */
async function computeSubKegiatanComplianceSnapshotCore() {
  const sequelize = SubKegiatan.sequelize;
  const rows = await SubKegiatan.findAll({
    attributes: [
      "input_mode",
      [sequelize.fn("COUNT", sequelize.col("SubKegiatan.id")), "count"],
    ],
    group: ["input_mode"],
    raw: true,
  });

  const byMode = { LEGACY: 0, MASTER: 0, other: 0 };
  for (const r of rows) {
    const m = String(r.input_mode == null ? "LEGACY" : r.input_mode).toUpperCase();
    const c = Number(r.count) || 0;
    if (m === "LEGACY") byMode.LEGACY += c;
    else if (m === "MASTER") byMode.MASTER += c;
    else byMode.other += c;
  }

  const invalidMasterRowsMissingFk = await SubKegiatan.count({
    where: {
      input_mode: "MASTER",
      [Op.or]: [
        { master_sub_kegiatan_id: { [Op.is]: null } },
        { regulasi_versi_id: { [Op.is]: null } },
      ],
    },
  });

  const total = byMode.LEGACY + byMode.MASTER + byMode.other;
  const approximateMasterSharePercent =
    total > 0 ? Math.round((byMode.MASTER / total) * 10000) / 100 : 0;

  return {
    generatedAt: new Date().toISOString(),
    operationalMode: await getOperationalMode(),
    effectiveSubKegiatanMode: await getEffectiveOperationalModeForSubKegiatan(),
    subKegiatanCountByInputMode: byMode,
    totalSubKegiatanRows: total,
    approximateMasterSharePercent,
    invalidMasterRowsMissingFk,
    healthFlags: {
      dataIntegrityMasterFk: invalidMasterRowsMissingFk === 0,
    },
  };
}

const TREND_MAX_HOURS = 8760;
const TREND_MAX_ROWS = 500;

/**
 * Snapshot compliance + opsional deret waktu dari `compliance_snapshot_history`.
 * @param {{ trendHours?: number }} [options]
 * @returns {Promise<object>}
 */
async function getSubKegiatanComplianceSnapshot(options = {}) {
  const raw = Number(options.trendHours);
  const trendHours =
    Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), TREND_MAX_HOURS) : 0;

  const base = await computeSubKegiatanComplianceSnapshotCore();
  if (trendHours <= 0) return base;

  const since = new Date(Date.now() - trendHours * 3600 * 1000);
  const rows = await ComplianceSnapshotHistory.findAll({
    where: { captured_at: { [Op.gte]: since } },
    order: [["captured_at", "ASC"]],
    attributes: ["captured_at", "snapshot"],
    limit: TREND_MAX_ROWS,
  });

  const trend = rows.map((r) => {
    const s = r.snapshot && typeof r.snapshot === "object" ? r.snapshot : {};
    return {
      capturedAt:
        r.captured_at instanceof Date
          ? r.captured_at.toISOString()
          : String(r.captured_at),
      approximateMasterSharePercent: s.approximateMasterSharePercent,
      invalidMasterRowsMissingFk: s.invalidMasterRowsMissingFk,
      totalSubKegiatanRows: s.totalSubKegiatanRows,
      effectiveSubKegiatanMode: s.effectiveSubKegiatanMode,
      operationalMode: s.operationalMode,
    };
  });

  return {
    ...base,
    trendMeta: {
      trendHours,
      pointCount: trend.length,
      cappedAtRows: TREND_MAX_ROWS,
    },
    trend,
  };
}

/**
 * Simpan satu titik histori + opsional webhook alert (async, tidak menggagalkan simpan).
 * @param {number|null|undefined} userId
 * @returns {Promise<object>} snapshot yang disimpan
 */
async function recordComplianceSnapshotHistory(userId) {
  const prevRow = await ComplianceSnapshotHistory.findOne({
    order: [["captured_at", "DESC"]],
    attributes: ["snapshot", "captured_at"],
  });

  const snap = await computeSubKegiatanComplianceSnapshotCore();
  await ComplianceSnapshotHistory.create({
    captured_at: new Date(),
    snapshot: snap,
    recorded_by: userId ?? null,
  });

  maybeFireComplianceAlertWebhook(snap, prevRow?.snapshot || null).catch((err) => {
    console.error("[appPolicyService] compliance webhook error", err?.message || err);
  });

  return snap;
}

function complianceWebhookMinInvalid() {
  const n = Number(process.env.EPELARA_COMPLIANCE_ALERT_MIN_INVALID_MASTER);
  if (Number.isFinite(n) && n >= 0) return n;
  return 1;
}

/**
 * POST ke URL (Slack Incoming / n8n / Teams) bila threshold terpenuhi.
 * @param {object} current
 * @param {object|null} previous
 */
async function maybeFireComplianceAlertWebhook(current, previous) {
  const url = String(process.env.EPELARA_COMPLIANCE_ALERT_WEBHOOK_URL || "").trim();
  if (!url) return;

  const minInv = complianceWebhookMinInvalid();
  const invalid = Number(current?.invalidMasterRowsMissingFk) || 0;
  if (invalid < minInv) return;

  const secret = String(process.env.EPELARA_COMPLIANCE_ALERT_WEBHOOK_SECRET || "").trim();
  const body = JSON.stringify({
    event: "compliance.snapshot_recorded",
    generatedAt: current.generatedAt,
    invalidMasterRowsMissingFk: invalid,
    approximateMasterSharePercent: current.approximateMasterSharePercent,
    totalSubKegiatanRows: current.totalSubKegiatanRows,
    effectiveSubKegiatanMode: current.effectiveSubKegiatanMode,
    operationalMode: current.operationalMode,
    previous: previous
      ? {
          generatedAt: previous.generatedAt,
          invalidMasterRowsMissingFk: previous.invalidMasterRowsMissingFk,
          approximateMasterSharePercent: previous.approximateMasterSharePercent,
        }
      : null,
  });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "ePeLARA-compliance/1",
    };
    if (secret) headers["X-Webhook-Secret"] = secret;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: ac.signal,
    });
    if (!res.ok) {
      console.warn(
        "[appPolicyService] compliance webhook non-OK",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  getPolicy,
  setPolicy,
  deletePolicyKey,
  clearPolicyCache,
  getOperationalMode,
  getEffectiveOperationalModeForSubKegiatan,
  isValidOperationalMode,
  normalizeOperationalModeValue,
  OPERATIONAL_MODE_KEY,
  OPERATIONAL_MODE_SUB_KEGIATAN_KEY,
  VALID_OPERATIONAL_MODES,
  computeSubKegiatanComplianceSnapshotCore,
  getSubKegiatanComplianceSnapshot,
  recordComplianceSnapshotHistory,
  maybeFireComplianceAlertWebhook,
};
