import api from "../../../../services/api";

export const fetchSasaranRenstra = () => api.get("/renstra-sasaran");
export const fetchSasaranRenstraById = (id) =>
  api.get(`/renstra-sasaran/${id}`);
export const createSasaranRenstra = (data) =>
  api.post("/renstra-sasaran", data);
export const updateSasaranRenstra = (id, data) =>
  api.put(`/renstra-sasaran/${id}`, data);
export const deleteSasaranRenstra = (id) =>
  api.delete(`/renstra-sasaran/${id}`);
