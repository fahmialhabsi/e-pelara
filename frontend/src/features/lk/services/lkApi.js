import api from "../../../services/api";

export async function getKodeAkunList(params) {
  const { data } = await api.get("/kode-akun", { params });
  return data;
}

export async function getKodeAkunTree() {
  const { data } = await api.get("/kode-akun/tree");
  return data;
}

export async function getJurnalList(params) {
  const { data } = await api.get("/jurnal", { params });
  return data;
}

export async function getJurnalById(id) {
  const { data } = await api.get(`/jurnal/${id}`);
  return data;
}

export async function createJurnal(body) {
  const { data } = await api.post("/jurnal", body);
  return data;
}

export async function updateJurnal(id, body) {
  const { data } = await api.put(`/jurnal/${id}`, body);
  return data;
}

export async function postJurnal(id) {
  const { data } = await api.post(`/jurnal/${id}/post`);
  return data;
}

export async function voidJurnal(id) {
  const { data } = await api.post(`/jurnal/${id}/void`);
  return data;
}

export async function getSaldoAkun(tahun, params = {}) {
  const { data } = await api.get(`/saldo-akun/${tahun}`, { params });
  return data;
}

export async function getSaldoAkunBulan(tahun, bulan) {
  const { data } = await api.get(`/saldo-akun/${tahun}/${bulan}`);
  return data;
}

export async function recalculateSaldo(tahun) {
  const { data } = await api.post(`/saldo-akun/recalculate/${tahun}`);
  return data;
}

export async function getBkuList(params) {
  const { data } = await api.get("/bku", { params });
  return data;
}

export async function getBkuById(id) {
  const { data } = await api.get(`/bku/${id}`);
  return data;
}

export async function createBku(body) {
  const { data } = await api.post("/bku", body);
  return data;
}

export async function updateBku(id, body) {
  const { data } = await api.put(`/bku/${id}`, body);
  return data;
}

export async function previewJurnalBku(body) {
  const { data } = await api.post("/bku/preview-jurnal", body);
  return data;
}

export async function getBkuRingkasan(tahun, bulan) {
  const { data } = await api.get(`/bku/ringkasan/${tahun}/${bulan}`);
  return data;
}

export async function getBkuSaldoAkhir(tahun, bulan) {
  const { data } = await api.get(`/bku/saldo-akhir/${tahun}/${bulan}`);
  return data;
}

export async function getBkuCetak(tahun, bulan) {
  const { data } = await api.get(`/bku/cetak/${tahun}/${bulan}`);
  return data;
}

export async function syncBkuSigap(body) {
  const { data } = await api.post("/bku/sync-sigap", body);
  return data;
}

export async function getBkuUpList(tahun) {
  const { data } = await api.get(`/bku/up/${tahun}`);
  return data;
}

export async function createBkuUp(body) {
  const { data } = await api.post("/bku/up", body);
  return data;
}

export async function getBkuRekonsiliasi(tahun, bulan) {
  const { data } = await api.get(`/bku/rekonsiliasi/${tahun}/${bulan}`);
  return data;
}

export async function getLra(tahun) {
  const { data } = await api.get(`/lra/${tahun}`);
  return data;
}

export async function getLraPerbandingan(tahun) {
  const { data } = await api.get(`/lra/${tahun}/perbandingan`);
  return data;
}

export async function generateLra(tahun) {
  const { data } = await api.post(`/lra/${tahun}/generate`);
  return data;
}

export async function kunciLra(tahun) {
  const { data } = await api.post(`/lra/${tahun}/kunci`);
  return data;
}

export async function getLraCrosscheck(tahun) {
  const { data } = await api.get(`/lra/${tahun}/crosscheck`);
  return data;
}

export async function exportLra(tahun) {
  const { data } = await api.get(`/lra/${tahun}/export`);
  return data;
}

export async function getNeraca(tahun) {
  const { data } = await api.get(`/neraca/${tahun}`);
  return data;
}

export async function generateNeraca(tahun) {
  const { data } = await api.post(`/neraca/${tahun}/generate`);
  return data;
}

export async function getNeracaPerbandingan(tahun) {
  const { data } = await api.get(`/neraca/${tahun}/perbandingan`);
  return data;
}

export async function kunciNeraca(tahun) {
  const { data } = await api.post(`/neraca/${tahun}/kunci`);
  return data;
}

export async function exportNeraca(tahun) {
  const { data } = await api.get(`/neraca/${tahun}/export`);
  return data;
}

export async function getAsetTetapList() {
  const { data } = await api.get("/aset-tetap");
  return data;
}

export async function createAsetTetap(body) {
  const { data } = await api.post("/aset-tetap", body);
  return data;
}

export async function updateAsetTetap(id, body) {
  const { data } = await api.put(`/aset-tetap/${id}`, body);
  return data;
}

export async function getAsetPenyusutanTahun(tahun) {
  const { data } = await api.get(`/aset-tetap/penyusutan/${tahun}`);
  return data;
}

export async function getKewajibanList(params) {
  const { data } = await api.get("/kewajiban", { params });
  return data;
}

export async function createKewajiban(body) {
  const { data } = await api.post("/kewajiban", body);
  return data;
}

export async function getPersediaanByTahun(tahun) {
  const { data } = await api.get(`/persediaan/${tahun}`);
  return data;
}

export async function createPersediaan(body) {
  const { data } = await api.post("/persediaan", body);
  return data;
}

export async function updatePersediaan(id, body) {
  const { data } = await api.put(`/persediaan/${id}`, body);
  return data;
}

export async function getLo(tahun) {
  const { data } = await api.get(`/lo/${tahun}`);
  return data;
}

export async function generateLo(tahun) {
  const { data } = await api.post(`/lo/${tahun}/generate`);
  return data;
}

export async function kunciLo(tahun) {
  const { data } = await api.post(`/lo/${tahun}/kunci`);
  return data;
}

export async function getLpe(tahun) {
  const { data } = await api.get(`/lpe/${tahun}`);
  return data;
}

export async function generateLpe(tahun, body) {
  const { data } = await api.post(`/lpe/${tahun}/generate`, body || {});
  return data;
}

export async function kunciLpe(tahun) {
  const { data } = await api.post(`/lpe/${tahun}/kunci`);
  return data;
}

export async function getLpeValidasi(tahun) {
  const { data } = await api.get(`/lpe/${tahun}/validasi`);
  return data;
}

export async function getPenyusutanPreview(tahun) {
  const { data } = await api.get(`/penyusutan/${tahun}/preview`);
  return data;
}

export async function prosesPenyusutan(tahun) {
  const { data } = await api.post(`/penyusutan/${tahun}/proses`);
  return data;
}

export async function getLak(tahun) {
  const { data } = await api.get(`/lak/${tahun}`);
  return data;
}

export async function generateLak(tahun) {
  const { data } = await api.post(`/lak/${tahun}/generate`);
  return data;
}

export async function getLakValidasi(tahun) {
  const { data } = await api.get(`/lak/${tahun}/validasi`);
  return data;
}

export async function exportLak(tahun) {
  const { data } = await api.get(`/lak/${tahun}/export`);
  return data;
}

export async function getCalkTahun(tahun) {
  const { data } = await api.get(`/calk/${tahun}`);
  return data;
}

export async function getCalkBab(tahun, templateId) {
  const { data } = await api.get(`/calk/${tahun}/${templateId}`);
  return data;
}

export async function putCalkBab(tahun, templateId, body) {
  const { data } = await api.put(`/calk/${tahun}/${templateId}`, body);
  return data;
}

export async function generateCalkAll(tahun) {
  const { data } = await api.post(`/calk/${tahun}/generate-all`);
  return data;
}

export async function getCalkStatus(tahun) {
  const { data } = await api.get(`/calk/${tahun}/status`);
  return data;
}

export async function getCalkPreview(tahun) {
  const { data } = await api.get(`/calk/${tahun}/preview`);
  return data;
}

export async function refreshCalkBabData(tahun, templateId) {
  const { data } = await api.post(`/calk/${tahun}/bab/${templateId}/refresh-data`);
  return data;
}

export async function getLkDashboard(tahun) {
  const { data } = await api.get(`/lk/dashboard/${tahun}`);
  return data;
}

export async function syncLkKinerja(tahun) {
  const { data } = await api.post(`/lk/sync-kinerja`, { tahun });
  return data;
}

export async function getLkValidasiLengkap(tahun) {
  const { data } = await api.get(`/lk/${tahun}/validasi`);
  return data;
}

export async function postLkGeneratePdf(tahun, body) {
  const { data } = await api.post(`/lk/${tahun}/generate-pdf`, body || {});
  return data;
}

export async function getLkPdfRiwayat(tahun) {
  const { data } = await api.get(`/lk/${tahun}/riwayat-generate`);
  return data;
}

export async function postLkFinalisasi(tahun) {
  const { data } = await api.post(`/lk/${tahun}/finalisasi`);
  return data;
}

/** URL absolut untuk tab baru (pakai query _token). */
export function getLkPreviewHtmlUrl(tahun) {
  const base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "/api")
    .replace(/\/+$/, "");
  const token = localStorage.getItem("token") || "";
  const q = token ? `?_token=${encodeURIComponent(token)}` : "";
  return `${base}/lk/${tahun}/preview-html${q}`;
}

export function getLkDownloadPdfUrl(tahun, params = {}) {
  const base = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "/api")
    .replace(/\/+$/, "");
  const token = localStorage.getItem("token") || "";
  const sp = new URLSearchParams();
  if (params.id) sp.set("id", String(params.id));
  if (params.latest) sp.set("latest", "1");
  if (token) sp.set("_token", token);
  const qs = sp.toString();
  return `${base}/lk/${tahun}/download-pdf${qs ? `?${qs}` : ""}`;
}
