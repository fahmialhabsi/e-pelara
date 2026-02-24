import api from "../../../../services/api";

export const fetchStrategiRenstra = () => api.get("/renstra-strategi");
export const fetchStrategiRenstraById = (id) =>
  api.get(`/renstra-strategi/${id}`);
export const createStrategiRenstra = (data) =>
  api.post("/renstra-strategi", data);
export const updateStrategiRenstra = (id, data) =>
  api.put(`/renstra-strategi/${id}`, data);
export const deleteStrategiRenstra = (id) =>
  api.delete(`/renstra-strategi/${id}`);
