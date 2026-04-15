"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const planningDomain = require("../services/planningDomainService");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");

const {
  RenjaDokumen,
  RenjaItem,
  RenstraPdDokumen,
  RkpdDokumen,
  PeriodeRpjmd,
  RenjaRkpdItemMap,
  RkpdItem,
  PerangkatDaerah,
  PlanningLineItemChangeLog,
  PlanningAuditEvent,
  RPJMD,
  sequelize,
} = db;
const { filterReferensiBuatDokumenRenja } = require("../utils/planningOperationalDataFilter");

async function assertRpjmdId(rpjmd_id) {
  if (rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) return { ok: true };
  const r = await RPJMD.findByPk(Number(rpjmd_id));
  if (!r) return { ok: false, message: "rpjmd_id tidak valid" };
  return { ok: true };
}

/** Dropdown isian form "Buat dokumen Renja" (satu request). */
async function referensiBuatDokumen(req, res) {
  try {
    /** Default: sembunyikan baris smoke/API test. Debug: ?include_test=1 */
    const includeTest =
      req.query.include_test === "1" ||
      String(req.query.include_test ?? "").toLowerCase() === "true";
    const tahun = req.query.tahun ? Number(req.query.tahun) : null;
    const periodeId = req.query.periode_id ? Number(req.query.periode_id) : null;
    const whereK = {};
    if (tahun && Number.isFinite(tahun)) {
      whereK.tahun = tahun;
    }
    const whereRenstra = {};
    if (periodeId && Number.isFinite(periodeId)) {
      whereRenstra.periode_id = periodeId;
    }
    const testWhere = includeTest ? {} : { is_test: false };
    const [rkpdDokumen, renstraPdDokumen, perangkatDaerah] = await Promise.all([
      RkpdDokumen.findAll({
        where: { ...whereK, ...testWhere },
        order: [
          ["tahun", "DESC"],
          ["id", "DESC"],
        ],
        limit: 300,
        attributes: ["id", "tahun", "judul", "status", "periode_id", "is_test"],
      }),
      RenstraPdDokumen.findAll({
        where: { ...whereRenstra, ...testWhere },
        order: [["id", "DESC"]],
        limit: 300,
        attributes: ["id", "judul", "status", "periode_id", "perangkat_daerah_id", "is_test"],
      }),
      PerangkatDaerah.findAll({
        where: includeTest ? {} : { is_test: false },
        order: [["nama", "ASC"]],
        limit: 800,
        attributes: ["id", "nama", "kode", "is_test"],
      }),
    ]);
    const filtered = filterReferensiBuatDokumenRenja(
      { rkpdDokumen, renstraPdDokumen, perangkatDaerah },
      { includeTest },
    );
    return res.json({
      success: true,
      data: filtered,
      meta: {
        include_test: includeTest,
        catatan:
          includeTest === false
            ? "Baris dengan is_test=true serta heuristik smoke disembunyikan dari UI operasional. Gunakan ?include_test=1 hanya untuk pengembangan."
            : "Menampilkan semua baris termasuk data uji (include_test).",
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDokumenChangeLog(req, res) {
  try {
    const dokId = Number(req.params.id);
    if (!Number.isFinite(dokId)) {
      return res.status(400).json({ success: false, message: "id dokumen tidak valid." });
    }
    const items = await RenjaItem.findAll({
      where: { renja_dokumen_id: dokId },
      attributes: ["id"],
    });
    const ids = items.map((i) => i.id);
    if (!ids.length) {
      return res.json({ success: true, data: [] });
    }
    const rows = await PlanningLineItemChangeLog.findAll({
      where: {
        entity_type: "renja_item",
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

async function listDokumen(req, res) {
  try {
    const includeTest =
      req.query.include_test === "1" ||
      String(req.query.include_test ?? "").toLowerCase() === "true";
    const where = {};
    if (req.query.tahun) where.tahun = Number(req.query.tahun);
    if (req.query.periode_id) where.periode_id = Number(req.query.periode_id);
    if (req.query.perangkat_daerah_id) {
      where.perangkat_daerah_id = Number(req.query.perangkat_daerah_id);
    }
    if (req.query.status) where.status = req.query.status;
    if (!includeTest) where.is_test = false;

    const rows = await RenjaDokumen.findAll({
      where,
      order: [
        ["tahun", "DESC"],
        ["id", "DESC"],
      ],
      include: [
        { model: PeriodeRpjmd, as: "periode", required: false },
        { model: RkpdDokumen, as: "rkpdDokumen", required: false },
        { model: RenstraPdDokumen, as: "renstraPdDokumen", required: false },
      ],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDokumenById(req, res) {
  try {
    const row = await RenjaDokumen.findByPk(req.params.id, {
      include: [
        { model: PeriodeRpjmd, as: "periode", required: false },
        { model: RkpdDokumen, as: "rkpdDokumen", required: false },
        { model: RenstraPdDokumen, as: "renstraPdDokumen", required: false },
        {
          model: RenjaItem,
          as: "items",
          required: false,
          include: [{ model: RenjaRkpdItemMap, as: "rkpdLink", required: false }],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: "Tidak ditemukan" });
    return res.json({ success: true, data: row });
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
        message: "tahun harus dalam rentang periode RPJMD.",
      });
    }

    const renstra = await RenstraPdDokumen.findByPk(payload.renstra_pd_dokumen_id, {
      transaction: t,
    });
    if (!renstra) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "renstra_pd_dokumen_id tidak valid." });
    }
    if (Number(renstra.perangkat_daerah_id) !== Number(payload.perangkat_daerah_id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "perangkat_daerah_id harus konsisten dengan dokumen Renstra PD.",
      });
    }
    if (Number(renstra.periode_id) !== Number(payload.periode_id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "periode_id harus sama dengan renstra_pd_dokumen.",
      });
    }

    if (payload.rkpd_dokumen_id) {
      const rkpd = await RkpdDokumen.findByPk(payload.rkpd_dokumen_id, { transaction: t });
      if (!rkpd) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "rkpd_dokumen_id tidak valid." });
      }
      if (Number(rkpd.tahun) !== Number(payload.tahun)) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "tahun Renja harus sama dengan tahun dokumen RKPD acuan.",
        });
      }
    }

    const row = await RenjaDokumen.create(
      {
        periode_id: payload.periode_id,
        tahun: payload.tahun,
        perangkat_daerah_id: payload.perangkat_daerah_id,
        renstra_pd_dokumen_id: payload.renstra_pd_dokumen_id,
        rkpd_dokumen_id: payload.rkpd_dokumen_id ?? null,
        judul: payload.judul,
        versi: payload.versi ?? 1,
        status: payload.status || "draft",
        tanggal_pengesahan: payload.tanggal_pengesahan || null,
        is_test: payload.is_test === true,
      },
      { transaction: t },
    );
    await t.commit();

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "renja_dokumen",
      table_name: "renja_dokumen",
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
    const row = await RenjaDokumen.findByPk(req.params.id, { transaction: t });
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

    const merged = { ...row.get(), ...payload };
    const rkpdDokumen = merged.rkpd_dokumen_id
      ? await RkpdDokumen.findByPk(merged.rkpd_dokumen_id, { transaction: t })
      : null;
    const renstraPd = merged.renstra_pd_dokumen_id
      ? await RenstraPdDokumen.findByPk(merged.renstra_pd_dokumen_id, {
          transaction: t,
        })
      : null;

    const newStatus = payload.status !== undefined ? payload.status : row.status;

    const consErr = await planningDomain.assertRenjaDokumenConsistency(db, merged, {
      rkpdDokumen,
      renstraPd,
    });
    if (consErr.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: consErr.join(" ") });
    }

    if (rkpdDokumen && Number(merged.tahun) !== Number(rkpdDokumen.tahun)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "tahun Renja harus sama dengan tahun dokumen RKPD acuan.",
      });
    }

    if (newStatus === "final") {
      const itemErr = await planningDomain.validateRenjaItemsForFinal(db, row.id, t);
      if (itemErr.errors.length) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: itemErr.errors.join(" "),
        });
      }
      await planningDomain.deactivateOtherRenjaFinalActive(
        sequelize,
        RenjaDokumen,
        {
          tahun: merged.tahun,
          perangkat_daerah_id: merged.perangkat_daerah_id,
          excludeId: row.id,
        },
        t,
      );
      payload.is_final_active = true;
    }

    const oldSnap = captureRow(row);
    await row.update(payload, { transaction: t });
    await t.commit();

    const fresh = await RenjaDokumen.findByPk(req.params.id, {
      include: [
        { model: PeriodeRpjmd, as: "periode", required: false },
        { model: RkpdDokumen, as: "rkpdDokumen", required: false },
        { model: RenstraPdDokumen, as: "renstraPdDokumen", required: false },
        { model: RenjaItem, as: "items", required: false },
      ],
    });

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "renja_dokumen",
      table_name: "renja_dokumen",
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
    const itemRows = await RenjaItem.findAll({
      where: { renja_dokumen_id: dokId },
      attributes: ["id"],
      raw: true,
    });
    const itemIds = itemRows.map((r) => r.id);
    const mapIds = itemIds.length
      ? (
          await RenjaRkpdItemMap.findAll({
            where: { renja_item_id: { [Op.in]: itemIds } },
            attributes: ["id"],
            raw: true,
          })
        ).map((m) => m.id)
      : [];

    const or = [{ table_name: "renja_dokumen", record_id: dokId }];
    if (itemIds.length) {
      or.push({ table_name: "renja_item", record_id: { [Op.in]: itemIds } });
    }
    if (mapIds.length) {
      or.push({ table_name: "renja_rkpd_item_map", record_id: { [Op.in]: mapIds } });
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
    if (req.query.renja_dokumen_id) {
      where.renja_dokumen_id = Number(req.query.renja_dokumen_id);
    }
    const rows = await RenjaItem.findAll({
      where,
      order: [
        ["renja_dokumen_id", "ASC"],
        ["urutan", "ASC"],
        ["id", "ASC"],
      ],
      include: [
        { model: RenjaDokumen, as: "renjaDokumen", required: false },
        { model: RenjaRkpdItemMap, as: "rkpdLink", required: false },
      ],
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
    const dok = await RenjaDokumen.findByPk(payload.renja_dokumen_id, { transaction: t });
    if (!dok) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "renja_dokumen_id tidak valid." });
    }
    const row = await RenjaItem.create(payload, { transaction: t });
    await row.reload({
      transaction: t,
      include: [
        { model: RenjaDokumen, as: "renjaDokumen", required: false },
        { model: RenjaRkpdItemMap, as: "rkpdLink", required: false },
      ],
    });
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "renja_item",
      table_name: "renja_item",
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
    const fresh = await RenjaItem.findByPk(row.id, {
      include: [
        { model: RenjaDokumen, as: "renjaDokumen", required: false },
        { model: RenjaRkpdItemMap, as: "rkpdLink", required: false },
      ],
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
    const row = await RenjaItem.findByPk(req.params.id, {
      transaction: t,
      include: [
        { model: RenjaDokumen, as: "renjaDokumen", required: false },
        { model: RenjaRkpdItemMap, as: "rkpdLink", required: false },
      ],
    });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Tidak ditemukan" });
    }
    const oldSnap = captureRow(row);
    await row.update(payload, { transaction: t });
    await row.reload({
      transaction: t,
      include: [
        { model: RenjaDokumen, as: "renjaDokumen", required: false },
        { model: RenjaRkpdItemMap, as: "rkpdLink", required: false },
      ],
    });
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(oldSnap, row);
    await writePlanningAudit({
      module_name: "renja_item",
      table_name: "renja_item",
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
    const fresh = await RenjaItem.findByPk(req.params.id, {
      include: [
        { model: RenjaDokumen, as: "renjaDokumen", required: false },
        { model: RenjaRkpdItemMap, as: "rkpdLink", required: false },
      ],
    });
    return res.json({ success: true, data: fresh });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function linkRkpd(req, res) {
  const t = await sequelize.transaction();
  try {
    const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const rkpdItemId = payload.rkpd_item_id;
    const renjaItem = await RenjaItem.findByPk(req.params.id, { transaction: t });
    if (!renjaItem) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "renja_item tidak ditemukan" });
    }

    const errs = await planningDomain.assertRkpdItemLinkAllowed(
      db,
      renjaItem,
      rkpdItemId,
      t,
    );
    if (errs.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: errs.join(" ") });
    }

    let map = await RenjaRkpdItemMap.findOne({
      where: { renja_item_id: renjaItem.id },
      transaction: t,
    });
    const oldSnap = map ? captureRow(map) : null;
    if (!map) {
      map = await RenjaRkpdItemMap.create(
        { renja_item_id: renjaItem.id, rkpd_item_id: rkpdItemId },
        { transaction: t },
      );
    } else {
      await map.update({ rkpd_item_id: rkpdItemId }, { transaction: t });
      await map.reload({ transaction: t });
    }

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { old_value, new_value } = auditValuesFromRows(oldSnap, map);
    await writePlanningAudit({
      module_name: "renja_rkpd_item_map",
      table_name: "renja_rkpd_item_map",
      record_id: map.id,
      action_type: oldSnap ? "UPDATE" : "CREATE",
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

    const fresh = await RenjaRkpdItemMap.findOne({
      where: { renja_item_id: renjaItem.id },
      include: [
        { model: RkpdItem, as: "rkpdItem", required: true },
        { model: RenjaItem, as: "renjaItem", required: true },
      ],
    });
    return res.json({ success: true, data: fresh });
  } catch (e) {
    await t.rollback();
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getRkpdLink(req, res) {
  try {
    const row = await RenjaRkpdItemMap.findOne({
      where: { renja_item_id: req.params.id },
      include: [
        { model: RkpdItem, as: "rkpdItem", required: false },
        { model: RenjaItem, as: "renjaItem", required: false },
      ],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: "Belum ada mapping untuk item ini." });
    }
    return res.json({ success: true, data: row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  referensiBuatDokumen,
  getDokumenChangeLog,
  listDokumen,
  getDokumenById,
  getDokumenAudit,
  createDokumen,
  updateDokumen,
  listItem,
  createItem,
  updateItem,
  linkRkpd,
  getRkpdLink,
};
