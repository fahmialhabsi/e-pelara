"use strict";

const { Op, QueryTypes } = require("sequelize");
const {
  Renja,
  Renstra,
  PeriodeRpjmd,
  Rkpd,
  RPJMD,
  PlanningAuditEvent,
  sequelize,
} = require("../models");
const { linkRenjaToRkpd } = require("../services/renjaRkpdLinkService");
const ePelara = require("../services/ePelaraService");
const { logPlanning, logStatusChange, toPlain } = require("../services/planningAuditService");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  auditValuesFromRows,
  enrichPlanningAuditRows,
} = require("../services/planningDocumentAuditService");
const { workflowActionToAuditType } = require("../constants/planningAuditMaterialFields");
const { validateMultiYearPaguAgainstTotal } = require("../helpers/planningPaguConsistency");
const {
  WORKFLOW_STATUS,
  normalizeStatus,
  normalizeSyncStatus,
  normalizeAction,
  resolveNextStatus,
  assertTransition,
  getAllowedActions,
  isAdminOnlyStatus,
  isWorkflowAdminRole,
  buildStatusFields,
  parseYear,
  assertNonNegative,
  parseBoolean,
} = require("../services/planningWorkflowService");

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toNullableDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNullableString(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  return cleaned.length > 0 ? cleaned : null;
}

function toNullableDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsePaging(query = {}) {
  const page = Math.max(toInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(toInt(query.limit) || 20, 1), 200);
  return { page, limit, offset: (page - 1) * limit };
}

function isUnknownColumnError(err) {
  return /Unknown column/i.test(String(err?.message || ""));
}

function pickOrderColumn(availableColumns = []) {
  if (availableColumns.includes("updated_at")) return "updated_at";
  if (availableColumns.includes("updatedAt")) return "updatedAt";
  return "id";
}

function normalizeLegacyRenjaRow(row = {}) {
  const status = normalizeStatus(row.status ?? row.approval_status, "draft");
  const approvalStatus = String(
    row.approval_status || status || "draft",
  ).toUpperCase();

  return {
    ...row,
    status,
    approval_status: approvalStatus,
    judul: row.judul || row.program || null,
    sinkronisasi_status: row.sinkronisasi_status || "belum_sinkron",
  };
}

async function listRenjaLegacyCompat(req, res) {
  const { page, limit, offset } = parsePaging(req.query);
  const tahun = toInt(req.query.tahun);
  const statusFilter = asNullableString(req.query.status);
  const search = asNullableString(req.query.search);

  const tableInfo = await sequelize.getQueryInterface().describeTable("renja");
  const availableColumns = Object.keys(tableInfo || {});
  const availableSet = new Set(availableColumns);

  const selectCandidates = [
    "id",
    "tahun",
    "judul",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "indikator",
    "target",
    "anggaran",
    "status",
    "approval_status",
    "sinkronisasi_status",
    "sinkronisasi_terakhir",
    "updated_at",
    "updatedAt",
  ];
  const selectColumns = selectCandidates.filter((col) => availableSet.has(col));
  if (!selectColumns.length) selectColumns.push("id");

  const whereClauses = [];
  const replacements = { limit, offset };

  if (tahun && availableSet.has("tahun")) {
    whereClauses.push("`tahun` = :tahun");
    replacements.tahun = tahun;
  }
  if (statusFilter && availableSet.has("status")) {
    whereClauses.push("LOWER(`status`) = :status");
    replacements.status = normalizeStatus(statusFilter);
  }
  if (search) {
    const searchColumns = ["judul", "program", "kegiatan"].filter((col) =>
      availableSet.has(col),
    );
    if (searchColumns.length) {
      whereClauses.push(
        `(${searchColumns
          .map((col) => `LOWER(CAST(\`${col}\` AS CHAR)) LIKE :search`)
          .join(" OR ")})`,
      );
      replacements.search = `%${search.toLowerCase()}%`;
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const orderColumn = pickOrderColumn(availableColumns);
  const selectSql = selectColumns.map((col) => `\`${col}\``).join(", ");

  const rows = await sequelize.query(
    `SELECT ${selectSql} FROM \`renja\` ${whereSql} ORDER BY \`${orderColumn}\` DESC LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );
  const countRows = await sequelize.query(
    `SELECT COUNT(*) AS total FROM \`renja\` ${whereSql}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const total = Number(countRows?.[0]?.total || 0);

  return res.json({
    success: true,
    data: rows.map(normalizeLegacyRenjaRow),
    total,
    meta: {
      currentPage: page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      totalItems: total,
    },
    compatibility_mode: "legacy_schema_fallback",
  });
}

function resolveCurrentWorkflowStatus(row) {
  const status = normalizeStatus(row?.status, null);
  const approvalStatus = normalizeStatus(row?.approval_status, null);

  // Recovery data lama: approval_status sudah SUBMITTED/APPROVED/REJECTED
  // tapi kolom status masih "draft".
  if (
    status === WORKFLOW_STATUS.DRAFT &&
    approvalStatus &&
    approvalStatus !== WORKFLOW_STATUS.DRAFT
  ) {
    return approvalStatus;
  }

  return status || approvalStatus || WORKFLOW_STATUS.DRAFT;
}

function buildRenjaPayload(input = {}, existing = null, userId = null) {
  const tahun = parseYear(input.tahun ?? input.tahun_perencanaan ?? existing?.tahun, {
    fieldName: "tahun",
  });

  const status = normalizeStatus(input.status ?? existing?.status);
  const payload = {
    tahun,

    // Field refactor
    renstra_id: toInt(input.renstra_id ?? existing?.renstra_id),
    judul:
      asNullableString(input.judul ?? existing?.judul) ||
      asNullableString(input.program ?? existing?.program) ||
      `Renja ${tahun}`,
    perangkat_daerah: asNullableString(
      input.perangkat_daerah ?? existing?.perangkat_daerah,
    ),
    ketersediaan_submitted: parseBoolean(
      input.ketersediaan_submitted,
      existing?.ketersediaan_submitted ?? false,
    ),
    distribusi_submitted: parseBoolean(
      input.distribusi_submitted,
      existing?.distribusi_submitted ?? false,
    ),
    konsumsi_submitted: parseBoolean(
      input.konsumsi_submitted,
      existing?.konsumsi_submitted ?? false,
    ),
    uptd_submitted: parseBoolean(input.uptd_submitted, existing?.uptd_submitted ?? false),
    ...buildStatusFields(status, userId, existing),
    epelara_renja_id: asNullableString(
      input.epelara_renja_id ?? existing?.epelara_renja_id,
    ),
    sinkronisasi_status: normalizeSyncStatus(
      input.sinkronisasi_status ?? existing?.sinkronisasi_status,
    ),
    sinkronisasi_terakhir:
      input.sinkronisasi_terakhir !== undefined
        ? toNullableDate(input.sinkronisasi_terakhir)
        : existing?.sinkronisasi_terakhir ?? null,
    dibuat_oleh: existing?.dibuat_oleh ?? userId ?? null,

    // Field legacy
    periode_id: toInt(
      input.periode_id ?? input.periode_rpjmd_id ?? existing?.periode_id,
    ),
    program: asNullableString(input.program ?? input.nama_program ?? existing?.program),
    kegiatan: asNullableString(input.kegiatan ?? input.nama_kegiatan ?? existing?.kegiatan),
    sub_kegiatan: asNullableString(
      input.sub_kegiatan ?? input.nama_sub_kegiatan ?? existing?.sub_kegiatan,
    ),
    indikator: asNullableString(input.indikator ?? existing?.indikator),
    target: asNullableString(input.target ?? existing?.target),
    anggaran: toNullableDecimal(input.anggaran ?? existing?.anggaran),
    jenis_dokumen:
      asNullableString(input.jenis_dokumen ?? existing?.jenis_dokumen) || "renja",
    rkpd_id: toInt(input.rkpd_id ?? existing?.rkpd_id),
  };

  for (let i = 1; i <= 5; i += 1) {
    const k = `pagu_year_${i}`;
    payload[k] = toNullableDecimal(input[k] ?? existing?.[k]);
  }
  payload.pagu_total = toNullableDecimal(input.pagu_total ?? existing?.pagu_total);

  // Guard kompatibilitas schema lama yang mewajibkan field ini.
  payload.program = payload.program || payload.judul;
  payload.kegiatan = payload.kegiatan || "-";
  payload.sub_kegiatan = payload.sub_kegiatan || "-";

  return payload;
}

async function assertRpjmdId(rpjmd_id) {
  if (rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) return { ok: true };
  const row = await RPJMD.findByPk(Number(rpjmd_id));
  if (!row) return { ok: false, msg: "rpjmd_id tidak valid" };
  return { ok: true };
}

async function assertRenstraRpjmdBaseline(renstra_id, rpjmd_id) {
  if (!renstra_id || rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) {
    return { ok: true };
  }
  const renstra = await Renstra.findByPk(Number(renstra_id), {
    attributes: ["id", "rpjmd_id"],
  });
  if (!renstra) return { ok: false, msg: "Renstra acuan tidak ditemukan" };
  if (renstra.rpjmd_id != null && Number(renstra.rpjmd_id) !== Number(rpjmd_id)) {
    return {
      ok: false,
      msg: "rpjmd_id Renja harus sama dengan rpjmd_id pada Renstra acuan (baseline).",
    };
  }
  return { ok: true };
}

async function validateRenjaPayload(payload) {
  assertNonNegative(payload.anggaran, "anggaran");

  const paguChk = validateMultiYearPaguAgainstTotal(payload);
  if (!paguChk.ok) {
    throw new Error(paguChk.message);
  }

  if (payload.renstra_id) {
    const renstra = await Renstra.findByPk(payload.renstra_id, {
      attributes: ["id", "periode_awal", "periode_akhir", "rpjmd_id"],
    });
    if (!renstra) {
      throw new Error("renstra_id tidak ditemukan");
    }
    if (payload.tahun < renstra.periode_awal || payload.tahun > renstra.periode_akhir) {
      throw new Error(
        `tahun Renja (${payload.tahun}) di luar rentang Renstra (${renstra.periode_awal}-${renstra.periode_akhir})`,
      );
    }
  }

  if (payload.periode_id) {
    const periode = await PeriodeRpjmd.findByPk(payload.periode_id, {
      attributes: ["id", "tahun_awal", "tahun_akhir"],
    });
    if (!periode) {
      throw new Error("periode_id tidak ditemukan");
    }
    if (payload.tahun < periode.tahun_awal || payload.tahun > periode.tahun_akhir) {
      throw new Error(
        `tahun Renja (${payload.tahun}) di luar rentang periode (${periode.tahun_awal}-${periode.tahun_akhir})`,
      );
    }
  }
}

const listRenja = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const where = {};

    const tahun = toInt(req.query.tahun);
    if (tahun) where.tahun = tahun;

    const statusFilter = asNullableString(req.query.status);
    if (statusFilter) where.status = normalizeStatus(statusFilter);

    const search = asNullableString(req.query.search);
    if (search) {
      where[Op.or] = [
        { judul: { [Op.like]: `%${search}%` } },
        { program: { [Op.like]: `%${search}%` } },
        { kegiatan: { [Op.like]: `%${search}%` } },
      ];
    }

    const includeRkpd =
      String(req.query.include_rkpd || "").toLowerCase() === "1" ||
      String(req.query.include_rkpd || "").toLowerCase() === "true";

    const include = [];
    if (includeRkpd) {
      include.push({
        model: Rkpd,
        as: "rkpds",
        attributes: [
          "id",
          "tahun",
          "nama_sub_kegiatan",
          "kode_sub_kegiatan",
          "pagu_anggaran",
          "status",
          "renja_id",
        ],
        required: false,
        separate: true,
        limit: 200,
        order: [["id", "ASC"]],
      });
    }

    const { count, rows } = await Renja.findAndCountAll({
      where,
      limit,
      offset,
      order: [["updated_at", "DESC"]],
      include,
      distinct: true,
    });

    return res.json({
      success: true,
      data: rows,
      total: count,
      meta: {
        currentPage: page,
        totalPages: Math.max(Math.ceil(count / limit), 1),
        totalItems: count,
      },
    });
  } catch (err) {
    if (isUnknownColumnError(err)) {
      try {
        return await listRenjaLegacyCompat(req, res);
      } catch (fallbackErr) {
        return res.status(500).json({
          success: false,
          message: "Gagal memuat Renja (fallback compatibility)",
          error: fallbackErr.message,
        });
      }
    }
    return res
      .status(500)
      .json({ success: false, message: "Gagal memuat Renja", error: err.message });
  }
};

const getRenja = async (req, res) => {
  try {
    const row = await Renja.findByPk(req.params.id, {
      include: [
        {
          model: Rkpd,
          as: "rkpds",
          separate: true,
          limit: 1000,
          order: [["id", "ASC"]],
        },
        {
          model: Renstra,
          as: "renstra",
          required: false,
          attributes: ["id", "judul", "periode_awal", "periode_akhir", "status"],
        },
      ],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: "Renja tidak ditemukan" });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal memuat detail Renja", error: err.message });
  }
};

/** GET /api/renja/:id/rkpd — daftar RKPD yang terikat renja_id */
const listRenjaRkpd = async (req, res) => {
  try {
    const renjaId = toInt(req.params.id);
    if (!renjaId) {
      return res.status(400).json({ success: false, message: "ID Renja tidak valid" });
    }
    const parent = await Renja.findByPk(renjaId, {
      attributes: [
        "id",
        "tahun",
        "judul",
        "program",
        "kegiatan",
        "sub_kegiatan",
        "perangkat_daerah",
        "status",
      ],
    });
    if (!parent) {
      return res.status(404).json({ success: false, message: "Renja tidak ditemukan" });
    }

    const { page, limit, offset } = parsePaging(req.query);
    const { count, rows } = await Rkpd.findAndCountAll({
      where: { renja_id: renjaId },
      limit,
      offset,
      order: [["updated_at", "DESC"]],
    });

    return res.json({
      success: true,
      data: rows,
      renja: parent,
      total: count,
      meta: {
        currentPage: page,
        totalPages: Math.max(Math.ceil(count / limit), 1),
        totalItems: count,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal memuat RKPD untuk Renja",
      error: err.message,
    });
  }
};

/** POST /api/renja/link-rkpd — tautkan RKPD lama ke Renja (opsional dry_run) */
const postLinkRkpd = async (req, res) => {
  try {
    const dryRun =
      String(req.query.dry_run || "") === "1" || Boolean(req.body?.dry_run);
    const lim = toInt(req.query.limit);
    const result = await linkRenjaToRkpd({
      dryRun,
      limit: lim || undefined,
    });
    return res.json({
      success: true,
      message: dryRun
        ? "Simulasi penautan selesai (tidak ada perubahan DB)"
        : "Penautan Renja ↔ RKPD selesai",
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal menjalankan penautan Renja–RKPD",
      error: err.message,
    });
  }
};

const getRenjaAudit = async (req, res) => {
  try {
    const rows = await PlanningAuditEvent.findAll({
      where: { table_name: "renja", record_id: Number(req.params.id) },
      order: [["changed_at", "DESC"]],
      limit: 100,
    });
    return res.json({ success: true, data: enrichPlanningAuditRows(rows) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createRenja = async (req, res) => {
  try {
    const { payload: bodyRest, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const rp = await assertRpjmdId(rpjmd_id);
    if (!rp.ok) {
      return res.status(400).json({ success: false, message: rp.msg });
    }
    const payload = buildRenjaPayload(bodyRest, null, req.user?.id ?? null);
    await validateRenjaPayload(payload);
    const align = await assertRenstraRpjmdBaseline(
      payload.renstra_id,
      Number.isFinite(Number(rpjmd_id)) ? Number(rpjmd_id) : null,
    );
    if (!align.ok) {
      return res.status(400).json({ success: false, message: align.msg });
    }
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const row = await Renja.create({
      ...payload,
      version: 1,
      is_active_version: true,
      rpjmd_id: Number.isFinite(rpjmd_id) ? rpjmd_id : null,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
    });

    logPlanning(req, {
      action: "CREATE",
      entityType: "RENJA",
      entityId: row.id,
      before: null,
      after: row,
    });

    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "renja",
      table_name: "renja",
      record_id: row.id,
      action_type: "CREATE",
      old_value,
      new_value,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
      changed_by: uid,
      version_before: null,
      version_after: 1,
    });

    return res.status(201).json({ success: true, data: row });
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Gagal membuat Renja", error: err.message });
  }
};

const updateRenja = async (req, res) => {
  try {
    const row = await Renja.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renja tidak ditemukan" });
    }

    const { payload: bodyRest, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const rp = await assertRpjmdId(rpjmd_id);
    if (!rp.ok) {
      return res.status(400).json({ success: false, message: rp.msg });
    }

    const before = toPlain(row);
    const payload = buildRenjaPayload(bodyRest, row, req.user?.id ?? null);
    await validateRenjaPayload(payload);
    const effectiveRpjmd =
      rpjmd_id != null && Number.isFinite(Number(rpjmd_id)) ? Number(rpjmd_id) : row.rpjmd_id;
    const align = await assertRenstraRpjmdBaseline(payload.renstra_id, effectiveRpjmd);
    if (!align.ok) {
      return res.status(400).json({ success: false, message: align.msg });
    }

    const version_before = Number(row.version) || 1;
    const version_after = version_before + 1;
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const oldSnap = captureRow(row);

    await row.update({
      ...payload,
      version: version_after,
      is_active_version: true,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
      rpjmd_id:
        rpjmd_id != null && Number.isFinite(rpjmd_id) ? rpjmd_id : row.rpjmd_id,
    });

    const fresh = await Renja.findByPk(req.params.id);

    logPlanning(req, {
      action: "UPDATE",
      entityType: "RENJA",
      entityId: row.id,
      before,
      after: fresh,
    });

    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "renja",
      table_name: "renja",
      record_id: row.id,
      action_type: "UPDATE",
      old_value,
      new_value,
      change_reason_text,
      change_reason_file,
      changed_by: uid,
      version_before,
      version_after,
    });

    return res.json({ success: true, data: fresh });
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Gagal memperbarui Renja", error: err.message });
  }
};

const deleteRenja = async (req, res) => {
  try {
    const row = await Renja.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renja tidak ditemukan" });
    }

    const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const before = toPlain(row);
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const version_before = Number(row.version) || 1;

    const { old_value, new_value } = auditValuesFromRows(row, null);
    await writePlanningAudit({
      module_name: "renja",
      table_name: "renja",
      record_id: row.id,
      action_type: "DELETE",
      old_value,
      new_value,
      change_reason_text,
      change_reason_file,
      changed_by: uid,
      version_before,
      version_after: null,
    });

    await row.destroy();

    logPlanning(req, {
      action: "DELETE",
      entityType: "RENJA",
      entityId: row.id,
      before,
      after: null,
    });

    return res.json({ success: true, message: "Renja dihapus" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal menghapus Renja", error: err.message });
  }
};

async function processStatusTransition(req, res, forcedAction = null) {
  try {
    const row = await Renja.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renja tidak ditemukan" });
    }

    const { change_reason_text, change_reason_file } = splitPlanningBody(req.body || {});
    const reasonText = String(change_reason_text || "").trim();
    const reasonFile = String(change_reason_file || "").trim();
    if (!reasonText && !reasonFile) {
      return res.status(400).json({
        success: false,
        code: "CHANGE_REASON_REQUIRED",
        message: "Alasan wajib untuk transisi workflow (change_reason_text atau change_reason_file).",
      });
    }

    const input = {
      ...(req.body || {}),
      ...(forcedAction ? { action: forcedAction } : {}),
    };

    const currentStatus = resolveCurrentWorkflowStatus(row);
    const nextStatus = resolveNextStatus(currentStatus, input);
    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        message: `action atau status wajib diisi. Action valid: ${getAllowedActions().join(", ")}`,
      });
    }

    const transition = assertTransition(currentStatus, nextStatus);
    if (!transition.ok) {
      return res.status(422).json({ success: false, message: transition.message });
    }

    if (isAdminOnlyStatus(nextStatus) && !isWorkflowAdminRole(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Hanya ADMINISTRATOR/SUPER_ADMIN yang bisa approve atau reject.",
      });
    }

    const before = toPlain(row);
    const workflowAction = normalizeAction(input.action) || forcedAction;
    const auditAction = workflowActionToAuditType(workflowAction, "WORKFLOW");
    const oldSnap = captureRow(row);
    const version_before = Number(row.version) || 1;
    const version_after = version_before + 1;
    const uid = req.user?.id ?? req.user?.userId ?? null;

    await row.update({
      ...buildStatusFields(nextStatus, req.user?.id ?? null, row),
      version: version_after,
      is_active_version: true,
      change_reason_text: reasonText || null,
      change_reason_file: reasonFile || null,
    });

    const fresh = await Renja.findByPk(req.params.id);

    logStatusChange(req, {
      entityType: "RENJA",
      entityId: row.id,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      workflowAction: workflowAction || (input.status ? "direct_status" : null),
      note: asNullableString(input.catatan ?? input.note),
      before,
      after: fresh,
    });

    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "renja",
      table_name: "renja",
      record_id: row.id,
      action_type: auditAction,
      old_value,
      new_value,
      change_reason_text: reasonText || null,
      change_reason_file: reasonFile || null,
      changed_by: uid,
      version_before,
      version_after,
    });

    return res.json({
      success: true,
      message: `Status Renja berhasil diubah ke ${nextStatus}`,
      data: fresh,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengubah status Renja", error: err.message });
  }
}

const updateStatus = async (req, res) => {
  return processStatusTransition(req, res);
};

const runStatusAction = async (req, res) => {
  return processStatusTransition(req, res, req.params.action);
};

const syncFromEPelara = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") || null;
    const upstream = await ePelara.getRenja(token, req.query);
    const rows = Array.isArray(upstream) ? upstream : upstream?.data || [];

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errorSamples = [];

    for (const item of rows) {
      try {
        const epelaraId = asNullableString(item.id || item.renja_id);
        if (!epelaraId) {
          skipped += 1;
          continue;
        }

        const existing = await Renja.findOne({
          where: { epelara_renja_id: epelaraId },
        });

        const payload = buildRenjaPayload(
          {
            tahun: toInt(item.tahun || item.tahun_anggaran || req.query.tahun),
            judul: item.judul || item.nama_dokumen,
            status: item.status || WORKFLOW_STATUS.DRAFT,
            epelara_renja_id: epelaraId,
            sinkronisasi_status: "sinkron",
            sinkronisasi_terakhir: new Date(),
          },
          existing,
          req.user?.id ?? null,
        );

        if (existing) {
          await existing.update(payload);
          updated += 1;
        } else {
          await Renja.create(payload);
          inserted += 1;
        }
      } catch (itemErr) {
        skipped += 1;
        if (errorSamples.length < 5) {
          errorSamples.push({
            item_id: item?.id || item?.renja_id || null,
            error: itemErr.message,
          });
        }
      }
    }

    return res.json({
      success: true,
      message: "Sinkronisasi Renja selesai",
      data: {
        source: "e-pelara-stub",
        total_received: rows.length,
        inserted,
        updated,
        skipped,
        error_samples: errorSamples,
      },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      message: "Gagal sinkronisasi Renja",
      error: err.message,
    });
  }
};

module.exports = {
  listRenja,
  getRenja,
  listRenjaRkpd,
  postLinkRkpd,
  createRenja,
  updateRenja,
  deleteRenja,
  updateStatus,
  runStatusAction,
  syncFromEPelara,

  // Alias kompatibilitas style lama.
  getAll: listRenja,
  getById: getRenja,
  getAudit: getRenjaAudit,
  create: createRenja,
  update: updateRenja,
  destroy: deleteRenja,
  delete: deleteRenja,
};
