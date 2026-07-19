import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import api from '@/services/api';
import IndikatorTujuanRenstraForm from '../components/IndikatorTujuanRenstraForm';

const IndikatorTujuanRenstraEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['indikator-renstra', id],
    queryFn: async () => {
      const res = await api.get(`/indikator-renstra/${id}`);
      return res.data;
    },
  });

  if (isLoading) return <Spin tip="Memuat data..." fullscreen />;

  return (
    <IndikatorTujuanRenstraForm
      initialData={data}
      renstraAktif={renstraAktif}
      onSuccess={() => navigate('/renstra/indikator/tujuan')}
    />
  );
};

export default IndikatorTujuanRenstraEditPage;
