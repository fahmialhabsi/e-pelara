"use strict";

/**
 * Sync RPJMD → RKPD (safe mode): preview read-only, commit dengan preflight + transaksi.
 * Tidak meng-overwrite baris RKPD existing; hanya insert bila slot unik memungkinkan.
 *
 * Catatan skema: unique sub_kegiatan pada (periode_id, kode_sub_kegiatan) tanpa jenis_dokumen.
 * Jika source dan target memakai periode_id yang sama, sub RPJMD sudah memakai slot kode
 * sehingga insert RKPD dengan kode sama akan ditolak (cross_document_sub_slot).
 */

const { Op } = require("sequelize");
const {
  sequelize,
  Program,
  Kegiatan,
  SubKegiatan,
  Rkpd,
  PeriodeRpjmd,
} = require("../models");
const {
  buildClassification,
  SEVERITY,
  ACTION,
} = require("./rpjmdBulkFromMasterClassification");
const {
  recalcKegiatanTotal,
  recalcProgramTotal,
} = require("../utils/paguHelper");

let RKPD_COLUMN_SET_CACHE = null;
async function getRkpdColumnSet() {
  if (RKPD_COLUMN_SET_CACHE) return RKPD_COLUMN_SET_CACHE;
  try {
    const tableInfo = await sequelize.getQueryInterface().describeTable("rkpd");
    RKPD_COLUMN_SET_CACHE = new Set(Object.keys(tableInfo || {}));
  } catch {
    RKPD_COLUMN_SET_CACHE = new Set();
  }
  return RKPD_COLUMN_SET_CACHE;
}

function pickKeys(obj, keySet) {
  const out = {};
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (keySet.has(k)) out[k] = v;
  }
  return out;
}

async function buildRkpdPeriodeWhere(targetPeriodeId) {
  const cols = await getRkpdColumnSet();
  const clauses = [];
  if (cols.has("periode_id")) clauses.push({ periode_id: targetPeriodeId });
  if (cols.has("periode_rpjmd_id")) clauses.push({ periode_rpjmd_id: targetPeriodeId });
  if (clauses.length === 1) return clauses[0];
  if (clauses.length > 1) return { [Op.or]: clauses };
  return {};
}

const SYNC_CAT = Object.freeze({
  READY: "ready",
  DUPLICATE_MAPPED: "duplicate_mapped",
  DUPLICATE_BY_CODE: "duplicate_by_code",
  DUPLICATE_BY_NAME: "duplicate_by_name",
  HIERARCHY_CONFLICT: "hierarchy_conflict",
  OWNERSHIP_CONFLICT: "ownership_conflict",
  SOURCE_UNMAPPED: "source_unmapped",
  TARGET_PARENT_MISSING: "target_parent_missing",
  TARGET_PARENT_CONFLICT: "target_parent_conflict",
  CROSS_DOCUMENT_PROGRAM_SLOT: "cross_document_program_slot",
  CROSS_DOCUMENT_SUB_SLOT: "cross_document_sub_slot",
  FATAL_VALIDATION_ERROR: "fatal_validation_error",
});

const SYNC_COUNT_KEYS = Object.freeze(Object.values(SYNC_CAT));

function emptySyncClassificationCounts() {
  const o = {};
  for (const k of SYNC_COUNT_KEYS) o[k] = 0;
  return o;
}

function normJenisDoc(s) {
  return String(s || "").trim().toLowerCase();
}

function jenisOrList(j) {
  const n = normJenisDoc(j);
  if (n === "rpjmd") return [n, "RPJMD"];
  if (n === "rkpd") return [n, "RKPD"];
  return [n];
}

function summarizeCommitBlockedReasons(data) {
  const summary = data?.summary || {};
  const cc = data?.classification_counts || {};
  const messages = [];
  if (summary.fatal_row_count > 0) {
    messages.push(`${summary.fatal_row_count} baris validasi fatal`);
  }
  if (summary.error_row_count > 0) {
    messages.push(`${summary.error_row_count} baris error`);
  }
  const top_categories = Object.entries(cc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({
      category,
      label: syncCategoryLabel(category),
      next_action: syncNextAction(category),
      count,
    }));
  return { messages, top_categories };
}

function syncCategoryLabel(category) {
  const m = {
    ready: "Siap diproses",
    duplicate_mapped: "Duplikat yang sudah termapping",
    duplicate_by_code: "Kode yang sama sudah ada di target",
    duplicate_by_name: "Nama serupa sudah ada di target",
    hierarchy_conflict: "Struktur parent-child tidak sesuai",
    ownership_conflict: "Konteks OPD tidak sesuai",
    source_unmapped: "Data sumber belum terhubung ke master",
    target_parent_missing: "Parent tujuan belum tersedia",
    target_parent_conflict: "Parent tujuan bertentangan dengan mapping sumber",
    cross_document_program_slot:
      "Slot program lintas dokumen sudah dipakai",
    cross_document_sub_slot: "Slot sub kegiatan lintas dokumen sudah dipakai",
    fatal_validation_error: "Validasi fatal",
  };
  return m[category] || category;
}

function syncNextAction(category) {
  const m = {
    source_unmapped:
      "Lakukan auto mapping/backfill terlebih dahulu, lalu jalankan preview ulang.",
    target_parent_missing:
      "Aktifkan opsi pembuatan parent tujuan atau buat parent tujuan secara manual.",
    target_parent_conflict:
      "Periksa kesesuaian parent tujuan dan mapping master sebelum commit.",
    hierarchy_conflict:
      "Periksa struktur parent sumber dan target agar berada pada cabang yang sama.",
    ownership_conflict:
      "Periksa filter OPD dan nonaktifkan validasi OPD ketat bila tidak diperlukan.",
    duplicate_by_name:
      "Periksa data target yang memiliki nama serupa, lalu putuskan apakah perlu merge manual.",
    duplicate_by_code:
      "Periksa data target dengan kode yang sama, lalu hindari insert ganda.",
    cross_document_program_slot:
      "Gunakan periode target berbeda atau rapikan kode program lintas dokumen.",
    cross_document_sub_slot:
      "Gunakan periode target berbeda atau rapikan kode/nama sub lintas dokumen.",
    fatal_validation_error:
      "Selesaikan validasi fatal pada preview sebelum commit.",
  };
  return m[category] || "Tinjau detail preview sebelum melanjutkan commit.";
}

function parsePositiveInt(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function assertProgramOpdStrict(program, opdId) {
  if (opdId == null) return { ok: true };
  const raw = program?.opd_penanggung_jawab;
  if (raw == null) return { ok: true };
  if (Number(raw) !== Number(opdId)) {
    return {
      ok: false,
      classification: buildClassification({
        category: SYNC_CAT.OWNERSHIP_CONFLICT,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "OPD penanggung jawab program sumber tidak sama dengan opd_penanggung_jawab_id yang divalidasi.",
        code: "sync_program_opd_mismatch",
      }),
    };
  }
  return { ok: true };
}

function assertKegiatanOpdStrict(keg, opdId) {
  if (opdId == null) return { ok: true };
  const raw = keg?.opd_penanggung_jawab;
  if (raw == null || String(raw).trim() === "") return { ok: true };
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return { ok: true };
  if (n !== Number(opdId)) {
    return {
      ok: false,
      classification: buildClassification({
        category: SYNC_CAT.OWNERSHIP_CONFLICT,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "OPD pada kegiatan sumber tidak sama dengan opd_penanggung_jawab_id yang divalidasi.",
        code: "sync_kegiatan_opd_mismatch",
      }),
    };
  }
  return { ok: true };
}

/**
 * @param {object|null} existing — baris sub_kegiatan apa pun jenis
 * @param {object} srcSub
 * @param {boolean} skipDup
 */
function classifySubCollision(existing, srcSub, skipDup, matchField = "kode") {
  if (!existing) {
    return {
      status: "would_import",
      classification: buildClassification({
        category: SYNC_CAT.READY,
        severity: SEVERITY.INFO,
        action: ACTION.INSERT,
        reason: "Slot sub tersedia untuk RKPD.",
      }),
    };
  }
  const ej = normJenisDoc(existing.jenis_dokumen);
  const sm = existing.master_sub_kegiatan_id;
  const tm = srcSub.master_sub_kegiatan_id;
  const mapped =
    sm != null && tm != null && Number(sm) === Number(tm);

  if (ej === "rkpd") {
    if (mapped) {
      return {
        status: "skipped",
        classification: buildClassification({
          category: SYNC_CAT.DUPLICATE_MAPPED,
          severity: SEVERITY.WARNING,
          action: ACTION.SKIP,
          reason:
            matchField === "nama"
              ? "Sub RKPD sudah ada (nama sama) dengan master_sub_kegiatan_id yang sama."
              : "Sub RKPD sudah ada dengan master_sub_kegiatan_id yang sama.",
        }),
      };
    }
    const sev = skipDup ? SEVERITY.WARNING : SEVERITY.ERROR;
    const act = skipDup ? ACTION.SKIP : ACTION.FAIL;
    const cat =
      matchField === "nama"
        ? SYNC_CAT.DUPLICATE_BY_NAME
        : SYNC_CAT.DUPLICATE_BY_CODE;
    return {
      status: skipDup ? "skipped" : "error",
      classification: buildClassification({
        category: cat,
        severity: sev,
        action: act,
        reason: skipDup
          ? `Sub RKPD ada (${matchField} bentrok) tetapi master berbeda — dilewati (skip_duplicates).`
          : `Sub RKPD ada (${matchField} bentrok) tetapi master berbeda.`,
        code:
          matchField === "nama"
            ? "sync_dup_sub_rkpd_nama"
            : "sync_dup_sub_rkpd_code",
      }),
    };
  }

  return {
    status: "error",
    classification: buildClassification({
      category: SYNC_CAT.CROSS_DOCUMENT_SUB_SLOT,
      severity: SEVERITY.ERROR,
      action: ACTION.FAIL,
      reason:
        matchField === "nama"
          ? "Nama sub kegiatan target sudah dipakai dokumen non-RKPD pada periode yang sama."
          : "Kode sub kegiatan target sudah dipakai dokumen non-RKPD pada periode yang sama.",
      code: "sync_sub_slot_occupied",
    }),
  };
}

function validateAndBuildContext(body) {
  const src = body?.source || {};
  const tgt = body?.target || {};
  const filters = body?.filters || {};
  const options = {
    skip_duplicates: body?.options?.skip_duplicates !== false,
    strict_parent_mapping: body?.options?.strict_parent_mapping !== false,
    strict_opd_validation: body?.options?.strict_opd_validation === true,
    allow_create_missing_parents:
      body?.options?.allow_create_missing_parents === true,
  };

  const sp = parsePositiveInt(src.periode_id);
  const st = parsePositiveInt(src.tahun);
  const tp = parsePositiveInt(tgt.periode_id);
  const tt = parsePositiveInt(tgt.tahun);
  const sj = normJenisDoc(src.jenis_dokumen || "rpjmd");
  const tj = normJenisDoc(tgt.jenis_dokumen || "rkpd");

  if (!sp || !st || !tp || !tt) {
    return { ok: false, error: "source/target wajib memuat periode_id dan tahun positif." };
  }
  if (sj !== "rpjmd") {
    return { ok: false, error: "source.jenis_dokumen harus rpjmd." };
  }
  if (tj !== "rkpd") {
    return { ok: false, error: "target.jenis_dokumen harus rkpd." };
  }

  const opd_penanggung_jawab_id = parsePositiveInt(
    body.opd_penanggung_jawab_id ?? body.validate_opd_id,
  );

  const filterProgramIds = Array.isArray(filters.program_ids)
    ? filters.program_ids.map((x) => parseInt(x, 10)).filter((n) => n >= 1)
    : [];
  const filterKegiatanIds = Array.isArray(filters.kegiatan_ids)
    ? filters.kegiatan_ids.map((x) => parseInt(x, 10)).filter((n) => n >= 1)
    : [];
  const filterSubIds = Array.isArray(filters.sub_kegiatan_ids)
    ? filters.sub_kegiatan_ids.map((x) => parseInt(x, 10)).filter((n) => n >= 1)
    : [];
  const filterMasterProgramIds = Array.isArray(filters.master_program_ids)
    ? filters.master_program_ids.map((x) => parseInt(x, 10)).filter((n) => n >= 1)
    : [];
  const filterMasterKegiatanIds = Array.isArray(filters.master_kegiatan_ids)
    ? filters.master_kegiatan_ids.map((x) => parseInt(x, 10)).filter((n) => n >= 1)
    : [];
  const filterMasterSubKegiatanIds = Array.isArray(filters.master_sub_kegiatan_ids)
    ? filters.master_sub_kegiatan_ids.map((x) => parseInt(x, 10)).filter((n) => n >= 1)
    : [];

  return {
    ok: true,
    ctx: {
      source: { periode_id: sp, tahun: st, jenis_dokumen: sj },
      target: { periode_id: tp, tahun: tt, jenis_dokumen: tj },
      filters: {
        program_ids: filterProgramIds,
        kegiatan_ids: filterKegiatanIds,
        sub_kegiatan_ids: filterSubIds,
        master_program_ids: filterMasterProgramIds,
        master_kegiatan_ids: filterMasterKegiatanIds,
        master_sub_kegiatan_ids: filterMasterSubKegiatanIds,
      },
      options,
      opd_penanggung_jawab_id: opd_penanggung_jawab_id || null,
    },
  };
}

async function assertPeriodesExist(ctx) {
  const [ps, pt] = await Promise.all([
    PeriodeRpjmd.findByPk(ctx.source.periode_id, { attributes: ["id"] }),
    PeriodeRpjmd.findByPk(ctx.target.periode_id, { attributes: ["id"] }),
  ]);
  if (!ps) return { ok: false, error: "source.periode_id tidak ditemukan." };
  if (!pt) return { ok: false, error: "target.periode_id tidak ditemukan." };
  return { ok: true };
}

async function loadSourceTree(ctx) {
  const progWhere = {
    periode_id: ctx.source.periode_id,
    tahun: ctx.source.tahun,
    jenis_dokumen: { [Op.in]: jenisOrList("rpjmd") },
  };
  if (ctx.filters.program_ids.length) {
    progWhere.id = { [Op.in]: ctx.filters.program_ids };
  }
  if (ctx.filters.master_program_ids.length) {
    progWhere.master_program_id = { [Op.in]: ctx.filters.master_program_ids };
  }

  const kegWhere = {
    periode_id: ctx.source.periode_id,
    tahun: ctx.source.tahun,
    jenis_dokumen: { [Op.in]: jenisOrList("rpjmd") },
  };
  if (ctx.filters.kegiatan_ids.length) {
    kegWhere.id = { [Op.in]: ctx.filters.kegiatan_ids };
  }
  if (ctx.filters.master_kegiatan_ids?.length) {
    kegWhere.master_kegiatan_id = { [Op.in]: ctx.filters.master_kegiatan_ids };
  }

  const subWhere = {
    periode_id: ctx.source.periode_id,
    tahun: ctx.source.tahun,
    jenis_dokumen: { [Op.in]: jenisOrList("rpjmd") },
  };
  if (ctx.filters.sub_kegiatan_ids.length) {
    subWhere.id = { [Op.in]: ctx.filters.sub_kegiatan_ids };
  }
  if (ctx.filters.master_sub_kegiatan_ids?.length) {
    subWhere.master_sub_kegiatan_id = {
      [Op.in]: ctx.filters.master_sub_kegiatan_ids,
    };
  }

  return Program.unscoped().findAll({
    where: progWhere,
    include: [
      {
        model: Kegiatan.unscoped(),
        as: "kegiatan",
        required: false,
        where: kegWhere,
        include: [
          {
            model: SubKegiatan.unscoped(),
            as: "sub_kegiatan",
            required: false,
            where: subWhere,
          },
        ],
      },
    ],
    order: [["id", "ASC"]],
  });
}

async function findTargetProgram(ctx, srcProg) {
  return Program.unscoped().findOne({
    where: {
      periode_id: ctx.target.periode_id,
      tahun: ctx.target.tahun,
      jenis_dokumen: { [Op.in]: jenisOrList("rkpd") },
      kode_program: srcProg.kode_program,
    },
  });
}

async function findTargetProgramByName(ctx, srcProg) {
  return Program.unscoped().findOne({
    where: {
      periode_id: ctx.target.periode_id,
      tahun: ctx.target.tahun,
      jenis_dokumen: { [Op.in]: jenisOrList("rkpd") },
      nama_program: srcProg.nama_program,
    },
  });
}

async function findProgramAnyJenisByCode(ctx, kodeProgram) {
  return Program.unscoped().findOne({
    where: {
      periode_id: ctx.target.periode_id,
      kode_program: String(kodeProgram || "").trim(),
    },
    order: [["id", "ASC"]],
  });
}

async function findProgramAnyJenisByName(ctx, namaProgram) {
  return Program.unscoped().findOne({
    where: {
      periode_id: ctx.target.periode_id,
      nama_program: String(namaProgram || "").trim(),
    },
    order: [["id", "ASC"]],
  });
}

async function findTargetKegiatan(ctx, targetProgramId, srcKeg) {
  return Kegiatan.unscoped().findOne({
    where: {
      program_id: targetProgramId,
      periode_id: ctx.target.periode_id,
      tahun: ctx.target.tahun,
      jenis_dokumen: { [Op.in]: jenisOrList("rkpd") },
      kode_kegiatan: srcKeg.kode_kegiatan,
    },
  });
}

async function findTargetKegiatanByName(ctx, targetProgramId, srcKeg) {
  const where = {
    periode_id: ctx.target.periode_id,
    tahun: ctx.target.tahun,
    jenis_dokumen: { [Op.in]: jenisOrList("rkpd") },
    nama_kegiatan: srcKeg.nama_kegiatan,
  };
  if (targetProgramId != null) where.program_id = targetProgramId;
  return Kegiatan.unscoped().findOne({ where, order: [["id", "ASC"]] });
}

async function findTargetKegiatanByNameAnyProgram(ctx, srcKeg) {
  return Kegiatan.unscoped().findOne({
    where: {
      periode_id: ctx.target.periode_id,
      tahun: ctx.target.tahun,
      jenis_dokumen: { [Op.in]: jenisOrList("rkpd") },
      nama_kegiatan: srcKeg.nama_kegiatan,
    },
    order: [["id", "ASC"]],
  });
}

async function findSubAnyJenis(ctxTargetPeriode, kodeSub) {
  return SubKegiatan.unscoped().findOne({
    where: {
      periode_id: ctxTargetPeriode,
      kode_sub_kegiatan: String(kodeSub || "").trim(),
    },
  });
}

async function buildPlans(ctx, programs) {
  // Patch governance: RKPD adalah dokumen tahunan (tabel `rkpd`), bukan salinan struktur
  // program/kegiatan/sub_kegiatan ke jenis_dokumen RKPD. Implementasi lama disisakan
  // untuk referensi, tetapi tidak lagi dipakai.
  return buildPlansRkpdRows(ctx, programs);

  const plans = [];
  const warnings = [];
  const errors = [];

  const pushPlan = (p) => {
    plans.push(p);
    const cat = p.classification?.category || SYNC_CAT.FATAL_VALIDATION_ERROR;
    if (p.status === "skipped" && p.classification?.severity === SEVERITY.WARNING) {
      if (warnings.length < 40) warnings.push(p);
    }
    if (p.status === "error" || p.classification?.severity === SEVERITY.ERROR) {
      if (errors.length < 40) errors.push(p);
    }
  };

  for (const sp of programs) {
    if (ctx.options.strict_parent_mapping && sp.master_program_id == null) {
      const cl = buildClassification({
        category: SYNC_CAT.SOURCE_UNMAPPED,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "Program RPJMD belum memiliki master_program_id — strict_parent_mapping aktif.",
        code: "sync_program_master_missing",
      });
      pushPlan({
        entity_type: "program",
        source_id: sp.id,
        status: "error",
        classification: cl,
        reason: cl.reason,
        sample: { program_id: sp.id, kode_program: sp.kode_program },
      });
      continue;
    }

    if (ctx.options.strict_opd_validation) {
      const op = assertProgramOpdStrict(sp, ctx.opd_penanggung_jawab_id);
      if (!op.ok) {
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status: "error",
          classification: op.classification,
          reason: op.classification.reason,
          sample: { program_id: sp.id },
        });
        continue;
      }
    }

    let tgtProg = await findTargetProgram(ctx, sp);
    let programAction = "use_existing";
    if (!tgtProg) {
      const anyByCode = await findProgramAnyJenisByCode(ctx, sp.kode_program);
      if (anyByCode && normJenisDoc(anyByCode.jenis_dokumen) !== "rkpd") {
        const cl = buildClassification({
          category: SYNC_CAT.CROSS_DOCUMENT_PROGRAM_SLOT,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason:
            "Kode program target sudah dipakai dokumen non-RKPD pada periode yang sama.",
          code: "sync_program_slot_code_occupied",
        });
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status: "error",
          classification: cl,
          reason: cl.reason,
          sample: {
            program_id: sp.id,
            occupied_program_id: anyByCode.id,
            occupied_jenis_dokumen: anyByCode.jenis_dokumen,
          },
        });
        continue;
      }

      const rkpdByName = await findTargetProgramByName(ctx, sp);
      if (rkpdByName) {
        const sameMaster =
          rkpdByName.master_program_id != null &&
          sp.master_program_id != null &&
          Number(rkpdByName.master_program_id) === Number(sp.master_program_id);
        const severity = ctx.options.skip_duplicates ? SEVERITY.WARNING : SEVERITY.ERROR;
        const action = ctx.options.skip_duplicates ? ACTION.SKIP : ACTION.FAIL;
        const status = ctx.options.skip_duplicates ? "skipped" : "error";
        const cl = buildClassification({
          category: sameMaster ? SYNC_CAT.DUPLICATE_MAPPED : SYNC_CAT.DUPLICATE_BY_NAME,
          severity,
          action,
          reason: sameMaster
            ? "Nama program serupa sudah ada di target RKPD dengan master yang sama."
            : "Nama program serupa sudah ada di target RKPD, tetapi kodenya berbeda.",
          code: sameMaster
            ? "sync_program_name_duplicate_mapped"
            : "sync_program_name_duplicate_conflict",
        });
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status,
          classification: cl,
          reason: cl.reason,
          sample: { program_id: sp.id, target_program_id: rkpdByName.id },
        });
        continue;
      }

      const anyByName = await findProgramAnyJenisByName(ctx, sp.nama_program);
      if (anyByName && normJenisDoc(anyByName.jenis_dokumen) !== "rkpd") {
        const cl = buildClassification({
          category: SYNC_CAT.CROSS_DOCUMENT_PROGRAM_SLOT,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason:
            "Nama program target sudah dipakai dokumen non-RKPD pada periode yang sama.",
          code: "sync_program_slot_name_occupied",
        });
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status: "error",
          classification: cl,
          reason: cl.reason,
          sample: {
            program_id: sp.id,
            occupied_program_id: anyByName.id,
            occupied_jenis_dokumen: anyByName.jenis_dokumen,
          },
        });
        continue;
      }

      if (!ctx.options.allow_create_missing_parents) {
        const cl = buildClassification({
          category: SYNC_CAT.TARGET_PARENT_MISSING,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason:
            "Program tujuan belum tersedia. Aktifkan opsi 'Buat parent tujuan jika belum ada' atau buat program tujuan terlebih dahulu.",
          code: "sync_target_program_missing",
        });
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status: "error",
          classification: cl,
          reason: cl.reason,
          sample: { program_id: sp.id, kode_program: sp.kode_program },
        });
        continue;
      }
      programAction = "create";
      tgtProg = null;
    } else if (ctx.options.strict_parent_mapping) {
      const a = sp.master_program_id != null ? Number(sp.master_program_id) : null;
      const b =
        tgtProg.master_program_id != null ? Number(tgtProg.master_program_id) : null;
      if (a !== b) {
        const cl = buildClassification({
          category: SYNC_CAT.TARGET_PARENT_CONFLICT,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason:
            "Program RKPD yang ada memiliki master_program_id berbeda dari sumber RPJMD.",
          code: "sync_target_program_master_mismatch",
        });
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status: "error",
          classification: cl,
          reason: cl.reason,
          sample: {
            program_id: sp.id,
            target_program_id: tgtProg.id,
          },
        });
        continue;
      }
    }

    if (programAction === "use_existing") {
      pushPlan({
        entity_type: "program",
        source_id: sp.id,
        status: "skipped",
        classification: buildClassification({
          category: SYNC_CAT.DUPLICATE_MAPPED,
          severity: SEVERITY.INFO,
          action: ACTION.SKIP,
          reason: "Program RKPD sudah ada (kode sama) — gunakan baris existing.",
        }),
        reason: "Program RKPD existing",
        sample: { program_id: sp.id, target_program_id: tgtProg.id },
        payload: {
          target_program_id: tgtProg.id,
          source_program_id: sp.id,
        },
      });
    } else {
      pushPlan({
        entity_type: "program",
        source_id: sp.id,
        status: "would_import",
        classification: buildClassification({
          category: SYNC_CAT.READY,
          severity: SEVERITY.INFO,
          action: ACTION.INSERT,
          reason: "Akan membuat program RKPD dari salinan struktur sumber.",
        }),
        reason: "create program rkpd",
        sample: { program_id: sp.id },
        payload: { source_program_id: sp.id, create: true },
      });
    }

    const targetProgramId =
      programAction === "use_existing" ? tgtProg.id : null;

    const kegiatans = sp.kegiatan || [];
    for (const sk of kegiatans) {
      if (ctx.options.strict_opd_validation) {
        const ok = assertKegiatanOpdStrict(sk, ctx.opd_penanggung_jawab_id);
        if (!ok.ok) {
          pushPlan({
            entity_type: "kegiatan",
            source_id: sk.id,
            status: "error",
            classification: ok.classification,
            reason: ok.classification.reason,
            sample: { kegiatan_id: sk.id },
          });
          continue;
        }
      }

      if (ctx.options.strict_parent_mapping && sk.master_kegiatan_id == null) {
        const cl = buildClassification({
          category: SYNC_CAT.SOURCE_UNMAPPED,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason: "Kegiatan RPJMD belum memiliki master_kegiatan_id.",
          code: "sync_kegiatan_master_missing",
        });
        pushPlan({
          entity_type: "kegiatan",
          source_id: sk.id,
          status: "error",
          classification: cl,
          reason: cl.reason,
          sample: { kegiatan_id: sk.id },
        });
        continue;
      }

      let tgtKeg =
        targetProgramId != null
          ? await findTargetKegiatan(ctx, targetProgramId, sk)
          : null;
      let kegAction = tgtKeg ? "use_existing" : null;

      if (!tgtKeg) {
        const byNameAny = await findTargetKegiatanByNameAnyProgram(ctx, sk);
        if (byNameAny) {
          const sameMaster =
            byNameAny.master_kegiatan_id != null &&
            sk.master_kegiatan_id != null &&
            Number(byNameAny.master_kegiatan_id) === Number(sk.master_kegiatan_id);
          const severity = ctx.options.skip_duplicates ? SEVERITY.WARNING : SEVERITY.ERROR;
          const action = ctx.options.skip_duplicates ? ACTION.SKIP : ACTION.FAIL;
          const status = ctx.options.skip_duplicates ? "skipped" : "error";
          const cl = buildClassification({
            category: sameMaster ? SYNC_CAT.DUPLICATE_MAPPED : SYNC_CAT.DUPLICATE_BY_NAME,
            severity,
            action,
            reason: sameMaster
              ? "Nama kegiatan serupa sudah ada di target RKPD dengan master yang sama."
              : "Nama kegiatan serupa sudah ada di target RKPD, tetapi kodenya berbeda.",
            code: sameMaster
              ? "sync_kegiatan_name_duplicate_mapped"
              : "sync_kegiatan_name_duplicate_conflict",
          });
          pushPlan({
            entity_type: "kegiatan",
            source_id: sk.id,
            status,
            classification: cl,
            reason: cl.reason,
            sample: { kegiatan_id: sk.id, target_kegiatan_id: byNameAny.id },
          });
          continue;
        }

        if (!ctx.options.allow_create_missing_parents) {
          const cl = buildClassification({
            category: SYNC_CAT.TARGET_PARENT_MISSING,
            severity: SEVERITY.ERROR,
            action: ACTION.FAIL,
            reason:
              "Parent tujuan belum tersedia untuk kegiatan. Aktifkan opsi 'Buat parent tujuan jika belum ada' atau lengkapi parent tujuan terlebih dahulu.",
            code: "sync_target_kegiatan_missing",
          });
          pushPlan({
            entity_type: "kegiatan",
            source_id: sk.id,
            status: "error",
            classification: cl,
            reason: cl.reason,
            sample: { kegiatan_id: sk.id, program_id: sp.id },
          });
          continue;
        }
        kegAction = "create";
      } else if (ctx.options.strict_parent_mapping) {
        const a = sk.master_kegiatan_id != null ? Number(sk.master_kegiatan_id) : null;
        const b =
          tgtKeg.master_kegiatan_id != null
            ? Number(tgtKeg.master_kegiatan_id)
            : null;
        if (a !== b) {
          const cl = buildClassification({
            category: SYNC_CAT.HIERARCHY_CONFLICT,
            severity: SEVERITY.ERROR,
            action: ACTION.FAIL,
            reason:
              "Kegiatan RKPD existing memiliki master_kegiatan_id berbeda dari sumber.",
            code: "sync_kegiatan_master_mismatch",
          });
          pushPlan({
            entity_type: "kegiatan",
            source_id: sk.id,
            status: "error",
            classification: cl,
            reason: cl.reason,
            sample: { kegiatan_id: sk.id, target_kegiatan_id: tgtKeg.id },
          });
          continue;
        }
      }

      if (kegAction === "use_existing") {
        pushPlan({
          entity_type: "kegiatan",
          source_id: sk.id,
          status: "skipped",
          classification: buildClassification({
            category: SYNC_CAT.DUPLICATE_MAPPED,
            severity: SEVERITY.INFO,
            action: ACTION.SKIP,
            reason: "Kegiatan RKPD sudah ada.",
          }),
          reason: "Kegiatan RKPD existing",
          sample: {
            kegiatan_id: sk.id,
            target_kegiatan_id: tgtKeg.id,
            target_program_id: targetProgramId,
          },
          payload: {
            target_kegiatan_id: tgtKeg.id,
            target_program_id: targetProgramId,
          },
        });
      } else {
        pushPlan({
          entity_type: "kegiatan",
          source_id: sk.id,
          status: "would_import",
          classification: buildClassification({
            category: SYNC_CAT.READY,
            severity: SEVERITY.INFO,
            action: ACTION.INSERT,
            reason: "Akan membuat kegiatan RKPD.",
          }),
          reason: "create kegiatan rkpd",
          sample: { kegiatan_id: sk.id, source_program_id: sp.id },
          payload: {
            source_kegiatan_id: sk.id,
            source_program_id: sp.id,
            create: true,
            target_program_id: targetProgramId,
          },
        });
      }

      const targetKegiatanId = kegAction === "use_existing" ? tgtKeg.id : null;

      const subs = sk.sub_kegiatan || [];
      for (const sub of subs) {
        if (ctx.options.strict_parent_mapping && sub.master_sub_kegiatan_id == null) {
          const cl = buildClassification({
            category: SYNC_CAT.SOURCE_UNMAPPED,
            severity: SEVERITY.ERROR,
            action: ACTION.FAIL,
            reason: "Sub RPJMD belum memiliki master_sub_kegiatan_id.",
            code: "sync_sub_master_missing",
          });
          pushPlan({
            entity_type: "sub_kegiatan",
            source_id: sub.id,
            status: "error",
            classification: cl,
            reason: cl.reason,
            sample: { sub_kegiatan_id: sub.id },
          });
          continue;
        }

        let existingSlot = await findSubAnyJenis(
          ctx.target.periode_id,
          sub.kode_sub_kegiatan,
        );
        let matchField = "kode";
        if (!existingSlot) {
          const byNama = await SubKegiatan.unscoped().findOne({
            where: {
              periode_id: ctx.target.periode_id,
              nama_sub_kegiatan: sub.nama_sub_kegiatan,
            },
          });
          if (byNama) {
            existingSlot = byNama;
            matchField = "nama";
          }
        }
        const subCl = classifySubCollision(
          existingSlot,
          sub,
          ctx.options.skip_duplicates,
          matchField,
        );

        if (subCl.status === "would_import") {
          pushPlan({
            entity_type: "sub_kegiatan",
            source_id: sub.id,
            status: "would_import",
            classification: subCl.classification,
            reason: subCl.classification.reason,
            sample: {
              sub_kegiatan_id: sub.id,
              kode_sub_kegiatan: sub.kode_sub_kegiatan,
            },
            payload: {
              source_sub_id: sub.id,
              source_kegiatan_id: sk.id,
              source_program_id: sp.id,
              target_kegiatan_id: targetKegiatanId,
              target_program_id: targetProgramId,
              source_kegiatan_create: kegAction === "create",
              source_program_create: programAction === "create",
            },
          });
        } else {
          pushPlan({
            entity_type: "sub_kegiatan",
            source_id: sub.id,
            status: subCl.status,
            classification: subCl.classification,
            reason: subCl.classification.reason,
            sample: {
              sub_kegiatan_id: sub.id,
              existing_id: existingSlot?.id,
            },
          });
        }
      }
    }
  }

  return { plans, warnings, errors };
}

async function buildPlansRkpdRows(ctx, programs) {
  const plans = [];
  const warnings = [];
  const errors = [];

  const pushPlan = (p) => {
    plans.push(p);
    if (p.status === "skipped" && p.classification?.severity === SEVERITY.WARNING) {
      if (warnings.length < 40) warnings.push(p);
    }
    if (p.status === "error" || p.classification?.severity === SEVERITY.ERROR) {
      if (errors.length < 40) errors.push(p);
    }
  };

  const periodeWhere = await buildRkpdPeriodeWhere(ctx.target.periode_id);
  const tgtWhereBase = {
    tahun: ctx.target.tahun,
    ...periodeWhere,
  };

  for (const sp of programs) {
    if (ctx.options.strict_parent_mapping && sp.master_program_id == null) {
      const cl = buildClassification({
        category: SYNC_CAT.SOURCE_UNMAPPED,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "Program RPJMD belum memiliki master_program_id - strict_parent_mapping aktif.",
        code: "sync_program_master_missing",
      });
      pushPlan({
        entity_type: "program",
        source_id: sp.id,
        status: "error",
        classification: cl,
        reason: cl.reason,
        sample: { program_id: sp.id, kode_program: sp.kode_program },
      });
      continue;
    }

    if (ctx.options.strict_opd_validation) {
      const op = assertProgramOpdStrict(sp, ctx.opd_penanggung_jawab_id);
      if (!op.ok) {
        pushPlan({
          entity_type: "program",
          source_id: sp.id,
          status: "error",
          classification: op.classification,
          reason: op.classification.reason,
          sample: { program_id: sp.id },
        });
        continue;
      }
    }

    const kegiatans = sp.kegiatan || [];
    for (const sk of kegiatans) {
      if (ctx.options.strict_opd_validation) {
        const ok = assertKegiatanOpdStrict(sk, ctx.opd_penanggung_jawab_id);
        if (!ok.ok) {
          pushPlan({
            entity_type: "kegiatan",
            source_id: sk.id,
            status: "error",
            classification: ok.classification,
            reason: ok.classification.reason,
            sample: { kegiatan_id: sk.id },
          });
          continue;
        }
      }

      if (ctx.options.strict_parent_mapping && sk.master_kegiatan_id == null) {
        const cl = buildClassification({
          category: SYNC_CAT.SOURCE_UNMAPPED,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason: "Kegiatan RPJMD belum memiliki master_kegiatan_id.",
          code: "sync_kegiatan_master_missing",
        });
        pushPlan({
          entity_type: "kegiatan",
          source_id: sk.id,
          status: "error",
          classification: cl,
          reason: cl.reason,
          sample: { kegiatan_id: sk.id },
        });
        continue;
      }

      const subs = sk.sub_kegiatan || [];
      for (const sub of subs) {
        if (ctx.options.strict_parent_mapping && sub.master_sub_kegiatan_id == null) {
          const cl = buildClassification({
            category: SYNC_CAT.SOURCE_UNMAPPED,
            severity: SEVERITY.ERROR,
            action: ACTION.FAIL,
            reason: "Sub kegiatan RPJMD belum memiliki master_sub_kegiatan_id.",
            code: "sync_sub_master_missing",
          });
          pushPlan({
            entity_type: "sub_kegiatan",
            source_id: sub.id,
            status: "error",
            classification: cl,
            reason: cl.reason,
            sample: { sub_kegiatan_id: sub.id },
          });
          continue;
        }

        // Duplikat RKPD tahunan: existing baris pada tahun target + periode target.
        const existingExact = await Rkpd.unscoped().findOne({
          where: { ...tgtWhereBase, sub_kegiatan_id: sub.id },
          // Hardening: beberapa tenant/DB lama belum memiliki semua kolom RKPD refactor
          // (mis. "indikator"). Hindari SELECT * agar tidak gagal pada kolom yang belum ada.
          attributes: ["id"],
          order: [["id", "ASC"]],
        });
        if (existingExact) {
          const sev = ctx.options.skip_duplicates ? SEVERITY.WARNING : SEVERITY.ERROR;
          const act = ctx.options.skip_duplicates ? ACTION.SKIP : ACTION.FAIL;
          const status = ctx.options.skip_duplicates ? "skipped" : "error";
          const cl = buildClassification({
            category: SYNC_CAT.DUPLICATE_MAPPED,
            severity: sev,
            action: act,
            reason: ctx.options.skip_duplicates
              ? "Baris RKPD untuk sub kegiatan ini sudah ada pada tahun target - dilewati (skip_duplicates)."
              : "Baris RKPD untuk sub kegiatan ini sudah ada pada tahun target.",
            code: "sync_rkpd_row_duplicate",
          });
          pushPlan({
            entity_type: "sub_kegiatan",
            source_id: sub.id,
            status,
            classification: cl,
            reason: cl.reason,
            sample: { sub_kegiatan_id: sub.id, rkpd_id: existingExact.id },
          });
          continue;
        }

        const kodeSub = String(sub.kode_sub_kegiatan || "").trim();
        if (kodeSub) {
          const existingByCode = await Rkpd.unscoped().findOne({
            where: { ...tgtWhereBase, kode_sub_kegiatan: kodeSub },
            attributes: ["id"],
            order: [["id", "ASC"]],
          });
          if (existingByCode) {
            const sev = ctx.options.skip_duplicates ? SEVERITY.WARNING : SEVERITY.ERROR;
            const act = ctx.options.skip_duplicates ? ACTION.SKIP : ACTION.FAIL;
            const status = ctx.options.skip_duplicates ? "skipped" : "error";
            const cl = buildClassification({
              category: SYNC_CAT.DUPLICATE_BY_CODE,
              severity: sev,
              action: act,
              reason: ctx.options.skip_duplicates
                ? "Kode sub kegiatan sudah ada di RKPD tahun target - dilewati (skip_duplicates)."
                : "Kode sub kegiatan sudah ada di RKPD tahun target.",
              code: "sync_rkpd_code_duplicate",
            });
            pushPlan({
              entity_type: "sub_kegiatan",
              source_id: sub.id,
              status,
              classification: cl,
              reason: cl.reason,
              sample: { sub_kegiatan_id: sub.id, rkpd_id: existingByCode.id },
            });
            continue;
          }
        }

        const namaSub = String(sub.nama_sub_kegiatan || "").trim();
        if (namaSub) {
          const existingByName = await Rkpd.unscoped().findOne({
            where: { ...tgtWhereBase, nama_sub_kegiatan: namaSub },
            attributes: ["id"],
            order: [["id", "ASC"]],
          });
          if (existingByName) {
            const sev = ctx.options.skip_duplicates ? SEVERITY.WARNING : SEVERITY.ERROR;
            const act = ctx.options.skip_duplicates ? ACTION.SKIP : ACTION.FAIL;
            const status = ctx.options.skip_duplicates ? "skipped" : "error";
            const cl = buildClassification({
              category: SYNC_CAT.DUPLICATE_BY_NAME,
              severity: sev,
              action: act,
              reason: ctx.options.skip_duplicates
                ? "Nama sub kegiatan serupa sudah ada di RKPD tahun target - dilewati (skip_duplicates)."
                : "Nama sub kegiatan serupa sudah ada di RKPD tahun target.",
              code: "sync_rkpd_name_duplicate",
            });
            pushPlan({
              entity_type: "sub_kegiatan",
              source_id: sub.id,
              status,
              classification: cl,
              reason: cl.reason,
              sample: { sub_kegiatan_id: sub.id, rkpd_id: existingByName.id },
            });
            continue;
          }
        }

        pushPlan({
          entity_type: "sub_kegiatan",
          source_id: sub.id,
          status: "would_import",
          classification: buildClassification({
            category: SYNC_CAT.READY,
            severity: SEVERITY.INFO,
            action: ACTION.INSERT,
            reason:
              "Akan membuat baris RKPD tahunan yang mereferensikan program/kegiatan/sub kegiatan sumber.",
          }),
          reason: "create rkpd row",
          sample: { program_id: sp.id, kegiatan_id: sk.id, sub_kegiatan_id: sub.id },
          payload: {
            rkpd_create: {
              tahun: ctx.target.tahun,
              periode_id: ctx.target.periode_id,
              periode_rpjmd_id: ctx.target.periode_id,
              jenis_dokumen: "rkpd",
              opd_id: ctx.opd_penanggung_jawab_id || sp.opd_penanggung_jawab || null,
              program_id: sp.id,
              kegiatan_id: sk.id,
              sub_kegiatan_id: sub.id,
              kode_program: sp.kode_program,
              nama_program: sp.nama_program,
              kode_kegiatan: sk.kode_kegiatan,
              nama_kegiatan: sk.nama_kegiatan,
              kode_sub_kegiatan: sub.kode_sub_kegiatan,
              nama_sub_kegiatan: sub.nama_sub_kegiatan,
              dibuat_oleh: ctx.actor_user_id || null,
              sinkronisasi_status: "belum_sinkron",
            },
          },
        });
      }
    }
  }

  return { plans, warnings, errors };
}

function aggregateSummary(plans) {
  const classification_counts = emptySyncClassificationCounts();
  let would_program = 0;
  let would_kegiatan = 0;
  let would_sub = 0;
  let skipped = 0;
  let failed = 0;
  let duplicates = 0;
  let fatal_row_count = 0;
  let error_row_count = 0;

  for (const p of plans) {
    const cat = p.classification?.category || SYNC_CAT.FATAL_VALIDATION_ERROR;
    if (classification_counts[cat] != null) classification_counts[cat] += 1;
    else classification_counts[SYNC_CAT.FATAL_VALIDATION_ERROR] += 1;

    const sev = p.classification?.severity;
    if (sev === SEVERITY.FATAL) fatal_row_count += 1;
    if (sev === SEVERITY.ERROR) error_row_count += 1;

    if (p.status === "would_import") {
      if (p.entity_type === "program") would_program += 1;
      else if (p.entity_type === "kegiatan") would_kegiatan += 1;
      else if (p.entity_type === "sub_kegiatan") would_sub += 1;
    } else if (p.status === "skipped") {
      skipped += 1;
      if (
        cat === SYNC_CAT.DUPLICATE_MAPPED ||
        cat === SYNC_CAT.DUPLICATE_BY_CODE ||
        cat === SYNC_CAT.DUPLICATE_BY_NAME
      ) {
        duplicates += 1;
      }
    } else if (p.status === "error") {
      failed += 1;
    }
  }

  const commit_blocked = fatal_row_count > 0 || error_row_count > 0;

  return {
    summary: {
      total_plans: plans.length,
      would_create_programs: would_program,
      would_create_kegiatans: would_kegiatan,
      would_create_sub_kegiatans: would_sub,
      skipped,
      failed,
      duplicates,
      fatal_row_count,
      error_row_count,
      commit_blocked,
    },
    classification_counts,
  };
}

async function runPreview(body) {
  const v = validateAndBuildContext(body);
  if (!v.ok) return { ok: false, error: v.error };

  const peri = await assertPeriodesExist(v.ctx);
  if (!peri.ok) return { ok: false, error: peri.error };

  const programs = await loadSourceTree(v.ctx);
  if (!programs.length) {
    return {
      ok: true,
      data: {
        summary: {
          total_plans: 0,
          would_create_programs: 0,
          would_create_kegiatans: 0,
          would_create_sub_kegiatans: 0,
          skipped: 0,
          failed: 0,
          duplicates: 0,
          fatal_row_count: 0,
          error_row_count: 0,
          commit_blocked: false,
        },
        classification_counts: emptySyncClassificationCounts(),
        plans: [],
        warnings: [],
        errors: [],
        sample: [],
        programs_matched: 0,
      },
    };
  }

  const { plans, warnings, errors } = await buildPlans(v.ctx, programs);
  const { summary, classification_counts } = aggregateSummary(plans);

  const sample = plans.slice(0, 30).map((p) => ({
    entity_type: p.entity_type,
    source_id: p.source_id,
    status: p.status,
    category: p.classification?.category,
    reason: p.reason,
  }));

  return {
    ok: true,
    data: {
      summary,
      classification_counts,
      plans: plans.slice(0, 200),
      warnings,
      errors,
      sample,
      programs_matched: programs.length,
      commit_blocked_detail: summary.commit_blocked
        ? summarizeCommitBlockedReasons({
            summary,
            classification_counts,
          })
        : null,
    },
  };
}

async function runCommit(body, userId) {
  const pre = await runPreview(body);
  if (!pre.ok) {
    return { ok: false, error: pre.error, data: { preflight_failed: true } };
  }
  if (pre.data.summary.commit_blocked) {
    return {
      ok: false,
      error:
        "Commit sync ditolak: preflight masih commit_blocked (ada baris fatal atau error).",
      data: {
        commit_blocked: true,
        summary: pre.data.summary,
        classification_counts: pre.data.classification_counts,
        commit_blocked_reasons: summarizeCommitBlockedReasons(pre.data),
        errors_sample: (pre.data.errors || []).slice(0, 12),
      },
    };
  }

  const v = validateAndBuildContext(body);
  const { ctx } = v;
  ctx.actor_user_id = userId || null;
  const programs = await loadSourceTree(ctx);
  const { plans } = await buildPlans(ctx, programs);

  const inserted_rkpd_ids = [];
  const details = [];

  const summary = {
    inserted_programs: 0,
    inserted_kegiatans: 0,
    // Kompatibilitas response: sebelumnya dihitung sebagai insert sub_kegiatan RKPD.
    // Sekarang dihitung sebagai jumlah baris RKPD (tabel `rkpd`) yang dibuat.
    inserted_sub_kegiatans: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
  };

  const t = await sequelize.transaction();
  try {
    for (const p of plans) {
      if (p.status !== "would_import" || !p.payload) {
        if (p.status === "skipped") {
          summary.skipped += 1;
          if (
            [
              SYNC_CAT.DUPLICATE_MAPPED,
              SYNC_CAT.DUPLICATE_BY_CODE,
              SYNC_CAT.DUPLICATE_BY_NAME,
            ].includes(p.classification?.category)
          ) {
            summary.duplicates += 1;
          }
        } else if (p.status === "error") summary.failed += 1;
        continue;
      }

      if (p.entity_type === "sub_kegiatan" && p.payload?.rkpd_create) {
        const createPayload = p.payload.rkpd_create;
        const subId = createPayload?.sub_kegiatan_id;
        if (!subId) {
          throw new Error("Payload rkpd_create tidak memuat sub_kegiatan_id.");
        }

        // Guard idempotent: jangan overwrite/duplikasi bila sudah ada.
        const periodeWhere = await buildRkpdPeriodeWhere(ctx.target.periode_id);
        const exists = await Rkpd.unscoped().findOne({
          where: {
            tahun: ctx.target.tahun,
            sub_kegiatan_id: subId,
            ...periodeWhere,
          },
          attributes: ["id"],
          transaction: t,
          lock: t.LOCK?.UPDATE,
        });
        if (exists) {
          summary.skipped += 1;
          summary.duplicates += 1;
          details.push({
            entity: "rkpd",
            source_id: subId,
            status: "skipped_already_exists",
            existing_id: exists.id,
          });
          continue;
        }

        const cols = await getRkpdColumnSet();
        const safePayload = pickKeys(createPayload, cols);
        // Minimal guard: selalu wajib ada tahun
        if (!safePayload.tahun) {
          throw new Error("Gagal membuat RKPD: kolom tahun tidak tersedia/invalid.");
        }
        // Pastikan periode terisi pada salah satu kolom yang tersedia
        if (cols.has("periode_id") && safePayload.periode_id == null) {
          safePayload.periode_id = ctx.target.periode_id;
        }
        if (cols.has("periode_rpjmd_id") && safePayload.periode_rpjmd_id == null) {
          safePayload.periode_rpjmd_id = ctx.target.periode_id;
        }
        const row = await Rkpd.unscoped().create(safePayload, { transaction: t });
        inserted_rkpd_ids.push(row.id);
        summary.inserted_sub_kegiatans += 1;
        details.push({
          entity: "rkpd",
          source_id: subId,
          inserted_id: row.id,
          status: "inserted",
        });
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    return {
      ok: false,
      error: err?.message || String(err),
      data: { rolled_back: true, summary },
    };
  }

  return {
    ok: true,
    data: {
      summary,
      classification_counts: pre.data.classification_counts,
      inserted_ids: {
        rkpd_ids: inserted_rkpd_ids,
        // Kompatibilitas lama (agar consumer yang belum diubah tidak error).
        program_ids: [],
        kegiatan_ids: [],
        sub_kegiatan_ids: [],
      },
      details: details.slice(0, 200),
    },
  };
}

module.exports = {
  runPreview,
  runCommit,
  validateAndBuildContext,
  SYNC_CAT,
  emptySyncClassificationCounts,
  summarizeCommitBlockedReasons,
  classifySubCollision,
  syncCategoryLabel,
  syncNextAction,
};
