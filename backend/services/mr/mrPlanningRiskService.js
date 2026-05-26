// backend/services/mr/mrPlanningRiskService.js
"use strict";

/**
 * MR Planning Risk Service
 *
 * PHASE 4 — STEP 10A
 * Backend Service Foundation untuk MR Planning Risk berbasis Context.
 *
 * Guard:
 * - Risk baru wajib berbasis context_id.
 * - Frontend tidak boleh mengirim ID teknis manual.
 * - Backend mapping field teknis dari mr_planning_context dan mr_planning_context_item.
 * - Backend lookup likelihood/impact ke mr_reference_items.
 * - Backend lookup skor/level/appetite ke mr_risk_matrix.
 * - Backend membuat history setiap create/update workflow.
 */

const db = require("../../models");
const { assertFinalReportNotOverwrite } = require("./mrPolicyEngineService");
const { QueryTypes } = require("sequelize");

const {
  sequelize,
  MrPlanningRisk,
  MrPlanningRiskHistory,
  MrPlanningContext,
  MrPlanningContextItem,
  MrReferenceItem,
  MrRiskMatrix,
} = db;

const USER_INPUT_FIELDS = [
  "nama_risiko",
  "uraian_risiko",
  "risk_statement",
  "kategori_risiko_ref_id",
  "sumber_risiko_ref_id",
  "penyebab_risiko",
  "dampak_risiko",
  "kemungkinan_ref_id",
  "dampak_ref_id",
  "selera_risiko_ref_id",
  "status_risiko_ref_id",
  "metode_pencapaian_tujuan_spip",
  "alasan_revisi",
];

/**
 * STEP R13A:
 * context_item_id bukan field bisnis risk register, tetapi selector sumber
 * perencanaan. Frontend boleh mengirim field ini agar backend mengambil
 * stage/ref_id/indikator_id dari context item terpilih.
 */
const CONTEXT_SELECTOR_FIELDS = [
  "context_item_id",
];

const PROPOSAL_SOURCE = {
  RENSTRA: "RENSTRA",
  LAKIP: "LAKIP",
  LAPORAN_KEUANGAN: "LAPORAN_KEUANGAN",
  TINDAK_LANJUT_BPK: "TINDAK_LANJUT_BPK",
  TINDAK_LANJUT_INSPEKTORAT: "TINDAK_LANJUT_INSPEKTORAT",
  PELAKSANAAN_KEGIATAN: "PELAKSANAAN_KEGIATAN",
  PERTANGGUNGJAWABAN_KEUANGAN: "PERTANGGUNGJAWABAN_KEUANGAN",
  SPIP_E_SIGAP: "SPIP_E_SIGAP",
  MANUAL_ADHOC: "MANUAL_ADHOC",
  LAINNYA: "LAINNYA",
};

const PROPOSAL_SOURCE_TO_STAGE = {
  LAKIP: "lakip",
  LAPORAN_KEUANGAN: "lk",
  TINDAK_LANJUT_BPK: "temuan_bpk",
  TINDAK_LANJUT_INSPEKTORAT: "temuan_inspektorat",
  PELAKSANAAN_KEGIATAN: "pelaksanaan_kegiatan",
  PERTANGGUNGJAWABAN_KEUANGAN: "pertanggungjawaban_keuangan",
  SPIP_E_SIGAP: "spip_e_sigap",
  MANUAL_ADHOC: "manual_adhoc",
  LAINNYA: "lainnya",
};

const PROPOSAL_SOURCE_TO_DOCUMENT = {
  LAKIP: "lakip",
  LAPORAN_KEUANGAN: "laporan_keuangan",
  TINDAK_LANJUT_BPK: "tindak_lanjut_bpk",
  TINDAK_LANJUT_INSPEKTORAT: "tindak_lanjut_inspektorat",
  PELAKSANAAN_KEGIATAN: "pelaksanaan_kegiatan",
  PERTANGGUNGJAWABAN_KEUANGAN: "pertanggungjawaban_keuangan",
  SPIP_E_SIGAP: "spip_e_sigap",
  MANUAL_ADHOC: "manual_adhoc",
  LAINNYA: "lainnya",
};

const PROPOSAL_INTAKE_ALLOWED_FIELDS = [
  "proposal_source_type",
  "proposal_source_ref_id",

  // Jalur Renstra tetap memakai flow lama
  "context_id",
  "context_item_id",

  // Context bisnis
  "tahun",
  "periode_type",
  "periode_label",
  "opd_id",
  "nama_opd",
  "unit_terkait",

  // Informasi audit finding / dokumen sumber
  "nomor_temuan",
  "judul_temuan",
  "tahun_pemeriksaan",
  "tanggal_dokumen",
  "ringkasan_temuan",
  "rekomendasi",
  "status_tindak_lanjut",
  "nilai_temuan",

  // Laporan keuangan / pertanggungjawaban keuangan
  "akun_pos",
  "jenis_transaksi",
  "nilai_transaksi",
  "jenis_dokumen_pertanggungjawaban",
  "status_dokumen",
  "catatan_koreksi",

  // Pelaksanaan kegiatan
  "nama_kegiatan",
  "tahapan_pelaksanaan",
  "lokasi",
  "output_kegiatan",
  "kendala_pelaksanaan",
  "target_pelaksanaan",

  // Custom category
  "nama_kategori_baru",
  "deskripsi_kategori_baru",
  "is_renstra_related",
  "alasan_pengajuan_kategori",
  "contoh_sumber_risiko",

  // Objek dan substansi risiko
  "objek_risiko",
  "nama_risiko",
  "uraian_risiko",
  "risk_statement",
  "penyebab_risiko",
  "dampak_risiko",

  // Reference risiko
  "kategori_risiko_ref_id",
  "sumber_risiko_ref_id",
  "kemungkinan_ref_id",
  "dampak_ref_id",
  "selera_risiko_ref_id",
  "status_risiko_ref_id",

  // Rencana awal
  "rencana_tindak_lanjut_awal",
  "pic",
  "target_waktu",
  "catatan",
  "alasan_revisi",

  // Metadata tambahan jika nanti frontend mengirim object metadata
  "metadata_json",
];

const TECHNICAL_BLOCKED_FIELDS = [
  "id",
  "context_id",
  "periode_id",
  "tahun",
  "jenis_dokumen",
  "renstra_id",
  "opd_id",
  "indikator_id",
  "stage",
  "ref_id",
  "source_table",
  "source_id",
  "kode_risiko",
  "kemungkinan",
  "dampak",
  "skor_risiko",
  "level_risiko",
  "level_risiko_ref_id",
  "matrix_code",
  "matrix_id",
  "is_above_appetite",
  "risk_code_auto_generated",
  "is_priority_candidate",
  "owner_user_id",
  "owner_division_id",
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
];

const WORKFLOW_STATUS = {
  DRAFT: "draft",
  VERIFIKASI: "verifikasi",
  APPROVED: "approved",
  DITOLAK: "ditolak",
};

const HISTORY_ACTION = {
  CREATE: "create",
  UPDATE: "update",

  // Tidak memakai "submit" karena action_type history mengikuti ENUM existing.
  // Submit berarti mengajukan risk ke status verifikasi.
  SUBMIT: "verifikasi",

  VERIFY: "verifikasi",
  APPROVE: "approve",
  REJECT: "reject",
  REVISI: "revisi",
};

class ServiceError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = "ServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const toPlain = (instance) => {
  if (!instance) return null;
  if (typeof instance.get === "function") return instance.get({ plain: true });
  return instance;
};

const clonePlain = (value) => {
  const plain = toPlain(value);

  if (plain === null || plain === undefined) {
    return null;
  }

  return JSON.parse(JSON.stringify(plain));
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toPositiveIntOrNull = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const hasModelAttribute = (model, attributeName) => {
  return Boolean(model?.rawAttributes?.[attributeName]);
};

const pickModelPayload = (model, payload = {}) => {
  const attrs = model?.rawAttributes || {};

  return Object.keys(payload).reduce((acc, key) => {
    if (attrs[key] !== undefined && payload[key] !== undefined) {
      acc[key] = payload[key];
    }

    return acc;
  }, {});
};

const normalizeSourceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
};

const normalizeSourceValue = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
};

const buildMetadata = (...sources) => {
  return sources.reduce((acc, source) => {
    if (source && typeof source === "object" && !Array.isArray(source)) {
      return {
        ...acc,
        ...source,
      };
    }

    return acc;
  }, {});
};

const now = () => new Date();

const getUserId = (user) => {
  if (!user) return null;
  return user.id || user.user_id || user.userId || null;
};

const assertModelsLoaded = () => {
  const missing = [];

  if (!sequelize) missing.push("sequelize");
  if (!MrPlanningRisk) missing.push("MrPlanningRisk");
  if (!MrPlanningRiskHistory) missing.push("MrPlanningRiskHistory");
  if (!MrPlanningContext) missing.push("MrPlanningContext");
  if (!MrPlanningContextItem) missing.push("MrPlanningContextItem");
  if (!MrReferenceItem) missing.push("MrReferenceItem");
  if (!MrRiskMatrix) missing.push("MrRiskMatrix");

  if (missing.length > 0) {
    throw new ServiceError(
      `Model MR belum loaded: ${missing.join(", ")}`,
      500,
      { missing }
    );
  }
};

const pickAllowedFields = (body = {}) => {
  const payload = {};

  USER_INPUT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  });

  return payload;
};

const pickProposalIntakeFields = (body = {}) => {
  const payload = {};

  PROPOSAL_INTAKE_ALLOWED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  });

  return payload;
};

const assertNoUnknownProposalFields = (body = {}) => {
  const allowed = new Set(PROPOSAL_INTAKE_ALLOWED_FIELDS);
  const unknownFields = Object.keys(body || {}).filter((field) => {
    return !allowed.has(field) && !TECHNICAL_BLOCKED_FIELDS.includes(field);
  });

  if (unknownFields.length > 0) {
    throw new ServiceError(
      `Field proposal intake tidak dikenali: ${unknownFields[0]}`,
      400,
      {
        blocked: true,
        blocked_fields: unknownFields,
      }
    );
  }
};

const assertNoBlockedProposalFields = (body = {}) => {
  const allowedForProposal = new Set(PROPOSAL_INTAKE_ALLOWED_FIELDS);

  const blocked = TECHNICAL_BLOCKED_FIELDS.filter((field) => {
    return (
      Object.prototype.hasOwnProperty.call(body, field) &&
      !allowedForProposal.has(field)
    );
  });

  if (blocked.length > 0) {
    throw new ServiceError(
      `Field tidak diperbolehkan untuk proposal intake: ${blocked[0]}`,
      400,
      {
        blocked: true,
        blocked_fields: blocked,
      }
    );
  }
};

const assertNoBlockedFields = (body = {}) => {
  const blocked = TECHNICAL_BLOCKED_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field)
  );

  if (blocked.length > 0) {
    throw new ServiceError(
      `Field tidak diperbolehkan: ${blocked[0]}`,
      400,
      {
        blocked: true,
        blocked_fields: blocked,
      }
    );
  }
};

const assertRequired = (payload, fields) => {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === null || value === undefined || value === "";
  });

  if (missing.length > 0) {
    throw new ServiceError(
      `Field wajib belum lengkap: ${missing.join(", ")}`,
      400,
      { missing_fields: missing }
    );
  }
};

const findReferenceItem = async (id, transaction) => {
  if (!id) return null;

  return MrReferenceItem.findOne({
    where: {
      id,
      is_active: true,
    },
    transaction,
  });
};

const getReferenceLabel = async (id, transaction) => {
  const item = await findReferenceItem(id, transaction);
  return item ? item.nama_item : null;
};

const findReferenceItemByGroupLabel = async (groupCode, label, transaction) => {
  const normalizedLabel = String(label || "")
    .trim()
    .toLowerCase();

  if (!normalizedLabel) return null;

  const rows = await sequelize.query(
    `
    SELECT
      i.id,
      i.nama_item,
      i.kode_item,
      i.nilai_text
    FROM mr_reference_items i
    JOIN mr_reference_groups g
      ON g.id = i.group_id
    WHERE g.kode_group = :groupCode
      AND i.is_active = 1
    ORDER BY i.urutan ASC, i.id ASC
    `,
    {
      transaction,
      replacements: { groupCode },
      type: QueryTypes.SELECT,
    }
  );

  return (
    rows.find((item) => {
      const candidates = [
        item.nama_item,
        item.kode_item,
        item.nilai_text,
      ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

      return candidates.some((value) => value === normalizedLabel || value.includes(normalizedLabel));
    }) || null
  );
};

const resolveReferenceIdFromLabel = async ({
  groupCode,
  label,
  transaction,
  fallbackToFirstActive = false,
}) => {
  const item = await findReferenceItemByGroupLabel(groupCode, label, transaction);

  if (item) {
    return item.id;
  }

  if (!fallbackToFirstActive) {
    return null;
  }

  const firstActive = await sequelize.query(
    `
    SELECT
      i.id
    FROM mr_reference_items i
    JOIN mr_reference_groups g
      ON g.id = i.group_id
    WHERE g.kode_group = :groupCode
      AND i.is_active = 1
    ORDER BY i.urutan ASC, i.id ASC
    LIMIT 1
    `,
    {
      transaction,
      replacements: { groupCode },
      type: QueryTypes.SELECT,
    }
  );

  return firstActive[0]?.id || null;
};

const resolveProposalSourceReference = async ({
  proposalSourceType,
  proposalSourceRefId = null,
  transaction,
}) => {
  const sourceCode = normalizeSourceCode(proposalSourceType);
  const sourceValue = normalizeSourceValue(proposalSourceType);

  if (!sourceCode && !proposalSourceRefId) {
    throw new ServiceError(
      "Sumber usulan risiko wajib dipilih.",
      400,
      {
        missing_fields: ["proposal_source_type"],
      }
    );
  }

  const replacements = {
    sourceCode,
    sourceValue,
    proposalSourceRefId: toPositiveIntOrNull(proposalSourceRefId),
  };

  const whereParts = [
    "g.kode_group = 'MR_PROPOSAL_SOURCE'",
    "i.is_active = 1",
  ];

  if (replacements.proposalSourceRefId) {
    whereParts.push("i.id = :proposalSourceRefId");
  } else {
    whereParts.push(
      "(UPPER(i.kode_item) = :sourceCode OR LOWER(i.nilai_text) = :sourceValue)"
    );
  }

  const [rows] = await sequelize.query(
    `
      SELECT
        i.id,
        i.group_id,
        i.kode_item,
        i.nama_item,
        i.nilai_text,
        i.urutan
      FROM mr_reference_items i
      JOIN mr_reference_groups g
        ON g.id = i.group_id
      WHERE ${whereParts.join(" AND ")}
      LIMIT 1
    `,
    {
      replacements,
      transaction,
    }
  );

  const item = rows?.[0] || null;

  if (!item) {
    throw new ServiceError(
      "Sumber usulan risiko tidak ditemukan atau tidak aktif.",
      400,
      {
        proposal_source_type: proposalSourceType,
        proposal_source_ref_id: proposalSourceRefId || null,
        required_group: "MR_PROPOSAL_SOURCE",
      }
    );
  }

  return {
    id: item.id,
    kode_item: normalizeSourceCode(item.kode_item),
    nama_item: item.nama_item,
    nilai_text: normalizeSourceValue(item.nilai_text || item.kode_item),
  };
};

const isRenstraProposalSource = (sourceRef) => {
  return sourceRef?.kode_item === PROPOSAL_SOURCE.RENSTRA;
};

const isCustomProposalSource = (sourceRef) => {
  return sourceRef?.kode_item === PROPOSAL_SOURCE.LAINNYA;
};

const getSupportedProposalSources = () => {
  return Object.values(PROPOSAL_SOURCE);
};

const getRequiredFieldsByProposalSource = (sourceRef) => {
  const base = [
    "tahun",
    "periode_type",
    "opd_id",
    "objek_risiko",
    "nama_risiko",
    "kemungkinan_ref_id",
    "dampak_ref_id",
  ];

  const sourceCode = sourceRef?.kode_item;

  if (sourceCode === PROPOSAL_SOURCE.RENSTRA) {
    return ["context_id", "nama_risiko", "kemungkinan_ref_id", "dampak_ref_id"];
  }

  if (sourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_BPK) {
    return [...base, "nomor_temuan", "judul_temuan"];
  }

  if (sourceCode === PROPOSAL_SOURCE.TINDAK_LANJUT_INSPEKTORAT) {
    return [...base, "nomor_temuan", "judul_temuan"];
  }

  if (sourceCode === PROPOSAL_SOURCE.PELAKSANAAN_KEGIATAN) {
    return [...base, "nama_kegiatan"];
  }

  if (sourceCode === PROPOSAL_SOURCE.PERTANGGUNGJAWABAN_KEUANGAN) {
    return [...base, "jenis_dokumen_pertanggungjawaban"];
  }

  if (sourceCode === PROPOSAL_SOURCE.LAPORAN_KEUANGAN) {
    return [...base, "akun_pos"];
  }

  if (sourceCode === PROPOSAL_SOURCE.LAINNYA) {
    return [
      ...base,
      "nama_kategori_baru",
      "deskripsi_kategori_baru",
      "alasan_pengajuan_kategori",
    ];
  }

  return base;
};

const validateReferenceIfProvided = async (id, label, transaction) => {
  if (!id) return null;

  const item = await findReferenceItem(id, transaction);

  if (!item) {
    throw new ServiceError(
      `${label} tidak ditemukan atau tidak aktif.`,
      400,
      {
        field: label,
        reference_id: id,
      }
    );
  }

  return item;
};

const findPlanningContext = async (contextId, transaction) => {
  if (!contextId) {
    throw new ServiceError("context_id wajib tersedia dari route/service.", 400);
  }

  const context = await MrPlanningContext.findOne({
    where: {
      id: contextId,
      is_active: true,
    },
    transaction,
  });

  if (!context) {
    throw new ServiceError(
      "MR Planning Context tidak ditemukan atau tidak aktif.",
      404,
      { context_id: contextId }
    );
  }

  return context;
};

const findPrimaryContextItem = async (contextId, transaction) => {
  let item = await MrPlanningContextItem.findOne({
    where: {
      mr_planning_context_id: contextId,
      is_primary: true,
      is_active: true,
    },
    order: [
      ["urutan", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  });

  if (!item) {
    item = await MrPlanningContextItem.findOne({
      where: {
        mr_planning_context_id: contextId,
        is_active: true,
      },
      order: [
        ["urutan", "ASC"],
        ["id", "ASC"],
      ],
      transaction,
    });
  }

  if (!item) {
    throw new ServiceError(
      "Context item aktif tidak ditemukan. Risk tidak boleh dibuat tanpa sumber konteks.",
      400,
      { context_id: contextId }
    );
  }

  return item;
};

const countActiveContextItems = async (contextId, transaction) => {
  return MrPlanningContextItem.count({
    where: {
      mr_planning_context_id: contextId,
      is_active: true,
    },
    transaction,
  });
};

const findContextItemByIdForContext = async ({
  contextId,
  contextItemId,
  transaction,
}) => {
  const parsedContextItemId = toPositiveIntOrNull(contextItemId);

  if (!parsedContextItemId) {
    throw new ServiceError(
      "context_item_id tidak valid.",
      400,
      {
        field: "context_item_id",
        value: contextItemId,
      }
    );
  }

  const item = await MrPlanningContextItem.findOne({
    where: {
      id: parsedContextItemId,
      mr_planning_context_id: contextId,
      is_active: true,
    },
    transaction,
  });

  if (!item) {
    throw new ServiceError(
      "context_item_id tidak ditemukan atau tidak sesuai dengan context yang dipilih.",
      400,
      {
        context_id: contextId,
        context_item_id: parsedContextItemId,
      }
    );
  }

  return item;
};

const resolveContextItemForRiskCreate = async ({
  contextId,
  body = {},
  transaction,
}) => {
  const selectedContextItemId = body.context_item_id;

  if (selectedContextItemId) {
    return findContextItemByIdForContext({
      contextId,
      contextItemId: selectedContextItemId,
      transaction,
    });
  }

  const totalActiveItems = await countActiveContextItems(contextId, transaction);

  if (totalActiveItems > 1) {
    throw new ServiceError(
      "Context memiliki lebih dari satu sumber perencanaan. Pilih context_item_id terlebih dahulu.",
      400,
      {
        context_id: contextId,
        total_active_context_items: totalActiveItems,
        required_field: "context_item_id",
      }
    );
  }

  return findPrimaryContextItem(contextId, transaction);
};

const buildScopeFromContext = (contextInstance, itemInstance) => {
  const context = toPlain(contextInstance);
  const item = toPlain(itemInstance);

  const scope = {
    context_id: context.id,

    periode_id: item.periode_id || context.periode_id || null,
    tahun: item.tahun || context.tahun || null,
    jenis_dokumen: item.jenis_dokumen || context.jenis_dokumen || null,

    renstra_id: item.renstra_id || context.renstra_id || null,
    opd_id: item.opd_id || context.opd_id || null,

    stage: item.stage || null,
    ref_id: item.ref_id || null,
    indikator_id: item.indikator_id || null,

    owner_user_id:
      context.owner_user_id ||
      context.pemilik_risiko_user_id ||
      context.koordinator_user_id ||
      null,

    owner_division_id: context.owner_division_id || null,

    selera_risiko_ref_id: context.selera_risiko_ref_id || null,
    selera_risiko: context.selera_risiko || null,

    source_table: item.source_table || null,
    source_id: item.source_id || null,
  };

  assertRequired(scope, ["renstra_id", "indikator_id", "stage", "ref_id"]);

  return scope;
};

const resolveMatrixCode = (contextInstance, body = {}) => {
  const context = toPlain(contextInstance);
  const metadata = context.metadata_json || {};

  return (
    metadata.risk_matrix_code ||
    metadata.matrix_code ||
    body.risk_matrix_code ||
    body.matrix_code ||
    null
  );
};

const findRiskMatrix = async ({
  likelihoodRefId,
  impactRefId,
  tahun,
  matrixCode,
  transaction,
}) => {
  const baseWhere = {
    likelihood_ref_id: likelihoodRefId,
    impact_ref_id: impactRefId,
    is_active: true,
  };

  const candidates = [];

  if (matrixCode) {
    candidates.push({
      ...baseWhere,
      matrix_code: matrixCode,
      tahun_berlaku: tahun || null,
    });

    candidates.push({
      ...baseWhere,
      matrix_code: matrixCode,
      tahun_berlaku: null,
    });

    candidates.push({
      ...baseWhere,
      matrix_code: matrixCode,
    });
  }

  if (tahun) {
    candidates.push({
      ...baseWhere,
      tahun_berlaku: tahun,
    });
  }

  candidates.push(baseWhere);

  for (const where of candidates) {
    const matrix = await MrRiskMatrix.findOne({
      where,
      order: [
        ["tahun_berlaku", "DESC"],
        ["id", "ASC"],
      ],
      transaction,
    });

    if (matrix) return matrix;
  }

  throw new ServiceError(
    "Risk matrix tidak ditemukan untuk kombinasi likelihood dan impact.",
    400,
    {
      likelihood_ref_id: likelihoodRefId,
      impact_ref_id: impactRefId,
      tahun,
      matrix_code: matrixCode,
    }
  );
};

const buildRiskCode = async ({ scope, transaction }) => {
  const yearPart = scope.tahun || "NA";
  const stagePart = String(scope.stage || "MR").toUpperCase().replace(/[^A-Z0-9]/g, "_");

  const count = await MrPlanningRisk.count({
    where: {
      context_id: scope.context_id,
    },
    transaction,
  });

  const sequence = String(count + 1).padStart(3, "0");

  return `MR-${yearPart}-${stagePart}-${sequence}`;
};

const createRiskHistory = async ({
  risk,
  beforeJson = null,
  afterJson = null,
  alasanRevisi = null,
  statusRevisi = WORKFLOW_STATUS.DRAFT,
  actionType = HISTORY_ACTION.CREATE,
  userId = null,
  transaction,
}) => {
  const plainRisk = clonePlain(risk);
  const beforeSnapshot = clonePlain(beforeJson);
  const afterSnapshot = clonePlain(afterJson || plainRisk);
  const currentTime = now();

  return MrPlanningRiskHistory.create(
    {
      mr_planning_risk_id: plainRisk.id,
      context_id: plainRisk.context_id || null,

      versi_sebelum: beforeSnapshot?.versi || null,
      versi_sesudah: afterSnapshot?.versi || plainRisk?.versi || null,

      before_json: beforeSnapshot,
      after_json: afterSnapshot,

      alasan_revisi: alasanRevisi,
      status_revisi: statusRevisi,
      action_type: actionType,
      source_module: "mr_planning_risk",

      dibuat_oleh: userId,
      dibuat_pada: currentTime,

      diverifikasi_oleh:
        statusRevisi === WORKFLOW_STATUS.VERIFIKASI ? userId : null,
      diverifikasi_pada:
        statusRevisi === WORKFLOW_STATUS.VERIFIKASI ? currentTime : null,

      disetujui_oleh:
        statusRevisi === WORKFLOW_STATUS.APPROVED ? userId : null,
      disetujui_pada:
        statusRevisi === WORKFLOW_STATUS.APPROVED ? currentTime : null,

      ditolak_oleh:
        statusRevisi === WORKFLOW_STATUS.DITOLAK ? userId : null,
      ditolak_pada:
        statusRevisi === WORKFLOW_STATUS.DITOLAK ? currentTime : null,
    },
    { transaction }
  );
};

const syncLinkedContextItemFromRiskPayload = async ({
  risk,
  payload = {},
  userId = null,
  transaction,
}) => {
  const riskPlain = toPlain(risk);

  if (!riskPlain || !riskPlain.context_item_id) {
    return null;
  }

  const contextItem = await MrPlanningContextItem.findByPk(riskPlain.context_item_id, {
    transaction,
  });

  if (!contextItem) {
    return null;
  }

  const itemPlain = toPlain(contextItem);
  const currentMetadata = itemPlain.metadata_json || {};

  const nextNamaKonteks =
    payload.objek_risiko ||
    payload.judul_temuan ||
    payload.nama_risiko ||
    itemPlain.nama_konteks ||
    null;

  const nextNamaIndikator =
    payload.objek_risiko ||
    payload.judul_temuan ||
    payload.nama_risiko ||
    itemPlain.nama_indikator ||
    null;

  const nextMetadata = buildMetadata(currentMetadata, payload.metadata_json, {
    nomor_temuan:
      payload.nomor_temuan !== undefined
        ? payload.nomor_temuan
        : currentMetadata.nomor_temuan || null,
    judul_temuan:
      payload.judul_temuan !== undefined
        ? payload.judul_temuan
        : currentMetadata.judul_temuan || null,
    ringkasan_temuan:
      payload.ringkasan_temuan !== undefined
        ? payload.ringkasan_temuan
        : currentMetadata.ringkasan_temuan || null,
    rekomendasi:
      payload.rekomendasi !== undefined
        ? payload.rekomendasi
        : currentMetadata.rekomendasi || null,
    rencana_tindak_lanjut_awal:
      payload.rencana_tindak_lanjut_awal !== undefined
        ? payload.rencana_tindak_lanjut_awal
        : currentMetadata.rencana_tindak_lanjut_awal || null,
    objek_risiko:
      payload.objek_risiko !== undefined
        ? payload.objek_risiko
        : currentMetadata.objek_risiko || null,
  });

  const nextPayload = {
    nama_konteks: nextNamaKonteks,
    nama_indikator: nextNamaIndikator,
    uraian_konteks:
      payload.ringkasan_temuan ||
      payload.uraian_risiko ||
      itemPlain.uraian_konteks ||
      null,
    penanggung_jawab:
      payload.pic ||
      payload.unit_terkait ||
      itemPlain.penanggung_jawab ||
      null,
    metadata_json: nextMetadata,
    updated_by: userId,
  };

  await contextItem.update(nextPayload, { transaction });

  return toPlain(contextItem);
};

const repairPlaceholderRiskSources = async ({
  riskIds = [],
  contextItemId = null,
  payload = {},
  user = null,
}) => {
  assertModelsLoaded();

  const userId = getUserId(user);
  const normalizedRiskIds = Array.from(
    new Set(
      (Array.isArray(riskIds) ? riskIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
  const normalizedContextItemId = Number(contextItemId);

  if (!normalizedRiskIds.length && !Number.isInteger(normalizedContextItemId)) {
    throw new ServiceError(
      'riskIds atau contextItemId harus disediakan untuk perbaikan placeholder.',
      400,
      {
        missing_fields: ['riskIds', 'contextItemId'],
      },
    );
  }

  return sequelize.transaction(async (transaction) => {
    const result = {
      updated_risks: [],
      updated_context_item: null,
    };

    let contextItem = null;

    if (Number.isInteger(normalizedContextItemId) && normalizedContextItemId > 0) {
      contextItem = await MrPlanningContextItem.findByPk(normalizedContextItemId, {
        transaction,
      });

      if (!contextItem) {
        throw new ServiceError('Context item tidak ditemukan.', 404, {
          context_item_id: normalizedContextItemId,
        });
      }

      const itemPlain = toPlain(contextItem);
      const currentMetadata = itemPlain.metadata_json || {};
      const nextMetadata = buildMetadata(currentMetadata, payload.metadata_json, {
        nomor_temuan:
          payload.nomor_temuan !== undefined
            ? payload.nomor_temuan
            : currentMetadata.nomor_temuan || null,
        judul_temuan:
          payload.judul_temuan !== undefined
            ? payload.judul_temuan
            : currentMetadata.judul_temuan || null,
        ringkasan_temuan:
          payload.ringkasan_temuan !== undefined
            ? payload.ringkasan_temuan
            : currentMetadata.ringkasan_temuan || null,
        rekomendasi:
          payload.rekomendasi !== undefined
            ? payload.rekomendasi
            : currentMetadata.rekomendasi || null,
        rencana_tindak_lanjut_awal:
          payload.rencana_tindak_lanjut_awal !== undefined
            ? payload.rencana_tindak_lanjut_awal
            : currentMetadata.rencana_tindak_lanjut_awal || null,
        objek_risiko:
          payload.objek_risiko !== undefined
            ? payload.objek_risiko
            : currentMetadata.objek_risiko || null,
      });

      await contextItem.update(
        pickModelPayload(MrPlanningContextItem, {
          nama_konteks:
            payload.objek_risiko ||
            payload.judul_temuan ||
            payload.nama_risiko ||
            itemPlain.nama_konteks ||
            null,
          nama_indikator:
            payload.objek_risiko ||
            payload.judul_temuan ||
            payload.nama_risiko ||
            itemPlain.nama_indikator ||
            null,
          uraian_konteks:
            payload.ringkasan_temuan ||
            payload.uraian_risiko ||
            itemPlain.uraian_konteks ||
            null,
          penanggung_jawab:
            payload.pic ||
            payload.unit_terkait ||
            itemPlain.penanggung_jawab ||
            null,
          metadata_json: nextMetadata,
          updated_by: userId,
        }),
        { transaction },
      );

      result.updated_context_item = toPlain(contextItem);
    }

    for (const rawRiskId of normalizedRiskIds) {
      const risk = await MrPlanningRisk.findByPk(rawRiskId, { transaction });

      if (!risk) {
        continue;
      }

      const beforeJson = clonePlain(risk);
      const nextPayload = {};

      [
        'objek_risiko',
        'judul_temuan',
        'nomor_temuan',
        'ringkasan_temuan',
        'rekomendasi',
        'rencana_tindak_lanjut_awal',
        'pic',
        'unit_terkait',
        'alasan_revisi',
      ].forEach((field) => {
        if (payload[field] !== undefined) {
          nextPayload[field] = payload[field];
        }
      });

      if (payload.metadata_json && typeof payload.metadata_json === 'object') {
        nextPayload.metadata_json = buildMetadata(risk.metadata_json, payload.metadata_json);
      }

      nextPayload.last_revised_at = now();
      nextPayload.last_revised_by = userId;
      nextPayload.updated_by = userId;

      await risk.update(nextPayload, { transaction });

      result.updated_risks.push({
        id: rawRiskId,
        before_json: beforeJson,
        after_json: clonePlain(risk),
      });
    }

    return {
      success: true,
      message: 'Sumber placeholder MR Planning Risk berhasil diperbarui.',
      data: result,
    };
  });
};

const ensureDraftEditable = (risk) => {
  const plain = toPlain(risk);

  if (!plain) {
    throw new ServiceError("Risk tidak ditemukan.", 404);
  }

  if (plain.status_revisi !== WORKFLOW_STATUS.DRAFT) {
    throw new ServiceError(
      "Risk hanya bisa diubah saat status draft.",
      400,
      {
        current_status: plain.status_revisi,
      }
    );
  }
};

const ensureApprovedRevisable = (risk) => {
  const plain = toPlain(risk);

  if (!plain) {
    throw new ServiceError("Risk tidak ditemukan.", 404);
  }

  if (plain.status_revisi !== WORKFLOW_STATUS.APPROVED) {
    throw new ServiceError(
      "Revisi hanya bisa dibuat dari risk yang sudah approved.",
      400,
      {
        current_status: plain.status_revisi,
      }
    );
  }
};

const recalculateRiskMatrixForPayload = async ({
  baseRisk,
  payload,
  body = {},
  transaction,
}) => {
  const likelihoodRefId =
    payload.kemungkinan_ref_id || baseRisk.kemungkinan_ref_id;

  const impactRefId =
    payload.dampak_ref_id || baseRisk.dampak_ref_id;

  if (!likelihoodRefId || !impactRefId) {
    return payload;
  }

  const context = await findPlanningContext(baseRisk.context_id, transaction);

  await validateReferenceIfProvided(
    likelihoodRefId,
    "kemungkinan_ref_id",
    transaction
  );

  await validateReferenceIfProvided(
    impactRefId,
    "dampak_ref_id",
    transaction
  );

  const matrix = await findRiskMatrix({
    likelihoodRefId,
    impactRefId,
    tahun: baseRisk.tahun,
    matrixCode: resolveMatrixCode(context, body),
    transaction,
  });

  const matrixPlain = toPlain(matrix);
  const likelihoodItem = await findReferenceItem(likelihoodRefId, transaction);
  const impactItem = await findReferenceItem(impactRefId, transaction);

  return {
    ...payload,
    kemungkinan_ref_id: likelihoodRefId,
    dampak_ref_id: impactRefId,

    kemungkinan:
      toNumberOrNull(toPlain(likelihoodItem)?.nilai_numeric) ||
      toNumberOrNull(matrixPlain.likelihood_value) ||
      0,

    dampak:
      toNumberOrNull(toPlain(impactItem)?.nilai_numeric) ||
      toNumberOrNull(matrixPlain.impact_value) ||
      0,

    skor_risiko: toNumberOrNull(matrixPlain.score) || 0,
    level_risiko_ref_id: matrixPlain.level_risiko_ref_id || null,
    level_risiko: matrixPlain.level_risiko || null,
    matrix_code: matrixPlain.matrix_code || null,
    matrix_id: matrixPlain.id || null,
    is_above_appetite: Boolean(matrixPlain.is_above_appetite),
  };
};

const resolveReferenceLabelsForPayload = async ({
  payload,
  transaction,
}) => {
  const nextPayload = { ...payload };

  if (nextPayload.kategori_risiko_ref_id) {
    nextPayload.kategori_risiko = await getReferenceLabel(
      nextPayload.kategori_risiko_ref_id,
      transaction
    );
  }

  if (nextPayload.sumber_risiko_ref_id) {
    nextPayload.sumber_risiko = await getReferenceLabel(
      nextPayload.sumber_risiko_ref_id,
      transaction
    );
  }

  if (nextPayload.selera_risiko_ref_id) {
    nextPayload.selera_risiko = await getReferenceLabel(
      nextPayload.selera_risiko_ref_id,
      transaction
    );
  }

  if (nextPayload.status_risiko_ref_id) {
    nextPayload.status_risiko = await getReferenceLabel(
      nextPayload.status_risiko_ref_id,
      transaction
    );
  }

  return nextPayload;
};

const buildProposalContextLookup = ({ payload, sourceRef }) => {
  const tahun = toPositiveIntOrNull(payload.tahun);
  const opdId = toPositiveIntOrNull(payload.opd_id);
  const periodeType = payload.periode_type || "adhoc";
  const jenisDokumen =
    PROPOSAL_SOURCE_TO_DOCUMENT[sourceRef.kode_item] || sourceRef.nilai_text;

  assertRequired(
    {
      tahun,
      periode_type: periodeType,
      opd_id: opdId,
    },
    ["tahun", "periode_type", "opd_id"]
  );

  return {
    tahun,
    opdId,
    periodeType,
    jenisDokumen,
    periodeLabel:
      payload.periode_label ||
      `${sourceRef.nama_item} Tahun ${tahun}`,
  };
};

const ensureProposalContext = async ({
  payload,
  sourceRef,
  userId,
  transaction,
}) => {
  const lookup = buildProposalContextLookup({ payload, sourceRef });

  const existing = await MrPlanningContext.findOne({
    where: {
      tahun: lookup.tahun,
      periode_type: lookup.periodeType,
      jenis_dokumen: lookup.jenisDokumen,
      opd_id: lookup.opdId,
      is_active: true,
    },
    order: [["id", "ASC"]],
    transaction,
  });

  if (existing) {
    return existing;
  }

  const contextPayload = pickModelPayload(MrPlanningContext, {
    periode_id: null,
    tahun: lookup.tahun,
    periode_type: lookup.periodeType,
    periode_label: lookup.periodeLabel,

    jenis_dokumen: lookup.jenisDokumen,
    renstra_id: null,
    opd_id: lookup.opdId,
    nama_opd: payload.nama_opd || null,

    nama_unit_kerja: payload.unit_terkait || null,

    owner_user_id: userId || null,
    owner_division_id: null,

    status_revisi: WORKFLOW_STATUS.DRAFT,
    versi: 1,
    alasan_revisi:
      payload.alasan_revisi ||
      `Context otomatis dari sumber usulan risiko ${sourceRef.nama_item}.`,
    dibuat_oleh: userId || null,
    dibuat_pada: now(),
    last_revised_by: userId || null,
    last_revised_at: now(),
    is_active: true,
    is_locked: false,

    metadata_json: buildMetadata(payload.metadata_json, {
      generated_by: "proposal_intake",
      proposal_source_type: sourceRef.nilai_text,
      proposal_source_code: sourceRef.kode_item,
      proposal_source_ref_id: sourceRef.id,
    }),

    created_by: userId || null,
    updated_by: userId || null,
  });

  return MrPlanningContext.create(contextPayload, { transaction });
};

const countProposalContextItems = async ({ contextId, stage, transaction }) => {
  return MrPlanningContextItem.count({
    where: {
      mr_planning_context_id: contextId,
      stage,
      is_active: true,
    },
    transaction,
  });
};

const buildProposalObjectCode = ({ sourceRef, payload }) => {
  const clean = (value, fallback) => {
    const normalized = String(value || "")
      .trim()
      .replace(/[^A-Za-z0-9.]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return normalized || fallback;
  };

  switch (sourceRef.kode_item) {
    case PROPOSAL_SOURCE.TINDAK_LANJUT_BPK:
      return `BPK-${clean(payload.nomor_temuan, "TANPA-NOMOR")}`;

    case PROPOSAL_SOURCE.TINDAK_LANJUT_INSPEKTORAT:
      return `INSPEKTORAT-${clean(payload.nomor_temuan, "TANPA-NOMOR")}`;

    case PROPOSAL_SOURCE.LAKIP:
      return `LAKIP-${clean(payload.objek_risiko || payload.nama_risiko, "OBJEK")}`;

    case PROPOSAL_SOURCE.LAPORAN_KEUANGAN:
      return `LK-${clean(payload.akun_pos || payload.objek_risiko, "OBJEK")}`;

    case PROPOSAL_SOURCE.PELAKSANAAN_KEGIATAN:
      return `GIAT-${clean(payload.nama_kegiatan || payload.objek_risiko, "OBJEK")}`;

    case PROPOSAL_SOURCE.PERTANGGUNGJAWABAN_KEUANGAN:
      return `SPJ-${clean(
        payload.jenis_dokumen_pertanggungjawaban || payload.objek_risiko,
        "OBJEK"
      )}`;

    case PROPOSAL_SOURCE.SPIP_E_SIGAP:
      return `SPIP-${clean(payload.objek_risiko || payload.nama_risiko, "OBJEK")}`;

    case PROPOSAL_SOURCE.MANUAL_ADHOC:
      return `ADHOC-${clean(payload.objek_risiko || payload.nama_risiko, "OBJEK")}`;

    case PROPOSAL_SOURCE.LAINNYA:
      return `CUSTOM-${clean(
        payload.nama_kategori_baru || payload.objek_risiko,
        "OBJEK"
      )}`;

    default:
      return `${sourceRef.kode_item}-${clean(payload.objek_risiko, "OBJECT")}`;
  }
};

const ensureProposalContextItem = async ({
  context,
  payload,
  sourceRef,
  userId,
  transaction,
}) => {
  const contextPlain = toPlain(context);
  const stage = PROPOSAL_SOURCE_TO_STAGE[sourceRef.kode_item];

  if (!stage) {
    throw new ServiceError(
      `Sumber usulan ${sourceRef.kode_item} belum memiliki mapping stage.`,
      400,
      {
        proposal_source_type: sourceRef.kode_item,
        supported_sources: getSupportedProposalSources(),
      }
    );
  }

  assertRequired(payload, getRequiredFieldsByProposalSource(sourceRef));

  const kodeKonteks = buildProposalObjectCode({ sourceRef, payload });
  const namaKonteks =
    payload.objek_risiko ||
    payload.judul_temuan ||
    payload.nama_risiko;

  const existing = await MrPlanningContextItem.findOne({
    where: {
      mr_planning_context_id: contextPlain.id,
      stage,
      kode_konteks: kodeKonteks,
      is_active: true,
    },
    order: [["id", "ASC"]],
    transaction,
  });

  if (existing) {
    return existing;
  }

  const nextRefId =
    (await countProposalContextItems({
      contextId: contextPlain.id,
      stage,
      transaction,
    })) + 1;

  const itemPayload = pickModelPayload(MrPlanningContextItem, {
    mr_planning_context_id: contextPlain.id,

    periode_id: contextPlain.periode_id || null,
    tahun: contextPlain.tahun || null,
    jenis_dokumen: contextPlain.jenis_dokumen || null,
    renstra_id: null,
    opd_id: contextPlain.opd_id || null,

    stage,
    ref_id: nextRefId,
    indikator_id: null,

    source_table: "proposal_intake",
    source_id: null,

    kode_konteks: kodeKonteks,
    nama_konteks: namaKonteks,
    uraian_konteks:
      payload.ringkasan_temuan ||
      payload.uraian_risiko ||
      payload.catatan ||
      null,

    kode_indikator: null,
    nama_indikator: namaKonteks,

    penanggung_jawab: payload.pic || payload.unit_terkait || null,
    urutan: nextRefId,
    is_primary: false,
    is_active: true,

    metadata_json: buildMetadata(payload.metadata_json, {
      generated_by: "proposal_intake",
      proposal_source_type: sourceRef.nilai_text,
      proposal_source_code: sourceRef.kode_item,
      proposal_source_ref_id: sourceRef.id,

      nomor_temuan: payload.nomor_temuan || null,
      judul_temuan: payload.judul_temuan || null,
      tahun_pemeriksaan: payload.tahun_pemeriksaan || null,
      tanggal_dokumen: payload.tanggal_dokumen || null,
      ringkasan_temuan: payload.ringkasan_temuan || null,
      rekomendasi: payload.rekomendasi || null,
      status_tindak_lanjut: payload.status_tindak_lanjut || null,
      nilai_temuan: payload.nilai_temuan || null,

      akun_pos: payload.akun_pos || null,
      jenis_transaksi: payload.jenis_transaksi || null,
      nilai_transaksi: payload.nilai_transaksi || null,
      jenis_dokumen_pertanggungjawaban:
        payload.jenis_dokumen_pertanggungjawaban || null,
      status_dokumen: payload.status_dokumen || null,
      catatan_koreksi: payload.catatan_koreksi || null,

      nama_kegiatan: payload.nama_kegiatan || null,
      tahapan_pelaksanaan: payload.tahapan_pelaksanaan || null,
      lokasi: payload.lokasi || null,
      output_kegiatan: payload.output_kegiatan || null,
      kendala_pelaksanaan: payload.kendala_pelaksanaan || null,
      target_pelaksanaan: payload.target_pelaksanaan || null,

      nama_kategori_baru: payload.nama_kategori_baru || null,
      deskripsi_kategori_baru: payload.deskripsi_kategori_baru || null,
      is_renstra_related: payload.is_renstra_related ?? null,
      alasan_pengajuan_kategori: payload.alasan_pengajuan_kategori || null,
      contoh_sumber_risiko: payload.contoh_sumber_risiko || null,
      custom_category_status: isCustomProposalSource(sourceRef)
        ? "pending_review"
        : null,

      rencana_tindak_lanjut_awal:
        payload.rencana_tindak_lanjut_awal || null,
      pic: payload.pic || null,
      target_waktu: payload.target_waktu || null,

      object_ref_mode: "internal_context_item_ref",
    }),

    created_by: userId || null,
    updated_by: userId || null,
  });

  const created = await MrPlanningContextItem.create(itemPayload, {
    transaction,
  });

  if (hasModelAttribute(MrPlanningContextItem, "source_id")) {
    await created.update(
      {
        source_id: created.id,
        updated_by: userId || null,
      },
      { transaction }
    );
  }

  return created;
};

const buildRiskPayloadFromContext = async ({
  context,
  contextItem,
  body,
  userId,
  transaction,
}) => {
  const allowedPayload = pickAllowedFields(body);

  assertRequired(allowedPayload, [
    "nama_risiko",
    "kemungkinan_ref_id",
    "dampak_ref_id",
  ]);

  const scope = buildScopeFromContext(context, contextItem);
  const contextItemPlain = toPlain(contextItem);

  const likelihoodItem = await validateReferenceIfProvided(
    allowedPayload.kemungkinan_ref_id,
    "kemungkinan_ref_id",
    transaction
  );

  const impactItem = await validateReferenceIfProvided(
    allowedPayload.dampak_ref_id,
    "dampak_ref_id",
    transaction
  );

  const kategoriItem = await validateReferenceIfProvided(
    allowedPayload.kategori_risiko_ref_id,
    "kategori_risiko_ref_id",
    transaction
  );

  const sumberItem = await validateReferenceIfProvided(
    allowedPayload.sumber_risiko_ref_id,
    "sumber_risiko_ref_id",
    transaction
  );

  const statusItem = await validateReferenceIfProvided(
    allowedPayload.status_risiko_ref_id,
    "status_risiko_ref_id",
    transaction
  );

  let seleraRefId =
    allowedPayload.selera_risiko_ref_id || scope.selera_risiko_ref_id || null;

  const seleraItem = await validateReferenceIfProvided(
    seleraRefId,
    "selera_risiko_ref_id",
    transaction
  );

  const matrixCode = resolveMatrixCode(context, body);

  const matrix = await findRiskMatrix({
    likelihoodRefId: allowedPayload.kemungkinan_ref_id,
    impactRefId: allowedPayload.dampak_ref_id,
    tahun: scope.tahun,
    matrixCode,
    transaction,
  });

  const matrixPlain = toPlain(matrix);
  const likelihoodPlain = toPlain(likelihoodItem);
  const impactPlain = toPlain(impactItem);

  const kodeRisiko = await buildRiskCode({ scope, transaction });

  const basePayload = {
    context_id: scope.context_id,

    periode_id: scope.periode_id,
    tahun: scope.tahun,
    jenis_dokumen: scope.jenis_dokumen,

    renstra_id: scope.renstra_id,
    opd_id: scope.opd_id,
    indikator_id: scope.indikator_id,
    stage: scope.stage,
    ref_id: scope.ref_id,

    source_table: scope.source_table,
    source_id: scope.source_id,

    kode_risiko: kodeRisiko,
    risk_code_auto_generated: true,

    nama_risiko: allowedPayload.nama_risiko,
    risk_statement: allowedPayload.risk_statement || null,
    uraian_risiko: allowedPayload.uraian_risiko || null,

    kategori_risiko_ref_id: allowedPayload.kategori_risiko_ref_id || null,
    kategori_risiko: kategoriItem ? kategoriItem.nama_item : null,

    sumber_risiko_ref_id: allowedPayload.sumber_risiko_ref_id || null,
    sumber_risiko: sumberItem ? sumberItem.nama_item : null,

    penyebab_risiko: allowedPayload.penyebab_risiko || null,
    dampak_risiko: allowedPayload.dampak_risiko || null,
    metode_pencapaian_tujuan_spip:
      allowedPayload.metode_pencapaian_tujuan_spip || null,

    kemungkinan_ref_id: allowedPayload.kemungkinan_ref_id,
    dampak_ref_id: allowedPayload.dampak_ref_id,

    kemungkinan:
      toNumberOrNull(likelihoodPlain.nilai_numeric) ||
      toNumberOrNull(matrixPlain.likelihood_value) ||
      0,

    dampak:
      toNumberOrNull(impactPlain.nilai_numeric) ||
      toNumberOrNull(matrixPlain.impact_value) ||
      0,

    skor_risiko: toNumberOrNull(matrixPlain.score) || 0,

    level_risiko_ref_id: matrixPlain.level_risiko_ref_id || null,
    level_risiko: matrixPlain.level_risiko || null,

    selera_risiko_ref_id: seleraRefId,
    selera_risiko:
      seleraItem?.nama_item || scope.selera_risiko || null,

    matrix_code: matrixPlain.matrix_code || null,
    matrix_id: matrixPlain.id || null,
    is_above_appetite: Boolean(matrixPlain.is_above_appetite),

    status_risiko_ref_id: allowedPayload.status_risiko_ref_id || null,
    status_risiko: statusItem ? statusItem.nama_item : "aktif",

    owner_user_id: scope.owner_user_id,
    owner_division_id: scope.owner_division_id,

    versi: 1,
    status_revisi: WORKFLOW_STATUS.DRAFT,
    alasan_revisi: allowedPayload.alasan_revisi || "Create MR planning risk.",
    last_revised_at: now(),
    last_revised_by: userId,
    dibuat_oleh: userId,
    dibuat_pada: now(),
    created_by: userId,
    updated_by: userId,
  };

  if (hasModelAttribute(MrPlanningRisk, "context_item_id")) {
    basePayload.context_item_id = contextItemPlain.id;
  }

  return basePayload;
};

const buildDuplicateRiskGuardKey = ({ payload, sourceRef, contextItem }) => {
  const itemPlain = toPlain(contextItem);
  const metadata = itemPlain?.metadata_json || {};

  return {
    proposal_source_type:
      sourceRef?.kode_item ||
      metadata.proposal_source_code ||
      metadata.proposal_source_type ||
      null,

    nomor_temuan:
      payload.nomor_temuan ||
      metadata.nomor_temuan ||
      null,

    tahun_pemeriksaan:
      payload.tahun_pemeriksaan ||
      metadata.tahun_pemeriksaan ||
      null,

    opd_id:
      payload.opd_id ||
      itemPlain?.opd_id ||
      null,

    stage:
      itemPlain?.stage ||
      PROPOSAL_SOURCE_TO_STAGE[sourceRef?.kode_item] ||
      null,

    source_table:
      itemPlain?.source_table ||
      "proposal_intake",

    source_id:
      itemPlain?.source_id ||
      itemPlain?.id ||
      null,

    context_item_id:
      itemPlain?.id ||
      null,

    kode_konteks:
      itemPlain?.kode_konteks ||
      null,
  };
};

const findDuplicateProposalRisks = async ({
  contextItem,
  transaction,
}) => {
  const itemPlain = toPlain(contextItem);

  if (!itemPlain) {
    return [];
  }

  const contextId =
    itemPlain.mr_planning_context_id ||
    itemPlain.context_id ||
    null;

  const stage = itemPlain.stage || null;
  const refId = itemPlain.ref_id || null;

  if (!contextId || !stage || !refId) {
    return [];
  }

  const where = {
    context_id: contextId,
    stage,
    ref_id: refId,
  };

  if (hasModelAttribute(MrPlanningRisk, "is_active")) {
    where.is_active = true;
  }

  const attributes = [
    "id",
    "kode_risiko",
    "nama_risiko",
    "status_revisi",
    "versi",
    "context_id",
    "stage",
    "ref_id",
    "source_table",
    "source_id",
    "created_at",
    "createdAt",
  ].filter((field) => hasModelAttribute(MrPlanningRisk, field));

  const rows = await MrPlanningRisk.findAll({
    where,
    attributes,
    order: [["id", "DESC"]],
    limit: 10,
    transaction,
  });

  return rows.map((row) => toPlain(row));
};

const buildDuplicateRiskWarning = ({
  duplicates = [],
  duplicateKey = {},
}) => {
  const hasDuplicate = duplicates.length > 0;

  return {
    has_duplicate: hasDuplicate,
    severity: hasDuplicate ? "warning" : "none",
    mode: "warning_only",
    message: hasDuplicate
      ? "Sumber usulan/temuan ini sudah pernah dibuat sebagai risiko MR. Silakan cek risiko terkait sebelum membuat atau melanjutkan data baru."
      : null,
    guard_key: duplicateKey,
    duplicate_count: duplicates.length,
    duplicate_risks: duplicates.map((risk) => ({
      id: risk.id,
      kode_risiko: risk.kode_risiko,
      nama_risiko: risk.nama_risiko,
      status_revisi: risk.status_revisi,
      versi: risk.versi,
      context_id: risk.context_id,
      stage: risk.stage || null,
      ref_id: risk.ref_id || null,
      source_table: risk.source_table || null,
      source_id: risk.source_id || null,
      created_at: risk.created_at || risk.createdAt || null,
    })),
  };
};

const buildRiskPayloadFromProposal = async ({
  context,
  contextItem,
  body,
  sourceRef,
  userId,
  transaction,
}) => {
  const contextPlain = toPlain(context);
  const itemPlain = toPlain(contextItem);

  assertRequired(body, [
    "nama_risiko",
    "kemungkinan_ref_id",
    "dampak_ref_id",
  ]);

  const likelihoodItem = await validateReferenceIfProvided(
    body.kemungkinan_ref_id,
    "kemungkinan_ref_id",
    transaction
  );

  const impactItem = await validateReferenceIfProvided(
    body.dampak_ref_id,
    "dampak_ref_id",
    transaction
  );

  const kategoriItem = await validateReferenceIfProvided(
    body.kategori_risiko_ref_id,
    "kategori_risiko_ref_id",
    transaction
  );

  const sumberItem = await validateReferenceIfProvided(
    body.sumber_risiko_ref_id,
    "sumber_risiko_ref_id",
    transaction
  );

  const statusItem = await validateReferenceIfProvided(
    body.status_risiko_ref_id,
    "status_risiko_ref_id",
    transaction
  );

  const seleraRefId =
    body.selera_risiko_ref_id || contextPlain.selera_risiko_ref_id || null;

  const seleraItem = await validateReferenceIfProvided(
    seleraRefId,
    "selera_risiko_ref_id",
    transaction
  );

  const matrix = await findRiskMatrix({
    likelihoodRefId: body.kemungkinan_ref_id,
    impactRefId: body.dampak_ref_id,
    tahun: contextPlain.tahun,
    matrixCode: resolveMatrixCode(context, body),
    transaction,
  });

  const matrixPlain = toPlain(matrix);
  const likelihoodPlain = toPlain(likelihoodItem);
  const impactPlain = toPlain(impactItem);

  const scope = {
    context_id: contextPlain.id,
    periode_id: itemPlain.periode_id || contextPlain.periode_id || null,
    tahun: itemPlain.tahun || contextPlain.tahun || null,
    jenis_dokumen: itemPlain.jenis_dokumen || contextPlain.jenis_dokumen || null,
    renstra_id: null,
    opd_id: itemPlain.opd_id || contextPlain.opd_id || null,
    indikator_id: null,
    stage: itemPlain.stage,
    ref_id: itemPlain.ref_id,
    source_table: itemPlain.source_table || "proposal_intake",
    source_id: itemPlain.source_id || itemPlain.id || null,
    owner_user_id:
      contextPlain.owner_user_id ||
      contextPlain.pemilik_risiko_user_id ||
      contextPlain.koordinator_user_id ||
      userId ||
      null,
    owner_division_id: contextPlain.owner_division_id || null,
  };

  assertRequired(scope, ["context_id", "opd_id", "stage", "ref_id"]);

  const kodeRisiko = await buildRiskCode({ scope, transaction });

  const basePayload = {
    context_id: scope.context_id,

    periode_id: scope.periode_id,
    tahun: scope.tahun,
    jenis_dokumen: scope.jenis_dokumen,

    renstra_id: scope.renstra_id,
    opd_id: scope.opd_id,
    indikator_id: scope.indikator_id,
    stage: scope.stage,
    ref_id: scope.ref_id,

    source_table: scope.source_table,
    source_id: scope.source_id,

    kode_risiko: kodeRisiko,
    risk_code_auto_generated: true,

    nama_risiko: body.nama_risiko,
    risk_statement: body.risk_statement || null,
    uraian_risiko: body.uraian_risiko || null,

    kategori_risiko_ref_id: body.kategori_risiko_ref_id || null,
    kategori_risiko: kategoriItem ? kategoriItem.nama_item : null,

    sumber_risiko_ref_id: body.sumber_risiko_ref_id || null,
    sumber_risiko: sumberItem ? sumberItem.nama_item : null,

    penyebab_risiko: body.penyebab_risiko || null,
    dampak_risiko: body.dampak_risiko || null,

    metode_pencapaian_tujuan_spip:
      body.rencana_tindak_lanjut_awal ||
      body.metode_pencapaian_tujuan_spip ||
      null,

    kemungkinan_ref_id: body.kemungkinan_ref_id,
    dampak_ref_id: body.dampak_ref_id,

    kemungkinan:
      toNumberOrNull(likelihoodPlain.nilai_numeric) ||
      toNumberOrNull(matrixPlain.likelihood_value) ||
      0,

    dampak:
      toNumberOrNull(impactPlain.nilai_numeric) ||
      toNumberOrNull(matrixPlain.impact_value) ||
      0,

    skor_risiko: toNumberOrNull(matrixPlain.score) || 0,

    level_risiko_ref_id: matrixPlain.level_risiko_ref_id || null,
    level_risiko: matrixPlain.level_risiko || null,

    selera_risiko_ref_id: seleraRefId,
    selera_risiko:
      seleraItem?.nama_item || contextPlain.selera_risiko || null,

    matrix_code: matrixPlain.matrix_code || null,
    matrix_id: matrixPlain.id || null,
    is_above_appetite: Boolean(matrixPlain.is_above_appetite),

    status_risiko_ref_id: body.status_risiko_ref_id || null,
    status_risiko: statusItem ? statusItem.nama_item : "aktif",

    owner_user_id: scope.owner_user_id,
    owner_division_id: scope.owner_division_id,

    versi: 1,
    status_revisi: WORKFLOW_STATUS.DRAFT,
    alasan_revisi:
      body.alasan_revisi ||
      `Create MR planning risk dari proposal ${sourceRef.nama_item}.`,
    last_revised_at: now(),
    last_revised_by: userId,
    dibuat_oleh: userId,
    dibuat_pada: now(),
    created_by: userId,
    updated_by: userId,
  };

  if (hasModelAttribute(MrPlanningRisk, "context_item_id")) {
    basePayload.context_item_id = itemPlain.id;
  }

  return pickModelPayload(MrPlanningRisk, basePayload);
};

const createRiskFromContext = async ({ contextId, body = {}, user = null }) => {
  assertModelsLoaded();
  assertNoBlockedFields(body);

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const context = await findPlanningContext(contextId, transaction);

    const contextItem = await resolveContextItemForRiskCreate({
      contextId,
      body,
      transaction,
    });

    const payload = await buildRiskPayloadFromContext({
      context,
      contextItem,
      body,
      userId,
      transaction,
    });

    const risk = await MrPlanningRisk.create(payload, { transaction });

    await createRiskHistory({
      risk,
      beforeJson: null,
      afterJson: toPlain(risk),
      alasanRevisi: payload.alasan_revisi,
      statusRevisi: WORKFLOW_STATUS.DRAFT,
      actionType: HISTORY_ACTION.CREATE,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "MR Planning Risk berhasil dibuat dari context.",
      data: {
        ...toPlain(risk),
        selected_context_item: toPlain(contextItem),
      },
    };
  });
};

const createProposalIntake = async ({ body = {}, user = null }) => {
  assertModelsLoaded();
  assertNoBlockedProposalFields(body);
  assertNoUnknownProposalFields(body);

  const userId = getUserId(user);
  const payload = pickProposalIntakeFields(body);

  const sourceRef = await resolveProposalSourceReference({
    proposalSourceType: payload.proposal_source_type,
    proposalSourceRefId: payload.proposal_source_ref_id,
    transaction: null,
  });

  if (isRenstraProposalSource(sourceRef)) {
    if (!payload.context_id) {
      throw new ServiceError(
        "Context MR wajib dipilih untuk sumber Renstra.",
        400,
        {
          missing_fields: ["context_id"],
          proposal_source_type: sourceRef.kode_item,
        }
      );
    }

    return createRiskFromContext({
      contextId: payload.context_id,
      body: payload,
      user,
    });
  }

  assertRequired(payload, getRequiredFieldsByProposalSource(sourceRef));

  return sequelize.transaction(async (transaction) => {
    const context = await ensureProposalContext({
      payload,
      sourceRef,
      userId,
      transaction,
    });

    const contextItem = await ensureProposalContextItem({
      context,
      payload,
      sourceRef,
      userId,
      transaction,
    });

    const duplicateKey = buildDuplicateRiskGuardKey({
      payload,
      sourceRef,
      contextItem,
    });

    const duplicateRisksBeforeCreate = await findDuplicateProposalRisks({
      contextItem,
      transaction,
    });

    const duplicateWarning = buildDuplicateRiskWarning({
      duplicates: duplicateRisksBeforeCreate,
      duplicateKey,
    });

    const riskPayload = await buildRiskPayloadFromProposal({
      context,
      contextItem,
      body: payload,
      sourceRef,
      userId,
      transaction,
    });

    const risk = await MrPlanningRisk.create(riskPayload, { transaction });

    await createRiskHistory({
      risk,
      beforeJson: null,
      afterJson: toPlain(risk),
      alasanRevisi: riskPayload.alasan_revisi,
      statusRevisi: WORKFLOW_STATUS.DRAFT,
      actionType: HISTORY_ACTION.CREATE,
      userId,
      transaction,
    });

    return {
      success: true,
      message: duplicateWarning.has_duplicate
        ? "Draft usulan risiko berhasil dibuat, namun sumber/temuan ini terindikasi sudah pernah dibuat sebagai risiko MR."
        : "Draft usulan risiko berhasil dibuat dari proposal intake.",
      data: {
        ...toPlain(risk),
        proposal_source: sourceRef,
        generated_context: toPlain(context),
        generated_context_item: toPlain(contextItem),

        duplicate_guard: duplicateWarning,
        duplicate_warning: duplicateWarning.has_duplicate
          ? duplicateWarning.message
          : null,

        custom_category_status: isCustomProposalSource(sourceRef)
          ? "pending_review"
          : null,
      },
    };
  });
};

const updateDraftRisk = async ({ riskId, body = {}, user = null }) => {
  assertModelsLoaded();
  assertNoBlockedFields(body);

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const risk = await MrPlanningRisk.findByPk(riskId, { transaction });

    ensureDraftEditable(risk);

    const beforeJson = toPlain(risk);
    const allowedPayload = pickAllowedFields(body);

    const nextPayload = {
      ...allowedPayload,
      updated_by: userId,
      last_revised_by: userId,
      last_revised_at: now(),
      alasan_revisi:
        allowedPayload.alasan_revisi ||
        beforeJson.alasan_revisi ||
        "Update draft MR planning risk.",
    };

    if (
      allowedPayload.kemungkinan_ref_id ||
      allowedPayload.dampak_ref_id
    ) {
      const context = await findPlanningContext(beforeJson.context_id, transaction);
      const likelihoodRefId =
        allowedPayload.kemungkinan_ref_id || beforeJson.kemungkinan_ref_id;
      const impactRefId = allowedPayload.dampak_ref_id || beforeJson.dampak_ref_id;

      await validateReferenceIfProvided(
        likelihoodRefId,
        "kemungkinan_ref_id",
        transaction
      );

      await validateReferenceIfProvided(
        impactRefId,
        "dampak_ref_id",
        transaction
      );

      const matrix = await findRiskMatrix({
        likelihoodRefId,
        impactRefId,
        tahun: beforeJson.tahun,
        matrixCode: resolveMatrixCode(context, body),
        transaction,
      });

      const matrixPlain = toPlain(matrix);

      const likelihoodItem = await findReferenceItem(likelihoodRefId, transaction);
      const impactItem = await findReferenceItem(impactRefId, transaction);

      nextPayload.kemungkinan_ref_id = likelihoodRefId;
      nextPayload.dampak_ref_id = impactRefId;
      nextPayload.kemungkinan =
        toNumberOrNull(toPlain(likelihoodItem)?.nilai_numeric) ||
        toNumberOrNull(matrixPlain.likelihood_value) ||
        0;
      nextPayload.dampak =
        toNumberOrNull(toPlain(impactItem)?.nilai_numeric) ||
        toNumberOrNull(matrixPlain.impact_value) ||
        0;
      nextPayload.skor_risiko = toNumberOrNull(matrixPlain.score) || 0;
      nextPayload.level_risiko_ref_id = matrixPlain.level_risiko_ref_id || null;
      nextPayload.level_risiko = matrixPlain.level_risiko || null;
      nextPayload.matrix_code = matrixPlain.matrix_code || null;
      nextPayload.matrix_id = matrixPlain.id || null;
      nextPayload.is_above_appetite = Boolean(matrixPlain.is_above_appetite);
    }

    if (allowedPayload.kategori_risiko_ref_id) {
      nextPayload.kategori_risiko = await getReferenceLabel(
        allowedPayload.kategori_risiko_ref_id,
        transaction
      );
    }

    if (allowedPayload.sumber_risiko_ref_id) {
      nextPayload.sumber_risiko = await getReferenceLabel(
        allowedPayload.sumber_risiko_ref_id,
        transaction
      );
    }

    if (allowedPayload.selera_risiko_ref_id) {
      nextPayload.selera_risiko = await getReferenceLabel(
        allowedPayload.selera_risiko_ref_id,
        transaction
      );
    }

    if (allowedPayload.status_risiko_ref_id) {
      nextPayload.status_risiko = await getReferenceLabel(
        allowedPayload.status_risiko_ref_id,
        transaction
      );
    }

    await risk.update(nextPayload, { transaction });

    if (
      [
        "objek_risiko",
        "nomor_temuan",
        "judul_temuan",
        "ringkasan_temuan",
        "rekomendasi",
        "rencana_tindak_lanjut_awal",
        "pic",
        "unit_terkait",
      ].some((field) => allowedPayload[field] !== undefined)
    ) {
      await syncLinkedContextItemFromRiskPayload({
        risk,
        payload: { ...beforeJson, ...allowedPayload },
        userId,
        transaction,
      });
    }

    await createRiskHistory({
      risk,
      beforeJson,
      afterJson: toPlain(risk),
      alasanRevisi: nextPayload.alasan_revisi,
      statusRevisi: risk.status_revisi,
      actionType: HISTORY_ACTION.UPDATE,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "Draft MR Planning Risk berhasil diperbarui.",
      data: toPlain(risk),
    };
  });
};

const submitRiskForVerification = async ({ riskId, user = null }) => {
  assertModelsLoaded();

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const risk = await MrPlanningRisk.findByPk(riskId, { transaction });

    ensureDraftEditable(risk);

    const beforeJson = toPlain(risk);

    await risk.update(
      {
        status_revisi: WORKFLOW_STATUS.VERIFIKASI,
        last_revised_at: now(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    await createRiskHistory({
      risk,
      beforeJson,
      afterJson: toPlain(risk),
      alasanRevisi: "Risk diajukan untuk verifikasi.",
      statusRevisi: WORKFLOW_STATUS.VERIFIKASI,
      actionType: HISTORY_ACTION.SUBMIT,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "MR Planning Risk berhasil diajukan untuk verifikasi.",
      data: toPlain(risk),
    };
  });
};

const verifyRisk = async ({ riskId, user = null }) => {
  assertModelsLoaded();

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const risk = await MrPlanningRisk.findByPk(riskId, { transaction });

    if (!risk) {
      throw new ServiceError("Risk tidak ditemukan.", 404);
    }

    const plain = toPlain(risk);

    if (plain.status_revisi !== WORKFLOW_STATUS.VERIFIKASI) {
      throw new ServiceError(
        "Risk hanya bisa diverifikasi setelah status verifikasi.",
        400,
        { current_status: plain.status_revisi }
      );
    }

    const beforeJson = toPlain(risk);

    await risk.update(
      {
        diverifikasi_oleh: userId,
        diverifikasi_pada: now(),
        last_revised_at: now(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    await createRiskHistory({
      risk,
      beforeJson,
      afterJson: toPlain(risk),
      alasanRevisi: "Risk diverifikasi.",
      statusRevisi: WORKFLOW_STATUS.VERIFIKASI,
      actionType: HISTORY_ACTION.VERIFY,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "MR Planning Risk berhasil diverifikasi.",
      data: toPlain(risk),
    };
  });
};

const approveRisk = async ({ riskId, user = null }) => {
  assertModelsLoaded();

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const risk = await MrPlanningRisk.findByPk(riskId, { transaction });

    if (!risk) {
      throw new ServiceError("Risk tidak ditemukan.", 404);
    }

    const plain = toPlain(risk);
    assertFinalReportNotOverwrite({
      is_final: !!plain.is_locked || !!plain.is_final,
      is_correction_mode: false,
    });

    if (plain.status_revisi !== WORKFLOW_STATUS.VERIFIKASI) {
      throw new ServiceError(
        "Risk hanya bisa disetujui setelah status verifikasi.",
        400,
        { current_status: plain.status_revisi }
      );
    }

    const beforeJson = toPlain(risk);

    await risk.update(
      {
        status_revisi: WORKFLOW_STATUS.APPROVED,
        disetujui_oleh: userId,
        disetujui_pada: now(),
        last_revised_at: now(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    await createRiskHistory({
      risk,
      beforeJson,
      afterJson: toPlain(risk),
      alasanRevisi: "Risk disetujui.",
      statusRevisi: WORKFLOW_STATUS.APPROVED,
      actionType: HISTORY_ACTION.APPROVE,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "MR Planning Risk berhasil disetujui.",
      data: toPlain(risk),
    };
  });
};

const rejectRisk = async ({ riskId, reason, user = null }) => {
  assertModelsLoaded();

  if (!reason) {
    throw new ServiceError("Alasan penolakan wajib diisi.", 400);
  }

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const risk = await MrPlanningRisk.findByPk(riskId, { transaction });

    if (!risk) {
      throw new ServiceError("Risk tidak ditemukan.", 404);
    }

    const beforeJson = toPlain(risk);

    await risk.update(
      {
        status_revisi: WORKFLOW_STATUS.DITOLAK,
        alasan_revisi: reason,
        ditolak_oleh: userId,
        ditolak_pada: now(),
        last_revised_at: now(),
        last_revised_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    await createRiskHistory({
      risk,
      beforeJson,
      afterJson: toPlain(risk),
      alasanRevisi: reason,
      statusRevisi: WORKFLOW_STATUS.DITOLAK,
      actionType: HISTORY_ACTION.REJECT,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "MR Planning Risk berhasil ditolak.",
      data: toPlain(risk),
    };
  });
};

const createRevisionFromApprovedRisk = async ({
  riskId,
  body = {},
  user = null,
}) => {
  assertModelsLoaded();
  assertNoBlockedFields(body);

  const userId = getUserId(user);

  return sequelize.transaction(async (transaction) => {
    const risk = await MrPlanningRisk.findByPk(riskId, { transaction });

    ensureApprovedRevisable(risk);

    const beforeJson = clonePlain(risk);
    assertFinalReportNotOverwrite({
      is_final: !!beforeJson.is_locked || !!beforeJson.is_final,
      is_correction_mode: !!body.is_correction_mode,
    });
    const allowedPayload = pickAllowedFields(body);
    const nextVersion = Number(beforeJson.versi || 1) + 1;

    let nextPayload = {
      ...allowedPayload,

      versi: nextVersion,
      status_revisi: WORKFLOW_STATUS.DRAFT,

      alasan_revisi:
        allowedPayload.alasan_revisi ||
        "Revisi risk dari data approved.",

      last_revised_at: now(),
      last_revised_by: userId,

      // Reset workflow approval state karena revisi kembali menjadi draft.
      diverifikasi_oleh: null,
      diverifikasi_pada: null,
      disetujui_oleh: null,
      disetujui_pada: null,
      ditolak_oleh: null,
      ditolak_pada: null,

      updated_by: userId,
    };

    nextPayload = await recalculateRiskMatrixForPayload({
      baseRisk: beforeJson,
      payload: nextPayload,
      body,
      transaction,
    });

    nextPayload = await resolveReferenceLabelsForPayload({
      payload: nextPayload,
      transaction,
    });

    await risk.update(nextPayload, { transaction });

    if (
      [
        "objek_risiko",
        "nomor_temuan",
        "judul_temuan",
        "ringkasan_temuan",
        "rekomendasi",
        "rencana_tindak_lanjut_awal",
        "pic",
        "unit_terkait",
      ].some((field) => allowedPayload[field] !== undefined)
    ) {
      await syncLinkedContextItemFromRiskPayload({
        risk,
        payload: { ...beforeJson, ...allowedPayload, ...nextPayload },
        userId,
        transaction,
      });
    }

    const afterJson = clonePlain(risk);

    await createRiskHistory({
      risk,
      beforeJson,
      afterJson,
      alasanRevisi: nextPayload.alasan_revisi,
      statusRevisi: WORKFLOW_STATUS.DRAFT,
      actionType: HISTORY_ACTION.REVISI,
      userId,
      transaction,
    });

    return {
      success: true,
      message: "Revisi MR Planning Risk berhasil dibuat sebagai draft.",
      data: toPlain(risk),
    };
  });
};

const enrichRiskWithContextItem = async (riskRecord) => {
  if (!riskRecord) return riskRecord;

  // Penting:
  // Detail endpoint bisa menerima Sequelize instance dari mrRiskService.findById.
  // Jangan spread Sequelize instance langsung karena akan menghasilkan dataValues,
  // _previousDataValues, _options, dan membuat frontend gagal membaca field flat.
  const riskPlain = toPlain(riskRecord);

  let contextItem = null;

  const contextItemId =
    riskPlain.context_item_id ||
    (riskPlain.source_table === "proposal_intake" ? riskPlain.source_id : null);

  if (contextItemId) {
    contextItem = await MrPlanningContextItem.findByPk(contextItemId);
  }

  if (
    !contextItem &&
    riskPlain.context_id &&
    riskPlain.stage &&
    riskPlain.ref_id
  ) {
    contextItem = await MrPlanningContextItem.findOne({
      where: {
        mr_planning_context_id: riskPlain.context_id,
        stage: riskPlain.stage,
        ref_id: riskPlain.ref_id,
        is_active: true,
      },
      order: [["id", "ASC"]],
    });
  }

  if (!contextItem) {
    return riskPlain;
  }

  const itemPlain = toPlain(contextItem);
  const metadata = itemPlain.metadata_json || {};
  const contextMetadata = riskPlain.context?.metadata_json || {};
  const resolvedSeleraRefId = await resolveReferenceIdFromLabel({
    groupCode: "RISK_APPETITE",
    label:
      riskPlain.selera_risiko ||
      metadata.selera_risiko ||
      contextMetadata.selera_risiko ||
      riskPlain.context?.selera_risiko ||
      null,
    fallbackToFirstActive: true,
    transaction: null,
  });
  const resolvedStatusRefId = await resolveReferenceIdFromLabel({
    groupCode: "RISK_STATUS",
    label:
      riskPlain.status_risiko ||
      metadata.status_risiko ||
      contextMetadata.status_risiko ||
      riskPlain.context?.status_risiko ||
      null,
    transaction: null,
  });

  return {
    ...riskPlain,

    context_item: itemPlain,

    // Flatten context item technical linkage agar frontend form bisa membaca langsung
    context_item_id:
      riskPlain.context_item_id ||
      itemPlain.id ||
      null,

    source_table:
      riskPlain.source_table ||
      itemPlain.source_table ||
      null,

    source_id:
      riskPlain.source_id ||
      itemPlain.source_id ||
      itemPlain.id ||
      null,

    proposal_source_type:
      metadata.proposal_source_code ||
      metadata.proposal_source_type ||
      riskPlain.proposal_source_type ||
      null,

    proposal_source_ref_id:
      metadata.proposal_source_ref_id ||
      riskPlain.proposal_source_ref_id ||
      null,

    objek_risiko:
      itemPlain.nama_konteks ||
      itemPlain.nama_indikator ||
      riskPlain.objek_risiko ||
      null,

    judul_temuan:
      metadata.judul_temuan ||
      riskPlain.judul_temuan ||
      null,

    nomor_temuan:
      metadata.nomor_temuan ||
      riskPlain.nomor_temuan ||
      null,

    ringkasan_temuan:
      metadata.ringkasan_temuan ||
      riskPlain.ringkasan_temuan ||
      null,

    rekomendasi:
      metadata.rekomendasi ||
      riskPlain.rekomendasi ||
      null,

    status_tindak_lanjut:
      metadata.status_tindak_lanjut ||
      riskPlain.status_tindak_lanjut ||
      null,

    nama_kegiatan:
      metadata.nama_kegiatan ||
      riskPlain.nama_kegiatan ||
      null,

    akun_pos:
      metadata.akun_pos ||
      riskPlain.akun_pos ||
      null,

    jenis_dokumen_pertanggungjawaban:
      metadata.jenis_dokumen_pertanggungjawaban ||
      riskPlain.jenis_dokumen_pertanggungjawaban ||
      null,

    nama_kategori_baru:
      metadata.nama_kategori_baru ||
      riskPlain.nama_kategori_baru ||
      null,

    nama_indikator:
      itemPlain.nama_indikator ||
      itemPlain.nama_konteks ||
      riskPlain.nama_indikator ||
      null,

    indikator_nama:
      itemPlain.nama_indikator ||
      itemPlain.nama_konteks ||
      riskPlain.indikator_nama ||
      null,

    unit_terkait:
      itemPlain.penanggung_jawab ||
      metadata.pic ||
      riskPlain.unit_terkait ||
      null,

    pic:
      metadata.pic ||
      itemPlain.penanggung_jawab ||
      riskPlain.pic ||
      null,

    selera_risiko_ref_id:
      riskPlain.selera_risiko_ref_id ||
      riskPlain.context?.selera_risiko_ref_id ||
      resolvedSeleraRefId ||
      null,

    selera_risiko:
      riskPlain.selera_risiko ||
      metadata.selera_risiko ||
      contextMetadata.selera_risiko ||
      riskPlain.context?.selera_risiko ||
      null,

    status_risiko_ref_id:
      riskPlain.status_risiko_ref_id ||
      riskPlain.context?.status_risiko_ref_id ||
      resolvedStatusRefId ||
      null,

    status_risiko:
      riskPlain.status_risiko ||
      metadata.status_risiko ||
      contextMetadata.status_risiko ||
      riskPlain.context?.status_risiko ||
      'aktif',

    target_waktu:
      metadata.target_waktu ||
      riskPlain.target_waktu ||
      null,
  };
};

const enrichRisksWithContextItems = async (rows = []) => {
  const plainRows = rows.map((row) => toPlain(row));

  return Promise.all(
    plainRows.map((row) => enrichRiskWithContextItem(row))
  );
};

const getRiskDetail = async ({ riskId }) => {
  assertModelsLoaded();

  const risk = await MrPlanningRisk.findByPk(riskId, {
    include: [
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
      {
        model: MrPlanningRiskHistory,
        as: "histories",
        required: false,
      },
    ],
  });

  if (!risk) {
    throw new ServiceError("Risk tidak ditemukan.", 404);
  }

  const enrichedRisk = await enrichRiskWithContextItem(risk);

  return {
    success: true,
    message: "Detail MR Planning Risk berhasil diambil.",
    data: enrichedRisk,
  };
};

const getRisksByContext = async ({ contextId, limit = 50, offset = 0 }) => {
  assertModelsLoaded();

  const context = await findPlanningContext(contextId, null);

  const rows = await MrPlanningRisk.findAndCountAll({
    where: {
      context_id: context.id,
    },
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
    order: [["id", "DESC"]],
  });

  const enrichedRows = await Promise.all(
    rows.rows.map(async (row) => enrichRiskWithContextItem(toPlain(row)))
  );

  return {
    success: true,
    message: "Daftar MR Planning Risk berdasarkan context berhasil diambil.",
    total: rows.count,
    data: enrichedRows,
  };
};

module.exports = {
  ServiceError,

  USER_INPUT_FIELDS,
  TECHNICAL_BLOCKED_FIELDS,
  WORKFLOW_STATUS,

  createProposalIntake,
  createRiskFromContext,
  updateDraftRisk,
  createRevisionFromApprovedRisk,
  repairPlaceholderRiskSources,
  submitRiskForVerification,
  verifyRisk,
  approveRisk,
  rejectRisk,
  getRiskDetail,
  getRisksByContext,

  // Enrichment untuk list utama GET /api/mr-planning-risk
  enrichRiskWithContextItem,
  enrichRisksWithContextItems,
};
