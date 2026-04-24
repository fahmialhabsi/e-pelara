/**
 * Single source of truth — skema Yup indikator RPJMD per level (wizard + edit).
 * FASE 2: wizard memakai schemaForLevel; halaman edit memakai editSchemaForLevel (subset eksplisit).
 */
import * as Yup from "yup";
import { misiSchema } from "./misiSchema";
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "@/utils/constants";
import { numberOrStringValidation } from "@/validations/yupHelpers";

const ENUM_LEVEL_DOKUMEN = LEVEL_DOKUMEN_OPTIONS.map((o) => o.value);
const ENUM_JENIS_IKU = JENIS_IKU_OPTIONS.map((o) => o.value);

/** Urutan step wizard Indikator RPJMD (8 langkah sesuai hierarki RPJMD). */
export const WIZARD_SCHEMA_ORDER = [
  "misi",
  "tujuan",
  "sasaran",
  "strategi",       // NEW — Strategi
  "arah_kebijakan", // NEW — Arah Kebijakan
  "program",
  "kegiatan",
  "sub_kegiatan",   // NEW — Sub Kegiatan
];

export const indikatorTujuanSchema = Yup.object({
  misi_id: Yup.string().required("Misi wajib dipilih"),
  satuan: Yup.string().required("Satuan wajib diisi"),
  kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
  nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
  jenis: Yup.string().required("Jenis wajib diisi"),
  tolok_ukur_kinerja: Yup.string().required("Tolok ukur kinerja wajib diisi"),
  target_kinerja: Yup.string().required("Target kinerja wajib diisi"),
  jenis_indikator: Yup.string().required("Jenis indikator wajib diisi"),
  kriteria_kuantitatif: Yup.string().nullable(),
  kriteria_kualitatif: Yup.string().nullable(),
  definisi_operasional: Yup.string().required(
    "Definisi operasional wajib diisi"
  ),
  metode_penghitungan: Yup.string().required("Metode penghitungan wajib diisi"),
  baseline: Yup.string().required("Baseline wajib diisi"),
  capaian_tahun_1: Yup.string().required("Capaian tahun 1 wajib diisi"),
  capaian_tahun_2: Yup.string().required("Capaian tahun 2 wajib diisi"),
  capaian_tahun_3: Yup.string().required("Capaian tahun 3 wajib diisi"),
  capaian_tahun_4: Yup.string().required("Capaian tahun 4 wajib diisi"),
  capaian_tahun_5: Yup.string().required("Capaian tahun 5 wajib diisi"),
  target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
  target_tahun_2: Yup.string().required("Target tahun 2 wajib diisi"),
  target_tahun_3: Yup.string().required("Target tahun 3 wajib diisi"),
  target_tahun_4: Yup.string().required("Target tahun 4 wajib diisi"),
  target_tahun_5: Yup.string().required("Target tahun 5 wajib diisi"),
  sumber_data: Yup.string().required("Sumber data wajib diisi"),
  penanggung_jawab: Yup.string().required("Penanggung jawab wajib diisi"),
  keterangan: Yup.string().nullable(),
  rekomendasi_ai: Yup.string().nullable(),
  tipe_indikator: Yup.string().required("Tipe indikator wajib diisi"),
  level_dokumen: Yup.string()
    .oneOf(ENUM_LEVEL_DOKUMEN)
    .required("Level dokumen wajib dipilih"),
  jenis_iku: Yup.string()
    .oneOf(ENUM_JENIS_IKU)
    .required("Jenis IKU wajib dipilih"),
  target_awal: numberOrStringValidation("Target awal"),
  target_akhir: numberOrStringValidation("Target akhir"),
  tahun_awal: Yup.number().typeError("Harus angka").required("Wajib diisi"),
  tahun_akhir: Yup.number().typeError("Harus angka").required("Wajib diisi"),
});

export const indikatorSasaranSchema = Yup.object({
  tujuan_id: Yup.string().required("Tujuan wajib dipilih"),
  satuan: Yup.string().required("Satuan wajib diisi"),
  kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
  nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
  jenis: Yup.string().required("Jenis wajib diisi"),
  tolok_ukur_kinerja: Yup.string().required("Tolok ukur kinerja wajib diisi"),
  target_kinerja: Yup.string().required("Target kinerja wajib diisi"),
  jenis_indikator: Yup.string().required("Jenis indikator wajib diisi"),
  kriteria_kuantitatif: Yup.string().nullable(),
  kriteria_kualitatif: Yup.string().nullable(),
  definisi_operasional: Yup.string().required(
    "Definisi operasional wajib diisi"
  ),
  metode_penghitungan: Yup.string().required("Metode penghitungan wajib diisi"),
  baseline: Yup.string().required("Baseline wajib diisi"),
  capaian_tahun_1: Yup.string().required("Capaian tahun 1 wajib diisi"),
  capaian_tahun_2: Yup.string().required("Capaian tahun 2 wajib diisi"),
  capaian_tahun_3: Yup.string().required("Capaian tahun 3 wajib diisi"),
  capaian_tahun_4: Yup.string().required("Capaian tahun 4 wajib diisi"),
  capaian_tahun_5: Yup.string().required("Capaian tahun 5 wajib diisi"),
  target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
  target_tahun_2: Yup.string().required("Target tahun 2 wajib diisi"),
  target_tahun_3: Yup.string().required("Target tahun 3 wajib diisi"),
  target_tahun_4: Yup.string().required("Target tahun 4 wajib diisi"),
  target_tahun_5: Yup.string().required("Target tahun 5 wajib diisi"),
  sumber_data: Yup.string().required("Sumber data wajib diisi"),
  penanggung_jawab: Yup.string().required("Penanggung jawab wajib diisi"),
  keterangan: Yup.string().nullable(),
  tipe_indikator: Yup.string().required("Tipe indikator wajib diisi"),
  level_dokumen: Yup.string()
    .oneOf(ENUM_LEVEL_DOKUMEN)
    .required("Level dokumen wajib dipilih"),
  jenis_iku: Yup.string()
    .oneOf(ENUM_JENIS_IKU)
    .required("Jenis IKU wajib dipilih"),
  target_awal: numberOrStringValidation("Target awal"),
  target_akhir: numberOrStringValidation("Target akhir"),
  tahun_awal: Yup.number().typeError("Harus angka").required("Wajib diisi"),
  tahun_akhir: Yup.number().typeError("Harus angka").required("Wajib diisi"),
});

export const indikatorProgramSchema = Yup.object({
  sasaran_id: Yup.mixed().required("Sasaran wajib dipilih"),
  kode_program: Yup.string().required("Kode program wajib diisi"),
  nama_program: Yup.string().required("Nama program wajib diisi"),
  uraian: Yup.string().required("Uraian program wajib diisi"),
  satuan: Yup.string().required("Satuan wajib diisi"),
  anggaran: Yup.number()
    .typeError("Anggaran harus berupa angka")
    .required("Anggaran wajib diisi"),
  kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
  nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
  jenis: Yup.string().required("Jenis wajib diisi"),
  tolok_ukur_kinerja: Yup.string().required("Tolok ukur kinerja wajib diisi"),
  target_kinerja: Yup.string().required("Target kinerja wajib diisi"),
  jenis_indikator: Yup.string().required("Jenis indikator wajib diisi"),
  kriteria_kuantitatif: Yup.string().nullable(),
  kriteria_kualitatif: Yup.string().nullable(),
  definisi_operasional: Yup.string().required(
    "Definisi operasional wajib diisi"
  ),
  metode_penghitungan: Yup.string().required("Metode penghitungan wajib diisi"),
  baseline: Yup.string().required("Baseline wajib diisi"),
  capaian_tahun_1: Yup.string().required("Capaian tahun 1 wajib diisi"),
  capaian_tahun_2: Yup.string().required("Capaian tahun 2 wajib diisi"),
  capaian_tahun_3: Yup.string().required("Capaian tahun 3 wajib diisi"),
  capaian_tahun_4: Yup.string().required("Capaian tahun 4 wajib diisi"),
  capaian_tahun_5: Yup.string().required("Capaian tahun 5 wajib diisi"),
  target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
  target_tahun_2: Yup.string().required("Target tahun 2 wajib diisi"),
  target_tahun_3: Yup.string().required("Target tahun 3 wajib diisi"),
  target_tahun_4: Yup.string().required("Target tahun 4 wajib diisi"),
  target_tahun_5: Yup.string().required("Target tahun 5 wajib diisi"),
  sumber_data: Yup.string().required("Sumber data wajib diisi"),
  penanggung_jawab: Yup.string().required("Penanggung jawab wajib diisi"),
  keterangan: Yup.string().nullable(),
  tipe_indikator: Yup.string().required("Tipe indikator wajib diisi"),
  level_dokumen: Yup.string()
    .oneOf(ENUM_LEVEL_DOKUMEN)
    .required("Level dokumen wajib dipilih"),
  jenis_iku: Yup.string()
    .oneOf(ENUM_JENIS_IKU)
    .required("Jenis IKU wajib dipilih"),
  target_awal: numberOrStringValidation("Target awal"),
  target_akhir: numberOrStringValidation("Target akhir"),
  tahun_awal: Yup.number().typeError("Harus angka").required("Wajib diisi"),
  tahun_akhir: Yup.number().typeError("Harus angka").required("Wajib diisi"),
});

export const indikatorKegiatanSchema = Yup.object({
  program_id: Yup.number().required("Program wajib dipilih"),
  kode_kegiatan: Yup.string().required("Kode kegiatan wajib diisi"),
  nama_kegiatan: Yup.string().required("Nama kegiatan wajib diisi"),
  uraian: Yup.string().required("Uraian kegiatan wajib diisi"),
  satuan: Yup.string().required("Satuan wajib diisi"),
  realisasi: Yup.number()
    .typeError("Realisasi harus berupa angka")
    .required("Realisasi wajib diisi"),
  tahun: Yup.number()
    .typeError("Tahun harus berupa angka")
    .required("Tahun wajib diisi"),
  anggaran: Yup.number()
    .typeError("Anggaran harus berupa angka")
    .required("Anggaran wajib diisi"),
  kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
  nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
  jenis: Yup.string().required("Jenis wajib diisi"),
  tolok_ukur_kinerja: Yup.string().required("Tolok ukur kinerja wajib diisi"),
  target_kinerja: Yup.string().required("Target kinerja wajib diisi"),
  jenis_indikator: Yup.string().required("Jenis indikator wajib diisi"),
  kriteria_kuantitatif: Yup.string().nullable(),
  kriteria_kualitatif: Yup.string().nullable(),
  definisi_operasional: Yup.string().required(
    "Definisi operasional wajib diisi"
  ),
  metode_penghitungan: Yup.string().required("Metode penghitungan wajib diisi"),
  baseline: Yup.string().required("Baseline wajib diisi"),
  capaian_tahun_1: Yup.string().required("Capaian tahun 1 wajib diisi"),
  capaian_tahun_2: Yup.string().required("Capaian tahun 2 wajib diisi"),
  capaian_tahun_3: Yup.string().required("Capaian tahun 3 wajib diisi"),
  capaian_tahun_4: Yup.string().required("Capaian tahun 4 wajib diisi"),
  capaian_tahun_5: Yup.string().required("Capaian tahun 5 wajib diisi"),
  target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
  target_tahun_2: Yup.string().required("Target tahun 2 wajib diisi"),
  target_tahun_3: Yup.string().required("Target tahun 3 wajib diisi"),
  target_tahun_4: Yup.string().required("Target tahun 4 wajib diisi"),
  target_tahun_5: Yup.string().required("Target tahun 5 wajib diisi"),
  sumber_data: Yup.string().required("Sumber data wajib diisi"),
  penanggung_jawab: Yup.string().required("Penanggung jawab wajib diisi"),
  keterangan: Yup.string().nullable(),
  tipe_indikator: Yup.string().required("Tipe indikator wajib diisi"),
  level_dokumen: Yup.string()
    .oneOf(ENUM_LEVEL_DOKUMEN)
    .required("Level dokumen wajib dipilih"),
  jenis_iku: Yup.string()
    .oneOf(ENUM_JENIS_IKU)
    .required("Jenis IKU wajib dipilih"),
  target_awal: numberOrStringValidation("Target awal"),
  target_akhir: numberOrStringValidation("Target akhir"),
  tahun_awal: Yup.number().typeError("Harus angka").required("Wajib diisi"),
  tahun_akhir: Yup.number().typeError("Harus angka").required("Wajib diisi"),
});

/**
 * Skema minimal Strategi: cukup sasaran_id wajib.
 * Diperluas setelah endpoint backend dikonfirmasi.
 */
export const indikatorStrategiSchema = Yup.object({
  sasaran_id: Yup.mixed().required("Sasaran wajib dipilih sebelum mengisi Strategi"),
});

/**
 * Skema minimal Arah Kebijakan: cukup strategi_id wajib.
 */
export const indikatorArahKebijakanSchema = Yup.object({
  strategi_id: Yup.mixed().required("Strategi wajib dipilih sebelum mengisi Arah Kebijakan"),
});

/**
 * Skema minimal Sub Kegiatan: cukup kegiatan_id wajib.
 */
export const indikatorSubKegiatanSchema = Yup.object({
  kegiatan_id: Yup.mixed().required("Kegiatan wajib dipilih sebelum mengisi Sub Kegiatan"),
});

/**
 * Step Tujuan: jika sudah ada baris di `values.tujuan` (load existing / tambah ke list),
 * navigasi "Lanjut" tidak memaksa isian draft tab 1–4 (validasi itu untuk baris baru).
 */
export const wizardTujuanStepSchema = Yup.lazy((value) => {
  const rows = value?.tujuan;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      misi_id: Yup.string().required("Misi wajib dipilih"),
      tujuan_id: Yup.mixed().required("Tujuan wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorTujuanSchema;
});

export const wizardSasaranStepSchema = Yup.lazy((value) => {
  const rows = value?.sasaran;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      tujuan_id: Yup.mixed().required("Tujuan wajib dipilih"),
      sasaran_id: Yup.mixed().required("Sasaran wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorSasaranSchema;
});

export const wizardProgramStepSchema = Yup.lazy((value) => {
  const rows = value?.program;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      sasaran_id: Yup.mixed().required("Sasaran wajib dipilih"),
      program_id: Yup.mixed().required("Program wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorProgramSchema;
});

export const wizardKegiatanStepSchema = Yup.lazy((value) => {
  const rows = value?.kegiatan;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      program_id: Yup.mixed().required("Program wajib dipilih"),
      kegiatan_id: Yup.mixed().required("Kegiatan wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorKegiatanSchema;
});

export const wizardStrategiStepSchema = Yup.lazy((value) => {
  const rows = value?.strategi;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      sasaran_id: Yup.mixed().required("Sasaran wajib dipilih"),
      strategi_id: Yup.mixed().required("Strategi wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorStrategiSchema;
});

export const wizardArahKebijakanStepSchema = Yup.lazy((value) => {
  const rows = value?.arah_kebijakan;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      strategi_id: Yup.mixed().required("Strategi wajib dipilih"),
      arah_kebijakan_id: Yup.mixed().required("Arah kebijakan wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorArahKebijakanSchema;
});

export const wizardSubKegiatanStepSchema = Yup.lazy((value) => {
  const rows = value?.sub_kegiatan;
  if (Array.isArray(rows) && rows.length > 0) {
    return Yup.object({
      kegiatan_id: Yup.mixed().required("Kegiatan wajib dipilih"),
      sub_kegiatan_id: Yup.mixed().required("Sub kegiatan wajib dipilih"),
      level_dokumen: Yup.string()
        .oneOf(ENUM_LEVEL_DOKUMEN)
        .required("Level dokumen wajib dipilih"),
      jenis_iku: Yup.string()
        .oneOf(ENUM_JENIS_IKU)
        .required("Jenis IKU wajib dipilih"),
    });
  }
  return indikatorSubKegiatanSchema;
});

const SCHEMA_BY_LEVEL = {
  misi:            misiSchema,
  tujuan:          wizardTujuanStepSchema,
  sasaran:         wizardSasaranStepSchema,
  strategi:        wizardStrategiStepSchema,
  arah_kebijakan:  wizardArahKebijakanStepSchema,
  program:         wizardProgramStepSchema,
  kegiatan:        wizardKegiatanStepSchema,
  sub_kegiatan:    wizardSubKegiatanStepSchema,
};

/** Field inti yang divalidasi di semua halaman edit indikator per level. */
export const indikatorEditCoreSchema = Yup.object({
  tolok_ukur_kinerja: Yup.string().required("Tolok ukur kinerja wajib diisi"),
  target_kinerja: Yup.string().required("Target kinerja wajib diisi"),
  definisi_operasional: Yup.string().required(
    "Definisi operasional wajib diisi"
  ),
  metode_penghitungan: Yup.string().required("Metode penghitungan wajib diisi"),
  baseline: Yup.string().required("Baseline wajib diisi"),
});

/**
 * Skema wizard per level (misi | tujuan | sasaran | program | kegiatan).
 * @param {keyof typeof SCHEMA_BY_LEVEL} level
 */
export function schemaForLevel(level) {
  const schema = SCHEMA_BY_LEVEL[level];
  if (!schema) {
    throw new Error(`schemaForLevel: level tidak dikenal "${level}"`);
  }
  return schema;
}

/**
 * Subset validasi untuk halaman edit (field inti narasi indikator).
 * Sama untuk tujuan / sasaran / program / kegiatan — satu definisi agar tidak drift.
 * @param {"tujuan" | "sasaran" | "program" | "kegiatan"} level
 */
export function editSchemaForLevel(level) {
  const allowed = new Set(["tujuan", "sasaran", "program", "kegiatan"]);
  if (!allowed.has(level)) {
    throw new Error(`editSchemaForLevel: level tidak didukung "${level}"`);
  }
  return indikatorEditCoreSchema;
}

/** Array skema wizard (urutan step) — drop-in untuk Formik `validationSchema` bertingkat. */
export const wizardSchemas = WIZARD_SCHEMA_ORDER.map((key) => schemaForLevel(key));
