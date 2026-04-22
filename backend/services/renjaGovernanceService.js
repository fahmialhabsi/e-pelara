"use strict";

const crypto = require("crypto");
const { Op } = require("sequelize");
const { classifyGovernance } = require("./renjaGovernanceSeverityService");

const WORKFLOW_TRANSITIONS = {
  draft: ["submitted", "archived"],
  submitted: ["reviewed", "rejected", "draft"],
  reviewed: ["approved", "rejected", "draft"],
  approved: ["published", "rejected"],
  rejected: ["draft", "submitted", "archived"],
  published: ["archived"],
  archived: [],
};

function assertWorkflowTransition(fromStatus, toStatus) {
  const allowed = WORKFLOW_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Transisi workflow tidak valid: ${fromStatus} -> ${toStatus}`);
  }
}

function mapActionToWorkflow(action) {
  switch (String(action || "").toLowerCase()) {
    case "submit":
      return "submitted";
    case "review":
      return "reviewed";
    case "approve":
      return "approved";
    case "publish":
      return "published";
    case "reject":
      return "rejected";
    case "archive":
      return "archived";
    default:
      throw new Error(`Aksi workflow tidak dikenali: ${action}`);
  }
}

const DEFAULT_SECTIONS = [
  ["pendahuluan", "BAB I Pendahuluan"],
  ["evaluasi", "BAB II Evaluasi RENJA Tahun Lalu"],
  ["tujuan_sasaran", "BAB III Tujuan dan Sasaran"],
  ["rencana_kerja", "BAB IV Rencana Kerja dan Pendanaan"],
  ["penutup", "BAB V Penutup"],
];

async function ensureDefaultSections(db, renjaDokumenId, transaction) {
  const { RenjaDokumenSection } = db;
  for (const [key, title] of DEFAULT_SECTIONS) {
    const ex = await RenjaDokumenSection.findOne({
      where: { renja_dokumen_id: renjaDokumenId, section_key: key },
      transaction,
    });
    if (!ex) {
      await RenjaDokumenSection.create(
        {
          renja_dokumen_id: renjaDokumenId,
          section_key: key,
          section_title: title,
          content: null,
          completion_pct: 0,
          source_mode: "MANUAL",
        },
        { transaction },
      );
    }
  }
}

function buildDocSnapshot(docPlain, items = [], sections = []) {
  return {
    dokumen: docPlain,
    sections,
    items,
    snapshot_at: new Date().toISOString(),
  };
}

function makeHash(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload || {})).digest("hex");
}

async function createVersionSnapshot(db, renjaDokumenId, opts = {}) {
  const {
    RenjaDokumen,
    RenjaItem,
    RenjaDokumenSection,
    RenjaDokumenVersion,
    RenjaSnapshot,
    sequelize,
  } = db;
  const {
    transaction,
    actorId = null,
    status = "draft",
    changeType = "revision",
    changeReason = null,
    parentVersionId = null,
    isPublished = false,
    sectionSnapshotType = "after_change",
  } = opts;

  const localTx = transaction || (await sequelize.transaction());
  const ownTx = !transaction;

  try {
    const doc = await RenjaDokumen.findByPk(renjaDokumenId, { transaction: localTx });
    if (!doc) throw new Error("Dokumen RENJA tidak ditemukan.");

    const [items, sections] = await Promise.all([
      RenjaItem.findAll({ where: { renja_dokumen_id: renjaDokumenId }, transaction: localTx }),
      RenjaDokumenSection.findAll({ where: { renja_dokumen_id: renjaDokumenId }, transaction: localTx }),
    ]);

    const maxVersion = await RenjaDokumenVersion.max("version_number", {
      where: { renja_dokumen_id: renjaDokumenId },
      transaction: localTx,
    });
    const nextVersion = (maxVersion || 0) + 1;
    const snapshotPayload = buildDocSnapshot(
      doc.get({ plain: true }),
      items.map((x) => x.get({ plain: true })),
      sections.map((x) => x.get({ plain: true })),
    );
    const snapshotHash = makeHash(snapshotPayload);

    await RenjaDokumenVersion.update(
      { is_current: false },
      { where: { renja_dokumen_id: renjaDokumenId }, transaction: localTx },
    );

    const createdVersion = await RenjaDokumenVersion.create(
      {
        renja_dokumen_id: renjaDokumenId,
        version_number: nextVersion,
        version_label: `v${nextVersion}`,
        parent_version_id: parentVersionId,
        base_dokumen_id: doc.base_dokumen_id || doc.id,
        change_type: changeType,
        change_reason: changeReason,
        snapshot_data: snapshotPayload,
        snapshot_hash: snapshotHash,
        created_at: new Date(),
        created_by: actorId,
        is_current: true,
        status,
        is_published: isPublished,
        published_at: isPublished ? new Date() : null,
        approved_by: ["approved", "published"].includes(status) ? actorId : null,
        approved_at: ["approved", "published"].includes(status) ? new Date() : null,
      },
      { transaction: localTx },
    );

    await RenjaSnapshot.create(
      {
        renja_dokumen_id: renjaDokumenId,
        renja_dokumen_version_id: createdVersion.id,
        snapshot_type: sectionSnapshotType,
        snapshot_data: snapshotPayload,
        snapshot_hash: snapshotHash,
        created_by: actorId,
        created_at: new Date(),
      },
      { transaction: localTx },
    );

    await doc.update(
      {
        versi: nextVersion,
        current_version_id: createdVersion.id,
      },
      { transaction: localTx },
    );

    if (ownTx) await localTx.commit();
    return createdVersion;
  } catch (e) {
    if (ownTx) await localTx.rollback();
    throw e;
  }
}

async function createRevision(db, renjaDokumenId, payload, actorId = null) {
  const { RenjaDokumen, RenjaItem, RenjaDokumenSection, RenjaRevisionLog, sequelize } = db;
  const t = await sequelize.transaction();
  try {
    const current = await RenjaDokumen.findByPk(renjaDokumenId, { transaction: t });
    if (!current) throw new Error("Dokumen RENJA tidak ditemukan.");
    if (!["published", "approved"].includes(current.workflow_status)) {
      throw new Error("Revision hanya boleh dibuat dari dokumen approved/published.");
    }

    const cloneDoc = await RenjaDokumen.create(
      {
        ...current.get({ plain: true }),
        id: undefined,
        versi: 1,
        status: "draft",
        workflow_status: "draft",
        document_kind: "renja_perubahan",
        is_perubahan: true,
        perubahan_ke: (current.perubahan_ke || 0) + 1,
        parent_dokumen_id: current.id,
        base_dokumen_id: current.base_dokumen_id || current.id,
        is_final_active: false,
        published_at: null,
        published_by: null,
        approved_at: null,
        approved_by: null,
        created_at: undefined,
        updated_at: undefined,
      },
      { transaction: t },
    );

    const items = await RenjaItem.findAll({ where: { renja_dokumen_id: current.id }, transaction: t });
    for (const it of items) {
      const p = it.get({ plain: true });
      delete p.id;
      p.renja_dokumen_id = cloneDoc.id;
      await RenjaItem.create(p, { transaction: t });
    }

    const sections = await RenjaDokumenSection.findAll({ where: { renja_dokumen_id: current.id }, transaction: t });
    for (const s of sections) {
      const p = s.get({ plain: true });
      delete p.id;
      p.renja_dokumen_id = cloneDoc.id;
      await RenjaDokumenSection.create(p, { transaction: t });
    }

    const beforeVersion = await createVersionSnapshot(db, current.id, {
      transaction: t,
      actorId,
      status: current.workflow_status,
      changeType: "revision_before",
      changeReason: payload.change_reason,
      sectionSnapshotType: "before_change",
    });
    const afterVersion = await createVersionSnapshot(db, cloneDoc.id, {
      transaction: t,
      actorId,
      status: "draft",
      changeType: "revision",
      changeReason: payload.change_reason,
      sectionSnapshotType: "after_change",
    });

    await RenjaRevisionLog.create(
      {
        renja_dokumen_id: cloneDoc.id,
        from_version_id: beforeVersion.id,
        to_version_id: afterVersion.id,
        revision_type: payload.revision_type || "perubahan",
        change_reason: payload.change_reason,
        created_by: actorId,
        created_at: new Date(),
      },
      { transaction: t },
    );

    await t.commit();
    return cloneDoc;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function compareVersions(db, renjaDokumenId, fromVersionNumber, toVersionNumber) {
  const { RenjaDokumenVersion } = db;
  const [fromVersion, toVersion] = await Promise.all([
    RenjaDokumenVersion.findOne({ where: { renja_dokumen_id: renjaDokumenId, version_number: fromVersionNumber } }),
    RenjaDokumenVersion.findOne({ where: { renja_dokumen_id: renjaDokumenId, version_number: toVersionNumber } }),
  ]);
  if (!fromVersion || !toVersion) {
    throw new Error("Versi pembanding tidak ditemukan.");
  }

  const beforeItems = fromVersion.snapshot_data?.items || [];
  const afterItems = toVersion.snapshot_data?.items || [];
  const beforeMap = new Map(beforeItems.map((x) => [String(x.id || x.urutan || x.kode_sub_kegiatan || JSON.stringify(x)), x]));
  const afterMap = new Map(afterItems.map((x) => [String(x.id || x.urutan || x.kode_sub_kegiatan || JSON.stringify(x)), x]));
  const keys = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));

  const diffs = [];
  for (const k of keys) {
    const b = beforeMap.get(k);
    const a = afterMap.get(k);
    if (!b && a) {
      diffs.push({ change_flag: "added", key: k, before: null, after: a });
      continue;
    }
    if (b && !a) {
      diffs.push({ change_flag: "removed", key: k, before: b, after: null });
      continue;
    }
    const changedFields = [];
    for (const f of [
      "program",
      "kegiatan",
      "sub_kegiatan",
      "indikator",
      "target",
      "target_numerik",
      "target_teks",
      "pagu",
      "pagu_indikatif",
      "lokasi",
      "kelompok_sasaran",
      "catatan",
    ]) {
      if (String(b?.[f] ?? "") !== String(a?.[f] ?? "")) {
        changedFields.push({ field: f, before: b?.[f] ?? null, after: a?.[f] ?? null });
      }
    }
    diffs.push({
      change_flag: changedFields.length ? "updated" : "unchanged",
      key: k,
      before: b,
      after: a,
      fields: changedFields,
    });
  }

  return {
    from: {
      id: fromVersion.id,
      version_number: fromVersion.version_number,
      created_at: fromVersion.created_at,
      created_by: fromVersion.created_by,
    },
    to: {
      id: toVersion.id,
      version_number: toVersion.version_number,
      created_at: toVersion.created_at,
      created_by: toVersion.created_by,
    },
    summary: {
      added: diffs.filter((d) => d.change_flag === "added").length,
      updated: diffs.filter((d) => d.change_flag === "updated").length,
      removed: diffs.filter((d) => d.change_flag === "removed").length,
      unchanged: diffs.filter((d) => d.change_flag === "unchanged").length,
    },
    diffs,
  };
}

async function getDashboardSummary(db, filters = {}) {
  const {
    RenjaDokumen,
    RenjaItem,
    RenjaDokumenSection,
    PerangkatDaerah,
    RenjaValidationRun,
    RenjaMismatchResult,
  } = db;
  const where = {};
  if (filters.tahun) where.tahun = Number(filters.tahun);
  if (filters.perangkat_daerah_id) where.perangkat_daerah_id = Number(filters.perangkat_daerah_id);
  if (filters.workflow_status) where.workflow_status = filters.workflow_status;
  if (filters.document_kind) where.document_kind = filters.document_kind;

  const docs = await RenjaDokumen.findAll({
    where,
    include: [{ model: PerangkatDaerah, as: "perangkatDaerah", required: false }],
  });
  const docsPlain = docs.map((d) => d.get({ plain: true }));
  const docIds = docsPlain.map((d) => d.id);
  const items = docIds.length
    ? await RenjaItem.findAll({ where: { renja_dokumen_id: { [Op.in]: docIds } }, raw: true })
    : [];
  const sections = docIds.length
    ? await RenjaDokumenSection.findAll({
        where: { renja_dokumen_id: { [Op.in]: docIds } },
        raw: true,
      })
    : [];
  const validationRuns = docIds.length
    ? await RenjaValidationRun.findAll({
        where: { renja_dokumen_id: { [Op.in]: docIds } },
        order: [["computed_at", "DESC"]],
        raw: true,
      })
    : [];
  const latestRunByDoc = new Map();
  for (const r of validationRuns) {
    if (latestRunByDoc.has(r.renja_dokumen_id)) continue;
    latestRunByDoc.set(r.renja_dokumen_id, r);
  }
  const latestRunIds = Array.from(latestRunByDoc.values())
    .map((x) => Number(x.id))
    .filter(Boolean);
  const mismatchRows = latestRunIds.length
    ? await RenjaMismatchResult.findAll({
        where: {
          renja_validation_run_id: { [Op.in]: latestRunIds },
          is_resolved: false,
        },
        raw: true,
        limit: 100000,
      })
    : [];
  const governedMismatchRows = mismatchRows.map((x) => classifyGovernance(x));

  const byWorkflow = ["draft", "submitted", "reviewed", "approved", "rejected", "published", "archived"].reduce(
    (a, k) => ({ ...a, [k]: 0 }),
    {},
  );
  const byPhase = ["rancangan_awal", "rancangan", "forum_perangkat_daerah", "pasca_musrenbang", "final"].reduce(
    (a, k) => ({ ...a, [k]: 0 }),
    {},
  );

  for (const d of docsPlain) {
    if (byWorkflow[d.workflow_status] != null) byWorkflow[d.workflow_status] += 1;
    if (byPhase[d.document_phase] != null) byPhase[d.document_phase] += 1;
  }

  const mismatchCount = governedMismatchRows.length;
  const perubahanCount = docsPlain.filter((d) => d.document_kind === "renja_perubahan").length;
  const finalCount = docsPlain.filter((d) => d.workflow_status === "published").length;
  const submittedReviewedCount = docsPlain.filter((d) =>
    ["submitted", "reviewed"].includes(String(d.workflow_status || "")),
  ).length;

  const sectionByDoc = new Map();
  for (const s of sections) {
    if (!sectionByDoc.has(s.renja_dokumen_id)) sectionByDoc.set(s.renja_dokumen_id, []);
    sectionByDoc.get(s.renja_dokumen_id).push(s);
  }
  const itemByDoc = new Map();
  for (const it of items) {
    if (!itemByDoc.has(it.renja_dokumen_id)) itemByDoc.set(it.renja_dokumen_id, []);
    itemByDoc.get(it.renja_dokumen_id).push(it);
  }

  const mismatchByDoc = new Map();
  for (const m of governedMismatchRows) {
    const docId = Number(m.renja_dokumen_id);
    if (!docId) continue;
    if (!mismatchByDoc.has(docId)) mismatchByDoc.set(docId, []);
    mismatchByDoc.get(docId).push(m);
  }

  const progressByDokumen = docsPlain.map((d) => {
    const ds = sectionByDoc.get(d.id) || [];
    const di = itemByDoc.get(d.id) || [];
    const chapterCompletion = ds.length
      ? Number(
          (
            ds.reduce((a, x) => a + Number(x.completion_pct || 0), 0) /
            ds.length
          ).toFixed(2),
        )
      : 0;
    const mappedCount = di.filter((x) => String(x.mismatch_status || "matched") === "matched").length;
    const itemCompletion = di.length ? Number(((mappedCount / di.length) * 100).toFixed(2)) : 0;
    const run = latestRunByDoc.get(d.id) || null;
    const mismatches = mismatchByDoc.get(Number(d.id)) || [];
    const blockerCount = mismatches.filter((x) => x.severity_final === "BLOCKER").length;
    const warningCount = mismatches.filter((x) => x.severity_final === "WARNING").length;
    const infoCount = mismatches.filter((x) => x.severity_final === "INFO").length;
    return {
      id: d.id,
      judul: d.judul,
      workflow_status: d.workflow_status,
      document_phase: d.document_phase,
      chapter_completion_pct: chapterCompletion,
      item_completion_pct: itemCompletion,
      mismatch_count: mismatches.length,
      blocker_count: blockerCount || Number(run?.blocking_count || 0),
      blocking_count: blockerCount || Number(run?.blocking_count || 0),
      warning_count: warningCount || Number(run?.warning_count || 0),
      info_count: infoCount || Number(run?.info_count || 0),
      readiness_status:
        (blockerCount || Number(run?.blocking_count || 0)) > 0
          ? "BLOCKED"
          : (warningCount || Number(run?.warning_count || 0)) > 0
            ? "WARNING"
            : "READY",
      perangkat_daerah: d.perangkatDaerah?.nama || null,
    };
  });

  const opdAgg = {};
  for (const d of progressByDokumen) {
    const key = d.perangkat_daerah || "Tanpa OPD";
    if (!opdAgg[key]) {
      opdAgg[key] = { opd: key, dokumen: 0, avg_chapter_completion_pct: 0, avg_item_completion_pct: 0 };
    }
    opdAgg[key].dokumen += 1;
    opdAgg[key].avg_chapter_completion_pct += d.chapter_completion_pct;
    opdAgg[key].avg_item_completion_pct += d.item_completion_pct;
  }
  const progressByOpd = Object.values(opdAgg).map((x) => ({
    ...x,
    avg_chapter_completion_pct: Number((x.avg_chapter_completion_pct / x.dokumen).toFixed(2)),
    avg_item_completion_pct: Number((x.avg_item_completion_pct / x.dokumen).toFixed(2)),
  }));

  const itemIssuesById = new Map();
  for (const m of governedMismatchRows) {
    if (!m.renja_item_id) continue;
    const key = Number(m.renja_item_id);
    if (!itemIssuesById.has(key)) itemIssuesById.set(key, []);
    itemIssuesById.get(key).push(m);
  }
  const renstraItemIds = items
    .filter((x) =>
      x.source_renstra_program_id || ["RENSTRA", "IRISAN"].includes(String(x.source_mode || "").toUpperCase()),
    )
    .map((x) => Number(x.id));
  const rkpdItemIds = items
    .filter((x) => x.source_rkpd_item_id || ["RKPD", "IRISAN"].includes(String(x.source_mode || "").toUpperCase()))
    .map((x) => Number(x.id));
  const policyItemIds = Array.from(new Set([...renstraItemIds]));

  const policyCodes = new Set([
    "POLICY_CHAIN_EXISTS",
    "POLICY_CHAIN_BROKEN",
    "POLICY_CHAIN_INCOMPLETE",
    "STRATEGY_NOT_ALIGNED",
    "ARAH_KEBIJAKAN_NOT_ALIGNED",
    "SASARAN_NOT_ALIGNED",
    "TUJUAN_NOT_ALIGNED",
    "MISI_NOT_ALIGNED",
  ]);
  const renstraAlignmentCodes = new Set([
    "RENSTRA_ITEM_NOT_FOUND",
    "RENSTRA_RENJA_PROGRAM_ALIGNED",
    "TARGET_OUT_OF_RANGE_RENSTRA",
    "PAGU_OUT_OF_RANGE_RENSTRA",
    "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    ...Array.from(policyCodes),
  ]);
  const rkpdAlignmentCodes = new Set([
    "RKPD_ITEM_NOT_FOUND",
    "RKPD_RENJA_TARGET_ALIGNED",
    "TARGET_OUT_OF_RANGE_RKPD",
    "PAGU_OUT_OF_RANGE_RKPD",
    "INDIKATOR_NOT_ALIGNED_WITH_RKPD",
    "LOW_NAME_SIMILARITY",
  ]);

  const calcAlignment = (ids, predicate) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return { total_items: 0, aligned_items: 0, mismatch_items: 0, alignment_pct: 100 };
    let mismatch = 0;
    for (const itemId of uniqueIds) {
      const rows = itemIssuesById.get(itemId) || [];
      if (rows.some(predicate)) mismatch += 1;
    }
    const aligned = uniqueIds.length - mismatch;
    return {
      total_items: uniqueIds.length,
      aligned_items: aligned,
      mismatch_items: mismatch,
      alignment_pct: Number(((aligned / uniqueIds.length) * 100).toFixed(2)),
    };
  };

  const renstraAlignment = calcAlignment(
    renstraItemIds,
    (r) => renstraAlignmentCodes.has(String(r.mismatch_code || "")) && String(r.severity_final || "") !== "INFO",
  );
  const rkpdAlignment = calcAlignment(
    rkpdItemIds,
    (r) => rkpdAlignmentCodes.has(String(r.mismatch_code || "")) && String(r.severity_final || "") !== "INFO",
  );
  const strategiAlignment = calcAlignment(
    policyItemIds,
    (r) => ["STRATEGY_NOT_ALIGNED", "POLICY_CHAIN_BROKEN", "POLICY_CHAIN_INCOMPLETE", "POLICY_CHAIN_EXISTS"].includes(String(r.mismatch_code || "")),
  );
  const arahAlignment = calcAlignment(
    policyItemIds,
    (r) => ["ARAH_KEBIJAKAN_NOT_ALIGNED", "POLICY_CHAIN_BROKEN", "POLICY_CHAIN_INCOMPLETE", "POLICY_CHAIN_EXISTS"].includes(String(r.mismatch_code || "")),
  );

  const thresholdAlerts = {
    target_warning_count: governedMismatchRows.filter(
      (x) => ["TARGET_OUT_OF_RANGE_RENSTRA", "TARGET_OUT_OF_RANGE_RKPD", "RKPD_RENJA_TARGET_ALIGNED", "RENSTRA_RKPD_TARGET_ALIGNED"].includes(String(x.mismatch_code || "")) &&
        String(x.severity_final || "") === "WARNING",
    ).length,
    target_error_count: governedMismatchRows.filter(
      (x) => ["TARGET_OUT_OF_RANGE_RENSTRA", "TARGET_OUT_OF_RANGE_RKPD", "RKPD_RENJA_TARGET_ALIGNED", "RENSTRA_RKPD_TARGET_ALIGNED"].includes(String(x.mismatch_code || "")) &&
        String(x.severity_final || "") === "BLOCKER",
    ).length,
    pagu_warning_count: governedMismatchRows.filter(
      (x) => ["PAGU_OUT_OF_RANGE_RKPD", "PAGU_OUT_OF_RANGE_RENSTRA"].includes(String(x.mismatch_code || "")) &&
        String(x.severity_final || "") === "WARNING",
    ).length,
    pagu_error_count: governedMismatchRows.filter(
      (x) => ["PAGU_OUT_OF_RANGE_RKPD", "PAGU_OUT_OF_RANGE_RENSTRA"].includes(String(x.mismatch_code || "")) &&
        String(x.severity_final || "") === "BLOCKER",
    ).length,
    indicator_warning_count: governedMismatchRows.filter(
      (x) =>
        ["INDIKATOR_NOT_ALIGNED_WITH_RENSTRA", "INDIKATOR_NOT_ALIGNED_WITH_RKPD", "INDIKATOR_INCONSISTENT", "INDIKATOR_NOT_TRACEABLE", "INDIKATOR_DUPLICATE"].includes(
          String(x.mismatch_code || ""),
        ) &&
        String(x.severity_final || "") === "WARNING",
    ).length,
    indicator_error_count: governedMismatchRows.filter(
      (x) =>
        ["INDIKATOR_NOT_ALIGNED_WITH_RENSTRA", "INDIKATOR_NOT_ALIGNED_WITH_RKPD", "INDIKATOR_MISSING", "INDIKATOR_TARGET_MISSING"].includes(
          String(x.mismatch_code || ""),
        ) &&
        String(x.severity_final || "") === "BLOCKER",
    ).length,
  };

  const policyChainIssues = {
    chain_broken_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "POLICY_CHAIN_BROKEN").length,
    chain_incomplete_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "POLICY_CHAIN_INCOMPLETE").length,
    strategy_not_aligned_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "STRATEGY_NOT_ALIGNED").length,
    arah_kebijakan_not_aligned_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "ARAH_KEBIJAKAN_NOT_ALIGNED").length,
    sasaran_not_aligned_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "SASARAN_NOT_ALIGNED").length,
    tujuan_not_aligned_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "TUJUAN_NOT_ALIGNED").length,
    misi_not_aligned_count: governedMismatchRows.filter((x) => String(x.mismatch_code || "") === "MISI_NOT_ALIGNED").length,
  };

  const governancePanel = {
    blocker_count: progressByDokumen.reduce((a, x) => a + Number(x.blocker_count || 0), 0),
    warning_count: progressByDokumen.reduce((a, x) => a + Number(x.warning_count || 0), 0),
    info_count: progressByDokumen.reduce((a, x) => a + Number(x.info_count || 0), 0),
  };
  governancePanel.ready_count = progressByDokumen.filter((x) => x.readiness_status === "READY").length;
  governancePanel.warning_doc_count = progressByDokumen.filter((x) => x.readiness_status === "WARNING").length;
  governancePanel.blocked_count = progressByDokumen.filter((x) => x.readiness_status === "BLOCKED").length;

  const policyChainItemIssues = new Set(
    governedMismatchRows
      .filter((x) =>
        [
          "POLICY_CHAIN_BROKEN",
          "POLICY_CHAIN_INCOMPLETE",
          "PROGRAM_WITHOUT_ARAH_KEBIJAKAN",
          "ARAH_KEBIJAKAN_WITHOUT_STRATEGI",
          "STRATEGI_WITHOUT_SASARAN",
          "SASARAN_WITHOUT_TUJUAN",
          "TUJUAN_WITHOUT_MISI",
        ].includes(String(x.mismatch_code || "")),
      )
      .map((x) => Number(x.renja_item_id || 0))
      .filter(Boolean),
  );
  const totalPolicyItems = new Set(items.map((x) => Number(x.id)).filter(Boolean)).size;
  const policyBrokenItems = policyChainItemIssues.size;
  const policyValidItems = Math.max(0, totalPolicyItems - policyBrokenItems);
  const policyChainHealth = {
    total_items: totalPolicyItems,
    valid_items: policyValidItems,
    broken_items: policyBrokenItems,
    valid_pct: totalPolicyItems ? Number(((policyValidItems / totalPolicyItems) * 100).toFixed(2)) : 100,
    broken_pct: totalPolicyItems ? Number(((policyBrokenItems / totalPolicyItems) * 100).toFixed(2)) : 0,
  };

  const missingIndicatorItems = items.filter((x) => !String(x.indikator || "").trim()).map((x) => Number(x.id));
  const indicatorIssueItems = new Set(
    governedMismatchRows
      .filter((x) =>
        [
          "INDIKATOR_MISSING",
          "INDIKATOR_DUPLICATE",
          "INDIKATOR_NOT_TRACEABLE",
          "INDIKATOR_INCONSISTENT",
          "INDIKATOR_TARGET_MISSING",
          "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
          "INDIKATOR_NOT_ALIGNED_WITH_RKPD",
        ].includes(String(x.mismatch_code || "")),
      )
      .map((x) => Number(x.renja_item_id || 0))
      .filter(Boolean),
  );
  const indicatorProblemItems = new Set([...missingIndicatorItems, ...Array.from(indicatorIssueItems)]);
  const indicatorTotalItems = new Set(items.map((x) => Number(x.id)).filter(Boolean)).size;
  const indicatorValidItems = Math.max(0, indicatorTotalItems - indicatorProblemItems.size);
  const indicatorHealth = {
    total_items: indicatorTotalItems,
    valid_items: indicatorValidItems,
    missing_items: indicatorProblemItems.size,
    valid_pct: indicatorTotalItems ? Number(((indicatorValidItems / indicatorTotalItems) * 100).toFixed(2)) : 100,
    missing_pct: indicatorTotalItems ? Number(((indicatorProblemItems.size / indicatorTotalItems) * 100).toFixed(2)) : 0,
  };

  return {
    filters: {
      tahun: filters.tahun ? Number(filters.tahun) : null,
      perangkat_daerah_id: filters.perangkat_daerah_id ? Number(filters.perangkat_daerah_id) : null,
      workflow_status: filters.workflow_status || null,
      document_kind: filters.document_kind || null,
    },
    summary_cards: {
      jumlah_dokumen: docsPlain.length,
      jumlah_draft: byWorkflow.draft || 0,
      jumlah_submitted_reviewed: submittedReviewedCount,
      jumlah_final: finalCount,
      jumlah_dokumen_perubahan: perubahanCount,
      jumlah_mismatch: mismatchCount,
      jumlah_blocker_issues: governancePanel.blocker_count,
      jumlah_blocking_issues: governancePanel.blocker_count,
      jumlah_warning_issues: governancePanel.warning_count,
      jumlah_info_issues: governancePanel.info_count,
      jumlah_ready: governancePanel.ready_count,
      jumlah_warning_status: governancePanel.warning_doc_count,
      jumlah_blocked: governancePanel.blocked_count,
    },
    governance_panel: governancePanel,
    alignment_summary: {
      renstra_alignment: renstraAlignment,
      rkpd_alignment: rkpdAlignment,
      strategi_alignment: strategiAlignment,
      arah_kebijakan_alignment: arahAlignment,
    },
    threshold_alerts: thresholdAlerts,
    policy_chain_issues: policyChainIssues,
    policy_chain_health: policyChainHealth,
    indicator_health: indicatorHealth,
    chart_status_dokumen: Object.entries(byWorkflow).map(([status, total]) => ({ status, total })),
    chart_dokumen_per_fase: Object.entries(byPhase).map(([fase, total]) => ({ fase, total })),
    chart_progres_per_opd: progressByOpd,
    progress_penyusunan: progressByDokumen,
  };
}

async function getRecentDocuments(db, filters = {}) {
  const { RenjaDokumen, PerangkatDaerah } = db;
  const where = {};
  if (filters.tahun) where.tahun = Number(filters.tahun);
  if (filters.perangkat_daerah_id) where.perangkat_daerah_id = Number(filters.perangkat_daerah_id);

  return RenjaDokumen.findAll({
    where,
    include: [{ model: PerangkatDaerah, as: "perangkatDaerah", required: false }],
    order: [["updated_at", "DESC"]],
    limit: 20,
  });
}

async function getMismatchAlerts(db, renjaDokumenId = null) {
  const { RenjaItem, RenjaDokumen } = db;
  const where = { mismatch_status: { [Op.ne]: "matched" } };
  if (renjaDokumenId) where.renja_dokumen_id = Number(renjaDokumenId);

  return RenjaItem.findAll({
    where,
    include: [{ model: RenjaDokumen, as: "renjaDokumen", required: false }],
    order: [["updated_at", "DESC"]],
    limit: 200,
  });
}

async function getActionItems(db, filters = {}) {
  const { RenjaDokumen } = db;
  const where = {
    workflow_status: { [Op.in]: ["draft", "rejected", "submitted"] },
  };
  if (filters.tahun) where.tahun = Number(filters.tahun);
  if (filters.perangkat_daerah_id) where.perangkat_daerah_id = Number(filters.perangkat_daerah_id);

  return RenjaDokumen.findAll({
    where,
    order: [["updated_at", "DESC"]],
    limit: 20,
  });
}

module.exports = {
  WORKFLOW_TRANSITIONS,
  mapActionToWorkflow,
  assertWorkflowTransition,
  ensureDefaultSections,
  createVersionSnapshot,
  createRevision,
  compareVersions,
  getDashboardSummary,
  getRecentDocuments,
  getActionItems,
  getMismatchAlerts,
  buildDocSnapshot,
};
