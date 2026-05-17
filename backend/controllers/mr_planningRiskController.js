// backend/controllers/mr_planningRiskController.js
"use strict";

/**
 * MR Planning Risk Controller
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 4 Controller Foundation
 *
 * Controller pertama untuk MR e-Pelara:
 * - findAll
 * - findById
 * - create
 * - update
 * - createRevisi
 * - getHistory
 * - getHistoryDetail
 * - verifikasiHistory
 * - approveHistory
 * - tolakHistory
 * - rebuildActiveFromHistory
 * - delete
 *
 * Prinsip:
 * - Controller tipis.
 * - Controller tidak membuat transaction manual.
 * - Controller tidak membuat history manual.
 * - Controller tidak membuat audit manual.
 * - Controller tidak melakukan rebuild manual.
 * - Controller tidak update langsung data approved.
 * - Semua write operation diserahkan ke service.
 * - Semua response diserahkan ke mrResponseHelper.
 */

const db = require("../models");

const mrRiskService = require("../services/mr/mrRiskService");
const mrApprovalService = require("../services/mr/mrApprovalService");
const mrHistoryService = require("../services/mr/mrHistoryService");
const mrRebuildService = require("../services/mr/mrRebuildService");
const mrPlanningRiskContextService = require("../services/mr/mrPlanningRiskService");

const {
  successResponse,
  createdResponse,
  errorResponse,
  paginatedResponse,
} = require("../helpers/mr/mrResponseHelper");

const {
  createGovernanceError,
} = require("../helpers/mr/mrApprovalHelper");

const REQUIRED_MODELS = Object.freeze({
  RiskModel: "MrPlanningRisk",
  RiskHistoryModel: "MrPlanningRiskHistory",
});

const OPTIONAL_AUDIT_MODELS = Object.freeze([
  "RenstraAuditLogGlobal",
  "PlanningAuditEvent",
  "PlanningAuditEvents",
  "TenantAuditLog",
  "TenantAuditLogs",
]);

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const getModelOrThrow = (modelName) => {
  const model = db[modelName];

  if (!model) {
    throw createGovernanceError({
      message: `Model ${modelName} belum terdaftar di models/index.js.`,
      status: 500,
      blocked: true,
      auditMode: true,
      code: "MR_MODEL_NOT_REGISTERED",
      details: {
        model_name: modelName,
      },
    });
  }

  return model;
};

const getOptionalAuditModel = () => {
  for (const modelName of OPTIONAL_AUDIT_MODELS) {
    if (db[modelName]) {
      return db[modelName];
    }
  }

  return null;
};

const getRequiredModels = () => {
  return {
    sequelize: db.sequelize,
    RiskModel: getModelOrThrow(REQUIRED_MODELS.RiskModel),
    RiskHistoryModel: getModelOrThrow(REQUIRED_MODELS.RiskHistoryModel),
    AuditModel: getOptionalAuditModel(),
  };
};

const getUserId = (req) => {
  const userId =
    req.user?.id ||
    req.user?.user_id ||
    req.user?.userId ||
    req.auth?.id ||
    req.auth?.user_id ||
    req.body?.user_id ||
    null;

  if (!userId) {
    throw createGovernanceError({
      message: "User actor tidak ditemukan. Pastikan endpoint memakai verifyToken.",
      status: 401,
      blocked: true,
      auditMode: true,
      code: "MR_USER_ACTOR_NOT_FOUND",
    });
  }

  return userId;
};

const getUserForContextService = (req) => {
  const userId = getUserId(req);

  return {
    ...(req.user || req.auth || req.authUser || req.currentUser || {}),
    id: userId,
    user_id: userId,
    userId,
  };
};

const getPagination = (req) => {
  const page = Number(req.query.page || DEFAULT_PAGE);
  const limit = Number(req.query.limit || DEFAULT_LIMIT);

  return {
    page: Number.isNaN(page) || page <= 0 ? DEFAULT_PAGE : page,
    limit: Number.isNaN(limit) || limit <= 0 ? DEFAULT_LIMIT : limit,
  };
};

const getRiskQuery = (req) => {
  return {
    id: req.query.id,
    periode_id: req.query.periode_id,
    tahun: req.query.tahun,
    renstra_id: req.query.renstra_id,
    opd_id: req.query.opd_id,
    indikator_id: req.query.indikator_id,
    stage: req.query.stage,
    ref_id: req.query.ref_id,
    status_revisi: req.query.status_revisi,
    owner_user_id: req.query.owner_user_id,
    owner_division_id: req.query.owner_division_id,
  };
};

const getGovernanceModelsForService = () => {
  return {
    // Master planning governance
    IndikatorRenstra: db.IndikatorRenstra,
    RenstraOPD: db.RenstraOPD || db.RenstraOpd,
    PeriodeRpjmd: db.PeriodeRpjmd || db.PeriodeRPJMD,

    // Ownership governance
    User: db.User || db.Users,
    Division: db.Division || db.Divisions,

    // Stage governance reference
    RenstraTabelTujuan: db.RenstraTabelTujuan,
    RenstraTabelSasaran: db.RenstraTabelSasaran,
    RenstraTabelStrategi: db.RenstraTabelStrategi,
    RenstraTabelArahKebijakan: db.RenstraTabelArahKebijakan,
    RenstraTabelProgram: db.RenstraTabelProgram,
    RenstraTabelKegiatan: db.RenstraTabelKegiatan,

    // Guard variasi penamaan existing
    RenstraTabelSubkegiatan:
      db.RenstraTabelSubkegiatan || db.RenstraTabelSubKegiatan,
  };
};

const findAll = async (req, res) => {
  try {
    const { RiskModel } = getRequiredModels();
    const { page, limit } = getPagination(req);

    const result = await mrRiskService.findAll({
      RiskModel,
      models: getGovernanceModelsForService(),
      query: getRiskQuery(req),
      page,
      limit,
      includeGovernance: req.query.include_governance !== "false",
    });

    const enrichedRows =
      await mrPlanningRiskContextService.enrichRisksWithContextItems(
        result.rows || []
      );

    return paginatedResponse({
      res,
      message: "Data MR planning risk berhasil dimuat.",
      data: enrichedRows,
      page: result.page,
      limit: result.limit,
      total: result.count,
      extraMeta: {
        filters: getRiskQuery(req),
        enriched_context_item: true,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const isProposalIntakeRiskRecord = (record = {}) => {
  const stage = String(record.stage || "").toLowerCase();
  const sourceTable = String(record.source_table || "").toLowerCase();

  return (
    Boolean(record.proposal_source_type) ||
    sourceTable === "proposal_intake" ||
    !record.renstra_id ||
    !record.indikator_id ||
    [
      "temuan_bpk",
      "temuan_inspektorat",
      "pelaksanaan_kegiatan",
      "pertanggungjawaban_keuangan",
      "laporan_keuangan",
      "lk",
      "lakip",
      "spip_e_sigap",
      "manual_adhoc",
      "lainnya",
    ].includes(stage)
  );
};

const findById = async (req, res) => {
  try {
    const { RiskModel } = getRequiredModels();

    // Ambil base record dulu tanpa governance.
    // Ini penting untuk data proposal-intake/non-Renstra karena indikator_id/renstra_id bisa null.
    const baseRecord = await mrRiskService.findById({
      RiskModel,
      models: getGovernanceModelsForService(),
      id: req.params.id,
      includeGovernance: false,
    });

    const isProposalRecord = isProposalIntakeRiskRecord(baseRecord);

    if (isProposalRecord) {
      const enrichedProposalRecord =
        await mrPlanningRiskContextService.enrichRiskWithContextItem(baseRecord);

      return successResponse({
        res,
        message: "Detail MR planning risk proposal-intake berhasil dimuat.",
        data: enrichedProposalRecord,
        meta: {
          include_governance: false,
          enriched_context_item: true,
          proposal_intake_mode: true,
        },
      });
    }

    // Untuk data Renstra, governance tetap boleh dimuat.
    const record = await mrRiskService.findById({
      RiskModel,
      models: getGovernanceModelsForService(),
      id: req.params.id,
      includeGovernance: req.query.include_governance !== "false",
    });

    const enrichedRecord =
      await mrPlanningRiskContextService.enrichRiskWithContextItem(record);

    return successResponse({
      res,
      message: "Detail MR planning risk berhasil dimuat.",
      data: enrichedRecord,
      meta: {
        include_governance: req.query.include_governance !== "false",
        enriched_context_item: true,
        proposal_intake_mode: false,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const create = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrRiskService.createRisk({
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
      models: getGovernanceModelsForService(),
      body: req.body,
      userId,
      request: req,
    });

    return createdResponse({
      res,
      message: "MR planning risk berhasil dibuat sebagai draft.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const update = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrRiskService.updateRisk({
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
      models: getGovernanceModelsForService(),
      id: req.params.id,
      body: req.body,
      userId,
      request: req,
    });

    return successResponse({
      res,
      message: "MR planning risk berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createRevisi = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrRiskService.createRevisi({
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
      models: getGovernanceModelsForService(),
      id: req.params.id,
      body: req.body,
      userId,
      request: req,
    });

    return createdResponse({
      res,
      message: "Revisi MR planning risk berhasil dibuat sebagai draft.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getHistory = async (req, res) => {
  try {
    const { RiskHistoryModel } = getRequiredModels();

    const histories = await mrHistoryService.getHistoryByActiveId({
      HistoryModel: RiskHistoryModel,
      activeId: req.params.id,
      historyForeignKey: "mr_planning_risk_id",
      status_revisi: req.query.status_revisi || null,
    });

    return successResponse({
      res,
      message: "History MR planning risk berhasil dimuat.",
      data: mrHistoryService.mapHistoriesForFrontend(histories),
      meta: {
        mr_planning_risk_id: req.params.id,
        total: histories.length,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getHistoryDetail = async (req, res) => {
  try {
    const { RiskHistoryModel } = getRequiredModels();

    const history = await mrHistoryService.getHistoryDetail({
      HistoryModel: RiskHistoryModel,
      historyId: req.params.history_id || req.params.id,
    });

    return successResponse({
      res,
      message: "Detail history MR planning risk berhasil dimuat.",
      data: mrHistoryService.mapHistoryForFrontend(history),
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const verifikasiHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrApprovalService.verifikasiHistory({
      sequelize,
      ActiveModel: RiskModel,
      HistoryModel: RiskHistoryModel,
      AuditModel,
      historyId: req.params.history_id || req.params.id,
      userId,
      note: req.body?.alasan_revisi || req.body?.catatan || null,
      historyForeignKey: "mr_planning_risk_id",
      request: req,
    });

    return successResponse({
      res,
      message: "History MR planning risk berhasil diverifikasi.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const approveHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrApprovalService.approveHistory({
      sequelize,
      ActiveModel: RiskModel,
      HistoryModel: RiskHistoryModel,
      AuditModel,
      historyId: req.params.history_id || req.params.id,
      userId,
      note: req.body?.alasan_revisi || req.body?.catatan || null,
      historyForeignKey: "mr_planning_risk_id",
      request: req,
    });

    return successResponse({
      res,
      message: "History MR planning risk berhasil disetujui.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const tolakHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrApprovalService.tolakHistory({
      sequelize,
      ActiveModel: RiskModel,
      HistoryModel: RiskHistoryModel,
      AuditModel,
      historyId: req.params.history_id || req.params.id,
      userId,
      note:
        req.body?.alasan_revisi ||
        req.body?.alasan_penolakan ||
        req.body?.catatan ||
        null,
      historyForeignKey: "mr_planning_risk_id",
      request: req,
    });

    return successResponse({
      res,
      message: "History MR planning risk berhasil ditolak.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const rebuildActiveFromHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrRebuildService.rebuildRiskActiveFromHistory({
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
      id: req.params.id,
      userId,
      alasanRevisi: req.body?.alasan_revisi || null,
      request: req,
    });

    return successResponse({
      res,
      message: "Active MR planning risk berhasil direbuild dari history approved terakhir.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const remove = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
    } = getRequiredModels();

    const result = await mrRiskService.deleteRisk({
      sequelize,
      RiskModel,
      RiskHistoryModel,
      AuditModel,
      id: req.params.id,
      userId,
      request: req,
    });

    return successResponse({
      res,
      message: "MR planning risk berhasil dihapus.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

// =====================================================
// PHASE 4 — STEP 10A
// Context-based MR Planning Risk Service Controller
// =====================================================

const getRisksByContext = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.getRisksByContext({
      contextId: req.params.contextId,
      limit: req.query.limit,
      offset: req.query.offset,
    });

    return successResponse({
      res,
      message: result.message || "Daftar MR planning risk berdasarkan context berhasil dimuat.",
      data: result.data,
      meta: {
        context_id: req.params.contextId,
        total: result.total,
        limit: Number(req.query.limit || 50),
        offset: Number(req.query.offset || 0),
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createRiskFromContext = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.createRiskFromContext({
      contextId: req.params.contextId,
      body: req.body,
      user: getUserForContextService(req),
    });

    return createdResponse({
      res,
      message: result.message || "MR planning risk berhasil dibuat dari context.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createProposalIntake = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.createProposalIntake({
      body: req.body,
      user: getUserForContextService(req),
    });

    return createdResponse({
      res,
      message:
        result.message || "Draft usulan risiko berhasil dibuat dari proposal intake.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const updateDraftRiskFromContextService = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.updateDraftRisk({
      riskId: req.params.id,
      body: req.body,
      user: getUserForContextService(req),
    });

    return successResponse({
      res,
      message: result.message || "Draft MR planning risk berhasil diperbarui.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const submitRiskForVerification = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.submitRiskForVerification({
      riskId: req.params.id,
      user: getUserForContextService(req),
    });

    return successResponse({
      res,
      message: result.message || "MR planning risk berhasil diajukan untuk verifikasi.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const verifyRiskFromContextService = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.verifyRisk({
      riskId: req.params.id,
      user: getUserForContextService(req),
    });

    return successResponse({
      res,
      message: result.message || "MR planning risk berhasil diverifikasi.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const approveRiskFromContextService = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.approveRisk({
      riskId: req.params.id,
      user: getUserForContextService(req),
    });

    return successResponse({
      res,
      message: result.message || "MR planning risk berhasil disetujui.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const rejectRiskFromContextService = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.rejectRisk({
      riskId: req.params.id,
      reason:
        req.body?.reason ||
        req.body?.alasan_revisi ||
        req.body?.alasan_penolakan ||
        req.body?.catatan ||
        null,
      user: getUserForContextService(req),
    });

    return successResponse({
      res,
      message: result.message || "MR planning risk berhasil ditolak.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createRevisionFromApprovedRiskContextService = async (req, res) => {
  try {
    const result =
      await mrPlanningRiskContextService.createRevisionFromApprovedRisk({
        riskId: req.params.id,
        body: req.body,
        user: getUserForContextService(req),
      });

    return createdResponse({
      res,
      message:
        result.message ||
        "Revisi MR planning risk berhasil dibuat sebagai draft.",
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const repairPlaceholderRiskSources = async (req, res) => {
  try {
    const result = await mrPlanningRiskContextService.repairPlaceholderRiskSources({
      riskIds: req.body?.risk_ids || req.body?.riskIds || [],
      contextItemId: req.body?.context_item_id || req.body?.contextItemId || null,
      payload: req.body?.payload || req.body || {},
      user: getUserForContextService(req),
    });

    return successResponse({
      res,
      message: result.message || 'Placeholder sumber risiko berhasil diperbarui.',
      data: result.data,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  createRevisi,
  getHistory,
  getHistoryDetail,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  rebuildActiveFromHistory,
  delete: remove,

   // PHASE 4 — STEP 10A Context-based service endpoints
  getRisksByContext,
  createRiskFromContext,

  // PHASE REPORT 2026 — STEP R17A-2B Proposal intake endpoint
  createProposalIntake,
  
  updateDraftRiskFromContextService,
  submitRiskForVerification,
  verifyRiskFromContextService,
  approveRiskFromContextService,
  rejectRiskFromContextService,

  // PHASE 4 — STEP 10D Context-based revision/versioning endpoint
  createRevisionFromApprovedRiskContextService,
  repairPlaceholderRiskSources,
};
