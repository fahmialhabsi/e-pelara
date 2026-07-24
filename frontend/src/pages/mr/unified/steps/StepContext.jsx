// frontend/src/pages/mr/unified/steps/StepContext.jsx
import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  Button,
  Spin,
  Descriptions,
  message,
  Table,
  Space,
  Tag,
  Dropdown,
  Modal,
  Typography,
  Collapse,
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  createMrPlanningContext,
  getMrPlanningContextDetail,
  getMrPlanningContextItems,
  generateMrPlanningContextItems,
} from '@/services/mrPlanningContextService';
import mrPlanningRiskService from '@/services/mrPlanningRiskService';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRole } from '@/utils/roleUtils';

const { Text } = Typography;

const JENIS_SUMBER_OPTIONS = [
  { value: 'Renstra', label: 'Renstra' },
  { value: 'Lakip', label: 'Lakip' },
  { value: 'Laporan Keuangan', label: 'Laporan Keuangan' },
  { value: 'Tindak Lanjut BPK', label: 'Tindak Lanjut BPK' },
  { value: 'Tindak Lanjut BPKP', label: 'Tindak Lanjut BPKP' },
  { value: 'Tindak Lanjut Inspektorat', label: 'Tindak Lanjut Inspektorat' },
];

const PERIODE_TYPE_OPTIONS = [
  { value: 'tahunan', label: 'Tahunan' },
  { value: 'semesteran', label: 'Semesteran' },
  { value: 'triwulan', label: 'Triwulan' },
  { value: 'bulanan', label: 'Bulanan' },
];

// Sub-periode wajib diisi kalau periode_type bukan tahunan, supaya backend
// (buildPeriodeLabel di mrPlanningContextService.js) bisa menyusun periode_label
// yang benar ("Triwulan I 2025", bukan "Triwulan  2025") — dan supaya find-or-create
// context per (opd, tahun, periode_type, periode_label) match dengan akurat.
const BULAN_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

const TRIWULAN_OPTIONS = [
  { value: 1, label: 'Triwulan I' },
  { value: 2, label: 'Triwulan II' },
  { value: 3, label: 'Triwulan III' },
  { value: 4, label: 'Triwulan IV' },
];

const SEMESTER_OPTIONS = [
  { value: 1, label: 'Semester I' },
  { value: 2, label: 'Semester II' },
];

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

const STATUS_COLOR_MAP = {
  draft: 'default',
  verifikasi: 'processing',
  approved: 'success',
  ditolak: 'error',
};

const getRecordId = (record) => record?.id ?? record?.risk_id;

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

// Daftar semua Risiko yang sudah dibuat (lintas context), ditampilkan di
// bawah form Langkah 1 supaya user bisa lihat/edit/hapus/download laporan
// khusus 1 risiko tanpa pindah ke halaman MrPlanningRiskListPage.
const SOURCE_GROUPS = [
  { key: 'renstra', label: 'Renstra' },
  { key: 'lakip', label: 'Lakip' },
  { key: 'laporan_keuangan', label: 'Laporan Keuangan' },
  { key: 'tindak_lanjut_bpk', label: 'Tindak Lanjut BPK' },
  { key: 'tindak_lanjut_inspektorat', label: 'Tindak Lanjut Inspektorat' },
  { key: 'tindak_lanjut_bpkp', label: 'Tindak Lanjut BPKP' },
  { key: 'pelaksanaan_kegiatan', label: 'Pelaksanaan Kegiatan' },
  { key: 'pertanggungjawaban_keuangan', label: 'Pertanggungjawaban Keuangan' },
  { key: 'spip_e_sigap', label: 'SPIP / e-SIGAP' },
  { key: 'manual_adhoc', label: 'Manual / Adhoc' },
  { key: 'lainnya', label: 'Lainnya' },
];

const RENSTRA_STAGES = [
  'strategi',
  'program',
  'kegiatan',
  'sub_kegiatan',
  'tujuan',
  'sasaran',
  'kebijakan',
  'arah_kebijakan',
];

// Reuse logika deteksi sumber yang sama dengan MrPlanningRiskListPage.jsx
// (proposal_source_type untuk data proposal-intake, stage untuk data lama
// berbasis Renstra) supaya pengelompokan konsisten dengan halaman List lama.
// Setiap kategori proposal_source_type/stage yang sudah dikenal backend dapat
// grupnya sendiri; hanya yang benar-benar tidak cocok jatuh ke "Lainnya".
const getSourceGroupKey = (record) => {
  const source = String(record?.proposal_source_type || '').toUpperCase();
  const stage = String(record?.stage || '').toLowerCase();

  if (source === 'RENSTRA' || RENSTRA_STAGES.includes(stage)) return 'renstra';
  if (source === 'LAKIP' || stage === 'lakip') return 'lakip';
  if (source === 'LAPORAN_KEUANGAN' || stage === 'laporan_keuangan') return 'laporan_keuangan';
  if (source === 'TINDAK_LANJUT_BPK' || stage === 'temuan_bpk') return 'tindak_lanjut_bpk';
  if (source === 'TINDAK_LANJUT_INSPEKTORAT' || stage === 'temuan_inspektorat') {
    return 'tindak_lanjut_inspektorat';
  }
  if (source === 'TINDAK_LANJUT_BPKP' || stage === 'temuan_bpkp') return 'tindak_lanjut_bpkp';
  if (source === 'PELAKSANAAN_KEGIATAN' || stage === 'pelaksanaan_kegiatan') {
    return 'pelaksanaan_kegiatan';
  }
  if (source === 'PERTANGGUNGJAWABAN_KEUANGAN' || stage === 'pertanggungjawaban_keuangan') {
    return 'pertanggungjawaban_keuangan';
  }
  if (source === 'SPIP_E_SIGAP' || stage === 'spip_e_sigap') return 'spip_e_sigap';
  if (source === 'MANUAL_ADHOC' || stage === 'manual_adhoc') return 'manual_adhoc';

  return 'lainnya';
};

// Sama seperti workflow context (draft -> submit -> verifikasi -> verify ->
// verifikasi diverifikasi -> approve -> approved), tapi WAJIB berlaku PER
// RISIKO — buildUnifiedReportApprovalGate di
// backend/services/mr/mrPlanningReportQueryService.js hanya izinkan
// export Word/PDF kalau SEMUA risiko dalam laporan sudah berstatus approved,
// terlepas dari status context-nya sendiri.
const getRiskWorkflowState = (record = {}) => {
  const status = String(record?.status_revisi || 'draft').toLowerCase();
  const isVerified = Boolean(record?.diverifikasi_oleh && record?.diverifikasi_pada);
  const isApproved = ['approved', 'final', 'selesai', 'disetujui'].includes(status);
  const isRejected = status === 'ditolak';

  return {
    // 'ditolak' TIDAK bisa lewat submit biasa (backend: ensureDraftEditable
    // hanya terima status draft) — harus lewat createRevisi (reset ke draft).
    canSubmit: status === 'draft',
    canRevise: isRejected,
    canVerify: status === 'verifikasi' && !isVerified,
    canApprove: status === 'verifikasi' && isVerified,
    isApproved,
    isRejected,
  };
};

function RiskListPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roleNorm = normalizeRole(user?.role);
  const canWriteRiskWorkflow = ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(roleNorm);
  const canApproveRiskWorkflow = roleNorm === 'SUPER_ADMIN';

  const {
    data: risks = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['mr-wizard', 'risk-list'],
    queryFn: () => mrPlanningRiskService.getAll(),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => mrPlanningRiskService.remove(id),
    onSuccess: (response) => {
      message.success(response?.message || 'Risiko berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['mr-wizard', 'risk-list'] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err.message || 'Gagal menghapus risiko.');
    },
  });

  const submitRiskMutation = useMutation({
    mutationFn: (id) => mrPlanningRiskService.submitForVerification(id),
    onSuccess: (response) => {
      message.success(response?.message || 'Risiko berhasil diajukan untuk verifikasi.');
      queryClient.invalidateQueries({ queryKey: ['mr-wizard', 'risk-list'] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err.message || 'Gagal mengajukan risiko.');
    },
  });

  const verifyRiskMutation = useMutation({
    mutationFn: (id) => mrPlanningRiskService.verify(id),
    onSuccess: (response) => {
      message.success(response?.message || 'Risiko berhasil diverifikasi.');
      queryClient.invalidateQueries({ queryKey: ['mr-wizard', 'risk-list'] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err.message || 'Gagal memverifikasi risiko.');
    },
  });

  const approveRiskMutation = useMutation({
    mutationFn: (id) => mrPlanningRiskService.approve(id),
    onSuccess: (response) => {
      message.success(response?.message || 'Risiko berhasil disetujui.');
      queryClient.invalidateQueries({ queryKey: ['mr-wizard', 'risk-list'] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err.message || 'Gagal menyetujui risiko.');
    },
  });

  const handleApproveRisk = (record) => {
    const id = getRecordId(record);
    if (!id) return;

    Modal.confirm({
      title: 'Setujui Risiko?',
      content:
        'Setelah disetujui, risiko ini terhitung siap untuk export Word/PDF laporan (jika seluruh risiko lain dalam laporan juga sudah disetujui).',
      okText: 'Ya, Setujui',
      cancelText: 'Batal',
      onOk: () => approveRiskMutation.mutate(id),
    });
  };

  const reviseRiskMutation = useMutation({
    mutationFn: (id) =>
      mrPlanningRiskService.createRevisi(id, {
        alasan_revisi: 'Perbaikan setelah ditolak, diajukan ulang untuk verifikasi.',
      }),
    onSuccess: (response) => {
      message.success(
        response?.message || 'Risiko berhasil diajukan ulang (status kembali ke draft).',
      );
      queryClient.invalidateQueries({ queryKey: ['mr-wizard', 'risk-list'] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || err.message || 'Gagal mengajukan ulang risiko.');
    },
  });

  const handleReviseRisk = (record) => {
    const id = getRecordId(record);
    if (!id) return;

    Modal.confirm({
      title: 'Perbaiki & Ajukan Ulang Risiko?',
      content:
        'Risiko yang ditolak akan dikembalikan ke status draft (versi baru) supaya bisa diperbaiki lalu diajukan verifikasi lagi. Alasan penolakan sebelumnya tetap tercatat di riwayat.',
      okText: 'Ya, Ajukan Ulang',
      cancelText: 'Batal',
      onOk: () => reviseRiskMutation.mutate(id),
    });
  };

  const handleDelete = (record) => {
    const id = getRecordId(record);
    if (!id) return;

    Modal.confirm({
      title: 'Hapus Risiko?',
      content: 'Data akan dihapus sesuai guard backend. Risiko yang sudah approved akan diblokir.',
      okText: 'Ya, hapus',
      cancelText: 'Batal',
      okButtonProps: { danger: true },
      onOk: () => removeMutation.mutate(id),
    });
  };

  const handleDownload = async (record, type) => {
    const id = getRecordId(record);
    if (!id) return;

    const kode = record?.kode_risiko || id;

    try {
      let response;
      let fallbackFilename;

      if (type === 'word') {
        response = await mrPlanningRiskService.exportSingleWord(id);
        fallbackFilename = `Laporan_MR_Risiko_${kode}.docx`;
      } else if (type === 'pdf') {
        response = await mrPlanningRiskService.exportSinglePdf(id);
        fallbackFilename = `Laporan_MR_Risiko_${kode}.pdf`;
      } else {
        response = await mrPlanningRiskService.exportSingleExcel(id);
        fallbackFilename = `Laporan_MR_Risiko_${kode}.xlsx`;
      }

      downloadBlobResponse(response, fallbackFilename);
      message.success('Download berhasil diproses.');
    } catch (err) {
      message.error(
        err?.response?.data?.message || err.message || 'Gagal download laporan risiko.',
      );
    }
  };

  const columns = [
    {
      title: 'No',
      width: 60,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Kode Risiko',
      dataIndex: 'kode_risiko',
      width: 160,
      render: (value) => <Text strong>{value || '-'}</Text>,
    },
    {
      title: 'Nama/Uraian Risiko',
      dataIndex: 'nama_risiko',
      render: (value, record) => value || record?.uraian_risiko || '-',
    },
    {
      title: 'Level',
      dataIndex: 'level_risiko',
      width: 130,
      align: 'center',
      render: (value) => {
        const key = String(value || '').toLowerCase();
        return (
          <Tag color={LEVEL_COLOR_MAP[key] || 'default'}>{String(value || '-').toUpperCase()}</Tag>
        );
      },
    },
    {
      title: 'Status Persetujuan',
      dataIndex: 'status_revisi',
      width: 190,
      align: 'center',
      render: (value, record) => {
        const key = String(value || 'draft').toLowerCase();
        const id = getRecordId(record);
        const workflow = getRiskWorkflowState(record);

        return (
          <Space direction="vertical" size={4}>
            <Tag color={STATUS_COLOR_MAP[key] || 'default'}>{key.toUpperCase()}</Tag>
            {canWriteRiskWorkflow && workflow.canSubmit && (
              <Button
                size="small"
                disabled={!id}
                loading={submitRiskMutation.isPending}
                onClick={() => submitRiskMutation.mutate(id)}
              >
                Ajukan Verifikasi
              </Button>
            )}
            {canWriteRiskWorkflow && workflow.canVerify && (
              <Button
                size="small"
                disabled={!id}
                loading={verifyRiskMutation.isPending}
                onClick={() => verifyRiskMutation.mutate(id)}
              >
                Verifikasi
              </Button>
            )}
            {canApproveRiskWorkflow && workflow.canApprove && (
              <Button
                size="small"
                type="primary"
                disabled={!id}
                loading={approveRiskMutation.isPending}
                onClick={() => handleApproveRisk(record)}
              >
                Setujui
              </Button>
            )}
            {canWriteRiskWorkflow && workflow.canRevise && (
              <Button
                size="small"
                danger
                disabled={!id}
                loading={reviseRiskMutation.isPending}
                onClick={() => handleReviseRisk(record)}
              >
                Perbaiki & Ajukan Ulang
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Aksi',
      width: 380,
      render: (_, record) => {
        const id = getRecordId(record);

        return (
          <Space wrap>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!id}
              onClick={() => navigate(`/mr/planning-risk/edit/${id}`)}
            />
            {/* Wizard baru (Step 1-2) belum bisa dipakai membuka Step 3/4 untuk
                risiko yang sudah ada (state riskId cuma terisi dari alur buat
                baru) — dua tombol ini langsung ke halaman Mitigasi/Monitoring
                yang sama seperti Step 3/4, tanpa perlu ulang dari Step 1. */}
            <Button
              size="small"
              disabled={!id}
              onClick={() => navigate(`/mr/planning-risk/${id}/mitigation`)}
            >
              Mitigasi
            </Button>
            <Button
              size="small"
              disabled={!id}
              onClick={() => navigate(`/mr/planning-risk/${id}/monitoring`)}
            >
              Monitoring
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={!id}
              loading={removeMutation.isPending}
              onClick={() => handleDelete(record)}
            />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'word',
                    icon: <FileWordOutlined />,
                    label: 'Download Word',
                    onClick: () => handleDownload(record, 'word'),
                  },
                  {
                    key: 'pdf',
                    icon: <FilePdfOutlined />,
                    label: 'Download PDF',
                    onClick: () => handleDownload(record, 'pdf'),
                  },
                  {
                    key: 'excel',
                    icon: <FileExcelOutlined />,
                    label: 'Download Excel',
                    onClick: () => handleDownload(record, 'excel'),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button size="small" icon={<DownloadOutlined />} disabled={!id} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const groupedRisks = SOURCE_GROUPS.map((group) => ({
    ...group,
    items: risks.filter((record) => getSourceGroupKey(record) === group.key),
  })).filter((group) => group.items.length > 0);

  const collapseItems = groupedRisks.map((group) => ({
    key: group.key,
    label: `${group.label} (${group.items.length})`,
    children: (
      <Table
        rowKey={(record) => getRecordId(record)}
        loading={isLoading || isFetching}
        columns={columns}
        dataSource={group.items}
        size="small"
        bordered
        scroll={{ x: 1300 }}
        pagination={{ pageSize: 5, showTotal: (total) => `Total ${total} risiko` }}
      />
    ),
  }));

  return (
    <Card title="Daftar Risiko yang Sudah Dibuat" style={{ marginTop: 24 }} size="small">
      <Collapse items={collapseItems} />
    </Card>
  );
}

export default function StepContext({ contextId, onStepComplete }) {
  const [form] = Form.useForm();
  const [opdList, setOpdList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSasaranIndikator, setSelectedSasaranIndikator] = useState(null);
  const [selectedLakipItem, setSelectedLakipItem] = useState(null);

  // Pola sama dengan "selectedContextDetailResponse" di MrPlanningRiskForm.jsx:
  // fetch-detail-by-id lewat useQuery (react-query), bukan useEffect+useState
  // manual — menghindari setState sinkron langsung di body efek.
  const { data: existingContext, isLoading: loadingExisting } = useQuery({
    queryKey: ['mr-wizard', 'context-detail', contextId],
    queryFn: async () => {
      const result = await getMrPlanningContextDetail(contextId);
      return result?.data || result || null;
    },
    enabled: Boolean(contextId),
  });

  // Dropdown "Pilih Jenis Sumber" (sasaran+indikator Renstra) HANYA muncul saat
  // jenis_sumber === 'Renstra' (value option persis, lihat JENIS_SUMBER_OPTIONS
  // di atas). Field OPD di form ini sebenarnya menyimpan RenstraOPD.id (lihat
  // options={opdList.map((o) => ({ value: o.id, ... }))} di bawah — bukan
  // OpdPenanggungJawab.id), jadi bisa langsung dipakai sebagai renstraId untuk
  // endpoint /mr-autofill/options/sasaran-indikator tanpa fetch tambahan.
  const jenisSumberWatched = Form.useWatch('jenis_sumber', form);
  const opdIdWatched = Form.useWatch('opd_id', form);
  const tahunWatched = Form.useWatch('tahun', form);
  const periodeTypeWatched = Form.useWatch('periode_type', form);
  const isRenstraSource = jenisSumberWatched === 'Renstra';
  const isLakipSource = jenisSumberWatched === 'Lakip';

  const { data: sasaranIndikatorOptions = [], isLoading: loadingSasaranIndikator } = useQuery({
    queryKey: ['mr-wizard', 'sasaran-indikator-options', opdIdWatched],
    queryFn: async () => {
      const res = await api.get('/mr-autofill/options/sasaran-indikator', {
        params: { renstraId: opdIdWatched },
      });
      return res.data?.data || [];
    },
    enabled: isRenstraSource && Boolean(opdIdWatched),
  });

  const { data: lakipOptions = [], isLoading: loadingLakip } = useQuery({
    queryKey: ['mr-wizard', 'lakip-options', opdIdWatched, tahunWatched],
    queryFn: async () => {
      const res = await api.get('/mr-autofill/options/lakip', {
        params: { renstraId: opdIdWatched, tahun: tahunWatched },
      });
      return res.data?.data || [];
    },
    enabled: isLakipSource && Boolean(opdIdWatched) && Boolean(tahunWatched),
  });

  // Reuse persis dari MrPlanningContextPage.jsx useEffect #1
  useEffect(() => {
    api
      .get('/renstra-opd')
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setOpdList(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const handleFinish = async (values) => {
    const {
      sasaran_indikator_ref: _sasaranIndikatorRefValue,
      lakip_ref: _lakipRefValue,
      ...restValues
    } = values;
    setSubmitting(true);
    try {
      const opd = opdList.find((o) => String(o.id) === String(values.opd_id));
      const nama_opd = opd?.nama_opd || '';

      // periode_label SENGAJA tidak dikirim dari sini — biarkan backend
      // (buildPeriodeLabel di mrPlanningContextService.js) yang menyusunnya dari
      // tahun/periode_type/bulan/triwulan/semester. Sebelumnya periode_label
      // dibangun di sini dengan menyisipkan jenis_sumber ("Renstra - Tahun 2025 -
      // Dinas Pangan"), yang membuat find-or-create context (match by tahun +
      // opd_id + periode_type + periode_label) di backend SELALU meleset antar
      // Jenis Sumber berbeda untuk OPD & tahun yang sama — akibatnya tiap Jenis
      // Sumber membuat context (dan laporan) terpisah, padahal seharusnya 1
      // context/laporan per OPD+tahun+periode untuk semua sumber risiko.
      const payload = {
        ...restValues,
        opd_id: Number(values.opd_id),
        renstra_id: Number(values.opd_id),
        nama_opd,
      };

      const result = await createMrPlanningContext(payload);
      if (!result?.success) {
        throw new Error(result?.message || 'Gagal membuat Context MR.');
      }
      message.success('Context MR berhasil dibuat.');

      // createMrPlanningContext -> POST /mr-planning-context/report-period
      // mengembalikan { created, context: {...row asli...} }, bukan row secara
      // langsung di result.data — tanpa unwrap ini, contextData.id (dipakai
      // sebagai context_id di proposal-intake) selalu undefined.
      let createdContext = result.data?.context || result.data || { ...payload };

      if (values.jenis_sumber === 'Renstra' && createdContext?.id) {
        await generateMrPlanningContextItems(createdContext.id);
        const itemsRes = await getMrPlanningContextItems(createdContext.id);
        const items = itemsRes?.data || itemsRes || [];
        const matchedItem = selectedSasaranIndikator
          ? items.find((it) => it.indikator_id === selectedSasaranIndikator.indikator_id)
          : null;
        if (matchedItem) {
          createdContext = { ...createdContext, context_item_id: matchedItem.id };
        }
      }

      // Teruskan pilihan sasaran+indikator (jika ada) ke step berikutnya lewat
      // contextData — jalur props/context wizard yang sudah ada di
      // MrRiskManagementWizardPage.jsx (onStepComplete -> setContextData ->
      // prop contextData ke StepRiskAnalysis). Tidak dikirim ke backend
      // createMrPlanningContext karena MrPlanningContext tidak punya kolom ini.
      // jenis_sumber juga disisipkan manual dari form (bukan dari createdContext)
      // karena backend tidak menyimpan/mengembalikan kolom ini sama sekali —
      // tanpa ini proposal_source_type di Step 2 selalu kosong (400 MR_VALIDATION_ERROR).
      const contextForNextStep = {
        ...createdContext,
        jenis_sumber: values.jenis_sumber,
        ...(selectedSasaranIndikator || {}),
        ...(selectedLakipItem || {}),
      };
      onStepComplete(contextForNextStep);
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Gagal membuat Context MR.');
    } finally {
      setSubmitting(false);
    }
  };

  if (contextId) {
    if (loadingExisting) {
      return (
        <Card title="Langkah 1 — Konteks">
          <Spin tip="Memuat data context..." />
        </Card>
      );
    }
    return (
      <>
        <Card title="Langkah 1 — Konteks">
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Jenis Sumber">
              {existingContext?.jenis_sumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Tahun">{existingContext?.tahun || '-'}</Descriptions.Item>
            <Descriptions.Item label="OPD">{existingContext?.nama_opd || '-'}</Descriptions.Item>
            <Descriptions.Item label="Periode">
              {existingContext?.periode_label || '-'}
            </Descriptions.Item>
          </Descriptions>
          <Button
            type="primary"
            disabled={!existingContext}
            onClick={() => onStepComplete(existingContext)}
          >
            Lanjut
          </Button>
        </Card>
        <RiskListPanel />
      </>
    );
  }

  return (
    <>
      <Card title="Langkah 1 — Konteks">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ periode_type: 'tahunan', tahun: new Date().getFullYear() }}
        >
          <Form.Item
            name="jenis_sumber"
            label="Jenis Sumber"
            rules={[{ required: true, message: 'Jenis sumber wajib dipilih.' }]}
          >
            <Select options={JENIS_SUMBER_OPTIONS} placeholder="Pilih jenis sumber" />
          </Form.Item>
          <Form.Item
            name="tahun"
            label="Tahun"
            rules={[{ required: true, message: 'Tahun wajib diisi.' }]}
          >
            <InputNumber style={{ width: '100%' }} min={2000} max={2100} />
          </Form.Item>
          <Form.Item
            name="opd_id"
            label="OPD"
            rules={[{ required: true, message: 'OPD wajib dipilih.' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={opdList.map((o) => ({ value: o.id, label: o.nama_opd }))}
              placeholder="Pilih OPD"
            />
          </Form.Item>
          {isRenstraSource && (
            <Form.Item
              name="sasaran_indikator_ref"
              label="Pilih Jenis Sumber"
              extra={
                !opdIdWatched
                  ? 'Pilih OPD terlebih dahulu untuk memuat daftar sasaran & indikator.'
                  : undefined
              }
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={loadingSasaranIndikator}
                placeholder="Pilih sasaran & indikator Renstra"
                allowClear
                options={sasaranIndikatorOptions.map((item) => ({
                  value: item.indikator_id,
                  label: `${item.kode_indikator} | ${item.nama_indikator}`,
                  data: item,
                }))}
                onChange={(_value, option) => setSelectedSasaranIndikator(option?.data || null)}
                onClear={() => setSelectedSasaranIndikator(null)}
              />
            </Form.Item>
          )}
          {isLakipSource && (
            <Form.Item
              name="lakip_ref"
              label="Pilih Data LAKIP"
              extra={
                !opdIdWatched
                  ? 'Pilih OPD terlebih dahulu untuk memuat daftar data LAKIP.'
                  : !loadingLakip && lakipOptions.length === 0
                    ? `Belum ada data LAKIP untuk tahun ${tahunWatched || '-'}. Coba ganti Tahun di atas.`
                    : undefined
              }
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={loadingLakip}
                placeholder="Pilih indikator kinerja LAKIP"
                allowClear
                options={lakipOptions.map((item) => ({
                  value: item.lakip_id,
                  label: item.indikator_kinerja || '-',
                  data: item,
                }))}
                onChange={(_value, option) => setSelectedLakipItem(option?.data || null)}
                onClear={() => setSelectedLakipItem(null)}
              />
            </Form.Item>
          )}
          <Form.Item name="periode_type" label="Tipe Periode" rules={[{ required: true }]}>
            <Select options={PERIODE_TYPE_OPTIONS} />
          </Form.Item>
          {periodeTypeWatched === 'bulanan' && (
            <Form.Item
              name="bulan"
              label="Bulan"
              rules={[{ required: true, message: 'Bulan wajib dipilih.' }]}
            >
              <Select options={BULAN_OPTIONS} placeholder="Pilih bulan" />
            </Form.Item>
          )}
          {periodeTypeWatched === 'triwulan' && (
            <Form.Item
              name="triwulan"
              label="Triwulan"
              rules={[{ required: true, message: 'Triwulan wajib dipilih.' }]}
            >
              <Select options={TRIWULAN_OPTIONS} placeholder="Pilih triwulan" />
            </Form.Item>
          )}
          {periodeTypeWatched === 'semesteran' && (
            <Form.Item
              name="semester"
              label="Semester"
              rules={[{ required: true, message: 'Semester wajib dipilih.' }]}
            >
              <Select options={SEMESTER_OPTIONS} placeholder="Pilih semester" />
            </Form.Item>
          )}
          <Button type="primary" htmlType="submit" loading={submitting}>
            Simpan & Lanjut
          </Button>
        </Form>
      </Card>
      <RiskListPanel />
    </>
  );
}
