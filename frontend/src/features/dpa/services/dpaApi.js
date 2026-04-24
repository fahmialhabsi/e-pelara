// dpaApi — panggilan API DPA (axios + Bearer token)
import api from "../../../services/api";

export const getAllDpa = async () => {
  const res = await api.get("/dpa");
  return res.data;
};

export const getDpaById = async (id) => {
  const res = await api.get(`/dpa/${id}`);
  return res.data;
};

export const getDpaAudit = async (id) => {
  const res = await api.get(`/dpa/${id}/audit`);
  const d = res.data;
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
};

export const createDpa = async (body) => {
  const res = await api.post("/dpa", body);
  return res.data;
};

export const updateDpa = async (id, body) => {
  const res = await api.put(`/dpa/${id}`, body);
  return res.data;
};

export const deleteDpa = async (id, body = {}) => {
  const res = await api.delete(`/dpa/${id}`, { data: body });
  return res.data;
};
