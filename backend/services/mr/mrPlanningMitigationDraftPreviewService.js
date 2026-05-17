// backend/services/mr/mrPlanningMitigationDraftPreviewService.js

"use strict";

const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../models");

const NARRATIVE_PROVIDER_CONFIG = {
  requested_provider: process.env.MR_NARRATIVE_PROVIDER || "rule_enhanced",
  provider: "rule_enhanced",
  external_provider_enabled:
    String(process.env.MR_NARRATIVE_EXTERNAL_ENABLED || "false") === "true",
  external_provider_allowed:
    String(process.env.MR_NARRATIVE_ALLOW_EXTERNAL || "false") === "true",
  force_review:
    String(process.env.MR_NARRATIVE_FORCE_REVIEW || "true") !== "false",
};

const toIntegerId = (value, label = "ID") => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error(`${label} tidak valid.`);
    error.status = 400;
    error.statusCode = 400;
    error.code = "MR_MITIGATION_DRAFT_PREVIEW_INVALID_ID";
    throw error;
  }

  return id;
};

const cleanText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;

  const text = String(value)
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text || fallback;
};

const safeText = (value, fallback = "Belum tersedia") => {
  return cleanText(value, fallback);
};

const firstFilled = (...values) => {
  return values.find((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  });
};

const normalizeLower = (value) => String(value || "").trim().toLowerCase();

const titleCaseFromSnake = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
    });

const capitalizeFirst = (value = "") => {
  const text = cleanText(value, "");
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const stripEndingPunctuation = (value = "") => {
  return cleanText(value, "").replace(/[.。]+$/g, "").trim();
};

const removeDuplicatedVerbPrefix = (value = "") => {
  const text = cleanText(value, "");

  return text
    .replace(/^melaksanakan\s+melaksanakan\s+/i, "melaksanakan ")
    .replace(/^menyusun\s+menyusun\s+/i, "menyusun ")
    .replace(/^melakukan\s+melakukan\s+/i, "melakukan ")
    .replace(/^menetapkan\s+menetapkan\s+/i, "menetapkan ")
    .trim();
};

const parseJsonSafe = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const toDateOnly = (value) => {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const addDaysToDateOnly = (days = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 30));
  return date.toISOString().slice(0, 10);
};

const isFutureOrToday = (dateText) => {
  const dateOnly = toDateOnly(dateText);
  if (!dateOnly) return false;

  const today = new Date().toISOString().slice(0, 10);
  return dateOnly >= today;
};

const getRiskById = async (riskId) => {
  const rows = await sequelize.query(
    `
    SELECT
      r.*
    FROM mr_planning_risk r
    WHERE r.id = :riskId
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { riskId },
    }
  );

  return rows[0] || null;
};

const getLatestAnalysisByRiskId = async (riskId) => {
  const preferredRows = await sequelize.query(
    `
    SELECT
      a.*
    FROM mr_planning_risk_analysis a
    WHERE a.mr_planning_risk_id = :riskId
      AND COALESCE(a.is_active, 1) = 1
      AND COALESCE(a.is_latest, 1) = 1
    ORDER BY a.id DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { riskId },
    }
  );

  if (preferredRows[0]) {
    return preferredRows[0];
  }

  const fallbackRows = await sequelize.query(
    `
    SELECT
      a.*
    FROM mr_planning_risk_analysis a
    WHERE a.mr_planning_risk_id = :riskId
    ORDER BY
      COALESCE(a.is_latest, 0) DESC,
      COALESCE(a.updated_at, a.created_at, a.id) DESC,
      a.id DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { riskId },
    }
  );

  return fallbackRows[0] || null;
};

const getContextItemByRisk = async (risk = {}) => {
  if (!risk?.context_id) return null;

  const preferredRows = await sequelize.query(
    `
    SELECT
      ci.*
    FROM mr_planning_context_item ci
    WHERE ci.mr_planning_context_id = :contextId
      AND COALESCE(ci.is_active, 1) = 1
      AND (
        (:stage IS NOT NULL AND ci.stage = :stage)
        OR (:refId IS NOT NULL AND ci.ref_id = :refId)
        OR (:sourceTable IS NOT NULL AND ci.source_table = :sourceTable)
      )
    ORDER BY
      CASE
        WHEN ci.stage = :stage AND ci.ref_id = :refId THEN 0
        WHEN ci.ref_id = :refId THEN 1
        ELSE 2
      END ASC,
      ci.id DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        contextId: risk.context_id || null,
        stage: risk.stage || null,
        refId: risk.ref_id || null,
        sourceTable: risk.source_table || null,
      },
    }
  );

  if (preferredRows[0]) {
    return preferredRows[0];
  }

  const fallbackRows = await sequelize.query(
    `
    SELECT
      ci.*
    FROM mr_planning_context_item ci
    WHERE ci.mr_planning_context_id = :contextId
      AND COALESCE(ci.is_active, 1) = 1
    ORDER BY
      COALESCE(ci.is_primary, 0) DESC,
      ci.urutan ASC,
      ci.id DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        contextId: risk.context_id || null,
      },
    }
  );

  return fallbackRows[0] || null;
};

const getLatestRootCauseByRiskId = async (riskId) => {
  const preferredRows = await sequelize.query(
    `
    SELECT
      rc.*
    FROM mr_planning_root_cause rc
    WHERE rc.mr_planning_risk_id = :riskId
      AND COALESCE(rc.is_active, 1) = 1
      AND COALESCE(rc.is_latest, 1) = 1
    ORDER BY
      COALESCE(rc.is_primary, 0) DESC,
      COALESCE(rc.prioritas_penyebab, 999999) ASC,
      rc.id DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { riskId },
    }
  );

  if (preferredRows[0]) {
    return preferredRows[0];
  }

  const fallbackRows = await sequelize.query(
    `
    SELECT
      rc.*
    FROM mr_planning_root_cause rc
    WHERE rc.mr_planning_risk_id = :riskId
    ORDER BY
      COALESCE(rc.is_primary, 0) DESC,
      COALESCE(rc.is_latest, 0) DESC,
      COALESCE(rc.prioritas_penyebab, 999999) ASC,
      COALESCE(rc.updated_at, rc.created_at, rc.id) DESC,
      rc.id DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { riskId },
    }
  );

  return fallbackRows[0] || null;
};

const getReferenceItemByKeywords = async (groupCode, keywords = []) => {
  const normalizedKeywords = keywords
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  if (!normalizedKeywords.length) return null;

  const rows = await sequelize.query(
    `
    SELECT
      i.id,
      i.kode_item,
      i.nama_item,
      i.nilai_numeric,
      i.nilai_text,
      i.urutan
    FROM mr_reference_items i
    JOIN mr_reference_groups g
      ON g.id = i.group_id
    WHERE g.kode_group = :groupCode
      AND COALESCE(i.is_active, 1) = 1
    ORDER BY i.urutan ASC, i.id ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { groupCode },
    }
  );

  return (
    rows.find((row) => {
      const haystack = [
        row.kode_item,
        row.nama_item,
        row.nilai_text,
        row.nilai_numeric,
      ]
        .filter((item) => item !== undefined && item !== null)
        .join(" ")
        .toLowerCase();

      return normalizedKeywords.some((keyword) => haystack.includes(keyword));
    }) || null
  );
};

const getReferenceItemByNumericValue = async (groupCode, numericValue) => {
  if (!numericValue) return null;

  const rows = await sequelize.query(
    `
    SELECT
      i.id,
      i.kode_item,
      i.nama_item,
      i.nilai_numeric,
      i.nilai_text,
      i.urutan
    FROM mr_reference_items i
    JOIN mr_reference_groups g
      ON g.id = i.group_id
    WHERE g.kode_group = :groupCode
      AND COALESCE(i.is_active, 1) = 1
    ORDER BY i.urutan ASC, i.id ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { groupCode },
    }
  );

  return (
    rows.find((row) => Number(row.nilai_numeric) === Number(numericValue)) ||
    rows.find((row) =>
      String(row.kode_item || "").includes(String(numericValue))
    ) ||
    null
  );
};

const getRiskObjectLabel = (risk = {}) =>
  safeText(
    firstFilled(
      risk.objek_risiko,
      risk.nama_indikator,
      risk.nama_konteks_laporan,
      risk.nama_konteks,
      risk.judul_temuan,
      risk.nama_kegiatan,
      risk.nama_risiko
    ),
    "objek risiko"
  );

const getRiskSourceLabel = (risk = {}) => {
  const source = String(risk.proposal_source_type || "").toUpperCase();
  const stage = normalizeLower(risk.stage || risk.source_table);

  if (source.includes("BPK") || stage.includes("bpk")) {
    return "tindak lanjut hasil pemeriksaan BPK";
  }

  if (source.includes("INSPEKTORAT") || stage.includes("inspektorat")) {
    return "tindak lanjut hasil pengawasan Inspektorat";
  }

  if (stage.includes("pelaksanaan_kegiatan")) {
    return "pelaksanaan kegiatan";
  }

  if (stage.includes("pertanggungjawaban_keuangan")) {
    return "pertanggungjawaban keuangan";
  }

  if (
    [
      "tujuan",
      "sasaran",
      "strategi",
      "kebijakan",
      "arah_kebijakan",
      "program",
      "kegiatan",
      "sub_kegiatan",
      "subkegiatan",
    ].includes(stage)
  ) {
    return "capaian indikator perencanaan";
  }

  if (stage) return titleCaseFromSnake(stage).toLowerCase();

  return "pengelolaan risiko perangkat daerah";
};

const resolveTargetTanggal = ({ risk = {}, contextItem = null } = {}) => {
  const metadata = parseJsonSafe(contextItem?.metadata_json);

  const candidates = [
    risk.target_tanggal,
    risk.target_waktu,
    risk.target_pelaksanaan,
    risk.tanggal_selesai,
    metadata.target_waktu,
    metadata.target_pelaksanaan,
    metadata.target_tanggal,
    metadata.tanggal_selesai,
  ];

  const futureCandidate = candidates
    .map((item) => toDateOnly(item))
    .find((item) => item && isFutureOrToday(item));

  if (futureCandidate) {
    return futureCandidate;
  }

  /*
   * Guard:
   * Jika target dari sumber data tidak ada atau sudah lewat,
   * sistem memberi target awal rasional 30 hari kalender dari tanggal draft.
   * User tetap wajib review dan dapat menyesuaikan sebelum menyimpan.
   */
  return addDaysToDateOnly(30);
};

const buildRiskTextBundle = ({ risk = {}, analysis = {}, rootCause = {} }) =>
  [
    risk.nama_risiko,
    risk.uraian_risiko,
    risk.penyebab_risiko,
    risk.dampak_risiko,
    risk.rekomendasi,
    risk.rencana_tindak_lanjut_awal,
    risk.metode_pencapaian_tujuan_spip,

    analysis.uraian_existing_control,
    analysis.existing_control_description,
    analysis.control_adequacy_note,
    analysis.catatan_analisis,
    analysis.analysis_note,
    analysis.rekomendasi,

    rootCause.uraian_penyebab,
    rootCause.akar_penyebab,
    rootCause.rekomendasi_pengendalian,
    rootCause.why_1,
    rootCause.why_2,
    rootCause.why_3,
    rootCause.why_4,
    rootCause.why_5,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

const buildActionParts = (textBundle) => {
  const parts = [];

  const add = (condition, text) => {
    if (condition && !parts.includes(text)) parts.push(text);
  };

  add(
    textBundle.includes("koordinasi") ||
      textBundle.includes("lintas") ||
      textBundle.includes("pelaksana") ||
      textBundle.includes("stakeholder") ||
      textBundle.includes("unit terkait") ||
      textBundle.includes("bidang terkait"),
    "melaksanakan koordinasi berkala dengan unit/bidang terkait"
  );

  add(
    textBundle.includes("dokumen") ||
      textBundle.includes("bukti") ||
      textBundle.includes("administrasi") ||
      textBundle.includes("pertanggungjawaban") ||
      textBundle.includes("spj") ||
      textBundle.includes("audit") ||
      textBundle.includes("pemeriksaan") ||
      textBundle.includes("pengawasan"),
    "menyusun daftar kendali dokumen dan melengkapi bukti pendukung tindak lanjut"
  );

  add(
    textBundle.includes("monitoring") ||
      textBundle.includes("pemantauan") ||
      textBundle.includes("progres") ||
      textBundle.includes("tindak lanjut"),
    "melakukan pemantauan progres penyelesaian secara berkala"
  );

  add(
    textBundle.includes("data") ||
      textBundle.includes("pemutakhiran") ||
      textBundle.includes("indikator") ||
      textBundle.includes("capaian"),
    "memutakhirkan data pendukung dan melakukan verifikasi capaian secara berkala"
  );

  add(
    textBundle.includes("pengadaan") ||
      textBundle.includes("belanja") ||
      textBundle.includes("kontrak") ||
      textBundle.includes("barang") ||
      textBundle.includes("jasa"),
    "memperkuat pengendalian pelaksanaan pengadaan barang/jasa dan dokumentasi pertanggungjawaban"
  );

  add(
    textBundle.includes("distribusi pangan") ||
      textBundle.includes("lembaga distribusi") ||
      textBundle.includes("cadangan pangan") ||
      textBundle.includes("ketersediaan pangan"),
    "memperbarui data pendukung sektor pangan dan menyusun rencana tindak lanjut berbasis kebutuhan prioritas"
  );

  if (!parts.length) {
    parts.push(
      "menyusun rencana aksi pengendalian yang terukur",
      "menetapkan penanggung jawab, target keluaran, bukti pendukung, dan mekanisme pemantauan",
      "melakukan pemantauan progres secara berkala"
    );
  }

  return parts;
};

const getCurrentLikelihoodValue = (risk = {}, analysis = {}) =>
  Number(
    firstFilled(
      analysis.residual_likelihood,
      analysis.kemungkinan_residu,
      risk.kemungkinan,
      risk.likelihood_score,
      risk.kemungkinan_nilai
    ) || 0
  );

const getCurrentImpactValue = (risk = {}, analysis = {}) =>
  Number(
    firstFilled(
      analysis.residual_impact,
      analysis.dampak_residu,
      risk.dampak,
      risk.impact_score,
      risk.dampak_nilai
    ) || 0
  );

const buildProviderMeta = () => ({
  provider: NARRATIVE_PROVIDER_CONFIG.provider,
  requested_provider: NARRATIVE_PROVIDER_CONFIG.requested_provider,
  fallback_used:
    NARRATIVE_PROVIDER_CONFIG.requested_provider !==
    NARRATIVE_PROVIDER_CONFIG.provider,
  external_provider_enabled: NARRATIVE_PROVIDER_CONFIG.external_provider_enabled,
  external_provider_requested:
    !["mock", "rule_enhanced"].includes(
      String(NARRATIVE_PROVIDER_CONFIG.requested_provider || "").toLowerCase()
    ),
  needs_user_review: NARRATIVE_PROVIDER_CONFIG.force_review,
  force_review: NARRATIVE_PROVIDER_CONFIG.force_review,
});

const buildCatatanMitigasi = ({
  hasRiskAnalysis,
  hasRootCause,
  hasCompleteAnalysisRootCause,
} = {}) => {
  if (hasCompleteAnalysisRootCause) {
    return "Draft awal disusun berdasarkan informasi risiko, analisis risiko, akar permasalahan, dan kebutuhan tindak lanjut. Pemilik Risiko wajib meninjau dan menyesuaikan sebelum disimpan sebagai rencana resmi.";
  }

  if (!hasRiskAnalysis && !hasRootCause) {
    return "Draft awal disusun berdasarkan informasi risiko yang tersedia. Analisis Risiko dan Analisis Akar Permasalahan belum tersedia, sehingga Pemilik Risiko wajib melengkapi atau menyesuaikan rencana sebelum disimpan sebagai rencana resmi.";
  }

  if (!hasRiskAnalysis) {
    return "Draft awal disusun berdasarkan informasi risiko dan Analisis Akar Permasalahan yang tersedia. Analisis Risiko belum tersedia, sehingga Pemilik Risiko wajib melengkapi atau menyesuaikan rencana sebelum disimpan sebagai rencana resmi.";
  }

  return "Draft awal disusun berdasarkan informasi risiko dan Analisis Risiko yang tersedia. Analisis Akar Permasalahan belum tersedia, sehingga Pemilik Risiko wajib melengkapi atau menyesuaikan rencana sebelum disimpan sebagai rencana resmi.";
};

const buildAlasanRevisi = ({ hasCompleteAnalysisRootCause } = {}) => {
  if (hasCompleteAnalysisRootCause) {
    return "Penyusunan awal Rencana Tindak Pengendalian berdasarkan hasil identifikasi, analisis, dan akar permasalahan risiko.";
  }

  return "Penyusunan awal Rencana Tindak Pengendalian berdasarkan informasi risiko yang tersedia dan masih memerlukan pelengkapan Analisis Risiko serta Analisis Akar Permasalahan.";
};

const buildContextFallbackDraft = ({ risk = {}, contextItem = null } = {}) => {
  const metadata = {
    ...parseJsonSafe(risk.metadata_json),
    ...parseJsonSafe(contextItem?.metadata_json),
  };

  const contextLabel = safeText(
    firstFilled(
      contextItem?.nama_konteks_laporan,
      contextItem?.nama_konteks,
      metadata.nama_konteks_laporan,
      metadata.nama_konteks,
      risk.nama_konteks_laporan,
      risk.nama_konteks,
    ),
    "konteks risiko",
  );

  const objectLabel = safeText(
    firstFilled(
      risk.objek_risiko,
      contextItem?.indikator_atau_objek_risiko,
      contextItem?.nama_indikator,
      metadata.objek_risiko,
      metadata.indikator_atau_objek_risiko,
      risk.nama_indikator,
      risk.nama_risiko,
    ),
    "objek risiko",
  );

  const actionLabel = safeText(
    firstFilled(
      metadata.kegiatan_pengendalian,
      metadata.target_output,
      metadata.indikator_keluaran,
      contextItem?.nama_indikator,
      contextItem?.kode_indikator,
      risk.rekomendasi,
      risk.rencana_tindak_lanjut_awal,
      risk.nama_risiko,
    ),
    "menyusun rencana tindak pengendalian",
  );

  const responseLabel = safeText(
    firstFilled(
      metadata.rekomendasi,
      metadata.rencana_tindak_lanjut_awal,
      risk.rekomendasi,
      risk.rencana_tindak_lanjut_awal,
    ),
    "melakukan pengendalian dan tindak lanjut",
  );

  const penanggungJawab = safeText(
    firstFilled(
      contextItem?.penanggung_jawab,
      metadata.pic,
      metadata.penanggung_jawab,
      risk.penanggung_jawab,
      risk.pic,
      risk.unit_terkait,
      risk.nama_opd,
      risk.owner_name,
      risk.owner_user_name,
    ),
    "Pemilik Risiko / Unit terkait",
  );

  const targetOutput = safeText(
    firstFilled(
      metadata.target_output,
      metadata.indikator_keluaran,
      metadata.rencana_tindak_lanjut_awal,
    ),
    "Dokumen rencana aksi dan bukti tindak lanjut",
  );

  const indikatorKeluaran = safeText(
    firstFilled(
      metadata.indikator_keluaran,
      metadata.target_output,
      contextItem?.kode_indikator,
      contextItem?.nama_indikator,
    ),
    "Tersedia indikator keluaran yang dapat dipantau",
  );

  const kegiatanPengendalian = `${capitalizeFirst(
    removeDuplicatedVerbPrefix(actionLabel),
  )} atas ${stripEndingPunctuation(objectLabel)} dalam konteks ${contextLabel}.`;

  const catatanMitigasi = cleanText(
    firstFilled(
      metadata.rekomendasi,
      metadata.rencana_tindak_lanjut_awal,
      risk.rekomendasi,
      risk.rencana_tindak_lanjut_awal,
    ),
    "",
  );

  const alasanRevisi = safeText(
    firstFilled(
      metadata.alasan_revisi,
      metadata.catatan_revisi,
      risk.alasan_revisi,
    ),
    "Penyusunan awal rencana tindak pengendalian memerlukan pelengkapan data analisis dan akar permasalahan.",
  );

  const targetTanggal = resolveTargetTanggal({
    risk: {
      ...risk,
      target_tanggal:
        firstFilled(
          metadata.target_tanggal,
          metadata.target_waktu,
          metadata.target_pelaksanaan,
          risk.target_tanggal,
          risk.target_waktu,
          risk.target_pelaksanaan,
        ) || null,
    },
    contextItem,
  });

  return {
    kegiatanPengendalian,
    targetOutput,
    indikatorKeluaran,
    penanggungJawab,
    targetTanggal,
    catatanMitigasi: catatanMitigasi || buildCatatanMitigasi({}),
    alasanRevisi,
  };
};

const buildDraftPreview = async (riskId, options = {}) => {
  const id = toIntegerId(riskId, "ID Risiko");

  const risk = await getRiskById(id);

  const [analysis, rootCause, contextItem] = await Promise.all([
    getLatestAnalysisByRiskId(id),
    getLatestRootCauseByRiskId(id),
    getContextItemByRisk(risk),
  ]);

  if (!risk) {
    const error = new Error("Data risiko tidak ditemukan.");
    error.status = 404;
    error.statusCode = 404;
    error.code = "MR_MITIGATION_DRAFT_PREVIEW_RISK_NOT_FOUND";
    throw error;
  }

  const safeAnalysis = analysis || {};
  const safeRootCause = rootCause || {};

  const hasRiskAnalysis = Boolean(safeAnalysis.id);
  const hasRootCause = Boolean(safeRootCause.id);
  const hasCompleteAnalysisRootCause = hasRiskAnalysis && hasRootCause;

  const riskObjectLabel = getRiskObjectLabel(risk);
  const riskSourceLabel = getRiskSourceLabel(risk);
  const contextFallbackDraft = buildContextFallbackDraft({ risk, contextItem });

  const textBundle = buildRiskTextBundle({
    risk,
    analysis: safeAnalysis,
    rootCause: safeRootCause,
  });

  const actionParts = buildActionParts(textBundle);

  const [responseRef, spipElementRef, spipSubElementRef, outputRef] =
    await Promise.all([
      getReferenceItemByKeywords("MITIGATION_RESPONSE", [
        "mengurangi",
        "mitigasi",
        "reduce",
      ]),
      getReferenceItemByKeywords("SPIP_ELEMENT", [
        "kegiatan pengendalian",
        "pengendalian",
      ]),
      getReferenceItemByKeywords("SPIP_SUB_ELEMENT", [
        "pengendalian umum",
        "umum",
        "monitoring",
        "dokumen",
      ]),
      getReferenceItemByKeywords("RTP_OUTPUT", [
        "rencana aksi",
        "dokumen",
        "rtp",
        "output",
      ]),
    ]);

  const currentLikelihood = getCurrentLikelihoodValue(risk, safeAnalysis);
  const currentImpact = getCurrentImpactValue(risk, safeAnalysis);

  const afterLikelihoodNumeric =
    currentLikelihood && currentLikelihood > 1
      ? currentLikelihood - 1
      : currentLikelihood || null;

  const afterImpactNumeric =
    currentImpact && currentImpact > 1
      ? currentImpact - 1
      : currentImpact || null;

  const [afterLikelihoodRef, afterImpactRef] = await Promise.all([
    getReferenceItemByNumericValue("LIKELIHOOD", afterLikelihoodNumeric),
    getReferenceItemByNumericValue("IMPACT", afterImpactNumeric),
  ]);

  const actionSentence = removeDuplicatedVerbPrefix(actionParts.join(", "));

  const kegiatanPengendalian = `${capitalizeFirst(
    actionSentence
  )} atas ${stripEndingPunctuation(
    riskObjectLabel
  )} dalam konteks ${riskSourceLabel}.`;

  const targetOutput =
    "Tersedianya rencana aksi, daftar kendali tindak lanjut, bukti pendukung, dokumentasi pelaksanaan, dan laporan pemantauan progres pengendalian risiko.";

  const indikatorKeluaran =
    "Rencana aksi ditetapkan, penanggung jawab ditunjuk, bukti pendukung terdokumentasi, dan progres tindak lanjut dipantau secara berkala.";

  const penanggungJawab = contextFallbackDraft.penanggungJawab;

  /*
   * Guard:
   * target_tanggal diutamakan dari data sumber risiko/context item.
   * Jika tidak tersedia atau sudah lewat, sistem memberi target awal rasional
   * 30 hari kalender dari tanggal penyusunan draft.
   * User tetap wajib review sebelum menyimpan.
   */
  const targetTanggal = contextFallbackDraft.targetTanggal;

  const previewSource = hasCompleteAnalysisRootCause
    ? "risk_analysis_root_cause"
    : "risk_only";

  const catatanMitigasi = buildCatatanMitigasi({
    hasRiskAnalysis,
    hasRootCause,
    hasCompleteAnalysisRootCause,
  }) || contextFallbackDraft.catatanMitigasi;

  const alasanRevisi = buildAlasanRevisi({
    hasCompleteAnalysisRootCause,
  }) || contextFallbackDraft.alasanRevisi;

  const fallbackAnalysisId =
    safeAnalysis.id ||
    contextItem?.metadata_json?.mr_planning_risk_analysis_id ||
    contextItem?.metadata_json?.analysis_id ||
    risk.mr_planning_risk_analysis_id ||
    null;

  const fallbackRootCauseId =
    safeRootCause.id ||
    contextItem?.metadata_json?.mr_planning_root_cause_id ||
    contextItem?.metadata_json?.root_cause_id ||
    risk.mr_planning_root_cause_id ||
    null;

  return {
    mr_planning_risk_analysis_id: fallbackAnalysisId,
    mr_planning_root_cause_id: fallbackRootCauseId,

    respon_risiko_ref_id: responseRef?.id || null,
    unsur_spip_ref_id: spipElementRef?.id || null,
    sub_unsur_spip_ref_id: spipSubElementRef?.id || null,
    output_rtp_ref_id: outputRef?.id || null,

    kegiatan_pengendalian: contextFallbackDraft.kegiatanPengendalian || kegiatanPengendalian,
    target_output: contextFallbackDraft.targetOutput || targetOutput,
    indikator_keluaran: contextFallbackDraft.indikatorKeluaran || indikatorKeluaran,
    target_keluaran: "1 paket tindak lanjut",
    satuan_keluaran: "Dokumen",
    penanggung_jawab: penanggungJawab,
    target_tanggal: targetTanggal,
    target_waktu: targetTanggal,

    after_likelihood_ref_id: afterLikelihoodRef?.id || null,
    after_impact_ref_id: afterImpactRef?.id || null,

    status_mitigasi: "direncanakan",
    catatan_mitigasi: catatanMitigasi,
    alasan_revisi: alasanRevisi,

    meta: {
      ...buildProviderMeta(),
      source: previewSource,
      has_risk_analysis: hasRiskAnalysis,
      has_root_cause: hasRootCause,
      requires_analysis_completion: !hasRiskAnalysis,
      requires_root_cause_completion: !hasRootCause,
      requires_follow_up_review: true,
      preview_only: true,
      saved: false,
      generated_at: new Date().toISOString(),
    },
  };
};

module.exports = {
  buildDraftPreview,
};
