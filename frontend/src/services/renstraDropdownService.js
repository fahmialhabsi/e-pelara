import api from '@/services/api';

const get = (url, params = {}) => api.get(url, { params });

// Endpoint dasar (untuk OPD dan Strategi/Kebijakan yang belum ada tabel-nya)
export const fetchRenstraOpd = (params) => get('/renstra-opd', params);
export const fetchStrategiByRenstra = (renstraId) =>
  get('/renstra-tabel-strategi', { renstra_id: renstraId });
export const fetchKebijakanByStrategi = (strategiId) =>
  get('/renstra-kebijakan', { strategi_id: strategiId });

// Endpoint tabel (lengkap dengan target, baseline, pagu per tahun)
export const fetchTabelTujuan = (renstraId) =>
  get('/renstra-tabel-tujuan', { renstra_id: renstraId });
export const fetchTabelSasaran = (renstraId, tujuanId) =>
  get('/renstra-tabel-sasaran', { renstra_id: renstraId, tujuan_id: tujuanId });
export const fetchTabelSasaranDetail = (id) => get(`/renstra-tabel-sasaran/${id}`);
export const fetchRenstraSasaranDetail = (id) => get(`/renstra-sasaran/${id}`);
export const fetchTabelProgram = (renstraId, sasaranId) =>
  get('/renstra-tabel-program', { renstra_id: renstraId, sasaran_id: sasaranId });
export const fetchTabelKegiatan = (renstraId, programId) =>
  get('/renstra-tabel-kegiatan', { renstra_id: renstraId, program_id: programId });
export const fetchTabelSubkegiatan = (renstraId, kegiatanId) =>
  get('/renstra-tabel-subkegiatan', { renstra_id: renstraId, kegiatan_id: kegiatanId });

export const RENSTRA_DROPDOWN_QUERY_KEYS = {
  opdList: () => ['renstra-dd', 'opd'],
  tujuanList: (id) => ['renstra-dd', 'tabel-tujuan', String(id)],
  sasaranList: (renstraId, tujuanId) => [
    'renstra-dd',
    'tabel-sasaran',
    String(renstraId),
    String(tujuanId),
  ],
  strategiList: (renstraId, sasaranId) => [
    'renstra-dd',
    'strategi',
    String(renstraId),
    String(sasaranId || 'all'),
  ],
  kebijakanList: (id) => ['renstra-dd', 'kebijakan', String(id)],
  programList: (renstraId, sasaranId) => [
    'renstra-dd',
    'tabel-program',
    String(renstraId),
    String(sasaranId),
  ],
  kegiatanList: (renstraId, programId) => [
    'renstra-dd',
    'tabel-kegiatan',
    String(renstraId),
    String(programId),
  ],
  subkegiatanList: (renstraId, kegiatanId) => [
    'renstra-dd',
    'tabel-subkegiatan',
    String(renstraId),
    String(kegiatanId),
  ],
};
