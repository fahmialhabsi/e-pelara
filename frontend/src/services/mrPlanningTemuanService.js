// frontend/src/services/mrPlanningTemuanService.js
// Modul TLHP — Temuan + Rekomendasi

import api from '@/services/api';

const ENDPOINT = '/mr-planning-temuan';

export const MR_PLANNING_TEMUAN_QUERY_KEYS = {
  all: ['mr-planning-temuan'],
  byLhp: (lhpId) => ['mr-planning-temuan', 'lhp', String(lhpId || '')],
  detail: (id) => ['mr-planning-temuan', 'detail', String(id || '')],
  history: (id) => ['mr-planning-temuan', 'history', String(id || '')],
  historyDetail: (historyId) => ['mr-planning-temuan', 'history-detail', String(historyId || '')],
  rekomendasi: (temuanId) => ['mr-planning-temuan', 'rekomendasi', String(temuanId || '')],
};

const getResponseData = (response) => response?.data?.data ?? null;

const mrPlanningTemuanService = {
  ENDPOINT,

  async getByLhp(lhpId) {
    if (!lhpId) throw new Error('ID LHP wajib diisi.');
    const response = await api.get(`${ENDPOINT}/lhp/${lhpId}`);
    return getResponseData(response) || [];
  },

  async getById(id) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },

  async createFromLhp(lhpId, payload = {}) {
    if (!lhpId) throw new Error('ID LHP wajib diisi.');
    const response = await api.post(`${ENDPOINT}/lhp/${lhpId}`, payload);
    return getResponseData(response);
  },

  async update(id, payload = {}) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.put(`${ENDPOINT}/${id}`, payload);
    return getResponseData(response);
  },

  async submit(id, payload = {}) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${id}/submit`, payload);
    return getResponseData(response);
  },

  async createRevisi(id, payload = {}) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${id}/revisi`, payload);
    return getResponseData(response);
  },

  async escalateToRisk(id, payload = {}) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${id}/escalate-to-risk`, payload);
    return getResponseData(response);
  },

  async getHistory(id, params = {}) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${id}/history`, { params });
    return getResponseData(response) || [];
  },

  async getHistoryById(historyId) {
    if (!historyId) throw new Error('History ID wajib diisi.');
    const response = await api.get(`${ENDPOINT}/history/${historyId}`);
    return getResponseData(response);
  },

  async verifikasiHistory(historyId, payload = {}) {
    if (!historyId) throw new Error('History ID wajib diisi.');
    const response = await api.patch(`${ENDPOINT}/history/${historyId}/verifikasi`, payload);
    return getResponseData(response);
  },

  async approveHistory(historyId, payload = {}) {
    if (!historyId) throw new Error('History ID wajib diisi.');
    const response = await api.patch(`${ENDPOINT}/history/${historyId}/approve`, payload);
    return getResponseData(response);
  },

  async tolakHistory(historyId, payload = {}) {
    if (!historyId) throw new Error('History ID wajib diisi.');
    const response = await api.patch(`${ENDPOINT}/history/${historyId}/tolak`, payload);
    return getResponseData(response);
  },

  async getRekomendasiList(temuanId) {
    if (!temuanId) throw new Error('ID Temuan wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${temuanId}/rekomendasi`);
    return getResponseData(response) || [];
  },

  async createRekomendasi(temuanId, payload = {}) {
    if (!temuanId) throw new Error('ID Temuan wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${temuanId}/rekomendasi`, payload);
    return getResponseData(response);
  },

  async updateRekomendasi(rekomendasiId, payload = {}) {
    if (!rekomendasiId) throw new Error('ID Rekomendasi wajib diisi.');
    const response = await api.put(`${ENDPOINT}/rekomendasi/${rekomendasiId}`, payload);
    return getResponseData(response);
  },

  async cancelRekomendasi(rekomendasiId, payload = {}) {
    if (!rekomendasiId) throw new Error('ID Rekomendasi wajib diisi.');
    const response = await api.patch(`${ENDPOINT}/rekomendasi/${rekomendasiId}/cancel`, payload);
    return getResponseData(response);
  },

  async remove(id) {
    if (!id) throw new Error('ID Temuan wajib diisi.');
    const response = await api.delete(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },
};

export const {
  getByLhp,
  getById,
  createFromLhp,
  update,
  submit,
  createRevisi,
  escalateToRisk,
  getHistory,
  getHistoryById,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  getRekomendasiList,
  createRekomendasi,
  updateRekomendasi,
  cancelRekomendasi,
  remove,
} = mrPlanningTemuanService;

export default mrPlanningTemuanService;
