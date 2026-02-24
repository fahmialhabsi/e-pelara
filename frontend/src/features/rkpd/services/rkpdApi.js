// src/features/rkpd/services/rkpdApi.js
import api from "../../../services/api";

export const getAllRkpd = async () => {
  const response = await api.get("/rkpd");
  return response.data;
};

export const createRkpd = async (data) => {
  const response = await api.post("/rkpd", data);
  return response.data;
};

export const updateRkpd = async (id, data) => {
  const response = await api.put(`/rkpd/${id}`, data);
  return response.data;
};

export const deleteRkpd = async (id) => {
  const response = await api.delete(`/rkpd/${id}`);
  return response.data;
};
