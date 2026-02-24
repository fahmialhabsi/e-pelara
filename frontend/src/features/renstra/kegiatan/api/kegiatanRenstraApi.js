import api from "../../../../services/api";

export const fetchKegiatanRenstra = () => api.get("/renstra-kegiatan");
export const fetchKegiatanRenstraById = (id) =>
  api.get(`/renstra-kegiatan/${id}`);
export const createKegiatanRenstra = (data) =>
  api.post("/renstra-kegiatan", data);
export const updateKegiatanRenstra = (id, data) =>
  api.put(`/renstra-kegiatan/${id}`, data);
export const deleteKegiatanRenstra = (id) =>
  api.delete(`/renstra-kegiatan/${id}`);
