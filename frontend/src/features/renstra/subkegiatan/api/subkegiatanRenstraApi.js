import api from "../../../../services/api";

export const fetchSubkegiatanRenstra = () => api.get("/renstra-subkegiatan");
export const fetchSubkegiatanRenstraById = (id) =>
  api.get(`/renstra-subkegiatan/${id}`);
export const createSubkegiatanRenstra = (data) =>
  api.post("/renstra-subkegiatan", data);
export const updateSubkegiatanRenstra = (id, data) =>
  api.put(`/renstra-subkegiatan/${id}`, data);
export const deleteSubkegiatanRenstra = (id) =>
  api.delete(`/renstra-subkegiatan/${id}`);
