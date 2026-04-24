"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const planningDomain = require("../services/planningDomainService");
const { runCascadingGapAudit } = require("../services/cascadingGapAuditService");

const {
  RenjaDokumen,
  RenjaItem,
  RenjaRkpdItemMap,
  RkpdDokumen,
  RenstraPdDokumen,
} = db;
const { ensureChangeTrackingColumnsReady } = require("../utils/planningSchemaGuard");

/**
 * GET /api/audit/perencanaan-consistency
 * Ringkasan pelanggaran aturan domain (tanpa SIPD).
 */
async function getPerencanaanConsistency(req, res) {
  try {
    const schemaGate = await ensureChangeTrackingColumnsReady(db.sequelize);
    if (!schemaGate.ok) {
      return res.status(503).json({
        success: false,
        code: schemaGate.code,
        message: schemaGate.message,
        hint: schemaGate.hint,
      });
    }

    const issues = [];

    const renjaDocs = await RenjaDokumen.findAll({
      where: { status: { [Op.in]: ["review", "final"] } },
    });
    for (const d of renjaDocs) {
      if (!d.rkpd_dokumen_id) {
        issues.push({
          code: "RENJA_RKPD_DOC_REQUIRED",
          severity: "error",
          renja_dokumen_id: d.id,
          message: "Status review/final tetapi rkpd_dokumen_id kosong.",
        });
      } else {
        const rk = await RkpdDokumen.findByPk(d.rkpd_dokumen_id);
        if (rk && Number(rk.tahun) !== Number(d.tahun)) {
          issues.push({
            code: "TAHUN_MISMATCH",
            severity: "error",
            renja_dokumen_id: d.id,
            rkpd_dokumen_id: d.rkpd_dokumen_id,
            message: "Tahun Renja tidak sama dengan tahun RKPD acuan.",
          });
        }
      }
      const rs = await RenstraPdDokumen.findByPk(d.renstra_pd_dokumen_id);
      if (rs && Number(rs.perangkat_daerah_id) !== Number(d.perangkat_daerah_id)) {
        issues.push({
          code: "PD_MISMATCH_RENSTRA",
          severity: "error",
          renja_dokumen_id: d.id,
          message: "perangkat_daerah_id tidak konsisten dengan Renstra PD.",
        });
      }
    }

    const renjaFinal = await RenjaDokumen.findAll({ where: { status: "final" } });
    for (const d of renjaFinal) {
      const items = await RenjaItem.findAll({ where: { renja_dokumen_id: d.id } });
      const v = await planningDomain.validateRenjaItemsForFinal(db, d.id, null);
      for (const msg of v.errors) {
        issues.push({
          code: "RENJA_FINAL_ITEM_INVALID",
          severity: "error",
          renja_dokumen_id: d.id,
          message: msg,
        });
      }
    }

    const rkpdFinal = await RkpdDokumen.findAll({ where: { status: "final" } });
    for (const d of rkpdFinal) {
      const v = await planningDomain.validateRkpdItemsForFinal(db, d.id, null);
      for (const msg of v.errors) {
        issues.push({
          code: "RKPD_FINAL_ITEM_INVALID",
          severity: "error",
          rkpd_dokumen_id: d.id,
          message: msg,
        });
      }
    }

    const riskyRenja = await RenjaDokumen.findAll({
      where: { status: { [Op.in]: ["review", "final"] } },
    });
    for (const d of riskyRenja) {
      const items = await RenjaItem.findAll({ where: { renja_dokumen_id: d.id } });
      for (const it of items) {
        const m = await RenjaRkpdItemMap.findOne({ where: { renja_item_id: it.id } });
        if (!m) {
          issues.push({
            code: "ITEM_NO_MAP",
            severity: "warning",
            renja_item_id: it.id,
            renja_dokumen_id: it.renja_dokumen_id,
            message:
              "Item Renja pada dokumen review/final belum punya mapping rkpd_item.",
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        scanned_at: new Date().toISOString(),
        issue_count: issues.length,
        issues,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getPerencanaanConsistency,
  /**
   * GET /api/audit/cascading-gap
   * Audit READ-ONLY untuk titik putus cascading RPJMD → Renstra OPD.
   */
  async getCascadingGap(req, res) {
    try {
      const report = await runCascadingGapAudit(db.sequelize);
      return res.json({ success: true, data: report });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ success: false, message: e.message });
    }
  },
};
