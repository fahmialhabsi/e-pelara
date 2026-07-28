import React from 'react';
import { Table, Button, Space, Tag, Popconfirm, Spin, Alert, Empty, App, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  OBJEK_LEVEL,
  JENIS_REKOMENDASI,
  TINGKAT_PRIORITAS,
  STATUS_REVIEW,
} from '../constants/reviewKonsistensiConstants';
import { renstraReviewApi } from '../services/renstraReviewApi';

const RenstraReviewKonsistensiListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  const renstraId = renstraAktif?.id;

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['renstra-review-konsistensi', renstraId],
    enabled: !!renstraId,
    queryFn: () => renstraReviewApi.list({ renstra_id: renstraId }),
  });

  const segarkan = () => {
    queryClient.invalidateQueries({ queryKey: ['renstra-review-konsistensi'] });
    // Data Renstra ikut berubah setelah terapan, jadi cache daftar terkait dibersihkan.
    ['renstra-kebijakan', 'program-renstra', 'renstra-strategi-cascade'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    );
  };

  const hapus = useMutation({
    mutationFn: renstraReviewApi.remove,
    onSuccess: () => {
      message.success('Catatan reviu dihapus');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal menghapus'),
  });

  const terapkan = useMutation({
    mutationFn: renstraReviewApi.terapkan,
    onSuccess: (res) => {
      message.success(res?.data?.message || 'Rekomendasi diterapkan');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal menerapkan rekomendasi'),
  });

  const batalkan = useMutation({
    mutationFn: renstraReviewApi.batalkanTerapan,
    onSuccess: (res) => {
      message.success(res?.data?.message || 'Penerapan dibatalkan');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal membatalkan penerapan'),
  });

  const columns = [
    {
      title: 'Objek',
      key: 'objek',
      width: 320,
      render: (_, r) => (
        <div>
          <Tag>{OBJEK_LEVEL[r.objek_level]?.label || r.objek_level}</Tag>
          <div style={{ marginTop: 4 }}>
            <strong>{r.objek_kode}</strong> {r.objek_uraian}
          </div>
        </div>
      ),
    },
    {
      title: 'Rekomendasi',
      key: 'rekomendasi',
      render: (_, r) => (
        <div>
          <Tag color={JENIS_REKOMENDASI[r.jenis_rekomendasi]?.otomatis ? 'geekblue' : 'default'}>
            {JENIS_REKOMENDASI[r.jenis_rekomendasi]?.label || r.jenis_rekomendasi}
          </Tag>
          <div style={{ marginTop: 4 }}>{r.rekomendasi}</div>
          {r.alasan_substansi && (
            <div style={{ marginTop: 4, color: '#666', fontSize: 12 }}>{r.alasan_substansi}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Dasar Hukum',
      key: 'dasar_hukum',
      width: 260,
      render: (_, r) =>
        Array.isArray(r.dasar_hukum) && r.dasar_hukum.length ? (
          <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {r.dasar_hukum.map((d, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <Tooltip title={d.kutipan}>
                  <span>
                    {d.regulasi}
                    {d.pasal ? ` — ${d.pasal}` : ''}
                  </span>
                </Tooltip>
              </li>
            ))}
          </ol>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
    {
      title: 'Prioritas',
      dataIndex: 'tingkat_prioritas',
      width: 100,
      render: (v) => (
        <Tag color={TINGKAT_PRIORITAS[v]?.color}>{TINGKAT_PRIORITAS[v]?.label || v}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (v, r) => (
        <div>
          <Tag color={STATUS_REVIEW[v]?.color}>{STATUS_REVIEW[v]?.label || v}</Tag>
          {r.diterapkan_at && (
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
              diterapkan oleh {r.diterapkan_oleh || '-'}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 230,
      render: (_, r) => {
        const bisaOtomatis = JENIS_REKOMENDASI[r.jenis_rekomendasi]?.otomatis;
        return (
          <Space direction="vertical" size={0}>
            <Space size={0}>
              <Button
                type="link"
                onClick={() => navigate(`/renstra/review-konsistensi/edit/${r.id}`)}
              >
                ✏️ Edit
              </Button>
              <Popconfirm title="Hapus catatan reviu ini?" onConfirm={() => hapus.mutate(r.id)}>
                <Button type="link" danger>
                  🗑️ Hapus
                </Button>
              </Popconfirm>
            </Space>
            {bisaOtomatis && !r.diterapkan_at && (
              <Popconfirm
                title="Terapkan rekomendasi ini?"
                description="Data Renstra akan diubah: objek dipindahkan ke induk yang diusulkan."
                okText="Ya, terapkan"
                cancelText="Batal"
                onConfirm={() => terapkan.mutate(r.id)}
              >
                <Button type="link" style={{ paddingLeft: 16 }}>
                  ⚙️ Terapkan
                </Button>
              </Popconfirm>
            )}
            {r.diterapkan_at && (
              <Popconfirm
                title="Batalkan penerapan?"
                description="Objek dikembalikan ke induk semula."
                onConfirm={() => batalkan.mutate(r.id)}
              >
                <Button type="link" danger style={{ paddingLeft: 16 }}>
                  ↩️ Batalkan Terapan
                </Button>
              </Popconfirm>
            )}
            {!bisaOtomatis && (
              <span style={{ paddingLeft: 16, fontSize: 11, color: '#999' }}>eksekusi manual</span>
            )}
          </Space>
        );
      },
    },
  ];

  if (isLoading) return <Spin fullscreen tip="Memuat catatan reviu..." />;
  if (isError)
    return (
      <Alert
        type="error"
        message="Gagal memuat data"
        description={error?.message}
        style={{ margin: 24 }}
      />
    );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>
          🔙 Kembali ke Dashboard Renstra
        </Button>
        <Button type="primary" onClick={() => navigate('/renstra/review-konsistensi/add')}>
          ➕ Tambah Catatan Reviu
        </Button>
      </div>

      {data.length === 0 ? (
        <Empty description="Belum ada catatan reviu konsistensi" />
      ) : (
        <Table columns={columns} dataSource={data} rowKey="id" bordered pagination={false} />
      )}
    </div>
  );
};

export default RenstraReviewKonsistensiListPage;
