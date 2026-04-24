"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const svc = require("../services/renjaGovernanceService");
const readinessSvc = require("../services/renjaDocumentReadinessService");
const mismatchSvc = require("../services/renjaMismatchEngineService");
const workflowGuardSvc = require("../services/renjaWorkflowGuardService");
const dataFixSvc = require("../services/renjaDataFixService");
const { validateHierarchy } = require("../validators/renjaHierarchyValidator");
const { detectDuplicateItems } = require("../services/renjaDuplicateDetectorService");
const { classifyGovernance } = require("../services/renjaGovernanceSeverityService");

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
  RenjaMismatchResult,
  RenjaValidationRun,
  sequelize,
} = db;

function actorId(req) {
  return req.user?.id ?? req.user?.userId ?? null;
}

function dataFixErrorStatus(e, fallback = 400) {
  return Number(e?.httpStatus) > 0 ? Number(e.httpStatus) : fallback;
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
    const where = { is_resolved: false };
    const severityFilterRaw = String(req.query.severity_final || req.query.severity || "").trim();
    if (req.query.renja_dokumen_id) where.renja_dokumen_id = Number(req.query.renja_dokumen_id);
    const rows = await RenjaMismatchResult.findAll({
      where,
      include: [
        {
          model: RenjaItem,
          as: "renjaItem",
          required: false,
          attributes: ["id", "program", "kegiatan", "sub_kegiatan", "indikator", "source_mode"],
        },
      ],
      order: [["computed_at", "DESC"]],
      limit: 500,
    });
    let data = rows.map((x) => classifyGovernance(x.get({ plain: true })));
    if (severityFilterRaw) {
      const norm = severityFilterRaw.toUpperCase();
      const mapped =
        norm === "ERROR"
          ? "BLOCKER"
          : norm === "WARNING"
            ? "WARNING"
            : norm === "INFO"
              ? "INFO"
              : norm;
      data = data.filter((x) => String(x.severity_final || "").toUpperCase() === mapped);
    }
    return res.json({ success: true, data });
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

    workflowGuardSvc.assertStrictTransition(row.workflow_status || "draft", targetStatus);

    if (["submitted", "published"].includes(targetStatus)) {
      const readiness = await readinessSvc.evaluateReadiness(
        db,
        id,
        targetStatus === "submitted" ? "submit" : "publish",
      );
      if (
        (targetStatus === "submitted" && !readiness.readiness.ready_for_submit) ||
        (targetStatus === "published" && !readiness.readiness.ready_for_publish)
      ) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message:
            targetStatus === "submitted"
              ? "DOCUMENT_NOT_READY_FOR_SUBMIT"
              : "DOCUMENT_NOT_READY_FOR_PUBLISH",
          data: readiness,
        });
      }
    }

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
    const allowedKeys = new Set(["pendahuluan", "evaluasi", "tujuan_sasaran", "rencana_kerja", "penutup"]);
    if (!allowedKeys.has(key)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "sectionKey tidak sah." });
    }
    const doc = await RenjaDokumen.findByPk(id, { transaction: t });
    if (!doc) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    }
    if (["published", "archived"].includes(doc.workflow_status)) {
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

    const content = req.body?.content ?? section.content ?? "";
    const computedCompletion = String(content || "").trim() ? 100 : 0;

    await section.update(
      {
        ...req.body,
        completion_pct: computedCompletion,
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
    const dokumenId = Number(req.params.id);
    const doc = await RenjaDokumen.findByPk(dokumenId);
    if (!doc) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    workflowGuardSvc.assertEditableWorkflow(doc.workflow_status);

    const payload = { ...req.body, renja_dokumen_id: dokumenId };
    const validation = await validateHierarchy(db, { dokumen: doc, item: payload });
    if (validation.some((x) => x.is_blocking)) {
      return res.status(400).json({
        success: false,
        message: "Validasi item gagal.",
        data: validation,
      });
    }
    const row = await RenjaItem.create(payload);
    return res.status(201).json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function updateItem(req, res) {
  try {
    const doc = await RenjaDokumen.findByPk(Number(req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    workflowGuardSvc.assertEditableWorkflow(doc.workflow_status);

    const row = await RenjaItem.findByPk(Number(req.params.itemId));
    if (!row || Number(row.renja_dokumen_id) !== Number(req.params.id)) {
      return res.status(404).json({ success: false, message: "Item tidak ditemukan." });
    }
    const nextPayload = { ...row.get({ plain: true }), ...(req.body || {}) };
    const validation = await validateHierarchy(db, { dokumen: doc, item: nextPayload });
    if (validation.some((x) => x.is_blocking)) {
      return res.status(400).json({
        success: false,
        message: "Validasi item gagal.",
        data: validation,
      });
    }
    await row.update(req.body || {});
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function deleteItem(req, res) {
  try {
    const doc = await RenjaDokumen.findByPk(Number(req.params.id));
    if (!doc) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    workflowGuardSvc.assertEditableWorkflow(doc.workflow_status);

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
    const renjaDokumenId = Number(req.params.id);
    const latestRun = await RenjaValidationRun.findOne({
      where: { renja_dokumen_id: renjaDokumenId },
      order: [["computed_at", "DESC"]],
    });
    if (latestRun) {
      const rows = await RenjaMismatchResult.findAll({
        where: { renja_validation_run_id: latestRun.id, is_resolved: false },
        order: [["severity", "DESC"], ["id", "ASC"]],
      });
      const hydratedRows = mismatchSvc.hydrateMismatchNavigation(rows, renjaDokumenId);
      return res.json({
        success: true,
        data: {
          run: latestRun,
          summary: latestRun.summary_json || {},
          ...mismatchSvc.groupMismatchResults(hydratedRows),
          results: hydratedRows,
        },
      });
    }
    const output = await mismatchSvc.computeMismatchForDokumen(db, renjaDokumenId);
    const hydratedRows = mismatchSvc.hydrateMismatchNavigation(output.results, renjaDokumenId);
    return res.json({
      success: true,
      data: {
        run: null,
        summary: { total: hydratedRows.length },
        ...mismatchSvc.groupMismatchResults(hydratedRows),
        results: hydratedRows,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function recomputeMismatch(req, res) {
  try {
    const id = Number(req.params.id);
    const output = await mismatchSvc.computeMismatchForDokumen(db, id);
    const run = await mismatchSvc.persistMismatchResults(db, id, output, "mismatch", actorId(req));
    const hydratedRows = mismatchSvc.hydrateMismatchNavigation(output.results, id);
    return res.json({
      success: true,
      data: {
        run_id: run.id,
        computed_at: run.computed_at,
        blocking_count: run.blocking_count,
        blocker_count: run.blocking_count,
        warning_count: run.warning_count,
        info_count: run.info_count,
        ...mismatchSvc.groupMismatchResults(hydratedRows),
        results: hydratedRows,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getReadiness(req, res) {
  try {
    const id = Number(req.params.id);
    const data = await readinessSvc.evaluateReadiness(db, id, String(req.query.action || "submit"));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function validateDokumen(req, res) {
  try {
    const id = Number(req.params.id);
    const action = String(req.body?.action || "validate");
    const data = await readinessSvc.evaluateReadiness(db, id, action === "publish" ? "publish" : "submit");
    const hydratedResults = mismatchSvc.hydrateMismatchNavigation(data.results || [], id);
    const run = await mismatchSvc.persistMismatchResults(db, id, { results: hydratedResults }, "full", actorId(req));
    return res.json({
      success: true,
      data: {
        summary: data.summary,
        blocking_count: data.summary.blocking_count,
        blocker_count: data.summary.blocker_count ?? data.summary.blocking_count,
        warning_count: data.summary.warning_count,
        info_count: data.summary.info_count,
        readiness: data.readiness,
        grouped_results: data.grouped_results,
        grouped_by_source: data.grouped_by_source || [],
        grouped_by_hierarchy_level: data.grouped_by_hierarchy_level || [],
        grouped_by_document_pair: data.grouped_by_document_pair || [],
        next_actions: data.next_actions,
        results: hydratedResults,
        run_id: run.id,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function validateItem(req, res) {
  try {
    const dokumenId = Number(req.params.id);
    const doc = await RenjaDokumen.findByPk(dokumenId);
    if (!doc) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    const payload = req.body || {};
    const data = await validateHierarchy(db, { dokumen: doc, item: payload });
    const governed = data.map((x) => classifyGovernance(x));
    return res.json({
      success: true,
      data: {
        summary: {
          total: governed.length,
          blocker_count: governed.filter((x) => x.severity_final === "BLOCKER").length,
          blocking_count: governed.filter((x) => x.severity_final === "BLOCKER").length,
          warning_count: governed.filter((x) => x.severity_final === "WARNING").length,
          info_count: governed.filter((x) => x.severity_final === "INFO").length,
        },
        results: governed,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function bulkValidateItems(req, res) {
  try {
    const dokumenId = Number(req.params.id);
    const doc = await RenjaDokumen.findByPk(dokumenId);
    if (!doc) return res.status(404).json({ success: false, message: "Dokumen tidak ditemukan." });
    const items = await RenjaItem.findAll({ where: { renja_dokumen_id: dokumenId } });
    const all = [];
    for (const item of items) {
      const r = await validateHierarchy(db, { dokumen: doc, item: item.get({ plain: true }) });
      all.push(...r.map((x) => ({ ...x, related_item_id: item.id })));
    }
    const duplicates = detectDuplicateItems(items.map((x) => x.get({ plain: true })));
    for (const dup of duplicates) {
      all.push({
        severity: "error",
        mismatch_scope: "item",
        source_type: "INTERNAL",
        mismatch_code: "DUPLICATE_ITEM",
        mismatch_label: "DUPLICATE_ITEM",
        message: `Terdeteksi duplikasi business key item (${dup.count} baris).`,
        recommendation: "Ubah indikator/lokasi atau satukan item duplikat.",
        is_blocking: true,
        related_item_id: dup.item?.id || null,
      });
    }
    const governed = all.map((x) => classifyGovernance(x));
    return res.json({
      success: true,
      data: {
        summary: {
          total: governed.length,
          blocker_count: governed.filter((x) => x.severity_final === "BLOCKER").length,
          blocking_count: governed.filter((x) => x.severity_final === "BLOCKER").length,
          warning_count: governed.filter((x) => x.severity_final === "WARNING").length,
          info_count: governed.filter((x) => x.severity_final === "INFO").length,
        },
        results: governed,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
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

async function getDataFixSummary(req, res) {
  try {
    const data = await dataFixSvc.getDataFixSummary(db, Number(req.params.id));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function generateDataFixMapping(req, res) {
  try {
    const out = await dataFixSvc.generateMappingSuggestions(db, Number(req.params.id), actorId(req), {
      includeMapped: Boolean(req.body?.include_mapped),
    });
    return res.json({
      success: true,
      data: {
        run_id: out.run.id,
        run_type: out.run.run_type,
        generated_at: out.run.generated_at,
        total: out.rows.length,
        high_confidence: out.rows.filter((x) => x.suggestion_confidence === "HIGH").length,
        manual_review_needed: out.rows.filter((x) => x.suggestion_confidence !== "HIGH" || x.is_conflict).length,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getDataFixMappingSuggestions(req, res) {
  try {
    const rows = await dataFixSvc.getSuggestionsByType(
      db,
      Number(req.params.id),
      dataFixSvc.SUGGESTION_TYPES.MAPPING,
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function applyDataFixMapping(req, res) {
  try {
    const out = await dataFixSvc.applySuggestions(db, Number(req.params.id), actorId(req), {
      suggestion_type: dataFixSvc.SUGGESTION_TYPES.MAPPING,
      suggestion_ids: req.body?.suggestion_ids || [],
      apply_high_confidence_only: Boolean(req.body?.apply_high_confidence_only),
      change_reason_text: req.body?.change_reason_text || null,
      expect_item_stamps: req.body?.expect_item_stamps || null,
      require_data_fix_lock_owner: Boolean(req.body?.require_data_fix_lock_owner),
    });
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(dataFixErrorStatus(e)).json({
      success: false,
      code: e.code || "APPLY_FAILED",
      message: e.message,
      meta: e.meta || null,
    });
  }
}

async function previewDataFixMapping(req, res) {
  try {
    const data = await dataFixSvc.previewMappingApply(db, Number(req.params.id), {
      suggestion_ids: req.body?.suggestion_ids || [],
      apply_high_confidence_only: Boolean(req.body?.apply_high_confidence_only),
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getDataFixQualityScore(req, res) {
  try {
    const data = await dataFixSvc.computeDataQualityScore(db, Number(req.params.id));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function listMappingApplyBatches(req, res) {
  return getDataFixBatchHistory(req, res);
}

async function getDataFixBatchHistory(req, res) {
  try {
    const activeOnly =
      String(req.query.active_only || "") === "1" ||
      String(req.query.active_only || "").toLowerCase() === "true";
    const data = await dataFixSvc.listDataFixBatchHistory(db, Number(req.params.id), {
      active_only: activeOnly,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      change_type: req.query.change_type || null,
      rollback_status: req.query.rollback_status || null,
      applied_by: req.query.applied_by ? Number(req.query.applied_by) : null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getDataFixBatchDetail(req, res) {
  try {
    const row = await dataFixSvc.getDataFixBatchDetail(db, Number(req.params.id), Number(req.params.batchId));
    if (!row) return res.status(404).json({ success: false, message: "BATCH_NOT_FOUND" });
    return res.json({ success: true, data: row });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function previewDataFixImpact(req, res) {
  try {
    const data = await dataFixSvc.previewDataFixImpact(db, Number(req.params.id), {
      suggestion_type: req.body?.suggestion_type,
      suggestion_ids: req.body?.suggestion_ids || [],
      apply_high_confidence_only: Boolean(req.body?.apply_high_confidence_only),
      overwrite_target: Boolean(req.body?.overwrite_target),
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(dataFixErrorStatus(e)).json({
      success: false,
      code: e.code || "PREVIEW_IMPACT_FAILED",
      message: e.message,
    });
  }
}

async function acquireDataFixLock(req, res) {
  try {
    const data = await dataFixSvc.acquireDataFixDocLock(db, Number(req.params.id), actorId(req), {
      ttl_minutes: req.body?.ttl_minutes,
    });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(dataFixErrorStatus(e, 423)).json({
      success: false,
      code: e.code || "LOCK_FAILED",
      message: e.message,
      meta: e.meta || null,
    });
  }
}

async function releaseDataFixLock(req, res) {
  try {
    const data = await dataFixSvc.releaseDataFixDocLock(db, Number(req.params.id), actorId(req));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(dataFixErrorStatus(e, 403)).json({
      success: false,
      code: e.code || "LOCK_RELEASE_FAILED",
      message: e.message,
    });
  }
}

async function getDataFixDocLock(req, res) {
  try {
    const data = await dataFixSvc.getDataFixDocLock(db, Number(req.params.id));
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function rollbackMappingApplyBatch(req, res) {
  try {
    const data = await dataFixSvc.rollbackMappingBatch(
      db,
      Number(req.params.id),
      Number(req.body.batch_id),
      actorId(req),
      {
        change_reason_text: req.body?.change_reason_text,
        force_partial_rollback: Boolean(req.body?.force_partial_rollback),
      },
    );
    return res.json({ success: true, data });
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("ROLLBACK_BATCH_NOT_FOUND")) {
      return res.status(404).json({ success: false, code: "ROLLBACK_BATCH_NOT_FOUND", message: msg });
    }
    if (msg.includes("ROLLBACK_BATCH_ALREADY_ROLLED_BACK")) {
      return res.status(409).json({ success: false, code: "ROLLBACK_BATCH_ALREADY_ROLLED_BACK", message: msg });
    }
    if (msg.includes("ROLLBACK_ITEM_CHANGED")) {
      return res.status(409).json({
        success: false,
        code: "ROLLBACK_ITEM_CHANGED",
        message: msg,
        meta: e.meta || null,
      });
    }
    return res.status(dataFixErrorStatus(e)).json({
      success: false,
      code: e.code || "ROLLBACK_FAILED",
      message: msg,
    });
  }
}

async function generateIndicatorSuggestions(req, res) {
  try {
    const out = await dataFixSvc.generateIndicatorSuggestions(db, Number(req.params.id), actorId(req), {
      includeMapped: Boolean(req.body?.include_mapped),
    });
    return res.json({
      success: true,
      data: {
        run_id: out.run.id,
        run_type: out.run.run_type,
        generated_at: out.run.generated_at,
        total: out.rows.length,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getIndicatorSuggestions(req, res) {
  try {
    const rows = await dataFixSvc.getSuggestionsByType(
      db,
      Number(req.params.id),
      dataFixSvc.SUGGESTION_TYPES.INDICATOR,
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function applyIndicatorMapping(req, res) {
  try {
    const out = await dataFixSvc.applySuggestions(db, Number(req.params.id), actorId(req), {
      suggestion_type: dataFixSvc.SUGGESTION_TYPES.INDICATOR,
      suggestion_ids: req.body?.suggestion_ids || [],
      apply_high_confidence_only: Boolean(req.body?.apply_high_confidence_only),
      change_reason_text: req.body?.change_reason_text || null,
      expect_item_stamps: req.body?.expect_item_stamps || null,
      require_data_fix_lock_owner: Boolean(req.body?.require_data_fix_lock_owner),
    });
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(dataFixErrorStatus(e)).json({
      success: false,
      code: e.code || "APPLY_FAILED",
      message: e.message,
      meta: e.meta || null,
    });
  }
}

async function autofillTargets(req, res) {
  try {
    const generated = await dataFixSvc.generateTargetSuggestions(db, Number(req.params.id), actorId(req), {
      overwrite: Boolean(req.body?.overwrite_target),
    });
    const autoApply = req.body?.auto_apply !== false;
    const applied = autoApply
      ? await dataFixSvc.applySuggestions(db, Number(req.params.id), actorId(req), {
          suggestion_type: dataFixSvc.SUGGESTION_TYPES.TARGET,
          apply_high_confidence_only: true,
          overwrite_target: Boolean(req.body?.overwrite_target),
          change_reason_text: req.body?.change_reason_text || null,
          expect_item_stamps: req.body?.expect_item_stamps || null,
          require_data_fix_lock_owner: Boolean(req.body?.require_data_fix_lock_owner),
        })
      : null;

    return res.json({
      success: true,
      data: {
        run_id: generated.run.id,
        generated_total: generated.rows.length,
        auto_apply: autoApply,
        apply_result: applied,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getTargetSuggestions(req, res) {
  try {
    const rows = await dataFixSvc.getSuggestionsByType(
      db,
      Number(req.params.id),
      dataFixSvc.SUGGESTION_TYPES.TARGET,
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function resolvePolicyConflicts(req, res) {
  try {
    const generated = await dataFixSvc.generatePolicyConflictSuggestions(db, Number(req.params.id), actorId(req));
    const autoApply = Boolean(req.body?.auto_apply);
    const applied = autoApply
      ? await dataFixSvc.applySuggestions(db, Number(req.params.id), actorId(req), {
          suggestion_type: dataFixSvc.SUGGESTION_TYPES.POLICY,
          apply_high_confidence_only: true,
          change_reason_text: req.body?.change_reason_text || null,
          expect_item_stamps: req.body?.expect_item_stamps || null,
          require_data_fix_lock_owner: Boolean(req.body?.require_data_fix_lock_owner),
        })
      : null;
    return res.json({
      success: true,
      data: {
        run_id: generated.run.id,
        generated_total: generated.rows.length,
        conflict_count: generated.rows.filter((x) => x.is_conflict).length,
        auto_apply: autoApply,
        apply_result: applied,
      },
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function getPolicyConflicts(req, res) {
  try {
    const rows = await dataFixSvc.getSuggestionsByType(
      db,
      Number(req.params.id),
      dataFixSvc.SUGGESTION_TYPES.POLICY,
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
}

async function applyAllHighConfidence(req, res) {
  try {
    const out = await dataFixSvc.applyAllHighConfidence(db, Number(req.params.id), actorId(req), {
      overwrite_target: Boolean(req.body?.overwrite_target),
      change_reason_text: req.body?.change_reason_text || null,
      expect_item_stamps: req.body?.expect_item_stamps || null,
      require_data_fix_lock_owner: Boolean(req.body?.require_data_fix_lock_owner),
    });
    return res.json({ success: true, data: out });
  } catch (e) {
    return res.status(dataFixErrorStatus(e)).json({
      success: false,
      code: e.code || "APPLY_FAILED",
      message: e.message,
      meta: e.meta || null,
    });
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
  validateDokumen,
  getReadiness,
  recomputeMismatch,
  getValidationMismatch,
  validateItem,
  bulkValidateItems,
  dropdownOpd,
  dropdownRenstra,
  dropdownRkpd,
  dropdownSasaran,
  dropdownPrograms,
  dropdownKegiatan,
  dropdownSubKegiatan,
  getDataFixSummary,
  generateDataFixMapping,
  getDataFixMappingSuggestions,
  applyDataFixMapping,
  previewDataFixMapping,
  previewDataFixImpact,
  getDataFixQualityScore,
  listMappingApplyBatches,
  getDataFixBatchHistory,
  getDataFixBatchDetail,
  rollbackMappingApplyBatch,
  acquireDataFixLock,
  releaseDataFixLock,
  getDataFixDocLock,
  generateIndicatorSuggestions,
  getIndicatorSuggestions,
  applyIndicatorMapping,
  autofillTargets,
  getTargetSuggestions,
  resolvePolicyConflicts,
  getPolicyConflicts,
  applyAllHighConfidence,
};
