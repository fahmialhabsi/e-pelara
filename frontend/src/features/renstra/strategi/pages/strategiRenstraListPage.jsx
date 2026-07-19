import React from 'react';
import { App, Table, Button, Space, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

const StrategiRenstraListPage = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ['renstra-strategi'],
    queryFn: async () => {
      const res = await api.get('/renstra-strategi');
      return res.data?.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-strategi/${id}`),
    onSuccess: () => {
      message.success('Strategi berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['renstra-strategi'] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || 'Gagal menghapus strategi');
    },
  });

  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => navigate('/renstra/strategi/add')}>Tambah Strategi</Button>
      <Button onClick={() => navigate('/dashboard-renstra')}>Kembali</Button>
      <Table
        dataSource={data}
        rowKey="id"
        columns={[
          {
            title: 'Sasaran Renstra',
            render: (_, r) =>
              r.sasaran ? `${r.sasaran.nomor || ''} - ${r.sasaran.isi_sasaran || ''}` : '-',
          },
          {
            title: 'Strategi Renstra',
            render: (_, r) => `${r.kode_strategi || ''} - ${r.deskripsi || ''}`,
          },
          {
            title: 'Aksi',
            render: (_, r) => (
              <Space>
                <Button onClick={() => navigate(`/renstra/strategi/edit/${r.id}`)}>Edit</Button>
                <Popconfirm
                  title="Hapus Strategi?"
                  description="Data akan dihapus permanen"
                  onConfirm={() => deleteMutation.mutate(r.id)}
                  okText="Ya, Hapus"
                  cancelText="Batal"
                >
                  <Button danger loading={deleteMutation.isLoading}>
                    Hapus
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
};

export default StrategiRenstraListPage;
