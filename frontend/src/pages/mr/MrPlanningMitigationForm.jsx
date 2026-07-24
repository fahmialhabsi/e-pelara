// frontend/src/pages/mr/MrPlanningMitigationForm.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, BulbOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import mrPlanningRiskService, {
  MR_PLANNING_RISK_QUERY_KEYS,
} from '@/services/mrPlanningRiskService';

import mrPlanningMitigationService, {
  MR_PLANNING_MITIGATION_QUERY_KEYS,
} from '@/services/mrPlanningMitigationService';
import useDirtyFormGuard from '@/features/mr/hooks/useDirtyFormGuard';

const { Title, Text } = Typography;
const { TextArea } = Input;

const LIST_PATH = '/mr/planning-risk';

const REFERENCE_GROUPS = {
  MITIGATION_RESPONSE: 'MITIGATION_RESPONSE',
  SPIP_ELEMENT: 'SPIP_ELEMENT',
  SPIP_SUB_ELEMENT: 'SPIP_SUB_ELEMENT',
  RTP_OUTPUT: 'RTP_OUTPUT',
  LIKELIHOOD: 'LIKELIHOOD',
  IMPACT: 'IMPACT',
};

const safeText = (value, fallback = 'Belum Tersedia') => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const toDateOnly = (value) => {
  if (!value) return undefined;

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
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

const getReferenceRows = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const buildReferenceOptions = (rows = []) =>
  rows.map((item) => ({
    label: `${safeText(item.kode_item)} — ${safeText(item.nama_item)}`,
    value: item.id,
    item,
  }));

const getBackendErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (typeof data === 'string') return data;
  if (error?.message) return error.message;

  return 'Rencana Tindak Pengendalian belum dapat diproses.';
};

const normalizeDetail = (response) => response?.data || response || null;

const buildInitialValues = (detail = {}) => {
  const riskAnalysisId =
    detail.risk_analysis_id || detail.mr_planning_risk_analysis_id || detail.analysis?.id || null;

  const rootCauseId =
    detail.root_cause_id || detail.mr_planning_root_cause_id || detail.root_cause?.id || null;

  const likelihoodAfterId =
    detail.risk_after_mitigation_likelihood_ref_id || detail.after_likelihood_ref_id || null;

  const impactAfterId =
    detail.risk_after_mitigation_impact_ref_id || detail.after_impact_ref_id || null;

  return {
    // Field tampilan/form.
    mr_planning_risk_analysis_id: riskAnalysisId,
    mr_planning_root_cause_id: rootCauseId,
    after_likelihood_ref_id: likelihoodAfterId,
    after_impact_ref_id: impactAfterId,
    catatan_mitigasi: detail.tindak_lanjut || detail.catatan_mitigasi,

    // Field resmi backend create/update.
    risk_analysis_id: riskAnalysisId,
    root_cause_id: rootCauseId,
    risk_after_mitigation_likelihood_ref_id: likelihoodAfterId,
    risk_after_mitigation_impact_ref_id: impactAfterId,

    uraian_mitigasi: detail.uraian_mitigasi || detail.kegiatan_pengendalian || '',

    jenis_mitigasi: detail.jenis_mitigasi || 'Rencana Tindak Pengendalian',

    respon_risiko_ref_id: detail.respon_risiko_ref_id,
    unsur_spip_ref_id: detail.unsur_spip_ref_id,
    sub_unsur_spip_ref_id: detail.sub_unsur_spip_ref_id,
    output_rtp_ref_id: detail.output_rtp_ref_id,

    kegiatan_pengendalian: detail.kegiatan_pengendalian,
    target_output: detail.target_output,
    indikator_keluaran: detail.indikator_keluaran,
    target_keluaran: detail.target_keluaran,
    satuan_keluaran: detail.satuan_keluaran,
    penanggung_jawab: detail.penanggung_jawab,

    target_tanggal: toDateOnly(
      detail.target_tanggal ||
        detail.target_waktu ||
        detail.target_waktu_selesai ||
        detail.tanggal_selesai,
    ),
    tanggal_mulai: detail.tanggal_mulai,
    tanggal_selesai: detail.tanggal_selesai,
    target_waktu_mulai: detail.target_waktu_mulai,
    target_waktu_selesai: detail.target_waktu_selesai,

    requires_spip_rtp: detail.requires_spip_rtp ?? false,
    progress_persen: detail.progress_persen ?? 0,

    status_mitigasi: detail.status_mitigasi || 'direncanakan',
    tindak_lanjut: detail.tindak_lanjut,
    alasan_revisi: detail.alasan_revisi,
  };
};

export default function MrPlanningMitigationForm({
  mode: propMode,
  riskId: riskIdProp,
  mitigationId: mitigationIdProp,
  onSaved,
  onCancel,
}) {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const routeParams = useParams();
  const riskId = riskIdProp ?? routeParams.riskId;
  const mitigationId = mitigationIdProp ?? routeParams.mitigationId;

  const mode = propMode || (mitigationId ? 'edit' : 'create');
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';

  const [backendError, setBackendError] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  useDirtyFormGuard(isDirty);

  const {
    data: riskResponse,
    isLoading: isLoadingRisk,
    error: riskError,
  } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.detail(riskId),
    queryFn: () => mrPlanningRiskService.getById(riskId, { include_governance: true }),
    enabled: Boolean(riskId),
  });

  const {
    data: detailResponse,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useQuery({
    queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.detail(mitigationId),
    queryFn: () => mrPlanningMitigationService.getById(mitigationId),
    enabled: isEditMode && Boolean(mitigationId),
  });

  const { data: mitigationResponseOptions, isLoading: isLoadingMitigationResponse } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems(REFERENCE_GROUPS.MITIGATION_RESPONSE),
    queryFn: () =>
      mrPlanningRiskService.getReferenceItemsByGroup(REFERENCE_GROUPS.MITIGATION_RESPONSE),
  });

  const { data: spipElementOptionsResponse, isLoading: isLoadingSpipElement } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems(REFERENCE_GROUPS.SPIP_ELEMENT),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup(REFERENCE_GROUPS.SPIP_ELEMENT),
  });

  const { data: spipSubElementOptionsResponse, isLoading: isLoadingSpipSubElement } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems(REFERENCE_GROUPS.SPIP_SUB_ELEMENT),
    queryFn: () =>
      mrPlanningRiskService.getReferenceItemsByGroup(REFERENCE_GROUPS.SPIP_SUB_ELEMENT),
  });

  const { data: rtpOutputOptionsResponse, isLoading: isLoadingRtpOutput } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems(REFERENCE_GROUPS.RTP_OUTPUT),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup(REFERENCE_GROUPS.RTP_OUTPUT),
  });

  const { data: likelihoodOptionsResponse, isLoading: isLoadingLikelihood } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems(REFERENCE_GROUPS.LIKELIHOOD),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup(REFERENCE_GROUPS.LIKELIHOOD),
  });

  const { data: impactOptionsResponse, isLoading: isLoadingImpact } = useQuery({
    queryKey: MR_PLANNING_RISK_QUERY_KEYS.referenceItems(REFERENCE_GROUPS.IMPACT),
    queryFn: () => mrPlanningRiskService.getReferenceItemsByGroup(REFERENCE_GROUPS.IMPACT),
  });

  const risk = normalizeDetail(riskResponse);
  const detail = normalizeDetail(detailResponse);

  const mitigationResponseItems = getReferenceRows(mitigationResponseOptions);
  const spipElementItems = getReferenceRows(spipElementOptionsResponse);
  const spipSubElementItems = getReferenceRows(spipSubElementOptionsResponse);
  const rtpOutputItems = getReferenceRows(rtpOutputOptionsResponse);
  const likelihoodItems = getReferenceRows(likelihoodOptionsResponse);
  const impactItems = getReferenceRows(impactOptionsResponse);

  const mitigationResponseSelectOptions = useMemo(
    () => buildReferenceOptions(mitigationResponseItems),
    [mitigationResponseItems],
  );

  const spipElementSelectOptions = useMemo(
    () => buildReferenceOptions(spipElementItems),
    [spipElementItems],
  );

  const spipSubElementSelectOptions = useMemo(
    () => buildReferenceOptions(spipSubElementItems),
    [spipSubElementItems],
  );

  const rtpOutputSelectOptions = useMemo(
    () => buildReferenceOptions(rtpOutputItems),
    [rtpOutputItems],
  );

  const likelihoodSelectOptions = useMemo(
    () => buildReferenceOptions(likelihoodItems),
    [likelihoodItems],
  );

  const impactSelectOptions = useMemo(() => buildReferenceOptions(impactItems), [impactItems]);

  const isLoading =
    isLoadingRisk ||
    isLoadingDetail ||
    isLoadingMitigationResponse ||
    isLoadingSpipElement ||
    isLoadingSpipSubElement ||
    isLoadingRtpOutput ||
    isLoadingLikelihood ||
    isLoadingImpact;

  useEffect(() => {
    if (isEditMode && detail) {
      form.setFieldsValue(buildInitialValues(detail));
    }
  }, [detail, form, isEditMode]);

  const createMutation = useMutation({
    mutationFn: (values) => mrPlanningMitigationService.createFromRisk(riskId, values),
    onSuccess: (result) => {
      message.success('Rencana Tindak Pengendalian berhasil disimpan.');
      setIsDirty(false);
      setBackendError(null);

      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.byRisk(riskId),
      });

      if (onSaved) {
        onSaved(result?.data || result);
      } else {
        navigate(`${LIST_PATH}/${riskId}/mitigation`);
      }
    },
    onError: (error) => {
      const msg = getBackendErrorMessage(error);
      setBackendError(msg);
      message.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values) => mrPlanningMitigationService.updateDraft(mitigationId, values),
    onSuccess: () => {
      message.success('Rencana Tindak Pengendalian berhasil diperbarui.');
      setIsDirty(false);
      setBackendError(null);

      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.byRisk(riskId),
      });

      queryClient.invalidateQueries({
        queryKey: MR_PLANNING_MITIGATION_QUERY_KEYS.detail(mitigationId),
      });

      if (onSaved) {
        onSaved({ id: mitigationId });
      } else {
        navigate(`${LIST_PATH}/${riskId}/mitigation`);
      }
    },
    onError: (error) => {
      const msg = getBackendErrorMessage(error);
      setBackendError(msg);
      message.error(msg);
    },
  });

  const handleSubmit = (values) => {
    setBackendError(null);

    if (isCreateMode) {
      createMutation.mutate(values);
      return;
    }

    updateMutation.mutate(values);
  };

  const handleApplyAutomaticDraft = async () => {
    if (!riskId) {
      message.warning('ID Risiko tidak ditemukan.');
      return;
    }

    setBackendError(null);
    setIsPreviewLoading(true);

    try {
      const response = await mrPlanningMitigationService.previewDraftFromRisk(riskId, {
        preview_context: 'rencana_tindak_pengendalian',
      });

      const draft = response?.data || response || {};
      const riskAnalysisId =
        draft.mr_planning_risk_analysis_id || draft.risk_analysis_id || draft.analysis?.id || null;

      const rootCauseId =
        draft.mr_planning_root_cause_id || draft.root_cause_id || draft.root_cause?.id || null;

      form.setFieldsValue({
        // Field tampilan/form.
        mr_planning_risk_analysis_id: riskAnalysisId,
        mr_planning_root_cause_id: rootCauseId,

        // Field resmi backend create/update.
        risk_analysis_id: riskAnalysisId,
        root_cause_id: rootCauseId,

        respon_risiko_ref_id: draft.respon_risiko_ref_id,
        unsur_spip_ref_id: draft.unsur_spip_ref_id,
        sub_unsur_spip_ref_id: draft.sub_unsur_spip_ref_id,
        output_rtp_ref_id: draft.output_rtp_ref_id,

        kegiatan_pengendalian: draft.kegiatan_pengendalian,
        target_output: draft.target_output,
        indikator_keluaran: draft.indikator_keluaran,
        target_keluaran: draft.target_keluaran,
        satuan_keluaran: draft.satuan_keluaran,
        penanggung_jawab: draft.penanggung_jawab,
        target_tanggal: draft.target_tanggal || draft.target_waktu,

        // Field tampilan/form.
        after_likelihood_ref_id: draft.after_likelihood_ref_id,
        after_impact_ref_id: draft.after_impact_ref_id,

        // Field resmi backend create/update.
        risk_after_mitigation_likelihood_ref_id: draft.after_likelihood_ref_id,
        risk_after_mitigation_impact_ref_id: draft.after_impact_ref_id,

        status_mitigasi: draft.status_mitigasi,
        catatan_mitigasi: draft.catatan_mitigasi,
        alasan_revisi: draft.alasan_revisi,

        uraian_mitigasi: draft.uraian_mitigasi || draft.kegiatan_pengendalian || '',

        jenis_mitigasi: draft.jenis_mitigasi || 'Rencana Tindak Pengendalian',

        tindak_lanjut:
          draft.catatan_mitigasi ||
          'Pemilik Risiko meninjau, melengkapi, dan menetapkan rencana tindak pengendalian sebelum diajukan sebagai rencana resmi.',

        requires_spip_rtp: false,
        progress_persen: 0,
      });

      message.success(
        'Draft Rencana Tindak Pengendalian berhasil dibuat. Mohon review dan sesuaikan sebelum disimpan.',
      );
    } catch (error) {
      const msg = getBackendErrorMessage(error);
      setBackendError(msg);
      message.error(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Auto-terapkan draft otomatis sekali saat form dibuka dalam mode create,
  // supaya user tidak perlu klik tombol "Sarankan Otomatis" secara manual —
  // tetap bisa diubah manual setelahnya karena hanya mengisi form, bukan submit.
  const autoDraftAppliedRef = useRef(false);
  useEffect(() => {
    if (isCreateMode && riskId && !autoDraftAppliedRef.current) {
      autoDraftAppliedRef.current = true;
      handleApplyAutomaticDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateMode, riskId]);

  const handleBack = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`${LIST_PATH}/${riskId}/mitigation`);
    }
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  const isBlockedEdit = isEditMode && detail && normalizeStatus(detail.status_revisi) !== 'draft';

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ marginBottom: 0 }}>
              {isCreateMode
                ? 'Tambah Rencana Tindak Pengendalian'
                : 'Edit Rencana Tindak Pengendalian'}
            </Title>
            <Text type="secondary">
              Form ini digunakan untuk mencatat kegiatan pengendalian, target output, indikator
              keluaran, penanggung jawab, target waktu, dan perkiraan risiko setelah pengendalian.
            </Text>
          </Space>
        </Col>

        <Col>
          <Space wrap>
            <Button
              icon={<BulbOutlined />}
              onClick={handleApplyAutomaticDraft}
              loading={isPreviewLoading}
              disabled={submitting || isBlockedEdit || isPreviewLoading}
            >
              Isi Otomatis Berdasarkan Risiko
            </Button>

            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Kembali
            </Button>
          </Space>
        </Col>
      </Row>

      {(riskError || detailError || backendError) && (
        <Alert
          type="warning"
          showIcon
          message="Data belum dapat diproses sepenuhnya"
          description={
            backendError || getBackendErrorMessage(riskError) || getBackendErrorMessage(detailError)
          }
        />
      )}

      {isBlockedEdit && (
        <Alert
          type="error"
          showIcon
          message="Rencana Tindak Pengendalian tidak dapat diedit langsung"
          description="Data yang tidak berstatus Draft tidak dapat diedit langsung. Gunakan alur revisi atau persetujuan sesuai ketentuan Manajemen Risiko."
        />
      )}

      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text type="secondary">Kode Risiko</Text>
            <br />
            <Text strong>{safeText(getRiskCode(risk))}</Text>
          </Col>

          <Col xs={24} md={8}>
            <Text type="secondary">Status Risiko</Text>
            <br />
            <Tag color={getStatusColor(risk?.status_revisi)}>
              {getStatusLabel(risk?.status_revisi)}
            </Tag>
          </Col>

          <Col xs={24} md={8}>
            <Text type="secondary">Status Rencana</Text>
            <br />
            <Tag color={getStatusColor(detail?.status_revisi || 'draft')}>
              {getStatusLabel(detail?.status_revisi || 'draft')}
            </Tag>
          </Col>

          <Col span={24}>
            <Text type="secondary">Nama Risiko</Text>
            <br />
            <Text strong>{safeText(getRiskName(risk))}</Text>
          </Col>
        </Row>
      </Card>

      <Card>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Catatan pengisian"
          description="Isi rencana tindak pengendalian berdasarkan rekomendasi analisis risiko dan akar permasalahan. Data ini akan menjadi dasar Lampiran Rencana Tindak Pengendalian pada Laporan Manajemen Risiko."
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={() => setIsDirty(true)}
          disabled={submitting || isBlockedEdit}
          initialValues={{
            status_mitigasi: 'direncanakan',
          }}
        >
          <Form.Item name="risk_analysis_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="root_cause_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="risk_after_mitigation_likelihood_ref_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="risk_after_mitigation_impact_ref_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="uraian_mitigasi" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="jenis_mitigasi" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="requires_spip_rtp" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="progress_persen" hidden>
            <InputNumber />
          </Form.Item>

          <Form.Item name="tindak_lanjut" hidden>
            <TextArea />
          </Form.Item>
          <Divider orientation="left">Rujukan Analisis dan Akar Permasalahan</Divider>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Rujukan Analisis Risiko"
                name="mr_planning_risk_analysis_id"
                tooltip="Diisi jika Rencana Tindak Pengendalian dikaitkan dengan data Analisis Risiko tertentu."
              >
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Contoh: 1" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Rujukan Analisis Akar Permasalahan"
                name="mr_planning_root_cause_id"
                tooltip="Diisi jika Rencana Tindak Pengendalian dikaitkan dengan data Analisis Akar Permasalahan tertentu."
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="Terisi otomatis jika data tersedia"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Rencana Pengendalian</Divider>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Respons Risiko"
                name="respon_risiko_ref_id"
                rules={[
                  {
                    required: true,
                    message: 'Pilih respons risiko.',
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={mitigationResponseSelectOptions}
                  placeholder="Pilih respons risiko"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Output Rencana Tindak Pengendalian"
                name="output_rtp_ref_id"
                rules={[
                  {
                    required: true,
                    message: 'Pilih output Rencana Tindak Pengendalian.',
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={rtpOutputSelectOptions}
                  placeholder="Pilih output Rencana Tindak Pengendalian"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Unsur SPIP" name="unsur_spip_ref_id">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={spipElementSelectOptions}
                  placeholder="Pilih unsur SPIP"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Sub Unsur SPIP" name="sub_unsur_spip_ref_id">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={spipSubElementSelectOptions}
                  placeholder="Pilih sub unsur SPIP"
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                label="Kegiatan Pengendalian"
                name="kegiatan_pengendalian"
                rules={[
                  {
                    required: true,
                    message: 'Isi kegiatan pengendalian.',
                  },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Contoh: Melaksanakan rapat koordinasi, pemutakhiran data, penyusunan matriks tindak lanjut, dan pemantauan progres."
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                label="Target Output"
                name="target_output"
                rules={[
                  {
                    required: true,
                    message: 'Isi target output.',
                  },
                ]}
              >
                <TextArea
                  rows={3}
                  placeholder="Contoh: Notulen rapat, matriks tindak lanjut, data pendukung yang dimutakhirkan, dan laporan pemantauan tersedia."
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Indikator Keluaran" name="indikator_keluaran">
                <TextArea
                  rows={3}
                  placeholder="Contoh: Dokumen rencana aksi tersedia, rapat koordinasi terlaksana, dan laporan pemantauan disusun."
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Target Keluaran" name="target_keluaran">
                <Input placeholder="Contoh: 1 dokumen / 1 laporan / 100%" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Satuan Keluaran" name="satuan_keluaran">
                <Input placeholder="Contoh: Dokumen, Laporan, Kegiatan" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="Target Tanggal" name="target_tanggal">
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                label="Penanggung Jawab"
                name="penanggung_jawab"
                rules={[
                  {
                    required: true,
                    message: 'Isi penanggung jawab.',
                  },
                ]}
              >
                <Input placeholder="Contoh: Dinas Pangan / Sub Bagian Perencanaan / Bidang teknis terkait" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Perkiraan Risiko Setelah Pengendalian</Divider>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Kemungkinan Setelah Pengendalian" name="after_likelihood_ref_id">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={likelihoodSelectOptions}
                  placeholder="Pilih kemungkinan setelah pengendalian"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Dampak Setelah Pengendalian" name="after_impact_ref_id">
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  options={impactSelectOptions}
                  placeholder="Pilih dampak setelah pengendalian"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">Catatan</Divider>

          <Form.Item label="Status Rencana Pengendalian" name="status_mitigasi">
            <Select
              options={[
                { label: 'Direncanakan', value: 'direncanakan' },
                { label: 'Dalam Pelaksanaan', value: 'dalam_pelaksanaan' },
                { label: 'Selesai', value: 'selesai' },
                { label: 'Perlu Perbaikan', value: 'perlu_perbaikan' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Catatan Rencana Pengendalian" name="catatan_mitigasi">
            <TextArea rows={3} placeholder="Tambahkan catatan bila diperlukan." />
          </Form.Item>

          <Form.Item label="Alasan Revisi" name="alasan_revisi">
            <TextArea rows={3} placeholder="Diisi jika data merupakan perbaikan atau revisi." />
          </Form.Item>

          <Space>
            <Button onClick={handleBack}>Batal</Button>

            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              Simpan Draft
            </Button>
          </Space>
        </Form>
      </Card>
    </Space>
  );
}
