import api from '../../../services/api';

export const getPkDetail = async (renstraId, tahun) => {
  const res = await api.get('/lakip-pk', { params: { renstraId, tahun } });
  return res.data?.data;
};

export const savePk = async (renstraId, tahun, payload) => {
  const res = await api.put('/lakip-pk', payload, { params: { renstraId, tahun } });
  return res.data?.data;
};

export const saveIkm = async (renstraId, tahun, payload) => {
  const res = await api.put('/lakip-pk/ikm', payload, { params: { renstraId, tahun } });
  return res.data?.data;
};

export const getSasaranOptions = async (renstraId) => {
  const res = await api.get('/lakip-pk/sasaran-options', { params: { renstraId } });
  return res.data?.data || [];
};

export const setIsIkuPk = async (indikatorId, isIkuPk) => {
  const res = await api.put(`/lakip-pk/sasaran-options/${indikatorId}`, { is_iku_pk: isIkuPk });
  return res.data?.data;
};

export const getProgramAnggaranLive = async (renstraId, tahun) => {
  const res = await api.get('/lakip-pk/program-anggaran-live', { params: { renstraId, tahun } });
  return res.data?.data || [];
};

export const getKegiatanOutputUntukSasaran = async (renstraId, sasaranId, tahun) => {
  const res = await api.get('/lakip-pk/kegiatan-output', {
    params: { renstraId, sasaranId, tahun },
  });
  return res.data?.data || [];
};
