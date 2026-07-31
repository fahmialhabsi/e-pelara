// Data pendukung Renja Permendagri 14/2026 yang dikelola di modul RKPD.
// Keduanya bersifat tahunan per perangkat daerah (bukan per dokumen Renja),
// sehingga dapat di-recall berulang oleh revisi Renja mana pun.
import api from '@/services/api';

const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const dataOf = (payload) => payload?.data ?? payload;

const POKIR = '/renja-pokir-dprd';
const INOVASI = '/renja-inovasi-bidang-urusan';

export const pokirDprdApi = {
  list: async (params) => rowsOf((await api.get(POKIR, { params })).data),
  detail: async (id) => dataOf((await api.get(`${POKIR}/${id}`)).data),
  create: (payload) => api.post(POKIR, payload),
  update: (id, payload) => api.put(`${POKIR}/${id}`, payload),
  remove: (id) => api.delete(`${POKIR}/${id}`),

  rekap: async (params) => dataOf((await api.get(`${POKIR}/rekap`, { params })).data),
  importMassal: async (payload) => dataOf((await api.post(`${POKIR}/import`, payload)).data),

  /** Saran nomenklatur Kepmendagri 900 untuk satu teks usulan. */
  sugesti: async (params) => dataOf((await api.get(`${POKIR}/sugesti`, { params })).data),

  previewAutofill: async (params) =>
    dataOf((await api.get(`${POKIR}/autofill/preview`, { params })).data),
  terapkanAutofill: async (perubahan) =>
    dataOf((await api.post(`${POKIR}/autofill/terapkan`, { perubahan })).data),
};

export const inovasiBidangUrusanApi = {
  list: async (params) => rowsOf((await api.get(INOVASI, { params })).data),
  detail: async (id) => dataOf((await api.get(`${INOVASI}/${id}`)).data),
  create: (payload) => api.post(INOVASI, payload),
  update: (id, payload) => api.put(`${INOVASI}/${id}`, payload),
  remove: (id) => api.delete(`${INOVASI}/${id}`),

  rekap: async (params) => dataOf((await api.get(`${INOVASI}/rekap`, { params })).data),

  /** Turunkan inovasi tahun sebelumnya yang masih berjalan ke tahun berkenaan. */
  previewRecall: async (params) =>
    dataOf((await api.get(`${INOVASI}/recall/preview`, { params })).data),
  terapkanRecall: async (payload) =>
    dataOf((await api.post(`${INOVASI}/recall/terapkan`, payload)).data),
};

export const pokirKeys = {
  all: ['renja-pokir-dprd'],
  list: (params) => ['renja-pokir-dprd', params],
  rekap: (params) => ['renja-pokir-dprd', 'rekap', params],
  autofill: (params) => ['renja-pokir-dprd', 'autofill', params],
};

export const inovasiKeys = {
  all: ['renja-inovasi-bidang-urusan'],
  list: (params) => ['renja-inovasi-bidang-urusan', params],
  rekap: (params) => ['renja-inovasi-bidang-urusan', 'rekap', params],
  recall: (params) => ['renja-inovasi-bidang-urusan', 'recall', params],
};

/**
 * Bentuk inovasi mengikuti pengelompokan Indeks Inovasi Daerah (IID). Nilai
 * disimpan sebagai teks bebas di basis data, jadi daftar ini hanya memandu
 * pengisian dan tidak membatasi data lama.
 */
export const BENTUK_INOVASI = [
  'Digital/Aplikasi',
  'Tata Kelola',
  'Pelayanan Publik',
  'Inovasi Daerah Lainnya',
];
