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
