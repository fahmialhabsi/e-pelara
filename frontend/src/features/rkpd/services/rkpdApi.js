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

export const getAllRkpd = async (params = {}) => {
  const response = await api.get("/rkpd", { params });
  return extractListResponse(response.data);
};

export const getRkpdAudit = async (id) => {
  const response = await api.get(`/rkpd/${id}/audit`);
  return response.data?.data ?? response.data;
};

export const getRkpdById = async (id) => {
  const response = await api.get(`/rkpd/${id}`);
  return extractSingleData(response.data);
};

export const createRkpd = async (data) => {
  const response = await api.post("/rkpd", normalizePayload(data));
  return extractSingleData(response.data);
};

export const updateRkpd = async (id, data) => {
  const response = await api.put(`/rkpd/${id}`, normalizePayload(data));
  return extractSingleData(response.data);
};

export const deleteRkpd = async (id, body = {}) => {
  const response = await api.delete(`/rkpd/${id}`, { data: body });
  return response.data;
};

export const updateRkpdStatus = async (id, body) => {
  const payload = normalizePayload(body);
  if (payload.action) {
    const response = await api.post(`/rkpd/${id}/actions/${payload.action}`, payload);
    return extractSingleData(response.data);
  }
  const response = await api.patch(`/rkpd/${id}/status`, payload);
  return extractSingleData(response.data);
};

export const syncRkpd = async (params = {}) => {
  const response = await api.get("/rkpd/sync", { params });
  return response.data?.data || response.data;
};
