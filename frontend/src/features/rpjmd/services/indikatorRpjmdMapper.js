import {
  extractListMeta,
  extractSingleData,
  normalizeListItems,
} from "@/utils/apiResponse";
import { pickBackendErrorMessage } from "@/utils/mapBackendErrorsToFormik";
import { formatOpdPenanggungLabel } from "@/utils/opdDisplayLabel";

/**
 * Satu baris OPD (API / normalizeListItems) → opsi react-select.
 * `value` selalu string agar konsisten dengan `normalizeListItems` (id string) + Yup `penanggung_jawab` string.
 */
export function mapOpdPenanggungRowToSelectOption(item) {
  if (item == null || item.id === undefined || item.id === null) return null;
  return {
    value: String(item.id),
    label: formatOpdPenanggungLabel(item),
    nama_opd: item.nama_opd,
    nama_bidang_opd: item.nama_bidang_opd,
  };
}

/** Nilai Formik untuk field penanggung_jawab (string id, kosong jika tidak ada). */
export function normalizePenanggungJawabFormValue(raw) {
  if (raw === null || raw === undefined || raw === "") return "";
  return String(raw);
}

/** Normalisasi body detail → initialValues Formik (edit tujuan). */
export function mapIndikatorTujuanDetailToEditForm(d) {
  return {
    indikator_id: d.id,
    kode_indikator: d.kode_indikator,
    nama_indikator: d.nama_indikator,
    tipe_indikator: d.tipe_indikator || "",
    jenis: d.jenis || "",
    tolok_ukur_kinerja: d.tolok_ukur_kinerja || "",
    target_kinerja: d.target_kinerja || "",
    jenis_indikator: d.jenis_indikator || "",
    kriteria_kuantitatif: d.kriteria_kuantitatif || "",
    kriteria_kualitatif: d.kriteria_kualitatif || "",
    satuan: d.satuan || "",
    definisi_operasional: d.definisi_operasional || "",
    metode_penghitungan: d.metode_penghitungan || "",
    baseline: d.baseline || "",
    target_tahun_1: d.target_tahun_1 || "",
    target_tahun_2: d.target_tahun_2 || "",
    target_tahun_3: d.target_tahun_3 || "",
    target_tahun_4: d.target_tahun_4 || "",
    target_tahun_5: d.target_tahun_5 || "",
    capaian_tahun_1: d.capaian_tahun_1 || "",
    capaian_tahun_2: d.capaian_tahun_2 || "",
    capaian_tahun_3: d.capaian_tahun_3 || "",
    capaian_tahun_4: d.capaian_tahun_4 || "",
    capaian_tahun_5: d.capaian_tahun_5 || "",
    sumber_data: d.sumber_data || "",
    penanggung_jawab: normalizePenanggungJawabFormValue(d.penanggung_jawab),
    keterangan: d.keterangan || "",
    rekomendasi_ai: d.rekomendasi_ai || "",
    tahun: d.tahun,
    jenis_dokumen: d.jenis_dokumen,
    misi_id: d.misi_id,
    tujuan_id: d.tujuan_id,
    no_tujuan: d.tujuan_id,
    tujuan: [d],
  };
}

/** Normalisasi body detail → initialValues Formik (edit sasaran). */
export function mapIndikatorSasaranDetailToEditForm(d) {
  return {
    indikator_id: d.id,
    kode_indikator: d.kode_indikator,
    nama_indikator: d.nama_indikator,
    tipe_indikator: d.tipe_indikator || "",
    jenis: d.jenis || "",
    tolok_ukur_kinerja: d.tolok_ukur_kinerja || "",
    target_kinerja: d.target_kinerja || "",
    jenis_indikator: d.jenis_indikator || "",
    kriteria_kuantitatif: d.kriteria_kuantitatif || "",
    kriteria_kualitatif: d.kriteria_kualitatif || "",
    satuan: d.satuan || "",
    definisi_operasional: d.definisi_operasional || "",
    metode_penghitungan: d.metode_penghitungan || "",
    baseline: d.baseline || "",
    target_tahun_1: d.target_tahun_1 || "",
    target_tahun_2: d.target_tahun_2 || "",
    target_tahun_3: d.target_tahun_3 || "",
    target_tahun_4: d.target_tahun_4 || "",
    target_tahun_5: d.target_tahun_5 || "",
    capaian_tahun_1: d.capaian_tahun_1 || "",
    capaian_tahun_2: d.capaian_tahun_2 || "",
    capaian_tahun_3: d.capaian_tahun_3 || "",
    capaian_tahun_4: d.capaian_tahun_4 || "",
    capaian_tahun_5: d.capaian_tahun_5 || "",
    sumber_data: d.sumber_data || "",
    penanggung_jawab: normalizePenanggungJawabFormValue(d.penanggung_jawab),
    keterangan: d.keterangan || "",
    rekomendasi_ai: d.rekomendasi_ai || "",
    tahun: d.tahun,
    jenis_dokumen: d.jenis_dokumen,
    misi_id: d.misi_id,
    tujuan_id: d.tujuan_id,
    sasaran_id: d.sasaran_id,
    nomor: d.sasaran_id,
    sasaran: [d],
  };
}

/** Normalisasi body detail → initialValues Formik (edit program). */
export function mapIndikatorProgramDetailToEditForm(d) {
  return {
    tahun: d.tahun,
    jenis_dokumen: d.jenis_dokumen,
    misi_id: d.misi_id ?? "",
    tujuan_id: d.tujuan_id ?? "",
    sasaran_id: d.sasaran_id ?? "",
    program_id: d.program_id ? String(d.program_id) : "",
    program: d.program ? [d.program] : [],
    indikator_id: d.id,
    kode_indikator: d.kode_indikator,
    nama_indikator: d.nama_indikator,
    jenis: d.jenis || "",
    tolok_ukur_kinerja: d.tolok_ukur_kinerja,
    target_kinerja: d.target_kinerja,
    jenis_indikator: d.jenis_indikator || "",
    kriteria_kuantitatif: d.kriteria_kuantitatif || "",
    kriteria_kualitatif: d.kriteria_kualitatif || "",
    definisi_operasional: d.definisi_operasional,
    metode_penghitungan: d.metode_penghitungan,
    baseline: d.baseline,
    keterangan: d.keterangan,
    penanggung_jawab: normalizePenanggungJawabFormValue(d.penanggung_jawab),
    tipe_indikator: d.tipe_indikator,
    indikator_kinerja_dampak: d.indikator_kinerja_dampak,
    kriteria_id: d.kriteria_id,
    satuan: d.satuan,
    sumber_data: d.sumber_data,
    capaian_tahun_1: d.capaian_tahun_1,
    capaian_tahun_2: d.capaian_tahun_2,
    capaian_tahun_3: d.capaian_tahun_3,
    capaian_tahun_4: d.capaian_tahun_4,
    capaian_tahun_5: d.capaian_tahun_5,
    target_tahun_1: d.target_tahun_1,
    target_tahun_2: d.target_tahun_2,
    target_tahun_3: d.target_tahun_3,
    target_tahun_4: d.target_tahun_4,
    target_tahun_5: d.target_tahun_5,
  };
}

/** Opsi select kegiatan (edit / wizard) dari baris ter-normalisasi. */
export function mapKegiatanRowsToSelectOptions(normalizedItems) {
  return normalizedItems.map((item) => ({
    value: item.id,
    label: `${item.kode_kegiatan} - ${item.nama_kegiatan}`,
    misi_id: item.misi_id,
    tujuan_id: item.tujuan_id,
    sasaran_id: item.sasaran_id,
    program_id: item.program_id,
  }));
}

/** Opsi indikator program dari baris ter-normalisasi. */
export function mapIndikatorProgramRowsToSelectOptions(normalizedItems) {
  return normalizedItems.map((item) => ({
    value: item.id,
    label: `${item.kode_indikator} - ${item.nama_indikator}`,
  }));
}

/** Normalisasi body detail → initialValues Formik (edit kegiatan). */
export function mapIndikatorKegiatanDetailToEditForm(detail) {
  return {
    indikator_id: detail.id,
    kode_indikator: detail.kode_indikator || "",
    nama_indikator: detail.nama_indikator || "",
    jenis: detail.jenis || "",
    tolok_ukur_kinerja: detail.tolok_ukur_kinerja || "",
    target_kinerja: detail.target_kinerja || "",
    jenis_indikator: detail.jenis_indikator || "",
    kriteria_kuantitatif: detail.kriteria_kuantitatif || "",
    kriteria_kualitatif: detail.kriteria_kualitatif || "",
    satuan: detail.satuan || "",
    definisi_operasional: detail.definisi_operasional || "",
    metode_penghitungan: detail.metode_penghitungan || "",
    baseline: detail.baseline || "",
    capaian_tahun_1: detail.capaian_tahun_1 || "",
    capaian_tahun_2: detail.capaian_tahun_2 || "",
    capaian_tahun_3: detail.capaian_tahun_3 || "",
    capaian_tahun_4: detail.capaian_tahun_4 || "",
    capaian_tahun_5: detail.capaian_tahun_5 || "",
    target_tahun_1: detail.target_tahun_1 || "",
    target_tahun_2: detail.target_tahun_2 || "",
    target_tahun_3: detail.target_tahun_3 || "",
    target_tahun_4: detail.target_tahun_4 || "",
    target_tahun_5: detail.target_tahun_5 || "",
    sumber_data: detail.sumber_data || "",
    penanggung_jawab: normalizePenanggungJawabFormValue(detail.penanggung_jawab),
    keterangan: detail.keterangan || "",
    rekomendasi_ai: detail.rekomendasi_ai || "",
    tahun: detail.tahun,
    jenis_dokumen: detail.jenis_dokumen || "RPJMD",
    misi_id: detail.misi_id ?? "",
    tujuan_id: detail.tujuan_id ?? "",
    sasaran_id: detail.sasaran_id ?? "",
    program_id: detail.program_id ? String(detail.program_id) : "",
    kegiatan_id: detail.kegiatan_id ? String(detail.kegiatan_id) : "",
    indikator_program_id: detail.indikator_program_id || null,
    tipe_indikator: detail.tipe_indikator || "",
  };
}

/**
 * Satu item dari response list/detail (id tetap dinormalisasi lewat normalizeListItems).
 * @param {unknown} payload
 * @returns {Record<string, unknown>}
 */
export function normalizeIndikatorItem(payload) {
  const row = extractSingleData(payload);
  if (row && typeof row === "object" && !Array.isArray(row)) {
    return { ...row };
  }
  return {};
}

/**
 * @param {unknown} payload — body response list paginated
 * @returns {{ data: Record<string, unknown>[], meta: Record<string, unknown> }}
 */
export function normalizeIndikatorListResponse(payload) {
  return {
    data: normalizeListItems(payload),
    meta: extractListMeta(payload),
  };
}

/** @param {unknown} err — biasanya Axios error */
export function extractApiError(err) {
  return err?.response?.data;
}

/**
 * Pesan untuk toast/banner dari error API (Formik tetap pakai mapBackendErrorsToFormik).
 */
export function indikatorApiErrorMessage(err, fallback) {
  return pickBackendErrorMessage(extractApiError(err), fallback);
}

/**
 * Response GET /rekomendasi-ai/status
 * @param {unknown} res — axios response
 */
export function normalizeAiRecoStatus(res) {
  const d = res?.data;
  return {
    available: Boolean(d?.available),
    hint: typeof d?.hint === "string" ? d.hint : "",
  };
}

/**
 * Response POST rekomendasi-ai (apiAI)
 * @param {unknown} res
 */
export function normalizeRekomendasiAiResponse(res) {
  const r = res?.data?.rekomendasi;
  return typeof r === "string" ? r : "";
}

/**
 * Pesan user-friendly dari error rekomendasi AI (kode backend + detail).
 * @param {unknown} err
 */
export function mapRekomendasiAiErrorToMessage(err) {
  const d = err?.response?.data;
  const detail =
    typeof d?.detail === "string"
      ? d.detail
      : typeof d?.error === "string"
        ? d.error
        : "";
  const code = d?.code;
  if (
    code === "OPENAI_NOT_CONFIGURED" ||
    code === "OPENAI_INVALID_KEY" ||
    code === "OPENAI_QUOTA_EXCEEDED" ||
    code === "REKOMENDASI_AI_DISABLED"
  ) {
    return (
      detail ||
      "Periksa konfigurasi OpenAI (kunci API, billing, atau kuota) di backend."
    );
  }
  return (
    detail ||
    "Terjadi kesalahan saat meminta saran. Periksa log server atau konfigurasi OpenAI."
  );
}
