import React from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

const IndikatorKegiatanRenstraListPage = () => {
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
    queryKey: ['indikator-kegiatan-renstra', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: { stage: 'kegiatan', renstra_id: renstraAktif?.id },
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
      queryClient.invalidateQueries(['indikator-kegiatan-renstra']);
    },
    onError: () => {
      message.error('Gagal menghapus data');
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const columns = [
    { title: 'No', dataIndex: 'kode_indikator', key: 'no' },
    { title: 'Nama Indikator', dataIndex: 'nama_indikator', key: 'nama' },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan' },
    { title: 'Baseline', dataIndex: 'baseline', key: 'baseline' },
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
            onClick={() => navigate(`/renstra/indikator/kegiatan/edit/${record.id}`)}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Yakin ingin menghapus data ini?"
            onConfirm={() => handleDelete(record.id)}
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
        description={error?.response?.data?.message || error.message}
        style={{ margin: 24 }}
      />
    );

  if (!data || data.length === 0)
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Indikator Kegiatan" />
        <Button
          type="primary"
          onClick={() => navigate('/renstra/indikator/kegiatan/add')}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator Kegiatan
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
        <Button type="primary" onClick={() => navigate('/renstra/indikator/kegiatan/add')}>
          ➕ Tambah Indikator Kegiatan
        </Button>
      </div>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        bordered
        scroll={{ x: 900 }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '12px 24px', background: '#fafafa' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Definisi Operasional', record.definisi_operasional],
                    ['Metode Penghitungan', record.metode_penghitungan],
                    ['Sumber Data', record.sumber_data],
                    ['Penanggung Jawab', record.penanggung_jawab],
                    [
                      'Pagu Th. 1',
                      record.pagu_tahun_1
                        ? `Rp ${Number(record.pagu_tahun_1).toLocaleString('id-ID')}`
                        : '-',
                    ],
                    [
                      'Pagu Th. 2',
                      record.pagu_tahun_2
                        ? `Rp ${Number(record.pagu_tahun_2).toLocaleString('id-ID')}`
                        : '-',
                    ],
                    [
                      'Pagu Th. 3',
                      record.pagu_tahun_3
                        ? `Rp ${Number(record.pagu_tahun_3).toLocaleString('id-ID')}`
                        : '-',
                    ],
                    [
                      'Pagu Th. 4',
                      record.pagu_tahun_4
                        ? `Rp ${Number(record.pagu_tahun_4).toLocaleString('id-ID')}`
                        : '-',
                    ],
                    [
                      'Pagu Th. 5',
                      record.pagu_tahun_5
                        ? `Rp ${Number(record.pagu_tahun_5).toLocaleString('id-ID')}`
                        : '-',
                    ],
                    [
                      'Total Pagu Indikatif',
                      `Rp ${[1, 2, 3, 4, 5].reduce((sum, i) => sum + (Number(record[`pagu_tahun_${i}`]) || 0), 0).toLocaleString('id-ID')}`,
                    ],
                    ['Keterangan', record.keterangan],
                  ].map(([label, val]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td
                        style={{
                          fontWeight: 'bold',
                          width: 200,
                          padding: '4px 8px',
                          verticalAlign: 'top',
                          color: '#666',
                        }}
                      >
                        {label}
                      </td>
                      <td style={{ padding: '4px 8px' }}>{val || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default IndikatorKegiatanRenstraListPage;
