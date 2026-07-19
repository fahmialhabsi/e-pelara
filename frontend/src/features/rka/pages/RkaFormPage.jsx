// File: frontend/src/features/rka/pages/RkaFormPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Spin,
  Alert,
  Input,
  Select,
  Typography,
  Tag,
  Divider,
  Collapse,
  Modal,
  Form,
  Table,
  Tooltip,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  DeleteOutlined,
  SettingOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  EditOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FileTextOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  getLevelKode,
  indentLevel,
  getParentKode,
  isParent,
  isVisible,
} from '../utils/rekeningHierarchy';
import { toast } from 'react-toastify';
import {
  getRkaById,
  createRka,
  updateRka,
  getRkaAudit,
  getOpdDropdown,
  getRenjaByOpd,
  getRenjaDokumenByOpd,
  getIndikatorProgramByKode,
  getIndikatorKegiatanByKode,
  getMasterSubKegiatanByKode,
  generateRkaIndikator,
} from '../services/rkaApi';
import {
  createDefaultKoefisien,
  hitungVolumeHasil,
  hitungJumlah,
  formatSatuanGabungan,
  tambahKoefisien,
  hapusKoefisien,
  updateKoefisien,
} from '../utils/koefisienHelper';
import { usePeriodeAktif } from '../../rpjmd/hooks/usePeriodeAktif';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import { canRestorePlanningDocumentVersion } from '../../../utils/roleUtils';
import PlanningAuditSection from '../../planning-audit/components/PlanningAuditSection';
import MasterRekeningCascading from '../../../shared/components/MasterRekeningCascading';
import MasterBelanjaCascading from '../../../shared/components/MasterBelanjaCascading';
import KoefisienEditor from '../components/KoefisienEditor';
import { buildHierarchy } from '../utils/buildHierarchy';
import { isVisibleRow } from '../utils/rekeningVisibility';
import { buildHierarchyNodes } from '../utils/buildHierarchyNodes';
import refreshHierarchy from '../utils/refreshHierarchy';
import { buildVisibleRows } from '../utils/treeVisibility';
import canDragItem from '../utils/canDragItem';
import createDragPayload from '../utils/createDragPayload';
import canDropItem from '../utils/canDropItem';
import reorderItem from '../utils/reorderItem';

const { TextArea } = Input;

// State modal TAPD untuk cetak RKA-BELANJA
const TAPD_EMPTY = [
  { nama: '', nip: '', jabatan: 'Ketua TAPD' },
  { nama: '', nip: '', jabatan: 'Anggota' },
  { nama: '', nip: '', jabatan: 'Anggota' },
];
const { Text } = Typography;

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);

// Parse angka format Indonesia: "5.970.000,00" -> 5970000; juga terima format polos "5970000"
const parseAngkaID = (str) => {
  if (str == null) return 0;
  const s = String(str).trim();
  if (!s) return 0;
  // Hapus semua kecuali digit, titik, koma
  const cleaned = s.replace(/[^0-9.,]/g, '');
  // Jika ada koma, anggap koma = desimal, titik = ribuan
  if (cleaned.includes(',')) {
    const withoutThousand = cleaned.replace(/\./g, '').replace(',', '.');
    return Number(withoutThousand) || 0;
  }
  // Tanpa koma: kalau ada titik dengan pola ribuan (xxx.xxx.xxx), anggap pemisah ribuan
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, '')) || 0;
  }
  return Number(cleaned) || 0;
};

// "-" adalah konvensi placeholder SIPD utk field yg belum diisi di dokumen sumber
// (bukan nilai sungguhan) — anggap sama dgn kosong saat menentukan perlu auto-fill atau tidak.
function isIndikatorKosong(v) {
  const s = String(v ?? '').trim();
  return s === '' || s === '-' || s === '--';
}

// Pilih target_tahun_N dari indikator Renstra sesuai posisi tahun form terhadap
// tahun_awal periode RPJMD aktif (idx 1-6) — sama seperti logika di handleMasterRekening,
// diekstrak jadi fungsi murni supaya bisa dipakai ulang saat auto-fill di Edit mode
// (di titik itu form.tahun/form.periode_id di state React belum tentu ter-update).
function computeTargetTahunValue(ind, tahun, periodeId, periodeList) {
  let targetVal = ind.target_tahun_1;
  const periodeAktif = (periodeList || []).find((p) => String(p.id) === String(periodeId));
  const tahunAwalAktif = periodeAktif?.tahun_awal;
  if (tahunAwalAktif && tahun) {
    const idx = Number(tahun) - Number(tahunAwalAktif) + 1;
    if (idx >= 1 && idx <= 6) {
      targetVal = ind[`target_tahun_${idx}`] ?? targetVal;
    }
  }
  return targetVal;
}

const SUMBER_DANA_OPTIONS = [
  { value: 'PAD', label: 'PAD' },
  { value: 'DAU', label: 'DAU' },
  { value: 'DAK Fisik', label: 'DAK Fisik' },
  { value: 'DAK Non Fisik', label: 'DAK Non Fisik' },
  { value: 'DBH', label: 'DBH' },
];

const BULAN_OPTIONS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function buildPayload(form) {
  const p = {
    tahun: String(form.tahun || '').trim(),
    periode_id: Number(form.periode_id),

    program: form.program?.nama_program || '',
    kode_program: form.program?.kode_program || '',
    kegiatan: form.kegiatan?.nama_kegiatan || '',
    kode_kegiatan: form.kegiatan?.kode_kegiatan || '',
    sub_kegiatan: form.sub_kegiatan?.nama_sub_kegiatan || '',
    kode_sub_kegiatan: form.sub_kegiatan?.kode_sub_kegiatan || '',

    indikator: form.keluaran || (form.indikator != null ? String(form.indikator) : ''),
    target: form.target_keluaran || (form.target != null ? String(form.target) : ''),
    jenis_dokumen: form.jenis_dokumen || 'RKA',
    capaian_program: form.capaian_program || null,
    target_capaian: form.target_capaian || null,
    satuan_capaian: form.satuan_capaian || null,
    masukan: form.masukan || null,
    keluaran: form.keluaran || null,
    target_keluaran: form.target_keluaran || null,
    satuan_keluaran: form.satuan_keluaran || null,
    hasil: form.hasil || null,
    target_hasil: form.target_hasil || null,
    satuan_hasil: form.satuan_hasil || null,
    waktu_mulai: form.waktu_mulai || null,
    waktu_selesai: form.waktu_selesai || null,
    lokasi: form.lokasi || null,

    // 🔥 FIX UTAMA DI SINI
    // Buang baris folder struktural (Akun/Kelompok/Jenis/Objek/Rincian) hasil
    // buildHierarchy() — itu bukan item belanja asli (tidak punya harga_satuan/
    // sumber_dana sungguhan), cuma dipakai utk tampilan tree di UI.
    rincian_belanja: (form.rincian_belanja || [])
      .filter((item) => !item.is_group)
      .map((item) => ({
      ...item,
      spesifikasi: item.spesifikasi || '',
      ppn: Number(item.ppn || 0),

      nilai_ppn: Number(item.nilai_ppn || 0),

      total_setelah_ppn: Number(item.total_setelah_ppn || item.jumlah || 0),
      volume_hasil: Number(item.volume_hasil ?? item.volume) || 1,

      koefisien_array: Array.isArray(item.koefisien_array)
        ? item.koefisien_array.map((k) => ({
            volume: Number(k.volume) || 1,
            satuan: String(k.satuan || '').trim(),
          }))
        : [
            {
              volume: Number(item.volume) || 1,
              satuan: String(item.satuan || 'unit').trim(),
            },
          ],
    })),
  };

  if (form.anggaran === '' || form.anggaran == null || Number.isNaN(Number(form.anggaran))) {
    p.anggaran = null;
  } else {
    p.anggaran = Number(form.anggaran);
  }

  if (form.opd_id !== '' && form.opd_id != null && !Number.isNaN(Number(form.opd_id))) {
    p.opd_id = Number(form.opd_id);
  }

  if (form.renja_id !== '' && form.renja_id != null && !Number.isNaN(Number(form.renja_id))) {
    p.renja_id = Number(form.renja_id);
  }

  if (form.rpjmd_id !== '' && form.rpjmd_id != null && !Number.isNaN(Number(form.rpjmd_id))) {
    p.rpjmd_id = Number(form.rpjmd_id);
  }

  return p;
}

// ── Seksi Header ─────────────────────────────────────────────────────────────
const SeksiHeader = ({ nomor, label, sub, children, extra }) => (
  <div
    style={{
      background: '#fff',
      border: '1px solid #e8e8e8',
      borderRadius: 8,
      marginBottom: 16,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        background: '#f5f8ff',
        borderBottom: '1px solid #e8e8e8',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            background: '#1677ff',
            color: '#fff',
            borderRadius: 4,
            padding: '2px 9px',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {nomor}
        </span>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#262626' }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: '#8c8c8c' }}>{sub}</span>}
      </div>
      {extra}
    </div>
    <div style={{ padding: '16px 20px' }}>{children}</div>
  </div>
);

const FieldLabel = ({ children, required }) => (
  <div style={{ fontSize: 12, color: '#595959', marginBottom: 4, fontWeight: 500 }}>
    {children}
    {required && <span style={{ color: '#ff4d4f', marginLeft: 2 }}>*</span>}
  </div>
);

const RkaFormPage = () => {
  const { id } = useParams();
  const [modalTapd, setModalTapd] = useState(false);
  const [tapdList, setTapdList] = useState(TAPD_EMPTY);
  const [cetakLoading, setCetakLoading] = useState({ full: false, belanja: false });
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new' || !id;
  const { tahun, periode_id, periodeList, loading: periodeLoading } = usePeriodeAktif();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({
    tahun: '',
    periode_id: '',
    opd_id: '',
    renja_id: '',
    renja_dokumen_id: '',
    rpjmd_id: '',
    program: null,
    kegiatan: null,
    sub_kegiatan: null,
    // Indikator & Tolok Ukur Kinerja (Permendagri 77/2020)
    indikator: '', // keluaran sub kegiatan
    target: '', // target keluaran
    capaian_program: '',
    target_capaian: '',
    satuan_capaian: '',

    // ===== BARU =====
    capaian_kegiatan: '',
    target_capaian_kegiatan: '',
    satuan_capaian_kegiatan: '',
    keluaran: '', // output sub kegiatan
    target_keluaran: '',
    satuan_keluaran: '',
    hasil: '', // outcome kegiatan
    target_hasil: '',
    // Waktu & Lokasi
    waktu_mulai: 'Januari',
    waktu_selesai: 'Desember',
    lokasi: '',
    // Rincian
    anggaran: '',
    rincian_belanja: null,
    jenis_dokumen: 'RKA',
  });
  const [changeReasonText, setChangeReasonText] = useState('');
  const [changeReasonFile, setChangeReasonFile] = useState('');
  const [auditRows, setAuditRows] = useState([]);
  const [opdOptions, setOpdOptions] = useState([]);
  const [renjaOptions, setRenjaOptions] = useState([]);
  const [loadingRenja, setLoadingRenja] = useState(false);
  const [rpjmdOptions, setRpjmdOptions] = useState([]);
  const [allowedKodeProgram, setAllowedKodeProgram] = useState([]);
  const [renjaItems, setRenjaItems] = useState([]);
  const [opdId, setOpdId] = useState('');
  const [selectedRekening, setSelectedRekening] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [koefModalOpen, setKoefModalOpen] = useState(false);

  const [editingKoefRow, setEditingKoefRow] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOverKode, setDragOverKode] = useState(null);

  useEffect(() => {
    const tahun = form?.tahun || new Date().getFullYear();
    api
      .get(`/tapd?tahun=${tahun}`)
      .then((res) => {
        const data = res.data?.data || [];
        if (data.length > 0) {
          setTapdList(data.map((t) => ({ nama: t.nama, nip: t.nip, jabatan: t.jabatan })));
        }
      })
      .catch(() => {});
  }, [form?.tahun]);

  useEffect(() => {
    if (form.opd_id !== opdId) setOpdId(form.opd_id || '');
  }, [form.opd_id]);
  useEffect(() => {
    api
      .get('/periode-rpjmd')
      .then((res) => setRpjmdOptions(res.data?.data || []))
      .catch(console.error);
  }, []);

  const periodeOptions = useMemo(
    () =>
      (periodeList || []).map((p) => ({
        id: p.id,
        nama: p.nama || `${p.tahun_awal}–${p.tahun_akhir}`,
      })),
    [periodeList],
  );

  const loadAudit = useCallback(async (rid) => {
    try {
      const rows = await getRkaAudit(rid);
      setAuditRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Auto-fill baris Capaian Program / Capaian Kegiatan / Hasil di Seksi 3 saat
  // Edit RKA — pakai alur/logika yang sama dgn handleMasterRekening (dipicu saat
  // pilih Program/Kegiatan/Sub Kegiatan lewat cascading), tapi dijalankan otomatis
  // di sini karena cascading TIDAK dirender lagi di Edit mode (Sub Kegiatan terkunci).
  // Hanya isi field yang masih kosong — tidak menimpa nilai yang sudah ada/diedit manual.
  const autoFillMissingIndikator = useCallback(
    async (data) => {
      const kodeProgram = data.program?.kode_program;
      const kodeKegiatan = data.kegiatan?.kode_kegiatan;
      const kodeSubKegiatan = data.sub_kegiatan?.kode_sub_kegiatan;

      if (kodeProgram && isIndikatorKosong(data.capaian_program)) {
        try {
          const ind = await getIndikatorProgramByKode(kodeProgram);
          if (ind) {
            const targetVal = computeTargetTahunValue(ind, data.tahun, data.periode_id, periodeList);
            setForm((prev) => ({
              ...prev,
              capaian_program: isIndikatorKosong(prev.capaian_program)
                ? ind.nama_indikator || prev.capaian_program
                : prev.capaian_program,
              target_capaian: isIndikatorKosong(prev.target_capaian)
                ? (targetVal != null ? String(parseFloat(targetVal)) : prev.target_capaian)
                : prev.target_capaian,
              satuan_capaian: isIndikatorKosong(prev.satuan_capaian)
                ? ind.satuan || prev.satuan_capaian
                : prev.satuan_capaian,
            }));
          }
        } catch (e) {
          console.error('Auto-fill Capaian Program gagal:', e);
        }
      }

      if (kodeKegiatan && isIndikatorKosong(data.capaian_kegiatan)) {
        try {
          const ind = await getIndikatorKegiatanByKode(kodeKegiatan);
          if (ind) {
            const targetVal = computeTargetTahunValue(ind, data.tahun, data.periode_id, periodeList);
            setForm((prev) => ({
              ...prev,
              capaian_kegiatan: isIndikatorKosong(prev.capaian_kegiatan)
                ? ind.nama_indikator || prev.capaian_kegiatan
                : prev.capaian_kegiatan,
              target_capaian_kegiatan: isIndikatorKosong(prev.target_capaian_kegiatan)
                ? (targetVal != null ? String(parseFloat(targetVal)) : prev.target_capaian_kegiatan)
                : prev.target_capaian_kegiatan,
              satuan_capaian_kegiatan: isIndikatorKosong(prev.satuan_capaian_kegiatan)
                ? ind.satuan || prev.satuan_capaian_kegiatan
                : prev.satuan_capaian_kegiatan,
            }));
          }
        } catch (e) {
          console.error('Auto-fill Capaian Kegiatan gagal:', e);
        }
      }

      if (kodeSubKegiatan && isIndikatorKosong(data.hasil)) {
        try {
          const sub = await getMasterSubKegiatanByKode(kodeSubKegiatan);
          if (sub?.kinerja) {
            setForm((prev) => ({
              ...prev,
              hasil: isIndikatorKosong(prev.hasil) ? sub.kinerja : prev.hasil,
            }));
          }
        } catch (e) {
          console.error('Auto-fill Hasil gagal:', e);
        }
      }

      // Masukan: konvensi teks tetap yang sudah dipakai di alur cascading
      // (handleMasterRekening) & prompt Auto Generate — "Dana yang dibutuhkan".
      // Murni sinkron, tidak perlu panggilan API.
      if (isIndikatorKosong(data.masukan)) {
        setForm((prev) => ({
          ...prev,
          masukan: isIndikatorKosong(prev.masukan) ? 'Dana yang dibutuhkan' : prev.masukan,
        }));
      }

      // Target/Satuan Hasil: alur cascading yang sudah ada (handleMasterRekening)
      // selalu menyamakan target_hasil/satuan_hasil dgn target_keluaran/satuan_keluaran
      // (sama-sama dari Renja item yang cocok) — cerminkan itu di sini juga, dari
      // data yang sudah ter-load (bukan panggilan API baru).
      if (isIndikatorKosong(data.target_hasil) && !isIndikatorKosong(data.target_keluaran)) {
        setForm((prev) => ({
          ...prev,
          target_hasil: isIndikatorKosong(prev.target_hasil) ? prev.target_keluaran : prev.target_hasil,
        }));
      }
      if (isIndikatorKosong(data.satuan_hasil) && !isIndikatorKosong(data.satuan_keluaran)) {
        setForm((prev) => ({
          ...prev,
          satuan_hasil: isIndikatorKosong(prev.satuan_hasil) ? prev.satuan_keluaran : prev.satuan_hasil,
        }));
      }
    },
    [periodeList],
  );

  const loadExisting = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setLoadError(null);
    try {
      const row = await getRkaById(id);
      if (!row || typeof row !== 'object') throw new Error('Data RKA tidak valid');

      console.log('DATA RINCIAN DARI BACKEND', row.rincian_belanja || row.rincianBelanja);

      const next = {
        tahun: String(row.tahun ?? ''),
        periode_id: row.periode_id != null ? String(row.periode_id) : '',
        opd_id: row.opd_id != null ? String(row.opd_id) : '',
        program: row.program
          ? {
              nama_program: row.program,
              kode_program: row.kode_program || '',
            }
          : null,
        kegiatan: row.kegiatan
          ? {
              nama_kegiatan: row.kegiatan,
              kode_kegiatan: row.kode_kegiatan || '',
            }
          : null,
        sub_kegiatan: row.sub_kegiatan
          ? {
              nama_sub_kegiatan: row.sub_kegiatan,
              kode_sub_kegiatan: row.kode_sub_kegiatan || '',
            }
          : null,
        indikator: row.indikator ?? '',
        target: row.target ?? '',
        capaian_program: row.capaian_program ?? '',
        target_capaian: row.target_capaian ?? '',
        masukan: row.masukan ?? '',
        keluaran: row.keluaran ?? '',
        target_keluaran: row.target_keluaran ?? '',
        satuan_keluaran: row.satuan_keluaran ?? '',
        satuan_capaian: row.satuan_capaian ?? '',

        capaian_kegiatan: row.capaian_kegiatan ?? '',
        target_capaian_kegiatan: row.target_capaian_kegiatan ?? '',
        satuan_capaian_kegiatan: row.satuan_capaian_kegiatan ?? '',

        satuan_hasil: row.satuan_hasil ?? '',
        hasil: row.hasil ?? '',
        target_hasil: row.target_hasil ?? '',
        waktu_mulai: row.waktu_mulai ?? 'Januari',
        waktu_selesai: row.waktu_selesai ?? 'Desember',
        lokasi: row.lokasi ?? '',
        anggaran: row.anggaran != null ? row.anggaran : '',

        rincian_belanja: refreshHierarchy(
          buildHierarchy(
            (row.rincian_belanja || row.rincianBelanja || []).map((item) => ({
              ...item,

              id_temp: item.id_temp || Date.now() + Math.random(),

              spesifikasi: item.spesifikasi || '',

              volume_hasil: Number(item.volume_hasil ?? item.volume) || 1,

              volume: Number(item.volume_hasil ?? item.volume) || 1,

              jumlah: Number(item.jumlah || 0),

              ppn: Number(item.ppn || 0),

              nilai_ppn: Number(item.nilai_ppn || 0),

              total_setelah_ppn: Number(item.total_setelah_ppn || item.jumlah || 0),

              koefisien_array: Array.isArray(item.koefisien_array)
                ? item.koefisien_array
                : createDefaultKoefisien(item.satuan),

              is_group: false,

              level_rekening: getLevelKode(item.kode_rekening),

              parent_kode: item.parent_kode || getParentKode(item.kode_rekening),
            })),
          ),
        ),
        jenis_dokumen: row.jenis_dokumen ?? 'RKA',
        renja_id: row.renja_id != null ? String(row.renja_id) : '',
      };

      console.table(
        next.rincian_belanja.map((r) => ({
          kode: r.kode_rekening,
          level: r.level_rekening,
          group: r.is_group,
          parent: r.parent_kode,
          uraian: r.uraian,
          nama: r.nama_rekening,
          jumlah: r.jumlah,
        })),
      );

      setForm(next);
      autoFillMissingIndikator(next);

      const firstItem = next.rincian_belanja.find((r) => !r.is_group);

      if (firstItem) {
        setSelectedRekening({
          kode_rekening: firstItem.kode_rekening,
          uraian: firstItem.nama_rekening,
          satuan: firstItem.satuan,
          kode_parent: firstItem.parent_kode,
        });
      }

      setOpdId(next.opd_id || '');
      // Auto-fill alasan default saat edit
      setChangeReasonText('Perbarui RKA');
      setChangeReasonFile('');
      // Auto-fill Periode RPJMD jika ada rpjmd_id
      // (sudah di-handle via form.rpjmd_id)
      await loadAudit(id);
    } catch (e) {
      console.error(e);
      setLoadError(e.message || 'Gagal memuat RKA');
      toast.error('Gagal memuat data RKA');
    } finally {
      setLoading(false);
    }
  }, [id, isNew, loadAudit, autoFillMissingIndikator]);

  const handleDropItem = useCallback(
    (targetItem) => {
      if (!draggingItem) return;

      if (draggingItem.item?.parent_kode !== targetItem.parent_kode) {
        setDraggingItem(null);
        setDragOverKode(null);
        return;
      }

      setForm((prev) => {
        const fromIndex = prev.rincian_belanja.findIndex((r) => r.id_temp === draggingItem.id_temp);

        const toIndex = prev.rincian_belanja.findIndex((r) => r.id_temp === targetItem.id_temp);

        if (fromIndex < 0 || toIndex < 0) {
          return prev;
        }

        const updated = reorderItem(prev.rincian_belanja || [], fromIndex, toIndex);

        return {
          ...prev,
          rincian_belanja: refreshHierarchy(updated),
        };
      });

      setDraggingItem(null);
      setDragOverKode(null);
    },
    [draggingItem],
  );

  useEffect(() => {
    if (isNew) {
      setForm((f) => ({
        ...f,
        tahun: tahun ? String(tahun) : String(new Date().getFullYear()),
        periode_id: periode_id != null ? String(periode_id) : '',
      }));
      setOpdId('');
      setAuditRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    loadExisting();
  }, [isNew, tahun, periode_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadOpd = async () => {
      try {
        const rows = await getOpdDropdown();
        setOpdOptions(rows);
      } catch (err) {
        console.error(err);
      }
    };
    loadOpd();
  }, []);

  useEffect(() => {
    if (!opdId) {
      setRenjaOptions([]);
      return;
    }
    const loadRenja = async () => {
      try {
        setLoadingRenja(true);
        const rows = await getRenjaDokumenByOpd(opdId, form.tahun);
        setRenjaOptions(rows);
      } catch (err) {
        console.error(err);
        toast.error('Gagal memuat Renja');
      } finally {
        setLoadingRenja(false);
      }
    };
    loadRenja();
  }, [opdId, form.tahun]);

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleAutoGenerate = async () => {
    if (!form.sub_kegiatan?.nama_sub_kegiatan && !form.sub_kegiatan?.kode_sub_kegiatan) {
      toast.warning('Pilih Sub Kegiatan terlebih dahulu.');
      return;
    }
    setGenerating(true);
    try {
      const opdNama =
        opdOptions.find((o) => String(o.id) === String(form.opd_id))?.nama_opd || 'OPD';
      const result = await generateRkaIndikator({
        opd_nama: opdNama,
        program: form.program?.kode_program
          ? `${form.program.kode_program} - ${form.program.nama_program}`
          : form.program?.nama_program || '',
        kegiatan: form.kegiatan?.kode_kegiatan
          ? `${form.kegiatan.kode_kegiatan} - ${form.kegiatan.nama_kegiatan}`
          : form.kegiatan?.nama_kegiatan || '',
        sub_kegiatan: form.sub_kegiatan?.kode_sub_kegiatan
          ? `${form.sub_kegiatan.kode_sub_kegiatan} - ${form.sub_kegiatan.nama_sub_kegiatan}`
          : form.sub_kegiatan?.nama_sub_kegiatan || '',
        keluaran: form.keluaran || '',
        target_keluaran: form.target_keluaran || '',
        satuan_keluaran: form.satuan_keluaran || '',
      });
      setForm((prev) => ({
        ...prev,
        capaian_program: result.capaian_program || prev.capaian_program,
        target_capaian: result.target_capaian || prev.target_capaian,
        satuan_capaian: result.satuan_capaian || prev.satuan_capaian,
        hasil: result.hasil || prev.hasil,
        target_hasil: result.target_hasil || prev.target_hasil,
        satuan_hasil: result.satuan_hasil || prev.satuan_hasil,
      }));
      if (result.alasan) setChangeReasonText(result.alasan);
      if (result.alasan)
        setChangeReasonFile(
          `Renja TA ${form.tahun} - ${form.sub_kegiatan?.kode_sub_kegiatan || ''}`,
        );
      // Auto-fill Periode RPJMD jika belum dipilih
      if (!form.rpjmd_id && rpjmdOptions.length > 0) {
        setField('rpjmd_id', String(rpjmdOptions[0].id));
      }
      toast.success('✨ Indikator berhasil di-generate!');
    } catch (e) {
      toast.error('Gagal generate indikator: ' + (e.message || 'Coba lagi'));
    } finally {
      setGenerating(false);
    }
  };

  const handleMasterBelanja = useCallback((selected) => {
    if (!selected?.sub_rincian) return;

    const rekening = selected.sub_rincian;

    setSelectedRekening(rekening);
  }, []);

  console.log('=== addBelanjaRow DIPANGGIL ===');
  console.trace();
  const addBelanjaRow = () => {
    if (!selectedRekening) {
      toast.warning('Silakan pilih kode rekening terlebih dahulu.');
      return;
    }

    setForm((prev) => ({
      ...prev,

      rincian_belanja: refreshHierarchy(
        buildHierarchy([
          ...(prev.rincian_belanja || []),

          {
            id_temp: Date.now(),
            kode_rekening: selectedRekening.kode_rekening,
            nama_rekening: selectedRekening.uraian,
            level_rekening: getLevelKode(selectedRekening.kode_rekening),

            parent_kode: selectedRekening.kode_parent || null,

            is_group: false,

            expanded: true,
            uraian: '',
            spesifikasi: '',
            volume: 1,
            volume_hasil: 1,
            satuan: selectedRekening?.satuan || 'unit',
            harga_satuan: 0,

            ppn: 0,
            nilai_ppn: 0,
            total_setelah_ppn: 0,

            jumlah: 0,
            sumber_dana: 'PAD',
            lokasi: '',
            keterangan: '',

            koefisien_array: createDefaultKoefisien(selectedRekening?.satuan),
          },
        ]),
      ),
    }));
  };

  const toggleExpandRekening = (kodeRekening) => {
    setForm((prev) => {
      const rows = prev.rincian_belanja.map((r) =>
        r.kode_rekening === kodeRekening
          ? {
              ...r,
              expanded: !r.expanded,
            }
          : r,
      );

      return {
        ...prev,
        rincian_belanja: rows,
      };
    });
  };

  const updateBelanjaRow = (index, field, value) => {
    setForm((prev) => {
      const updated = [...(prev.rincian_belanja || [])];

      updated[index][field] = value;

      // Pastikan struktur koefisien selalu ada
      if (!Array.isArray(updated[index].koefisien_array)) {
        updated[index].koefisien_array = createDefaultKoefisien(updated[index].satuan);
      }

      // Sinkronkan perubahan Volume ke koefisien pertama
      if (field === 'volume') {
        updated[index].koefisien_array[0].volume = Number(value) || 1;
      }

      // Sinkronkan perubahan Satuan ke koefisien pertama
      if (field === 'satuan') {
        updated[index].koefisien_array[0].satuan = String(value || 'unit').trim();
      }

      // Hitung ulang otomatis
      const volumeHasil = hitungVolumeHasil(updated[index].koefisien_array);

      updated[index].volume_hasil = volumeHasil;
      updated[index].volume = volumeHasil;
      updated[index].satuan = formatSatuanGabungan(updated[index].koefisien_array);

      updated[index].jumlah = hitungJumlah(volumeHasil, updated[index].harga_satuan);

      const ppn = Number(updated[index].ppn || 0);

      updated[index].nilai_ppn = (updated[index].jumlah * ppn) / 100;

      updated[index].total_setelah_ppn = updated[index].jumlah + updated[index].nilai_ppn;

      return {
        ...prev,
        rincian_belanja: refreshHierarchy(updated),
      };
    });
  };

  const updateKoefisienArray = (rowIndex, koefisienBaru) => {
    setForm((prev) => {
      const rincian = [...prev.rincian_belanja];

      const volumeHasil = hitungVolumeHasil(koefisienBaru);

      const subtotal = hitungJumlah(volumeHasil, rincian[rowIndex].harga_satuan);

      const ppn = Number(rincian[rowIndex].ppn || 0);

      const nilaiPPN = (subtotal * ppn) / 100;

      const totalSetelahPPN = subtotal + nilaiPPN;

      rincian[rowIndex] = {
        ...rincian[rowIndex],

        koefisien_array: koefisienBaru,

        volume: volumeHasil,
        volume_hasil: volumeHasil,

        satuan: formatSatuanGabungan(koefisienBaru),

        ppn,

        jumlah: subtotal,

        nilai_ppn: nilaiPPN,

        total_setelah_ppn: totalSetelahPPN,
      };

      return {
        ...prev,
        rincian_belanja: refreshHierarchy(rincian),
      };
    });
  };

  const openKoefisienModal = (rowIndex) => {
    setEditingKoefRow(rowIndex);
    setKoefModalOpen(true);
  };

  const closeKoefisienModal = () => {
    setEditingKoefRow(null);
    setKoefModalOpen(false);
  };

  const addKoefisien = (rowIndex) => {
    setForm((prev) => {
      const rincian = [...prev.rincian_belanja];

      rincian[rowIndex].koefisien_array = tambahKoefisien(rincian[rowIndex].koefisien_array);

      return {
        ...prev,
        rincian_belanja: rincian,
      };
    });
  };

  const removeKoefisien = (rowIndex, koefIndex) => {
    setForm((prev) => {
      const rincian = [...prev.rincian_belanja];

      const koef = hapusKoefisien(rincian[rowIndex].koefisien_array, koefIndex);

      const volumeHasil = hitungVolumeHasil(koef);

      rincian[rowIndex].koefisien_array = koef;
      rincian[rowIndex].volume = volumeHasil;
      rincian[rowIndex].volume_hasil = volumeHasil;
      rincian[rowIndex].satuan = formatSatuanGabungan(koef);

      rincian[rowIndex].jumlah = hitungJumlah(volumeHasil, rincian[rowIndex].harga_satuan);

      return {
        ...prev,
        rincian_belanja: rincian,
      };
    });
  };

  const updateKoefisienRow = (rowIndex, koefIndex, field, value) => {
    setForm((prev) => {
      const rincian = [...prev.rincian_belanja];

      const koef = updateKoefisien(rincian[rowIndex].koefisien_array, koefIndex, field, value);

      const volumeHasil = hitungVolumeHasil(koef);

      rincian[rowIndex].koefisien_array = koef;
      rincian[rowIndex].volume = volumeHasil;
      rincian[rowIndex].volume_hasil = volumeHasil;
      rincian[rowIndex].satuan = formatSatuanGabungan(koef);

      rincian[rowIndex].jumlah = hitungJumlah(volumeHasil, rincian[rowIndex].harga_satuan);

      return {
        ...prev,
        rincian_belanja: rincian,
      };
    });
  };

  const removeBelanjaRow = (index) => {
    setForm((prev) => ({
      ...prev,
      rincian_belanja: refreshHierarchy(prev.rincian_belanja.filter((_, i) => i !== index)),
    }));
  };

  useEffect(() => {
    if (Array.isArray(form.rincian_belanja) && form.rincian_belanja.length > 0) {
      const total = form.rincian_belanja.reduce(
        (sum, item) => sum + (!item.is_group ? Number(item.jumlah || 0) : 0),
        0,
      );
      setForm((prev) => ({ ...prev, anggaran: String(total) }));
    } else {
      setForm((prev) => ({ ...prev, anggaran: '0' }));
    }
  }, [form.rincian_belanja]);

  const handleMasterRekening = useCallback(
    ({ program, kegiatan, subKegiatan }) => {
      const normProgram = program
        ? {
            nama_program: program.nama_program,
            kode_program: program.kode_program_full || program.kode_program || '',
          }
        : null;
      const normKegiatan = kegiatan
        ? {
            nama_kegiatan: kegiatan.nama_kegiatan,
            kode_kegiatan: kegiatan.kode_kegiatan_full || kegiatan.kode_kegiatan || '',
          }
        : null;
      const normSubKegiatan = subKegiatan
        ? {
            nama_sub_kegiatan: subKegiatan.nama_sub_kegiatan,
            kode_sub_kegiatan:
              subKegiatan.kode_sub_kegiatan_full || subKegiatan.kode_sub_kegiatan || '',
            id: subKegiatan.id,
          }
        : null;
      const kinerjaHasil = subKegiatan?.kinerja || '';
      const kodeProgramForIndikator = normProgram?.kode_program || '';
      const periodeAktif = periodeList.find((p) => String(p.id) === String(form.periode_id));
      const tahunAwalAktif = periodeAktif?.tahun_awal;
      const hitungTargetTahun = (ind) => {
        let targetVal = ind.target_tahun_1;
        if (tahunAwalAktif && form.tahun) {
          const idx = Number(form.tahun) - Number(tahunAwalAktif) + 1;
          if (idx >= 1 && idx <= 6) {
            targetVal = ind[`target_tahun_${idx}`] ?? targetVal;
          }
        }
        return targetVal;
      };
      if (kodeProgramForIndikator) {
        getIndikatorProgramByKode(kodeProgramForIndikator)
          .then((ind) => {
            if (!ind) return;
            const targetVal = hitungTargetTahun(ind);
            setForm((prev) => ({
              ...prev,
              capaian_program: ind.nama_indikator || prev.capaian_program,
              target_capaian:
                targetVal != null ? String(parseFloat(targetVal)) : prev.target_capaian,
              satuan_capaian: ind.satuan || prev.satuan_capaian,
            }));
          })
          .catch(console.error);
      }
      const kodeKegiatanForIndikator = normKegiatan?.kode_kegiatan || '';

      if (kodeKegiatanForIndikator) {
        getIndikatorKegiatanByKode(kodeKegiatanForIndikator)
          .then((ind) => {
            if (!ind) return;

            const targetVal = hitungTargetTahun(ind);

            // Hanya untuk Capaian Kegiatan
            setForm((prev) => ({
              ...prev,
              capaian_kegiatan: ind.nama_indikator || prev.capaian_kegiatan,
              target_capaian_kegiatan:
                targetVal != null ? String(parseFloat(targetVal)) : prev.target_capaian_kegiatan,
              satuan_capaian_kegiatan: ind.satuan || prev.satuan_capaian_kegiatan,
            }));
          })
          .catch(console.error);
      }

      if (!normProgram && !normKegiatan && !normSubKegiatan) return;
      setForm((prev) => ({
        ...prev,
        program: normProgram,
        kegiatan: normKegiatan,
        sub_kegiatan: normSubKegiatan,
        hasil: kinerjaHasil || prev.hasil,
      }));
      const kodeSubKeg = normSubKegiatan?.kode_sub_kegiatan || '';
      if (kodeSubKeg) {
        const candidates = renjaItems.filter(
          (r) => r.sub_kegiatan && String(r.sub_kegiatan).startsWith(kodeSubKeg),
        );
        const activeDokumenId = form.renja_id
          ? renjaItems.find((r) => String(r.id) === String(form.renja_id))?.renja_dokumen_id
          : null;
        const matched =
          candidates.find((r) => activeDokumenId && r.renja_dokumen_id === activeDokumenId) ||
          (candidates.length === 1 ? candidates[0] : null);
        if (!matched && candidates.length > 1) {
          toast.error(
            'Ada beberapa data Renja untuk Sub Kegiatan ini. Pilih Dokumen Renja terlebih dahulu.',
          );
        }
        if (matched) {
          const targetSubKegiatan =
            matched.target != null ? String(parseFloat(matched.target)) : '';

          setForm((prev) => ({
            ...prev,

            renja_id: String(matched.id),

            renja_dokumen_id: matched.renja_dokumen_id
              ? String(matched.renja_dokumen_id)
              : prev.renja_dokumen_id,

            indikator: matched.indikator || prev.indikator,

            // OUTPUT
            keluaran: matched.indikator || prev.keluaran,
            target_keluaran: targetSubKegiatan || prev.target_keluaran,
            satuan_keluaran: matched.satuan || prev.satuan_keluaran,

            // HASIL (Kinerja Sub Kegiatan)
            target_hasil: targetSubKegiatan || prev.target_hasil,
            satuan_hasil: matched.satuan || prev.satuan_hasil,

            masukan: 'Dana yang dibutuhkan',
          }));
        }
      }
    },
    [renjaItems],
  );

  const handleRenjaChange = (renjaDokumenId) => {
    setField('renja_dokumen_id', renjaDokumenId);
    if (!form.sub_kegiatan?.kode_sub_kegiatan) return;
    const matched = renjaItems.find(
      (r) =>
        String(r.renja_dokumen_id) === String(renjaDokumenId) &&
        r.sub_kegiatan &&
        String(r.sub_kegiatan).startsWith(form.sub_kegiatan.kode_sub_kegiatan),
    );
    if (!matched) {
      toast.error('Sub Kegiatan ini tidak ditemukan pada Dokumen Renja yang dipilih.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      renja_id: String(matched.id),
      renja_dokumen_id: String(renjaDokumenId),
      indikator: matched.indikator || prev.indikator,
      keluaran: matched.indikator || prev.keluaran,
      target: matched.target != null ? String(parseFloat(matched.target)) : prev.target,
      target_keluaran:
        matched.target != null ? String(parseFloat(matched.target)) : prev.target_keluaran,
      satuan_keluaran: matched.satuan || prev.satuan_keluaran,
    }));
  };

  const handleSubmit = async () => {
    const payload = buildPayload(form);
    if (!payload.periode_id || Number.isNaN(payload.periode_id)) {
      toast.error('Pilih Periode RPJMD terlebih dahulu.');
      return;
    }
    if (!changeReasonText.trim() && !changeReasonFile.trim()) {
      toast.error('Isi alasan pencatatan atau referensi berkas.');
      return;
    }

    if (
      !form.program?.nama_program ||
      !form.kegiatan?.nama_kegiatan ||
      !form.sub_kegiatan?.nama_sub_kegiatan
    ) {
      toast.error('Program, Kegiatan, dan Sub Kegiatan wajib dipilih.');
      return;
    }
    // Validasi pagu vs Renja
    const paguRenja = renjaItems.find(
      (r) =>
        r.sub_kegiatan &&
        form.sub_kegiatan?.kode_sub_kegiatan &&
        String(r.sub_kegiatan).startsWith(form.sub_kegiatan.kode_sub_kegiatan),
    );
    if (paguRenja) {
      const paguMax = Number(paguRenja.pagu || 0);
      const totalInput = Number(form.anggaran || 0);
      if (totalInput > paguMax) {
        toast.error(
          `Total anggaran ${formatRupiah(totalInput)} melebihi Pagu Renja ${formatRupiah(paguMax)}. Kurangi rincian belanja.`,
        );
        return;
      }
      if (totalInput < paguMax) {
        const selisih = paguMax - totalInput;
        toast.warning(
          `⚠️ Total anggaran ${formatRupiah(totalInput)} lebih kecil dari Pagu Renja ${formatRupiah(paguMax)}. Sisa ${formatRupiah(selisih)} belum dialokasikan.`,
          { autoClose: 6000 },
        );
        // Tidak return — boleh simpan dengan warning
      }
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await createRka({
          ...payload,
          change_reason_text: changeReasonText.trim() || undefined,
          change_reason_file: changeReasonFile.trim() || undefined,
        });
        toast.success('RKA berhasil dibuat');
        if (created?.id) navigate(`/rka/form/${created.id}`, { replace: true });
        else navigate('/dashboard-rka', { replace: true });
      } else {
        await updateRka(id, {
          ...payload,
          change_reason_text: changeReasonText.trim() || undefined,
          change_reason_file: changeReasonFile.trim() || undefined,
        });
        toast.success('RKA berhasil diperbarui');
        await loadExisting();
      }
    } catch (e) {
      const body = e.response?.data;
      toast.error(body?.error || body?.message || e.message || 'Gagal menyimpan RKA');
    } finally {
      setSaving(false);
    }
  };

  const rincianList = useMemo(() => {
    const rows = buildVisibleRows(form.rincian_belanja || []);

    console.table(
      rows.map((r, i) => ({
        i,
        id: r.id,
        id_temp: r.id_temp,
        kode: r.kode_rekening,
        level: r.level_rekening,
        group: r.is_group,
        uraian: r.uraian,
        nama_rekening: r.nama_rekening,
        parent: r.parent_kode,
      })),
    );

    console.log('===== RINCIAN LIST =====');

    rows.forEach((r, i) => {
      console.log('RINCIAN', i, r.kode_rekening, r.level_rekening, r.is_group, r.uraian);
    });

    return rows;
  }, [form.rincian_belanja]);

  if (periodeLoading && isNew)
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <p>Memuat periode...</p>
      </div>
    );
  if (loading)
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
        <p>Memuat data RKA...</p>
      </div>
    );
  if (loadError && !isNew)
    return (
      <div style={{ padding: 24, maxWidth: 560 }}>
        <Alert type="error" message={loadError} showIcon />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/dashboard-rka')}
          style={{ marginTop: 16 }}
        >
          Kembali
        </Button>
      </div>
    );

  const totalAnggaran = Number(form.anggaran) || 0;

  const handleCetakFull = async () => {
    setCetakLoading((s) => ({ ...s, full: true }));
    try {
      const resp = await api.get(`/rka/${id}/export-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `RKA_FULL_${id}_${form.tahun || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal cetak PDF RKA');
    } finally {
      setCetakLoading((s) => ({ ...s, full: false }));
    }
  };

  const handleCetakBelanja = async () => {
    const tapdParam = encodeURIComponent(JSON.stringify(tapdList));
    setCetakLoading((s) => ({ ...s, belanja: true }));
    try {
      const resp = await api.get(`/rka/${id}/export-pdf-belanja?tapd=${tapdParam}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      const namaSubKeg = (form.sub_kegiatan?.nama_sub_kegiatan || form.sub_kegiatan || 'RKA')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 60);
      a.download = `RKA_BELANJA_${namaSubKeg}_${form.tahun || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal cetak RKA-BELANJA');
    } finally {
      setCetakLoading((s) => ({ ...s, belanja: false }));
    }
  };

  const toggleExpand = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1850, margin: '0 auto' }}>
      {/* ── HEADER ── */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dashboard-rka')}
          >
            Kembali
          </Button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            {isNew ? 'Tambah RKA' : `Edit RKA #${id}`}
          </h1>
          <Tag color="blue">{form.jenis_dokumen || 'RKA'}</Tag>
          <Tag color="green">TA {form.tahun || '-'}</Tag>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={saving}
          size="large"
        >
          Simpan RKA
        </Button>
      </div>

      {periodeOptions.length === 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Daftar periode RPJMD kosong."
        />
      )}

      <Modal
        open={koefModalOpen}
        onCancel={closeKoefisienModal}
        footer={null}
        width={620}
        destroyOnClose
        title="Editor Koefisien SIPD"
      >
        {editingKoefRow !== null && (
          <KoefisienEditor
            value={form.rincian_belanja?.[editingKoefRow]?.koefisien_array}
            ppn={form.rincian_belanja?.[editingKoefRow]?.ppn || 0}
            onPpnChange={(v) => updateBelanjaRow(editingKoefRow, 'ppn', v)}
            onChange={(baru) => updateKoefisienArray(editingKoefRow, baru)}
          />
        )}
      </Modal>

      {/* ── SEKSI 1: Identitas Dokumen ── */}
      <SeksiHeader nomor="1" label="Identitas Dokumen RKA">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <FieldLabel required>Tahun Anggaran</FieldLabel>
            <Input
              value={form.tahun}
              onChange={(e) => setField('tahun', e.target.value)}
              style={{ fontWeight: 700, fontSize: 16, textAlign: 'center' }}
            />
          </div>
          <div>
            <FieldLabel required>Periode RPJMD</FieldLabel>
            <Select
              style={{ width: '100%' }}
              placeholder="Pilih periode"
              value={form.periode_id || undefined}
              onChange={(v) => setField('periode_id', v)}
              options={periodeOptions.map((p) => ({
                value: String(p.id),
                label: p.nama,
              }))}
            />
          </div>
          <div>
            <FieldLabel required>OPD Penanggung Jawab</FieldLabel>
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              style={{ width: '100%' }}
              placeholder="Ketik nama OPD..."
              value={opdId || undefined}
              onChange={(v) => {
                setOpdId(v || '');
                setField('opd_id', v || '');
                setField('renja_id', '');
                if (v) {
                  api
                    .get('/renja/item', { params: { perangkat_daerah_id: v } })
                    .then((res) => {
                      const items = res.data?.data || [];
                      console.log('RENJA ITEMS', items);
                      setRenjaItems(items);
                      const kodes = [
                        ...new Set(
                          items
                            .map((i) => {
                              const str =
                                i.kode_program ||
                                (i.program ? i.program.split(' - ')[0].trim() : '');
                              return str || null;
                            })
                            .filter(Boolean),
                        ),
                      ];
                      setAllowedKodeProgram(kodes);
                    })
                    .catch(console.error);
                } else {
                  setAllowedKodeProgram([]);
                  setRenjaItems([]);
                }
              }}
              filterOption={(input, option) =>
                String(option?.label || '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={opdOptions.map((o) => ({
                value: String(o.id),
                label: o.nama_opd || o.nama,
              }))}
            />
          </div>
        </div>
      </SeksiHeader>

      {/* ── SEKSI 2: Program / Kegiatan / Sub Kegiatan ── */}
      <SeksiHeader
        nomor="2"
        label="Program / Kegiatan / Sub Kegiatan"
        sub="— Pilih OPD terlebih dahulu untuk memfilter program sesuai Renja"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {/* Saat Edit — tampilkan nilai terpilih sebagai read-only, dengan opsi ganti */}
            {!isNew && form.program?.nama_program && (
              <div
                style={{
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: '#d4b106', marginBottom: 6 }}>
                  ⚠️ Mode Edit — Sub Kegiatan Terkunci
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        program: null,
                        kegiatan: null,
                        sub_kegiatan: null,
                      }))
                    }
                    style={{
                      marginLeft: 12,
                      fontSize: 11,
                      color: '#1677ff',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Ganti Sub Kegiatan
                  </button>
                </div>
                <div style={{ lineHeight: 1.8 }}>
                  <div>
                    <strong>Program:</strong>{' '}
                    {form.program?.kode_program && `${form.program.kode_program} - `}
                    {form.program?.nama_program}
                  </div>
                  <div>
                    <strong>Kegiatan:</strong>{' '}
                    {form.kegiatan?.kode_kegiatan && `${form.kegiatan.kode_kegiatan} - `}
                    {form.kegiatan?.nama_kegiatan}
                  </div>
                  <div>
                    <strong>Sub Kegiatan:</strong>{' '}
                    {form.sub_kegiatan?.kode_sub_kegiatan &&
                      `${form.sub_kegiatan.kode_sub_kegiatan} - `}
                    {form.sub_kegiatan?.nama_sub_kegiatan}
                  </div>
                </div>
              </div>
            )}
            {/* Tampilkan cascading picker hanya saat tambah baru ATAU user klik Ganti */}
            {(isNew || !form.program?.nama_program) && (
              <MasterRekeningCascading
                key={opdId || 'no-opd'}
                onChange={handleMasterRekening}
                allowedKodeProgram={allowedKodeProgram}
                datasetKey="versi_2025"
              />
            )}
            <div style={{ marginTop: 14 }}>
              <FieldLabel>Dokumen Renja (auto-fill dari Sub Kegiatan)</FieldLabel>
              <Select
                style={{ width: '100%' }}
                placeholder="Pilih Renja"
                loading={loadingRenja}
                value={form.renja_dokumen_id || undefined}
                onChange={handleRenjaChange}
                disabled={!form.opd_id}
                options={renjaOptions.map((r) => ({
                  value: String(r.id),
                  label: `${r.tahun} - ${r.judul || r.program}`,
                }))}
              />
            </div>
          </div>
          <div>
            {/* Info box terpilih */}
            <div
              style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              <div style={{ fontWeight: 700, color: '#389e0d', marginBottom: 4 }}>
                ✓ Rekening Terpilih
              </div>
              <div>
                <strong>Program:</strong>{' '}
                {form.program?.kode_program ? (
                  `${form.program.kode_program}`
                ) : (
                  <span style={{ color: '#bfbfbf' }}>—</span>
                )}
              </div>
              <div style={{ color: '#595959', fontSize: 11, marginBottom: 4 }}>
                {form.program?.nama_program || ''}
              </div>
              <div>
                <strong>Kegiatan:</strong>{' '}
                {form.kegiatan?.kode_kegiatan ? (
                  `${form.kegiatan.kode_kegiatan}`
                ) : (
                  <span style={{ color: '#bfbfbf' }}>—</span>
                )}
              </div>
              <div style={{ color: '#595959', fontSize: 11, marginBottom: 4 }}>
                {form.kegiatan?.nama_kegiatan || ''}
              </div>
              <div>
                <strong>Sub Kegiatan:</strong>{' '}
                {form.sub_kegiatan?.kode_sub_kegiatan ? (
                  `${form.sub_kegiatan.kode_sub_kegiatan}`
                ) : (
                  <span style={{ color: '#bfbfbf' }}>—</span>
                )}
              </div>
              <div style={{ color: '#595959', fontSize: 11 }}>
                {form.sub_kegiatan?.nama_sub_kegiatan || ''}
              </div>
            </div>
            {/* Waktu & Lokasi */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 2fr',
                gap: 10,
              }}
            >
              <div>
                <FieldLabel>Waktu Mulai</FieldLabel>
                <Select
                  style={{ width: '100%' }}
                  value={form.waktu_mulai}
                  onChange={(v) => setField('waktu_mulai', v)}
                  options={BULAN_OPTIONS.map((b) => ({ value: b, label: b }))}
                />
              </div>
              <div>
                <FieldLabel>s.d.</FieldLabel>
                <Select
                  style={{ width: '100%' }}
                  value={form.waktu_selesai}
                  onChange={(v) => setField('waktu_selesai', v)}
                  options={BULAN_OPTIONS.map((b) => ({ value: b, label: b }))}
                />
              </div>
              <div>
                <FieldLabel>Lokasi Kegiatan</FieldLabel>
                <Input
                  value={form.lokasi}
                  onChange={(e) => setField('lokasi', e.target.value)}
                  placeholder="cth: Kota Ternate"
                />
              </div>
            </div>
          </div>
        </div>
      </SeksiHeader>

      {/* ── SEKSI 3: Indikator & Tolok Ukur Kinerja (Permendagri 77/2020) ── */}
      <SeksiHeader
        nomor="3"
        label="Indikator dan Tolok Ukur Kinerja"
        sub="— Permendagri 77/2020 Lampiran A.VI"
        extra={
          <Button
            type="primary"
            size="small"
            loading={generating}
            onClick={handleAutoGenerate}
            disabled={
              !form.sub_kegiatan?.kode_sub_kegiatan && !form.sub_kegiatan?.nama_sub_kegiatan
            }
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            ✨ Auto Generate
          </Button>
        }
      >
        <div
          style={{
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {/* Header tabel */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 140px 100px',
              background: '#f0f5ff',
              borderBottom: '2px solid #adc6ff',
              padding: '8px 12px',
              fontWeight: 700,
              fontSize: 12,
              color: '#1d39c4',
            }}
          >
            <div>Indikator</div>
            <div>Tolok Ukur Kinerja</div>
            <div style={{ textAlign: 'right' }}>Target Kinerja</div>
            <div style={{ textAlign: 'center' }}>Satuan</div>
          </div>

          {/* Baris 1: Capaian Program */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 140px 100px',
              borderBottom: '1px solid #f0f0f0',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#262626',
                background: '#fafafa',
                borderRight: '1px solid #f0f0f0',
              }}
            >
              Capaian Program
              <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 400 }}>(outcome)</div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.capaian_program}
                onChange={(e) => setField('capaian_program', e.target.value)}
                placeholder="cth: Persentase realisasi anggaran"
                variant="borderless"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.target_capaian}
                onChange={(e) => setField('target_capaian', e.target.value)}
                placeholder="cth: 92"
                style={{ textAlign: 'right', width: '100%' }}
                variant="borderless"
              />
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.satuan_capaian}
                onChange={(e) => setField('satuan_capaian', e.target.value)}
                placeholder="%"
                style={{ textAlign: 'center', width: '100%' }}
              />
            </div>
          </div>

          {/* Baris 2: Capaian Kegiatan */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 140px 100px',
              borderBottom: '1px solid #f0f0f0',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#262626',
                background: '#fafafa',
                borderRight: '1px solid #f0f0f0',
              }}
            >
              Capaian Kegiatan
              <div
                style={{
                  fontSize: 11,
                  color: '#8c8c8c',
                  fontWeight: 400,
                }}
              >
                (outcome kegiatan)
              </div>
            </div>

            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.capaian_kegiatan}
                onChange={(e) => setField('capaian_kegiatan', e.target.value)}
                placeholder="cth: Tersusunnya Dokumen Perencanaan Perangkat Daerah"
                variant="borderless"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.target_capaian_kegiatan}
                onChange={(e) => setField('target_capaian_kegiatan', e.target.value)}
                placeholder="cth: 85"
                style={{
                  textAlign: 'right',
                  width: '100%',
                }}
                variant="borderless"
              />
            </div>

            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.satuan_capaian_kegiatan}
                onChange={(e) => setField('satuan_capaian_kegiatan', e.target.value)}
                placeholder="%"
                style={{
                  textAlign: 'center',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Baris 2: Masukan */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 140px 100px',
              borderBottom: '1px solid #f0f0f0',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#262626',
                background: '#fafafa',
                borderRight: '1px solid #f0f0f0',
              }}
            >
              Masukan
              <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 400 }}>(input)</div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.masukan}
                onChange={(e) => setField('masukan', e.target.value)}
                placeholder="Dana yang dibutuhkan"
                variant="borderless"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>
            <div style={{ padding: '6px 8px', textAlign: 'right' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0958d9' }}>
                {formatRupiah(totalAnggaran)}
              </span>
            </div>
            <div
              style={{
                padding: '6px 8px',
                textAlign: 'center',
                fontSize: 12,
                color: '#8c8c8c',
              }}
            >
              Rp
            </div>
          </div>

          {/* Baris 3: Keluaran */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 140px 100px',
              borderBottom: '1px solid #f0f0f0',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#262626',
                background: '#fafafa',
                borderRight: '1px solid #f0f0f0',
              }}
            >
              Keluaran
              <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 400 }}>(output)</div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.keluaran}
                onChange={(e) => setField('keluaran', e.target.value)}
                placeholder="cth: Jumlah infrastruktur yang tersedia"
                variant="borderless"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.target_keluaran}
                onChange={(e) => setField('target_keluaran', e.target.value)}
                placeholder="cth: 10"
                style={{ textAlign: 'right', width: '100%' }}
                variant="borderless"
              />
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.satuan_keluaran}
                onChange={(e) => setField('satuan_keluaran', e.target.value)}
                placeholder="Unit"
                style={{ textAlign: 'center', width: '100%' }}
                variant="borderless"
              />
            </div>
          </div>

          {/* Baris 4: Hasil */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr 140px 100px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#262626',
                background: '#fafafa',
                borderRight: '1px solid #f0f0f0',
              }}
            >
              Hasil
              <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 400 }}>
                (outcome kegiatan)
              </div>
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.hasil}
                onChange={(e) => setField('hasil', e.target.value)}
                placeholder="cth: Jumlah laporan pertanggungjawaban"
                variant="borderless"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.target_hasil}
                onChange={(e) => setField('target_hasil', e.target.value)}
                placeholder="cth: 43"
                style={{ textAlign: 'right', width: '100%' }}
                variant="borderless"
              />
            </div>
            <div style={{ padding: '6px 8px' }}>
              <Input
                value={form.satuan_hasil}
                onChange={(e) => setField('satuan_hasil', e.target.value)}
                placeholder="Laporan"
                style={{ textAlign: 'center', width: '100%' }}
              />
            </div>
          </div>
        </div>
      </SeksiHeader>

      {/* ── SEKSI 4: Rincian Belanja ── */}
      <SeksiHeader
        nomor="4"
        label="Rincian Anggaran Belanja"
        sub="— Kode rekening Permendagri 90/2019"
        extra={
          <div
            style={{
              background: '#f0f5ff',
              border: '1px solid #adc6ff',
              borderRadius: 6,
              padding: '4px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12, color: '#1d39c4' }}>{rincianList.length} item</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0050b3' }}>
              {formatRupiah(totalAnggaran)}
            </span>
          </div>
        }
      >
        {/* Cascading belanja */}
        <div
          style={{
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: '#8c8c8c',
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            Pilih kode rekening belanja untuk ditambahkan ke tabel:
          </div>
          <MasterBelanjaCascading
            key="master-belanja-rka"
            value={selectedRekening}
            onChange={handleMasterBelanja}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            💡 Pilih Sub Rincian di atas, lalu klik <strong>+ Tambah Item</strong> untuk menambah
            uraian baru dari kode rekening yang sama
          </span>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addBelanjaRow}
            disabled={!selectedRekening}
            title={
              !selectedRekening
                ? 'Pilih Sub Rincian terlebih dahulu'
                : `Tambah item: ${selectedRekening?.kode_rekening}`
            }
          >
            + Tambah Item
          </Button>
        </div>

        {/* Tabel rincian — spreadsheet lebar penuh */}
        {rincianList.length > 0 ? (
          <div
            style={{
              overflowX: 'auto',
              border: '1px solid #e8e8e8',
              borderRadius: 6,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 1670,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f0f5ff',
                    borderBottom: '2px solid #adc6ff',
                  }}
                >
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'center',
                      width: 36,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'left',
                      width: 140,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Kode Rekening
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'left',
                      minWidth: 440,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Uraian Belanja
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'left',
                      minWidth: 260,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Spesifikasi
                  </th>

                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'left',
                      width: 260,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Koefisien
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'center',
                      width: 90,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Satuan
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'right',
                      width: 145,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Harga Satuan (Rp)
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'center',
                      width: 100,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Sumber Dana
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'right',
                      width: 135,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Jumlah (Rp)
                  </th>
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'center',
                      width: 48,
                      color: '#1d39c4',
                      fontWeight: 700,
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {rincianList
                  .filter((item) => isVisible(item, rincianList))
                  .map((item, index) => {
                    console.log(
                      'RENDER ROW',
                      index,
                      item.kode_rekening,
                      item.level_rekening,
                      item.is_group,
                      item.uraian,
                    );

                    const parentKode = getParentKode(item.kode_rekening);

                    if (
                      parentKode &&
                      form.rincian_belanja.some(
                        (r) => r.kode_rekening === parentKode && r.expanded === false,
                      )
                    ) {
                      return null;
                    }

                    return (
                      <React.Fragment key={item.id_temp || index}>
                        <tr
                          key={item.id_temp || index}
                          draggable={canDragItem(item)}
                          onDragStart={() => {
                            setDraggingItem(createDragPayload(item));
                          }}
                          onDragEnd={() => {
                            setDraggingItem(null);
                            setDragOverKode(null);
                          }}
                          onDragOver={(e) => {
                            if (!canDropItem(draggingItem, item)) return;

                            if (draggingItem?.item?.parent_kode !== item.parent_kode) {
                              return;
                            }

                            e.preventDefault();

                            if (dragOverKode !== item.kode_rekening) {
                              setDragOverKode(item.kode_rekening);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverKode === item.kode_rekening) {
                              setDragOverKode(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropItem(item);
                          }}
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            background:
                              dragOverKode === item.kode_rekening
                                ? '#e6f4ff'
                                : index % 2 === 0
                                  ? '#fff'
                                  : '#fafcff',
                          }}
                          onMouseEnter={() => {}}
                          onMouseLeave={() => {}}
                        >
                          <td
                            style={{
                              padding: '6px 10px',
                              textAlign: 'center',
                              color: '#8c8c8c',
                              fontSize: 12,
                            }}
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={
                                expandedRows[index] ? <CaretDownOutlined /> : <CaretRightOutlined />
                              }
                              onClick={() => toggleExpand(index)}
                            />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                if (item.level_rekening !== 'SUB_RINCIAN') {
                                  toggleExpandRekening(item.kode_rekening);
                                }
                              }}
                            >
                              <>
                                {item.level_rekening !== 'SUB_RINCIAN' &&
                                  (item.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />)}

                                {item.level_rekening === 'ITEM' ? (
                                  <FileTextOutlined style={{ color: '#52c41a' }} />
                                ) : item.expanded ? (
                                  <FolderOpenOutlined
                                    onClick={() => toggleExpandRekening(item.kode_rekening)}
                                    style={{ color: '#1677ff' }}
                                  />
                                ) : (
                                  <FolderOutlined
                                    onClick={() => toggleExpandRekening(item.kode_rekening)}
                                    style={{ color: '#1677ff' }}
                                  />
                                )}
                              </>

                              <code
                                style={{
                                  fontSize: 11,
                                  color: '#1677ff',
                                  background: '#e6f4ff',
                                  padding: '2px 5px',
                                  borderRadius: 3,
                                }}
                              >
                                {item.kode_rekening}
                              </code>
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                // Indentasi hierarki di-cap 16px (bukan penuh indentLevel() yg
                                // bisa sampai 78px utk level ITEM) — padding-left di kontainer
                                // flex ikut memakan lebar yg tersisa utk TextArea Uraian, jadi
                                // makin dalam levelnya makin sempit kotak ketiknya. Hierarki
                                // sudah cukup terlihat dari badge Kode Rekening & warna Tag.
                                paddingLeft: Math.min(indentLevel(item.level_rekening), 16),
                                gap: 6,
                              }}
                            >
                              {item.is_group ? (
                                item.expanded ? (
                                  <CaretDownOutlined
                                    onClick={() => toggleExpandRekening(item.kode_rekening)}
                                    style={{
                                      color: '#1677ff',
                                      cursor: 'pointer',
                                    }}
                                  />
                                ) : (
                                  <CaretRightOutlined
                                    onClick={() => toggleExpandRekening(item.kode_rekening)}
                                    style={{
                                      color: '#1677ff',
                                      cursor: 'pointer',
                                    }}
                                  />
                                )
                              ) : (
                                <span
                                  style={{
                                    width: 14,
                                    display: 'inline-block',
                                  }}
                                />
                              )}

                              {!item.is_group && (
                                <HolderOutlined
                                  style={{
                                    color: '#8c8c8c',
                                    cursor: 'grab',
                                    fontSize: 13,
                                    flexShrink: 0,
                                    marginTop: 6,
                                  }}
                                />
                              )}

                              <TextArea
                                value={item.uraian}
                                onChange={(e) => updateBelanjaRow(index, 'uraian', e.target.value)}
                                placeholder={
                                  item.level_rekening === 'ITEM'
                                    ? 'Uraian belanja...'
                                    : 'Nama Kelompok Rekening'
                                }
                                readOnly={item.is_group}
                                rows={3}
                                style={{
                                  fontSize: 13,
                                  flex: '1 1 340px',
                                  minWidth: 0,
                                  resize: 'vertical',

                                  fontWeight: item.level_rekening === 'ITEM' ? 400 : 700,

                                  color:
                                    item.level_rekening === 'AKUN'
                                      ? '#003a8c'
                                      : item.level_rekening === 'KELOMPOK'
                                        ? '#0050b3'
                                        : item.level_rekening === 'JENIS'
                                          ? '#096dd9'
                                          : item.level_rekening === 'OBJEK'
                                            ? '#1677ff'
                                            : item.level_rekening === 'RINCIAN'
                                              ? '#389e0d'
                                              : '#262626',

                                  background: item.is_group ? '#f5f5f5' : '#fff',
                                  cursor: item.is_group ? 'default' : 'text',
                                }}
                              />
                              <Tag
                                style={{ flexShrink: 0, marginTop: 4 }}
                                color={
                                  item.level_rekening === 'AKUN'
                                    ? 'blue'
                                    : item.level_rekening === 'KELOMPOK'
                                      ? 'cyan'
                                      : item.level_rekening === 'JENIS'
                                        ? 'green'
                                        : item.level_rekening === 'OBJEK'
                                          ? 'gold'
                                          : item.level_rekening === 'RINCIAN'
                                            ? 'orange'
                                            : 'purple'
                                }
                              >
                                {item.is_group && (
                                  <Badge
                                    count={item.total_item || 0}
                                    style={{
                                      background: '#1677ff',
                                      marginLeft: 6,
                                    }}
                                  />
                                )}
                                {item.level_rekening}
                              </Tag>
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <TextArea
                              value={item.spesifikasi}
                              placeholder="Merk / ukuran / tipe / spesifikasi teknis"
                              onChange={(e) =>
                                updateBelanjaRow(index, 'spesifikasi', e.target.value)
                              }
                              rows={2}
                              style={{
                                width: '100%',
                                fontSize: 13,
                                resize: 'vertical',
                              }}
                            />
                          </td>

                          <td
                            style={{
                              padding: '6px',
                              minWidth: 240,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 12,
                                  color: '#1677ff',
                                }}
                              >
                                {Array.isArray(item.koefisien_array)
                                  ? item.koefisien_array
                                      .map((k) => `${k.volume} ${k.satuan}`)
                                      .join(' × ')
                                  : String(item.koefisien_array)}
                              </div>

                              <Tooltip title="Edit Koefisien SIPD">
                                <Button
                                  icon={<EditOutlined />}
                                  size="small"
                                  onClick={() => openKoefisienModal(index)}
                                  disabled={item.is_group}
                                >
                                  Edit
                                </Button>
                              </Tooltip>
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <Input
                              value={item.satuan}
                              readOnly
                              style={{
                                background: '#fafafa',
                                textAlign: 'center',
                                fontWeight: 600,
                              }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <Input
                              type="text"
                              readOnly={item.is_group}
                              inputMode="decimal"
                              value={item.harga_satuan}
                              onChange={(e) =>
                                updateBelanjaRow(index, 'harga_satuan', e.target.value)
                              }
                              onPaste={(e) => {
                                e.preventDefault();
                                const pasted = e.clipboardData.getData('text');
                                updateBelanjaRow(index, 'harga_satuan', parseAngkaID(pasted));
                              }}
                              onBlur={(e) =>
                                updateBelanjaRow(
                                  index,
                                  'harga_satuan',
                                  parseAngkaID(e.target.value),
                                )
                              }
                              style={{
                                textAlign: 'right',
                                width: '100%',
                                background: item.is_group ? '#f5f5f5' : '#fff',
                                cursor: item.is_group ? 'default' : 'text',
                              }}
                            />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <Select
                              style={{ width: '100%' }}
                              value={item.sumber_dana}
                              onChange={(v) => updateBelanjaRow(index, 'sumber_dana', v)}
                              options={SUMBER_DANA_OPTIONS}
                              size="small"
                            />
                          </td>
                          <td
                            style={{
                              padding: '6px 10px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: item.jumlah > 0 ? '#0958d9' : '#bfbfbf',
                            }}
                          >
                            <div
                              style={{
                                textAlign: 'right',
                              }}
                            >
                              <Tooltip
                                title={`${item.total_item || 0} item • ${formatRupiah(item.jumlah)}`}
                              >
                                <div
                                  style={{
                                    fontWeight: item.is_group ? 700 : 500,
                                    color: item.is_group ? '#003a8c' : '#0958d9',
                                    cursor: item.is_group ? 'pointer' : 'default',
                                  }}
                                >
                                  <>
                                    {formatRupiah(item.jumlah)}

                                    {item.is_group && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: '#8c8c8c',
                                        }}
                                      >
                                        {item.total_item || 0} item
                                      </div>
                                    )}
                                  </>
                                </div>
                              </Tooltip>

                              {item.ppn > 0 && (
                                <>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: '#d48806',
                                    }}
                                  >
                                    PPN {item.ppn}%
                                  </div>

                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#389e0d',
                                    }}
                                  >
                                    {formatRupiah(item.total_setelah_ppn)}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              onClick={() => removeBelanjaRow(index)}
                              disabled={item.is_group}
                            />
                          </td>
                        </tr>

                        {item.ppn > 0 && (
                          <tr
                            style={{
                              background: '#fffbe6',
                            }}
                          >
                            <td colSpan={8}></td>

                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: '#d48806',
                              }}
                            >
                              PPN {item.ppn}% :
                            </td>

                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                color: '#d48806',
                              }}
                            >
                              {formatRupiah(item.nilai_ppn || 0)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                ;
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: '#f0f5ff',
                    borderTop: '2px solid #adc6ff',
                  }}
                >
                  <td
                    colSpan={10}
                    style={{
                      padding: '10px 10px',
                      fontWeight: 700,
                      color: '#1d39c4',
                      fontSize: 13,
                    }}
                  >
                    TOTAL ANGGARAN — {rincianList.length} item rincian belanja
                  </td>
                  <td
                    style={{
                      padding: '10px 10px',
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: 15,
                      color: '#0050b3',
                    }}
                  >
                    {formatRupiah(totalAnggaran)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
              color: '#bfbfbf',
              border: '2px dashed #e8e8e8',
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14 }}>Belum ada rincian belanja.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Pilih kode rekening di atas untuk menambahkan item.
            </div>
          </div>
        )}
      </SeksiHeader>

      {/* ── SEKSI 5: Pengaturan Internal & Alasan (Collapsible) ── */}
      <Collapse
        style={{
          marginBottom: 16,
          border: '1px solid #e8e8e8',
          borderRadius: 8,
        }}
        items={[
          {
            key: '1',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingOutlined style={{ color: '#8c8c8c' }} />
                <span style={{ fontWeight: 600, color: '#595959' }}>
                  Pengaturan Internal & Alasan Pencatatan
                </span>
                <span style={{ fontSize: 11, color: '#ff4d4f' }}>(wajib diisi)</span>
              </div>
            ),
            children: (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <FieldLabel>Periode RPJMD (Baseline)</FieldLabel>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="Pilih Periode"
                    value={form.rpjmd_id || undefined}
                    onChange={(v) => setField('rpjmd_id', v)}
                    options={rpjmdOptions.map((p) => ({
                      value: String(p.id),
                      label: `${p.nama || ''} (${p.tahun_awal}–${p.tahun_akhir})`,
                    }))}
                  />
                </div>
                <div>
                  <FieldLabel required>Ringkasan alasan pencatatan</FieldLabel>
                  <TextArea
                    rows={3}
                    value={changeReasonText}
                    onChange={(e) => setChangeReasonText(e.target.value)}
                    placeholder={
                      isNew
                        ? 'cth: Penyusunan RKA TA 2026 berdasarkan Renja yang telah ditetapkan'
                        : 'cth: Perubahan pagu sesuai hasil pembahasan TAPD'
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Referensi berkas / dokumen dasar</FieldLabel>
                  <Input
                    value={changeReasonFile}
                    onChange={(e) => setChangeReasonFile(e.target.value)}
                    placeholder="cth: SK Kepala Dinas No. 01/2026"
                    style={{ marginBottom: 6 }}
                  />
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                    Isi salah satu — alasan teks <strong>atau</strong> referensi berkas.
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* ── FOOTER SIMPAN ── */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: 8,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 13, color: '#595959' }}>
          {rincianList.length > 0 ? (
            <span>
              📊 <strong>{rincianList.length}</strong> item — Total:{' '}
              <strong style={{ color: '#0050b3', fontSize: 15 }}>
                {formatRupiah(totalAnggaran)}
              </strong>
            </span>
          ) : (
            <span style={{ color: '#bfbfbf' }}>Belum ada rincian belanja.</span>
          )}
        </div>
        {!isNew && (
          <>
            <Button
              icon={<PrinterOutlined />}
              onClick={handleCetakFull}
              loading={cetakLoading.full}
              size="large"
            >
              Cetak Full RKA
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => setModalTapd(true)}
              size="large"
              style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            >
              Cetak RKA-BELANJA
            </Button>
          </>
        )}
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={saving}
          size="large"
        >
          {isNew ? 'Simpan RKA Baru' : 'Perbarui RKA'}
        </Button>

        <Modal
          title="Input Tim Anggaran Pemerintahan Daerah (TAPD)"
          open={modalTapd}
          onCancel={() => setModalTapd(false)}
          width={750}
          footer={[
            <Button key="batal" onClick={() => setModalTapd(false)}>
              Batal
            </Button>,
            <Button
              key="cetak"
              type="primary"
              icon={<FilePdfOutlined />}
              loading={cetakLoading.belanja}
              onClick={() => {
                setModalTapd(false);
                handleCetakBelanja();
              }}
            >
              Cetak PDF
            </Button>,
          ]}
        >
          <p style={{ marginBottom: 12, color: '#555' }}>
            Isi data TAPD yang akan tercetak di formulir RKA-BELANJA SKPD. Bisa dikosongkan jika
            belum ada.
          </p>
          <Table
            dataSource={tapdList.map((t, i) => ({ ...t, key: i }))}
            pagination={false}
            size="small"
            columns={[
              { title: 'No', dataIndex: 'key', width: 50, render: (v) => v + 1 },
              {
                title: 'Nama',
                dataIndex: 'nama',
                render: (v, _, i) => (
                  <Input
                    value={v}
                    placeholder="Nama lengkap"
                    onChange={(e) =>
                      setTapdList((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, nama: e.target.value } : r)),
                      )
                    }
                  />
                ),
              },
              {
                title: 'NIP',
                dataIndex: 'nip',
                width: 180,
                render: (v, _, i) => (
                  <Input
                    value={v}
                    placeholder="NIP"
                    onChange={(e) =>
                      setTapdList((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, nip: e.target.value } : r)),
                      )
                    }
                  />
                ),
              },
              {
                title: 'Jabatan',
                dataIndex: 'jabatan',
                width: 160,
                render: (v, _, i) => (
                  <Input
                    value={v}
                    placeholder="Jabatan"
                    onChange={(e) =>
                      setTapdList((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, jabatan: e.target.value } : r)),
                      )
                    }
                  />
                ),
              },
            ]}
          />
          <Button
            size="small"
            style={{ marginTop: 10 }}
            onClick={() =>
              setTapdList((prev) => [...prev, { nama: '', nip: '', jabatan: 'Anggota' }])
            }
          >
            + Tambah Anggota TAPD
          </Button>
        </Modal>
      </div>

      {!isNew && (
        <PlanningAuditSection
          documentType="rka"
          documentId={Number(id)}
          auditRows={auditRows}
          auditLoading={false}
          allowRestore={canRestorePlanningDocumentVersion(user?.role)}
          onVersionRestored={() => loadExisting()}
        />
      )}
    </div>
  );
};

export default RkaFormPage;
