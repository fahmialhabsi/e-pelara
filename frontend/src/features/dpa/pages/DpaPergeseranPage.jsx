import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Space,
  Popconfirm,
  AutoComplete,
} from 'antd';
import {
  PlusOutlined,
  FilePdfOutlined,
  CheckOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  getDpaById,
  getPergeseranList,
  createPergeseran,
  setujuiPergeseran,
  deletePergeseran,
  getRincianDetailPerubahan,
  getDpaTujuanList,
  searchMasterRekening,
} from '../services/dpaApi';
import MasterBelanjaCascading from '../../../shared/components/MasterBelanjaCascading';

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const STATUS_COLOR = { DRAFT: 'orange', DISETUJUI: 'green', DITOLAK: 'red' };
const SATUAN_SUGGESTIONS = ['Rim', 'Unit', 'Paket', 'Bulan'].map((s) => ({ value: s }));

export default function DpaPergeseranPage() {
  const { dpa_id } = useParams();
  const navigate = useNavigate();
  const [dpa, setDpa] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState([
    {
      jenis: 'KURANG',
      kode_rekening: '',
      nama_rekening: '',
      uraian: '',
      volume_semula: 0,
      satuan_semula: '',
      harga_satuan_semula: 0,
      jumlah_semula: 0,
      jumlah_pergeseran: 0,
      volume_menjadi: 0,
      satuan_menjadi: '',
      harga_satuan_menjadi: 0,
      jumlah_menjadi: 0,
      kode_sub_kegiatan_asal: '',
      kode_sub_kegiatan_tujuan: '',
      dpa_tujuan_id: null,
    },
    {
      jenis: 'TAMBAH',
      kode_rekening: '',
      nama_rekening: '',
      uraian: '',
      volume_semula: 0,
      satuan_semula: '',
      harga_satuan_semula: 0,
      jumlah_semula: 0,
      jumlah_pergeseran: 0,
      volume_menjadi: 0,
      satuan_menjadi: '',
      harga_satuan_menjadi: 0,
      jumlah_menjadi: 0,
      kode_sub_kegiatan_asal: '',
      kode_sub_kegiatan_tujuan: '',
      dpa_tujuan_id: null,
    },
  ]);
  const [rincianOptions, setRincianOptions] = useState([]);
  const [dpaTujuanOptions, setDpaTujuanOptions] = useState([]);
  const [masterRekeningOptions, setMasterRekeningOptions] = useState([]);
  const [searchingMaster, setSearchingMaster] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [dpaData, pergeseranData, rincianData, dpaTujuanData] = await Promise.all([
        getDpaById(dpa_id),
        getPergeseranList(dpa_id),
        getRincianDetailPerubahan(dpa_id),
        getDpaTujuanList(dpa_id),
      ]);
      setDpa(dpaData?.data ?? dpaData);
      setList(pergeseranData);
      setRincianOptions(rincianData);
      setDpaTujuanOptions(dpaTujuanData);
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchMasterRekening = async (q) => {
    setSearchingMaster(true);
    try {
      const data = await searchMasterRekening(q);
      setMasterRekeningOptions(data);
    } catch {
    } finally {
      setSearchingMaster(false);
    }
  };

  useEffect(() => {
    load();
  }, [dpa_id]);

  const handleTambahItem = (jenis) => {
    setItems((prev) => [
      ...prev,
      {
        jenis,
        kode_rekening: '',
        nama_rekening: '',
        uraian: '',
        volume_semula: 0,
        satuan_semula: '',
        harga_satuan_semula: 0,
        jumlah_semula: 0,
        jumlah_pergeseran: 0,
        volume_menjadi: 0,
        satuan_menjadi: '',
        harga_satuan_menjadi: 0,
        jumlah_menjadi: 0,
        kode_sub_kegiatan_asal: '',
        kode_sub_kegiatan_tujuan: '',
        dpa_tujuan_id: jenis === 'TAMBAH' ? Number(dpa_id) : null,
      },
    ]);
  };

  const handleItemChange = (idx, field, val) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        let updated = { ...it, [field]: val };
        if (field === 'volume_menjadi' || field === 'harga_satuan_menjadi') {
          updated.jumlah_menjadi =
            Number(updated.volume_menjadi || 0) * Number(updated.harga_satuan_menjadi || 0);
        }
        updated.jumlah_pergeseran = Math.abs(
          Number(updated.jumlah_menjadi || 0) - Number(updated.jumlah_semula || 0),
        );
        return updated;
      }),
    );
  };

  // Saat user pilih DPA tujuan untuk item TAMBAH — reset kode rekening karena konteks berubah
  const handlePilihDpaTujuan = (idx, dpaTujuanId) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              dpa_tujuan_id: dpaTujuanId,
              kode_rekening: '',
              nama_rekening: '',
              uraian: '',
              volume_semula: 0,
              satuan_semula: '',
              harga_satuan_semula: 0,
              jumlah_semula: 0,
              volume_menjadi: 0,
              satuan_menjadi: '',
              harga_satuan_menjadi: 0,
              jumlah_menjadi: 0,
              kode_sub_kegiatan_tujuan:
                dpaTujuanOptions.find((d) => d.id === dpaTujuanId)?.kode_sub_kegiatan || '',
            }
          : it,
      ),
    );
  };

  // Saat user pilih kode rekening dari master Permendagri 90 (untuk item TAMBAH ke kode baru)
  const handlePilihMasterRekening = (idx, kodeRekening) => {
    const ref = masterRekeningOptions.find((r) => r.kode_rekening === kodeRekening);
    if (!ref) return;
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const updated = {
          ...it,
          kode_rekening: ref.kode_rekening,
          nama_rekening: ref.uraian,
          uraian: ref.uraian,
          volume_semula: 0,
          satuan_semula: '',
          harga_satuan_semula: 0,
          jumlah_semula: 0,
          volume_menjadi: 0,
          satuan_menjadi: '',
          harga_satuan_menjadi: 0,
        };
        updated.jumlah_menjadi =
          Number(updated.volume_menjadi) * Number(updated.harga_satuan_menjadi);
        return updated;
      }),
    );
  };

  // Handler cascading dropdown (Akun→...→Sub Rincian) untuk item TAMBAH
  const handleCascadingChange = (idx, result) => {
    const leaf = result?.sub_rincian;
    if (!leaf) return;
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const updated = {
          ...it,
          kode_rekening: leaf.kode_rekening,
          nama_rekening: leaf.uraian,
          uraian: leaf.uraian,
        };
        updated.jumlah_menjadi =
          Number(updated.jumlah_semula || 0) + Number(updated.jumlah_pergeseran || 0);
        return updated;
      }),
    );
  };

  // Saat user pilih item rincian dari dropdown (kunci gabungan kode+uraian), auto-isi nama, uraian, volume, satuan, harga, dan jumlah semula
  const handlePilihRekening = (idx, itemKey) => {
    const ref = rincianOptions.find((r) => `${r.kode_rekening}|${r.uraian}` === itemKey);
    if (!ref) return;
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const updated = {
          ...it,
          kode_rekening: ref.kode_rekening,
          nama_rekening: ref.nama_rekening,
          uraian: ref.uraian,
          volume_semula: Number(ref.volume || 0),
          satuan_semula: ref.satuan || '',
          harga_satuan_semula: Number(ref.harga_satuan || 0),
          jumlah_semula: ref.jumlah,
          volume_menjadi: Number(ref.volume || 0),
          satuan_menjadi: ref.satuan || '',
          harga_satuan_menjadi: Number(ref.harga_satuan || 0),
        };
        updated.jumlah_menjadi =
          Number(updated.volume_menjadi) * Number(updated.harga_satuan_menjadi);
        return updated;
      }),
    );
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      setSaving(true);
      await createPergeseran(dpa_id, {
        tanggal: values.tanggal.format('YYYY-MM-DD'),
        alasan: values.alasan,
        items,
      });
      toast.success('Pergeseran berhasil dibuat');
      setModalOpen(false);
      form.resetFields();
      setItems([
        {
          jenis: 'KURANG',
          kode_rekening: '',
          nama_rekening: '',
          uraian: '',
          volume_semula: 0,
          satuan_semula: '',
          harga_satuan_semula: 0,
          jumlah_semula: 0,
          jumlah_pergeseran: 0,
          volume_menjadi: 0,
          satuan_menjadi: '',
          harga_satuan_menjadi: 0,
          jumlah_menjadi: 0,
          kode_sub_kegiatan_asal: '',
          kode_sub_kegiatan_tujuan: '',
        },
        {
          jenis: 'TAMBAH',
          kode_rekening: '',
          nama_rekening: '',
          uraian: '',
          volume_semula: 0,
          satuan_semula: '',
          harga_satuan_semula: 0,
          jumlah_semula: 0,
          jumlah_pergeseran: 0,
          volume_menjadi: 0,
          satuan_menjadi: '',
          harga_satuan_menjadi: 0,
          jumlah_menjadi: 0,
          kode_sub_kegiatan_asal: '',
          kode_sub_kegiatan_tujuan: '',
        },
      ]);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSetujui = async (id) => {
    try {
      await setujuiPergeseran(id);
      toast.success('Pergeseran disetujui');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyetujui');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePergeseran(id);
      toast.success('Pergeseran dihapus');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus');
    }
  };

  const handleCetakPdf = (id) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3000/api/dpa/pergeseran/${id}/export-pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DPPA_Pergeseran_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Gagal cetak PDF'));
  };

  const columns = [
    {
      title: 'No',
      dataIndex: 'nomor_pergeseran',
      width: 60,
      render: (v) => `Pergeseran ${ROMAWI[v - 1] || v}`,
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      render: (v) => (v ? dayjs(v).format('DD MMMM YYYY') : '-'),
    },
    { title: 'Alasan', dataIndex: 'alasan', ellipsis: true },
    { title: 'Jumlah Item', render: (_, r) => r.items?.length || 0 },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: 'Aksi',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handleCetakPdf(r.id)}>
            PDF
          </Button>
          {r.status === 'DRAFT' && (
            <>
              <Popconfirm title="Setujui pergeseran ini?" onConfirm={() => handleSetujui(r.id)}>
                <Button size="small" type="primary" icon={<CheckOutlined />}>
                  Setujui
                </Button>
              </Popconfirm>
              <Popconfirm title="Hapus pergeseran ini?" onConfirm={() => handleDelete(r.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const totalKurang = items
    .filter((i) => i.jenis === 'KURANG')
    .reduce((s, i) => s + Number(i.jumlah_pergeseran || 0), 0);
  const totalTambah = items
    .filter((i) => i.jenis === 'TAMBAH')
    .reduce((s, i) => s + Number(i.jumlah_pergeseran || 0), 0);
  const selisih = totalKurang - totalTambah;

  return (
    <div style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard-dpa')}>
          Kembali
        </Button>
        <h2 style={{ margin: 0 }}>Pergeseran Anggaran — DPA #{dpa_id}</h2>
        {dpa && <span style={{ color: '#888', fontSize: 13 }}>{dpa.sub_kegiatan}</span>}
      </div>

      <div
        style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 20 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>Total Pergeseran: </span>
            <span>{list.length} kali</span>
            {list.length > 0 && (
              <span style={{ marginLeft: 8, color: '#888' }}>
                (
                {list
                  .map((l) => `Pergeseran ${ROMAWI[l.nomor_pergeseran - 1] || l.nomor_pergeseran}`)
                  .join(', ')}
                )
              </span>
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={list.length >= 10}
          >
            + Tambah Pergeseran {list.length > 0 ? ROMAWI[list.length] : 'I'}
          </Button>
        </div>

        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (r) => (
              <div style={{ padding: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ border: '1px solid #ddd', padding: 4 }}>Jenis</th>
                      <th style={{ border: '1px solid #ddd', padding: 4 }}>Kode Rekening</th>
                      <th style={{ border: '1px solid #ddd', padding: 4 }}>Uraian</th>
                      <th style={{ border: '1px solid #ddd', padding: 4, textAlign: 'right' }}>
                        Semula (Rp)
                      </th>
                      <th style={{ border: '1px solid #ddd', padding: 4, textAlign: 'right' }}>
                        Pergeseran (Rp)
                      </th>
                      <th style={{ border: '1px solid #ddd', padding: 4, textAlign: 'right' }}>
                        Menjadi (Rp)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(r.items || []).map((it, i) => (
                      <tr
                        key={i}
                        style={{ background: it.jenis === 'KURANG' ? '#fff5f5' : '#f6ffed' }}
                      >
                        <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'center' }}>
                          <Tag color={it.jenis === 'KURANG' ? 'red' : 'green'}>{it.jenis}</Tag>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: 4 }}>{it.kode_rekening}</td>
                        <td style={{ border: '1px solid #ddd', padding: 4 }}>
                          {it.nama_rekening}
                          <br />
                          <small>{it.uraian}</small>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'right' }}>
                          Rp{Number(it.jumlah_semula || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'right' }}>
                          Rp{Number(it.jumlah_pergeseran || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: 4, textAlign: 'right' }}>
                          Rp{Number(it.jumlah_menjadi || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          }}
        />
      </div>

      <Modal
        title={`Tambah Pergeseran Anggaran ${list.length > 0 ? ROMAWI[list.length] : 'I'}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={980}
        style={{ top: 20 }}
        styles={{ body: { maxHeight: '78vh', overflowY: 'auto', paddingTop: 8 } }}
        maskClosable={false}
        footer={[
          <Button key="batal" onClick={() => setModalOpen(false)}>
            Batal
          </Button>,
          <Button
            key="simpan"
            type="primary"
            loading={saving}
            onClick={handleSave}
            disabled={selisih !== 0}
          >
            Simpan Pergeseran
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="tanggal"
              label="Tanggal Pergeseran"
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} format="DD MMMM YYYY" />
            </Form.Item>
            <Form.Item
              name="alasan"
              label="Alasan Pergeseran"
              rules={[{ required: true }]}
              style={{ flex: 2 }}
            >
              <Input placeholder="Jelaskan alasan pergeseran anggaran" />
            </Form.Item>
          </div>
        </Form>

        {selisih !== 0 && (
          <div
            style={{
              background: '#fff2e8',
              border: '1px solid #ffbb96',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 12,
              color: '#d4380d',
            }}
          >
            ⚠️ Selisih KURANG - TAMBAH = Rp{Math.abs(selisih).toLocaleString('id-ID')} — harus nol
            sebelum bisa disimpan.
          </div>
        )}

        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Rincian Item Pergeseran:</div>
        {items.map((it, idx) => (
          <div
            key={idx}
            style={{
              border: `1px solid ${it.jenis === 'KURANG' ? '#ffccc7' : '#b7eb8f'}`,
              background: it.jenis === 'KURANG' ? '#fff5f5' : '#f6ffed',
              borderRadius: 8,
              padding: 14,
              marginBottom: 12,
              position: 'relative',
            }}
          >
            {items.length > 2 && (
              <Button
                danger
                size="small"
                style={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
              >
                ×
              </Button>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
              <Select
                size="middle"
                value={it.jenis}
                style={{ width: 140 }}
                onChange={(v) => handleItemChange(idx, 'jenis', v)}
              >
                <Select.Option value="KURANG">
                  <Tag color="red">KURANG</Tag>
                </Select.Option>
                <Select.Option value="TAMBAH">
                  <Tag color="green">TAMBAH</Tag>
                </Select.Option>
              </Select>
              <span style={{ fontSize: 12, color: '#888' }}>Item ke-{idx + 1}</span>
            </div>

            {it.jenis === 'KURANG' ? (
              <div style={{ marginBottom: 10 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                >
                  Pilih Kode Rekening / Uraian (dari DPA ini)
                </label>
                <Select
                  style={{ width: '100%' }}
                  showSearch
                  size="middle"
                  placeholder="Cari kode rekening atau uraian..."
                  value={it.kode_rekening ? `${it.kode_rekening}|${it.uraian}` : undefined}
                  optionFilterProp="label"
                  onChange={(v) => handlePilihRekening(idx, v)}
                  options={rincianOptions.map((r, i) => ({
                    value: `${r.kode_rekening}|${r.uraian}`,
                    label: `${r.kode_rekening} — ${r.uraian} (Rp${r.jumlah.toLocaleString('id-ID')})`,
                    key: `${r.kode_rekening}-${r.uraian}-${i}`,
                  }))}
                />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label
                    style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                  >
                    Sub Kegiatan Tujuan
                  </label>
                  <Select
                    style={{ width: '100%' }}
                    size="middle"
                    placeholder="Pilih sub kegiatan tujuan..."
                    value={it.dpa_tujuan_id || undefined}
                    onChange={(v) => handlePilihDpaTujuan(idx, v)}
                    optionLabelProp="label"
                    options={dpaTujuanOptions.map((d) => ({
                      value: d.id,
                      label: `${d.kode_sub_kegiatan} — ${d.sub_kegiatan}${d.id === Number(dpa_id) ? ' (DPA ini)' : ''}`,
                    }))}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label
                    style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                  >
                    Pilih Kode Rekening Tujuan (Permendagri 90)
                  </label>
                  <MasterBelanjaCascading
                    onChange={(result) => handleCascadingChange(idx, result)}
                  />
                  {it.kode_rekening && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid #d9d9d9',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <Tag color="blue">{it.kode_rekening}</Tag> {it.nama_rekening}
                    </div>
                  )}
                  {it.kode_rekening && (
                    <div style={{ marginTop: 8 }}>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          display: 'block',
                          marginBottom: 4,
                        }}
                      >
                        Uraian Belanja{' '}
                        <span style={{ color: '#888', fontWeight: 'normal' }}>
                          (spesifikasi item, misal: "Belanja Tagihan Air")
                        </span>
                      </label>
                      <Input
                        placeholder="Isi uraian spesifik belanja..."
                        value={it.uraian}
                        onChange={(e) => handleItemChange(idx, 'uraian', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                  Volume (Semula)
                </label>
                <div
                  style={{
                    padding: '4px 8px',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    textAlign: 'right',
                  }}
                >
                  {Number(it.volume_semula || 0).toLocaleString('id-ID')}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                  Satuan (Semula)
                </label>
                <div
                  style={{
                    padding: '4px 8px',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                  }}
                >
                  {it.satuan_semula || '-'}
                </div>
              </div>
              <div style={{ flex: 1.3 }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                  Harga Satuan (Semula)
                </label>
                <div
                  style={{
                    padding: '4px 8px',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    textAlign: 'right',
                  }}
                >
                  {Number(it.harga_satuan_semula || 0).toLocaleString('id-ID')}
                </div>
              </div>
              <div style={{ flex: 1.3 }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>
                  Jumlah (Semula)
                </label>
                <div
                  style={{
                    padding: '4px 8px',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    textAlign: 'right',
                  }}
                >
                  Rp{Number(it.jumlah_semula || 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                >
                  Volume (Menjadi)
                </label>
                <InputNumber
                  style={{ width: '100%' }}
                  value={it.volume_menjadi}
                  min={0}
                  onChange={(v) => handleItemChange(idx, 'volume_menjadi', v || 0)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                >
                  Satuan (Menjadi)
                </label>
                <AutoComplete
                  style={{ width: '100%' }}
                  value={it.satuan_menjadi}
                  options={SATUAN_SUGGESTIONS}
                  filterOption={(input, option) =>
                    option.value.toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={(v) => handleItemChange(idx, 'satuan_menjadi', v)}
                />
              </div>
              <div style={{ flex: 1.3 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                >
                  Harga Satuan (Menjadi)
                </label>
                <InputNumber
                  style={{ width: '100%' }}
                  value={it.harga_satuan_menjadi}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => v.replace(/\./g, '')}
                  onChange={(v) => handleItemChange(idx, 'harga_satuan_menjadi', v || 0)}
                />
              </div>
              <div style={{ flex: 1.3 }}>
                <label
                  style={{ fontSize: 12, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
                >
                  Jumlah (Menjadi)
                </label>
                <div
                  style={{
                    padding: '4px 8px',
                    background: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  Rp{Number(it.jumlah_menjadi || 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div
          style={{
            background: '#fafafa',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
          }}
        >
          <span>
            Total KURANG: Rp{totalKurang.toLocaleString('id-ID')} | Total TAMBAH: Rp
            {totalTambah.toLocaleString('id-ID')}
          </span>
          <span style={{ color: selisih === 0 ? 'green' : 'red' }}>
            Selisih:{' '}
            {selisih === 0 ? '✅ Seimbang' : `⚠️ Rp${Math.abs(selisih).toLocaleString('id-ID')}`}
          </span>
        </div>
        <Space>
          <Button
            size="small"
            onClick={() => handleTambahItem('KURANG')}
            style={{ color: 'red', borderColor: 'red' }}
          >
            + Item KURANG
          </Button>
          <Button
            size="small"
            onClick={() => handleTambahItem('TAMBAH')}
            style={{ color: 'green', borderColor: 'green' }}
          >
            + Item TAMBAH
          </Button>
        </Space>
      </Modal>
    </div>
  );
}
