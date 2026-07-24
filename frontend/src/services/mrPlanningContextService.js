import api from '@/services/api';

export const getMrPlanningContexts = async (params = {}) => {
  const response = await api.get('/mr-planning-context', {
    params,
  });

  return response.data;
};

export const getMrPlanningContextDetail = async (id) => {
  const response = await api.get(`/mr-planning-context/${id}`);

  return response.data;
};

export const createMrPlanningContext = async (payload) => {
  const res = await api.post('/mr-planning-context/report-period', payload);
  return res.data;
};

export const generateMrPlanningContextItems = async (contextId) => {
  const res = await api.post(`/mr-planning-context/${contextId}/generate-items`);
  return res.data;
};

export const getMrPlanningContextItems = async (id) => {
  if (!id) {
    throw new Error('ID MR Planning Context wajib diisi.');
  }

  const response = await api.get(`/mr-planning-context/${id}/items`);

  return response.data;
};

// Alur workflow context: draft -> (submit) -> verifikasi -> (verify) -> verifikasi
// (diverifikasi_oleh terisi) -> (approve) -> approved. Word/PDF laporan MR hanya
// aktif setelah status context ini 'approved' (lihat FINAL_REPORT_STATUSES di
// backend/services/mr/mrPlanningReportQueryService.js).
export const submitMrPlanningContext = async (id, payload = {}) => {
  if (!id) {
    throw new Error('ID MR Planning Context wajib diisi.');
  }

  const response = await api.post(`/mr-planning-context/${id}/submit`, payload);

  return response.data;
};

export const verifyMrPlanningContext = async (id, payload = {}) => {
  if (!id) {
    throw new Error('ID MR Planning Context wajib diisi.');
  }

  const response = await api.post(`/mr-planning-context/${id}/verify`, payload);

  return response.data;
};

export const approveMrPlanningContext = async (id, payload = {}) => {
  if (!id) {
    throw new Error('ID MR Planning Context wajib diisi.');
  }

  const response = await api.post(`/mr-planning-context/${id}/approve`, payload);

  return response.data;
};

const mrPlanningContextService = {
  getMrPlanningContexts,
  getMrPlanningContextDetail,
  getMrPlanningContextItems,
};

export default mrPlanningContextService;
