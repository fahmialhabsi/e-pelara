"use strict";

const { Op, QueryTypes } = require("sequelize");
const {
  Rkpd,
  PeriodeRpjmd,
  Renja,
  RPJMD,
  PlanningAuditEvent,
  sequelize,
} = require("../models");
const ePelara = require("../services/ePelaraService");
const { logPlanning, logStatusChange, toPlain } = require("../services/planningAuditService");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");
const { workflowActionToAuditType } = require("../constants/planningAuditMaterialFields");
const { validateMultiYearPaguAgainstTotal } = require("../helpers/planningPaguConsistency");
const {
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
} = require("../services/planningWorkflowService");

async function assertRpjmdId(rpjmd_id) {
  if (rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) return { ok: true };
  const row = await RPJMD.findByPk(Number(rpjmd_id));
  if (!row) return { ok: false, msg: "rpjmd_id tidak valid" };
  return { ok: true };
}

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

function normalizeLegacyRkpdRow(row = {}) {
  const status = normalizeStatus(row.status ?? row.approval_status, "draft");
  const approvalStatus = String(
    row.approval_status || status || "draft",
  ).toUpperCase();

  return {
    ...row,
    status,
    approval_status: approvalStatus,
    nama_program: row.nama_program || row.program || null,
    nama_kegiatan: row.nama_kegiatan || row.kegiatan || null,
    nama_sub_kegiatan: row.nama_sub_kegiatan || row.sub_kegiatan || null,
    pagu_anggaran:
      row.pagu_anggaran !== undefined && row.pagu_anggaran !== null
        ? row.pagu_anggaran
        : row.anggaran ?? null,
    opd_penanggung_jawab:
      row.opd_penanggung_jawab || row.penanggung_jawab || null,
    sinkronisasi_status: row.sinkronisasi_status || "belum_sinkron",
  };
}

async function listRkpdLegacyCompat(req, res) {
  const { page, limit, offset } = parsePaging(req.query);
  const tahun = toInt(req.query.tahun);
  const status = asNullableString(req.query.status);
  const search = asNullableString(req.query.search);

  const tableInfo = await sequelize.getQueryInterface().describeTable("rkpd");
  const availableColumns = Object.keys(tableInfo || {});
  const availableSet = new Set(availableColumns);

  const selectCandidates = [
    "id",
    "tahun",
    "renja_id",
    "kode_program",
    "nama_program",
    "kode_kegiatan",
    "nama_kegiatan",
    "kode_sub_kegiatan",
    "nama_sub_kegiatan",
    "pagu_anggaran",
    "opd_penanggung_jawab",
    "status",
    "approval_status",
    "sinkronisasi_status",
    "updated_at",
    "updatedAt",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "anggaran",
    "penanggung_jawab",
  ];
  const selectColumns = selectCandidates.filter((col) => availableSet.has(col));
  if (!selectColumns.length) selectColumns.push("id");

  const whereClauses = [];
  const replacements = { limit, offset };

  if (tahun && availableSet.has("tahun")) {
    whereClauses.push("`tahun` = :tahun");
    replacements.tahun = tahun;
  }
  if (status && availableSet.has("status")) {
    whereClauses.push("LOWER(`status`) = :status");
    replacements.status = normalizeStatus(status);
  }
  if (search) {
    const searchColumns = [
      "nama_program",
      "nama_kegiatan",
      "nama_sub_kegiatan",
      "kode_sub_kegiatan",
      "program",
      "kegiatan",
      "sub_kegiatan",
    ].filter((col) => availableSet.has(col));

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
    `SELECT ${selectSql} FROM \`rkpd\` ${whereSql} ORDER BY \`${orderColumn}\` DESC LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  const countRows = await sequelize.query(
    `SELECT COUNT(*) AS total FROM \`rkpd\` ${whereSql}`,
    { replacements, type: QueryTypes.SELECT },
  );
  const total = Number(countRows?.[0]?.total || 0);

  return res.json({
    success: true,
    data: rows.map(normalizeLegacyRkpdRow),
    total,
    meta: {
      currentPage: page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      totalItems: total,
    },
    compatibility_mode: "legacy_schema_fallback",
  });
}

async function getRkpdLegacyCompatById(req, res) {
  const tableInfo = await sequelize.getQueryInterface().describeTable("rkpd");
  const availableColumns = Object.keys(tableInfo || {});
  const availableSet = new Set(availableColumns);

  const selectCandidates = [
    "id",
    "tahun",
    "renja_id",
    "kode_program",
    "nama_program",
    "kode_kegiatan",
    "nama_kegiatan",
    "kode_sub_kegiatan",
    "nama_sub_kegiatan",
    "indikator",
    "target",
    "satuan",
    "pagu_anggaran",
    "sumber_dana",
    "opd_penanggung_jawab",
    "status",
    "approval_status",
    "sinkronisasi_status",
    "sinkronisasi_terakhir",
    "periode_id",
    "program",
    "kegiatan",
    "sub_kegiatan",
    "anggaran",
    "penanggung_jawab",
  ];
  const selectColumns = selectCandidates.filter((col) => availableSet.has(col));
  if (!selectColumns.length) selectColumns.push("id");

  const rows = await sequelize.query(
    `SELECT ${selectColumns.map((col) => `\`${col}\``).join(", ")} FROM \`rkpd\` WHERE \`id\` = :id LIMIT 1`,
    { replacements: { id: req.params.id }, type: QueryTypes.SELECT },
  );

  if (!rows.length) {
    return res.status(404).json({ success: false, message: "RKPD tidak ditemukan" });
  }

  return res.json({
    success: true,
    data: normalizeLegacyRkpdRow(rows[0]),
    compatibility_mode: "legacy_schema_fallback",
  });
}

function buildRkpdPayload(input = {}, existing = null, userId = null) {
  const tahun = parseYear(input.tahun ?? existing?.tahun, { fieldName: "tahun" });

  const status = normalizeStatus(input.status ?? existing?.status);
  const periodeId = toInt(
    input.periode_id ?? input.periode_rpjmd_id ?? existing?.periode_id ?? existing?.periode_rpjmd_id,
  );
  const pagu = toNullableDecimal(input.pagu_anggaran ?? existing?.pagu_anggaran);

  const payload = {
    tahun,
    renja_id: toInt(input.renja_id ?? existing?.renja_id),

    // Field refactor (doc-centric)
    periode_rpjmd_id: periodeId,
    kode_program: asNullableString(input.kode_program ?? existing?.kode_program),
    nama_program: asNullableString(input.nama_program ?? existing?.nama_program),
    kode_kegiatan: asNullableString(input.kode_kegiatan ?? existing?.kode_kegiatan),
    nama_kegiatan: asNullableString(input.nama_kegiatan ?? existing?.nama_kegiatan),
    kode_sub_kegiatan: asNullableString(
      input.kode_sub_kegiatan ?? existing?.kode_sub_kegiatan,
    ),
    nama_sub_kegiatan: asNullableString(
      input.nama_sub_kegiatan ?? existing?.nama_sub_kegiatan,
    ),
    indikator: asNullableString(input.indikator ?? existing?.indikator),
    target: toNullableDecimal(input.target ?? existing?.target),
    satuan: asNullableString(input.satuan ?? existing?.satuan),
    pagu_anggaran: pagu,
    sumber_dana: asNullableString(input.sumber_dana ?? existing?.sumber_dana),
    opd_penanggung_jawab: asNullableString(
      input.opd_penanggung_jawab ?? existing?.opd_penanggung_jawab,
    ),
    ...buildStatusFields(status, userId, existing),
    epelara_rkpd_id: asNullableString(input.epelara_rkpd_id ?? existing?.epelara_rkpd_id),
    sinkronisasi_status: normalizeSyncStatus(
      input.sinkronisasi_status ?? existing?.sinkronisasi_status,
    ),
    sinkronisasi_terakhir:
      input.sinkronisasi_terakhir !== undefined
        ? toNullableDate(input.sinkronisasi_terakhir)
        : existing?.sinkronisasi_terakhir ?? null,
    dibuat_oleh: existing?.dibuat_oleh ?? userId ?? null,

    // Field legacy (tetap dipertahankan agar aman)
    periode_id: periodeId,
    opd_id: toInt(input.opd_id ?? existing?.opd_id),
    visi_id: toInt(input.visi_id ?? existing?.visi_id),
    misi_id: toInt(input.misi_id ?? existing?.misi_id),
    tujuan_id: toInt(input.tujuan_id ?? existing?.tujuan_id),
    sasaran_id: toInt(input.sasaran_id ?? existing?.sasaran_id),
    strategi_id: toInt(input.strategi_id ?? existing?.strategi_id),
    arah_id: toInt(input.arah_id ?? existing?.arah_id),
    program_id: toInt(input.program_id ?? existing?.program_id),
    kegiatan_id: toInt(input.kegiatan_id ?? existing?.kegiatan_id),
    sub_kegiatan_id: toInt(input.sub_kegiatan_id ?? existing?.sub_kegiatan_id),
    renstra_program_id: toInt(input.renstra_program_id ?? existing?.renstra_program_id),
    anggaran: toNullableDecimal(input.anggaran ?? existing?.anggaran ?? pagu),
    jenis_dokumen:
      asNullableString(input.jenis_dokumen ?? existing?.jenis_dokumen) || "rkpd",
    arah_kebijakan_id: toInt(input.arah_kebijakan_id ?? existing?.arah_kebijakan_id),
    penanggung_jawab: asNullableString(
      input.penanggung_jawab ?? existing?.penanggung_jawab,
    ),
    prioritas_daerah_id: toInt(
      input.prioritas_daerah_id ?? existing?.prioritas_daerah_id,
    ),
    prioritas_kepala_daerah_id: toInt(
      input.prioritas_kepala_daerah_id ?? existing?.prioritas_kepala_daerah_id,
    ),
    prioritas_nasional_id: toInt(
      input.prioritas_nasional_id ?? existing?.prioritas_nasional_id,
    ),
  };

  for (let i = 1; i <= 5; i += 1) {
    const k = `pagu_year_${i}`;
    payload[k] = toNullableDecimal(input[k] ?? existing?.[k]);
  }
  payload.pagu_total = toNullableDecimal(input.pagu_total ?? existing?.pagu_total);

  return payload;
}

async function validateRkpdPayload(payload) {
  const paguChk = validateMultiYearPaguAgainstTotal(payload);
  if (!paguChk.ok) {
    throw new Error(paguChk.message);
  }

  let periodeId = payload.periode_rpjmd_id || payload.periode_id;

  if (payload.renja_id) {
    const renja = await Renja.findByPk(payload.renja_id, {
      attributes: ["id", "tahun", "periode_id", "rpjmd_id"],
    });
    if (!renja) {
      throw new Error("renja_id tidak ditemukan");
    }
    if (Number(renja.tahun) !== Number(payload.tahun)) {
      throw new Error(
        `tahun RKPD (${payload.tahun}) harus sama dengan tahun Renja (${renja.tahun})`,
      );
    }
    if (
      payload.rpjmd_id != null &&
      renja.rpjmd_id != null &&
      Number(renja.rpjmd_id) !== Number(payload.rpjmd_id)
    ) {
      throw new Error("rpjmd_id RKPD harus selaras dengan rpjmd_id Renja induk (baseline).");
    }
    if (!periodeId && renja.periode_id) {
      periodeId = renja.periode_id;
      payload.periode_rpjmd_id = periodeId;
      payload.periode_id = periodeId;
    }
  }

  if (!periodeId) {
    throw new Error(
      "periode_id atau periode_rpjmd_id wajib diisi, atau gunakan renja_id yang memiliki periode",
    );
  }

  if (
    payload.periode_rpjmd_id &&
    payload.periode_id &&
    payload.periode_rpjmd_id !== payload.periode_id
  ) {
    throw new Error("periode_id dan periode_rpjmd_id harus merujuk periode yang sama");
  }

  if (periodeId) {
    const periode = await PeriodeRpjmd.findByPk(periodeId, {
      attributes: ["id", "tahun_awal", "tahun_akhir"],
    });
    if (!periode) {
      throw new Error("Periode RPJMD tidak ditemukan");
    }
    if (payload.tahun < periode.tahun_awal || payload.tahun > periode.tahun_akhir) {
      throw new Error(
        `tahun RKPD (${payload.tahun}) di luar rentang periode (${periode.tahun_awal}-${periode.tahun_akhir})`,
      );
    }
  }

  assertNonNegative(payload.target, "target");
  assertNonNegative(payload.pagu_anggaran, "pagu_anggaran");
  assertNonNegative(payload.anggaran, "anggaran");

  const hasCoreIdentifier = [
    payload.sub_kegiatan_id,
    payload.kode_sub_kegiatan,
    payload.nama_sub_kegiatan,
    payload.kegiatan_id,
    payload.nama_kegiatan,
    payload.program_id,
    payload.nama_program,
  ].some((value) => value !== null && value !== undefined && String(value).trim() !== "");

  if (!hasCoreIdentifier) {
    throw new Error(
      "Minimal satu identitas program/kegiatan/sub-kegiatan wajib diisi",
    );
  }
}

const getAll = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const where = {};

    const tahun = toInt(req.query.tahun);
    if (tahun) where.tahun = tahun;

    const status = asNullableString(req.query.status);
    if (status) where.status = normalizeStatus(status);

    const search = asNullableString(req.query.search);
    if (search) {
      where[Op.or] = [
        { nama_program: { [Op.like]: `%${search}%` } },
        { nama_kegiatan: { [Op.like]: `%${search}%` } },
        { nama_sub_kegiatan: { [Op.like]: `%${search}%` } },
        { kode_sub_kegiatan: { [Op.like]: `%${search}%` } },
      ];
    }

    const renjaIdFilter = toInt(req.query.renja_id);
    if (renjaIdFilter) {
      where.renja_id = renjaIdFilter;
    }

    const includeRenja =
      String(req.query.include_renja || "").toLowerCase() === "1" ||
      String(req.query.include_renja || "").toLowerCase() === "true";

    const include = [];
    if (includeRenja) {
      include.push({
        model: Renja,
        as: "renja",
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
        required: false,
      });
    }

    const { count, rows } = await Rkpd.findAndCountAll({
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
        return await listRkpdLegacyCompat(req, res);
      } catch (fallbackErr) {
        return res.status(500).json({
          success: false,
          message: "Gagal memuat RKPD (fallback compatibility)",
          error: fallbackErr.message,
        });
      }
    }
    return res
      .status(500)
      .json({ success: false, message: "Gagal memuat RKPD", error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const row = await Rkpd.findByPk(req.params.id, {
      include: [
        {
          model: Renja,
          as: "renja",
          required: false,
        },
      ],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: "RKPD tidak ditemukan" });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    if (isUnknownColumnError(err)) {
      try {
        return await getRkpdLegacyCompatById(req, res);
      } catch (fallbackErr) {
        return res.status(500).json({
          success: false,
          message: "Gagal memuat detail RKPD (fallback compatibility)",
          error: fallbackErr.message,
        });
      }
    }
    return res
      .status(500)
      .json({ success: false, message: "Gagal memuat detail RKPD", error: err.message });
  }
};

const getRkpdAudit = async (req, res) => {
  try {
    const rows = await PlanningAuditEvent.findAll({
      where: { table_name: "rkpd", record_id: Number(req.params.id) },
      order: [["changed_at", "DESC"]],
      limit: 100,
    });
    return res.json({ success: true, data: enrichPlanningAuditRows(rows) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { payload: bodyRest, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const rp = await assertRpjmdId(rpjmd_id);
    if (!rp.ok) {
      return res.status(400).json({ success: false, message: rp.msg });
    }
    const payload = buildRkpdPayload(bodyRest, null, req.user?.id ?? null);
    await validateRkpdPayload({
      ...payload,
      rpjmd_id: Number.isFinite(Number(rpjmd_id)) ? Number(rpjmd_id) : payload.rpjmd_id,
    });
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const row = await Rkpd.create({
      ...payload,
      version: 1,
      is_active_version: true,
      rpjmd_id: Number.isFinite(rpjmd_id) ? rpjmd_id : null,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
    });

    logPlanning(req, {
      action: "CREATE",
      entityType: "RKPD",
      entityId: row.id,
      before: null,
      after: row,
    });

    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "rkpd",
      table_name: "rkpd",
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
      .json({ success: false, message: "Gagal membuat RKPD", error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const row = await Rkpd.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "RKPD tidak ditemukan" });
    }

    const { payload: bodyRest, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const rp = await assertRpjmdId(rpjmd_id);
    if (!rp.ok) {
      return res.status(400).json({ success: false, message: rp.msg });
    }

    const before = toPlain(row);
    const payload = buildRkpdPayload(bodyRest, row, req.user?.id ?? null);
    const mergedRpjmd =
      rpjmd_id != null && Number.isFinite(Number(rpjmd_id)) ? Number(rpjmd_id) : row.rpjmd_id;
    await validateRkpdPayload({ ...payload, rpjmd_id: mergedRpjmd });

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

    const fresh = await Rkpd.findByPk(req.params.id);

    logPlanning(req, {
      action: "UPDATE",
      entityType: "RKPD",
      entityId: row.id,
      before,
      after: fresh,
    });

    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "rkpd",
      table_name: "rkpd",
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
      .json({ success: false, message: "Gagal memperbarui RKPD", error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const row = await Rkpd.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "RKPD tidak ditemukan" });
    }

    const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const before = toPlain(row);
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const version_before = Number(row.version) || 1;

    const { old_value, new_value } = auditValuesFromRows(row, null);
    await writePlanningAudit({
      module_name: "rkpd",
      table_name: "rkpd",
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
      entityType: "RKPD",
      entityId: row.id,
      before,
      after: null,
    });

    return res.json({ success: true, message: "RKPD dihapus" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal menghapus RKPD", error: err.message });
  }
};

async function processStatusTransition(req, res, forcedAction = null) {
  try {
    const row = await Rkpd.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "RKPD tidak ditemukan" });
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

    const currentStatus = normalizeStatus(row.status);
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

    const fresh = await Rkpd.findByPk(req.params.id);

    logStatusChange(req, {
      entityType: "RKPD",
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
      module_name: "rkpd",
      table_name: "rkpd",
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
      message: `Status RKPD berhasil diubah ke ${nextStatus}`,
      data: fresh,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengubah status RKPD", error: err.message });
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
    const syncResult = await ePelara.syncRkpd(token, req.query);
    const isStub = syncResult?.status === "stub" || syncResult?.ready === false;

    return res.json({
      success: true,
      message: isStub
        ? "Sinkronisasi RKPD berjalan dalam mode stub lokal."
        : "Sinkronisasi RKPD selesai.",
      data: syncResult,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      message: "Gagal menjalankan sinkronisasi RKPD (stub)",
      error: err.message,
    });
  }
};

const noteIntegrasiTodo = (req, res) => {
  return syncFromEPelara(req, res);
};

const exportExcel = noteIntegrasiTodo;
const exportPdf = noteIntegrasiTodo;
const getPerubahanSkema = noteIntegrasiTodo;

module.exports = {
  getAll,
  getById,
  getAudit: getRkpdAudit,
  create,
  update,
  remove,
  delete: remove,
  updateStatus,
  runStatusAction,
  syncFromEPelara,
  noteIntegrasiTodo,
  exportExcel,
  exportPdf,
  getPerubahanSkema,

  // Alias untuk style controller sebelumnya.
  listRkpd: getAll,
  getRkpd: getById,
  createRkpd: create,
  updateRkpd: update,
  deleteRkpd: remove,
};
