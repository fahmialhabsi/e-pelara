// Inovasi bidang urusan — data pendukung Bab II Renja Permendagri 14/2026.
// Inovasi umumnya berjalan lintas tahun, sehingga halaman ini menyediakan
// recall antartahun agar tidak diketik ulang setiap penyusunan Renja.
import React, { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useDokumen } from '@/hooks/useDokumen';
import {
  BENTUK_INOVASI,
  inovasiBidangUrusanApi,
  inovasiKeys,
} from '../services/renjaDataPendukungApi';

const { Text, Paragraph } = Typography;

const RenjaInovasiBidangUrusanPage = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { tahun: tahunAktif } = useDokumen();

  const [tahun, setTahun] = useState(tahunAktif || String(new Date().getFullYear()));
  const [opdId, setOpdId] = useState(null);
  const [cari, setCari] = useState('');

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [barisDiedit, setBarisDiedit] = useState(null);
  const [form] = Form.useForm();

  const [recall, setRecall] = useState(null);
  const [recallDipilih, setRecallDipilih] = useState([]);

  const params = useMemo(
    () => ({
      tahun: tahun || undefined,
      perangkat_daerah_id: opdId || undefined,
      q: cari || undefined,
    }),
    [tahun, opdId, cari],
  );

  const { data: daftarOpd = [] } = useQuery({
    queryKey: ['perangkat-daerah'],
    queryFn: async () => {
      const res = await api.get('/perangkat-daerah');
      const rows = Array.isArray(res.data) ? res.data : res.data?.data || [];
      return rows.filter((o) => o.aktif !== 0 && !o.is_test);
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: inovasiKeys.list(params),
    queryFn: () => inovasiBidangUrusanApi.list(params),
    enabled: Boolean(tahun),
  });

  const { data: rekap } = useQuery({
    queryKey: inovasiKeys.rekap({ tahun, perangkat_daerah_id: opdId }),
    queryFn: () => inovasiBidangUrusanApi.rekap({ tahun, perangkat_daerah_id: opdId }),
    enabled: Boolean(tahun && opdId),
  });

  const segarkan = () => {
    queryClient.invalidateQueries({ queryKey: inovasiKeys.all });
  };

  const simpan = useMutation({
    mutationFn: (nilai) =>
      barisDiedit
        ? inovasiBidangUrusanApi.update(barisDiedit.id, nilai)
        : inovasiBidangUrusanApi.create({ ...nilai, tahun, perangkat_daerah_id: opdId }),
    onSuccess: () => {
      message.success(barisDiedit ? 'Inovasi diperbarui.' : 'Inovasi ditambahkan.');
      setFormTerbuka(false);
      setBarisDiedit(null);
      form.resetFields();
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal menyimpan.'),
  });

  const hapus = useMutation({
    mutationFn: (id) => inovasiBidangUrusanApi.remove(id),
    onSuccess: () => {
      message.success('Inovasi dihapus.');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal menghapus.'),
  });

  const mintaRecall = useMutation({
    mutationFn: () =>
      inovasiBidangUrusanApi.previewRecall({ tahun, perangkat_daerah_id: opdId }),
    onSuccess: (hasil) => {
      if (!hasil?.kandidat?.length) {
        message.info(
          `Tidak ada inovasi tahun ${hasil?.tahun_sumber || 'sebelumnya'} yang bisa diturunkan.`,
        );
        return;
      }
      setRecall(hasil);
      setRecallDipilih(hasil.kandidat.map((_k, i) => i));
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal memuat kandidat.'),
  });

  const terapkanRecall = useMutation({
    mutationFn: () =>
      inovasiBidangUrusanApi.terapkanRecall({
        tahun,
        perangkat_daerah_id: opdId,
        kandidat: recall.kandidat.filter((_k, i) => recallDipilih.includes(i)),
      }),
    onSuccess: (hasil) => {
      message.success(`${hasil?.disimpan || 0} inovasi diturunkan ke tahun ${tahun}.`);
      setRecall(null);
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal menerapkan.'),
  });

  const bukaForm = (baris) => {
    setBarisDiedit(baris || null);
    if (baris) form.setFieldsValue(baris);
    else form.resetFields();
    setFormTerbuka(true);
  };

  const kolom = [
    { title: 'No', width: 56, render: (_v, _r, i) => i + 1, fixed: 'left' },
    { title: 'Nama Inovasi', dataIndex: 'nama_inovasi', width: 260 },
    {
      title: 'Bentuk',
      dataIndex: 'bentuk_inovasi',
      width: 150,
      render: (v) => (v ? <Tag>{v}</Tag> : <Tag color="orange">belum dikategorikan</Tag>),
    },
    {
      title: 'Tahun Mulai',
      dataIndex: 'tahun_mulai',
      width: 110,
      align: 'center',
      render: (v) =>
        v ? (
          <Tag color={String(v) === String(tahun) ? 'green' : 'blue'}>
            {v}
            {String(v) === String(tahun) ? ' · baru' : ' · berlanjut'}
          </Tag>
        ) : (
          '—'
        ),
    },
    { title: 'Deskripsi', dataIndex: 'deskripsi', width: 280, render: (v) => v || '—' },
    { title: 'Manfaat', dataIndex: 'manfaat', width: 240, render: (v) => v || '—' },
    {
      title: 'Jumlah',
      dataIndex: 'jumlah',
      width: 100,
      align: 'right',
      render: (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('id-ID')),
    },
    {
      title: 'Aksi',
      width: 120,
      fixed: 'right',
      render: (_v, baris) => (
        <Space>
          <Button size="small" onClick={() => bukaForm(baris)}>
            Ubah
          </Button>
          <Popconfirm title="Hapus inovasi ini?" onConfirm={() => hapus.mutate(baris.id)}>
            <Button size="small" danger>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const siap = Boolean(tahun && opdId);
  const tahunSebelumnya = tahun ? String(Number(tahun) - 1) : '';

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Inovasi Bidang Urusan"
        extra={
          <Space wrap>
            <Button onClick={() => mintaRecall.mutate()} loading={mintaRecall.isPending} disabled={!siap}>
              Recall dari {tahunSebelumnya || 'tahun lalu'}
            </Button>
            <Button type="primary" onClick={() => bukaForm(null)} disabled={!siap}>
              Tambah Inovasi
            </Button>
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Data pendukung Bab II Renja (Permendagri 14/2026). Jumlah inovasi di sini juga memasok
          Indikator Kinerja Kunci &quot;Jumlah Inovasi Perangkat Daerah Yang Dihasilkan&quot; pada
          Tabel 2.4, sehingga angkanya tidak perlu diisi dua kali.
        </Paragraph>

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={5}>
            <Input
              addonBefore="Tahun"
              value={tahun}
              onChange={(e) => setTahun(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2027"
            />
          </Col>
          <Col xs={24} sm={16} md={9}>
            <Select
              style={{ width: '100%' }}
              placeholder="Pilih Perangkat Daerah"
              value={opdId}
              onChange={setOpdId}
              showSearch
              optionFilterProp="label"
              options={daftarOpd.map((o) => ({ value: o.id, label: o.nama }))}
            />
          </Col>
          <Col xs={24} md={10}>
            <Input.Search
              placeholder="Cari nama inovasi, deskripsi, atau manfaat"
              allowClear
              onSearch={setCari}
            />
          </Col>
        </Row>

        {siap && rekap && (
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={8}>
              <Card size="small">
                <Statistic title="Jumlah Inovasi (memasok IKK)" value={rekap.jumlah_inovasi} />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card size="small">
                <Statistic title="Inovasi Baru" value={rekap.inovasi_baru} />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card size="small">
                <Statistic title="Inovasi Berlanjut" value={rekap.inovasi_berlanjut} />
              </Card>
            </Col>
          </Row>
        )}

        {!siap && (
          <Alert
            type="info"
            showIcon
            message="Pilih tahun dan perangkat daerah terlebih dahulu."
            style={{ marginBottom: 16 }}
          />
        )}

        {isError && (
          <Alert
            type="error"
            showIcon
            message="Gagal memuat data"
            description={error?.response?.data?.message || error?.message}
            style={{ marginBottom: 16 }}
          />
        )}

        {isLoading ? (
          <Spin />
        ) : rows.length === 0 ? (
          <Empty
            description={
              siap
                ? `Belum ada inovasi tercatat untuk tahun ${tahun}. Coba tombol "Recall dari ${tahunSebelumnya}" sebelum mengisi manual.`
                : 'Belum ada data untuk ditampilkan.'
            }
          />
        ) : (
          <Table
            size="small"
            rowKey="id"
            columns={kolom}
            dataSource={rows}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: 1500 }}
          />
        )}
      </Card>

      <Modal
        open={formTerbuka}
        title={barisDiedit ? 'Ubah Inovasi' : 'Tambah Inovasi'}
        onCancel={() => {
          setFormTerbuka(false);
          setBarisDiedit(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={simpan.isPending}
        okText="Simpan"
        cancelText="Batal"
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={(nilai) => simpan.mutate(nilai)}>
          <Form.Item
            label="Nama Inovasi"
            name="nama_inovasi"
            rules={[{ required: true, message: 'Nama inovasi wajib diisi.' }]}
          >
            <Input maxLength={255} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Bentuk Inovasi" name="bentuk_inovasi">
                <Select
                  allowClear
                  placeholder="Pilih atau ketik bentuk inovasi"
                  options={BENTUK_INOVASI.map((b) => ({ value: b, label: b }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Tahun Mulai"
                name="tahun_mulai"
                extra="Isi tahun usulan pertama"
              >
                <Input maxLength={4} placeholder="2025" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Jumlah"
                name="jumlah"
                extra="Cakupan (angka)"
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Deskripsi" name="deskripsi">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Manfaat" name="manfaat">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Catatan" name="catatan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(recall)}
        title={`Recall Inovasi ${recall?.tahun_sumber || ''} → ${recall?.tahun_tujuan || ''}`}
        onCancel={() => setRecall(null)}
        onOk={() => terapkanRecall.mutate()}
        confirmLoading={terapkanRecall.isPending}
        okText={`Turunkan ${recallDipilih.length} inovasi`}
        cancelText="Batal"
        okButtonProps={{ disabled: recallDipilih.length === 0 }}
        width={880}
      >
        <Paragraph type="secondary">
          Inovasi berikut tercatat pada tahun {recall?.tahun_sumber} tetapi belum ada di tahun{' '}
          {recall?.tahun_tujuan}. Inovasi yang namanya sudah ada tidak ditampilkan, sehingga tombol
          ini aman ditekan berulang kali.
        </Paragraph>
        <Table
          size="small"
          rowKey={(_r, i) => i}
          dataSource={recall?.kandidat || []}
          pagination={false}
          rowSelection={{
            selectedRowKeys: recallDipilih,
            onChange: setRecallDipilih,
          }}
          columns={[
            { title: 'Nama Inovasi', dataIndex: 'nama_inovasi', width: 260 },
            {
              title: 'Bentuk',
              dataIndex: 'bentuk_inovasi',
              width: 150,
              render: (v) => v || '—',
            },
            { title: 'Tahun Mulai', dataIndex: 'tahun_mulai', width: 110, align: 'center' },
            { title: 'Deskripsi', dataIndex: 'deskripsi', render: (v) => v || '—' },
          ]}
        />
      </Modal>
    </div>
  );
};

export default RenjaInovasiBidangUrusanPage;
