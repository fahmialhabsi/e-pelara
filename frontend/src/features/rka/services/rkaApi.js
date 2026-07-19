import api from '../../../services/api';

export const getAllRka = async () => {
  const res = await api.get('/rka');
  return res.data?.data || res.data || [];
};

export const getRkaById = async (id) => {
  const res = await api.get(`/rka/${id}`);
  return res.data?.data || res.data;
};

export const getRkaAudit = async (id) => {
  const res = await api.get(`/rka/${id}/audit`);
  const d = res.data;
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
};

export const createRka = async (body) => {
  const res = await api.post('/rka', body);
  return res.data;
};

export const updateRka = async (id, body) => {
  const res = await api.put(`/rka/${id}`, body);
  return res.data;
};

export const deleteRka = async (id, body = {}) => {
  const res = await api.delete(`/rka/${id}`, { data: body });
  return res.data;
};

export const importRkaPdf = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/rka/import-pdf', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// =========================
// OPD Dropdown
// =========================

export const getOpdDropdown = async () => {
  const res = await api.get('/opd-penanggung-jawab/dropdown');
  return res.data?.data || res.data || [];
};

export const generateRkaIndikator = async (ctx) => {
  const res = await api.post('/rka/generate-indikator', ctx);
  return res.data?.data || {};
};

// =========================
// Renja by OPD
// =========================

// =========================
// TAPD
// =========================

export const getTapdByTahun = async (tahun) => {
  const res = await api.get(`/tapd?tahun=${tahun}`);
  return res.data?.data || [];
};

export const saveTapdBulk = async (tahun, items) => {
  const res = await api.post('/tapd/bulk', { tahun, items });
  return res.data;
};

export const getRenjaByOpd = async (opdId) => {
  const res = await api.get('/renja', {
    params: {
      opd_id: opdId,
      limit: 500,
    },
  });

  return res.data?.data || [];
};

export const getIndikatorProgramByKode = async (kodeProgram) => {
  const res = await api.get('/indikator-renstra/program-by-kode', {
    params: { kode_program: kodeProgram },
  });
  return res.data?.data || null;
};

export const getIndikatorKegiatanByKode = async (kodeKegiatan) => {
  const res = await api.get('/indikator-renstra/kegiatan-by-kode', {
    params: { kode_kegiatan: kodeKegiatan },
  });
  return res.data?.data || null;
};

// Untuk auto-fill baris "Hasil" (kinerja) di form RKA dari Master Sub Kegiatan,
// dataset sama dgn yang dipakai MasterRekeningCascading di form ini ("versi_2025").
export const getMasterSubKegiatanByKode = async (kodeSubKegiatan) => {
  const res = await api.get('/master-sub-kegiatan/by-kode', {
    params: { kode_sub_kegiatan: kodeSubKegiatan, dataset_key: 'versi_2025' },
  });
  return res.data?.data || null;
};

// Sumber benar: dokumen Renja (arsitektur baru renja_dokumen + renja_item)
export const getRenjaDokumenByOpd = async (opdId, tahun) => {
  const res = await api.get('/renja/dokumen', {
    params: {
      opd_penanggung_jawab_id: opdId,
      ...(tahun ? { tahun } : {}),
    },
  });
  return res.data?.data || [];
};
