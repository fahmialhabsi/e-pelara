import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import api from '@/services/api';
import IndikatorRenstraNestedView from '../components/IndikatorRenstraNestedView';

const IndikatorRenstraListPage = () => {
  const { data: renstraAktif, isLoading } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  console.log('[IndikatorRenstraListPage] isLoading:', isLoading, 'renstraAktif:', renstraAktif);
  console.log('renstraAktif:', renstraAktif, 'isLoading:', isLoading);
  if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!renstraAktif) return <div style={{ padding: 24 }}>Renstra tidak ditemukan</div>;

  return (
    <div style={{ padding: 24 }}>
      <h4 style={{ marginBottom: 16 }}>
        Indikator Renstra — {renstraAktif?.nama_opd} ({renstraAktif?.tahun_mulai}–
        {renstraAktif?.tahun_akhir})
      </h4>
      <React.Suspense fallback={<div>Loading view...</div>}>
        <IndikatorRenstraNestedView renstraAktif={renstraAktif} />
      </React.Suspense>
    </div>
  );
};

export default IndikatorRenstraListPage;
