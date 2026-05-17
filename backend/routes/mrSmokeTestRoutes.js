"use strict";

const express = require("express");
const router = express.Router();
const db = require("../models");
const parsePositiveInt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const buildIdWhere = (id) => {
  return id ? { id } : undefined;
};

const buildRiskWhere = (riskId) => {
  return riskId ? { id: riskId } : undefined;
};

const buildQueryMeta = ({ query = {}, resolved = {} }) => {
  return {
    query,
    resolved,
    deterministic: Object.values(resolved).some((value) => value !== null),
  };
};

/**
 * GET /api/mr-smoke/models
 * Cek semua model MR sudah masuk registry Sequelize.
 */
router.get("/models", async (req, res) => {
  try {
    const requiredModels = [
      "MrReferenceGroup",
      "MrReferenceItem",
      "MrRiskMatrix",
      "MrPlanningContext",
      "MrPlanningContextItem",
      "MrPlanningContextStakeholder",
      "MrPlanningRisk",
      "MrPlanningRiskHistory",
      "MrPlanningRiskAnalysis",
      "MrPlanningRootCause",
      "MrPlanningMitigation",
      "MrPlanningMitigationHistory",
      "MrPlanningMonitoring",
      "MrPlanningMonitoringHistory",
      "MrPlanningDeviation",
      "MrPlanningApprovalMonitoring",
      "MrPlanningWarning",
      "MrPlanningSnapshot",
      "MrPlanningDashboardSummary",
      "MrCrossSystemLink",
      "MrPlanningReportExport",
    ];

    const result = requiredModels.map((modelName) => ({
      model: modelName,
      loaded: Boolean(db[modelName]),
    }));

    const missing = result.filter((item) => !item.loaded);

    return res.json({
      success: missing.length === 0,
      message:
        missing.length === 0
          ? "Semua model MR berhasil terdaftar."
          : "Ada model MR yang belum terdaftar.",
      total_required: requiredModels.length,
      total_loaded: result.filter((item) => item.loaded).length,
      missing,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal smoke test registry model MR.",
      error: error.message,
    });
  }
});

/**
 * GET /api/mr-smoke/associations
 * Cek alias association utama sudah terbentuk.
 */
router.get("/associations", async (req, res) => {
  try {
    const modelNames = [
      "MrReferenceGroup",
      "MrReferenceItem",
      "MrRiskMatrix",
      "MrPlanningContext",
      "MrPlanningContextItem",
      "MrPlanningContextStakeholder",
      "MrPlanningRisk",
      "MrPlanningRiskHistory",
      "MrPlanningRiskAnalysis",
      "MrPlanningRootCause",
      "MrPlanningMitigation",
      "MrPlanningMitigationHistory",
      "MrPlanningMonitoring",
      "MrPlanningMonitoringHistory",
      "MrPlanningDeviation",
      "MrPlanningApprovalMonitoring",
      "MrPlanningWarning",
      "MrPlanningSnapshot",
      "MrPlanningDashboardSummary",
      "MrCrossSystemLink",
      "MrPlanningReportExport",
    ];

    const result = modelNames.map((modelName) => ({
      model: modelName,
      loaded: Boolean(db[modelName]),
      associations: db[modelName]
        ? Object.keys(db[modelName].associations || {})
        : [],
    }));

    return res.json({
      success: true,
      message: "Daftar association MR berhasil dibaca.",
      result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal membaca association MR.",
      error: error.message,
    });
  }
});

/**
 * GET /api/mr-smoke/context-chain
 * Cek include context utama.
 */
router.get("/context-chain", async (req, res) => {
  try {
    const contextId = parsePositiveInt(req.query.context_id);

    const row = await db.MrPlanningContext.findOne({
      where: buildIdWhere(contextId),
      order: [["id", "DESC"]],
      include: [
        {
          model: db.MrPlanningContextItem,
          as: "items",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningContextStakeholder,
          as: "stakeholders",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningRisk,
          as: "risks",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningSnapshot,
          as: "snapshots",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningDashboardSummary,
          as: "dashboard_summaries",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningReportExport,
          as: "report_exports",
          required: false,
          limit: 5,
        },
      ],
    });

    return res.json({
      success: true,
      message:
        "Smoke test context-chain berhasil. Jika context_id dikirim, hasil difilter deterministic berdasarkan context_id.",
      query_meta: buildQueryMeta({
        query: req.query,
        resolved: {
          context_id: contextId,
        },
      }),
      data_exists: Boolean(row),
      data: row,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Smoke test context-chain gagal.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/mr-smoke/risk-chain
 * Cek include risk → history/analysis/root cause/mitigation/monitoring/deviation/warning.
 */
router.get("/risk-chain", async (req, res) => {
  try {
    const riskId = parsePositiveInt(req.query.risk_id);

    const row = await db.MrPlanningRisk.findOne({
      where: buildRiskWhere(riskId),
      order: [["id", "DESC"]],
      include: [
        {
          model: db.MrPlanningContext,
          as: "context",
          required: false,
        },
        {
          model: db.MrPlanningRiskHistory,
          as: "histories",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningRiskAnalysis,
          as: "analyses",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningRootCause,
          as: "root_causes",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningMitigation,
          as: "mitigations",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningMonitoring,
          as: "monitorings",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningDeviation,
          as: "deviations",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningWarning,
          as: "warnings",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningApprovalMonitoring,
          as: "approvals",
          required: false,
          limit: 5,
        },
        {
          model: db.MrCrossSystemLink,
          as: "cross_system_links",
          required: false,
          limit: 5,
        },
      ],
    });

    return res.json({
      success: true,
      message:
        "Smoke test risk-chain berhasil. Jika risk_id dikirim, hasil difilter deterministic berdasarkan risk_id.",
      query_meta: buildQueryMeta({
        query: req.query,
        resolved: {
          risk_id: riskId,
        },
      }),
      data_exists: Boolean(row),
      data: row,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Smoke test risk-chain gagal.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/mr-smoke/mitigation-chain
 * Cek mitigation → risk/context/analysis/root cause/history/monitoring/warning/cross-system.
 */
router.get("/mitigation-chain", async (req, res) => {
  try {
    const mitigationId = parsePositiveInt(req.query.mitigation_id);
    const riskId = parsePositiveInt(req.query.risk_id);

    const where = {};

    if (mitigationId) {
      where.id = mitigationId;
    }

    if (riskId) {
      where.mr_planning_risk_id = riskId;
    }

    const row = await db.MrPlanningMitigation.findOne({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: [["id", "DESC"]],
      include: [
        {
          model: db.MrPlanningRisk,
          as: "risk",
          required: false,
        },
        {
          model: db.MrPlanningContext,
          as: "context",
          required: false,
        },
        {
          model: db.MrPlanningRiskAnalysis,
          as: "analysis",
          required: false,
        },
        {
          model: db.MrPlanningRootCause,
          as: "root_cause",
          required: false,
        },
        {
          model: db.MrPlanningMitigationHistory,
          as: "histories",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningMonitoring,
          as: "monitorings",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningWarning,
          as: "warnings",
          required: false,
          limit: 5,
        },
        {
          model: db.MrCrossSystemLink,
          as: "cross_system_links",
          required: false,
          limit: 5,
        },
      ],
    });

    return res.json({
      success: true,
      message:
        "Smoke test mitigation-chain berhasil. Jika mitigation_id atau risk_id dikirim, hasil difilter deterministic.",
      query_meta: buildQueryMeta({
        query: req.query,
        resolved: {
          mitigation_id: mitigationId,
          risk_id: riskId,
        },
      }),
      data_exists: Boolean(row),
      data: row,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Smoke test mitigation-chain gagal.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/mr-smoke/monitoring-chain
 * Cek monitoring → risk/mitigation/context/history/deviation/warning/cross-system.
 */
router.get("/monitoring-chain", async (req, res) => {
  try {
    const monitoringId = parsePositiveInt(req.query.monitoring_id);
    const riskId = parsePositiveInt(req.query.risk_id);
    const mitigationId = parsePositiveInt(req.query.mitigation_id);

    const where = {};

    if (monitoringId) {
      where.id = monitoringId;
    }

    if (riskId) {
      where.mr_planning_risk_id = riskId;
    }

    if (mitigationId) {
      where.mr_planning_mitigation_id = mitigationId;
    }

    const row = await db.MrPlanningMonitoring.findOne({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: [["id", "DESC"]],
      include: [
        {
          model: db.MrPlanningRisk,
          as: "risk",
          required: false,
        },
        {
          model: db.MrPlanningMitigation,
          as: "mitigation",
          required: false,
        },
        {
          model: db.MrPlanningContext,
          as: "context",
          required: false,
        },
        {
          model: db.MrPlanningMonitoringHistory,
          as: "histories",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningDeviation,
          as: "deviations",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningWarning,
          as: "warnings",
          required: false,
          limit: 5,
        },
        {
          model: db.MrCrossSystemLink,
          as: "cross_system_links",
          required: false,
          limit: 5,
        },
      ],
    });

    return res.json({
      success: true,
      message:
        "Smoke test monitoring-chain berhasil. Jika monitoring_id, risk_id, atau mitigation_id dikirim, hasil difilter deterministic.",
      query_meta: buildQueryMeta({
        query: req.query,
        resolved: {
          monitoring_id: monitoringId,
          risk_id: riskId,
          mitigation_id: mitigationId,
        },
      }),
      data_exists: Boolean(row),
      data: row,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Smoke test monitoring-chain gagal.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/mr-smoke/snapshot-output-chain
 * Cek snapshot → warning/dashboard/report.
 */
router.get("/snapshot-output-chain", async (req, res) => {
  try {
    const snapshotId = parsePositiveInt(req.query.snapshot_id);
    const contextId = parsePositiveInt(req.query.context_id);

    const where = {};

    if (snapshotId) {
      where.id = snapshotId;
    }

    if (contextId) {
      where.context_id = contextId;
    }

    const row = await db.MrPlanningSnapshot.findOne({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: [["id", "DESC"]],
      include: [
        {
          model: db.MrPlanningContext,
          as: "context",
          required: false,
        },
        {
          model: db.MrPlanningWarning,
          as: "warnings",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningDashboardSummary,
          as: "dashboard_summaries",
          required: false,
          limit: 5,
        },
        {
          model: db.MrPlanningReportExport,
          as: "report_exports",
          required: false,
          limit: 5,
        },
      ],
    });

    return res.json({
      success: true,
      message:
        "Smoke test snapshot-output-chain berhasil. Jika snapshot_id atau context_id dikirim, hasil difilter deterministic.",
      query_meta: buildQueryMeta({
        query: req.query,
        resolved: {
          snapshot_id: snapshotId,
          context_id: contextId,
        },
      }),
      data_exists: Boolean(row),
      data: row,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Smoke test snapshot-output-chain gagal.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/mr-smoke/custom-risk-include
 * Cek include risk dinamis via Postman body.
 */
router.post("/custom-risk-include", async (req, res) => {
  try {
    const {
      risk_id,
      includeContext = true,
      includeAnalyses = true,
      includeRootCauses = true,
      includeMitigations = true,
      includeMonitorings = true,
      includeDeviations = true,
      includeWarnings = true,
      includeApprovals = true,
      includeCrossSystemLinks = true,
      limit = 1,
    } = req.body || {};

    const riskId = parsePositiveInt(risk_id);

    const include = [];

    if (includeContext) {
      include.push({
        model: db.MrPlanningContext,
        as: "context",
        required: false,
      });
    }

    if (includeAnalyses) {
      include.push({
        model: db.MrPlanningRiskAnalysis,
        as: "analyses",
        required: false,
        limit: 5,
      });
    }

    if (includeRootCauses) {
      include.push({
        model: db.MrPlanningRootCause,
        as: "root_causes",
        required: false,
        limit: 5,
      });
    }

    if (includeMitigations) {
      include.push({
        model: db.MrPlanningMitigation,
        as: "mitigations",
        required: false,
        limit: 5,
      });
    }

    if (includeMonitorings) {
      include.push({
        model: db.MrPlanningMonitoring,
        as: "monitorings",
        required: false,
        limit: 5,
      });
    }

    if (includeDeviations) {
      include.push({
        model: db.MrPlanningDeviation,
        as: "deviations",
        required: false,
        limit: 5,
      });
    }

    if (includeWarnings) {
      include.push({
        model: db.MrPlanningWarning,
        as: "warnings",
        required: false,
        limit: 5,
      });
    }

    if (includeApprovals) {
      include.push({
        model: db.MrPlanningApprovalMonitoring,
        as: "approvals",
        required: false,
        limit: 5,
      });
    }

    if (includeCrossSystemLinks) {
      include.push({
        model: db.MrCrossSystemLink,
        as: "cross_system_links",
        required: false,
        limit: 5,
      });
    }

    const rows = await db.MrPlanningRisk.findAll({
      where: riskId ? { id: riskId } : undefined,
      limit: Number(limit) > 0 ? Number(limit) : 1,
      order: [["id", "DESC"]],
      include,
    });

    return res.json({
      success: true,
      message:
        "Custom risk include berhasil. Jika risk_id dikirim, hasil difilter deterministic berdasarkan risk_id.",
      query_meta: buildQueryMeta({
        query: req.body || {},
        resolved: {
          risk_id: riskId,
        },
      }),
      total: rows.length,
      include_used: include.map((item) => item.as),
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Custom risk include gagal.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;