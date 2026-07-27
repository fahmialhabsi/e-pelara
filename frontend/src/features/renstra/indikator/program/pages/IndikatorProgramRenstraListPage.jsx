import { useNavigate, useSearchParams } from 'react-router-dom';
import React, { useMemo } from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

// Total kolom tabel (No, Nama Indikator, Satuan, Baseline, Th.1-5, Aksi) — dipakai untuk colSpan baris judul kelompok Program.
const TOTAL_KOLOM = 10;

const IndikatorProgramRenstraListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeArahKebijakanId =
    searchParams.get('kebijakan_id') || searchParams.get('arah_kebijakan_id') || '';
  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['indikator-program-renstra', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: { stage: 'program', renstra_id: renstraAktif?.id },
      });
      return res.data?.data || res.data;
    },
  });

  // Data Program (Kode Program + Nama Program) untuk baris judul kelompok.
  const { data: programList } = useQuery({
    queryKey: ['renstra-program-for-indikator-list', renstraAktif?.id],
    enabled: !!renstraAktif?.id,
    queryFn: async () => {
      const res = await api.get('/renstra-program', {
        params: { renstra_id: renstraAktif?.id },
      });
      return res.data?.data || res.data;
    },
  });

  // Susun ulang data indikator: dikelompokkan per Program, diselingi baris judul
  // "Kode Program - Nama Program" sebelum daftar indikator program tersebut.
  const groupedData = useMemo(() => {
    if (!data) return [];
    const programs = Array.isArray(programList) ? programList : [];
    const sorted = [...programs].sort((a, b) =>
      String(a.kode_program || '').localeCompare(String(b.kode_program || ''), undefined, {
        numeric: true,
      }),
    );
    const rows = [];
    const usedIds = new Set();

    // Bandingkan hanya angka-angka di dalam kode_indikator (abaikan pemisah seperti
    // "." atau ".."), karena beberapa kode di data lama tidak konsisten jumlah titiknya
    // (mis. "IP2.09.03..02" vs "IP2.09.03.01") — localeCompare numeric biasa akan
    // membandingkan pemisahnya dulu sehingga urutan angka jadi salah.
    const digitGroups = (str) => (String(str || '').match(/\d+/g) || []).map(Number);
    const byKodeIndikator = (a, b) => {
      const A = digitGroups(a.kode_indikator);
      const B = digitGroups(b.kode_indikator);
      const len = Math.max(A.length, B.length);
      for (let i = 0; i < len; i++) {
        const diff = (A[i] ?? 0) - (B[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return String(a.kode_indikator || '').localeCompare(String(b.kode_indikator || ''));
    };

    sorted.forEach((prog) => {
      const items = data
        .filter((d) => Number(d.ref_id) === Number(prog.id))
        .sort(byKodeIndikator);
      if (items.length === 0) return;
      rows.push({
        __group: true,
        id: `group-${prog.id}`,
        label: `${prog.kode_program || ''} - ${prog.nama_program || ''}`.trim(),
      });
      items.forEach((it) => {
        rows.push(it);
        usedIds.add(it.id);
      });
    });

    const orphans = data.filter((d) => !usedIds.has(d.id)).sort(byKodeIndikator);
    if (orphans.length > 0) {
      rows.push({
        __group: true,
        id: 'group-lainnya',
        label: 'Lainnya (Program tidak ditemukan)',
      });
      orphans.forEach((it) => rows.push(it));
    }

    return rows;
  }, [data, programList]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/indikator-renstra/${id}`);
    },
    onSuccess: () => {
      message.success('Data berhasil dihapus');
      queryClient.invalidateQueries(['indikator-program-renstra']);
    },
    onError: () => {
      message.error('Gagal menghapus data');
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  // Sembunyikan sel kolom lain (colSpan 0) saat baris adalah judul kelompok Program.
  const hideIfGroup = (renderFn) => (text, record) => {
    if (record.__group) return { children: null, props: { colSpan: 0 } };
    return renderFn ? renderFn(text, record) : text;
  };

  const columns = [
    {
      title: 'No',
      dataIndex: 'kode_indikator',
      key: 'no',
      render: (text, record) =>
        record.__group
          ? { children: <strong>{record.label}</strong>, props: { colSpan: TOTAL_KOLOM } }
          : text,
    },
    { title: 'Nama Indikator', dataIndex: 'nama_indikator', key: 'nama', render: hideIfGroup() },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', render: hideIfGroup() },
    { title: 'Baseline', dataIndex: 'baseline', key: 'baseline', render: hideIfGroup() },
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
            onClick={() => navigate(`/renstra/indikator/program/edit/${record.id}`)}
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
      )),
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
        <Empty description="Belum ada data Indikator Program" />
        <Button
          type="primary"
          onClick={() =>
            navigate(`/renstra/indikator/program/add?kebijakan_id=${activeArahKebijakanId}`)
          }
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Indikator Program
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
        <Button
          type="primary"
          onClick={() =>
            navigate(`/renstra/indikator/program/add?kebijakan_id=${activeArahKebijakanId}`)
          }
        >
          ➕ Tambah Indikator Program
        </Button>
      </div>
      <Table
        dataSource={groupedData}
        columns={columns}
        rowKey="id"
        bordered
        pagination={false}
        scroll={{ x: 900 }}
        onRow={(record) => (record.__group ? { style: { background: '#eaf4fb' } } : {})}
        expandable={{
          rowExpandable: (record) => !record.__group,
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
        }}
      />
    </div>
  );
};

export default IndikatorProgramRenstraListPage;
