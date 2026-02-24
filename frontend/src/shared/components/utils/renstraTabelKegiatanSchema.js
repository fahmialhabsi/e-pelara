// src/shared/components/utils/renstraTabelKegiatanSchema.js
import * as Yup from "yup";
import api from "@/services/api";

/**
 * Membuat Yup schema async untuk validasi realtime pagu
 * @param {number|null} excludeId - id kegiatan yang sedang diedit (opsional)
 */
export const createAsyncSchema = (excludeId = null) => {
  return Yup.object().shape({
    program_id: Yup.string().required("Program wajib dipilih"),
    kegiatan_id: Yup.string().required("Kegiatan wajib dipilih"),
    indikator_id: Yup.string().required("Indikator wajib dipilih"),
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
        .required()
        .test(
          `max-available-tahun-${i}`,
          `❌ Pagu Tahun ${i} melebihi sisa pagu program`,
          async function (value) {
            const { program_id } = this.parent;
            if (!program_id) return true;

            try {
              const res = await api.get(
                "/renstra-tabel-kegiatan/available-pagu",
                {
                  params: {
                    program_id,
                    exclude_id: excludeId || this.parent.id || null,
                  },
                }
              );
              const available = res.data.available || {};
              const max = Number(available[i] ?? Infinity);
              return value <= max;
            } catch (err) {
              console.error("Gagal fetch availablePagu:", err);
              return true;
            }
          }
        );

      return acc;
    }, {}),
  });
};
