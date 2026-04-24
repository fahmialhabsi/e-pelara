// controllers/rpjmdController.js — CRUD + audit + versi + alasan mutasi
const { RPJMD, PlanningAuditEvent } = require("../models");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");

const ALLOWED_TEXT_FIELDS = new Set([
  "nama_rpjmd",
  "kepala_daerah",
  "wakil_kepala_daerah",
  "periode_awal",
  "periode_akhir",
  "tahun_penetapan",
  "akronim",
]);

function pickRpjmdPatch(body) {
  const out = {};
  Object.entries(body || {}).forEach(([k, v]) => {
    if (ALLOWED_TEXT_FIELDS.has(k) && v !== undefined) out[k] = v;
  });
  return out;
}

exports.getRpjmdAudit = async (req, res) => {
  try {
    const rows = await PlanningAuditEvent.findAll({
      where: { table_name: "rpjmd", record_id: Number(req.params.id) },
      order: [["changed_at", "DESC"]],
      limit: 100,
    });
    return res.json({ success: true, data: enrichPlanningAuditRows(rows) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createRPJMD = async (req, res) => {
  try {
    const {
      nama_rpjmd,
      kepala_daerah,
      wakil_kepala_daerah,
      periode_awal,
      periode_akhir,
      tahun_penetapan,
      akronim,
    } = req.body;

    let foto_kepala_daerah = null;
    let foto_wakil_kepala_daerah = null;

    if (req.files) {
      if (req.files.foto_kepala_daerah) {
        foto_kepala_daerah = req.files.foto_kepala_daerah[0].filename;
      }
      if (req.files.foto_wakil_kepala_daerah) {
        foto_wakil_kepala_daerah = req.files.foto_wakil_kepala_daerah[0].filename;
      }
    }

    const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const uid = req.user?.id ?? req.user?.userId ?? null;

    const rpjmd = await RPJMD.create({
      nama_rpjmd,
      kepala_daerah,
      wakil_kepala_daerah,
      periode_awal,
      periode_akhir,
      tahun_penetapan,
      akronim,
      foto_kepala_daerah,
      foto_wakil_kepala_daerah,
      version: 1,
      is_active_version: true,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
    });

    const { old_value, new_value } = auditValuesFromRows(null, rpjmd);
    await writePlanningAudit({
      module_name: "rpjmd",
      table_name: "rpjmd",
      record_id: rpjmd.id,
      action_type: "CREATE",
      old_value,
      new_value,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
      changed_by: uid,
      version_before: null,
      version_after: 1,
    });

    res.status(201).json({ message: "RPJMD created successfully", rpjmd });
  } catch (err) {
    console.error("Error creating RPJMD:", err);
    res.status(500).json({ message: "Error creating RPJMD", error: err.message });
  }
};

exports.getRPJMD = async (req, res) => {
  try {
    const rpjmd = await RPJMD.findAll();
    res.status(200).json(rpjmd);
  } catch (err) {
    console.error("Error fetching RPJMD:", err);
    res.status(500).json({ message: "Error fetching RPJMD data", error: err.message });
  }
};

exports.getRPJMDById = async (req, res) => {
  try {
    const rpjmd = await RPJMD.findByPk(req.params.id);
    if (!rpjmd) return res.status(404).json({ message: "RPJMD not found" });
    res.status(200).json(rpjmd);
  } catch (err) {
    console.error("Error fetching RPJMD by ID:", err);
    res.status(500).json({ message: "Error fetching RPJMD", error: err.message });
  }
};

exports.updateRPJMD = async (req, res) => {
  try {
    const row = await RPJMD.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "RPJMD not found" });

    const { payload, change_reason_text, change_reason_file } = splitPlanningBody({
      ...req.body,
    });

    if (req.files) {
      if (req.files.foto_kepala_daerah) {
        row.foto_kepala_daerah = req.files.foto_kepala_daerah[0].filename;
      }
      if (req.files.foto_wakil_kepala_daerah) {
        row.foto_wakil_kepala_daerah = req.files.foto_wakil_kepala_daerah[0].filename;
      }
    }

    const patch = pickRpjmdPatch(payload);
    const version_before = Number(row.version) || 1;
    const version_after = version_before + 1;
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const oldSnap = captureRow(row);

    Object.assign(row, patch, {
      version: version_after,
      is_active_version: true,
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
    });

    await row.save();
    const fresh = await RPJMD.findByPk(req.params.id);

    const { old_value, new_value } = auditValuesFromRows(oldSnap, fresh);
    await writePlanningAudit({
      module_name: "rpjmd",
      table_name: "rpjmd",
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

    res.json({ message: "RPJMD updated successfully", rpjmd: fresh });
  } catch (err) {
    console.error("Error updating RPJMD:", err);
    res.status(500).json({ message: "Error updating RPJMD", error: err.message });
  }
};

exports.deleteRPJMD = async (req, res) => {
  try {
    const row = await RPJMD.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "RPJMD not found" });

    const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);
    const uid = req.user?.id ?? req.user?.userId ?? null;
    const version_before = Number(row.version) || 1;

    const { old_value, new_value } = auditValuesFromRows(row, null);
    await writePlanningAudit({
      module_name: "rpjmd",
      table_name: "rpjmd",
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
    res.json({ message: "RPJMD deleted successfully" });
  } catch (err) {
    console.error("Error deleting RPJMD:", err);
    res.status(500).json({ message: "Error deleting RPJMD", error: err.message });
  }
};
