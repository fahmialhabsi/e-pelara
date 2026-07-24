// frontend/src/pages/mr/MrPlanningReportPage.jsx

import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import mrPlanningReportService from '@/services/mrPlanningReportService';
import {
  getMrPlanningContextDetail,
  submitMrPlanningContext,
  verifyMrPlanningContext,
  approveMrPlanningContext,
} from '@/services/mrPlanningContextService';
import { useMrIdempotency } from '@/features/mr/hooks/useMrIdempotency';
import MrQuickRepairPanel from '@/features/mr/components/MrQuickRepairPanel';
import api from '@/services/api';

const { Title, Text, Paragraph } = Typography;

const QUERY_KEYS = {
  contexts: ['mr-report', 'contexts'],
  fullReport: (contextId) => ['mr-report', 'full', contextId],
  exportHistory: (contextId) => ['mr-report', 'export-history', contextId],
  integrityScan: (contextId) => ['mr-report', 'integrity-scan', contextId],
  contextDetail: (contextId) => ['mr-report', 'context-detail', contextId],
};

const unwrapRows = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.rows)) return response.data.rows;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response)) return response;
  return [];
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const normalizePeriodeType = (context) => {
  const rawValue = String(
    context?.periode_type ||
      context?.tipe_periode ||
      context?.jenis_periode ||
      context?.periode_label ||
      '',
  )
    .trim()
    .toLowerCase();

  if (
    rawValue.includes('bulan') ||
    rawValue.includes('januari') ||
    rawValue.includes('februari') ||
    rawValue.includes('maret') ||
    rawValue.includes('april') ||
    rawValue.includes('mei') ||
    rawValue.includes('juni') ||
    rawValue.includes('juli') ||
    rawValue.includes('agustus') ||
    rawValue.includes('september') ||
    rawValue.includes('oktober') ||
    rawValue.includes('november') ||
    rawValue.includes('desember')
  ) {
    return 'bulanan';
  }

  if (
    rawValue.includes('triwulan') ||
    rawValue.includes('tw') ||
    rawValue.includes('triwulan i') ||
    rawValue.includes('triwulan ii') ||
    rawValue.includes('triwulan iii') ||
    rawValue.includes('triwulan iv')
  ) {
    return 'triwulan';
  }

  if (rawValue.includes('semester')) {
    return 'semesteran';
  }

  if (rawValue.includes('tahun') || rawValue.includes('tahunan')) {
    return 'tahunan';
  }

  return 'lainnya';
};

// Context lama (dibuat sebelum StepContext.jsx berhenti menyisipkan jenis_sumber
// ke periode_label) masih tersimpan dengan periode_label mis. "Renstra - Tahun
// 2025". Ini strip kosmetik agar tampilan dropdown konsisten "1 Laporan MR per
// periode" untuk data lama maupun baru — tidak mengubah data di database.
const LEGACY_SOURCE_LABEL_PREFIXES = [
  'Renstra',
  'Lakip',
  'Laporan Keuangan',
  'Tindak Lanjut BPK',
  'Tindak Lanjut BPKP',
  'Tindak Lanjut Inspektorat',
];

const stripLegacySourcePrefix = (periodeLabel = '') => {
  const text = String(periodeLabel || '').trim();

  const hit = LEGACY_SOURCE_LABEL_PREFIXES.find((source) => text.startsWith(`${source} - `));

  return hit ? text.slice(`${hit} - `.length) : text;
};

const getCleanPeriodeLabel = (context) => {
  const periodeLabel = stripLegacySourcePrefix(context?.periode_label);
  const tahun = context?.tahun || '';

  if (periodeLabel && tahun && periodeLabel.includes(String(tahun))) {
    return periodeLabel;
  }

  if (periodeLabel && tahun) {
    return `${periodeLabel} ${tahun}`;
  }

  if (periodeLabel) {
    return periodeLabel;
  }

  if (tahun) {
    return `Tahun ${tahun}`;
  }

  return `Context ${context?.id || '-'}`;
};

const getReportOpdLabel = (context, periodeLabel = '') => {
  const namaOpd = String(
    context?.nama_opd || context?.opd_nama || context?.nama_perangkat_daerah || '',
  ).trim();

  if (!namaOpd) {
    return '';
  }

  if (isFallbackOpdName(namaOpd)) {
    return ` - ${namaOpd} belum ter-resolve`;
  }

  // Context lama bisa sudah menyertakan nama OPD di dalam periode_label sendiri
  // (lihat komentar stripLegacySourcePrefix) — jangan ditempel dua kali
  // ("... - Dinas Pangan - Dinas Pangan").
  if (periodeLabel && periodeLabel.toLowerCase().includes(namaOpd.toLowerCase())) {
    return '';
  }

  return ` - ${namaOpd}`;
};

const CONTEXT_STATUS_SUFFIX_LABEL = {
  draft: 'Draft',
  verifikasi: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  final: 'Disetujui',
  selesai: 'Disetujui',
  ditolak: 'Ditolak',
};

// Sejak periode_label dibersihkan dari nama sumber (stripLegacySourcePrefix),
// dua context BERBEDA untuk OPD+tahun+tipe periode yang sama (mis. bekas
// "Renstra - Tahun 2025" vs "Lakip - Tahun 2025" vs context kosong baru) bisa
// tampil dengan teks IDENTIK di dropdown — user tidak bisa membedakan mana
// yang sudah lengkap datanya. Suffix status ini wajib ada supaya user tahu
// context mana yang benar untuk dipilih (terutama yang sudah "Disetujui").
const getReportGroupLabel = (context) => {
  const periodeType = normalizePeriodeType(context);
  const periodeLabel = getCleanPeriodeLabel(context);
  const opdLabel = getReportOpdLabel(context, periodeLabel);
  const statusKey = String(context?.status_revisi || 'draft').toLowerCase();
  const statusSuffix = ` [${CONTEXT_STATUS_SUFFIX_LABEL[statusKey] || 'Draft'} · ID ${context?.id || '-'}]`;

  if (periodeType === 'bulanan') {
    return `Laporan MR Bulanan - ${periodeLabel}${opdLabel}${statusSuffix}`;
  }

  if (periodeType === 'triwulan') {
    return `Laporan MR Triwulan - ${periodeLabel}${opdLabel}${statusSuffix}`;
  }

  if (periodeType === 'semesteran') {
    return `Laporan MR Semesteran - ${periodeLabel}${opdLabel}${statusSuffix}`;
  }

  if (periodeType === 'tahunan') {
    return `Laporan MR Tahunan - ${periodeLabel}${opdLabel}${statusSuffix}`;
  }

  return `Laporan MR - ${periodeLabel}${opdLabel}${statusSuffix}`;
};

const getReportGroupKey = (context) => {
  const periodeType = normalizePeriodeType(context);
  const tahun = context?.tahun || '';
  const periodeLabel = String(context?.periode_label || '')
    .trim()
    .toLowerCase();

  const namaOpd = String(
    context?.nama_opd || context?.opd_nama || context?.nama_perangkat_daerah || '',
  )
    .trim()
    .toLowerCase();

  const opdKey = isFallbackOpdName(namaOpd) ? 'fallback_opd' : namaOpd;

  return `${periodeType}_${tahun}_${periodeLabel}_${opdKey}`;
};

const isFallbackOpdName = (value) => {
  const text = String(value || '')
    .trim()
    .toLowerCase();

  if (!text) return true;

  return /^opd\s+\d+$/i.test(text) || text === 'opd' || text === 'belum diisi';
};

const normalizeStatusScore = (value) => {
  const status = String(value || '')
    .trim()
    .toLowerCase();

  if (['approved', 'disetujui'].includes(status)) return 40;
  if (['verifikasi', 'diverifikasi', 'diajukan'].includes(status)) return 25;
  if (status === 'draft') return 10;

  return 0;
};

const normalizeReportCompletenessScore = (context) => {
  let score = 0;

  const namaOpd = context?.nama_opd || context?.opd_nama || context?.nama_perangkat_daerah;

  if (namaOpd && !isFallbackOpdName(namaOpd)) {
    score += 100;
  }

  if (
    String(namaOpd || '')
      .toLowerCase()
      .includes('dinas pangan')
  ) {
    score += 80;
  }

  if (context?.periode_label) {
    score += 10;
  }

  if (context?.tahun) {
    score += 10;
  }

  if (context?.jenis_dokumen) {
    score += 5;
  }

  score += normalizeStatusScore(context?.status_revisi);

  return score;
};

const pickBestContextForReport = (contexts = []) => {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return null;
  }

  return [...contexts].sort((a, b) => {
    const scoreA = normalizeReportCompletenessScore(a);
    const scoreB = normalizeReportCompletenessScore(b);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    const idA = Number(a?.id || 0);
    const idB = Number(b?.id || 0);

    return idB - idA;
  })[0];
};

const getReportTypeOrder = (context) => {
  const periodeType = normalizePeriodeType(context);

  const orderMap = {
    bulanan: 1,
    triwulan: 2,
    semesteran: 3,
    tahunan: 4,
    lainnya: 9,
  };

  return orderMap[periodeType] || 9;
};

const isSmokeFixtureContext = (context) => {
  const metadata = context?.metadata_json || {};
  const note = String(metadata?.note || context?.risk_appetite_note || '').toLowerCase();
  const source = String(metadata?.source || '').toLowerCase();
  const generatedBy = String(metadata?.generated_by || '').toLowerCase();
  const alasan = String(context?.alasan_revisi || '').toLowerCase();

  return (
    source.includes('smoke_fixture') ||
    generatedBy.includes('smoke_fixture') ||
    note.includes('smoke fixture') ||
    alasan.includes('smoke fixture') ||
    alasan.includes('create context smoke fixture')
  );
};

const isValidResolvedOpdContext = (context) => {
  const namaOpd = String(
    context?.nama_opd || context?.opd_nama || context?.nama_perangkat_daerah || '',
  ).trim();

  if (!namaOpd) {
    return false;
  }

  return !isFallbackOpdName(namaOpd);
};

const isReportReadyContext = (context) => {
  if (!context) return false;

  if (isSmokeFixtureContext(context)) {
    return false;
  }

  if (!isValidResolvedOpdContext(context)) {
    return false;
  }

  return true;
};

const formatPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  return `${number.toFixed(number % 1 === 0 ? 0 : 2)}%`;
};

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value ?? '-';
  return number.toLocaleString('id-ID');
};

const formatDateTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatFileSize = (value) => {
  const size = Number(value);

  if (!Number.isFinite(size) || size <= 0) return '-';

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getExportFormatColor = (value) => {
  const format = String(value || '').toLowerCase();

  if (format === 'pdf') return 'red';
  if (format === 'docx') return 'blue';
  if (format === 'excel') return 'green';

  return 'default';
};

const getGenerateStatusColor = (value) => {
  const status = String(value || '').toLowerCase();

  if (status === 'success') return 'green';
  if (status === 'failed') return 'red';
  if (status === 'processing') return 'blue';
  if (status === 'pending') return 'orange';

  return 'default';
};

const getBackendErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    return fallbackMessage;
  }

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === 'string') return data;
  if (error?.message) return error.message;

  return fallbackMessage;
};

const downloadBlob = (response, fallbackFilename) => {
  const disposition = response?.headers?.['content-disposition'];
  let filename = fallbackFilename;

  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const normalMatch = disposition.match(/filename="?([^"]+)"?/i);

    if (utf8Match?.[1]) {
      filename = decodeURIComponent(utf8Match[1]);
    } else if (normalMatch?.[1]) {
      filename = normalMatch[1];
    }
  }

  const blob = new Blob([response.data], {
    type:
      response?.headers?.['content-type'] ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
};

const summaryCards = [
  ['total_risiko', 'Total Risiko'],
  ['total_usulan_risiko', 'Usulan Risiko'],
  ['total_risiko_di_atas_selera', 'Di Atas Selera'],
  ['total_kegiatan_pengendalian', 'Rencana Pengendalian'],
  ['total_pengendalian_terealisasi', 'Terealisasi'],
  ['rata_rata_progress', 'Rata-rata Progress', 'percent'],
  ['total_kejadian_risiko', 'Kejadian Risiko'],
];

const daftarRisikoColumns = [
  {
    title: 'Kode Risiko',
    dataIndex: 'kode_risiko',
    width: 180,
  },
  {
    title: 'Nama Risiko',
    dataIndex: 'nama_risiko',
    width: 320,
  },
  {
    title: 'Level',
    dataIndex: 'level_risiko',
    width: 120,
    render: (value) => <Tag color="orange">{value || '-'}</Tag>,
  },
  {
    title: 'Skor',
    dataIndex: 'skor_risiko',
    width: 90,
    render: formatNumber,
  },
  {
    title: 'Status',
    dataIndex: 'status_revisi',
    width: 120,
    render: (value) => <Tag>{String(value || '-').toUpperCase()}</Tag>,
  },
];

const analisisColumns = [
  {
    title: 'Kode Risiko',
    dataIndex: 'kode_risiko',
    width: 180,
  },
  {
    title: 'Existing Control',
    dataIndex: 'existing_control_status',
    width: 180,
    render: (value) => <Tag color="red">{value || '-'}</Tag>,
  },
  {
    title: 'Residual',
    dataIndex: 'residual_level',
    width: 160,
    render: (_, record) => `${record.residual_score || '-'} / ${record.residual_level || '-'}`,
  },
  {
    title: 'Di Atas Selera',
    dataIndex: 'is_above_appetite',
    width: 140,
    render: (value) => (value ? <Tag color="red">Ya</Tag> : <Tag color="green">Tidak</Tag>),
  },
  {
    title: 'Rekomendasi',
    dataIndex: 'rekomendasi',
    width: 420,
  },
];

const rtpColumns = [
  {
    title: 'Kode Risiko',
    dataIndex: 'kode_risiko',
    width: 180,
  },
  {
    title: 'Respons',
    dataIndex: 'respon_risiko',
    width: 180,
  },
  {
    title: 'Kegiatan Pengendalian',
    dataIndex: 'kegiatan_pengendalian',
    width: 420,
  },
  {
    title: 'Setelah Mitigasi',
    dataIndex: 'risk_after_mitigation_level',
    width: 180,
    render: (_, record) =>
      `${record.risk_after_mitigation_score || '-'} / ${record.risk_after_mitigation_level || '-'}`,
  },
];

const realisasiColumns = [
  {
    title: 'Kode Risiko',
    dataIndex: 'kode_risiko',
    width: 180,
  },
  {
    title: 'Progress',
    dataIndex: 'progress_persen',
    width: 120,
    render: formatPercent,
  },
  {
    title: 'Efektivitas',
    dataIndex: 'efektivitas_pengendalian',
    width: 180,
  },
  {
    title: 'Aktual',
    dataIndex: 'actual_level',
    width: 160,
    render: (_, record) => `${record.actual_score || '-'} / ${record.actual_level || '-'}`,
  },
  {
    title: 'Tren',
    dataIndex: 'risk_trend',
    width: 140,
    render: (value) => <Tag color="green">{value || '-'}</Tag>,
  },
];

const exportHistoryColumns = [
  {
    title: 'Waktu Export',
    dataIndex: 'generated_at',
    width: 180,
    render: formatDateTime,
  },
  {
    title: 'Format',
    dataIndex: 'export_format',
    width: 100,
    render: (value) => (
      <Tag color={getExportFormatColor(value)}>{String(value || '-').toUpperCase()}</Tag>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'generate_status',
    width: 120,
    render: (value) => (
      <Tag color={getGenerateStatusColor(value)}>{String(value || '-').toUpperCase()}</Tag>
    ),
  },
  {
    title: 'Nama File',
    dataIndex: 'file_name',
    width: 320,
    ellipsis: true,
  },
  {
    title: 'Ukuran',
    dataIndex: 'file_size',
    width: 120,
    render: formatFileSize,
  },
  {
    title: 'User',
    dataIndex: 'generated_by',
    width: 100,
    render: (value) => value || '-',
  },
  {
    title: 'Variant',
    dataIndex: ['metadata', 'export_variant'],
    width: 180,
    render: (value) => value || '-',
  },
  {
    title: 'Endpoint',
    dataIndex: ['metadata', 'source_endpoint'],
    width: 320,
    ellipsis: true,
    render: (value) => value || '-',
  },
  {
    title: 'Error',
    dataIndex: 'error_message',
    width: 260,
    ellipsis: true,
    render: (value) => value || '-',
  },
];

const EXPORT_HISTORY_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS'];

// Sama dengan WRITE role di backend/routes/mr_planningContextRoutes.js — backend
// tetap jadi penegak akses sebenarnya, ini hanya menyembunyikan tombol di UI
// supaya role lain tidak mencoba aksi yang pasti ditolak backend.
const CONTEXT_WORKFLOW_ROLES = ['SUPER_ADMIN', 'ADMINISTRATOR'];

const normalizeRole = (value) => {
  if (!value) return '';

  if (Array.isArray(value)) {
    return normalizeRole(value[0]);
  }

  if (typeof value === 'object') {
    return normalizeRole(
      value.role ||
        value.role_name ||
        value.name ||
        value.nama_role ||
        value.kode_role ||
        value.slug,
    );
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_');
};

const getRoleFromObject = (payload = {}) => {
  return normalizeRole(
    payload.role ||
      payload.role_name ||
      payload.nama_role ||
      payload.kode_role ||
      payload.user_role ||
      payload.userRole ||
      payload?.user?.role ||
      payload?.user?.role_name ||
      payload?.user?.nama_role ||
      payload?.user?.kode_role ||
      payload?.data?.role ||
      payload?.data?.role_name ||
      payload?.data?.user?.role ||
      payload?.data?.user?.role_name ||
      payload?.profile?.role ||
      payload?.profile?.role_name ||
      payload?.auth?.role ||
      payload?.auth?.role_name,
  );
};

const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return null;
    }

    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

const getCurrentUserRole = () => {
  const directRoleKeys = ['role', 'userRole', 'role_name', 'nama_role', 'kode_role'];

  for (const key of directRoleKeys) {
    const role = normalizeRole(localStorage.getItem(key));
    if (role) return role;
  }

  const userObjectKeys = [
    'user',
    'authUser',
    'currentUser',
    'profile',
    'auth',
    'authData',
    'loginData',
  ];

  for (const key of userObjectKeys) {
    try {
      const rawValue = localStorage.getItem(key);

      if (!rawValue) continue;

      const parsedValue = JSON.parse(rawValue);
      const role = getRoleFromObject(parsedValue);

      if (role) return role;
    } catch (error) {
      const role = normalizeRole(localStorage.getItem(key));
      if (role) return role;
    }
  }

  const tokenKeys = ['token', 'accessToken', 'access_token', 'jwt', 'authToken'];

  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    const payload = decodeJwtPayload(token);
    const role = getRoleFromObject(payload || {});

    if (role) return role;
  }

  return '';
};

const getDataQualityGate = (fullReport) => {
  return (
    fullReport?.data_quality_gate ||
    fullReport?.report_quality_gate?.data_quality_gate ||
    fullReport?.lampiran?.data_quality_gate ||
    null
  );
};

const getDataQualityIssuePreview = (dataQualityGate, limit = 8) => {
  const issues = Array.isArray(dataQualityGate?.issue_preview)
    ? dataQualityGate.issue_preview
    : Array.isArray(dataQualityGate?.issues)
      ? dataQualityGate.issues
      : [];

  return issues.slice(0, limit);
};

const formatPlaceholderIssue = (issue) => {
  const source = issue?.source || '-';
  const field = issue?.field || '-';
  const value = issue?.value || '-';

  return `${source} -> ${field}: ${value}`;
};

const formatRiskList = (values = []) => {
  const list = Array.isArray(values) ? values : [];

  if (!list.length) return '-';

  return list.join(', ');
};

const getIntegrityStatusColor = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'merah') return 'red';
  if (value === 'kuning') return 'orange';
  if (value.includes('hijau')) return 'green';
  return 'default';
};

const getGovernanceStatusLabel = (status, blockingCount) => {
  const value = String(status || '').toLowerCase();
  if (value === 'merah') return 'MERAH';
  if (value === 'kuning') return 'KUNING TERKENDALI';
  if (value.includes('hijau') && Number(blockingCount || 0) === 0) return 'HIJAU TERKENDALI';
  return 'KUNING';
};

const getFindingRepairPath = (code) => {
  const value = String(code || '').toUpperCase();
  if (value.includes('PEDOMAN_1')) return '/mr/planning-context';
  if (value.includes('PEDOMAN_4')) return '/mr/planning-risk';
  if (value.includes('PEDOMAN_5')) return '/mr/planning-risk';
  if (value.includes('PEDOMAN_8')) return '/mr/planning-risk';
  if (value.includes('PEDOMAN_10')) return '/mr/planning-risk';
  if (value.includes('PEDOMAN_15')) return '/mr/planning-risk';
  if (value.includes('RESIDUAL')) return '/mr/planning-risk';
  return '/mr/planning-report';
};

const getFindingRoute = (finding) => {
  const targetRoute = String(finding?.target_route || '').trim();
  if (targetRoute) return targetRoute;
  return getFindingRepairPath(finding?.code);
};

const extractIssueCount = (message = '') => {
  const hit = String(message).match(/Terdapat\s+(\d+)/i);
  return hit ? Number(hit[1]) : 0;
};

const MrPlanningReportPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [downloadingType, setDownloadingType] = useState(null);
  const [repairingDraft, setRepairingDraft] = useState(false);
  const [repairDraftSummary, setRepairDraftSummary] = useState(null);
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [changedStepNos, setChangedStepNos] = useState([]);
  const [contextWorkflowLoading, setContextWorkflowLoading] = useState(null);
  const { guard } = useMrIdempotency();

  const currentUserRole = String(getCurrentUserRole() || '').toUpperCase();
  const canReadExportHistory = EXPORT_HISTORY_ROLES.includes(currentUserRole);
  const canManageContextWorkflow = CONTEXT_WORKFLOW_ROLES.includes(currentUserRole);

  const {
    data: contextsResponse,
    isLoading: isLoadingContexts,
    refetch: refetchContexts,
  } = useQuery({
    queryKey: QUERY_KEYS.contexts,
    queryFn: () => mrPlanningReportService.getContexts(),
  });

  const contextRows = useMemo(() => unwrapRows(contextsResponse), [contextsResponse]);

  const contextOptions = useMemo(() => {
    const groupedContexts = new Map();

    contextRows.forEach((context) => {
      // Guard laporan resmi:
      // context smoke fixture/testing dan OPD fallback seperti OPD 1
      // tidak boleh masuk dropdown export laporan final.
      if (!isReportReadyContext(context)) {
        return;
      }

      const groupKey = getReportGroupKey(context);

      if (!groupedContexts.has(groupKey)) {
        groupedContexts.set(groupKey, []);
      }

      groupedContexts.get(groupKey).push(context);
    });

    return Array.from(groupedContexts.values())
      .map((items) => {
        const selectedContext = pickBestContextForReport(items);

        if (!selectedContext) {
          return null;
        }

        return {
          label: getReportGroupLabel(selectedContext),
          value: selectedContext.id,
          item: selectedContext,
          groupedItems: items,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const typeOrderA = getReportTypeOrder(a.item);
        const typeOrderB = getReportTypeOrder(b.item);

        if (typeOrderA !== typeOrderB) {
          return typeOrderA - typeOrderB;
        }

        const yearA = Number(a.item?.tahun || 0);
        const yearB = Number(b.item?.tahun || 0);

        if (yearA !== yearB) {
          return yearB - yearA;
        }

        return String(a.label).localeCompare(String(b.label), 'id-ID');
      });
  }, [contextRows]);

  const {
    data: fullReportResponse,
    isLoading: isLoadingReport,
    isFetching: isFetchingReport,
    refetch: refetchReport,
  } = useQuery({
    queryKey: QUERY_KEYS.fullReport(selectedContextId),
    queryFn: () => mrPlanningReportService.getFullReport(selectedContextId),
    enabled: Boolean(selectedContextId),
  });

  const {
    data: exportHistoryResponse,
    isLoading: isLoadingExportHistory,
    isFetching: isFetchingExportHistory,
    refetch: refetchExportHistory,
  } = useQuery({
    queryKey: QUERY_KEYS.exportHistory(selectedContextId),
    queryFn: () =>
      mrPlanningReportService.getExportHistory(selectedContextId, {
        limit: 20,
        status: 'success',
      }),
    enabled: Boolean(selectedContextId) && canReadExportHistory,
  });

  const {
    data: integrityScanResponse,
    isLoading: isLoadingIntegrityScan,
    isFetching: isFetchingIntegrityScan,
    refetch: refetchIntegrityScan,
  } = useQuery({
    queryKey: QUERY_KEYS.integrityScan(selectedContextId),
    queryFn: async () => {
      const response = await api.get(`/mr-report/context/${selectedContextId}/integrity-scan`);
      return response?.data;
    },
    enabled: Boolean(selectedContextId),
  });

  // report.context (dari getFullReport) dibangun dari raw SQL kolom terbatas
  // (backend/services/mr/mrPlanningReportQueryService.js:getContext) yang TIDAK
  // menyertakan diverifikasi_oleh/diverifikasi_pada/disetujui_oleh/disetujui_pada
  // — jadi tidak bisa dipakai untuk menentukan progres tombol Ajukan/Verifikasi/
  // Setujui. Ambil field itu lewat endpoint detail context terpisah (row model
  // penuh, sudah dipakai wizard) supaya tidak perlu mengubah SQL laporan.
  const {
    data: contextDetailResponse,
    refetch: refetchContextDetail,
  } = useQuery({
    queryKey: QUERY_KEYS.contextDetail(selectedContextId),
    queryFn: async () => {
      const result = await getMrPlanningContextDetail(selectedContextId);
      return result?.data || result || null;
    },
    enabled: Boolean(selectedContextId),
  });

  const report = fullReportResponse?.data || null;
  const context = report?.context || null;
  const contextWorkflowDetail = contextDetailResponse || null;

  // Alur workflow context (lihat mrPlanningContextService.js backend):
  // draft/ditolak -> submit -> verifikasi -> verify -> verifikasi
  // (diverifikasi_oleh terisi) -> approve -> approved. Word/PDF laporan MR
  // baru aktif setelah status ini 'approved' (FINAL_REPORT_STATUSES di
  // mrPlanningReportQueryService.js) — sebelumnya tidak ada UI untuk
  // menjalankan alur ini sama sekali sehingga context selamanya draft.
  //
  // Dipakai dari contextWorkflowDetail (bukan `context` dari getFullReport)
  // karena raw SQL getContext() di backend tidak menyertakan kolom
  // diverifikasi_oleh/diverifikasi_pada, sehingga status "sudah diverifikasi"
  // tidak akan pernah terbaca lewat `context` dan tombol Setujui tidak pernah
  // muncul walau verify sudah berhasil di backend.
  const contextStatusRevisi = String(
    contextWorkflowDetail?.status_revisi || context?.status_revisi || 'draft',
  ).toLowerCase();
  const contextIsVerified = Boolean(
    contextWorkflowDetail?.diverifikasi_oleh && contextWorkflowDetail?.diverifikasi_pada,
  );
  const isContextApproved = ['approved', 'final', 'selesai'].includes(contextStatusRevisi);
  const canSubmitContext = ['draft', 'ditolak'].includes(contextStatusRevisi);
  const canVerifyContext = contextStatusRevisi === 'verifikasi' && !contextIsVerified;
  const canApproveContext = contextStatusRevisi === 'verifikasi' && contextIsVerified;
  const contextStatusLabel = isContextApproved
    ? 'Disetujui (Final)'
    : contextStatusRevisi === 'ditolak'
      ? 'Ditolak'
      : contextStatusRevisi === 'verifikasi'
        ? contextIsVerified
          ? 'Terverifikasi — Menunggu Persetujuan'
          : 'Menunggu Verifikasi'
        : 'Draft';

  const summary = report?.summary || null;
  const narasi = report?.narasi || {};
  const lampiran = report?.lampiran || {};
  const narasiEntries = Object.entries(narasi || {});

  const dataQualityGate = getDataQualityGate(report);
  const governanceGate = report?.report_governance_gate || {};
  const officialContract = report?.official_report_contract || {};
  const finalRecordSummary = officialContract?.final_record_summary || {};
  const officialDataSource = String(
    finalRecordSummary?.official_data_source || report?.official_data_source || '',
  ).toLowerCase();
  const finalStatus = String(
    finalRecordSummary?.final_status || report?.final_status || context?.status_revisi || '',
  ).toLowerCase();
  const reportVersion = String(
    finalRecordSummary?.active_version || report?.active_version || context?.versi || '',
  ).trim();
  const latestApprovedVersion = String(
    finalRecordSummary?.latest_approved_version || report?.latest_approved_version || '',
  ).trim();
  const latestApprovedFallbackAlert =
    officialDataSource.includes('latest_approved') ||
    Boolean(
      governanceGate?.exception_register?.some?.(
        (item) => String(item?.code || '').toUpperCase() === 'EXCEPTION_LATEST_APPROVED_USED',
      ),
    );
  const supersededLikeStatus = ['superseded', 'obsolete', 'replaced'].includes(finalStatus);
  const dataQualityIssues = getDataQualityIssuePreview(dataQualityGate);
  const placeholderSummaryRows = ensureArray(dataQualityGate?.placeholder_summary);
  const hasBlockingPlaceholder = Boolean(
    dataQualityGate?.has_blocking_placeholder ||
    Number(dataQualityGate?.blocking_placeholder_count || 0) > 0,
  );

  const exportHistoryRows = unwrapRows(exportHistoryResponse);
  const exportHistoryMeta = exportHistoryResponse?.meta || {};
  const integrityScan = integrityScanResponse?.data || null;
  const integrityFindings = ensureArray(integrityScan?.findings);
  const integrityBlockingCount = Number(integrityScan?.blocking_count || 0);
  const isIntegrityBlocked = integrityBlockingCount > 0;
  const hasSelectedContext = Boolean(selectedContextId || form.getFieldValue('context_id'));
  const governanceStatusLabel = getGovernanceStatusLabel(
    integrityScan?.overall_status,
    integrityScan?.blocking_count,
  );
  const findByCode = (code) =>
    integrityFindings.filter((f) => String(f?.code || '').toUpperCase() === code);
  const getFirstByCode = (code) => findByCode(code)[0] || null;
  const ped1Open = findByCode('PEDOMAN_1_CONTEXT_SOURCE_MISSING').length > 0;
  const ped4Count = findByCode('PEDOMAN_4_RISK_CATEGORY_MISSING').length;
  const computeStepOpenCount = (code) => {
    const rows = findByCode(code);
    if (rows.length === 0) return 0;
    const messageMax = rows.reduce((max, f) => Math.max(max, extractIssueCount(f?.message)), 0);
    if (messageMax > 0) return messageMax;
    // Fallback saat backend tidak mengirim pola "Terdapat X ..." pada message
    return rows.length;
  };
  const ped5Max = computeStepOpenCount('PEDOMAN_5_ANALYSIS_MISSING');
  const ped8Max = computeStepOpenCount('PEDOMAN_8_ROOT_CAUSE_MISSING');
  const ped10Max = computeStepOpenCount('PEDOMAN_10_MONITORING_MISSING');
  const ped15Max = computeStepOpenCount('PEDOMAN_15_EFFECTIVENESS_UNRATED');
  const ped1Finding = getFirstByCode('PEDOMAN_1_CONTEXT_SOURCE_MISSING');
  const ped4Finding = getFirstByCode('PEDOMAN_4_RISK_CATEGORY_MISSING');
  const ped5Finding = getFirstByCode('PEDOMAN_5_ANALYSIS_MISSING');
  const ped8Finding = getFirstByCode('PEDOMAN_8_ROOT_CAUSE_MISSING');
  const ped10Finding = getFirstByCode('PEDOMAN_10_MONITORING_MISSING');
  const ped15Finding = getFirstByCode('PEDOMAN_15_EFFECTIVENESS_UNRATED');
  const actionChecklist = [
    {
      no: 1,
      title: ped1Finding?.user_title || 'Buat konteks & sumber risiko',
      desc: ped1Finding?.user_message || 'Isi OPD, periode, dan minimal 1 sumber risiko (konteks)',
      status: ped1Open ? 'Belum selesai' : 'Selesai',
      countLabel: ped1Open ? 'Belum' : 'Selesai',
      path: getFindingRoute(ped1Finding) || '/mr/planning-context',
      done: !ped1Open,
      cta: 'Perbaiki di Context',
      technicalDetails: findByCode('PEDOMAN_1_CONTEXT_SOURCE_MISSING'),
    },
    {
      no: 2,
      title: ped4Finding?.user_title || 'Lengkapi data risiko',
      desc:
        ped4Finding?.user_message || 'Lengkapi kategori risiko pada data risiko yang masih kosong.',
      status: ped4Count > 0 ? `${ped4Count} belum diisi` : 'Selesai',
      countLabel: ped4Count > 0 ? `${ped4Count} belum diisi` : 'Selesai',
      path: getFindingRoute(ped4Finding) || '/mr/planning-risk',
      done: ped4Count === 0,
      cta: 'Perbaiki di Daftar Risiko',
      technicalDetails: findByCode('PEDOMAN_4_RISK_CATEGORY_MISSING'),
    },
    {
      no: 3,
      title: ped5Finding?.user_title || 'Isi analisis risiko',
      desc:
        ped5Finding?.user_message ||
        'Lengkapi analisis kemungkinan, dampak, dan residual pada risiko terkait.',
      status: ped5Max > 0 ? `${ped5Max} belum` : 'Selesai',
      countLabel: ped5Max > 0 ? `${ped5Max} belum` : 'Selesai',
      path: getFindingRoute(ped5Finding) || '/mr/planning-risk',
      done: ped5Max === 0,
      cta: 'Perbaiki di Analisis Risiko',
      technicalDetails: findByCode('PEDOMAN_5_ANALYSIS_MISSING'),
    },
    {
      no: 4,
      title: ped8Finding?.user_title || 'Isi root cause analysis',
      desc:
        ped8Finding?.user_message ||
        'Lengkapi akar penyebab (root cause) pada risiko prioritas yang belum terisi.',
      status: ped8Max > 0 ? `${ped8Max} belum` : 'Selesai',
      countLabel: ped8Max > 0 ? `${ped8Max} belum` : 'Selesai',
      path: getFindingRoute(ped8Finding) || '/mr/planning-risk',
      done: ped8Max === 0,
      cta: 'Perbaiki di Root Cause',
      technicalDetails: findByCode('PEDOMAN_8_ROOT_CAUSE_MISSING'),
    },
    {
      no: 5,
      title: ped10Finding?.user_title || 'Monitoring rencana pengendalian',
      desc:
        ped10Finding?.user_message ||
        'Lengkapi data monitoring pada RTP aktif yang belum dimonitoring.',
      status: ped10Max > 0 ? `${ped10Max} belum` : 'Selesai',
      countLabel: ped10Max > 0 ? `${ped10Max} belum` : 'Selesai',
      path: getFindingRoute(ped10Finding) || '/mr/planning-risk',
      done: ped10Max === 0,
      cta: 'Perbaiki di Monitoring',
      technicalDetails: findByCode('PEDOMAN_10_MONITORING_MISSING'),
    },
    {
      no: 6,
      title: ped15Finding?.user_title || 'Nilai efektivitas pengendalian',
      desc:
        ped15Finding?.user_message ||
        'Lengkapi penilaian efektivitas pengendalian pada monitoring terkait.',
      status: ped15Max > 0 ? `${ped15Max} belum` : 'Selesai',
      countLabel: ped15Max > 0 ? `${ped15Max} belum` : 'Selesai',
      path: getFindingRoute(ped15Finding) || '/mr/planning-risk',
      done: ped15Max === 0,
      cta: 'Perbaiki di Efektivitas',
      technicalDetails: findByCode('PEDOMAN_15_EFFECTIVENESS_UNRATED'),
    },
  ];
  const completedChecklistCount = actionChecklist.filter((item) => item.done).length;
  const totalChecklistCount = actionChecklist.length;
  const computeChecklistMetricsFromFindings = (findings = []) => {
    const byCode = (code) =>
      ensureArray(findings).filter((f) => String(f?.code || '').toUpperCase() === code);
    const maxFromMessageOrLength = (code) => {
      const rows = byCode(code);
      if (rows.length === 0) return 0;
      const max = rows.reduce((curr, f) => Math.max(curr, extractIssueCount(f?.message)), 0);
      return max > 0 ? max : rows.length;
    };

    return {
      ped1Open: byCode('PEDOMAN_1_CONTEXT_SOURCE_MISSING').length > 0,
      ped4Count: byCode('PEDOMAN_4_RISK_CATEGORY_MISSING').length,
      ped5Max: maxFromMessageOrLength('PEDOMAN_5_ANALYSIS_MISSING'),
      ped8Max: maxFromMessageOrLength('PEDOMAN_8_ROOT_CAUSE_MISSING'),
      ped10Max: maxFromMessageOrLength('PEDOMAN_10_MONITORING_MISSING'),
      ped15Max: maxFromMessageOrLength('PEDOMAN_15_EFFECTIVENESS_UNRATED'),
    };
  };

  const getChangedStepNumbers = (before, after) => {
    const changed = [];
    if (!!before.ped1Open !== !!after.ped1Open) changed.push(1);
    if (Number(before.ped4Count || 0) !== Number(after.ped4Count || 0)) changed.push(2);
    if (Number(before.ped5Max || 0) !== Number(after.ped5Max || 0)) changed.push(3);
    if (Number(before.ped8Max || 0) !== Number(after.ped8Max || 0)) changed.push(4);
    if (Number(before.ped10Max || 0) !== Number(after.ped10Max || 0)) changed.push(5);
    if (Number(before.ped15Max || 0) !== Number(after.ped15Max || 0)) changed.push(6);
    return changed;
  };

  const handleRescan = async () => {
    const beforeBlocking = Number(integrityScan?.blocking_count || 0);
    const beforeMetrics = computeChecklistMetricsFromFindings(integrityFindings);
    const latestScanResponse = await refetchIntegrityScan();
    const latestScan = latestScanResponse?.data?.data || latestScanResponse?.data || {};
    const afterBlocking = Number(latestScan?.blocking_count || 0);
    const afterFindings = ensureArray(latestScan?.findings);
    const afterMetrics = computeChecklistMetricsFromFindings(afterFindings);
    const changed = getChangedStepNumbers(beforeMetrics, afterMetrics);
    setChangedStepNos(changed);
    if (changed.length > 0) {
      window.setTimeout(() => setChangedStepNos([]), 2500);
    }

    const delta = afterBlocking - beforeBlocking;
    let summary = `Scan selesai. Blocking: ${beforeBlocking} -> ${afterBlocking}.`;
    if (delta < 0) {
      summary = `Scan selesai. Bagus, blocker berkurang ${Math.abs(delta)} (${beforeBlocking} -> ${afterBlocking}).`;
      message.success(summary);
    } else if (delta > 0) {
      summary = `Scan selesai. Perhatian, blocker bertambah ${delta} (${beforeBlocking} -> ${afterBlocking}).`;
      message.warning(summary);
    } else {
      message.info(summary);
    }
    setScanFeedback({ summary, changedCount: changed.length });
  };
  const buildRepairUrl = (basePath, findingCode = '') => {
    const contextIdForNav = selectedContextId || form.getFieldValue('context_id');
    const params = new URLSearchParams();
    if (contextIdForNav) params.set('context_id', String(contextIdForNav));
    params.set('from', 'integrity_scan');
    if (findingCode) params.set('finding', String(findingCode).toUpperCase());
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const handleRepairDraftFromFindings = guard(async () => {
    const contextId = selectedContextId || form.getFieldValue('context_id');
    if (!contextId) {
      message.warning('Pilih periode laporan terlebih dahulu sebelum membuat draft perbaikan.');
      return;
    }

    const findingCodes = Array.from(
      new Set(
        ensureArray(integrityFindings)
          .map((f) => String(f?.code || '').toUpperCase())
          .filter(Boolean),
      ),
    );

    if (findingCodes.length === 0) {
      message.info('Tidak ada finding aktif untuk dibuatkan draft perbaikan otomatis.');
      return;
    }

    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: 'Konfirmasi Buat Draft Perbaikan Otomatis',
        content:
          'Sistem akan membuat draft perbaikan awal berdasarkan finding terpilih (tanpa auto-approve/final). Lanjutkan?',
        okText: 'Ya, Buat Draft',
        cancelText: 'Batal',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      setRepairingDraft(true);
      const result = await mrPlanningReportService.repairDraftFromFindings(contextId, {
        finding_codes: findingCodes,
        repair_mode: 'draft_only',
        confirm: true,
      });
      const summary = result?.data || result || {};
      setRepairDraftSummary(summary);
      await refetchIntegrityScan();
      message.success('Proses draft perbaikan otomatis selesai.');
    } catch (error) {
      const msg = getBackendErrorMessage(error, 'Gagal membuat draft perbaikan otomatis.');
      message.error(msg);
    } finally {
      setRepairingDraft(false);
    }
  });

  const placeholderSummaryColumns = [
    {
      title: 'Field',
      dataIndex: 'field',
      width: 280,
      render: (value, record) => (
        <div>
          <div>
            <Text strong>{value || '-'}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record?.source || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Nilai Placeholder',
      dataIndex: 'value',
      width: 240,
      render: (value) => <Text type="danger">{value || '-'}</Text>,
    },
    {
      title: 'Jumlah',
      dataIndex: 'count',
      width: 90,
      render: (value) => formatNumber(value),
    },
    {
      title: 'Risk ID',
      dataIndex: 'risk_ids',
      width: 150,
      render: (value) => formatRiskList(value),
    },
    {
      title: 'Kode Risiko',
      dataIndex: 'kode_risiko_list',
      width: 220,
      render: (value) => formatRiskList(value),
    },
    {
      title: 'Context ID',
      dataIndex: 'context_ids',
      width: 130,
      render: (value) => formatRiskList(value),
    },
  ];

  const getWorkflowContextId = () => selectedContextId || form.getFieldValue('context_id');

  const handleSubmitContextWorkflow = guard(async () => {
    const contextId = getWorkflowContextId();
    if (!contextId) {
      message.warning('Pilih periode laporan terlebih dahulu.');
      return;
    }

    try {
      setContextWorkflowLoading('submit');
      const result = await submitMrPlanningContext(contextId);
      message.success(result?.message || 'Context berhasil diajukan untuk verifikasi.');
      await Promise.all([refetchReport(), refetchContexts(), refetchContextDetail()]);
    } catch (error) {
      message.error(getBackendErrorMessage(error, 'Gagal mengajukan context untuk verifikasi.'));
    } finally {
      setContextWorkflowLoading(null);
    }
  });

  const handleVerifyContextWorkflow = guard(async () => {
    const contextId = getWorkflowContextId();
    if (!contextId) {
      message.warning('Pilih periode laporan terlebih dahulu.');
      return;
    }

    try {
      setContextWorkflowLoading('verify');
      const result = await verifyMrPlanningContext(contextId);
      message.success(result?.message || 'Context berhasil diverifikasi.');
      await Promise.all([refetchReport(), refetchContexts(), refetchContextDetail()]);
    } catch (error) {
      message.error(getBackendErrorMessage(error, 'Gagal memverifikasi context.'));
    } finally {
      setContextWorkflowLoading(null);
    }
  });

  const handleApproveContextWorkflow = guard(async () => {
    const contextId = getWorkflowContextId();
    if (!contextId) {
      message.warning('Pilih periode laporan terlebih dahulu.');
      return;
    }

    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: 'Setujui Context Laporan MR?',
        content:
          'Setelah disetujui, context akan terkunci (final) dan Download Word/PDF akan aktif. Pastikan data risiko sudah benar sebelum melanjutkan.',
        okText: 'Ya, Setujui',
        cancelText: 'Batal',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      setContextWorkflowLoading('approve');
      const result = await approveMrPlanningContext(contextId);
      message.success(result?.message || 'Context berhasil disetujui.');
      await Promise.all([
        refetchReport(),
        refetchContexts(),
        refetchIntegrityScan(),
        refetchContextDetail(),
      ]);
    } catch (error) {
      message.error(getBackendErrorMessage(error, 'Gagal menyetujui context.'));
    } finally {
      setContextWorkflowLoading(null);
    }
  });

  const handleLoadReport = () => {
    const contextId = form.getFieldValue('context_id');

    if (!contextId) {
      message.warning('Pilih periode laporan terlebih dahulu.');
      return;
    }

    const selectedOption = contextOptions.find(
      (option) => Number(option.value) === Number(contextId),
    );

    const selectedContext = selectedOption?.item;

    if (selectedContext && !isReportReadyContext(selectedContext)) {
      message.warning(
        'Context laporan yang dipilih belum layak untuk laporan resmi. Context testing/smoke fixture atau OPD fallback seperti OPD 1 tidak boleh dipakai untuk export final.',
      );
      return;
    }

    setSelectedContextId(contextId);
  };

  const handleDownloadReport = guard(async (type) => {
    const contextId = form.getFieldValue('context_id') || selectedContextId;

    if (!contextId) {
      message.warning('Pilih periode laporan terlebih dahulu.');
      return;
    }

    const config = {
      excel: {
        service: mrPlanningReportService.exportExcel,
        fallbackFilename: `Laporan_MR_Context_${contextId}.xlsx`,
        successMessage: 'File Excel laporan MR berhasil diunduh.',
        errorMessage: 'Gagal mengunduh Excel laporan MR.',
      },
      word: {
        service: mrPlanningReportService.exportWord,
        fallbackFilename: `Laporan_MR_Context_${contextId}.docx`,
        successMessage: 'File Word laporan MR berhasil diunduh.',
        errorMessage: 'Gagal mengunduh Word laporan MR.',
      },
      pdf: {
        service: mrPlanningReportService.exportPdf,
        fallbackFilename: `Laporan_MR_Context_${contextId}.pdf`,
        successMessage: 'File PDF laporan MR berhasil diunduh.',
        errorMessage: 'Gagal mengunduh PDF laporan MR.',
      },
    };

    const selected = config[type];

    if (!selected) {
      message.warning('Format download tidak valid.');
      return;
    }

    const selectedOption = contextOptions.find(
      (option) => Number(option.value) === Number(contextId),
    );

    const selectedContext = selectedOption?.item;

    if (selectedContext && !isReportReadyContext(selectedContext)) {
      message.warning(
        'Context laporan yang dipilih belum layak untuk laporan resmi. Context testing/smoke fixture atau OPD fallback seperti OPD 1 tidak boleh dipakai untuk export final.',
      );
      return;
    }

    if (hasBlockingPlaceholder) {
      message.warning(
        'Laporan masih memuat placeholder. File boleh diunduh untuk review, tetapi belum layak menjadi laporan final atau siap ditandatangani.',
      );
    }

    const isFinalFlow = type === 'word' || type === 'pdf';
    const latestScanResponse = await refetchIntegrityScan();
    const latestScan = latestScanResponse?.data?.data || latestScanResponse?.data || integrityScan;
    const blockingCount = Number(latestScan?.blocking_count || 0);
    const topBlockingFindings = ensureArray(latestScan?.findings)
      .filter((f) => String(f?.severity || '').toLowerCase() === 'blocking')
      .slice(0, 3)
      .map((f) => `- ${f?.message || f?.code || 'Temuan blocking'}`)
      .join('\n');

    if (blockingCount > 0 && isFinalFlow) {
      message.error(
        `Aksi ditolak oleh integrity-scan. Status: ${getGovernanceStatusLabel(
          latestScan?.overall_status,
          blockingCount,
        )}. Blocking: ${blockingCount}.`,
      );

      Modal.confirm({
        title: 'Laporan belum siap diekspor',
        okText: 'Perbaiki Sekarang',
        cancelText: 'Tutup',
        content: (
          <div>
            <p>Status: {getGovernanceStatusLabel(latestScan?.overall_status, blockingCount)}</p>
            <p>Ada {blockingCount} blocker yang perlu diperbaiki.</p>
            <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>{topBlockingFindings}</pre>
            <Button
              icon={<ReloadOutlined />}
              onClick={async () => {
                await refetchIntegrityScan();
                Modal.destroyAll();
              }}
            >
              Scan Ulang / Cek Ulang Data
            </Button>
          </div>
        ),
        onOk: () => {
          if (!hasSelectedContext) {
            message.warning('Pilih periode laporan terlebih dahulu sebelum perbaikan.');
            return;
          }

          const firstFinding = latestScan?.findings?.[0] || null;
          navigate(buildRepairUrl(getFindingRoute(firstFinding), String(firstFinding?.code || '')));
        },
      });

      return;
    }

    try {
      setDownloadingType(type);

      const response = await selected.service(contextId);

      downloadBlob(response, selected.fallbackFilename);

      message.success(selected.successMessage);

      if (contextId === selectedContextId && canReadExportHistory) {
        refetchExportHistory();
      }
    } catch (error) {
      const msg = getBackendErrorMessage(error, selected.errorMessage);
      message.error(msg);
    } finally {
      setDownloadingType(null);
    }
  });

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space
          align="start"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Laporan MR Planning
            </Title>
            <Text type="secondary">
              Ringkasan, lampiran, dan download Word, Excel, serta PDF laporan Manajemen Risiko dari
              backend.
            </Text>
          </div>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refetchContexts();

                if (selectedContextId) {
                  refetchReport();

                  if (canReadExportHistory) {
                    refetchExportHistory();
                  }
                }
              }}
            >
              Refresh
            </Button>

            <Button
              icon={<FileWordOutlined />}
              loading={downloadingType === 'word'}
              disabled={
                Boolean(downloadingType) ||
                isIntegrityBlocked ||
                (!selectedContextId && !form.getFieldValue('context_id'))
              }
              onClick={() => handleDownloadReport('word')}
            >
              Download Word
            </Button>

            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              title="Download Excel tersedia untuk review laporan meski belum final"
              loading={downloadingType === 'excel'}
              disabled={
                Boolean(downloadingType) ||
                (!selectedContextId && !form.getFieldValue('context_id'))
              }
              onClick={() => handleDownloadReport('excel')}
            >
              Download Excel
            </Button>

            <Button
              danger
              icon={<FilePdfOutlined />}
              loading={downloadingType === 'pdf'}
              disabled={
                Boolean(downloadingType) ||
                isIntegrityBlocked ||
                (!selectedContextId && !form.getFieldValue('context_id'))
              }
              onClick={() => handleDownloadReport('pdf')}
            >
              Download PDF
            </Button>
          </Space>
        </Space>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Download Excel dapat dilakukan sebagai review setelah Step 1–5 selesai. Word/PDF
          membutuhkan status final/approved sebelum diekspor.
        </Text>

        {hasSelectedContext && (
          <>
            <Space align="center" wrap style={{ marginTop: 12 }}>
              <Text strong>Status Persetujuan Laporan:</Text>
              <Tag
                color={
                  isContextApproved
                    ? 'success'
                    : contextStatusRevisi === 'ditolak'
                      ? 'error'
                      : 'processing'
                }
              >
                {contextStatusLabel}
              </Tag>
              {canManageContextWorkflow && canSubmitContext && (
                <Button
                  size="small"
                  loading={contextWorkflowLoading === 'submit'}
                  disabled={Boolean(contextWorkflowLoading)}
                  onClick={handleSubmitContextWorkflow}
                >
                  Ajukan Verifikasi
                </Button>
              )}
              {canManageContextWorkflow && canVerifyContext && (
                <Button
                  size="small"
                  loading={contextWorkflowLoading === 'verify'}
                  disabled={Boolean(contextWorkflowLoading)}
                  onClick={handleVerifyContextWorkflow}
                >
                  Verifikasi
                </Button>
              )}
              {canManageContextWorkflow && canApproveContext && (
                <Button
                  size="small"
                  type="primary"
                  loading={contextWorkflowLoading === 'approve'}
                  disabled={Boolean(contextWorkflowLoading)}
                  onClick={handleApproveContextWorkflow}
                >
                  Setujui (Final)
                </Button>
              )}
            </Space>
            {!canManageContextWorkflow && !isContextApproved && (
              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                Hanya role Super Admin/Administrator yang dapat mengajukan, memverifikasi, atau
                menyetujui context laporan ini.
              </Text>
            )}
          </>
        )}

        <Divider />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Guard Laporan MR"
          description="Frontend hanya menampilkan laporan, mengunduh file dari backend, dan membaca histori export secara read-only. Word, Excel, PDF, quality gate, dan audit/export record tetap dibuat oleh backend."
        />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Integrity Scan (Detect-Only)"
          description={
            <div>
              <div>
                Scan ini menampilkan blocker sebelum export/final. Endpoint read-only dan tidak
                mengubah data bisnis MR.
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Scan ulang hanya memeriksa kondisi data terbaru. Jika masih ada blocker, lakukan
                perbaikan pada data sumber terlebih dahulu.
              </Text>
            </div>
          }
        />

        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}
        >
          <Space>
            <Tag color={getIntegrityStatusColor(integrityScan?.overall_status)}>
              {governanceStatusLabel}
            </Tag>
            <Text>Blocking: {integrityScan?.blocking_count ?? '-'}</Text>
            <Text>Warning: {integrityScan?.warning_count ?? '-'}</Text>
            {Number(integrityScan?.blocking_count || 0) > 0 && (
              <Button
                type="primary"
                disabled={!hasSelectedContext}
                onClick={() =>
                  navigate(
                    buildRepairUrl(
                      getFindingRoute(integrityFindings[0]),
                      integrityFindings[0]?.code,
                    ),
                  )
                }
              >
                Perbaiki Sekarang
              </Button>
            )}
            {Number(integrityScan?.blocking_count || 0) > 0 && (
              <Button
                onClick={handleRepairDraftFromFindings}
                loading={repairingDraft}
                disabled={!hasSelectedContext}
              >
                Buat Draft Perbaikan Otomatis
              </Button>
            )}
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRescan}
            loading={isLoadingIntegrityScan || isFetchingIntegrityScan}
            disabled={!selectedContextId}
          >
            Scan Ulang / Cek Ulang Data
          </Button>
        </Space>
        {scanFeedback?.summary && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {scanFeedback.summary}
            {scanFeedback.changedCount > 0
              ? ` ${scanFeedback.changedCount} langkah berubah.`
              : ' Tidak ada perubahan langkah.'}
          </Text>
        )}
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {isIntegrityBlocked
            ? 'Tindakan sekarang: klik "Perbaiki Sekarang", lengkapi data yang diminta, lalu klik "Scan Ulang / Cek Ulang Data".'
            : 'Tidak ada blocker aktif. Anda dapat lanjut review dan export sesuai policy.'}
        </Text>
        {integrityBlockingCount > 0 && (
          <Button
            onClick={() => setShowRepairPanel(true)}
            style={{ marginTop: 8, marginBottom: 12 }}
          >
            Perbaiki sekarang ↗
          </Button>
        )}
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
          Konteks aktif: {form.getFieldValue('context_id') || selectedContextId || '-'} (navigasi
          perbaikan akan membawa context ini otomatis).
        </Text>
        {isIntegrityBlocked && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Tombol download dinonaktifkan sementara"
            description={`Masih ada ${integrityBlockingCount} blocker aktif. Selesaikan blocker terlebih dahulu, lalu scan ulang untuk membuka kembali aksi export.`}
          />
        )}
        {repairDraftSummary && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Ringkasan Draft Perbaikan Otomatis"
            description={
              <div>
                <div>Repaired: {Number(repairDraftSummary?.repaired_count || 0)}</div>
                <div>Skipped: {Number(repairDraftSummary?.skipped_count || 0)}</div>
                {ensureArray(repairDraftSummary?.skipped_reasons).length > 0 && (
                  <List
                    size="small"
                    dataSource={ensureArray(repairDraftSummary?.skipped_reasons).slice(0, 5)}
                    renderItem={(item) => (
                      <List.Item style={{ padding: '2px 0' }}>
                        <Text type="secondary">{item}</Text>
                      </List.Item>
                    )}
                  />
                )}
              </div>
            }
          />
        )}

        {showRepairPanel && (
          <div style={{ marginBottom: 16 }}>
            <MrQuickRepairPanel
              findings={integrityScan?.findings || []}
              contextId={selectedContextId || form.getFieldValue('context_id')}
              onRepaired={async () => {
                setShowRepairPanel(false);
                await refetchReport();
                await refetchIntegrityScan();
              }}
            />
          </div>
        )}

        {isIntegrityBlocked ? (
          <List
            size="small"
            header={
              <Space direction="vertical" size={0}>
                <Text strong>Langkah Perbaikan</Text>
                <Text type="secondary">
                  Progress: {completedChecklistCount}/{totalChecklistCount} langkah selesai
                </Text>
              </Space>
            }
            dataSource={actionChecklist}
            renderItem={(row) => (
              <List.Item
                style={
                  changedStepNos.includes(row.no)
                    ? { background: '#f6ffed', borderRadius: 6, paddingInline: 8 }
                    : undefined
                }
              >
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Text strong>
                    {row.no} · {row.title}
                  </Text>
                  <Text>{row.desc}</Text>
                  <Text type={row.done ? 'success' : 'danger'}>{row.countLabel}</Text>
                  {!row.done && (
                    <Button
                      type="link"
                      style={{ padding: 0, height: 'auto', width: 'fit-content' }}
                      onClick={() => navigate(buildRepairUrl(row.path || getFindingRepairPath()))}
                    >
                      {row.cta || 'Buka modul perbaikan'} (buka)
                    </Button>
                  )}
                  {!row.done && ensureArray(row.technicalDetails).length > 0 && (
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ cursor: 'pointer' }}>
                        <Text type="secondary">Lihat detail teknis</Text>
                      </summary>
                      <Space direction="vertical" size={0} style={{ marginTop: 4 }}>
                        {ensureArray(row.technicalDetails).map((item, idx) => (
                          <Text key={`${row.no}-${idx}`} type="secondary" style={{ fontSize: 12 }}>
                            {String(item?.code || '').toUpperCase()}
                          </Text>
                        ))}
                      </Space>
                    </details>
                  )}
                </Space>
              </List.Item>
            )}
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Semua blocker integrity scan sudah terselesaikan"
            description="Laporan siap dilanjutkan ke proses review dan export sesuai policy yang berlaku."
          />
        )}

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={18}>
              <Form.Item
                label="Pilih Periode Laporan"
                name="context_id"
                rules={[
                  {
                    required: true,
                    message: 'Periode laporan wajib dipilih.',
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  loading={isLoadingContexts}
                  placeholder="Pilih laporan bulanan, triwulan, semesteran, atau tahunan"
                  optionFilterProp="label"
                  options={contextOptions}
                  onChange={(value) => {
                    setSelectedContextId(value || null);
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item label="Aksi">
                <Button block type="default" icon={<SearchOutlined />} onClick={handleLoadReport}>
                  Lihat Laporan
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {isLoadingReport || isFetchingReport ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Spin tip="Memuat laporan..." />
          </div>
        ) : !report ? (
          <Empty
            style={{ marginTop: 48 }}
            description="Pilih periode laporan untuk melihat summary dan lampiran."
          />
        ) : (
          <>
            <Divider />

            <Title level={4}>Informasi Periode Laporan</Title>

            <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
              <Descriptions.Item label="ID Periode Laporan">{context?.id}</Descriptions.Item>
              <Descriptions.Item label="Periode">{context?.periode_label}</Descriptions.Item>
              <Descriptions.Item label="Tahun">{context?.tahun}</Descriptions.Item>
              <Descriptions.Item label="Jenis Dokumen">{context?.jenis_dokumen}</Descriptions.Item>
              <Descriptions.Item label="OPD">{context?.nama_opd}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Space wrap>
                  <Tag>{String(context?.status_revisi || '-').toUpperCase()}</Tag>

                  {hasBlockingPlaceholder ? (
                    <Tag color="red">Data Quality: Merah</Tag>
                  ) : (
                    <Tag color="green">Data Quality: Hijau</Tag>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            {hasBlockingPlaceholder && (
              <Alert
                type="error"
                showIcon
                style={{ marginTop: 16 }}
                message="Data laporan masih memuat placeholder"
                description={
                  <div>
                    <Paragraph style={{ marginBottom: 8 }}>
                      Ditemukan {dataQualityGate?.blocking_placeholder_count || 0} field placeholder
                      yang harus diperbaiki dari sumber data sebelum laporan dinyatakan final atau
                      siap ditandatangani.
                    </Paragraph>

                    {dataQualityIssues.length > 0 && (
                      <List
                        size="small"
                        dataSource={dataQualityIssues}
                        renderItem={(issue) => (
                          <List.Item>
                            <Text type="danger">{formatPlaceholderIssue(issue)}</Text>
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                }
              />
            )}

            {latestApprovedFallbackAlert && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
                message="Laporan memakai latest approved version"
                description="Data aktif sedang revisi/draft. Laporan resmi fallback ke latest approved sesuai policy governance."
              />
            )}

            {supersededLikeStatus && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
                message="Versi laporan lama / superseded"
                description="Dokumen ini terdeteksi sebagai versi yang sudah tergantikan. Gunakan versi terbaru sebelum finalisasi."
              />
            )}

            {(reportVersion || latestApprovedVersion) && (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                message="Informasi Versi Final Resolver"
                description={`active_version: ${reportVersion || '-'} | latest_approved_version: ${latestApprovedVersion || '-'}`}
              />
            )}

            {hasBlockingPlaceholder && placeholderSummaryRows.length > 0 && (
              <Card size="small" title="Ringkasan Placeholder Unik" style={{ marginTop: 16 }}>
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Daftar ini sudah dikelompokkan per field unik"
                  description="Satu field yang sama bisa muncul dari beberapa risk. Tabel ini membantu melacak sumber paling cepat tanpa membaca seluruh preview issue."
                />

                <Table
                  size="small"
                  rowKey={(record) => `${record.source}:${record.field}:${record.value}`}
                  columns={placeholderSummaryColumns}
                  dataSource={placeholderSummaryRows}
                  pagination={false}
                  scroll={{ x: 1200 }}
                  locale={{
                    emptyText: 'Belum ada ringkasan placeholder unik.',
                  }}
                />
              </Card>
            )}

            {!hasBlockingPlaceholder && dataQualityGate && (
              <Alert
                type="success"
                showIcon
                style={{ marginTop: 16 }}
                message="Data quality laporan hijau"
                description={
                  dataQualityGate?.message ||
                  'Tidak ditemukan placeholder blocking pada data laporan.'
                }
              />
            )}

            <Divider />

            <Title level={4}>Summary</Title>

            <Row gutter={[16, 16]}>
              {summaryCards.map(([key, label, type]) => (
                <Col xs={24} sm={12} md={8} lg={6} key={key}>
                  <Card size="small">
                    <Statistic
                      title={label}
                      value={
                        type === 'percent'
                          ? formatPercent(summary?.[key])
                          : formatNumber(summary?.[key])
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />

            <Title level={4}>Narasi Ringkas</Title>

            <Row gutter={[16, 16]}>
              {narasiEntries.length ? (
                narasiEntries.map(([key, value]) => (
                  <Col xs={24} md={12} key={key}>
                    <Card size="small" title={key.replaceAll('_', ' ')}>
                      <Paragraph style={{ marginBottom: 0 }}>{value}</Paragraph>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col xs={24}>
                  <Empty description="Narasi belum tersedia." />
                </Col>
              )}
            </Row>

            <Divider />

            <Title level={4}>Preview Lampiran</Title>

            <Card size="small" title="Lampiran 1 - Daftar Risiko" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                rowKey="id"
                columns={daftarRisikoColumns}
                dataSource={ensureArray(lampiran.daftar_risiko)}
                pagination={false}
                scroll={{ x: 900 }}
              />
            </Card>

            <Card size="small" title="Lampiran 2 - Analisis Risiko" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                rowKey="id"
                columns={analisisColumns}
                dataSource={ensureArray(lampiran.analisis_risiko)}
                pagination={false}
                scroll={{ x: 1000 }}
              />
            </Card>

            <Card
              size="small"
              title="Lampiran 4 - Rencana Tindak Pengendalian"
              style={{ marginBottom: 16 }}
            >
              <Table
                size="small"
                rowKey="id"
                columns={rtpColumns}
                dataSource={ensureArray(lampiran.rencana_pengendalian)}
                pagination={false}
                scroll={{ x: 1000 }}
              />
            </Card>

            <Card
              size="small"
              title="Lampiran 5 - Realisasi Pengendalian"
              style={{ marginBottom: 16 }}
            >
              <Table
                size="small"
                rowKey="id"
                columns={realisasiColumns}
                dataSource={ensureArray(lampiran.realisasi_pengendalian)}
                pagination={false}
                scroll={{ x: 1000 }}
              />
            </Card>

            <Card size="small" title="Lampiran 6 - Kejadian Risiko">
              {ensureArray(lampiran.kejadian_risiko).length ? (
                <Table
                  size="small"
                  rowKey="id"
                  dataSource={ensureArray(lampiran.kejadian_risiko)}
                  pagination={false}
                />
              ) : (
                <Alert
                  type="success"
                  showIcon
                  message="Nihil"
                  description="Tidak terdapat kejadian risiko pada context laporan ini."
                />
              )}
            </Card>

            {canReadExportHistory ? (
              <Card
                size="small"
                title="Histori Export Laporan"
                style={{ marginTop: 16 }}
                extra={
                  <Space>
                    <Text type="secondary">
                      Total: {exportHistoryMeta.total || exportHistoryRows.length || 0}
                    </Text>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={isFetchingExportHistory}
                      disabled={!selectedContextId}
                      onClick={() => refetchExportHistory()}
                    >
                      Refresh Histori
                    </Button>
                  </Space>
                }
              >
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Histori export bersifat read-only"
                  description="Data histori ini dicatat oleh backend saat user mengunduh Word, Excel, atau PDF. Frontend hanya membaca histori dan tidak membuat atau mengubah record export."
                />

                <Table
                  size="small"
                  rowKey="id"
                  columns={exportHistoryColumns}
                  dataSource={exportHistoryRows}
                  loading={isLoadingExportHistory || isFetchingExportHistory}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                  }}
                  scroll={{ x: 1600 }}
                  locale={{
                    emptyText: 'Belum ada histori export untuk context laporan ini.',
                  }}
                />
              </Card>
            ) : (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                message="Histori export terbatas"
                description="Histori export laporan hanya dapat dilihat oleh SUPER_ADMIN, ADMINISTRATOR, dan PENGAWAS. Anda tetap dapat melihat laporan dan mengunduh file sesuai hak akses."
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default MrPlanningReportPage;
