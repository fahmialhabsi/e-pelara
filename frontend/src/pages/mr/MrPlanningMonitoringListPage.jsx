// frontend/src/pages/mr/MrPlanningMonitoringListPage.jsx

import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileDoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import mrPlanningRiskService, {
  MR_PLANNING_RISK_QUERY_KEYS,
} from '@/services/mrPlanningRiskService';

import mrPlanningMonitoringService, {
  MR_PLANNING_MONITORING_QUERY_KEYS,
} from '@/services/mrPlanningMonitoringService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const LIST_PATH = '/mr/planning-risk';

const EVIDENCE_TYPE_OPTIONS = [
  { value: 'FOTO_KEGIATAN', label: 'Foto Kegiatan' },
  { value: 'BERITA_ACARA', label: 'Berita Acara' },
  { value: 'NOTULEN', label: 'Notulen' },
  { value: 'LAPORAN_PROGRESS', label: 'Laporan Progres' },
  {
    value: 'BUKTI_PERTANGGUNGJAWABAN',
    label: 'Bukti Pertanggungjawaban',
  },
  { value: 'BUKTI_PEMBAYARAN', label: 'Bukti Pembayaran' },
  {
    value: 'DOKUMENTASI_PELAKSANAAN',
    label: 'Dokumentasi Pelaksanaan',
  },
  { value: 'BUKTI_TINDAK_LANJUT', label: 'Bukti Tindak Lanjut' },
  { value: 'DOKUMEN_OUTPUT_AKTUAL', label: 'Dokumen Output Aktual' },
  { value: 'BUKTI_VERIFIKASI', label: 'Bukti Verifikasi' },
];

const safeText = (value, fallback = 'Belum Tersedia') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const normalizeStatus = (value) => String(value || 'draft').toLowerCase();

const getStatusLabel = (value) => {
  const map = {
    draft: 'Draft',
    verifikasi: 'Dalam Verifikasi',
    diajukan: 'Diajukan',
    diverifikasi: 'Diverifikasi',
    approved: 'Disetujui',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak / Perlu Perbaikan',
    aktif: 'Aktif',
    dibatalkan: 'Dibatalkan',
  };

  return map[normalizeStatus(value)] || safeText(value);
};

const getStatusColor = (value) => {
  const map = {
    draft: 'default',
    verifikasi: 'processing',
    diajukan: 'processing',
    diverifikasi: 'blue',
    approved: 'success',
    disetujui: 'success',
    ditolak: 'error',
    aktif: 'success',
    dibatalkan: 'error',
  };

  return map[normalizeStatus(value)] || 'default';
};

const getRiskCode = (risk = {}) =>
  risk.kode_risiko || risk.risk_code || risk.kode || 'Belum Tersedia';

const getRiskName = (risk = {}) =>
  risk.nama_risiko ||
  risk.risk_name ||
  risk.uraian_risiko ||
  risk.deskripsi_risiko ||
  'Belum Tersedia';

const getRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === 'string') return data;
  if (error?.message) return error.message;

  return 'Data Pemantauan Pengendalian belum dapat dimuat.';
};

const formatProgress = (value) => {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  if (number < 0) return 0;
  if (number > 100) return 100;
  return number;
};

const getTrendLabel = (value) => {
  const normalized = String(value || '').toLowerCase();

  const map = {
    membaik: 'Membaik',
    memburuk: 'Memburuk',
    tetap: 'Tetap',
    stabil: 'Tetap',
  };

  return map[normalized] || safeText(value);
};

const getEventLabel = (value) => {
  if (value === true || value === 1 || value === '1') return 'Ya';
  return 'Tidak';
};

const getEvidenceTypeLabel = (value) => {
  const found = EVIDENCE_TYPE_OPTIONS.find((item) => item.value === value);
  return found?.label || safeText(value);
};

const getMonitoringId = (record = {}) => record?.id || record?.mr_planning_monitoring_id || null;

const buildEvidenceNumber = (record = {}) => {
  const monitoringId = getMonitoringId(record) || '000';
  const year =
    record?.tahun || String(record?.monitoring_date || '').slice(0, 4) || new Date().getFullYear();

  return `REALISASI/MONITORING/${monitoringId}/${year}`;
};

const buildEvidenceTitle = (record = {}) => {
  const periode = record?.periode_label ? ` ${record.periode_label}` : '';
  return `Laporan Progres Realisasi Pengendalian${periode}`;
};

const buildEvidenceDescription = (record = {}) => {
  const hasil = safeText(record?.hasil_monitoring, '');
  const realisasi = safeText(record?.realisasi_mitigasi, '');
  const output = safeText(record?.output_realisasi, '');

  return [
    hasil ? `Hasil Pemantauan:\n${hasil}` : '',
    realisasi ? `Realisasi Pengendalian:\n${realisasi}` : '',
    output ? `Output Realisasi:\n${output}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
};

const formatFileSize = (value) => {
  const size = Number(value || 0);

  if (!size || Number.isNaN(size)) return 'Ukuran tidak tersedia';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export default function MrPlanningMonitoringListPage() {
  const { riskId } = useParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();

  const [uploadForm] = Form.useForm();
  const [monitoringForm] = Form.useForm();

  const [evidenceCounts, setEvidenceCounts] = useState({});
  const [evidenceLists, setEvidenceLists] = useState({});
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);

  const [selectedMonitoring, setSelectedMonitoring] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isCreateMonitoringModalOpen, setIsCreateMonitoringModalOpen] = useState(false);
  const [monitoringFormMode, setMonitoringFormMode] = useState('create');
  const [editingMonitoring, setEditingMonitoring] = useState(null);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [isSubmittingMonitoring, setIsSubmittingMonitoring] = useState(false);
  const [isLoadingMonitoringDraft, setIsLoadingMonitoringDraft] = useState(false);
  const [monitoringDraftNote, setMonitoringDraftNote] = useState('');
  const [fileList, setFileList] = useState([]);

  const {
    data: riskResponse,
    isLoading: isLoadingRisk,
    error: riskError,
    refetch: refetchRisk,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.detail(riskId),
    queryFn: () => mrPlanningRiskService.getById(riskId, { include_governance: true }),
    enabled: Boolean(riskId),
  });

  const {
    data: monitoringResponse,
    isLoading: isLoadingMonitoring,
    isFetching,
    error: monitoringError,
    refetch: refetchMonitoring,
  } = useQuery({
    queryKey: MR_PLANNING_MONITORING_QUERY_KEYS.byRisk(riskId),
    queryFn: () => mrPlanningMonitoringService.getByRisk(riskId),
    enabled: Boolean(riskId),
  });

  const risk = riskResponse?.data || riskResponse || null;
  const rows = getRows(monitoringResponse);

  const isLoading = isLoadingRisk || isLoadingMonitoring;

  const loadEvidencesForMonitoring = useCallback(
    async (monitoringId, options = {}) => {
      if (!monitoringId) return [];

      const response = await mrPlanningMonitoringService.getEvidences(monitoringId);

      const evidences = getRows(response);

      setEvidenceLists((prev) => ({
        ...prev,
        [monitoringId]: evidences,
      }));

      setEvidenceCounts((prev) => ({
        ...prev,
        [monitoringId]: evidences.length,
      }));

      if (options.showSuccess) {
        message.success('Daftar Bukti Realisasi diperbarui.');
      }

      return evidences;
    },
    [message],
  );

  const loadEvidenceCounts = useCallback(async () => {
    const monitoringIds = rows.map(getMonitoringId).filter(Boolean);

    if (monitoringIds.length === 0) {
      setEvidenceCounts({});
      setEvidenceLists({});
      return;
    }

    setIsEvidenceLoading(true);

    try {
      const results = await Promise.allSettled(
        monitoringIds.map(async (monitoringId) => {
          const response = await mrPlanningMonitoringService.getEvidences(monitoringId);

          return {
            monitoringId,
            evidences: getRows(response),
          };
        }),
      );

      const nextCounts = {};
      const nextLists = {};

      results.forEach((result) => {
        if (result.status !== 'fulfilled') return;

        const { monitoringId, evidences } = result.value;
        nextCounts[monitoringId] = evidences.length;
        nextLists[monitoringId] = evidences;
      });

      setEvidenceCounts(nextCounts);
      setEvidenceLists(nextLists);
    } catch (error) {
      message.warning(
        getBackendErrorMessage(error) || 'Daftar Bukti Realisasi belum dapat dimuat.',
      );
    } finally {
      setIsEvidenceLoading(false);
    }
  }, [message, rows]);

  useEffect(() => {
    if (!isLoadingMonitoring && rows.length > 0) {
      loadEvidenceCounts();
    }
  }, [isLoadingMonitoring, rows.length, loadEvidenceCounts]);

  const handleRefresh = async () => {
    await Promise.all([refetchRisk(), refetchMonitoring()]);
    await loadEvidenceCounts();
    message.success('Data Pemantauan Pengendalian diperbarui.');
  };

  const handleOpenCreateMonitoringModal = async () => {
    monitoringForm.resetFields();
    setMonitoringFormMode('create');
    setEditingMonitoring(null);
    setMonitoringDraftNote('');
    setIsCreateMonitoringModalOpen(true);
    setIsLoadingMonitoringDraft(true);

    const fallbackValues = {
      periode_type: 'triwulan',
      periode_label: risk?.periode_label || 'Triwulan I 2026',
      monitoring_date: null,
      progress_persen: 0,
      persentase_realisasi: 0,
      terjadi_risiko: false,
    };

    monitoringForm.setFieldsValue(fallbackValues);

    try {
      const response = await mrPlanningMonitoringService.buildDraftPreviewFromRisk(riskId, {
        periode_type: fallbackValues.periode_type,
        periode_label: fallbackValues.periode_label,
      });

      const draft = response?.data || response || {};

      monitoringForm.setFieldsValue({
        mr_planning_mitigation_id: draft.mr_planning_mitigation_id || undefined,

        periode_type: draft.periode_type || fallbackValues.periode_type,
        periode_label: draft.periode_label || fallbackValues.periode_label,
        monitoring_date: draft.monitoring_date ? dayjs(draft.monitoring_date) : undefined,

        progress_persen:
          draft.progress_persen !== undefined && draft.progress_persen !== null
            ? Number(draft.progress_persen)
            : 0,

        persentase_realisasi:
          draft.persentase_realisasi !== undefined && draft.persentase_realisasi !== null
            ? Number(draft.persentase_realisasi)
            : 0,

        hasil_monitoring: draft.hasil_monitoring,
        realisasi_mitigasi: draft.realisasi_mitigasi,
        output_realisasi: draft.output_realisasi,
        kendala: draft.kendala,
        tindak_lanjut: draft.tindak_lanjut,
        rekomendasi: draft.rekomendasi,
        status_monitoring: draft.status_monitoring || 'draft',
        terjadi_risiko: false,
      });

      setMonitoringDraftNote(
        draft.catatan_preview ||
          'Draft Pemantauan Pengendalian berhasil dibuat otomatis oleh sistem. User wajib melakukan review sebelum menyimpan.',
      );

      message.success('Draft Pemantauan Pengendalian berhasil dibuat otomatis.');
    } catch (error) {
      setMonitoringDraftNote(
        'Draft otomatis belum dapat dimuat. Form tetap dapat diisi secara manual.',
      );

      message.warning(
        getBackendErrorMessage(error) ||
          'Draft otomatis belum dapat dimuat. Form dapat diisi secara manual.',
      );
    } finally {
      setIsLoadingMonitoringDraft(false);
    }
  };

  const handleOpenEditMonitoringModal = (record) => {
    const monitoringId = getMonitoringId(record);

    if (!monitoringId) {
      message.warning('Data Pemantauan Pengendalian tidak valid.');
      return;
    }

    setMonitoringFormMode('edit');
    setEditingMonitoring(record);
    setMonitoringDraftNote(
      'Data Pemantauan Pengendalian dimuat dari data existing. User dapat menyesuaikan isian sebelum menyimpan perubahan.',
    );

    monitoringForm.resetFields();

    monitoringForm.setFieldsValue({
      mr_planning_mitigation_id: record?.mr_planning_mitigation_id || undefined,
      status_monitoring: record?.status_monitoring || 'draft',

      periode_type: record?.periode_type || 'triwulan',
      periode_label: record?.periode_label || 'Triwulan I 2026',
      monitoring_date: record?.monitoring_date ? dayjs(record.monitoring_date) : undefined,

      progress_persen:
        record?.progress_persen !== undefined && record?.progress_persen !== null
          ? Number(record.progress_persen)
          : 0,

      persentase_realisasi:
        record?.persentase_realisasi !== undefined && record?.persentase_realisasi !== null
          ? Number(record.persentase_realisasi)
          : 0,

      hasil_monitoring: record?.hasil_monitoring,
      realisasi_mitigasi: record?.realisasi_mitigasi,
      output_realisasi: record?.output_realisasi,
      kendala: record?.kendala,
      tindak_lanjut: record?.tindak_lanjut,
      rekomendasi: record?.rekomendasi,
      terjadi_risiko: record?.terjadi_risiko || false,
    });

    setIsCreateMonitoringModalOpen(true);
  };

  const handleCloseCreateMonitoringModal = () => {
    setIsCreateMonitoringModalOpen(false);
    setMonitoringDraftNote('');
    setMonitoringFormMode('create');
    setEditingMonitoring(null);
    monitoringForm.resetFields();
  };

  const handleSubmitMonitoring = async () => {
    try {
      const values = await monitoringForm.validateFields();

      setIsSubmittingMonitoring(true);

      const payload = {
        ...values,
        monitoring_date: values.monitoring_date?.format
          ? values.monitoring_date.format('YYYY-MM-DD')
          : values.monitoring_date,
      };

      if (monitoringFormMode === 'edit' && editingMonitoring) {
        await mrPlanningMonitoringService.updateDraft(getMonitoringId(editingMonitoring), payload);

        message.success('Pemantauan Pengendalian berhasil diperbarui.');
      } else {
        await mrPlanningMonitoringService.createFromRisk(riskId, payload);

        message.success('Pemantauan Pengendalian berhasil dibuat.');
      }

      handleCloseCreateMonitoringModal();

      await refetchMonitoring();
    } catch (error) {
      message.error(getBackendErrorMessage(error) || 'Pemantauan Pengendalian belum dapat dibuat.');
    } finally {
      setIsSubmittingMonitoring(false);
    }
  };

  const handleOpenUploadModal = (record) => {
    const monitoringId = getMonitoringId(record);

    if (!monitoringId) {
      message.warning('Data Pemantauan Pengendalian tidak valid.');
      return;
    }

    setSelectedMonitoring(record);
    setFileList([]);

    uploadForm.resetFields();
    uploadForm.setFieldsValue({
      evidence_type: 'LAPORAN_PROGRESS',
      evidence_title: buildEvidenceTitle(record),
      evidence_number: buildEvidenceNumber(record),
      evidence_date: record?.monitoring_date ? dayjs(record.monitoring_date) : undefined,
      realization_period: record?.periode_label || risk?.periode_label,
      progress_percentage:
        record?.progress_persen !== undefined && record?.progress_persen !== null
          ? Number(record.progress_persen)
          : Number(record?.persentase_realisasi || 0),
      description: buildEvidenceDescription(record),
    });

    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setSelectedMonitoring(null);
    setFileList([]);
    uploadForm.resetFields();
  };

  const handleSubmitEvidence = async () => {
    const monitoringId = getMonitoringId(selectedMonitoring);

    if (!monitoringId) {
      message.warning('Data Pemantauan Pengendalian tidak valid.');
      return;
    }

    try {
      const values = await uploadForm.validateFields();
      const selectedFile = fileList?.[0]?.originFileObj;

      if (!selectedFile) {
        message.warning('File Bukti Realisasi wajib dipilih.');
        return;
      }

      setIsSubmittingEvidence(true);

      await mrPlanningMonitoringService.uploadEvidence(monitoringId, {
        ...values,
        evidence_date: values.evidence_date?.format
          ? values.evidence_date.format('YYYY-MM-DD')
          : values.evidence_date,
        file: selectedFile,
      });

      message.success('Bukti Realisasi berhasil diunggah.');
      handleCloseUploadModal();
      await loadEvidencesForMonitoring(monitoringId);
    } catch (error) {
      message.error(getBackendErrorMessage(error) || 'Bukti Realisasi gagal diunggah.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  const handleOpenEvidenceList = async (record) => {
    const monitoringId = getMonitoringId(record);

    if (!monitoringId) {
      message.warning('Data Pemantauan Pengendalian tidak valid.');
      return;
    }

    setSelectedMonitoring(record);
    setIsListModalOpen(true);

    try {
      await loadEvidencesForMonitoring(monitoringId);
    } catch (error) {
      message.error(getBackendErrorMessage(error) || 'Daftar Bukti Realisasi belum dapat dimuat.');
    }
  };

  const handleCloseEvidenceList = () => {
    setIsListModalOpen(false);
    setSelectedMonitoring(null);
  };

  const handleViewEvidence = async (evidence) => {
    try {
      await mrPlanningMonitoringService.openEvidenceBlob(evidence.id, 'view');
    } catch (error) {
      message.error(getBackendErrorMessage(error) || 'Bukti Realisasi belum dapat dilihat.');
    }
  };

  const handleDownloadEvidence = async (evidence) => {
    try {
      await mrPlanningMonitoringService.saveEvidenceBlob(
        evidence.id,
        evidence.original_file_name || 'bukti-realisasi',
      );

      message.success('Bukti Realisasi berhasil diunduh.');
    } catch (error) {
      message.error(getBackendErrorMessage(error) || 'Bukti Realisasi belum dapat diunduh.');
    }
  };

  const handleCancelEvidence = (evidence) => {
    const monitoringId = evidence?.mr_planning_monitoring_id || getMonitoringId(selectedMonitoring);

    modal.confirm({
      title: 'Batalkan Bukti Realisasi?',
      content:
        'Bukti Realisasi tidak akan dihapus permanen. Status bukti akan diubah menjadi dibatalkan.',
      okText: 'Batalkan Bukti',
      cancelText: 'Kembali',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        try {
          await mrPlanningMonitoringService.cancelEvidence(
            evidence.id,
            'Bukti Realisasi dibatalkan melalui halaman Monitoring/Realisasi.',
          );

          message.success('Bukti Realisasi berhasil dibatalkan.');

          if (monitoringId) {
            await loadEvidencesForMonitoring(monitoringId);
          }
        } catch (error) {
          message.error(getBackendErrorMessage(error) || 'Bukti Realisasi belum dapat dibatalkan.');
        }
      },
    });
  };

  const selectedMonitoringId = getMonitoringId(selectedMonitoring);
  const selectedEvidences = selectedMonitoringId ? evidenceLists[selectedMonitoringId] || [] : [];

  const evidenceColumns = [
    {
      title: 'Jenis Bukti',
      dataIndex: 'evidence_type',
      width: 180,
      render: (value) => getEvidenceTypeLabel(value),
    },
    {
      title: 'Judul Bukti',
      dataIndex: 'evidence_title',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{safeText(value)}</Text>
          <Text type="secondary">
            {safeText(record?.original_file_name, 'Nama file belum tersedia')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'evidence_date',
      width: 130,
      render: (value) => safeText(value),
    },
    {
      title: 'Progres',
      dataIndex: 'progress_percentage',
      width: 110,
      align: 'center',
      render: (value) => `${formatProgress(value)}%`,
    },
    {
      title: 'Ukuran',
      dataIndex: 'file_size',
      width: 130,
      render: (value) => formatFileSize(value),
    },
    {
      title: 'Status',
      dataIndex: 'status_bukti',
      width: 120,
      align: 'center',
      render: (value) => <Tag color={getStatusColor(value)}>{getStatusLabel(value)}</Tag>,
    },
    {
      title: 'Aksi',
      width: 230,
      align: 'center',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewEvidence(record)}>
            Lihat
          </Button>

          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadEvidence(record)}
          >
            Unduh
          </Button>

          <Button
            danger
            size="small"
            icon={<StopOutlined />}
            disabled={record?.status_bukti === 'dibatalkan' || !record?.is_active}
            onClick={() => handleCancelEvidence(record)}
          >
            Batalkan
          </Button>
        </Space>
      ),
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
      title: 'Tanggal Pemantauan',
      dataIndex: 'monitoring_date',
      width: 160,
      render: (value) => safeText(value),
    },
    {
      title: 'Progress Pelaksanaan',
      dataIndex: 'progress_persen',
      width: 180,
      render: (value) => {
        const progress = formatProgress(value);
        return <Progress percent={progress} size="small" />;
      },
    },
    {
      title: 'Hasil Pemantauan',
      dataIndex: 'hasil_monitoring',
      render: (value) => safeText(value),
    },
    {
      title: 'Realisasi Pengendalian',
      dataIndex: 'realisasi_mitigasi',
      render: (value) => safeText(value),
    },
    {
      title: 'Efektivitas Pengendalian',
      dataIndex: 'efektivitas_pengendalian',
      width: 190,
      render: (value, record) =>
        safeText(
          value || record?.efektivitas_pengendalian_label || record?.control_effectiveness_label,
        ),
    },
    {
      title: 'Level Aktual',
      width: 150,
      render: (_, record) => {
        const score = record?.actual_score;
        const level = record?.actual_level || record?.actual_level_label;

        if (!score && !level) return 'Belum Tersedia';

        return `${safeText(score)} / ${safeText(level)}`;
      },
    },
    {
      title: 'Tren Risiko',
      dataIndex: 'risk_trend',
      width: 130,
      render: (value) => getTrendLabel(value),
    },
    {
      title: 'Terjadi Risiko',
      dataIndex: 'terjadi_risiko',
      width: 130,
      align: 'center',
      render: (value) => (
        <Tag color={getEventLabel(value) === 'Ya' ? 'error' : 'success'}>
          {getEventLabel(value)}
        </Tag>
      ),
    },
    {
      title: 'Bukti Realisasi',
      width: 230,
      align: 'center',
      render: (_, record) => {
        const monitoringId = getMonitoringId(record);
        const total = evidenceCounts[monitoringId] || 0;
        let evidenceStatusText = 'Belum Ada';
        if (isEvidenceLoading) {
          evidenceStatusText = 'Memuat...';
        } else if (total > 0) {
          evidenceStatusText = `${total} Bukti`;
        }

        return (
          <Space direction="vertical" size={6}>
            <Tag icon={<FileDoneOutlined />} color={total > 0 ? 'success' : 'default'}>
              {evidenceStatusText}
            </Tag>

            <Space wrap>
              <Button
                size="small"
                icon={<UploadOutlined />}
                disabled={!monitoringId}
                onClick={() => handleOpenUploadModal(record)}
              >
                Unggah Bukti
              </Button>

              <Button
                size="small"
                icon={<EyeOutlined />}
                disabled={!monitoringId}
                onClick={() => handleOpenEvidenceList(record)}
              >
                Lihat Bukti
              </Button>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status_revisi',
      width: 150,
      align: 'center',
      render: (value) => <Tag color={getStatusColor(value)}>{getStatusLabel(value)}</Tag>,
    },
    {
      title: 'Aksi',
      width: 130,
      align: 'center',
      render: (_, record) => {
        const id = record?.id || record?.mr_planning_monitoring_id;

        return (
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={!id}
            onClick={() => handleOpenEditMonitoringModal(record)}
          >
            Ubah
          </Button>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ marginBottom: 0 }}>
              Realisasi / Pemantauan Pengendalian
            </Title>
            <Text type="secondary">
              Daftar hasil pemantauan, realisasi pengendalian, efektivitas, kejadian risiko, dan
              Bukti Realisasi.
            </Text>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(LIST_PATH)}>
              Kembali
            </Button>

            <Button
              icon={<ReloadOutlined />}
              loading={isFetching || isEvidenceLoading}
              onClick={handleRefresh}
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateMonitoringModal}
            >
              Tambah Pemantauan
            </Button>
          </Space>
        </Col>
      </Row>

      {(riskError || monitoringError) && (
        <Alert
          type="warning"
          showIcon
          message="Data belum dapat dimuat sepenuhnya"
          description={getBackendErrorMessage(riskError) || getBackendErrorMessage(monitoringError)}
        />
      )}

      <Card>
        {isLoading ? (
          <Spin />
        ) : (
          <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
            <Descriptions.Item label="Kode Risiko">{safeText(getRiskCode(risk))}</Descriptions.Item>

            <Descriptions.Item label="Status Risiko">
              <Tag color={getStatusColor(risk?.status_revisi)}>
                {getStatusLabel(risk?.status_revisi)}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Nama Risiko" span={2}>
              {safeText(getRiskName(risk))}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Catatan alur"
          description="Pemantauan Pengendalian digunakan untuk mencatat progress pelaksanaan, hasil pemantauan, realisasi pengendalian, efektivitas pengendalian, level risiko aktual, tren risiko, kejadian risiko apabila terjadi, serta Bukti Realisasi atas pelaksanaan rencana tindak pengendalian."
        />

        <Table
          rowKey={(record) => record?.id || record?.mr_planning_monitoring_id || Math.random()}
          loading={isLoadingMonitoring || isFetching}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 1750 }}
          locale={{
            emptyText: (
              <Empty description="Belum ada data Pemantauan Pengendalian dalam cakupan risiko ini." />
            ),
          }}
        />
      </Card>

      <Modal
        title={
          monitoringFormMode === 'edit'
            ? 'Ubah Pemantauan Pengendalian'
            : 'Tambah Pemantauan Pengendalian'
        }
        open={isCreateMonitoringModalOpen}
        onCancel={handleCloseCreateMonitoringModal}
        onOk={handleSubmitMonitoring}
        okText={monitoringFormMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Pemantauan'}
        cancelText="Batal"
        confirmLoading={isSubmittingMonitoring}
        width={820}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Pemantauan Pengendalian"
          description="Pemantauan Pengendalian digunakan untuk mencatat realisasi pelaksanaan rencana tindak pengendalian, progres pelaksanaan, hasil pemantauan, kendala, tindak lanjut, serta menjadi dasar pengunggahan Bukti Realisasi."
        />

        {monitoringDraftNote && (
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
            message="Draft Otomatis Sistem"
            description={monitoringDraftNote}
          />
        )}

        {isLoadingMonitoringDraft && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Sistem sedang menyusun draft"
            description="Mohon tunggu. Sistem sedang menyusun isian awal berdasarkan data Risiko dan Rencana Tindak Pengendalian."
          />
        )}

        <Form form={monitoringForm} layout="vertical" disabled={isLoadingMonitoringDraft}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="mr_planning_mitigation_id" hidden>
                <Input />
              </Form.Item>

              <Form.Item name="status_monitoring" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="periode_type"
                label="Tipe Periode"
                rules={[
                  {
                    required: true,
                    message: 'Tipe Periode wajib dipilih.',
                  },
                ]}
              >
                <Select
                  options={[
                    { value: 'bulanan', label: 'Bulanan' },
                    { value: 'triwulan', label: 'Triwulan' },
                    { value: 'semester', label: 'Semester' },
                    { value: 'tahunan', label: 'Tahunan' },
                    { value: 'adhoc', label: 'Adhoc' },
                  ]}
                  placeholder="Pilih Tipe Periode"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="periode_label"
                label="Label Periode"
                rules={[
                  {
                    required: true,
                    message: 'Label Periode wajib diisi.',
                  },
                ]}
              >
                <Input placeholder="Contoh: Triwulan I 2026" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="monitoring_date" label="Tanggal Pemantauan">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="progress_persen" label="Progress Pelaksanaan">
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="persentase_realisasi" label="Persentase Realisasi">
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="hasil_monitoring"
            label="Hasil Pemantauan"
            rules={[
              {
                required: true,
                message: 'Hasil Pemantauan wajib diisi.',
              },
            ]}
          >
            <TextArea rows={3} placeholder="Tuliskan hasil pemantauan pelaksanaan pengendalian." />
          </Form.Item>

          <Form.Item name="realisasi_mitigasi" label="Realisasi Pengendalian">
            <TextArea
              rows={3}
              placeholder="Tuliskan realisasi pelaksanaan rencana tindak pengendalian."
            />
          </Form.Item>

          <Form.Item name="output_realisasi" label="Output Realisasi">
            <TextArea
              rows={2}
              placeholder="Tuliskan output aktual dari pelaksanaan pengendalian."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="kendala" label="Kendala">
                <TextArea rows={2} placeholder="Tuliskan kendala pelaksanaan." />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="tindak_lanjut" label="Tindak Lanjut">
                <TextArea rows={2} placeholder="Tuliskan tindak lanjut berikutnya." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="rekomendasi" label="Rekomendasi">
            <TextArea rows={2} placeholder="Tuliskan rekomendasi hasil pemantauan jika ada." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Unggah Bukti Realisasi"
        open={isUploadModalOpen}
        onCancel={handleCloseUploadModal}
        onOk={handleSubmitEvidence}
        okText="Simpan Bukti"
        cancelText="Batal"
        confirmLoading={isSubmittingEvidence}
        width={760}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Bukti Realisasi Aktual"
          description="Bukti Realisasi adalah bukti pelaksanaan nyata atas Rencana Tindak Pengendalian, seperti laporan progres, berita acara, notulen, foto kegiatan, bukti pertanggungjawaban, atau dokumen output aktual. Bukti ini berbeda dari Dokumen RTP."
        />

        <Form form={uploadForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="evidence_type"
                label="Jenis Bukti"
                rules={[
                  {
                    required: true,
                    message: 'Jenis Bukti wajib dipilih.',
                  },
                ]}
              >
                <Select options={EVIDENCE_TYPE_OPTIONS} placeholder="Pilih Jenis Bukti" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="evidence_number" label="Nomor Bukti">
                <Input placeholder="Contoh: BA/REALISASI/001/2026" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="evidence_title"
            label="Judul Bukti"
            rules={[
              {
                required: true,
                message: 'Judul Bukti wajib diisi.',
              },
            ]}
          >
            <Input placeholder="Contoh: Laporan Progres Pelaksanaan Rencana Tindak Pengendalian" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="evidence_date" label="Tanggal Bukti">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="realization_period" label="Periode Realisasi">
                <Input placeholder="Contoh: Triwulan I 2026" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="progress_percentage" label="Persentase Progres">
                <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Keterangan">
            <TextArea rows={3} placeholder="Tuliskan keterangan singkat Bukti Realisasi." />
          </Form.Item>

          <Form.Item
            label="File Bukti"
            required
            tooltip="Format yang didukung: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG. Maksimal 10 MB."
          >
            <Upload
              maxCount={1}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: nextFileList }) => setFileList(nextFileList.slice(-1))}
              onRemove={() => setFileList([])}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            >
              <Button icon={<UploadOutlined />}>Pilih File Bukti</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Daftar Bukti Realisasi"
        open={isListModalOpen}
        onCancel={handleCloseEvidenceList}
        footer={[
          <Button key="close" onClick={handleCloseEvidenceList}>
            Tutup
          </Button>,
          <Button
            key="upload"
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => {
              const current = selectedMonitoring;
              setIsListModalOpen(false);
              handleOpenUploadModal(current);
            }}
          >
            Unggah Bukti
          </Button>,
        ]}
        width={1100}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Bukti Realisasi Monitoring/Realisasi"
          description="Daftar ini hanya menampilkan Bukti Realisasi yang masih aktif. Bukti yang dibatalkan tidak dihapus permanen dan tidak ditampilkan dalam daftar aktif."
        />

        <Table
          rowKey={(record) => record?.id}
          dataSource={selectedEvidences}
          columns={evidenceColumns}
          size="small"
          scroll={{ x: 1000 }}
          locale={{
            emptyText: (
              <Empty description="Bukti Realisasi belum tersedia untuk Pemantauan Pengendalian ini." />
            ),
          }}
        />
      </Modal>
    </Space>
  );
}
