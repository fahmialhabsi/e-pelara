// dpaApi — panggilan API DPA (axios + Bearer token)
import api from '../../../services/api';

export const getAllDpa = async () => {
  const res = await api.get('/dpa');
  return res.data;
};

export const getDpaById = async (id) => {
  const res = await api.get(`/dpa/${id}`);
  return res.data;
};

// === PERGESERAN ANGGARAN ===
export const getDpaTujuanList = async (dpa_id) => {
  const res = await api.get(`/dpa/${dpa_id}/dpa-tujuan`);
  return res.data?.data || [];
};
export const searchMasterRekening = async (q = '') => {
  const res = await api.get(`/dpa/master-rekening?q=${encodeURIComponent(q)}`);
  return res.data?.data || [];
};
export const getRincianRekening = async (dpa_id) => {
  const res = await api.get(`/dpa/${dpa_id}/rincian-rekening`);
  return res.data?.data || [];
};
export const getRincianDetailPerubahan = async (dpa_id) => {
  const res = await api.get(`/dpa/${dpa_id}/rincian-detail-perubahan`);
  return res.data?.data || [];
};
export const getPergeseranList = async (dpa_id) => {
  const res = await api.get(`/dpa/${dpa_id}/pergeseran`);
  return res.data?.data || [];
};
export const createPergeseran = async (dpa_id, body) => {
  const res = await api.post(`/dpa/${dpa_id}/pergeseran`, body);
  return res.data;
};
export const setujuiPergeseran = async (id) => {
  const res = await api.put(`/dpa/pergeseran/${id}/setujui`);
  return res.data;
};
export const deletePergeseran = async (id) => {
  const res = await api.delete(`/dpa/pergeseran/${id}`);
  return res.data;
};

// === PERUBAHAN ANGGARAN ===
export const getPerubahan = async (dpa_id) => {
  const res = await api.get(`/dpa/${dpa_id}/perubahan`);
  return res.data?.data || null;
};
export const savePerubahan = async (dpa_id, body) => {
  const res = await api.post(`/dpa/${dpa_id}/perubahan`, body);
  return res.data;
};
export const setujuiPerubahan = async (id) => {
  const res = await api.put(`/dpa/perubahan/${id}/setujui`);
  return res.data;
};

export const getDpaAudit = async (id) => {
  const res = await api.get(`/dpa/${id}/audit`);
  const d = res.data;
  if (Array.isArray(d)) return d;
  return d?.data ?? [];
};

export const createDpa = async (body) => {
  const res = await api.post('/dpa', body);
  return res.data;
};

export const updateDpa = async (id, body) => {
  const res = await api.put(`/dpa/${id}`, body);
  return res.data;
};

export const submitDpa = async (id, body = {}) => {
  const res = await api.post(`/dpa/${id}/submit`, body);
  return res.data;
};

export const deleteDpa = async (id, body = {}) => {
  const res = await api.delete(`/dpa/${id}`, { data: body });
  return res.data;
};
