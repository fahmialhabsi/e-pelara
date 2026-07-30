import api from '@/services/api';

const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const sdiDaftarDataApi = {
  list: async (params) => rowsOf((await api.get('/sdi-daftar-data', { params })).data),
  detail: async (id) => {
    const res = await api.get(`/sdi-daftar-data/${id}`);
    return res.data?.data ?? res.data;
  },
  create: (payload) => api.post('/sdi-daftar-data', payload),
  update: (id, payload) => api.put(`/sdi-daftar-data/${id}`, payload),
  remove: (id) => api.delete(`/sdi-daftar-data/${id}`),

  previewTarik: async (params) =>
    (await api.get('/sdi-daftar-data/tarik-renstra/preview', { params })).data,
  tarikRenstra: (payload) => api.post('/sdi-daftar-data/tarik-renstra', payload),

  kelengkapan: async (params) => (await api.get('/sdi-daftar-data/kelengkapan', { params })).data,

  periksaSinkron: async (params) =>
    (await api.get('/sdi-daftar-data/sinkron/periksa', { params })).data,
  segarkanSinkron: (payload) => api.post('/sdi-daftar-data/sinkron/segarkan', payload),

  previewAutofill: async (params) =>
    (await api.get('/sdi-daftar-data/autofill/preview', { params })).data,
  terapkanAutofill: (perubahan) => api.post('/sdi-daftar-data/autofill/terapkan', { perubahan }),

  unduhExcel: (params) => unduhBerkas('excel', 'xlsx', params),
  unduhPdf: (params) => unduhBerkas('pdf', 'pdf', params),
};

/**
 * Unduh berkas export format Lampiran. Diambil sebagai blob karena responsnya
 * berupa berkas, bukan JSON — interceptor error global tetap berlaku.
 */
async function unduhBerkas(jalur, ekstensi, params) {
  const res = await api.get(`/sdi-daftar-data/export/${jalur}`, {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Daftar-Data-Daerah-${params?.tahun || 'export'}.${ekstensi}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const sdiKeys = {
  all: ['sdi-daftar-data'],
  list: (params) => ['sdi-daftar-data', params],
  detail: (id) => ['sdi-daftar-data', 'detail', id],
  kelengkapan: (params) => ['sdi-daftar-data', 'kelengkapan', params],
  autofill: (params) => ['sdi-daftar-data', 'autofill', params],
  sinkron: (params) => ['sdi-daftar-data', 'sinkron', params],
};
