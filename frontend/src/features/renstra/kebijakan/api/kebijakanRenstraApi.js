import api from "../../../../services/api";

export const fetchKebijakanRenstra = () => api.get("/kebijakan-renstra");
export const fetchKebijakanRenstraById = (id) =>
  api.get(`/kebijakan-renstra/${id}`);
export const createKebijakanRenstra = (data) =>
  api.post("/kebijakan-renstra", data);
export const updateKebijakanRenstra = (id, data) =>
  api.put(`/kebijakan-renstra/${id}`, data);
export const deleteKebijakanRenstra = (id) =>
  api.delete(`/kebijakan-renstra/${id}`);
