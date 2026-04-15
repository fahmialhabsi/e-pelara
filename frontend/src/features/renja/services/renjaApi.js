import api from "../../../services/api";
import { extractListResponse, extractSingleData } from "../../../utils/apiResponse";

const normalizePayload = (payload = {}) => {
  const clone = { ...payload };
  Object.keys(clone).forEach((key) => {
    if (clone[key] === undefined) delete clone[key];
    if (clone[key] === "") clone[key] = null;
  });
  return clone;
};

export const getAllRenja = async (params = {}) => {
  const response = await api.get("/renja", { params });
  return extractListResponse(response.data);
};

export const createRenja = async (data) => {
  const response = await api.post("/renja", normalizePayload(data));
  return extractSingleData(response.data);
};

export const updateRenja = async (id, data) => {
  const response = await api.put(`/renja/${id}`, normalizePayload(data));
  return extractSingleData(response.data);
};

export const deleteRenja = async (id, body = {}) => {
  const response = await api.delete(`/renja/${id}`, { data: body });
  return response.data;
};

export const getRenjaAudit = async (id) => {
  const response = await api.get(`/renja/${id}/audit`);
  return response.data?.data ?? response.data;
};

export const updateRenjaStatus = async (id, body) => {
  const payload = normalizePayload(body);
  if (payload.action) {
    const response = await api.post(`/renja/${id}/actions/${payload.action}`, payload);
    return extractSingleData(response.data);
  }
  const response = await api.patch(`/renja/${id}/status`, payload);
  return extractSingleData(response.data);
};
