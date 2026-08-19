"use strict";

/**
 * MR Planning Monitoring Service
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 14E
 *
 * Guard:
 * - Monitoring melekat pada MR Planning Risk.
 * - Monitoring bisa melekat pada Mitigation jika mr_planning_mitigation_id dikirim.
 * - context_id diturunkan dari risk.
 * - tahun diturunkan dari risk/context jika tersedia.
 * - owner_user_id dan owner_division_id diturunkan dari risk/mitigation/context.
 * - Field teknis/calculated/workflow/audit tidak boleh dikirim frontend.
 * - Actual risk dihitung backend dari actual_likelihood_ref_id dan actual_impact_ref_id.
 * - actual_level_ref_id, actual_level, actual_score, actual_color, appetite dihitung backend.
 * - jenis_penyebab_ref_id divalidasi ke ROOT_CAUSE_CATEGORY jika dikirim.
 * - efektivitas_pengendalian_ref_id divalidasi ke CONTROL_EFFECTIVENESS jika dikirim.
 * - status_realisasi_ref_id untuk STEP 14E belum dipakai dulu karena group reference belum final.
 * - Update hanya boleh saat status_revisi = draft.
 */

const {
  sequelize,
  MrPlanningRisk,
  MrPlanningContext,
  MrPlanningMitigation,
  MrPlanningMonitoring,
  MrPlanningMonitoringHistory,
  MrPlanningRiskAnalysis,
  MrReferenceItem,
  MrReferenceGroup,
  MrRiskMatrix,
} = require("../../models");

// A09-F01 / A10-F01 corrective (Operational UAT Module A): lihat komentar
// setara di mrPlanningMitigationService.js — mrPlanningMonitoringHistoryModel.js
// dan mrHistoryHelper.js (HISTORY_FOREIGN_KEYS.monitoring) sudah menyediakan
// infrastruktur ini sejak awal; mrApprovalService dipakai apa adanya.
const mrApprovalService = require("./mrApprovalService");
const mrHistoryService = require("./mrHistoryService");
const {
  buildHistoryPayload,
  createHistory,
} = require("../../helpers/mr/mrHistoryHelper");

const MONITORING_HISTORY_FK = "mr_planning_monitoring_id";

// Sprint 12 -- MR Approval Engine Shared OPD Boundary Hardening: mrApprovalService's
// shared boundary check reads activeRecord.opd_id, a field MrPlanningMonitoring does
// not have -- making that check silently ineffective for this model (it always
// resolves targetOpdId to null and short-circuits to ok:true). Per CEA decision, do
// NOT modify mrApprovalService.js. Instead resolve the owning Risk's opd_id and
// authorize HERE, in isolation, BEFORE delegating to the unmodified shared approval
// engine. On DENY, mrApprovalService.verifikasiHistory is never invoked -- zero
// mutation. Pattern mirrors Sprint 9 S9-07 (mrPlanningTindakLanjutService.js) and
// Sprint 12's Mitigation fix (mrPlanningMitigationService.js).
const {
  resolveMrPlanningRiskOpdBoundary,
  throwMrPlanningRiskOpdBoundaryError,
} = require("./mrPlanningRiskService");

const MATRIX_CODE = "MR_5X5_DEFAULT";

const ERROR_CODE = "MR_MONITORING_VALIDATION_ERROR";

const MONITORING_ALLOWED_FIELDS = Object.freeze([
  "mr_planning_mitigation_id",

  "periode_type",
  "periode_label",
  "periode_awal",
  "periode_akhir",
  "monitoring_date",

  "target_waktu",
  "realisasi_waktu",

  "status_monitoring",
  "hasil_monitoring",
  "kendala",
  "tindak_lanjut",
  "catatan_monitoring",
  "monitoring_cycle",
  "rekomendasi",

  "realisasi_mitigasi",
  "output_realisasi",
  "persentase_realisasi",
  "hambatan",
  "progress_persen",

  "terjadi_risiko",
  "tanggal_kejadian",
  "tempat_kejadian",
  "uraian_kejadian",
  "uraian_peristiwa",
  "pemicu_kejadian",
  "dampak_kejadian",
  "dampak_aktual",
  "skor_dampak_aktual",
  "kode_penyebab_kejadian",
  "jenis_penyebab_ref_id",
  "tindak_lanjut_kejadian",

  "actual_likelihood_ref_id",
  "actual_impact_ref_id",

  "hasil_pengendalian",
  "efektivitas_pengendalian_ref_id",
  "perubahan_level_risiko",
  "rekomendasi_evaluasi",
  "komentar_pemilik_risiko",
  "tanggal_evaluasi",

  "alasan_revisi",
]);

const MONITORING_BLOCKED_FIELDS = Object.freeze([
  "id",
  "mr_planning_risk_id",
  "context_id",
  "tahun",

  "status_realisasi_ref_id",
  "status_realisasi",

  "actual_likelihood",
  "actual_impact",
  "actual_score",
  "actual_level_ref_id",
  "actual_level",
  "actual_color",
  "level_change",
  "risk_trend",
  "is_above_appetite_actual",

  "owner_user_id",
  "owner_division_id",
  "monitoring_by",
  "evaluator_user_id",

  "versi",
  "status_revisi",
  "last_revised_at",
  "last_revised_by",

  "dibuat_oleh",
  "diverifikasi_oleh",
  "disetujui_oleh",
  "ditolak_oleh",
  "dibuat_pada",
  "diverifikasi_pada",
  "disetujui_pada",
  "ditolak_pada",

  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

const VALID_PERIODE_TYPES = Object.freeze([
  "bulanan",
  "triwulan",
  "semester",
  "tahunan",
  "adhoc",
]);

const createValidationError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const createNotFoundError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const toPlain = (record) => {
  if (!record) return null;
  if (typeof record.get === "function") return record.get({ plain: true });
  return record;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (Number(value) === 1) return true;
  if (Number(value) === 0) return false;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return defaultValue;
};

const normalizeDecimal = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw createValidationError("Nilai numerik tidak valid.", {
      value,
    });
  }

  return parsed;
};

const assertAllowedFields = (body = {}) => {
  const fields = Object.keys(body || {});

  const blocked = fields.filter((field) =>
    MONITORING_BLOCKED_FIELDS.includes(field)
  );

  const unknown = fields.filter(
    (field) =>
      !MONITORING_ALLOWED_FIELDS.includes(field) &&
      !MONITORING_BLOCKED_FIELDS.includes(field)
  );

  if (blocked.length > 0) {
    throw createValidationError("Field tidak diperbolehkan.", {
      fields: blocked,
    });
  }

  if (unknown.length > 0) {
    throw createValidationError("Field tidak dikenal.", {
      fields: unknown,
    });
  }
};

const pickAllowedFields = (body = {}) => {
  return MONITORING_ALLOWED_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }

    return payload;
  }, {});
};

const requireBusinessFieldsForCreate = (payload = {}) => {
  const missing = [];

  if (!payload.periode_type) missing.push("periode_type");
  if (!payload.periode_label) missing.push("periode_label");

  if (missing.length > 0) {
    throw createValidationError("Field wajib belum lengkap.", {
      fields: missing,
    });
  }

  if (!VALID_PERIODE_TYPES.includes(payload.periode_type)) {
    throw createValidationError("periode_type tidak valid.", {
      periode_type: payload.periode_type,
      allowed: VALID_PERIODE_TYPES,
    });
  }
};

const normalizeMonitoringPayload = (payload = {}) => {
  const normalized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(normalized, "terjadi_risiko")) {
    normalized.terjadi_risiko = normalizeBoolean(normalized.terjadi_risiko, false);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "progress_persen")) {
    normalized.progress_persen = normalizeDecimal(normalized.progress_persen, 0);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "persentase_realisasi")) {
    normalized.persentase_realisasi = normalizeDecimal(
      normalized.persentase_realisasi,
      0
    );
  }

  if (Object.prototype.hasOwnProperty.call(normalized, "skor_dampak_aktual")) {
    normalized.skor_dampak_aktual = normalizeDecimal(
      normalized.skor_dampak_aktual,
      0
    );
  }

  return normalized;
};

const getRiskWithContext = async (riskId, transaction = null) => {
  const risk = await MrPlanningRisk.findByPk(riskId, {
    transaction,
    include: [
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
  });

  if (!risk) {
    throw createNotFoundError("MR Planning Risk tidak ditemukan.", {
      mr_planning_risk_id: riskId,
    });
  }

  return risk;
};

const ensureMitigationBelongsToRisk = async ({
  mitigationId,
  riskId,
  transaction = null,
}) => {
  if (!mitigationId) return null;

  const mitigation = await MrPlanningMitigation.findByPk(mitigationId, {
    transaction,
  });

  if (!mitigation) {
    throw createNotFoundError("MR Planning Mitigation tidak ditemukan.", {
      mr_planning_mitigation_id: mitigationId,
    });
  }

  if (Number(mitigation.mr_planning_risk_id) !== Number(riskId)) {
    throw createValidationError("MR Planning Mitigation tidak sesuai dengan risk.", {
      mr_planning_mitigation_id: mitigationId,
      expected_mr_planning_risk_id: Number(riskId),
      actual_mr_planning_risk_id: Number(mitigation.mr_planning_risk_id),
    });
  }

  return mitigation;
};

const getReferenceItemWithGroup = async ({
  refId,
  field,
  expectedGroups,
  required = false,
  transaction = null,
}) => {
  if (!refId) {
    if (required) {
      throw createValidationError("Reference wajib diisi.", {
        field,
      });
    }

    return null;
  }

  const item = await MrReferenceItem.findByPk(refId, {
    transaction,
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: true,
      },
    ],
  });

  if (!item) {
    throw createNotFoundError("Reference item tidak ditemukan.", {
      field,
      reference_id: refId,
    });
  }

  const plain = toPlain(item);
  const kodeGroup = plain?.group?.kode_group;

  if (!expectedGroups.includes(kodeGroup)) {
    throw createValidationError("Reference item tidak sesuai group yang diizinkan.", {
      field,
      reference_id: refId,
      kode_group: kodeGroup,
      expected_groups: expectedGroups,
    });
  }

  if (plain.is_active === false || Number(plain.is_active) === 0) {
    throw createValidationError("Reference item tidak aktif.", {
      field,
      reference_id: refId,
      kode_group: kodeGroup,
    });
  }

  return plain;
};

const resolveMonitoringReferenceLabels = async ({
  payload,
  transaction = null,
}) => {
  const result = { ...payload };

  await getReferenceItemWithGroup({
    refId: payload.jenis_penyebab_ref_id,
    field: "jenis_penyebab_ref_id",
    expectedGroups: ["ROOT_CAUSE_CATEGORY"],
    transaction,
  });

  const efektivitas = await getReferenceItemWithGroup({
    refId: payload.efektivitas_pengendalian_ref_id,
    field: "efektivitas_pengendalian_ref_id",
    expectedGroups: ["CONTROL_EFFECTIVENESS"],
    transaction,
  });

  if (efektivitas) {
    result.efektivitas_pengendalian = efektivitas.nama_item;
  }

  return result;
};

const resolveActualRisk = async ({ payload, transaction = null }) => {
  const likelihoodRefId = payload.actual_likelihood_ref_id;
  const impactRefId = payload.actual_impact_ref_id;

  if (!likelihoodRefId && !impactRefId) {
    return { ...payload };
  }

  if (!likelihoodRefId || !impactRefId) {
    throw createValidationError(
      "Likelihood dan impact aktual wajib dikirim berpasangan.",
      {
        actual_likelihood_ref_id: likelihoodRefId || null,
        actual_impact_ref_id: impactRefId || null,
      }
    );
  }

  const likelihood = await getReferenceItemWithGroup({
    refId: likelihoodRefId,
    field: "actual_likelihood_ref_id",
    expectedGroups: ["LIKELIHOOD"],
    required: true,
    transaction,
  });

  const impact = await getReferenceItemWithGroup({
    refId: impactRefId,
    field: "actual_impact_ref_id",
    expectedGroups: ["IMPACT"],
    required: true,
    transaction,
  });

  const matrix = await MrRiskMatrix.findOne({
    where: {
      matrix_code: MATRIX_CODE,
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
    },
    transaction,
  });

  if (!matrix) {
    throw createValidationError("Risk matrix aktual tidak ditemukan.", {
      matrix_code: MATRIX_CODE,
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
    });
  }

  const plainMatrix = toPlain(matrix);

  return {
    ...payload,
    actual_likelihood: normalizeDecimal(likelihood.nilai_numeric),
    actual_impact: normalizeDecimal(impact.nilai_numeric),
    actual_score: normalizeDecimal(plainMatrix.score),
    actual_level_ref_id: plainMatrix.level_risiko_ref_id,
    actual_level: plainMatrix.level_risiko,
    actual_color: plainMatrix.warna || plainMatrix.color || null,
    is_above_appetite_actual: normalizeBoolean(
      plainMatrix.is_above_appetite,
      false
    ),
  };
};

const buildLevelChange = ({ risk, payload }) => {
  if (!payload.actual_level || !risk?.level_risiko) return null;

  const riskScore = normalizeDecimal(risk.skor_risiko, 0);
  const actualScore = normalizeDecimal(payload.actual_score, 0);

  if (actualScore > riskScore) return "naik";
  if (actualScore < riskScore) return "turun";
  return "tetap";
};

const buildRiskTrend = ({ risk, payload }) => {
  if (!payload.actual_score || !risk?.skor_risiko) return null;

  const riskScore = normalizeDecimal(risk.skor_risiko, 0);
  const actualScore = normalizeDecimal(payload.actual_score, 0);

  if (actualScore > riskScore) return "memburuk";
  if (actualScore < riskScore) return "membaik";
  return "stabil";
};

const safeText = (value, fallback = "") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).trim();
};

const cleanSentence = (value, fallback = "") => {
  const text = safeText(value, fallback)
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .trim();

  return text.replace(/[.]+$/g, "");
};

const cleanNarrative = (value, fallback = "") => {
  const text = safeText(value, fallback)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .trim();

  return text;
};

const resolveInitialProgress = ({ body = {}, mitigation = null }) => {
  const plainMitigation = toPlain(mitigation) || {};

  const manualProgress =
    body.progress_persen ?? body.persentase_realisasi ?? null;

  if (manualProgress !== null && manualProgress !== undefined && manualProgress !== "") {
    return normalizeDecimal(manualProgress, 0);
  }

  const mitigationProgress = normalizeDecimal(plainMitigation.progress_persen, 0);

  if (mitigationProgress > 0) {
    return mitigationProgress;
  }

  const status = String(
    plainMitigation.status_mitigasi || plainMitigation.status_revisi || ""
  ).toLowerCase();

  if (["selesai", "done", "completed", "disetujui", "approved"].includes(status)) {
    return 100;
  }

  if (["berjalan", "proses", "dalam_pelaksanaan", "pelaksanaan"].includes(status)) {
    return 35;
  }

  if (["direncanakan", "draft", "diajukan", "verifikasi"].includes(status)) {
    return 10;
  }

  return 10;
};

const buildMonitoringPeriodLabel = ({ body = {}, risk = null }) => {
  const plainRisk = toPlain(risk);

  if (body.periode_label) return safeText(body.periode_label);

  if (plainRisk?.context?.periode_label) {
    return safeText(plainRisk.context.periode_label);
  }

  if (plainRisk?.tahun) {
    return `Tahun ${plainRisk.tahun}`;
  }

  return "Periode Pemantauan";
};

const buildMonitoringDate = ({ body = {} }) => {
  if (body.monitoring_date) return body.monitoring_date;

  const now = new Date();
  return now.toISOString().slice(0, 10);
};

const normalizeSourceKey = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const resolveMonitoringSourceType = ({ risk, mitigation }) => {
  const plainRisk = toPlain(risk) || {};
  const plainMitigation = toPlain(mitigation) || {};
  const context = plainRisk.context || {};
  const metadata = context.metadata_json || {};

  const candidates = [
    metadata.proposal_source_type,
    metadata.proposal_source_code,
    plainRisk.jenis_dokumen,
    plainRisk.stage,
    plainMitigation.jenis_mitigasi,
    plainRisk.kode_risiko,
    plainRisk.sumber_risiko,
  ]
    .filter(Boolean)
    .map(normalizeSourceKey);

  const joined = candidates.join(" ");

  if (
    joined.includes("renstra") ||
    joined.includes("tujuan") ||
    joined.includes("sasaran") ||
    joined.includes("strategi") ||
    joined.includes("kebijakan") ||
    joined.includes("program") ||
    joined.includes("sub_kegiatan")
  ) {
    return "RENSTRA";
  }

  if (
    joined.includes("lakip") ||
    joined.includes("sakip") ||
    joined.includes("akuntabilitas_kinerja")
  ) {
    return "LAKIP";
  }

  if (
    joined.includes("laporan_keuangan") ||
    joined.includes("lk") ||
    joined.includes("keuangan")
  ) {
    return "LAPORAN_KEUANGAN";
  }

  if (
    joined.includes("pertanggungjawaban") ||
    joined.includes("spj") ||
    joined.includes("lpj")
  ) {
    return "PERTANGGUNGJAWABAN_KEGIATAN";
  }

  if (
    joined.includes("pelaksanaan_kegiatan") ||
    joined.includes("pelaksanaan") ||
    joined.includes("operasional")
  ) {
    return "PELAKSANAAN_KEGIATAN";
  }

  if (
    joined.includes("pengaduan") ||
    joined.includes("masyarakat") ||
    joined.includes("layanan")
  ) {
    return "PENGADUAN_MASYARAKAT";
  }

  if (joined.includes("bpk")) {
    return "TINDAK_LANJUT_BPK";
  }

  if (
    joined.includes("inspektorat") ||
    joined.includes("pengawasan") ||
    joined.includes("audit") ||
    joined.includes("temuan_inspektorat")
  ) {
    return "TINDAK_LANJUT_INSPEKTORAT";
  }

  return "UMUM";
};

const buildMonitoringBaseContext = ({ risk, mitigation }) => {
  const plainRisk = toPlain(risk) || {};
  const plainMitigation = toPlain(mitigation) || {};
  const context = plainRisk.context || {};

  return {
    namaRisiko: cleanSentence(
      plainRisk.nama_risiko ||
        plainRisk.risk_statement ||
        plainRisk.uraian_risiko,
      "risiko yang telah diidentifikasi"
    ),

    uraianRisiko: cleanNarrative(
      plainRisk.uraian_risiko ||
        plainRisk.risk_statement ||
        plainRisk.nama_risiko,
      "uraian risiko belum tersedia secara lengkap"
    ),

    penyebabRisiko: cleanNarrative(
      plainRisk.penyebab_risiko,
      "penyebab risiko perlu dipantau secara berkala oleh pemilik risiko"
    ),

    dampakRisiko: cleanNarrative(
      plainRisk.dampak_risiko,
      "dampak risiko dapat mempengaruhi pencapaian target kinerja, akuntabilitas, kepatuhan, dan kualitas layanan"
    ),

    kegiatanPengendalian: cleanSentence(
      plainMitigation.kegiatan_pengendalian ||
        plainMitigation.uraian_mitigasi ||
        plainMitigation.jenis_mitigasi,
      "pelaksanaan rencana tindak pengendalian yang telah ditetapkan"
    ),

    targetOutput: cleanSentence(
      plainMitigation.target_output ||
        plainMitigation.indikator_keluaran ||
        plainMitigation.target_keluaran,
      "output pengendalian sesuai rencana tindak pengendalian"
    ),

    penanggungJawab: cleanSentence(
      plainMitigation.penanggung_jawab ||
        context.nama_unit_kerja ||
        context.nama_opd ||
        plainRisk.nama_pemilik_risiko ||
        plainRisk.nama_koordinator,
      "pemilik risiko dan pelaksana terkait"
    ),

    unitKerja: cleanSentence(
      context.nama_unit_kerja || context.nama_opd || plainRisk.nama_unit_kerja,
      "unit kerja terkait"
    ),

    periodeLabel: cleanSentence(
      context.periode_label || plainRisk.periode_label,
      "periode pemantauan"
    ),

    indikatorSumber: cleanSentence(
      plainRisk.indikator_sumber ||
        plainRisk.indikator_label ||
        plainRisk.source_ref ||
        plainRisk.nama_indikator ||
        plainRisk.nama_risiko,
      "sumber risiko terkait"
    ),
  };
};

const buildRenstraMonitoringDraft = ({ base, progress }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko yang berkaitan dengan pencapaian indikator perencanaan pada ${base.unitKerja}. ` +
    `Fokus pemantauan diarahkan pada ketercapaian target, konsistensi pelaksanaan program/kegiatan, serta pengendalian faktor yang dapat menghambat capaian kinerja. ` +
    `Rencana tindak pengendalian yang dipantau adalah ${base.kegiatanPengendalian}.`,

  realisasi_mitigasi:
    `Realisasi pengendalian diarahkan untuk mendukung pencapaian indikator dan target perencanaan melalui ${base.kegiatanPengendalian}. ` +
    `Progres awal pelaksanaan dicatat sebesar ${progress}% dan wajib diperbarui sesuai perkembangan pelaksanaan program/kegiatan.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa laporan progres kegiatan, dokumen capaian indikator, notulen koordinasi, dokumentasi pelaksanaan, atau dokumen pendukung capaian kinerja.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau di ${base.unitKerja} meliputi keterlambatan pelaksanaan kegiatan, belum lengkapnya data capaian indikator, keterbatasan koordinasi, atau belum optimalnya dokumentasi pendukung capaian kinerja.`,

  tindak_lanjut:
    `Melakukan pemantauan berkala atas capaian indikator terkait ${base.namaRisiko} melalui ${base.kegiatanPengendalian}, memperbarui data realisasi, memperkuat koordinasi antar pelaksana, dan melengkapi dokumen pendukung capaian kinerja.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} memastikan pelaksanaan rencana tindak pengendalian selaras dengan target perencanaan, memperbarui progres capaian, dan melengkapi Bukti Realisasi secara berkala.`,
});

const buildLakipMonitoringDraft = ({ base, progress }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko yang berpotensi mempengaruhi akuntabilitas kinerja dan pelaporan LAKIP. ` +
    `Fokus pemantauan diarahkan pada kesesuaian capaian kinerja, kelengkapan data dukung, kualitas narasi kinerja, serta konsistensi antara target dan realisasi.`,

  realisasi_mitigasi:
    `Realisasi pengendalian dilakukan melalui ${base.kegiatanPengendalian}. ` +
    `Progres awal dicatat sebesar ${progress}% dan perlu diperbarui berdasarkan perkembangan penyusunan data kinerja dan bukti dukung LAKIP.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa matriks capaian kinerja, dokumen evaluasi kinerja, data dukung indikator, notulen pembahasan, atau draft/lampiran pelaporan kinerja.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau meliputi belum lengkapnya data dukung indikator, keterlambatan pemutakhiran capaian kinerja, atau belum konsistennya narasi capaian dengan bukti pendukung di ${base.unitKerja}.`,

  tindak_lanjut:
    `Melengkapi data dukung capaian kinerja terkait ${base.namaRisiko}, melakukan rekonsiliasi capaian indikator, memperbaiki narasi kinerja, dan memastikan dokumen pendukung LAKIP tersedia secara tertib.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} memperkuat pengendalian penyusunan data kinerja, memastikan validitas bukti dukung, dan melakukan reviu berkala atas capaian indikator.`,
});

const buildLaporanKeuanganMonitoringDraft = ({ base, progress }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko yang berkaitan dengan keandalan laporan keuangan, kepatuhan pengelolaan anggaran, dan ketertiban administrasi keuangan. ` +
    `Fokus pemantauan diarahkan pada kelengkapan dokumen, kesesuaian pencatatan, validitas transaksi, dan tindak lanjut atas potensi kelemahan pengendalian keuangan.`,

  realisasi_mitigasi:
    `Realisasi pengendalian diarahkan pada ${base.kegiatanPengendalian}. ` +
    `Progres awal dicatat sebesar ${progress}% dan wajib diperbarui berdasarkan hasil verifikasi dokumen keuangan serta bukti pendukung transaksi.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa dokumen pertanggungjawaban, berita acara, bukti pembayaran, rekonsiliasi, daftar koreksi, atau dokumen verifikasi keuangan.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau meliputi belum lengkapnya dokumen pertanggungjawaban, keterlambatan verifikasi, perbedaan pencatatan, atau belum lengkapnya bukti transaksi pada ${base.unitKerja}.`,

  tindak_lanjut:
    `Melengkapi dokumen pertanggungjawaban terkait ${base.namaRisiko}, melakukan verifikasi bukti transaksi, memperbaiki pencatatan, dan memperkuat pengendalian administrasi keuangan.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} memastikan seluruh dokumen keuangan lengkap, sah, tertelusur, dan sesuai ketentuan pertanggungjawaban.`,
});

const buildPertanggungjawabanMonitoringDraft = ({ base, progress }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko pada proses pertanggungjawaban kegiatan. ` +
    `Fokus pemantauan diarahkan pada kelengkapan bukti pelaksanaan, kesesuaian output kegiatan, ketertiban administrasi, serta validitas dokumen pertanggungjawaban.`,

  realisasi_mitigasi:
    `Realisasi pengendalian dilakukan melalui ${base.kegiatanPengendalian}. ` +
    `Progres awal dicatat sebesar ${progress}% dan perlu diperbarui berdasarkan kelengkapan dokumen pertanggungjawaban dan hasil verifikasi.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa SPJ, bukti pembayaran, berita acara, dokumentasi kegiatan, daftar hadir, notulen, atau laporan pelaksanaan kegiatan.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau meliputi dokumen pertanggungjawaban belum lengkap, bukti pelaksanaan belum terdokumentasi, atau dokumen belum sesuai dengan ketentuan administrasi di ${base.unitKerja}.`,

  tindak_lanjut:
    `Melengkapi dokumen pertanggungjawaban terkait ${base.namaRisiko}, mengumpulkan bukti pelaksanaan, melakukan verifikasi dokumen, dan memperbaiki administrasi kegiatan sebelum pelaporan final.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} memastikan seluruh bukti pertanggungjawaban lengkap, tertib, sah, dan dapat ditelusuri.`,
});

const buildPelaksanaanKegiatanMonitoringDraft = ({ base, progress }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko dalam pelaksanaan kegiatan. ` +
    `Fokus pemantauan diarahkan pada kesesuaian jadwal, capaian output, koordinasi pelaksana, penggunaan sumber daya, serta hambatan pelaksanaan di lapangan.`,

  realisasi_mitigasi:
    `Realisasi pengendalian diarahkan pada ${base.kegiatanPengendalian}. ` +
    `Progres awal dicatat sebesar ${progress}% dan perlu diperbarui berdasarkan perkembangan pelaksanaan kegiatan.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa laporan progres kegiatan, dokumentasi pelaksanaan, berita acara, daftar hadir, notulen koordinasi, atau dokumen output kegiatan.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau meliputi keterlambatan pelaksanaan, keterbatasan sumber daya, hambatan koordinasi, atau belum lengkapnya bukti pelaksanaan kegiatan di ${base.unitKerja}.`,

  tindak_lanjut:
    `Memperkuat koordinasi pelaksana terkait ${base.namaRisiko} melalui ${base.kegiatanPengendalian}, memperbarui jadwal pelaksanaan, melengkapi bukti kegiatan, dan melakukan pemantauan progres secara berkala.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} memastikan pelaksanaan kegiatan berjalan sesuai rencana, output tercapai, dan bukti pelaksanaan terdokumentasi dengan baik.`,
});

const buildPengaduanMasyarakatMonitoringDraft = ({ base, progress }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko yang berasal dari pengaduan masyarakat atau umpan balik layanan. ` +
    `Fokus pemantauan diarahkan pada tindak lanjut pengaduan, ketepatan respons, penyelesaian masalah, dan perbaikan kualitas layanan.`,

  realisasi_mitigasi:
    `Realisasi pengendalian dilakukan melalui ${base.kegiatanPengendalian}. ` +
    `Progres awal dicatat sebesar ${progress}% dan perlu diperbarui berdasarkan perkembangan tindak lanjut pengaduan.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa register pengaduan, dokumentasi klarifikasi, berita acara tindak lanjut, tanggapan resmi, atau laporan penyelesaian pengaduan.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau meliputi belum lengkapnya informasi pengaduan, keterlambatan tindak lanjut, koordinasi lintas unit, atau belum tersedia bukti penyelesaian di ${base.unitKerja}.`,

  tindak_lanjut:
    `Melakukan klarifikasi atas ${base.namaRisiko}, menetapkan tindak lanjut, mendokumentasikan proses penyelesaian, dan menyampaikan hasil penanganan sesuai ketentuan layanan.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} memastikan pengaduan ditindaklanjuti secara akuntabel, terdokumentasi, dan digunakan sebagai bahan perbaikan layanan.`,
});

const buildPengawasanMonitoringDraft = ({ base, progress, sourceLabel }) => ({
  hasil_monitoring:
    `Pemantauan dilakukan terhadap risiko yang berasal dari ${sourceLabel}. ` +
    `Fokus pemantauan diarahkan pada penyelesaian tindak lanjut, kelengkapan dokumen pendukung, ketertiban administrasi, serta verifikasi atas pelaksanaan rencana tindak pengendalian.`,

  realisasi_mitigasi:
    `Realisasi pengendalian diarahkan pada pelaksanaan ${base.kegiatanPengendalian}. ` +
    `Penanggung jawab pelaksanaan adalah ${base.penanggungJawab}. ` +
    `Progres awal dicatat sebesar ${progress}% dan wajib diperbarui berdasarkan bukti tindak lanjut dan hasil verifikasi.`,

  output_realisasi:
    `Output realisasi yang diharapkan adalah ${base.targetOutput}. ` +
    `Bukti Realisasi dapat berupa laporan progres, berita acara, notulen, dokumentasi pelaksanaan, bukti pertanggungjawaban, dokumen output aktual, atau bukti verifikasi tindak lanjut.`,

  kendala:
    `Kendala pada ${base.namaRisiko} yang perlu dipantau meliputi belum lengkapnya bukti tindak lanjut, belum optimalnya dokumentasi pelaksanaan, atau perlunya koordinasi lanjutan dengan pihak terkait terhadap ${sourceLabel}.`,

  tindak_lanjut:
    `Melengkapi bukti tindak lanjut atas ${base.namaRisiko} melalui ${base.kegiatanPengendalian}, memperbarui progres penyelesaian, melakukan koordinasi dengan pihak terkait, dan menyiapkan bukti verifikasi atas pelaksanaan rencana tindak pengendalian.`,

  rekomendasi:
    `Disarankan agar ${base.penanggungJawab} melaksanakan tindak lanjut secara terukur, melengkapi Bukti Realisasi, dan melakukan verifikasi berkala agar risiko tetap terkendali.`,
});

// Draft kejadian risiko aktual (Lampiran 7A/7B) — dihitung dari data risiko/mitigasi
// yang sama seperti draft hasil_monitoring, sehingga terisi otomatis sejak awal.
// Field ini tersimpan di form meski tersembunyi (Terjadi Risiko belum dipilih "Ya"),
// user WAJIB review dan boleh mengganti sebelum disimpan.
const buildKejadianDraft = ({ base, monitoringDate }) => ({
  tanggal_kejadian: monitoringDate,

  tempat_kejadian: base.unitKerja,

  uraian_kejadian: cleanNarrative(
    `Kejadian terkait ${base.namaRisiko} tercatat terjadi pada ${base.unitKerja}. ${base.uraianRisiko}.`
  ),

  pemicu_kejadian: cleanNarrative(`Kejadian dipicu oleh ${base.penyebabRisiko}.`),

  dampak_kejadian: cleanNarrative(base.dampakRisiko),

  tindak_lanjut_kejadian: cleanNarrative(
    `Tindak lanjut atas kejadian mengacu pada rencana tindak pengendalian yaitu ${base.kegiatanPengendalian}, dengan penanggung jawab ${base.penanggungJawab}.`
  ),
});

const buildMonitoringNarrativeDraft = ({ risk, mitigation, body = {}, monitoringDate }) => {
  const sourceType = resolveMonitoringSourceType({ risk, mitigation });
  const base = buildMonitoringBaseContext({ risk, mitigation });
  const kejadianDraft = buildKejadianDraft({ base, monitoringDate });

  const progress = Math.max(
    0,
    Math.min(
      100,
      resolveInitialProgress({
        body,
        mitigation,
      })
    )
  );

  let draft;

  if (sourceType === "RENSTRA") {
    draft = buildRenstraMonitoringDraft({ base, progress });
  } else if (sourceType === "LAKIP") {
    draft = buildLakipMonitoringDraft({ base, progress });
  } else if (sourceType === "LAPORAN_KEUANGAN") {
    draft = buildLaporanKeuanganMonitoringDraft({ base, progress });
  } else if (sourceType === "PERTANGGUNGJAWABAN_KEGIATAN") {
    draft = buildPertanggungjawabanMonitoringDraft({ base, progress });
  } else if (sourceType === "PELAKSANAAN_KEGIATAN") {
    draft = buildPelaksanaanKegiatanMonitoringDraft({ base, progress });
  } else if (sourceType === "PENGADUAN_MASYARAKAT") {
    draft = buildPengaduanMasyarakatMonitoringDraft({ base, progress });
  } else if (sourceType === "TINDAK_LANJUT_BPK") {
    draft = buildPengawasanMonitoringDraft({
      base,
      progress,
      sourceLabel: "tindak lanjut hasil pemeriksaan BPK",
    });
  } else if (sourceType === "TINDAK_LANJUT_INSPEKTORAT") {
    draft = buildPengawasanMonitoringDraft({
      base,
      progress,
      sourceLabel: "tindak lanjut hasil pengawasan Inspektorat",
    });
  } else {
    draft = buildPelaksanaanKegiatanMonitoringDraft({ base, progress });
  }

  return {
    progress_persen: progress,
    persentase_realisasi: progress,

    hasil_monitoring: cleanNarrative(draft.hasil_monitoring),
    realisasi_mitigasi: cleanNarrative(draft.realisasi_mitigasi),
    output_realisasi: cleanNarrative(draft.output_realisasi),
    kendala: cleanNarrative(draft.kendala),
    tindak_lanjut: cleanNarrative(draft.tindak_lanjut),
    rekomendasi: cleanNarrative(draft.rekomendasi),

    ...kejadianDraft,

    catatan_preview:
      "Draft ini dihasilkan otomatis oleh sistem berdasarkan sumber risiko, data Risiko, dan Rencana Tindak Pengendalian. User wajib melakukan review substantif sebelum menyimpan.",

    draft_source_type: sourceType,
  };
};

const buildSystemFieldsFromRisk = ({ risk, mitigation = null, userId }) => {
  const plainRisk = toPlain(risk);
  const plainMitigation = toPlain(mitigation);

  return {
    context_id: plainRisk.context_id || plainMitigation?.context_id || null,
    tahun: plainRisk.tahun || plainRisk.context?.tahun || null,
    owner_user_id:
      plainMitigation?.owner_user_id || plainRisk.owner_user_id || userId || null,
    owner_division_id:
      plainMitigation?.owner_division_id || plainRisk.owner_division_id || null,
    monitoring_by: userId || null,
    evaluator_user_id: userId || null,
  };
};

const buildCreatePayload = async ({
  risk,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  let payload = pickAllowedFields(body);
  requireBusinessFieldsForCreate(payload);
  payload = normalizeMonitoringPayload(payload);

  const mitigation = await ensureMitigationBelongsToRisk({
    mitigationId: payload.mr_planning_mitigation_id,
    riskId: risk.id,
    transaction,
  });

  payload = await resolveMonitoringReferenceLabels({
    payload,
    transaction,
  });

  payload = await resolveActualRisk({
    payload,
    transaction,
  });

  const plainRisk = toPlain(risk);
  const systemFields = buildSystemFieldsFromRisk({
    risk,
    mitigation,
    userId,
  });

  return {
    ...payload,
    ...systemFields,

    mr_planning_risk_id: plainRisk.id,
    status_monitoring: payload.status_monitoring || "draft",
    progress_persen: normalizeDecimal(payload.progress_persen, 0),
    persentase_realisasi: normalizeDecimal(payload.persentase_realisasi, 0),
    terjadi_risiko: normalizeBoolean(payload.terjadi_risiko, false),

    level_change: buildLevelChange({
      risk: plainRisk,
      payload,
    }),
    risk_trend: buildRiskTrend({
      risk: plainRisk,
      payload,
    }),

    versi: 1,
    status_revisi: "draft",
    dibuat_oleh: userId || null,
    dibuat_pada: new Date(),
    created_by: userId || null,
    updated_by: userId || null,
  };
};

const buildUpdatePayload = async ({
  monitoring,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  if (monitoring.status_revisi !== "draft") {
    throw createValidationError("Monitoring hanya bisa diubah saat status draft.", {
      current_status: monitoring.status_revisi,
    });
  }

  let payload = pickAllowedFields(body);
  payload = normalizeMonitoringPayload(payload);

  const risk = await getRiskWithContext(monitoring.mr_planning_risk_id, transaction);

  await ensureMitigationBelongsToRisk({
    mitigationId:
      payload.mr_planning_mitigation_id || monitoring.mr_planning_mitigation_id,
    riskId: monitoring.mr_planning_risk_id,
    transaction,
  });

  payload = await resolveMonitoringReferenceLabels({
    payload,
    transaction,
  });

  payload = await resolveActualRisk({
    payload,
    transaction,
  });

  const plainRisk = toPlain(risk);

  const finalPayload = {
    ...payload,
    updated_by: userId || null,
    last_revised_by: userId || null,
    last_revised_at: new Date(),
  };

  if (Object.prototype.hasOwnProperty.call(payload, "progress_persen")) {
    finalPayload.progress_persen = normalizeDecimal(payload.progress_persen, 0);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "persentase_realisasi")) {
    finalPayload.persentase_realisasi = normalizeDecimal(
      payload.persentase_realisasi,
      0
    );
  }

  if (Object.prototype.hasOwnProperty.call(payload, "terjadi_risiko")) {
    finalPayload.terjadi_risiko = normalizeBoolean(payload.terjadi_risiko, false);
  }

  if (payload.actual_score !== undefined && payload.actual_level !== undefined) {
    finalPayload.level_change = buildLevelChange({
      risk: plainRisk,
      payload,
    });

    finalPayload.risk_trend = buildRiskTrend({
      risk: plainRisk,
      payload,
    });
  }

  return finalPayload;
};

const monitoringInclude = () => [
  {
    model: MrPlanningRisk,
    as: "risk",
    required: false,
  },
  {
    model: MrPlanningMitigation,
    as: "mitigation",
    required: false,
  },
  {
    model: MrPlanningContext,
    as: "context",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "status_realisasi_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "jenis_penyebab_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "actual_likelihood_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "actual_impact_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "actual_level_ref",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "efektivitas_pengendalian_ref",
    required: false,
  },
];

const buildDraftPreviewFromRisk = async ({ riskId, body = {} }) => {
  const risk = await getRiskWithContext(riskId);

  const plainRisk = toPlain(risk);

  // Aktual (Kemungkinan/Dampak) sebelumnya TIDAK PERNAH ada field input di form
  // manapun (cuma kolom baca "Level Aktual" di daftar) — akibatnya Peta Risiko
  // Aktual & Lampiran 11.2 selalu "Belum Tersedia"/0. Default-nya diambil dari
  // Residu (RiskAnalysis) sebagai titik awal wajar selama belum ada hasil
  // pemantauan baru yang membantahnya — tetap editable user sebelum disimpan.
  const latestAnalysis = await MrPlanningRiskAnalysis.findOne({
    where: {
      mr_planning_risk_id: plainRisk.id,
      is_active: true,
      is_latest: true,
    },
    order: [["id", "DESC"]],
  });

  let mitigation = null;

  if (body.mr_planning_mitigation_id) {
    mitigation = await ensureMitigationBelongsToRisk({
      mitigationId: body.mr_planning_mitigation_id,
      riskId: plainRisk.id,
    });
  } else {
    mitigation = await MrPlanningMitigation.findOne({
      where: {
        mr_planning_risk_id: plainRisk.id,
      },
      order: [
        ["id", "DESC"],
      ],
    });
  }

  const periodeType =
    body.periode_type ||
    plainRisk?.context?.periode_type ||
    "triwulan";

  const periodeLabel = buildMonitoringPeriodLabel({
    body,
    risk,
  });

  const monitoringDate = buildMonitoringDate({
    body,
  });

  const narrativeDraft = buildMonitoringNarrativeDraft({
    risk,
    mitigation,
    body,
    monitoringDate,
  });

  return {
    message: "Draft Pemantauan Pengendalian berhasil dibuat.",
    data: {
      mr_planning_mitigation_id: mitigation?.id || null,

      periode_type: periodeType,
      periode_label: periodeLabel,
      monitoring_date: monitoringDate,

      status_monitoring: "draft",

      actual_likelihood_ref_id: latestAnalysis?.residual_likelihood_ref_id || undefined,
      actual_impact_ref_id: latestAnalysis?.residual_impact_ref_id || undefined,

      ...narrativeDraft,

      sumber_draft: {
        provider: process.env.MR_NARRATIVE_PROVIDER || "rule_enhanced",
        external_enabled:
          String(process.env.MR_NARRATIVE_EXTERNAL_ENABLED || "false") === "true",
        allow_external:
          String(process.env.MR_NARRATIVE_ALLOW_EXTERNAL || "false") === "true",
        force_review:
          String(process.env.MR_NARRATIVE_FORCE_REVIEW || "true") !== "false",
        source: "risk_and_mitigation",
        source_type: narrativeDraft.draft_source_type || "UMUM",
      },
    },
  };
};

const createMonitoringFromRisk = async ({ riskId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const risk = await getRiskWithContext(riskId, transaction);

    const payload = await buildCreatePayload({
      risk,
      body,
      userId,
      transaction,
    });

    const created = await MrPlanningMonitoring.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getMonitoringDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateDraftMonitoring = async ({ id, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const monitoring = await MrPlanningMonitoring.findByPk(id, {
      transaction,
    });

    if (!monitoring) {
      throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", {
        id,
      });
    }

    const payload = await buildUpdatePayload({
      monitoring,
      body,
      userId,
      transaction,
    });

    await monitoring.update(payload, {
      transaction,
    });

    await transaction.commit();

    return getMonitoringDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getMonitoringDetail = async (id) => {
  const monitoring = await MrPlanningMonitoring.findByPk(id, {
    include: monitoringInclude(),
  });

  if (!monitoring) {
    throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", {
      id,
    });
  }

  return monitoring;
};

const getMonitoringsByRisk = async (riskId) => {
  return MrPlanningMonitoring.findAll({
    where: {
      mr_planning_risk_id: riskId,
    },
    include: monitoringInclude(),
    order: [
      ["id", "ASC"],
    ],
  });
};

const getMonitoringsByMitigation = async (mitigationId) => {
  return MrPlanningMonitoring.findAll({
    where: {
      mr_planning_mitigation_id: mitigationId,
    },
    include: monitoringInclude(),
    order: [
      ["id", "ASC"],
    ],
  });
};

// =====================================================
// A09-F01 / A10-F01 — WORKFLOW & HISTORY
// =====================================================
const submitMonitoringForVerification = async ({ id, userId, note } = {}) => {
  return sequelize.transaction(async (transaction) => {
    const monitoring = await MrPlanningMonitoring.findByPk(id, { transaction });

    if (!monitoring) {
      throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", { id });
    }

    if (!["draft", "ditolak"].includes(String(monitoring.status_revisi || "").toLowerCase())) {
      throw createValidationError(
        "Monitoring hanya bisa diajukan untuk verifikasi selagi berstatus Draft atau Ditolak.",
        { id, current_status: monitoring.status_revisi },
      );
    }

    const beforeJson = toPlain(monitoring);

    await monitoring.update(
      {
        status_revisi: "verifikasi",
        last_revised_at: new Date(),
        last_revised_by: userId || null,
        updated_by: userId || null,
      },
      { transaction },
    );

    const historyPayload = buildHistoryPayload({
      activeRecord: monitoring,
      historyForeignKey: MONITORING_HISTORY_FK,
      beforeJson,
      afterJson: toPlain(monitoring),
      action: "verifikasi",
      statusRevisi: "draft",
      alasanRevisi: note,
      userId,
      incrementVersi: false,
      extra: {
        context_id: monitoring.context_id,
        mr_planning_risk_id: monitoring.mr_planning_risk_id,
        mr_planning_mitigation_id: monitoring.mr_planning_mitigation_id,
      },
    });

    await createHistory({ HistoryModel: MrPlanningMonitoringHistory, payload: historyPayload, transaction });

    return getMonitoringDetail(id);
  });
};

// Resolve the authoritative owning OPD for a Monitoring active record via its
// owning Risk (MrPlanningMonitoring has no opd_id of its own; mr_planning_risk_id
// is a direct FK on the record itself, unlike Mitigation which required an extra
// hop -- Monitoring can attach to a Mitigation optionally, but the risk linkage is
// always present and authoritative regardless). Follows the same direct
// findByPk-by-foreign-key pattern already used elsewhere in this file, not an
// unverified Sequelize association `include`. Returns null if the Monitoring or
// its Risk cannot be resolved, or if the Risk has no opd_id -- the caller MUST
// treat null as ownership-resolution failure and fail closed (Sprint 12 contract).
const resolveMonitoringTargetOpdId = async (monitoringId) => {
  if (!monitoringId) return null;
  const monitoring = await MrPlanningMonitoring.findByPk(monitoringId, {
    attributes: ["id", "mr_planning_risk_id"],
  });
  if (!monitoring?.mr_planning_risk_id) return null;
  const risk = await MrPlanningRisk.findByPk(monitoring.mr_planning_risk_id, {
    attributes: ["id", "opd_id"],
  });
  return risk?.opd_id ?? null;
};

const verifikasiMonitoringHistory = async ({ historyId, userId, note, request }) => {
  const history = await mrApprovalService.findHistoryById({
    HistoryModel: MrPlanningMonitoringHistory,
    historyId,
  });
  const activeMonitoring = await mrApprovalService.findActiveByHistory({
    ActiveModel: MrPlanningMonitoring,
    history,
    historyForeignKey: MONITORING_HISTORY_FK,
  });

  const verifikasiTargetOpdId = await resolveMonitoringTargetOpdId(activeMonitoring?.id ?? null);

  // Sprint 12 fail-closed contract: ownership resolution failure (parent Risk/
  // Monitoring missing or has no opd_id) must DENY, never silently fall through
  // to resolveMrPlanningRiskOpdBoundary's own "null = defer/allow" behavior.
  // SUPER_ADMIN is still exempted below via the boundary resolver itself
  // (tenant-wide by design), consistent with every other OPD boundary check.
  if (
    verifikasiTargetOpdId === null &&
    request?.user?.role !== "SUPER_ADMIN"
  ) {
    throwMrPlanningRiskOpdBoundaryError({
      ok: false,
      status: 403,
      error: {
        message:
          "Kepemilikan OPD untuk Monitoring ini tidak dapat diverifikasi. Aksi ditolak demi keamanan data.",
        code: "MR_MONITORING_OPD_BOUNDARY_UNRESOLVED",
      },
    });
  }

  const verifikasiBoundary = await resolveMrPlanningRiskOpdBoundary({
    user: request?.user ?? null,
    targetOpdId: verifikasiTargetOpdId,
  });
  if (!verifikasiBoundary.ok) {
    throwMrPlanningRiskOpdBoundaryError(verifikasiBoundary);
  }

  return mrApprovalService.verifikasiHistory({
    sequelize,
    ActiveModel: MrPlanningMonitoring,
    HistoryModel: MrPlanningMonitoringHistory,
    historyId,
    userId,
    note,
    historyForeignKey: MONITORING_HISTORY_FK,
    request,
  });
};

const approveMonitoringHistory = ({ historyId, userId, note, request }) =>
  mrApprovalService.approveHistory({
    sequelize,
    ActiveModel: MrPlanningMonitoring,
    HistoryModel: MrPlanningMonitoringHistory,
    historyId,
    userId,
    note,
    historyForeignKey: MONITORING_HISTORY_FK,
    request,
    extraBlockedActiveFields: ["mr_planning_risk_id", "mr_planning_mitigation_id"],
  });

const tolakMonitoringHistory = ({ historyId, userId, note, request }) =>
  mrApprovalService.tolakHistory({
    sequelize,
    ActiveModel: MrPlanningMonitoring,
    HistoryModel: MrPlanningMonitoringHistory,
    historyId,
    userId,
    note,
    historyForeignKey: MONITORING_HISTORY_FK,
    request,
  });

const getHistoryByMonitoring = ({ monitoringId, status_revisi }) =>
  mrHistoryService.getHistoryByActiveId({
    HistoryModel: MrPlanningMonitoringHistory,
    activeId: monitoringId,
    historyForeignKey: MONITORING_HISTORY_FK,
    status_revisi,
  });

const getMonitoringHistoryDetail = (historyId) =>
  mrHistoryService.getHistoryDetail({ HistoryModel: MrPlanningMonitoringHistory, historyId });

module.exports = {
  ERROR_CODE,
  MATRIX_CODE,

  MONITORING_ALLOWED_FIELDS,
  MONITORING_BLOCKED_FIELDS,
  VALID_PERIODE_TYPES,

  createValidationError,
  createNotFoundError,

  getRiskWithContext,
  ensureMitigationBelongsToRisk,
  getReferenceItemWithGroup,
  resolveMonitoringReferenceLabels,
  resolveActualRisk,
  buildLevelChange,
  buildRiskTrend,
  buildSystemFieldsFromRisk,
  buildCreatePayload,
  buildUpdatePayload,
  monitoringInclude,

  buildDraftPreviewFromRisk,

  createMonitoringFromRisk,
  updateDraftMonitoring,
  getMonitoringDetail,
  getMonitoringsByRisk,
  getMonitoringsByMitigation,

  submitMonitoringForVerification,
  verifikasiMonitoringHistory,
  approveMonitoringHistory,
  tolakMonitoringHistory,
  getHistoryByMonitoring,
  getMonitoringHistoryDetail,
};