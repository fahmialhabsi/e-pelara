// lpkDispangApi untuk modul LPK-DISPANG
import api from '@/services/api';

// Pengkeg (realisasi fisik & keuangan per Sub Kegiatan)
export const getAllPengkeg = async (params) => (await api.get('/pengkeg', { params })).data;
export const getPengkegById = async (id) => (await api.get(`/pengkeg/${id}`)).data;
export const createPengkeg = async (payload) => (await api.post('/pengkeg', payload)).data;
export const updatePengkeg = async (id, payload) => (await api.put(`/pengkeg/${id}`, payload)).data;
export const deletePengkeg = async (id) => (await api.delete(`/pengkeg/${id}`)).data;
export const getDpaOptions = async (tahun, kode_kegiatan) =>
  (await api.get('/pengkeg/dpa-options/list', { params: { tahun, kode_kegiatan } })).data;
export const getDpaRealisasiKeuangan = async (dpaId) =>
  (await api.get(`/pengkeg/dpa-realisasi/${dpaId}`)).data;

// Tree Tujuan->Sasaran->Program->Kegiatan (untuk halaman terpadu Realisasi Kinerja)
export const getHierarchy = async (params) =>
  (await api.get('/realisasi-indikator-renstra/hierarchy', { params })).data;

// Realisasi manual capaian indikator Sasaran/Program/Kegiatan
export const getRealisasiIndikator = async (params) =>
  (await api.get('/realisasi-indikator-renstra', { params })).data;
export const upsertRealisasiIndikator = async (payload) =>
  (await api.post('/realisasi-indikator-renstra', payload)).data;
