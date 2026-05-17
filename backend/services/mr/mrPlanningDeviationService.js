"use strict";

/**
 * MR Planning Deviation Service
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 15D
 *
 * Guard:
 * - Deviation melekat pada MR Planning Risk.
 * - Deviation bisa dibuat dari Risk atau dari Monitoring.
 * - Jika dibuat dari Monitoring, risk/context/planning scope diturunkan dari Monitoring.
 * - context_id diturunkan backend dari risk/monitoring.
 * - indikator_id, stage, ref_id, renstra_id, opd_id, tahun diturunkan backend.
 * - owner_user_id dan owner_division_id diturunkan backend dari monitoring/risk/context.
 * - Field teknis/calculated/audit tidak boleh dikirim frontend.
 * - deviation_value dan deviation_percent dihitung backend.
 * - deviasi_target dan persen_deviasi_target dihitung backend.
 * - deviasi_pagu dan persen_deviasi_pagu dihitung backend.
 * - severity_ref_id wajib berasal dari DEVIATION_SEVERITY jika dikirim.
 * - severity_level dan severity_color diisi backend dari reference.
 * - warning_status ditentukan backend.
 * - calculated_at, created_by, updated_by diisi backend.
 * - Tidak membuat workflow submit/verify/approve pada foundation ini.
 */

const {
  sequelize,
  MrPlanningRisk,
  MrPlanningContext,
  MrPlanningMonitoring,
  MrPlanningDeviation,
  MrReferenceItem,
  MrReferenceGroup,
} = require("../../models");

const ERROR_CODE = "MR_DEVIATION_VALIDATION_ERROR";

const VALID_PERIODE_TYPES = Object.freeze([
  "bulanan",
  "triwulan",
  "semester",
  "tahunan",
  "adhoc",
]);

const VALID_STAGES = Object.freeze([
  "tujuan",
  "sasaran",
  "strategi",
  "kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
  "lakip",
  "lk",
]);

/**
 * Field bisnis yang boleh dikirim frontend.
 *
 * Catatan:
 * - `mr_planning_monitoring_id` boleh dikirim saat create/update dari risk,
 *   tetapi jika create melalui route monitoring, monitoring id wajib berasal dari route.
 * - `risk_level_before`, `risk_level_after`, `source_table`, dan `source_id`
 *   sementara diizinkan untuk foundation teknis karena bisa berasal dari sumber internal.
 */
const DEVIATION_ALLOWED_FIELDS = Object.freeze([
  "mr_planning_monitoring_id",

  "periode_type",
  "periode_label",
  "periode_awal",
  "periode_akhir",

  "deviation_type",
  "deviation_source",
  "deviation_description",

  "expected_value",
  "actual_value",

  "severity_ref_id",

  "recommendation",
  "rekomendasi",
  "follow_up_status",

  "target_awal",
  "target_realisasi",

  "pagu_awal",
  "pagu_realisasi",

  "risk_event_id",
  "risk_level_before",
  "risk_level_after",

  "source_table",
  "source_id",
]);

const DEVIATION_BLOCKED_FIELDS = Object.freeze([
  "id",

  "mr_planning_risk_id",
  "context_id",
  "indikator_id",
  "stage",
  "ref_id",
  "renstra_id",
  "opd_id",
  "tahun",
  "periode_id",

  "deviation_value",
  "deviation_percent",

  "deviasi_target",
  "persen_deviasi_target",

  "deviasi_pagu",
  "persen_deviasi_pagu",

  "severity_level",
  "severity_color",
  "level_deviasi",

  "warning_status",

  "risk_level_change",
  "is_above_appetite",

  "owner_user_id",
  "owner_division_id",

  "calculated_at",

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

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (Number(value) === 1) return true;
  if (Number(value) === 0) return false;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return defaultValue;
};

const assertAllowedFields = (body = {}) => {
  const fields = Object.keys(body || {});

  const blocked = fields.filter((field) =>
    DEVIATION_BLOCKED_FIELDS.includes(field)
  );

  const unknown = fields.filter(
    (field) =>
      !DEVIATION_ALLOWED_FIELDS.includes(field) &&
      !DEVIATION_BLOCKED_FIELDS.includes(field)
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
  return DEVIATION_ALLOWED_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }

    return payload;
  }, {});
};

const requireBusinessFieldsForCreate = (payload = {}) => {
  const missing = [];

  if (!payload.deviation_type) missing.push("deviation_type");
  if (!payload.deviation_source) missing.push("deviation_source");

  if (missing.length > 0) {
    throw createValidationError("Field wajib belum lengkap.", {
      fields: missing,
    });
  }

  if (
    payload.periode_type &&
    !VALID_PERIODE_TYPES.includes(payload.periode_type)
  ) {
    throw createValidationError("periode_type tidak valid.", {
      periode_type: payload.periode_type,
      allowed: VALID_PERIODE_TYPES,
    });
  }
};

const normalizeDeviationPayload = (payload = {}) => {
  const normalized = { ...payload };

  [
    "expected_value",
    "actual_value",
    "target_awal",
    "target_realisasi",
    "pagu_awal",
    "pagu_realisasi",
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(normalized, field)) {
      normalized[field] = normalizeDecimal(normalized[field], 0);
    }
  });

  return normalized;
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

const getMonitoringWithRisk = async (monitoringId, transaction = null) => {
  const monitoring = await MrPlanningMonitoring.findByPk(monitoringId, {
    transaction,
    include: [
      {
        model: MrPlanningRisk,
        as: "risk",
        required: true,
        include: [
          {
            model: MrPlanningContext,
            as: "context",
            required: false,
          },
        ],
      },
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
  });

  if (!monitoring) {
    throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", {
      mr_planning_monitoring_id: monitoringId,
    });
  }

  return monitoring;
};

const ensureMonitoringBelongsToRisk = async ({
  monitoringId,
  riskId,
  transaction = null,
}) => {
  if (!monitoringId) return null;

  const monitoring = await MrPlanningMonitoring.findByPk(monitoringId, {
    transaction,
  });

  if (!monitoring) {
    throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", {
      mr_planning_monitoring_id: monitoringId,
    });
  }

  if (Number(monitoring.mr_planning_risk_id) !== Number(riskId)) {
    throw createValidationError("MR Planning Monitoring tidak sesuai dengan risk.", {
      mr_planning_monitoring_id: monitoringId,
      expected_mr_planning_risk_id: Number(riskId),
      actual_mr_planning_risk_id: Number(monitoring.mr_planning_risk_id),
    });
  }

  return monitoring;
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

const resolveDeviationSeverity = async ({
  payload,
  transaction = null,
}) => {
  const result = { ...payload };

  const severity = await getReferenceItemWithGroup({
    refId: payload.severity_ref_id,
    field: "severity_ref_id",
    expectedGroups: ["DEVIATION_SEVERITY"],
    required: false,
    transaction,
  });

  if (severity) {
    result.severity_level = severity.nama_item;
    result.severity_color = severity.warna || null;
    result.level_deviasi = severity.nama_item;
  }

  return result;
};

const calculateDiff = ({ expectedValue, actualValue }) => {
  const expected = normalizeDecimal(expectedValue, 0);
  const actual = normalizeDecimal(actualValue, 0);
  const diff = actual - expected;

  const percent = expected === 0 ? 0 : (diff / expected) * 100;

  return {
    value: diff,
    percent,
  };
};

const buildDeviationCalculation = (payload = {}) => {
  const expectedValue = Object.prototype.hasOwnProperty.call(
    payload,
    "expected_value"
  )
    ? payload.expected_value
    : 0;

  const actualValue = Object.prototype.hasOwnProperty.call(payload, "actual_value")
    ? payload.actual_value
    : 0;

  const result = calculateDiff({
    expectedValue,
    actualValue,
  });

  return {
    deviation_value: result.value,
    deviation_percent: result.percent,
  };
};

const buildTargetDeviationCalculation = (payload = {}) => {
  const result = calculateDiff({
    expectedValue: payload.target_awal,
    actualValue: payload.target_realisasi,
  });

  return {
    deviasi_target: result.value,
    persen_deviasi_target: result.percent,
  };
};

const buildPaguDeviationCalculation = (payload = {}) => {
  const result = calculateDiff({
    expectedValue: payload.pagu_awal,
    actualValue: payload.pagu_realisasi,
  });

  return {
    deviasi_pagu: result.value,
    persen_deviasi_pagu: result.percent,
  };
};

const buildRiskLevelChange = ({ riskLevelBefore, riskLevelAfter }) => {
  if (!riskLevelBefore || !riskLevelAfter) return null;

  if (String(riskLevelBefore).toLowerCase() === String(riskLevelAfter).toLowerCase()) {
    return "tetap";
  }

  return `${riskLevelBefore} -> ${riskLevelAfter}`;
};

const buildWarningStatus = ({ payload }) => {
  const severity = String(payload.severity_level || payload.level_deviasi || "")
    .toLowerCase();

  if (!severity) return null;

  if (
    severity.includes("tinggi") ||
    severity.includes("ekstrem") ||
    severity.includes("extreme") ||
    severity.includes("high") ||
    severity.includes("berat")
  ) {
    return "warning";
  }

  if (
    severity.includes("sedang") ||
    severity.includes("medium") ||
    severity.includes("moderat")
  ) {
    return "monitor";
  }

  return "normal";
};

const buildSystemFieldsFromRisk = ({ risk, monitoring = null, userId }) => {
  const plainRisk = toPlain(risk);
  const plainMonitoring = toPlain(monitoring);
  const context = plainRisk?.context || plainMonitoring?.context || null;

  const stage = plainRisk?.stage || null;

  if (stage && !VALID_STAGES.includes(stage)) {
    throw createValidationError("Stage risk tidak valid untuk deviation.", {
      stage,
      allowed: VALID_STAGES,
    });
  }

  const required = {
    mr_planning_risk_id: plainRisk?.id,
    indikator_id: plainRisk?.indikator_id,
    stage,
    ref_id: plainRisk?.ref_id,
    renstra_id: plainRisk?.renstra_id,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => value === undefined || value === null || value === "")
    .map(([field]) => field);

  if (missing.length > 0) {
    throw createValidationError(
      "Field system wajib dari risk belum lengkap untuk membuat deviation.",
      {
        fields: missing,
        mr_planning_risk_id: plainRisk?.id || null,
      }
    );
  }

  return {
    mr_planning_risk_id: plainRisk.id,
    context_id: plainRisk.context_id || plainMonitoring?.context_id || null,

    indikator_id: plainRisk.indikator_id,
    stage: plainRisk.stage,
    ref_id: plainRisk.ref_id,
    renstra_id: plainRisk.renstra_id,
    opd_id: plainRisk.opd_id || context?.opd_id || null,

    periode_id: plainRisk.periode_id || context?.periode_id || null,
    tahun: plainRisk.tahun || context?.tahun || plainMonitoring?.tahun || null,

    owner_user_id:
      plainMonitoring?.owner_user_id ||
      plainRisk.owner_user_id ||
      context?.owner_user_id ||
      userId ||
      null,

    owner_division_id:
      plainMonitoring?.owner_division_id ||
      plainRisk.owner_division_id ||
      context?.owner_division_id ||
      null,
  };
};

const buildSystemFieldsFromMonitoring = ({ monitoring, userId }) => {
  const plainMonitoring = toPlain(monitoring);
  const plainRisk = plainMonitoring?.risk;

  if (!plainRisk) {
    throw createValidationError(
      "Monitoring tidak memiliki relasi risk untuk membuat deviation.",
      {
        mr_planning_monitoring_id: plainMonitoring?.id || null,
      }
    );
  }

  return {
    ...buildSystemFieldsFromRisk({
      risk: plainRisk,
      monitoring: plainMonitoring,
      userId,
    }),
    mr_planning_monitoring_id: plainMonitoring.id,
  };
};

const buildCreatePayload = async ({
  risk,
  monitoring = null,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  let payload = pickAllowedFields(body);
  requireBusinessFieldsForCreate(payload);
  payload = normalizeDeviationPayload(payload);

  if (payload.mr_planning_monitoring_id && risk?.id) {
    await ensureMonitoringBelongsToRisk({
      monitoringId: payload.mr_planning_monitoring_id,
      riskId: risk.id,
      transaction,
    });
  }

  payload = await resolveDeviationSeverity({
    payload,
    transaction,
  });

  const systemFields = monitoring
    ? buildSystemFieldsFromMonitoring({
        monitoring,
        userId,
      })
    : buildSystemFieldsFromRisk({
        risk,
        monitoring: null,
        userId,
      });

  const deviationCalculation = buildDeviationCalculation(payload);
  const targetCalculation = buildTargetDeviationCalculation(payload);
  const paguCalculation = buildPaguDeviationCalculation(payload);

  const calculatedPayload = {
    ...payload,
    ...systemFields,
    ...deviationCalculation,
    ...targetCalculation,
    ...paguCalculation,

    risk_level_change: buildRiskLevelChange({
      riskLevelBefore: payload.risk_level_before,
      riskLevelAfter: payload.risk_level_after,
    }),

    is_above_appetite: normalizeBoolean(
      risk?.is_above_appetite || monitoring?.is_above_appetite_actual,
      false
    ),

    warning_status: buildWarningStatus({
      payload,
    }),

    calculated_at: new Date(),
    created_by: userId || null,
    updated_by: userId || null,
  };

  return calculatedPayload;
};

const buildUpdatePayload = async ({
  deviation,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  let payload = pickAllowedFields(body);
  payload = normalizeDeviationPayload(payload);

  const current = toPlain(deviation);

  if (payload.mr_planning_monitoring_id) {
    await ensureMonitoringBelongsToRisk({
      monitoringId: payload.mr_planning_monitoring_id,
      riskId: current.mr_planning_risk_id,
      transaction,
    });
  }

  payload = await resolveDeviationSeverity({
    payload,
    transaction,
  });

  const mergedForCalculation = {
    ...current,
    ...payload,
  };

  const deviationCalculation = buildDeviationCalculation(mergedForCalculation);
  const targetCalculation = buildTargetDeviationCalculation(mergedForCalculation);
  const paguCalculation = buildPaguDeviationCalculation(mergedForCalculation);

  const finalPayload = {
    ...payload,
    ...deviationCalculation,
    ...targetCalculation,
    ...paguCalculation,

    risk_level_change: buildRiskLevelChange({
      riskLevelBefore: mergedForCalculation.risk_level_before,
      riskLevelAfter: mergedForCalculation.risk_level_after,
    }),

    warning_status:
      Object.prototype.hasOwnProperty.call(payload, "severity_ref_id") ||
      Object.prototype.hasOwnProperty.call(payload, "severity_level")
        ? buildWarningStatus({
            payload: {
              ...mergedForCalculation,
              ...payload,
            },
          })
        : current.warning_status,

    calculated_at: new Date(),
    updated_by: userId || null,
  };

  return finalPayload;
};

const deviationInclude = () => [
  {
    model: MrPlanningRisk,
    as: "risk",
    required: false,
  },
  {
    model: MrPlanningMonitoring,
    as: "monitoring",
    required: false,
  },
  {
    model: MrPlanningContext,
    as: "context",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "severity_ref",
    required: false,
  },
];

const createDeviationFromRisk = async ({ riskId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const risk = await getRiskWithContext(riskId, transaction);

    const payload = await buildCreatePayload({
      risk,
      body,
      userId,
      transaction,
    });

    const created = await MrPlanningDeviation.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getDeviationDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createDeviationFromMonitoring = async ({ monitoringId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const monitoring = await getMonitoringWithRisk(monitoringId, transaction);
    const plainMonitoring = toPlain(monitoring);
    const risk = plainMonitoring.risk;

    const payload = await buildCreatePayload({
      risk,
      monitoring,
      body,
      userId,
      transaction,
    });

    const created = await MrPlanningDeviation.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getDeviationDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateDraftDeviation = async ({ id, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const deviation = await MrPlanningDeviation.findByPk(id, {
      transaction,
    });

    if (!deviation) {
      throw createNotFoundError("MR Planning Deviation tidak ditemukan.", {
        id,
      });
    }

    const payload = await buildUpdatePayload({
      deviation,
      body,
      userId,
      transaction,
    });

    await deviation.update(payload, {
      transaction,
    });

    await transaction.commit();

    return getDeviationDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getDeviationDetail = async (id) => {
  const deviation = await MrPlanningDeviation.findByPk(id, {
    include: deviationInclude(),
  });

  if (!deviation) {
    throw createNotFoundError("MR Planning Deviation tidak ditemukan.", {
      id,
    });
  }

  return deviation;
};

const getDeviationsByRisk = async (riskId) => {
  return MrPlanningDeviation.findAll({
    where: {
      mr_planning_risk_id: riskId,
    },
    include: deviationInclude(),
    order: [["id", "ASC"]],
  });
};

const getDeviationsByMonitoring = async (monitoringId) => {
  return MrPlanningDeviation.findAll({
    where: {
      mr_planning_monitoring_id: monitoringId,
    },
    include: deviationInclude(),
    order: [["id", "ASC"]],
  });
};

const getDeviationsByContext = async (contextId) => {
  return MrPlanningDeviation.findAll({
    where: {
      context_id: contextId,
    },
    include: deviationInclude(),
    order: [["id", "ASC"]],
  });
};

module.exports = {
  ERROR_CODE,
  VALID_PERIODE_TYPES,
  VALID_STAGES,

  DEVIATION_ALLOWED_FIELDS,
  DEVIATION_BLOCKED_FIELDS,

  createValidationError,
  createNotFoundError,

  getRiskWithContext,
  getMonitoringWithRisk,
  ensureMonitoringBelongsToRisk,
  getReferenceItemWithGroup,

  resolveDeviationSeverity,
  buildDeviationCalculation,
  buildTargetDeviationCalculation,
  buildPaguDeviationCalculation,
  buildRiskLevelChange,
  buildWarningStatus,
  buildSystemFieldsFromRisk,
  buildSystemFieldsFromMonitoring,
  buildCreatePayload,
  buildUpdatePayload,
  deviationInclude,

  createDeviationFromRisk,
  createDeviationFromMonitoring,
  updateDraftDeviation,
  getDeviationDetail,
  getDeviationsByRisk,
  getDeviationsByMonitoring,
  getDeviationsByContext,
};