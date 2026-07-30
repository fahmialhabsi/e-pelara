import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Empty } from 'antd';
import SdiDaftarDataForm from '../components/SdiDaftarDataForm';
import { sdiDaftarDataApi, sdiKeys } from '../services/sdiDaftarDataApi';

const SdiDaftarDataEditPage = () => {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: sdiKeys.detail(id),
    enabled: !!id,
    queryFn: () => sdiDaftarDataApi.detail(id),
  });

  if (isLoading) return <Spin fullscreen tip="Memuat baris Daftar Data..." />;
  if (isError)
    return <Alert type="error" message="Gagal memuat data" description={error?.message} />;
  if (!data) return <Empty description="Baris Daftar Data tidak ditemukan" />;

  return <SdiDaftarDataForm initialData={data} />;
};

export default SdiDaftarDataEditPage;
