"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/database");
const {
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
  Indikator,
  Tujuan,
  Sasaran,
  Strategi,
  ArahKebijakan,
  SubKegiatan,
  Kegiatan,
  Program,
} = require("../models");
const {
  allocateKodeTujuanGroup,
  allocateKodeSasaranGroup,
  allocateKodeStrategiGroup,
  allocateKodeArahGroup,
  allocateKodeProgramGroup,
  allocateKodeKegiatanGroup,
  allocateKodeSubKegiatanGroup,
} = require("../helpers/rpjmdImportAutoKodeIndikator");
const { syncIndikatorKinerjaFromJenis } = require("../utils/syncIndikatorKinerjaFromJenis");

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const DEFAULT_JENIS_DOK = "RPJMD";
const DEFAULT_TAHUN = "2025";

function clampLimit(raw) {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function clampOffset(raw) {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function toInt(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function pickDefined(body, keys) {
  const out = {};
  for (const k of keys) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

function str(v, maxLen) {
  if (v === undefined || v === null) return undefined;
  const s = String(v);
  if (maxLen && s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

function assertPeriodeId(periodeId) {
  const pid = toInt(periodeId);
  if (!pid) {
    const e = new Error("periode_rpjmd_id tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  return pid;
}

function jenisDokumenVariants(jenis) {
  const j = String(jenis || DEFAULT_JENIS_DOK).trim();
  return [...new Set([j, j.toLowerCase(), j.toUpperCase()])];
}

function conflict(msg) {
  const e = new Error(msg);
  e.code = "CONFLICT";
  return e;
}

async function assertUniqueKodePeriodeJenis(Model, pid, jenisDoc, kodeRaw, excludeId, opts = {}) {
  const { transaction, tujuan_id, tahun: tahunUnik } = opts || {};
  const kode = str(kodeRaw, 100);
  if (!kode || !String(kode).trim()) return;
  const variants = jenisDokumenVariants(jenisDoc);
  const baseWhere = {
    kode_indikator: String(kode).trim(),
    jenis_dokumen: { [Op.in]: variants },
  };
  if (excludeId) baseWhere.id = { [Op.ne]: excludeId };

  let dup = null;
  /**
   * Indikator tujuan: unik DB = (kode_indikator, tujuan_id, jenis_dokumen, tahun).
   * Tanpa tujuan_id di where, beberapa tujuan dengan no_tujuan sama → kode generate sama
   * dan baris ke-2+ dianggap «duplikat» padahal tujuan berbeda (gejala: pratinjau 6, terapkan 3).
   */
  if (Model === IndikatorTujuan) {
    const where = { ...baseWhere, periode_id: pid };
    const tid = toInt(tujuan_id);
    if (tid) where.tujuan_id = tid;
    const th = tahunUnik != null && String(tahunUnik).trim() !== "" ? String(tahunUnik).trim() : null;
    if (th) where.tahun = th;
    // Hanya blokir duplikat antar baris final (is_import_reference = false).
    // Baris referensi impor boleh berbagi kode dengan baris final yang akan me-promote-nya.
    where.is_import_reference = false;
    dup = await IndikatorTujuan.findOne({ where, transaction });
  } else if (Model === IndikatorProgram) {
    dup = await IndikatorProgram.findOne({
      where: baseWhere,
      transaction,
      subQuery: false,
      include: [
        {
          model: IndikatorSasaran,
          as: "indikatorSasaran",
          attributes: ["id"],
          where: { periode_id: pid },
          required: true,
        },
      ],
    });
  } else if (Model === IndikatorKegiatan) {
    dup = await IndikatorKegiatan.findOne({
      where: baseWhere,
      transaction,
      subQuery: false,
      include: [
        {
          model: IndikatorProgram,
          as: "indikatorProgram",
          required: true,
          include: [
            {
              model: IndikatorSasaran,
              as: "indikatorSasaran",
              attributes: ["id"],
              where: { periode_id: pid },
              required: true,
            },
          ],
        },
      ],
    });
  } else {
    dup = await Model.findOne({
      where: { ...baseWhere, periode_id: pid },
      transaction,
    });
  }
  if (dup) {
    if (Model === IndikatorTujuan) {
      throw conflict(
        `Kode indikator "${String(kode).trim()}" sudah ada untuk kombinasi tujuan, tahun, dan jenis dokumen yang sama dalam periode ini.`,
      );
    }
    throw conflict(
      `Kode indikator "${String(kode).trim()}" sudah ada untuk periode ini dengan jenis dokumen yang sama.`,
    );
  }
}

async function runInOptionalTransaction(outerTx, fn) {
  if (outerTx) return fn(outerTx);
  const tx = await sequelize.transaction();
  try {
    const r = await fn(tx);
    await tx.commit();
    return r;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/** Excel / JSON kadang `jenisDokumen` / `jenisdokumen` (header camel); DB & pick pakai `jenis_dokumen`. */
function firstNonEmptyJenisDokumen(b) {
  const o = b || {};
  for (const k of ["jenisDokumen", "jenisdokumen", "jenis_dokumen"]) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    const t = str(s, 50);
    if (t && String(t).trim()) return t;
  }
  return undefined;
}

function jenisTahunDefaults(body) {
  const b = body || {};
  const jenis = firstNonEmptyJenisDokumen(b) || DEFAULT_JENIS_DOK;
  const tahun = str(b.tahun, 10) || DEFAULT_TAHUN;
  return { jenis_dokumen: jenis, tahun };
}

function masterJenisLower(jenisIndikator) {
  const s = String(jenisIndikator || "").toLowerCase();
  return s === "kualitatif" ? "kualitatif" : "kuantitatif";
}

function masterTipe(tipe) {
  const t = String(tipe || "").trim();
  if (["Impact", "Outcome", "Output", "Proses"].includes(t)) return t;
  return "Outcome";
}

function masterStage(stage) {
  const s = String(stage || "").trim();
  if (["misi", "tujuan", "sasaran", "program", "kegiatan"].includes(s)) return s;
  return "sasaran";
}

async function createMasterIndikator(tx, attrs) {
  const jenisDokumen = firstNonEmptyJenisDokumen(attrs) || DEFAULT_JENIS_DOK;
  const row = await Indikator.create(
    {
      misi_id: attrs.misi_id,
      tujuan_id: attrs.tujuan_id ?? null,
      sasaran_id: attrs.sasaran_id ?? null,
      program_id: attrs.program_id ?? null,
      kegiatan_id: attrs.kegiatan_id ?? null,
      kode_indikator: str(attrs.kode_indikator, 255) || "",
      nama_indikator: str(attrs.nama_indikator, 255) || "",
      satuan: str(attrs.satuan, 100) || "",
      jenis_indikator: masterJenisLower(attrs.jenis_indikator),
      tipe_indikator: masterTipe(attrs.tipe_indikator),
      /* Model `Indikator`: atribut Sequelize = jenisDokumen (field DB jenis_dokumen). */
      jenisDokumen,
      tahun: attrs.tahun || DEFAULT_TAHUN,
      stage: masterStage(attrs.stage),
    },
    { transaction: tx }
  );
  return row;
}

async function destroyMasterIfExists(indikatorIdRaw, tx) {
  const sid = String(indikatorIdRaw || "").trim();
  if (!sid) return;
  const idNum = toInt(sid);
  if (!idNum) return;
  await Indikator.destroy({ where: { id: idNum }, transaction: tx });
}

/* ---------- list (per periode) ---------- */

async function listIndikatorTujuan(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const where = { periode_id: periodeId };
  const misiRaw = query?.misi_id ?? query?.misiId;
  const misiInt = parseInt(String(misiRaw ?? ""), 10);
  if (!Number.isNaN(misiInt) && misiInt > 0) {
    where.misi_id = misiInt;
  }
  // Endpoint ini dipakai sebagai sumber dropdown Nama Indikator di Step Tujuan.
  // Tampilkan HANYA baris referensi impor (is_import_reference = true) sehingga
  // data final wizard tidak muncul ganda di dropdown, dan referensi impor tidak
  // terhitung sebagai final oleh generator kode.
  where.is_import_reference = true;
  const { count, rows } = await IndikatorTujuan.findAndCountAll({
    where,
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count, limit, offset };
}

async function listIndikatorSasaran(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const { count, rows } = await IndikatorSasaran.findAndCountAll({
    where: { periode_id: periodeId },
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count, limit, offset };
}

async function listIndikatorStrategi(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const { count, rows } = await IndikatorStrategi.findAndCountAll({
    where: { periode_id: periodeId },
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count, limit, offset };
}

async function listIndikatorArahKebijakan(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const { count, rows } = await IndikatorArahKebijakan.findAndCountAll({
    where: { periode_id: periodeId },
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count, limit, offset };
}

async function listIndikatorProgram(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const { count, rows } = await IndikatorProgram.findAndCountAll({
    include: [
      {
        model: IndikatorSasaran,
        as: "indikatorSasaran",
        attributes: [],
        where: { periode_id: periodeId },
        required: true,
      },
    ],
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    subQuery: false,
    raw: true,
    nest: false,
  });
  return { rows, total: count, limit, offset };
}

async function listIndikatorKegiatan(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const { count, rows } = await IndikatorKegiatan.findAndCountAll({
    include: [
      {
        model: IndikatorProgram,
        as: "indikatorProgram",
        required: true,
        attributes: [],
        include: [
          {
            model: IndikatorSasaran,
            as: "indikatorSasaran",
            attributes: [],
            where: { periode_id: periodeId },
            required: true,
          },
        ],
      },
    ],
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    subQuery: false,
    raw: true,
    nest: false,
  });
  return { rows, total: count, limit, offset };
}

async function listIndikatorSubKegiatan(periodeId, query) {
  const limit = clampLimit(query.limit);
  const offset = clampOffset(query.offset);
  const { count, rows } = await IndikatorSubKegiatan.findAndCountAll({
    where: { periode_id: periodeId },
    order: [["kode_indikator", "ASC"]],
    limit,
    offset,
    raw: true,
  });
  return { rows, total: count, limit, offset };
}

/* ---------- shared field payloads ---------- */

const TARGET_KEYS = ["target_tahun_1", "target_tahun_2", "target_tahun_3", "target_tahun_4", "target_tahun_5"];

/** Kolom tambahan sheet `indikatortujuans` / template Excel (selain core + target). */
const INDIKATOR_TUJUAN_EXTRA_KEYS = [
  "jenis",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "definisi_operasional",
  "metode_penghitungan",
  "baseline",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "sumber_data",
  "penanggung_jawab",
  "keterangan",
];

function pickIndikatorTujuanExtra(body) {
  const b0 = body || {};
  /* Template Excel / pratinjau: kolom `indikator_kinerja` → field DB `jenis`. */
  const b =
    (b0.jenis === undefined || b0.jenis === null || String(b0.jenis).trim() === "") &&
    b0.indikator_kinerja != null &&
    String(b0.indikator_kinerja).trim() !== ""
      ? { ...b0, jenis: b0.indikator_kinerja }
      : b0;
  const out = {};
  for (const k of INDIKATOR_TUJUAN_EXTRA_KEYS) {
    if (b[k] === undefined) continue;
    const raw = b[k];
    if (raw === null || raw === "") {
      out[k] = null;
      continue;
    }
    if (k === "penanggung_jawab") out[k] = str(raw, 255) || null;
    else out[k] = str(raw, 65535) || null;
  }
  syncIndikatorKinerjaFromJenis(out);
  return out;
}

function pickIndikatorCore(body) {
  const b = body || {};
  const { jenis_dokumen, tahun } = jenisTahunDefaults(b);
  const core = {
    kode_indikator: str(b.kode_indikator, 100),
    nama_indikator: str(b.nama_indikator, 65535),
    satuan: str(b.satuan, 50) || null,
    jenis_indikator: b.jenis_indikator === "Kualitatif" ? "Kualitatif" : "Kuantitatif",
    jenis_dokumen,
    tahun,
  };
  for (const k of TARGET_KEYS) {
    if (b[k] !== undefined) core[k] = str(b[k], 100) || null;
  }
  return core;
}

/** Hasil upsert impor: dipakai `applyPreview` untuk bedakan baris baru vs update (bukan bohong «semua sisip»). */
function attachImportMeta(row, op, extra) {
  if (!row || typeof row !== "object") return row;
  return { ...row, __importMeta: { op, ...(extra || {}) } };
}

function isMysqlDuplicateKodeIndikator(err) {
  if (!err) return false;
  if (err.name === "SequelizeUniqueConstraintError") return true;
  const parent = err.parent || err.original;
  if (parent && parent.code === "ER_DUP_ENTRY") return true;
  const msg = `${String(err.message || "")} ${String(parent && parent.sqlMessage ? parent.sqlMessage : "")}`;
  return /uniq_kode_indikator_rpjmd_import|Duplicate entry.*kode_indikator/i.test(msg);
}

async function findIndikatorTujuanForImportUpsert(pid, body, transaction) {
  const b = body || {};
  const kode = str(b.kode_indikator, 100);
  if (!kode || !String(kode).trim()) return null;
  const tid = toInt(b.tujuan_id);
  if (!tid) return null;
  const core = pickIndikatorCore(b);
  const variants = jenisDokumenVariants(core.jenis_dokumen);
  const where = {
    kode_indikator: String(kode).trim(),
    periode_id: pid,
    tujuan_id: tid,
    jenis_dokumen: { [Op.in]: variants },
    // Hanya cari baris referensi — jangan sentuh baris final yang sudah dipromote wizard
    is_import_reference: true,
  };
  const th = core.tahun != null && String(core.tahun).trim() !== "" ? String(core.tahun).trim() : null;
  if (th) where.tahun = th;
  return IndikatorTujuan.findOne({ where, transaction });
}

/* ---------- CRUD: Tujuan ---------- */

async function findOwnedTujuan(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  if (!rid) {
    const e = new Error("ID baris tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const row = await IndikatorTujuan.findOne({
    where: { id: rid, periode_id: pid },
    transaction: tx,
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorTujuan(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const tujuan_id = toInt(b.tujuan_id);
  if (!tujuan_id) {
    const e = new Error("tujuan_id wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const tujuan = await Tujuan.findByPk(tujuan_id, { transaction: tx });
  if (!tujuan || toInt(tujuan.periode_id) !== pid) {
    const e = new Error("Tujuan tidak ditemukan atau tidak termasuk periode ini.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const misi_id = toInt(tujuan.misi_id);
  if (!misi_id) {
    const e = new Error("misi_id pada tujuan tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const core = pickIndikatorCore(b);
  if (!core.kode_indikator || !String(core.kode_indikator).trim()) {
    const e = new Error("kode_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (!core.nama_indikator || !String(core.nama_indikator).trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  await assertUniqueKodePeriodeJenis(IndikatorTujuan, pid, core.jenis_dokumen, core.kode_indikator, null, {
    transaction: tx,
    tujuan_id,
    tahun: core.tahun,
  });
  const extra = pickIndikatorTujuanExtra(b);
  const payload = {
    ...core,
    ...extra,
    periode_id: pid,
    misi_id,
    tujuan_id,
    tipe_indikator: "Impact",
    rkpd_id: toInt(b.rkpd_id) || null,
    // Hormati flag dari pemanggil (upsertIndikatorTujuanImport = true, wizard = false/default)
    is_import_reference: b.is_import_reference === true ? true : false,
    // Prefix kode tujuan dari import Excel (mis. "T1-01") — hanya untuk baris referensi impor
    reference_target_code: b.is_import_reference === true && b.reference_target_code
      ? String(b.reference_target_code).slice(0, 50)
      : null,
  };
  syncIndikatorKinerjaFromJenis(payload);
  const row = await IndikatorTujuan.create(payload, { transaction: tx });
  return row.get({ plain: true });
}

async function updateIndikatorTujuan(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedTujuan(periodeId, id, { transaction: tx });
  const merged = {
    ...pickIndikatorCore(body),
    ...pickIndikatorTujuanExtra(body),
  };
  if (body.rkpd_id !== undefined) {
    merged.rkpd_id =
      body.rkpd_id === "" || body.rkpd_id === null ? null : toInt(body.rkpd_id) || null;
  }
  syncIndikatorKinerjaFromJenis(merged);
  const data = pickDefined(merged, [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
    ...INDIKATOR_TUJUAN_EXTRA_KEYS,
    "indikator_kinerja",
    "rkpd_id",
  ]);
  if (data.kode_indikator !== undefined && (!data.kode_indikator || !String(data.kode_indikator).trim())) {
    const e = new Error("kode_indikator tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (data.nama_indikator !== undefined && (!data.nama_indikator || !String(data.nama_indikator).trim())) {
    const e = new Error("nama_indikator tidak boleh kosong.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  data.tipe_indikator = "Impact";
  // Teruskan flag is_import_reference jika disertakan pemanggil (mis. upsertIndikatorTujuanImport = true)
  if (body.is_import_reference !== undefined) {
    data.is_import_reference = body.is_import_reference === true ? true : false;
  }
  // Teruskan reference_target_code hanya untuk baris referensi impor
  if (body.reference_target_code !== undefined) {
    const isRef = body.is_import_reference === true ||
      (body.is_import_reference === undefined && row.get("is_import_reference"));
    data.reference_target_code = isRef && body.reference_target_code
      ? String(body.reference_target_code).slice(0, 50)
      : null;
  }
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    const tidUnik = toInt(data.tujuan_id !== undefined ? data.tujuan_id : row.get("tujuan_id"));
    const thUnik = data.tahun !== undefined ? data.tahun : row.get("tahun");
    await assertUniqueKodePeriodeJenis(IndikatorTujuan, pid, mergedJenis, mergedKode, row.id, {
      transaction: tx,
      tujuan_id: tidUnik,
      tahun: thUnik,
    });
  }
  await row.update(data, { transaction: tx });
  return row.get({ plain: true });
}

/**
 * Impor Excel: update hanya jika kode + tujuan + tahun + jenis sama dengan baris yang ada.
 * Tanpa `tujuan_id` di lookup, kode yang sama di tujuan berbeda akan menimpa baris lain
 * (gejala: pratinjau 6, «disisipkan» 6, DB hanya 3).
 */
async function upsertIndikatorTujuanImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  // Semua baris dari alur impor wajib bertanda referensi — TIDAK pernah menjadi data final
  const b = { ...(body || {}), is_import_reference: true };
  const kode = str(b.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    const row = await createIndikatorTujuan(periodeId, b, opts);
    return attachImportMeta(row, "create");
  }
  const found = await findIndikatorTujuanForImportUpsert(pid, b, tx);
  if (!found) {
    // Periksa apakah sudah ada baris FINAL dengan kunci yang sama.
    // Jika ya, lewati — baris impor sudah dipromote wizard; jangan timpa.
    const coreCheck = pickIndikatorCore(b);
    const variantsCheck = jenisDokumenVariants(coreCheck.jenis_dokumen);
    const thCheck = coreCheck.tahun != null && String(coreCheck.tahun).trim() !== ""
      ? String(coreCheck.tahun).trim()
      : null;
    const finalWhere = {
      kode_indikator: String(str(b.kode_indikator, 100)).trim(),
      periode_id: pid,
      tujuan_id: toInt(b.tujuan_id),
      jenis_dokumen: { [Op.in]: variantsCheck },
      is_import_reference: false,
    };
    if (thCheck) finalWhere.tahun = thCheck;
    const existingFinal = await IndikatorTujuan.findOne({ where: finalWhere, transaction: tx });
    if (existingFinal) {
      // Baris sudah jadi data final — kembalikan baris tersebut tanpa perubahan
      return attachImportMeta(existingFinal.get({ plain: true }), "skipped_already_final");
    }
    try {
      const row = await createIndikatorTujuan(periodeId, b, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...b };
        delete b2.kode_indikator;
        await allocateKodeTujuanGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorTujuan(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  // Pastikan baris yang diperbarui tetap bertanda referensi
  const row = await updateIndikatorTujuan(periodeId, found.id, { ...b, is_import_reference: true }, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorTujuan(periodeId, id) {
  const row = await findOwnedTujuan(periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

/* ---------- CRUD: Sasaran (+ master indikator) ---------- */

async function findOwnedSasaran(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  const row = await IndikatorSasaran.findOne({
    where: { id: rid, periode_id: pid },
    transaction: tx,
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorSasaran(periodeId, body, opts = {}) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const sasaran_id = toInt(b.sasaran_id);
  if (!sasaran_id) {
    const e = new Error("sasaran_id wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const core = pickIndikatorCore(b);
  if (!core.nama_indikator?.trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const _TIPE_ALLOWED = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];
  const _tipeRaw = str(b.tipe_indikator, 32);
  const _tipeResolved = _TIPE_ALLOWED.includes(_tipeRaw) ? _tipeRaw : "Impact";
  return runInOptionalTransaction(opts.transaction, async (tx) => {
    const sasaran = await Sasaran.findByPk(sasaran_id, {
      transaction: tx,
      include: [{ model: Tujuan, as: "Tujuan" }],
    });
    if (!sasaran || toInt(sasaran.periode_id) !== pid) {
      const e = new Error("Sasaran tidak ditemukan atau tidak termasuk periode ini.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const tujuan_id = toInt(sasaran.tujuan_id);
    if (!tujuan_id) {
      const e = new Error("Indikator sasaran harus merujuk sasaran yang memiliki tujuan_id.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const misi_id = toInt(sasaran.Tujuan?.misi_id);
    if (!misi_id) {
      const e = new Error("Rantai misi pada sasaran tidak lengkap.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kodeHolder = { ...core, sasaran_id };
    if (!String(kodeHolder.kode_indikator || "").trim()) {
      await allocateKodeSasaranGroup([kodeHolder]);
      core.kode_indikator = kodeHolder.kode_indikator;
    }
    if (!String(core.kode_indikator || "").trim()) {
      const e = new Error(
        "kode_indikator tidak dapat dibuat otomatis (pastikan Sasaran memiliki nomor / relasi sasaran valid).",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    await assertUniqueKodePeriodeJenis(IndikatorSasaran, pid, core.jenis_dokumen, core.kode_indikator, null, { transaction: tx });
    const master = await createMasterIndikator(tx, {
      misi_id,
      tujuan_id,
      sasaran_id,
      kode_indikator: core.kode_indikator,
      nama_indikator: core.nama_indikator,
      satuan: core.satuan,
      jenis_indikator: core.jenis_indikator,
      tipe_indikator: _tipeResolved,
      jenis_dokumen: core.jenis_dokumen,
      tahun: core.tahun,
      stage: "sasaran",
    });
    const extra = pickIndikatorTujuanExtra(b);
    const row = await IndikatorSasaran.create(
      {
        ...core,
        ...extra,
        periode_id: pid,
        indikator_id: String(master.id),
        tujuan_id,
        sasaran_id,
        tipe_indikator: _tipeResolved,
        rkpd_id: toInt(b.rkpd_id) || null,
      },
      { transaction: tx },
    );
    return row.get({ plain: true });
  });
}

async function updateIndikatorSasaran(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedSasaran(periodeId, id, { transaction: tx });
  const data = pickDefined(pickIndikatorCore(body), [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
  ]);
  Object.assign(data, pickIndikatorTujuanExtra(body));
  const _TIPE_ALLOWED_UPD = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];
  const _tipeRawUpd = str((body || {}).tipe_indikator, 32);
  data.tipe_indikator = _TIPE_ALLOWED_UPD.includes(_tipeRawUpd) ? _tipeRawUpd : "Impact";
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    await assertUniqueKodePeriodeJenis(IndikatorSasaran, pid, mergedJenis, mergedKode, row.id, { transaction: tx });
  }
  await row.update(data, { transaction: tx });
  const plain = row.get({ plain: true });
  const mid = toInt(plain.indikator_id);
  if (mid) {
    await Indikator.update(
      {
        kode_indikator: data.kode_indikator ?? undefined,
        nama_indikator: data.nama_indikator ?? undefined,
        satuan: data.satuan ?? undefined,
        jenis_indikator: data.jenis_indikator ? masterJenisLower(data.jenis_indikator) : undefined,
        tipe_indikator: data.tipe_indikator,
        jenis_dokumen: data.jenis_dokumen,
        tahun: data.tahun,
      },
      { where: { id: mid }, transaction: tx }
    );
  }
  return row.get({ plain: true });
}

async function upsertIndikatorSasaranImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const kode = str(body?.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    const row = await createIndikatorSasaran(periodeId, body, opts);
    return attachImportMeta(row, "create");
  }
  const sid = toInt(body.sasaran_id);
  const core = pickIndikatorCore(body);
  const variants = jenisDokumenVariants(core.jenis_dokumen);
  const where = {
    kode_indikator: String(kode).trim(),
    periode_id: pid,
    jenis_dokumen: { [Op.in]: variants },
  };
  if (sid) where.sasaran_id = sid;
  const found = await IndikatorSasaran.findOne({ where, transaction: tx });
  if (!found) {
    try {
      const row = await createIndikatorSasaran(periodeId, body, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...body };
        delete b2.kode_indikator;
        await allocateKodeSasaranGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorSasaran(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  const row = await updateIndikatorSasaran(periodeId, found.id, body, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorSasaran(periodeId, id) {
  const row = await findOwnedSasaran(periodeId, id);
  const indId = row.indikator_id;
  const tx = await sequelize.transaction();
  try {
    await row.destroy({ transaction: tx });
    await destroyMasterIfExists(indId, tx);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return { deleted: true, id: toInt(id) };
}

/* ---------- CRUD: Strategi ---------- */

async function findOwnedStrategi(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  const row = await IndikatorStrategi.findOne({
    where: { id: rid, periode_id: pid },
    transaction: tx,
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorStrategi(periodeId, body, opts = {}) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const strategi_id = toInt(b.strategi_id);
  if (!strategi_id) {
    const e = new Error("strategi_id wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const core = pickIndikatorCore(b);
  if (!core.nama_indikator?.trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const tipe = str(b.tipe_indikator, 32);
  const allowed = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];
  const tipe_indikator = allowed.includes(tipe) ? tipe : "Impact";
  return runInOptionalTransaction(opts.transaction, async (tx) => {
    const st = await Strategi.findByPk(strategi_id, {
      transaction: tx,
      include: [{ model: Sasaran, as: "Sasaran", include: [{ model: Tujuan, as: "Tujuan" }] }],
    });
    /**
     * Banyak data `strategi.periode_id` kosong di DB; keabsahan periode cukup dari sasaran induk
     * (sama hierarki dengan impor lain). Tetap terima jika `strategi.periode_id` cocok dengan pid.
     */
    const viaStrategi = toInt(st.periode_id) === pid;
    const viaSasaran = toInt(st.Sasaran?.periode_id) === pid;
    if (!st || (!viaStrategi && !viaSasaran)) {
      const e = new Error("Strategi tidak ditemukan atau tidak termasuk periode ini.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const sasaran_id = toInt(st.sasaran_id);
    if (!sasaran_id) {
      const e = new Error("Indikator strategi harus merujuk strategi yang memiliki sasaran_id.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const tujuan_id = toInt(st.Sasaran?.tujuan_id);
    const misi_id = toInt(st.Sasaran?.Tujuan?.misi_id);
    if (!misi_id) {
      const e = new Error("Rantai hierarki strategi tidak lengkap (misi).");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kodeHolder = { ...core, strategi_id };
    if (!String(kodeHolder.kode_indikator || "").trim()) {
      await allocateKodeStrategiGroup([kodeHolder]);
      core.kode_indikator = kodeHolder.kode_indikator;
    }
    if (!String(core.kode_indikator || "").trim()) {
      const e = new Error(
        "kode_indikator tidak dapat dibuat otomatis (pastikan Strategi memiliki kode_strategi / relasi valid).",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    await assertUniqueKodePeriodeJenis(IndikatorStrategi, pid, core.jenis_dokumen, core.kode_indikator, null, { transaction: tx });
    const master = await createMasterIndikator(tx, {
      misi_id,
      tujuan_id,
      sasaran_id,
      kode_indikator: core.kode_indikator,
      nama_indikator: core.nama_indikator,
      satuan: core.satuan,
      jenis_indikator: core.jenis_indikator,
      tipe_indikator: tipe_indikator,
      jenis_dokumen: core.jenis_dokumen,
      tahun: core.tahun,
      stage: "sasaran",
    });
    const extra = pickIndikatorTujuanExtra(b);
    const pj = toInt(extra.penanggung_jawab ?? b.penanggung_jawab);
    delete extra.penanggung_jawab;
    const row = await IndikatorStrategi.create(
      {
        ...core,
        ...extra,
        periode_id: pid,
        indikator_id: String(master.id),
        strategi_id,
        sasaran_id: sasaran_id || null,
        tujuan_id: tujuan_id || null,
        misi_id,
        tipe_indikator: tipe_indikator,
        penanggung_jawab: Number.isFinite(pj) && pj > 0 ? pj : null,
      },
      { transaction: tx },
    );
    return row.get({ plain: true });
  });
}

async function updateIndikatorStrategi(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedStrategi(periodeId, id, { transaction: tx });
  const b = body || {};
  const data = pickDefined(pickIndikatorCore(b), [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
  ]);
  const extraUpdSt = pickIndikatorTujuanExtra(b);
  const pjSt = toInt(extraUpdSt.penanggung_jawab ?? b.penanggung_jawab);
  delete extraUpdSt.penanggung_jawab;
  Object.assign(data, extraUpdSt);
  if (Number.isFinite(pjSt) && pjSt > 0) data.penanggung_jawab = pjSt;
  const tipe = str(b.tipe_indikator, 32);
  const allowed = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];
  data.tipe_indikator = allowed.includes(tipe) ? tipe : "Impact";
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    await assertUniqueKodePeriodeJenis(IndikatorStrategi, pid, mergedJenis, mergedKode, row.id, { transaction: tx });
  }
  await row.update(data, { transaction: tx });
  const plain = row.get({ plain: true });
  const mid = toInt(plain.indikator_id);
  if (mid) {
    await Indikator.update(
      {
        kode_indikator: data.kode_indikator,
        nama_indikator: data.nama_indikator,
        satuan: data.satuan,
        jenis_indikator: data.jenis_indikator ? masterJenisLower(data.jenis_indikator) : undefined,
        tipe_indikator: data.tipe_indikator || masterTipe(b.tipe_indikator),
        jenis_dokumen: data.jenis_dokumen,
        tahun: data.tahun,
      },
      { where: { id: mid }, transaction: tx }
    );
  }
  return row.get({ plain: true });
}

async function upsertIndikatorStrategiImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const kode = str(body?.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    const row = await createIndikatorStrategi(periodeId, body, opts);
    return attachImportMeta(row, "create");
  }
  const stid = toInt(body.strategi_id);
  const core = pickIndikatorCore(body);
  const variants = jenisDokumenVariants(core.jenis_dokumen);
  const where = {
    kode_indikator: String(kode).trim(),
    periode_id: pid,
    jenis_dokumen: { [Op.in]: variants },
  };
  if (stid) where.strategi_id = stid;
  const found = await IndikatorStrategi.findOne({ where, transaction: tx });
  if (!found) {
    try {
      const row = await createIndikatorStrategi(periodeId, body, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...body };
        delete b2.kode_indikator;
        await allocateKodeStrategiGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorStrategi(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  const row = await updateIndikatorStrategi(periodeId, found.id, body, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorStrategi(periodeId, id) {
  const row = await findOwnedStrategi(periodeId, id);
  const indId = row.indikator_id;
  const tx = await sequelize.transaction();
  try {
    await row.destroy({ transaction: tx });
    await destroyMasterIfExists(indId, tx);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return { deleted: true, id: toInt(id) };
}

/* ---------- CRUD: Arah kebijakan ---------- */

async function findOwnedArah(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  const row = await IndikatorArahKebijakan.findOne({
    where: { id: rid, periode_id: pid },
    transaction: tx,
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorArahKebijakan(periodeId, body, opts = {}) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const arah_kebijakan_id = toInt(b.arah_kebijakan_id);
  if (!arah_kebijakan_id) {
    const e = new Error("arah_kebijakan_id wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const core = pickIndikatorCore(b);
  if (!core.nama_indikator?.trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const tipe = str(b.tipe_indikator, 32);
  const allowed = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];
  const tipe_indikator = allowed.includes(tipe) ? tipe : "Impact";
  return runInOptionalTransaction(opts.transaction, async (tx) => {
    const arahRow = await ArahKebijakan.findByPk(arah_kebijakan_id, {
      transaction: tx,
      include: [{ model: Strategi, as: "Strategi", include: [{ model: Sasaran, as: "Sasaran", include: [{ model: Tujuan, as: "Tujuan" }] }] }],
    });
    const viaArah = toInt(arahRow?.periode_id) === pid;
    const viaStrategi = toInt(arahRow?.Strategi?.periode_id) === pid;
    const viaSasaran = toInt(arahRow?.Strategi?.Sasaran?.periode_id) === pid;
    if (!arahRow || (!viaArah && !viaStrategi && !viaSasaran)) {
      const e = new Error("Arah kebijakan tidak ditemukan atau tidak termasuk periode ini.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const strategi_id = toInt(arahRow.strategi_id);
    if (!strategi_id) {
      const e = new Error("Indikator arah kebijakan harus merujuk arah kebijakan yang memiliki strategi_id.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const st = arahRow.Strategi;
    const sasaran_id = toInt(st?.sasaran_id);
    const tujuan_id = toInt(st?.Sasaran?.tujuan_id);
    const misi_id = toInt(st?.Sasaran?.Tujuan?.misi_id);
    if (!misi_id) {
      const e = new Error("Rantai hierarki arah kebijakan tidak lengkap (misi).");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kodeHolder = { ...core, arah_kebijakan_id };
    if (!String(kodeHolder.kode_indikator || "").trim()) {
      await allocateKodeArahGroup([kodeHolder]);
      core.kode_indikator = kodeHolder.kode_indikator;
    }
    if (!String(core.kode_indikator || "").trim()) {
      const e = new Error(
        "kode_indikator tidak dapat dibuat otomatis (pastikan Arah Kebijakan memiliki kode_arah / relasi valid).",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    await assertUniqueKodePeriodeJenis(IndikatorArahKebijakan, pid, core.jenis_dokumen, core.kode_indikator, null, { transaction: tx });
    const master = await createMasterIndikator(tx, {
      misi_id,
      tujuan_id,
      sasaran_id,
      kode_indikator: core.kode_indikator,
      nama_indikator: core.nama_indikator,
      satuan: core.satuan,
      jenis_indikator: core.jenis_indikator,
      tipe_indikator: tipe_indikator,
      jenis_dokumen: core.jenis_dokumen,
      tahun: core.tahun,
      stage: "sasaran",
    });
    const extra = pickIndikatorTujuanExtra(b);
    const pj = toInt(extra.penanggung_jawab ?? b.penanggung_jawab);
    delete extra.penanggung_jawab;
    const row = await IndikatorArahKebijakan.create(
      {
        ...core,
        ...extra,
        periode_id: pid,
        indikator_id: String(master.id),
        arah_kebijakan_id,
        strategi_id: strategi_id || null,
        sasaran_id: sasaran_id || null,
        tujuan_id: tujuan_id || null,
        misi_id,
        tipe_indikator: tipe_indikator,
        penanggung_jawab: Number.isFinite(pj) && pj > 0 ? pj : null,
      },
      { transaction: tx },
    );
    return row.get({ plain: true });
  });
}

async function updateIndikatorArahKebijakan(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedArah(periodeId, id, { transaction: tx });
  const b = body || {};
  const data = pickDefined(pickIndikatorCore(b), [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
  ]);
  const extraUpdAk = pickIndikatorTujuanExtra(b);
  const pjAk = toInt(extraUpdAk.penanggung_jawab ?? b.penanggung_jawab);
  delete extraUpdAk.penanggung_jawab;
  Object.assign(data, extraUpdAk);
  if (Number.isFinite(pjAk) && pjAk > 0) data.penanggung_jawab = pjAk;
  const tipe = str(b.tipe_indikator, 32);
  const allowed = ["Outcome", "Output", "Impact", "Process", "Input", "Proses"];
  data.tipe_indikator = allowed.includes(tipe) ? tipe : "Impact";
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    await assertUniqueKodePeriodeJenis(IndikatorArahKebijakan, pid, mergedJenis, mergedKode, row.id, { transaction: tx });
  }
  await row.update(data, { transaction: tx });
  const plain = row.get({ plain: true });
  const mid = toInt(plain.indikator_id);
  if (mid) {
    await Indikator.update(
      {
        kode_indikator: data.kode_indikator,
        nama_indikator: data.nama_indikator,
        satuan: data.satuan,
        jenis_indikator: data.jenis_indikator ? masterJenisLower(data.jenis_indikator) : undefined,
        tipe_indikator: data.tipe_indikator || masterTipe(b.tipe_indikator),
        jenis_dokumen: data.jenis_dokumen,
        tahun: data.tahun,
      },
      { where: { id: mid }, transaction: tx }
    );
  }
  return row.get({ plain: true });
}

async function upsertIndikatorArahKebijakanImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const kode = str(body?.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    const row = await createIndikatorArahKebijakan(periodeId, body, opts);
    return attachImportMeta(row, "create");
  }
  const akid = toInt(body.arah_kebijakan_id);
  const core = pickIndikatorCore(body);
  const variants = jenisDokumenVariants(core.jenis_dokumen);
  const where = {
    kode_indikator: String(kode).trim(),
    periode_id: pid,
    jenis_dokumen: { [Op.in]: variants },
  };
  if (akid) where.arah_kebijakan_id = akid;
  const found = await IndikatorArahKebijakan.findOne({ where, transaction: tx });
  if (!found) {
    try {
      const row = await createIndikatorArahKebijakan(periodeId, body, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...body };
        delete b2.kode_indikator;
        await allocateKodeArahGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorArahKebijakan(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  const row = await updateIndikatorArahKebijakan(periodeId, found.id, body, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorArahKebijakan(periodeId, id) {
  const row = await findOwnedArah(periodeId, id);
  const indId = row.indikator_id;
  const tx = await sequelize.transaction();
  try {
    await row.destroy({ transaction: tx });
    await destroyMasterIfExists(indId, tx);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return { deleted: true, id: toInt(id) };
}

/* ---------- CRUD: Program ---------- */

async function findOwnedProgram(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  const row = await IndikatorProgram.findOne({
    where: { id: rid },
    transaction: tx,
    include: [
      {
        model: IndikatorSasaran,
        as: "indikatorSasaran",
        attributes: ["id", "periode_id"],
        where: { periode_id: pid },
        required: true,
      },
    ],
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorProgram(periodeId, body, opts = {}) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const indSasaranId = toInt(b.indikator_sasaran_id);
  if (!indSasaranId) {
    const e = new Error("Indikator program harus memiliki indikator_sasaran_id (pilih indikator sasaran).");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const core = pickIndikatorCore(b);
  if (!core.nama_indikator?.trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  return runInOptionalTransaction(opts.transaction, async (tx) => {
    const indSas = await IndikatorSasaran.findOne({ where: { id: indSasaranId, periode_id: pid }, transaction: tx });
    if (!indSas) {
      const e = new Error("Indikator sasaran tidak ditemukan untuk periode ini.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kodeHolder = {
      ...core,
      indikator_sasaran_id: indSasaranId,
    };
    if (!String(kodeHolder.kode_indikator || "").trim()) {
      await allocateKodeProgramGroup([kodeHolder]);
      core.kode_indikator = kodeHolder.kode_indikator;
    }
    if (!String(core.kode_indikator || "").trim()) {
      const e = new Error(
        "kode_indikator tidak dapat dibuat otomatis (pastikan baris indikator sasaran memiliki kode_indikator).",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    await assertUniqueKodePeriodeJenis(IndikatorProgram, pid, core.jenis_dokumen, core.kode_indikator, null, { transaction: tx });
    const extra = pickIndikatorTujuanExtra(b);
    const rowData = {
      ...core,
      ...extra,
      sasaran_id: indSasaranId,
      tipe_indikator: "Output",
    };
    delete rowData.program_id;
    const row = await IndikatorProgram.create(rowData, { transaction: tx });
    return row.get({ plain: true });
  });
}

async function updateIndikatorProgram(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedProgram(periodeId, id, { transaction: tx });
  const data = pickDefined(pickIndikatorCore(body), [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
  ]);
  Object.assign(data, pickIndikatorTujuanExtra(body));
  if (body.program_id !== undefined) data.program_id = toInt(body.program_id) || null;
  if (body.indikator_sasaran_id !== undefined) {
    const sid = toInt(body.indikator_sasaran_id);
    if (sid) {
      const indSas = await IndikatorSasaran.findOne({ where: { id: sid, periode_id: pid }, transaction: tx });
      if (!indSas) {
        const e = new Error("Indikator sasaran tidak ditemukan untuk periode ini.");
        e.code = "BAD_REQUEST";
        throw e;
      }
      data.sasaran_id = sid;
    }
  }
  data.tipe_indikator = "Output";
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    await assertUniqueKodePeriodeJenis(IndikatorProgram, pid, mergedJenis, mergedKode, row.id, { transaction: tx });
  }
  await row.update(data, { transaction: tx });
  return row.get({ plain: true });
}

async function upsertIndikatorProgramImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const kode = str(body?.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    // Idempotent import: bila kode tidak diisi (auto-generate), coba update baris existing berbasis parent + nama indikator.
    const core = pickIndikatorCore(body);
    const variants = jenisDokumenVariants(core.jenis_dokumen);
    const indSid = toInt(body.indikator_sasaran_id);
    const nama = str(body?.nama_indikator, 65535);
    if (indSid && nama && String(nama).trim()) {
      const foundByName = await IndikatorProgram.findOne({
        where: {
          sasaran_id: indSid,
          nama_indikator: String(nama).trim(),
          jenis_dokumen: { [Op.in]: variants },
          tahun: core.tahun,
        },
        transaction: tx,
        subQuery: false,
        include: [
          {
            model: IndikatorSasaran,
            as: "indikatorSasaran",
            attributes: ["id", "periode_id"],
            where: { periode_id: pid },
            required: true,
          },
        ],
        order: [["id", "ASC"]],
      });
      if (foundByName) {
        const row0 = await updateIndikatorProgram(periodeId, foundByName.id, body, opts);
        return attachImportMeta(row0, "update", { matchedBy: "parent+nama" });
      }
    }
    const row = await createIndikatorProgram(periodeId, body, opts);
    return attachImportMeta(row, "create");
  }
  const indSid = toInt(body.indikator_sasaran_id);
  const whereProg = { kode_indikator: String(kode).trim() };
  if (indSid) whereProg.sasaran_id = indSid;
  const found = await IndikatorProgram.findOne({
    where: whereProg,
    transaction: tx,
    subQuery: false,
    include: [
      {
        model: IndikatorSasaran,
        as: "indikatorSasaran",
        attributes: ["id", "periode_id"],
        where: { periode_id: pid },
        required: true,
      },
    ],
  });
  if (!found) {
    try {
      const row = await createIndikatorProgram(periodeId, body, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...body };
        delete b2.kode_indikator;
        await allocateKodeProgramGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorProgram(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  const row = await updateIndikatorProgram(periodeId, found.id, body, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorProgram(periodeId, id) {
  const row = await findOwnedProgram(periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

/* ---------- CRUD: Kegiatan ---------- */

async function findOwnedKegiatan(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  const row = await IndikatorKegiatan.findOne({
    where: { id: rid },
    transaction: tx,
    include: [
      {
        model: IndikatorProgram,
        as: "indikatorProgram",
        required: true,
        include: [
          {
            model: IndikatorSasaran,
            as: "indikatorSasaran",
            attributes: ["periode_id"],
            where: { periode_id: pid },
            required: true,
          },
        ],
      },
    ],
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorKegiatan(periodeId, body, opts = {}) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const core = pickIndikatorCore(b);
  if (!core.nama_indikator?.trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  return runInOptionalTransaction(opts.transaction, async (tx) => {
    let indProgId = toInt(b.indikator_program_id);
    /**
     * Form impor / modal selaras indikator program: `indikator_sasaran_id` saja —
     * pilih satu baris indikator program pertama untuk indikator sasaran tersebut (periode sama).
     */
    if (!indProgId && toInt(b.indikator_sasaran_id)) {
      const isid = toInt(b.indikator_sasaran_id);
      const firstProg = await IndikatorProgram.findOne({
        where: { sasaran_id: isid },
        include: [
          {
            model: IndikatorSasaran,
            as: "indikatorSasaran",
            attributes: ["id"],
            where: { periode_id: pid },
            required: true,
          },
        ],
        order: [["id", "ASC"]],
        transaction: tx,
      });
      indProgId = firstProg ? toInt(firstProg.id) : null;
    }
    if (!indProgId) {
      const e = new Error(
        "Indikator kegiatan memerlukan indikator_program_id atau indikator_sasaran_id yang memiliki indikator program di basis data.",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    const progRow = await IndikatorProgram.findOne({
      where: { id: indProgId },
      transaction: tx,
      subQuery: false,
      include: [
        {
          model: IndikatorSasaran,
          as: "indikatorSasaran",
          where: { periode_id: pid },
          required: true,
        },
      ],
    });
    if (!progRow) {
      const e = new Error("Indikator program tidak ditemukan untuk periode ini.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kodeHolder = {
      ...core,
      indikator_program_id: indProgId,
    };
    const kid = toInt(b.kegiatan_id);
    if (kid) kodeHolder.kegiatan_id = kid;
    if (!String(kodeHolder.kode_indikator || "").trim()) {
      await allocateKodeKegiatanGroup([kodeHolder]);
      core.kode_indikator = kodeHolder.kode_indikator;
    }
    if (!String(core.kode_indikator || "").trim()) {
      const e = new Error(
        "kode_indikator tidak dapat dibuat otomatis (pastikan indikator program memiliki kode atau isi kode manual).",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    await assertUniqueKodePeriodeJenis(IndikatorKegiatan, pid, core.jenis_dokumen, core.kode_indikator, null, {
      transaction: tx,
    });
    const extra = pickIndikatorTujuanExtra(b);
    const row = await IndikatorKegiatan.create(
      {
        ...core,
        ...extra,
        indikator_program_id: indProgId,
        tipe_indikator: "Proses",
        penanggung_jawab: toInt(b.penanggung_jawab) || null,
      },
      { transaction: tx },
    );
    return row.get({ plain: true });
  });
}

async function updateIndikatorKegiatan(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedKegiatan(periodeId, id, { transaction: tx });
  const data = pickDefined(pickIndikatorCore(body), [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
  ]);
  Object.assign(data, pickIndikatorTujuanExtra(body));
  data.tipe_indikator = "Proses";
  if (body.penanggung_jawab !== undefined) data.penanggung_jawab = toInt(body.penanggung_jawab) || null;
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    await assertUniqueKodePeriodeJenis(IndikatorKegiatan, pid, mergedJenis, mergedKode, row.id, { transaction: tx });
  }
  await row.update(data, { transaction: tx });
  return row.get({ plain: true });
}

async function upsertIndikatorKegiatanImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const kode = str(body?.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    // Idempotent import: bila kode tidak diisi (auto-generate), coba update baris existing berbasis parent + nama indikator.
    const core = pickIndikatorCore(body);
    const variants = jenisDokumenVariants(core.jenis_dokumen);
    const ipid = toInt(body.indikator_program_id);
    const nama = str(body?.nama_indikator, 65535);
    if (ipid && nama && String(nama).trim()) {
      const foundByName = await IndikatorKegiatan.findOne({
        where: {
          indikator_program_id: ipid,
          nama_indikator: String(nama).trim(),
          jenis_dokumen: { [Op.in]: variants },
          tahun: core.tahun,
        },
        transaction: tx,
        subQuery: false,
        include: [
          {
            model: IndikatorProgram,
            as: "indikatorProgram",
            required: true,
            attributes: [],
            include: [
              {
                model: IndikatorSasaran,
                as: "indikatorSasaran",
                attributes: ["id"],
                where: { periode_id: pid },
                required: true,
              },
            ],
          },
        ],
        order: [["id", "ASC"]],
      });
      if (foundByName) {
        const row0 = await updateIndikatorKegiatan(periodeId, foundByName.id, body, opts);
        return attachImportMeta(row0, "update", { matchedBy: "parent+nama" });
      }
    }
    const row = await createIndikatorKegiatan(periodeId, body, opts);
    return attachImportMeta(row, "create");
  }
  const ipid = toInt(body.indikator_program_id);
  const whereKeg = { kode_indikator: String(kode).trim() };
  if (ipid) whereKeg.indikator_program_id = ipid;
  const found = await IndikatorKegiatan.findOne({
    where: whereKeg,
    transaction: tx,
    subQuery: false,
    include: [
      {
        model: IndikatorProgram,
        as: "indikatorProgram",
        required: true,
        include: [
          {
            model: IndikatorSasaran,
            as: "indikatorSasaran",
            attributes: ["id"],
            where: { periode_id: pid },
            required: true,
          },
        ],
      },
    ],
  });
  if (!found) {
    try {
      const row = await createIndikatorKegiatan(periodeId, body, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...body };
        delete b2.kode_indikator;
        await allocateKodeKegiatanGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorKegiatan(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  const row = await updateIndikatorKegiatan(periodeId, found.id, body, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorKegiatan(periodeId, id) {
  const row = await findOwnedKegiatan(periodeId, id);
  await row.destroy();
  return { deleted: true, id: toInt(id) };
}

/* ---------- CRUD: Sub kegiatan ---------- */

async function findOwnedSubKegiatan(periodeId, id, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const rid = toInt(id);
  const row = await IndikatorSubKegiatan.findOne({
    where: { id: rid, periode_id: pid },
    transaction: tx,
  });
  if (!row) {
    const e = new Error("Data tidak ditemukan untuk periode ini.");
    e.code = "NOT_FOUND";
    throw e;
  }
  return row;
}

async function createIndikatorSubKegiatan(periodeId, body, opts = {}) {
  const pid = assertPeriodeId(periodeId);
  const b = body || {};
  const core = pickIndikatorCore(b);
  if (!core.nama_indikator?.trim()) {
    const e = new Error("nama_indikator wajib diisi.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  const tipeRaw = str(b.tipe_indikator, 32);
  const allowed = ["Outcome", "Output", "Impact", "Process", "Input"];
  const tipe_indikator = allowed.includes(tipeRaw) ? tipeRaw : "Output";
  return runInOptionalTransaction(opts.transaction, async (tx) => {
    const extra = pickIndikatorTujuanExtra(b);
    let sub_kegiatan_id = toInt(b.sub_kegiatan_id);
    if (!sub_kegiatan_id && toInt(b.kegiatan_id)) {
      const kid = toInt(b.kegiatan_id);
      const firstSub = await SubKegiatan.findOne({
        where: { kegiatan_id: kid, periode_id: pid },
        order: [["id", "ASC"]],
        transaction: tx,
      });
      sub_kegiatan_id = firstSub ? toInt(firstSub.id) : null;
    }
    if (!sub_kegiatan_id) {
      const e = new Error(
        "Indikator sub kegiatan memerlukan sub_kegiatan_id atau kegiatan_id yang memiliki sub kegiatan di periode ini.",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    const sub = await SubKegiatan.findByPk(sub_kegiatan_id, {
      transaction: tx,
      include: [
        {
          model: Kegiatan,
          as: "kegiatan",
          include: [
            {
              model: Program,
              as: "program",
              include: [{ model: Sasaran, as: "sasaran", include: [{ model: Tujuan, as: "Tujuan" }] }],
            },
          ],
        },
      ],
    });
    if (!sub || toInt(sub.periode_id) !== pid) {
      const e = new Error("Sub kegiatan tidak ditemukan atau tidak termasuk periode ini.");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kegiatan_id = toInt(sub.kegiatan_id);
    const program_id = toInt(sub.kegiatan?.program_id);
    const sasaran_id = toInt(sub.kegiatan?.program?.sasaran_id);
    const tujuan_id = toInt(sub.kegiatan?.program?.sasaran?.tujuan_id);
    const misi_id = toInt(sub.kegiatan?.program?.sasaran?.Tujuan?.misi_id);
    if (!misi_id) {
      const e = new Error("Rantai hierarki sub kegiatan tidak lengkap (misi).");
      e.code = "BAD_REQUEST";
      throw e;
    }
    const kodeHolder = { ...core, sub_kegiatan_id };
    if (!String(kodeHolder.kode_indikator || "").trim()) {
      await allocateKodeSubKegiatanGroup([kodeHolder]);
      core.kode_indikator = kodeHolder.kode_indikator;
    }
    if (!String(core.kode_indikator || "").trim()) {
      const e = new Error(
        "kode_indikator tidak dapat dibuat otomatis (pastikan sub kegiatan memiliki kode_sub_kegiatan di basis data).",
      );
      e.code = "BAD_REQUEST";
      throw e;
    }
    await assertUniqueKodePeriodeJenis(IndikatorSubKegiatan, pid, core.jenis_dokumen, core.kode_indikator, null, {
      transaction: tx,
    });
    const master = await createMasterIndikator(tx, {
      misi_id,
      tujuan_id,
      sasaran_id,
      program_id,
      kegiatan_id,
      kode_indikator: core.kode_indikator,
      nama_indikator: core.nama_indikator,
      satuan: core.satuan,
      jenis_indikator: core.jenis_indikator,
      tipe_indikator: tipe_indikator,
      jenis_dokumen: core.jenis_dokumen,
      tahun: core.tahun,
      stage: "kegiatan",
    });
    const row = await IndikatorSubKegiatan.create(
      {
        ...core,
        ...extra,
        periode_id: pid,
        indikator_id: String(master.id),
        sub_kegiatan_id,
        kegiatan_id,
        program_id,
        sasaran_id,
        tujuan_id,
        misi_id,
        tipe_indikator: tipe_indikator,
        penanggung_jawab: toInt(b.penanggung_jawab) || null,
      },
      { transaction: tx },
    );
    return row.get({ plain: true });
  });
}

async function updateIndikatorSubKegiatan(periodeId, id, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const row = await findOwnedSubKegiatan(periodeId, id, { transaction: tx });
  const b = body || {};
  const data = pickDefined(pickIndikatorCore(b), [
    "kode_indikator",
    "nama_indikator",
    "satuan",
    "jenis_indikator",
    "jenis_dokumen",
    "tahun",
    ...TARGET_KEYS,
  ]);
  Object.assign(data, pickIndikatorTujuanExtra(b));
  const tipe = str(b.tipe_indikator, 32);
  const allowed = ["Outcome", "Output", "Impact", "Process", "Input"];
  if (tipe) data.tipe_indikator = allowed.includes(tipe) ? tipe : "Output";
  if (b.penanggung_jawab !== undefined) data.penanggung_jawab = toInt(b.penanggung_jawab) || null;
  const mergedJenis = data.jenis_dokumen !== undefined ? data.jenis_dokumen : row.get("jenis_dokumen");
  const mergedKode = data.kode_indikator !== undefined ? data.kode_indikator : row.get("kode_indikator");
  if (data.kode_indikator !== undefined || data.jenis_dokumen !== undefined) {
    await assertUniqueKodePeriodeJenis(IndikatorSubKegiatan, pid, mergedJenis, mergedKode, row.id, { transaction: tx });
  }
  await row.update(data, { transaction: tx });
  const plain = row.get({ plain: true });
  const mid = toInt(plain.indikator_id);
  if (mid) {
    await Indikator.update(
      {
        kode_indikator: data.kode_indikator,
        nama_indikator: data.nama_indikator,
        satuan: data.satuan,
        jenis_indikator: data.jenis_indikator ? masterJenisLower(data.jenis_indikator) : undefined,
        tipe_indikator: data.tipe_indikator || masterTipe(b.tipe_indikator),
        jenis_dokumen: data.jenis_dokumen,
        tahun: data.tahun,
      },
      { where: { id: mid }, transaction: tx }
    );
  }
  return row.get({ plain: true });
}

async function upsertIndikatorSubKegiatanImport(periodeId, body, opts = {}) {
  const tx = opts.transaction;
  const pid = assertPeriodeId(periodeId);
  const kode = str(body?.kode_indikator, 100);
  if (!kode || !String(kode).trim()) {
    // Idempotent import: bila kode tidak diisi (auto-generate), coba update baris existing berbasis sub_kegiatan_id + nama indikator.
    const core = pickIndikatorCore(body);
    const variants = jenisDokumenVariants(core.jenis_dokumen);
    const skid = toInt(body.sub_kegiatan_id);
    const nama = str(body?.nama_indikator, 65535);
    if (skid && nama && String(nama).trim()) {
      const foundByName = await IndikatorSubKegiatan.findOne({
        where: {
          sub_kegiatan_id: skid,
          periode_id: pid,
          nama_indikator: String(nama).trim(),
          jenis_dokumen: { [Op.in]: variants },
          tahun: core.tahun,
        },
        transaction: tx,
        order: [["id", "ASC"]],
      });
      if (foundByName) {
        const row0 = await updateIndikatorSubKegiatan(periodeId, foundByName.id, body, opts);
        return attachImportMeta(row0, "update", { matchedBy: "sub_kegiatan_id+nama" });
      }
    }
    const row = await createIndikatorSubKegiatan(periodeId, body, opts);
    return attachImportMeta(row, "create");
  }
  const skid = toInt(body.sub_kegiatan_id);
  const core = pickIndikatorCore(body);
  const variants = jenisDokumenVariants(core.jenis_dokumen);
  const whereSub = {
    kode_indikator: String(kode).trim(),
    periode_id: pid,
    jenis_dokumen: { [Op.in]: variants },
  };
  if (skid) whereSub.sub_kegiatan_id = skid;
  const found = await IndikatorSubKegiatan.findOne({ where: whereSub, transaction: tx });
  if (!found) {
    try {
      const row = await createIndikatorSubKegiatan(periodeId, body, opts);
      return attachImportMeta(row, "create");
    } catch (err) {
      if (isMysqlDuplicateKodeIndikator(err)) {
        const b2 = { ...body };
        delete b2.kode_indikator;
        await allocateKodeSubKegiatanGroup([b2]);
        if (!String(b2.kode_indikator || "").trim()) throw err;
        const row2 = await createIndikatorSubKegiatan(periodeId, b2, opts);
        return attachImportMeta(row2, "create", { kodeRegeneratedAfterKodeConflict: true });
      }
      throw err;
    }
  }
  const row = await updateIndikatorSubKegiatan(periodeId, found.id, body, opts);
  return attachImportMeta(row, "update");
}

async function deleteIndikatorSubKegiatan(periodeId, id) {
  const row = await findOwnedSubKegiatan(periodeId, id);
  const indId = row.indikator_id;
  const tx = await sequelize.transaction();
  try {
    await row.destroy({ transaction: tx });
    await destroyMasterIfExists(indId, tx);
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return { deleted: true, id: toInt(id) };
}

module.exports = {
  listIndikatorTujuan,
  listIndikatorSasaran,
  listIndikatorStrategi,
  listIndikatorArahKebijakan,
  listIndikatorProgram,
  listIndikatorKegiatan,
  listIndikatorSubKegiatan,
  createIndikatorTujuan,
  updateIndikatorTujuan,
  upsertIndikatorTujuanImport,
  deleteIndikatorTujuan,
  createIndikatorSasaran,
  updateIndikatorSasaran,
  upsertIndikatorSasaranImport,
  deleteIndikatorSasaran,
  createIndikatorStrategi,
  updateIndikatorStrategi,
  upsertIndikatorStrategiImport,
  deleteIndikatorStrategi,
  createIndikatorArahKebijakan,
  updateIndikatorArahKebijakan,
  upsertIndikatorArahKebijakanImport,
  deleteIndikatorArahKebijakan,
  createIndikatorProgram,
  updateIndikatorProgram,
  upsertIndikatorProgramImport,
  deleteIndikatorProgram,
  createIndikatorKegiatan,
  updateIndikatorKegiatan,
  upsertIndikatorKegiatanImport,
  deleteIndikatorKegiatan,
  createIndikatorSubKegiatan,
  updateIndikatorSubKegiatan,
  upsertIndikatorSubKegiatanImport,
  deleteIndikatorSubKegiatan,
};
