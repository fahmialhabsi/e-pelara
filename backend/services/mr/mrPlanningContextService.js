"use strict";

/**
 * MR Planning Context Service
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R13A
 * MR Planning Risk Source Selector & Context Item Auto Mapping Foundation
 *
 * Fokus:
 * - Tetap menjaga get context detail/list yang sudah hijau.
 * - Menambah endpoint list context items.
 * - Menambah generate context items dari sumber Renstra existing.
 * - Tidak membuat user mencari ID teknis manual.
 * - Tidak membuat indikator/target/pagu baru.
 * - Tidak masuk DOCX R14 sebelum alur input usulan risiko dari sumber Renstra hijau.
 */

const db = require("../../models");
const { assertFinalReportNotOverwrite } = require("./mrPolicyEngineService");

const {
  sequelize,
  Sequelize,
  MrPlanningContext,
  MrPlanningContextItem,
  MrPlanningContextStakeholder,
  MrPlanningRisk,
  MrPlanningRiskAnalysis,
  MrPlanningRootCause,
  MrPlanningMitigation,
  MrPlanningMonitoring,
  MrPlanningDeviation,
  MrPlanningApprovalMonitoring,
  MrPlanningWarning,
  MrReferenceItem,
} = db;

const { QueryTypes } = Sequelize;

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const createNotFoundError = (message, details = {}) => {
  const error = new Error(message);
  error.name = "MR_CONTEXT_NOT_FOUND";
  error.statusCode = 404;
  error.blocked = true;
  error.audit_mode = false;
  error.code = "MR_CONTEXT_NOT_FOUND";
  error.details = details;
  return error;
};

const createValidationError = (message, details = {}) => {
  const error = new Error(message);
  error.name = "MR_CONTEXT_VALIDATION_ERROR";
  error.statusCode = 400;
  error.blocked = true;
  error.audit_mode = false;
  error.code = "MR_CONTEXT_VALIDATION_ERROR";
  error.details = details;
  return error;
};

const createWorkflowError = (message, details = {}) => {
  const error = new Error(message);
  error.name = "MR_CONTEXT_WORKFLOW_ERROR";
  error.statusCode = 409;
  error.blocked = true;
  error.audit_mode = true;
  error.code = "MR_CONTEXT_WORKFLOW_ERROR";
  error.details = details;
  return error;
};

const CONTEXT_STATUS = {
  DRAFT: "draft",
  VERIFIKASI: "verifikasi",
  APPROVED: "approved",
  DITOLAK: "ditolak",
};

const REPORT_PERIOD_TYPES = {
  BULANAN: "bulanan",
  TRIWULAN: "triwulan",
  SEMESTER: "semester",
  TAHUNAN: "tahunan",
  ADHOC: "adhoc",
};

const normalizePeriodeType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (["bulan", "bulanan", "monthly"].includes(normalized)) {
    return REPORT_PERIOD_TYPES.BULANAN;
  }

  if (["triwulan", "triwulanan", "tw", "quarter", "quarterly"].includes(normalized)) {
    return REPORT_PERIOD_TYPES.TRIWULAN;
  }

  if (["semester", "semesteran"].includes(normalized)) {
    return REPORT_PERIOD_TYPES.SEMESTER;
  }

  if (["tahun", "tahunan", "annual", "yearly"].includes(normalized)) {
    return REPORT_PERIOD_TYPES.TAHUNAN;
  }

  if (["adhoc", "ad_hoc", "lainnya"].includes(normalized)) {
    return REPORT_PERIOD_TYPES.ADHOC;
  }

  return normalized;
};

const isFallbackOpdName = (value) => {
  const text = String(value || "").trim().toLowerCase();

  if (!text) return true;

  return /^opd\s+\d+$/i.test(text) || text === "opd" || text === "belum diisi";
};

const isSmokeFixtureContext = (context) => {
  const plain = normalizePlain(context);
  const metadata = plain?.metadata_json || {};
  const source = String(metadata?.source || "").toLowerCase();
  const generatedBy = String(metadata?.generated_by || "").toLowerCase();
  const note = String(metadata?.note || plain?.risk_appetite_note || "").toLowerCase();
  const alasan = String(plain?.alasan_revisi || "").toLowerCase();

  return (
    source.includes("smoke_fixture") ||
    generatedBy.includes("smoke_fixture") ||
    note.includes("smoke fixture") ||
    alasan.includes("smoke fixture") ||
    alasan.includes("create context smoke fixture")
  );
};

const isValidReportContext = (context) => {
  const plain = normalizePlain(context);

  if (!plain) return false;
  if (isSmokeFixtureContext(plain)) return false;
  if (isFallbackOpdName(plain.nama_opd)) return false;

  return true;
};

const buildPeriodeLabel = ({ periodeType, tahun, bulan = null, triwulan = null, semester = null }) => {
  if (periodeType === REPORT_PERIOD_TYPES.BULANAN) {
    const monthNames = [
      null,
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const monthNumber = parsePositiveInt(bulan);
    const monthLabel = monthNames[monthNumber] || "Bulan";
    return `${monthLabel} ${tahun}`;
  }

  if (periodeType === REPORT_PERIOD_TYPES.TRIWULAN) {
    const q = parsePositiveInt(triwulan);
    const roman = {
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
    };

    return `Triwulan ${roman[q] || q || ""} ${tahun}`.trim();
  }

  if (periodeType === REPORT_PERIOD_TYPES.SEMESTER) {
    const s = parsePositiveInt(semester);
    const roman = {
      1: "I",
      2: "II",
    };

    return `Semester ${roman[s] || s || ""} ${tahun}`.trim();
  }

  if (periodeType === REPORT_PERIOD_TYPES.TAHUNAN) {
    return `Tahun ${tahun}`;
  }

  return `Adhoc ${tahun}`;
};

const getResolvedOpdNameFromExistingContext = async ({ opdId, tahun, transaction = null }) => {
  if (!opdId) return null;

  const existing = await MrPlanningContext.findOne({
    where: {
      opd_id: opdId,
      tahun,
      is_active: true,
    },
    order: [["id", "DESC"]],
    transaction,
  });

  const plain = normalizePlain(existing);

  if (plain?.nama_opd && !isFallbackOpdName(plain.nama_opd)) {
    return plain.nama_opd;
  }

  return null;
};

const getContextStatus = (context) => {
  const plain = normalizePlain(context);
  return String(plain?.status_revisi || "").trim().toLowerCase();
};

const assertContextWorkflowStatus = ({
  context,
  allowedStatuses = [],
  action = "workflow",
}) => {
  const currentStatus = getContextStatus(context);

  if (!allowedStatuses.includes(currentStatus)) {
    throw createWorkflowError(
      `Context tidak dapat diproses untuk aksi ${action} karena status saat ini adalah ${currentStatus || "tidak diketahui"}.`,
      {
        action,
        current_status: currentStatus,
        allowed_statuses: allowedStatuses,
      }
    );
  }
};

const buildWorkflowAuditMetadata = ({
  currentMetadata = null,
  action,
  userId,
  note,
}) => {
  const base =
    currentMetadata && typeof currentMetadata === "object" && !Array.isArray(currentMetadata)
      ? currentMetadata
      : {};

  const workflowLogs = Array.isArray(base.workflow_logs)
    ? base.workflow_logs
    : [];

  return {
    ...base,
    workflow_logs: [
      ...workflowLogs,
      {
        action,
        user_id: userId || null,
        note: note || null,
        at: new Date().toISOString(),
      },
    ],
  };
};

const contextDetailInclude = [
  {
    model: MrReferenceItem,
    as: "selera_risiko_ref",
    required: false,
  },
  {
    model: MrPlanningContextItem,
    as: "items",
    required: false,
  },
  {
    model: MrPlanningContextStakeholder,
    as: "stakeholders",
    required: false,
  },
  {
    model: MrPlanningRisk,
    as: "risks",
    required: false,
  },
  {
    model: MrPlanningRiskAnalysis,
    as: "risk_analyses",
    required: false,
  },
  {
    model: MrPlanningRootCause,
    as: "root_causes",
    required: false,
  },
  {
    model: MrPlanningMitigation,
    as: "mitigations",
    required: false,
  },
  {
    model: MrPlanningMonitoring,
    as: "monitorings",
    required: false,
  },
  {
    model: MrPlanningDeviation,
    as: "deviations",
    required: false,
  },
  {
    model: MrPlanningApprovalMonitoring,
    as: "approvals",
    required: false,
  },
  {
    model: MrPlanningWarning,
    as: "warnings",
    required: false,
  },
];

const RENSTRA_STAGE_SOURCES = [
  {
    stage: "tujuan",
    table: "renstra_tabel_tujuan",
    refCandidates: ["tujuan_id", "id"],
    codeCandidates: ["kode_tujuan", "kode"],
    nameCandidates: ["nama_tujuan", "tujuan", "uraian_tujuan", "deskripsi_tujuan"],
  },
  {
    stage: "sasaran",
    table: "renstra_tabel_sasaran",
    refCandidates: ["sasaran_id", "id"],
    codeCandidates: ["kode_sasaran", "kode"],
    nameCandidates: ["nama_sasaran", "sasaran", "uraian_sasaran", "deskripsi_sasaran"],
  },
  {
    stage: "strategi",
    table: "renstra_tabel_strategi",
    refCandidates: ["strategi_id", "id"],
    codeCandidates: ["kode_strategi", "kode"],
    nameCandidates: ["nama_strategi", "strategi", "uraian_strategi", "deskripsi_strategi"],
  },
  {
    stage: "kebijakan",
    table: "renstra_tabel_arah_kebijakan",
    refCandidates: ["kebijakan_id", "arah_kebijakan_id", "id"],
    codeCandidates: ["kode_kebijakan", "kode_arah_kebijakan", "kode"],
    nameCandidates: [
      "nama_kebijakan",
      "nama_arah_kebijakan",
      "arah_kebijakan",
      "kebijakan",
      "uraian_kebijakan",
      "deskripsi_kebijakan",
    ],
  },
  {
    stage: "program",
    table: "renstra_tabel_program",
    refCandidates: ["program_id", "id"],
    codeCandidates: ["kode_program", "kode"],
    nameCandidates: ["nama_program", "program", "uraian_program", "deskripsi_program"],
  },
  {
    stage: "kegiatan",
    table: "renstra_tabel_kegiatan",
    refCandidates: ["kegiatan_id", "id"],
    codeCandidates: ["kode_kegiatan", "kode"],
    nameCandidates: ["nama_kegiatan", "kegiatan", "uraian_kegiatan", "deskripsi_kegiatan"],
  },
  {
    stage: "sub_kegiatan",
    table: "renstra_tabel_subkegiatan",
    refCandidates: ["sub_kegiatan_id", "subkegiatan_id", "id"],
    codeCandidates: ["kode_sub_kegiatan", "kode_subkegiatan", "kode"],
    nameCandidates: [
      "nama_sub_kegiatan",
      "nama_subkegiatan",
      "sub_kegiatan",
      "subkegiatan",
      "uraian_sub_kegiatan",
      "deskripsi_sub_kegiatan",
    ],
  },
];

const tableColumnsCache = new Map();

const getTableColumns = async (tableName, transaction = null) => {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const rows = await sequelize.query(
    `
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { tableName },
      transaction,
    }
  );

  const columns = rows.map((row) => row.COLUMN_NAME);
  tableColumnsCache.set(tableName, columns);
  return columns;
};

const hasColumn = (columns, columnName) => columns.includes(columnName);

const firstExistingColumn = (columns, candidates = []) => {
  return candidates.find((columnName) => hasColumn(columns, columnName)) || null;
};

const sqlValue = (alias, columnName, outputAlias, fallback = "NULL") => {
  if (!columnName) {
    return `${fallback} AS ${outputAlias}`;
  }

  return `${alias}.\`${columnName}\` AS ${outputAlias}`;
};

const hasModelAttr = (model, attrName) => {
  return Boolean(model?.rawAttributes?.[attrName]);
};

const getContextItemContextField = () => {
  if (hasModelAttr(MrPlanningContextItem, "mr_planning_context_id")) {
    return "mr_planning_context_id";
  }

  if (hasModelAttr(MrPlanningContextItem, "context_id")) {
    return "context_id";
  }

  return "mr_planning_context_id";
};

const pickModelPayload = (model, payload) => {
  const attrs = model?.rawAttributes || {};
  return Object.keys(payload).reduce((acc, key) => {
    if (attrs[key] !== undefined && payload[key] !== undefined) {
      acc[key] = payload[key];
    }
    return acc;
  }, {});
};

const normalizePlain = (instanceOrPlain) => {
  if (!instanceOrPlain) {
    return null;
  }

  if (typeof instanceOrPlain.get === "function") {
    return instanceOrPlain.get({ plain: true });
  }

  return instanceOrPlain;
};

const getContextOrThrow = async (id, options = {}) => {
  const contextId = parsePositiveInt(id);

  if (!contextId) {
    throw createValidationError("ID context tidak valid.", {
      field: "id",
    });
  }

  const context = await MrPlanningContext.findByPk(contextId, options);

  if (!context) {
    throw createNotFoundError("MR planning context tidak ditemukan.", {
      id: contextId,
    });
  }

  return context;
};

const getContextDetail = async (id) => {
  const context = await getContextOrThrow(id, {
    include: contextDetailInclude,
  });

  return context;
};

const getContexts = async (query = {}) => {
  const limit = parsePositiveInt(query.limit) || 25;
  const page = parsePositiveInt(query.page) || 1;
  const offset = (page - 1) * limit;

  const where = {};

  const tahun = parsePositiveInt(query.tahun);
  if (tahun) {
    where.tahun = tahun;
  }

  if (query.periode_type) {
    where.periode_type = query.periode_type;
  }

  if (query.jenis_dokumen) {
    where.jenis_dokumen = query.jenis_dokumen;
  }

  const rows = await MrPlanningContext.findAndCountAll({
    where,
    limit,
    offset,
    order: [["id", "DESC"]],
    include: [
      {
        model: MrPlanningContextItem,
        as: "items",
        required: false,
        limit: 5,
      },
      {
        model: MrPlanningRisk,
        as: "risks",
        required: false,
        limit: 5,
      },
    ],
    distinct: true,
  });

  return {
    rows: rows.rows,
    meta: {
      total: rows.count,
      page,
      limit,
      total_pages: Math.ceil(rows.count / limit),
    },
  };
};

const createReportPeriodContext = async ({ payload = {}, userId = null } = {}) => {
  const tahun = parsePositiveInt(payload.tahun);
  const opdId = parsePositiveInt(payload.opd_id);
  const periodeType = normalizePeriodeType(payload.periode_type || "tahunan");

  if (!tahun) {
    throw createValidationError("Tahun laporan wajib diisi dan harus valid.", {
      field: "tahun",
    });
  }

  if (!opdId) {
    throw createValidationError("OPD laporan wajib diisi dan harus valid.", {
      field: "opd_id",
    });
  }

  if (!Object.values(REPORT_PERIOD_TYPES).includes(periodeType)) {
    throw createValidationError("Tipe periode laporan tidak valid.", {
      field: "periode_type",
      allowed_values: Object.values(REPORT_PERIOD_TYPES),
    });
  }

  return sequelize.transaction(async (transaction) => {
    const resolvedOpdName =
      String(payload.nama_opd || "").trim() ||
      (await getResolvedOpdNameFromExistingContext({
        opdId,
        tahun,
        transaction,
      }));

    if (!resolvedOpdName || isFallbackOpdName(resolvedOpdName)) {
      throw createValidationError(
        "Nama OPD laporan belum valid. Context laporan resmi tidak boleh memakai nama fallback seperti OPD 1.",
        {
          field: "nama_opd",
          opd_id: opdId,
          nama_opd: resolvedOpdName || null,
        }
      );
    }

    const periodeLabel =
      String(payload.periode_label || "").trim() ||
      buildPeriodeLabel({
        periodeType,
        tahun,
        bulan: payload.bulan,
        triwulan: payload.triwulan,
        semester: payload.semester,
      });

    const existingContext = await MrPlanningContext.findOne({
      where: {
        tahun,
        opd_id: opdId,
        periode_type: periodeType,
        periode_label: periodeLabel,
        is_active: true,
      },
      order: [["id", "DESC"]],
      transaction,
    });

    if (existingContext && isValidReportContext(existingContext)) {
      return {
        created: false,
        context: existingContext,
        report_context_ready: true,
        report_context_warning: null,
      };
    }

    const metadataJson = {
      ...(payload.metadata_json && typeof payload.metadata_json === "object"
        ? payload.metadata_json
        : {}),
      generated_by: "report_period_context_builder",
      report_context_builder_step: "R17C-3B",
      report_context_type: "laporan_periodik_resmi",
      report_scope_mode: "unified",
      created_from: "mr_planning_context_report_period_endpoint",
    };

    const createPayload = pickModelPayload(MrPlanningContext, {
      periode_id: payload.periode_id || null,
      tahun,
      periode_type: periodeType,
      periode_label: periodeLabel,
      periode_awal: payload.periode_awal || null,
      periode_akhir: payload.periode_akhir || null,
      periode_penerapan: payload.periode_penerapan || null,

      jenis_dokumen: payload.jenis_dokumen || "laporan_terpadu",
      renstra_id: payload.renstra_id || null,
      opd_id: opdId,
      nama_opd: resolvedOpdName,

      pemilik_risiko_user_id: payload.pemilik_risiko_user_id || null,
      nama_pemilik_risiko: payload.nama_pemilik_risiko || null,
      jabatan_pemilik_risiko: payload.jabatan_pemilik_risiko || null,
      koordinator_user_id: payload.koordinator_user_id || null,
      nama_koordinator: payload.nama_koordinator || null,
      jabatan_koordinator: payload.jabatan_koordinator || null,

      owner_user_id: payload.owner_user_id || userId || null,
      owner_division_id: payload.owner_division_id || null,
      nama_unit_kerja: payload.nama_unit_kerja || null,

      selera_risiko_ref_id: payload.selera_risiko_ref_id || null,
      selera_risiko: payload.selera_risiko || null,
      risk_appetite_note:
        payload.risk_appetite_note ||
        `Context laporan periodik resmi ${periodeLabel} ${resolvedOpdName}.`,

      status_revisi: CONTEXT_STATUS.DRAFT,
      versi: 1,
      alasan_revisi:
        payload.alasan_revisi ||
        `Create context laporan periodik resmi ${periodeLabel} ${resolvedOpdName}.`,

      last_revised_at: new Date(),
      last_revised_by: userId || payload.created_by || null,
      dibuat_oleh: userId || payload.created_by || null,
      dibuat_pada: new Date(),

      is_active: true,
      is_locked: false,
      metadata_json: metadataJson,

      created_by: userId || payload.created_by || null,
      updated_by: userId || payload.updated_by || null,
    });

    const createdContext = await MrPlanningContext.create(createPayload, {
      transaction,
    });

    return {
      created: true,
      context: createdContext,
      report_context_ready: true,
      report_context_warning: null,
    };
  });
};

const getContextItems = async (contextId) => {
  const context = await getContextOrThrow(contextId);
  const parsedContextId = parsePositiveInt(context.id);
  const contextField = getContextItemContextField();

  const items = await MrPlanningContextItem.findAll({
    where: {
      [contextField]: parsedContextId,
    },
    order: [
      ["stage", "ASC"],
      ["id", "ASC"],
    ],
  });

  return items;
};

const buildStageRowsQuery = async ({ context, source, transaction }) => {
  const contextPlain = normalizePlain(context);
  const renstraId = parsePositiveInt(contextPlain.renstra_id);
  const opdId = parsePositiveInt(contextPlain.opd_id);

  const sourceColumns = await getTableColumns(source.table, transaction);

  if (!sourceColumns.length) {
    return null;
  }

  const indikatorColumns = await getTableColumns("indikator_renstra", transaction);

  const refColumn = firstExistingColumn(sourceColumns, source.refCandidates);
  const codeColumn = firstExistingColumn(sourceColumns, source.codeCandidates);
  const nameColumn = firstExistingColumn(sourceColumns, source.nameCandidates);

  const indikatorColumn = hasColumn(sourceColumns, "indikator_id") ? "indikator_id" : null;
  const sourceRenstraColumn = hasColumn(sourceColumns, "renstra_id") ? "renstra_id" : null;
  const sourceOpdColumn = hasColumn(sourceColumns, "opd_id") ? "opd_id" : null;
  const statusColumn = hasColumn(sourceColumns, "status_revisi") ? "status_revisi" : null;

  if (!refColumn || !indikatorColumn) {
    return null;
  }

  const indikatorKodeColumn = firstExistingColumn(indikatorColumns, [
    "kode_indikator",
    "kode",
    "kode_ref",
  ]);

  const indikatorNamaColumn = firstExistingColumn(indikatorColumns, [
    "nama_indikator",
    "indikator",
    "uraian_indikator",
    "deskripsi_indikator",
    "nama",
  ]);

  const indikatorSatuanColumn = firstExistingColumn(indikatorColumns, [
    "satuan",
    "satuan_target",
    "unit",
  ]);

  const baselineColumn = firstExistingColumn(sourceColumns, [
    "baseline",
    "baseline_target",
    "target_awal",
  ]);

  const satuanTargetColumn = firstExistingColumn(sourceColumns, [
    "satuan_target",
    "satuan",
    "unit",
  ]);

  const targetColumns = [1, 2, 3, 4, 5, 6].reduce((acc, tahunKe) => {
    const column = firstExistingColumn(sourceColumns, [
      `target_tahun_${tahunKe}`,
      `target_th${tahunKe}`,
      `target_${tahunKe}`,
    ]);

    acc[`target_tahun_${tahunKe}`] = column;
    return acc;
  }, {});

  const whereParts = [];
  const replacements = {
    stage: source.stage,
    renstraId,
    opdId,
  };

  if (sourceRenstraColumn && renstraId) {
    whereParts.push(`r.\`${sourceRenstraColumn}\` = :renstraId`);
  } else if (sourceOpdColumn && opdId) {
    whereParts.push(`r.\`${sourceOpdColumn}\` = :opdId`);
  }

  if (statusColumn) {
    whereParts.push(`LOWER(COALESCE(r.\`${statusColumn}\`, '')) IN ('approved', 'disetujui')`);
  }

  if (hasColumn(indikatorColumns, "stage")) {
    whereParts.push(`LOWER(COALESCE(i.\`stage\`, '')) = :stage`);
  }

  if (hasColumn(indikatorColumns, "ref_id")) {
    whereParts.push(`i.\`ref_id\` = r.\`${refColumn}\``);
  }

  if (hasColumn(indikatorColumns, "renstra_id") && renstraId) {
    whereParts.push(`i.\`renstra_id\` = :renstraId`);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const selectFields = [
    `'${source.stage}' AS stage`,
    `r.\`${refColumn}\` AS ref_id`,
    `r.\`${indikatorColumn}\` AS indikator_id`,
    sqlValue("r", sourceRenstraColumn, "renstra_id"),
    sqlValue("r", sourceOpdColumn, "opd_id"),
    sqlValue("r", codeColumn, "kode_konteks"),
    sqlValue("r", nameColumn, "nama_konteks"),
    sqlValue("i", indikatorKodeColumn, "kode_indikator"),
    sqlValue("i", indikatorNamaColumn, "nama_indikator"),
    sqlValue("i", indikatorSatuanColumn, "satuan_indikator"),
    sqlValue("r", satuanTargetColumn, "satuan_target"),
    sqlValue("r", baselineColumn, "baseline"),
    sqlValue("r", targetColumns.target_tahun_1, "target_tahun_1"),
    sqlValue("r", targetColumns.target_tahun_2, "target_tahun_2"),
    sqlValue("r", targetColumns.target_tahun_3, "target_tahun_3"),
    sqlValue("r", targetColumns.target_tahun_4, "target_tahun_4"),
    sqlValue("r", targetColumns.target_tahun_5, "target_tahun_5"),
    sqlValue("r", targetColumns.target_tahun_6, "target_tahun_6"),
  ];

  return {
    sql: `
      SELECT
        ${selectFields.join(",\n        ")}
      FROM \`${source.table}\` r
      LEFT JOIN \`indikator_renstra\` i
        ON i.\`id\` = r.\`${indikatorColumn}\`
      ${whereSql}
      ORDER BY r.\`${refColumn}\` ASC, r.\`${indikatorColumn}\` ASC
    `,
    replacements,
  };
};

const buildContextItemPayload = ({ context, row, userId }) => {
  const contextPlain = normalizePlain(context);
  const contextField = getContextItemContextField();

  const payload = {
    [contextField]: contextPlain.id,

    periode_id: contextPlain.periode_id || null,
    tahun: contextPlain.tahun || null,
    jenis_dokumen: contextPlain.jenis_dokumen || null,
    renstra_id: contextPlain.renstra_id || row.renstra_id || null,
    opd_id: contextPlain.opd_id || row.opd_id || null,

    stage: row.stage,
    ref_id: row.ref_id,
    indikator_id: row.indikator_id,

    source_table: "indikator_renstra",
    source_id: row.indikator_id,

    kode_konteks: row.kode_konteks,
    nama_konteks: row.nama_konteks,

    kode_indikator: row.kode_indikator,
    nama_indikator: row.nama_indikator,
    satuan: row.satuan_indikator || row.satuan_target,
    satuan_target: row.satuan_target || row.satuan_indikator,

    baseline: row.baseline,
    target_tahun_1: row.target_tahun_1,
    target_tahun_2: row.target_tahun_2,
    target_tahun_3: row.target_tahun_3,
    target_tahun_4: row.target_tahun_4,
    target_tahun_5: row.target_tahun_5,
    target_tahun_6: row.target_tahun_6,

    is_primary: false,

    created_by: userId || contextPlain.owner_user_id || null,
    updated_by: userId || contextPlain.owner_user_id || null,
  };

  return pickModelPayload(MrPlanningContextItem, payload);
};

const findExistingContextItem = async ({ contextId, row, transaction }) => {
  const contextField = getContextItemContextField();

  const where = {
    [contextField]: contextId,
    stage: row.stage,
    ref_id: row.ref_id,
    indikator_id: row.indikator_id,
  };

  return MrPlanningContextItem.findOne({
    where,
    transaction,
  });
};

const submitContext = async (contextId, options = {}) => {
  const parsedContextId = parsePositiveInt(contextId);

  if (!parsedContextId) {
    throw createValidationError("ID context tidak valid.", {
      field: "contextId",
    });
  }

  const userId = parsePositiveInt(options.userId);
  const note = options.note || options.alasan || null;

  return sequelize.transaction(async (transaction) => {
    const context = await getContextOrThrow(parsedContextId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    assertContextWorkflowStatus({
      context,
      allowedStatuses: [CONTEXT_STATUS.DRAFT, CONTEXT_STATUS.DITOLAK],
      action: "submit",
    });

    const now = new Date();
    const contextPlain = normalizePlain(context);

    await context.update(
      pickModelPayload(MrPlanningContext, {
        status_revisi: CONTEXT_STATUS.VERIFIKASI,
        alasan_revisi: note || contextPlain.alasan_revisi || null,
        dibuat_oleh: contextPlain.dibuat_oleh || userId || null,
        dibuat_pada: contextPlain.dibuat_pada || now,
        last_revised_by: userId || contextPlain.last_revised_by || null,
        last_revised_at: now,
        updated_by: userId || contextPlain.updated_by || null,
        is_locked: false,
        metadata_json: buildWorkflowAuditMetadata({
          currentMetadata: contextPlain.metadata_json,
          action: "submit",
          userId,
          note,
        }),
      }),
      { transaction }
    );

    return getContextOrThrow(parsedContextId, {
      transaction,
    });
  });
};

const verifyContext = async (contextId, options = {}) => {
  const parsedContextId = parsePositiveInt(contextId);

  if (!parsedContextId) {
    throw createValidationError("ID context tidak valid.", {
      field: "contextId",
    });
  }

  const userId = parsePositiveInt(options.userId);
  const note = options.note || options.catatan_verifikasi || null;

  return sequelize.transaction(async (transaction) => {
    const context = await getContextOrThrow(parsedContextId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    assertContextWorkflowStatus({
      context,
      allowedStatuses: [CONTEXT_STATUS.VERIFIKASI],
      action: "verify",
    });

    const now = new Date();
    const contextPlain = normalizePlain(context);

    await context.update(
      pickModelPayload(MrPlanningContext, {
        status_revisi: CONTEXT_STATUS.VERIFIKASI,
        diverifikasi_oleh: userId || contextPlain.diverifikasi_oleh || null,
        diverifikasi_pada: now,
        last_revised_by: userId || contextPlain.last_revised_by || null,
        last_revised_at: now,
        updated_by: userId || contextPlain.updated_by || null,
        metadata_json: buildWorkflowAuditMetadata({
          currentMetadata: contextPlain.metadata_json,
          action: "verify",
          userId,
          note,
        }),
      }),
      { transaction }
    );

    return getContextOrThrow(parsedContextId, {
      transaction,
    });
  });
};

const approveContext = async (contextId, options = {}) => {
  const parsedContextId = parsePositiveInt(contextId);

  if (!parsedContextId) {
    throw createValidationError("ID context tidak valid.", {
      field: "contextId",
    });
  }

  const userId = parsePositiveInt(options.userId);
  const note = options.note || options.catatan_persetujuan || null;

  return sequelize.transaction(async (transaction) => {
    const context = await getContextOrThrow(parsedContextId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    assertContextWorkflowStatus({
      context,
      allowedStatuses: [CONTEXT_STATUS.VERIFIKASI],
      action: "approve",
    });

    const contextPlain = normalizePlain(context);
    assertFinalReportNotOverwrite({
      is_final: !!contextPlain.is_locked || !!contextPlain.is_final,
      is_correction_mode: !!options.is_correction_mode,
    });

    if (!contextPlain.diverifikasi_oleh || !contextPlain.diverifikasi_pada) {
      throw createWorkflowError(
        "Context belum diverifikasi sehingga belum dapat disetujui.",
        {
          context_id: parsedContextId,
          current_status: contextPlain.status_revisi,
          diverifikasi_oleh: contextPlain.diverifikasi_oleh,
          diverifikasi_pada: contextPlain.diverifikasi_pada,
        }
      );
    }

    const now = new Date();

    await context.update(
      pickModelPayload(MrPlanningContext, {
        status_revisi: CONTEXT_STATUS.APPROVED,
        disetujui_oleh: userId || contextPlain.disetujui_oleh || null,
        disetujui_pada: now,
        last_revised_by: userId || contextPlain.last_revised_by || null,
        last_revised_at: now,
        updated_by: userId || contextPlain.updated_by || null,
        is_locked: true,
        locked_by: userId || contextPlain.locked_by || null,
        locked_at: now,
        metadata_json: buildWorkflowAuditMetadata({
          currentMetadata: contextPlain.metadata_json,
          action: "approve",
          userId,
          note,
        }),
      }),
      { transaction }
    );

    return getContextOrThrow(parsedContextId, {
      transaction,
    });
  });
};

const rejectContext = async (contextId, options = {}) => {
  const parsedContextId = parsePositiveInt(contextId);

  if (!parsedContextId) {
    throw createValidationError("ID context tidak valid.", {
      field: "contextId",
    });
  }

  const userId = parsePositiveInt(options.userId);
  const reason = options.reason || options.alasan_penolakan || options.note || null;

  if (!reason || !String(reason).trim()) {
    throw createValidationError("Alasan penolakan context wajib diisi.", {
      field: "reason",
    });
  }

  return sequelize.transaction(async (transaction) => {
    const context = await getContextOrThrow(parsedContextId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    assertContextWorkflowStatus({
      context,
      allowedStatuses: [CONTEXT_STATUS.VERIFIKASI],
      action: "reject",
    });

    const now = new Date();
    const contextPlain = normalizePlain(context);

    await context.update(
      pickModelPayload(MrPlanningContext, {
        status_revisi: CONTEXT_STATUS.DITOLAK,
        alasan_revisi: reason,
        ditolak_oleh: userId || contextPlain.ditolak_oleh || null,
        ditolak_pada: now,
        last_revised_by: userId || contextPlain.last_revised_by || null,
        last_revised_at: now,
        updated_by: userId || contextPlain.updated_by || null,
        is_locked: false,
        metadata_json: buildWorkflowAuditMetadata({
          currentMetadata: contextPlain.metadata_json,
          action: "reject",
          userId,
          note: reason,
        }),
      }),
      { transaction }
    );

    return getContextOrThrow(parsedContextId, {
      transaction,
    });
  });
};

const generateContextItems = async (contextId, options = {}) => {
  const parsedContextId = parsePositiveInt(contextId);

  if (!parsedContextId) {
    throw createValidationError("ID context tidak valid.", {
      field: "contextId",
    });
  }

  const userId = parsePositiveInt(options.userId);

  return sequelize.transaction(async (transaction) => {
    const context = await getContextOrThrow(parsedContextId, {
      transaction,
    });

    const contextPlain = normalizePlain(context);

    if (!parsePositiveInt(contextPlain.renstra_id) && !parsePositiveInt(contextPlain.opd_id)) {
      throw createValidationError(
        "Context belum memiliki renstra_id atau opd_id sehingga context item tidak dapat digenerate.",
        {
          context_id: parsedContextId,
          renstra_id: contextPlain.renstra_id,
          opd_id: contextPlain.opd_id,
        }
      );
    }

    const created = [];
    const skipped = [];
    const unavailableStages = [];

    for (const source of RENSTRA_STAGE_SOURCES) {
      const queryConfig = await buildStageRowsQuery({
        context,
        source,
        transaction,
      });

      if (!queryConfig) {
        unavailableStages.push({
          stage: source.stage,
          table: source.table,
          reason: "Tabel/kolom sumber Renstra tidak lengkap atau tidak tersedia.",
        });
        continue;
      }

      const rows = await sequelize.query(queryConfig.sql, {
        type: QueryTypes.SELECT,
        replacements: queryConfig.replacements,
        transaction,
      });

      for (const row of rows) {
        const normalizedRow = {
          ...row,
          ref_id: parsePositiveInt(row.ref_id),
          indikator_id: parsePositiveInt(row.indikator_id),
        };

        if (!normalizedRow.ref_id || !normalizedRow.indikator_id) {
          skipped.push({
            stage: source.stage,
            ref_id: row.ref_id,
            indikator_id: row.indikator_id,
            reason: "ref_id atau indikator_id tidak valid.",
          });
          continue;
        }

        const existing = await findExistingContextItem({
          contextId: parsedContextId,
          row: normalizedRow,
          transaction,
        });

        if (existing) {
          skipped.push({
            stage: normalizedRow.stage,
            ref_id: normalizedRow.ref_id,
            indikator_id: normalizedRow.indikator_id,
            reason: "Context item sudah ada.",
          });
          continue;
        }

        const payload = buildContextItemPayload({
          context,
          row: normalizedRow,
          userId,
        });

        const item = await MrPlanningContextItem.create(payload, {
          transaction,
        });

        created.push(item);
      }
    }

    const items = await MrPlanningContextItem.findAll({
      where: {
        [getContextItemContextField()]: parsedContextId,
      },
      order: [
        ["stage", "ASC"],
        ["id", "ASC"],
      ],
      transaction,
    });

    return {
      context_id: parsedContextId,
      created_count: created.length,
      skipped_count: skipped.length,
      unavailable_stages: unavailableStages,
      skipped,
      items,
    };
  });
};

module.exports = {
  getContextDetail,
  getContexts,
  getContextItems,
  generateContextItems,
  createReportPeriodContext,

  submitContext,
  verifyContext,
  approveContext,
  rejectContext,
};
