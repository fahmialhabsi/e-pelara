import api from "../../../services/api";

/** Dashboard agregasi RKPD v2 (rkpd_dokumen / rkpd_item) — bukan tabel legacy. */
export async function fetchRkpdDashboardV2(params = {}) {
  const res = await api.get("/rkpd/dashboard-v2", { params });
  return res.data?.data ?? res.data;
}

/** Dashboard agregasi Renja v2 — domain planning saja. */
export async function fetchRenjaDashboardV2(params = {}) {
  const res = await api.get("/renja/dashboard-v2", { params });
  return res.data?.data ?? res.data;
}

export async function fetchPerencanaanConsistency() {
  const res = await api.get("/audit/perencanaan-consistency");
  return res.data?.data ?? res.data;
}
