"use strict";

const crypto = require("crypto");
const { Op } = require("sequelize");
const db = require("../models");
const planningDomain = require("../services/planningDomainService");
const rkpdRenjaCascade = require("../services/rkpdRenjaCascadeService");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");

const {
  RkpdDokumen,
  RkpdItem,
  PeriodeRpjmd,
  PlanningLineItemChangeLog,
  PlanningAuditEvent,
  RPJMD,
  sequelize,
} = db;

async function assertRpjmdId(rpjmd_id) {
  if (rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) return { ok: true };
  const r = await RPJMD.findByPk(Number(rpjmd_id));
  if (!r) return { ok: false, message: "rpjmd_id tidak valid" };
  return { ok: true };
}

async function listDokumen(req, res) {
  try {
    const includeTest =
      req.query.include_test === "1" ||
      String(req.query.include_test ?? "").toLowerCase() === "true";
    const where = {};
    if (req.query.tahun) where.tahun = Number(req.query.tahun);
    if (req.query.periode_id) where.periode_id = Number(req.query.periode_id);
    if (req.query.status) where.status = req.query.status;
    if (!includeTest) where.is_test = false;

    const rows = await RkpdDokumen.findAll({
      where,
      order: [
        ["tahun", "DESC"],
        ["id", "DESC"],
      ],
      include: [{ model: PeriodeRpjmd, as: "periode", required: false }],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDokumenById(req, res) {
  try {
    const row = await RkpdDokumen.findByPk(req.params.id, {
      include: [
        { model: PeriodeRpjmd, as: "periode", required: false },
        { model: RkpdItem, as: "items", required: false },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: "Tidak ditemukan" });
    return res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

/** Riwayat perubahan field (rkpd_item) untuk semua baris dalam dokumen v2. */
async function getDokumenChangeLog(req, res) {
  try {
    const dokId = Number(req.params.id);
    if (!Number.isFinite(dokId)) {
      return res.status(400).json({ success: false, message: "id dokumen tidak valid." });
    }
    const items = await RkpdItem.findAll({
      where: { rkpd_dokumen_id: dokId },
      attributes: ["id"],
    });
    const ids = items.map((i) => i.id);
    if (!ids.length) {
      return res.json({ success: true, data: [] });
    }
    const rows = await PlanningLineItemChangeLog.findAll({
      where: {
        entity_type: "rkpd_item",
        entity_id: { [Op.in]: ids },
      },
      order: [["created_at", "DESC"]],
      limit: 800,
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function createDokumen(req, res) {
  const t = await sequelize.transaction();
  try {
    const { payload, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const rpj = await assertRpjmdId(rpjmd_id);
    if (!rpj.ok) {
      await t.rollback();
      return res.status(400).json({ success: false, message: rpj.message });
    }

    const periode = await planningDomain.loadPeriode(db, payload.periode_id);
    if (!periode) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "periode_id tidak valid." });
    }
    if (!planningDomain.tahunDalamPeriode(payload.tahun, periode)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "tahun harus berada dalam rentang periode RPJMD.",
      });
    }

    const row = await RkpdDokumen.create(
      {
        periode_id: payload.periode_id,
        tahun: payload.tahun,
        judul: payload.judul,
        versi: payload.versi ?? 1,
        status: payload.status || "draft",
        tanggal_pengesahan: payload.tanggal_pengesahan || null,
      },
      { transaction: t },
    );
    await t.commit();

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "rkpd_dokumen",
      table_name: "rkpd_dokumen",
      record_id: row.id,
      action_type: "CREATE",
      old_value,
      new_value,
      change_reason_text,
      change_reason_file,
      changed_by: uid,
      version_before: null,
      version_after: Number(row.versi) || 1,
    });

    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function updateDokumen(req, res) {
  const t = await sequelize.transaction();
  try {
    const row = await RkpdDokumen.findByPk(req.params.id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Tidak ditemukan" });
    }

    const { payload, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);

    const rpj = await assertRpjmdId(rpjmd_id);
    if (!rpj.ok) {
      await t.rollback();
      return res.status(400).json({ success: false, message: rpj.message });
    }

    const next = { ...row.get(), ...payload };
    if (payload.periode_id) {
      const periode = await planningDomain.loadPeriode(db, payload.periode_id);
      if (!periode) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "periode_id tidak valid." });
      }
      if (!planningDomain.tahunDalamPeriode(next.tahun ?? row.tahun, periode)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "tahun harus dalam rentang periode.",
        });
      }
    }

    const newStatus = payload.status !== undefined ? payload.status : row.status;

    if (newStatus === "final") {
      const { errors } = await planningDomain.validateRkpdItemsForFinal(
        db,
        row.id,
        t,
      );
      if (errors.length) {
        await t.rollback();
        return res.status(400).json({ success: false, message: errors.join(" ") });
      }
      await planningDomain.deactivateOtherRkpdFinalActive(
        sequelize,
        RkpdDokumen,
        { tahun: next.tahun ?? row.tahun, excludeId: row.id },
        t,
      );
      payload.is_final_active = true;
    }

    if (newStatus === "draft" && payload.is_final_active === undefined) {
      /* noop */
    }

    const oldSnap = captureRow(row);
    await row.update(payload, { transaction: t });
    await t.commit();

    const fresh = await RkpdDokumen.findByPk(req.params.id, {
      include: [
        { model: PeriodeRpjmd, as: "periode", required: false },
        { model: RkpdItem, as: "items", required: false },
      ],
    });

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "rkpd_dokumen",
      table_name: "rkpd_dokumen",
      record_id: row.id,
      action_type: "UPDATE",
      old_value,
      new_value,
      change_reason_text,
      change_reason_file,
      changed_by: uid,
      version_before: Number(oldSnap.versi) || 1,
      version_after: Number(fresh.versi) || 1,
    });

    return res.json({ success: true, data: fresh });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDokumenAudit(req, res) {
  try {
    const dokId = Number(req.params.id);
    if (!Number.isFinite(dokId)) {
      return res.status(400).json({ success: false, message: "id dokumen tidak valid." });
    }
    const itemRows = await RkpdItem.findAll({
      where: { rkpd_dokumen_id: dokId },
      attributes: ["id"],
      raw: true,
    });
    const itemIds = itemRows.map((r) => r.id);
    const or = [{ table_name: "rkpd_dokumen", record_id: dokId }];
    if (itemIds.length) {
      or.push({ table_name: "rkpd_item", record_id: { [Op.in]: itemIds } });
    }
    const rows = await PlanningAuditEvent.findAll({
      where: { [Op.or]: or },
      order: [["changed_at", "DESC"]],
      limit: 200,
    });
    return res.json({ success: true, data: enrichPlanningAuditRows(rows) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function listItem(req, res) {
  try {
    const where = {};
    if (req.query.rkpd_dokumen_id) {
      where.rkpd_dokumen_id = Number(req.query.rkpd_dokumen_id);
    }
    const rows = await RkpdItem.findAll({
      where,
      order: [
        ["rkpd_dokumen_id", "ASC"],
        ["urutan", "ASC"],
        ["id", "ASC"],
      ],
      include: [{ model: RkpdDokumen, as: "rkpdDokumen", required: false }],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function createItem(req, res) {
  const t = await sequelize.transaction();
  try {
    const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const dok = await RkpdDokumen.findByPk(payload.rkpd_dokumen_id, { transaction: t });
    if (!dok) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "rkpd_dokumen_id tidak valid." });
    }
    const row = await RkpdItem.create(payload, { transaction: t });
    await row.reload({
      transaction: t,
      include: [{ model: RkpdDokumen, as: "rkpdDokumen", required: false }],
    });
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "rkpd_item",
      table_name: "rkpd_item",
      record_id: row.id,
      action_type: "CREATE",
      old_value,
      new_value,
      change_reason_text,
      change_reason_file,
      changed_by: uid,
      version_before: null,
      version_after: null,
      skip_global_version: true,
      transaction: t,
    });
    await t.commit();
    const fresh = await RkpdItem.findByPk(row.id, {
      include: [{ model: RkpdDokumen, as: "rkpdDokumen", required: false }],
    });
    return res.status(201).json({ success: true, data: fresh });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function updateItem(req, res) {
  const t = await sequelize.transaction();
  try {
    const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const row = await RkpdItem.findByPk(req.params.id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Tidak ditemukan" });
    }
    const before = row.get({ plain: true });
    const batchId = crypto.randomUUID();
    await row.update(payload, { transaction: t });
    const after = row.get({ plain: true });

    await rkpdRenjaCascade.logRkpdItemFieldChanges(db, before, after, {
      userId: req.user?.id ?? null,
      batchId,
      transaction: t,
    });

    const cascadeMeta = await rkpdRenjaCascade.cascadeRkpdItemToLinkedRenja(
      db,
      row,
      { transaction: t, userId: req.user?.id ?? null },
    );

    await row.reload({
      transaction: t,
      include: [{ model: RkpdDokumen, as: "rkpdDokumen", required: false }],
    });
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(before, row);
    await writePlanningAudit({
      module_name: "rkpd_item",
      table_name: "rkpd_item",
      record_id: row.id,
      action_type: "UPDATE",
      old_value,
      new_value,
      change_reason_text,
      change_reason_file,
      changed_by: uid,
      version_before: null,
      version_after: null,
      skip_global_version: true,
      transaction: t,
    });

    await t.commit();
    const fresh = await RkpdItem.findByPk(req.params.id, {
      include: [{ model: RkpdDokumen, as: "rkpdDokumen", required: false }],
    });
    return res.json({
      success: true,
      data: fresh,
      meta: {
        cascade: cascadeMeta,
        change_batch_id: batchId,
      },
    });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  listDokumen,
  getDokumenById,
  getDokumenAudit,
  getDokumenChangeLog,
  createDokumen,
  updateDokumen,
  listItem,
  createItem,
  updateItem,
};
