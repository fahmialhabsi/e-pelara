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
      rid != null &&
      String(rid).trim() !== "" &&
      /^\d+$/.test(String(rid))
    );
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
    const ind = src.Indikator || src.indikator;
    const indPlain =
      ind && typeof ind === "object"
        ? typeof ind.toJSON === "function"
          ? ind.toJSON()
          : ind
        : null;
    const n =
      getVal(src, "nama_indikator") ??
      (indPlain && getVal(indPlain, "nama_indikator")) ??
      src.nama ??
      src.isi_indikator ??
      src.indikator_nama;
    if (n != null && String(n).trim() !== "") out.nama_indikator = n;
  }

  const pr = src.program || src.Program;
  if (pr && typeof pr === "object") {
    const pj = typeof pr.toJSON === "function" ? pr.toJSON() : pr;
    if (!out.kode_program && pj.kode_program) out.kode_program = pj.kode_program;
    if (!out.nama_program && pj.nama_program) out.nama_program = pj.nama_program;
  }

  const kg = src.kegiatan ?? src.Kegiatan;
  if (kg && typeof kg === "object") {
    const kj = typeof kg.toJSON === "function" ? kg.toJSON() : kg;
    if (!out.kode_kegiatan && kj.kode_kegiatan) out.kode_kegiatan = kj.kode_kegiatan;
    if (!out.nama_kegiatan && kj.nama_kegiatan) out.nama_kegiatan = kj.nama_kegiatan;
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
    if (v !== undefined && (out[k] === undefined || out[k] === null || out[k] === "")) {
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
    if (v !== undefined && (out[k] === undefined || out[k] === null || out[k] === "")) {
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

export function clearIndikatorDraftScalars(setFieldValue, keys = RPJMD_INDIKATOR_DRAFT_KEYS) {
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
  extraKeys = []
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
  if ("tahun_awal" in merged && merged.tahun_awal != null && merged.tahun_awal !== "") {
    setFieldValue("tahun_awal", Number(merged.tahun_awal));
  }
  if ("tahun_akhir" in merged && merged.tahun_akhir != null && merged.tahun_akhir !== "") {
    setFieldValue("tahun_akhir", Number(merged.tahun_akhir));
  }
}
