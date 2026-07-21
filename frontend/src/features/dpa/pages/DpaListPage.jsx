// DpaListPage — Dashboard DPA dengan tampilan pohon berjenjang Program → Kegiatan →
// Sub Kegiatan → Rincian Akun, supaya program yang satu tidak menumpuk/bercampur
// visual dengan program lainnya seperti pada tabel datar sebelumnya.
import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Drawer, Select, Input, Tooltip, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getAllDpa } from '../services/dpaApi';
import ApprovalStatusBadge from '../../../components/approval/ApprovalStatusBadge';
import ApprovalActions from '../../../components/approval/ApprovalActions';
import ApprovalTimeline from '../../../components/approval/ApprovalTimeline';
import {
  PlusOutlined,
  EditOutlined,
  PrinterOutlined,
  SwapOutlined,
  FileSyncOutlined,
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { approvalApi } from '../../../services/approvalApi';
import { toast } from 'react-toastify';

const { Option } = Select;

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

const STATUS_COLOR = {
  DRAFT: { color: '#d4b106', bg: '#fffbe6', border: '#ffe58f', label: 'Draft' },
  SUBMITTED: { color: '#096dd9', bg: '#e6f7ff', border: '#91d5ff', label: 'Diajukan' },
  APPROVED: { color: '#389e0d', bg: '#f6ffed', border: '#b7eb8f', label: 'Disetujui' },
  REJECTED: { color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', label: 'Ditolak' },
};

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

// Bandingkan kode rekening segmen-per-segmen secara numerik supaya urutan tabel
// mengikuti struktur kode, bukan urutan input/import.
const compareKodeRekening = (a, b) => {
  const pa = String(a || '').split(/[.-]/).filter(Boolean).map(Number);
  const pb = String(b || '').split(/[.-]/).filter(Boolean).map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = Number.isFinite(pa[i]) ? pa[i] : 0;
    const nb = Number.isFinite(pb[i]) ? pb[i] : 0;
    if (na !== nb) return na - nb;
  }
  return 0;
};

const DpaListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || '';
  const isAdmin = ADMIN_ROLES.includes(userRole);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [timelineDoc, setTimelineDoc] = useState(null);
  const [filterTahun, setFilterTahun] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loadingBulkApprove, setLoadingBulkApprove] = useState(false);
  const [bulkApproveProgress, setBulkApproveProgress] = useState(null); // {done, total} selama proses

  const fetchData = async () => {
    setLoading(true);
    try {
      const rows = await getAllDpa();
      const list = Array.isArray(rows) ? rows : [];
      setAllData(list);
      if (list.length > 0) {
        const tahunTerbaru = String(Math.max(...list.map((r) => Number(r.tahun) || 0)));
        setFilterTahun(tahunTerbaru);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data DPA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hanya versi aktif yang ditampilkan — versi lama (kalau ada) disembunyikan supaya
  // tidak menumpuk sebagai baris duplikat di dashboard.
  const activeData = allData.filter((r) => r.is_active_version !== false);

  const data = activeData.filter((r) => {
    const matchTahun = !filterTahun || String(r.tahun) === filterTahun;
    const matchStatus = !filterStatus || r.approval_status === filterStatus;
    const matchSearch =
      !search ||
      [r.program, r.kegiatan, r.sub_kegiatan, r.kode_rekening, r.nama_rekening].some((f) =>
        String(f || '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    return matchTahun && matchStatus && matchSearch;
  });

  const sortedData = [...data].sort(
    (a, b) =>
      compareKodeRekening(a.kode_program, b.kode_program) ||
      compareKodeRekening(a.kode_kegiatan, b.kode_kegiatan) ||
      compareKodeRekening(a.kode_sub_kegiatan, b.kode_sub_kegiatan) ||
      compareKodeRekening(a.kode_rekening, b.kode_rekening),
  );

  // Susun jadi pohon Program → Kegiatan → Sub Kegiatan → Rincian Akun (Kode Rekening)
  // untuk tampilan nested cascading — setiap Program tegas terpisah dari Program lain.
  const treeData = (() => {
    const programMap = new Map();
    sortedData.forEach((r) => {
      const progKey = r.kode_program || `_${r.program || 'tanpa-program'}`;
      if (!programMap.has(progKey)) {
        programMap.set(progKey, {
          key: `prog-${progKey}`,
          kode: r.kode_program,
          nama: r.program,
          kegiatanMap: new Map(),
        });
      }
      const prog = programMap.get(progKey);

      const kegKey = r.kode_kegiatan || `_${r.kegiatan || 'tanpa-kegiatan'}`;
      if (!prog.kegiatanMap.has(kegKey)) {
        prog.kegiatanMap.set(kegKey, {
          key: `keg-${progKey}-${kegKey}`,
          kode: r.kode_kegiatan,
          nama: r.kegiatan,
          subKegiatanMap: new Map(),
        });
      }
      const keg = prog.kegiatanMap.get(kegKey);

      const subKey = r.kode_sub_kegiatan || `_${r.sub_kegiatan || 'tanpa-sub'}`;
      if (!keg.subKegiatanMap.has(subKey)) {
        keg.subKegiatanMap.set(subKey, {
          key: `subkeg-${progKey}-${kegKey}-${subKey}`,
          kode: r.kode_sub_kegiatan,
          nama: r.sub_kegiatan,
          rows: [],
        });
      }
      keg.subKegiatanMap.get(subKey).rows.push(r);
    });

    return Array.from(programMap.values()).map((prog) => {
      const kegiatanList = Array.from(prog.kegiatanMap.values()).map((keg) => {
        const subKegiatanList = Array.from(keg.subKegiatanMap.values()).map((sk) => {
          const rincianList = sk.rows.map((r) => ({
            ...r,
            key: `dpa-${r.id}`,
            level: 'rincian',
          }));
          const skAnggaran = rincianList.reduce((s, r) => s + (Number(r.anggaran) || 0), 0);
          return {
            key: sk.key,
            level: 'subkegiatan',
            kode: sk.kode,
            nama: sk.nama,
            tahun: rincianList[0]?.tahun,
            anggaran: skAnggaran,
            rincianCount: rincianList.length,
            children: rincianList,
          };
        });
        const kegAnggaran = subKegiatanList.reduce((s, sk) => s + sk.anggaran, 0);
        return {
          key: keg.key,
          level: 'kegiatan',
          kode: keg.kode,
          nama: keg.nama,
          tahun: subKegiatanList[0]?.tahun,
          anggaran: kegAnggaran,
          subCount: subKegiatanList.length,
          children: subKegiatanList,
        };
      });
      const progAnggaran = kegiatanList.reduce((s, k) => s + k.anggaran, 0);
      return {
        key: prog.key,
        level: 'program',
        kode: prog.kode,
        nama: prog.nama,
        tahun: kegiatanList[0]?.tahun,
        anggaran: progAnggaran,
        kegiatanCount: kegiatanList.length,
        children: kegiatanList,
      };
    });
  })();

  const tahunList = [...new Set(activeData.map((r) => String(r.tahun)).filter(Boolean))].sort(
    (a, b) => b - a,
  );

  const totalAnggaranAktif = activeData.reduce((s, r) => s + (Number(r.anggaran) || 0), 0);

  const handleCetakPdf = async (record) => {
    setLoadingDl(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/dpa/${record.id}/export-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal cetak PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const namaSubKeg = (record.sub_kegiatan || 'DPA')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 50);
      a.download = `DPA_${namaSubKeg}_${record.tahun}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'Gagal cetak PDF DPA');
    } finally {
      setLoadingDl(false);
    }
  };

  const handleCetakDppaSkpd = async () => {
    const opdId = data[0]?.opd_id;
    const tahun = data[0]?.tahun;
    if (!opdId || !tahun) {
      toast.warning('Data OPD/Tahun belum tersedia');
      return;
    }
    setLoadingDl(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:3000/api/dpa/opd/${opdId}/export-setelah-perubahan?tahun=${tahun}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Gagal cetak DPPA-SKPD');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DPPA_SKPD_OPD${opdId}_${tahun}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.message || 'Gagal cetak DPPA-SKPD');
    } finally {
      setLoadingDl(false);
    }
  };

  // Setujui otomatis semua DPA yang belum Disetujui, sekaligus, tanpa perlu klik
  // Ajukan/Setujui satu-satu per baris — dorong tiap dokumen lewat alur approval yang
  // sama (submit lalu approve) sampai mencapai APPROVED. Hanya admin yang bisa approve
  // (dibatasi juga oleh backend), jadi tombol ini disembunyikan untuk role non-admin.
  const handleBulkApproveAll = async () => {
    const targets = data.filter((r) => r.approval_status && r.approval_status !== 'APPROVED');
    if (!targets.length) {
      toast.info('Tidak ada DPA yang perlu disetujui — semua sudah berstatus Disetujui.');
      return;
    }
    if (
      !window.confirm(
        `Setujui otomatis ${targets.length} DPA (Draft/Diajukan) sampai berstatus Disetujui?\n\nSetiap dokumen akan diajukan lalu disetujui satu per satu — proses ini tidak bisa dibatalkan di tengah jalan.`,
      )
    ) {
      return;
    }
    setLoadingBulkApprove(true);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const dpa = targets[i];
      setBulkApproveProgress({ done: i, total: targets.length });
      try {
        if (dpa.approval_status === 'DRAFT' || dpa.approval_status === 'REJECTED') {
          await approvalApi.submit('dpa', dpa.id);
        }
        await approvalApi.approve('dpa', dpa.id);
        success++;
      } catch (err) {
        failed++;
        console.error(
          `Gagal memproses DPA #${dpa.id}:`,
          err?.response?.data?.message || err.message,
        );
      }
    }
    setBulkApproveProgress(null);
    setLoadingBulkApprove(false);
    if (failed) {
      toast.warning(`${success} DPA berhasil disetujui, ${failed} gagal (lihat console).`);
    } else {
      toast.success(`${success} DPA berhasil diajukan & disetujui secara otomatis.`);
    }
    fetchData();
  };

  const columns = [
    {
      title: '',
      key: 'levelIcon',
      width: 32,
      align: 'center',
      render: (_, r) => {
        if (r.level === 'program') return <span style={{ fontSize: 14 }}>📁</span>;
        if (r.level === 'kegiatan') return <span style={{ fontSize: 13 }}>📂</span>;
        if (r.level === 'subkegiatan') return <span style={{ fontSize: 13 }}>🗂️</span>;
        return <span style={{ fontSize: 12, color: '#bfbfbf' }}>📄</span>;
      },
    },
    {
      title: 'Tahun',
      dataIndex: 'tahun',
      key: 'tahun',
      width: 72,
      align: 'center',
      render: (v, r) =>
        v ? (
          <Tag color="blue" style={{ fontWeight: r.level === 'rincian' ? 700 : 400 }}>
            {v}
          </Tag>
        ) : null,
    },
    {
      title: 'Program / Kegiatan / Sub Kegiatan',
      key: 'pksk',
      render: (_, r) => {
        if (r.level === 'program') {
          return (
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0958d9' }}>
              {r.kode && <span style={{ marginRight: 6 }}>{r.kode}</span>}
              {r.nama || '—'}
              <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="blue">
                {r.kegiatanCount} kegiatan
              </Tag>
            </div>
          );
        }
        if (r.level === 'kegiatan') {
          return (
            <div style={{ fontWeight: 600, fontSize: 13, color: '#389e0d' }}>
              {r.kode && <span style={{ color: '#8c8c8c', marginRight: 6 }}>{r.kode}</span>}
              {r.nama || '—'}
              <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="green">
                {r.subCount} sub kegiatan
              </Tag>
            </div>
          );
        }
        if (r.level === 'subkegiatan') {
          return (
            <div style={{ fontSize: 12, color: '#595959' }}>
              {r.kode && <span style={{ marginRight: 4, fontWeight: 600 }}>{r.kode}</span>}
              {r.nama || '—'}
              <Tag style={{ marginLeft: 8, fontWeight: 400 }} color="purple">
                {r.rincianCount} rincian akun
              </Tag>
            </div>
          );
        }
        // level 'rincian' (leaf): tampilkan nama akun (kode rekening tidak lagi jadi kolom
        // terpisah supaya baris rincian tidak terlalu ramai)
        return (
          <div style={{ fontSize: 12, color: '#595959', paddingLeft: 4 }}>
            ↳ {r.nama_rekening || r.kode_rekening || 'Rincian akun'}
          </div>
        );
      },
    },
    {
      title: 'Anggaran',
      dataIndex: 'anggaran',
      key: 'anggaran',
      width: 150,
      align: 'right',
      render: (v, r) => (
        <span
          style={{
            fontWeight: r.level === 'rincian' ? 700 : 800,
            color: v > 0 ? '#0958d9' : '#bfbfbf',
            fontSize: 13,
          }}
        >
          {formatRupiah(v)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (v, r) => (r.level === 'rincian' ? <ApprovalStatusBadge status={v || 'DRAFT'} /> : null),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 260,
      align: 'center',
      render: (_, record) => {
        if (record.level !== 'rincian') return null;
        return (
          <Space size={4} wrap style={{ justifyContent: 'center' }}>
            <Tooltip title="Edit DPA">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EditOutlined />}
                disabled={record.approval_status === 'APPROVED'}
                onClick={() => navigate(`/dpa/form/${record.id}`)}
              />
            </Tooltip>
            <Tooltip title="Riwayat Approval">
              <Button
                size="small"
                type="text"
                icon={<HistoryOutlined />}
                onClick={() => setTimelineDoc(record)}
              />
            </Tooltip>
            <Tooltip title="Pergeseran Anggaran">
              <Button
                size="small"
                type="text"
                icon={<SwapOutlined style={{ color: '#fa8c16' }} />}
                onClick={() => navigate(`/dpa/${record.id}/pergeseran`)}
              />
            </Tooltip>
            <Tooltip title="Perubahan Anggaran">
              <Button
                size="small"
                type="text"
                icon={<FileSyncOutlined style={{ color: '#722ed1' }} />}
                onClick={() => navigate(`/dpa/${record.id}/perubahan`)}
              />
            </Tooltip>
            <Tooltip title="Cetak PDF">
              <Button
                size="small"
                type="text"
                icon={<PrinterOutlined style={{ color: '#1890ff' }} />}
                loading={loadingDl}
                onClick={() => handleCetakPdf(record)}
              />
            </Tooltip>
            <ApprovalActions
              entityType="dpa"
              entityId={record.id}
              currentStatus={record.approval_status || 'DRAFT'}
              userRole={userRole}
              onSuccess={fetchData}
            />
          </Space>
        );
      },
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Dashboard DPA</h1>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
            Dokumen Pelaksanaan Anggaran — Dinas Pangan Provinsi Maluku Utara
          </div>
        </div>
        <Space>
          <Tooltip title="Cetak rekap DPPA-SKPD (Setelah Perubahan) untuk OPD/Tahun sesuai filter saat ini">
            <Button
              icon={<DownloadOutlined />}
              loading={loadingDl}
              onClick={handleCetakDppaSkpd}
              style={{ color: '#13c2c2', borderColor: '#87e8de' }}
            >
              Cetak DPPA-SKPD
            </Button>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Ajukan lalu setujui otomatis semua DPA yang belum Disetujui (Draft/Diajukan → Disetujui) sesuai filter tabel saat ini">
              <Button
                icon={<CheckCircleOutlined />}
                loading={loadingBulkApprove}
                onClick={handleBulkApproveAll}
                style={{ color: '#389e0d', borderColor: '#b7eb8f' }}
              >
                {bulkApproveProgress
                  ? `Menyetujui ${bulkApproveProgress.done}/${bulkApproveProgress.total}...`
                  : 'Setujui Semua'}
              </Button>
            </Tooltip>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/dpa/form/new')}>
            Tambah DPA
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
          { label: 'Total DPA', value: activeData.length, color: '#1677ff' },
          {
            label: 'Draft',
            value: activeData.filter((r) => r.approval_status === 'DRAFT').length,
            color: '#d4b106',
          },
          {
            label: 'Disetujui',
            value: activeData.filter((r) => r.approval_status === 'APPROVED').length,
            color: '#389e0d',
          },
          {
            label: 'Total Anggaran',
            value: formatRupiah(totalAnggaranAktif),
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
          placeholder="Cari program / kegiatan / rekening..."
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
          {data.length} dari {activeData.length} rincian DPA
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
          rowKey="key"
          columns={columns}
          dataSource={treeData}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} program` }}
          expandable={{ defaultExpandAllRows: true, indentSize: 20 }}
          scroll={{ x: 900 }}
          size="middle"
          rowClassName={(record) => {
            if (record.level === 'program') return 'dpa-tree-program';
            if (record.level === 'kegiatan') return 'dpa-tree-kegiatan';
            if (record.level === 'subkegiatan') return 'dpa-tree-subkegiatan';
            return '';
          }}
          onRow={(record) => ({
            onMouseEnter: (e) => {
              if (record.level === 'rincian') e.currentTarget.style.background = '#f0f7ff';
            },
            onMouseLeave: (e) => {
              if (record.level === 'rincian') e.currentTarget.style.background = '';
            },
          })}
        />
      </div>

      <style>{`
        .dpa-tree-program td { background: #e6f4ff !important; border-top: 2px solid #91caff !important; }
        .dpa-tree-kegiatan td { background: #f6ffed !important; }
        .dpa-tree-subkegiatan td { background: #f9f0ff !important; }
      `}</style>

      <Drawer
        title={timelineDoc ? `Riwayat Approval — DPA #${timelineDoc.id}` : ''}
        open={!!timelineDoc}
        onClose={() => setTimelineDoc(null)}
        width={420}
      >
        {timelineDoc && <ApprovalTimeline entityType="dpa" entityId={timelineDoc.id} />}
      </Drawer>
    </div>
  );
};

export default DpaListPage;
