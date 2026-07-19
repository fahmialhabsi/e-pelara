import React, { useEffect, useState } from 'react';
import { Button, Input, Table, Select, Typography, Space, Spin, DatePicker } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);
dayjs.locale('id');
import { SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import { getTapdByTahun, saveTapdBulk } from '../services/rkaApi';

const { Title } = Typography;

const JABATAN_OPTIONS = ['Ketua TAPD', 'Sekretaris', 'Anggota'];

const DEFAULT_ROW = () => ({ nama: '', nip: '', jabatan: 'Anggota' });

export default function TapdSettingPage() {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTapd = async (thn) => {
    setLoading(true);
    try {
      const data = await getTapdByTahun(thn);
      if (data.length > 0) {
        setRows(data.map((t) => ({ nama: t.nama, nip: t.nip, jabatan: t.jabatan })));
      } else {
        setRows([{ nama: '', nip: '', jabatan: 'Ketua TAPD' }]);
      }
    } catch {
      toast.error('Gagal memuat data TAPD');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTapd(tahun);
  }, [tahun]);

  const handleChange = (idx, field, val) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const handleAdd = () => setRows((prev) => [...prev, DEFAULT_ROW()]);

  const handleDelete = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const invalid = rows.some((r) => !r.nama.trim() || !r.nip.trim());
    if (invalid) return toast.error('Nama dan NIP tidak boleh kosong');
    setSaving(true);
    try {
      await saveTapdBulk(tahun, rows);
      toast.success(`Data TAPD Tahun ${tahun} berhasil disimpan`);
    } catch {
      toast.error('Gagal menyimpan data TAPD');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'No',
      width: 50,
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Nama Lengkap',
      dataIndex: 'nama',
      render: (v, _, i) => (
        <Input
          value={v}
          placeholder="Nama lengkap"
          onChange={(e) => handleChange(i, 'nama', e.target.value)}
        />
      ),
    },
    {
      title: 'NIP',
      dataIndex: 'nip',
      width: 200,
      render: (v, _, i) => (
        <Input
          value={v}
          placeholder="NIP"
          onChange={(e) => handleChange(i, 'nip', e.target.value)}
        />
      ),
    },
    {
      title: 'Jabatan dalam TAPD',
      dataIndex: 'jabatan',
      width: 180,
      render: (v, _, i) => (
        <Select
          value={v}
          style={{ width: '100%' }}
          onChange={(val) => handleChange(i, 'jabatan', val)}
          options={JABATAN_OPTIONS.map((j) => ({ value: j, label: j }))}
          allowClear={false}
        />
      ),
    },
    {
      title: 'Tgl Pembahasan',
      dataIndex: 'tanggal_pembahasan',
      width: 160,
      render: (v, _, i) => (
        <DatePicker
          style={{ width: '100%' }}
          format="DD MMMM YYYY"
          value={
            v && v.length > 0
              ? dayjs(v, 'DD MMMM YYYY', 'id').isValid()
                ? dayjs(v, 'DD MMMM YYYY', 'id')
                : null
              : null
          }
          placeholder="Pilih tanggal"
          onChange={(date, _) => {
            const str = date ? date.locale('id').format('DD MMMM YYYY') : '';
            handleChange(i, 'tanggal_pembahasan', str);
          }}
        />
      ),
    },
    {
      title: 'Catatan',
      dataIndex: 'catatan',
      render: (v, _, i) => (
        <Input
          value={v || ''}
          placeholder="Catatan (opsional)"
          onChange={(e) => handleChange(i, 'catatan', e.target.value)}
        />
      ),
    },
    {
      title: 'Aksi',
      width: 60,
      render: (_, __, i) => (
        <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(i)} />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>⚙️ Pengaturan TAPD</Title>
      <p style={{ color: '#555', marginBottom: 16 }}>
        Tim Anggaran Pemerintahan Daerah — digunakan otomatis di semua cetak RKA-BELANJA sesuai
        tahun anggaran.
      </p>

      <Space style={{ marginBottom: 16 }}>
        <span style={{ fontWeight: 'bold' }}>Tahun Anggaran:</span>
        <Select
          value={tahun}
          onChange={(v) => setTahun(v)}
          style={{ width: 120 }}
          options={[2024, 2025, 2026, 2027].map((y) => ({ value: y, label: y }))}
        />
      </Space>

      <Spin spinning={loading}>
        <Table
          dataSource={rows.map((r, i) => ({ ...r, key: i }))}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
        />
      </Spin>

      <Space>
        <Button icon={<PlusOutlined />} onClick={handleAdd}>
          Tambah Anggota TAPD
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
          Simpan Data TAPD {tahun}
        </Button>
      </Space>
    </div>
  );
}
