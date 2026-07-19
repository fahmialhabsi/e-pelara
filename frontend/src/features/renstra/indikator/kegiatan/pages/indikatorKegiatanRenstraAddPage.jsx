import React from 'react';
import IndikatorKegiatanRenstraForm from '../components/IndikatorKegiatanRenstraForm';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import api from '@/services/api';
const IndikatorKegiatanRenstraAddPage = () => {
  const navigate = useNavigate();
  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  if (isLoading) return <Spin tip="Memuat Renstra aktif..." fullscreen />;
  return (
    <IndikatorKegiatanRenstraForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate('/renstra/indikator/kegiatan')}
    />
  );
};
export default IndikatorKegiatanRenstraAddPage;
