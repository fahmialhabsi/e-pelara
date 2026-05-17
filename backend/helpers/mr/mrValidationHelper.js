"use strict";

/**
 * MR Validation Helper
 * ---------------------------------------------------------------------------
 * Strict schema helper untuk MR e-Pelara.
 *
 * Tujuan:
 * - block field liar dari frontend;
 * - block field governance agar tidak diisi manual dari frontend;
 * - validasi indikator_id, stage, ref_id, renstra_id, periode_id;
 * - validasi status_revisi;
 * - validasi source_system/cross-system code untuk service berikutnya.
 */

const {
  MR_STATUS_LIST,
  createGovernanceError,
  ensureValidStatus,
} = require("./mrApprovalHelper");

const MR_STAGE = Object.freeze({
  TUJUAN: "tujuan",
  SASARAN: "sasaran",
  STRATEGI: "strategi",
  KEBIJAKAN: "kebijakan",
  PROGRAM: "program",
  KEGIATAN: "kegiatan",
  SUB_KEGIATAN: "sub_kegiatan",
  LAKIP: "lakip",
  LK: "lk",
});

const MR_STAGE_LIST = Object.freeze(Object.values(MR_STAGE));

const MR_SYSTEM_CODE = Object.freeze({
  E_PELARA: "e_pelara",
  E_SIGAP: "e_sigap",
  SPIP: "spip",
  LAKIP: "lakip",
  LK: "lk",
});

const MR_SYSTEM_CODE_LIST = Object.freeze(Object.values(MR_SYSTEM_CODE));

const SYSTEM_CODE_ALIASES = Object.freeze({
  "e-pelara": MR_SYSTEM_CODE.E_PELARA,
  epelara: MR_SYSTEM_CODE.E_PELARA,
  e_pelara: MR_SYSTEM_CODE.E_PELARA,
  "e pelara": MR_SYSTEM_CODE.E_PELARA,

  "e-sigap": MR_SYSTEM_CODE.E_SIGAP,
  esigap: MR_SYSTEM_CODE.E_SIGAP,
  e_sigap: MR_SYSTEM_CODE.E_SIGAP,
  "e sigap": MR_SYSTEM_CODE.E_SIGAP,

  spip: MR_SYSTEM_CODE.SPIP,
  lakip: MR_SYSTEM_CODE.LAKIP,
  lk: MR_SYSTEM_CODE.LK,
});

const GOVERNANCE_FIELDS = Object.freeze([
  "id",

  "versi",
  "versi_sebelum",
  "versi_sesudah",

  "before_json",
  "after_json",
  "alasan_revisi",

  "status_revisi",

  "dibuat_oleh",
  "diverifikasi_oleh",
  "disetujui_oleh",
  "ditolak_oleh",

  "dibuat_pada",
  "diverifikasi_pada",
  "disetujui_pada",
  "ditolak_pada",

  "last_revised_at",
  "last_revised_by",

  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
  "deleted_at",
  "deletedAt",
]);

const isEmptyValue = (value) => {
  return value === undefined || value === null || value === "";
};

const requireFields = ({
  body,
  fields = [],
  label = "payload",
}) => {
  const missingFields = fields.filter((field) => isEmptyValue(body?.[field]));

  if (missingFields.length > 0) {
    throw createGovernanceError({
      message: `Field wajib belum diisi pada ${label}: ${missingFields.join(", ")}`,
      code: "MR_REQUIRED_FIELDS_MISSING",
      details: {
        missing_fields: missingFields,
      },
    });
  }

  return true;
};

const validateAllowedFields = ({
  body,
  allowedFields = [],
  label = "payload",
}) => {
  const incomingFields = Object.keys(body || {});

  const blockedFields = incomingFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (blockedFields.length > 0) {
    throw createGovernanceError({
      message: `Field tidak diperbolehkan pada ${label}: ${blockedFields.join(", ")}`,
      code: "MR_BLOCKED_FIELDS",
      details: {
        blocked_fields: blockedFields,
        allowed_fields: allowedFields,
      },
    });
  }

  return true;
};

const blockGovernanceFields = ({
  body,
  allowedGovernanceFields = [],
  label = "payload",
}) => {
  const incomingFields = Object.keys(body || {});
  const blockedFields = incomingFields.filter((field) => {
    return (
      GOVERNANCE_FIELDS.includes(field) &&
      !allowedGovernanceFields.includes(field)
    );
  });

  if (blockedFields.length > 0) {
    throw createGovernanceError({
      message: `Field governance tidak boleh dikirim dari frontend pada ${label}: ${blockedFields.join(", ")}`,
      code: "MR_GOVERNANCE_FIELDS_BLOCKED",
      details: {
        blocked_fields: blockedFields,
      },
    });
  }

  return true;
};

const pickAllowedFields = ({
  body,
  allowedFields = [],
}) => {
  return allowedFields.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
      payload[field] = body[field];
    }
    return payload;
  }, {});
};

const removeGovernanceFields = ({
  body,
  extraBlockedFields = [],
}) => {
  const blockedFields = [...GOVERNANCE_FIELDS, ...extraBlockedFields];

  return Object.keys(body || {}).reduce((payload, field) => {
    if (!blockedFields.includes(field)) {
      payload[field] = body[field];
    }
    return payload;
  }, {});
};

const sanitizePayload = ({
  body,
  allowedFields = [],
  blockGovernance = true,
  allowedGovernanceFields = [],
  label = "payload",
}) => {
  validateAllowedFields({
    body,
    allowedFields,
    label,
  });

  if (blockGovernance) {
    blockGovernanceFields({
      body,
      allowedGovernanceFields,
      label,
    });
  }

  return pickAllowedFields({
    body,
    allowedFields,
  });
};

const validateIntegerId = ({
  value,
  fieldName,
  required = true,
}) => {
  if (isEmptyValue(value)) {
    if (!required) return true;

    throw createGovernanceError({
      message: `${fieldName} wajib diisi.`,
      code: "MR_ID_REQUIRED",
      details: {
        field: fieldName,
      },
    });
  }

  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw createGovernanceError({
      message: `${fieldName} harus berupa integer positif.`,
      code: "MR_INVALID_INTEGER_ID",
      details: {
        field: fieldName,
        value,
      },
    });
  }

  return true;
};

const validateStage = (stage) => {
  if (!MR_STAGE_LIST.includes(stage)) {
    throw createGovernanceError({
      message: `Stage MR tidak valid: ${stage}`,
      code: "MR_INVALID_STAGE",
      details: {
        allowed_stages: MR_STAGE_LIST,
      },
    });
  }

  return true;
};

const validateStatusRevisi = (status) => {
  ensureValidStatus(status);
  return true;
};

const validatePlanningGovernanceLinkage = ({
  indikator_id,
  stage,
  ref_id,
  renstra_id,
  periode_id = null,
  requirePeriode = false,
}) => {
  validateIntegerId({
    value: indikator_id,
    fieldName: "indikator_id",
  });

  validateStage(stage);

  validateIntegerId({
    value: ref_id,
    fieldName: "ref_id",
  });

  validateIntegerId({
    value: renstra_id,
    fieldName: "renstra_id",
  });

  validateIntegerId({
    value: periode_id,
    fieldName: "periode_id",
    required: requirePeriode,
  });

  return true;
};

const validateOwnerGovernance = ({
  owner_user_id = null,
  owner_division_id = null,
  requireUser = false,
  requireDivision = false,
}) => {
  validateIntegerId({
    value: owner_user_id,
    fieldName: "owner_user_id",
    required: requireUser,
  });

  validateIntegerId({
    value: owner_division_id,
    fieldName: "owner_division_id",
    required: requireDivision,
  });

  return true;
};

const normalizeSystemCode = (systemCode) => {
  if (isEmptyValue(systemCode)) {
    throw createGovernanceError({
      message: "Kode sistem wajib diisi.",
      code: "MR_SYSTEM_CODE_REQUIRED",
    });
  }

  const normalizedKey = String(systemCode)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const canonical = SYSTEM_CODE_ALIASES[normalizedKey];

  if (!canonical) {
    throw createGovernanceError({
      message: `Kode sistem tidak valid: ${systemCode}`,
      code: "MR_INVALID_SYSTEM_CODE",
      details: {
        allowed_system_codes: MR_SYSTEM_CODE_LIST,
      },
    });
  }

  return canonical;
};

const validateSystemCode = (systemCode) => {
  const normalized = normalizeSystemCode(systemCode);

  if (!MR_SYSTEM_CODE_LIST.includes(normalized)) {
    throw createGovernanceError({
      message: `Kode sistem tidak valid: ${systemCode}`,
      code: "MR_INVALID_SYSTEM_CODE",
      details: {
        allowed_system_codes: MR_SYSTEM_CODE_LIST,
      },
    });
  }

  return true;
};

const validateCrossSystemPayload = ({
  source_system,
  source_module,
  source_table,
  source_id,
  target_system,
  target_module,
  target_table,
  target_id,
}) => {
  const normalizedSourceSystem = normalizeSystemCode(source_system);
  const normalizedTargetSystem = normalizeSystemCode(target_system);

  requireFields({
    body: {
      source_module,
      source_table,
      source_id,
      target_module,
      target_table,
      target_id,
    },
    fields: [
      "source_module",
      "source_table",
      "source_id",
      "target_module",
      "target_table",
      "target_id",
    ],
    label: "cross-system linkage",
  });

  validateIntegerId({
    value: source_id,
    fieldName: "source_id",
  });

  validateIntegerId({
    value: target_id,
    fieldName: "target_id",
  });

  return {
    source_system: normalizedSourceSystem,
    target_system: normalizedTargetSystem,
  };
};

const getModelAttributes = (Model) => {
  if (!Model) return {};
  if (Model.rawAttributes) return Model.rawAttributes;
  if (typeof Model.getAttributes === "function") return Model.getAttributes();
  return {};
};

const modelHasField = (Model, fieldName) => {
  const attributes = getModelAttributes(Model);
  return Object.prototype.hasOwnProperty.call(attributes, fieldName);
};

const validateReferenceExists = async ({
  Model,
  value,
  fieldName,
  label,
  transaction = null,
  required = true,
}) => {
  validateIntegerId({
    value,
    fieldName,
    required,
  });

  if (isEmptyValue(value) && !required) return true;

  // Jika model belum tersedia, jangan crash.
  // Service tetap aman untuk project existing yang belum semua modelnya dikirim.
  if (!Model) return true;

  const record = await Model.findByPk(value, { transaction });

  if (!record) {
    throw createGovernanceError({
      message: `${label || fieldName} tidak ditemukan.`,
      code: "MR_REFERENCE_NOT_FOUND",
      details: {
        field: fieldName,
        value,
      },
    });
  }

  return true;
};

const validateReferenceByWhere = async ({
  Model,
  where = {},
  label,
  transaction = null,
  required = true,
}) => {
  const cleanWhere = Object.keys(where || {}).reduce((payload, key) => {
    if (!isEmptyValue(where[key]) && modelHasField(Model, key)) {
      payload[key] = where[key];
    }
    return payload;
  }, {});

  if (!Model) return true;

  if (Object.keys(cleanWhere).length === 0) {
    if (!required) return true;

    throw createGovernanceError({
      message: `Kriteria validasi ${label} tidak tersedia.`,
      code: "MR_REFERENCE_WHERE_EMPTY",
      details: {
        label,
      },
    });
  }

  const record = await Model.findOne({
    where: cleanWhere,
    transaction,
  });

  if (!record) {
    throw createGovernanceError({
      message: `${label} tidak valid atau tidak ditemukan.`,
      code: "MR_REFERENCE_LINKAGE_INVALID",
      details: {
        where: cleanWhere,
      },
    });
  }

  return true;
};

const buildStageReferenceWhereCandidates = ({
  Model,
  stage,
  ref_id,
  renstra_id,
  opd_id,
  indikator_id,
}) => {
  const candidates = [];

  const baseWhere = {
    renstra_id,
    opd_id,
    indikator_id,
  };

  // Kandidat 1:
  // ref_id dianggap sebagai primary key active table.
  candidates.push({
    ...baseWhere,
    id: ref_id,
  });

  // Kandidat 2:
  // ref_id dianggap sebagai field level governance:
  // program_id, kegiatan_id, sub_kegiatan_id, tujuan_id, dst.
  const stageRefField = MR_STAGE_REF_FIELD[stage];

  if (stageRefField && modelHasField(Model, stageRefField)) {
    candidates.push({
      ...baseWhere,
      [stageRefField]: ref_id,
    });
  }

  // Kandidat 3 khusus Sub Kegiatan:
  // beberapa existing memakai subkegiatan_id.
  if (
    stage === MR_STAGE.SUB_KEGIATAN &&
    modelHasField(Model, "subkegiatan_id")
  ) {
    candidates.push({
      ...baseWhere,
      subkegiatan_id: ref_id,
    });
  }

  return candidates;
};

const MR_STAGE_MODEL_KEY = Object.freeze({
  [MR_STAGE.TUJUAN]: "RenstraTabelTujuan",
  [MR_STAGE.SASARAN]: "RenstraTabelSasaran",
  [MR_STAGE.STRATEGI]: "RenstraTabelStrategi",
  [MR_STAGE.KEBIJAKAN]: "RenstraTabelArahKebijakan",
  [MR_STAGE.PROGRAM]: "RenstraTabelProgram",
  [MR_STAGE.KEGIATAN]: "RenstraTabelKegiatan",
  [MR_STAGE.SUB_KEGIATAN]: "RenstraTabelSubkegiatan",
});

const MR_STAGE_REF_FIELD = Object.freeze({
  [MR_STAGE.TUJUAN]: "tujuan_id",
  [MR_STAGE.SASARAN]: "sasaran_id",
  [MR_STAGE.STRATEGI]: "strategi_id",
  [MR_STAGE.KEBIJAKAN]: "kebijakan_id",
  [MR_STAGE.PROGRAM]: "program_id",
  [MR_STAGE.KEGIATAN]: "kegiatan_id",
  [MR_STAGE.SUB_KEGIATAN]: "sub_kegiatan_id",
});

const validateIndicatorMasterReference = async ({
  models = {},
  payload = {},
  transaction = null,
}) => {
  const {
    indikator_id,
    stage,
    ref_id,
    renstra_id,
    periode_id,
  } = payload || {};

  await validateReferenceExists({
    Model: models.IndikatorRenstra,
    value: indikator_id,
    fieldName: "indikator_id",
    label: "Indikator Renstra",
    transaction,
    required: true,
  });

  if (!models.IndikatorRenstra) return true;

  const indikatorWhere = {
    id: indikator_id,
    stage,
    ref_id,
    renstra_id,
    periode_id,
  };

  await validateReferenceByWhere({
    Model: models.IndikatorRenstra,
    where: indikatorWhere,
    label: "Linkage indikator_renstra dengan stage/ref_id/renstra_id/periode_id",
    transaction,
    required: false,
  });

  return true;
};

const validateStageReference = async ({
  models = {},
  payload = {},
  transaction = null,
}) => {
  const {
    stage,
    ref_id,
    renstra_id,
    opd_id,
    indikator_id,
  } = payload || {};

  validateStage(stage);

  const modelKey = MR_STAGE_MODEL_KEY[stage];
  const StageModel = modelKey ? models[modelKey] : null;

  if (!StageModel) return true;

  const whereCandidates = buildStageReferenceWhereCandidates({
    Model: StageModel,
    stage,
    ref_id,
    renstra_id,
    opd_id,
    indikator_id,
  });

  for (const candidate of whereCandidates) {
    const cleanWhere = Object.keys(candidate || {}).reduce((payloadWhere, key) => {
      if (!isEmptyValue(candidate[key]) && modelHasField(StageModel, key)) {
        payloadWhere[key] = candidate[key];
      }
      return payloadWhere;
    }, {});

    if (Object.keys(cleanWhere).length === 0) continue;

    const record = await StageModel.findOne({
      where: cleanWhere,
      transaction,
    });

    if (record) return true;
  }

  throw createGovernanceError({
    message: `Referensi stage ${stage} tidak valid atau tidak ditemukan.`,
    code: "MR_REFERENCE_LINKAGE_INVALID",
    details: {
      candidates: whereCandidates,
    },
  });
};

const validatePlanningMasterReferences = async ({
  models = {},
  payload = {},
  transaction = null,
  requirePeriode = false,
}) => {
  validatePlanningGovernanceLinkage({
    indikator_id: payload.indikator_id,
    stage: payload.stage,
    ref_id: payload.ref_id,
    renstra_id: payload.renstra_id,
    periode_id: payload.periode_id,
    requirePeriode,
  });

  await validateReferenceExists({
    Model: models.RenstraOPD,
    value: payload.renstra_id,
    fieldName: "renstra_id",
    label: "Renstra OPD",
    transaction,
    required: true,
  });

  await validateReferenceExists({
    Model: models.PeriodeRpjmd,
    value: payload.periode_id,
    fieldName: "periode_id",
    label: "Periode RPJMD",
    transaction,
    required: requirePeriode,
  });

  await validateIndicatorMasterReference({
    models,
    payload,
    transaction,
  });

  await validateStageReference({
    models,
    payload,
    transaction,
  });

  return true;
};

const validateOwnerMasterReferences = async ({
  models = {},
  payload = {},
  transaction = null,
  requireUser = false,
  requireDivision = false,
}) => {
  validateOwnerGovernance({
    owner_user_id: payload.owner_user_id,
    owner_division_id: payload.owner_division_id,
    requireUser,
    requireDivision,
  });

  await validateReferenceExists({
    Model: models.User,
    value: payload.owner_user_id,
    fieldName: "owner_user_id",
    label: "Owner user",
    transaction,
    required: requireUser,
  });

  await validateReferenceExists({
    Model: models.Division,
    value: payload.owner_division_id,
    fieldName: "owner_division_id",
    label: "Owner division",
    transaction,
    required: requireDivision,
  });

  return true;
};

module.exports = {
  MR_STAGE,
  MR_STAGE_MODEL_KEY,
  MR_STAGE_LIST,
  MR_SYSTEM_CODE,
  MR_SYSTEM_CODE_LIST,
  MR_STAGE_REF_FIELD,
  MR_STATUS_LIST,
  SYSTEM_CODE_ALIASES,
  GOVERNANCE_FIELDS,
  

  isEmptyValue,
  requireFields,
  validateAllowedFields,
  blockGovernanceFields,
  pickAllowedFields,
  removeGovernanceFields,
  sanitizePayload,
  validateIntegerId,
  validateStage,
  validateStatusRevisi,
  validatePlanningGovernanceLinkage,
  validateOwnerGovernance,
  normalizeSystemCode,
  validateSystemCode,
  validateCrossSystemPayload,
  getModelAttributes,
  modelHasField,
  validateReferenceExists,
  validateReferenceByWhere,
  validateIndicatorMasterReference,
  validateStageReference,
  validatePlanningMasterReferences,
  validateOwnerMasterReferences,
  buildStageReferenceWhereCandidates,
};