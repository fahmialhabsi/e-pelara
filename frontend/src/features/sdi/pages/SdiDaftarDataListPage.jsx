import React, { useMemo, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Spin,
  Alert,
  Empty,
  App,
  Modal,
  Select,
  Input,
  Checkbox,
  Card,
  Progress,
  Statistic,
  Row,
  Col,
  Tooltip,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  JENIS_DATA,
  INDIKATOR_VARIABEL,
  KLASIFIKASI_RISIKO,
  JADWAL_PEMUTAKHIRAN,
  STATUS_BARIS,
  STAGE_TARIK,
  STAGE_TARIK_DEFAULT,
  KOLOM_VERIFIKASI,
  ID_DDP_STATUS,
} from '../constants/sdiDaftarDataConstants';
import { sdiDaftarDataApi, sdiKeys } from '../services/sdiDaftarDataApi';
import SdiAutofillModal from '../components/SdiAutofillModal';
import SdiSinkronAlert from '../components/SdiSinkronAlert';

const { Text } = Typography;

/** Sel kolom verifikasi yang kosong disorot merah agar mudah ditemukan. */
const selVerifikasi = (v) =>
  v && String(v).trim() ? (
    <span>{v}</span>
  ) : (
    <Tag color="red" style={{ fontSize: 11 }}>
      kosong
    </Tag>
  );

const SdiDaftarDataListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [modalTarik, setModalTarik] = useState(false);
  const [stages, setStages] = useState(STAGE_TARIK_DEFAULT);
  const [hanyaBaru, setHanyaBaru] = useState(true);
  const [modalRapor, setModalRapor] = useState(false);
  const [modalAutofill, setModalAutofill] = useState(false);

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  const renstraId = renstraAktif?.id;

  const params = useMemo(() => ({ renstra_id: renstraId, tahun }), [renstraId, tahun]);

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: sdiKeys.list(params),
    enabled: !!renstraId,
    queryFn: () => sdiDaftarDataApi.list(params),
  });

  const { data: rapor } = useQuery({
    queryKey: sdiKeys.kelengkapan(params),
    enabled: !!renstraId,
    queryFn: () => sdiDaftarDataApi.kelengkapan(params),
  });

  const segarkan = () => queryClient.invalidateQueries({ queryKey: sdiKeys.all });

  const hapus = useMutation({
    mutationFn: sdiDaftarDataApi.remove,
    onSuccess: () => {
      message.success('Baris Daftar Data dihapus');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal menghapus'),
  });

  const tarik = useMutation({
    mutationFn: () =>
      sdiDaftarDataApi.tarikRenstra({
        renstra_id: renstraId,
        tahun,
        stages,
        hanya_baru: hanyaBaru,
      }),
    onSuccess: (res) => {
      message.success(res?.data?.message || 'Data ditarik dari Renstra');
      setModalTarik(false);
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.error || 'Gagal menarik data dari Renstra'),
  });

  const unduh = useMutation({
    mutationFn: () => sdiDaftarDataApi.unduhExcel(params),
    onError: () => message.error('Gagal mengunduh berkas Excel'),
  });

  const unduhPdf = useMutation({
    mutationFn: () => sdiDaftarDataApi.unduhPdf(params),
    onError: () => message.error('Gagal mengunduh berkas PDF'),
  });

  const columns = [
    {
      title: '(1) ID DDD',
      dataIndex: 'id_ddd',
      width: 90,
      fixed: 'left',
      render: (v) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '(2) ID DDP',
      dataIndex: 'id_ddp',
      width: 130,
      // Kosong tidak selalu berarti kurang: Lampiran mengizinkan kolom ini
      // dikosongkan bila data memang tidak mengacu Data Pusat.
      render: (v, r) =>
        v ? (
          <span>{v}</span>
        ) : (
          <Tooltip title="Lampiran mengizinkan ID DDP dikosongkan bila data tidak mengacu Data Pusat">
            <Tag color={ID_DDP_STATUS[r.id_ddp_status]?.color} style={{ fontSize: 11 }}>
              {ID_DDP_STATUS[r.id_ddp_status]?.label || 'kosong'}
            </Tag>
          </Tooltip>
        ),
    },
    { title: '(3) Sumber Referensi', dataIndex: 'sumber_referensi', width: 220, ellipsis: true },
    { title: '(4) Kode Indikator', dataIndex: 'kode_indikator', width: 140 },
    { title: '(5) Nama Indikator', dataIndex: 'nama_indikator', width: 220, ellipsis: true },
    {
      title: '(6) Nama Data',
      dataIndex: 'nama_data',
      width: 240,
      render: (v, r) => (
        <div>
          <div>{v}</div>
          {r.sumber_tarikan === 'renstra' && (
            <Tag color="cyan" style={{ fontSize: 10, marginTop: 4 }}>
              dari Renstra
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '(7) Jenis Data',
      dataIndex: 'jenis_data',
      width: 110,
      render: (v) => <Tag color={JENIS_DATA[v]?.color}>{JENIS_DATA[v]?.label || v}</Tag>,
    },
    {
      title: '(8) Ind./Var.',
      dataIndex: 'indikator_variabel',
      width: 110,
      render: (v) => (
        <Tag color={INDIKATOR_VARIABEL[v]?.color}>{INDIKATOR_VARIABEL[v]?.label || v}</Tag>
      ),
    },
    {
      title: '(9) Kode Standar Data',
      dataIndex: 'kode_standar_data',
      width: 150,
      render: selVerifikasi,
    },
    { title: '(10) Produsen Data', dataIndex: 'produsen_data', width: 180, ellipsis: true },
    {
      title: '(11) Klasifikasi Risiko',
      dataIndex: 'klasifikasi_risiko',
      width: 130,
      render: (v) => (
        <Tag color={KLASIFIKASI_RISIKO[v]?.color}>{KLASIFIKASI_RISIKO[v]?.label || v}</Tag>
      ),
    },
    { title: '(12) Definisi', dataIndex: 'definisi', width: 260, ellipsis: true },
    { title: '(13) Satuan', dataIndex: 'satuan', width: 100 },
    {
      title: '(14) Klasifikasi Penyajian',
      dataIndex: 'klasifikasi_penyajian',
      width: 170,
      ellipsis: true,
    },
    {
      title: '(15) Jadwal Pemutakhiran',
      dataIndex: 'jadwal_pemutakhiran',
      width: 150,
      render: (v) => JADWAL_PEMUTAKHIRAN[v]?.label || v,
    },
    { title: '(16) Kategori RAD', dataIndex: 'kategori_rad', width: 160, ellipsis: true },
    { title: '(17) Kode Metadata', dataIndex: 'kode_metadata', width: 160, render: selVerifikasi },
    {
      title: '(18) Link Portal Daerah',
      dataIndex: 'link_portal_daerah',
      width: 180,
      ellipsis: true,
      render: selVerifikasi,
    },
    {
      title: '(19) Link Portal SDI',
      dataIndex: 'link_portal_sdi',
      width: 180,
      ellipsis: true,
      render: selVerifikasi,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v) => <Tag color={STATUS_BARIS[v]?.color}>{STATUS_BARIS[v]?.label || v}</Tag>,
    },
    {
      title: 'Aksi',
      key: 'aksi',
      width: 150,
      fixed: 'right',
      render: (_, r) => (
        <Space size={0}>
          <Button type="link" onClick={() => navigate(`/sdi/daftar-data/edit/${r.id}`)}>
            ✏️ Edit
          </Button>
          <Popconfirm title="Hapus baris ini?" onConfirm={() => hapus.mutate(r.id)}>
            <Button type="link" danger>
              🗑️
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isLoading) return <Spin fullscreen tip="Memuat Daftar Data Daerah..." />;
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
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={5}>
            <Statistic title="Jumlah Baris" value={rapor?.total ?? data.length} />
          </Col>
          <Col xs={24} md={7}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Skor Kelengkapan Verifikasi
            </Text>
            <Progress
              percent={rapor?.skor_verifikasi ?? 0}
              status={(rapor?.skor_verifikasi ?? 0) >= 80 ? 'success' : 'active'}
            />
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Input
                addonBefore="Tahun"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                style={{ width: 150 }}
                maxLength={4}
              />
              <Button onClick={() => setModalRapor(true)}>📋 Rapor Kelengkapan</Button>
              <Button onClick={() => setModalTarik(true)} disabled={!renstraId}>
                ⬇️ Tarik dari Renstra
              </Button>
              <Button
                onClick={() => setModalAutofill(true)}
                disabled={!renstraId || !data.length}
              >
                ✨ Isi Otomatis
              </Button>
              <Button
                onClick={() => unduh.mutate()}
                loading={unduh.isPending}
                disabled={!data.length}
              >
                📊 Unduh Excel
              </Button>
              <Tooltip title="Versi cetak A3 landscape — Excel tetap format resmi yang dikirim ke Bappeda">
                <Button
                  onClick={() => unduhPdf.mutate()}
                  loading={unduhPdf.isPending}
                  disabled={!data.length}
                >
                  📄 Unduh PDF
                </Button>
              </Tooltip>
              <Button type="primary" onClick={() => navigate('/sdi/daftar-data/add')}>
                ➕ Tambah Baris
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <SdiSinkronAlert renstraId={renstraId} tahun={tahun} />

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Kolom bertanda merah menghambat penilaian Forum Satu Data"
        description="Kolom (2), (9), (17), (18), dan (19) menjadi basis verifikasi indikator Satu Data. Gunakan tombol Isi Otomatis untuk mengisinya sekaligus, lalu sesuaikan yang perlu. Bila memang belum ada standarnya, isi N/A — sel kosong terbaca sebagai tidak dikerjakan, kecuali ID DDP yang sudah ditandai tidak mengacu Data Pusat."
      />

      {data.length === 0 ? (
        <Empty description={`Belum ada Daftar Data Daerah untuk tahun ${tahun}`} />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          bordered
          size="small"
          scroll={{ x: 2800 }}
          pagination={false}
        />
      )}

      <SdiAutofillModal
        open={modalAutofill}
        onClose={() => setModalAutofill(false)}
        renstraId={renstraId}
        tahun={tahun}
      />

      <Modal
        title="Tarik Daftar Data dari Indikator Renstra"
        open={modalTarik}
        onCancel={() => setModalTarik(false)}
        onOk={() => tarik.mutate()}
        confirmLoading={tarik.isPending}
        okText="Tarik Sekarang"
        cancelText="Batal"
        width={620}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Kolom yang terisi otomatis"
          description="Dari Renstra: Sumber Referensi (3), Kode Indikator (4), Nama Indikator (5), Nama Data (6), Produsen Data (10), Definisi (12), Satuan (13), serta Metode Pengumpulan, Periode Data, dan Penanggung Jawab. Dari mesin pengisian otomatis: ID DDD (1), status ID DDP (2), Kode Standar Data (9), Klasifikasi Penyajian (14), Kategori RAD (16), dan Kode Metadata (17) bila referensinya tersedia. Tautan portal (18) dan (19) disusun lewat tombol Isi Otomatis setelah alamat portal diisi."
        />
        <div style={{ marginBottom: 12 }}>
          <Text strong>Level indikator yang ditarik</Text>
          <Select
            mode="multiple"
            style={{ width: '100%', marginTop: 6 }}
            value={stages}
            onChange={setStages}
            options={STAGE_TARIK}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Level Tujuan/Sasaran/Program menghasilkan baris berjenis Indikator; Kegiatan dan Sub
            Kegiatan menghasilkan Variabel pendukung.
          </Text>
        </div>
        <Checkbox checked={hanyaBaru} onChange={(e) => setHanyaBaru(e.target.checked)}>
          Lewati indikator yang sudah pernah ditarik pada tahun ini
        </Checkbox>
      </Modal>

      <Modal
        title={`Rapor Kelengkapan Daftar Data ${tahun}`}
        open={modalRapor}
        onCancel={() => setModalRapor(false)}
        footer={null}
        width={760}
      >
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          dataSource={rapor?.per_kolom || []}
          columns={[
            {
              title: 'Kolom',
              dataIndex: 'label',
              render: (v, r) => (
                <Tooltip title={KOLOM_VERIFIKASI.find((k) => k.key === r.key)?.catatan}>
                  <span>{v}</span>
                </Tooltip>
              ),
            },
            {
              title: 'Memverifikasi Indikator',
              dataIndex: 'indikator',
              render: (v) => (v || []).join(', '),
            },
            { title: 'Terisi', dataIndex: 'terisi', width: 80 },
            { title: 'Kosong', dataIndex: 'kosong', width: 80 },
            {
              title: 'Capaian',
              dataIndex: 'persen',
              width: 160,
              render: (v) => <Progress percent={v} size="small" />,
            },
          ]}
        />

        {!!rapor?.metadata_kurang?.length && (
          <>
            <Alert
              type="error"
              showIcon
              style={{ margin: '16px 0 8px' }}
              message={`${rapor.metadata_kurang.length} baris belum memenuhi 10 unsur metadata minimal (ketentuan angka 4 surat)`}
            />
            <Table
              size="small"
              pagination={{ pageSize: 5 }}
              rowKey="id"
              dataSource={rapor.metadata_kurang}
              columns={[
                { title: 'Nama Data', dataIndex: 'nama_data', ellipsis: true },
                {
                  title: 'Unsur yang belum diisi',
                  dataIndex: 'kurang',
                  render: (v) => (v || []).map((x) => <Tag key={x}>{x}</Tag>),
                },
                {
                  title: '',
                  key: 'aksi',
                  width: 80,
                  render: (_, r) => (
                    <Button type="link" onClick={() => navigate(`/sdi/daftar-data/edit/${r.id}`)}>
                      Lengkapi
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default SdiDaftarDataListPage;
