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

export const getMrPlanningContextItems = async (id) => {
  if (!id) {
    throw new Error('ID MR Planning Context wajib diisi.');
  }

  const response = await api.get(`/mr-planning-context/${id}/items`);

  return response.data;
};

const mrPlanningContextService = {
  getMrPlanningContexts,
  getMrPlanningContextDetail,
  getMrPlanningContextItems,
};

export default mrPlanningContextService;
