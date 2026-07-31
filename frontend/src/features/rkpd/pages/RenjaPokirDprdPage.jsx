// Pokok-pokok pikiran DPRD — data pendukung Bab II Renja Permendagri 14/2026.
// Titik masuk data ada di luar aplikasi (hasil reses DPRD), jadi halaman ini
// menekankan impor massal + auto-fill nomenklatur, bukan pengetikan satuan.
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
  Tooltip,
  Typography,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useDokumen } from '@/hooks/useDokumen';
import { pokirDprdApi, pokirKeys } from '../services/renjaDataPendukungApi';

const { Text, Paragraph } = Typography;

const rupiah = (n) =>
  n === null || n === undefined || n === '' ? '—' : `Rp ${Number(n).toLocaleString('id-ID')}`;

/** Ubah tempelan dari Excel (TSV) menjadi baris siap impor. */
const parseTempelan = (teks) => {
  const baris = String(teks || '')
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return baris.map((b) => {
    const kol = b.split('\t').map((c) => c.trim());
    return {
      nama_anggota_dprd: kol[0] || null,
      dapil: kol[1] || null,
      usulan: kol[2] || '',
      lokasi: kol[3] || null,
      nilai_usulan_anggaran: kol[4] || null,
      catatan: kol[5] || null,
    };
  });
};

const RenjaPokirDprdPage = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { tahun: tahunAktif } = useDokumen();

  const [tahun, setTahun] = useState(tahunAktif || String(new Date().getFullYear()));
  const [opdId, setOpdId] = useState(null);
  const [cari, setCari] = useState('');

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [barisDiedit, setBarisDiedit] = useState(null);
  const [form] = Form.useForm();

  const [imporTerbuka, setImporTerbuka] = useState(false);
  const [tempelan, setTempelan] = useState('');

  const [autofill, setAutofill] = useState(null);
  const [autofillDipilih, setAutofillDipilih] = useState([]);

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
    queryKey: pokirKeys.list(params),
    queryFn: () => pokirDprdApi.list(params),
    enabled: Boolean(tahun),
  });

  const { data: rekap } = useQuery({
    queryKey: pokirKeys.rekap({ tahun, perangkat_daerah_id: opdId }),
    queryFn: () => pokirDprdApi.rekap({ tahun, perangkat_daerah_id: opdId }),
    enabled: Boolean(tahun && opdId),
  });

  const segarkan = () => {
    queryClient.invalidateQueries({ queryKey: pokirKeys.all });
  };

  const simpan = useMutation({
    mutationFn: (nilai) =>
      barisDiedit
        ? pokirDprdApi.update(barisDiedit.id, nilai)
        : pokirDprdApi.create({ ...nilai, tahun, perangkat_daerah_id: opdId }),
    onSuccess: () => {
      message.success(barisDiedit ? 'Usulan diperbarui.' : 'Usulan ditambahkan.');
      setFormTerbuka(false);
      setBarisDiedit(null);
      form.resetFields();
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal menyimpan.'),
  });

  const hapus = useMutation({
    mutationFn: (id) => pokirDprdApi.remove(id),
    onSuccess: () => {
      message.success('Usulan dihapus.');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal menghapus.'),
  });

  const impor = useMutation({
    mutationFn: () =>
      pokirDprdApi.importMassal({
        tahun,
        perangkat_daerah_id: opdId,
        rows: parseTempelan(tempelan),
      }),
    onSuccess: (hasil) => {
      const ditolak = hasil?.ditolak?.length || 0;
      message.success(
        `${hasil?.disimpan || 0} usulan diimpor${ditolak ? `, ${ditolak} baris ditolak` : ''}.`,
      );
      setImporTerbuka(false);
      setTempelan('');
      segarkan();
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal mengimpor.'),
  });

  const mintaAutofill = useMutation({
    mutationFn: () => pokirDprdApi.previewAutofill({ tahun, perangkat_daerah_id: opdId }),
    onSuccess: (hasil) => {
      if (!hasil?.perubahan?.length) {
        message.info('Tidak ada usulan yang bisa dicocokkan otomatis.');
        return;
      }
      setAutofill(hasil);
      setAutofillDipilih(hasil.perubahan.map((p) => p.id));
    },
    onError: (e) => message.error(e?.response?.data?.message || 'Gagal memuat saran.'),
  });

  const terapkanAutofill = useMutation({
    mutationFn: () =>
      pokirDprdApi.terapkanAutofill(
        autofill.perubahan.filter((p) => autofillDipilih.includes(p.id)),
      ),
    onSuccess: (hasil) => {
      message.success(`${hasil?.diperbarui || 0} usulan dicocokkan ke nomenklatur.`);
      setAutofill(null);
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
    { title: 'Anggota DPRD', dataIndex: 'nama_anggota_dprd', width: 170, render: (v) => v || '—' },
    { title: 'Dapil', dataIndex: 'dapil', width: 140, render: (v) => v || '—' },
    { title: 'Usulan', dataIndex: 'usulan', width: 300 },
    { title: 'Lokasi', dataIndex: 'lokasi', width: 160, render: (v) => v || '—' },
    {
      title: 'Program/Kegiatan Terkait',
      dataIndex: 'program_kegiatan_terkait',
      width: 300,
      render: (v) =>
        v ? (
          <Text style={{ fontSize: 12 }}>{v}</Text>
        ) : (
          <Tag color="orange">belum dicocokkan</Tag>
        ),
    },
    {
      title: 'Nilai Usulan',
      dataIndex: 'nilai_usulan_anggaran',
      width: 160,
      align: 'right',
      render: rupiah,
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
          <Popconfirm title="Hapus usulan ini?" onConfirm={() => hapus.mutate(baris.id)}>
            <Button size="small" danger>
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const siap = Boolean(tahun && opdId);

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Pokok-Pokok Pikiran DPRD"
        extra={
          <Space wrap>
            <Button onClick={() => mintaAutofill.mutate()} loading={mintaAutofill.isPending} disabled={!siap}>
              Cocokkan Otomatis
            </Button>
            <Button onClick={() => setImporTerbuka(true)} disabled={!siap}>
              Impor Massal
            </Button>
            <Button type="primary" onClick={() => bukaForm(null)} disabled={!siap}>
              Tambah Usulan
            </Button>
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Data pendukung Bab II Renja (Permendagri 14/2026). Bersifat tahunan per perangkat daerah
          dan otomatis ditarik oleh setiap dokumen Renja pada tahun yang sama — tidak perlu diinput
          ulang tiap revisi.
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
              placeholder="Cari usulan, anggota, dapil, atau lokasi"
              allowClear
              onSearch={setCari}
            />
          </Col>
        </Row>

        {siap && rekap && (
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Jumlah Usulan" value={rekap.jumlah_usulan} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Total Nilai Usulan"
                  value={rekap.total_nilai_usulan}
                  formatter={(v) => rupiah(v)}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Sudah Dicocokkan"
                  value={rekap.terakomodasi}
                  suffix={`/ ${rekap.jumlah_usulan}`}
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic title="Anggota / Dapil" value={`${rekap.jumlah_anggota} / ${rekap.jumlah_dapil}`} />
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
                ? `Tidak terdapat pokok-pokok pikiran DPRD untuk tahun ${tahun}. Bab II Renja akan mencetak kalimat "tidak terdapat usulan".`
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
            scroll={{ x: 1400 }}
            summary={(data) => {
              const total = data.reduce(
                (s, r) => s + (Number(r.nilai_usulan_anggaran) || 0),
                0,
              );
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={6}>
                    <Text strong>Total Nilai Usulan</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <Text strong>{rupiah(total)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} />
                </Table.Summary.Row>
              );
            }}
          />
        )}
      </Card>

      <Modal
        open={formTerbuka}
        title={barisDiedit ? 'Ubah Usulan' : 'Tambah Usulan'}
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
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Nama Anggota DPRD" name="nama_anggota_dprd">
                <Input maxLength={150} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Daerah Pemilihan" name="dapil">
                <Input maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Usulan"
            name="usulan"
            rules={[{ required: true, message: 'Usulan wajib diisi.' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Lokasi" name="lokasi">
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Nilai Usulan Anggaran (Rp)" name="nilai_usulan_anggaran">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(v) => (v ? Number(v).toLocaleString('id-ID') : '')}
                  parser={(v) => (v || '').replace(/\D/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Program/Kegiatan Terkait"
            name="program_kegiatan_terkait"
            extra="Boleh dibiarkan kosong — tombol Cocokkan Otomatis akan mengisinya dari nomenklatur Kepmendagri 900."
          >
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="Catatan" name="catatan">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={imporTerbuka}
        title="Impor Massal Pokok-Pokok Pikiran DPRD"
        onCancel={() => setImporTerbuka(false)}
        onOk={() => impor.mutate()}
        confirmLoading={impor.isPending}
        okText="Impor"
        cancelText="Batal"
        okButtonProps={{ disabled: !tempelan.trim() }}
        width={820}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Salin langsung dari Excel"
          description={
            <>
              Blok baris di Excel lalu tempel di bawah. Urutan kolom:{' '}
              <Text code>Nama Anggota DPRD</Text> <Text code>Dapil</Text> <Text code>Usulan</Text>{' '}
              <Text code>Lokasi</Text> <Text code>Nilai Usulan</Text> <Text code>Catatan</Text>.
              Kolom Usulan wajib terisi; baris yang kosong akan dilaporkan dan dilewati.
            </>
          }
        />
        <Input.TextArea
          rows={10}
          value={tempelan}
          onChange={(e) => setTempelan(e.target.value)}
          placeholder={'Ir. Ahmad Yani\tHalmahera Barat\tBantuan cadangan pangan desa\tHalbar\t750.000.000'}
        />
        <Text type="secondary">
          Terdeteksi {parseTempelan(tempelan).length} baris.
        </Text>
      </Modal>

      <Modal
        open={Boolean(autofill)}
        title="Cocokkan Usulan ke Nomenklatur Kepmendagri 900"
        onCancel={() => setAutofill(null)}
        onOk={() => terapkanAutofill.mutate()}
        confirmLoading={terapkanAutofill.isPending}
        okText={`Terapkan ${autofillDipilih.length} usulan`}
        cancelText="Batal"
        okButtonProps={{ disabled: autofillDipilih.length === 0 }}
        width={960}
      >
        <Paragraph type="secondary">
          Bidang urusan terdeteksi: <Text code>{autofill?.bidang_urusan || '—'}</Text>. Saran
          diperoleh dari kemiripan kata antara teks usulan dan nama subkegiatan — periksa dulu
          sebelum diterapkan.
        </Paragraph>
        <Table
          size="small"
          rowKey="id"
          dataSource={autofill?.perubahan || []}
          pagination={false}
          rowSelection={{
            selectedRowKeys: autofillDipilih,
            onChange: setAutofillDipilih,
          }}
          columns={[
            { title: 'Usulan', dataIndex: 'usulan', width: 320 },
            {
              title: 'Saran Nomenklatur',
              dataIndex: 'nilai_baru',
              width: 360,
              render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text>,
            },
            {
              title: 'Kemiripan',
              dataIndex: 'skor',
              width: 100,
              align: 'center',
              render: (v) => (
                <Tag color={v >= 0.6 ? 'green' : v >= 0.45 ? 'blue' : 'orange'}>
                  {Math.round(v * 100)}%
                </Tag>
              ),
            },
            {
              title: 'Alternatif',
              dataIndex: 'alternatif',
              render: (alt) =>
                alt?.length ? (
                  <Tooltip
                    title={alt
                      .map((a) => `${a.kode_sub_kegiatan} — ${a.nama_sub_kegiatan}`)
                      .join('\n')}
                  >
                    <Tag>{alt.length} alternatif</Tag>
                  </Tooltip>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default RenjaPokirDprdPage;
