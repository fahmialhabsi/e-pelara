"use strict";

/**
 * MR Warning Engine Service
 * ---------------------------------------------------------------------------
 * Supporting service untuk mr_planning_warning.
 *
 * Prinsip:
 * - Warning harus punya risk id.
 * - Warning critical dapat memblokir proses governance.
 * - Warning dapat dibaca/ditandai read.
 */

const {
  ensureRecordExists,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  buildWarningPayload,
  buildRiskLevelWarning,
  buildDeviationWarning,
  buildApprovalPendingWarning,
  buildCrossSystemWarning,
  buildReadWarningPayload,
  throwIfCriticalWarnings,
} = require("../../helpers/mr/mrWarningHelper");

const buildWarningWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.mr_planning_risk_id) {
    where.mr_planning_risk_id = query.mr_planning_risk_id;
  }
  if (query.warning_type) where.warning_type = query.warning_type;
  if (query.warning_level) where.warning_level = query.warning_level;
  if (query.is_read !== undefined) where.is_read = query.is_read;
  if (query.source_table) where.source_table = query.source_table;
  if (query.source_id) where.source_id = query.source_id;

  return where;
};

const findAll = async ({
  WarningModel,
  query = {},
  page = 1,
  limit = 20,
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  return WarningModel.findAndCountAll({
    where: buildWarningWhere({ query }),
    order: [
      ["created_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });
};

const createWarning = async ({
  sequelize,
  WarningModel,
  payload,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const warningPayload = buildWarningPayload(payload);
    const warning = await WarningModel.create(warningPayload, { transaction });

    await transaction.commit();

    return warning;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createRiskLevelWarning = async ({
  sequelize,
  WarningModel,
  riskId,
  levelRisiko,
  skorRisiko = null,
}) => {
  return createWarning({
    sequelize,
    WarningModel,
    payload: buildRiskLevelWarning({
      riskId,
      levelRisiko,
      skorRisiko,
    }),
  });
};

const createDeviationWarning = async ({
  sequelize,
  WarningModel,
  riskId,
  deviationLevel,
  message,
  sourceId = null,
}) => {
  return createWarning({
    sequelize,
    WarningModel,
    payload: buildDeviationWarning({
      riskId,
      deviationLevel,
      message,
      sourceId,
    }),
  });
};

const createApprovalPendingWarning = async ({
  sequelize,
  WarningModel,
  riskId,
  sourceId = null,
}) => {
  return createWarning({
    sequelize,
    WarningModel,
    payload: buildApprovalPendingWarning({
      riskId,
      sourceId,
    }),
  });
};

const createCrossSystemWarning = async ({
  sequelize,
  WarningModel,
  riskId,
  message,
  sourceId = null,
}) => {
  return createWarning({
    sequelize,
    WarningModel,
    payload: buildCrossSystemWarning({
      riskId,
      message,
      sourceId,
    }),
  });
};

const markAsRead = async ({
  sequelize,
  WarningModel,
  id,
  userId,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const warning = await WarningModel.findByPk(id, { transaction });

    ensureRecordExists(warning, "Warning MR tidak ditemukan.");

    await warning.update(
      buildReadWarningPayload({ userId }),
      { transaction }
    );

    await transaction.commit();

    return warning;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const assertNoCriticalWarning = async ({
  WarningModel,
  riskId,
}) => {
  const warnings = await WarningModel.findAll({
    where: {
      mr_planning_risk_id: riskId,
      warning_level: "critical",
      is_read: false,
    },
  });

  throwIfCriticalWarnings({ warnings });

  return true;
};

module.exports = {
  buildWarningWhere,
  findAll,
  createWarning,
  createRiskLevelWarning,
  createDeviationWarning,
  createApprovalPendingWarning,
  createCrossSystemWarning,
  markAsRead,
  assertNoCriticalWarning,
};