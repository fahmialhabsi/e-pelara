"use strict";

/**
 * MR Planning Root Cause Service
 *
 * Guard:
 * - Service ini adalah fondasi backend untuk Root Cause MR Planning.
 * - Frontend hanya boleh mengirim field bisnis.
 * - Field teknis, context, periode, owner, workflow, audit, label reference,
 *   dan kode_penyebab wajib diisi backend.
 * - Root Cause wajib melekat ke MR Planning Risk.
 * - Jika mr_planning_risk_analysis_id dikirim, analysis harus milik risk yang sama.
 * - Lookup reference wajib memakai mr_reference_items dan divalidasi berdasarkan group.
 * - Jangan hardcode ID angka reference item.
 */

const {
  MrPlanningRisk,
  MrPlanningRiskAnalysis,
  MrPlanningRootCause,
  MrPlanningContext,
  MrReferenceGroup,
  MrReferenceItem,
} = require("../../models");

const ALLOWED_CREATE_UPDATE_FIELDS = new Set([
  "mr_planning_risk_analysis_id",
  "jenis_penyebab_ref_id",
  "kategori_penyebab_ref_id",
  "uraian_penyebab",
  "why_1",
  "why_2",
  "why_3",
  "why_4",
  "why_5",
  "akar_penyebab",
  "rekomendasi_pengendalian",
  "prioritas_penyebab",
  "is_mitigation_required",
  "alasan_revisi",
]);

const BLOCKED_TECHNICAL_FIELDS = new Set([
  "id",
  "mr_planning_risk_id",
  "mr_planning_context_id",
  "periode_id",
  "tahun",
  "periode_type",
  "periode_label",
  "periode_awal",
  "periode_akhir",

  "kode_penyebab",
  "jenis_penyebab",
  "kategori_penyebab",
  "mitigation_status",

  "owner_user_id",
  "owner_division_id",

  "status_revisi",
  "versi",
  "last_revised_at",
  "last_revised_by",
  "dibuat_oleh",
  "diverifikasi_oleh",
  "disetujui_oleh",
  "ditolak_oleh",
  "dibuat_pada",
  "diverifikasi_pada",
  "disetujui_pada",
  "ditolak_pada",

  "is_primary",
  "is_active",
  "is_latest",
  "metadata_json",

  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

class MrPlanningRootCauseServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningRootCauseServiceError";
    this.statusCode = options.statusCode || 400;
    this.code = options.code || "MR_ROOT_CAUSE_VALIDATION_ERROR";
    this.blocked = options.blocked !== undefined ? options.blocked : true;
    this.details = options.details || {};
  }
}

const throwValidation = (message, details = {}) => {
  throw new MrPlanningRootCauseServiceError(message, {
    statusCode: 400,
    code: "MR_ROOT_CAUSE_VALIDATION_ERROR",
    blocked: true,
    details,
  });
};

const toBoolean = (value, fallback = true) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "ya", "y"].includes(normalized)) return true;
    if (["false", "no", "tidak", "n"].includes(normalized)) return false;
  }
  return fallback;
};

const toInteger = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.trunc(numberValue);
};

const pickAllowedFields = (body = {}) => {
  const payload = {};
  const blocked = [];

  Object.keys(body || {}).forEach((key) => {
    if (ALLOWED_CREATE_UPDATE_FIELDS.has(key)) {
      payload[key] = body[key];
      return;
    }

    if (BLOCKED_TECHNICAL_FIELDS.has(key) || !ALLOWED_CREATE_UPDATE_FIELDS.has(key)) {
      blocked.push(key);
    }
  });

  if (blocked.length > 0) {
    throwValidation("Field tidak diperbolehkan.", {
      fields: blocked,
    });
  }

  return payload;
};

const resolveReferenceLabel = async (id, options = {}) => {
  if (!id) return null;

  const item = await MrReferenceItem.findByPk(id, {
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: false,
      },
    ],
    ...options,
  });

  if (!item) {
    throwValidation("Reference item tidak ditemukan.", {
      reference_id: id,
    });
  }

  return {
    id: item.id,
    group_id: item.group_id,
    kode_group: item.group?.kode_group || item.metadata_json?.kode_group || null,
    nama_group: item.group?.nama_group || null,
    kode_item: item.kode_item,
    label: item.nama_item || item.nilai_text || item.kode_item,
    deskripsi: item.deskripsi || null,
    nilai_text: item.nilai_text || null,
    warna: item.warna || null,
    is_active: Boolean(item.is_active),
  };
};

const ensureReferenceGroup = (ref, expectedGroups = [], fieldName = "reference") => {
  const groups = Array.isArray(expectedGroups) ? expectedGroups : [expectedGroups];

  if (!ref) {
    throwValidation("Reference item wajib diisi.", {
      field: fieldName,
    });
  }

  if (!ref.is_active) {
    throwValidation("Reference item tidak aktif.", {
      field: fieldName,
      reference_id: ref.id,
      kode_item: ref.kode_item,
    });
  }

  if (!groups.includes(ref.kode_group)) {
    throwValidation("Reference item tidak sesuai group yang diizinkan.", {
      field: fieldName,
      reference_id: ref.id,
      kode_group: ref.kode_group,
      expected_groups: groups,
    });
  }

  return ref;
};

const generateKodePenyebab = async ({ riskId, transaction } = {}) => {
  const total = await MrPlanningRootCause.count({
    where: {
      mr_planning_risk_id: riskId,
    },
    transaction,
  });

  return `RC-${String(riskId).padStart(4, "0")}-${String(total + 1).padStart(3, "0")}`;
};

const getRiskWithContext = async (riskId, options = {}) => {
  const risk = await MrPlanningRisk.findByPk(riskId, {
    include: [
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
    ...options,
  });

  if (!risk) {
    throwValidation("MR Planning Risk tidak ditemukan.", {
      mr_planning_risk_id: riskId,
    });
  }

  return risk;
};

const ensureAnalysisBelongsToRisk = async ({
  analysisId,
  riskId,
  transaction,
} = {}) => {
  if (!analysisId) return null;

  const analysis = await MrPlanningRiskAnalysis.findByPk(analysisId, {
    transaction,
  });

  if (!analysis) {
    throwValidation("MR Planning Risk Analysis tidak ditemukan.", {
      mr_planning_risk_analysis_id: analysisId,
    });
  }

  if (Number(analysis.mr_planning_risk_id) !== Number(riskId)) {
    throwValidation("MR Planning Risk Analysis tidak sesuai dengan Risk.", {
      mr_planning_risk_id: riskId,
      mr_planning_risk_analysis_id: analysisId,
      analysis_risk_id: analysis.mr_planning_risk_id,
    });
  }

  return analysis;
};

const buildSystemFieldsFromRisk = async ({
  risk,
  analysis = null,
  userId,
  transaction,
} = {}) => {
  const context = risk.context || null;

  return {
    mr_planning_risk_id: risk.id,
    mr_planning_risk_analysis_id: analysis?.id || null,
    mr_planning_context_id: risk.context_id || context?.id || null,

    periode_id: risk.periode_id || context?.periode_id || null,
    tahun: risk.tahun || context?.tahun || null,
    periode_type: context?.periode_type || "tahunan",
    periode_label: context?.periode_label || null,
    periode_awal: context?.periode_awal || null,
    periode_akhir: context?.periode_akhir || null,

    kode_penyebab: await generateKodePenyebab({
      riskId: risk.id,
      transaction,
    }),

    owner_user_id: risk.owner_user_id || context?.owner_user_id || userId || null,
    owner_division_id: risk.owner_division_id || context?.owner_division_id || null,

    status_revisi: "draft",
    versi: 1,
    dibuat_oleh: userId || null,
    dibuat_pada: new Date(),
    created_by: userId || null,
    updated_by: userId || null,

    is_primary: false,
    is_active: true,
    is_latest: true,
  };
};

const resolveLabelsForPayload = async (payload = {}, options = {}) => {
  const resolved = { ...payload };

  if (payload.jenis_penyebab_ref_id) {
    const ref = await resolveReferenceLabel(payload.jenis_penyebab_ref_id, options);

    ensureReferenceGroup(
      ref,
      ["ROOT_CAUSE_CATEGORY"],
      "jenis_penyebab_ref_id"
    );

    resolved.jenis_penyebab = ref.label || null;
  }

  if (payload.kategori_penyebab_ref_id) {
    const ref = await resolveReferenceLabel(
      payload.kategori_penyebab_ref_id,
      options
    );

    ensureReferenceGroup(
      ref,
      ["ROOT_CAUSE_CATEGORY"],
      "kategori_penyebab_ref_id"
    );

    resolved.kategori_penyebab = ref.label || null;
  }

  return resolved;
};

const normalizeBusinessPayload = (payload = {}) => {
  const normalized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(normalized, "prioritas_penyebab")) {
    normalized.prioritas_penyebab = toInteger(normalized.prioritas_penyebab, 0);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "is_mitigation_required")) {
    normalized.is_mitigation_required = toBoolean(
      normalized.is_mitigation_required,
      true
    );
  }

  return normalized;
};

const ensureDraftRootCause = (rootCause) => {
  if (!rootCause) return;

  if (rootCause.status_revisi !== "draft") {
    throwValidation("Root Cause hanya bisa diubah saat status draft.", {
      current_status: rootCause.status_revisi,
    });
  }
};

const createRootCauseFromRisk = async ({
  riskId,
  body = {},
  userId,
  transaction,
} = {}) => {
  if (!riskId) {
    throwValidation("riskId wajib diisi.");
  }

  const allowedPayload = pickAllowedFields(body);
  const normalizedPayload = normalizeBusinessPayload(allowedPayload);

  const risk = await getRiskWithContext(riskId, { transaction });

  const analysis = await ensureAnalysisBelongsToRisk({
    analysisId: normalizedPayload.mr_planning_risk_analysis_id,
    riskId,
    transaction,
  });

  const systemPayload = await buildSystemFieldsFromRisk({
    risk,
    analysis,
    userId,
    transaction,
  });

  const labelPayload = await resolveLabelsForPayload(normalizedPayload, {
    transaction,
  });

  return MrPlanningRootCause.create(
    {
      ...systemPayload,
      ...labelPayload,
      mitigation_status: labelPayload.is_mitigation_required === false
        ? "not_required"
        : "pending",
    },
    { transaction }
  );
};

const updateDraftRootCause = async ({
  rootCauseId,
  body = {},
  userId,
  transaction,
} = {}) => {
  if (!rootCauseId) {
    throwValidation("rootCauseId wajib diisi.");
  }

  const rootCause = await MrPlanningRootCause.findByPk(rootCauseId, {
    transaction,
  });

  if (!rootCause) {
    throwValidation("MR Planning Root Cause tidak ditemukan.", {
      id: rootCauseId,
    });
  }

  ensureDraftRootCause(rootCause);

  const allowedPayload = pickAllowedFields(body);
  const normalizedPayload = normalizeBusinessPayload(allowedPayload);

  let analysis = null;

  if (normalizedPayload.mr_planning_risk_analysis_id) {
    analysis = await ensureAnalysisBelongsToRisk({
      analysisId: normalizedPayload.mr_planning_risk_analysis_id,
      riskId: rootCause.mr_planning_risk_id,
      transaction,
    });
  }

  const mergedPayload = {
    ...rootCause.get({ plain: true }),
    ...normalizedPayload,
    mr_planning_risk_analysis_id:
      normalizedPayload.mr_planning_risk_analysis_id ||
      rootCause.mr_planning_risk_analysis_id ||
      analysis?.id ||
      null,
  };

  const labelPayload = await resolveLabelsForPayload(mergedPayload, {
    transaction,
  });

  const mitigationRequired = toBoolean(
    labelPayload.is_mitigation_required,
    true
  );

  await rootCause.update(
    {
      ...labelPayload,
      is_mitigation_required: mitigationRequired,
      mitigation_status: mitigationRequired ? "pending" : "not_required",
      alasan_revisi: allowedPayload.alasan_revisi || rootCause.alasan_revisi,
      last_revised_at: new Date(),
      last_revised_by: userId || null,
      updated_by: userId || null,
    },
    { transaction }
  );

  return getRootCauseDetail(rootCause.id, { transaction });
};

const getRootCauseDetail = async (rootCauseId, options = {}) => {
  if (!rootCauseId) {
    throwValidation("rootCauseId wajib diisi.");
  }

  const rootCause = await MrPlanningRootCause.findByPk(rootCauseId, {
    include: [
      {
        model: MrPlanningRisk,
        as: "risk",
        required: false,
      },
      {
        model: MrPlanningRiskAnalysis,
        as: "analysis",
        required: false,
      },
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "jenis_penyebab_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "kategori_penyebab_ref",
        required: false,
      },
    ],
    ...options,
  });

  if (!rootCause) {
    throwValidation("MR Planning Root Cause tidak ditemukan.", {
      id: rootCauseId,
    });
  }

  return rootCause;
};

const getRootCausesByRisk = async (riskId, options = {}) => {
  if (!riskId) {
    throwValidation("riskId wajib diisi.");
  }

  return MrPlanningRootCause.findAll({
    where: {
      mr_planning_risk_id: riskId,
      is_active: true,
    },
    order: [
      ["is_primary", "DESC"],
      ["prioritas_penyebab", "ASC"],
      ["id", "DESC"],
    ],
    ...options,
  });
};

module.exports = {
  MrPlanningRootCauseServiceError,
  ALLOWED_CREATE_UPDATE_FIELDS,
  BLOCKED_TECHNICAL_FIELDS,
  createRootCauseFromRisk,
  updateDraftRootCause,
  getRootCauseDetail,
  getRootCausesByRisk,
};