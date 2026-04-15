"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const schemas = require("../middlewares/planningDomainSchemas");
const svc = require("../services/renjaGovernanceService");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");

const {
  RenjaDokumen,
  RenjaItem,
  RenjaDokumenVersion,
  RenjaDokumenSection,
  RenjaSnapshot,
  RenstraPdDokumen,
  RkpdDokumen,
  PerangkatDaerah,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  RkpdItem,
  sequelize,
} = db;

function actorId(req) {
  return req.user?.id ?? req.user?.userId ?? null;
}

async function getDashboardSummary(req, res) {
  try {
    const data = await svc.getDashboardSummary(db, req.query || {});
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDashboardRecent(req, res) {
  try {
    const rows = await svc.getRecentDocuments(db, req.query || {});
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDashboardActionItems(req, res) {
  try {
    const rows = await svc.getActionItems(db, req.query || {});
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function getDashboardMismatchAlerts(req, res) {
  try {
    const rows = await svc.getMismatchAlerts(db, null);
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function workflowAction(req, res) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const action = req.params.action || req.body?.action;
    const targetStatus = svc.mapActionToWorkflow(action);

    const row = await RenjaDokumen.findByPk(id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Dokumen RENJA tidak ditemukan." });
    }

    svc.assertWorkflowTransition(row.workflow_status || "draft", targetStatus);

    const phase =
      targetStatus === "published"
        ? "final"
        : targetStatus === "reviewed"
          ? "rancangan"
          : row.document_phase;

    await row.update(
      {
        workflow_status: targetStatus,
        document_phase: phase,
        status: targetStatus === "published" ? "final" : row.status,
        published_at: targetStatus === "published" ? new Date() : row.published_at,
        published_by: targetStatus === "published" ? actorId(req) : row.published_by,
        approved_at: ["approved", "published"].includes(targetStatus) ? new Date() : row.approved_at,
        approved_by: ["approved", "published"].includes(targetStatus) ? actorId(req) : row.approved_by,
        updated_by: actorId(req),
      },
      { transaction: t },
    );

    await svc.createVersionSnapshot(db, row.id, {
      transaction: t,
      actorId: actorId(req),
      status: targetStatus,
      changeType: action,
      changeReason: req.body?.change_reason_text || req.body?.change_reason || null,
      isPublished: targetStatus === "published",
      sectionSnapshotType: targetStatus === "published" ? "published" : "after_change",
    });

    await t.commit();
    const fresh = await RenjaDokumen.findByPk(id);
    return res.json({ success: true, data: fresh });
  } catch (e) {
    await t.rollback();
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function createRevision(req, res) {
  try {
    const row = await svc.createRevision(db, Number(req.params.id), req.body || {}, actorId(req));
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function deleteDokumen(req, res) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const row = await RenjaDokumen.findByPk(id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    }
    if (row.workflow_status === "published") {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Dokumen published tidak dapat dihapus. Gunakan arsip.",
      });
    }
    await row.update(
      {
        deleted_at: new Date(),
        deleted_by: actorId(req),
        workflow_status: "archived",
      },
      { transaction: t },
    );
    await t.commit();
    return res.json({ success: true, message: "Dokumen diarsipkan." });
  } catch (e) {
    await t.rollback();
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function listVersions(req, res) {
  try {
    const rows = await RenjaDokumenVersion.findAll({
      where: { renja_dokumen_id: Number(req.params.id) },
      order: [["version_number", "DESC"]],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function compareVersions(req, res) {
  try {
    const from = Number(req.query.from);
    const to = Number(req.query.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return res.status(400).json({ success: false, message: "Query from dan to wajib numerik." });
    }
    const data = await svc.compareVersions(db, Number(req.params.id), from, to);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getSections(req, res) {
  try {
    const id = Number(req.params.id);
    const row = await RenjaDokumen.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    await svc.ensureDefaultSections(db, id);
    const sections = await RenjaDokumenSection.findAll({
      where: { renja_dokumen_id: id },
      order: [["id", "ASC"]],
    });
    return res.json({ success: true, data: sections });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function exportDocument(req, res) {
  try {
    const id = Number(req.params.id);
    const doc = await RenjaDokumen.findByPk(id);
    if (!doc) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });

    await svc.ensureDefaultSections(db, id);
    const [items, sections, snapshots] = await Promise.all([
      RenjaItem.findAll({ where: { renja_dokumen_id: id }, order: [["urutan", "ASC"]] }),
      RenjaDokumenSection.findAll({ where: { renja_dokumen_id: id }, order: [["id", "ASC"]] }),
      RenjaSnapshot.findAll({
        where: { renja_dokumen_id: id },
        order: [["created_at", "DESC"]],
        limit: 10,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        cover: {
          id: doc.id,
          nomor_dokumen: doc.nomor_dokumen,
          nama_dokumen: doc.nama_dokumen || doc.judul,
          tahun: doc.tahun,
          workflow_status: doc.workflow_status,
          document_phase: doc.document_phase,
          document_kind: doc.document_kind,
        },
        chapters: sections,
        lampiran_items: items,
        riwayat_snapshot: snapshots.map((x) => ({
          id: x.id,
          snapshot_type: x.snapshot_type,
          created_at: x.created_at,
          snapshot_hash: x.snapshot_hash,
        })),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function putSection(req, res) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const key = req.params.sectionKey;
    const doc = await RenjaDokumen.findByPk(id, { transaction: t });
    if (!doc) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    }
    if (doc.workflow_status === "published") {
      await t.rollback();
      return res.status(409).json({ success: false, message: "Dokumen published bersifat readonly." });
    }

    await svc.ensureDefaultSections(db, id, t);

    let section = await RenjaDokumenSection.findOne({
      where: { renja_dokumen_id: id, section_key: key },
      transaction: t,
    });

    if (!section) {
      section = await RenjaDokumenSection.create(
        {
          renja_dokumen_id: id,
          section_key: key,
          section_title: key,
          content: null,
        },
        { transaction: t },
      );
    }

    await section.update(
      {
        ...req.body,
        updated_by: actorId(req),
      },
      { transaction: t },
    );

    await t.commit();
    return res.json({ success: true, data: section });
  } catch (e) {
    await t.rollback();
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function listItems(req, res) {
  try {
    const rows = await RenjaItem.findAll({
      where: { renja_dokumen_id: Number(req.params.id) },
      order: [["urutan", "ASC"]],
    });
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function createItem(req, res) {
  try {
    const payload = { ...req.body, renja_dokumen_id: Number(req.params.id) };
    const row = await RenjaItem.create(payload);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function updateItem(req, res) {
  try {
    const row = await RenjaItem.findByPk(Number(req.params.itemId));
    if (!row || Number(row.renja_dokumen_id) !== Number(req.params.id)) {
      return res.status(404).json({ success: false, message: "Item tidak ditemukan." });
    }
    await row.update(req.body || {});
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function deleteItem(req, res) {
  try {
    const row = await RenjaItem.findByPk(Number(req.params.itemId));
    if (!row || Number(row.renja_dokumen_id) !== Number(req.params.id)) {
      return res.status(404).json({ success: false, message: "Item tidak ditemukan." });
    }
    await row.destroy();
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function syncRenstra(req, res) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const doc = await RenjaDokumen.findByPk(id, { transaction: t });
    if (!doc) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    }

    const programs = await RenstraProgram.findAll({
      where: { renstra_id: doc.renstra_pd_dokumen_id },
      limit: 2000,
      transaction: t,
    });

    let created = 0;
    for (const p of programs) {
      const ex = await RenjaItem.findOne({
        where: {
          renja_dokumen_id: id,
          source_mode: "RENSTRA",
          source_renstra_program_id: p.id,
        },
        transaction: t,
      });
      if (!ex) {
        await RenjaItem.create(
          {
            renja_dokumen_id: id,
            source_mode: "RENSTRA",
            source_renstra_program_id: p.id,
            program: p.nama_program,
            kode_program: p.kode_program,
            mismatch_status: "renstra_only",
          },
          { transaction: t },
        );
        created += 1;
      }
    }

    await t.commit();
    return res.json({ success: true, data: { created } });
  } catch (e) {
    await t.rollback();
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function syncRkpd(req, res) {
  const t = await sequelize.transaction();
  try {
    const id = Number(req.params.id);
    const doc = await RenjaDokumen.findByPk(id, { transaction: t });
    if (!doc) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    }
    if (!doc.rkpd_dokumen_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "rkpd_dokumen_id belum diisi." });
    }

    const rows = await RkpdItem.findAll({ where: { rkpd_dokumen_id: doc.rkpd_dokumen_id }, transaction: t });
    let created = 0;
    for (const r of rows) {
      const ex = await RenjaItem.findOne({
        where: {
          renja_dokumen_id: id,
          source_mode: "RKPD",
          source_rkpd_item_id: r.id,
        },
        transaction: t,
      });
      if (!ex) {
        await RenjaItem.create(
          {
            renja_dokumen_id: id,
            source_mode: "RKPD",
            source_rkpd_item_id: r.id,
            program: r.program,
            kegiatan: r.kegiatan,
            sub_kegiatan: r.sub_kegiatan,
            indikator: r.indikator,
            target: r.target,
            satuan: r.satuan,
            pagu: r.pagu,
            mismatch_status: "rkpd_only",
          },
          { transaction: t },
        );
        created += 1;
      }
    }

    await t.commit();
    return res.json({ success: true, data: { created } });
  } catch (e) {
    await t.rollback();
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getValidationMismatch(req, res) {
  try {
    const rows = await svc.getMismatchAlerts(db, Number(req.params.id));
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function dropdownOpd(req, res) {
  const where = { aktif: true };
  const rows = await PerangkatDaerah.findAll({ where, order: [["nama", "ASC"]], limit: 1000 });
  return res.json({ success: true, data: rows });
}

async function dropdownRenstra(req, res) {
  const where = {};
  if (req.query.perangkat_daerah_id) where.perangkat_daerah_id = Number(req.query.perangkat_daerah_id);
  if (req.query.periode_id) where.periode_id = Number(req.query.periode_id);
  where.status = "final";
  const rows = await RenstraPdDokumen.findAll({ where, order: [["id", "DESC"]], limit: 300 });
  return res.json({ success: true, data: rows });
}

async function dropdownRkpd(req, res) {
  const where = {};
  if (req.query.tahun) where.tahun = Number(req.query.tahun);
  if (req.query.periode_id) where.periode_id = Number(req.query.periode_id);
  where.status = "final";
  const rows = await RkpdDokumen.findAll({ where, order: [["id", "DESC"]], limit: 300 });
  return res.json({ success: true, data: rows });
}

async function dropdownPrograms(req, res) {
  const renstraPdDokumenId = Number(req.query.renstra_pd_dokumen_id);
  if (!Number.isFinite(renstraPdDokumenId)) {
    return res.status(400).json({ success: false, message: "renstra_pd_dokumen_id wajib." });
  }
  const rows = await RenstraProgram.findAll({ where: { renstra_id: renstraPdDokumenId }, order: [["kode_program", "ASC"]] });
  return res.json({ success: true, data: rows });
}

async function dropdownKegiatan(req, res) {
  const programId = Number(req.query.program_id);
  if (!Number.isFinite(programId)) {
    return res.status(400).json({ success: false, message: "program_id wajib." });
  }
  const rows = await RenstraKegiatan.findAll({ where: { program_id: programId }, order: [["kode_kegiatan", "ASC"]] });
  return res.json({ success: true, data: rows });
}

async function dropdownSubKegiatan(req, res) {
  const kegiatanId = Number(req.query.kegiatan_id);
  if (!Number.isFinite(kegiatanId)) {
    return res.status(400).json({ success: false, message: "kegiatan_id wajib." });
  }
  const rows = await RenstraSubkegiatan.findAll({ where: { kegiatan_id: kegiatanId }, order: [["kode_sub_kegiatan", "ASC"]] });
  return res.json({ success: true, data: rows });
}

async function dropdownSasaran(req, res) {
  // Sasaran RENSTRA di struktur existing paling dekat di renstra_tabel_sasaran (via query raw minimal)
  try {
    const renstraPdDokumenId = Number(req.query.renstra_pd_dokumen_id);
    if (!Number.isFinite(renstraPdDokumenId)) {
      return res.status(400).json({ success: false, message: "renstra_pd_dokumen_id wajib." });
    }
    const [rows] = await sequelize.query(
      `
      SELECT id, sasaran_id, kode_sasaran, nama_sasaran
      FROM renstra_tabel_sasaran
      WHERE sasaran_id IS NOT NULL
      ORDER BY kode_sasaran ASC
      LIMIT 500
      `,
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  getDashboardSummary,
  getDashboardRecent,
  getDashboardActionItems,
  getDashboardMismatchAlerts,
  workflowAction,
  createRevision,
  deleteDokumen,
  listVersions,
  compareVersions,
  exportDocument,
  getSections,
  putSection,
  listItems,
  createItem,
  updateItem,
  deleteItem,
  syncRenstra,
  syncRkpd,
  getValidationMismatch,
  dropdownOpd,
  dropdownRenstra,
  dropdownRkpd,
  dropdownSasaran,
  dropdownPrograms,
  dropdownKegiatan,
  dropdownSubKegiatan,
};
