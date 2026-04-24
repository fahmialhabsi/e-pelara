"use strict";

/**
 * Bulk import sub_kegiatan RPJMD dari baris master (Kepmendagri / dataset_key).
 * - Preview: tidak menulis DB.
 * - Commit: transaction; duplikat di-skip jika skip_duplicates.
 *
 * Hardening: klasifikasi konflik, guard parent/OPD, hint backfill (tanpa auto-apply).
 */

const { Op } = require("sequelize");
const {
  sequelize,
  MasterSubKegiatan,
  MasterKegiatan,
  MasterProgram,
  Kegiatan,
  SubKegiatan,
  Program,
  PeriodeRpjmd,
  OpdPenanggungJawab,
} = require("../models");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const {
  recalcKegiatanTotal,
  recalcProgramTotal,
} = require("../utils/paguHelper");
const {
  CATEGORY,
  SEVERITY,
  ACTION,
  buildClassification,
  classifyDuplicate,
  fatal,
  ready,
} = require("./rpjmdBulkFromMasterClassification");
const { evaluateSubBackfillCandidate } = require("./rpjmdLegacyBackfillHintService");

const DEFAULT_DATASET = "kepmendagri_provinsi_900_2024";

const CLASSIFICATION_COUNT_KEYS = [
  CATEGORY.DUPLICATE_MAPPED,
  CATEGORY.DUPLICATE_BY_CODE,
  CATEGORY.DUPLICATE_BY_NAME,
  CATEGORY.LEGACY_PARENT_CONFLICT,
  CATEGORY.LEGACY_CHILD_CONFLICT,
  CATEGORY.LEGACY_PROGRAM_UNMAPPED,
  CATEGORY.HIERARCHY_CONFLICT,
  CATEGORY.OWNERSHIP_CONFLICT,
  CATEGORY.FATAL_VALIDATION_ERROR,
  CATEGORY.MISSING_KEGIATAN_CONTEXT,
  CATEGORY.READY,
];

function emptyClassificationCounts() {
  const o = {};
  for (const k of CLASSIFICATION_COUNT_KEYS) o[k] = 0;
  return o;
}

function normOpdLabel(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Ringkasan untuk UX / error commit saat preflight blokir.
 */
function summarizeCommitBlockedReasons(data) {
  const summary = data?.summary || {};
  const cc = data?.classification_counts || {};
  const messages = [];
  if (summary.fatal_row_count > 0) {
    messages.push(`${summary.fatal_row_count} baris validasi fatal`);
  }
  if (summary.error_row_count > 0) {
    messages.push(`${summary.error_row_count} baris error (hierarki, OPD, duplikat tanpa skip, dll.)`);
  }
  const top_categories = Object.entries(cc)
    .filter(([k, v]) => v > 0 && k !== CATEGORY.READY)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, count]) => ({ category, count }));
  return { messages, top_categories };
}

/**
 * Kegiatan: kolom opd_penanggung_jawab (STRING). Jika terisi dan numerik,
 * harus sama dengan opd_penanggung_jawab_id konteks. Teks non-numerik tidak dipaksakan.
 */
function assertKegiatanOpdOwnership(keg, ctx) {
  if (ctx.opd_penanggung_jawab_id == null) return { ok: true };
  const raw = keg?.opd_penanggung_jawab;
  if (raw == null || String(raw).trim() === "") return { ok: true };
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return { ok: true };
  const want = Number(ctx.opd_penanggung_jawab_id);
  if (n !== want) {
    return {
      ok: false,
      classification: buildClassification({
        category: CATEGORY.OWNERSHIP_CONFLICT,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "OPD pada kegiatan transaksi (opd_penanggung_jawab) tidak sama dengan opd_penanggung_jawab_id yang divalidasi.",
        code: "kegiatan_opd_mismatch",
      }),
    };
  }
  return { ok: true };
}

/**
 * Sub: hanya nama_opd teks. Jika ada referensi OPD dan default_nama_opd bukan placeholder,
 * nama harus cocok dengan nama_opd atau nama referensi (normalisasi ringan).
 */
function assertSubDefaultsOpd(ctx) {
  if (!ctx.opd_anchor) return { ok: true };
  const d = String(ctx.defaults?.nama_opd || "").trim();
  if (!d || d === "-") return { ok: true };
  const dn = normOpdLabel(d);
  const n1 = normOpdLabel(ctx.opd_anchor.nama_opd);
  const n2 = normOpdLabel(ctx.opd_anchor.nama);
  if (dn !== n1 && dn !== n2) {
    return {
      ok: false,
      classification: buildClassification({
        category: CATEGORY.OWNERSHIP_CONFLICT,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "default_nama_opd tidak selaras dengan nama OPD referensi (nama_opd/nama) untuk opd_penanggung_jawab_id.",
        code: "sub_default_opd_nama_mismatch",
      }),
    };
  }
  return { ok: true };
}

function normJenis(j) {
  return String(j || "rpjmd").trim().toLowerCase();
}

function parsePositiveInt(v) {
  if (v == null || v === "") return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function parseBodyOptions(body) {
  const o = body.options || {};
  return {
    create_missing_kegiatans: Boolean(o.create_missing_kegiatans),
    skip_duplicates: o.skip_duplicates !== false,
    strict_parent_mapping: o.strict_parent_mapping !== false,
    enforce_anchor_context: o.enforce_anchor_context !== false,
  };
}

function parseFilters(body) {
  const f = body.filters || {};
  const toIds = (arr) =>
    Array.isArray(arr)
      ? [...new Set(arr.map((x) => parsePositiveInt(x)).filter(Boolean))]
      : [];
  return {
    master_program_ids: toIds(f.master_program_ids),
    master_kegiatan_ids: toIds(f.master_kegiatan_ids),
    master_sub_kegiatan_ids: toIds(f.master_sub_kegiatan_ids),
  };
}

function assertProgramBulkContext(program, ctx, options) {
  if (!program) {
    return {
      ok: false,
      classification: fatal("Program induk (transaksi) tidak ditemukan."),
    };
  }
  if (program.periode_id !== ctx.periode_id) {
    return {
      ok: false,
      classification: buildClassification({
        category: CATEGORY.HIERARCHY_CONFLICT,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason: "Program tidak berada pada periode_id yang sama dengan permintaan impor.",
        code: "program_periode_mismatch",
      }),
    };
  }
  if (options.enforce_anchor_context !== false) {
    const py =
      program.tahun != null ? parseInt(String(program.tahun), 10) : null;
    if (py != null && py !== ctx.tahun) {
      return {
        ok: false,
        classification: buildClassification({
          category: CATEGORY.HIERARCHY_CONFLICT,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason: "Tahun pada program transaksi tidak cocok dengan tahun impor.",
          code: "program_tahun_mismatch",
        }),
      };
    }
    const jd = normJenis(program.jenis_dokumen);
    if (jd && jd !== ctx.jenis_dokumen) {
      return {
        ok: false,
        classification: buildClassification({
          category: CATEGORY.HIERARCHY_CONFLICT,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason: "jenis_dokumen program transaksi tidak cocok dengan konteks impor.",
          code: "program_jenis_mismatch",
        }),
      };
    }
  }
  if (ctx.opd_penanggung_jawab_id != null) {
    const want = Number(ctx.opd_penanggung_jawab_id);
    const got = program.opd_penanggung_jawab;
    if (got != null && Number(got) !== want) {
      return {
        ok: false,
        classification: buildClassification({
          category: CATEGORY.OWNERSHIP_CONFLICT,
          severity: SEVERITY.ERROR,
          action: ACTION.FAIL,
          reason:
            "OPD penanggung jawab pada program tidak sesuai opd_penanggung_jawab_id yang divalidasi.",
          code: "program_opd_mismatch",
        }),
      };
    }
  }
  return { ok: true };
}

function assertProgramMasterAlignment(program, masterProgramId, strict) {
  if (!strict) return { ok: true };
  if (program.master_program_id == null) {
    return {
      ok: false,
      classification: buildClassification({
        category: CATEGORY.LEGACY_PROGRAM_UNMAPPED,
        severity: SEVERITY.WARNING,
        action: ACTION.SKIP,
        reason:
          "Program transaksi belum memiliki master_program_id — selesaikan mapping program sebelum menempel sub dari master ini.",
        requires_backfill: true,
        code: "program_master_unmapped",
      }),
    };
  }
  if (Number(program.master_program_id) !== Number(masterProgramId)) {
    return {
      ok: false,
      classification: buildClassification({
        category: CATEGORY.HIERARCHY_CONFLICT,
        severity: SEVERITY.ERROR,
        action: ACTION.FAIL,
        reason:
          "master_program_id pada program transaksi tidak sama dengan master program baris impor (salah cabang hierarki).",
        code: "program_master_mismatch",
      }),
    };
  }
  return { ok: true };
}

async function collectMasterSubIds(datasetKey, filters) {
  const ids = new Set();
  const {
    master_program_ids,
    master_kegiatan_ids,
    master_sub_kegiatan_ids,
  } = filters;

  if (
    !master_program_ids.length &&
    !master_kegiatan_ids.length &&
    !master_sub_kegiatan_ids.length
  ) {
    return [];
  }

  const baseWhere = { dataset_key: datasetKey, is_active: true };

  if (master_sub_kegiatan_ids.length) {
    const rows = await MasterSubKegiatan.findAll({
      where: { ...baseWhere, id: { [Op.in]: master_sub_kegiatan_ids } },
      attributes: ["id"],
    });
    rows.forEach((r) => ids.add(r.id));
  }
  if (master_kegiatan_ids.length) {
    const rows = await MasterSubKegiatan.findAll({
      where: {
        ...baseWhere,
        master_kegiatan_id: { [Op.in]: master_kegiatan_ids },
      },
      attributes: ["id"],
    });
    rows.forEach((r) => ids.add(r.id));
  }
  if (master_program_ids.length) {
    const kegs = await MasterKegiatan.findAll({
      where: {
        dataset_key: datasetKey,
        is_active: true,
        master_program_id: { [Op.in]: master_program_ids },
      },
      attributes: ["id"],
    });
    const kid = kegs.map((k) => k.id);
    if (kid.length) {
      const rows = await MasterSubKegiatan.findAll({
        where: { ...baseWhere, master_kegiatan_id: { [Op.in]: kid } },
        attributes: ["id"],
      });
      rows.forEach((r) => ids.add(r.id));
    }
  }
  return [...ids];
}

async function loadSubsWithHierarchy(datasetKey, subIds) {
  if (!subIds.length) return [];
  return MasterSubKegiatan.findAll({
    where: {
      dataset_key: datasetKey,
      is_active: true,
      id: { [Op.in]: subIds },
    },
    include: [
      {
        model: MasterKegiatan,
        as: "masterKegiatan",
        required: true,
        attributes: [
          "id",
          "kode_kegiatan_full",
          "nama_kegiatan",
          "master_program_id",
          "regulasi_versi_id",
        ],
        include: [
          {
            model: MasterProgram,
            as: "masterProgram",
            required: true,
            attributes: [
              "id",
              "kode_program_full",
              "nama_program",
              "regulasi_versi_id",
            ],
          },
        ],
      },
    ],
    order: [["kode_sub_kegiatan_full", "ASC"]],
  });
}

function resolveRegulasiVersiId(ms, mk, mp) {
  const a = parsePositiveInt(ms.regulasi_versi_id);
  if (a) return a;
  const b = parsePositiveInt(mk.regulasi_versi_id);
  if (b) return b;
  const c = parsePositiveInt(mp.regulasi_versi_id);
  if (c) return c;
  return null;
}

/**
 * Duplikat (sama definisi preview & commit):
 * - Sudah ada sub_kegiatan dengan kombinasi (periode_id, tahun, jenis_dokumen, master_sub_kegiatan_id), ATAU
 * - Sudah ada sub_kegiatan di periode yang sama dengan kode_sub_kegiatan sama, ATAU
 * - Sudah ada sub_kegiatan di periode yang sama dengan nama_sub_kegiatan sama.
 */
async function findDuplicateSub(
  { periode_id, tahun, jenis_dokumen },
  { master_sub_id, kode_sub, nama_sub },
  transaction,
) {
  const q = { periode_id, tahun, jenis_dokumen };
  const attrs = [
    "id",
    "kode_sub_kegiatan",
    "nama_sub_kegiatan",
    "master_sub_kegiatan_id",
    "input_mode",
    "kegiatan_id",
  ];
  const byMaster = await SubKegiatan.unscoped().findOne({
    where: { ...q, master_sub_kegiatan_id: master_sub_id },
    transaction,
    attributes: attrs,
  });
  if (byMaster) {
    return { type: "duplicate_master_sub", row: byMaster };
  }
  const byKode = await SubKegiatan.unscoped().findOne({
    where: { periode_id, kode_sub_kegiatan: kode_sub },
    transaction,
    attributes: attrs,
  });
  if (byKode) {
    return { type: "duplicate_kode_per_periode", row: byKode };
  }
  const byNama = await SubKegiatan.unscoped().findOne({
    where: { periode_id, nama_sub_kegiatan: nama_sub },
    transaction,
    attributes: attrs,
  });
  if (byNama) {
    return { type: "duplicate_nama_per_periode", row: byNama };
  }
  return null;
}

async function findTransactionalKegiatan(ctx, masterKegiatanId, transaction) {
  return Kegiatan.unscoped().findOne({
    where: {
      periode_id: ctx.periode_id,
      jenis_dokumen: ctx.jenis_dokumen,
      tahun: ctx.tahun,
      master_kegiatan_id: masterKegiatanId,
    },
    transaction,
  });
}

async function validateAndBuildContext(body) {
  const dataset_key = String(body.dataset_key || DEFAULT_DATASET).trim();
  const periode_id = parsePositiveInt(body.periode_id);
  const tahun = parsePositiveInt(body.tahun);
  const jenis_dokumen = normJenis(body.jenis_dokumen);
  const anchor_program_id = parsePositiveInt(body.anchor_program_id);
  const opd_penanggung_jawab_id =
    parsePositiveInt(body.opd_penanggung_jawab_id) ||
    parsePositiveInt(body.validate_opd_id);

  if (!periode_id) {
    return { ok: false, error: "periode_id wajib" };
  }
  if (!tahun) {
    return { ok: false, error: "tahun wajib" };
  }

  const periodeRow = await PeriodeRpjmd.findByPk(periode_id);
  if (!periodeRow) {
    return { ok: false, error: "periode_id tidak ditemukan" };
  }
  if (tahun < periodeRow.tahun_awal || tahun > periodeRow.tahun_akhir) {
    return { ok: false, error: "tahun di luar rentang periode RPJMD" };
  }

  const periodeFromTahun = await getPeriodeFromTahun(tahun);
  if (!periodeFromTahun || periodeFromTahun.id !== periode_id) {
    return {
      ok: false,
      error: "periode_id tidak konsisten dengan tahun (getPeriodeFromTahun)",
    };
  }

  let opd_anchor = null;
  if (opd_penanggung_jawab_id) {
    const opdRow = await OpdPenanggungJawab.findByPk(opd_penanggung_jawab_id, {
      attributes: ["id", "nama_opd", "nama"],
    });
    if (!opdRow) {
      return {
        ok: false,
        error:
          "opd_penanggung_jawab_id tidak ditemukan pada tabel referensi OPD.",
      };
    }
    opd_anchor = {
      id: opdRow.id,
      nama_opd: opdRow.nama_opd,
      nama: opdRow.nama,
    };
  }

  const filters = parseFilters(body);
  const subIds = await collectMasterSubIds(dataset_key, filters);
  if (!subIds.length) {
    return {
      ok: false,
      error:
        "Tidak ada baris master yang cocok. Isi minimal salah satu filter (program / kegiatan / sub master).",
    };
  }

  const options = parseBodyOptions(body);
  if (options.create_missing_kegiatans && !anchor_program_id) {
    return {
      ok: false,
      error:
        "create_missing_kegiatans memerlukan anchor_program_id (program transaksi induk).",
    };
  }

  if (anchor_program_id) {
    const program = await Program.unscoped().findByPk(anchor_program_id, {
      attributes: [
        "id",
        "periode_id",
        "tahun",
        "jenis_dokumen",
        "opd_penanggung_jawab",
        "master_program_id",
      ],
    });
    const ctxProbe = { periode_id, tahun, jenis_dokumen, opd_penanggung_jawab_id };
    const chk = assertProgramBulkContext(program, ctxProbe, options);
    if (!chk.ok) {
      return { ok: false, error: chk.classification.reason };
    }
  }

  const default_nama_opd = String(body.default_nama_opd || "").trim() || "-";
  const default_nama_bidang_opd =
    String(body.default_nama_bidang_opd || "").trim() || "-";
  const default_sub_bidang_opd =
    String(body.default_sub_bidang_opd || "").trim() || "-";

  return {
    ok: true,
    ctx: {
      dataset_key,
      periode_id,
      tahun,
      jenis_dokumen,
      anchor_program_id,
      opd_penanggung_jawab_id,
      opd_anchor,
      options,
      filters,
      subIds,
      defaults: {
        nama_opd: default_nama_opd,
        nama_bidang_opd: default_nama_bidang_opd,
        sub_bidang_opd: default_sub_bidang_opd,
      },
    },
  };
}

async function validateKegiatanProgramChain(keg, mp, ctx, transaction) {
  const program = await Program.unscoped().findByPk(keg.program_id, {
    transaction,
    attributes: [
      "id",
      "master_program_id",
      "periode_id",
      "tahun",
      "jenis_dokumen",
      "opd_penanggung_jawab",
    ],
  });
  const bulk = assertProgramBulkContext(program, ctx, ctx.options);
  if (!bulk.ok) return { err: bulk.classification };
  const align = assertProgramMasterAlignment(
    program,
    mp.id,
    ctx.options.strict_parent_mapping,
  );
  if (!align.ok) {
    if (align.classification.category === CATEGORY.LEGACY_PROGRAM_UNMAPPED) {
      return { skip: align.classification };
    }
    return { err: align.classification };
  }
  const opdK = assertKegiatanOpdOwnership(keg, ctx);
  if (!opdK.ok) return { err: opdK.classification };
  return { ok: true };
}

/**
 * @returns {Promise<object>}
 */
async function resolveKegiatanForRow(msRow, ctx, transaction) {
  const mk = msRow.masterKegiatan;
  const mp = mk.masterProgram;
  const sample = {
    master_sub_kegiatan_id: msRow.id,
    master_kegiatan_id: mk.id,
    master_program_id: mp.id,
    kode_sub_kegiatan: String(msRow.kode_sub_kegiatan_full || "").trim(),
    nama_sub_kegiatan: String(msRow.nama_sub_kegiatan || "").trim(),
    kode_kegiatan_master: String(mk.kode_kegiatan_full || "").trim(),
  };

  let keg = await findTransactionalKegiatan(ctx, mk.id, transaction);
  if (keg) {
    const chain = await validateKegiatanProgramChain(keg, mp, ctx, transaction);
    if (chain.err) {
      return {
        keg: null,
        preview_will_create_kegiatan: false,
        committed_new_kegiatan: false,
        err: { classification: chain.err, sample },
        skip: null,
      };
    }
    if (chain.skip) {
      return {
        keg: null,
        preview_will_create_kegiatan: false,
        committed_new_kegiatan: false,
        err: null,
        skip: { classification: chain.skip, sample },
      };
    }
    return {
      keg,
      preview_will_create_kegiatan: false,
      committed_new_kegiatan: false,
      err: null,
      skip: null,
      sample,
    };
  }

  if (!ctx.options.create_missing_kegiatans || !ctx.anchor_program_id) {
    return {
      keg: null,
      preview_will_create_kegiatan: false,
      committed_new_kegiatan: false,
      err: null,
      skip: {
        classification: buildClassification({
          category: CATEGORY.MISSING_KEGIATAN_CONTEXT,
          severity: SEVERITY.WARNING,
          action: ACTION.SKIP,
          reason:
            "Tidak ada kegiatan transaksi dengan master_kegiatan_id ini; aktifkan create_missing_kegiatans + anchor_program_id atau buat kegiatan dulu.",
          requires_backfill: false,
        }),
        sample,
      },
    };
  }

  const program = await Program.unscoped().findByPk(ctx.anchor_program_id, {
    transaction,
    attributes: [
      "id",
      "periode_id",
      "tahun",
      "jenis_dokumen",
      "opd_penanggung_jawab",
      "bidang_opd_penanggung_jawab",
      "master_program_id",
    ],
  });
  const bulk = assertProgramBulkContext(program, ctx, ctx.options);
  if (!bulk.ok) {
    return {
      keg: null,
      preview_will_create_kegiatan: false,
      committed_new_kegiatan: false,
      err: { classification: bulk.classification, sample },
      skip: null,
    };
  }
  const align = assertProgramMasterAlignment(
    program,
    mp.id,
    ctx.options.strict_parent_mapping,
  );
  if (!align.ok) {
    if (align.classification.category === CATEGORY.LEGACY_PROGRAM_UNMAPPED) {
      return {
        keg: null,
        preview_will_create_kegiatan: false,
        committed_new_kegiatan: false,
        err: null,
        skip: {
          classification: align.classification,
          sample: {
            ...sample,
            transaction_program_id: program.id,
          },
        },
      };
    }
    return {
      keg: null,
      preview_will_create_kegiatan: false,
      committed_new_kegiatan: false,
      err: { classification: align.classification, sample },
      skip: null,
    };
  }

  const vid = resolveRegulasiVersiId(msRow, mk, mp);
  const kodeK = String(mk.kode_kegiatan_full || "").trim();
  const namaK = String(mk.nama_kegiatan || "").trim();
  const existsOther = await Kegiatan.unscoped().findOne({
    where: {
      periode_id: ctx.periode_id,
      jenis_dokumen: ctx.jenis_dokumen,
      tahun: ctx.tahun,
      [Op.or]: [{ kode_kegiatan: kodeK }, { nama_kegiatan: namaK }],
    },
    transaction,
  });

  if (existsOther && Number(existsOther.master_kegiatan_id || 0) !== mk.id) {
    return {
      keg: null,
      preview_will_create_kegiatan: false,
      committed_new_kegiatan: false,
      err: null,
      skip: {
        classification: buildClassification({
          category: CATEGORY.LEGACY_PARENT_CONFLICT,
          severity: SEVERITY.WARNING,
          action: ACTION.SKIP,
          reason:
            "Sudah ada kegiatan transaksi dengan kode/nama sama tetapi master_kegiatan_id berbeda atau belum selaras — butuh backfill/penyesuaian.",
          requires_backfill: true,
          code: "legacy_kegiatan_collision",
        }),
        sample: {
          ...sample,
          conflicting_kegiatan_id: existsOther.id,
        },
      },
    };
  }

  if (existsOther) {
    const chain = await validateKegiatanProgramChain(existsOther, mp, ctx, transaction);
    if (chain.err) {
      return {
        keg: null,
        preview_will_create_kegiatan: false,
        committed_new_kegiatan: false,
        err: { classification: chain.err, sample },
        skip: null,
      };
    }
    if (chain.skip) {
      return {
        keg: null,
        preview_will_create_kegiatan: false,
        committed_new_kegiatan: false,
        err: null,
        skip: { classification: chain.skip, sample },
      };
    }
    return {
      keg: existsOther,
      preview_will_create_kegiatan: false,
      committed_new_kegiatan: false,
      err: null,
      skip: null,
      sample,
    };
  }

  if (!transaction) {
    return {
      keg: null,
      preview_will_create_kegiatan: true,
      committed_new_kegiatan: false,
      err: null,
      skip: null,
      sample,
    };
  }

  keg = await Kegiatan.unscoped().create(
    {
      program_id: ctx.anchor_program_id,
      periode_id: ctx.periode_id,
      kode_kegiatan: kodeK,
      nama_kegiatan: namaK,
      jenis_dokumen: ctx.jenis_dokumen,
      tahun: ctx.tahun,
      master_kegiatan_id: mk.id,
      regulasi_versi_id: vid,
      input_mode: "MASTER",
      pagu_anggaran: 0,
      total_pagu_anggaran: 0,
      opd_penanggung_jawab:
        program.opd_penanggung_jawab != null
          ? String(program.opd_penanggung_jawab)
          : null,
      bidang_opd_penanggung_jawab:
        program.bidang_opd_penanggung_jawab || null,
    },
    { transaction },
  );

  return {
    keg,
    preview_will_create_kegiatan: false,
    committed_new_kegiatan: true,
    err: null,
    skip: null,
    sample,
  };
}

function bumpSeverityForNoSkipDup(cl, skipDuplicates) {
  if (skipDuplicates) return cl;
  if (cl.severity === SEVERITY.WARNING) {
    return {
      ...cl,
      severity: SEVERITY.ERROR,
      action: ACTION.FAIL,
    };
  }
  return cl;
}

async function buildRowPlan(msRow, ctx, transaction) {
  const mk = msRow.masterKegiatan;
  const mp = mk.masterProgram;
  const kodeSub = String(msRow.kode_sub_kegiatan_full || "").trim();
  const namaSub = String(msRow.nama_sub_kegiatan || "").trim();
  const vid = resolveRegulasiVersiId(msRow, mk, mp);

  const sample = {
    master_sub_kegiatan_id: msRow.id,
    master_kegiatan_id: mk.id,
    master_program_id: mp.id,
    kode_sub_kegiatan: kodeSub,
    nama_sub_kegiatan: namaSub,
    kode_kegiatan_master: String(mk.kode_kegiatan_full || "").trim(),
  };

  if (!kodeSub || !namaSub) {
    const cl = fatal("kode atau nama sub master kosong");
    return {
      status: "error",
      reason: cl.reason,
      classification: cl,
      sample,
    };
  }
  if (!vid) {
    const cl = fatal("regulasi_versi_id tidak dapat diturunkan dari master");
    return {
      status: "error",
      reason: cl.reason,
      classification: cl,
      sample,
    };
  }

  const resolved = await resolveKegiatanForRow(msRow, ctx, transaction);
  if (resolved.err) {
    const rawErr = resolved.err;
    const cl =
      rawErr.classification ||
      (rawErr.reason ? fatal(rawErr.reason) : fatal("error"));
    return {
      status: "error",
      reason: cl.reason,
      classification: cl,
      sample: rawErr.sample || resolved.sample || sample,
    };
  }
  if (resolved.skip) {
    const cl = resolved.skip.classification;
    return {
      status: "skipped",
      reason: cl.reason,
      classification: cl,
      sample: resolved.skip.sample || sample,
    };
  }

  const dup = await findDuplicateSub(
    {
      periode_id: ctx.periode_id,
      tahun: ctx.tahun,
      jenis_dokumen: ctx.jenis_dokumen,
    },
    { master_sub_id: msRow.id, kode_sub: kodeSub, nama_sub: namaSub },
    transaction,
  );

  if (dup) {
    let cl = classifyDuplicate(dup.type, dup.row, msRow.id);
    cl = bumpSeverityForNoSkipDup(cl, ctx.options.skip_duplicates);
    const backfill_hint =
      cl.requires_backfill || cl.category === CATEGORY.LEGACY_CHILD_CONFLICT
        ? evaluateSubBackfillCandidate({
            existingSub: dup.row,
            targetMasterSubId: msRow.id,
            targetKodeSub: kodeSub,
            targetNamaSub: namaSub,
            targetMasterKegiatanId: mk.id,
          })
        : null;
    return {
      status: ctx.options.skip_duplicates ? "skipped" : "error",
      reason: cl.reason,
      classification: cl,
      sample: { ...sample, existing_sub_kegiatan_id: dup.row?.id },
      backfill_hint,
    };
  }

  const keg = resolved.keg;

  if (!keg && !resolved.preview_will_create_kegiatan) {
    const cl = buildClassification({
      category: CATEGORY.MISSING_KEGIATAN_CONTEXT,
      severity: SEVERITY.ERROR,
      action: ACTION.FAIL,
      reason: "tidak dapat menentukan kegiatan transaksi induk",
    });
    return {
      status: "error",
      reason: cl.reason,
      classification: cl,
      sample,
    };
  }

  const subOpd = assertSubDefaultsOpd(ctx);
  if (!subOpd.ok) {
    return {
      status: "error",
      reason: subOpd.classification.reason,
      classification: subOpd.classification,
      sample,
    };
  }

  return {
    status: "would_import",
    reason: null,
    classification: ready(),
    sample,
    payload: {
      kegiatan_id: keg ? keg.id : null,
      master_sub_kegiatan_id: msRow.id,
      regulasi_versi_id: vid,
      kode_sub_kegiatan: kodeSub,
      nama_sub_kegiatan: namaSub,
      preview_will_create_kegiatan: resolved.preview_will_create_kegiatan,
      committed_new_kegiatan: resolved.committed_new_kegiatan,
      program_id_for_recalc:
        ctx.anchor_program_id || (keg ? keg.program_id : null),
    },
  };
}

function ingestPlanForPreview(plan, acc) {
  const cat = plan.classification?.category || CATEGORY.FATAL_VALIDATION_ERROR;
  if (acc.classification_counts[cat] != null) acc.classification_counts[cat] += 1;
  else acc.classification_counts[CATEGORY.FATAL_VALIDATION_ERROR] += 1;

  if (plan.classification?.requires_backfill) {
    acc.summary.requires_backfill += 1;
  }
  if (plan.classification?.severity === SEVERITY.FATAL) {
    acc.summary.fatal_row_count += 1;
  }
  if (plan.classification?.severity === SEVERITY.ERROR) {
    acc.summary.error_row_count += 1;
  }

  if (plan.status === "would_import") {
    acc.classification_counts[CATEGORY.READY] += 1;
    acc.summary.would_create_sub_kegiatans += 1;
    if (plan.payload?.preview_will_create_kegiatan) {
      acc.summary.would_create_kegiatans += 1;
    }
  } else if (plan.status === "skipped") {
    acc.summary.skipped += 1;
    if (
      plan.classification?.category === CATEGORY.DUPLICATE_MAPPED ||
      plan.classification?.category === CATEGORY.DUPLICATE_BY_CODE ||
      plan.classification?.category === CATEGORY.DUPLICATE_BY_NAME
    ) {
      acc.summary.duplicates += 1;
    }
    acc.warnings.push({
      ...plan.sample,
      reason: plan.reason,
      classification: plan.classification,
      backfill_hint: plan.backfill_hint || null,
    });
  } else {
    acc.summary.errors += 1;
    if (
      plan.classification?.category === CATEGORY.DUPLICATE_MAPPED ||
      plan.classification?.category === CATEGORY.DUPLICATE_BY_CODE ||
      plan.classification?.category === CATEGORY.DUPLICATE_BY_NAME
    ) {
      acc.summary.duplicates += 1;
    }
    acc.errors.push({
      ...plan.sample,
      reason: plan.reason,
      classification: plan.classification,
      backfill_hint: plan.backfill_hint || null,
    });
  }
}

async function runPreview(body) {
  const v = await validateAndBuildContext(body);
  if (!v.ok) {
    return { ok: false, error: v.error };
  }
  const { ctx } = v;
  const subs = await loadSubsWithHierarchy(ctx.dataset_key, ctx.subIds);

  const acc = {
    summary: {
      total_source_rows: subs.length,
      would_create_programs: 0,
      would_create_sub_kegiatans: 0,
      would_create_kegiatans: 0,
      skipped: 0,
      errors: 0,
      duplicates: 0,
      requires_backfill: 0,
      fatal_row_count: 0,
      error_row_count: 0,
      commit_blocked: false,
    },
    classification_counts: emptyClassificationCounts(),
    warnings: [],
    errors: [],
    planDetails: [],
  };

  for (const msRow of subs) {
    const plan = await buildRowPlan(msRow, ctx, null);
    acc.planDetails.push(plan);
    ingestPlanForPreview(plan, acc);
  }

  acc.summary.commit_blocked =
    acc.summary.fatal_row_count > 0 || acc.summary.error_row_count > 0;
  acc.summary.commit_blocked_detail = acc.summary.commit_blocked
    ? summarizeCommitBlockedReasons({
        summary: acc.summary,
        classification_counts: acc.classification_counts,
      })
    : null;

  const sample = acc.planDetails
    .filter((p) => p.status === "would_import")
    .slice(0, 15)
    .map((p) => ({
      ...p.sample,
      classification: p.classification,
    }));

  const backfill_candidates = acc.planDetails
    .filter(
      (p) =>
        p.classification?.requires_backfill ||
        p.backfill_hint ||
        p.classification?.category === CATEGORY.LEGACY_PARENT_CONFLICT ||
        p.classification?.category === CATEGORY.LEGACY_CHILD_CONFLICT ||
        p.classification?.category === CATEGORY.LEGACY_PROGRAM_UNMAPPED,
    )
    .slice(0, 40)
    .map((p) => ({
      ...p.sample,
      classification: p.classification,
      backfill_hint: p.backfill_hint || null,
      reason: p.reason,
    }));

  return {
    ok: true,
    data: {
      summary: acc.summary,
      classification_counts: acc.classification_counts,
      warnings: acc.warnings,
      errors: acc.errors,
      sample,
      backfill_candidates,
      total_source_rows: subs.length,
      filters_used: ctx.filters,
      options_used: ctx.options,
    },
  };
}

async function runCommit(body, userId) {
  const v = await validateAndBuildContext(body);
  if (!v.ok) {
    return { ok: false, error: v.error };
  }

  const pre = await runPreview(body);
  if (!pre.ok) {
    return {
      ok: false,
      error: pre.error || "Preflight preview gagal",
      data: { commit_preflight_failed: true },
    };
  }
  if (pre.data.summary.commit_blocked) {
    return {
      ok: false,
      error:
        "Commit ditolak server: preflight setara preview masih commit_blocked (ada baris fatal/error). Tidak ada transaksi DB yang dibuka untuk impor.",
      data: {
        commit_blocked: true,
        commit_preflight: true,
        summary: pre.data.summary,
        classification_counts: pre.data.classification_counts,
        commit_blocked_reasons: summarizeCommitBlockedReasons(pre.data),
        warnings_sample: (pre.data.warnings || []).slice(0, 8),
        errors_sample: (pre.data.errors || []).slice(0, 8),
      },
    };
  }

  const { ctx } = v;

  await ensureClonedOnce(ctx.jenis_dokumen, ctx.tahun);

  const subs = await loadSubsWithHierarchy(ctx.dataset_key, ctx.subIds);

  const summary = {
    inserted_sub_kegiatans: 0,
    inserted_kegiatans: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
    requires_backfill: 0,
    fatal_row_count: 0,
    error_row_count: 0,
  };
  const classification_counts = emptyClassificationCounts();
  const details = [];
  const inserted_kegiatan_ids = [];
  const inserted_sub_kegiatan_ids = [];
  const skipped_details_sample = [];
  const failed_details_sample = [];
  const kegiatanTouched = new Set();
  const programsTouched = new Set();

  const pushClass = (plan) => {
    const cat = plan.classification?.category || CATEGORY.FATAL_VALIDATION_ERROR;
    if (classification_counts[cat] != null) classification_counts[cat] += 1;
    if (plan.classification?.requires_backfill) summary.requires_backfill += 1;
    if (plan.classification?.severity === SEVERITY.FATAL) summary.fatal_row_count += 1;
    if (plan.classification?.severity === SEVERITY.ERROR) summary.error_row_count += 1;
  };

  const t = await sequelize.transaction();
  try {
    for (const msRow of subs) {
      const plan = await buildRowPlan(msRow, ctx, t);
      if (plan.status !== "would_import" || !plan.payload) {
        pushClass(plan);
        if (plan.status === "skipped") {
          summary.skipped += 1;
          if (
            plan.classification?.category === CATEGORY.DUPLICATE_MAPPED ||
            plan.classification?.category === CATEGORY.DUPLICATE_BY_CODE ||
            plan.classification?.category === CATEGORY.DUPLICATE_BY_NAME
          ) {
            summary.duplicates += 1;
          }
          if (skipped_details_sample.length < 25) {
            skipped_details_sample.push({
              master_sub_kegiatan_id: msRow.id,
              classification: plan.classification,
              reason: plan.reason,
              sample: plan.sample,
            });
          }
        } else {
          summary.failed += 1;
          if (failed_details_sample.length < 25) {
            failed_details_sample.push({
              master_sub_kegiatan_id: msRow.id,
              classification: plan.classification,
              reason: plan.reason,
              sample: plan.sample,
            });
          }
        }
        details.push({
          master_sub_kegiatan_id: msRow.id,
          status: plan.status,
          reason: plan.reason,
          classification: plan.classification,
          backfill_hint: plan.backfill_hint || null,
        });
        continue;
      }

      const p = plan.payload;
      if (!p.kegiatan_id) {
        summary.failed += 1;
        const fcl = fatal("kegiatan_id hilang setelah resolusi (internal)");
        pushClass({ classification: fcl });
        details.push({
          master_sub_kegiatan_id: msRow.id,
          status: "error",
          reason: fcl.reason,
          classification: fcl,
        });
        continue;
      }

      pushClass(plan);

      if (p.committed_new_kegiatan) {
        summary.inserted_kegiatans += 1;
      }

      const created = await SubKegiatan.unscoped().create(
        {
          kegiatan_id: p.kegiatan_id,
          periode_id: ctx.periode_id,
          kode_sub_kegiatan: p.kode_sub_kegiatan,
          nama_sub_kegiatan: p.nama_sub_kegiatan,
          pagu_anggaran: 0,
          total_pagu_anggaran: 0,
          nama_opd: ctx.defaults.nama_opd,
          nama_bidang_opd: ctx.defaults.nama_bidang_opd,
          sub_bidang_opd: ctx.defaults.sub_bidang_opd,
          jenis_dokumen: ctx.jenis_dokumen,
          tahun: ctx.tahun,
          master_sub_kegiatan_id: p.master_sub_kegiatan_id,
          regulasi_versi_id: p.regulasi_versi_id,
          input_mode: "MASTER",
          migrated_by: userId || null,
        },
        { transaction: t },
      );

      summary.inserted_sub_kegiatans += 1;
      inserted_sub_kegiatan_ids.push(created.id);
      if (p.committed_new_kegiatan) {
        inserted_kegiatan_ids.push(p.kegiatan_id);
      }
      kegiatanTouched.add(p.kegiatan_id);
      if (p.program_id_for_recalc) {
        programsTouched.add(p.program_id_for_recalc);
      }
      details.push({
        master_sub_kegiatan_id: msRow.id,
        status: "inserted",
        kegiatan_id: p.kegiatan_id,
        sub_kegiatan_id: created.id,
        classification: plan.classification,
      });
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
      classification_counts,
      inserted_ids: {
        kegiatan_ids: inserted_kegiatan_ids,
        sub_kegiatan_ids: inserted_sub_kegiatan_ids,
      },
      details: details.slice(0, 200),
      skipped_details_sample,
      failed_details_sample,
      filters_used: ctx.filters,
      options_used: ctx.options,
    },
  };
}

module.exports = {
  runPreview,
  runCommit,
  validateAndBuildContext,
  DEFAULT_DATASET,
  emptyClassificationCounts,
  assertProgramBulkContext,
  assertProgramMasterAlignment,
  summarizeCommitBlockedReasons,
  assertKegiatanOpdOwnership,
  assertSubDefaultsOpd,
};
