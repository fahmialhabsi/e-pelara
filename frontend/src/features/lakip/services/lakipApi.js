// lakipApi.js
import api from "@/services/api";

export const getAllLakip = async () => {
  const res = await fetch("/api/lakip");
  if (!res.ok) throw new Error("Gagal mengambil data LAKIP");
  return res.json();
};

export const syncRealisasiAnggaranLakip = async (tahun) => {
  const res = await api.post("/lakip-realisasi-anggaran/sync", { tahun });
  return res.data;
};
