import * as Yup from "yup";
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "./constants";
import { numberOrStringValidation } from "@/validations/yupHelpers";

const ENUM_LEVEL_DOKUMEN = LEVEL_DOKUMEN_OPTIONS.map((o) => o.value);
const ENUM_JENIS_IKU = JENIS_IKU_OPTIONS.map((o) => o.value);

const commonIndikatorFields = {
  kode_indikator: Yup.string().required("Kode indikator wajib diisi"),
  nama_indikator: Yup.string().required("Nama indikator wajib diisi"),
  jenis: Yup.string().required("Jenis wajib diisi"),
  tolok_ukur_kinerja: Yup.string().required("Tolok ukur kinerja wajib diisi"),
  target_kinerja: Yup.string().required("Target kinerja wajib diisi"),
  jenis_indikator: Yup.string().required("Jenis indikator wajib diisi"),

  kriteria_kuantitatif: Yup.string().when("jenis_indikator", {
    is: "Kuantitatif",
    then: (schema) => schema.required("Kriteria kuantitatif wajib diisi"),
    otherwise: (schema) => schema.nullable(),
  }),

  kriteria_kualitatif: Yup.string().when("jenis_indikator", {
    is: "Kualitatif",
    then: (schema) => schema.required("Kriteria kualitatif wajib diisi"),
    otherwise: (schema) => schema.nullable(),
  }),

  definisi_operasional: Yup.string().required(
    "Definisi operasional wajib diisi"
  ),
  metode_penghitungan: Yup.string().required("Metode penghitungan wajib diisi"),
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

  target_awal: numberOrStringValidation("Target awal"),
  target_akhir: numberOrStringValidation("Target akhir"),
  tahun_awal: Yup.number().typeError("Harus angka").required("Wajib diisi"),
  tahun_akhir: Yup.number().typeError("Harus angka").required("Wajib diisi"),
};

const stepSchemas = {
  misi: Yup.object({
    misi_id: Yup.number().required("Misi wajib dipilih"),
    periode_id: Yup.number()
      .typeError("Periode wajib angka")
      .required("Periode wajib dipilih"),
    ...pick(commonIndikatorFields, ["level_dokumen", "jenis_iku"]),
  }),

  tujuan: Yup.object({
    kode_tujuan: Yup.string().required("Kode tujuan wajib diisi"),
    uraian: Yup.string().required("Uraian tujuan wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    ...commonIndikatorFields,
  }),

  sasaran: Yup.object({
    tujuan_id: Yup.string().required("Tujuan wajib dipilih"),
    kode_sasaran: Yup.string().required("Kode sasaran wajib diisi"),
    uraian: Yup.string().required("Uraian sasaran wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    ...commonIndikatorFields,
  }),

  program: Yup.object({
    sasaran_id: Yup.number().required("Sasaran wajib dipilih"),
    kode_program: Yup.string().required("Kode program wajib diisi"),
    nama_program: Yup.string().required("Nama program wajib diisi"),
    uraian: Yup.string().required("Uraian program wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target: Yup.number().typeError("Target harus angka").required(),
    tahun: Yup.number().typeError("Tahun harus angka").required(),
    anggaran: Yup.number().typeError("Anggaran harus angka").required(),
    ...commonIndikatorFields,
  }),

  kegiatan: Yup.object({
    program_id: Yup.number().required("Program wajib dipilih"),
    kode_kegiatan: Yup.string().required("Kode kegiatan wajib diisi"),
    nama_kegiatan: Yup.string().required("Nama kegiatan wajib diisi"),
    uraian: Yup.string().required("Uraian kegiatan wajib diisi"),
    satuan: Yup.string().required("Satuan wajib diisi"),
    target: Yup.number().typeError("Target harus angka").required(),
    realisasi: Yup.number().typeError("Realisasi harus angka").required(),
    tahun: Yup.number().typeError("Tahun harus angka").required(),
    anggaran: Yup.number().typeError("Anggaran harus angka").required(),
    ...commonIndikatorFields,
  }),
};

function pick(obj, keys) {
  const selected = {};
  for (const key of keys) {
    if (obj[key]) selected[key] = obj[key];
  }
  return selected;
}

export const wizardSchemas = [
  stepSchemas.misi,
  stepSchemas.tujuan,
  stepSchemas.sasaran,
  stepSchemas.program,
  stepSchemas.kegiatan,
];
