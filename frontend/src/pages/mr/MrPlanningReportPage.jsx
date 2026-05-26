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

import mrPlanningReportService from '@/services/mrPlanningReportService';
import { useMrIdempotency } from '@/features/mr/hooks/useMrIdempotency';

const { Title, Text, Paragraph } = Typography;

const QUERY_KEYS = {
  contexts: ['mr-report', 'contexts'],
  fullReport: (contextId) => ['mr-report', 'full', contextId],
  exportHistory: (contextId) => ['mr-report', 'export-history', contextId],
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

const formatContextLabel = (context) => {
  if (!context) return '-';

  const parts = [
    context.periode_label,
    context.tahun,
    context.jenis_dokumen,
    context.nama_opd,
    context.status_revisi ? `Status: ${context.status_revisi}` : null,
  ].filter(Boolean);

  return parts.join(' — ');
};

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

const getCleanPeriodeLabel = (context) => {
  const periodeLabel = String(context?.periode_label || '').trim();
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

const getReportOpdLabel = (context) => {
  const namaOpd = String(
    context?.nama_opd || context?.opd_nama || context?.nama_perangkat_daerah || '',
  ).trim();

  if (!namaOpd) {
    return '';
  }

  if (isFallbackOpdName(namaOpd)) {
    return ` — ${namaOpd} belum ter-resolve`;
  }

  return ` — ${namaOpd}`;
};

const getReportGroupLabel = (context) => {
  const periodeType = normalizePeriodeType(context);
  const periodeLabel = getCleanPeriodeLabel(context);
  const opdLabel = getReportOpdLabel(context);

  if (periodeType === 'bulanan') {
    return `Laporan Bulanan — ${periodeLabel}${opdLabel}`;
  }

  if (periodeType === 'triwulan') {
    return `Laporan Triwulan — ${periodeLabel}${opdLabel}`;
  }

  if (periodeType === 'semesteran') {
    return `Laporan Semesteran — ${periodeLabel}${opdLabel}`;
  }

  if (periodeType === 'tahunan') {
    return `Laporan Tahunan — ${periodeLabel}${opdLabel}`;
  }

  return `Laporan MR — ${periodeLabel}${opdLabel}`;
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

  return `${source} → ${field}: ${value}`;
};

const formatRiskList = (values = []) => {
  const list = Array.isArray(values) ? values : [];

  if (!list.length) return '-';

  return list.join(', ');
};

const MrPlanningReportPage = () => {
  const [form] = Form.useForm();
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [downloadingType, setDownloadingType] = useState(null);
  const { guard } = useMrIdempotency();

  const currentUserRole = String(getCurrentUserRole() || '').toUpperCase();
  const canReadExportHistory = EXPORT_HISTORY_ROLES.includes(currentUserRole);

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

  const report = fullReportResponse?.data || null;
  const context = report?.context || null;
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
    if (isFinalFlow) {
      const confirmed = await new Promise((resolve) => {
        Modal.confirm({
          title: 'Konfirmasi Review Sebelum Export Final',
          content:
            'Pastikan laporan sudah direview. Export Word/PDF diperlakukan sebagai flow final/correction sesuai policy backend.',
          okText: 'Lanjut Export',
          cancelText: 'Batal',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmed) {
        return;
      }
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
                (!selectedContextId && !form.getFieldValue('context_id'))
              }
              onClick={() => handleDownloadReport('word')}
            >
              Download Word
            </Button>

            <Button
              type="primary"
              icon={<FileExcelOutlined />}
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
                (!selectedContextId && !form.getFieldValue('context_id'))
              }
              onClick={() => handleDownloadReport('pdf')}
            >
              Download PDF
            </Button>
          </Space>
        </Space>

        <Divider />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Guard Laporan MR"
          description="Frontend hanya menampilkan laporan, mengunduh file dari backend, dan membaca histori export secara read-only. Word, Excel, PDF, quality gate, dan audit/export record tetap dibuat oleh backend."
        />

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
                  onChange={(value, option) => {
                    console.log('MR Report selected context:', {
                      value,
                      label: option?.label,
                      context: option?.item,
                    });

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
              <Card
                size="small"
                title="Ringkasan Placeholder Unik"
                style={{ marginTop: 16 }}
              >
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

            <Card size="small" title="Lampiran 1 — Daftar Risiko" style={{ marginBottom: 16 }}>
              <Table
                size="small"
                rowKey="id"
                columns={daftarRisikoColumns}
                dataSource={ensureArray(lampiran.daftar_risiko)}
                pagination={false}
                scroll={{ x: 900 }}
              />
            </Card>

            <Card size="small" title="Lampiran 2 — Analisis Risiko" style={{ marginBottom: 16 }}>
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
              title="Lampiran 4 — Rencana Tindak Pengendalian"
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
              title="Lampiran 5 — Realisasi Pengendalian"
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

            <Card size="small" title="Lampiran 6 — Kejadian Risiko">
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
