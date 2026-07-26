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
  ROOT_CAUSE_CATEGORY: 'rootCauseCategory',
  IMPACT_AREA: 'impactArea',
};

const resolveKategoriPenyebabRefId = (kode, rootCauseCategoryOptions = []) =>
  rootCauseCategoryOptions.find((option) => option.item?.kode_item === kode)?.value;

const resolveDampakAreaRefId = (kode, impactAreaOptions = []) =>
  impactAreaOptions.find((option) => option.item?.kode_item === kode)?.value;

// Kutipan resmi Pedoman No 2 Form Coaching Clinic Inspektorat — ambang per
// level (1-5) per area dampak. HARUS tetap sinkron dengan IMPACT_AREA_CRITERIA
// di backend/services/mr/mrPlanningReportExportWordService.js (Lampiran 7.1B)
// — teks regulasi statis, bukan data yang perlu diedit user, makanya cukup
// disalin sebagai konstanta (bukan fetch API) di kedua sisi.
const IMPACT_AREA_CRITERIA = {
  BEBAN_KEUANGAN: {
    label: 'Beban Keuangan Negara',
    levels: {
      1: '≤ 0,01% dari total anggaran non belanja pegawai',
      2: '> 0,01% – 0,1% dari total anggaran',
      3: '> 0,1% – 1% dari total anggaran',
      4: '> 1% – 5% dari total anggaran',
      5: '> 5% dari total anggaran',
    },
  },
  REPUTASI: {
    label: 'Penurunan Reputasi',
    levels: {
      1: 'Keluhan pemangku kepentingan ≤ 10',
      2: 'Keluhan 10 s.d. 20',
      3: 'Keluhan > 20 / pemberitaan negatif media lokal',
      4: 'Pemberitaan negatif media massa nasional / sosial sesuai fakta',
      5: 'Pemberitaan negatif trending nasional/internasional',
    },
  },
  K3: {
    label: 'Kesehatan dan Keselamatan Kerja',
    levels: {
      1: 'Tidak berbahaya',
      2: 'Gangguan fisik ringan (mampu bekerja hari yang sama)',
      3: 'Gangguan sedang (tidak mampu tugas > 1 hari s.d. 3 minggu)',
      4: 'Gangguan berat / cacat tetap / gangguan jiwa permanen',
      5: 'Kejadian fatal / kematian',
    },
  },
  KINERJA: {
    label: 'Realisasi Capaian Kinerja',
    levels: {
      1: 'Capaian IKU > 97%',
      2: 'Capaian IKU 92% – 97%',
      3: 'Capaian IKU 87% – 92%',
      4: 'Capaian IKU 80% – 87%',
      5: 'Capaian IKU 70% – 80%',
    },
  },
  TEMUAN_PEMERIKSAAN: {
    label: 'Temuan BPK / Inspektorat',
    levels: {
      1: 'Tidak ada temuan pengembalian / penyimpangan material',
      2: 'Temuan / penyimpangan s.d. 0,1% dari total anggaran',
      3: 'Temuan / penyimpangan > 0,1% – 1% dari total anggaran',
      4: 'Temuan / penyimpangan > 1% – 5% dari total anggaran',
      5: 'Temuan / penyimpangan > 5% dari total anggaran',
    },
  },
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

// jenis_sumber (StepContext.jsx) -> proposal_source_type backend (PROPOSAL_SOURCE
// di mrPlanningRiskService.js) untuk ketiga sumber Temuan — BPK/BPKP/Inspektorat
// sama-sama bersumber dari MrPlanningTemuan (lihat getTemuanOptions di
// mrAutoFillAggregatorService.js), jadi cukup satu map dipakai bersama.
const PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER = {
  'Tindak Lanjut BPK': 'TINDAK_LANJUT_BPK',
  'Tindak Lanjut BPKP': 'TINDAK_LANJUT_BPKP',
  'Tindak Lanjut Inspektorat': 'TINDAK_LANJUT_INSPEKTORAT',
};

const composeAkunPos = (contextData) =>
  [contextData?.kode_rekening, contextData?.nama_rekening].filter(Boolean).join(' - ');

const composeRingkasanTemuan = (contextData) =>
  [
    contextData?.uraian_temuan,
    contextData?.kondisi ? `Kondisi: ${contextData.kondisi}.` : null,
    contextData?.sebab ? `Sebab: ${contextData.sebab}.` : null,
    contextData?.akibat ? `Akibat: ${contextData.akibat}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

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

    // Field wajib tambahan per jenis_sumber (lihat getRequiredFieldsByProposalSource
    // di backend/services/mr/mrPlanningRiskService.js) — tanpa ini submit gagal 400
    // MR_VALIDATION_ERROR: Laporan Keuangan wajib akun_pos, BPK/BPKP/Inspektorat
    // wajib nomor_temuan + judul_temuan.
    akun_pos: contextData?.jenis_sumber === 'Laporan Keuangan' ? composeAkunPos(contextData) : undefined,
    nomor_temuan: PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber]
      ? contextData?.nomor_temuan
      : undefined,
    judul_temuan: PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber]
      ? contextData?.judul_temuan
      : undefined,
    ringkasan_temuan: PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber]
      ? composeRingkasanTemuan(contextData)
      : undefined,
    status_tindak_lanjut: PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber]
      ? contextData?.status_rollup
      : undefined,

    // Nilai anggaran/nilai terkait — dipakai kolom "Anggaran" di Lampiran 1D
    // (getDaftarRisiko, mrPlanningReportQueryService.js). Sebelumnya tidak
    // pernah dikirim sama sekali, jadi kolom itu selalu "Belum Tersedia"
    // utk sumber non-Renstra (lihat pagu_tahun_1 di ensureProposalContextItem,
    // mrPlanningRiskService.js). Prioritaskan nilai_sisa_rupiah (eksposur yang
    // genuinely masih belum diselesaikan lewat TindakLanjut/TLHP, dihitung di
    // getTemuanOptions) drpd nilai_temuan_rupiah (nilai kotor) — kalau belum
    // ada setoran sama sekali, nilainya identik dgn nilai_temuan_rupiah.
    nilai_temuan: PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber]
      ? (contextData?.nilai_sisa_rupiah ?? contextData?.nilai_temuan_rupiah)
      : undefined,
    nilai_transaksi:
      contextData?.jenis_sumber === 'Laporan Keuangan' ? contextData?.total_jumlah : undefined,
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

const buildLaporanKeuanganNarrativePreviewPayload = (contextData) =>
  cleanObject({
    proposal_source_type: 'LAPORAN_KEUANGAN',
    akun_pos: composeAkunPos(contextData),
    ringkasan_temuan: contextData?.total_jumlah
      ? `Total realisasi rekening tahun berjalan: Rp ${Number(contextData.total_jumlah).toLocaleString('id-ID')}.`
      : undefined,
    tahun: contextData?.tahun,
    periode_type: contextData?.periode_type,
    periode_label: contextData?.periode_label,
    nama_opd: contextData?.nama_opd,
  });

const buildTemuanNarrativePreviewPayload = (contextData) =>
  cleanObject({
    proposal_source_type: PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber],
    judul_temuan: contextData?.judul_temuan,
    ringkasan_temuan: composeRingkasanTemuan(contextData),
    status_tindak_lanjut: contextData?.status_rollup,
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

  const hasLaporanKeuanganPilihan = Boolean(
    contextData?.jenis_sumber === 'Laporan Keuangan' &&
      (contextData?.kode_rekening || contextData?.nama_rekening),
  );

  const hasTemuanPilihan = Boolean(
    PROPOSAL_SOURCE_TYPE_BY_JENIS_SUMBER[contextData?.jenis_sumber] && contextData?.temuan_id,
  );

  useEffect(() => {
    // Draft narasi dari sasaran+indikator (di bawah) lebih spesifik — jangan
    // biarkan suggestion generik ini menimpanya begitu autoFillData datang
    // belakangan (fetch autoFillData di wizard bersifat async, bisa selesai
    // setelah draft narasi sudah diterapkan).
    if (
      !autoFillData ||
      hasSasaranIndikatorPilihan ||
      hasLakipPilihan ||
      hasLaporanKeuanganPilihan ||
      hasTemuanPilihan
    )
      return;
    form.setFieldsValue({
      nama_risiko: suggestions.namaRisiko,
      objek_risiko: suggestions.objekRisiko,
      uraian_risiko: suggestions.uraianRisiko,
      penyebab_risiko: suggestions.penyebabRisiko,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoFillData,
    hasSasaranIndikatorPilihan,
    hasLakipPilihan,
    hasLaporanKeuanganPilihan,
    hasTemuanPilihan,
  ]);

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
      contextData?.kode_rekening,
      contextData?.temuan_id,
    ],
    queryFn: async () => {
      let payload;
      if (hasLakipPilihan) {
        payload = buildLakipNarrativePreviewPayload(contextData);
      } else if (hasLaporanKeuanganPilihan) {
        payload = buildLaporanKeuanganNarrativePreviewPayload(contextData);
      } else if (hasTemuanPilihan) {
        payload = buildTemuanNarrativePreviewPayload(contextData);
      } else {
        payload = buildNarrativePreviewPayload(contextData);
      }
      const response = await api.post('/mr-planning-risk/proposal-narrative/preview', payload);
      if (!response?.data?.success) {
        throw new Error('Draft narasi belum dapat dibuat. Periksa input utama dan coba kembali.');
      }
      return response.data?.data || {};
    },
    enabled:
      hasSasaranIndikatorPilihan || hasLakipPilihan || hasLaporanKeuanganPilihan || hasTemuanPilihan,
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
      // Analisis Risiko (RiskAnalysis.rekomendasi/analysis_note) — draft LLM
      // sudah menghasilkan field "rekomendasi"/"catatan" ini sejak awal, tapi
      // sebelumnya tidak dipakai sama sekali oleh wizard (hanya 5 field di
      // atas yang diterapkan). Lihat backend/services/mr/mrNarrativeDraftService.js.
      rekomendasi_analisis: narrativePreview.rekomendasi,
      analysis_note: narrativePreview.catatan,
      // Rencana Tindak Lanjut Awal — draft LLM sudah menghasilkan ini sejak
      // awal (bullet list spesifik per sumber risiko), tapi sebelumnya TIDAK
      // ADA form field sama sekali utk menampung & mengirimnya ke backend
      // (MrPlanningRisk.rencana_tindak_lanjut_awal selalu kosong). Akibatnya
      // "Kegiatan Pengendalian" di Lampiran 4C/5B (mrPlanningMitigationDraftPreviewService.js)
      // kehabisan sumber aksi yang genuinely berbeda per risiko dan berujung
      // pola "X atas X dalam konteks X" — lihat fix di file itu.
      rencana_tindak_lanjut_awal: narrativePreview.rencana_tindak_lanjut_awal,
      // Analisis Akar Permasalahan (RCA) metode 5-Why + kategori 6M/4-kategori.
      why_1: narrativePreview.why_1,
      why_2: narrativePreview.why_2,
      why_3: narrativePreview.why_3,
      why_4: narrativePreview.why_4,
      why_5: narrativePreview.why_5,
      kategori_penyebab_ref_id: resolveKategoriPenyebabRefId(
        narrativePreview.kategori_penyebab_kode,
        refOptions.rootCauseCategory,
      ),
      // Area Dampak (Pedoman No 2) — dasar penelusuran kenapa Dampak dinilai
      // level tertentu, lihat mrPlanningRiskAnalysisModel.js dampak_area_ref_id.
      dampak_area_ref_id: resolveDampakAreaRefId(
        narrativePreview.dampak_area_kode,
        refOptions.impactArea,
      ),
    });
    message.success(
      'Draft narasi otomatis diterapkan dari sasaran & indikator terpilih. Review sebelum disimpan.',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrativePreview, refOptions.rootCauseCategory, refOptions.impactArea]);

  const kemungkinanId = Form.useWatch('kemungkinan_ref_id', form);
  const dampakId = Form.useWatch('dampak_ref_id', form);
  const dampakAreaRefId = Form.useWatch('dampak_area_ref_id', form);

  const dampakAreaCriteria = useMemo(() => {
    const areaItem = (refOptions.impactArea || []).find(
      (option) => option.value === dampakAreaRefId,
    )?.item;
    return areaItem ? IMPACT_AREA_CRITERIA[areaItem.kode_item] : null;
  }, [dampakAreaRefId, refOptions.impactArea]);

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
            // Area Dampak (Pedoman No 2) — dasar penelusuran penilaian Dampak,
            // lihat Form.Item "Area Dampak" di atas.
            dampak_area_ref_id: values.dampak_area_ref_id,
            existing_control_status_ref_id: controlEffectivenessRefId,
            control_adequacy_ref_id: controlEffectivenessRefId,
            existing_control_description:
              'Belum ada dokumentasi rinci pengendalian existing; perlu ditinjau dan dilengkapi lebih lanjut oleh pemilik risiko.',
            // Catatan Analisis/Kecukupan Pengendalian/Rekomendasi — diisi
            // otomatis dari draft narasi (lihat useEffect narrativePreview di
            // atas), tetap editable di form sebelum submit. Sebelumnya field
            // ini tidak pernah dikirim sama sekali (laporan selalu "Belum
            // Diisi" di Lampiran 2B/2B1/3A1).
            analysis_note: values.analysis_note,
            control_adequacy_note: values.control_adequacy_note,
            rekomendasi: values.rekomendasi_analisis,
          });
          await api.post(`/mr-planning-risk-analysis/risk/${newRiskId}`, analysisPayload);
        } catch (e) {
          // best-effort, tidak menghalangi alur wizard
        }
        try {
          // why_1..why_5 & kategori_penyebab_ref_id — diisi otomatis dari
          // draft narasi (LLM/rule-based, lihat mrNarrativeDraftService.js),
          // tetap editable di form. Sebelumnya dikirim body kosong sehingga
          // RCA Why 1-5 & "Kode Penyebab 6M" selalu "Belum Diisi"/"Belum
          // Tersedia" di laporan (Lampiran 4A/11.1).
          const rootCausePayload = cleanObject({
            why_1: values.why_1,
            why_2: values.why_2,
            why_3: values.why_3,
            why_4: values.why_4,
            why_5: values.why_5,
            kategori_penyebab_ref_id: values.kategori_penyebab_ref_id,
          });
          await api.post(`/mr-planning-root-cause/risk/${newRiskId}`, rootCausePayload);
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          control_adequacy_note:
            'Pengendalian saat ini dinilai sementara berdasarkan status kecukupan default ("Sebagian Efektif"); perlu ditinjau dan diperkuat mengikuti rencana tindak pengendalian.',
        }}
      >
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
          <Col span={24}>
            <Form.Item
              name="rencana_tindak_lanjut_awal"
              label="Rencana Tindak Lanjut Awal"
              extra="Dasar penyusunan Kegiatan Pengendalian di Mitigasi (Step 3) & Lampiran 4C/5B laporan — isi konkret di sini supaya kegiatan pengendaliannya spesifik, bukan generik."
            >
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
              name="dampak_area_ref_id"
              label="Area Dampak"
              rules={[{ required: true, message: 'Area dampak wajib dipilih.' }]}
              extra="Area dampak dominan sesuai Pedoman No 2 — jadi dasar penelusuran (traceability) penilaian Dampak di bawah."
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={refOptions.impactArea || []}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="dampak_ref_id"
              label="Dampak"
              rules={[{ required: true, message: 'Dampak wajib dipilih.' }]}
              extra={
                dampakAreaCriteria ? (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Kriteria ambang ({dampakAreaCriteria.label}) — Pedoman No 2:
                    </Text>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <li key={level} style={{ fontSize: 12 }}>
                          <Text
                            strong={
                              (refOptions.impact || []).find((o) => o.value === dampakId)?.item
                                ?.nilai_numeric === level
                            }
                          >
                            Level {level}: {dampakAreaCriteria.levels[level]}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  'Pilih Area Dampak terlebih dahulu untuk melihat kriteria ambang per level.'
                )
              }
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

        <Divider />
        <Alert
          type="info"
          showIcon
          message="Analisis Risiko — Catatan & Rekomendasi"
          description="Diisi otomatis dari draft narasi (LLM/rule-based) yang sama dengan bagian atas — tetap wajib direview sebelum disimpan."
          style={{ marginBottom: 16 }}
        />
        <Row gutter={16}>
          <Col md={12} span={24}>
            <Form.Item name="analysis_note" label="Catatan Analisis">
              <TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col md={12} span={24}>
            <Form.Item name="control_adequacy_note" label="Catatan Kecukupan Pengendalian">
              <TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="rekomendasi_analisis" label="Rekomendasi">
              <TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>

        <Divider />
        <Alert
          type="info"
          showIcon
          message="Analisis Akar Permasalahan (RCA) — Metode 5-Why"
          description="why_1 penyebab langsung, why_2 s.d. why_5 menelusuri lebih dalam sampai akar penyebab paling sistemik. Diisi otomatis dari draft narasi — tetap wajib direview."
          style={{ marginBottom: 16 }}
        />
        <Row gutter={16}>
          <Col md={12} span={24}>
            <Form.Item name="kategori_penyebab_ref_id" label="Kategori Akar Penyebab">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Pilih kategori akar penyebab"
                options={refOptions.rootCauseCategory || []}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="why_1" label="Why 1 — Penyebab Langsung">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="why_2" label="Why 2">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="why_3" label="Why 3">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="why_4" label="Why 4">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="why_5" label="Why 5 — Akar Penyebab">
              <TextArea rows={2} />
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
