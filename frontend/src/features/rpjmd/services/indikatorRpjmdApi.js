import api from "@/services/api";
import apiAI from "@/services/apiAI";
import { normalizeListItems } from "@/utils/apiResponse";
import { KEGIATAN_INDIKATOR_CREATE_PATH } from "./indikatorRpjmdPayload";
import {
  normalizeAiRecoStatus,
  normalizeIndikatorListResponse,
  normalizeRekomendasiAiResponse,
} from "./indikatorRpjmdMapper";

/** Path resource indikator (tanpa leading slash untuk composability) */
export const INDIKATOR_RPJMD_RESOURCES = {
  tujuan: "indikator-tujuans",
  sasaran: "indikator-sasaran",
  strategi: "indikator-strategi", // TODO: konfirmasi endpoint backend
  arah_kebijakan: "indikator-arah-kebijakan", // TODO: konfirmasi endpoint backend
  program: "indikator-program",
  kegiatan: "indikator-kegiatan",
  sub_kegiatan: "indikator-sub-kegiatan", // TODO: konfirmasi endpoint backend
};

// ——— Wizard bootstrap (IndikatorRPJMDForm) ———

export async function fetchMisi(params) {
  return api.get("/misi", { params });
}

export async function fetchTujuan(params) {
  return api.get("/tujuan", { params });
}

/** GET /tujuan/next-no — nomor tujuan berikut (admin); fallback client di caller jika 403 */
export async function fetchTujuanNextNo(params) {
  return api.get("/tujuan/next-no", { params });
}

export async function fetchSasaranHierarchy(params) {
  return api.get("/sasaran", { params });
}

export async function fetchProgramsHierarchy(params) {
  return api.get("/programs", { params });
}

export async function fetchKegiatanHierarchy(params) {
  return api.get("/kegiatan", { params });
}

export async function fetchOpdPenanggungJawabPage(pageOrParams) {
  if (typeof pageOrParams === "number") {
    return api.get("/opd-penanggung-jawab", { params: { page: pageOrParams } });
  }
  return api.get("/opd-penanggung-jawab", { params: pageOrParams });
}

/**
 * Semua halaman OPD digabung seperti perilaku lama wizard (halaman 1: params { page: 1 }; lanjutan: query page saja).
 */
export async function fetchAllOpdPenanggungJawabWizard() {
  const opdRes = await fetchOpdPenanggungJawabPage(1);
  let opdList = normalizeListItems(opdRes.data);
  const totalPages = opdRes.data?.meta?.totalPages || 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        api.get(`/opd-penanggung-jawab?page=${i + 2}`),
      ),
    );
    opdList = opdList.concat(...rest.map((r) => normalizeListItems(r.data)));
  }
  return opdList;
}

export async function fetchWizardHierarchyOptions({ jenis_dokumen, tahun }) {
  const defaultParams = { jenis_dokumen, tahun };
  const [misiRes, tujuanRes, sasRes, progRes, kegRes, opdList] =
    await Promise.all([
      fetchMisi(defaultParams),
      fetchTujuan(defaultParams),
      fetchSasaranHierarchy(defaultParams),
      fetchProgramsHierarchy(defaultParams),
      fetchKegiatanHierarchy(defaultParams),
      fetchAllOpdPenanggungJawabWizard(),
    ]);

  return {
    misi: normalizeListItems(misiRes.data),
    tujuan: normalizeListItems(tujuanRes.data),
    sasaran: normalizeListItems(sasRes.data),
    program: normalizeListItems(progRes.data),
    kegiatan: normalizeListItems(kegRes.data),
    penanggungJawab: opdList,
  };
}

// ——— Indikator CRUD & list ———

export async function fetchIndikatorRpjmdList(resourceKey, params) {
  const path = INDIKATOR_RPJMD_RESOURCES[resourceKey] || resourceKey;
  const res = await api.get(`/${path}`, { params });
  return normalizeIndikatorListResponse(res.data);
}

export async function deleteIndikatorRpjmd(resourceKey, id) {
  const path = INDIKATOR_RPJMD_RESOURCES[resourceKey] || resourceKey;
  return api.delete(`/${path}/${id}`);
}

export async function getIndikatorTujuanDetail(id) {
  return api.get(`/indikator-tujuans/${id}`);
}

export async function getIndikatorSasaranDetail(id) {
  return api.get(`/indikator-sasaran/${id}`);
}

export async function getIndikatorProgramDetail(id) {
  return api.get(`/indikator-program/${id}`);
}

export async function getIndikatorKegiatanDetail(id) {
  return api.get(`/indikator-kegiatan/${id}`);
}

export async function updateIndikatorTujuan(id, values) {
  return api.put(`/indikator-tujuans/${id}`, values);
}

export async function updateIndikatorSasaran(id, values) {
  return api.put(`/indikator-sasaran/${id}`, values);
}

export async function updateIndikatorProgram(id, values) {
  return api.put(`/indikator-program/${id}`, values);
}

export async function updateIndikatorKegiatan(id, values) {
  return api.put(`/indikator-kegiatan/${id}`, values);
}

export async function createIndikatorKegiatanBatch(payload) {
  return api.post(KEGIATAN_INDIKATOR_CREATE_PATH, payload);
}

export async function createIndikatorTujuanBatch(payload) {
  const list = Array.isArray(payload) ? payload : [payload];
  list.forEach((p, idx) => {
    console.group(
      `[DEBUG] POST /api/indikator-tujuans payload${list.length > 1 ? ` [${idx}]` : ""}`,
    );
    console.log("payload final:", p);
    console.table({
      nama_indikator: p?.nama_indikator,
      tipe_indikator: p?.tipe_indikator,
      jenis_indikator: p?.jenis_indikator,
      metode_penghitungan: p?.metode_penghitungan,
      penanggung_jawab: p?.penanggung_jawab,
      target_tahun_1: p?.target_tahun_1,
      target_tahun_2: p?.target_tahun_2,
      target_tahun_3: p?.target_tahun_3,
      target_tahun_4: p?.target_tahun_4,
      target_tahun_5: p?.target_tahun_5,
      capaian_tahun_1: p?.capaian_tahun_1,
      capaian_tahun_2: p?.capaian_tahun_2,
      capaian_tahun_3: p?.capaian_tahun_3,
      capaian_tahun_4: p?.capaian_tahun_4,
      capaian_tahun_5: p?.capaian_tahun_5,
    });
    if (!p?.tipe_indikator || !p?.jenis_indikator) {
      console.error("[DEBUG] Missing required indikator fields", {
        tipe_indikator: p?.tipe_indikator,
        jenis_indikator: p?.jenis_indikator,
        payload: p,
      });
    }
    console.groupEnd();
  });
  return api.post("/indikator-tujuans", payload);
}

export async function createIndikatorSasaranBatch(payload) {
  return api.post("/indikator-sasaran", payload);
}

export async function createIndikatorProgramBatch(payload) {
  return api.post("/indikator-program", payload);
}

// TODO: aktifkan setelah endpoint backend tersedia
export async function createIndikatorStrategiBatch(payload) {
  return api.post("/indikator-strategi", payload);
}

export async function createIndikatorArahKebijakanBatch(payload) {
  return api.post("/indikator-arah-kebijakan", payload);
}

export async function createIndikatorSubKegiatanBatch(payload) {
  return api.post("/indikator-sub-kegiatan", payload);
}

/**
 * Batch simpan indikator sub kegiatan dari wizard RPJMD (payload sama dengan SubKegiatanStep).
 * @param {Record<string, unknown>} values — nilai Formik wizard (sub_kegiatan_id, sub_kegiatan[], …)
 */
export async function saveIndikatorSubKegiatanWizard(values) {
  const subKegiatanList = Array.isArray(values.sub_kegiatan)
    ? values.sub_kegiatan
    : [];
  if (!values.kegiatan_id) {
    const err = new Error("Kegiatan belum dipilih. Kembali ke step Kegiatan.");
    err.code = "VALIDATION";
    throw err;
  }
  if (!values.sub_kegiatan_id) {
    const err = new Error("Pilih Sub Kegiatan terlebih dahulu.");
    err.code = "VALIDATION";
    throw err;
  }
  if (subKegiatanList.length === 0) {
    const err = new Error("Tambahkan minimal satu indikator Sub Kegiatan.");
    err.code = "VALIDATION";
    throw err;
  }

  const payload = subKegiatanList.map((item) => ({
    ...item,
    sub_kegiatan_id: values.sub_kegiatan_id,
    kegiatan_id: values.kegiatan_id,
    program_id: values.program_id,
    sasaran_id: values.sasaran_id,
    tujuan_id: values.tujuan_id,
    misi_id: values.misi_id,
    jenis_dokumen: values.jenis_dokumen,
    tahun: values.tahun,
    periode_id: values.periode_id,
  }));

  return createIndikatorSubKegiatanBatch(payload);
}

// ——— Referensi & konteks step template ———

export async function fetchRekomendasiAiStatus() {
  const res = await api.get("/rekomendasi-ai/status");
  return normalizeAiRecoStatus(res);
}

export async function fetchIndikatorProgramOptions(params) {
  return api.get("/indikator-program", { params });
}

/** GET /indikator-tujuans/by-tujuan?tujuan_id=X — load indikator existing untuk edit */
export async function fetchIndikatorTujuanByTujuan(tujuanId) {
  return api.get("/indikator-tujuans/by-tujuan", {
    params: { tujuan_id: tujuanId },
  });
}

/** GET /indikator-sasaran?sasaran_id=&tahun=&jenis_dokumen= */
export async function fetchIndikatorSasaranBySasaran(sasaranId, params = {}) {
  return api.get("/indikator-sasaran", {
    params: { sasaran_id: sasaranId, ...params },
  });
}

/** GET /indikator-program?program_id=&tahun=&jenis_dokumen= */
export async function fetchIndikatorProgramByProgram(programId, params = {}) {
  return api.get("/indikator-program", {
    params: { program_id: programId, ...params },
  });
}

/** GET /indikator-kegiatan?kegiatan_id=&tahun=&jenis_dokumen=&indikator_program_id= */
export async function fetchIndikatorKegiatanByKegiatan(
  kegiatanId,
  params = {},
) {
  return api.get("/indikator-kegiatan", {
    params: { kegiatan_id: kegiatanId, ...params },
  });
}

export async function fetchIndikatorStrategiByStrategi(
  strategiId,
  params = {},
) {
  return api.get("/indikator-strategi/by-strategi", {
    params: { strategi_id: strategiId, ...params },
  });
}

export async function fetchIndikatorArahByArahKebijakan(arahId, params = {}) {
  return api.get("/indikator-arah-kebijakan/by-arah-kebijakan", {
    params: { arah_kebijakan_id: arahId, ...params },
  });
}

/** GET /sasaran/next-number */
export async function fetchSasaranNextNomor(params) {
  return api.get("/sasaran/next-number", { params });
}

export async function fetchIndikatorTujuanContext(tujuanId) {
  return api.get("/indikator-tujuans/context", {
    params: { tujuan_id: tujuanId },
  });
}

export async function fetchOpdPenanggungJawabDropdown(params) {
  return api.get("/opd-penanggung-jawab/dropdown", { params });
}

export async function fetchTujuanForStep(params) {
  return api.get("/tujuan", { params });
}

export async function fetchSasaranForStep(params) {
  return api.get("/sasaran", { params });
}

// TODO: sesuaikan endpoint setelah backend Strategi selesai
export async function fetchStrategiForStep(params) {
  return api.get("/strategi", { params });
}

// TODO: sesuaikan endpoint setelah backend Arah Kebijakan selesai
export async function fetchArahKebijakanForStep(params) {
  return api.get("/arah-kebijakan", { params });
}

export async function fetchProgramsForStep(params) {
  return api.get("/programs", { params });
}

export async function fetchKegiatanByProgram(params) {
  return api.get("/kegiatan", { params });
}

// TODO: sesuaikan endpoint setelah backend Sub Kegiatan selesai
export async function fetchSubKegiatanByKegiatan(params) {
  return api.get("/sub-kegiatan", { params });
}

// ——— Next kode indikator ———

export async function fetchNextKodeIndikatorTujuan(tujuanId, params) {
  return api.get(`/indikator-tujuans/${tujuanId}/next-kode`, { params });
}

export async function fetchNextKodeIndikatorSasaran(sasaranId) {
  return api.get(`/indikator-sasaran/${sasaranId}/next-kode`);
}

export async function fetchNextKodeIndikatorProgram(programId, params) {
  return api.get(`/indikator-program/${programId}/next-kode`, { params });
}

export async function fetchNextKodeIndikatorKegiatan(kegiatanId, params) {
  return api.get(`/indikator-kegiatan/${kegiatanId}/next-kode`, { params });
}

export async function fetchNextKodeIndikatorStrategi(strateqiId, params) {
  return api.get(`/indikator-strategi/${strateqiId}/next-kode`, { params });
}

export async function fetchNextKodeIndikatorArahKebijakan(
  arahKebijakanId,
  params,
) {
  return api.get(`/indikator-arah-kebijakan/${arahKebijakanId}/next-kode`, {
    params,
  });
}

export async function fetchNextKodeIndikatorSubKegiatan(subKegiatanId, params) {
  return api.get(`/indikator-sub-kegiatan/${subKegiatanId}/next-kode`, {
    params,
  });
}

// ——— AI (domain indikator) ———

export async function postRekomendasiIndikatorAi(indikatorList) {
  const response = await apiAI.post("/rekomendasi-ai", { indikatorList });
  return normalizeRekomendasiAiResponse(response);
}

// ——— Dashboard khusus: parallel fetch per misi ———

/** GET untuk bundle dashboard — jangan gagalkan seluruh bundle jika satu endpoint error. */
function safeAxiosData(promise, label) {
  return promise
    .then((res) => res)
    .catch((err) => {
      console.warn(`[IndikatorKhusus] ${label}:`, err?.message || err);
      return { data: [] };
    });
}

export async function fetchIndikatorKhususBundleByMisi(params) {
  const pageParams = { ...params, limit: 500, perPage: 500 };
  const [
    tujuan,
    sasaran,
    program,
    kegiatan,
    strategi,
    arahKebijakan,
    subKegiatan,
  ] = await Promise.all([
    safeAxiosData(
      api.get("/indikator-tujuans", { params }),
      "indikator-tujuans",
    ),
    safeAxiosData(
      api.get("/indikator-sasaran", { params }),
      "indikator-sasaran",
    ),
    safeAxiosData(
      api.get("/indikator-program", { params }),
      "indikator-program",
    ),
    safeAxiosData(
      api.get("/indikator-kegiatan", { params }),
      "indikator-kegiatan",
    ),
    safeAxiosData(
      api.get("/indikator-strategi", { params: pageParams }),
      "indikator-strategi",
    ),
    safeAxiosData(
      api.get("/indikator-arah-kebijakan", { params: pageParams }),
      "indikator-arah-kebijakan",
    ),
    safeAxiosData(
      api.get("/indikator-sub-kegiatan", { params: pageParams }),
      "indikator-sub-kegiatan",
    ),
  ]);
  return {
    tujuan,
    sasaran,
    program,
    kegiatan,
    strategi,
    arahKebijakan,
    subKegiatan,
  };
}

/**
 * Bootstrap context untuk wizard hirarkis adaptif.
 * @param {string} from   - level entry: "strategi" | "sasaran" | "sub_kegiatan" | dll
 * @param {object} params - { sasaran_id, kegiatan_id, tahun, jenis_dokumen, ... }
 */
export async function fetchWizardBootstrapContext(from, params = {}) {
  const res = await api.get("/wizard/bootstrap-context", {
    params: { from, ...params },
  });
  return res.data?.context || {};
}

// ——— Inline create: entity level (untuk tombol "Tambah X" di wizard) ———

/** POST /api/tujuan — {rpjmd_id, misi_id, no_tujuan, isi_tujuan, jenis_dokumen, tahun}
 *  rpjmd_id = periode_id (pattern dari useProgramFormLogic) */
export async function createTujuan(payload) {
  return api.post("/tujuan", payload);
}

/** POST /api/strategi — {sasaran_id, deskripsi, jenis_dokumen, tahun} */
export async function createStrategi(payload) {
  return api.post("/strategi", payload);
}

/** POST /api/arah-kebijakan — {strategi_id, deskripsi, jenis_dokumen, tahun} */
export async function createArahKebijakan(payload) {
  return api.post("/arah-kebijakan", payload);
}

/** POST /api/sasaran — {nomor, isi_sasaran, tujuan_id, jenis_dokumen, tahun} */
export async function createSasaran(payload) {
  return api.post("/sasaran", payload);
}

/** POST /api/programs — minimal: {sasaran_id, nama_program, kode_program, tahun, jenis_dokumen, pagu_anggaran, opd_penanggung_jawab} */
export async function createProgram(payload) {
  return api.post("/programs", payload);
}

/** POST /api/kegiatan — {program_id, nama_kegiatan, kode_kegiatan, tahun, jenis_dokumen, pagu_anggaran} */
export async function createKegiatan(payload) {
  return api.post("/kegiatan", payload);
}
