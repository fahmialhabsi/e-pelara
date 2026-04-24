"use strict";

const svc = require("../services/rpjmdMonitoringIndikatorService");

function ok(res, data, meta) {
  const body = { success: true, data };
  if (meta != null) body.meta = meta;
  return res.json(body);
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

exports.getIndikatorMonitoring = async (req, res) => {
  try {
    const pid = parseInt(String(req.params.periodeId || req.query.periodeId || ""), 10);
    const sasaranId = req.query.sasaranId;
    const refresh = req.query.refresh;
    const data = await svc.getIndikatorMonitoring(pid, { sasaranId, refresh });
    const cached = data._cached === true;
    delete data._cached;
    return ok(res, data, { cached });
  } catch (e) {
    if (e.code === "BAD_REQUEST") return fail(res, 400, e.message);
    return fail(res, 500, e.message || "Gagal memuat monitoring indikator.");
  }
};

exports.getIndikatorDrilldown = async (req, res) => {
  try {
    const pid = parseInt(String(req.params.periodeId || ""), 10);
    const iid = parseInt(String(req.params.indikatorSasaranId || ""), 10);
    const data = await svc.getIndikatorDrilldown(pid, iid);
    return ok(res, data);
  } catch (e) {
    if (e.code === "BAD_REQUEST") return fail(res, 400, e.message);
    if (e.code === "NOT_FOUND") return fail(res, 404, e.message);
    return fail(res, 500, e.message || "Gagal memuat detail indikator.");
  }
};

exports.getMonitoringByOpd = async (req, res) => {
  try {
    const pid = parseInt(String(req.params.periodeId || ""), 10);
    const data = await svc.getMonitoringByOpd(pid);
    return ok(res, data);
  } catch (e) {
    if (e.code === "BAD_REQUEST") return fail(res, 400, e.message);
    return fail(res, 500, e.message || "Gagal memuat monitoring per OPD.");
  }
};

exports.getMonitoringHeatmap = async (req, res) => {
  try {
    const pid = parseInt(String(req.params.periodeId || ""), 10);
    const data = await svc.getMonitoringHeatmap(pid);
    return ok(res, data);
  } catch (e) {
    if (e.code === "BAD_REQUEST") return fail(res, 400, e.message);
    return fail(res, 500, e.message || "Gagal memuat heatmap monitoring.");
  }
};

exports.getMonitoringAlerts = async (req, res) => {
  try {
    const pid = parseInt(String(req.params.periodeId || ""), 10);
    const data = await svc.getMonitoringAlerts(pid);
    return ok(res, data);
  } catch (e) {
    if (e.code === "BAD_REQUEST") return fail(res, 400, e.message);
    return fail(res, 500, e.message || "Gagal memuat alert monitoring.");
  }
};

exports.exportMonitoring = async (req, res) => {
  try {
    const pid = parseInt(String(req.params.periodeId || req.query.periodeId || ""), 10);
    const fmt = String(req.query.format || "excel").toLowerCase();
    const sasaranId = req.query.sasaranId;
    if (!Number.isFinite(pid) || pid < 1) {
      return fail(res, 400, "periodeId tidak valid.");
    }
    const normalized = fmt === "pdf" ? "pdf" : "excel";
    const { buffer, mime, ext } = await svc.buildExportBuffer(pid, normalized, { sasaranId });
    const fname = `monitoring-indikator-rpjmd-${pid}.${ext}`;
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    return res.send(buffer);
  } catch (e) {
    if (e.code === "BAD_REQUEST") return fail(res, 400, e.message);
    return fail(res, 500, e.message || "Gagal mengekspor.");
  }
};
