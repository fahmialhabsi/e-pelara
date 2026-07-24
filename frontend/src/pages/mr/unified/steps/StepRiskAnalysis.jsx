// frontend/src/pages/mr/unified/steps/StepRiskAnalysis.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Divider,
  Button,
  Alert,
  Typography,
  message,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import mrPlanningRiskService from '@/services/mrPlanningRiskService';
import api from '@/services/api';

const { TextArea } = Input;
const { Text } = Typography;

const REFERENCE_GROUPS = {
  LIKELIHOOD: 'likelihood',
  IMPACT: 'impact',
  RISK_CATEGORY: 'category',
  RISK_SOURCE: 'source',
  RISK_APPETITE: 'appetite',
  RISK_STATUS: 'status',
};

const unwrapReferenceItems = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const buildReferenceOptions = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    label: `${item.kode_item} — ${item.nama_item}`,
    value: item.id,
    item,
  }));

const calculateRiskScorePreview = (kemungkinan, dampak) => {
  const k = Number(kemungkinan || 0);
  const d = Number(dampak || 0);
  if (!k || !d) return undefined;
  return k * d;
};

const calculateRiskLevelPreview = (score) => {
  const nilai = Number(score || 0);
  if (!nilai) return undefined;
  if (nilai <= 4) return 'rendah';
  if (nilai <= 9) return 'sedang';
  if (nilai <= 16) return 'tinggi';
  return 'ekstrem';
};

// GUARD: hanya memeriksa node level teratas (Tujuan) pada lpk_suggestion.
// Field child (children/anak/dll) untuk turun ke Sasaran->Program->Kegiatan
// BELUM terkonfirmasi presisi dari investigasi — verifikasi response asli
// sebelum menambah rekursi.
const findFirstLpkIndikator = (nodes) => {
  for (const node of nodes || []) {
    if (Array.isArray(node?.indikator) && node.indikator.length) {
      return node.indikator[0];
    }
  }
  return null;
};

const resolveContentSuggestions = (autoFillData) => {
  if (!autoFillData) {
    return {
      namaRisiko: undefined,
      objekRisiko: undefined,
      uraianRisiko: undefined,
      penyebabRisiko: undefined,
      hasNamaSuggestion: false,
      hasUraianPenyebabSuggestion: false,
    };
  }

  const { context, renstra_suggestion, lakip_suggestion, lpk_suggestion, sumber_data } =
    autoFillData;

  let namaRisiko;
  if (sumber_data?.renstra && renstra_suggestion?.indikators?.length) {
    namaRisiko = renstra_suggestion.indikators[0]?.nama_indikator;
  } else if (sumber_data?.lakip && lakip_suggestion?.length) {
    namaRisiko = lakip_suggestion[0]?.indikator_kinerja;
  } else if (sumber_data?.lpk && Array.isArray(lpk_suggestion)) {
    namaRisiko = findFirstLpkIndikator(lpk_suggestion)?.nama_indikator;
  }

  const objekRisiko = context?.nama_opd || undefined;

  let uraianRisiko;
  let penyebabRisiko;
  if (sumber_data?.lakip && lakip_suggestion?.length) {
    uraianRisiko = lakip_suggestion[0]?.evaluasi || undefined;
    penyebabRisiko = lakip_suggestion[0]?.rekomendasi || undefined;
  }

  return {
    namaRisiko,
    objekRisiko,
    uraianRisiko,
    penyebabRisiko,
    hasNamaSuggestion: Boolean(namaRisiko),
    hasUraianPenyebabSuggestion: Boolean(uraianRisiko || penyebabRisiko),
  };
};

const cleanObject = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

// Root cause Pedoman No 5 (Analisis Risiko) selalu terkunci untuk risiko buatan
// wizard: auto-create Analisis Risiko sebelumnya mengirim body kosong, jadi
// existing_control_status/inherent_score/residual_score selalu null. Fungsi ini
// mengambil item default group CONTROL_EFFECTIVENESS (is_default=true di seeder,
// kode_item 'PARTIAL' — "Sebagian Efektif") supaya existing_control_status_ref_id
// & control_adequacy_ref_id tidak kosong. Best-effort: null jika group gagal dimuat.
const resolveControlEffectivenessDefaultRefId = async () => {
  try {
    const raw = await mrPlanningRiskService.getReferenceItemsByGroup('CONTROL_EFFECTIVENESS');
    const items = unwrapReferenceItems(raw);
    const defaultItem = items.find((item) => item?.is_default) || items[0];
    return defaultItem?.id || null;
  } catch (error) {
    return null;
  }
};

const buildProposalIntakePayload = (values, contextData) =>
  cleanObject({
    proposal_source_type: contextData?.jenis_sumber,
    context_id: contextData?.id,
    context_item_id: contextData?.context_item_id,
    tahun: contextData?.tahun,
    periode_type: contextData?.periode_type,
    periode_label: contextData?.periode_label,
    opd_id: contextData?.opd_id,
    nama_opd: contextData?.nama_opd,

    objek_risiko: values.objek_risiko,
    nama_risiko: values.nama_risiko,
    uraian_risiko: values.uraian_risiko,
    penyebab_risiko: values.penyebab_risiko,
    dampak_risiko: values.dampak_risiko,

    kategori_risiko_ref_id: values.kategori_risiko_ref_id,
    sumber_risiko_ref_id: values.sumber_risiko_ref_id,
    kemungkinan_ref_id: values.kemungkinan_ref_id,
    dampak_ref_id: values.dampak_ref_id,
    selera_risiko_ref_id: values.selera_risiko_ref_id,
    status_risiko_ref_id: values.status_risiko_ref_id,

    rencana_tindak_lanjut_awal: values.rencana_tindak_lanjut_awal,
    pic: values.pic,
    target_waktu: values.target_waktu,
    catatan: values.catatan,
  });

// Payload minimal sesuai instruksi, ditambah beberapa field bisnis opsional dari
// contextData (bukan field teknis/FK) — meniru gaya buildNarrativePreviewPayload
// di MrPlanningRiskForm.jsx (baris 2121-2187), yang juga hanya mengirim field
// bisnis dan membuang field kosong lewat cleanObject.
const buildNarrativePreviewPayload = (contextData) =>
  cleanObject({
    proposal_source_type: 'RENSTRA_SASARAN_INDIKATOR',
    isi_sasaran: contextData?.isi_sasaran,
    nama_indikator: contextData?.nama_indikator,
    satuan: contextData?.satuan,
    target_tahun_1: contextData?.target_tahun_1,
    tahun: contextData?.tahun,
    periode_type: contextData?.periode_type,
    periode_label: contextData?.periode_label,
    nama_opd: contextData?.nama_opd,
  });

const buildLakipNarrativePreviewPayload = (contextData) =>
  cleanObject({
    proposal_source_type: 'LAKIP',
    judul_temuan: [contextData?.program, contextData?.kegiatan].filter(Boolean).join(' - '),
    ringkasan_temuan: [
      contextData?.indikator_kinerja
        ? `Indikator kinerja: ${contextData.indikator_kinerja}.`
        : null,
      contextData?.target ? `Target: ${contextData.target}.` : null,
      contextData?.realisasi ? `Realisasi: ${contextData.realisasi}.` : null,
      contextData?.evaluasi ? `Evaluasi: ${contextData.evaluasi}.` : null,
      contextData?.rekomendasi ? `Rekomendasi: ${contextData.rekomendasi}.` : null,
    ]
      .filter(Boolean)
      .join(' '),
    nama_kegiatan: contextData?.kegiatan,
    tahun: contextData?.tahun,
    periode_type: contextData?.periode_type,
    periode_label: contextData?.periode_label,
    nama_opd: contextData?.nama_opd,
  });
export default function StepRiskAnalysis({ contextData, autoFillData, onStepComplete }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [refOptions, setRefOptions] = useState({});

  useEffect(() => {
    Object.entries(REFERENCE_GROUPS).forEach(([kodeGroup, key]) => {
      mrPlanningRiskService
        .getReferenceItemsByGroup(kodeGroup)
        .then((raw) => {
          setRefOptions((prev) => ({
            ...prev,
            [key]: buildReferenceOptions(unwrapReferenceItems(raw)),
          }));
        })
        .catch(() => {});
    });
  }, []);

  const suggestions = useMemo(() => resolveContentSuggestions(autoFillData), [autoFillData]);

  // Tersedia saat user memilih sasaran+indikator Renstra di dropdown "Pilih
  // Jenis Sumber" pada Step 1 (StepContext.jsx) — field ini ditumpangkan ke
  // contextData lewat onStepComplete di sana.
  const hasSasaranIndikatorPilihan = Boolean(
    contextData?.isi_sasaran && contextData?.nama_indikator,
  );

  const hasLakipPilihan = Boolean(contextData?.jenis_sumber === 'Lakip' && contextData?.lakip_id);

  useEffect(() => {
    // Draft narasi dari sasaran+indikator (di bawah) lebih spesifik — jangan
    // biarkan suggestion generik ini menimpanya begitu autoFillData datang
    // belakangan (fetch autoFillData di wizard bersifat async, bisa selesai
    // setelah draft narasi sudah diterapkan).
    if (!autoFillData || hasSasaranIndikatorPilihan || hasLakipPilihan) return;
    form.setFieldsValue({
      nama_risiko: suggestions.namaRisiko,
      objek_risiko: suggestions.objekRisiko,
      uraian_risiko: suggestions.uraianRisiko,
      penyebab_risiko: suggestions.penyebabRisiko,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFillData, hasSasaranIndikatorPilihan, hasLakipPilihan]);

  // Pola sama dengan handlePreviewNarrativeDraft/handleApplyNarrativeDraft di
  // MrPlanningRiskForm.jsx (baris 2262-2295): POST ke
  // /mr-planning-risk/proposal-narrative/preview lewat instance `api` generik
  // (bukan mrPlanningRiskService — endpoint ini memang tidak dibungkus service
  // di sana juga), lalu hasilnya diisikan ke form. Bedanya di sini otomatis
  // (lewat useQuery, begitu sasaran+indikator tersedia), bukan tombol manual —
  // sesuai kebutuhan wizard auto-fill. Tetap field biasa (editable), bukan disabled.
  const {
    data: narrativePreview,
    isLoading: narrativePreviewLoading,
    isError: narrativePreviewIsError,
    error: narrativePreviewErrorObj,
  } = useQuery({
    queryKey: [
      'mr-wizard',
      'narrative-preview',
      contextData?.isi_sasaran,
      contextData?.nama_indikator,
      contextData?.lakip_id,
    ],
    queryFn: async () => {
      const payload = hasLakipPilihan
        ? buildLakipNarrativePreviewPayload(contextData)
        : buildNarrativePreviewPayload(contextData);
      const response = await api.post('/mr-planning-risk/proposal-narrative/preview', payload);
      if (!response?.data?.success) {
        throw new Error('Draft narasi belum dapat dibuat. Periksa input utama dan coba kembali.');
      }
      return response.data?.data || {};
    },
    enabled: hasSasaranIndikatorPilihan || hasLakipPilihan,
    retry: false,
  });

  useEffect(() => {
    if (!narrativePreview) return;
    form.setFieldsValue({
      nama_risiko: narrativePreview.nama_risiko,
      objek_risiko: narrativePreview.objek_risiko,
      uraian_risiko: narrativePreview.uraian_risiko,
      penyebab_risiko: narrativePreview.penyebab_risiko,
      dampak_risiko: narrativePreview.dampak_risiko,
    });
    message.success(
      'Draft narasi otomatis diterapkan dari sasaran & indikator terpilih. Review sebelum disimpan.',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrativePreview]);

  const kemungkinanId = Form.useWatch('kemungkinan_ref_id', form);
  const dampakId = Form.useWatch('dampak_ref_id', form);

  const skorPreview = useMemo(() => {
    const kItem = (refOptions.likelihood || []).find((o) => o.value === kemungkinanId)?.item;
    const dItem = (refOptions.impact || []).find((o) => o.value === dampakId)?.item;
    return calculateRiskScorePreview(kItem?.nilai_numeric, dItem?.nilai_numeric);
  }, [kemungkinanId, dampakId, refOptions]);

  const levelPreview = calculateRiskLevelPreview(skorPreview);

  const noDataExtra = (
    <Text type="secondary" style={{ fontSize: 11 }}>
      Belum ada data sumber
    </Text>
  );

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = buildProposalIntakePayload(values, contextData);
      const result = await mrPlanningRiskService.createProposalIntake(payload);
      if (!result?.success) {
        throw new Error(result?.message || 'Gagal menyimpan risiko.');
      }
      message.success('Risiko berhasil disimpan.');

      // Buat record RiskAnalysis & RootCause minimal (best-effort) supaya
      // Step 3 (Mitigasi) bisa auto-draft "Rujukan Analisis Risiko" &
      // "Rujukan Analisis Akar Permasalahan" — wizard ini tidak punya step
      // terpisah untuk itu, jadi digenerate otomatis dari risk yang baru dibuat.
      //
      // Analisis Risiko TIDAK boleh dikirim dengan body kosong: Pedoman No 5
      // (backend/services/mr/mrPlanningReportQueryService.js) selalu blocking
      // kalau existing_control_status/inherent_score/residual_score kosong,
      // yang mengunci tombol Download Word/PDF di Laporan MR Planning meski
      // context masih draft. Kemungkinan/Dampak yang sudah dipilih di atas
      // dipakai juga sebagai inherent & residual awal (residual = inherent
      // selama belum ada penilaian pengendalian terpisah, bisa disesuaikan
      // lagi lewat halaman Analisis Risiko).
      const newRiskId = result.data?.id;
      if (newRiskId) {
        try {
          const controlEffectivenessRefId = await resolveControlEffectivenessDefaultRefId();
          const analysisPayload = cleanObject({
            inherent_likelihood_ref_id: values.kemungkinan_ref_id,
            inherent_impact_ref_id: values.dampak_ref_id,
            residual_likelihood_ref_id: values.kemungkinan_ref_id,
            residual_impact_ref_id: values.dampak_ref_id,
            existing_control_status_ref_id: controlEffectivenessRefId,
            control_adequacy_ref_id: controlEffectivenessRefId,
            existing_control_description:
              'Belum ada dokumentasi rinci pengendalian existing; perlu ditinjau dan dilengkapi lebih lanjut oleh pemilik risiko.',
          });
          await api.post(`/mr-planning-risk-analysis/risk/${newRiskId}`, analysisPayload);
        } catch (e) {
          // best-effort, tidak menghalangi alur wizard
        }
        try {
          await api.post(`/mr-planning-root-cause/risk/${newRiskId}`, {});
        } catch (e) {
          // best-effort
        }
      }

      onStepComplete(result.data);
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Gagal menyimpan risiko.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Langkah 2 — Identifikasi Risiko, Analisis, & Akar Penyebab">
      {(hasSasaranIndikatorPilihan || hasLakipPilihan) && narrativePreviewLoading && (
        <Alert
          type="info"
          showIcon
          message="Membuat draft narasi otomatis dari sasaran & indikator terpilih..."
          style={{ marginBottom: 16 }}
        />
      )}
      {narrativePreviewIsError && (
        <Alert
          type="error"
          showIcon
          message="Draft narasi otomatis gagal dibuat"
          description={
            narrativePreviewErrorObj?.response?.data?.message || narrativePreviewErrorObj?.message
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="nama_risiko"
              label="Nama Risiko"
              rules={[{ required: true, message: 'Nama risiko wajib diisi.' }]}
              extra={autoFillData && !suggestions.hasNamaSuggestion ? noDataExtra : undefined}
            >
              <Input placeholder="Nama risiko" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="objek_risiko"
              label="Objek Risiko"
              rules={[{ required: true, message: 'Objek risiko wajib diisi.' }]}
            >
              <Input placeholder="Objek risiko" />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item
              name="uraian_risiko"
              label="Uraian Risiko"
              extra={
                autoFillData && !suggestions.hasUraianPenyebabSuggestion ? noDataExtra : undefined
              }
            >
              <TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item
              name="penyebab_risiko"
              label="Penyebab Risiko (Akar Penyebab)"
              extra={
                autoFillData && !suggestions.hasUraianPenyebabSuggestion ? noDataExtra : undefined
              }
            >
              <TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item name="dampak_risiko" label="Dampak Risiko">
              <TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Row gutter={16}>
          <Col md={6} span={12}>
            <Form.Item
              name="kategori_risiko_ref_id"
              label="Kategori Risiko"
              rules={[{ required: true, message: 'Kategori risiko belum lengkap.' }]}
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.category || []}
              />
            </Form.Item>
          </Col>
          <Col md={6} span={12}>
            <Form.Item
              name="sumber_risiko_ref_id"
              label="Sumber Risiko"
              rules={[{ required: true, message: 'Sumber risiko belum lengkap.' }]}
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.source || []}
              />
            </Form.Item>
          </Col>
          <Col md={6} span={12}>
            <Form.Item name="selera_risiko_ref_id" label="Selera Risiko">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.appetite || []}
              />
            </Form.Item>
          </Col>
          <Col md={6} span={12}>
            <Form.Item name="status_risiko_ref_id" label="Status Risiko">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.status || []}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Alert
          type="info"
          showIcon
          message="Analisis Risiko memakai reference backend"
          description="Skor, level, dan matrix final tetap dihitung backend. Nilai di bawah hanya preview."
          style={{ marginBottom: 16 }}
        />
        <Row gutter={16}>
          <Col md={12} span={24}>
            <Form.Item
              name="kemungkinan_ref_id"
              label="Kemungkinan"
              rules={[{ required: true, message: 'Kemungkinan wajib dipilih.' }]}
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.likelihood || []}
              />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item
              name="dampak_ref_id"
              label="Dampak"
              rules={[{ required: true, message: 'Dampak wajib dipilih.' }]}
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.impact || []}
              />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item label="Skor Risiko (preview)">
              <InputNumber style={{ width: '100%' }} disabled value={skorPreview} />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item label="Level Risiko (preview)">
              <Input disabled value={levelPreview} />
            </Form.Item>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" loading={submitting}>
          Simpan & Lanjut
        </Button>
      </Form>
    </Card>
  );
}
