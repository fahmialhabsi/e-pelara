"use strict";

const { Op } = require("sequelize");
const { Renstra, RPJMD, PlanningAuditEvent } = require("../models");
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
} = require("../services/planningWorkflowService");

function toInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
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

function toNullableDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function assertRpjmdOptional(rpjmd_id) {
  if (rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) return { ok: true };
  const row = await RPJMD.findByPk(Number(rpjmd_id));
  if (!row) return { ok: false, msg: "rpjmd_id tidak valid" };
  return { ok: true };
}

function parsePaging(query = {}) {
  const page = Math.max(toInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(toInt(query.limit) || 20, 1), 200);
  return { page, limit, offset: (page - 1) * limit };
}

function buildRenstraPayload(input = {}, existing = null, userId = null) {
  const periodeAwal = parseYear(input.periode_awal ?? existing?.periode_awal, {
    fieldName: "periode_awal",
  });
  const periodeAkhir = parseYear(input.periode_akhir ?? existing?.periode_akhir, {
    fieldName: "periode_akhir",
  });

  if (periodeAwal > periodeAkhir) {
    throw new Error("periode_awal tidak boleh lebih besar dari periode_akhir");
  }

  const status = normalizeStatus(input.status ?? existing?.status);
  const payload = {
    periode_awal: periodeAwal,
    periode_akhir: periodeAkhir,
    judul:
      asNullableString(input.judul ?? existing?.judul) ||
      `Renstra ${periodeAwal}-${periodeAkhir}`,
    ...buildStatusFields(status, userId, existing),
    epelara_renstra_id: asNullableString(
      input.epelara_renstra_id ?? existing?.epelara_renstra_id,
    ),
    sinkronisasi_status: normalizeSyncStatus(
      input.sinkronisasi_status ?? existing?.sinkronisasi_status,
    ),
    sinkronisasi_terakhir:
      input.sinkronisasi_terakhir !== undefined
        ? toNullableDate(input.sinkronisasi_terakhir)
        : existing?.sinkronisasi_terakhir ?? null,
    dokumen_url: asNullableString(input.dokumen_url ?? existing?.dokumen_url),
    dibuat_oleh: existing?.dibuat_oleh ?? userId ?? null,
    rpjmd_id: toInt(input.rpjmd_id ?? existing?.rpjmd_id),
  };

  for (let i = 1; i <= 5; i += 1) {
    const k = `pagu_tahun_${i}`;
    payload[k] = toNullableDecimal(input[k] ?? existing?.[k]);
  }
  payload.total_pagu = toNullableDecimal(input.total_pagu ?? existing?.total_pagu);

  if (!payload.judul) {
    throw new Error("judul Renstra wajib diisi");
  }

  const paguChk = validateMultiYearPaguAgainstTotal(payload);
  if (!paguChk.ok) {
    throw new Error(paguChk.message);
  }

  return payload;
}

const listRenstra = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const where = {};

    const statusQuery = asNullableString(req.query.status);
    if (statusQuery) where.status = normalizeStatus(statusQuery);

    const tahunFilter = toInt(req.query.tahun);
    if (tahunFilter) {
      where.periode_awal = { [Op.lte]: tahunFilter };
      where.periode_akhir = { [Op.gte]: tahunFilter };
    }

    const search = asNullableString(req.query.search);
    if (search) {
      where[Op.or] = [
        { judul: { [Op.like]: `%${search}%` } },
        { epelara_renstra_id: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Renstra.findAndCountAll({
      where,
      limit,
      offset,
      order: [["updated_at", "DESC"]],
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
    return res
      .status(500)
      .json({ success: false, message: "Gagal memuat Renstra", error: err.message });
  }
};

const getRenstra = async (req, res) => {
  try {
    const row = await Renstra.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renstra tidak ditemukan" });
    }
    return res.json({ success: true, data: row });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal memuat detail Renstra", error: err.message });
  }
};

const getRenstraAudit = async (req, res) => {
  try {
    const rows = await PlanningAuditEvent.findAll({
      where: { table_name: "renstra", record_id: Number(req.params.id) },
      order: [["changed_at", "DESC"]],
      limit: 100,
    });
    return res.json({ success: true, data: enrichPlanningAuditRows(rows) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createRenstra = async (req, res) => {
  try {
    const { payload, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const merged = { ...payload, rpjmd_id };
    const built = buildRenstraPayload(merged, null, req.user?.id ?? null);
    const chk = await assertRpjmdOptional(built.rpjmd_id);
    if (!chk.ok) return res.status(400).json({ success: false, message: chk.msg });

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const row = await Renstra.create({
      ...built,
      version: 1,
      is_active_version: true,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
    });

    logPlanning(req, {
      action: "CREATE",
      entityType: "RENSTRA",
      entityId: row.id,
      before: null,
      after: row,
    });

    const { old_value, new_value } = auditValuesFromRows(null, row);
    await writePlanningAudit({
      module_name: "renstra",
      table_name: "renstra",
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
      .json({ success: false, message: "Gagal membuat Renstra", error: err.message });
  }
};

const updateRenstra = async (req, res) => {
  try {
    const row = await Renstra.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renstra tidak ditemukan" });
    }

    const { payload, change_reason_text, change_reason_file, rpjmd_id } =
      splitPlanningBody(req.body);
    const merged = { ...payload, rpjmd_id };
    const built = buildRenstraPayload(merged, row, req.user?.id ?? null);
    const chk = await assertRpjmdOptional(built.rpjmd_id);
    if (!chk.ok) return res.status(400).json({ success: false, message: chk.msg });

    const before = toPlain(row);
    const version_before = Number(row.version) || 1;
    const version_after = version_before + 1;
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const oldSnap = captureRow(row);

    await row.update({
      ...built,
      version: version_after,
      is_active_version: true,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
    });

    const fresh = await Renstra.findByPk(req.params.id);

    logPlanning(req, {
      action: "UPDATE",
      entityType: "RENSTRA",
      entityId: row.id,
      before,
      after: fresh,
    });

    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "renstra",
      table_name: "renstra",
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
      .json({ success: false, message: "Gagal memperbarui Renstra", error: err.message });
  }
};

const deleteRenstra = async (req, res) => {
  try {
    const row = await Renstra.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renstra tidak ditemukan" });
    }

    const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const before = toPlain(row);
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const version_before = Number(row.version) || 1;

    const { old_value, new_value } = auditValuesFromRows(row, null);
    await writePlanningAudit({
      module_name: "renstra",
      table_name: "renstra",
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
      entityType: "RENSTRA",
      entityId: row.id,
      before,
      after: null,
    });

    return res.json({ success: true, message: "Renstra dihapus" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal menghapus Renstra", error: err.message });
  }
};

async function processStatusTransition(req, res, forcedAction = null) {
  try {
    const row = await Renstra.findByPk(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Renstra tidak ditemukan" });
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

    const fresh = await Renstra.findByPk(req.params.id);

    logStatusChange(req, {
      entityType: "RENSTRA",
      entityId: row.id,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      workflowAction: workflowAction || (input.status ? "direct_status" : null),
      note: asNullableString(input.catatan),
      before,
      after: fresh,
    });

    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "renstra",
      table_name: "renstra",
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
      message: `Status Renstra berhasil diubah ke ${nextStatus}`,
      data: fresh,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal mengubah status Renstra", error: err.message });
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
    const upstream = await ePelara.getRenstraOpd(token, req.query);
    const rows = Array.isArray(upstream) ? upstream : upstream?.data || [];

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errorSamples = [];

    for (const item of rows) {
      try {
        const epelaraId = asNullableString(item.id || item.renstra_id);
        if (!epelaraId) {
          skipped += 1;
          continue;
        }

        const existing = await Renstra.findOne({
          where: { epelara_renstra_id: epelaraId },
        });

        const payload = buildRenstraPayload(
          {
            periode_awal: toInt(item.tahun_awal || item.periode_awal || req.query.tahun),
            periode_akhir: toInt(item.tahun_akhir || item.periode_akhir || req.query.tahun),
            judul: item.judul || item.nama_dokumen,
            status: item.status || WORKFLOW_STATUS.DRAFT,
            epelara_renstra_id: epelaraId,
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
          await Renstra.create(payload);
          inserted += 1;
        }
      } catch (itemErr) {
        skipped += 1;
        if (errorSamples.length < 5) {
          errorSamples.push({
            item_id: item?.id || item?.renstra_id || null,
            error: itemErr.message,
          });
        }
      }
    }

    return res.json({
      success: true,
      message: "Sinkronisasi Renstra selesai",
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
      message: "Gagal sinkronisasi Renstra",
      error: err.message,
    });
  }
};

module.exports = {
  listRenstra,
  getRenstra,
  getAudit: getRenstraAudit,
  createRenstra,
  updateRenstra,
  deleteRenstra,
  updateStatus,
  runStatusAction,
  syncFromEPelara,

  // Alias kompatibilitas untuk style route/controller lama.
  getAll: listRenstra,
  getById: getRenstra,
  create: createRenstra,
  update: updateRenstra,
  destroy: deleteRenstra,
};
