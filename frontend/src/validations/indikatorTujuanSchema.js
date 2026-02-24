import * as Yup from "yup";
import { LEVEL_DOKUMEN_OPTIONS, JENIS_IKU_OPTIONS } from "@/utils/constants";
import { numberOrStringValidation } from "@/validations/yupHelpers";

const ENUM_LEVEL_DOKUMEN = LEVEL_DOKUMEN_OPTIONS.map((o) => o.value);
const ENUM_JENIS_IKU = JENIS_IKU_OPTIONS.map((o) => o.value);

export const indikatorTujuanSchema = Yup.object({
  misi_id: Yup.string().required("Misi wajib dipilih"), // ✅ Tambahan
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
