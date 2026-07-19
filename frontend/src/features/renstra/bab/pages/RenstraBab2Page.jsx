import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Spin, message, Button, Input, Card } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import api from '@/services/api';

const { TextArea } = Input;

const SUBBAB_FIELDS = [
  {
    nomor: '2.1',
    judul: 'Tugas, Fungsi, dan Struktur Organisasi',
    placeholder: 'Uraikan tugas pokok, fungsi, dan struktur organisasi berdasarkan Pergub...',
  },
  {
    nomor: '2.2',
    judul: 'Sumber Daya Dinas Pangan',
    placeholder: 'Deskripsikan sumber daya manusia dan aset...',
  },
  {
    nomor: '2.3',
    judul: 'Kinerja Pelayanan Dinas Pangan',
    placeholder: 'Sajikan data capaian kinerja pelayanan periode Renstra sebelumnya...',
  },
  {
    nomor: '2.4',
    judul: 'Tantangan dan Peluang Pengembangan Pelayanan',
    placeholder: 'Identifikasi tantangan dan peluang berdasarkan analisis lingkungan strategis...',
  },
];

const RenstraBab2Page = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});

  const { data: renstraAktif, isLoading: loadingRenstra } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  const tahun = renstraAktif?.tahun_mulai;

  const { data: babData, isLoading: loadingBab } = useQuery({
    queryKey: ['renstra-bab', tahun, 'II'],
    queryFn: async () => {
      const res = await api.get(`/renstra/${tahun}/bab/II`);
      return res.data?.subbabList || [];
    },
    enabled: !!tahun,
  });

  useEffect(() => {
    if (babData && babData.length > 0) {
      const mapped = {};
      babData.forEach((sb) => {
        mapped[sb.nomor] = sb.isi || '';
      });
      setForm(mapped);
    }
  }, [babData]);

  const mutation = useMutation({
    mutationFn: async () => {
      const subbabList = SUBBAB_FIELDS.map((f) => ({
        nomor: f.nomor,
        judul: f.judul,
        isi: form[f.nomor] || '',
      }));
      await api.put(`/renstra/${tahun}/bab/II`, {
        judul_bab: 'Gambaran Pelayanan Perangkat Daerah',
        subbabList,
      });
    },
    onSuccess: () => {
      message.success('BAB II berhasil disimpan');
      queryClient.invalidateQueries(['renstra-bab', tahun, 'II']);
    },
    onError: () => message.error('Gagal menyimpan BAB II'),
  });

  if (loadingRenstra) return <Spin style={{ padding: 24 }} />;
  if (!renstraAktif) return <div style={{ padding: 24 }}>Renstra tidak ditemukan</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h4 style={{ marginBottom: 4 }}>BAB II — Gambaran Pelayanan Perangkat Daerah</h4>
      <p style={{ color: '#888', marginBottom: 16, fontSize: 13 }}>
        {renstraAktif?.nama_opd} | Periode {renstraAktif?.tahun_mulai}–{renstraAktif?.tahun_akhir}
      </p>
      {loadingBab ? (
        <Spin />
      ) : (
        SUBBAB_FIELDS.map((f) => (
          <Card
            key={f.nomor}
            size="small"
            title={
              <span style={{ fontWeight: 500 }}>
                {f.nomor} {f.judul}
              </span>
            }
            style={{ marginBottom: 16 }}
          >
            <TextArea
              rows={8}
              value={form[f.nomor] || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.nomor]: e.target.value }))}
              placeholder={f.placeholder}
              style={{ fontSize: 13 }}
            />
          </Card>
        ))
      )}
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={mutation.isPending}
        onClick={() => mutation.mutate()}
        style={{ marginTop: 8 }}
      >
        Simpan BAB II
      </Button>
    </div>
  );
};

export default RenstraBab2Page;
