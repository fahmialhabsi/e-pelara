const { Rka, PeriodeRpjmd, Renja, RPJMD, PlanningAuditEvent } = require("../models");
const Joi = require("joi");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");
const { validateMultiYearPaguAgainstTotal } = require("../helpers/planningPaguConsistency");
const { assertEffectiveRpjmdId } = require("../helpers/rpjmdBaseline");

const rkaSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),
  indikator: Joi.string().allow(null, ""),
  target: Joi.string().allow(null, ""),
  anggaran: Joi.number().allow(null),
  jenis_dokumen: Joi.string().allow(null, ""),
  renja_id: Joi.number().allow(null),
  pagu_year_1: Joi.number().allow(null),
  pagu_year_2: Joi.number().allow(null),
  pagu_year_3: Joi.number().allow(null),
  pagu_year_4: Joi.number().allow(null),
  pagu_year_5: Joi.number().allow(null),
  pagu_total: Joi.number().allow(null),
});

async function assertRenjaChain(renja_id) {
  if (renja_id == null || renja_id === "") return { ok: true };
  const id = Number(renja_id);
  if (!Number.isFinite(id)) return { ok: false, msg: "renja_id tidak valid" };
  const row = await Renja.findByPk(id);
  if (!row) return { ok: false, msg: "Renja tidak ditemukan untuk renja_id" };
  return { ok: true };
}

async function assertRkaRenjaRpjmdBaseline(renja_id, rpjmd_id) {
  if (renja_id == null || rpjmd_id == null || !Number.isFinite(Number(rpjmd_id))) {
    return { ok: true };
  }
  const renja = await Renja.findByPk(Number(renja_id), { attributes: ["rpjmd_id"] });
  if (renja && renja.rpjmd_id != null && Number(renja.rpjmd_id) !== Number(rpjmd_id)) {
    return { ok: false, msg: "rpjmd_id RKA harus selaras dengan Renja (baseline)." };
  }
  return { ok: true };
}

module.exports = {
  async getAudit(req, res) {
    try {
      const { id } = req.params;
      const rows = await PlanningAuditEvent.findAll({
        where: { table_name: "rka", record_id: Number(id) },
        order: [["changed_at", "DESC"]],
        limit: 100,
      });
      res.json({ success: true, data: enrichPlanningAuditRows(rows) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await Rka.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: "periode" }],
        order: [["tahun", "DESC"]],
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Rka.findByPk(id, {
        include: [{ model: PeriodeRpjmd, as: "periode" }],
      });

      if (!data) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { payload, change_reason_text, change_reason_file, rpjmd_id } =
        splitPlanningBody(req.body);
      const { error, value } = rkaSchema.validate(payload);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const ch = await assertRenjaChain(value.renja_id);
      if (!ch.ok) return res.status(400).json({ error: ch.msg });
      const rp = await assertEffectiveRpjmdId(RPJMD, rpjmd_id, null);
      if (!rp.ok) return res.status(400).json({ error: rp.msg });

      const line = await assertRkaRenjaRpjmdBaseline(value.renja_id, rp.id);
      if (!line.ok) return res.status(400).json({ error: line.msg });

      const paguChk = validateMultiYearPaguAgainstTotal(value);
      if (!paguChk.ok) return res.status(400).json({ error: paguChk.message });

      const uid = req.user?.id ?? req.user?.userId ?? null;
      const created = await Rka.create({
        ...value,
        version: 1,
        is_active_version: true,
        rpjmd_id: rp.id,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      });

      const { old_value, new_value } = auditValuesFromRows(null, created);
      await writePlanningAudit({
        module_name: "rka",
        table_name: "rka",
        record_id: created.id,
        action_type: "CREATE",
        old_value,
        new_value,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
        changed_by: uid,
        version_before: null,
        version_after: 1,
      });

      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { payload, change_reason_text, change_reason_file, rpjmd_id } =
        splitPlanningBody(req.body);
      const { error, value } = rkaSchema.validate(payload);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const oldRow = await Rka.findByPk(id);
      if (!oldRow) return res.status(404).json({ error: "Data tidak ditemukan" });

      const rp = await assertEffectiveRpjmdId(RPJMD, rpjmd_id, oldRow.rpjmd_id);
      if (!rp.ok) return res.status(400).json({ error: rp.msg });

      const ch = await assertRenjaChain(value.renja_id);
      if (!ch.ok) return res.status(400).json({ error: ch.msg });

      const line = await assertRkaRenjaRpjmdBaseline(value.renja_id, rp.id);
      if (!line.ok) return res.status(400).json({ error: line.msg });

      const paguChk = validateMultiYearPaguAgainstTotal(value);
      if (!paguChk.ok) return res.status(400).json({ error: paguChk.message });

      const version_before = Number(oldRow.version) || 1;
      const version_after = version_before + 1;
      const uid = req.user?.id ?? req.user?.userId ?? null;

      const patch = {
        ...value,
        version: version_after,
        is_active_version: true,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
        rpjmd_id: rp.id,
      };

      await Rka.update(patch, { where: { id } });
      const result = await Rka.findByPk(id);
      const { old_value, new_value } = auditValuesFromRows(oldRow, result);

      await writePlanningAudit({
        module_name: "rka",
        table_name: "rka",
        record_id: Number(id),
        action_type: "UPDATE",
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        changed_by: uid,
        version_before,
        version_after,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const oldRow = await Rka.findByPk(id);
      if (!oldRow) return res.status(404).json({ error: "Data tidak ditemukan" });

      const { change_reason_text, change_reason_file } = splitPlanningBody(
        req.body
      );
      const uid = req.user?.id ?? req.user?.userId ?? null;
      const version_before = Number(oldRow.version) || 1;

      const { old_value, new_value } = auditValuesFromRows(oldRow, null);
      await writePlanningAudit({
        module_name: "rka",
        table_name: "rka",
        record_id: Number(id),
        action_type: "DELETE",
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        changed_by: uid,
        version_before,
        version_after: null,
      });

      await Rka.destroy({ where: { id } });
      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
