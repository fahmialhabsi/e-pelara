"use strict";

/**
 * MR Mitigation Service
 * ---------------------------------------------------------------------------
 * Supporting service untuk mr_planning_mitigation.
 *
 * Prinsip:
 * - Mitigation bukan RTP SPIP baru.
 * - Jika masuk ranah SPIP formal, linkage diarahkan ke e-SIGAP/SPIP.
 * - Semua write operation memakai transaction.
 * - Perubahan membuat history.
 * - History memakai field nyata:
 *   versi_sebelum, versi_sesudah, before_json, after_json,
 *   dibuat_oleh, dibuat_pada, dst.
 */

const {
  MR_ACTION,
  MR_STATUS,
  ensureRecordExists,
  ensureNotApprovedForDirectUpdate,
  ensureActionAllowedForRecord,
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
  validateIntegerId,
  validateOwnerGovernance,
} = require("../../helpers/mr/mrValidationHelper");

const MR_MITIGATION_TABLE_NAME = "mr_planning_mitigation";
const MR_MITIGATION_ENTITY_NAME = "mr_planning_mitigation";
const MR_MITIGATION_HISTORY_FOREIGN_KEY = "mr_planning_mitigation_id";

const MR_MITIGATION_ALLOWED_FIELDS = Object.freeze([
  "mr_planning_risk_id",
  "uraian_mitigasi",
  "jenis_mitigasi",
  "target_output",
  "target_tanggal",
  "tanggal_mulai",
  "tanggal_selesai",
  "penanggung_jawab",
  "owner_user_id",
  "owner_division_id",
  "status_mitigasi",
  "progress_persen",
  "kendala",
  "tindak_lanjut",
  "linked_spip_rtp_id",
  "linked_spip_monitoring_id",
  "linked_spip_evidence_id",
]);

const MR_MITIGATION_REQUIRED_FIELDS = Object.freeze([
  "mr_planning_risk_id",
  "uraian_mitigasi",
]);

const pickModelAttributes = ({ Model, payload }) => {
  if (!Model?.rawAttributes) return payload;

  const allowed = Object.keys(Model.rawAttributes);

  return Object.keys(payload || {}).reduce((result, key) => {
    if (allowed.includes(key)) result[key] = payload[key];
    return result;
  }, {});
};

const validateMitigationPayload = (payload) => {
  requireFields({
    body: payload,
    fields: MR_MITIGATION_REQUIRED_FIELDS,
    label: "MR planning mitigation",
  });

  validateIntegerId({
    value: payload.mr_planning_risk_id,
    fieldName: "mr_planning_risk_id",
  });

  validateOwnerGovernance({
    owner_user_id: payload.owner_user_id,
    owner_division_id: payload.owner_division_id,
    requireUser: false,
    requireDivision: false,
  });
};

const buildMitigationWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.mr_planning_risk_id) {
    where.mr_planning_risk_id = query.mr_planning_risk_id;
  }
  if (query.status_revisi) where.status_revisi = query.status_revisi;
  if (query.status_mitigasi) where.status_mitigasi = query.status_mitigasi;
  if (query.owner_user_id) where.owner_user_id = query.owner_user_id;
  if (query.owner_division_id) where.owner_division_id = query.owner_division_id;

  return where;
};

const findAll = async ({
  MitigationModel,
  query = {},
  page = 1,
  limit = 20,
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  return MitigationModel.findAndCountAll({
    where: buildMitigationWhere({ query }),
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });
};

const findById = async ({
  MitigationModel,
  id,
  transaction = null,
}) => {
  const record = await MitigationModel.findByPk(id, { transaction });
  ensureRecordExists(record, "Data MR mitigation tidak ditemukan.");
  return record;
};

const createMitigation = async ({
  sequelize,
  MitigationModel,
  MitigationHistoryModel,
  AuditModel = null,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const payload = sanitizePayload({
      body,
      allowedFields: MR_MITIGATION_ALLOWED_FIELDS,
      label: "MR mitigation create",
    });

    validateMitigationPayload(payload);

    const createPayload = pickModelAttributes({
      Model: MitigationModel,
      payload: {
        ...payload,
        versi: 1,
        status_revisi: MR_STATUS.DRAFT,
      },
    });

    const created = await MitigationModel.create(createPayload, { transaction });

    const afterJson = getPlainJson(created);

    const historyPayload = buildHistoryPayload({
      activeRecord: created,
      activeId: created.id,
      historyForeignKey: MR_MITIGATION_HISTORY_FOREIGN_KEY,
      beforeJson: null,
      afterJson,
      action: MR_ACTION.CREATE,
      statusRevisi: MR_STATUS.DRAFT,
      alasanRevisi: body?.alasan_revisi || "Create MR mitigation.",
      userId,
      nextVersi: created.versi,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: MitigationHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_MITIGATION_ENTITY_NAME,
      tableName: MR_MITIGATION_TABLE_NAME,
      recordId: created.id,
      action: MR_ACTION.CREATE,
      userId,
      beforeJson: null,
      afterJson,
      description: "Create MR mitigation.",
      request,
    });

    await transaction.commit();

    return { record: created, history };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateMitigation = async ({
  sequelize,
  MitigationModel,
  MitigationHistoryModel,
  AuditModel = null,
  id,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const record = await MitigationModel.findByPk(id, { transaction });

    ensureRecordExists(record, "Data MR mitigation tidak ditemukan.");
    ensureNotApprovedForDirectUpdate(record);
    ensureActionAllowedForRecord({
      record,
      action: MR_ACTION.UPDATE,
    });

    const payload = sanitizePayload({
      body,
      allowedFields: MR_MITIGATION_ALLOWED_FIELDS,
      label: "MR mitigation update",
    });

    const beforeJson = getPlainJson(record);
    const nextVersi = Number(beforeJson.versi || 0) + 1;

    const updatePayload = pickModelAttributes({
      Model: MitigationModel,
      payload: {
        ...payload,
        versi: nextVersi,
      },
    });

    await record.update(updatePayload, { transaction });

    const afterJson = getPlainJson(record);

    const historyPayload = buildHistoryPayload({
      activeRecord: record,
      activeId: record.id,
      historyForeignKey: MR_MITIGATION_HISTORY_FOREIGN_KEY,
      beforeJson,
      afterJson,
      action: MR_ACTION.UPDATE,
      statusRevisi: afterJson.status_revisi,
      alasanRevisi: body?.alasan_revisi || "Update MR mitigation.",
      userId,
      nextVersi,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: MitigationHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_MITIGATION_ENTITY_NAME,
      tableName: MR_MITIGATION_TABLE_NAME,
      recordId: record.id,
      action: MR_ACTION.UPDATE,
      userId,
      beforeJson,
      afterJson,
      description: "Update MR mitigation.",
      request,
    });

    await transaction.commit();

    return { record, history };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  MR_MITIGATION_TABLE_NAME,
  MR_MITIGATION_ENTITY_NAME,
  MR_MITIGATION_HISTORY_FOREIGN_KEY,
  MR_MITIGATION_ALLOWED_FIELDS,
  MR_MITIGATION_REQUIRED_FIELDS,

  pickModelAttributes,
  validateMitigationPayload,
  buildMitigationWhere,
  findAll,
  findById,
  createMitigation,
  updateMitigation,
};