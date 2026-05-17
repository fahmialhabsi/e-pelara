// frontend/src/services/mrPlanningMonitoringService.js

import api from './api';

const BASE_URL = '/mr-planning-monitoring';

export const MR_PLANNING_MONITORING_QUERY_KEYS = {
  all: ['mr-planning-monitoring'],

  byRisk: (riskId, params = {}) => [
    ...MR_PLANNING_MONITORING_QUERY_KEYS.all,
    'risk',
    String(riskId || ''),
    params,
  ],

  byMitigation: (mitigationId, params = {}) => [
    ...MR_PLANNING_MONITORING_QUERY_KEYS.all,
    'mitigation',
    String(mitigationId || ''),
    params,
  ],

  detail: (id) => [...MR_PLANNING_MONITORING_QUERY_KEYS.all, 'detail', String(id || '')],

  evidences: (monitoringId) => [
    ...MR_PLANNING_MONITORING_QUERY_KEYS.all,
    'evidences',
    String(monitoringId || ''),
  ],

  evidenceDetail: (evidenceId) => [
    ...MR_PLANNING_MONITORING_QUERY_KEYS.all,
    'evidence-detail',
    String(evidenceId || ''),
  ],
};

const cleanObject = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    }),
  );

const unwrapResponse = (response) => {
  const body = response?.data;
  return body?.data ?? body ?? response;
};

const assertId = (value, label = 'ID') => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${label} tidak valid.`);
  }

  return id;
};

/**
 * Payload Realisasi/Pemantauan Pengendalian.
 *
 * Guard:
 * - Frontend hanya mengirim field input bisnis.
 * - Field teknis, workflow, versi, approval, actor, dan hasil kalkulasi
 *   tetap menjadi tanggung jawab backend.
 * - Skor aktual, level aktual, perubahan level, dan tren risiko
 *   dihitung backend dari reference matrix.
 * - Kejadian risiko diisi hanya jika risiko benar-benar terjadi.
 */
const buildMonitoringPayload = (values = {}) =>
  cleanObject({
    mr_planning_mitigation_id: values.mr_planning_mitigation_id,

    periode_type: values.periode_type,
    periode_label: values.periode_label,
    monitoring_date: values.monitoring_date,

    hasil_monitoring: values.hasil_monitoring,
    realisasi_mitigasi: values.realisasi_mitigasi,
    output_realisasi: values.output_realisasi,

    persentase_realisasi: values.persentase_realisasi,
    progress_persen: values.progress_persen,

    efektivitas_pengendalian_ref_id: values.efektivitas_pengendalian_ref_id,

    actual_likelihood_ref_id: values.actual_likelihood_ref_id,
    actual_impact_ref_id: values.actual_impact_ref_id,

    kendala: values.kendala,
    tindak_lanjut: values.tindak_lanjut,
    rekomendasi: values.rekomendasi,

    status_monitoring: values.status_monitoring,

    terjadi_risiko: values.terjadi_risiko,
    tanggal_kejadian: values.tanggal_kejadian,
    tempat_kejadian: values.tempat_kejadian,
    uraian_kejadian: values.uraian_kejadian,
    pemicu_kejadian: values.pemicu_kejadian,
    dampak_kejadian: values.dampak_kejadian,
    tindak_lanjut_kejadian: values.tindak_lanjut_kejadian,

    alasan_revisi: values.alasan_revisi,
  });

/**
 * Payload Bukti Realisasi Monitoring.
 *
 * Guard:
 * - Bukti Realisasi berbeda dari Dokumen RTP.
 * - Frontend hanya mengirim field input bisnis dan file.
 * - Relasi monitoring, mitigation, risk, context, actor, storage, dan status
 *   diturunkan oleh backend.
 * - Jangan mengirim field teknis seperti file_path, status_bukti, is_active,
 *   uploaded_by, created_by, atau updated_by.
 */
const buildEvidenceFormData = (values = {}) => {
  const formData = new FormData();

  formData.append('entity_type', 'mr_monitoring_evidence');

  formData.append('evidence_type', values.evidence_type || '');
  formData.append('evidence_title', values.evidence_title || '');

  if (values.evidence_number) {
    formData.append('evidence_number', values.evidence_number);
  }

  if (values.evidence_date) {
    formData.append('evidence_date', values.evidence_date);
  }

  if (values.realization_period) {
    formData.append('realization_period', values.realization_period);
  }

  if (
    values.progress_percentage !== undefined &&
    values.progress_percentage !== null &&
    values.progress_percentage !== ''
  ) {
    formData.append('progress_percentage', values.progress_percentage);
  }

  if (values.description) {
    formData.append('description', values.description);
  }

  if (values.file) {
    formData.append('file', values.file);
  }

  return formData;
};

const getByRisk = async (riskId, params = {}) => {
  const id = assertId(riskId, 'ID Risiko');
  const response = await api.get(`${BASE_URL}/risk/${id}`, { params });
  return unwrapResponse(response);
};

const getByMitigation = async (mitigationId, params = {}) => {
  const id = assertId(mitigationId, 'ID Rencana Tindak Pengendalian');
  const response = await api.get(`${BASE_URL}/mitigation/${id}`, { params });
  return unwrapResponse(response);
};

const getById = async (id) => {
  const monitoringId = assertId(id, 'ID Pemantauan Pengendalian');
  const response = await api.get(`${BASE_URL}/${monitoringId}`);
  return unwrapResponse(response);
};

const createFromRisk = async (riskId, values = {}) => {
  const id = assertId(riskId, 'ID Risiko');
  const payload = buildMonitoringPayload(values);

  const response = await api.post(`${BASE_URL}/risk/${id}`, payload);
  return unwrapResponse(response);
};

const buildDraftPreviewFromRisk = async (riskId, values = {}) => {
  const id = assertId(riskId, 'ID Risiko');

  const payload = cleanObject({
    mr_planning_mitigation_id: values.mr_planning_mitigation_id,

    periode_type: values.periode_type,
    periode_label: values.periode_label,
    monitoring_date: values.monitoring_date,

    progress_persen: values.progress_persen,
    persentase_realisasi: values.persentase_realisasi,
  });

  const response = await api.post(`${BASE_URL}/risk/${id}/draft-preview`, payload);
  return unwrapResponse(response);
};

const updateDraft = async (id, values = {}) => {
  const monitoringId = assertId(id, 'ID Pemantauan Pengendalian');
  const payload = buildMonitoringPayload(values);

  const response = await api.put(`${BASE_URL}/${monitoringId}/draft`, payload);
  return unwrapResponse(response);
};

const getEvidences = async (monitoringId) => {
  const id = assertId(monitoringId, 'ID Pemantauan Pengendalian');

  const response = await api.get(`${BASE_URL}/${id}/evidence`);
  return unwrapResponse(response);
};

const uploadEvidence = async (monitoringId, values = {}) => {
  const id = assertId(monitoringId, 'ID Pemantauan Pengendalian');
  const payload = buildEvidenceFormData(values);

  const response = await api.post(`${BASE_URL}/${id}/evidence`, payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return unwrapResponse(response);
};

const getEvidenceDetail = async (evidenceId) => {
  const id = assertId(evidenceId, 'ID Bukti Realisasi');

  const response = await api.get(`${BASE_URL}/evidence/${id}`);
  return unwrapResponse(response);
};

const downloadEvidenceBlob = async (evidenceId, mode = 'download') => {
  const id = assertId(evidenceId, 'ID Bukti Realisasi');
  const safeMode = mode === 'view' ? 'view' : 'download';

  return api.get(`${BASE_URL}/evidence/${id}/download`, {
    params: {
      mode: safeMode,
    },
    responseType: 'blob',
  });
};

const cancelEvidence = async (evidenceId, cancelReason) => {
  const id = assertId(evidenceId, 'ID Bukti Realisasi');

  const response = await api.patch(`${BASE_URL}/evidence/${id}/cancel`, {
    cancel_reason: cancelReason,
  });

  return unwrapResponse(response);
};

const openEvidenceBlob = async (evidenceId, mode = 'view') => {
  const response = await downloadEvidenceBlob(evidenceId, mode);
  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  });

  const blobUrl = window.URL.createObjectURL(blob);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');

  return blobUrl;
};

const saveEvidenceBlob = async (evidenceId, fileName = 'bukti-realisasi') => {
  const response = await downloadEvidenceBlob(evidenceId, 'download');
  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  });

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = fileName || 'bukti-realisasi';
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(blobUrl);

  return true;
};

const mrPlanningMonitoringService = {
  getByRisk,
  getByMitigation,
  getById,
  createFromRisk,
  buildDraftPreviewFromRisk,
  updateDraft,
  buildMonitoringPayload,

  // Bukti Realisasi Monitoring
  getEvidences,
  uploadEvidence,
  getEvidenceDetail,
  downloadEvidenceBlob,
  openEvidenceBlob,
  saveEvidenceBlob,
  cancelEvidence,
  buildEvidenceFormData,
};

export default mrPlanningMonitoringService;
