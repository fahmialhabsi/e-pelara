import React, { useMemo } from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

// Total kolom tabel (No, Nama Indikator, Satuan, Baseline, Th.1-5, Aksi) — dipakai untuk colSpan baris judul kelompok Sasaran.
const TOTAL_KOLOM = 10;

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

  // Data Sasaran (Nomor Sasaran + Isi Sasaran) untuk baris judul kelompok.
  const { data: sasaranList } = useQuery({
    queryKey: ['renstra-sasaran-for-indikator-list', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/renstra-sasaran', {
        params: { renstra_id: renstraAktif?.id },
      });
      return res.data?.data || res.data;
    },
  });

  // Susun ulang data indikator: dikelompokkan per Sasaran, diselingi baris judul
  // "Nomor Sasaran - Isi Sasaran" sebelum daftar indikator sasaran tersebut.
  const groupedData = useMemo(() => {
    if (!data) return [];
    const sasarans = Array.isArray(sasaranList) ? sasaranList : [];
    const rows = [];
    const usedIds = new Set();

    sasarans.forEach((sas) => {
      const items = data.filter((d) => Number(d.ref_id) === Number(sas.id));
      if (items.length === 0) return;
      rows.push({
        __group: true,
        id: `group-${sas.id}`,
        label: `${sas.nomor || ''} - ${sas.isi_sasaran || sas.nama_sasaran || ''}`.trim(),
      });
      items.forEach((it) => {
        rows.push(it);
        usedIds.add(it.id);
      });
    });

    const orphans = data.filter((d) => !usedIds.has(d.id));
    if (orphans.length > 0) {
      rows.push({
        __group: true,
        id: 'group-lainnya',
        label: 'Lainnya (Sasaran tidak ditemukan)',
      });
      orphans.forEach((it) => rows.push(it));
    }

    return rows;
  }, [data, sasaranList]);

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

  // Sembunyikan sel kolom lain (colSpan 0) saat baris adalah judul kelompok Sasaran.
  const hideIfGroup = (renderFn) => (text, record) => {
    if (record.__group) return { children: null, props: { colSpan: 0 } };
    return renderFn ? renderFn(text, record) : text;
  };

  const columns = [
    {
      title: 'No',
      dataIndex: 'kode_indikator',
      key: 'no',
      width: 170,
      render: (text, record) =>
        record.__group
          ? {
              children: <strong>{record.label}</strong>,
              props: { colSpan: TOTAL_KOLOM },
            }
          : <span style={{ whiteSpace: 'nowrap' }}>{text}</span>,
    },
    {
      title: 'Nama Indikator',
      dataIndex: 'nama_indikator',
      key: 'nama_indikator',
      render: hideIfGroup(),
    },
    {
      title: 'Satuan',
      dataIndex: 'satuan',
      key: 'satuan',
      render: hideIfGroup(),
    },
    {
      title: 'Baseline',
      dataIndex: 'baseline',
      key: 'baseline',
      render: hideIfGroup(),
    },
    {
      title: 'Th. 1',
      dataIndex: 'target_tahun_1',
      key: 'target_tahun_1',
      render: hideIfGroup(),
    },
    {
      title: 'Th. 2',
      dataIndex: 'target_tahun_2',
      key: 'target_tahun_2',
      render: hideIfGroup(),
    },
    {
      title: 'Th. 3',
      dataIndex: 'target_tahun_3',
      key: 'target_tahun_3',
      render: hideIfGroup(),
    },
    {
      title: 'Th. 4',
      dataIndex: 'target_tahun_4',
      key: 'target_tahun_4',
      render: hideIfGroup(),
    },
    {
      title: 'Th. 5',
      dataIndex: 'target_tahun_5',
      key: 'target_tahun_5',
      render: hideIfGroup(),
    },
    {
      title: 'Aksi',
      key: 'aksi',
      render: hideIfGroup((_, record) => (
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
      )),
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
      <Table
        dataSource={groupedData}
        columns={columns}
        rowKey="id"
        bordered
        pagination={false}
        onRow={(record) =>
          record.__group ? { style: { background: '#eaf4fb' } } : {}
        }
      />
    </div>
  );
};

export default IndikatorSasaranRenstraListPage;
