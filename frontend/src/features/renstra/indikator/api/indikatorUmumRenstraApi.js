// src/features/renstra/indikator/api/indikatorUmumRenstraApi.js
import api from "../../../../services/api";

export const fetchIndikatorRenstra = async (params = {}) => {
  const res = await api.get("/indikator-renstra", { params });
  return res.data;
};

export const getIndikatorRenstra = async (id) => {
  const res = await api.get(`/indikator-renstra/${id}`);
  return res.data;
};

export const createIndikatorRenstra = async (payload) => {
  const res = await api.post("/indikator-renstra", payload);
  return res.data;
};

export const updateIndikatorRenstra = async ({ id, ...payload }) => {
  const res = await api.put(`/indikator-renstra/${id}`, payload);
  return res.data;
};

export const deleteIndikatorRenstra = async (id) => {
  const res = await api.delete(`/indikator-renstra/${id}`);
  return res.data;
};
