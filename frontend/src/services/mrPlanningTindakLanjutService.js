// frontend/src/services/mrPlanningTindakLanjutService.js
// Modul TLHP — Tindak Lanjut (realisasi pemantauan periodik per Rekomendasi)

import api from '@/services/api';

const ENDPOINT = '/mr-planning-tindak-lanjut';

export const MR_PLANNING_TINDAK_LANJUT_QUERY_KEYS = {
  all: ['mr-planning-tindak-lanjut'],
  byRekomendasi: (rekomendasiId) => ['mr-planning-tindak-lanjut', 'rekomendasi', String(rekomendasiId || '')],
  detail: (id) => ['mr-planning-tindak-lanjut', 'detail', String(id || '')],
  history: (id) => ['mr-planning-tindak-lanjut', 'history', String(id || '')],
  documents: (id) => ['mr-planning-tindak-lanjut', 'documents', String(id || '')],
};

const getResponseData = (response) => response?.data?.data ?? null;

const buildExportUnavailableError = (error) => {
  const status = error?.response?.status;

  if (status === 404 || status === 405 || status === 501) {
    const normalizedError = new Error('Berkas belum tersedia atau gagal diunduh.');
    normalizedError.isExportUnavailable = true;
    normalizedError.status = status;
    normalizedError.originalError = error;
    return normalizedError;
  }

  return error;
};

const mrPlanningTindakLanjutService = {
  ENDPOINT,

  async getByRekomendasi(rekomendasiId) {
    if (!rekomendasiId) throw new Error('ID Rekomendasi wajib diisi.');
    const response = await api.get(`${ENDPOINT}/rekomendasi/${rekomendasiId}`);
    return getResponseData(response) || [];
  },

  async getById(id) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },

  async createFromRekomendasi(rekomendasiId, payload = {}) {
    if (!rekomendasiId) throw new Error('ID Rekomendasi wajib diisi.');
    const response = await api.post(`${ENDPOINT}/rekomendasi/${rekomendasiId}`, payload);
    return getResponseData(response);
  },

  async update(id, payload = {}) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    const response = await api.put(`${ENDPOINT}/${id}`, payload);
    return getResponseData(response);
  },

  async submit(id, payload = {}) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    const response = await api.post(`${ENDPOINT}/${id}/submit`, payload);
    return getResponseData(response);
  },

  async getHistory(id, params = {}) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${id}/history`, { params });
    return getResponseData(response) || [];
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

  async remove(id) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    const response = await api.delete(`${ENDPOINT}/${id}`);
    return getResponseData(response);
  },

  // === Bukti dukung ===
  async listDocuments(id) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    const response = await api.get(`${ENDPOINT}/${id}/documents`);
    return getResponseData(response) || [];
  },

  async uploadDocument(id, { file, document_type, document_title, document_number, document_date, description }) {
    if (!id) throw new Error('ID Tindak Lanjut wajib diisi.');
    if (!file) throw new Error('Berkas wajib diisi.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', document_type);
    formData.append('document_title', document_title);
    if (document_number) formData.append('document_number', document_number);
    if (document_date) formData.append('document_date', document_date);
    if (description) formData.append('description', description);

    const response = await api.post(`${ENDPOINT}/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return getResponseData(response);
  },

  async cancelDocument(documentId, payload = {}) {
    if (!documentId) throw new Error('ID Dokumen wajib diisi.');
    const response = await api.patch(`${ENDPOINT}/documents/${documentId}/cancel`, payload);
    return getResponseData(response);
  },

  async downloadDocument(documentId) {
    if (!documentId) throw new Error('ID Dokumen wajib diisi.');

    try {
      return await api.get(`${ENDPOINT}/documents/${documentId}/download`, { responseType: 'blob' });
    } catch (error) {
      throw buildExportUnavailableError(error);
    }
  },
};

export const {
  getByRekomendasi,
  getById,
  createFromRekomendasi,
  update,
  submit,
  getHistory,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
  remove,
  listDocuments,
  uploadDocument,
  cancelDocument,
  downloadDocument,
} = mrPlanningTindakLanjutService;

export default mrPlanningTindakLanjutService;
