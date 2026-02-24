import * as Yup from "yup";

import {
  LEVEL_DOKUMEN_OPTIONS,
  JENIS_IKU_OPTIONS,
} from "../components/utils/constants";

const ENUM_LEVEL_DOKUMEN = LEVEL_DOKUMEN_OPTIONS.map((o) => o.value);
const ENUM_JENIS_IKU = JENIS_IKU_OPTIONS.map((o) => o.value);

export const wizardSchemas = [
  // Step 0: Misi
  Yup.object({
    misi_id: Yup.number().required("Misi wajib dipilih"),
    level_dokumen: Yup.string().oneOf(ENUM_LEVEL_DOKUMEN).required(),
    jenis_iku: Yup.string().oneOf(ENUM_JENIS_IKU).required(),
  }),

  // Step 1: Tujuan
  Yup.object({
    kode_tujuan: Yup.string().required("Kode tujuan wajib diisi"),
    uraian: Yup.string().required("Uraian tujuan wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    kode_indikator: Yup.string().required(),
    nama_indikator: Yup.string().required(),
    jenis: Yup.string().required(),
    tolok_ukur_kinerja: Yup.string().required(),
    target_kinerja: Yup.string().required(),
    jenis_indikator: Yup.string().required(),
    definisi_operasional: Yup.string().required(),
    metode_penghitungan: Yup.string().required(),
    baseline: Yup.string().required(),
    target_tahun_1: Yup.string().required(),
    target_tahun_2: Yup.string().required(),
    target_tahun_3: Yup.string().required(),
    target_tahun_4: Yup.string().required(),
    target_tahun_5: Yup.string().required(),
    sumber_data: Yup.string().required(),
    penanggung_jawab: Yup.string().required(),
    tipe_indikator: Yup.string().required(),
    level_dokumen: Yup.string().oneOf(ENUM_LEVEL_DOKUMEN).required(),
    jenis_iku: Yup.string().oneOf(ENUM_JENIS_IKU).required(),
  }),

  // Step 2: Sasaran (IndikatorSasaran)
  Yup.object({
    tujuan_id: Yup.string()
      .uuid("ID tujuan harus berupa UUID")
      .required("Tujuan wajib dipilih"),
    kode_sasaran: Yup.string().required("Kode sasaran wajib diisi"),
    uraian: Yup.string().required("Uraian sasaran wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target_awal: Yup.number()
      .typeError("Target awal harus berupa angka")
      .required("Target awal wajib diisi"),
    target_akhir: Yup.number()
      .typeError("Target akhir harus berupa angka")
      .required("Target akhir wajib diisi"),
    tahun_awal: Yup.number()
      .typeError("Tahun awal harus berupa angka")
      .required("Tahun awal wajib diisi"),
    tahun_akhir: Yup.number()
      .typeError("Tahun akhir harus berupa angka")
      .required("Tahun akhir wajib diisi"),

    // Tambahan indikator
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
    metode_penghitungan: Yup.string().required(
      "Metode penghitungan wajib diisi"
    ),
    baseline: Yup.string().required("Baseline wajib diisi"),
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
      .oneOf(ENUM_LEVEL_DOKUMEN, "Level dokumen tidak valid")
      .required("Level dokumen wajib dipilih"),

    jenis_iku: Yup.string()
      .oneOf(ENUM_JENIS_IKU, "Jenis IKU tidak valid")
      .required("Jenis IKU wajib dipilih"),
  }),

  // Step 3: Program (IndikatorProgram)
  Yup.object({
    sasaran_id: Yup.number().required("Sasaran wajib dipilih"),
    kode_program: Yup.string().required("Kode program wajib diisi"),
    nama_program: Yup.string().required("Nama program wajib diisi"),
    uraian: Yup.string().required("Uraian program wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target: Yup.number()
      .typeError("Target harus berupa angka")
      .required("Target wajib diisi"),
    tahun: Yup.number()
      .typeError("Tahun harus berupa angka")
      .required("Tahun wajib diisi"),
    anggaran: Yup.number()
      .typeError("Anggaran harus berupa angka")
      .required("Anggaran wajib diisi"),

    // Tambahan indikator
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
    metode_penghitungan: Yup.string().required(
      "Metode penghitungan wajib diisi"
    ),
    baseline: Yup.string().required("Baseline wajib diisi"),
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
      .oneOf(ENUM_LEVEL_DOKUMEN, "Level dokumen tidak valid")
      .required("Level dokumen wajib dipilih"),

    jenis_iku: Yup.string()
      .oneOf(ENUM_JENIS_IKU, "Jenis IKU tidak valid")
      .required("Jenis IKU wajib dipilih"),
  }),

  // Step 4: Kegiatan (IndikatorKegiatan)
  Yup.object({
    program_id: Yup.number().required("Program wajib dipilih"),
    kode_kegiatan: Yup.string().required("Kode kegiatan wajib diisi"),
    nama_kegiatan: Yup.string().required("Nama kegiatan wajib diisi"),
    uraian: Yup.string().required("Uraian kegiatan wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target: Yup.number()
      .typeError("Target harus berupa angka")
      .required("Target wajib diisi"),
    realisasi: Yup.number()
      .typeError("Realisasi harus berupa angka")
      .required("Realisasi wajib diisi"),
    tahun: Yup.number()
      .typeError("Tahun harus berupa angka")
      .required("Tahun wajib diisi"),
    anggaran: Yup.number()
      .typeError("Anggaran harus berupa angka")
      .required("Anggaran wajib diisi"),

    // Tambahan indikator
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
    metode_penghitungan: Yup.string().required(
      "Metode penghitungan wajib diisi"
    ),
    baseline: Yup.string().required("Baseline wajib diisi"),
    target_tahun_1: Yup.string().required("Target tahun 1 wajib diisi"),
    target_tahun_2: Yup.string().required("Target tahun 2 wajib diisi"),
    target_tahun_3: Yup.string().required("Target tahun 3 wajib diisi"),
    target_tahun_4: Yup.string().required("Target tahun 4 wajib diisi"),
    target_tahun_5: Yup.string().required("Target tahun 5 wajib diisi"),
    sumber_data: Yup.string().required("Sumber data wajib diisi"),
    penanggung_jawab: Yup.string().required("Penanggung jawab wajib diisi"),
    keterangan: Yup.string().nullable(),
    tipe_indikator: Yup.string().required("Tipe indikator wajib diisi"),
    level_dokumen: Yup.string().oneOf(ENUM_LEVEL_DOKUMEN).required(),
    jenis_iku: Yup.string().oneOf(JENIS_IKU_OPTIONS).required(),
  }),
];
