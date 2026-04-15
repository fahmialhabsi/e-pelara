/**
 * Payload builder & path konstan untuk indikator RPJMD (wizard kegiatan batch).
 */

export const KEGIATAN_INDIKATOR_CREATE_PATH = "/indikator-kegiatan";

/**
 * @param {Record<string, unknown>} values — Formik values wizard RPJMD
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateKegiatanWizardForSubmit(values) {
  const list = Array.isArray(values.kegiatan) ? values.kegiatan : [];

  if (list.length === 0) {
    return {
      ok: false,
      message: "Belum ada indikator kegiatan yang ditambahkan.",
    };
  }

  const rowHasServerKey = (item) => {
    const id = item?.indikator_id ?? item?.id;
    return id != null && String(id).trim() !== "";
  };
  const missing = list.some((item) => !rowHasServerKey(item));
  if (missing) {
    return {
      ok: false,
      message: "Beberapa indikator tidak memiliki indikator_id.",
    };
  }

  if (!values.misi_id || !values.tujuan_id || !values.sasaran_id) {
    return {
      ok: false,
      message: "Pastikan Misi, Tujuan, dan Sasaran telah dipilih.",
    };
  }

  return { ok: true };
}

/**
 * @param {Record<string, unknown>} values
 * @returns {Record<string, unknown>[]}
 */
export function buildKegiatanIndikatorPayload(values) {
  const list = Array.isArray(values.kegiatan) ? values.kegiatan : [];
  return list.map((item) => ({
    ...item,
    kegiatan_id: values.kegiatan_id,
    program_id: values.program_id,
    indikator_program_id: values.indikator_program_id,
    sasaran_id: values.sasaran_id,
    tujuan_id: values.tujuan_id,
    misi_id: values.misi_id,
    jenis_dokumen: values.jenis_dokumen,
    tahun: values.tahun,
  }));
}
