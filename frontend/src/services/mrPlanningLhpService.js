// frontend/src/services/mrPlanningLhpService.js
// Modul TLHP — Laporan Hasil Pemeriksaan (LHP)

import api from '@/services/api';

const ENDPOINT = '/mr-planning-lhp';

export const MR_PLANNING_LHP_QUERY_KEYS = {
  all: ['mr-planning-lhp'],
  list: (params = {}) => ['mr-planning-lhp', 'list', params],
  detail: (id) => ['mr-planning-lhp', 'detail', String(id || '')],
};

const getResponseData = (response) => response?.data?.data ?? null;

const normalizeParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      return true;
    }),
  );

const mrPlanningLhpService = {
  ENDPOINT,

  async getAll(params = {}) {
    const response = await api.get(ENDPOINT, { params: normalizeParams(params) });
    return getResponseData(response) || [];
  },

  async getById(id) {
    if (!id) throw new Error('ID LHP wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },

  async create(payload = {}) {
    const response = await api.post(ENDPOINT, payload);
    return getResponseData(response);
  },

  async update(id, payload = {}) {
    if (!id) throw new Error('ID LHP wajib diisi.');
    const response = await api.put(`${ENDPOINT}/${id}`, payload);
    return getResponseData(response);
  },

  async activate(id) {
    if (!id) throw new Error('ID LHP wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${id}/activate`);
    return getResponseData(response);
  },

  async archive(id) {
    if (!id) throw new Error('ID LHP wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${id}/archive`);
    return getResponseData(response);
  },

  async uploadDocument(id, file) {
    if (!id) throw new Error('ID LHP wajib diisi.');
    if (!file) throw new Error('Berkas LHP wajib diisi.');

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`${ENDPOINT}/${id}/document`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return getResponseData(response);
  },

  async remove(id) {
    if (!id) throw new Error('ID LHP wajib diisi.');
    const response = await api.delete(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },
};

export const {
  getAll,
  getById,
  create,
  update,
  activate,
  archive,
  uploadDocument,
  remove,
} = mrPlanningLhpService;

export default mrPlanningLhpService;
