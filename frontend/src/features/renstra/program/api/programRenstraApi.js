import api from "../../../../services/api";

export const fetchProgramRenstra = () => api.get("/renstra-program");
export const fetchProgramRenstraById = (id) =>
  api.get(`/renstra-program/${id}`);
export const createProgramRenstra = (data) =>
  api.post("/renstra-program", data);
export const updateProgramRenstra = (id, data) =>
  api.put(`/renstra-program/${id}`, data);
export const deleteProgramRenstra = (id) =>
  api.delete(`/renstra-program/${id}`);
