import React, { useEffect, useState } from 'react';
import { Button, Input, Table, Select, Typography, Space, Spin, Upload, Checkbox, Image, Popconfirm } from 'antd';
import { SaveOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { toast } from 'react-toastify';
import {
  getPejabatPenandatanganByTahun,
  savePejabatPenandatanganBulk,
  uploadGambarPejabat,
} from '../services/rkaApi';
import api from '../../../services/api';

const { Title, Text } = Typography;

// 4 peran tetap — posisi/jabatan struktural yang menandatangani dokumen RKA, bukan daftar
// bebas seperti TAPD, jadi tidak ada tambah/hapus baris.
const ROLE_LABEL = {
  PENGGUNA_ANGGARAN: 'Pengguna Anggaran',
  KUASA_PENGGUNA_ANGGARAN: 'Kuasa Pengguna Anggaran',
  KEPALA_DINAS: 'Kepala Dinas',
  SEKRETARIS: 'Sekretaris',
};
const ROLE_ORDER = ['PENGGUNA_ANGGARAN', 'KUASA_PENGGUNA_ANGGARAN', 'KEPALA_DINAS', 'SEKRETARIS'];

const emptyRows = () =>
  ROLE_ORDER.map((role) => ({
    role,
    nama: '',
    nip: '',
    jabatan: '',
    tanda_tangan_url: '',
    cap_dinas_url: '',
    persetujuan_pemilik: false,
  }));

// Berkas diunggah sebagai path relatif ("/uploads/xxx.png") oleh backend —
// disambung ke origin API (bukan base /api) supaya bisa dipakai langsung
// sebagai src gambar, sama seperti pola di HeaderSection.jsx.
const baseOrigin = api.defaults.baseURL?.replace(/\/api\/?$/, '') || '';
const srcGambar = (url) => (url ? (url.startsWith('http') ? url : `${baseOrigin}${url}`) : '');

export default function PejabatSettingPage() {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [rows, setRows] = useState(emptyRows());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

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
            tanda_tangan_url: existing?.tanda_tangan_url || '',
            cap_dinas_url: existing?.cap_dinas_url || '',
            persetujuan_pemilik: !!existing?.persetujuan_pemilik,
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

  const handleUpload = async (role, field, file) => {
    const key = `${role}-${field}`;
    setUploadingKey(key);
    try {
      const url = await uploadGambarPejabat(file);
      handleChange(role, field, url);
      toast.success('Gambar berhasil diunggah — jangan lupa klik Simpan.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal mengunggah gambar');
    } finally {
      setUploadingKey(null);
    }
    return false; // cegah antd Upload auto-submit form bawaan
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePejabatPenandatanganBulk(tahun, rows);
      toast.success(`Data Pejabat Penandatangan Tahun ${tahun} berhasil disimpan`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Gagal menyimpan data Pejabat Penandatangan');
    } finally {
      setSaving(false);
    }
  };

  const kolomGambar = (field, label) => ({
    title: label,
    dataIndex: field,
    width: 170,
    render: (v, r) => {
      const key = `${r.role}-${field}`;
      const disabled = !r.persetujuan_pemilik;
      return (
        <Space direction="vertical" size={4}>
          {v ? (
            <Space>
              <Image src={srcGambar(v)} width={60} height={45} style={{ objectFit: 'contain', border: '1px solid #eee' }} />
              <Popconfirm title="Hapus gambar ini?" onConfirm={() => handleChange(r.role, field, '')}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ) : (
            <Upload
              accept="image/png,image/jpeg"
              showUploadList={false}
              disabled={disabled}
              beforeUpload={(file) => handleUpload(r.role, field, file)}
            >
              <Button size="small" icon={<UploadOutlined />} loading={uploadingKey === key} disabled={disabled}>
                Unggah
              </Button>
            </Upload>
          )}
          {disabled && <Text type="secondary" style={{ fontSize: 11 }}>Perlu persetujuan</Text>}
        </Space>
      );
    },
  });

  const columns = [
    {
      title: 'Peran',
      dataIndex: 'role',
      width: 180,
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
      width: 180,
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
      width: 220,
      render: (v, r) => (
        <Input
          value={v}
          placeholder="cth: Kepala Dinas Pangan Provinsi Maluku Utara"
          onChange={(e) => handleChange(r.role, 'jabatan', e.target.value)}
        />
      ),
    },
    {
      title: 'Persetujuan Pemilik',
      dataIndex: 'persetujuan_pemilik',
      width: 160,
      render: (v, r) => (
        <Checkbox
          checked={v}
          onChange={(e) => {
            const checked = e.target.checked;
            setRows((prev) =>
              prev.map((row) =>
                row.role === r.role
                  ? {
                      ...row,
                      persetujuan_pemilik: checked,
                      // Melepas persetujuan otomatis melepas gambar yang tersimpan —
                      // konsisten dengan gerbang wajib di backend (saveBulk menolak
                      // menyimpan URL gambar tanpa persetujuan_pemilik = true).
                      tanda_tangan_url: checked ? row.tanda_tangan_url : '',
                      cap_dinas_url: checked ? row.cap_dinas_url : '',
                    }
                  : row,
              ),
            );
          }}
        >
          <Text style={{ fontSize: 12 }}>Pejabat ybs menyetujui</Text>
        </Checkbox>
      ),
    },
    kolomGambar('tanda_tangan_url', 'Tanda Tangan'),
    kolomGambar('cap_dinas_url', 'Cap Dinas'),
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={4}>⚙️ Pejabat Penandatangan RKA</Title>
      <p style={{ color: '#555', marginBottom: 8 }}>
        Nama, NIP, dan jabatan pejabat yang tercetak pada dokumen resmi (RKA, Renja, dan dokumen
        perencanaan lain) — digunakan otomatis di semua formulir cetak PDF/Word sesuai tahun
        anggaran, menggantikan placeholder manual.
      </p>
      <p style={{ color: '#a15c00', marginBottom: 16, fontSize: 13 }}>
        Tanda tangan dan cap dinas elektronik HANYA boleh diunggah dengan persetujuan eksplisit
        dari pejabat pemilik tanda tangan tersebut — centang &quot;Pejabat ybs menyetujui&quot;
        terlebih dahulu sebelum tombol unggah aktif. Jangan mengunggah tanda tangan/cap milik
        pejabat lain atau yang diambil dari dokumen pihak lain.
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
