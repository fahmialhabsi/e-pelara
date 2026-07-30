import React from 'react';
import { Form, Input, Select, Button, Card, Space, Divider, Alert, App, Spin, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  JENIS_DATA,
  INDIKATOR_VARIABEL,
  KLASIFIKASI_RISIKO,
  JADWAL_PEMUTAKHIRAN,
  STATUS_BARIS,
  ID_DDP_STATUS,
  RUJUKAN_EKSTERNAL,
  opsiDari,
} from '../constants/sdiDaftarDataConstants';
import { sdiDaftarDataApi, sdiKeys } from '../services/sdiDaftarDataApi';

const { TextArea } = Input;

/** Label kolom diberi nomor Lampiran agar mudah dicocokkan dengan surat. */
const L = (no, teks) => `(${no}) ${teks}`;

const bantuan = (teks, tautan) => (
  <span style={{ fontSize: 12 }}>
    {teks}
    {tautan && (
      <>
        {' '}
        <a href={tautan} target="_blank" rel="noreferrer">
          {tautan}
        </a>
      </>
    )}
  </span>
);

const SdiDaftarDataForm = ({ initialData = null }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const jenisData = Form.useWatch('jenis_data', form);

  const { data: renstraAktif } = useQuery({
    queryKey: ['renstra-opd-aktif'],
    queryFn: async () => {
      const res = await api.get('/renstra-opd/aktif');
      return res.data?.data || res.data;
    },
  });
  const renstraId = renstraAktif?.id;

  const mutation = useMutation({
    mutationFn: (payload) =>
      initialData
        ? sdiDaftarDataApi.update(initialData.id, payload)
        : sdiDaftarDataApi.create(payload),
    onSuccess: () => {
      message.success(`Baris Daftar Data berhasil ${initialData ? 'diperbarui' : 'disimpan'}`);
      queryClient.invalidateQueries({ queryKey: sdiKeys.all });
      navigate('/sdi/daftar-data');
    },
    onError: (err) =>
      message.error(err?.response?.data?.error || err?.message || 'Gagal menyimpan Daftar Data'),
  });

  const onFinish = (values) => {
    mutation.mutate({
      ...values,
      renstra_id: initialData?.renstra_id ?? renstraId,
      nama_opd: values.nama_opd || renstraAktif?.nama_opd || '',
      indikator_renstra_id: initialData?.indikator_renstra_id ?? null,
      sumber_tarikan: initialData?.sumber_tarikan ?? 'manual',
    });
  };

  if (!renstraId && !initialData) return <Spin tip="Memuat Renstra aktif..." />;

  const tahunDefault = String(new Date().getFullYear());

  return (
    <Card title={initialData ? 'Edit Baris Daftar Data' : 'Tambah Baris Daftar Data'}>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/sdi/daftar-data')}>📄 Daftar Data Daerah</Button>
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Penomoran kolom mengikuti Lampiran surat 000.7/4486/SETDA"
        description="Kolom (2), (9), (17), (18), dan (19) menjadi basis verifikasi Forum Satu Data. Bila memang belum ada standarnya, isi dengan N/A — jangan dibiarkan kosong."
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          tahun: tahunDefault,
          jenis_data: 'statistik',
          indikator_variabel: 'indikator',
          klasifikasi_risiko: 'terbuka',
          jadwal_pemutakhiran: 'tahunan',
          id_ddp_status: 'belum_dicek',
          status: 'draft',
          nama_opd: renstraAktif?.nama_opd || '',
          produsen_data: renstraAktif?.nama_opd || '',
          ...(initialData || {}),
        }}
      >
        <Divider orientation="left">Identitas</Divider>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name="tahun" label="Tahun Daftar Data" rules={[{ required: true }]}>
              <Input placeholder="2026" maxLength={4} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="id_ddd" label={L(1, 'ID DDD')}>
              <Input placeholder="mis. 4" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="id_ddp"
              label={L(2, 'ID DDP')}
              extra={bantuan('Daftar Data Prioritas:', RUJUKAN_EKSTERNAL.id_ddp)}
            >
              <Input placeholder="mis. 54" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="id_ddp_status"
              label="Status Pencocokan ID DDP"
              extra={bantuan(
                'Pilih "Tidak mengacu" bila sudah dipastikan data ini bukan Data Pusat — kolom kosong lalu terhitung tuntas.',
              )}
            >
              <Select options={opsiDari(ID_DDP_STATUS)} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="sumber_referensi"
          label={L(3, 'Sumber Referensi')}
          rules={[{ required: true, message: 'Sumber referensi wajib diisi' }]}
          extra={bantuan('Sebutkan dokumen spesifik, mis. "RPJMD 2025-2029; Renstra Dispang 2025-2029; SPM Pangan".')}
        >
          <TextArea rows={2} />
        </Form.Item>

        <Divider orientation="left">Indikator & Data</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="kode_indikator" label={L(4, 'Kode Indikator')}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item
              name="nama_indikator"
              label={L(5, 'Nama Indikator')}
              extra={bantuan('Nomenklatur indikator pembangunan induk, mis. "Indeks Ketahanan Pangan".')}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="nama_data"
          label={L(6, 'Nama Data')}
          rules={[{ required: true, message: 'Nama Data wajib diisi' }]}
          extra={bantuan('Nama indikator atau variabel yang benar-benar masuk daftar data.')}
        >
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="jenis_data" label={L(7, 'Jenis Data')} rules={[{ required: true }]}>
              <Select options={opsiDari(JENIS_DATA)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="indikator_variabel"
              label={L(8, 'Indikator/Variabel')}
              rules={[{ required: true }]}
            >
              <Select options={opsiDari(INDIKATOR_VARIABEL)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="kode_standar_data"
              label={L(9, 'Kode Standar Data')}
              extra={bantuan(
                jenisData === 'geospasial' ? 'Kode unsur KUGI:' : 'Kode SDS pada INDAH:',
                jenisData === 'geospasial'
                  ? RUJUKAN_EKSTERNAL.kode_standar_data_geospasial
                  : RUJUKAN_EKSTERNAL.kode_standar_data_statistik,
              )}
            >
              <Input placeholder='Isi "N/A" bila data belum ada standarnya' />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Tata Kelola</Divider>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="produsen_data" label={L(10, 'Produsen Data')}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="klasifikasi_risiko"
              label={L(11, 'Klasifikasi Data sesuai Risiko')}
              rules={[{ required: true }]}
            >
              <Select options={opsiDari(KLASIFIKASI_RISIKO)} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="definisi" label={L(12, 'Definisi')}>
          <TextArea rows={3} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item name="satuan" label={L(13, 'Satuan')}>
              <Input placeholder="Indeks, Persen, Ton, ..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name="klasifikasi_penyajian"
              label={L(14, 'Klasifikasi Penyajian')}
              extra={bantuan('Mis. Provinsi; Kabupaten/Kota; Komoditas; Jenis Kelamin.')}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="jadwal_pemutakhiran"
              label={L(15, 'Jadwal Pemutakhiran')}
              rules={[{ required: true }]}
            >
              <Select options={opsiDari(JADWAL_PEMUTAKHIRAN)} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="kategori_rad"
          label={L(16, 'Kategori RAD')}
          extra={bantuan('Rancangan Arsitektur Data dan Informasi SPBE:', RUJUKAN_EKSTERNAL.kategori_rad)}
        >
          <Input />
        </Form.Item>

        <Divider orientation="left">Metadata & Penyebarluasan</Divider>
        <Form.Item
          name="kode_metadata"
          label={L(17, 'Kode Metadata')}
          extra={bantuan(
            'Kode metadata INDAH untuk data statistik, atau tautan file metadata untuk data geospasial.',
          )}
        >
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="link_portal_daerah"
              label={L(18, 'Link Portal Daerah')}
              extra={bantuan('Tautan berkas CSV/XLSX/JSON pada Portal Daerah.')}
            >
              <Input placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="link_portal_sdi"
              label={L(19, 'Link Portal SDI')}
              extra={bantuan('Tautan berkas pada Portal SDI:', RUJUKAN_EKSTERNAL.portal_sdi)}
            >
              <Input placeholder="https://data.go.id/..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">
          Metadata Tambahan (ketentuan angka 4 surat)
        </Divider>
        <Form.Item name="metode_pengumpulan" label="Metode Pengumpulan">
          <TextArea rows={2} placeholder="Cara data dikumpulkan dan dihitung" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="periode_data" label="Periode Data">
              <Input placeholder="mis. 2025-2029" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="penanggung_jawab" label="Penanggung Jawab Data">
              <Input placeholder="Bidang / pejabat penanggung jawab" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="status" label="Status Baris">
              <Select options={opsiDari(STATUS_BARIS)} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="nama_opd" label="Nama OPD" hidden>
          <Input />
        </Form.Item>

        <Form.Item name="catatan" label="Catatan Internal">
          <TextArea rows={2} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              💾 Simpan
            </Button>
            <Button onClick={() => navigate('/sdi/daftar-data')}>Batal</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SdiDaftarDataForm;
