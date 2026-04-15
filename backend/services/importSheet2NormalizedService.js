"use strict";

const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const DEFAULT_DATASET_KEY = "sekretariat_bidang_sheet2";
const DEFAULT_SHEET = "Sheet2_Normalized";

const REQUIRED_FIELDS = [
  "kode_program_full",
  "kode_kegiatan_full",
  "kode_sub_kegiatan_full",
  "nama_program",
  "nama_kegiatan",
  "nama_sub_kegiatan",
  "indikator",
  "kinerja",
  "satuan",
];

function trimStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Normalisasi key header (spasi, case).
 */
function normalizeRowKeys(row) {
  const out = {};
  for (const [k, val] of Object.entries(row)) {
    const key = String(k).trim().replace(/\s+/g, "_").toLowerCase();
    out[key] = val;
  }
  return out;
}

function resolveSourcePath(options) {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const defaultXlsx = path.join(
    repoRoot,
    "dokumenEPelara",
    "Final_Program_Kegiatan_Sub_Kegiatan_Sekretariat_Bidang_UPDATED.xlsx",
  );
  const defaultCsv = path.join(
    repoRoot,
    "dokumenEPelara",
    "Sheet2_Normalized_final.csv",
  );

  if (options.sourcePath) {
    const abs = path.isAbsolute(options.sourcePath)
      ? options.sourcePath
      : path.resolve(process.cwd(), options.sourcePath);
    if (!fs.existsSync(abs)) {
      throw new Error(`Berkas sumber tidak ditemukan: ${abs}`);
    }
    return abs;
  }

  if (options.preferXlsx !== false && fs.existsSync(defaultXlsx)) {
    return defaultXlsx;
  }
  if (fs.existsSync(defaultCsv)) {
    return defaultCsv;
  }
  throw new Error(
    `Tidak ada sumber data. Letakkan XLSX di dokumenEPelara atau CSV Sheet2_Normalized_final.csv, atau set opsi sourcePath.`,
  );
}

/**
 * Baca baris dari .xlsx / .xls / .csv (SheetJS).
 */
function readRowsFromFile(filePath, sheetName = DEFAULT_SHEET) {
  const wb = XLSX.readFile(filePath, { cellDates: true, raw: false });
  let name = sheetName;
  if (!wb.SheetNames.includes(name)) {
    if (wb.SheetNames.length === 1) {
      name = wb.SheetNames[0];
    } else {
      throw new Error(
        `Sheet "${sheetName}" tidak ada. Tersedia: ${wb.SheetNames.join(", ")}`,
      );
    }
  }
  const sheet = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return raw.map((r) => normalizeRowKeys(r));
}

function normalizeBusinessRow(row, index) {
  const o = {};
  for (const f of [
    "kode_urusan",
    "kode_bidang_urusan",
    "kode_program",
    "kode_kegiatan",
    "kode_sub_kegiatan",
    "kode_program_full",
    "kode_kegiatan_full",
    "kode_sub_kegiatan_full",
    "nama_urusan",
    "nama_program",
    "nama_kegiatan",
    "nama_sub_kegiatan",
    "kinerja",
    "indikator",
    "satuan",
  ]) {
    o[f] = trimStr(row[f]);
  }
  o._rowIndex = index + 2;
  return o;
}

function validateParentChild(row) {
  const p = row.kode_program_full;
  const k = row.kode_kegiatan_full;
  const s = row.kode_sub_kegiatan_full;
  if (!p || !k || !s) return null;
  if (!k.startsWith(`${p}.`)) {
    return `kode_kegiatan_full harus berawalan "kode_program_full." (${k} vs ${p})`;
  }
  if (!s.startsWith(`${k}.`)) {
    return `kode_sub_kegiatan_full harus berawalan "kode_kegiatan_full." (${s} vs ${k})`;
  }
  return null;
}

/**
 * Validasi seluruh dataset: wajib terisi, hierarki kode, konsistensi antar-baris untuk kode yang sama.
 */
function validateRows(rows) {
  const errors = [];
  const warnings = [];

  const programMeta = new Map();
  const kegiatanMeta = new Map();
  const subGroups = new Map();

  rows.forEach((row, i) => {
    const r = normalizeBusinessRow(row, i);
    for (const f of REQUIRED_FIELDS) {
      if (!r[f]) {
        errors.push({
          row: r._rowIndex,
          field: f,
          message: `Kolom wajib kosong: ${f}`,
        });
      }
    }
    const pc = validateParentChild(r);
    if (pc) {
      errors.push({ row: r._rowIndex, field: "hierarchy", message: pc });
    }

    const pk = r.kode_program_full;
    if (pk) {
      if (!programMeta.has(pk)) {
        programMeta.set(pk, {
          nama_program: r.nama_program,
          nama_urusan: r.nama_urusan,
          kode_urusan: r.kode_urusan,
          kode_bidang_urusan: r.kode_bidang_urusan,
          kode_program: r.kode_program,
          row: r._rowIndex,
        });
      } else {
        const prev = programMeta.get(pk);
        if (prev.nama_program !== r.nama_program) {
          errors.push({
            row: r._rowIndex,
            field: "nama_program",
            message: `Konflik nama_program untuk kode_program_full=${pk} (baris ${prev.row} vs ${r._rowIndex})`,
          });
        }
        if (prev.nama_urusan !== r.nama_urusan) {
          warnings.push({
            row: r._rowIndex,
            message: `nama_urusan berbeda untuk program ${pk}; dipakai nilai baris pertama`,
          });
        }
      }
    }

    const kk = r.kode_kegiatan_full;
    if (kk) {
      if (!kegiatanMeta.has(kk)) {
        kegiatanMeta.set(kk, {
          nama_kegiatan: r.nama_kegiatan,
          kode_program_full: r.kode_program_full,
          row: r._rowIndex,
        });
      } else {
        const prev = kegiatanMeta.get(kk);
        if (prev.nama_kegiatan !== r.nama_kegiatan) {
          errors.push({
            row: r._rowIndex,
            field: "nama_kegiatan",
            message: `Konflik nama_kegiatan untuk kode_kegiatan_full=${kk}`,
          });
        }
        if (prev.kode_program_full !== r.kode_program_full) {
          errors.push({
            row: r._rowIndex,
            field: "kode_program_full",
            message: `Konflik induk program untuk kode_kegiatan_full=${kk}`,
          });
        }
      }
    }

    const sk = r.kode_sub_kegiatan_full;
    if (sk) {
      if (!subGroups.has(sk)) subGroups.set(sk, []);
      subGroups.get(sk).push(r);
    }
  });

  for (const [sk, group] of subGroups) {
    if (group.length < 2) continue;
    const base = group[0];
    for (let j = 1; j < group.length; j++) {
      const g = group[j];
      if (g.nama_sub_kegiatan !== base.nama_sub_kegiatan) {
        errors.push({
          row: g._rowIndex,
          field: "nama_sub_kegiatan",
          message: `Konflik nama_sub_kegiatan untuk kode_sub_kegiatan_full=${sk}`,
        });
      }
      if (g.kode_kegiatan_full !== base.kode_kegiatan_full) {
        errors.push({
          row: g._rowIndex,
          field: "kode_kegiatan_full",
          message: `Konflik induk kegiatan untuk sub ${sk}`,
        });
      }
      if (g.kode_program_full !== base.kode_program_full) {
        errors.push({
          row: g._rowIndex,
          field: "kode_program_full",
          message: `Konflik induk program untuk sub ${sk}`,
        });
      }
    }
  }

  const seenSub = new Set();
  rows.forEach((row, i) => {
    const r = normalizeBusinessRow(row, i);
    const sk = r.kode_sub_kegiatan_full;
    if (!sk) return;
    if (seenSub.has(sk)) {
      errors.push({
        row: r._rowIndex,
        field: "kode_sub_kegiatan_full",
        message: `Duplikat kode_sub_kegiatan_full dalam sumber: ${sk} (hanya satu baris per sub, atau gabungkan indikator di baris terpisah dengan konsistensi — saat ini dilarang duplikat)`,
      });
    }
    seenSub.add(sk);
  });

  return { errors, warnings, ok: errors.length === 0 };
}

/**
 * Hapus seluruh baris master untuk dataset_key (urutan aman FK).
 */
async function purgeDataset(sequelize, datasetKey, transaction = null) {
  const q = { replacements: { dk: datasetKey } };
  if (transaction) q.transaction = transaction;
  await sequelize.query(
    `DELETE mi FROM master_indikator AS mi
     INNER JOIN master_sub_kegiatan AS msk ON mi.master_sub_kegiatan_id = msk.id
     WHERE msk.dataset_key = :dk`,
    q,
  );
  await sequelize.query(
    `DELETE FROM master_sub_kegiatan WHERE dataset_key = :dk`,
    q,
  );
  await sequelize.query(
    `DELETE FROM master_kegiatan WHERE dataset_key = :dk`,
    q,
  );
  await sequelize.query(
    `DELETE FROM master_program WHERE dataset_key = :dk`,
    q,
  );
}

/**
 * Impor baris tervalidasi ke DB (satu transaksi).
 */
async function importRows({ sequelize, models, rows, datasetKey, transaction }) {
  const {
    MasterProgram,
    MasterKegiatan,
    MasterSubKegiatan,
    MasterIndikator,
  } = models;

  const t = transaction;
  let programs = 0;
  let kegiatans = 0;
  let subs = 0;
  let indikators = 0;

  const programCache = new Map();
  const kegiatanCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    const r = normalizeBusinessRow(rows[i], i);
    const pFull = r.kode_program_full;
    const kFull = r.kode_kegiatan_full;
    const sFull = r.kode_sub_kegiatan_full;

    let programId = programCache.get(pFull);
    if (programId == null) {
      const [row, created] = await MasterProgram.findOrCreate({
        where: { dataset_key: datasetKey, kode_program_full: pFull },
        defaults: {
          dataset_key: datasetKey,
          kode_urusan: r.kode_urusan || null,
          kode_bidang_urusan: r.kode_bidang_urusan || null,
          kode_program: r.kode_program || null,
          kode_program_full: pFull,
          nama_urusan: r.nama_urusan || null,
          nama_program: r.nama_program,
        },
        transaction: t,
      });
      programId = row.id;
      programCache.set(pFull, programId);
      if (created) programs += 1;
    }

    let kegiatanId = kegiatanCache.get(kFull);
    if (kegiatanId == null) {
      const [row, created] = await MasterKegiatan.findOrCreate({
        where: { dataset_key: datasetKey, kode_kegiatan_full: kFull },
        defaults: {
          dataset_key: datasetKey,
          master_program_id: programId,
          kode_kegiatan: r.kode_kegiatan || null,
          kode_kegiatan_full: kFull,
          nama_kegiatan: r.nama_kegiatan,
        },
        transaction: t,
      });
      if (row.master_program_id !== programId) {
        throw new Error(
          `kode_kegiatan_full ${kFull} sudah ada dengan master_program_id lain`,
        );
      }
      kegiatanId = row.id;
      kegiatanCache.set(kFull, kegiatanId);
      if (created) kegiatans += 1;
    } else {
      const existingK = await MasterKegiatan.findByPk(kegiatanId, {
        transaction: t,
      });
      if (existingK.master_program_id !== programId) {
        throw new Error(
          `Baris ${r._rowIndex}: kegiatan ${kFull} tidak konsisten dengan program ${pFull}`,
        );
      }
    }

    const [subRow, subCreated] = await MasterSubKegiatan.findOrCreate({
      where: { dataset_key: datasetKey, kode_sub_kegiatan_full: sFull },
      defaults: {
        dataset_key: datasetKey,
        master_kegiatan_id: kegiatanId,
        kode_sub_kegiatan: r.kode_sub_kegiatan || null,
        kode_sub_kegiatan_full: sFull,
        nama_sub_kegiatan: r.nama_sub_kegiatan,
        kinerja: r.kinerja || null,
      },
      transaction: t,
    });
    if (subRow.master_kegiatan_id !== kegiatanId) {
      throw new Error(
        `kode_sub_kegiatan_full ${sFull} sudah ada dengan induk kegiatan lain`,
      );
    }
    if (subCreated) subs += 1;

    await MasterIndikator.create(
      {
        master_sub_kegiatan_id: subRow.id,
        urutan: 0,
        indikator: r.indikator,
        kinerja: r.kinerja || null,
        satuan: r.satuan || null,
      },
      { transaction: t },
    );
    indikators += 1;
  }

  return { programs, kegiatans, subs, indikators };
}

/**
 * @param {object} options
 * @param {import('sequelize').Sequelize} options.sequelize
 * @param {object} options.models - hasil require('../models')
 * @param {string} [options.datasetKey]
 * @param {string} [options.sourcePath]
 * @param {string} [options.sheetName]
 * @param {boolean} [options.preferXlsx]
 * @param {boolean} [options.replaceExisting] - hapus data dataset_key dulu
 * @param {boolean} [options.dryRun] - hanya parse + validasi
 */
async function importSheet2Normalized(options = {}) {
  const sequelize = options.sequelize;
  const models = options.models;
  if (!sequelize || !models) {
    throw new Error("importSheet2Normalized membutuhkan sequelize dan models");
  }

  const datasetKey = options.datasetKey || DEFAULT_DATASET_KEY;
  const sheetName = options.sheetName || DEFAULT_SHEET;
  const replaceExisting = options.replaceExisting !== false;
  const dryRun = Boolean(options.dryRun);

  const filePath = resolveSourcePath(options);
  const rows = readRowsFromFile(filePath, sheetName);

  if (!rows.length) {
    throw new Error("Tidak ada baris data (setelah header).");
  }

  const validation = validateRows(rows);
  if (!validation.ok) {
    const err = new Error(
      `Validasi gagal: ${validation.errors.length} error`,
    );
    err.validationErrors = validation.errors;
    err.validationWarnings = validation.warnings;
    throw err;
  }

  if (dryRun) {
    return {
      filePath,
      datasetKey,
      rowCount: rows.length,
      dryRun: true,
      warnings: validation.warnings,
      sample: rows.slice(0, 3).map((row, i) => normalizeBusinessRow(row, i)),
    };
  }

  const t = await sequelize.transaction();
  try {
    if (replaceExisting) {
      await purgeDataset(sequelize, datasetKey, t);
    }

    const counts = await importRows({
      sequelize,
      models,
      rows,
      datasetKey,
      transaction: t,
    });

    await t.commit();
    return {
      filePath,
      datasetKey,
      rowCount: rows.length,
      ...counts,
      warnings: validation.warnings,
      sample: rows.slice(0, 3).map((row, i) => normalizeBusinessRow(row, i)),
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  DEFAULT_DATASET_KEY,
  DEFAULT_SHEET,
  REQUIRED_FIELDS,
  resolveSourcePath,
  readRowsFromFile,
  normalizeBusinessRow,
  validateRows,
  validateParentChild,
  purgeDataset,
  importRows,
  importSheet2Normalized,
};
