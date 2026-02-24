import api from "../../../../services/api";

export const fetchTujuanRenstra = () => api.get("/renstra-tujuan");
export const fetchTujuanRenstraById = (id) => api.get(`/renstra-tujuan/${id}`);
export const createTujuanRenstra = (data) => api.post("/renstra-tujuan", data);
export const updateTujuanRenstra = (id, data) =>
  api.put(`/renstra-tujuan/${id}`, data);
export const deleteTujuanRenstra = (id) => api.delete(`/renstra-tujuan/${id}`);
