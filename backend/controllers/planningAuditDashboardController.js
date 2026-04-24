"use strict";

const svc = require("../services/planningAuditDashboardService");

exports.list = async (req, res) => {
  try {
    const result = await svc.listAuditDashboard(req);
    return res.json({
      success: true,
      data: result.rows,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (e) {
    console.error("[planningAuditDashboard.list]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Gagal memuat audit.",
    });
  }
};

exports.summary = async (req, res) => {
  try {
    const data = await svc.getAuditSummary(req);
    return res.json({ success: true, data });
  } catch (e) {
    console.error("[planningAuditDashboard.summary]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Gagal memuat ringkasan audit.",
    });
  }
};

exports.detail = async (req, res) => {
  try {
    const key = req.params.recordKey;
    const result = await svc.getAuditDetail(req, key);
    if (!result.ok) {
      return res.status(404).json({
        success: false,
        message: result.error || "Tidak ditemukan.",
      });
    }
    return res.json({ success: true, data: result.data });
  } catch (e) {
    console.error("[planningAuditDashboard.detail]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Gagal memuat detail.",
    });
  }
};
