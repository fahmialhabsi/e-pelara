import api from '@/services/api';

const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const renstraReviewApi = {
  list: async (params) => rowsOf((await api.get('/renstra-review-konsistensi', { params })).data),
  detail: async (id) => {
    const res = await api.get(`/renstra-review-konsistensi/${id}`);
    return res.data?.data ?? res.data;
  },
  create: (payload) => api.post('/renstra-review-konsistensi', payload),
  update: (id, payload) => api.put(`/renstra-review-konsistensi/${id}`, payload),
  remove: (id) => api.delete(`/renstra-review-konsistensi/${id}`),
  terapkan: (id) => api.post(`/renstra-review-konsistensi/${id}/terapkan`),
  batalkanTerapan: (id) => api.post(`/renstra-review-konsistensi/${id}/batalkan-terapan`),
};

/** Ambil daftar objek Renstra untuk satu level (dipakai dropdown objek & induk). */
export const fetchObjekLevel = async (endpoint, renstraId) =>
  rowsOf((await api.get(endpoint, { params: { renstra_id: renstraId } })).data);
