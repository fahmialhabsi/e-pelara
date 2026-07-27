import React, { useMemo } from 'react';
import { Table, Button, Space, Popconfirm, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { BsArrowLeftCircle } from 'react-icons/bs';

// Total kolom tabel (Arah Kebijakan Renstra, Prioritas, Aksi) — dipakai untuk colSpan baris judul kelompok Strategi.
const TOTAL_KOLOM = 3;

const KebijakanRenstraListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  // Difilter per Renstra aktif — supaya daftar ini konsisten dengan data yang
  // benar-benar ikut ter-generate di Dokumen Renstra (PDF/Word), yang juga
  // hanya mengambil Strategi/Kebijakan milik renstra_id yang sama.
  const { data = [] } = useQuery({
    queryKey: ['renstra-kebijakan', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/renstra-kebijakan', {
        params: { renstra_id: renstraAktif?.id },
      });
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    },
  });

  // Kelompokkan baris Kebijakan per Strategi Renstra (cascading), diselingi baris
  // judul "Kode Strategi - Deskripsi Strategi" sebelum daftar kebijakan turunannya.
  const groupedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const groupsMap = new Map();
    data.forEach((r) => {
      const key = r.strategi?.id ?? r.strategi_id ?? '__tanpa_strategi__';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          kode: r.strategi?.kode_strategi || '',
          label: r.strategi
            ? `${r.strategi.kode_strategi || ''} - ${r.strategi.deskripsi || ''}`.trim()
            : 'Lainnya (Strategi tidak ditemukan)',
          items: [],
        });
      }
      groupsMap.get(key).items.push(r);
    });

    const groups = Array.from(groupsMap.values());
    const withKode = groups
      .filter((g) => g.kode)
      .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
    const withoutKode = groups.filter((g) => !g.kode);

    const rows = [];
    [...withKode, ...withoutKode].forEach((g, idx) => {
      rows.push({ __group: true, id: `group-${idx}`, label: g.label });
      rows.push(...g.items);
    });
    return rows;
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/renstra-kebijakan/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renstra-kebijakan'] });
      message.success('Data kebijakan berhasil dihapus');
    },
    onError: () => {
      message.error('Gagal menghapus data kebijakan');
    },
  });

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/dashboard-renstra')} icon={<BsArrowLeftCircle />}>
          Kembali
        </Button>
        <Button type="primary" onClick={() => navigate('/renstra/kebijakan/add')}>
          Tambah Arah Kebijakan Renstra
        </Button>
      </Space>

      <Table
        dataSource={groupedData}
        rowKey="id"
        bordered
        pagination={false}
        onRow={(record) => (record.__group ? { style: { background: '#eaf4fb' } } : {})}
        columns={[
          {
            title: 'Arah Kebijakan Renstra',
            key: 'arah',
            render: (_, r) =>
              r.__group
                ? { children: <strong>{r.label}</strong>, props: { colSpan: TOTAL_KOLOM } }
                : `${r.kode_kebjkn || ''} - ${r.deskripsi || ''}`,
          },
          {
            title: 'Prioritas',
            dataIndex: 'prioritas',
            key: 'prioritas',
            render: (text, r) =>
              r.__group ? { children: null, props: { colSpan: 0 } } : text,
          },
          {
            title: 'Aksi',
            key: 'aksi',
            render: (_, record) =>
              record.__group
                ? { children: null, props: { colSpan: 0 } }
                : (
                  <Space>
                    <Button
                      type="link"
                      onClick={() => navigate(`/renstra/kebijakan/edit/${record.id}`)}
                    >
                      Ubah
                    </Button>
                    <Popconfirm
                      title="Hapus kebijakan ini?"
                      description="Data akan dihapus permanen."
                      onConfirm={() => deleteMutation.mutate(record.id)}
                      okText="Ya, Hapus"
                      cancelText="Batal"
                    >
                      <Button type="link" danger loading={deleteMutation.isPending}>
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

export default KebijakanRenstraListPage;
