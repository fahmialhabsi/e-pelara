import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Empty } from 'antd';
import RenstraReviewKonsistensiForm from '../components/RenstraReviewKonsistensiForm';
import { renstraReviewApi } from '../services/renstraReviewApi';

const RenstraReviewKonsistensiEditPage = () => {
  const { id } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['renstra-review-konsistensi', id],
    enabled: !!id,
    queryFn: () => renstraReviewApi.detail(id),
  });

  if (isLoading) return <Spin fullscreen tip="Memuat catatan reviu..." />;
  if (isError)
    return <Alert type="error" message="Gagal memuat data" description={error?.message} />;
  if (!data) return <Empty description="Catatan reviu tidak ditemukan" />;

  return <RenstraReviewKonsistensiForm initialData={data} />;
};

export default RenstraReviewKonsistensiEditPage;
