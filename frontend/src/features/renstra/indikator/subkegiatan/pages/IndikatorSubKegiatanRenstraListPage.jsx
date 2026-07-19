import React from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

const IndikatorSubKegiatanRenstraListPage = () => {
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
    queryKey: ['indikator-subkegiatan-renstra', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: { stage: 'sub_kegiatan', renstra_id: renstraAktif?.id },
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
      queryClient.invalidateQueries(['indikator-sub-kegiatan-renstra']);
    },
    onError: () => {
      message.error('Gagal menghapus data');
    },
  });

  const columns = [
    {
      title: 'No',
      dataIndex: 'kode_indikator',
    },
    {
      title: 'Nama Indikator',
      dataIndex: 'nama_indikator',
    },
    {
      title: 'Satuan',
      dataIndex: 'satuan',
    },
    { title: 'Baseline', dataIndex: 'baseline', key: 'baseline' },
    { title: 'Th. 1', dataIndex: 'target_tahun_1', key: 'target_tahun_1' },
    { title: 'Th. 2', dataIndex: 'target_tahun_2', key: 'target_tahun_2' },
    { title: 'Th. 3', dataIndex: 'target_tahun_3', key: 'target_tahun_3' },
    { title: 'Th. 4', dataIndex: 'target_tahun_4', key: 'target_tahun_4' },
    { title: 'Th. 5', dataIndex: 'target_tahun_5', key: 'target_tahun_5' },
    {
      title: 'Definisi Operasional',
      dataIndex: 'definisi_operasional',
      key: 'definisi_operasional',
      width: 200,
    },
    {
      title: 'Metode Penghitungan',
      dataIndex: 'metode_penghitungan',
      key: 'metode_penghitungan',
      width: 200,
    },
    {
      title: 'Aksi',
      render: (_, record) => (
        <>
          <Button
            type="link"
            onClick={() => navigate(`/renstra/indikator/subkegiatan/edit/${record.id}`)}
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
        <Empty description="Belum ada data Indikator Sub Kegiatan" />
        <Button
          type="primary"
          onClick={() => navigate('/renstra/indikator/subkegiatan/add')}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator Sub Kegiatan
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
        <Button type="primary" onClick={() => navigate('/renstra/indikator/subkegiatan/add')}>
          ➕ Tambah Indikator Sub Kegiatan
        </Button>
      </div>
      <Table
        dataSource={data}
        columns={columns.filter(
          (c) => !['definisi_operasional', 'metode_penghitungan'].includes(c.key),
        )}
        rowKey="id"
        bordered
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
                    <tr key={label}>
                      <td
                        style={{
                          fontWeight: 'bold',
                          width: 200,
                          padding: '4px 8px',
                          verticalAlign: 'top',
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

export default IndikatorSubKegiatanRenstraListPage;
