"use strict";

/**
 * MR Planning Mitigation Service
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 13D
 *
 * Guard:
 * - Mitigation melekat pada MR Planning Risk.
 * - context_id diturunkan dari risk/context.
 * - risk_analysis_id dan root_cause_id divalidasi jika dikirim.
 * - Field teknis tidak boleh dikirim frontend.
 * - Reference label di-resolve backend dari mr_reference_items.
 * - Risk after mitigation dihitung backend dari risk matrix.
 * - Frontend tidak boleh menghitung score, level, color, appetite.
 * - SPIP/RTP formal tidak dibuat di e-Pelara; linkage diarahkan via e-SIGAP/SPIP.
 */

const {
  sequelize,
  MrPlanningRisk,
  MrPlanningContext,
  MrPlanningRiskAnalysis,
  MrPlanningRootCause,
  MrPlanningMitigation,
  MrReferenceItem,
  MrReferenceGroup,
  MrRiskMatrix,
} = require("../../models");

const MATRIX_CODE = "MR_5X5_DEFAULT";

const ERROR_CODE = "MR_MITIGATION_VALIDATION_ERROR";

const MITIGATION_ALLOWED_FIELDS = Object.freeze([
  "risk_analysis_id",
  "root_cause_id",

  "uraian_mitigasi",
  "jenis_mitigasi",

  "respon_risiko_ref_id",

  "unsur_spip_ref_id",
  "sub_unsur_spip_ref_id",
  "output_rtp_ref_id",

  "kegiatan_pengendalian",
  "target_output",
  "indikator_keluaran",
  "target_keluaran",
  "satuan_keluaran",

  "target_tanggal",
  "tanggal_mulai",
  "tanggal_selesai",
  "target_waktu_mulai",
  "target_waktu_selesai",

  "risk_after_mitigation_likelihood_ref_id",
  "risk_after_mitigation_impact_ref_id",

  "requires_spip_rtp",

  "penanggung_jawab",
  "status_mitigasi",
  "progress_persen",
  "kendala",
  "tindak_lanjut",

  "alasan_revisi",
]);

const MITIGATION_BLOCKED_FIELDS = Object.freeze([
  "id",
  "mr_planning_risk_id",
  "context_id",

  "respon_risiko",
  "unsur_spip",
  "sub_unsur_spip",
  "output_rtp",

  "risk_after_mitigation_likelihood",
  "risk_after_mitigation_impact",
  "risk_after_mitigation_score",
  "risk_after_mitigation_level_ref_id",
  "risk_after_mitigation_level",
  "risk_after_mitigation_color",
  "is_above_appetite_after_mitigation",

  "spip_link_status",
  "linked_spip_rtp_id",
  "linked_spip_monitoring_id",
  "linked_spip_evidence_id",
  "cross_system_link_id",

  "owner_user_id",
  "owner_division_id",

  "versi",
  "status_revisi",
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

  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

const createValidationError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const createNotFoundError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const toPlain = (record) => {
  if (!record) return null;
  if (typeof record.get === "function") return record.get({ plain: true });
  return record;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (Number(value) === 1) return true;
  if (Number(value) === 0) return false;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return defaultValue;
};

const normalizeDecimal = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw createValidationError("Nilai numerik tidak valid.", {
      value,
    });
  }

  return parsed;
};

const assertAllowedFields = (body = {}) => {
  const fields = Object.keys(body || {});
  const blocked = fields.filter((field) => MITIGATION_BLOCKED_FIELDS.includes(field));
  const unknown = fields.filter(
    (field) =>
      !MITIGATION_ALLOWED_FIELDS.includes(field) &&
      !MITIGATION_BLOCKED_FIELDS.includes(field)
  );

  if (blocked.length > 0) {
    throw createValidationError("Field tidak diperbolehkan.", {
      fields: blocked,
    });
  }

  if (unknown.length > 0) {
    throw createValidationError("Field tidak dikenal.", {
      fields: unknown,
    });
  }
};

const pickAllowedFields = (body = {}) => {
  return MITIGATION_ALLOWED_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }

    return payload;
  }, {});
};

const requireBusinessFieldsForCreate = (payload = {}) => {
  const missing = [];

  if (!payload.uraian_mitigasi) missing.push("uraian_mitigasi");

  if (missing.length > 0) {
    throw createValidationError("Field wajib belum lengkap.", {
      fields: missing,
    });
  }
};

const getRiskWithContext = async (riskId, transaction = null) => {
  const risk = await MrPlanningRisk.findByPk(riskId, {
    transaction,
    include: [
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
  });

  if (!risk) {
    throw createNotFoundError("MR Planning Risk tidak ditemukan.", {
      mr_planning_risk_id: riskId,
    });
  }

  return risk;
};

const ensureAnalysisBelongsToRisk = async ({
  riskAnalysisId,
  riskId,
  transaction = null,
}) => {
  if (!riskAnalysisId) return null;

  const analysis = await MrPlanningRiskAnalysis.findByPk(riskAnalysisId, {
    transaction,
  });

  if (!analysis) {
    throw createNotFoundError("MR Planning Risk Analysis tidak ditemukan.", {
      risk_analysis_id: riskAnalysisId,
    });
  }

  if (Number(analysis.mr_planning_risk_id) !== Number(riskId)) {
    throw createValidationError("MR Planning Risk Analysis tidak sesuai dengan risk.", {
      risk_analysis_id: riskAnalysisId,
      expected_mr_planning_risk_id: Number(riskId),
      actual_mr_planning_risk_id: Number(analysis.mr_planning_risk_id),
    });
  }

  return analysis;
};

const ensureRootCauseBelongsToRisk = async ({
  rootCauseId,
  riskId,
  riskAnalysisId = null,
  transaction = null,
}) => {
  if (!rootCauseId) return null;

  const rootCause = await MrPlanningRootCause.findByPk(rootCauseId, {
    transaction,
  });

  if (!rootCause) {
    throw createNotFoundError("MR Planning Root Cause tidak ditemukan.", {
      root_cause_id: rootCauseId,
    });
  }

  if (Number(rootCause.mr_planning_risk_id) !== Number(riskId)) {
    throw createValidationError("MR Planning Root Cause tidak sesuai dengan risk.", {
      root_cause_id: rootCauseId,
      expected_mr_planning_risk_id: Number(riskId),
      actual_mr_planning_risk_id: Number(rootCause.mr_planning_risk_id),
    });
  }

  if (
    riskAnalysisId &&
    rootCause.mr_planning_risk_analysis_id &&
    Number(rootCause.mr_planning_risk_analysis_id) !== Number(riskAnalysisId)
  ) {
    throw createValidationError(
      "MR Planning Root Cause tidak sesuai dengan risk analysis.",
      {
        root_cause_id: rootCauseId,
        risk_analysis_id: riskAnalysisId,
        actual_mr_planning_risk_analysis_id: Number(
          rootCause.mr_planning_risk_analysis_id
        ),
      }
    );
  }

  return rootCause;
};

const getReferenceItemWithGroup = async ({
  refId,
  field,
  expectedGroups,
  required = false,
  transaction = null,
}) => {
  if (!refId) {
    if (required) {
      throw createValidationError("Reference wajib diisi.", {
        field,
      });
    }

    return null;
  }

  const item = await MrReferenceItem.findByPk(refId, {
    transaction,
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: true,
      },
    ],
  });

  if (!item) {
    throw createNotFoundError("Reference item tidak ditemukan.", {
      field,
      reference_id: refId,
    });
  }

  const plain = toPlain(item);
  const kodeGroup = plain?.group?.kode_group;

  if (!expectedGroups.includes(kodeGroup)) {
    throw createValidationError("Reference item tidak sesuai group yang diizinkan.", {
      field,
      reference_id: refId,
      kode_group: kodeGroup,
      expected_groups: expectedGroups,
    });
  }

  if (plain.is_active === false || Number(plain.is_active) === 0) {
    throw createValidationError("Reference item tidak aktif.", {
      field,
      reference_id: refId,
      kode_group: kodeGroup,
    });
  }

  return plain;
};

const resolveReferenceLabels = async ({ payload, transaction = null }) => {
  const result = { ...payload };

  const respon = await getReferenceItemWithGroup({
    refId: payload.respon_risiko_ref_id,
    field: "respon_risiko_ref_id",
    expectedGroups: ["MITIGATION_RESPONSE"],
    transaction,
  });

  if (respon) {
    result.respon_risiko = respon.nama_item;
  }

  const unsur = await getReferenceItemWithGroup({
    refId: payload.unsur_spip_ref_id,
    field: "unsur_spip_ref_id",
    expectedGroups: ["SPIP_ELEMENT"],
    transaction,
  });

  if (unsur) {
    result.unsur_spip = unsur.nama_item;
  }

  const subUnsur = await getReferenceItemWithGroup({
    refId: payload.sub_unsur_spip_ref_id,
    field: "sub_unsur_spip_ref_id",
    expectedGroups: ["SPIP_SUB_ELEMENT"],
    transaction,
  });

  if (subUnsur) {
    result.sub_unsur_spip = subUnsur.nama_item;
  }

  const outputRtp = await getReferenceItemWithGroup({
    refId: payload.output_rtp_ref_id,
    field: "output_rtp_ref_id",
    expectedGroups: ["RTP_OUTPUT"],
    transaction,
  });

  if (outputRtp) {
    result.output_rtp = outputRtp.nama_item;
  }

  return result;
};

const resolveRiskAfterMitigation = async ({ payload, transaction = null }) => {
  const likelihoodRefId = payload.risk_after_mitigation_likelihood_ref_id;
  const impactRefId = payload.risk_after_mitigation_impact_ref_id;

  if (!likelihoodRefId && !impactRefId) {
    return { ...payload };
  }

  if (!likelihoodRefId || !impactRefId) {
    throw createValidationError(
      "Likelihood dan impact setelah mitigasi wajib dikirim berpasangan.",
      {
        risk_after_mitigation_likelihood_ref_id: likelihoodRefId || null,
        risk_after_mitigation_impact_ref_id: impactRefId || null,
      }
    );
  }

  const likelihood = await getReferenceItemWithGroup({
    refId: likelihoodRefId,
    field: "risk_after_mitigation_likelihood_ref_id",
    expectedGroups: ["LIKELIHOOD"],
    required: true,
    transaction,
  });

  const impact = await getReferenceItemWithGroup({
    refId: impactRefId,
    field: "risk_after_mitigation_impact_ref_id",
    expectedGroups: ["IMPACT"],
    required: true,
    transaction,
  });

  const matrix = await MrRiskMatrix.findOne({
    where: {
      matrix_code: MATRIX_CODE,
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
    },
    transaction,
  });

  if (!matrix) {
    throw createValidationError("Risk matrix setelah mitigasi tidak ditemukan.", {
      matrix_code: MATRIX_CODE,
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
    });
  }

  const plainMatrix = toPlain(matrix);

  return {
    ...payload,
    risk_after_mitigation_likelihood: normalizeDecimal(likelihood.nilai_numeric),
    risk_after_mitigation_impact: normalizeDecimal(impact.nilai_numeric),
    risk_after_mitigation_score: normalizeDecimal(plainMatrix.score),
    risk_after_mitigation_level_ref_id: plainMatrix.level_risiko_ref_id,
    risk_after_mitigation_level: plainMatrix.level_risiko,
    risk_after_mitigation_color: plainMatrix.warna || plainMatrix.color || null,
    is_above_appetite_after_mitigation: normalizeBoolean(
      plainMatrix.is_above_appetite,
      false
    ),
  };
};

const buildSpipLinkStatus = (payload = {}) => {
  const requiresSpipRtp = normalizeBoolean(payload.requires_spip_rtp, false);

  if (requiresSpipRtp) {
    return "pending_link";
  }

  return "not_required";
};

const buildSystemFieldsFromRisk = ({ risk, userId }) => {
  const plainRisk = toPlain(risk);

  return {
    context_id: plainRisk.context_id || null,
    owner_user_id: plainRisk.owner_user_id || userId || null,
    owner_division_id: plainRisk.owner_division_id || null,
  };
};

const buildCreatePayload = async ({
  risk,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  let payload = pickAllowedFields(body);
  requireBusinessFieldsForCreate(payload);

  await ensureAnalysisBelongsToRisk({
    riskAnalysisId: payload.risk_analysis_id,
    riskId: risk.id,
    transaction,
  });

  await ensureRootCauseBelongsToRisk({
    rootCauseId: payload.root_cause_id,
    riskId: risk.id,
    riskAnalysisId: payload.risk_analysis_id,
    transaction,
  });

  payload = await resolveReferenceLabels({ payload, transaction });
  payload = await resolveRiskAfterMitigation({ payload, transaction });

  const systemFields = buildSystemFieldsFromRisk({ risk, userId });

  return {
    ...payload,
    ...systemFields,

    mr_planning_risk_id: risk.id,
    requires_spip_rtp: normalizeBoolean(payload.requires_spip_rtp, false),
    spip_link_status: buildSpipLinkStatus(payload),

    progress_persen: normalizeDecimal(payload.progress_persen, 0),
    status_mitigasi: payload.status_mitigasi || "draft",

    versi: 1,
    status_revisi: "draft",
    dibuat_oleh: userId || null,
    dibuat_pada: new Date(),
    created_by: userId || null,
    updated_by: userId || null,
  };
};

const buildUpdatePayload = async ({
  mitigation,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  if (mitigation.status_revisi !== "draft") {
    throw createValidationError("Mitigation hanya bisa diubah saat status draft.", {
      current_status: mitigation.status_revisi,
    });
  }

  let payload = pickAllowedFields(body);

  await ensureAnalysisBelongsToRisk({
    riskAnalysisId: payload.risk_analysis_id,
    riskId: mitigation.mr_planning_risk_id,
    transaction,
  });

  await ensureRootCauseBelongsToRisk({
    rootCauseId: payload.root_cause_id,
    riskId: mitigation.mr_planning_risk_id,
    riskAnalysisId: payload.risk_analysis_id || mitigation.risk_analysis_id,
    transaction,
  });

  payload = await resolveReferenceLabels({ payload, transaction });
  payload = await resolveRiskAfterMitigation({ payload, transaction });

  const finalPayload = {
    ...payload,
    updated_by: userId || null,
    last_revised_by: userId || null,
    last_revised_at: new Date(),
  };

  if (Object.prototype.hasOwnProperty.call(payload, "requires_spip_rtp")) {
    finalPayload.requires_spip_rtp = normalizeBoolean(payload.requires_spip_rtp, false);
    finalPayload.spip_link_status = buildSpipLinkStatus(payload);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "progress_persen")) {
    finalPayload.progress_persen = normalizeDecimal(payload.progress_persen, 0);
  }

  return finalPayload;
};

const mitigationInclude = () => [
  {
    model: MrPlanningRisk,
    as: "risk",
    required: false,
  },
  {
    model: MrPlanningContext,
    as: "context",
    required: false,
  },
  {
    model: MrPlanningRiskAnalysis,
    as: "analysis",
    required: false,
  },
  {
    model: MrPlanningRootCause,
    as: "root_cause",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "respon_risiko_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "unsur_spip_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "sub_unsur_spip_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "output_rtp_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "risk_after_likelihood_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "risk_after_impact_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "risk_after_level_ref",
    required: false,
  },
];

const createMitigationFromRisk = async ({ riskId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const risk = await getRiskWithContext(riskId, transaction);

    const payload = await buildCreatePayload({
      risk,
      body,
      userId,
      transaction,
    });

    const created = await MrPlanningMitigation.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getMitigationDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateDraftMitigation = async ({ id, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const mitigation = await MrPlanningMitigation.findByPk(id, {
      transaction,
    });

    if (!mitigation) {
      throw createNotFoundError("MR Planning Mitigation tidak ditemukan.", {
        id,
      });
    }

    const payload = await buildUpdatePayload({
      mitigation,
      body,
      userId,
      transaction,
    });

    await mitigation.update(payload, {
      transaction,
    });

    await transaction.commit();

    return getMitigationDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const cancelDraftMitigation = async ({ id, body = {}, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const mitigation = await MrPlanningMitigation.findByPk(id, {
      transaction,
    });

    if (!mitigation) {
      throw createNotFoundError("Rencana Tindak Pengendalian tidak ditemukan.", {
        id,
      });
    }

    if (mitigation.is_active === false || Number(mitigation.is_active) === 0) {
      throw createValidationError(
        "Draft Rencana Tindak Pengendalian sudah dibatalkan sebelumnya.",
        {
          id,
          is_active: mitigation.is_active,
        }
      );
    }

    if (String(mitigation.status_revisi || "").toLowerCase() !== "draft") {
      throw createValidationError(
        "Rencana Tindak Pengendalian hanya dapat dibatalkan saat berstatus Draft.",
        {
          id,
          current_status: mitigation.status_revisi,
        }
      );
    }

    const alasanRevisi =
      body?.alasan_revisi ||
      body?.alasan_pembatalan ||
      "Draft Rencana Tindak Pengendalian dibatalkan oleh pengguna.";

    await mitigation.update(
      {
        is_active: false,
        alasan_revisi: alasanRevisi,
        updated_by: userId || null,
        last_revised_by: userId || null,
        last_revised_at: new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    return getMitigationDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getMitigationDetail = async (id) => {
  const mitigation = await MrPlanningMitigation.findByPk(id, {
    include: mitigationInclude(),
  });

  if (!mitigation) {
    throw createNotFoundError("MR Planning Mitigation tidak ditemukan.", {
      id,
    });
  }

  return mitigation;
};

const getMitigationsByRisk = async (riskId) => {
  return MrPlanningMitigation.findAll({
    where: {
      mr_planning_risk_id: riskId,
      is_active: true,
    },
    include: mitigationInclude(),
    order: [["id", "ASC"]],
  });
};

module.exports = {
  ERROR_CODE,
  MATRIX_CODE,

  MITIGATION_ALLOWED_FIELDS,
  MITIGATION_BLOCKED_FIELDS,

  createValidationError,
  createNotFoundError,

  getRiskWithContext,
  ensureAnalysisBelongsToRisk,
  ensureRootCauseBelongsToRisk,
  getReferenceItemWithGroup,
  resolveReferenceLabels,
  resolveRiskAfterMitigation,
  buildSystemFieldsFromRisk,
  buildCreatePayload,
  buildUpdatePayload,
  mitigationInclude,

  createMitigationFromRisk,
  updateDraftMitigation,
  cancelDraftMitigation,
  getMitigationDetail,
  getMitigationsByRisk,
};