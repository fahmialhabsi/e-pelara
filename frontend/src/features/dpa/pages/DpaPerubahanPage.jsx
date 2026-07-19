import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Tag,
  Descriptions,
  Popconfirm,
  Alert,
  Table,
  AutoComplete,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  CheckOutlined,
  FilePdfOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  getDpaById,
  getPerubahan,
  savePerubahan,
  setujuiPerubahan,
  getRincianDetailPerubahan,
} from '../services/dpaApi';

const STATUS_COLOR = { DRAFT: 'orange', DISETUJUI: 'green' };
const SATUAN_SUGGESTIONS = ['Rim', 'Unit', 'Paket', 'Bulan'].map((s) => ({ value: s }));

export default function DpaPerubahanPage() {
  const { dpa_id } = useParams();
  const navigate = useNavigate();
  const [dpa, setDpa] = useState(null);
  const [perubahan, setPerubahan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [dpaData, perubahanData, rincianData] = await Promise.all([
        getDpaById(dpa_id),
        getPerubahan(dpa_id),
        getRincianDetailPerubahan(dpa_id),
      ]);
      setDpa(dpaData?.data ?? dpaData);
      setPerubahan(perubahanData);
      if (perubahanData) {
        form.setFieldsValue({
          tanggal: dayjs(perubahanData.tanggal),
          nomor_perda: perubahanData.nomor_perda || '',
          alasan: perubahanData.alasan,
          pagu_menjadi: Number(perubahanData.pagu_menjadi),
        });
        setItems(
          (perubahanData.items || []).map((it, idx) => ({
            key: idx,
            kode_rekening: it.kode_rekening,
            nama_rekening: it.nama_rekening,
            uraian: it.uraian,
            volume_sebelum: Number(it.volume_sebelum || 0),
            satuan_sebelum: it.satuan_sebelum || '',
            harga_satuan_sebelum: Number(it.harga_satuan_sebelum || 0),
            jumlah_sebelum: Number(it.jumlah_sebelum),
            volume_sesudah: Number(it.volume_sesudah || 0),
            satuan_sesudah: it.satuan_sesudah || '',
            harga_satuan_sesudah: Number(it.harga_satuan_sesudah || 0),
            jumlah_sesudah: Number(it.jumlah_sesudah),
            isExisting: true,
          })),
        );
      } else {
        setItems(
          (rincianData || []).map((r, idx) => ({
            key: `existing-${idx}`,
            kode_rekening: r.kode_rekening,
            nama_rekening: r.nama_rekening,
            uraian: r.uraian,
            volume_sebelum: Number(r.volume || 0),
            satuan_sebelum: r.satuan || '',
            harga_satuan_sebelum: Number(r.harga_satuan || 0),
            jumlah_sebelum: Number(r.jumlah),
            volume_sesudah: Number(r.volume || 0),
            satuan_sesudah: r.satuan || '',
            harga_satuan_sesudah: Number(r.harga_satuan || 0),
            jumlah_sesudah: Number(r.jumlah),
            isExisting: true,
          })),
        );
      }
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [dpa_id]);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        key: Date.now(),
        kode_rekening: '',
        nama_rekening: '',
        uraian: '',
        volume_sebelum: 0,
        satuan_sebelum: '',
        harga_satuan_sebelum: 0,
        jumlah_sebelum: 0,
        volume_sesudah: 0,
        satuan_sesudah: '',
        harga_satuan_sesudah: 0,
        jumlah_sesudah: 0,
      },
    ]);
  };

  const updateItemRow = (key, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;
        const updated = { ...it, [field]: value };
        if (field === 'volume_sebelum' || field === 'harga_satuan_sebelum') {
          updated.jumlah_sebelum =
            Number(updated.volume_sebelum || 0) * Number(updated.harga_satuan_sebelum || 0);
        }
        if (field === 'volume_sesudah' || field === 'harga_satuan_sesudah') {
          updated.jumlah_sesudah =
            Number(updated.volume_sesudah || 0) * Number(updated.harga_satuan_sesudah || 0);
        }
        return updated;
      }),
    );
  };

  const removeItemRow = (key) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const paguMenjadiNum = Number(values.pagu_menjadi);
      const selisih = paguMenjadiNum - paguSemula;

      if (Math.abs(selisih) > 1 && items.length === 0) {
        toast.error('Pagu berubah — tambahkan minimal 1 rincian kode rekening tujuan');
        return;
      }
      const totalDeltaItems = items.reduce(
        (s, i) => s + (Number(i.jumlah_sesudah || 0) - Number(i.jumlah_sebelum || 0)),
        0,
      );
      if (Math.abs(selisih) > 1 && Math.abs(totalDeltaItems - selisih) > 1) {
        toast.error(
          `Total selisih rincian (Rp${totalDeltaItems.toLocaleString('id-ID')}) harus sama dengan selisih pagu (Rp${selisih.toLocaleString('id-ID')})`,
        );
        return;
      }

      setSaving(true);
      await savePerubahan(dpa_id, {
        tanggal: values.tanggal.format('YYYY-MM-DD'),
        nomor_perda: values.nomor_perda || null,
        alasan: values.alasan,
        pagu_menjadi: paguMenjadiNum,
        items: items.map((i) => ({
          kode_rekening: i.kode_rekening,
          nama_rekening: i.nama_rekening,
          uraian: i.uraian,
          volume_sebelum: Number(i.volume_sebelum || 0),
          satuan_sebelum: i.satuan_sebelum || '',
          harga_satuan_sebelum: Number(i.harga_satuan_sebelum || 0),
          jumlah_sebelum: Number(i.jumlah_sebelum || 0),
          volume_sesudah: Number(i.volume_sesudah || 0),
          satuan_sesudah: i.satuan_sesudah || '',
          harga_satuan_sesudah: Number(i.harga_satuan_sesudah || 0),
          jumlah_sesudah: Number(i.jumlah_sesudah || 0),
        })),
      });
      toast.success('Perubahan anggaran berhasil disimpan');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSetujui = async () => {
    try {
      await setujuiPerubahan(perubahan.id);
      toast.success('Perubahan anggaran disetujui, pagu DPA telah diperbarui');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyetujui');
    }
  };

  const handleCetakPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/dpa/${dpa_id}/perubahan/export-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal cetak PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DPA_Perubahan_${dpa_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'Gagal cetak PDF');
    }
  };

  const paguSemula = dpa ? Number(dpa.anggaran || 0) : 0;
  const paguMenjadi = Form.useWatch('pagu_menjadi', form) || 0;
  const selisih = Number(paguMenjadi) - paguSemula;
  const isLocked = perubahan?.status === 'DISETUJUI';

  useEffect(() => {
    if (dpa && !perubahan) {
      form.setFieldsValue({ pagu_menjadi: Number(dpa.anggaran || 0) });
    }
  }, [dpa, perubahan]);

  const itemColumns = [
    {
      title: 'Kode Rekening',
      dataIndex: 'kode_rekening',
      width: 160,
      render: (v, row) => (
        <Input
          size="small"
          value={v}
          disabled={isLocked}
          placeholder="cth: 5.1.02.01.01.0052"
          onChange={(e) => updateItemRow(row.key, 'kode_rekening', e.target.value)}
        />
      ),
    },
    {
      title: 'Nama Rekening / Uraian',
      dataIndex: 'nama_rekening',
      render: (v, row) => (
        <Input
          size="small"
          value={v}
          disabled={isLocked}
          placeholder="Nama rekening"
          onChange={(e) => updateItemRow(row.key, 'nama_rekening', e.target.value)}
        />
      ),
    },
    {
      title: 'Volume (Sebelum)',
      dataIndex: 'volume_sebelum',
      width: 90,
      render: (v, row) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          value={v}
          disabled={isLocked}
          min={0}
          onChange={(val) => updateItemRow(row.key, 'volume_sebelum', val || 0)}
        />
      ),
    },
    {
      title: 'Satuan (Sebelum)',
      dataIndex: 'satuan_sebelum',
      width: 110,
      render: (v, row) => (
        <AutoComplete
          size="small"
          style={{ width: '100%' }}
          value={v}
          disabled={isLocked}
          options={SATUAN_SUGGESTIONS}
          filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
          onChange={(val) => updateItemRow(row.key, 'satuan_sebelum', val)}
        />
      ),
    },
    {
      title: 'Harga Satuan (Sebelum)',
      dataIndex: 'harga_satuan_sebelum',
      width: 140,
      render: (v, row) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          value={v}
          disabled={isLocked}
          min={0}
          formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(val) => val.replace(/\./g, '')}
          onChange={(val) => updateItemRow(row.key, 'harga_satuan_sebelum', val || 0)}
        />
      ),
    },
    {
      title: 'Jumlah (Sebelum)',
      dataIndex: 'jumlah_sebelum',
      width: 130,
      render: (v) => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {Number(v || 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      title: 'Volume (Sesudah)',
      dataIndex: 'volume_sesudah',
      width: 90,
      render: (v, row) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          value={v}
          disabled={isLocked}
          min={0}
          onChange={(val) => updateItemRow(row.key, 'volume_sesudah', val || 0)}
        />
      ),
    },
    {
      title: 'Satuan (Sesudah)',
      dataIndex: 'satuan_sesudah',
      width: 110,
      render: (v, row) => (
        <AutoComplete
          size="small"
          style={{ width: '100%' }}
          value={v}
          disabled={isLocked}
          options={SATUAN_SUGGESTIONS}
          filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
          onChange={(val) => updateItemRow(row.key, 'satuan_sesudah', val)}
        />
      ),
    },
    {
      title: 'Harga Satuan (Sesudah)',
      dataIndex: 'harga_satuan_sesudah',
      width: 140,
      render: (v, row) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          value={v}
          disabled={isLocked}
          min={0}
          formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(val) => val.replace(/\./g, '')}
          onChange={(val) => updateItemRow(row.key, 'harga_satuan_sesudah', val || 0)}
        />
      ),
    },
    {
      title: 'Jumlah (Sesudah)',
      dataIndex: 'jumlah_sesudah',
      width: 130,
      render: (v) => (
        <span style={{ display: 'block', textAlign: 'right' }}>
          {Number(v || 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      title: 'Selisih',
      width: 130,
      render: (_, row) => {
        const d = Number(row.jumlah_sesudah || 0) - Number(row.jumlah_sebelum || 0);
        return (
          <span style={{ color: d >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
            {d >= 0 ? '+' : ''}
            {d.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    {
      title: '',
      width: 40,
      render: (_, row) =>
        !isLocked && (
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeItemRow(row.key)}
          />
        ),
    },
  ];

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard-dpa')}>
          Kembali
        </Button>
        <h2 style={{ margin: 0 }}>Perubahan Anggaran — DPA #{dpa_id}</h2>
        {dpa && <span style={{ color: '#888', fontSize: 13 }}>{dpa.sub_kegiatan}</span>}
      </div>

      {perubahan?.status === 'DISETUJUI' && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message="Perubahan anggaran sudah disetujui dan pagu DPA telah diperbarui."
          description={`Pagu baru: Rp${Number(perubahan.pagu_menjadi).toLocaleString('id-ID')}`}
        />
      )}

      {perubahan && (
        <div
          style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Descriptions title="Ringkasan Perubahan" size="small" column={2} bordered>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLOR[perubahan.status]}>{perubahan.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nomor Perda">
              {perubahan.nomor_perda || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Pagu Semula">
              Rp{Number(perubahan.pagu_semula).toLocaleString('id-ID')}
            </Descriptions.Item>
            <Descriptions.Item label="Pagu Menjadi">
              <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                Rp{Number(perubahan.pagu_menjadi).toLocaleString('id-ID')}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Selisih" span={2}>
              <span style={{ color: selisih >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                {selisih >= 0 ? '+' : ''}Rp{selisih.toLocaleString('id-ID')}
                {selisih > 0
                  ? ' (Tambah Anggaran)'
                  : selisih < 0
                    ? ' (Kurang Anggaran)'
                    : ' (Tetap)'}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}

      <div
        style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: 20 }}
      >
        <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
          ⚠️ Perubahan anggaran hanya dapat dilakukan <strong>satu kali</strong> per DPA per tahun
          anggaran, sesuai mekanisme APBD Perubahan (Permendagri 77/2020). Setelah disetujui, pagu
          DPA otomatis diperbarui dan tidak dapat diubah kembali. Jika pagu berubah, wajib diisi
          rincian kode rekening tujuan agar tercatat di formulir DPPA Rincian Belanja.
        </p>

        <Form form={form} layout="vertical" disabled={isLocked}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="tanggal"
              label="Tanggal Perubahan"
              rules={[{ required: true, message: 'Wajib diisi' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} format="DD MMMM YYYY" />
            </Form.Item>
            <Form.Item name="nomor_perda" label="Nomor Perda APBD Perubahan" style={{ flex: 1 }}>
              <Input placeholder="Contoh: Perda No. 3 Tahun 2026" />
            </Form.Item>
          </div>

          <Form.Item
            name="alasan"
            label="Alasan Perubahan Anggaran"
            rules={[{ required: true, message: 'Wajib diisi' }]}
          >
            <Input.TextArea rows={3} placeholder="Jelaskan alasan perubahan anggaran..." />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 4 }}
              >
                Pagu Anggaran Semula (Rp)
              </label>
              <div
                style={{
                  padding: '8px 12px',
                  background: '#fafafa',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  textAlign: 'right',
                  fontSize: 14,
                }}
              >
                Rp{paguSemula.toLocaleString('id-ID')}
              </div>
            </div>
            <Form.Item
              name="pagu_menjadi"
              label="Pagu Anggaran Menjadi (Rp)"
              rules={[
                { required: true, message: 'Wajib diisi' },
                { type: 'number', min: 1, message: 'Harus lebih dari 0' },
              ]}
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                size="large"
                formatter={(v) => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(v) => v.replace(/Rp\s?/g, '').replace(/\./g, '')}
                placeholder="Input pagu anggaran baru"
              />
            </Form.Item>
          </div>

          {paguMenjadi > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                background: selisih > 0 ? '#f6ffed' : selisih < 0 ? '#fff5f5' : '#f5f5f5',
                border: `1px solid ${selisih > 0 ? '#b7eb8f' : selisih < 0 ? '#ffccc7' : '#d9d9d9'}`,
              }}
            >
              <span style={{ fontWeight: 'bold' }}>Selisih: </span>
              <span
                style={{
                  color: selisih > 0 ? 'green' : selisih < 0 ? 'red' : '#333',
                  fontWeight: 'bold',
                  fontSize: 15,
                }}
              >
                {selisih >= 0 ? '+' : ''}Rp{selisih.toLocaleString('id-ID')}
              </span>
              <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>
                {selisih > 0
                  ? '← Penambahan Anggaran'
                  : selisih < 0
                    ? '← Pengurangan Anggaran'
                    : '← Tidak ada perubahan'}
              </span>
            </div>
          )}
        </Form>

        {
          <div style={{ marginTop: 8, marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <label style={{ fontSize: 13, fontWeight: 'bold' }}>
                Rincian Kode Rekening Tujuan Perubahan
              </label>
              {!isLocked && (
                <Button size="small" icon={<PlusOutlined />} onClick={addItemRow}>
                  Tambah Rincian
                </Button>
              )}
            </div>
            <Table
              size="small"
              dataSource={items}
              columns={itemColumns}
              pagination={false}
              bordered
              locale={{ emptyText: 'Belum ada rincian — klik "Tambah Rincian"' }}
            />
          </div>
        }

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {perubahan?.status !== 'DISETUJUI' && (
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              {perubahan ? 'Perbarui Perubahan' : 'Simpan Perubahan'}
            </Button>
          )}
          {perubahan && perubahan.status === 'DRAFT' && (
            <Popconfirm
              title="Setujui perubahan anggaran?"
              description="Setelah disetujui, pagu DPA akan diperbarui dan tidak bisa dibatalkan."
              onConfirm={handleSetujui}
              okText="Ya, Setujui"
              cancelText="Batal"
            >
              <Button
                type="primary"
                icon={<CheckOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Setujui Perubahan
              </Button>
            </Popconfirm>
          )}
          {perubahan && (
            <Button icon={<FilePdfOutlined />} onClick={handleCetakPdf}>
              Cetak DPA-P
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
