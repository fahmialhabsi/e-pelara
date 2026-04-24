/**
 * Util bersama pola Step Tujuan → dipakai ulang step indikator RPJMD lain.
 */

import { normalizeListItems } from "@/utils/apiResponse";

export const RPJMD_INDIKATOR_DRAFT_KEYS = [
  "satuan",
  "kode_indikator",
  "nama_indikator",
  "jenis",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "jenis_indikator",
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
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "sumber_data",
  "penanggung_jawab",
  "keterangan",
  "tipe_indikator",
  "target_awal",
  "target_akhir",
  "rekomendasi_ai",
];

/** Field tambahan step Program (indikator program) */
export const PROGRAM_EXTRA_DRAFT_KEYS = [
  "uraian",
  "target",
  "anggaran",
  "nama_program",
  "kode_program",
];

/** Field tambahan step Kegiatan */
export const KEGIATAN_EXTRA_DRAFT_KEYS = [
  "uraian",
  "target",
  "realisasi",
  "anggaran",
  "nama_kegiatan",
  "kode_kegiatan",
];

/** Kunci array indikator per step di Formik wizard RPJMD */
export const WIZARD_INDIKATOR_LIST_KEYS = [
  "misi",
  "tujuan",
  "sasaran",
  "strategi",
  "arah_kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
];

const STRIP_EXTRA_ROOT_KEYS = [
  "indikator_program_id",
  "rpjmd_import_indikator_tujuan_id",
  "rpjmd_import_indikator_strategi_id",
  "sasaran_nomor",
  "penanggung_jawab_label",
  "indikator_kinerja",
];

/**
 * Buang snapshot indikator & draft skalar dari objek persistensi `form_rpjmd`.
 * Konteks hierarki (misi_id, tujuan_id, label, periode, tahun, dll.) tetap.
 */
export function stripAllPersistedRpjmdIndicatorDrafts(parsed) {
  if (parsed == null || typeof parsed !== "object") return parsed;
  const out = { ...parsed };
  for (const k of WIZARD_INDIKATOR_LIST_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = [];
  }
  const scalarClear = new Set([
    ...RPJMD_INDIKATOR_DRAFT_KEYS,
    ...PROGRAM_EXTRA_DRAFT_KEYS,
    ...KEGIATAN_EXTRA_DRAFT_KEYS,
    ...STRIP_EXTRA_ROOT_KEYS,
  ]);
  for (const k of scalarClear) {
    if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = "";
  }
  return out;
}

/** Alias kompatibilitas */
export const stripPersistedTujuanIndikatorDraft =
  stripAllPersistedRpjmdIndicatorDrafts;

export function toFormStr(v) {
  if (v == null || v === "") return "";
  return String(v);
}

/** True jika semua baris tampak dari DB (id numerik) — untuk sembunyikan Simpan & Lanjut duplikat. */
export function listLooksPersistedFromServer(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.every((it) => {
    if (!it) return false;
    const rid =
      it.id ??
      it.indikator_program_id ??
      it.indikatorProgramId ??
      it.indikator_kegiatan_id ??
      it.indikatorKegiatanId;
    return (
      rid != null && String(rid).trim() !== "" && /^\d+$/.test(String(rid))
    );
  });
}

/**
 * True jika semua item list sudah diisi `baseline` DAN `penanggung_jawab` —
 * penanda data sudah benar-benar di-finalize/disimpan, bukan sekadar draft impor.
 *
 * Berbeda dengan `listLooksPersistedFromServer` (cek numeric id):
 * - Row import awal punya id tapi baseline/pj masih NULL → bukan final
 * - Row yang sudah di-edit & simpan punya baseline & pj terisi → final
 */
export function listLooksFinalized(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.every((item) => {
    if (!item) return false;
    const bl = item.baseline ?? item.Baseline;
    const pj = item.penanggung_jawab ?? item.penanggungJawab;
    const hasBaseline =
      bl != null &&
      String(bl).trim() !== "" &&
      String(bl).trim() !== "-" &&
      String(bl).trim() !== "—";
    const hasPJ =
      pj != null &&
      String(pj).trim() !== "" &&
      String(pj).trim() !== "-" &&
      String(pj).trim() !== "—";
    return hasBaseline && hasPJ;
  });
}

function getVal(src, key) {
  if (!src || typeof src !== "object") return undefined;
  if (key in src && src[key] !== undefined) return src[key];
  const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  if (camel in src && src[camel] !== undefined) return src[camel];
  return undefined;
}

/** Hilangkan relasi berat agar field skalar induk tidak hilang saat spread/toJSON. */
function omitHeavyAssociations(o) {
  if (!o || typeof o !== "object") return {};
  const next = { ...o };
  delete next.kegiatans;
  delete next.Kegiatans;
  return next;
}

/** Gabung dataValues + plain object agar field Sequelize tidak hilang saat hydrate. */
function collectPlainRow(row) {
  if (row == null) return {};
  if (typeof row.toJSON === "function") {
    try {
      return omitHeavyAssociations({ ...row.toJSON() });
    } catch {
      /* ignore circular JSON */
    }
  }
  const plain = omitHeavyAssociations({ ...(row || {}) });
  if (row.dataValues && typeof row.dataValues === "object") {
    return omitHeavyAssociations({ ...row.dataValues, ...plain });
  }
  return plain;
}

/**
 * Ratakan baris API Sequelize / JSON agar hydrate tidak ketinggalan field (camelCase / alias).
 */
export function flattenIndikatorRowForWizard(row) {
  const src = collectPlainRow(row);
  const out = { ...src };

  for (const key of RPJMD_INDIKATOR_DRAFT_KEYS) {
    const v = getVal(src, key);
    if (v !== undefined) out[key] = v;
  }

  if (out.nama_indikator == null || String(out.nama_indikator).trim() === "") {
    const indObj =
      src.Indikator && typeof src.Indikator === "object"
        ? src.Indikator
        : src.indikator && typeof src.indikator === "object"
          ? src.indikator
          : null;
    const indPlain =
      indObj && typeof indObj === "object"
        ? typeof indObj.toJSON === "function"
          ? indObj.toJSON()
          : indObj
        : null;
    const fromIndikatorString =
      typeof src.indikator === "string" && String(src.indikator).trim() !== ""
        ? String(src.indikator).trim()
        : null;
    const n =
      getVal(src, "nama_indikator") ??
      fromIndikatorString ??
      (indPlain && getVal(indPlain, "nama_indikator")) ??
      src.nama ??
      src.isi_indikator ??
      src.indikator_nama;
    if (n != null && String(n).trim() !== "") out.nama_indikator = n;
  }

  const pr = src.program || src.Program;
  if (pr && typeof pr === "object") {
    const pj = typeof pr.toJSON === "function" ? pr.toJSON() : pr;
    if (!out.kode_program && pj.kode_program)
      out.kode_program = pj.kode_program;
    if (!out.nama_program && pj.nama_program)
      out.nama_program = pj.nama_program;
  }

  const kg = src.kegiatan ?? src.Kegiatan;
  if (kg && typeof kg === "object") {
    const kj = typeof kg.toJSON === "function" ? kg.toJSON() : kg;
    if (!out.kode_kegiatan && kj.kode_kegiatan)
      out.kode_kegiatan = kj.kode_kegiatan;
    if (!out.nama_kegiatan && kj.nama_kegiatan)
      out.nama_kegiatan = kj.nama_kegiatan;
  }

  const opd = src.opdPenanggungJawab ?? src.opd_penanggung_jawab;
  if (
    (out.penanggung_jawab == null || out.penanggung_jawab === "") &&
    opd &&
    typeof opd === "object" &&
    opd.id != null
  ) {
    out.penanggung_jawab = opd.id;
  }

  /* Template Excel: kolom `indikator_kinerja` ↔ field wizard/DB `jenis`. */
  if (
    (out.jenis == null || String(out.jenis).trim() === "") &&
    out.indikator_kinerja != null &&
    String(out.indikator_kinerja).trim() !== ""
  ) {
    out.jenis = out.indikator_kinerja;
  }

  return out;
}

/** Field skalar indikator kegiatan (hierarki + induk program + indikator program). */
const INDIKATOR_KEGIATAN_SCALAR_KEYS = [
  "id",
  "misi_id",
  "tujuan_id",
  "sasaran_id",
  "program_id",
  "indikator_program_id",
  "indikatorProgramId",
  "kode_indikator",
  "nama_indikator",
  "tipe_indikator",
  "jenis",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "jenis_indikator",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "satuan",
  "definisi_operasional",
  "metode_penghitungan",
  "baseline",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "target_awal",
  "target_akhir",
  "tahun_awal",
  "tahun_akhir",
  "sumber_data",
  "penanggung_jawab",
  "keterangan",
  "rekomendasi_ai",
  "jenis_dokumen",
  "jenisDokumen",
  "tahun",
  "rkpd_id",
];

/**
 * Normalisasi baris GET /indikator-kegiatan — sama bentuk body { data, meta }.
 */
export function extractIndikatorKegiatanListFromResponseBody(body) {
  return extractIndikatorProgramListFromResponseBody(body);
}

/** Normalisasi khusus baris GET /indikator-kegiatan — draft + list Preview. */
export function mapIndikatorKegiatanApiRowToWizard(row) {
  const flat = flattenIndikatorRowForWizard(row);
  const src = collectPlainRow(row);
  const out = { ...flat };

  for (const k of INDIKATOR_KEGIATAN_SCALAR_KEYS) {
    const v = getVal(src, k);
    if (
      v !== undefined &&
      (out[k] === undefined || out[k] === null || out[k] === "")
    ) {
      out[k] = v;
    }
  }

  const ip = src.indikatorProgram ?? src.indikator_program;
  if (ip && typeof ip === "object") {
    const ipj = typeof ip.toJSON === "function" ? ip.toJSON() : ip;
    if (
      out.indikator_program_id == null &&
      (ipj.id != null || ipj.indikator_program_id != null)
    ) {
      out.indikator_program_id = ipj.id ?? ipj.indikator_program_id;
    }
  }

  if (out.nama_indikator == null || String(out.nama_indikator).trim() === "") {
    const n =
      getVal(src, "nama_indikator") ??
      getVal(src, "namaIndikator") ??
      src.nama ??
      src.isi_indikator ??
      src.indikator_nama;
    if (n != null && String(n).trim() !== "") out.nama_indikator = String(n);
  }

  const jenisVal = out.jenis ?? getVal(src, "jenis");
  if (!out.uraian && jenisVal != null && String(jenisVal).trim() !== "") {
    out.uraian = String(jenisVal);
  }

  const rid = getVal(src, "id");
  if (rid != null && String(rid).trim() !== "") {
    out.id = String(rid);
    out.indikator_id = String(rid);
  }

  return out;
}

/** Field skalar indikator program sesuai model/controller backend (alias eksplisit). */
const INDIKATOR_PROGRAM_SCALAR_KEYS = [
  "id",
  "sasaran_id",
  "program_id",
  "kode_indikator",
  "nama_indikator",
  "tipe_indikator",
  "jenis",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "jenis_indikator",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "satuan",
  "definisi_operasional",
  "metode_penghitungan",
  "baseline",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "target_awal",
  "target_akhir",
  "tahun_awal",
  "tahun_akhir",
  "sumber_data",
  "penanggung_jawab",
  "keterangan",
  "rekomendasi_ai",
  "jenis_dokumen",
  "jenisDokumen",
  "tahun",
  "rkpd_id",
];

/**
 * Normalisasi khusus baris GET /indikator-program — pastikan draft + list Preview terisi.
 */
export function mapIndikatorProgramApiRowToWizard(row) {
  const flat = flattenIndikatorRowForWizard(row);
  const src = collectPlainRow(row);
  const out = { ...flat };

  for (const k of INDIKATOR_PROGRAM_SCALAR_KEYS) {
    const v = getVal(src, k);
    if (
      v !== undefined &&
      (out[k] === undefined || out[k] === null || out[k] === "")
    ) {
      out[k] = v;
    }
  }

  if (out.nama_indikator == null || String(out.nama_indikator).trim() === "") {
    const n =
      getVal(src, "nama_indikator") ??
      getVal(src, "namaIndikator") ??
      src.nama ??
      src.isi_indikator ??
      src.indikator_nama;
    if (n != null && String(n).trim() !== "") out.nama_indikator = String(n);
  }

  const jenisVal = out.jenis ?? getVal(src, "jenis");
  if (!out.uraian && jenisVal != null && String(jenisVal).trim() !== "") {
    out.uraian = String(jenisVal);
  }

  return out;
}

export function mapApiIndikatorToListRow(row) {
  if (!row) return {};
  return flattenIndikatorRowForWizard(row);
}

/** Ekstrak array baris dari body response indikator-program (bentuk berbeda-beda). */
export function extractIndikatorProgramListFromResponseBody(body) {
  const fromNorm = normalizeListItems(body);
  if (fromNorm.length > 0) return fromNorm;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.rows)) return body.rows;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

export function clearIndikatorDraftScalars(
  setFieldValue,
  keys = RPJMD_INDIKATOR_DRAFT_KEYS,
) {
  for (const key of keys) {
    setFieldValue(key, "");
  }
}

/**
 * Isi field draft Formik dari satu baris API (baris pertama = tab Umum–Target).
 */
export function hydrateDraftFromIndikatorRow(
  row,
  setFieldValue,
  extraKeys = [],
) {
  if (!row) return;
  const src = collectPlainRow(row);
  const merged = flattenIndikatorRowForWizard(row);
  const keys = [...RPJMD_INDIKATOR_DRAFT_KEYS, ...extraKeys];
  for (const key of keys) {
    let v = merged[key];
    if (v === undefined) v = getVal(src, key);
    if (v === undefined) continue;
    if (key === "penanggung_jawab" && v != null && v !== "") {
      setFieldValue(key, String(v));
      continue;
    }
    if (key === "anggaran" || key === "target" || key === "realisasi") {
      if (v === null || v === undefined || v === "") setFieldValue(key, "");
      else setFieldValue(key, Number.isFinite(Number(v)) ? Number(v) : v);
      continue;
    }
    setFieldValue(key, toFormStr(v));
  }
  if (
    "tahun_awal" in merged &&
    merged.tahun_awal != null &&
    merged.tahun_awal !== ""
  ) {
    setFieldValue("tahun_awal", Number(merged.tahun_awal));
  }
  if (
    "tahun_akhir" in merged &&
    merged.tahun_akhir != null &&
    merged.tahun_akhir !== ""
  ) {
    setFieldValue("tahun_akhir", Number(merged.tahun_akhir));
  }
}

function firstNonEmptyStr(...candidates) {
  for (const x of candidates) {
    if (x == null) continue;
    const s = String(x).trim();
    if (s !== "") return s;
  }
  return "";
}

/**
 * Kunci unik draft preview / submit (selaras rule backend).
 * Pakai fallback kode/tujuan/periode dari row + camelCase + ctx agar baris API/impor vs form aktif tetap satu key.
 */
export function getRpjmdIndikatorDraftDedupeKey(row, ctx = {}) {
  const kode = firstNonEmptyStr(
    row.kode_indikator,
    row.kode,
    row.kodeIndikator,
    ctx.kode_indikator,
    ctx.kode,
  );
  const tid = firstNonEmptyStr(row.tujuan_id, row.tujuanId, ctx.tujuan_id);
  const pid = firstNonEmptyStr(row.periode_id, row.periodeId, ctx.periode_id);
  const jd = firstNonEmptyStr(
    row.jenis_dokumen,
    row.jenisDokumen,
    ctx.jenis_dokumen,
  ).toUpperCase();
  return [kode, tid, pid, jd].join("\u0001");
}

/** Dedupe: entri terakhir menang (paling baru). */
export function dedupeRpjmdIndikatorDraftRows(rows, ctx) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const m = new Map();
  for (const r of rows) {
    m.set(getRpjmdIndikatorDraftDedupeKey(r, ctx), r);
  }
  return Array.from(m.values());
}

/** Kosong semantik: boleh diisi dari incoming. `0` / `"0"` / `false` bukan kosong. */
export function isMeaningfullyEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/** Field konten yang boleh dilengkapi jika masih kosong (Tambah Indikator, key sama). */
export const RPJMD_DRAFT_FILL_EMPTY_MERGE_KEYS = [
  "tipe_indikator",
  "jenis_indikator",
  "jenis",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "definisi_operasional",
  "metode_penghitungan",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "baseline",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "sumber_data",
  "penanggung_jawab",
  "satuan",
];

/**
 * Gabung incoming ke existing: hanya isi field yang existing-nya kosong.
 * Tidak mengganti nilai yang sudah terisi.
 */
export function mergeDraftFillEmptyOnly(existing, incoming) {
  if (!existing || typeof existing !== "object") return { ...(incoming || {}) };
  if (!incoming || typeof incoming !== "object") return { ...existing };
  const out = { ...existing };
  for (const key of RPJMD_DRAFT_FILL_EMPTY_MERGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue;
    const inc = incoming[key];
    if (isMeaningfullyEmpty(inc)) continue;
    if (isMeaningfullyEmpty(out[key])) {
      out[key] = inc;
    }
  }
  return out;
}

/**
 * Jika key sama dengan salah satu baris: merge fill-empty-only, pertahankan urutan & `indikator_id`.
 * Jika belum ada: append baris baru.
 */
export function upsertRpjmdIndikatorDraftRow(rows, incomingRow, ctx = {}) {
  if (!Array.isArray(rows)) return [incomingRow];
  const keyIn = getRpjmdIndikatorDraftDedupeKey(incomingRow, ctx);
  const idx = rows.findIndex(
    (r) => getRpjmdIndikatorDraftDedupeKey(r, ctx) === keyIn,
  );
  if (idx < 0) {
    return [...rows, incomingRow];
  }
  const merged = mergeDraftFillEmptyOnly(rows[idx], incomingRow);
  merged.indikator_id = rows[idx].indikator_id ?? merged.indikator_id;
  const next = [...rows];
  next[idx] = merged;
  return next;
}

// ─── comparePreviewWithStored ────────────────────────────────────────────────

/** Field-field substantif yang dibandingkan antara preview dan stored. */
const COMPARE_INDIKATOR_FIELDS = [
  "kode_indikator",
  "nama_indikator",
  "tipe_indikator",
  "jenis_indikator",
  "indikator_kinerja",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "definisi_operasional",
  "metode_penghitungan",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "satuan",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "sumber_data",
  "penanggung_jawab",
];

/**
 * Normalisasi satu nilai field untuk perbandingan:
 * - null / undefined / "" / "—" / "-" → ""
 * - trim whitespace
 * - normalisasi desimal: ganti koma → titik, hapus spasi sebelum/sesudah operator angka
 */
function normCompare(v) {
  if (v == null) return "";
  const s = String(v).trim();
  if (s === "" || s === "—" || s === "-") return "";
  // Normalisasi desimal: "71,4" → "71.4"
  const numNorm = s.replace(/,/g, ".");
  // Jika seluruh string adalah angka setelah normalisasi, kembalikan tanpa trailing zeros
  if (/^-?\d+(\.\d+)?$/.test(numNorm)) {
    const n = parseFloat(numNorm);
    return Number.isFinite(n) ? String(n) : s;
  }
  return s;
}

/** Bandingkan satu item preview dengan satu item stored. True bila semua field penting sama. */
function compareIndikatorItem(previewItem, storedItem) {
  if (!previewItem || !storedItem) return false;
  for (const key of COMPARE_INDIKATOR_FIELDS) {
    const pv = normCompare(
      previewItem[key] ??
        previewItem[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())],
    );
    const sv = normCompare(
      storedItem[key] ??
        storedItem[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())],
    );
    if (pv !== sv) return false;
  }
  return true;
}

/**
 * Bandingkan previewList (current form list) dengan storedList (snapshot awal dari DB).
 *
 * Return true (isSameAsStored) hanya jika:
 * - kedua array tidak kosong
 * - panjang sama
 * - setiap item preview cocok dengan item stored di posisi sama (atau via kode_indikator)
 *
 * @param {object[]} previewList — list dari Formik values[stepKey] saat ini
 * @param {object[]} storedList  — snapshot awal saat list pertama kali terisi dari DB
 * @returns {boolean}
 */
export function comparePreviewWithStored(previewList, storedList) {
  if (!Array.isArray(previewList) || !Array.isArray(storedList)) return false;
  if (previewList.length === 0 || storedList.length === 0) return false;
  if (previewList.length !== storedList.length) return false;

  for (let i = 0; i < previewList.length; i++) {
    const prev = previewList[i];
    // Coba cocokkan via kode_indikator dulu; fallback ke posisi
    const kode = normCompare(prev?.kode_indikator);
    const stored = kode
      ? (storedList.find((s) => normCompare(s?.kode_indikator) === kode) ??
        storedList[i])
      : storedList[i];
    if (!compareIndikatorItem(prev, stored)) return false;
  }
  return true;
}
