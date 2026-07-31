import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import api from '@/services/api';
import IndikatorIkuIkkForm from '../components/IndikatorIkuIkkForm';

const IndikatorIkuIkkAddPage = ({ stage }) => {
  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  if (isLoading) return <Spin tip="Memuat Renstra aktif..." fullscreen />;

  return <IndikatorIkuIkkForm stage={stage} renstraAktif={renstraAktif} />;
};

export default IndikatorIkuIkkAddPage;
