"use strict";

/**
 * MR Planning Monitoring Evidence Service
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R17B-4C-4I
 * Monitoring/Realisasi — Bukti Realisasi Aktual Rencana Tindak Pengendalian
 *
 * Guard:
 * - Bukti realisasi aktual berbeda dari Dokumen RTP.
 * - Dokumen RTP tetap berada di mr_planning_mitigation_documents.
 * - Bukti realisasi aktual berada di mr_planning_monitoring_evidence.
 * - Bukti wajib melekat ke monitoring/realisasi.
 * - Relasi mitigation/risk/context diturunkan dari monitoring oleh backend.
 * - Tidak ada hard delete.
 * - Pembatalan bukti memakai soft cancel:
 *   is_active=false, status_bukti=dibatalkan, cancelled_by, cancelled_at, cancel_reason.
 * - Service tidak mengubah Word/Excel/PDF/Report Export.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  sequelize,
  MrPlanningMonitoring,
  MrPlanningMonitoringEvidence,
  MrPlanningRisk,
  MrPlanningMitigation,
  MrPlanningContext,
} = require("../../models");

const ERROR_CODE = "MR_MONITORING_EVIDENCE_VALIDATION_ERROR";

const EVIDENCE_TYPES = Object.freeze([
  "FOTO_KEGIATAN",
  "BERITA_ACARA",
  "NOTULEN",
  "LAPORAN_PROGRESS",
  "BUKTI_PERTANGGUNGJAWABAN",
  "BUKTI_PEMBAYARAN",
  "DOKUMENTASI_PELAKSANAAN",
  "BUKTI_TINDAK_LANJUT",
  "DOKUMEN_OUTPUT_AKTUAL",
  "BUKTI_VERIFIKASI",
]);

const EVIDENCE_ALLOWED_FIELDS = Object.freeze([
  "evidence_type",
  "evidence_title",
  "evidence_number",
  "evidence_date",
  "realization_period",
  "progress_percentage",
  "description",
]);

const EVIDENCE_BLOCKED_FIELDS = Object.freeze([
  "id",
  "mr_planning_monitoring_id",
  "mr_planning_mitigation_id",
  "mr_planning_risk_id",
  "context_id",

  "file_name",
  "original_file_name",
  "file_path",
  "file_url",
  "mime_type",
  "file_size",
  "storage_provider",
  "checksum",

  "status_bukti",
  "is_active",
  "uploaded_by",
  "uploaded_at",
  "cancelled_by",
  "cancelled_at",
  "cancel_reason",

  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

const createValidationError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.status = 400;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const createNotFoundError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.status = 404;
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

const safeTrim = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const normalizeDecimal = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw createValidationError("Nilai persentase tidak valid.", {
      value,
    });
  }

  return parsed;
};

const assertAllowedFields = (body = {}) => {
  const fields = Object.keys(body || {});

  const blocked = fields.filter((field) =>
    EVIDENCE_BLOCKED_FIELDS.includes(field)
  );

  const unknown = fields.filter(
    (field) =>
      !EVIDENCE_ALLOWED_FIELDS.includes(field) &&
      !EVIDENCE_BLOCKED_FIELDS.includes(field) &&
      field !== "entity_type"
  );

  if (blocked.length > 0) {
    throw createValidationError("Field bukti realisasi tidak diperbolehkan.", {
      fields: blocked,
    });
  }

  if (unknown.length > 0) {
    throw createValidationError("Field bukti realisasi tidak dikenal.", {
      fields: unknown,
    });
  }
};

const pickAllowedFields = (body = {}) => {
  return EVIDENCE_ALLOWED_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }

    return payload;
  }, {});
};

const validateEvidencePayload = (payload = {}) => {
  const missing = [];

  if (!safeTrim(payload.evidence_type)) missing.push("evidence_type");
  if (!safeTrim(payload.evidence_title)) missing.push("evidence_title");

  if (missing.length > 0) {
    throw createValidationError("Field wajib bukti realisasi belum lengkap.", {
      fields: missing,
    });
  }

  if (!EVIDENCE_TYPES.includes(payload.evidence_type)) {
    throw createValidationError("Jenis bukti realisasi tidak valid.", {
      evidence_type: payload.evidence_type,
      allowed: EVIDENCE_TYPES,
    });
  }

  const progress = normalizeDecimal(payload.progress_percentage, 0);

  if (progress < 0 || progress > 100) {
    throw createValidationError("Persentase progres harus berada antara 0 sampai 100.", {
      progress_percentage: progress,
    });
  }

  return {
    evidence_type: payload.evidence_type,
    evidence_title: safeTrim(payload.evidence_title),
    evidence_number: safeTrim(payload.evidence_number),
    evidence_date: safeTrim(payload.evidence_date),
    realization_period: safeTrim(payload.realization_period),
    progress_percentage: progress,
    description: safeTrim(payload.description),
  };
};

const safeUnlink = (filePath) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Tidak throw agar error utama tetap dikembalikan ke caller.
  }
};

const buildChecksum = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
};

const buildRelativeFilePath = (filePath) => {
  if (!filePath) return null;

  const backendRoot = path.resolve(__dirname, "..", "..");
  const absolutePath = path.resolve(filePath);

  return path.relative(backendRoot, absolutePath).replace(/\\/g, "/");
};

const resolveAbsoluteFilePath = (storedPath) => {
  if (!storedPath) return null;

  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }

  return path.resolve(__dirname, "..", "..", storedPath);
};

const evidenceInclude = () => [
  {
    model: MrPlanningMonitoring,
    as: "monitoring",
    required: false,
  },
  {
    model: MrPlanningMitigation,
    as: "mitigation",
    required: false,
  },
  {
    model: MrPlanningRisk,
    as: "risk",
    required: false,
  },
  {
    model: MrPlanningContext,
    as: "context",
    required: false,
  },
];

const getMonitoringOrThrow = async (monitoringId, transaction = null) => {
  const monitoring = await MrPlanningMonitoring.findByPk(monitoringId, {
    transaction,
    include: [
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
    ],
  });

  if (!monitoring) {
    throw createNotFoundError("Monitoring/Realisasi tidak ditemukan.", {
      mr_planning_monitoring_id: monitoringId,
    });
  }

  return monitoring;
};

const getEvidenceOrThrow = async (evidenceId, transaction = null) => {
  const evidence = await MrPlanningMonitoringEvidence.findByPk(evidenceId, {
    transaction,
    include: evidenceInclude(),
  });

  if (!evidence) {
    throw createNotFoundError("Bukti Realisasi tidak ditemukan.", {
      evidence_id: evidenceId,
    });
  }

  return evidence;
};

const toPublicEvidence = (record) => {
  const plain = toPlain(record);

  if (!plain) return null;

  return {
    id: plain.id,
    mr_planning_monitoring_id: plain.mr_planning_monitoring_id,
    mr_planning_mitigation_id: plain.mr_planning_mitigation_id,
    mr_planning_risk_id: plain.mr_planning_risk_id,
    context_id: plain.context_id,

    evidence_type: plain.evidence_type,
    evidence_title: plain.evidence_title,
    evidence_number: plain.evidence_number,
    evidence_date: plain.evidence_date,
    realization_period: plain.realization_period,
    progress_percentage: plain.progress_percentage,
    description: plain.description,

    file_name: plain.file_name,
    original_file_name: plain.original_file_name,
    file_url: plain.file_url,
    mime_type: plain.mime_type,
    file_size: plain.file_size,
    storage_provider: plain.storage_provider,

    status_bukti: plain.status_bukti,
    is_active: plain.is_active,
    uploaded_by: plain.uploaded_by,
    uploaded_at: plain.uploaded_at,
    cancelled_by: plain.cancelled_by,
    cancelled_at: plain.cancelled_at,
    cancel_reason: plain.cancel_reason,

    created_by: plain.created_by,
    updated_by: plain.updated_by,
    created_at: plain.created_at,
    updated_at: plain.updated_at,

    monitoring: plain.monitoring || undefined,
    mitigation: plain.mitigation || undefined,
    risk: plain.risk || undefined,
    context: plain.context || undefined,
  };
};

const uploadEvidence = async ({ monitoringId, body = {}, file, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    assertAllowedFields(body);

    if (!file) {
      throw createValidationError("File bukti realisasi wajib diunggah.", {
        field: "file",
      });
    }

    const evidencePayload = validateEvidencePayload(pickAllowedFields(body));

    const monitoring = await getMonitoringOrThrow(monitoringId, transaction);
    const plainMonitoring = toPlain(monitoring);

    const checksum = buildChecksum(file.path);
    const relativePath = buildRelativeFilePath(file.path);

    const created = await MrPlanningMonitoringEvidence.create(
      {
        ...evidencePayload,

        mr_planning_monitoring_id: plainMonitoring.id,
        mr_planning_mitigation_id:
          plainMonitoring.mr_planning_mitigation_id || null,
        mr_planning_risk_id: plainMonitoring.mr_planning_risk_id,
        context_id: plainMonitoring.context_id || null,

        file_name: file.filename,
        original_file_name: file.originalname,
        file_path: relativePath,
        file_url: null,
        mime_type: file.mimetype,
        file_size: file.size,
        storage_provider: "local",
        checksum,

        status_bukti: "aktif",
        is_active: true,
        uploaded_by: userId || null,
        uploaded_at: new Date(),

        created_by: userId || null,
        updated_by: userId || null,
      },
      { transaction }
    );

    await transaction.commit();

    const detail = await getEvidenceDetail(created.id);

    return {
      message: "Bukti Realisasi berhasil diunggah.",
      data: detail.data,
    };
  } catch (error) {
    await transaction.rollback();

    if (file?.path) {
      safeUnlink(file.path);
    }

    throw error;
  }
};

const getEvidencesByMonitoring = async (monitoringId) => {
  await getMonitoringOrThrow(monitoringId);

  const evidences = await MrPlanningMonitoringEvidence.findAll({
    where: {
      mr_planning_monitoring_id: monitoringId,
      is_active: true,
      status_bukti: "aktif",
    },
    include: evidenceInclude(),
    order: [
      ["uploaded_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  return {
    message: "Daftar Bukti Realisasi berhasil dimuat.",
    data: evidences.map(toPublicEvidence),
    meta: {
      mr_planning_monitoring_id: Number(monitoringId),
      total: evidences.length,
    },
  };
};

const getEvidenceDetail = async (evidenceId) => {
  const evidence = await getEvidenceOrThrow(evidenceId);

  return {
    message: "Detail Bukti Realisasi berhasil dimuat.",
    data: toPublicEvidence(evidence),
  };
};

const prepareEvidenceDownload = async ({ evidenceId, mode = "download" }) => {
  const evidence = await getEvidenceOrThrow(evidenceId);
  const plain = toPlain(evidence);

  if (!plain.is_active || plain.status_bukti !== "aktif") {
    throw createValidationError("Bukti Realisasi sudah dibatalkan.", {
      evidence_id: evidenceId,
      status_bukti: plain.status_bukti,
      is_active: plain.is_active,
    });
  }

  const absolutePath = resolveAbsoluteFilePath(plain.file_path);

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw createNotFoundError("File Bukti Realisasi tidak ditemukan di penyimpanan.", {
      evidence_id: evidenceId,
    });
  }

  const normalizedMode = mode === "view" ? "view" : "download";

  return {
    message:
      normalizedMode === "view"
        ? "Bukti Realisasi siap dilihat."
        : "Bukti Realisasi siap diunduh.",
    data: {
      evidence: toPublicEvidence(evidence),
      file_path: absolutePath,
      original_file_name: plain.original_file_name,
      mime_type: plain.mime_type || "application/octet-stream",
      mode: normalizedMode,
    },
  };
};

const cancelEvidence = async ({ evidenceId, body = {}, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const evidence = await MrPlanningMonitoringEvidence.findByPk(evidenceId, {
      transaction,
    });

    if (!evidence) {
      throw createNotFoundError("Bukti Realisasi tidak ditemukan.", {
        evidence_id: evidenceId,
      });
    }

    if (!evidence.is_active || evidence.status_bukti === "dibatalkan") {
      throw createValidationError("Bukti Realisasi sudah dibatalkan.", {
        evidence_id: evidenceId,
      });
    }

    const cancelReason = safeTrim(body.cancel_reason);

    if (!cancelReason) {
      throw createValidationError("Alasan pembatalan bukti realisasi wajib diisi.", {
        field: "cancel_reason",
      });
    }

    await evidence.update(
      {
        is_active: false,
        status_bukti: "dibatalkan",
        cancelled_by: userId || null,
        cancelled_at: new Date(),
        cancel_reason: cancelReason,
        updated_by: userId || null,
      },
      { transaction }
    );

    await transaction.commit();

    const detail = await getEvidenceDetail(evidenceId);

    return {
      message: "Bukti Realisasi berhasil dibatalkan.",
      data: detail.data,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  ERROR_CODE,
  EVIDENCE_TYPES,
  EVIDENCE_ALLOWED_FIELDS,
  EVIDENCE_BLOCKED_FIELDS,

  createValidationError,
  createNotFoundError,

  evidenceInclude,
  getMonitoringOrThrow,
  getEvidenceOrThrow,

  uploadEvidence,
  getEvidencesByMonitoring,
  getEvidenceDetail,
  prepareEvidenceDownload,
  cancelEvidence,
};