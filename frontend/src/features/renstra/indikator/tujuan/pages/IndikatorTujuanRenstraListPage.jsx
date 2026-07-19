// pages/renstra/indikator-tujuan/IndikatorTujuanRenstraListPage.jsx

import React from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty, Card, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

const IndikatorTujuanRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  const {
    data,
    isLoading: isLoadingData,
    isError,
    error,
  } = useQuery({
    queryKey: ['indikator-tujuan-renstra', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: { stage: 'tujuan', renstra_id: renstraAktif?.id },
      });
      return res.data?.data || res.data;
    },
  });
  const { mutate: deleteData, isLoading: isDeleting } = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/indikator-renstra/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['indikator-tujuan-renstra']);
      message.success('Data berhasil dihapus');
    },
    onError: () => {
      message.error('Gagal menghapus data');
    },
  });

  const columns = [
    {
      title: 'No',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Nama Indikator',
      dataIndex: 'nama_indikator',
      key: 'nama_indikator',
    },
    {
      title: 'Satuan',
      dataIndex: 'satuan',
      key: 'satuan',
    },
    { title: 'Baseline', dataIndex: 'baseline', key: 'baseline' },
    { title: 'Th. 1', dataIndex: 'target_tahun_1', key: 'target_tahun_1' },
    { title: 'Th. 2', dataIndex: 'target_tahun_2', key: 'target_tahun_2' },
    { title: 'Th. 3', dataIndex: 'target_tahun_3', key: 'target_tahun_3' },
    { title: 'Th. 4', dataIndex: 'target_tahun_4', key: 'target_tahun_4' },
    { title: 'Th. 5', dataIndex: 'target_tahun_5', key: 'target_tahun_5' },
    {
      title: 'Aksi',
      render: (_, record) => (
        <Space>
          <Button onClick={() => navigate(`edit/${record.id}`)} size="small">
            ✏️
          </Button>
          <Popconfirm
            title="Hapus data ini?"
            onConfirm={() => deleteData(record.id)}
            okText="Ya"
            cancelText="Batal"
          >
            <Button danger size="small" loading={isDeleting}>
              🗑️
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Indikator Tujuan Renstra"
      extra={
        <Space>
          <Button onClick={() => navigate('/renstra')} type="default">
            🔙 Kembali ke Dashboard Renstra
          </Button>
          <Button
            type="primary"
            onClick={() => navigate('/renstra/indikator/tujuan/add')}
            icon={<span>➕</span>}
          >
            Tambah Indikator Tujuan
          </Button>
        </Space>
      }
    >
      {isLoadingData ? (
        <Spin fullscreen />
      ) : isError ? (
        <Alert type="error" message="Terjadi kesalahan" description={error.message} />
      ) : data?.length === 0 ? (
        <Empty description="Belum ada data">
          <Button type="primary" onClick={() => navigate('/renstra/indikator/tujuan/add')}>
            ➕ Tambah
          </Button>
        </Empty>
      ) : (
        <Table columns={columns} dataSource={data} rowKey="id" />
      )}
    </Card>
  );
};

export default IndikatorTujuanRenstraListPage;
