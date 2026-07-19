import React from 'react';
import IndikatorProgramRenstraForm from '../components/IndikatorProgramRenstraForm';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import api from '@/services/api';
const IndikatorProgramRenstraAddPage = () => {
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
    <IndikatorProgramRenstraForm
      renstraAktif={renstraAktif}
      onSuccess={() => navigate('/renstra/indikator/program')}
    />
  );
};
export default IndikatorProgramRenstraAddPage;
