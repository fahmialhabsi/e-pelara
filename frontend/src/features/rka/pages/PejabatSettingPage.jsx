import React, { useEffect, useState } from 'react';
import { Button, Input, Table, Select, Typography, Space, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import {
  getPejabatPenandatanganByTahun,
  savePejabatPenandatanganBulk,
} from '../services/rkaApi';

const { Title } = Typography;

// 4 peran tetap — posisi/jabatan struktural yang menandatangani dokumen RKA, bukan daftar
// bebas seperti TAPD, jadi tidak ada tambah/hapus baris.
const ROLE_LABEL = {
  PENGGUNA_ANGGARAN: 'Pengguna Anggaran',
  KUASA_PENGGUNA_ANGGARAN: 'Kuasa Pengguna Anggaran',
  KEPALA_DINAS: 'Kepala Dinas',
  SEKRETARIS: 'Sekretaris',
};
const ROLE_ORDER = ['PENGGUNA_ANGGARAN', 'KUASA_PENGGUNA_ANGGARAN', 'KEPALA_DINAS', 'SEKRETARIS'];

const emptyRows = () => ROLE_ORDER.map((role) => ({ role, nama: '', nip: '', jabatan: '' }));

export default function PejabatSettingPage() {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [rows, setRows] = useState(emptyRows());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPejabat = async (thn) => {
    setLoading(true);
    try {
      const data = await getPejabatPenandatanganByTahun(thn);
      const byRole = new Map(data.map((p) => [p.role, p]));
      setRows(
        ROLE_ORDER.map((role) => {
          const existing = byRole.get(role);
          return {
            role,
            nama: existing?.nama || '',
            nip: existing?.nip || '',
            jabatan: existing?.jabatan || '',
          };
        }),
      );
    } catch {
      toast.error('Gagal memuat data Pejabat Penandatangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPejabat(tahun);
  }, [tahun]);

  const handleChange = (role, field, val) => {
    setRows((prev) => prev.map((r) => (r.role === role ? { ...r, [field]: val } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePejabatPenandatanganBulk(tahun, rows);
      toast.success(`Data Pejabat Penandatangan Tahun ${tahun} berhasil disimpan`);
    } catch {
      toast.error('Gagal menyimpan data Pejabat Penandatangan');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Peran',
      dataIndex: 'role',
      width: 200,
      render: (v) => <strong>{ROLE_LABEL[v] || v}</strong>,
    },
    {
      title: 'Nama Lengkap',
      dataIndex: 'nama',
      render: (v, r) => (
        <Input
          value={v}
          placeholder="Nama lengkap beserta gelar"
          onChange={(e) => handleChange(r.role, 'nama', e.target.value)}
        />
      ),
    },
    {
      title: 'NIP',
      dataIndex: 'nip',
      width: 200,
      render: (v, r) => (
        <Input
          value={v}
          placeholder="NIP"
          onChange={(e) => handleChange(r.role, 'nip', e.target.value)}
        />
      ),
    },
    {
      title: 'Jabatan Tercetak',
      dataIndex: 'jabatan',
      width: 260,
      render: (v, r) => (
        <Input
          value={v}
          placeholder="cth: Kepala Dinas Pangan Provinsi Maluku Utara"
          onChange={(e) => handleChange(r.role, 'jabatan', e.target.value)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>⚙️ Pejabat Penandatangan RKA</Title>
      <p style={{ color: '#555', marginBottom: 16 }}>
        Nama, NIP, dan jabatan pejabat yang tercetak pada dokumen RKA (Pengguna Anggaran, Kuasa
        Pengguna Anggaran, Kepala Dinas, Sekretaris) — digunakan otomatis di semua formulir cetak
        PDF/Word sesuai tahun anggaran, menggantikan placeholder manual.
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
          dataSource={rows.map((r) => ({ ...r, key: r.role }))}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 16 }}
        />
      </Spin>

      <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
        Simpan Pejabat Penandatangan {tahun}
      </Button>
    </div>
  );
}
