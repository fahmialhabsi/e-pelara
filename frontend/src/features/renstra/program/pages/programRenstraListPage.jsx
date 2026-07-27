import React, { useMemo, useState } from 'react';
import { Table, Button, Popconfirm, message, Spin, Alert, Empty, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { deleteProgramRenstra } from '../api/programRenstraApi';

// Kolom tabel: Program RPJMD, OPD Penanggung Jawab, Aksi — dipakai untuk colSpan baris judul.
const TOTAL_KOLOM = 3;

/** Normalisasi bentuk respons API (array langsung atau { data: [...] }). */
const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

/**
 * Urut natural berdasarkan angka di dalam kode, mengabaikan pemisah titik yang
 * jumlahnya tidak konsisten di data lama (mis. "2.09.03." vs "2.09.03").
 */
const digitGroups = (str) => (String(str || '').match(/\d+/g) || []).map(Number);
const compareNatural = (a, b) => {
  const A = digitGroups(a);
  const B = digitGroups(b);
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    const diff = (A[i] ?? 0) - (B[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return String(a || '').localeCompare(String(b || ''));
};

const LEVEL_STYLE = {
  tujuan: { background: '#d6e4ff', color: '#061178' },
  sasaran: { background: '#e6f4ff', color: '#003a8c' },
  strategi: { background: '#e6fffb', color: '#00474f' },
  kebijakan: { background: '#f6ffed', color: '#135200' },
};

const LEVEL_LABEL = {
  tujuan: 'Tujuan',
  sasaran: 'Sasaran',
  strategi: 'Strategi',
  kebijakan: 'Arah Kebijakan',
};

/** Kumpulkan id semua simpul yang punya turunan — untuk tombol "Buka Semua". */
const collectExpandableKeys = (nodes, acc = []) => {
  nodes.forEach((node) => {
    if (node.children?.length) {
      acc.push(node.id);
      collectExpandableKeys(node.children, acc);
    }
  });
  return acc;
};

const ProgramRenstraListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });

  const renstraId = renstraAktif?.id;
  const enabled = !!renstraId;

  const {
    data: programs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['program-renstra', renstraId],
    enabled,
    queryFn: async () =>
      rowsOf((await api.get('/renstra-program', { params: { renstra_id: renstraId } })).data),
  });

  const { data: tujuans = [] } = useQuery({
    queryKey: ['renstra-tujuan-cascade', renstraId],
    enabled,
    queryFn: async () =>
      rowsOf((await api.get('/renstra-tujuan', { params: { renstra_id: renstraId } })).data),
  });

  const { data: sasarans = [] } = useQuery({
    queryKey: ['renstra-sasaran-cascade', renstraId],
    enabled,
    queryFn: async () =>
      rowsOf((await api.get('/renstra-sasaran', { params: { renstra_id: renstraId } })).data),
  });

  const { data: strategis = [] } = useQuery({
    queryKey: ['renstra-strategi-cascade', renstraId],
    enabled,
    queryFn: async () =>
      rowsOf((await api.get('/renstra-strategi', { params: { renstra_id: renstraId } })).data),
  });

  const { data: kebijakans = [] } = useQuery({
    queryKey: ['renstra-kebijakan-cascade', renstraId],
    enabled,
    queryFn: async () =>
      rowsOf((await api.get('/renstra-kebijakan', { params: { renstra_id: renstraId } })).data),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProgramRenstra,
    onSuccess: () => {
      message.success('Data berhasil dihapus 🗑️');
      queryClient.invalidateQueries({ queryKey: ['program-renstra'] });
    },
    onError: () => {
      message.error('Gagal menghapus data');
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  /**
   * Susun pohon Tujuan → Sasaran → Strategi → Arah Kebijakan → Program.
   * Bentuk nested (properti `children`) supaya Ant Design Table menanganinya
   * sebagai tree: awalnya hanya Tujuan yang tampil, turunan dibuka on-demand.
   * Cabang yang belum punya turunan tetap diberi simpul penanda "Belum ada ..."
   * agar celah cascading langsung terlihat saat dibuka.
   */
  const treeData = useMemo(() => {
    const programTerpakai = new Set();

    const nodeGroup = (level, id, kode, uraian, children) => ({
      __group: level,
      id,
      label: `${kode ? `${kode} - ` : ''}${uraian || ''}`.trim(),
      children,
    });

    const nodeEmpty = (id, label) => ({ __empty: true, id, label });

    const pohon = [...tujuans]
      .sort((a, b) => compareNatural(a.no_tujuan, b.no_tujuan))
      .map((tuj) => {
        const sasaranList = sasarans
          .filter((s) => Number(s.tujuan_id) === Number(tuj.id))
          .sort((a, b) => compareNatural(a.nomor, b.nomor));

        const anakSasaran = sasaranList.length
          ? sasaranList.map((sas) => {
              const strategiList = strategis
                .filter((st) => Number(st.sasaran_id) === Number(sas.id))
                .sort((a, b) => compareNatural(a.kode_strategi, b.kode_strategi));

              const anakStrategi = strategiList.length
                ? strategiList.map((st) => {
                    const kebijakanList = kebijakans
                      .filter((kb) => Number(kb.strategi_id) === Number(st.id))
                      .sort((a, b) => compareNatural(a.kode_kebjkn, b.kode_kebjkn));

                    const anakKebijakan = kebijakanList.length
                      ? kebijakanList.map((kb) => {
                          const progList = programs
                            .filter(
                              (p) =>
                                Number(p.kebijakan_id ?? p.renstra_kebijakan_id) === Number(kb.id),
                            )
                            .sort((a, b) => compareNatural(a.kode_program, b.kode_program));

                          progList.forEach((p) => programTerpakai.add(p.id));

                          return nodeGroup(
                            'kebijakan',
                            `kb-${kb.id}`,
                            kb.kode_kebjkn,
                            kb.deskripsi,
                            progList.length
                              ? progList
                              : [nodeEmpty(`kb-${kb.id}-kosong`, 'Belum ada Program')],
                          );
                        })
                      : [nodeEmpty(`st-${st.id}-kosong`, 'Belum ada Arah Kebijakan')];

                    return nodeGroup(
                      'strategi',
                      `st-${st.id}`,
                      st.kode_strategi,
                      st.deskripsi,
                      anakKebijakan,
                    );
                  })
                : [nodeEmpty(`s-${sas.id}-kosong`, 'Belum ada Strategi')];

              return nodeGroup('sasaran', `s-${sas.id}`, sas.nomor, sas.isi_sasaran, anakStrategi);
            })
          : [nodeEmpty(`t-${tuj.id}-kosong`, 'Belum ada Sasaran')];

        return nodeGroup('tujuan', `t-${tuj.id}`, tuj.no_tujuan, tuj.isi_tujuan, anakSasaran);
      });

    const yatim = programs
      .filter((p) => !programTerpakai.has(p.id))
      .sort((a, b) => compareNatural(a.kode_program, b.kode_program));
    if (yatim.length) {
      pohon.push(
        nodeGroup(
          'kebijakan',
          'grup-yatim',
          '',
          'Lainnya — Program belum tertaut ke Arah Kebijakan',
          yatim,
        ),
      );
    }

    return pohon;
  }, [programs, tujuans, sasarans, strategis, kebijakans]);

  const semuaKunciGrup = useMemo(() => collectExpandableKeys(treeData), [treeData]);

  /** Sembunyikan sel kolom lain (colSpan 0) saat baris adalah judul/penanda kosong. */
  const hideIfGroup = (renderFn) => (text, record) => {
    if (record.__group || record.__empty) return { children: null, props: { colSpan: 0 } };
    return renderFn ? renderFn(text, record) : text;
  };

  const columns = [
    {
      title: 'Program RPJMD',
      key: 'program_rpjmd',
      render: (_, record) => {
        if (record.__group) {
          return {
            children: (
              <span style={{ color: LEVEL_STYLE[record.__group].color }}>
                <span style={{ fontSize: 11, opacity: 0.75, marginRight: 6 }}>
                  {LEVEL_LABEL[record.__group]}
                </span>
                <strong>{record.label}</strong>
              </span>
            ),
            props: { colSpan: TOTAL_KOLOM },
          };
        }

        if (record.__empty) {
          return {
            children: (
              <span style={{ color: '#8c8c8c', fontStyle: 'italic', fontSize: 12 }}>
                {record.label}
              </span>
            ),
            props: { colSpan: TOTAL_KOLOM },
          };
        }

        if (record.kode_program && record.nama_program) {
          return (
            <span>
              <strong>{record.kode_program}</strong> - {record.nama_program}
            </span>
          );
        }
        return <span style={{ color: 'gray' }}>Tidak ada</span>;
      },
    },
    {
      title: 'OPD Penanggung Jawab',
      key: 'opd_penanggung_jawab',
      width: 320,
      render: hideIfGroup((_, record) => {
        const namaOpd = record.opd_penanggung_jawab;
        const namaBidang = record.bidang_opd_penanggung_jawab;
        if (namaOpd && namaBidang) {
          return (
            <div>
              <strong>{namaOpd}</strong> - {namaBidang}
            </div>
          );
        }
        return <span style={{ color: 'gray' }}>Tidak ada</span>;
      }),
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 180,
      render: hideIfGroup((_, record) => (
        <>
          <Button type="link" onClick={() => navigate(`/renstra/program/edit/${record.id}`)}>
            ✏️ Edit
          </Button>
          <Popconfirm title="Yakin hapus?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>
              🗑️ Hapus
            </Button>
          </Popconfirm>
        </>
      )),
    },
  ];

  if (isLoading) {
    return <Spin tip="Memuat daftar program..." size="large" fullscreen />;
  }

  if (isError) {
    return (
      <Alert
        message="Gagal memuat data"
        description={error?.message || 'Terjadi kesalahan'}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Belum ada data Program Renstra" />
        <Button
          type="primary"
          onClick={() => navigate('/renstra/program/add')}
          style={{ marginTop: 16 }}
        >
          ➕ Tambah Program
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Space>
          <Button onClick={() => navigate('/dashboard-renstra')}>
            🔙 Kembali ke Dashboard Renstra
          </Button>
          <Button onClick={() => setExpandedRowKeys(semuaKunciGrup)}>⤵️ Buka Semua</Button>
          <Button onClick={() => setExpandedRowKeys([])}>⤴️ Tutup Semua</Button>
        </Space>
        <Button type="primary" onClick={() => navigate('/renstra/program/add')}>
          ➕ Tambah Program
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={treeData}
        rowKey="id"
        bordered
        pagination={false}
        indentSize={22}
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
        }}
        onRow={(record) =>
          record.__group ? { style: { background: LEVEL_STYLE[record.__group].background } } : {}
        }
      />
    </div>
  );
};

export default ProgramRenstraListPage;
