import api from "../../../services/api";
import {
  extractListData,
  extractListResponse,
  extractSingleData,
} from "../../../utils/apiResponse";

const normalizePayload = (payload = {}) => {
  const clone = { ...payload };
  Object.keys(clone).forEach((key) => {
    if (clone[key] === undefined) delete clone[key];
    if (clone[key] === "") clone[key] = null;
  });
  return clone;
};

export const getAllRenstraDocs = async (params = {}) => {
  const response = await api.get("/renstra-docs", { params });
  return extractListResponse(response.data);
};

export const getRenstraDocById = async (id) => {
  const response = await api.get(`/renstra-docs/${id}`);
  return extractSingleData(response.data);
};

export const getRenstraAudit = async (id) => {
  const response = await api.get(`/renstra-docs/${id}/audit`);
  return extractListData(response.data);
};

export const createRenstraDoc = async (payload) => {
  const response = await api.post("/renstra-docs", normalizePayload(payload));
  return extractSingleData(response.data);
};

export const updateRenstraDoc = async (id, payload) => {
  const response = await api.put(`/renstra-docs/${id}`, normalizePayload(payload));
  return extractSingleData(response.data);
};

export const deleteRenstraDoc = async (id, body = {}) => {
  const response = await api.delete(`/renstra-docs/${id}`, {
    data: normalizePayload(body),
  });
  return response.data;
};

export const updateRenstraDocStatus = async (id, body) => {
  const payload = normalizePayload(body);
  if (payload.action) {
    const response = await api.post(
      `/renstra-docs/${id}/actions/${payload.action}`,
      payload,
    );
    return extractSingleData(response.data);
  }
  const response = await api.patch(`/renstra-docs/${id}/status`, payload);
  return extractSingleData(response.data);
};

export const syncRenstraDocs = async (params = {}) => {
  const response = await api.get("/renstra-docs/sync", { params });
  return response.data?.data || response.data;
};
