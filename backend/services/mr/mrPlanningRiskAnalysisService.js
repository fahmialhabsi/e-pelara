"use strict";

/**
 * MR Planning Risk Analysis Service
 *
 * Guard:
 * - Service ini adalah fondasi backend untuk existing control, inherent risk,
 *   residual risk, dan appetite analysis.
 * - Frontend hanya boleh mengirim field bisnis/reference id.
 * - Field teknis, score, level, color, context, owner, workflow, dan audit
 *   wajib diisi backend.
 * - Lookup reference wajib memakai mr_reference_items.
 * - Lookup matrix wajib memakai mr_risk_matrix.
 * - Jangan hardcode ID angka reference item.
 */

const {
  MrPlanningRisk,
  MrPlanningRiskAnalysis,
  MrPlanningContext,
  MrReferenceGroup,
  MrReferenceItem,
  MrRiskMatrix,
} = require("../../models");

const ALLOWED_CREATE_UPDATE_FIELDS = new Set([
  "existing_control_status_ref_id",
  "existing_control_description",
  "control_adequacy_ref_id",
  "control_adequacy_note",
  "inherent_likelihood_ref_id",
  "inherent_impact_ref_id",
  "residual_likelihood_ref_id",
  "residual_impact_ref_id",
  "selera_risiko_ref_id",
  "analysis_note",
  "rekomendasi",
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

  "existing_control_status",
  "control_adequacy_status",

  "inherent_likelihood",
  "inherent_impact",
  "inherent_score",
  "inherent_level_ref_id",
  "inherent_level",
  "inherent_color",

  "residual_likelihood",
  "residual_impact",
  "residual_score",
  "residual_level_ref_id",
  "residual_level",
  "residual_color",

  "selera_risiko",
  "appetite_threshold",
  "is_above_appetite",
  "matrix_code",
  "metadata_json",

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
  "is_active",
  "is_latest",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

class MrPlanningRiskAnalysisServiceError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MrPlanningRiskAnalysisServiceError";
    this.statusCode = options.statusCode || 400;
    this.code = options.code || "MR_ANALYSIS_VALIDATION_ERROR";
    this.blocked = options.blocked !== undefined ? options.blocked : true;
    this.details = options.details || {};
  }
}

const throwValidation = (message, details = {}) => {
  throw new MrPlanningRiskAnalysisServiceError(message, {
    statusCode: 400,
    code: "MR_ANALYSIS_VALIDATION_ERROR",
    blocked: true,
    details,
  });
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
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

const getReferenceItem = async (id, options = {}) => {
  if (!id) return null;

  const item = await MrReferenceItem.findByPk(id, options);

  if (!item) {
    throwValidation("Reference item tidak ditemukan.", {
      reference_id: id,
    });
  }

  return item;
};

const resolveReferenceLabel = async (id, options = {}) => {
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
    kode_group: item.group?.kode_group || null,
    nama_group: item.group?.nama_group || null,
    parent_item_id: item.parent_item_id || null,
    kode_item: item.kode_item,
    label: item.nama_item || item.nilai_text || item.kode_item,
    deskripsi: item.deskripsi || null,
    nilai: toNumber(item.nilai_numeric, null),
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

const findRiskMatrix = async ({ likelihoodRefId, impactRefId }, options = {}) => {
  if (!likelihoodRefId || !impactRefId) return null;

  const matrix = await MrRiskMatrix.findOne({
    where: {
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
      matrix_code: "MR_5X5_DEFAULT",
    },
    ...options,
  });

  if (!matrix) {
    throwValidation("Risk matrix tidak ditemukan untuk kombinasi likelihood dan impact.", {
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
      matrix_code: "MR_5X5_DEFAULT",
    });
  }

  return matrix;
};

const buildMatrixPayload = async ({
  prefix,
  likelihoodRefId,
  impactRefId,
}, options = {}) => {
  if (!likelihoodRefId || !impactRefId) {
    return {};
  }

  const likelihoodRef = await resolveReferenceLabel(likelihoodRefId, options);
  const impactRef = await resolveReferenceLabel(impactRefId, options);

  ensureReferenceGroup(
    likelihoodRef,
    "LIKELIHOOD",
    `${prefix}_likelihood_ref_id`
  );

  ensureReferenceGroup(
    impactRef,
    "IMPACT",
    `${prefix}_impact_ref_id`
  );

  const matrix = await findRiskMatrix(
    {
      likelihoodRefId,
      impactRefId,
    },
    options
  );

  return {
    [`${prefix}_likelihood`]: toNumber(likelihoodRef.nilai, 0),
    [`${prefix}_impact`]: toNumber(impactRef.nilai, 0),
    [`${prefix}_score`]: toNumber(matrix?.score, 0),
    [`${prefix}_level_ref_id`]: matrix?.level_risiko_ref_id || null,
    [`${prefix}_level`]: matrix?.level_risiko || null,
    [`${prefix}_color`]: matrix?.warna || null,
  };
};

const resolveLabelsForPayload = async (payload = {}, options = {}) => {
  const resolved = { ...payload };

  if (payload.existing_control_status_ref_id) {
    const ref = await resolveReferenceLabel(
      payload.existing_control_status_ref_id,
      options
    );

    ensureReferenceGroup(
      ref,
      "CONTROL_EFFECTIVENESS",
      "existing_control_status_ref_id"
    );

    resolved.existing_control_status = ref.label || null;
  }

  if (payload.control_adequacy_ref_id) {
    const ref = await resolveReferenceLabel(
      payload.control_adequacy_ref_id,
      options
    );

    ensureReferenceGroup(
      ref,
      "CONTROL_EFFECTIVENESS",
      "control_adequacy_ref_id"
    );

    resolved.control_adequacy_status = ref.label || null;
  }

  if (payload.selera_risiko_ref_id) {
    const ref = await resolveReferenceLabel(
      payload.selera_risiko_ref_id,
      options
    );

    ensureReferenceGroup(
      ref,
      "RISK_APPETITE",
      "selera_risiko_ref_id"
    );

    resolved.selera_risiko = ref.label || null;
    resolved.appetite_threshold = toNumber(ref.nilai, 9);
  }

  return resolved;
};

const applyRiskMatrixCalculation = async (payload = {}, options = {}) => {
  const calculated = { ...payload };

  if (payload.inherent_likelihood_ref_id && payload.inherent_impact_ref_id) {
    Object.assign(
      calculated,
      await buildMatrixPayload(
        {
          prefix: "inherent",
          likelihoodRefId: payload.inherent_likelihood_ref_id,
          impactRefId: payload.inherent_impact_ref_id,
        },
        options
      )
    );
  }

  if (payload.residual_likelihood_ref_id && payload.residual_impact_ref_id) {
    Object.assign(
      calculated,
      await buildMatrixPayload(
        {
          prefix: "residual",
          likelihoodRefId: payload.residual_likelihood_ref_id,
          impactRefId: payload.residual_impact_ref_id,
        },
        options
      )
    );
  }

  const residualScore = toNumber(calculated.residual_score, 0);
  const appetiteThreshold = toNumber(calculated.appetite_threshold, 9);

  calculated.appetite_threshold = appetiteThreshold;
  calculated.is_above_appetite = residualScore > appetiteThreshold;
  calculated.matrix_code = "MR_5X5_DEFAULT";

  return calculated;
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

const buildSystemFieldsFromRisk = (risk, userId) => {
  const context = risk.context || null;

  return {
    mr_planning_risk_id: risk.id,
    mr_planning_context_id: risk.context_id || context?.id || null,

    periode_id: risk.periode_id || context?.periode_id || null,
    tahun: risk.tahun || context?.tahun || null,
    periode_type: context?.periode_type || "tahunan",
    periode_label: context?.periode_label || null,
    periode_awal: context?.periode_awal || null,
    periode_akhir: context?.periode_akhir || null,

    owner_user_id: risk.owner_user_id || context?.owner_user_id || userId || null,
    owner_division_id: risk.owner_division_id || context?.owner_division_id || null,

    status_revisi: "draft",
    versi: 1,
    dibuat_oleh: userId || null,
    dibuat_pada: new Date(),
    created_by: userId || null,
    updated_by: userId || null,
    is_active: true,
    is_latest: true,
  };
};

const ensureDraftAnalysis = (analysis) => {
  if (!analysis) return;

  if (analysis.status_revisi !== "draft") {
    throwValidation("Risk Analysis hanya bisa diubah saat status draft.", {
      current_status: analysis.status_revisi,
    });
  }
};

const createAnalysisFromRisk = async ({ riskId, body = {}, userId, transaction } = {}) => {
  if (!riskId) {
    throwValidation("riskId wajib diisi.");
  }

  const allowedPayload = pickAllowedFields(body);
  const risk = await getRiskWithContext(riskId, { transaction });

  const systemPayload = buildSystemFieldsFromRisk(risk, userId);

  const payloadWithAppetiteRef = {
    ...allowedPayload,
    selera_risiko_ref_id:
      allowedPayload.selera_risiko_ref_id || risk.selera_risiko_ref_id || null,
  };

  const labelPayload = await resolveLabelsForPayload(payloadWithAppetiteRef, {
    transaction,
  });

  const appetitePayload = {
    ...labelPayload,
    selera_risiko: labelPayload.selera_risiko || risk.selera_risiko || null,
    appetite_threshold: labelPayload.appetite_threshold || 9,
  };

  const calculatedPayload = await applyRiskMatrixCalculation(appetitePayload, {
    transaction,
  });

  return MrPlanningRiskAnalysis.create(
    {
      ...systemPayload,
      ...calculatedPayload,
    },
    { transaction }
  );
};

const updateDraftAnalysis = async ({
  analysisId,
  body = {},
  userId,
  transaction,
} = {}) => {
  if (!analysisId) {
    throwValidation("analysisId wajib diisi.");
  }

  const analysis = await MrPlanningRiskAnalysis.findByPk(analysisId, {
    transaction,
  });

  if (!analysis) {
    throwValidation("MR Planning Risk Analysis tidak ditemukan.", {
      id: analysisId,
    });
  }

  ensureDraftAnalysis(analysis);

  const allowedPayload = pickAllowedFields(body);

  const mergedPayload = {
    ...analysis.get({ plain: true }),
    ...allowedPayload,
  };

  const labelPayload = await resolveLabelsForPayload(mergedPayload, {
    transaction,
  });

  const calculatedPayload = await applyRiskMatrixCalculation(labelPayload, {
    transaction,
  });

  await analysis.update(
    {
      ...calculatedPayload,
      alasan_revisi: allowedPayload.alasan_revisi || analysis.alasan_revisi,
      last_revised_at: new Date(),
      last_revised_by: userId || null,
      updated_by: userId || null,
    },
    { transaction }
  );

  return getAnalysisDetail(analysis.id, { transaction });
};

const getAnalysisDetail = async (analysisId, options = {}) => {
  if (!analysisId) {
    throwValidation("analysisId wajib diisi.");
  }

  const analysis = await MrPlanningRiskAnalysis.findByPk(analysisId, {
    include: [
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
        model: MrReferenceItem,
        as: "existing_control_status_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "control_adequacy_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "inherent_likelihood_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "inherent_impact_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "inherent_level_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "residual_likelihood_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "residual_impact_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "residual_level_ref",
        required: false,
      },
      {
        model: MrReferenceItem,
        as: "selera_risiko_ref",
        required: false,
      },
    ],
    ...options,
  });

  if (!analysis) {
    throwValidation("MR Planning Risk Analysis tidak ditemukan.", {
      id: analysisId,
    });
  }

  return analysis;
};

const getAnalysesByRisk = async (riskId, options = {}) => {
  if (!riskId) {
    throwValidation("riskId wajib diisi.");
  }

  return MrPlanningRiskAnalysis.findAll({
    where: {
      mr_planning_risk_id: riskId,
      is_active: true,
    },
    order: [
      ["is_latest", "DESC"],
      ["id", "DESC"],
    ],
    ...options,
  });
};

module.exports = {
  MrPlanningRiskAnalysisServiceError,
  ALLOWED_CREATE_UPDATE_FIELDS,
  BLOCKED_TECHNICAL_FIELDS,
  createAnalysisFromRisk,
  updateDraftAnalysis,
  getAnalysisDetail,
  getAnalysesByRisk,
};