// frontend/src/pages/mr/MrPlanningRiskListPage.jsx

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Dropdown,
  Input,
  Row,
  Space,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  HistoryOutlined,
  LineChartOutlined,
  PlusOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import mrPlanningRiskService, {
  MR_PLANNING_RISK_QUERY_KEYS,
} from '@/services/mrPlanningRiskService';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRole } from '@/utils/roleUtils';

const { Title, Text } = Typography;
const { Search } = Input;

const LIST_PATH = '/mr/planning-risk';

const WRITE_ROLES = new Set(['SUPER_ADMIN', 'ADMINISTRATOR']);
const DELETE_ROLES = new Set(['SUPER_ADMIN']);
const EXPORT_ROLES = new Set(['SUPER_ADMIN', 'ADMINISTRATOR', 'PENGAWAS']);

// Guard STEP 18C:
// Export button boleh future-ready, tetapi tidak boleh membuat format export sendiri
// dari tabel frontend. Export final nanti wajib lewat backend export service resmi.
const EXPORT_ENDPOINT_READY = false;
const REPAIR_TARGET_RISK_IDS = [18, 22, 24, 25];
const PLACEHOLDER_PATTERNS = [
  /^isi\s+.+$/i,
  /^todo$/i,
  /^tbd$/i,
  /^xxx+$/i,
  /^---+$/i,
  /^\.\.\.*$/,
];

const STATUS_COLOR_MAP = {
  draft: 'default',
  verifikasi: 'processing',
  approved: 'success',
  ditolak: 'error',
};

const STATUS_LABEL_MAP = {
  draft: 'DRAFT',
  verifikasi: 'VERIFIKASI',
  approved: 'APPROVED',
  ditolak: 'DITOLAK',
};

const LEVEL_COLOR_MAP = {
  rendah: 'green',
  low: 'green',
  sedang: 'gold',
  medium: 'gold',
  tinggi: 'orange',
  high: 'orange',
  ekstrem: 'red',
  extreme: 'red',
  kritis: 'red',
  critical: 'red',
};

const safeString = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const isPlaceholderText = (value) => {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  if (!text) return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
};

const renderRepairValue = (value) =>
  isPlaceholderText(value) ? <Tag color="red">{safeString(value)}</Tag> : safeString(value);

const normalizeStatus = (value) => safeString(value, 'draft').toLowerCase();

const getRecordId = (record) => record?.id ?? record?.risk_id ?? record?.mr_planning_risk_id;

const getRiskName = (record) =>
  record?.nama_risiko ||
  record?.risk_name ||
  record?.judul_risiko ||
  record?.uraian_risiko ||
  record?.deskripsi_risiko ||
  record?.risk_description ||
  '-';

const getRiskCode = (record) => record?.kode_risiko || record?.risk_code || record?.kode || '-';

const getLevelRisiko = (record) =>
  record?.level_risiko ||
  record?.tingkat_risiko ||
  record?.risk_level ||
  record?.nilai_risiko_label ||
  '-';

const getProposalSourceLabel = (record) => {
  const source = String(record?.proposal_source_type || '').toUpperCase();
  const stage = String(record?.stage || '').toLowerCase();

  const sourceMap = {
    RENSTRA: 'Renstra',
    LAKIP: 'LAKIP',
    LAPORAN_KEUANGAN: 'Laporan Keuangan',
    TINDAK_LANJUT_BPK: 'Tindak Lanjut BPK',
    TINDAK_LANJUT_INSPEKTORAT: 'Tindak Lanjut Inspektorat',
    PELAKSANAAN_KEGIATAN: 'Pelaksanaan Kegiatan',
    PERTANGGUNGJAWABAN_KEUANGAN: 'Pertanggungjawaban Keuangan',
    SPIP_E_SIGAP: 'SPIP / e-SIGAP',
    MANUAL_ADHOC: 'Manual / Adhoc',
    LAINNYA: 'Lainnya',
  };

  const stageMap = {
    temuan_bpk: 'Tindak Lanjut BPK',
    temuan_inspektorat: 'Tindak Lanjut Inspektorat',
    pelaksanaan_kegiatan: 'Pelaksanaan Kegiatan',
    pertanggungjawaban_keuangan: 'Pertanggungjawaban Keuangan',
    laporan_keuangan: 'Laporan Keuangan',
    lakip: 'LAKIP',
    spip_e_sigap: 'SPIP / e-SIGAP',
    manual_adhoc: 'Manual / Adhoc',
    lainnya: 'Lainnya',
    strategi: 'Strategi Renstra',
    program: 'Program Renstra',
    kegiatan: 'Kegiatan Renstra',
    sub_kegiatan: 'Sub Kegiatan Renstra',
    tujuan: 'Tujuan Renstra',
    sasaran: 'Sasaran Renstra',
    kebijakan: 'Arah Kebijakan Renstra',
    arah_kebijakan: 'Arah Kebijakan Renstra',
  };

  return (
    sourceMap[source] || stageMap[stage] || record?.proposal_source_type || record?.stage || '-'
  );
};

const isProposalIntakeRecord = (record) =>
  Boolean(record?.proposal_source_type) ||
  String(record?.source_table || '').toLowerCase() === 'proposal_intake' ||
  [
    'temuan_bpk',
    'temuan_inspektorat',
    'pelaksanaan_kegiatan',
    'pertanggungjawaban_keuangan',
    'laporan_keuangan',
    'lk',
    'lakip',
    'spip_e_sigap',
    'manual_adhoc',
    'lainnya',
  ].includes(String(record?.stage || '').toLowerCase());

const getOwnerName = (record) => {
  if (isProposalIntakeRecord(record)) {
    return (
      record?.unit_terkait ||
      record?.pic ||
      record?.context_item?.penanggung_jawab ||
      record?.owner_user?.opd ||
      record?.nama_opd ||
      record?.opd?.nama_opd ||
      record?.opd?.nama ||
      (record?.opd_id ? `OPD ${record.opd_id}` : '-')
    );
  }

  return (
    record?.owner_user?.nama ||
    record?.owner_user?.name ||
    record?.owner_user?.username ||
    record?.owner?.nama ||
    record?.owner_name ||
    record?.user?.nama ||
    record?.unit_terkait ||
    record?.nama_opd ||
    (record?.opd_id ? `OPD ${record.opd_id}` : '-')
  );
};

const getDivisionName = (record) => {
  if (isProposalIntakeRecord(record)) {
    return (
      record?.nama_opd ||
      record?.owner_user?.opd ||
      record?.opd?.nama_opd ||
      record?.context_item?.penanggung_jawab ||
      record?.unit_terkait ||
      '-'
    );
  }

  return (
    record?.owner_division?.nama_divisi ||
    record?.owner_division?.name ||
    record?.division?.nama_divisi ||
    record?.division_name ||
    record?.unit_terkait ||
    record?.nama_unit_kerja ||
    record?.nama_bidang ||
    record?.bidang ||
    record?.nama_opd ||
    record?.opd?.nama_opd ||
    '-'
  );
};

const getIndikatorLabel = (record) =>
  record?.indikator?.nama_indikator ||
  record?.indikator?.indikator ||
  record?.indikator_detail?.nama_indikator ||
  record?.indikator_detail?.indikator ||
  record?.indikator_nama ||
  record?.nama_indikator ||
  record?.context_item?.nama_indikator ||
  record?.contextItem?.nama_indikator ||
  // Fallback untuk data proposal-intake / non-Renstra
  record?.objek_risiko ||
  record?.judul_temuan ||
  record?.nama_kegiatan ||
  record?.akun_pos ||
  record?.jenis_dokumen_pertanggungjawaban ||
  record?.nama_kategori_baru ||
  // Fallback terakhir dari stage/proposal source
  getProposalSourceLabel(record) ||
  '-';

const getIndikatorIdLabel = (record) => {
  if (isProposalIntakeRecord(record)) {
    return (
      record?.nomor_temuan ||
      record?.context_item?.metadata_json?.nomor_temuan ||
      record?.context_item?.kode_konteks ||
      record?.ref_id ||
      record?.proposal_source_ref_id ||
      record?.stage ||
      '-'
    );
  }

  return (
    record?.indikator_id ||
    record?.indikator?.id ||
    record?.context_item?.indikator_id ||
    record?.contextItem?.indikator_id ||
    record?.ref_id ||
    record?.proposal_source_type ||
    record?.stage ||
    '-'
  );
};

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data;

  if (error?.isExportUnavailable) return error.message;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === 'string') return data;
  if (error?.message) return error.message;

  return 'Terjadi kesalahan saat memproses data MR Planning Risk.';
};

const buildBackendDetail = (error) => {
  const data = error?.response?.data;
  if (!data || typeof data !== 'object') return null;

  const details = [];

  if (data.code) details.push(`Kode: ${data.code}`);
  if (data.blocked !== undefined) {
    details.push(`Blocked: ${String(data.blocked)}`);
  }
  if (data.audit_mode !== undefined) {
    details.push(`Audit Mode: ${String(data.audit_mode)}`);
  }
  if (Array.isArray(data.missing_fields) && data.missing_fields.length) {
    details.push(`Missing fields: ${data.missing_fields.join(', ')}`);
  }
  if (Array.isArray(data.blocked_fields) && data.blocked_fields.length) {
    details.push(`Blocked fields: ${data.blocked_fields.join(', ')}`);
  }
  if (Array.isArray(data.details) && data.details.length) {
    details.push(`Details: ${data.details.join(', ')}`);
  }

  return details.length ? details.join(' | ') : null;
};

const downloadBlobResponse = (response, fallbackFilename) => {
  const blob = response?.data;
  if (!blob) return;

  const disposition = response?.headers?.['content-disposition'];
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || fallbackFilename;

  const url = globalThis.URL.createObjectURL(new Blob([blob]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.URL.revokeObjectURL(url);
};

const formatValue = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const getStatusTindakLanjutLabel = (value) => {
  const normalized = String(value || '').toLowerCase();

  const map = {
    belum_ditindaklanjuti: 'Belum Ditindaklanjuti',
    proses: 'Proses',
    selesai: 'Selesai',
    dalam_verifikasi: 'Dalam Verifikasi',
    tindak_lanjut_sebagian: 'Tindak Lanjut Sebagian',
    tidak_dapat_ditindaklanjuti: 'Tidak Dapat Ditindaklanjuti',
  };

  return map[normalized] || formatValue(value);
};

const buildRepairPlaceholderPayloadFromRecord = (record) => {
  const contextItemId = record?.context_item_id || record?.context_item?.id || null;

  return {
    risk_ids: [getRecordId(record)].filter(Boolean),
    context_item_id: contextItemId,
    payload: {
      objek_risiko:
        record?.objek_risiko ||
        record?.context_item?.nama_konteks ||
        record?.context_item?.nama_indikator ||
        record?.nama_risiko ||
        null,
      judul_temuan: record?.judul_temuan || record?.objek_risiko || record?.nama_risiko || null,
      nomor_temuan:
        record?.nomor_temuan || record?.proposal_source_ref_id || record?.ref_id || null,
      ringkasan_temuan:
        record?.ringkasan_temuan ||
        record?.context_item?.uraian_konteks ||
        record?.uraian_risiko ||
        null,
      rekomendasi: record?.rekomendasi || null,
      rencana_tindak_lanjut_awal: record?.rencana_tindak_lanjut_awal || null,
    },
  };
};

const getRepairPreviewRows = (record) => {
  const payload = buildRepairPlaceholderPayloadFromRecord(record);
  const values = payload.payload || {};

  return [
    ['Risk ID', getRecordId(record)],
    ['Kode Risiko', getRiskCode(record)],
    ['context_item_id', payload.context_item_id],
    ['objek_risiko', values.objek_risiko],
    ['judul_temuan', values.judul_temuan],
    ['nomor_temuan', values.nomor_temuan],
    ['ringkasan_temuan', values.ringkasan_temuan],
    ['rekomendasi', values.rekomendasi],
    ['rencana_tindak_lanjut_awal', values.rencana_tindak_lanjut_awal],
  ];
};

const buildRepairSourceSummary = (record) => ({
  objek_risiko:
    record?.objek_risiko ||
    record?.context_item?.nama_konteks ||
    record?.context_item?.nama_indikator ||
    record?.nama_risiko ||
    null,
  judul_temuan: record?.judul_temuan || record?.objek_risiko || record?.nama_risiko || null,
  nomor_temuan: record?.nomor_temuan || record?.proposal_source_ref_id || record?.ref_id || null,
  ringkasan_temuan:
    record?.ringkasan_temuan || record?.context_item?.uraian_konteks || record?.uraian_risiko || null,
  rekomendasi: record?.rekomendasi || null,
  rencana_tindak_lanjut_awal: record?.rencana_tindak_lanjut_awal || null,
});

const renderDetailItem = (label, value, options = {}) => {
  const { multiline = false, maxHeight = 120 } = options;

  const contentStyle = multiline
    ? {
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        display: 'block',
        maxHeight,
        overflowY: 'auto',
        paddingRight: 8,
      }
    : {
        lineHeight: 1.5,
        display: 'block',
      };

  return (
    <div style={{ padding: '6px 0', minHeight: 44 }}>
      <Text
        type="secondary"
        style={{
          fontSize: 12,
          display: 'block',
          marginBottom: 4,
        }}
      >
        {label}
      </Text>

      <Text style={contentStyle}>{formatValue(value)}</Text>
    </div>
  );
};

export default function MrPlanningRiskListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const { user } = useAuth();

  const roleNorm = normalizeRole(user?.role);
  const canWrite = WRITE_ROLES.has(roleNorm);
  const canDelete = DELETE_ROLES.has(roleNorm);
  const canExport = EXPORT_ROLES.has(roleNorm);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [backendWarning, setBackendWarning] = useState(null);

  const queryParams = useMemo(
    () => ({
      q: searchText,
      search: searchText,
      status_revisi: statusFilter,
    }),
    [searchText, statusFilter],
  );

  const {
    data: risks = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.list(queryParams),
    queryFn: () => mrPlanningRiskService.getAll(queryParams),
    keepPreviousData: true,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => mrPlanningRiskService.remove(id),
    onSuccess: (response) => {
      message.success(response?.message || 'Data MR Planning Risk berhasil dihapus.');
      setBackendWarning(null);
      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_RISK_QUERY_KEYS.all,
      });
    },
    onError: (err) => {
      const detail = buildBackendDetail(err);
      setBackendWarning(detail || getBackendErrorMessage(err));
      message.error(getBackendErrorMessage(err));
    },
  });

  const exportExcelMutation = useMutation({
    mutationFn: (params) => mrPlanningRiskService.exportExcel(params),
    onSuccess: (response) => {
      downloadBlobResponse(response, 'FORM_COACHING_CLINIC_Manajemen_Mitigasi_Risiko.xlsx');
      message.success('Export Excel berhasil diproses.');
    },
    onError: (err) => {
      const msg = getBackendErrorMessage(err);
      setBackendWarning(msg);
      message.warning(msg);
    },
  });

  const exportDocxMutation = useMutation({
    mutationFn: (params) => mrPlanningRiskService.exportDocx(params),
    onSuccess: (response) => {
      downloadBlobResponse(response, 'FORM_LAP_TAHUNAN_Manajemen_Mitigasi_Risiko.docx');
      message.success('Export DOCX berhasil diproses.');
    },
    onError: (err) => {
      const msg = getBackendErrorMessage(err);
      setBackendWarning(msg);
      message.warning(msg);
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: (params) => mrPlanningRiskService.exportPdf(params),
    onSuccess: (response) => {
      downloadBlobResponse(response, 'FORM_LAP_TAHUNAN_Manajemen_Mitigasi_Risiko.pdf');
      message.success('Export PDF berhasil diproses.');
    },
    onError: (err) => {
      const msg = getBackendErrorMessage(err);
      setBackendWarning(msg);
      message.warning(msg);
    },
  });

  const repairPlaceholderMutation = useMutation({
    mutationFn: (payload) => mrPlanningRiskService.repairPlaceholderSources(payload),
    onSuccess: (response) => {
      message.success(response?.message || 'Placeholder sumber risiko berhasil diperbarui.');
      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_RISK_QUERY_KEYS.all,
      });
      refetch();
    },
    onError: (err) => {
      const msg = getBackendErrorMessage(err);
      setBackendWarning(msg);
      message.error(msg);
    },
  });

  const handleRefresh = () => {
    setBackendWarning(null);
    refetch();
  };

  const handleDelete = (record) => {
    const id = getRecordId(record);

    if (!id) {
      message.error('ID data tidak ditemukan.');
      return;
    }

    modal.confirm({
      title: 'Hapus MR Planning Risk?',
      content:
        'Data akan dihapus sesuai guard backend. Jika data sudah approved atau dilindungi audit, backend akan memblokir proses ini.',
      okText: 'Ya, hapus',
      cancelText: 'Batal',
      okButtonProps: { danger: true },
      onOk: () => removeMutation.mutate(id),
    });
  };

  const handleOpenMitigation = (record) => {
    const id = getRecordId(record);

    if (!id) {
      message.error('ID Risiko tidak ditemukan.');
      return;
    }

    navigate(`${LIST_PATH}/${id}/mitigation`);
  };

  const handleOpenMonitoring = (record) => {
    const id = getRecordId(record);

    if (!id) {
      message.error('ID Risiko tidak ditemukan.');
      return;
    }

    navigate(`${LIST_PATH}/${id}/monitoring`);
  };

  const handleRepairPlaceholder = (record) => {
    if (!canWrite) {
      message.warning('Fitur repair placeholder hanya tersedia untuk admin.');
      return;
    }

    const id = getRecordId(record);

    if (!id) {
      message.error('ID Risiko tidak ditemukan.');
      return;
    }

    const repairCandidates = REPAIR_TARGET_RISK_IDS.map((targetId) => {
      const targetRecord = risks.find((item) => Number(getRecordId(item)) === Number(targetId));

      return {
        id: targetId,
        record: targetRecord || null,
        label: targetRecord
          ? `${targetId} - ${getRiskCode(targetRecord)}`
          : `${targetId} - belum ada data`,
      };
    });

    const currentTargetId = REPAIR_TARGET_RISK_IDS.includes(Number(getRecordId(record)))
      ? Number(getRecordId(record))
      : REPAIR_TARGET_RISK_IDS[0];

    let selectedTargetId = currentTargetId;
    const selectedTargetRecord = () =>
      risks.find((item) => Number(getRecordId(item)) === Number(selectedTargetId)) || record;

    const buildPayloadForSelectedTarget = () => ({
      risk_ids: [selectedTargetId],
      context_item_id:
        selectedTargetRecord()?.context_item_id ||
        selectedTargetRecord()?.context_item?.id ||
        null,
      payload: buildRepairSourceSummary(selectedTargetRecord()),
    });

    const buildPayloadForAllTargets = () => ({
      risk_ids: REPAIR_TARGET_RISK_IDS,
      context_item_id: 20,
      payload: buildRepairSourceSummary(selectedTargetRecord()),
    });

    modal.confirm({
      title: 'Repair Placeholder Sumber Risiko',
      width: 820,
      content: (
        <div>
          <p>
            Pilih satu target repair dari daftar <b>18, 22, 24, 25</b>. Preview di bawah akan
            mengikuti record target yang dipilih.
          </p>
          <div style={{ marginBottom: 12 }}>
            <Select
              style={{ width: '100%' }}
              defaultValue={currentTargetId}
              options={repairCandidates.map((item) => ({ value: item.id, label: item.label }))}
              onChange={(value) => {
                selectedTargetId = Number(value);
              }}
            />
          </div>
          <p style={{ marginBottom: 12 }}>
            Field yang masih placeholder akan ditandai merah. Payload di bawah dibentuk dari record
            target yang dipilih sebelum dikirim ke backend.
          </p>
          <div
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 12,
              background: '#fafafa',
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            {getRepairPreviewRows(selectedTargetRecord()).map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '4px 0',
                  borderBottom: '1px dashed #eee',
                }}
              >
                <Text style={{ flex: 0.45 }} strong={label === 'Kode Risiko' || label === 'Risk ID'}>
                  {label}
                </Text>
                <div style={{ flex: 0.55, textAlign: 'right' }}>{renderRepairValue(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Alert
              type="info"
              showIcon
              message="Repair massal target laporan"
              description="Aksi ini menyapu placeholder pada risk 18, 22, 24, 25 dan sinkronisasi context item 20. Gunakan jika laporan masih menunjukkan placeholder pada sumber yang sama."
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => repairPlaceholderMutation.mutate(buildPayloadForAllTargets())}>
                Repair 18, 22, 24, 25 + CI 20
              </Button>
            </div>
          </div>
        </div>
      ),
      okText: 'Repair',
      cancelText: 'Batal',
      onOk: () => repairPlaceholderMutation.mutate(buildPayloadForSelectedTarget()),
    });
  };

  const handleExport = (type) => {
    if (!canExport) {
      message.warning('Anda tidak memiliki akses export.');
      return;
    }

    const labelMap = {
      excel: 'Excel Coaching Clinic',
      docx: 'DOCX Laporan Tahunan',
      pdf: 'PDF Laporan Tahunan',
    };

    if (!EXPORT_ENDPOINT_READY) {
      const msg = `Export ${
        labelMap[type] || ''
      } belum aktif. Tombol ini hanya future-ready. Export final wajib dibuat melalui backend export service resmi dan mengikuti template dokumen resmi.`;

      message.info(msg);
      setBackendWarning(
        'Export masih future-ready. Frontend tidak boleh membuat format export sendiri dari data tabel. Format Excel wajib mengikuti FORM COACHING CLINIC Manajemen Mitigasi Risiko. Format DOCX/PDF wajib mengikuti FORM LAP TAHUNAN Manajemen Mitigasi Risiko 2026.',
      );
      return;
    }

    const params = {
      ...queryParams,
    };

    if (type === 'excel') exportExcelMutation.mutate(params);
    if (type === 'docx') exportDocxMutation.mutate(params);
    if (type === 'pdf') exportPdfMutation.mutate(params);
  };

  const exportMenuItems = [
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: 'Export Excel Coaching Clinic',
      onClick: () => handleExport('excel'),
    },
    {
      key: 'docx',
      icon: <FileWordOutlined />,
      label: 'Export DOCX Laporan Tahunan',
      onClick: () => handleExport('docx'),
    },
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'Export PDF Laporan Tahunan',
      onClick: () => handleExport('pdf'),
    },
  ];

  const columns = [
    {
      title: 'No',
      width: 70,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Kode Risiko',
      dataIndex: 'kode_risiko',
      width: 170,
      render: (_, record) => <Text strong>{safeString(getRiskCode(record))}</Text>,
    },
    {
      title: 'Nama/Uraian Risiko',
      dataIndex: 'nama_risiko',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{getRiskName(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Stage: {safeString(record?.stage)} | Ref ID: {safeString(record?.ref_id)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Indikator / Sumber',
      dataIndex: 'indikator_id',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{getIndikatorLabel(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isProposalIntakeRecord(record) ? 'No/Ref Sumber' : 'ID/Sumber'}:{' '}
            {safeString(getIndikatorIdLabel(record))}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Owner',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{getOwnerName(record)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getDivisionName(record)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Score',
      dataIndex: 'skor_risiko',
      width: 90,
      align: 'center',
      render: (value) => safeString(value),
    },
    {
      title: 'Level Risiko',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const level = getLevelRisiko(record);
        const key = safeString(level).toLowerCase();

        return (
          <Tag color={LEVEL_COLOR_MAP[key] || 'default'}>{safeString(level).toUpperCase()}</Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status_revisi',
      width: 130,
      align: 'center',
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Verifikasi', value: 'verifikasi' },
        { text: 'Approved', value: 'approved' },
        { text: 'Ditolak', value: 'ditolak' },
      ],
      onFilter: (value, record) => normalizeStatus(record?.status_revisi) === value,
      render: (value) => {
        const status = normalizeStatus(value);
        return (
          <Tag color={STATUS_COLOR_MAP[status] || 'default'}>
            {STATUS_LABEL_MAP[status] || status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Versi',
      dataIndex: 'versi',
      width: 90,
      align: 'center',
      render: (value) => safeString(value, '1'),
    },
    {
      title: 'Aksi',
      width: 460,
      fixed: 'right',
      render: (_, record) => {
        const id = getRecordId(record);
        const status = normalizeStatus(record?.status_revisi);

        const isDraft = status === 'draft';
        const isRejected = status === 'ditolak';
        const isApproved = status === 'approved';
        const isVerification = status === 'verifikasi';

        const canEditDraftOrRejected = canWrite && (isDraft || isRejected);
        const canCreateRevision = canWrite && isApproved;

        return (
          <Space wrap>
            <Tooltip title="Detail / Audit Mode">
              <Button
                size="small"
                icon={<EyeOutlined />}
                disabled={!id}
                onClick={() => navigate(`${LIST_PATH}/detail/${id}`)}
              />
            </Tooltip>

            {canEditDraftOrRejected && (
              <Tooltip title={isRejected ? 'Edit Perbaikan Ditolak' : 'Edit Draft'}>
                <Button
                  size="small"
                  type="primary"
                  icon={<EditOutlined />}
                  disabled={!id}
                  onClick={() => navigate(`${LIST_PATH}/edit/${id}`)}
                />
              </Tooltip>
            )}

            {isVerification && canWrite && (
              <Tooltip title="Data sedang dalam proses verifikasi. Gunakan Detail atau History.">
                <Button size="small" icon={<EditOutlined />} disabled>
                  Edit
                </Button>
              </Tooltip>
            )}

            {canCreateRevision && (
              <Tooltip title="Buat Revisi dari Approved">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  disabled={!id}
                  onClick={() => navigate(`${LIST_PATH}/revisi/${id}`)}
                >
                  Revisi
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Rencana Tindak Pengendalian">
              <Button
                size="small"
                icon={<ToolOutlined />}
                disabled={!id}
                onClick={() => handleOpenMitigation(record)}
              >
                RTP
              </Button>
            </Tooltip>

            <Tooltip title="Realisasi / Pemantauan Pengendalian">
              <Button
                size="small"
                icon={<LineChartOutlined />}
                disabled={!id}
                onClick={() => handleOpenMonitoring(record)}
              >
                Pemantauan
              </Button>
            </Tooltip>

            <Tooltip title="History">
              <Button
                size="small"
                icon={<HistoryOutlined />}
                disabled={!id}
                onClick={() => navigate(`${LIST_PATH}/${id}/history`)}
              />
            </Tooltip>

            {canDelete && (
              <Tooltip title="Hapus">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!id}
                  loading={removeMutation.isPending}
                  onClick={() => handleDelete(record)}
                />
              </Tooltip>
            )}

            {canWrite && (
              <Tooltip title="Repair placeholder sumber risiko">
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  disabled={!id}
                  loading={repairPlaceholderMutation.isPending}
                  onClick={() => handleRepairPlaceholder(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  const expandedRowRender = (record) => {
    const isProposal = isProposalIntakeRecord(record);

    const scoringContent = (
      <Row gutter={[16, 12]}>
        <Col xs={24} md={6}>
          {renderDetailItem('Kemungkinan Ref ID', record?.kemungkinan_ref_id)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Dampak Ref ID', record?.dampak_ref_id)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Score', record?.skor_risiko)}
        </Col>

        <Col xs={24} md={6}>
          <div style={{ padding: '6px 0', minHeight: 44 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Level Risiko
            </Text>
            <Tag
              color={LEVEL_COLOR_MAP[safeString(getLevelRisiko(record)).toLowerCase()] || 'default'}
            >
              {safeString(getLevelRisiko(record)).toUpperCase()}
            </Tag>
          </div>
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Kategori Risiko', record?.kategori_risiko)}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Sumber Risiko', record?.sumber_risiko)}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Status Risiko', record?.status_risiko)}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem(
            'Matrix',
            `${safeString(record?.matrix_code)} / ID ${safeString(record?.matrix_id)}`,
          )}
        </Col>

        <Col xs={24} md={8}>
          {(() => {
            let aboveAppetiteLabel = '-';
            if (record?.is_above_appetite === true) {
              aboveAppetiteLabel = 'Ya';
            } else if (record?.is_above_appetite === false) {
              aboveAppetiteLabel = 'Tidak';
            }

            return renderDetailItem('Above Appetite', aboveAppetiteLabel);
          })()}
        </Col>
      </Row>
    );

    const governanceContent = (
      <Row gutter={[16, 12]}>
        <Col xs={24} md={6}>
          {renderDetailItem('Context ID', record?.context_id)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Periode ID', record?.periode_id)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Tahun', record?.tahun)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Jenis Dokumen', record?.jenis_dokumen)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Renstra ID', record?.renstra_id)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('OPD ID', record?.opd_id)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Stage', record?.stage)}
        </Col>

        <Col xs={24} md={6}>
          {renderDetailItem('Ref ID', record?.ref_id)}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Indikator / Sumber', getIndikatorLabel(record))}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Indikator ID / Source Ref', getIndikatorIdLabel(record))}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Context Item ID', record?.context_item?.id || record?.context_item_id)}
        </Col>
      </Row>
    );

    const auditContent = (
      <Row gutter={[16, 12]}>
        <Col xs={24}>
          {renderDetailItem(
            'Alasan Revisi',
            record?.alasan_revisi || record?.last_revision_reason,
            { multiline: true, maxHeight: 90 },
          )}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Versi', record?.versi)}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Last Revised At', record?.last_revised_at)}
        </Col>

        <Col xs={24} md={8}>
          {renderDetailItem('Last Revised By', record?.last_revised_by)}
        </Col>
      </Row>
    );

    return (
      <div style={{ padding: 12, background: '#fafafa' }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {isProposal && (
            <Card
              size="small"
              title="Detail Proposal Intake"
              style={{ background: '#ffffff' }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[16, 12]}>
                <Col xs={24} md={8}>
                  {renderDetailItem('Sumber Proposal', getProposalSourceLabel(record))}
                </Col>

                <Col xs={24} md={8}>
                  {renderDetailItem(
                    'Nomor Temuan / Source Ref',
                    record?.nomor_temuan || getIndikatorIdLabel(record),
                  )}
                </Col>

                <Col xs={24} md={8}>
                  {renderDetailItem(
                    'Status Tindak Lanjut',
                    getStatusTindakLanjutLabel(record?.status_tindak_lanjut),
                  )}
                </Col>

                <Col xs={24} md={12}>
                  {renderDetailItem(
                    'Judul Temuan / Objek Risiko',
                    record?.judul_temuan || record?.objek_risiko || getIndikatorLabel(record),
                    { multiline: true, maxHeight: 80 },
                  )}
                </Col>

                <Col xs={24} md={12}>
                  {renderDetailItem('PIC / Unit', record?.pic || record?.unit_terkait)}
                  {renderDetailItem('Target Waktu', record?.target_waktu)}
                  {renderDetailItem(
                    'OPD',
                    record?.nama_opd ||
                      record?.owner_user?.opd ||
                      (record?.opd_id ? `OPD ${record.opd_id}` : '-'),
                  )}
                </Col>

                <Col xs={24}>
                  {renderDetailItem(
                    'Ringkasan Temuan / Uraian Konteks',
                    record?.ringkasan_temuan ||
                      record?.context_item?.uraian_konteks ||
                      record?.uraian_risiko,
                    { multiline: true, maxHeight: 220 },
                  )}
                </Col>

                <Col xs={24}>
                  {renderDetailItem(
                    'Rekomendasi',
                    record?.rekomendasi || record?.metode_pencapaian_tujuan_spip,
                    { multiline: true, maxHeight: 180 },
                  )}
                </Col>
              </Row>
            </Card>
          )}

          <Card
            size="small"
            title="Substansi Risiko"
            style={{ background: '#ffffff' }}
            styles={{ body: { padding: 16 } }}
          >
            <Row gutter={[16, 12]}>
              <Col xs={24} md={8}>
                {renderDetailItem('Risk ID', getRecordId(record))}
              </Col>

              <Col xs={24} md={8}>
                {renderDetailItem('Kode Risiko', getRiskCode(record))}
              </Col>

              <Col xs={24} md={8}>
                {renderDetailItem('Status Revisi', record?.status_revisi)}
              </Col>

              <Col xs={24}>
                {renderDetailItem('Nama Risiko', getRiskName(record), {
                  multiline: true,
                  maxHeight: 70,
                })}
              </Col>

              <Col xs={24}>
                {renderDetailItem('Uraian Risiko', record?.uraian_risiko, {
                  multiline: true,
                  maxHeight: 110,
                })}
              </Col>

              <Col xs={24} md={12}>
                {renderDetailItem('Penyebab Risiko', record?.penyebab_risiko, {
                  multiline: true,
                  maxHeight: 110,
                })}
              </Col>

              <Col xs={24} md={12}>
                {renderDetailItem('Dampak Risiko', record?.dampak_risiko, {
                  multiline: true,
                  maxHeight: 110,
                })}
              </Col>

              <Col xs={24}>
                {renderDetailItem(
                  'Rencana Tindak Lanjut Awal',
                  record?.metode_pencapaian_tujuan_spip,
                  { multiline: true, maxHeight: 100 },
                )}
              </Col>
            </Row>
          </Card>

          <Collapse
            size="small"
            items={[
              {
                key: 'scoring',
                label: 'Scoring dan Referensi Risiko',
                children: scoringContent,
              },
              {
                key: 'governance',
                label: 'Mapping Governance Teknis',
                children: governanceContent,
              },
              {
                key: 'audit',
                label: 'Audit Revisi',
                children: auditContent,
              },
            ]}
          />
        </Space>
      </div>
    );
  };

  const errorMessage = error ? getBackendErrorMessage(error) : null;
  const errorDetail = error ? buildBackendDetail(error) : null;

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Space align="start" justify="space-between" style={{ width: '100%' }} wrap>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              MR Planning Risk
            </Title>
            <Text type="secondary">
              Register risiko perencanaan yang melekat pada indikator, stage, ref_id, Renstra,
              context, dan periode governance.
            </Text>
          </div>

          <Space wrap>
            {canExport && (
              <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
                <Button
                  icon={<DownloadOutlined />}
                  loading={
                    exportExcelMutation.isPending ||
                    exportDocxMutation.isPending ||
                    exportPdfMutation.isPending
                  }
                >
                  Export
                </Button>
              </Dropdown>
            )}

            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isFetching}>
              Refresh
            </Button>

            {canWrite && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`${LIST_PATH}/create`)}
              >
                Tambah Risiko
              </Button>
            )}
          </Space>
        </Space>

        <Divider />

        {(errorMessage || backendWarning) && (
          <Alert
            type={error ? 'error' : 'warning'}
            showIcon
            closable
            style={{ marginBottom: 16 }}
            message={errorMessage || backendWarning}
            description={errorDetail || undefined}
            onClose={() => setBackendWarning(null)}
          />
        )}

        <Space style={{ marginBottom: 16 }} wrap>
          <Search
            allowClear
            placeholder="Cari kode/nama/uraian risiko..."
            style={{ width: 320 }}
            onSearch={(value) => setSearchText(value)}
            onChange={(event) => {
              if (!event.target.value) setSearchText('');
            }}
          />

          <Button
            onClick={() => setStatusFilter('')}
            type={statusFilter === '' ? 'primary' : 'default'}
          >
            Semua
          </Button>
          <Button
            onClick={() => setStatusFilter('draft')}
            type={statusFilter === 'draft' ? 'primary' : 'default'}
          >
            Draft
          </Button>
          <Button
            onClick={() => setStatusFilter('verifikasi')}
            type={statusFilter === 'verifikasi' ? 'primary' : 'default'}
          >
            Verifikasi
          </Button>
          <Button
            onClick={() => setStatusFilter('approved')}
            type={statusFilter === 'approved' ? 'primary' : 'default'}
          >
            Approved
          </Button>
          <Button
            onClick={() => setStatusFilter('ditolak')}
            type={statusFilter === 'ditolak' ? 'primary' : 'default'}
          >
            Ditolak
          </Button>
        </Space>

        <Table
          rowKey={(record) => getRecordId(record)}
          loading={isLoading || isFetching}
          columns={columns}
          dataSource={risks}
          bordered
          size="middle"
          scroll={{ x: 1500 }}
          expandable={{ expandedRowRender }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} data`,
          }}
        />
      </Card>
    </div>
  );
}
