import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Button, Tag, Table, Collapse } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

const { Panel } = Collapse;

const STAGE_CONFIG = {
  tujuan: {
    label: 'Indikator Tujuan',
    color: 'blue',
    tipe: 'Impact',
    path: '/renstra/indikator/tujuan',
  },
  sasaran: {
    label: 'Indikator Sasaran',
    color: 'green',
    tipe: 'Outcome',
    path: '/renstra/indikator/sasaran',
  },
  program: {
    label: 'Indikator Program',
    color: 'orange',
    tipe: 'Outcome',
    path: '/renstra/indikator/program',
  },
  kegiatan: {
    label: 'Indikator Kegiatan',
    color: 'purple',
    tipe: 'Output',
    path: '/renstra/indikator/kegiatan',
  },
  sub_kegiatan: {
    label: 'Indikator Sub Kegiatan',
    color: 'cyan',
    tipe: 'Output',
    path: '/renstra/indikator/subkegiatan',
  },
};

const columns = (navigate, stage) => [
  { title: 'Kode', dataIndex: 'kode_indikator', key: 'kode', width: 180 },
  { title: 'Nama Indikator', dataIndex: 'nama_indikator', key: 'nama' },
  { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', width: 80 },
  { title: 'Baseline', dataIndex: 'baseline', key: 'baseline', width: 80 },
  { title: 'Th.1', dataIndex: 'target_tahun_1', key: 't1', width: 70 },
  { title: 'Th.2', dataIndex: 'target_tahun_2', key: 't2', width: 70 },
  { title: 'Th.3', dataIndex: 'target_tahun_3', key: 't3', width: 70 },
  { title: 'Th.4', dataIndex: 'target_tahun_4', key: 't4', width: 70 },
  { title: 'Th.5', dataIndex: 'target_tahun_5', key: 't5', width: 70 },
  {
    title: 'Aksi',
    key: 'aksi',
    width: 120,
    render: (_, record) => (
      <Button
        size="small"
        type="link"
        onClick={() =>
          navigate(
            `/renstra/indikator/${stage === 'sub_kegiatan' ? 'subkegiatan' : stage}/edit/${record.id}`,
          )
        }
      >
        ✏️ Edit
      </Button>
    ),
  },
];

export default function IndikatorRenstraNestedView({ renstraAktif }) {
  const navigate = useNavigate();
  const renstraId = renstraAktif?.id;

  const {
    data: allIndikator = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['all-indikator-renstra', renstraId],
    enabled: !!renstraId,
    queryFn: async () => {
      const res = await api.get('/indikator-renstra', {
        params: { renstra_id: renstraId, limit: 1000 },
      });
      console.log(
        '[NestedView] res.data type:',
        typeof res.data,
        'isArray:',
        Array.isArray(res.data),
      );
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    },
  });
  if (isLoading) return <Spin tip="Memuat indikator..." />;
  if (isError) return <Alert type="error" message="Gagal memuat data indikator" />;

  const grouped = {};
  Object.keys(STAGE_CONFIG).forEach((stage) => {
    grouped[stage] = allIndikator.filter((i) => i.stage === stage);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button onClick={() => navigate('/dashboard-renstra')}>🔙 Kembali ke Dashboard</Button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
            <Button key={stage} size="small" onClick={() => navigate(`${cfg.path}/add`)}>
              ➕ {cfg.label}
            </Button>
          ))}
        </div>
      </div>
      <Collapse defaultActiveKey={Object.keys(STAGE_CONFIG)} accordion={false}>
        {Object.entries(STAGE_CONFIG).map(([stage, cfg]) => (
          <Panel
            key={stage}
            header={
              <span>
                <Tag color={cfg.color}>{cfg.tipe}</Tag>
                <strong>{cfg.label}</strong>
                <Tag style={{ marginLeft: 8 }}>{grouped[stage]?.length || 0} data</Tag>
              </span>
            }
          >
            {grouped[stage]?.length === 0 ? (
              <Alert
                type="info"
                message={`Belum ada ${cfg.label}`}
                action={
                  <Button size="small" onClick={() => navigate(`${cfg.path}/add`)}>
                    ➕ Tambah
                  </Button>
                }
              />
            ) : (
              <Table
                dataSource={grouped[stage]}
                columns={columns(navigate, stage)}
                rowKey="id"
                size="small"
                bordered
                pagination={false}
                scroll={{ x: 900 }}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '12px 24px', background: '#fafafa' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {[
                            ['Jenis Indikator', record.jenis_indikator],
                            ['Tipe Indikator', record.tipe_indikator],
                            ['Definisi Operasional', record.definisi_operasional],
                            ['Metode Penghitungan', record.metode_penghitungan],
                            ['Sumber Data', record.sumber_data],
                            ['Nama OPD', renstraAktif?.nama_opd],
                            ['Bidang OPD', record.penanggung_jawab || renstraAktif?.bidang_opd],
                            ['Sub Bidang OPD', renstraAktif?.sub_bidang_opd],
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
                              (() => {
                                const total = [1, 2, 3, 4, 5].reduce(
                                  (sum, i) => sum + (Number(record[`pagu_tahun_${i}`]) || 0),
                                  0,
                                );
                                return total > 0 ? `Rp ${total.toLocaleString('id-ID')}` : '-';
                              })(),
                            ],
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
            )}
          </Panel>
        ))}
      </Collapse>
    </div>
  );
}
