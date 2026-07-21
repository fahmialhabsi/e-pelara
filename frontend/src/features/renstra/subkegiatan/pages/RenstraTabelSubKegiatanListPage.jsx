import React, { useState } from 'react';
import {
  Table,
  Button,
  Empty,
  Select,
  Popconfirm,
  Typography,
  Card,
  Tag,
  message,
  InputNumber,
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import SpinnerFullscreen from '../components/RenstraTableSubKegiatanSpinnerFullscreen';
import {
  formatNumber,
  formatNumberShort,
  StandardRenstraExpandedRow,
} from '@/features/renstra/shared/components/RenstraTabelListCommon';

const { Text } = Typography;

const ENDPOINT = '/renstra-tabel-subkegiatan';
const QUERY_KEY = 'renstra-tabel-subkegiatan';
const LIST_PATH = '/renstra/tabel/subkegiatan';

const statusColor = {
  draft: 'orange',
  verifikasi: 'blue',
  approved: 'green',
  ditolak: 'red',
};

const wrapTextStyle = {
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  lineHeight: 1.5,
};

export default function RenstraTabelSubKegiatanListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedKebijakanId, setSelectedKebijakanIdState] = useState(() => {
    const parsed = Number(searchParams.get('arah_kebijakan_id'));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [tahunSync, setTahunSync] = useState(2025);

  const setSelectedKebijakanId = (value) => {
    setSelectedKebijakanIdState(value || null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('arah_kebijakan_id', String(value));
        else next.delete('arah_kebijakan_id');
        return next;
      },
      { replace: true },
    );
  };

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => (await api.get('/renstra-opd/aktif')).data.data,
  });

  const { data = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get(ENDPOINT, {
        params: { renstra_id: renstraAktif?.id },
      });

      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`${ENDPOINT}/${id}`),
    onSuccess: () => {
      message.success('Data sub kegiatan berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      message.error(error?.response?.data?.message || 'Gagal menghapus data sub kegiatan');
    },
  });

  const syncRealisasiMutation = useMutation({
    mutationFn: async (tahun) => api.post('/renstra-realisasi-anggaran/sync', { tahun }),
    onSuccess: (res) => {
      const { updated, skipped, tahun } = res.data || {};
      message.success(
        `Realisasi anggaran tahun ${tahun} disinkronkan: ${updated} sub kegiatan diperbarui, ${skipped} dilewati.`,
      );
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      message.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Gagal sinkron realisasi anggaran',
      );
    },
  });

  const { data: arahKebijakanList = [] } = useQuery({
    queryKey: ['renstra-tabel-arah-kebijakan', renstraAktif?.id],
    queryFn: async () => {
      const res = await api.get('/renstra-tabel-arah-kebijakan', {
        params: { renstra_id: renstraAktif?.id },
      });
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    enabled: !!renstraAktif?.id,
  });

  const selectedKebijakan = arahKebijakanList.find((k) => k.id === selectedKebijakanId);
  const selectedStrategiId = selectedKebijakan?.kebijakan?.strategi_id || null;
  const handleExport = async (type) => {
    const endpoint = type === 'excel' ? `${ENDPOINT}/export/excel` : `${ENDPOINT}/export/pdf`;

    const filename = type === 'excel' ? 'renstra-subkegiatan.xlsx' : 'renstra-subkegiatan.pdf';

    const res = await api.get(endpoint, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: 'Kode',
      key: 'kode_subkegiatan',
      width: 120,
      fixed: 'left',
      render: (_, record) =>
        record.kode_subkegiatan || record.sub_kegiatan?.kode_sub_kegiatan || '-',
    },
    {
      title: 'Sub Kegiatan',
      key: 'sub_kegiatan',
      width: 260,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.nama_subkegiatan || record.sub_kegiatan?.nama_sub_kegiatan || '-'}
        </div>
      ),
    },
    {
      title: 'Kegiatan',
      key: 'kegiatan',
      width: 240,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.kegiatan?.nama_kegiatan || record.nama_kegiatan || '-'}
        </div>
      ),
    },
    {
      title: 'Program',
      key: 'program',
      width: 220,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.program?.nama_program || record.nama_program || '-'}
        </div>
      ),
    },
    {
      title: 'Indikator',
      key: 'indikator',
      width: 240,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.indikator_detail?.nama_indikator || record.indikator_manual || '-'}
        </div>
      ),
    },
    {
      title: 'Lokasi',
      key: 'lokasi',
      width: 180,
      render: (_, record) => (
        <div style={wrapTextStyle}>
          {record.lokasi ||
            record.sub_kegiatan?.sub_bidang_opd ||
            record.kegiatan?.bidang_opd ||
            '-'}
        </div>
      ),
    },
    {
      title: 'Target Akhir',
      dataIndex: 'target_akhir_renstra',
      key: 'target_akhir_renstra',
      width: 130,
      align: 'right',
      render: (value) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(value)}</span>
      ),
    },
    {
      title: 'Pagu RPJMD',
      dataIndex: 'pagu_rpjmd_acuan',
      key: 'pagu_rpjmd_acuan',
      width: 140,
      align: 'right',
      render: (value) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberShort(value)}</span>
      ),
    },
    {
      title: 'Pagu Akhir',
      dataIndex: 'pagu_akhir_renstra',
      key: 'pagu_akhir_renstra',
      width: 140,
      align: 'right',
      render: (value) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberShort(value)}</span>
      ),
    },
    {
      title: 'Realisasi Akhir',
      dataIndex: 'realisasi_akhir_renstra',
      key: 'realisasi_akhir_renstra',
      width: 150,
      align: 'right',
      render: (value, record) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatNumberShort(value)}
          {record.persen_realisasi_anggaran !== undefined && (
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              {formatNumber(record.persen_realisasi_anggaran)}%
            </div>
          )}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status_revisi',
      key: 'status_revisi',
      width: 120,
      render: (value) => (
        <Tag color={statusColor[value] || 'orange'}>{String(value || 'draft').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Versi',
      dataIndex: 'versi',
      key: 'versi',
      width: 90,
      align: 'center',
      render: (value) => value || 1,
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 210,
      fixed: 'right',
      render: (_, record) => {
        const isApproved = record.status_revisi === 'approved';

        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {!isApproved && (
              <Button
                size="small"
                type="primary"
                onClick={() =>
                  navigate(
                    `${LIST_PATH}/edit/${record.id}?arah_kebijakan_id=${record.kebijakan_id || selectedKebijakanId}&strategi_id=${record.strategi_id || selectedStrategiId || ''}`,
                  )
                }
              >
                Edit Draft
              </Button>
            )}

            {isApproved && (
              <Button
                size="small"
                type="dashed"
                style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
                onClick={() =>
                  navigate(
                    `${LIST_PATH}/edit/${record.id}?arah_kebijakan_id=${record.kebijakan_id || selectedKebijakanId}&mode=revisi`,
                  )
                }
              >
                Buat Revisi
              </Button>
            )}

            <Button size="small" onClick={() => navigate(`${LIST_PATH}/history/${record.id}`)}>
              History
            </Button>

            {!isApproved && (
              <Popconfirm
                title="Hapus data ini?"
                okText="Ya"
                cancelText="Batal"
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button size="small" danger>
                  Hapus
                </Button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <SpinnerFullscreen tip="Memuat daftar sub kegiatan..." />;
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Renstra Tabel Sub Kegiatan">
        <Empty description="Belum ada data sub kegiatan" />
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/dashboard-renstra')}>Kembali</Button>
          <Select
            placeholder="Pilih Arah Kebijakan"
            style={{ width: 280 }}
            onChange={setSelectedKebijakanId}
            value={selectedKebijakanId}
            options={arahKebijakanList.map((k) => ({
              value: k.id,
              label: k.deskripsi_kebijakan || k.kode_kebijakan,
            }))}
          />
          <Button
            type="primary"
            disabled={!selectedKebijakanId}
            onClick={() =>
              navigate(
                `${LIST_PATH}/add?arah_kebijakan_id=${selectedKebijakanId}&strategi_id=${selectedStrategiId || ''}`,
              )
            }
          >
            Tambah
          </Button>
          <Button onClick={() => handleExport('excel')}>Export Excel</Button>
          <Button onClick={() => handleExport('pdf')}>Export PDF</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Renstra Tabel Sub Kegiatan">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <Button onClick={() => navigate('/dashboard-renstra')}>Kembali</Button>

        <Select
          placeholder="Pilih Arah Kebijakan"
          style={{ width: 280 }}
          onChange={setSelectedKebijakanId}
          value={selectedKebijakanId}
          options={arahKebijakanList.map((k) => ({
            value: k.id,
            label: k.deskripsi_kebijakan || k.kode_kebijakan,
          }))}
        />
        <Button
          type="primary"
          disabled={!selectedKebijakanId}
          onClick={() => navigate(`${LIST_PATH}/add?arah_kebijakan_id=${selectedKebijakanId}`)}
        >
          Tambah
        </Button>

        <Button onClick={() => handleExport('excel')}>Export Excel</Button>
        <Button onClick={() => handleExport('pdf')}>Export PDF</Button>

        <InputNumber
          value={tahunSync}
          onChange={setTahunSync}
          style={{ width: 100 }}
          placeholder="Tahun"
        />
        <Button
          loading={syncRealisasiMutation.isPending}
          onClick={() => syncRealisasiMutation.mutate(tahunSync)}
        >
          Sinkronkan Realisasi Anggaran
        </Button>

        <Text type="secondary" style={{ marginLeft: 8 }}>
          Klik baris untuk melihat target, pagu, dan realisasi anggaran periode tahun ke-1 sampai ke-5.
        </Text>
      </div>

      <Table
        size="small"
        bordered
        dataSource={data}
        columns={columns}
        rowKey="id"
        scroll={{ x: 1180 }}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandRowByClick: true,
          expandedRowRender: (record) => (
            <StandardRenstraExpandedRow
              record={record}
              extraMeta={[
                { label: 'Lokasi', value: record.lokasi },
                {
                  label: 'OPD/Bidang penanggung jawab',
                  value:
                    record.sub_bidang_penanggung_jawab ||
                    record.sub_kegiatan?.sub_bidang_opd ||
                    record.kegiatan?.bidang_opd ||
                    record.program?.opd_penanggung_jawab,
                },
              ]}
            />
          ),
          rowExpandable: () => true,
        }}
      />
    </Card>
  );
}
