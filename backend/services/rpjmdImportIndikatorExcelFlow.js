"use strict";

const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const XLSX = require("xlsx");
const sequelize = require("../config/database");
const tenantContext = require("../lib/tenantContext");
const { ImportLog, Tujuan, Sasaran, Strategi, ArahKebijakan, SubKegiatan, IndikatorSasaran, IndikatorProgram } = require("../models");
const indSvc = require("./rpjmdImportIndikatorService");
const { nodeErrorMessage } = require("../utils/nodeErrorMessage");
const { fillMissingKodeIndikatorsForSheet } = require("../helpers/rpjmdImportAutoKodeIndikator");

const PREVIEW_TTL_MS = 60 * 60 * 1000;
const previewStore = new Map();

/** Pratinjau juga disimpan ke disk agar «Terapkan» tetap jalan setelah nodemon restart / proses baru. */
const PREVIEW_DISK_DIR = path.join(__dirname, "..", "tmp", "rpjmd-import-previews");

function isSafePreviewId(id) {
  return /^[a-f0-9]{20,64}$/i.test(String(id || "").trim());
}

async function writePreviewDisk(previewId, entry) {
  if (!isSafePreviewId(previewId) || !entry) return;
  await fs.mkdir(PREVIEW_DISK_DIR, { recursive: true });
  const file = path.join(PREVIEW_DISK_DIR, `${previewId}.json`);
  await fs.writeFile(file, JSON.stringify(entry), "utf8");
}

async function readPreviewDisk(previewId) {
  if (!isSafePreviewId(previewId)) return null;
  const file = path.join(PREVIEW_DISK_DIR, `${previewId}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.at !== "number" || !Array.isArray(entry.sheets)) return null;
    if (Date.now() - entry.at > PREVIEW_TTL_MS) {
      await fs.unlink(file).catch(() => {});
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

async function deletePreviewDisk(previewId) {
  if (!isSafePreviewId(previewId)) return;
  const file = path.join(PREVIEW_DISK_DIR, `${previewId}.json`);
  await fs.unlink(file).catch(() => {});
}

async function prunePreviewDisk() {
  let names = [];
  try {
    names = await fs.readdir(PREVIEW_DISK_DIR);
  } catch {
    return;
  }
  const now = Date.now();
  for (const name of names) {
    if (!/^[a-f0-9]{20,64}\.json$/i.test(name)) continue;
    const fp = path.join(PREVIEW_DISK_DIR, name);
    try {
      const raw = await fs.readFile(fp, "utf8");
      const j = JSON.parse(raw);
      if (!j?.at || now - j.at > PREVIEW_TTL_MS) await fs.unlink(fp).catch(() => {});
    } catch {
      await fs.unlink(fp).catch(() => {});
    }
  }
}

/** Urutan referensi (satu tab = satu sheet; tidak insert lintas sheet). */
const RPJMD_INDIKATOR_IMPORT_TABLES = [
  "indikatortujuans",
  "indikatorsasarans",
  "indikatorstrategis",
  "indikatorarahkebijakans",
  "indikatorprograms",
  "indikatorkegiatans",
  "indikatorsubkegiatans",
];

/** Impor Excel: find/update by kode_indikator + periode (atau join ke periode untuk program/kegiatan). */
const UPSERT_IMPORT_BY_TABLE = {
  indikatortujuans: indSvc.upsertIndikatorTujuanImport,
  indikatorsasarans: indSvc.upsertIndikatorSasaranImport,
  indikatorstrategis: indSvc.upsertIndikatorStrategiImport,
  indikatorarahkebijakans: indSvc.upsertIndikatorArahKebijakanImport,
  indikatorprograms: indSvc.upsertIndikatorProgramImport,
  indikatorkegiatans: indSvc.upsertIndikatorKegiatanImport,
  indikatorsubkegiatans: indSvc.upsertIndikatorSubKegiatanImport,
};

/** `kode_indikator` opsional untuk sheet yang didukung auto-kode (tujuan, sasaran, …) — diisi otomatis saat pratinjau/apply/insert. */
const REQUIRED_HEADER_KEYS = [
  "nama_indikator",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
];

function pruneStore() {
  const now = Date.now();
  for (const [k, v] of previewStore) {
    if (now - v.at > PREVIEW_TTL_MS) previewStore.delete(k);
  }
  prunePreviewDisk().catch((err) => {
    console.error("[rpjmd-import] prunePreviewDisk:", nodeErrorMessage(err));
  });
}

function normKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Kunci lookup untuk map header ramah-pengguna (trim + lower + rapatkan spasi). */
function explicitLookupKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Header Excel (teks sel header) → nama field internal.
 * Diisi eksplisit dulu; baru fallback `normKey()` agar label template tidak pecah.
 */
const EXPLICIT_HEADER_ALIASES = {
  "opd penanggung jawab": "penanggung_jawab",
  "penanggung jawab": "penanggung_jawab",
  satuan: "satuan",
  "target (th. ke-1)": "target_tahun_1",
  "target (th. ke-2)": "target_tahun_2",
  "target (th. ke-3)": "target_tahun_3",
  "target (th. ke-4)": "target_tahun_4",
  "target (th. ke-5)": "target_tahun_5",
  baseline: "baseline",
  "sumber data": "sumber_data",
  "tipe indikator": "tipe_indikator",
  "jenis indikator": "jenis_indikator",
  jenis: "jenis",
  "tujuan id": "tujuan_id",
  "misi id": "misi_id",
  "metode penghitungan": "metode_penghitungan",
  "definisi operasional": "definisi_operasional",
  "kriteria kuantitatif": "kriteria_kuantitatif",
  "kriteria kualitatif": "kriteria_kualitatif",
  "tolok ukur kinerja": "tolok_ukur_kinerja",
  "target kinerja": "target_kinerja",
};

function headerToDataKey(rawHeader) {
  const lk = explicitLookupKey(rawHeader);
  if (lk && EXPLICIT_HEADER_ALIASES[lk]) return EXPLICIT_HEADER_ALIASES[lk];
  return normKey(rawHeader);
}

function normText(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function rowToObj(header, row) {
  const o = {};
  for (let i = 0; i < header.length; i++) {
    const key = headerToDataKey(header[i]);
    if (!key) continue;
    const v = row[i];
    o[key] = v === undefined || v === null ? "" : v;
  }
  return o;
}

function assertPeriode(periodeId) {
  const n = parseInt(String(periodeId), 10);
  if (!Number.isFinite(n) || n < 1) {
    const e = new Error("periode_rpjmd_id tidak valid.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  return n;
}

function headerKeySet(headerRow) {
  const set = new Set();
  for (const h of headerRow || []) {
    const k = headerToDataKey(h);
    if (!k) continue;
    set.add(k);
    const aliased = HEADER_ALIASES[k];
    if (aliased) set.add(aliased);
  }
  return set;
}

function assertRequiredHeaders(sheetName, headerRow) {
  const set = headerKeySet(headerRow);
  const missing = REQUIRED_HEADER_KEYS.filter((k) => !set.has(k));
  if (missing.length) {
    const e = new Error(
      `Sheet "${sheetName}" tidak memiliki kolom wajib: ${missing.join(", ")}. ` +
        `Wajib: ${REQUIRED_HEADER_KEYS.join(", ")}.`,
    );
    e.code = "BAD_REQUEST";
    throw e;
  }
}

/**
 * Alias header Excel → nama field DB.
 * Dibutuhkan karena export Excel pakai header ramah-pengguna (misal "OPD Penanggung Jawab")
 * yang setelah normKey() TIDAK sama dengan nama kolom DB ("penanggung_jawab").
 */
const HEADER_ALIASES = {
  /* Export: "OPD Penanggung Jawab" → normKey → "opd_penanggung_jawab" */
  "opd_penanggung_jawab":   "penanggung_jawab",
  /* Template Excel `indikatortujuans`: kolom indikator_kinerja → field DB `jenis` */
  indikator_kinerja: "jenis",
  /* Export: "Jenis (uraian)" → normKey → "jenis_(uraian)" */
  "jenis_(uraian)":         "jenis",
  /* Export: "Acuan (kalender)" → normKey → "acuan_(kalender)" */
  "acuan_(kalender)":       "tahun",
  /* Export: "Target (th. ke-n)" → normKey → "target_(th._ke-n)" */
  "target_(th._ke-1)":      "target_tahun_1",
  "target_(th._ke-2)":      "target_tahun_2",
  "target_(th._ke-3)":      "target_tahun_3",
  "target_(th._ke-4)":      "target_tahun_4",
  "target_(th._ke-5)":      "target_tahun_5",
  /* Export: "Capaian (th. ke-n)" → normKey → "capaian_(th._ke-n)" */
  "capaian_(th._ke-1)":     "capaian_tahun_1",
  "capaian_(th._ke-2)":     "capaian_tahun_2",
  "capaian_(th._ke-3)":     "capaian_tahun_3",
  "capaian_(th._ke-4)":     "capaian_tahun_4",
  "capaian_(th._ke-5)":     "capaian_tahun_5",
};

/**
 * Kolom-kolom Excel yang SELALU diabaikan untuk `indikatortujuans`.
 * `kode_indikator` HARUS dihasilkan 100% oleh generator backend (allocateKodeTujuanGroup).
 * Nilai dari Excel tidak pernah boleh mempengaruhi kode_indikator, fingerprint, atau dedup.
 * Daftar ini mencakup semua bentuk normalisasi yang bisa dihasilkan headerToDataKey():
 *   "Kode" / "kode" → "kode"
 *   "Kode Indikator" / "kode indikator" / "kode_indikator" → "kode_indikator"
 */
const INDIKATORTUJUAN_IGNORED_EXCEL_KEYS = new Set([
  "kode",
  "kode_indikator",
]);

function normalizeRowForTable(table, body) {
  const b = { ...body };

  /**
   * Strip kolom kode Excel untuk indikatortujuans — kode_indikator harus dari generator backend.
   * Lakukan SEBELUM alias agar tidak ada jalan masuk lain.
   */
  if (table === "indikatortujuans") {
    for (const k of INDIKATORTUJUAN_IGNORED_EXCEL_KEYS) {
      delete b[k];
    }
  }

  /* Terapkan alias header: jika kunci alias ada dan kunci target kosong/belum ada, pindahkan nilainya */
  for (const [from, to] of Object.entries(HEADER_ALIASES)) {
    if (b[from] !== undefined && b[from] !== "" && (b[to] === undefined || b[to] === "")) {
      b[to] = b[from];
    }
    /* Hapus alias key agar tidak membingungkan downstream */
    delete b[from];
  }

  if (!String(b.jenis_dokumen || "").trim()) {
    const jEx = String(b.jenisDokumen || b.jenisdokumen || "").trim();
    if (jEx) b.jenis_dokumen = jEx;
  }
  if (!b.jenis_dokumen) b.jenis_dokumen = "RPJMD";
  if (!b.tahun) b.tahun = "2025";
  /**
   * Template `indikatorprograms` (ekspor lama): `indikator_sasaran_id` kosong padahal acuan ada di kolom `periode_id`
   * — pola sama dengan indikatorstrategis / sasaran_id.
   */
  if (table === "indikatorprograms") {
    if (
      (b.indikator_sasaran_id == null || b.indikator_sasaran_id === "") &&
      String(b.periode_id || "").trim()
    ) {
      b.indikator_sasaran_id = b.periode_id;
    }
  }
  /**
   * Template `indikatorsasarans` (ekspor lama): sel `tujuan_id` kosong padahal acuan tujuan
   * ada di kolom `periode_id`. Insert DB tetap memakai `periode_id` dari URL impor (pid),
   * bukan nilai Excel — jadi nilai di kolom itu dipakai hanya sebagai fallback `tujuan_id`.
   */
  if (table === "indikatorsasarans") {
    if (!String(b.tujuan_id || "").trim() && String(b.periode_id || "").trim()) {
      b.tujuan_id = b.periode_id;
    }
  }
  /**
   * Template `indikatorstrategis` (ekspor lama): `sasaran_id` kosong padahal acuan sasaran ada di kolom `periode_id`
   * — pola sama dengan indikatorsasarans / tujuan_id.
   */
  if (table === "indikatorstrategis") {
    if (!String(b.sasaran_id || "").trim() && String(b.periode_id || "").trim()) {
      b.sasaran_id = b.periode_id;
    }
  }
  /**
   * Template `indikatorarahkebijakans` (ekspor lama): `strategi_id` kosong padahal acuan strategi ada di kolom `periode_id`
   * — pola sama dengan indikatorstrategis / sasaran_id.
   */
  if (table === "indikatorarahkebijakans") {
    if (!String(b.strategi_id || "").trim() && String(b.periode_id || "").trim()) {
      b.strategi_id = b.periode_id;
    }
  }
  /**
   * Template `indikatorkegiatans` (ekspor lama): `indikator_program_id` kosong padahal acuan ada di kolom `periode_id`
   * — pola sama dengan indikatorprograms / indikator_sasaran_id.
   */
  if (table === "indikatorkegiatans") {
    if (
      (b.indikator_program_id == null || b.indikator_program_id === "") &&
      String(b.periode_id || "").trim()
    ) {
      b.indikator_program_id = b.periode_id;
    }
  }
  /**
   * Template `indikatorsubkegiatans` (ekspor lama): `sub_kegiatan_id` kosong padahal acuan ada di kolom `periode_id`
   * — pola sama dengan indikatorkegiatans.
   */
  if (table === "indikatorsubkegiatans") {
    if ((b.sub_kegiatan_id == null || b.sub_kegiatan_id === "") && String(b.periode_id || "").trim()) {
      b.sub_kegiatan_id = b.periode_id;
    }
  }
  /**
   * Default tipe_indikator = "Impact" dan jenis_indikator = "Kuantitatif" untuk
   * indikatorsasarans / indikatorstrategis / indikatorarahkebijakans jika Excel tidak
   * menyediakan nilai (termasuk nilai em-dash "—").
   * Konsisten dengan indikatortujuans yang selalu "Impact" / "Kuantitatif".
   */
  if (
    table === "indikatorsasarans" ||
    table === "indikatorstrategis" ||
    table === "indikatorarahkebijakans"
  ) {
    const BLANK = ["", "—", "-", null, undefined];
    if (BLANK.includes(b.tipe_indikator) || !String(b.tipe_indikator || "").trim()) {
      b.tipe_indikator = "Impact";
    }
    if (BLANK.includes(b.jenis_indikator) || !String(b.jenis_indikator || "").trim()) {
      b.jenis_indikator = "Kuantitatif";
    }
  }
  return b;
}

function toInt(v) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function putMap(map, val, id) {
  const k = normText(val);
  if (!k || id == null) return;
  if (!map.has(k)) map.set(k, id);
}

function emptyRelationMaps() {
  return {
    /** Urutan id tujuan untuk periode (Tn pada kode IKU = indeks 1..n). */
    tujuanOrderedIds: [],
    tujuanByNorm: new Map(),
    sasaranByNorm: new Map(),
    /** Urutan id sasaran per periode (tujuan_id, lalu nomor) — sheet indikatorsasarans global positional fallback. */
    sasaranOrderedIds: [],
    /** `tujuan_id` → id sasaran terurut (nomor) untuk pemetaan otomatis dari sheet indikatorsasarans. */
    sasaranIdsByTujuan: new Map(),
    /** Urutan id strategi per periode (sasaran_id, lalu kode) untuk pemetaan posisional sheet indikatorstrategis. */
    strategiOrderedIds: [],
    /** `sasaran_id` → id strategi terurut untuk pemetaan otomatis (satu / beberapa strategi per sasaran). */
    strategiIdsBySasaran: new Map(),
    strategiByNorm: new Map(),
    /** Urutan id arah kebijakan per periode (strategi_id, lalu kode_arah) — sheet indikatorarahkebijakans. */
    arahOrderedIds: [],
    /** `strategi_id` → id arah kebijakan terurut (pemetaan otomatis per strategi). */
    arahIdsByStrategi: new Map(),
    arahByNorm: new Map(),
    indikatorSasaranByKode: new Map(),
    indikatorSasaranByNama: new Map(),
    /** Urutan id indikator sasaran per periode (sasaran_id RPJMD, lalu kode) — sheet indikatorprograms. */
    indikatorSasaranOrderedIds: [],
    /** `sasaran_id` (entitas sasaran) → id indikator sasaran terurut. */
    indikatorSasaranIdsBySasaran: new Map(),
    indikatorProgramByKode: new Map(),
    /** Urutan id indikator program (FK `sasaran_id` = baris indikator sasaran, lalu kode) — sheet indikatorkegiatans. */
    indikatorProgramOrderedIds: [],
    /** id indikator sasaran → id indikator program terurut. */
    indikatorProgramIdsByIndikatorSasaran: new Map(),
    subKegiatanByKode: new Map(),
    subKegiatanByNama: new Map(),
    /** Urutan id sub kegiatan per periode (kegiatan_id, lalu kode) — sheet indikatorsubkegiatans. */
    subKegiatanOrderedIds: [],
    /** id kegiatan → id sub kegiatan terurut. */
    subKegiatanIdsByKegiatan: new Map(),
  };
}

/** Hanya memuat relasi DB yang dipakai sheet terpilih (satu tab = satu tabel). */
async function loadRelationMaps(periodeId, tables) {
  const pid = periodeId;
  const out = emptyRelationMaps();
  const set = new Set(Array.isArray(tables) ? tables.filter((t) => UPSERT_IMPORT_BY_TABLE[t]) : []);
  if (!set.size) return out;

  const jobs = [];
  if (set.has("indikatortujuans")) {
    jobs.push(
      Tujuan.findAll({ where: { periode_id: pid }, attributes: ["id", "isi_tujuan", "no_tujuan"], raw: true }).then((rows) => ({
        tag: "tujuan",
        rows,
      })),
    );
  }
  if (set.has("indikatorsasarans")) {
    jobs.push(
      Sasaran.findAll({
        where: { periode_id: pid },
        attributes: ["id", "isi_sasaran", "nomor", "tujuan_id"],
        raw: true,
      }).then((rows) => ({
        tag: "sasaran",
        rows,
      })),
    );
  }
  if (set.has("indikatorstrategis")) {
    jobs.push(
      Strategi.findAll({
        where: { periode_id: pid },
        attributes: ["id", "deskripsi", "kode_strategi", "sasaran_id"],
        raw: true,
      }).then((rows) => ({
        tag: "strategi",
        rows,
      })),
    );
  }
  if (set.has("indikatorarahkebijakans")) {
    jobs.push(
      ArahKebijakan.findAll({
        where: { periode_id: pid },
        attributes: ["id", "deskripsi", "kode_arah", "strategi_id"],
        raw: true,
      }).then((rows) => ({ tag: "arah", rows })),
    );
  }
  if (set.has("indikatorprograms")) {
    jobs.push(
      IndikatorSasaran.findAll({
        where: { periode_id: pid },
        attributes: ["id", "kode_indikator", "nama_indikator", "sasaran_id"],
        raw: true,
      }).then((rows) => ({ tag: "indsas", rows })),
    );
  }
  if (set.has("indikatorkegiatans")) {
    jobs.push(
      IndikatorProgram.findAll({
        subQuery: false,
        attributes: ["id", "kode_indikator", "sasaran_id"],
        include: [
          {
            model: IndikatorSasaran,
            as: "indikatorSasaran",
            attributes: ["id"],
            where: { periode_id: pid },
            required: true,
          },
        ],
      })
        .then((rows) => rows.map((r) => r.get({ plain: true })))
        .then((rows) => ({ tag: "indprog", rows })),
    );
  }
  if (set.has("indikatorsubkegiatans")) {
    jobs.push(
      SubKegiatan.findAll({
        where: { periode_id: pid },
        attributes: ["id", "nama_sub_kegiatan", "kode_sub_kegiatan", "kegiatan_id"],
        raw: true,
      }).then((rows) => ({ tag: "subkeg", rows })),
    );
  }

  const chunks = await Promise.all(jobs);
  for (const ch of chunks) {
    if (ch.tag === "tujuan") {
      const firstInt = (row) => {
        const m = String(row.no_tujuan || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      const rows = [...ch.rows].sort((a, b) => {
        const ia = firstInt(a);
        const ib = firstInt(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return (toInt(a.id) || 0) - (toInt(b.id) || 0);
      });
      out.tujuanOrderedIds = rows.map((t) => t.id);
      for (const t of ch.rows) {
        putMap(out.tujuanByNorm, t.isi_tujuan, t.id);
        putMap(out.tujuanByNorm, t.no_tujuan, t.id);
        putMap(out.tujuanByNorm, `${t.no_tujuan || ""} ${t.isi_tujuan || ""}`, t.id);
        // Tambah variasi padding no_tujuan agar inferTujuanIdFromKodeIndikatorStandard robust:
        // DB menyimpan "T1-01" tapi kode mungkin menghasilkan "T1-1" atau "T01-01"
        const noTuj = String(t.no_tujuan || "").trim();
        const mParts = noTuj.match(/^T(\d+)-(\d+)$/i);
        if (mParts) {
          const mn = parseInt(mParts[1], 10);
          const tn = parseInt(mParts[2], 10);
          const variants = [
            `T${mn}-${String(tn).padStart(2, "0")}`,
            `T${mn}-${tn}`,
            `T${String(mn).padStart(2, "0")}-${String(tn).padStart(2, "0")}`,
          ];
          for (const v of variants) putMap(out.tujuanByNorm, v, t.id);
        }
      }
    } else if (ch.tag === "sasaran") {
      const firstIntNomor = (row) => {
        const m = String(row.nomor || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      for (const s of ch.rows) {
        putMap(out.sasaranByNorm, s.isi_sasaran, s.id);
        putMap(out.sasaranByNorm, s.nomor, s.id);
        putMap(out.sasaranByNorm, `${s.nomor || ""} ${s.isi_sasaran || ""}`, s.id);
      }
      const byTujuan = new Map();
      for (const s of ch.rows) {
        const tid = toInt(s.tujuan_id);
        if (!tid) continue;
        if (!byTujuan.has(tid)) byTujuan.set(tid, []);
        byTujuan.get(tid).push(s);
      }
      for (const [tid, arr] of byTujuan) {
        const sorted = [...arr].sort((a, b) => {
          const ia = firstIntNomor(a);
          const ib = firstIntNomor(b);
          if (ia != null && ib != null && ia !== ib) return ia - ib;
          if (ia != null && ib == null) return -1;
          if (ia == null && ib != null) return 1;
          return (toInt(a.id) || 0) - (toInt(b.id) || 0);
        });
        out.sasaranIdsByTujuan.set(tid, sorted.map((x) => x.id));
      }
      // Urutan global sasaran (tujuan_id, lalu nomor) — fallback posisional sheet indikatorsasarans.
      const allSas = [...ch.rows].sort((a, b) => {
        const ta = toInt(a.tujuan_id) || 0;
        const tb = toInt(b.tujuan_id) || 0;
        if (ta !== tb) return ta - tb;
        const ia = firstIntNomor(a);
        const ib = firstIntNomor(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return (toInt(a.id) || 0) - (toInt(b.id) || 0);
      });
      out.sasaranOrderedIds = allSas.map((x) => x.id);
    } else if (ch.tag === "strategi") {
      const firstIntKode = (row) => {
        const m = String(row.kode_strategi || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      for (const st of ch.rows) {
        putMap(out.strategiByNorm, st.deskripsi, st.id);
        putMap(out.strategiByNorm, st.kode_strategi, st.id);
      }
      const bySasaran = new Map();
      for (const st of ch.rows) {
        const sid = toInt(st.sasaran_id);
        if (!sid) continue;
        if (!bySasaran.has(sid)) bySasaran.set(sid, []);
        bySasaran.get(sid).push(st);
      }
      for (const [sid, arr] of bySasaran) {
        const sorted = [...arr].sort((a, b) => {
          const ia = firstIntKode(a);
          const ib = firstIntKode(b);
          if (ia != null && ib != null && ia !== ib) return ia - ib;
          if (ia != null && ib == null) return -1;
          if (ia == null && ib != null) return 1;
          return (toInt(a.id) || 0) - (toInt(b.id) || 0);
        });
        out.strategiIdsBySasaran.set(sid, sorted.map((x) => x.id));
      }
      const allStr = [...ch.rows].sort((a, b) => {
        const sa = toInt(a.sasaran_id) || 0;
        const sb = toInt(b.sasaran_id) || 0;
        if (sa !== sb) return sa - sb;
        const ia = firstIntKode(a);
        const ib = firstIntKode(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return (toInt(a.id) || 0) - (toInt(b.id) || 0);
      });
      out.strategiOrderedIds = allStr.map((s) => s.id);
    } else if (ch.tag === "arah") {
      const firstIntKodeArah = (row) => {
        const m = String(row.kode_arah || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      for (const a of ch.rows) {
        const desk = a.deskripsi;
        const snippet = String(desk || "").slice(0, 400);
        putMap(out.arahByNorm, snippet, a.id);
        putMap(out.arahByNorm, desk, a.id);
        if (a.kode_arah) putMap(out.arahByNorm, a.kode_arah, a.id);
      }
      const byStrategi = new Map();
      for (const a of ch.rows) {
        const stid = toInt(a.strategi_id);
        if (!stid) continue;
        if (!byStrategi.has(stid)) byStrategi.set(stid, []);
        byStrategi.get(stid).push(a);
      }
      for (const [stid, arr] of byStrategi) {
        const sorted = [...arr].sort((x, y) => {
          const ia = firstIntKodeArah(x);
          const ib = firstIntKodeArah(y);
          if (ia != null && ib != null && ia !== ib) return ia - ib;
          if (ia != null && ib == null) return -1;
          if (ia == null && ib != null) return 1;
          return (toInt(x.id) || 0) - (toInt(y.id) || 0);
        });
        out.arahIdsByStrategi.set(stid, sorted.map((x) => x.id));
      }
      const allArah = [...ch.rows].sort((a, b) => {
        const sa = toInt(a.strategi_id) || 0;
        const sb = toInt(b.strategi_id) || 0;
        if (sa !== sb) return sa - sb;
        const ia = firstIntKodeArah(a);
        const ib = firstIntKodeArah(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return (toInt(a.id) || 0) - (toInt(b.id) || 0);
      });
      out.arahOrderedIds = allArah.map((x) => x.id);
    } else if (ch.tag === "indsas") {
      const firstIntKodeIs = (row) => {
        const m = String(row.kode_indikator || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      for (const is of ch.rows) {
        putMap(out.indikatorSasaranByKode, is.kode_indikator, is.id);
        putMap(out.indikatorSasaranByNama, String(is.nama_indikator || "").slice(0, 500), is.id);
      }
      const bySasaranEnt = new Map();
      for (const is of ch.rows) {
        const seid = toInt(is.sasaran_id);
        if (!seid) continue;
        if (!bySasaranEnt.has(seid)) bySasaranEnt.set(seid, []);
        bySasaranEnt.get(seid).push(is);
      }
      for (const [seid, arr] of bySasaranEnt) {
        const sorted = [...arr].sort((a, b) => {
          const ia = firstIntKodeIs(a);
          const ib = firstIntKodeIs(b);
          if (ia != null && ib != null && ia !== ib) return ia - ib;
          if (ia != null && ib == null) return -1;
          if (ia == null && ib != null) return 1;
          return String(a.kode_indikator || "").localeCompare(String(b.kode_indikator || ""), undefined, {
            numeric: true,
          }) || (toInt(a.id) || 0) - (toInt(b.id) || 0);
        });
        out.indikatorSasaranIdsBySasaran.set(seid, sorted.map((x) => x.id));
      }
      const allIs = [...ch.rows].sort((a, b) => {
        const sa = toInt(a.sasaran_id) || 0;
        const sb = toInt(b.sasaran_id) || 0;
        if (sa !== sb) return sa - sb;
        const ia = firstIntKodeIs(a);
        const ib = firstIntKodeIs(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return String(a.kode_indikator || "").localeCompare(String(b.kode_indikator || ""), undefined, {
          numeric: true,
        }) || (toInt(a.id) || 0) - (toInt(b.id) || 0);
      });
      out.indikatorSasaranOrderedIds = allIs.map((x) => x.id);
    } else if (ch.tag === "indprog") {
      const firstIntKodeIp = (row) => {
        const m = String(row.kode_indikator || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      for (const ip of ch.rows) {
        putMap(out.indikatorProgramByKode, ip.kode_indikator, ip.id);
      }
      const byIndSas = new Map();
      for (const ip of ch.rows) {
        const isid = toInt(ip.sasaran_id);
        if (!isid) continue;
        if (!byIndSas.has(isid)) byIndSas.set(isid, []);
        byIndSas.get(isid).push(ip);
      }
      for (const [isid, arr] of byIndSas) {
        const sorted = [...arr].sort((a, b) => {
          const ia = firstIntKodeIp(a);
          const ib = firstIntKodeIp(b);
          if (ia != null && ib != null && ia !== ib) return ia - ib;
          if (ia != null && ib == null) return -1;
          if (ia == null && ib != null) return 1;
          return (
            String(a.kode_indikator || "").localeCompare(String(b.kode_indikator || ""), undefined, {
              numeric: true,
            }) || (toInt(a.id) || 0) - (toInt(b.id) || 0)
          );
        });
        out.indikatorProgramIdsByIndikatorSasaran.set(isid, sorted.map((x) => x.id));
      }
      const allIp = [...ch.rows].sort((a, b) => {
        const sa = toInt(a.sasaran_id) || 0;
        const sb = toInt(b.sasaran_id) || 0;
        if (sa !== sb) return sa - sb;
        const ia = firstIntKodeIp(a);
        const ib = firstIntKodeIp(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return (
          String(a.kode_indikator || "").localeCompare(String(b.kode_indikator || ""), undefined, {
            numeric: true,
          }) || (toInt(a.id) || 0) - (toInt(b.id) || 0)
        );
      });
      out.indikatorProgramOrderedIds = allIp.map((x) => x.id);
    } else if (ch.tag === "subkeg") {
      const firstIntKodeSk = (row) => {
        const m = String(row.kode_sub_kegiatan || "").match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      for (const sk of ch.rows) {
        putMap(out.subKegiatanByKode, sk.kode_sub_kegiatan, sk.id);
        putMap(out.subKegiatanByNama, sk.nama_sub_kegiatan, sk.id);
      }
      const byKeg = new Map();
      for (const sk of ch.rows) {
        const kid = toInt(sk.kegiatan_id);
        if (!kid) continue;
        if (!byKeg.has(kid)) byKeg.set(kid, []);
        byKeg.get(kid).push(sk);
      }
      for (const [kid, arr] of byKeg) {
        const sorted = [...arr].sort((a, b) => {
          const ia = firstIntKodeSk(a);
          const ib = firstIntKodeSk(b);
          if (ia != null && ib != null && ia !== ib) return ia - ib;
          if (ia != null && ib == null) return -1;
          if (ia == null && ib != null) return 1;
          return (
            String(a.kode_sub_kegiatan || "").localeCompare(String(b.kode_sub_kegiatan || ""), undefined, {
              numeric: true,
            }) || (toInt(a.id) || 0) - (toInt(b.id) || 0)
          );
        });
        out.subKegiatanIdsByKegiatan.set(kid, sorted.map((x) => x.id));
      }
      const allSk = [...ch.rows].sort((a, b) => {
        const ka = toInt(a.kegiatan_id) || 0;
        const kb = toInt(b.kegiatan_id) || 0;
        if (ka !== kb) return ka - kb;
        const ia = firstIntKodeSk(a);
        const ib = firstIntKodeSk(b);
        if (ia != null && ib != null && ia !== ib) return ia - ib;
        if (ia != null && ib == null) return -1;
        if (ia == null && ib != null) return 1;
        return (
          String(a.kode_sub_kegiatan || "").localeCompare(String(b.kode_sub_kegiatan || ""), undefined, {
            numeric: true,
          }) || (toInt(a.id) || 0) - (toInt(b.id) || 0)
        );
      });
      out.subKegiatanOrderedIds = allSk.map((x) => x.id);
    }
  }

  return out;
}

function lookupId(map, val, label) {
  if (val === undefined || val === null || String(val).trim() === "") return { id: null, err: null };
  const idNum = toInt(val);
  if (idNum) return { id: idNum, err: null };
  const k = normText(val);
  const id = map.get(k);
  if (!id) return { id: null, err: `Tidak menemukan ${label} untuk "${String(val).trim()}"` };
  return { id, err: null };
}

/**
 * Format STANDAR: `T{misi}-{noTujuan}-{seq}` — contoh: T1-01-02, T2-03-01.
 * Ekstrak prefix tujuan (mis. "T1-01") lalu cari tujuan_id di `tujuanByNorm`.
 * Ini adalah lookup DETERMINISTIK: semua indikator dengan prefix sama → tujuan yang sama.
 */
function inferTujuanIdFromKodeIndikatorStandard(kodeIndikator, maps) {
  const k = String(kodeIndikator || "").trim();
  // Cocok: T{misi}-{no}-{seq}  misal T1-01-02, T12-03-01
  const m = k.match(/^(T\d+-\d+)-\d+$/i);
  if (!m) return null;
  const prefix = m[1]; // mis. "T1-01"
  // Lookup langsung: tujuanByNorm sudah menyimpan normText(no_tujuan) → id
  const { id } = lookupId(maps.tujuanByNorm, prefix, "tujuan");
  if (id) return id;
  // Fallback: coba variasi padding berbeda (T1-1, T01-01, dsb.) agar robust terhadap format DB
  const parts = prefix.match(/^T(\d+)-(\d+)$/i);
  if (!parts) return null;
  const misiN = parseInt(parts[1], 10);
  const tujuanN = parseInt(parts[2], 10);
  const variants = [
    `T${misiN}-${String(tujuanN).padStart(2, "0")}`,
    `T${misiN}-${tujuanN}`,
    `T${String(misiN).padStart(2, "0")}-${String(tujuanN).padStart(2, "0")}`,
  ];
  for (const v of variants) {
    const { id: vid } = lookupId(maps.tujuanByNorm, v, "tujuan");
    if (vid) return vid;
  }
  return null;
}

/**
 * Template umum: kode_indikator seperti IKU-TUJ-T1-01 … IKU-TUJ-T6-01.
 * T{n} = tujuan ke-n menurut urutan di periode (bukan angka pada primary key `tujuan.id`).
 * Hanya untuk format IKU lama — gunakan inferTujuanIdFromKodeIndikatorStandard untuk format baru.
 */
function inferTujuanIdFromKodeIndikator(kodeIndikator, maps) {
  const k = String(kodeIndikator || "").trim();
  const m = k.match(/-TUJ-T(\d+)/i) || k.match(/TUJ-T(\d+)/i);
  if (!m) return null;
  const idx = parseInt(m[1], 10);
  if (!Number.isFinite(idx) || idx < 1) return null;
  const ordered = maps.tujuanOrderedIds;
  if (Array.isArray(ordered) && ordered.length) {
    if (idx <= ordered.length) return ordered[idx - 1] || null;
    return null;
  }
  const n = String(idx);
  const candidates = [`T${n}`, n, `tujuan ${n}`, `tujuan ${n}.`];
  for (const c of candidates) {
    const { id } = lookupId(maps.tujuanByNorm, c, "tujuan");
    if (id) return id;
  }
  return null;
}

/**
 * Isi ID FK dari kolom nama/kode (tanpa ID manual). Mutasi payload.
 * @returns {string[]} error tambahan
 */
function resolveRelationsForRow(table, payload, maps, opts = {}) {
  const errs = [];
  const p = payload;

  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
    }
    return "";
  };

  if (table === "indikatortujuans") {
    if (!toInt(p.tujuan_id)) {
      const raw = pick(p, ["tujuan_nama", "tujuan_isi", "isi_tujuan", "tujuan_kode", "no_tujuan"]);
      let { id, err } = lookupId(maps.tujuanByNorm, raw, "tujuan");

      if (!id && p.kode_indikator) {
        // 1. Format standar T{misi}-{no}-{seq}: DETERMINISTIK — prefix menentukan tujuan.
        //    Ini harus DIDAHULUKAN sebelum IKU lama dan SEBELUM posisional.
        //    Contoh: T1-01-02 → prefix "T1-01" → cari tujuan dengan no_tujuan = "T1-01".
        const fromStd = inferTujuanIdFromKodeIndikatorStandard(p.kode_indikator, maps);
        if (fromStd) {
          id = fromStd;
          err = null;
        }
      }

      if (!id && p.kode_indikator) {
        // 2. Format IKU lama: IKU-TUJ-T{n} (posisional berdasarkan urutan tujuan).
        const fromKode = inferTujuanIdFromKodeIndikator(p.kode_indikator, maps);
        if (fromKode) {
          id = fromKode;
          err = null;
        }
      }

      /**
       * 3. Fallback POSISIONAL — hanya jika:
       *    - tidak ada teks/kode tujuan eksplisit di baris, DAN
       *    - kode_indikator tidak berformat standar (tidak bisa di-parse deterministik).
       *    Jika kode_indikator ada dan sudah dicoba di atas tapi gagal, JANGAN pakai posisional
       *    karena itu berarti kode ada tapi tujuannya tidak ditemukan di DB (masalah data).
       */
      const kodeIsPresent = String(p.kode_indikator || "").trim() !== "";
      if (!id && opts.indikatorTujuanRowIndex != null && !String(raw || "").trim() && !kodeIsPresent) {
        const ord = maps.tujuanOrderedIds;
        const i = opts.indikatorTujuanRowIndex;
        if (Array.isArray(ord) && i >= 0 && i < ord.length) {
          id = ord[i];
          err = null;
        } else if (Array.isArray(ord) && ord.length === 0) {
          errs.push("Tidak ada data tujuan di database untuk periode ini (isi RPJMD / tujuan dulu).");
        } else if (Array.isArray(ord) && i >= ord.length) {
          errs.push(
            `Baris ke-${i + 1} melebihi jumlah tujuan di periode (${ord.length} tujuan). Tambah baris tujuan atau kurangi baris indikator.`,
          );
        }
      }

      if (id) p.tujuan_id = id;
      else if (err) errs.push(err);
    }

    // Ekstrak reference_target_code dari kode_indikator (format T{misi}-{no}-{seq}).
    // Selalu diisi untuk baris indikatortujuans import — bahkan jika tujuan_id tidak ditemukan.
    // Frontend menggunakan ini untuk filter dropdown referensi tanpa bergantung pada tujuan_id.
    if (!p.reference_target_code) {
      const kodeStr = String(p.kode_indikator || "").trim();
      const mm = kodeStr.match(/^(T\d+-\d+)-\d+$/i);
      if (mm) {
        // Normalisasi ke huruf besar: "t1-01" → "T1-01"
        p.reference_target_code = mm[1].toUpperCase();
      }
    }
  } else if (table === "indikatorsasarans") {
    if (!toInt(p.sasaran_id)) {
      const raw = pick(p, ["sasaran_nama", "isi_sasaran", "sasaran_kode", "nomor_sasaran", "nomor"]);
      let { id, err } = lookupId(maps.sasaranByNorm, raw, "sasaran");
      if (id) p.sasaran_id = id;
      else if (err) errs.push(err);
      /**
       * Template indikator sasaran memuat `tujuan_id` tanpa sasaran_id / teks sasaran:
       * isi sasaran_id dari urutan sasaran DB per tujuan (satu sasaran → semua baris;
       * beberapa sasaran → baris ke-1 → sasaran ke-1, dst., seperti pola indikatortujuans).
       * Hanya jika tidak ada teks sasaran eksplisit di baris.
       */
      if (!toInt(p.sasaran_id) && !String(raw || "").trim() && toInt(p.tujuan_id)) {
        const tid = toInt(p.tujuan_id);
        const list = maps.sasaranIdsByTujuan?.get(tid);
        if (!list || !list.length) {
          errs.push(
            `Tidak ada sasaran di database untuk tujuan_id ${tid} (lengkapi sasaran di RPJMD untuk tujuan tersebut).`,
          );
        } else if (list.length === 1) {
          p.sasaran_id = list[0];
        } else {
          const counters = opts.sasaranCounterByTujuan;
          if (!(counters instanceof Map)) {
            errs.push(
              "Beberapa sasaran per tujuan: isi sasaran_id, atau isi_sasaran/nomor, atau impor dengan urutan baris (hubungi admin).",
            );
          } else {
            const idx = counters.get(tid) ?? 0;
            if (idx < list.length) {
              p.sasaran_id = list[idx];
              counters.set(tid, idx + 1);
            } else {
              errs.push(
                `Baris melebihi jumlah sasaran untuk tujuan_id ${tid} (${list.length} sasaran). ` +
                  `Isi sasaran_id atau kurangi baris / isi isi_sasaran atau nomor.`,
              );
            }
          }
        }
      }
      /**
       * Tanpa sasaran_id / teks sasaran / tujuan_id: baris ke-(i+1) → sasaran urutan ke-i di periode
       * (urutan global: tujuan_id, lalu nomor sasaran), seperti pola indikatorstrategis + strategiOrderedIds.
       * Diisi saat buildResolvedHierarchyMaps override sasaranOrderedIds dari Referensi_Perencanaan.
       */
      if (!toInt(p.sasaran_id) && !String(raw || "").trim() && opts.indikatorSasaranRowIndex != null) {
        const ord = maps.sasaranOrderedIds;
        const i = opts.indikatorSasaranRowIndex;
        if (Array.isArray(ord) && i >= 0 && i < ord.length) {
          p.sasaran_id = ord[i];
        } else if (Array.isArray(ord) && ord.length === 0) {
          errs.push("Tidak ada data sasaran di database untuk periode ini (isi RPJMD / sasaran dulu).");
        } else if (Array.isArray(ord) && i >= ord.length) {
          errs.push(
            `${rowRef || `Baris ke-${i + 1}`} melebihi jumlah sasaran di periode (${ord.length} sasaran). ` +
              `Tambah data sasaran atau kurangi baris / isi sasaran_id atau tujuan_id.`,
          );
        }
      }
    }
  } else if (table === "indikatorstrategis") {
    if (!toInt(p.strategi_id)) {
      const raw = pick(p, ["strategi_deskripsi", "strategi_nama", "kode_strategi", "strategi_kode"]);
      let { id, err } = lookupId(maps.strategiByNorm, raw, "strategi");
      if (id) p.strategi_id = id;
      else if (err) errs.push(err);
      /**
       * Template: tanpa strategi_id / teks strategi — isi dari sasaran_id + urutan strategi DB per sasaran
       * (satu strategi → semua baris; beberapa → per baris, seperti indikatorsasarans + tujuan_id).
       */
      if (!toInt(p.strategi_id) && !String(raw || "").trim() && toInt(p.sasaran_id)) {
        const sid = toInt(p.sasaran_id);
        const list = maps.strategiIdsBySasaran?.get(sid);
        if (!list || !list.length) {
          errs.push(
            `Tidak ada strategi di database untuk sasaran_id ${sid} (lengkapi strategi di RPJMD untuk sasaran tersebut).`,
          );
        } else if (list.length === 1) {
          p.strategi_id = list[0];
        } else {
          const counters = opts.strategiCounterBySasaran;
          if (!(counters instanceof Map)) {
            errs.push(
              "Beberapa strategi per sasaran: isi strategi_id, atau kode_strategi/deskripsi, atau impor dengan urutan baris.",
            );
          } else {
            const idx = counters.get(sid) ?? 0;
            if (idx < list.length) {
              p.strategi_id = list[idx];
              counters.set(sid, idx + 1);
            } else {
              errs.push(
                `Baris melebihi jumlah strategi untuk sasaran_id ${sid} (${list.length} strategi). ` +
                  `Isi strategi_id atau kurangi baris / isi kode_strategi atau deskripsi.`,
              );
            }
          }
        }
      }
      /**
       * Tanpa sasaran_id / teks strategi: baris ke-(i+1) → strategi urutan ke-i di periode
       * (urutan global: sasaran_id, lalu kode_strategi), seperti indikatortujuans + tujuanOrderedIds.
       */
      if (!toInt(p.strategi_id) && !String(raw || "").trim() && opts.indikatorStrategiRowIndex != null) {
        const ord = maps.strategiOrderedIds;
        const i = opts.indikatorStrategiRowIndex;
        if (Array.isArray(ord) && i >= 0 && i < ord.length) {
          p.strategi_id = ord[i];
        } else if (Array.isArray(ord) && ord.length === 0) {
          errs.push("Tidak ada data strategi di database untuk periode ini (isi RPJMD / strategi dulu).");
        } else if (Array.isArray(ord) && i >= ord.length) {
          errs.push(
            `Baris ke-${i + 1} melebihi jumlah strategi di periode (${ord.length} strategi). ` +
              `Tambah data strategi atau kurangi baris / isi strategi_id atau sasaran_id.`,
          );
        }
      }
    }
  } else if (table === "indikatorarahkebijakans") {
    if (!toInt(p.arah_kebijakan_id)) {
      const raw = pick(p, [
        "arah_kebijakan_nama",
        "arah_kebijakan",
        "deskripsi_arah_kebijakan",
        "deskripsi",
        "kode_arah",
        "ringkas_arah",
      ]);
      let { id, err } = lookupId(maps.arahByNorm, raw, "arah kebijakan");
      if (!id && String(raw || "").trim()) {
        const short = String(raw).slice(0, 400);
        const r2 = lookupId(maps.arahByNorm, short, "arah kebijakan");
        id = r2.id;
        err = r2.err;
      }
      if (id) p.arah_kebijakan_id = id;
      else if (err) errs.push(err);
      /**
       * Template: tanpa arah_kebijakan_id / teks arah — isi dari strategi_id + urutan arah DB per strategi
       * (pola `indikatorstrategis` + sasaran_id + strategiIdsBySasaran).
       */
      if (!toInt(p.arah_kebijakan_id) && !String(raw || "").trim() && toInt(p.strategi_id)) {
        const stid = toInt(p.strategi_id);
        const list = maps.arahIdsByStrategi?.get(stid);
        if (!list || !list.length) {
          errs.push(
            `Tidak ada arah kebijakan di database untuk strategi_id ${stid} (lengkapi arah kebijakan di RPJMD untuk strategi tersebut).`,
          );
        } else if (list.length === 1) {
          p.arah_kebijakan_id = list[0];
        } else {
          const counters = opts.arahCounterByStrategi;
          if (!(counters instanceof Map)) {
            errs.push(
              "Beberapa arah kebijakan per strategi: isi arah_kebijakan_id, atau kode_arah/deskripsi, atau impor dengan urutan baris.",
            );
          } else {
            const idx = counters.get(stid) ?? 0;
            if (idx < list.length) {
              p.arah_kebijakan_id = list[idx];
              counters.set(stid, idx + 1);
            } else {
              errs.push(
                `Baris melebihi jumlah arah kebijakan untuk strategi_id ${stid} (${list.length} arah). ` +
                  `Isi arah_kebijakan_id atau kurangi baris / isi kode_arah atau deskripsi.`,
              );
            }
          }
        }
      }
      /**
       * Tanpa strategi_id / teks arah: baris ke-(i+1) → arah urutan ke-i di periode
       * (urutan global: strategi_id, lalu kode_arah), seperti indikatorstrategis + strategiOrderedIds.
       */
      if (!toInt(p.arah_kebijakan_id) && !String(raw || "").trim() && opts.indikatorArahKebijakanRowIndex != null) {
        const ord = maps.arahOrderedIds;
        const i = opts.indikatorArahKebijakanRowIndex;
        if (Array.isArray(ord) && i >= 0 && i < ord.length) {
          p.arah_kebijakan_id = ord[i];
        } else if (Array.isArray(ord) && ord.length === 0) {
          errs.push("Tidak ada data arah kebijakan di database untuk periode ini (isi RPJMD / arah kebijakan dulu).");
        } else if (Array.isArray(ord) && i >= ord.length) {
          errs.push(
            `Baris ke-${i + 1} melebihi jumlah arah kebijakan di periode (${ord.length} arah). ` +
              `Tambah data arah kebijakan atau kurangi baris / isi arah_kebijakan_id atau strategi_id.`,
          );
        }
      }
    }
  } else if (table === "indikatorprograms") {
    if (!toInt(p.indikator_sasaran_id)) {
      const rawKode = pick(p, ["indikator_sasaran_kode", "indikator_sasaran_kode_indikator"]);
      const rawNama = pick(p, ["indikator_sasaran_nama", "indikator_sasaran_nama_indikator"]);
      const hasExplicit = String(rawKode || "").trim() || String(rawNama || "").trim();
      let id = null;
      if (String(rawKode || "").trim()) {
        const lk = lookupId(maps.indikatorSasaranByKode, rawKode, "indikator sasaran (kode)");
        id = lk.id;
        if (!id && lk.err) errs.push(lk.err);
      }
      if (!id && String(rawNama || "").trim()) {
        const lk = lookupId(maps.indikatorSasaranByNama, rawNama, "indikator sasaran (nama)");
        id = lk.id;
        if (!id && lk.err) errs.push(lk.err);
      }
      if (id) p.indikator_sasaran_id = id;
      /**
       * Template: tanpa indikator_sasaran_id / kode/nama — isi dari sasaran_id (sasaran RPJMD) + urutan indikator sasaran DB
       * (pola indikatorarahkebijakans + strategi_id + arahIdsByStrategi).
       */
      if (!toInt(p.indikator_sasaran_id) && !hasExplicit && toInt(p.sasaran_id)) {
        const seid = toInt(p.sasaran_id);
        const list = maps.indikatorSasaranIdsBySasaran?.get(seid);
        if (!list || !list.length) {
          errs.push(
            `Tidak ada indikator sasaran di database untuk sasaran_id ${seid} (lengkapi indikator sasaran di RPJMD untuk sasaran tersebut).`,
          );
        } else if (list.length === 1) {
          p.indikator_sasaran_id = list[0];
        } else {
          const counters = opts.programCounterBySasaranEntity;
          if (!(counters instanceof Map)) {
            errs.push(
              "Beberapa indikator sasaran per sasaran RPJMD: isi indikator_sasaran_id, atau kode/nama indikator sasaran, atau impor dengan urutan baris.",
            );
          } else {
            const idx = counters.get(seid) ?? 0;
            if (idx < list.length) {
              p.indikator_sasaran_id = list[idx];
              counters.set(seid, idx + 1);
            } else {
              errs.push(
                `Baris melebihi jumlah indikator sasaran untuk sasaran_id ${seid} (${list.length} indikator). ` +
                  `Isi indikator_sasaran_id atau kurangi baris / isi kode atau nama indikator sasaran.`,
              );
            }
          }
        }
      }
      /**
       * Tanpa sasaran_id / teks: baris ke-(i+1) → indikator sasaran urutan ke-i di periode
       * (urutan global: sasaran_id entitas, lalu kode_indikator), seperti indikatorarahkebijakans + arahOrderedIds.
       */
      if (!toInt(p.indikator_sasaran_id) && !hasExplicit && !toInt(p.sasaran_id) && opts.indikatorProgramRowIndex != null) {
        const ord = maps.indikatorSasaranOrderedIds;
        const i = opts.indikatorProgramRowIndex;
        if (Array.isArray(ord) && i >= 0 && i < ord.length) {
          p.indikator_sasaran_id = ord[i];
        } else if (Array.isArray(ord) && ord.length === 0) {
          errs.push("Tidak ada data indikator sasaran di database untuk periode ini (isi RPJMD / indikator sasaran dulu).");
        } else if (Array.isArray(ord) && i >= ord.length) {
          errs.push(
            `Baris ke-${i + 1} melebihi jumlah indikator sasaran di periode (${ord.length} indikator sasaran). ` +
              `Tambah data indikator sasaran atau kurangi baris / isi indikator_sasaran_id atau sasaran_id.`,
          );
        }
      }
    }
  } else if (table === "indikatorkegiatans") {
    if (!toInt(p.indikator_program_id)) {
      const raw = pick(p, ["indikator_program_kode", "program_indikator_kode"]);
      const hasExplicit = String(raw || "").trim();
      let id = null;
      if (hasExplicit) {
        const lk = lookupId(maps.indikatorProgramByKode, raw, "indikator program");
        id = lk.id;
        if (!id && lk.err) errs.push(lk.err);
      }
      if (id) p.indikator_program_id = id;
      /**
       * Template: tanpa indikator_program_id / kode — isi dari indikator_sasaran_id (baris indikator sasaran) + urutan program DB
       * (pola indikatorprograms + sasaran_id entitas + indikatorSasaranIdsBySasaran).
       */
      if (!toInt(p.indikator_program_id) && !hasExplicit && toInt(p.indikator_sasaran_id)) {
        const isid = toInt(p.indikator_sasaran_id);
        const list = maps.indikatorProgramIdsByIndikatorSasaran?.get(isid);
        if (!list || !list.length) {
          errs.push(
            `Tidak ada indikator program di database untuk indikator_sasaran_id ${isid} (lengkapi indikator program untuk indikator sasaran tersebut).`,
          );
        } else if (list.length === 1) {
          p.indikator_program_id = list[0];
        } else {
          const counters = opts.kegiatanCounterByIndikatorSasaran;
          if (!(counters instanceof Map)) {
            errs.push(
              "Beberapa indikator program per indikator sasaran: isi indikator_program_id, atau kode program, atau impor dengan urutan baris.",
            );
          } else {
            const idx = counters.get(isid) ?? 0;
            if (idx < list.length) {
              p.indikator_program_id = list[idx];
              counters.set(isid, idx + 1);
            } else {
              errs.push(
                `Baris melebihi jumlah indikator program untuk indikator_sasaran_id ${isid} (${list.length} program). ` +
                  `Isi indikator_program_id atau kurangi baris / isi kode indikator program.`,
              );
            }
          }
        }
      }
      /**
       * Tanpa indikator_sasaran_id / kode: baris ke-(i+1) → indikator program urutan ke-i (selaras indikatorprograms + urutan global).
       */
      if (!toInt(p.indikator_program_id) && !hasExplicit && !toInt(p.indikator_sasaran_id) && opts.indikatorKegiatanRowIndex != null) {
        const ord = maps.indikatorProgramOrderedIds;
        const i = opts.indikatorKegiatanRowIndex;
        if (Array.isArray(ord) && i >= 0 && i < ord.length) {
          p.indikator_program_id = ord[i];
        } else if (Array.isArray(ord) && ord.length === 0) {
          errs.push("Tidak ada data indikator program di database untuk periode ini (isi RPJMD / indikator program dulu).");
        } else if (Array.isArray(ord) && i >= ord.length) {
          errs.push(
            `Baris ke-${i + 1} melebihi jumlah indikator program di periode (${ord.length} indikator program). ` +
              `Tambah data indikator program atau kurangi baris / isi indikator_program_id atau indikator_sasaran_id.`,
          );
        }
      }
    }
  } else if (table === "indikatorsubkegiatans") {
    if (!toInt(p.sub_kegiatan_id)) {
      /**
       * Ekspor template: acuan kegiatan kadang di kolom `periode_id` (salah label) — sama pola indikator program/kegiatan.
       */
      if (!toInt(p.kegiatan_id) && toInt(p.periode_id)) {
        p.kegiatan_id = p.periode_id;
      }
      const kid = toInt(pick(p, ["kegiatan_id", "id_kegiatan"]));
      if (kid) p.kegiatan_id = kid;
      /** (a) Ada kegiatan_id → urutan sub DB per kegiatan + counter per baris sheet. */
      if (toInt(p.kegiatan_id)) {
        const k = toInt(p.kegiatan_id);
        const list = maps.subKegiatanIdsByKegiatan?.get(k);
        if (!list || !list.length) {
          errs.push(
            `Tidak ada sub kegiatan di database untuk kegiatan_id ${k} (lengkapi sub kegiatan untuk kegiatan tersebut).`,
          );
        } else if (list.length === 1) {
          p.sub_kegiatan_id = list[0];
        } else {
          const counters = opts.subCounterByKegiatan;
          if (!(counters instanceof Map)) {
            errs.push(
              "Beberapa sub kegiatan per kegiatan: isi sub_kegiatan_id atau impor dengan urutan baris (counter internal).",
            );
          } else {
            const idx = counters.get(k) ?? 0;
            /** Banyak baris per kegiatan: putar urutan sub (sama ide dengan banyak baris per induk di sheet). */
            p.sub_kegiatan_id = list[idx % list.length];
            counters.set(k, idx + 1);
          }
        }
      }
      /**
       * (b) Tanpa kegiatan_id: fallback global — counter + modulo pada `subKegiatanOrderedIds`
       * (jumlah baris sheet tidak dibatasi oleh jumlah sub di periode).
       */
      if (!toInt(p.sub_kegiatan_id) && opts.subGlobalFallbackState && Array.isArray(maps.subKegiatanOrderedIds)) {
        const ord = maps.subKegiatanOrderedIds;
        if (ord.length === 0) {
          errs.push("Tidak ada data sub kegiatan di database untuk periode ini (isi renja / sub kegiatan dulu).");
        } else {
          const st = opts.subGlobalFallbackState;
          const gi = st.n;
          p.sub_kegiatan_id = ord[gi % ord.length];
          st.n = gi + 1;
        }
      }
      if (!toInt(p.sub_kegiatan_id)) {
        errs.push("sub_kegiatan_id tidak terisi: isi kegiatan_id (atau acuan di kolom periode_id), atau pastikan urutan baris ≤ jumlah sub kegiatan di periode.");
      }
    }
  }

  return errs;
}

/** Hapus FK hierarki yang bukan kolom template Excel — hanya bantu resolver; tidak dikirim ke klien / insert. */
function stripInternalIndikatorArahPayloadKeys(table, payload) {
  if (table !== "indikatorarahkebijakans" || !payload || typeof payload !== "object") return;
  delete payload.strategi_id;
  delete payload.sasaran_id;
  delete payload.tujuan_id;
  delete payload.misi_id;
  delete payload.indikator_id;
}

/** Kolom `sasaran_id` / `periode_id` di template program = acuan resolver, bukan payload API. */
function stripInternalIndikatorProgramPayloadKeys(table, payload) {
  if (table !== "indikatorprograms" || !payload || typeof payload !== "object") return;
  delete payload.sasaran_id;
  delete payload.periode_id;
  delete payload.program_id;
}

/**
 * Pratinjau: hapus kolom larangan + `indikator_program_id` (tidak ke klien / cache).
 * Terapkan (sebelum insert): sama kecuali `indikator_program_id` tetap (resolve ulang); hapus pula
 * kolom bantu resolver yang bukan kolom tabel (`indikator_sasaran_id`, kode program, `periode_id` typo).
 */
function stripIndikatorKegiatanImportPayload(table, payload, opts = {}) {
  if (table !== "indikatorkegiatans" || !payload || typeof payload !== "object") return;
  const keys = [
    "misi_id",
    "tujuan_id",
    "sasaran_id",
    "rkpd_id",
    "created_at",
    "updated_at",
    "program_id",
    "jenis_dokumen",
    "tahun",
    "rekomendasi_ai",
    "indikator_program_kode",
    "program_indikator_kode",
    "periode_id",
  ];
  for (const k of keys) delete payload[k];
  if (opts.forPreview) delete payload.indikator_program_id;
  else delete payload.indikator_sasaran_id;
}

/** Pratinjau / Terapkan: kolom denormal sub kegiatan & timestamp tidak dikirim; `kegiatan_id` hanya bantu resolver (hapus sebelum insert). */
function stripIndikatorSubKegiatanImportPayload(table, payload, opts = {}) {
  if (table !== "indikatorsubkegiatans" || !payload || typeof payload !== "object") return;
  for (const k of ["kode_sub_kegiatan", "nama_sub_kegiatan", "created_at", "updated_at"]) delete payload[k];
  if (!opts.forPreview) delete payload.kegiatan_id;
}

function validatePreviewRow(table, payload) {
  const errs = [];
  const p = payload || {};
  const nama = String(p.nama_indikator || "").trim();
  if (!nama) errs.push("nama_indikator kosong");
  // indikatortujuans … indikatorprograms: kode otomatis — tidak wajib di Excel / pratinjau (di mana didukung).
  if (
    table !== "indikatortujuans" &&
    table !== "indikatorsasarans" &&
    table !== "indikatorstrategis" &&
    table !== "indikatorarahkebijakans" &&
    table !== "indikatorprograms" &&
    table !== "indikatorkegiatans" &&
    table !== "indikatorsubkegiatans" &&
    !String(p.kode_indikator || "").trim()
  ) {
    errs.push("kode_indikator kosong (relasi tidak lengkap atau gagal generate otomatis)");
  }
  // indikatortujuans: tujuan_id tidak wajib di pratinjau — relasi diselesaikan
  // secara posisional saat apply atau diisi manual kemudian.
  // (validasi tujuan_id dinonaktifkan untuk indikatortujuans)
  if (table === "indikatorsasarans" && !String(p.sasaran_id || "").trim()) errs.push("sasaran_id / relasi sasaran wajib");
  if (table === "indikatorstrategis" && !String(p.strategi_id || "").trim()) errs.push("strategi_id / relasi strategi wajib");
  if (table === "indikatorarahkebijakans" && !String(p.arah_kebijakan_id || "").trim()) {
    errs.push("arah_kebijakan_id / relasi arah kebijakan wajib");
  }
  if (table === "indikatorprograms" && !String(p.indikator_sasaran_id || "").trim()) {
    errs.push("indikator_sasaran_id / relasi indikator sasaran wajib");
  }
  if (table === "indikatorkegiatans" && !String(p.indikator_program_id || "").trim()) {
    errs.push("indikator_program_id / relasi indikator program wajib");
  }
  if (table === "indikatorsubkegiatans" && !String(p.sub_kegiatan_id || "").trim()) {
    errs.push("sub_kegiatan_id / relasi sub kegiatan wajib");
  }
  return errs;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sheet Referensi_Perencanaan — parsing & dedup tujuan
// ═══════════════════════════════════════════════════════════════════════════

/** Nama sheet referensi hierarki perencanaan di template impor. */
const REFERENSI_PERENCANAAN_SHEET = "Referensi_Perencanaan";

/**
 * Alias header kolom sheet Referensi_Perencanaan → key internal.
 * Kolom-kolom ini menggunakan label ramah-pengguna (spasi, huruf kapital).
 */
const REFERENSI_PERENCANAAN_COL_ALIASES = {
  "no misi":        "no_misi",
  "no_misi":        "no_misi",
  "kode tujuan":    "kode_tujuan",
  "kode_tujuan":    "kode_tujuan",
  "tujuan":         "tujuan",
  "kode sasaran":   "kode_sasaran",
  "kode_sasaran":   "kode_sasaran",
  "sasaran":        "sasaran",
  "strategi":       "strategi",
  "arah kebijakan": "arah_kebijakan",
  "arah_kebijakan": "arah_kebijakan",
  "program":        "program",
  "kegiatan":       "kegiatan",
  "sub kegiatan":   "sub_kegiatan",
  "sub_kegiatan":   "sub_kegiatan",
};

function refSheetHeaderToKey(rawHeader) {
  const lk = explicitLookupKey(rawHeader);
  return REFERENSI_PERENCANAAN_COL_ALIASES[lk] || normKey(rawHeader);
}

/**
 * Baca SEMUA baris mentah dari sheet Referensi_Perencanaan di workbook.
 * Mengembalikan [] jika sheet tidak ada atau kosong.
 * Cocok dibaca untuk level Sasaran/Strategi/Program/Kegiatan/Sub Kegiatan
 * yang memang butuh seluruh baris.
 *
 * @param {import('xlsx').WorkBook} wb  Workbook hasil XLSX.read()
 * @returns {object[]}
 */
function readPlanningReferenceSheet(wb) {
  const sheetName = (wb.SheetNames || []).find(
    (n) => normKey(n).replace(/-/g, "_") === normKey(REFERENSI_PERENCANAAN_SHEET).replace(/-/g, "_"),
  );
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
  if (matrix.length < 2) return [];
  const header = (matrix[0] || []).map(refSheetHeaderToKey);
  return matrix
    .slice(1)
    .filter((r) => r && r.some((c) => c !== "" && c != null))
    .map((r) => {
      const o = {};
      for (let i = 0; i < header.length; i++) {
        const k = header[i];
        if (!k) continue;
        const v = r[i];
        o[k] = v === undefined || v === null ? "" : v;
      }
      return o;
    });
}

/**
 * Ekstrak daftar tujuan UNIK dari baris mentah sheet Referensi_Perencanaan.
 *
 * Masalah bawaan sheet: satu tujuan muncul berulang kali karena setiap baris
 * mewakili satu sasaran/strategi/program turunannya — bukan satu tujuan.
 * Contoh: T1-01 muncul 4× (4 sasaran berbeda), T2-01 muncul 3×, dst.
 *
 * Kunci dedup yang digunakan:
 *   - No Misi
 *   - Kode Tujuan  (dinormalisasi ke huruf besar: "T1-01")
 *   - Tujuan       (nama/isi tujuan)
 *
 * Urutan kemunculan PERTAMA di sheet dipertahankan agar hasil tetap stabil
 * dan sesuai urutan dokumen asli.
 *
 * @param {object[]} rows  Baris mentah dari readPlanningReferenceSheet()
 * @returns {{ no_misi: string, kode_tujuan: string, isi_tujuan: string }[]}
 */
function extractUniqueTujuanFromPlanningReference(rows) {
  const seen = new Set();
  const result = [];
  for (const r of rows) {
    const noMisi     = String(r.no_misi     ?? "").trim();
    const kodeTujuan = String(r.kode_tujuan ?? "").trim().toUpperCase(); // "T1-01"
    const isiTujuan  = String(r.tujuan      ?? "").trim();
    // Lewati baris tanpa identitas tujuan sama sekali
    if (!kodeTujuan && !isiTujuan) continue;
    // Kunci dedup: (no_misi, kode_tujuan_upper, isi_tujuan)
    const key = `${noMisi}|${kodeTujuan}|${isiTujuan}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ no_misi: noMisi, kode_tujuan: kodeTujuan, isi_tujuan: isiTujuan });
    }
  }
  return result;
}

/**
 * Tambahkan entri ke `maps.tujuanByNorm` dari sheet Referensi_Perencanaan.
 *
 * Berguna sebagai FALLBACK ketika DB tujuan belum terisi atau no_tujuan
 * di DB tidak cocok dengan kode di kode_indikator (mis. format padding berbeda).
 * Hanya menambahkan entri yang belum ada — tidak menimpa mapping dari DB.
 *
 * @param {import('xlsx').WorkBook} wb   Workbook berisi sheet Referensi_Perencanaan
 * @param {ReturnType<typeof emptyRelationMaps>} maps  Maps yang sudah diisi dari DB
 * @param {number} pid  periode_id aktif
 */
async function supplementTujuanMapsFromPlanningReference(wb, maps, pid) {
  const refRows = readPlanningReferenceSheet(wb);
  if (!refRows.length) return;

  const uniqueTujuans = extractUniqueTujuanFromPlanningReference(refRows);
  if (!uniqueTujuans.length) return;

  for (const { kode_tujuan, isi_tujuan } of uniqueTujuans) {
    // Cek apakah sudah ada di peta dari DB — jangan timpa
    const normKode = normText(kode_tujuan);
    if (normKode && maps.tujuanByNorm.has(normKode)) continue;

    // Cari tujuan di DB berdasarkan no_tujuan dengan berbagai variasi format
    let tujuanRow = null;
    const parts = kode_tujuan.match(/^T(\d+)-(\d+)$/i);
    if (parts) {
      const mn = parseInt(parts[1], 10);
      const tn = parseInt(parts[2], 10);
      const variants = [
        kode_tujuan,
        `T${mn}-${String(tn).padStart(2, "0")}`,
        `T${mn}-${tn}`,
        `T${String(mn).padStart(2, "0")}-${String(tn).padStart(2, "0")}`,
      ].filter((v, i, a) => a.indexOf(v) === i);
      for (const v of variants) {
        tujuanRow = await Tujuan.findOne({
          where: { no_tujuan: v, periode_id: pid },
          attributes: ["id", "misi_id"],
          raw: true,
        });
        if (tujuanRow) break;
      }
    }
    // Fallback: cocokkan berdasarkan nama tujuan
    if (!tujuanRow && isi_tujuan) {
      tujuanRow = await Tujuan.findOne({
        where: { isi_tujuan, periode_id: pid },
        attributes: ["id", "misi_id"],
        raw: true,
      });
    }
    if (!tujuanRow) continue;

    // Tambahkan ke peta (putMap tidak menimpa entri yang sudah ada)
    if (kode_tujuan)  putMap(maps.tujuanByNorm, kode_tujuan, tujuanRow.id);
    if (isi_tujuan)   putMap(maps.tujuanByNorm, isi_tujuan,  tujuanRow.id);
    if (kode_tujuan && isi_tujuan) {
      putMap(maps.tujuanByNorm, `${kode_tujuan} ${isi_tujuan}`, tujuanRow.id);
    }

  }
}

// ═══════════════════════════════════════════════════════════════════════════
// END Sheet Referensi_Perencanaan helpers
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Referensi_Perencanaan (sasaran / strategi / arah) — buildResolvedHierarchyMaps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Satu pintu: selesaikan `maps.sasaranOrderedIds`, `maps.strategiOrderedIds`, `maps.arahOrderedIds`
 * dari sheet Referensi_Perencanaan agar positional fallback tidak terpengaruh duplikat/draft DB.
 *
 * Preview (`wb` ada): baca ref sheet → lookup DB → override ordered lists → kembalikan canonical arrays.
 * Apply (`wb` null): restore canonical arrays yang disimpan saat preview.
 *
 * Urutan Referensi_Perencanaan = sumber kebenaran; 16 baris = 16 sasaran unik.
 *
 * @param {{
 *   wb?: import('xlsx').WorkBook|null,
 *   pid: number,
 *   maps: ReturnType<typeof emptyRelationMaps>,
 *   canonicalSasaranOrderedIds?: number[]|null,
 *   canonicalStrategiOrderedIds?: number[]|null,
 *   canonicalArahOrderedIds?: number[]|null
 * }}
 * @returns {{ canonicalSasaranOrderedIds: number[], canonicalStrategiOrderedIds: number[], canonicalArahOrderedIds: number[] }}
 */
async function buildResolvedHierarchyMaps({
  wb,
  pid,
  maps,
  canonicalSasaranOrderedIds = null,
  canonicalStrategiOrderedIds = null,
  canonicalArahOrderedIds = null,
}) {
  /* Apply phase: restore saved canonical lists (no workbook). */
  if (!wb) {
    if (Array.isArray(canonicalSasaranOrderedIds) && canonicalSasaranOrderedIds.length) {
      maps.sasaranOrderedIds = canonicalSasaranOrderedIds;
    }
    if (Array.isArray(canonicalStrategiOrderedIds) && canonicalStrategiOrderedIds.length) {
      maps.strategiOrderedIds = canonicalStrategiOrderedIds;
    }
    if (Array.isArray(canonicalArahOrderedIds) && canonicalArahOrderedIds.length) {
      maps.arahOrderedIds = canonicalArahOrderedIds;
    }
    return {
      canonicalSasaranOrderedIds: canonicalSasaranOrderedIds || [],
      canonicalStrategiOrderedIds: canonicalStrategiOrderedIds || [],
      canonicalArahOrderedIds: canonicalArahOrderedIds || [],
    };
  }

  /* Preview phase: read reference sheet, resolve per-row entity IDs. */
  const refRows = readPlanningReferenceSheet(wb);
  if (!refRows.length) {
    return { canonicalSasaranOrderedIds: [], canonicalStrategiOrderedIds: [], canonicalArahOrderedIds: [] };
  }

  const sasaranIds = [];
  const strategiIds = [];
  const arahIds = [];
  const seenSasaran = new Set();
  const seenStrategi = new Set();
  const seenArah = new Set();

  for (const row of refRows) {
    const kodeSasaran = String(row.kode_sasaran ?? "").trim();
    const namaSasaran = String(row.nama_sasaran ?? row.sasaran ?? "").trim();
    const kodeStrategi = String(row.kode_strategi ?? "").trim();
    const namaStrategi = String(row.nama_strategi ?? row.strategi ?? "").trim();
    const kodeArah = String(row.kode_arah_kebijakan ?? "").trim();
    const namaArah = String(row.nama_arah_kebijakan ?? row.arah_kebijakan ?? "").trim();

    // ── Lookup sasaran ─────────────────────────────────────────────────────
    let sasaranRow = null;
    if (kodeSasaran) {
      sasaranRow = await Sasaran.findOne({
        where: { nomor: kodeSasaran, periode_id: pid },
        attributes: ["id"],
        raw: true,
      });
    }
    if (!sasaranRow && namaSasaran) {
      sasaranRow = await Sasaran.findOne({
        where: { isi_sasaran: namaSasaran, periode_id: pid },
        attributes: ["id"],
        raw: true,
      });
    }
    if (sasaranRow && !seenSasaran.has(sasaranRow.id)) {
      seenSasaran.add(sasaranRow.id);
      sasaranIds.push(sasaranRow.id);
    }

    // ── Lookup strategi ────────────────────────────────────────────────────
    let strategiRow = null;
    if (kodeStrategi) {
      strategiRow = await Strategi.findOne({
        where: { kode_strategi: kodeStrategi, periode_id: pid },
        attributes: ["id"],
        raw: true,
      });
    }
    if (!strategiRow && namaStrategi) {
      strategiRow = await Strategi.findOne({
        where: { deskripsi: namaStrategi, periode_id: pid },
        attributes: ["id"],
        raw: true,
      });
    }
    if (!strategiRow && sasaranRow) {
      // Fallback: strategi id terkecil untuk sasaran canonical ini
      strategiRow = await Strategi.findOne({
        where: { sasaran_id: sasaranRow.id, periode_id: pid },
        order: [["id", "ASC"]],
        attributes: ["id"],
        raw: true,
      });
    }
    if (strategiRow && !seenStrategi.has(strategiRow.id)) {
      seenStrategi.add(strategiRow.id);
      strategiIds.push(strategiRow.id);
    }

    // ── Lookup arah kebijakan ──────────────────────────────────────────────
    let arahRow = null;
    if (kodeArah) {
      arahRow = await ArahKebijakan.findOne({
        where: { kode_arah: kodeArah, periode_id: pid },
        attributes: ["id"],
        raw: true,
      });
    }
    if (!arahRow && namaArah) {
      // Coba truncate seperti arahByNorm (max 400 char)
      arahRow = await ArahKebijakan.findOne({
        where: { deskripsi: namaArah.slice(0, 400), periode_id: pid },
        attributes: ["id"],
        raw: true,
      });
    }
    if (!arahRow && strategiRow) {
      // Fallback: arah id terkecil untuk strategi canonical ini
      arahRow = await ArahKebijakan.findOne({
        where: { strategi_id: strategiRow.id, periode_id: pid },
        order: [["id", "ASC"]],
        attributes: ["id"],
        raw: true,
      });
    }
    if (arahRow && !seenArah.has(arahRow.id)) {
      seenArah.add(arahRow.id);
      arahIds.push(arahRow.id);
    }
  }

  // Override ordered lists dengan urutan canonical dari Referensi_Perencanaan.
  // Mencegah positional fallback memilih duplikat/draft dari tabel DB.
  if (sasaranIds.length) maps.sasaranOrderedIds = sasaranIds;
  if (strategiIds.length) maps.strategiOrderedIds = strategiIds;
  if (arahIds.length) maps.arahOrderedIds = arahIds;

  return {
    canonicalSasaranOrderedIds: sasaranIds,
    canonicalStrategiOrderedIds: strategiIds,
    canonicalArahOrderedIds: arahIds,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// END Referensi_Perencanaan (sasaran/strategi/arah) — buildResolvedHierarchyMaps
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse workbook → preview (tanpa insert DB).
 * @param {{ tables?: string[] }} [opts] — `tables`: tepat satu nama tabel (mis. indikatortujuans), selaras tab dashboard.
 */
async function buildPreview(periodeId, buffer, opts = {}) {
  pruneStore();
  const pid = assertPeriode(periodeId);
  const tables = (Array.isArray(opts.tables) ? opts.tables : [])
    .map((t) => String(t || "").trim().toLowerCase().replace(/-/g, "_"))
    .filter((t) => UPSERT_IMPORT_BY_TABLE[t]);
  if (tables.length !== 1) {
    const e = new Error(
      `Parameter import (tables) tidak valid. Harus tepat satu dari: ${RPJMD_INDIKATOR_IMPORT_TABLES.join(", ")}.`,
    );
    e.code = "BAD_REQUEST";
    throw e;
  }
  const importTable = tables[0];
  const maps = await loadRelationMaps(pid, tables);
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Jika sheet indikatortujuans diimpor, perkaya tujuanByNorm dengan data dari
  // sheet Referensi_Perencanaan (jika ada dalam workbook yang sama).
  // Ini membantu resolusi tujuan_id ketika DB belum lengkap atau format kode berbeda.
  // Dedup tujuan dilakukan di dalam supplementTujuanMapsFromPlanningReference.
  if (tables.includes("indikatortujuans")) {
    await supplementTujuanMapsFromPlanningReference(wb, maps, pid).catch((err) => {
      console.warn("[rpjmd-import] supplementTujuanMapsFromPlanningReference:", err.message);
    });
  }

  let canonicalSasaranOrderedIds = [];
  let canonicalStrategiOrderedIds = [];
  let canonicalArahOrderedIds = [];
  if (
    tables.includes("indikatorsasarans") ||
    tables.includes("indikatorstrategis") ||
    tables.includes("indikatorarahkebijakans")
  ) {
    try {
      ({ canonicalSasaranOrderedIds, canonicalStrategiOrderedIds, canonicalArahOrderedIds } =
        await buildResolvedHierarchyMaps({ wb, pid, maps }));
    } catch (err) {
      console.warn("[rpjmd-import] buildResolvedHierarchyMaps:", err?.message || err);
      canonicalSasaranOrderedIds = [];
      canonicalStrategiOrderedIds = [];
      canonicalArahOrderedIds = [];
    }
  }

  const sheets = [];
  const seenKeys = new Map();
  const allowed = new Set(tables);

  for (const sheetName of wb.SheetNames) {
    const table = normKey(sheetName).replace(/-/g, "_");
    if (!UPSERT_IMPORT_BY_TABLE[table] || !allowed.has(table)) continue;

    const ws = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    if (!matrix.length) {
      sheets.push({ sheetName, table, rows: [] });
      continue;
    }
    const header = matrix[0];
    assertRequiredHeaders(sheetName, header);

    const dataRows = matrix.slice(1).filter((r) => r && r.some((c) => c !== "" && c != null));
    const rows = [];
    let line = 1;
    let tujuanRowIdx = 0;
    let strategiRowIdx = 0;
    let arahRowIdx = 0;
    let programRowIdx = 0;
    const sasaranCounterByTujuan = new Map();
    const strategiCounterBySasaran = new Map();
    const arahCounterByStrategi = new Map();
    const programCounterBySasaranEntity = new Map();
    let kegiatanRowIdx = 0;
    const kegiatanCounterByIndikatorSasaran = new Map();
    const subGlobalFallbackState = { n: 0 };
    const subCounterByKegiatan = new Map();
    const temp = [];
    for (const r of dataRows) {
      line += 1;
      const raw = rowToObj(header, r);
      const payload = normalizeRowForTable(table, raw);
      const relErrs = resolveRelationsForRow(table, payload, maps, {
        indikatorTujuanRowIndex: table === "indikatortujuans" ? tujuanRowIdx : undefined,
        sasaranCounterByTujuan: table === "indikatorsasarans" ? sasaranCounterByTujuan : undefined,
        indikatorStrategiRowIndex: table === "indikatorstrategis" ? strategiRowIdx : undefined,
        strategiCounterBySasaran: table === "indikatorstrategis" ? strategiCounterBySasaran : undefined,
        indikatorArahKebijakanRowIndex: table === "indikatorarahkebijakans" ? arahRowIdx : undefined,
        arahCounterByStrategi: table === "indikatorarahkebijakans" ? arahCounterByStrategi : undefined,
        indikatorProgramRowIndex: table === "indikatorprograms" ? programRowIdx : undefined,
        programCounterBySasaranEntity: table === "indikatorprograms" ? programCounterBySasaranEntity : undefined,
        indikatorKegiatanRowIndex: table === "indikatorkegiatans" ? kegiatanRowIdx : undefined,
        kegiatanCounterByIndikatorSasaran:
          table === "indikatorkegiatans" ? kegiatanCounterByIndikatorSasaran : undefined,
        subCounterByKegiatan: table === "indikatorsubkegiatans" ? subCounterByKegiatan : undefined,
        subGlobalFallbackState: table === "indikatorsubkegiatans" ? subGlobalFallbackState : undefined,
      });
      if (table === "indikatortujuans") tujuanRowIdx += 1;
      if (table === "indikatorstrategis") strategiRowIdx += 1;
      if (table === "indikatorarahkebijakans") arahRowIdx += 1;
      if (table === "indikatorprograms") programRowIdx += 1;
      if (table === "indikatorkegiatans") kegiatanRowIdx += 1;
      temp.push({ line, payload, relErrs });
    }
    await fillMissingKodeIndikatorsForSheet(
      table,
      temp.map((t) => ({ line: t.line, payload: t.payload, relErrs: t.relErrs })),
      pid,
    );
    for (const t of temp) {
      const errors = [...t.relErrs, ...validatePreviewRow(table, t.payload)];

      // Tujuan, Sasaran, Strategi, Arah kebijakan: baris independen; kode tidak dipakai dedup dalam berkas (sama pola).
      if (
        table === "indikatortujuans" ||
        table === "indikatorsasarans" ||
        table === "indikatorstrategis" ||
        table === "indikatorarahkebijakans" ||
        table === "indikatorprograms" ||
        table === "indikatorkegiatans" ||
        table === "indikatorsubkegiatans"
      ) {
        t.payload.__uid = `row_${t.line}`;
      } else {
        const kodeTrim = String(t.payload.kode_indikator || "").trim();
        const dupKey = `${table}::${kodeTrim || `__baris${t.line}`}::${String(t.payload.jenis_dokumen || "").toLowerCase()}`;
        if (kodeTrim) {
          if (seenKeys.has(dupKey)) errors.push(`duplikat kode dalam berkas (baris ${seenKeys.get(dupKey)})`);
          else seenKeys.set(dupKey, t.line);
        }
      }

      /* Pratinjau API: jangan kirim kode ke klien (generate saat Terapkan / insert). */
      if (
        (table === "indikatorsasarans" ||
          table === "indikatorstrategis" ||
          table === "indikatorarahkebijakans" ||
          table === "indikatorprograms" ||
          table === "indikatorkegiatans" ||
          table === "indikatorsubkegiatans") &&
        t.payload &&
        typeof t.payload === "object"
      ) {
        delete t.payload.kode_indikator;
      }
      stripInternalIndikatorArahPayloadKeys(table, t.payload);
      stripInternalIndikatorProgramPayloadKeys(table, t.payload);
      stripIndikatorKegiatanImportPayload(table, t.payload, { forPreview: true });
      stripIndikatorSubKegiatanImportPayload(table, t.payload, { forPreview: true });

      rows.push({ line: t.line, payload: t.payload, errors });
    }
    sheets.push({ sheetName, table, rows });
  }

  if (!sheets.length) {
    const e = new Error(
      `Berkas tidak memiliki sheet «${importTable}» yang dapat diproses. ` +
        `Gunakan sheet dengan nama ${importTable} (sesuai template impor tab ini).`,
    );
    e.code = "BAD_REQUEST";
    throw e;
  }

  const previewId = crypto.randomBytes(12).toString("hex");
  const entry = { at: Date.now(), periodeId: pid, tables, sheets };
  previewStore.set(previewId, entry);
  await writePreviewDisk(previewId, entry).catch((err) => {
    console.error("[rpjmd-import] writePreviewDisk:", nodeErrorMessage(err));
  });
  return { previewId, periodeId: pid, importTable, sheets };
}

/**
 * Jalankan insert dari cache preview (satu transaksi DB; rollback jika salah satu insert gagal).
 */
async function applyPreview(periodeId, previewId, opts = {}) {
  pruneStore();
  const pid = assertPeriode(periodeId);
  const userId = opts.userId != null ? toInt(opts.userId) : null;
  const pv = String(previewId || "");

  const dupLog = await ImportLog.findOne({ where: { preview_id: pv } });
  if (dupLog) {
    const e = new Error("Preview sudah diproses.");
    e.code = "CONFLICT";
    throw e;
  }

  let entry = previewStore.get(pv);
  if (!entry) {
    entry = await readPreviewDisk(pv);
    if (entry) previewStore.set(pv, entry);
  }
  if (!entry) {
    const e = new Error("Preview tidak ditemukan atau kedaluwarsa. Unggah ulang berkas.");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (toInt(entry.periodeId) !== pid) {
    const e = new Error("previewId tidak cocok dengan periode yang dipilih.");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const tableOrder =
    Array.isArray(entry.tables) && entry.tables.length
      ? entry.tables.filter((t) => UPSERT_IMPORT_BY_TABLE[t])
      : ["indikatortujuans"];

  const sheetByTable = new Map((entry.sheets || []).map((s) => [s.table, s]));

  /** Peta relasi terkini (Tn dari kode IKU = urutan tujuan, bukan PK). */
  const maps = await loadRelationMaps(pid, tableOrder);
  if (
    tableOrder.includes("indikatorsasarans") ||
    tableOrder.includes("indikatorstrategis") ||
    tableOrder.includes("indikatorarahkebijakans")
  ) {
    try {
      await buildResolvedHierarchyMaps({
        wb: null,
        pid,
        maps,
        canonicalSasaranOrderedIds: entry.canonicalSasaranOrderedIds || [],
        canonicalStrategiOrderedIds: entry.canonicalStrategiOrderedIds || [],
        canonicalArahOrderedIds: entry.canonicalArahOrderedIds || [],
      });
    } catch (err) {
      console.warn("[rpjmd-import] buildResolvedHierarchyMaps (apply):", err?.message || err);
    }
  }
  for (const table of tableOrder) {
    const sh = sheetByTable.get(table);
    if (!sh) continue;
    let tujuanRowIdx = 0;
    let sasaranRowIdx = 0;
    let strategiRowIdx = 0;
    let arahRowIdx = 0;
    let programRowIdx = 0;
    const sasaranCounterByTujuan = new Map();
    const strategiCounterBySasaran = new Map();
    const arahCounterByStrategi = new Map();
    const programCounterBySasaranEntity = new Map();
    let kegiatanRowIdx = 0;
    const kegiatanCounterByIndikatorSasaran = new Map();
    const subGlobalFallbackState = { n: 0 };
    const subCounterByKegiatan = new Map();
    const batch = [];
    for (const row of sh.rows || []) {
      if (Array.isArray(row.errors) && row.errors.length) continue;
      /* Samakan pratinjau lama di disk: alias template (mis. indikator_kinerja → jenis) tetap diterapkan saat Terapkan. */
      const payload = normalizeRowForTable(table, { ...row.payload });
      const relErrs = resolveRelationsForRow(table, payload, maps, {
        indikatorTujuanRowIndex: table === "indikatortujuans" ? tujuanRowIdx : undefined,
        indikatorSasaranRowIndex: table === "indikatorsasarans" ? sasaranRowIdx : undefined,
        sasaranCounterByTujuan: table === "indikatorsasarans" ? sasaranCounterByTujuan : undefined,
        indikatorStrategiRowIndex: table === "indikatorstrategis" ? strategiRowIdx : undefined,
        strategiCounterBySasaran: table === "indikatorstrategis" ? strategiCounterBySasaran : undefined,
        indikatorArahKebijakanRowIndex: table === "indikatorarahkebijakans" ? arahRowIdx : undefined,
        arahCounterByStrategi: table === "indikatorarahkebijakans" ? arahCounterByStrategi : undefined,
        indikatorProgramRowIndex: table === "indikatorprograms" ? programRowIdx : undefined,
        programCounterBySasaranEntity: table === "indikatorprograms" ? programCounterBySasaranEntity : undefined,
        indikatorKegiatanRowIndex: table === "indikatorkegiatans" ? kegiatanRowIdx : undefined,
        kegiatanCounterByIndikatorSasaran:
          table === "indikatorkegiatans" ? kegiatanCounterByIndikatorSasaran : undefined,
        subCounterByKegiatan: table === "indikatorsubkegiatans" ? subCounterByKegiatan : undefined,
        subGlobalFallbackState: table === "indikatorsubkegiatans" ? subGlobalFallbackState : undefined,
      });
      if (table === "indikatortujuans") tujuanRowIdx += 1;
      if (table === "indikatorsasarans") sasaranRowIdx += 1;
      if (table === "indikatorstrategis") strategiRowIdx += 1;
      if (table === "indikatorarahkebijakans") arahRowIdx += 1;
      if (table === "indikatorprograms") programRowIdx += 1;
      if (table === "indikatorkegiatans") kegiatanRowIdx += 1;
      batch.push({ row, payload, relErrs });
    }
    await fillMissingKodeIndikatorsForSheet(
      table,
      batch.map((b) => ({ line: b.row.line, payload: b.payload, relErrs: b.relErrs })),
      pid,
    );
    for (const { row, payload, relErrs } of batch) {
      row.errors = [...relErrs, ...validatePreviewRow(table, payload)];
      row.payload = payload;
    }
  }

  const skippedErrors = [];
  for (const table of tableOrder) {
    const sh = sheetByTable.get(table);
    if (!sh) continue;
    for (const row of sh.rows || []) {
      if (row.errors?.length) {
        skippedErrors.push({
          sheet: sh.sheetName,
          line: row.line,
          message: row.errors.join("; "),
        });
      }
    }
  }

  const toInsert = [];
  let previewTotalRows = 0;
  for (const table of tableOrder) {
    const sh = sheetByTable.get(table);
    if (!sh) continue;
    for (const row of sh.rows || []) {
      previewTotalRows += 1;
      if (Array.isArray(row.errors) && row.errors.length) continue;
      toInsert.push({ payload: row.payload, sheet: sh.sheetName, table, line: row.line });
    }
  }

  const tenantId = tenantContext.getTenantId() || 1;
  const logRow = {
    preview_id: pv,
    user_id: userId,
    periode_id: pid,
    tenant_id: tenantId,
    jumlah_berhasil: 0,
    jumlah_gagal: skippedErrors.length,
  };

  /**
   * Tanpa insert baris indikator: transaksi Sequelize «hampir kosong» + ImportLog
   * pernah memicu AggregateError (mysql2) di lingkungan tertentu. Catat log di luar transaksi.
   */
  if (toInsert.length === 0) {
    await ImportLog.create(logRow);
    previewStore.delete(pv);
    await deletePreviewDisk(pv);
    const failed = skippedErrors.length;
    return {
      success: true,
      inserted: 0,
      updated: 0,
      applied: 0,
      attempted: 0,
      previewTotalRows,
      skippedPreApply: failed,
      failed,
      errors: skippedErrors,
      rowDetails: [],
    };
  }

  let insertedNew = 0;
  let updatedExisting = 0;
  const applyRowDetails = [];
  const skippedDuplicates = [];

  function isDuplicateIndikatorApplyError(err) {
    if (!err) return false;
    if (err.code === "CONFLICT") return true;
    if (err.name === "SequelizeUniqueConstraintError") return true;
    const msg = `${String(err.message || "")} ${nodeErrorMessage(err)}`;
    return (
      /sudah ada untuk periode ini dengan jenis dokumen|kombinasi kode_indikator.*sudah ada|Data duplikat:\s*kode_indikator|ER_DUP_ENTRY|Duplicate entry|unique constraint/i.test(
        msg,
      )
    );
  }

  /**
   * Satu transaksi panjang dengan banyak INSERT + hook findOne kadang memicu
   * AggregateError (mysql2 / pool). Satu transaksi pendek per baris: tetap
   * konsisten indeks unik per commit, dan mengurangi beban satu koneksi.
   */
  for (const item of toInsert) {
    try {
      let upsertRes;
      let plOut = null;
      await sequelize.transaction(async (transaction) => {
        const kodeRaw = item.payload?.kode_indikator;
        const pl = { ...item.payload };
        if (
          item.table === "indikatorsasarans" ||
          item.table === "indikatorstrategis" ||
          item.table === "indikatorarahkebijakans" ||
          item.table === "indikatorprograms" ||
          item.table === "indikatorkegiatans" ||
          item.table === "indikatorsubkegiatans"
        ) {
          delete pl.kode_indikator;
        }
        stripInternalIndikatorArahPayloadKeys(item.table, pl);
        stripInternalIndikatorProgramPayloadKeys(item.table, pl);
        stripIndikatorKegiatanImportPayload(item.table, pl);
        stripIndikatorSubKegiatanImportPayload(item.table, pl);
        if (kodeRaw != null && String(kodeRaw).trim()) {
          pl.kode_indikator = String(kodeRaw).trim();
        }
        const upsertFn = UPSERT_IMPORT_BY_TABLE[item.table];
        if (!upsertFn) {
          const e = new Error(`Tabel impor tidak didukung: ${item.table}`);
          e.code = "INTERNAL";
          throw e;
        }
        upsertRes = await upsertFn(pid, pl, { transaction });
        plOut = pl;
      });
      const meta = upsertRes && upsertRes.__importMeta;
      if (meta && meta.op === "update") updatedExisting += 1;
      else insertedNew += 1;
      applyRowDetails.push({
        line: item.line,
        sheet: item.sheet,
        table: item.table,
        status: meta && meta.op === "update" ? "updated" : "inserted",
        kode_indikator: (plOut && plOut.kode_indikator) ?? item.payload?.kode_indikator,
        nama_indikator: (plOut && plOut.nama_indikator) ?? item.payload?.nama_indikator,
        tujuan_id: (plOut && plOut.tujuan_id) ?? item.payload?.tujuan_id,
        sasaran_id: plOut && plOut.sasaran_id,
        strategi_id: plOut && plOut.strategi_id,
        arah_kebijakan_id: plOut && plOut.arah_kebijakan_id,
        indikator_sasaran_id: plOut && plOut.indikator_sasaran_id,
        indikator_program_id: plOut && plOut.indikator_program_id,
        sub_kegiatan_id: plOut && plOut.sub_kegiatan_id,
        kodeRegenerated: !!(meta && meta.kodeRegeneratedAfterKodeConflict),
      });
    } catch (err) {
      if (isDuplicateIndikatorApplyError(err)) {
        skippedDuplicates.push({
          sheet: item.sheet,
          line: item.line,
          table: item.table,
          kode_indikator: item.payload?.kode_indikator,
          message: nodeErrorMessage(err),
        });
        continue;
      }
      const inner = nodeErrorMessage(err);
      const e = new Error(`Gagal menyisipkan ${item.table} (“${item.sheet}” baris ${item.line}): ${inner}`);
      e.code = err?.code;
      e.name = err?.name;
      e.parent = err?.parent;
      e.cause = err;
      throw e;
    }
  }

  const appliedOk = insertedNew + updatedExisting;

  await ImportLog.create({
    ...logRow,
    jumlah_berhasil: appliedOk,
    jumlah_gagal: skippedErrors.length,
  });

  previewStore.delete(pv);
  await deletePreviewDisk(pv);

  const failed = skippedErrors.length;
  const errors = skippedErrors;

  return {
    success: true,
    /** Baris benar-benar baru di DB (INSERT). */
    inserted: insertedNew,
    /** Baris yang sudah ada dan di-UPDATE (bukan baris baru). */
    updated: updatedExisting,
    /** inserted + updated — sama dengan jumlah transaksi apply yang sukses. */
    applied: appliedOk,
    /** Jumlah baris yang lolos validasi dan dijadwalkan apply. */
    attempted: toInsert.length,
    /** Total baris di pratinjau sheet (termasuk yang gagal validasi pratinjau). */
    previewTotalRows,
    /** Baris tidak di-apply karena error pratinjau / relasi sebelum insert. */
    skippedPreApply: failed,
    skippedDuplicates: skippedDuplicates.length,
    duplicateSkips: skippedDuplicates,
    failed,
    errors,
    /** Satu entri per baris yang sukses apply (insert/update), untuk audit UI. */
    rowDetails: applyRowDetails,
  };
}

module.exports = {
  buildPreview,
  applyPreview,
  RPJMD_INDIKATOR_IMPORT_TABLES,
  // Referensi_Perencanaan helpers — bisa dipakai di modul lain
  readPlanningReferenceSheet,
  extractUniqueTujuanFromPlanningReference,
  supplementTujuanMapsFromPlanningReference,
  buildResolvedHierarchyMaps,
};
