import React, { useEffect, useState } from 'react';
import { Table, Button, Dropdown, Space, Tag, Select, Input, Tooltip, Drawer, Modal, List } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import ApprovalActions from '../../../components/approval/ApprovalActions';
import ApprovalTimeline from '../../../components/approval/ApprovalTimeline';
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
  PrinterOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  FileSyncOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  getAllRka,
  deleteRka,
  importRkaPdf,
  importRkaPdfBatch,
  pemicuRevisiRka,
} from '../services/rkaApi';
import { approvalApi } from '../../../services/approvalApi';
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

// Tahapan berikutnya untuk tombol "Pergeseran" — satu langkah maju dari tahapan aktif.
// APBD_PERUBAHAN adalah tahapan akhir, tidak ada pergeseran setelahnya.
const NEXT_PERGESERAN_TAHAPAN = {
  APBD_INDUK: 'PERGESERAN_1',
  PERGESERAN_1: 'PERGESERAN_2',
};

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

// 7 formulir resmi RKA-SKPD sesuai standar SIPD — dipakai di submenu Cetak PDF/Word
// Formulir resmi RKA-SKPD sesuai Permendagri 77/2020 (Lampiran) & cetakan Aplikasi SIPD —
// bukan lagi kode SIPD lama "RKA-SKPD 1/2.1/2.2/2.2.1/3.1/3.2".
const FORMULIR_LIST = [
  { key: 'RKA-SKPD', label: 'RKA-SKPD — Ringkasan Anggaran Pendapatan, Belanja, Pembiayaan' },
  { key: 'RKA-PENDAPATAN SKPD', label: 'RKA-PENDAPATAN SKPD — Rincian Anggaran Pendapatan' },
  {
    key: 'REKAPITULASI RKA-BELANJA SKPD',
    label: 'Rekapitulasi RKA-BELANJA SKPD — Rekap Belanja per Program & Kegiatan',
  },
  {
    key: 'RKA-BELANJA SKPD',
    label: 'RKA-BELANJA SKPD — Rincian Belanja per Sub Kegiatan (Sebelum/Sesudah)',
  },
  {
    key: 'RKA-PEMBIAYAAN SKPD',
    label: 'RKA-PEMBIAYAAN SKPD — Rincian Penerimaan & Pengeluaran Pembiayaan (jika ada)',
  },
];

// Bandingkan kode rekening segmen-per-segmen secara numerik (2.09.01.02.0003 vs 2.09.01.1.02.0001)
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

// Urutan progres tahapan — dipakai untuk menentukan baris mana yang "aktif" (representasi
// anggaran TERKINI) saat satu sub kegiatan sudah punya riwayat multi-tahapan (Induk →
// Pergeseran → Perubahan), supaya rollup Anggaran Program/Kegiatan/Total tidak dobel-hitung
// nilai yang sama sebagai beberapa dokumen terpisah.
const TAHAPAN_RANK = { APBD_INDUK: 0, PERGESERAN_1: 1, PERGESERAN_2: 2, APBD_PERUBAHAN: 3 };
const pickMoreActive = (a, b) => {
  const rankA = TAHAPAN_RANK[a.tahapan] ?? 0;
  const rankB = TAHAPAN_RANK[b.tahapan] ?? 0;
  if (rankA !== rankB) return rankA > rankB ? a : b;
  const verA = Number(a.version || 1);
  const verB = Number(b.version || 1);
  if (verA !== verB) return verA > verB ? a : b;
  return Number(a.id) > Number(b.id) ? a : b;
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

const RkaListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role || '';
  const isAdmin = ADMIN_ROLES.includes(userRole);
  const [timelineDoc, setTimelineDoc] = useState(null);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingBatchImport, setLoadingBatchImport] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState(null); // null = modal tertutup
  const [loadingRevisiId, setLoadingRevisiId] = useState(null);
  const [loadingBulkApprove, setLoadingBulkApprove] = useState(false);
  const [bulkApproveProgress, setBulkApproveProgress] = useState(null); // {done, total} selama proses
  const [loadingGenerateDpa, setLoadingGenerateDpa] = useState(false);
  const [generateDpaProgress, setGenerateDpaProgress] = useState(null); // {done, total} selama proses
  const [importTahapan, setImportTahapan] = useState('APBD_INDUK');
  const fileInputRef = React.useRef(null);
  const batchFileInputRef = React.useRef(null);
  const [filterTahun, setFilterTahun] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

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

  // Urutkan mengikuti kode rekening (program → kegiatan → sub kegiatan), terlepas dari urutan input/import
  const sortedData = [...data].sort(
    (a, b) =>
      compareKodeRekening(a.kode_program, b.kode_program) ||
      compareKodeRekening(a.kode_kegiatan, b.kode_kegiatan) ||
      compareKodeRekening(a.kode_sub_kegiatan, b.kode_sub_kegiatan),
  );

  // Susun jadi pohon Program → Kegiatan → Sub Kegiatan → Tahapan (Induk/Pergeseran/Perubahan)
  // untuk tampilan nested cascading — riwayat tahapan sub kegiatan yang sama tidak lagi
  // menumpuk jadi baris terpisah, tapi dikelompokkan di bawah baris Sub Kegiatan-nya.
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
          const sortedRows = [...sk.rows].sort(
            (a, b) =>
              (TAHAPAN_RANK[a.tahapan] ?? 0) - (TAHAPAN_RANK[b.tahapan] ?? 0) ||
              Number(a.version || 1) - Number(b.version || 1) ||
              Number(a.id) - Number(b.id),
          );
          const active = sortedRows.reduce(
            (best, r) => (best ? pickMoreActive(best, r) : r),
            null,
          );
          return {
            key: sk.key,
            level: 'subkegiatan',
            kode: sk.kode,
            nama: sk.nama,
            anggaran: Number(active?.anggaran) || 0,
            activeTahapan: active?.tahapan,
            tahapanCount: sortedRows.length,
            children: sortedRows.map((r) => ({
              ...r,
              key: `rka-${r.id}`,
              level: 'tahapan',
              isActiveTahapan: r.id === active?.id,
            })),
          };
        });
        const kegAnggaran = subKegiatanList.reduce((s, sk) => s + sk.anggaran, 0);
        return {
          key: keg.key,
          level: 'kegiatan',
          kode: keg.kode,
          nama: keg.nama,
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
        anggaran: progAnggaran,
        kegiatanCount: kegiatanList.length,
        children: kegiatanList,
      };
    });
  })();

  // Kumpulkan key semua turunan sebuah node pohon (Program/Kegiatan/Sub Kegiatan) untuk
  // dicentang sekaligus — hanya tahapan yang AKTIF yang diikutkan (versi Induk/Pergeseran/
  // Perubahan yang sudah tidak berlaku tidak boleh ikut tercetak/terekspor).
  const collectDescendantKeys = (node) => {
    const keys = [];
    (node.children || []).forEach((child) => {
      if (child.level === 'tahapan') {
        if (child.isActiveTahapan) keys.push(child.key);
      } else {
        keys.push(child.key);
        keys.push(...collectDescendantKeys(child));
      }
    });
    return keys;
  };

  // Peta key -> node pohon, dipakai untuk menerjemahkan key yang tercentang (dari klik per-baris
  // MAUPUN checkbox "select all" di header, yang tidak melewati cascade khusus) menjadi id RKA nyata.
  const keyToNode = (() => {
    const map = new Map();
    const walk = (nodes) => {
      nodes.forEach((n) => {
        map.set(n.key, n);
        if (n.children) walk(n.children);
      });
    };
    walk(treeData);
    return map;
  })();

  // RKA yang dicentang di tabel (bisa lebih dari satu) — jadi target tombol Cetak/Ekspor di header.
  // Key non-tahapan (Program/Kegiatan/Sub Kegiatan) diterjemahkan ke seluruh tahapan aktif di bawahnya.
  const selectedRkaList = (() => {
    const idSet = new Set();
    selectedRowKeys.forEach((k) => {
      const node = keyToNode.get(k);
      if (!node) return;
      const leafKeys = node.level === 'tahapan' ? [node.key] : collectDescendantKeys(node);
      leafKeys.forEach((lk) => {
        const leaf = keyToNode.get(lk);
        if (leaf) idSet.add(leaf.id);
      });
    });
    return [...idSet].map((id) => allData.find((r) => r.id === id)).filter(Boolean);
  })();
  const selectedRka = selectedRkaList[0] || null;

  // Semua id RKA versi AKTIF (satu per Sub Kegiatan) sesuai filter tabel saat ini — dipakai
  // tombol "Generate DPA > Keseluruhan RKA" supaya tidak menggenerate DPA duplikat dari
  // riwayat tahapan lama (Pergeseran/Perubahan) pada Sub Kegiatan yang sama.
  const activeTahapanIds = (() => {
    const ids = [];
    const walk = (nodes) => {
      nodes.forEach((n) => {
        if (n.level === 'tahapan' && n.isActiveTahapan) ids.push(n.id);
        if (n.children) walk(n.children);
      });
    };
    walk(treeData);
    return ids;
  })();

  // Tahun unik untuk filter
  const tahunList = [...new Set(allData.map((r) => String(r.tahun)).filter(Boolean))].sort(
    (a, b) => b - a,
  );

  // Total Anggaran kartu ringkasan — hanya hitung tahapan AKTIF per sub kegiatan supaya
  // riwayat Induk/Pergeseran/Perubahan pada sub kegiatan yang sama tidak dobel-terhitung.
  const totalAnggaranAktif = (() => {
    const bySub = new Map();
    allData.forEach((r) => {
      const key = `${r.tahun}-${r.opd_id}-${r.sub_kegiatan}`;
      bySub.set(key, bySub.has(key) ? pickMoreActive(bySub.get(key), r) : r);
    });
    return [...bySub.values()].reduce((s, r) => s + (Number(r.anggaran) || 0), 0);
  })();

  // Cetak/ekspor gabungan lintas beberapa RKA sekaligus saat ini baru didukung untuk PDF
  // (digabung lewat pdf-lib di backend) — Word/Excel biner tidak semudah itu digabung,
  // jadi untuk format itu user diminta memilih 1 RKA saja.
  const BATCH_SUPPORTED_FORMATS = ['pdf'];

  const handleDownload = async (ids, format, formulir) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const isBatch = idList.length > 1;
    if (isBatch && !BATCH_SUPPORTED_FORMATS.includes(format)) {
      toast.warning(
        `Cetak/Ekspor gabungan untuk lebih dari 1 RKA saat ini baru didukung untuk format PDF. Centang 1 RKA saja untuk format ${format.toUpperCase()}, atau gunakan PDF.`,
      );
      return;
    }
    setLoadingDl(true);
    const BACKEND_URL = 'http://localhost:3000';
    const endpointMap = { pdf: 'export-pdf', xlsx: 'export-excel', docx: 'export-word' };
    try {
      const token = localStorage.getItem('token');
      const formulirQuery = formulir ? `formulir=${encodeURIComponent(formulir)}` : '';
      const url = isBatch
        ? `${BACKEND_URL}/api/rka/export-pdf-batch?ids=${idList.join(',')}${formulirQuery ? `&${formulirQuery}` : ''}`
        : `${BACKEND_URL}/api/rka/${idList[0]}/${endpointMap[format]}${formulirQuery ? `?${formulirQuery}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal mengunduh berkas');
      const blob = await res.blob();
      const dlUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      const suffix = formulir ? `_${formulir.replace(/[.\s]/g, '')}` : '';
      const idLabel = isBatch ? `Gabungan_${idList.length}dok` : idList[0];
      a.download = `RKA_${idLabel}${suffix}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(dlUrl);
      toast.success(
        `Berhasil mengunduh RKA (${format.toUpperCase()})${isBatch ? ` — ${idList.length} dokumen digabung` : ''}`,
      );
    } catch (e) {
      toast.error(e.message || 'Gagal mengunduh');
    } finally {
      setLoadingDl(false);
    }
  };

  const handleCetakFormulir = (format, formulirKey) => {
    if (!selectedRkaList.length) {
      toast.warning(
        'Pilih minimal 1 RKA dulu (centang baris Program/Kegiatan/Sub Kegiatan/Tahapan di tabel).',
      );
      return;
    }
    handleDownload(
      selectedRkaList.map((r) => r.id),
      format,
      formulirKey,
    );
  };

  const handleEksporFormat = (format) => {
    if (!selectedRkaList.length) {
      toast.warning(
        'Pilih minimal 1 RKA dulu (centang baris Program/Kegiatan/Sub Kegiatan/Tahapan di tabel).',
      );
      return;
    }
    handleDownload(
      selectedRkaList.map((r) => r.id),
      format,
    );
  };

  const buildFormulirMenuItems = (format) => [
    ...FORMULIR_LIST.map((f) => ({
      key: `${format}-${f.key}`,
      label: f.label,
      onClick: () => handleCetakFormulir(format, f.key),
    })),
    { type: 'divider' },
    {
      key: `${format}-full`,
      label: 'Dokumen Lengkap (semua formulir digabung)',
      onClick: () => handleCetakFormulir(format, null),
    },
  ];

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
      const res = await importRkaPdf(file, importTahapan);
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

  // Import banyak berkas PDF SIPD sekaligus ("Import Banyak Berkas") — tiap berkas
  // diproses independen di backend, jadi satu berkas gagal (mis. sudah pernah
  // diimpor) tidak menggagalkan berkas lain. Hasil per-berkas ditampilkan di modal
  // supaya user tahu persis mana yang berhasil/gagal dan kenapa.
  const handleImportBatchFile = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // reset supaya berkas yang sama bisa dipilih ulang
    if (!files.length) return;
    const nonPdf = files.filter((f) => f.type !== 'application/pdf');
    if (nonPdf.length) {
      toast.error(
        `${nonPdf.length} dari ${files.length} berkas yang dipilih bukan PDF. Pilih ulang, semua harus berformat PDF.`,
      );
      return;
    }
    setLoadingBatchImport(true);
    try {
      const res = await importRkaPdfBatch(files, importTahapan);
      setBatchImportResult(res.results || []);
      if (res.success) toast.success(res.message);
      else toast.warning(res.message);
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.error || err.message || 'Gagal mengimpor berkas secara massal.';
      toast.error(msg);
    } finally {
      setLoadingBatchImport(false);
    }
  };

  // Memicu pergeseran/perubahan RKA — clone RKA ke tahapan berikutnya (mesin
  // pemicuRevisi/cloneRkaToNextTahapan yang sudah ada di backend), lalu langsung
  // arahkan ke form edit supaya user menyesuaikan item belanja/indikator di sana.
  // Alasan resmi (change_reason_text) BELUM diminta di sini — baru diisi/di-generate
  // otomatis di form edit setelah penyesuaian selesai, supaya narasinya benar-benar
  // mencerminkan apa yang berubah (lihat tombol "Buatkan Narasi Otomatis").
  const handlePemicuRevisi = async (record, tahapanTujuan) => {
    const label = tahapanTujuan === 'APBD_PERUBAHAN' ? 'Perubahan' : 'Pergeseran';
    if (
      !window.confirm(
        `${label} RKA #${record.id} (${record.sub_kegiatan}) ke tahapan ${TAHAPAN_LABEL[tahapanTujuan]}?\n\nRincian belanja saat ini akan disalin ke tahapan baru, lalu Anda akan diarahkan ke form edit untuk menyesuaikan item belanja/indikator dan menyusun alasan resminya.`,
      )
    ) {
      return;
    }
    setLoadingRevisiId(record.id);
    try {
      const placeholderReason = `Draf ${label.toLowerCase()} tahapan ${TAHAPAN_LABEL[tahapanTujuan]} — menunggu penyesuaian rincian belanja/indikator dan penyusunan alasan resmi.`;
      const res = await pemicuRevisiRka(record.id, tahapanTujuan, placeholderReason);
      toast.success(res.message || `${label} berhasil dibuat, silakan lanjutkan penyesuaian di form edit.`);
      const newId = res?.data?.new_rka_id;
      if (newId) {
        navigate(`/rka/form/${newId}`);
      } else {
        fetchData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || `Gagal melakukan ${label.toLowerCase()}`);
    } finally {
      setLoadingRevisiId(null);
    }
  };

  // Setujui otomatis semua RKA yang belum Disetujui, sekaligus, tanpa perlu klik
  // Ajukan/Setujui satu-satu per baris — dorong tiap dokumen lewat alur approval yang
  // sama (submit lalu approve) sampai mencapai APPROVED. Hanya admin yang bisa approve
  // (dibatasi juga oleh backend), jadi tombol ini disembunyikan untuk role non-admin.
  const handleBulkApproveAll = async () => {
    const targets = data.filter((r) => r.approval_status && r.approval_status !== 'APPROVED');
    if (!targets.length) {
      toast.info('Tidak ada RKA yang perlu disetujui — semua sudah berstatus Disetujui.');
      return;
    }
    if (
      !window.confirm(
        `Setujui otomatis ${targets.length} RKA (Draft/Diajukan) sampai berstatus Disetujui?\n\nSetiap dokumen akan diajukan lalu disetujui satu per satu — proses ini tidak bisa dibatalkan di tengah jalan.`,
      )
    ) {
      return;
    }
    setLoadingBulkApprove(true);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const rka = targets[i];
      setBulkApproveProgress({ done: i, total: targets.length });
      try {
        if (rka.approval_status === 'DRAFT' || rka.approval_status === 'REJECTED') {
          await approvalApi.submit('rka', rka.id);
        }
        await approvalApi.approve('rka', rka.id);
        success++;
      } catch (err) {
        failed++;
        console.error(
          `Gagal memproses RKA #${rka.id}:`,
          err?.response?.data?.message || err.message,
        );
      }
    }
    setBulkApproveProgress(null);
    setLoadingBulkApprove(false);
    if (failed) {
      toast.warning(`${success} RKA berhasil disetujui, ${failed} gagal (lihat console).`);
    } else {
      toast.success(`${success} RKA berhasil diajukan & disetujui secara otomatis.`);
    }
    fetchData();
  };

  // Generate DPA dari sekumpulan RKA sekaligus — endpoint per-RKA yang sama dengan tombol
  // "Generate DPA dari RKA ini" di kolom Aksi (POST /api/dpa/generate-from-rka/:id), dipanggil
  // satu per satu. RKA yang sudah punya DPA aktif ditolak backend dgn 409 — dihitung sbg
  // "dilewati", bukan gagal, supaya tombol ini aman diklik berulang tanpa bikin duplikat.
  const handleGenerateDpaBulk = async (rkaIds) => {
    if (!rkaIds.length) {
      toast.warning('Tidak ada RKA yang bisa digenerate DPA-nya.');
      return;
    }
    if (
      !window.confirm(
        `Generate DPA untuk ${rkaIds.length} RKA?\n\nRKA yang sudah punya DPA akan otomatis dilewati.`,
      )
    ) {
      return;
    }
    setLoadingGenerateDpa(true);
    let success = 0;
    let skipped = 0;
    let failed = 0;
    const token = localStorage.getItem('token');
    for (let i = 0; i < rkaIds.length; i++) {
      setGenerateDpaProgress({ done: i, total: rkaIds.length });
      try {
        const res = await fetch(`http://localhost:3000/api/dpa/generate-from-rka/${rkaIds[i]}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        if (res.status === 409) skipped++;
        else if (json.success) success++;
        else {
          failed++;
          console.error(`Gagal generate DPA dari RKA #${rkaIds[i]}:`, json.message);
        }
      } catch (err) {
        failed++;
        console.error(`Gagal generate DPA dari RKA #${rkaIds[i]}:`, err.message);
      }
    }
    setGenerateDpaProgress(null);
    setLoadingGenerateDpa(false);
    toast[failed ? 'warning' : 'success'](
      `${success} DPA berhasil digenerate, ${skipped} dilewati (sudah ada DPA)${failed ? `, ${failed} gagal (lihat console)` : ''}.`,
    );
  };

  const handleGenerateDpaPerRka = () => {
    if (!selectedRkaList.length) {
      toast.warning(
        'Pilih minimal 1 RKA dulu (centang baris Program/Kegiatan/Sub Kegiatan/Tahapan di tabel).',
      );
      return;
    }
    handleGenerateDpaBulk(selectedRkaList.map((r) => r.id));
  };

  const handleGenerateDpaAll = () => {
    handleGenerateDpaBulk(activeTahapanIds);
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
        r.level === 'tahapan' ? (
          <Tag color="blue" style={{ fontWeight: 700 }}>
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
                {r.tahapanCount} tahapan
              </Tag>
            </div>
          );
        }
        // level 'tahapan' (leaf): info program/kegiatan/sub sudah tampil di baris induknya
        return (
          <div style={{ fontSize: 11, color: '#bfbfbf', paddingLeft: 4 }}>
            ↳ {r.isActiveTahapan ? 'Versi aktif saat ini' : 'Riwayat tahapan sebelumnya'}
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
            fontWeight: r.level === 'tahapan' ? 700 : 800,
            color: v > 0 ? '#0958d9' : '#bfbfbf',
            fontSize: 13,
          }}
        >
          {formatRupiah(v)}
        </span>
      ),
    },
    {
      title: 'Tahapan',
      dataIndex: 'tahapan',
      key: 'tahapan',
      width: 130,
      align: 'center',
      render: (v, r) => {
        if (r.level === 'subkegiatan') {
          return (
            <Tag color="purple" style={{ fontSize: 11 }}>
              Aktif: {TAHAPAN_LABEL[r.activeTahapan] || 'APBD Induk'}
            </Tag>
          );
        }
        if (r.level !== 'tahapan') return null;
        return (
          <Space size={4}>
            <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
              {TAHAPAN_LABEL[v] || v || 'APBD Induk'}
            </Tag>
            {r.isActiveTahapan && (
              <Tag color="green" style={{ fontSize: 10, margin: 0 }}>
                Aktif
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (v, r) => {
        if (r.level !== 'tahapan') return null;
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
      render: (v, r) =>
        r.level === 'tahapan' ? (
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>v{v ?? 1}</span>
        ) : null,
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 300,
      align: 'center',
      render: (_, record) => {
        if (record.level !== 'tahapan') return null;
        return (
          <Space size={4} wrap style={{ justifyContent: 'center' }}>
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
            <Tooltip
              title={
                record.approval_status !== 'APPROVED'
                  ? 'RKA harus berstatus Disetujui dulu sebelum bisa digeser'
                  : NEXT_PERGESERAN_TAHAPAN[record.tahapan]
                    ? `Pergeseran ke ${TAHAPAN_LABEL[NEXT_PERGESERAN_TAHAPAN[record.tahapan]]}`
                    : 'Sudah di tahapan akhir, tidak bisa digeser lagi'
              }
            >
              <Button
                size="small"
                type="text"
                icon={<SwapOutlined style={{ color: '#fa8c16' }} />}
                loading={loadingRevisiId === record.id}
                disabled={
                  record.approval_status !== 'APPROVED' || !NEXT_PERGESERAN_TAHAPAN[record.tahapan]
                }
                onClick={() => handlePemicuRevisi(record, NEXT_PERGESERAN_TAHAPAN[record.tahapan])}
              />
            </Tooltip>
            <Tooltip
              title={
                record.approval_status !== 'APPROVED'
                  ? 'RKA harus berstatus Disetujui dulu sebelum bisa diubah'
                  : record.tahapan === 'APBD_PERUBAHAN'
                    ? 'Sudah di tahapan APBD Perubahan'
                    : 'Perubahan ke APBD Perubahan'
              }
            >
              <Button
                size="small"
                type="text"
                icon={<FileSyncOutlined style={{ color: '#722ed1' }} />}
                loading={loadingRevisiId === record.id}
                disabled={record.approval_status !== 'APPROVED' || record.tahapan === 'APBD_PERUBAHAN'}
                onClick={() => handlePemicuRevisi(record, 'APBD_PERUBAHAN')}
              />
            </Tooltip>
            <Tooltip title="Generate DPA dari RKA ini">
              <Button
                size="small"
                type="text"
                icon={<ThunderboltOutlined />}
                onClick={async () => {
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
                }}
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
            <ApprovalActions
              entityType="rka"
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
          <input
            ref={batchFileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleImportBatchFile}
          />
          <Tooltip
            title={
              selectedRkaList.length > 1
                ? `${selectedRkaList.length} RKA terpilih — PDF akan digabung jadi 1 berkas; untuk Word centang 1 RKA saja`
                : selectedRka
                  ? `Cetak tahapan terpilih: ${TAHAPAN_LABEL[selectedRka.tahapan] || 'APBD Induk'}`
                  : 'Centang minimal 1 baris tahapan di tabel dulu, baru pilih formulir untuk dicetak'
            }
          >
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'pdf', label: 'PDF', children: buildFormulirMenuItems('pdf') },
                  { key: 'docx', label: 'Word', children: buildFormulirMenuItems('docx') },
                ],
              }}
            >
              <Button icon={<PrinterOutlined />} loading={loadingDl}>
                Cetak <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          </Tooltip>
          <Tooltip
            title={
              selectedRkaList.length > 1
                ? `${selectedRkaList.length} RKA terpilih — Ekspor Word/Excel saat ini hanya untuk 1 RKA, gunakan Cetak PDF untuk gabungan`
                : selectedRka
                  ? `Ekspor tahapan terpilih: ${TAHAPAN_LABEL[selectedRka.tahapan] || 'APBD Induk'}`
                  : 'Centang minimal 1 baris tahapan di tabel dulu, baru pilih format untuk diekspor'
            }
          >
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'ekspor-word',
                    label: '📝 Ekspor Word (dokumen lengkap)',
                    onClick: () => handleEksporFormat('docx'),
                  },
                  {
                    key: 'ekspor-xlsx',
                    label: '📊 Ekspor Excel (dokumen lengkap)',
                    onClick: () => handleEksporFormat('xlsx'),
                  },
                ],
              }}
            >
              <Button icon={<DownloadOutlined />} loading={loadingDl}>
                Ekspor <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          </Tooltip>
          {isAdmin && (
            <Tooltip
              title={
                generateDpaProgress
                  ? `Menggenerate DPA ${generateDpaProgress.done}/${generateDpaProgress.total}...`
                  : 'Generate DPA dari RKA — Per RKA (centang di tabel) atau Keseluruhan RKA (semua sesuai filter tabel)'
              }
            >
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'dpa-per-rka',
                      label: `Per RKA (${selectedRkaList.length} tercentang)`,
                      onClick: handleGenerateDpaPerRka,
                    },
                    {
                      key: 'dpa-all',
                      label: `Keseluruhan RKA (${activeTahapanIds.length} RKA)`,
                      onClick: handleGenerateDpaAll,
                    },
                  ],
                }}
              >
                <Button icon={<ThunderboltOutlined />} loading={loadingGenerateDpa}>
                  {generateDpaProgress
                    ? `Generate DPA ${generateDpaProgress.done}/${generateDpaProgress.total}...`
                    : (
                      <>
                        Generate DPA <DownOutlined style={{ fontSize: 10 }} />
                      </>
                    )}
                </Button>
              </Dropdown>
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip title="Ajukan lalu setujui otomatis semua RKA yang belum Disetujui (Draft/Diajukan → Disetujui) sesuai filter tabel saat ini">
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
          <Button icon={<SettingOutlined />} onClick={() => navigate('/tapd-setting')}>
            TAPD
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => navigate('/pejabat-penandatangan-setting')}
          >
            Pejabat
          </Button>
          <Tooltip title="Pilih tahapan yang direpresentasikan PDF ini sebelum mengunggah — biarkan APBD Induk kalau ini input murni">
            <Select
              value={importTahapan}
              onChange={setImportTahapan}
              style={{ width: 150 }}
              options={Object.entries(TAHAPAN_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Tooltip>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'import-single',
                  label: 'Import 1 Berkas',
                  onClick: () => fileInputRef.current?.click(),
                },
                {
                  key: 'import-batch',
                  label: 'Import Banyak Berkas Sekaligus',
                  onClick: () => batchFileInputRef.current?.click(),
                },
              ],
            }}
          >
            <Button icon={<UploadOutlined />} loading={loadingImport || loadingBatchImport}>
              Import PDF SIPD <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>
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
          rowKey="key"
          columns={columns}
          dataSource={treeData}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} program` }}
          expandable={{ defaultExpandAllRows: true, indentSize: 20 }}
          rowSelection={{
            type: 'checkbox',
            checkStrictly: true,
            selectedRowKeys,
            onSelect: (record, selected) => {
              const keys = [record.key, ...collectDescendantKeys(record)];
              setSelectedRowKeys((prev) => {
                const set = new Set(prev);
                keys.forEach((k) => (selected ? set.add(k) : set.delete(k)));
                return Array.from(set);
              });
            },
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 900 }}
          size="middle"
          rowClassName={(record) => {
            if (record.level === 'program') return 'rka-tree-program';
            if (record.level === 'kegiatan') return 'rka-tree-kegiatan';
            if (record.level === 'subkegiatan') return 'rka-tree-subkegiatan';
            return '';
          }}
          onRow={(record) => ({
            onMouseEnter: (e) => {
              if (record.level === 'tahapan') e.currentTarget.style.background = '#f0f7ff';
            },
            onMouseLeave: (e) => {
              if (record.level === 'tahapan') e.currentTarget.style.background = '';
            },
          })}
        />
      </div>

      <style>{`
        .rka-tree-program td { background: #e6f4ff !important; border-top: 2px solid #91caff !important; }
        .rka-tree-kegiatan td { background: #f6ffed !important; }
        .rka-tree-subkegiatan td { background: #f9f0ff !important; }
      `}</style>

      <Drawer
        title={timelineDoc ? `Riwayat Approval — RKA #${timelineDoc.id}` : ''}
        open={!!timelineDoc}
        onClose={() => setTimelineDoc(null)}
        width={420}
      >
        {timelineDoc && <ApprovalTimeline entityType="rka" entityId={timelineDoc.id} />}
      </Drawer>

      <Modal
        title="Hasil Import Banyak Berkas PDF SIPD"
        open={!!batchImportResult}
        onCancel={() => setBatchImportResult(null)}
        onOk={() => setBatchImportResult(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="Tutup"
        width={640}
      >
        {batchImportResult && (
          <>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#595959' }}>
              {batchImportResult.filter((r) => r.success).length} dari {batchImportResult.length}{' '}
              berkas berhasil diimpor.
            </div>
            <List
              size="small"
              bordered
              dataSource={batchImportResult}
              renderItem={(r) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{r.filename}</span>
                      <Tag color={r.success ? 'success' : 'error'}>
                        {r.success ? 'Berhasil' : 'Gagal'}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: r.success ? '#595959' : '#cf1322' }}>
                      {r.success
                        ? `${r.data?.sub_kegiatan || ''} — RKA #${r.id}, anggaran ${formatRupiah(r.data?.anggaran)}`
                        : r.error}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default RkaListPage;
