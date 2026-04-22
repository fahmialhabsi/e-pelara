import api from "../../../services/api";

function extractData(res) {
  const p = res?.data;
  if (p && p.success === true) return p.data;
  return Array.isArray(p) ? p : [];
}

/** Baris tabel 2.28 — `urusan_kinerja_2021_2024` (read-only impor PDF). */
export async function fetchUrusanKinerja20212024(periodeId, params = {}) {
  if (periodeId == null || String(periodeId).trim() === "") return [];
  const res = await api.get(`/rpjmd-import/urusan-kinerja/${periodeId}`, {
    params: { limit: 2000, offset: 0, ...params },
  });
  return extractData(res);
}

/** Baris tabel 3.1 — `rpjmd_target_tujuan_sasaran_2025_2029` (target tujuan & sasaran di dokumen RPJMD). */
export async function fetchRpjmdTujuanSasaran31(periodeId, params = {}) {
  if (periodeId == null || String(periodeId).trim() === "") return [];
  const res = await api.get(`/rpjmd-import/tujuan-sasaran/${periodeId}`, {
    params: { limit: 2000, offset: 0, ...params },
  });
  return extractData(res);
}

/** Baris tab « Indikator tujuan » pada Data impor dokumen RPJMD (PDF) — sama endpoint dengan panel impor. */
export async function fetchRpjmdImportIndikatorTujuan(periodeId, params = {}) {
  if (periodeId == null || String(periodeId).trim() === "") return [];
  const res = await api.get(`/rpjmd-import/indikator-tujuan/${periodeId}`, {
    params: { limit: 2000, offset: 0, ...params },
  });
  return extractData(res);
}
