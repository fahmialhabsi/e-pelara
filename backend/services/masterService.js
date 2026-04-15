"use strict";

const { Op } = require("sequelize");
const {
  MasterProgram,
  MasterKegiatan,
  MasterSubKegiatan,
  MasterIndikator,
} = require("../models");
const { DEFAULT_DATASET_KEY } = require("./importSheet2NormalizedService");
const C = require("../constants/masterErrorCodes");

function normalizeDatasetKey(q) {
  const v = q && String(q.datasetKey || q.dataset_key || "").trim();
  return v || DEFAULT_DATASET_KEY;
}

function isStrictMode(query) {
  if (!query) return false;
  const s = query.strict;
  return s === "1" || s === "true" || s === true;
}

const orderByKodeProgram = [["kode_program_full", "ASC"]];
const orderByKodeKegiatan = [["kode_kegiatan_full", "ASC"]];
const orderByKodeSub = [["kode_sub_kegiatan_full", "ASC"]];
const orderByIndikator = [
  ["urutan", "ASC"],
  ["id", "ASC"],
];

/** Hanya master aktif; baris is_active null diperlakukan aktif (pra-migrasi kolom). */
const masterActiveWhere = {
  [Op.or]: [{ is_active: true }, { is_active: { [Op.is]: null } }],
};

async function listPrograms(datasetKey) {
  const rows = await MasterProgram.findAll({
    where: { dataset_key: datasetKey, ...masterActiveWhere },
    attributes: [
      "id",
      "dataset_key",
      "kode_urusan",
      "kode_bidang_urusan",
      "kode_program",
      "kode_program_full",
      "nama_urusan",
      "nama_program",
      "created_at",
      "updated_at",
    ],
    order: orderByKodeProgram,
  });
  return rows.map((r) => r.get({ plain: true }));
}

/**
 * Satu baris per kode program (full) — hindari duplikat UI saat impor memakai beberapa dataset_key.
 * Prioritas: DEFAULT_DATASET_KEY dulu, lalu urutan dataset_key / kode.
 * @param {object[]} plainRows
 * @returns {object[]}
 */
function dedupeMasterProgramsAcrossDatasets(plainRows) {
  if (!Array.isArray(plainRows) || plainRows.length <= 1) return plainRows;
  const pref = DEFAULT_DATASET_KEY;
  const indexed = plainRows.map((r, i) => ({ r, i }));
  indexed.sort((a, b) => {
    const ak = String(a.r.dataset_key || "");
    const bk = String(b.r.dataset_key || "");
    const aPref = ak === pref ? 0 : 1;
    const bPref = bk === pref ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    const ds = ak.localeCompare(bk, "id");
    if (ds !== 0) return ds;
    const ka = String(a.r.kode_program_full || a.r.kode_program || "");
    const kb = String(b.r.kode_program_full || b.r.kode_program || "");
    if (ka !== kb) return ka.localeCompare(kb, "id");
    return a.i - b.i;
  });
  const seen = new Set();
  const out = [];
  for (const { r } of indexed) {
    const k = String(r.kode_program_full || r.kode_program || "")
      .trim()
      .toUpperCase();
    const key = k || `__id:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  out.sort((a, b) =>
    String(a.kode_program_full || a.kode_program || "").localeCompare(
      String(b.kode_program_full || b.kode_program || ""),
      "id",
    ),
  );
  return out;
}

/** Semua baris master program (lintas dataset_key) — untuk dropdown form RPJMD dsb. */
async function listProgramsAllDatasets() {
  const rows = await MasterProgram.findAll({
    where: { ...masterActiveWhere },
    attributes: [
      "id",
      "dataset_key",
      "kode_urusan",
      "kode_bidang_urusan",
      "kode_program",
      "kode_program_full",
      "nama_urusan",
      "nama_program",
      "created_at",
      "updated_at",
    ],
    order: [
      ["dataset_key", "ASC"],
      ["kode_program_full", "ASC"],
    ],
  });
  const plain = rows.map((r) => r.get({ plain: true }));
  return dedupeMasterProgramsAcrossDatasets(plain);
}

/**
 * Kegiatan anak programId; dataset konsisten.
 * @param {boolean} [options.strict] — parent hilang: 404 vs 200 kosong + meta.warning
 */
async function listKegiatanByProgram(programId, datasetKey, options = {}) {
  const strict = Boolean(options.strict);

  const program = await MasterProgram.findOne({
    where: { id: programId, dataset_key: datasetKey, ...masterActiveWhere },
    attributes: ["id", "dataset_key", "kode_program_full", "nama_program"],
  });

  if (!program) {
    const message = `Program master dengan id=${programId} tidak ditemukan untuk dataset "${datasetKey}".`;
    if (strict) {
      return {
        ok: false,
        status: 404,
        code: C.MASTER_PARENT_NOT_FOUND,
        message,
        field: "programId",
      };
    }
    return {
      ok: true,
      program: null,
      data: [],
      warning: {
        code: C.MASTER_PARENT_NOT_FOUND,
        message,
        field: "programId",
      },
    };
  }

  const rows = await MasterKegiatan.findAll({
    where: {
      master_program_id: programId,
      dataset_key: datasetKey,
      ...masterActiveWhere,
    },
    attributes: [
      "id",
      "master_program_id",
      "dataset_key",
      "kode_kegiatan",
      "kode_kegiatan_full",
      "nama_kegiatan",
      "created_at",
      "updated_at",
    ],
    order: orderByKodeKegiatan,
  });

  return {
    ok: true,
    program: program.get({ plain: true }),
    data: rows.map((r) => r.get({ plain: true })),
    warning: null,
  };
}

async function listSubKegiatanByKegiatan(kegiatanId, datasetKey, options = {}) {
  const strict = Boolean(options.strict);

  const kegiatan = await MasterKegiatan.findOne({
    where: { id: kegiatanId, dataset_key: datasetKey, ...masterActiveWhere },
    attributes: [
      "id",
      "master_program_id",
      "dataset_key",
      "kode_kegiatan_full",
      "nama_kegiatan",
    ],
    include: [
      {
        model: MasterProgram,
        as: "masterProgram",
        attributes: ["id", "dataset_key", "kode_program_full", "nama_program"],
        required: true,
      },
    ],
  });

  if (!kegiatan) {
    const message = `Kegiatan master dengan id=${kegiatanId} tidak ditemukan untuk dataset "${datasetKey}".`;
    if (strict) {
      return {
        ok: false,
        status: 404,
        code: C.MASTER_PARENT_NOT_FOUND,
        message,
        field: "kegiatanId",
      };
    }
    return {
      ok: true,
      kegiatan: null,
      data: [],
      warning: {
        code: C.MASTER_PARENT_NOT_FOUND,
        message,
        field: "kegiatanId",
      },
    };
  }

  const kPlain = kegiatan.get({ plain: true });
  if (kPlain.dataset_key !== datasetKey) {
    return {
      ok: false,
      status: 400,
      code: C.MASTER_DATASET_MISMATCH,
      message: "dataset_key kegiatan tidak cocok dengan permintaan.",
      field: "datasetKey",
    };
  }
  if (kPlain.masterProgram && kPlain.masterProgram.dataset_key !== datasetKey) {
    return {
      ok: false,
      status: 400,
      code: C.MASTER_DATASET_MISMATCH,
      message: "Program induk kegiatan berada di dataset lain.",
      field: "datasetKey",
    };
  }

  const rows = await MasterSubKegiatan.findAll({
    where: {
      master_kegiatan_id: kegiatanId,
      dataset_key: datasetKey,
      ...masterActiveWhere,
    },
    attributes: [
      "id",
      "master_kegiatan_id",
      "dataset_key",
      "kode_sub_kegiatan",
      "kode_sub_kegiatan_full",
      "nama_sub_kegiatan",
      "kinerja",
      "created_at",
      "updated_at",
    ],
    order: orderByKodeSub,
  });

  return {
    ok: true,
    kegiatan: kPlain,
    data: rows.map((r) => r.get({ plain: true })),
    warning: null,
  };
}

async function listIndikatorBySubKegiatan(
  subKegiatanId,
  datasetKey,
  options = {},
) {
  const strict = Boolean(options.strict);

  const sub = await MasterSubKegiatan.findOne({
    where: { id: subKegiatanId, dataset_key: datasetKey, ...masterActiveWhere },
    attributes: [
      "id",
      "master_kegiatan_id",
      "dataset_key",
      "kode_sub_kegiatan_full",
      "nama_sub_kegiatan",
    ],
    include: [
      {
        model: MasterKegiatan,
        as: "masterKegiatan",
        attributes: ["id", "dataset_key", "master_program_id"],
        required: false,
      },
    ],
  });

  if (!sub) {
    const message = `Sub kegiatan master dengan id=${subKegiatanId} tidak ditemukan untuk dataset "${datasetKey}".`;
    if (strict) {
      return {
        ok: false,
        status: 404,
        code: C.MASTER_PARENT_NOT_FOUND,
        message,
        field: "subKegiatanId",
      };
    }
    return {
      ok: true,
      subKegiatan: null,
      data: [],
      warning: {
        code: C.MASTER_PARENT_NOT_FOUND,
        message,
        field: "subKegiatanId",
      },
    };
  }

  const sPlain = sub.get({ plain: true });
  if (sPlain.dataset_key !== datasetKey) {
    return {
      ok: false,
      status: 400,
      code: C.MASTER_DATASET_MISMATCH,
      message: "dataset_key sub kegiatan tidak cocok.",
      field: "datasetKey",
    };
  }
  if (
    sPlain.masterKegiatan &&
    sPlain.masterKegiatan.dataset_key !== datasetKey
  ) {
    return {
      ok: false,
      status: 400,
      code: C.MASTER_DATASET_MISMATCH,
      message: "Kegiatan induk sub berada di dataset lain.",
      field: "datasetKey",
    };
  }

  const rows = await MasterIndikator.findAll({
    where: { master_sub_kegiatan_id: subKegiatanId },
    attributes: [
      "id",
      "master_sub_kegiatan_id",
      "urutan",
      "indikator",
      "kinerja",
      "satuan",
      "level",
      "tipe",
      "is_wajib",
      "rumus",
      "satuan_bebas",
      "created_at",
      "updated_at",
    ],
    order: orderByIndikator,
  });

  return {
    ok: true,
    subKegiatan: {
      id: sPlain.id,
      master_kegiatan_id: sPlain.master_kegiatan_id,
      kode_sub_kegiatan_full: sPlain.kode_sub_kegiatan_full,
      nama_sub_kegiatan: sPlain.nama_sub_kegiatan,
    },
    data: rows.map((r) => r.get({ plain: true })),
    warning: null,
  };
}

module.exports = {
  normalizeDatasetKey,
  isStrictMode,
  listPrograms,
  listProgramsAllDatasets,
  listKegiatanByProgram,
  listSubKegiatanByKegiatan,
  listIndikatorBySubKegiatan,
  DEFAULT_DATASET_KEY,
};
