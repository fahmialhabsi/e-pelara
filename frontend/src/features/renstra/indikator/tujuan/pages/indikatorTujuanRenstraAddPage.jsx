import React from 'react';
import IndikatorTujuanRenstraForm from '../components/IndikatorTujuanRenstraForm';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import api from '@/services/api';
const IndikatorTujuanRenstraAddPage = () => {
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
    <IndikatorTujuanRenstraForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate('/renstra/indikator/tujuan')}
    />
  );
};
export default IndikatorTujuanRenstraAddPage;
