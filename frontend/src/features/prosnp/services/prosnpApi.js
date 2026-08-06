import api from '../../../services/api';

export async function getProsnPeriode(params = {}) {
  const response = await api.get('/prosnp/periode', { params });
  return response.data?.data || [];
}

export async function getProsnKonteks() {
  const response = await api.get('/prosnp/konteks');
  return response.data?.data;
}

export async function createProsnPeriode(payload) {
  const response = await api.post('/prosnp/periode', payload);
  return response.data?.data;
}

export async function activateProsnPeriode(id) {
  const response = await api.post(`/prosnp/periode/${id}/aktifkan`);
  return response.data?.data;
}

export async function initializeProsnIndikator(id) {
  const response = await api.post(`/prosnp/periode/${id}/inisialisasi-indikator`);
  return response.data?.data;
}

export async function exportProsnExcel(id) {
  return api.get(`/prosnp/periode/${id}/ekspor/excel`, { responseType: 'blob' });
}

export async function getProsnPeriodeDetail(id) {
  const response = await api.get(`/prosnp/periode/${id}`);
  return response.data?.data;
}

export async function getProsnPengisian(id) {
  const response = await api.get(`/prosnp/pengisian/${id}`);
  return response.data?.data;
}

export async function updateProsnPengisian(id, payload) {
  const response = await api.put(`/prosnp/pengisian/${id}`, payload);
  return response.data?.data;
}

export async function transitionProsnPengisian(id, payload) {
  const response = await api.post(`/prosnp/pengisian/${id}/transisi`, payload);
  return response.data?.data;
}

export async function getProsnDukunganSistem(periodeId) {
  const response = await api.get(`/prosnp/periode/${periodeId}/dukungan-sistem`);
  return response.data?.data || [];
}

export async function createProsnBukti(pengisianId, formData) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/bukti`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data;
}

export async function reviseProsnBukti(buktiId, formData) {
  const response = await api.post(`/prosnp/bukti/${buktiId}/versi`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data;
}

export async function downloadProsnBukti(buktiId) {
  return api.get(`/prosnp/bukti/${buktiId}/download`, { responseType: 'blob' });
}

export async function checklistProsnBukti(linkId, payload) {
  const response = await api.patch(`/prosnp/bukti-relasi/${linkId}/checklist`, payload);
  return response.data?.data;
}

export async function periksaProsnPengisian(pengisianId, payload) {
  const response = await api.post(`/prosnp/pengisian/${pengisianId}/pemeriksaan`, payload);
  return response.data?.data;
}

export async function getProsnAntrianPemeriksaan() {
  const response = await api.get('/prosnp/pemeriksaan/antrian');
  return response.data?.data || [];
}
