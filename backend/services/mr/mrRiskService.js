"use strict";

/**
 * MR Risk Service
 * ---------------------------------------------------------------------------
 * Core service untuk mr_planning_risk.
 *
 * Service ini menangani:
 * - findAll
 * - findById
 * - create
 * - update draft/ditolak
 * - createRevisi dari approved
 * - delete draft/ditolak
 *
 * Prinsip:
 * - Controller tidak membuat logic governance manual.
 * - Semua write operation memakai transaction.
 * - Semua perubahan membuat history.
 * - Semua perubahan siap menulis audit global jika AuditModel tersedia.
 * - Data approved tidak boleh di-update langsung.
 */

const {
  MR_ACTION,
  MR_STATUS,
  ensureRecordExists,
  ensureNotApprovedForDirectUpdate,
  ensureActionAllowedForRecord,
  buildActiveRevisionPayload,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  getPlainJson,
  buildHistoryPayload,
  createHistory,
} = require("../../helpers/mr/mrHistoryHelper");

const {
  buildAndWriteAuditLog,
} = require("../../helpers/mr/mrAuditHelper");

const {
  sanitizePayload,
  requireFields,
  validatePlanningGovernanceLinkage,
  validateOwnerGovernance,
  validatePlanningMasterReferences,
  validateOwnerMasterReferences,
} = require("../../helpers/mr/mrValidationHelper");

const MR_RISK_TABLE_NAME = "mr_planning_risk";
const MR_RISK_ENTITY_NAME = "mr_planning_risk";
const MR_RISK_HISTORY_FOREIGN_KEY = "mr_planning_risk_id";

const MR_RISK_ALLOWED_FIELDS = Object.freeze([
  "periode_id",
  "tahun",
  "jenis_dokumen",
  "renstra_id",
  "opd_id",
  "indikator_id",
  "stage",
  "ref_id",

  "kode_risiko",
  "nama_risiko",
  "uraian_risiko",
  "kategori_risiko",
  "sumber_risiko",
  "penyebab_risiko",
  "dampak_risiko",

  "kemungkinan",
  "dampak",
  "skor_risiko",
  "level_risiko",
  "selera_risiko",
  "status_risiko",

  "owner_user_id",
  "owner_division_id",
]);

const MR_RISK_REQUIRED_FIELDS = Object.freeze([
  "renstra_id",
  "indikator_id",
  "stage",
  "ref_id",
  "nama_risiko",
]);

const DEFAULT_SAFE_EXCLUDED_FIELDS = Object.freeze([
  "password",
  "password_reset_token",
  "password_reset_expires",
  "reset_password_token",
  "reset_password_expires",
  "remember_token",
  "refresh_token",
  "access_token",
  "token",
  "secret",
  "api_key",
  "api_secret",
]);

const DEFAULT_INTERNAL_EXCLUDED_FIELDS = Object.freeze([
  "deleted_at",
  "deletedAt",
]);

const buildSafeAttributes = ({
  exclude = [],
} = {}) => {
  return {
    exclude: [
      ...DEFAULT_SAFE_EXCLUDED_FIELDS,
      ...DEFAULT_INTERNAL_EXCLUDED_FIELDS,
      ...exclude,
    ],
  };
};const buildRiskInclude = ({
  models = {},
  includeGovernance = true,
} = {}) => {
  if (!includeGovernance) return [];

  const include = [];

  if (models.IndikatorRenstra) {
    include.push({
      model: models.IndikatorRenstra,
      as: "indikator_detail",
      required: false,
      attributes: buildSafeAttributes(),
    });
  }

  if (models.RenstraOPD) {
    include.push({
      model: models.RenstraOPD,
      as: "renstra",
      required: false,
      attributes: buildSafeAttributes(),
    });
  }

  if (models.PeriodeRpjmd) {
    include.push({
      model: models.PeriodeRpjmd,
      as: "periode",
      required: false,
      attributes: buildSafeAttributes(),
    });
  }

  if (models.User) {
    include.push({
      model: models.User,
      as: "owner_user",
      required: false,
      attributes: buildSafeAttributes(),
    });
  }

  if (models.Division) {
    include.push({
      model: models.Division,
      as: "owner_division",
      required: false,
      attributes: buildSafeAttributes(),
    });
  }

  return include;
};

const buildRiskWhere = ({
  query = {},
}) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.periode_id) where.periode_id = query.periode_id;
  if (query.tahun) where.tahun = query.tahun;
  if (query.renstra_id) where.renstra_id = query.renstra_id;
  if (query.opd_id) where.opd_id = query.opd_id;
  if (query.indikator_id) where.indikator_id = query.indikator_id;
  if (query.stage) where.stage = query.stage;
  if (query.ref_id) where.ref_id = query.ref_id;
  if (query.status_revisi) where.status_revisi = query.status_revisi;
  if (query.owner_user_id) where.owner_user_id = query.owner_user_id;
  if (query.owner_division_id) where.owner_division_id = query.owner_division_id;

  return where;
};

const validateRiskCreatePayload = (payload) => {
  requireFields({
    body: payload,
    fields: MR_RISK_REQUIRED_FIELDS,
    label: "MR planning risk",
  });

  validatePlanningGovernanceLinkage({
    indikator_id: payload.indikator_id,
    stage: payload.stage,
    ref_id: payload.ref_id,
    renstra_id: payload.renstra_id,
    periode_id: payload.periode_id,
    requirePeriode: false,
  });

  validateOwnerGovernance({
    owner_user_id: payload.owner_user_id,
    owner_division_id: payload.owner_division_id,
    requireUser: false,
    requireDivision: false,
  });
};

const buildRiskValidationCandidate = ({
  current = {},
  payload = {},
}) => {
  return {
    ...current,
    ...payload,
  };
};

const validateRiskMasterReferences = async ({
  models = {},
  payload = {},
  transaction = null,
}) => {
  await validatePlanningMasterReferences({
    models,
    payload,
    transaction,
    requirePeriode: false,
  });

  await validateOwnerMasterReferences({
    models,
    payload,
    transaction,
    requireUser: false,
    requireDivision: false,
  });

  return true;
};

const findAll = async ({
  RiskModel,
  models = {},
  query = {},
  page = 1,
  limit = 20,
  includeGovernance = true,
} = {}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  const where = buildRiskWhere({ query });

  const result = await RiskModel.findAndCountAll({
    where,
    include: buildRiskInclude({
      models,
      includeGovernance,
    }),
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });

  return {
    rows: result.rows,
    count: result.count,
    page: numericPage,
    limit: numericLimit,
  };
};

const findById = async ({
  RiskModel,
  models = {},
  id,
  includeGovernance = true,
  transaction = null,
}) => {
  const record = await RiskModel.findByPk(id, {
    include: buildRiskInclude({
      models,
      includeGovernance,
    }),
    transaction,
  });

  ensureRecordExists(record, "Data MR planning risk tidak ditemukan.");

  return record;
};

const createRisk = async ({
  sequelize,
  RiskModel,
  RiskHistoryModel,
  AuditModel = null,
  models = {},
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    // alasan_revisi adalah field history, bukan field active table.
    // Jadi boleh diterima dari request, tetapi tidak boleh masuk payload active.
    const { alasan_revisi, ...bodyWithoutAlasanRevisi } = body || {};

    const payload = sanitizePayload({
      body: bodyWithoutAlasanRevisi,
      allowedFields: MR_RISK_ALLOWED_FIELDS,
      label: "MR planning risk create",
    });

    validateRiskCreatePayload(payload);

    await validateRiskMasterReferences({
      models,
      payload,
      transaction,
    });

    const created = await RiskModel.create(
      {
        ...payload,
        versi: 1,
        status_revisi: MR_STATUS.DRAFT,
        last_revised_at: new Date(),
        last_revised_by: userId,
      },
      { transaction }
    );

    const afterJson = getPlainJson(created);

    const historyPayload = buildHistoryPayload({
      activeRecord: created,
      activeId: created.id,
      historyForeignKey: MR_RISK_HISTORY_FOREIGN_KEY,
      beforeJson: null,
      afterJson,
      action: MR_ACTION.CREATE,
      statusRevisi: MR_STATUS.DRAFT,
      alasanRevisi: alasan_revisi || "Create MR planning risk.",
      userId,
      nextVersi: created.versi,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: RiskHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_RISK_ENTITY_NAME,
      tableName: MR_RISK_TABLE_NAME,
      recordId: created.id,
      action: MR_ACTION.CREATE,
      userId,
      beforeJson: null,
      afterJson,
      description: "Create MR planning risk.",
      request,
    });

    await transaction.commit();

    return {
      record: created,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateRisk = async ({
  sequelize,
  RiskModel,
  RiskHistoryModel,
  AuditModel = null,
  models = {},
  id,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const record = await RiskModel.findByPk(id, { transaction });

    ensureRecordExists(record, "Data MR planning risk tidak ditemukan.");
    ensureNotApprovedForDirectUpdate(record);
    ensureActionAllowedForRecord({
      record,
      action: MR_ACTION.UPDATE,
    });

    // alasan_revisi adalah field history, bukan field active table.
    // Jadi boleh diterima dari request, tetapi tidak boleh masuk payload update active.
    const { alasan_revisi, ...bodyWithoutAlasanRevisi } = body || {};

    const payload = sanitizePayload({
      body: bodyWithoutAlasanRevisi,
      allowedFields: MR_RISK_ALLOWED_FIELDS,
      label: "MR planning risk update",
    });

    const beforeJson = getPlainJson(record);
    const nextVersi = Number(beforeJson.versi || 0) + 1;

    const validationCandidate = buildRiskValidationCandidate({
      current: beforeJson,
      payload,
    });

    validateRiskCreatePayload(validationCandidate);

    await validateRiskMasterReferences({
      models,
      payload: validationCandidate,
      transaction,
    });

    await record.update(
      {
        ...payload,
        ...buildActiveRevisionPayload({
          action: MR_ACTION.UPDATE,
          userId,
          extra: {
            versi: nextVersi,
            status_revisi: beforeJson.status_revisi || MR_STATUS.DRAFT,
          },
        }),
      },
      { transaction }
    );

    const afterJson = getPlainJson(record);

    const historyPayload = buildHistoryPayload({
      activeRecord: record,
      activeId: record.id,
      historyForeignKey: MR_RISK_HISTORY_FOREIGN_KEY,
      beforeJson,
      afterJson,
      action: MR_ACTION.UPDATE,
      statusRevisi: afterJson.status_revisi,
      alasanRevisi: alasan_revisi || "Update MR planning risk.",
      userId,
      nextVersi,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: RiskHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_RISK_ENTITY_NAME,
      tableName: MR_RISK_TABLE_NAME,
      recordId: record.id,
      action: MR_ACTION.UPDATE,
      userId,
      beforeJson,
      afterJson,
      description: "Update MR planning risk.",
      request,
    });

    await transaction.commit();

    return {
      record,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createRevisi = async ({
  sequelize,
  RiskModel,
  RiskHistoryModel,
  AuditModel = null,
  models = {},
  id,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const record = await RiskModel.findByPk(id, { transaction });

    ensureRecordExists(record, "Data MR planning risk tidak ditemukan.");
    ensureActionAllowedForRecord({
      record,
      action: MR_ACTION.REVISI,
    });

    // alasan_revisi adalah field history, bukan field active table.
    // Jadi boleh diterima dari request, tetapi tidak boleh masuk payload update active.
    const { alasan_revisi, ...bodyWithoutAlasanRevisi } = body || {};

    const payload = sanitizePayload({
      body: bodyWithoutAlasanRevisi,
      allowedFields: MR_RISK_ALLOWED_FIELDS,
      label: "MR planning risk revisi",
    });

    const beforeJson = getPlainJson(record);
    const nextVersi = Number(beforeJson.versi || 0) + 1;

    const validationCandidate = buildRiskValidationCandidate({
      current: beforeJson,
      payload,
    });

    validateRiskCreatePayload(validationCandidate);

    await validateRiskMasterReferences({
      models,
      payload: validationCandidate,
      transaction,
    });

    await record.update(
      {
        ...payload,
        ...buildActiveRevisionPayload({
          action: MR_ACTION.REVISI,
          userId,
          extra: {
            versi: nextVersi,
            status_revisi: MR_STATUS.DRAFT,
          },
        }),
      },
      { transaction }
    );

    const afterJson = getPlainJson(record);

    const historyPayload = buildHistoryPayload({
      activeRecord: record,
      activeId: record.id,
      historyForeignKey: MR_RISK_HISTORY_FOREIGN_KEY,
      beforeJson,
      afterJson,
      action: MR_ACTION.REVISI,
      statusRevisi: MR_STATUS.DRAFT,
      alasanRevisi: alasan_revisi || "Revisi MR planning risk dari data approved.",
      userId,
      nextVersi,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: RiskHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_RISK_ENTITY_NAME,
      tableName: MR_RISK_TABLE_NAME,
      recordId: record.id,
      action: MR_ACTION.REVISI,
      userId,
      beforeJson,
      afterJson,
      description: "Create revisi MR planning risk from approved record.",
      request,
    });

    await transaction.commit();

    return {
      record,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const deleteRisk = async ({
  sequelize,
  RiskModel,
  RiskHistoryModel,
  AuditModel = null,
  id,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const record = await RiskModel.findByPk(id, { transaction });

    ensureRecordExists(record, "Data MR planning risk tidak ditemukan.");
    ensureNotApprovedForDirectUpdate(record);
    ensureActionAllowedForRecord({
      record,
      action: MR_ACTION.DELETE,
    });

    const beforeJson = getPlainJson(record);

    const historyPayload = buildHistoryPayload({
      activeRecord: record,
      activeId: record.id,
      historyForeignKey: MR_RISK_HISTORY_FOREIGN_KEY,
      beforeJson,
      afterJson: null,
      action: MR_ACTION.DELETE,
      statusRevisi: beforeJson.status_revisi,
      alasanRevisi: "Delete MR planning risk.",
      userId,
      nextVersi: beforeJson.versi,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: RiskHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await record.destroy({ transaction });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_RISK_ENTITY_NAME,
      tableName: MR_RISK_TABLE_NAME,
      recordId: id,
      action: MR_ACTION.DELETE,
      userId,
      beforeJson,
      afterJson: null,
      description: "Delete MR planning risk.",
      request,
    });

    await transaction.commit();

    return {
      deleted: true,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  MR_RISK_TABLE_NAME,
  MR_RISK_ENTITY_NAME,
  MR_RISK_HISTORY_FOREIGN_KEY,
  MR_RISK_ALLOWED_FIELDS,
  MR_RISK_REQUIRED_FIELDS,
  DEFAULT_SAFE_EXCLUDED_FIELDS,
  DEFAULT_INTERNAL_EXCLUDED_FIELDS,

  buildRiskInclude,
  buildRiskWhere,
  buildSafeAttributes,
  validateRiskCreatePayload,
  buildRiskValidationCandidate,
  validateRiskMasterReferences,

  findAll,
  findById,
  createRisk,
  updateRisk,
  createRevisi,
  deleteRisk,
};