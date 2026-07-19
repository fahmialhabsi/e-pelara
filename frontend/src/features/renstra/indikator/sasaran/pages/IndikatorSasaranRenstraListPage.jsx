import React from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

const IndikatorSasaranRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['indikator-sasaran-renstra', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: { stage: 'sasaran', renstra_id: renstraAktif?.id },
      });
      return res.data?.data || res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/indikator-renstra/${id}`);
    },
    onSuccess: () => {
      message.success('Data berhasil dihapus');
      queryClient.invalidateQueries(['indikator-sasaran-renstra']);
    },
    onError: () => {
      message.error('Gagal menghapus data');
    },
  });

  const columns = [
    {
      title: 'No',
      dataIndex: 'kode_indikator',
      key: 'no',
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
    {
      title: 'Baseline',
      dataIndex: 'baseline',
      key: 'baseline',
    },
    { title: 'Th. 1', dataIndex: 'target_tahun_1', key: 'target_tahun_1' },
    { title: 'Th. 2', dataIndex: 'target_tahun_2', key: 'target_tahun_2' },
    { title: 'Th. 3', dataIndex: 'target_tahun_3', key: 'target_tahun_3' },
    { title: 'Th. 4', dataIndex: 'target_tahun_4', key: 'target_tahun_4' },
    { title: 'Th. 5', dataIndex: 'target_tahun_5', key: 'target_tahun_5' },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra/indikator/sasaran/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin ingin menghapus data ini?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger>
              🗑️ Hapus
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  if (isLoading) return <Spin fullscreen tip="Memuat data..." />;
  if (isError)
    return (
      <Alert
        type="error"
        message="Gagal memuat data"
        description={error?.message}
        style={{ margin: 24 }}
      />
    );

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Indikator Sasaran" />
        <Button
          type="primary"
          onClick={() => navigate('/renstra/indikator/sasaran/add')}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator Sasaran
        </Button>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Button onClick={() => navigate('/dashboard-renstra')}>
          🔙 Kembali ke Dashboard Renstra
        </Button>
        <Button type="primary" onClick={() => navigate('/renstra/indikator/sasaran/add')}>
          ➕ Tambah Indikator Sasaran
        </Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" bordered />
    </div>
  );
};

export default IndikatorSasaranRenstraListPage;
