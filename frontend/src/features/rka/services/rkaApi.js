import api from "../../../services/api";

export const getAllRka = async () => {
  const res = await api.get("/rka");
  return res.data;
};

export const getRkaById = async (id) => {
  const res = await api.get(`/rka/${id}`);
  return res.data;
};

export const getRkaAudit = async (id) => {
  const res = await api.get(`/rka/${id}/audit`);
  const d = res.data;
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
};

export const createRka = async (body) => {
  const res = await api.post("/rka", body);
  return res.data;
};

export const updateRka = async (id, body) => {
  const res = await api.put(`/rka/${id}`, body);
  return res.data;
};

export const deleteRka = async (id, body = {}) => {
  const res = await api.delete(`/rka/${id}`, { data: body });
  return res.data;
};
