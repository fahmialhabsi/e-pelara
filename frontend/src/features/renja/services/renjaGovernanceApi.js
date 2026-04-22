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

export async function validateRenjaDokumen(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/validate`, body);
  return unwrap(res);
}

export async function recomputeRenjaMismatch(renjaId) {
  const res = await api.post(`/renja/v2/${renjaId}/recompute-mismatch`, {});
  return unwrap(res);
}

export async function getRenjaReadiness(renjaId, params = {}) {
  const res = await api.get(`/renja/v2/${renjaId}/readiness`, { params });
  return unwrap(res);
}

export async function validateRenjaItemDraft(renjaId, body) {
  const res = await api.post(`/renja/v2/${renjaId}/items/validate`, body);
  return unwrap(res);
}

export async function bulkValidateRenjaItems(renjaId) {
  const res = await api.post(`/renja/v2/${renjaId}/items/bulk-validate`, {});
  return unwrap(res);
}

export async function getRenjaExportViewModel(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/export`);
  return unwrap(res);
}

export async function getRenjaDataFixSummary(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/summary`);
  return unwrap(res);
}

export async function generateRenjaDataFixMapping(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/generate-mapping`, body);
  return unwrap(res);
}

export async function getRenjaDataFixMappingSuggestions(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/mapping-suggestions`);
  return unwrap(res);
}

export async function applyRenjaDataFixMapping(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/apply-mapping`, body);
  return unwrap(res);
}

/** Dry-run dampak apply mapping (tidak menulis DB). */
export async function previewRenjaDataFixMapping(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/preview-mapping`, body);
  return unwrap(res);
}

export async function previewRenjaDataFixImpact(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/preview-impact`, body);
  return unwrap(res);
}

export async function getRenjaDataFixQualityScore(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/quality-score`);
  return unwrap(res);
}

export async function listRenjaMappingApplyBatches(renjaId, params = {}) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/mapping-apply-batches`, { params });
  return unwrap(res);
}

export async function getRenjaDataFixBatchHistory(renjaId, params = {}) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/batch-history`, { params });
  return unwrap(res);
}

export async function getRenjaDataFixBatchDetail(renjaId, batchId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/batch-detail/${batchId}`);
  return unwrap(res);
}

export async function acquireRenjaDataFixLock(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/lock`, body);
  return unwrap(res);
}

export async function releaseRenjaDataFixLock(renjaId) {
  const res = await api.delete(`/renja/v2/${renjaId}/data-fix/lock`);
  return unwrap(res);
}

export async function getRenjaDataFixLock(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/lock`);
  return unwrap(res);
}

export async function rollbackRenjaMappingApplyBatch(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/rollback-mapping`, body);
  return unwrap(res);
}

export async function generateRenjaIndicatorSuggestions(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/generate-indicator-suggestions`, body);
  return unwrap(res);
}

export async function getRenjaIndicatorSuggestions(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/indicator-suggestions`);
  return unwrap(res);
}

export async function applyRenjaIndicatorSuggestions(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/apply-indicator-mapping`, body);
  return unwrap(res);
}

export async function autofillRenjaTargets(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/autofill-targets`, body);
  return unwrap(res);
}

export async function getRenjaTargetSuggestions(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/target-suggestions`);
  return unwrap(res);
}

export async function resolveRenjaPolicyConflicts(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/resolve-policy-conflicts`, body);
  return unwrap(res);
}

export async function getRenjaPolicyConflicts(renjaId) {
  const res = await api.get(`/renja/v2/${renjaId}/data-fix/policy-conflicts`);
  return unwrap(res);
}

export async function applyRenjaAllHighConfidence(renjaId, body = {}) {
  const res = await api.post(`/renja/v2/${renjaId}/data-fix/apply-all-high-confidence`, body);
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
