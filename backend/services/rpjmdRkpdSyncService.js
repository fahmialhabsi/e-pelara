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

const SYNC_CAT = Object.freeze({
  READY: "ready",
  DUPLICATE_MAPPED: "duplicate_mapped",
  DUPLICATE_BY_CODE: "duplicate_by_code",
  DUPLICATE_BY_NAME: "duplicate_by_name",
  HIERARCHY_CONFLICT: "hierarchy_conflict",
  OWNERSHIP_CONFLICT: "ownership_conflict",
  LEGACY_SOURCE_UNMAPPED: "legacy_source_unmapped",
  TARGET_PARENT_MISSING: "target_parent_missing",
  TARGET_PARENT_CONFLICT: "target_parent_conflict",
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
    .filter(([, v]) => v > 0 && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));
  return { messages, top_categories };
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
          reason: "Sub RKPD sudah ada dengan master_sub_kegiatan_id yang sama.",
        }),
      };
    }
    const sev = skipDup ? SEVERITY.WARNING : SEVERITY.ERROR;
    const act = skipDup ? ACTION.SKIP : ACTION.FAIL;
    return {
      status: skipDup ? "skipped" : "error",
      classification: buildClassification({
        category: SYNC_CAT.DUPLICATE_BY_CODE,
        severity: sev,
        action: act,
        reason: skipDup
          ? "Sub RKPD ada dengan kode sama tetapi master berbeda — dilewati (skip_duplicates)."
          : "Sub RKPD ada dengan kode sama tetapi master berbeda.",
        code: "sync_dup_sub_rkpd_code",
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
        "Kode sub sudah dipakai baris non-RKPD pada periode yang sama (unique periode+kode). Tidak dapat menambah baris RKPD tanpa konflik skema.",
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

  const subWhere = {
    periode_id: ctx.source.periode_id,
    tahun: ctx.source.tahun,
    jenis_dokumen: { [Op.in]: jenisOrList("rpjmd") },
  };
  if (ctx.filters.sub_kegiatan_ids.length) {
    subWhere.id = { [Op.in]: ctx.filters.sub_kegiatan_ids };
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

async function findSubAnyJenis(ctxTargetPeriode, kodeSub) {
  return SubKegiatan.unscoped().findOne({
    where: {
      periode_id: ctxTargetPeriode,
      kode_sub_kegiatan: String(kodeSub || "").trim(),
    },
  });
}

async function buildPlans(ctx, programs) {
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
        category: SYNC_CAT.LEGACY_SOURCE_UNMAPPED,
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
      if (!ctx.options.allow_create_missing_parents) {
        const cl = buildClassification({
          category: SYNC_CAT.TARGET_PARENT_MISSING,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason:
            "Program RKPD belum ada untuk kode yang sama; allow_create_missing_parents tidak aktif.",
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
        payload: { target_program_id: tgtProg.id },
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
          category: SYNC_CAT.LEGACY_SOURCE_UNMAPPED,
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
        if (!ctx.options.allow_create_missing_parents) {
          const cl = buildClassification({
            category: SYNC_CAT.TARGET_PARENT_MISSING,
            severity: SEVERITY.ERROR,
            action: ACTION.FAIL,
            reason: "Kegiatan RKPD belum ada; allow_create_missing_parents tidak aktif.",
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
            category: SYNC_CAT.LEGACY_SOURCE_UNMAPPED,
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

        if (targetKegiatanId == null && kegAction === "create") {
          /* kegiatan baru — sub mengikuti setelah kegiatan dibuat */
        }

        const existingSlot = await findSubAnyJenis(
          ctx.target.periode_id,
          sub.kode_sub_kegiatan,
        );
        const subCl = classifySubCollision(
          existingSlot,
          sub,
          ctx.options.skip_duplicates,
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
              target_program_ref: targetProgramId,
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
  const programs = await loadSourceTree(ctx);
  const { plans } = await buildPlans(ctx, programs);

  const programMap = new Map();
  const kegiatanMap = new Map();
  const inserted_program_ids = [];
  const inserted_kegiatan_ids = [];
  const inserted_sub_kegiatan_ids = [];
  const details = [];
  const kegiatanTouched = new Set();
  const programsTouched = new Set();

  const summary = {
    inserted_programs: 0,
    inserted_kegiatans: 0,
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

      if (p.entity_type === "program" && p.payload.create) {
        const sp = await Program.unscoped().findByPk(p.payload.source_program_id, {
          transaction: t,
        });
        if (!sp) {
          summary.failed += 1;
          continue;
        }
        const np = await Program.unscoped().create(
          {
            sasaran_id: sp.sasaran_id,
            periode_id: ctx.target.periode_id,
            nama_program: sp.nama_program,
            kode_program: sp.kode_program,
            locked_pagu: sp.locked_pagu || false,
            pagu_anggaran: sp.pagu_anggaran ?? 0,
            total_pagu_anggaran: sp.total_pagu_anggaran ?? 0,
            rpjmd_id: sp.rpjmd_id,
            prioritas: sp.prioritas,
            opd_penanggung_jawab: sp.opd_penanggung_jawab,
            bidang_opd_penanggung_jawab: sp.bidang_opd_penanggung_jawab,
            jenis_dokumen: ctx.target.jenis_dokumen,
            tahun: ctx.target.tahun,
            master_program_id: sp.master_program_id,
            regulasi_versi_id: sp.regulasi_versi_id,
            input_mode: sp.input_mode,
            migrated_by: userId || null,
          },
          { transaction: t },
        );
        programMap.set(sp.id, np.id);
        inserted_program_ids.push(np.id);
        summary.inserted_programs += 1;
        programsTouched.add(np.id);
        details.push({ entity: "program", source_id: sp.id, inserted_id: np.id });
        continue;
      }

      if (p.entity_type === "kegiatan" && p.payload.create) {
        const sk = await Kegiatan.unscoped().findByPk(p.payload.source_kegiatan_id, {
          transaction: t,
        });
        if (!sk) {
          summary.failed += 1;
          continue;
        }
        let tProgId = p.payload.target_program_id;
        if (tProgId == null) {
          tProgId = programMap.get(p.payload.source_program_id);
        }
        if (!tProgId) {
          summary.failed += 1;
          continue;
        }
        const nk = await Kegiatan.unscoped().create(
          {
            program_id: tProgId,
            periode_id: ctx.target.periode_id,
            kode_kegiatan: sk.kode_kegiatan,
            nama_kegiatan: sk.nama_kegiatan,
            pagu_anggaran: sk.pagu_anggaran ?? 0,
            total_pagu_anggaran: sk.total_pagu_anggaran ?? 0,
            jenis_dokumen: ctx.target.jenis_dokumen,
            tahun: ctx.target.tahun,
            opd_penanggung_jawab: sk.opd_penanggung_jawab,
            bidang_opd_penanggung_jawab: sk.bidang_opd_penanggung_jawab,
            master_kegiatan_id: sk.master_kegiatan_id,
            regulasi_versi_id: sk.regulasi_versi_id,
            input_mode: sk.input_mode,
            migrated_by: userId || null,
          },
          { transaction: t },
        );
        kegiatanMap.set(sk.id, nk.id);
        inserted_kegiatan_ids.push(nk.id);
        summary.inserted_kegiatans += 1;
        kegiatanTouched.add(nk.id);
        programsTouched.add(tProgId);
        details.push({ entity: "kegiatan", source_id: sk.id, inserted_id: nk.id });
        continue;
      }

      if (p.entity_type === "sub_kegiatan") {
        const sub = await SubKegiatan.unscoped().findByPk(p.payload.source_sub_id, {
          transaction: t,
        });
        if (!sub) {
          summary.failed += 1;
          continue;
        }
        let tKegId = p.payload.target_kegiatan_id;
        if (tKegId == null) {
          tKegId = kegiatanMap.get(p.payload.source_kegiatan_id);
        }
        if (!tKegId) {
          summary.failed += 1;
          continue;
        }
        const ns = await SubKegiatan.unscoped().create(
          {
            kegiatan_id: tKegId,
            periode_id: ctx.target.periode_id,
            kode_sub_kegiatan: sub.kode_sub_kegiatan,
            nama_sub_kegiatan: sub.nama_sub_kegiatan,
            pagu_anggaran: sub.pagu_anggaran ?? 0,
            total_pagu_anggaran: sub.total_pagu_anggaran ?? 0,
            nama_opd: sub.nama_opd,
            nama_bidang_opd: sub.nama_bidang_opd,
            sub_bidang_opd: sub.sub_bidang_opd,
            jenis_dokumen: ctx.target.jenis_dokumen,
            tahun: ctx.target.tahun,
            master_sub_kegiatan_id: sub.master_sub_kegiatan_id,
            regulasi_versi_id: sub.regulasi_versi_id,
            input_mode: sub.input_mode,
            migrated_by: userId || null,
          },
          { transaction: t },
        );
        inserted_sub_kegiatan_ids.push(ns.id);
        summary.inserted_sub_kegiatans += 1;
        kegiatanTouched.add(tKegId);
        const progId = await Kegiatan.unscoped()
          .findByPk(tKegId, { attributes: ["program_id"], transaction: t })
          .then((r) => r?.program_id);
        if (progId) programsTouched.add(progId);
        details.push({
          entity: "sub_kegiatan",
          source_id: sub.id,
          inserted_id: ns.id,
        });
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  for (const kid of kegiatanTouched) {
    await recalcKegiatanTotal(kid);
  }
  for (const pid of programsTouched) {
    await recalcProgramTotal(pid);
  }

  return {
    ok: true,
    data: {
      summary,
      classification_counts: pre.data.classification_counts,
      inserted_ids: {
        program_ids: inserted_program_ids,
        kegiatan_ids: inserted_kegiatan_ids,
        sub_kegiatan_ids: inserted_sub_kegiatan_ids,
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
};
