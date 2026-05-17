// src/shared/components/utils/renstraTabelKegiatanSchema.js
import * as Yup from "yup";

/**
 * Membuat Yup schema async untuk validasi realtime pagu
 * @param {number|null} excludeId - id kegiatan yang sedang diedit (opsional)
 */
export const createAsyncSchema = (excludeId = null) => {
  return Yup.object().shape({
    /** Baris renstra_tabel_program (PK); dipakai jika sudah ada Input Tabel Program */
    tabel_program_id: Yup.mixed()
      .nullable()
      .optional()
      .test("is-number", "Program tidak valid", (v) => {
        if (v === null || v === undefined || v === "") return true;
        return !Number.isNaN(Number(v));
      }),
    /** FK renstra_program.id — wajib (otomatis dari tabel atau pilih langsung) */
    program_id: Yup.mixed()
      .required("Program wajib dipilih")
      .test(
        "is-number",
        "Program tidak valid",
        (v) => v != null && v !== "" && !Number.isNaN(Number(v))
      ),
    kegiatan_id: Yup.mixed().required("Kegiatan wajib dipilih"),
    indikator_id: Yup.mixed().required("Indikator wajib dipilih"),
    baseline: Yup.number().typeError("Harus angka").required(),
    satuan_target: Yup.string().required(),
    lokasi: Yup.string().required(),
    bidang_penanggung_jawab: Yup.string().required(),
    kode_kegiatan: Yup.string().required(),
    nama_kegiatan: Yup.string().required(),

    ...[1, 2, 3, 4, 5, 6].reduce((acc, i) => {
  acc[`target_tahun_${i}`] = Yup.number()
    .typeError("Harus angka")
    .required();

  acc[`pagu_tahun_${i}`] = Yup.number()
    .typeError("Harus angka")
    .required();

  return acc;
}, {}),
  });
};
