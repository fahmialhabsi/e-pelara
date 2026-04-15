import api from "../../../services/api";

const unwrap = (res) => res?.data?.data ?? res?.data;

export async function getRenjaDashboardSummary(params = {}) {
  const res = await api.get("/renja/dashboard/summary", { params });
  return unwrap(res);
}

export async function getRenjaDashboardRecentDocuments(params = {}) {
  const res = await api.get("/renja/dashboard/recent-documents", { params });
  return unwrap(res);
}

export async function getRenjaDashboardActionItems(params = {}) {
  const res = await api.get("/renja/dashboard/action-items", { params });
  return unwrap(res);
}

export async function getRenjaDashboardMismatchAlerts(params = {}) {
  const res = await api.get("/renja/dashboard/mismatch-alerts", { params });
  return unwrap(res);
}

export async function getRenjaSections(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/sections`);
  return unwrap(res);
}

export async function updateRenjaSection(renjaId, sectionKey, body) {
  const res = await api.put(`/renja/v2/${renjaId}/sections/${sectionKey}`, body);
  return unwrap(res);
}

export async function getRenjaItemsByDokumen(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/items`);
  return unwrap(res);
}

export async function createRenjaItemByDokumen(renjaId, body) {
  const res = await api.post(`/renja/v2/${renjaId}/items`, body);
  return unwrap(res);
}

export async function updateRenjaItemByDokumen(renjaId, itemId, body) {
  const res = await api.put(`/renja/v2/${renjaId}/items/${itemId}`, body);
  return unwrap(res);
}

export async function deleteRenjaItemByDokumen(renjaId, itemId, body = {}) {
  const res = await api.delete(`/renja/v2/${renjaId}/items/${itemId}`, { data: body });
  return unwrap(res);
}

export async function runRenjaWorkflowAction(renjaId, action, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/${action}`, body);
  return unwrap(res);
}

export async function createRenjaRevision(renjaId, body) {
  const res = await api.post(`/renja/v2/${renjaId}/create-revision`, body);
  return unwrap(res);
}

export async function getRenjaVersions(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/versions`);
  return unwrap(res);
}

export async function compareRenjaVersions(renjaId, fromVersion, toVersion) {
  const res = await api.get(`/renja/v2/${renjaId}/compare`, {
    params: { from: fromVersion, to: toVersion },
  });
  return unwrap(res);
}

export async function syncRenjaFromRenstra(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/sync/renstra`, body);
  return unwrap(res);
}

export async function syncRenjaFromRkpd(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/sync/rkpd`, body);
  return unwrap(res);
}

export async function getRenjaMismatchValidation(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/validation/mismatch`);
  return unwrap(res);
}

export async function getRenjaExportViewModel(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/export`);
  return unwrap(res);
}

export async function getDropdownOpd(params = {}) {
  const res = await api.get("/renja/dropdowns/opd", { params });
  return unwrap(res);
}

export async function getDropdownRenstra(params = {}) {
  const res = await api.get("/renja/dropdowns/renstra", { params });
  return unwrap(res);
}

export async function getDropdownRkpd(params = {}) {
  const res = await api.get("/renja/dropdowns/rkpd", { params });
  return unwrap(res);
}

export async function getDropdownSasaran(params = {}) {
  const res = await api.get("/renja/dropdowns/sasaran", { params });
  return unwrap(res);
}

export async function getDropdownPrograms(params = {}) {
  const res = await api.get("/renja/dropdowns/programs", { params });
  return unwrap(res);
}

export async function getDropdownKegiatan(params = {}) {
  const res = await api.get("/renja/dropdowns/kegiatan", { params });
  return unwrap(res);
}

export async function getDropdownSubKegiatan(params = {}) {
  const res = await api.get("/renja/dropdowns/sub-kegiatan", { params });
  return unwrap(res);
}
