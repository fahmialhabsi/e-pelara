import React, { useEffect, useState } from 'react';
import { Table, Button, Dropdown, Space, Tag, Select, Input, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  EditOutlined,
  DownloadOutlined,
  DownOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { getAllRka, deleteRka, importRkaPdf } from '../services/rkaApi';
import { toast } from 'react-toastify';

const { Option } = Select;

const STATUS_COLOR = {
  DRAFT: { color: '#d4b106', bg: '#fffbe6', border: '#ffe58f', label: 'Draft' },
  SUBMITTED: { color: '#096dd9', bg: '#e6f7ff', border: '#91d5ff', label: 'Diajukan' },
  APPROVED: { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f', label: 'Disetujui' },
  REJECTED: { color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', label: 'Ditolak' },
};

const TAHAPAN_LABEL = {
  APBD_INDUK: 'APBD Induk',
  PERGESERAN_1: 'Pergeseran 1',
  PERGESERAN_2: 'Pergeseran 2',
  APBD_PERUBAHAN: 'APBD Perubahan',
};

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

const RkaListPage = () => {
  const navigate = useNavigate();
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const fileInputRef = React.useRef(null);
  const [filterTahun, setFilterTahun] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await getAllRka();
      const list = Array.isArray(rows) ? rows : [];
      setAllData(list);
      // Auto-filter ke tahun terbaru yang ada data
      if (list.length > 0) {
        const tahunTerbaru = String(Math.max(...list.map((r) => Number(r.tahun) || 0)));
        setFilterTahun(tahunTerbaru);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data RKA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter client-side
  const data = allData.filter((r) => {
    const matchTahun = !filterTahun || String(r.tahun) === filterTahun;
    const matchStatus = !filterStatus || r.approval_status === filterStatus;
    const matchSearch =
      !search ||
      [r.program, r.kegiatan, r.sub_kegiatan].some((f) =>
        String(f || '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    return matchTahun && matchStatus && matchSearch;
  });

  // Tahun unik untuk filter
  const tahunList = [...new Set(allData.map((r) => String(r.tahun)).filter(Boolean))].sort(
    (a, b) => b - a,
  );

  const handleDownload = async (id, format) => {
    setLoadingDl(true);
    const BACKEND_URL = 'http://localhost:3000';
    const endpointMap = {
      pdf: 'export-pdf',
      xlsx: 'export-excel',
      docx: 'export-word',
      belanja: 'export-pdf-belanja',
    };
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/rka/${id}/${endpointMap[format]}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal mengunduh berkas');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RKA_${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Berhasil mengunduh RKA (${format.toUpperCase()})`);
    } catch (e) {
      toast.error(e.message || 'Gagal mengunduh');
    } finally {
      setLoadingDl(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset supaya file yang sama bisa dipilih ulang
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Berkas harus berformat PDF.');
      return;
    }
    setLoadingImport(true);
    try {
      const res = await importRkaPdf(file);
      toast.success(res.message || 'RKA berhasil diimpor dari PDF.');
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.details?.join?.(', ') ||
        err.message ||
        'Gagal mengimpor PDF';
      toast.error(msg);
    } finally {
      setLoadingImport(false);
    }
  };

  const columns = [
    {
      title: 'No',
      key: 'no',
      width: 48,
      align: 'center',
      render: (_, __, i) => <span style={{ color: '#8c8c8c', fontSize: 12 }}>{i + 1}</span>,
    },
    {
      title: 'Tahun',
      dataIndex: 'tahun',
      key: 'tahun',
      width: 72,
      align: 'center',
      render: (v) => (
        <Tag color="blue" style={{ fontWeight: 700 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'Program / Kegiatan / Sub Kegiatan',
      key: 'pksk',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#262626' }}>
            {r.kode_program && (
              <span style={{ color: '#1677ff', marginRight: 6 }}>{r.kode_program}</span>
            )}
            {r.program || '—'}
          </div>
          {r.kegiatan && (
            <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
              {r.kode_kegiatan && (
                <span style={{ color: '#8c8c8c', marginRight: 4 }}>{r.kode_kegiatan}</span>
              )}
              {r.kegiatan}
            </div>
          )}
          {r.sub_kegiatan && (
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 1 }}>
              {r.kode_sub_kegiatan && <span style={{ marginRight: 4 }}>{r.kode_sub_kegiatan}</span>}
              {r.sub_kegiatan}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Anggaran',
      dataIndex: 'anggaran',
      key: 'anggaran',
      width: 150,
      align: 'right',
      render: (v) => (
        <span style={{ fontWeight: 700, color: v > 0 ? '#0958d9' : '#bfbfbf', fontSize: 13 }}>
          {formatRupiah(v)}
        </span>
      ),
    },
    {
      title: 'Tahapan',
      dataIndex: 'tahapan',
      key: 'tahapan',
      width: 120,
      align: 'center',
      render: (v) => (
        <Tag color="geekblue" style={{ fontSize: 11 }}>
          {TAHAPAN_LABEL[v] || v || 'APBD Induk'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (v) => {
        const s = STATUS_COLOR[v] || STATUS_COLOR.DRAFT;
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              color: s.color,
              background: s.bg,
              border: `1px solid ${s.border}`,
            }}
          >
            {s.label}
          </span>
        );
      },
    },
    {
      title: 'Ver',
      dataIndex: 'version',
      key: 'version',
      width: 48,
      align: 'center',
      render: (v) => <span style={{ fontSize: 12, color: '#8c8c8c' }}>v{v ?? 1}</span>,
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit RKA">
            <Button
              size="small"
              type="primary"
              ghost
              icon={<EditOutlined />}
              onClick={() => navigate(`/rka/form/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Detail">
            <Button
              size="small"
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => navigate(`/rka/form/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Hapus">
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                if (
                  window.confirm(
                    `Hapus RKA #${record.id} - ${record.sub_kegiatan || record.program}?`,
                  )
                ) {
                  deleteRka(record.id, { change_reason_text: 'Hapus data uji coba' })
                    .then(() => {
                      toast.success('RKA berhasil dihapus');
                      fetchData();
                    })
                    .catch((e) => toast.error(e.message || 'Gagal hapus'));
                }
              }}
            />
          </Tooltip>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'pdf',
                  label: '📄 Cetak PDF',
                  onClick: () => handleDownload(record.id, 'pdf'),
                },
                {
                  key: 'docx',
                  label: '📝 Ekspor Word',
                  onClick: () => handleDownload(record.id, 'docx'),
                },
                {
                  key: 'xlsx',
                  label: '📊 Ekspor Excel',
                  onClick: () => handleDownload(record.id, 'xlsx'),
                },
                {
                  key: 'belanja',
                  label: '🧾 Cetak RKA-BELANJA',
                  onClick: () => handleDownload(record.id, 'belanja'),
                },
                { type: 'divider' },
                {
                  key: 'generate-dpa',
                  label: '⚡ Generate DPA dari RKA',
                  onClick: async () => {
                    if (!window.confirm(`Generate DPA dari RKA #${record.id}?`)) return;
                    try {
                      const token = localStorage.getItem('token');
                      const res = await fetch(
                        `http://localhost:3000/api/dpa/generate-from-rka/${record.id}`,
                        {
                          method: 'POST',
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                        },
                      );
                      const data = await res.json();
                      if (data.success) {
                        toast.success(`DPA #${data.data.dpa_id} berhasil digenerate!`);
                      } else {
                        toast.error(data.message || 'Gagal generate DPA');
                      }
                    } catch (e) {
                      toast.error('Gagal generate DPA');
                    }
                  },
                },
              ],
            }}
          >
            <Button size="small" type="text" icon={<DownloadOutlined />} loading={loadingDl}>
              <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Dashboard RKA</h1>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
            Rencana Kerja dan Anggaran — Dinas Pangan Provinsi Maluku Utara
          </div>
        </div>
        <Space>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <Button
            icon={<UploadOutlined />}
            loading={loadingImport}
            onClick={() => fileInputRef.current?.click()}
          >
            Import PDF SIPD
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rka/form/new')}>
            Tambah RKA
          </Button>
        </Space>
      </div>

      {/* ── Summary cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Total RKA', value: allData.length, color: '#1677ff' },
          {
            label: 'Draft',
            value: allData.filter((r) => r.approval_status === 'DRAFT').length,
            color: '#d4b106',
          },
          {
            label: 'Disetujui',
            value: allData.filter((r) => r.approval_status === 'APPROVED').length,
            color: '#389e0d',
          },
          {
            label: 'Total Anggaran',
            value: formatRupiah(allData.reduce((s, r) => s + Number(r.anggaran || 0), 0)),
            color: '#0958d9',
            isRupiah: true,
          },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              background: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{c.label}</div>
            <div
              style={{
                fontSize: c.isRupiah ? 14 : 22,
                fontWeight: 700,
                color: c.color,
                marginTop: 4,
              }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Cari program / kegiatan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="Tahun"
          style={{ width: 110 }}
          value={filterTahun || undefined}
          onChange={setFilterTahun}
          allowClear
        >
          {tahunList.map((t) => (
            <Option key={t} value={t}>
              {t}
            </Option>
          ))}
        </Select>
        <Select
          placeholder="Status"
          style={{ width: 130 }}
          value={filterStatus || undefined}
          onChange={setFilterStatus}
          allowClear
        >
          {Object.entries(STATUS_COLOR).map(([k, v]) => (
            <Option key={k} value={k}>
              {v.label}
            </Option>
          ))}
        </Select>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>
          Refresh
        </Button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c', alignSelf: 'center' }}>
          {data.length} dari {allData.length} RKA
        </span>
      </div>

      {/* ── Tabel ── */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} RKA` }}
          scroll={{ x: 900 }}
          size="middle"
          rowClassName={(_, i) => (i % 2 === 0 ? '' : 'rka-row-alt')}
          onRow={(record) => ({
            onMouseEnter: (e) => {
              e.currentTarget.style.background = '#f0f7ff';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = '';
            },
          })}
        />
      </div>

      <style>{`.rka-row-alt td { background: #fafcff !important; }`}</style>
    </div>
  );
};

export default RkaListPage;
