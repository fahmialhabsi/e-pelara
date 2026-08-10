import api from '../../../services/api';

const BASE = '/food-operations';

// ── Documents ──
export async function getFoodOpsDocuments(params = {}) {
  const response = await api.get(`${BASE}/documents`, { params });
  return response.data?.data || [];
}
export async function createFoodOpsDocument(formData) {
  const response = await api.post(`${BASE}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data?.data;
}
export async function getFoodOpsDocumentDetail(id) {
  const response = await api.get(`${BASE}/documents/${id}`);
  return response.data?.data;
}
export async function getFoodOpsDocumentVersions(id) {
  const response = await api.get(`${BASE}/documents/${id}/versions`);
  return response.data?.data || [];
}
export async function createFoodOpsDocumentVersion(id, formData) {
  const response = await api.post(`${BASE}/documents/${id}/versions`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data?.data;
}
export async function classifyFoodOpsDocument(id) {
  const response = await api.post(`${BASE}/documents/${id}/classify`);
  return response.data?.data;
}
export async function verifyFoodOpsDocument(id, payload) {
  const response = await api.patch(`${BASE}/documents/${id}/verify`, payload);
  return response.data?.data;
}
export async function downloadFoodOpsDocument(id) {
  return api.get(`${BASE}/documents/${id}/download`, { responseType: 'blob' });
}

// ── Regulations ──
export async function getFoodOpsRegulations(params = {}) {
  const response = await api.get(`${BASE}/regulations`, { params });
  return response.data?.data || [];
}
export async function createFoodOpsRegulation(payload) {
  const response = await api.post(`${BASE}/regulations`, payload);
  return response.data?.data;
}
export async function getFoodOpsRegulationDetail(id) {
  const response = await api.get(`${BASE}/regulations/${id}`);
  return response.data?.data;
}
export async function updateFoodOpsRegulation(id, payload) {
  const response = await api.patch(`${BASE}/regulations/${id}`, payload);
  return response.data?.data;
}

// ── Events ──
export async function getFoodOpsEvents(params = {}) {
  const response = await api.get(`${BASE}/events`, { params });
  return response.data?.data || [];
}
export async function createFoodOpsEvent(payload) {
  const response = await api.post(`${BASE}/events`, payload);
  return response.data?.data;
}
export async function getFoodOpsEventDetail(id) {
  const response = await api.get(`${BASE}/events/${id}`);
  return response.data?.data;
}
export async function updateFoodOpsEvent(id, payload) {
  const response = await api.patch(`${BASE}/events/${id}`, payload);
  return response.data?.data;
}

// ── Document Links ──
export async function getFoodOpsDocumentLinks(params = {}) {
  const response = await api.get(`${BASE}/document-links`, { params });
  return response.data?.data || [];
}
export async function createFoodOpsDocumentLink(payload) {
  const response = await api.post(`${BASE}/document-links`, payload);
  return response.data?.data;
}
export async function deleteFoodOpsDocumentLink(id) {
  const response = await api.delete(`${BASE}/document-links/${id}`);
  return response.data?.data;
}
