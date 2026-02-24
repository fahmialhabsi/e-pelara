import api from "../services/api";

export const getRealisasi = () => api.get("/realisasiIndikator");
export const getRealisasiById = (id) => api.get(`/realisasiIndikator/${id}`);
export const createRealisasi = (data) => api.post("/realisasiIndikator", data);
export const updateRealisasi = (id, data) =>
  api.put(`/realisasiIndikator/${id}`, data);
export const deleteRealisasi = (id) => api.delete(`/realisasiIndikator/${id}`);
