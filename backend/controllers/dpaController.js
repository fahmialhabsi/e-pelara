/**
 * dpaController.js — CRUD + audit perubahan + alasan wajib (update/delete).
 */
const { Dpa, PeriodeRpjmd, Rka, RPJMD, PlanningAuditEvent } = require("../models");
const Joi = require("joi");
const { validateOne } = require("./kodeRekeningController");
const { splitPlanningBody } = require("../helpers/planningDocumentMutation");
const {
  writePlanningAudit,
  captureRow,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");
const { validateMultiYearPaguAgainstTotal } = require("../helpers/planningPaguConsistency");
const { assertEffectiveRpjmdId } = require("../helpers/rpjmdBaseline");

const dpaSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),
  indikator: Joi.string().allow(null, ""),
  target: Joi.string().allow(null, ""),
  anggaran: Joi.number().allow(null),
  jenis_dokumen: Joi.string().allow(null, ""),
  kode_rekening: Joi.string().max(30).allow(null, ""),
  nama_rekening: Joi.string().max(255).allow(null, ""),
  rka_id: Joi.number().allow(null),
  pagu_year_1: Joi.number().allow(null),
  pagu_year_2: Joi.number().allow(null),
  pagu_year_3: Joi.number().allow(null),
  pagu_year_4: Joi.number().allow(null),
  pagu_year_5: Joi.number().allow(null),
  pagu_total: Joi.number().allow(null),
});

async function enrichKodeRekening(value) {
  if (!value.kode_rekening) {
    return { ok: true, value };
  }

  const { valid, row } = await validateOne(value.kode_rekening);
  if (!valid) {
    return {
      ok: false,
      msg:
        `Kode rekening "${value.kode_rekening}" tidak ditemukan dalam referensi Permendagri 90. ` +
        `Gunakan endpoint /api/rekening/search untuk mencari kode yang valid.`,
    };
  }
  return { ok: true, value: { ...value, nama_rekening: row.nama } };
}

async function assertRkaChain(rka_id) {
  if (rka_id == null || rka_id === "") return { ok: true };
  const id = Number(rka_id);
  if (!Number.isFinite(id)) return { ok: false, msg: "rka_id tidak valid" };
  const row = await Rka.findByPk(id);
  if (!row) return { ok: false, msg: "RKA tidak ditemukan untuk rka_id" };
  return { ok: true };
}

module.exports = {
  async getAudit(req, res) {
    try {
      const { id } = req.params;
      const rows = await PlanningAuditEvent.findAll({
        where: { table_name: "dpa", record_id: Number(id) },
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
      const { tahun, periode_id, program, kode_rekening } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;
      if (kode_rekening) where.kode_rekening = kode_rekening;

      const data = await Dpa.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: "periode" }],
        order: [["tahun", "DESC"]],
      });

      res.json(data);
    } catch (error) {
      console.error("dpa.getAll:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Dpa.findByPk(id, {
        include: [{ model: PeriodeRpjmd, as: "periode" }],
      });

      if (!data)
        return res.status(404).json({ success: false, error: "Data tidak ditemukan" });
      res.json(data);
    } catch (error) {
      console.error("dpa.getById:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { payload, change_reason_text, change_reason_file, rpjmd_id } =
        splitPlanningBody(req.body);
      const { error, value } = dpaSchema.validate(payload, { abortEarly: true });
      if (error)
        return res.status(400).json({ success: false, error: error.details[0].message });

      const enriched = await enrichKodeRekening(value);
      if (!enriched.ok)
        return res.status(422).json({
          success: false,
          code: "INVALID_KODE_REKENING",
          error: enriched.msg,
        });

      const rk = await assertRkaChain(enriched.value.rka_id);
      if (!rk.ok) return res.status(400).json({ success: false, error: rk.msg });
      const rp = await assertEffectiveRpjmdId(RPJMD, rpjmd_id, null);
      if (!rp.ok) return res.status(400).json({ success: false, error: rp.msg });

      const paguChk = validateMultiYearPaguAgainstTotal(enriched.value);
      if (!paguChk.ok) return res.status(400).json({ success: false, error: paguChk.message });

      const uid = req.user?.id ?? null;
      const created = await Dpa.create({
        ...enriched.value,
        version: 1,
        is_active_version: true,
        rpjmd_id: rp.id,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      });

      const { old_value, new_value } = auditValuesFromRows(null, created);
      await writePlanningAudit({
        module_name: "dpa",
        table_name: "dpa",
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

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error("dpa.create:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { payload, change_reason_text, change_reason_file, rpjmd_id } =
        splitPlanningBody(req.body);
      const { error, value } = dpaSchema.validate(payload, { abortEarly: true });
      if (error)
        return res.status(400).json({ success: false, error: error.details[0].message });

      const enriched = await enrichKodeRekening(value);
      if (!enriched.ok)
        return res.status(422).json({
          success: false,
          code: "INVALID_KODE_REKENING",
          error: enriched.msg,
        });

      const oldRow = await Dpa.findByPk(id);
      if (!oldRow)
        return res.status(404).json({ success: false, error: "Data tidak ditemukan" });

      const rp = await assertEffectiveRpjmdId(RPJMD, rpjmd_id, oldRow.rpjmd_id);
      if (!rp.ok) return res.status(400).json({ success: false, error: rp.msg });

      const rk = await assertRkaChain(enriched.value.rka_id);
      if (!rk.ok) return res.status(400).json({ success: false, error: rk.msg });

      const version_before = Number(oldRow.version) || 1;
      const version_after = version_before + 1;
      const uid = req.user?.id ?? null;

      const patch = {
        ...enriched.value,
        version: version_after,
        is_active_version: true,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
        rpjmd_id: rp.id,
      };

      await Dpa.update(patch, { where: { id } });
      const result = await Dpa.findByPk(id);
      const { old_value, new_value } = auditValuesFromRows(oldRow, result);

      await writePlanningAudit({
        module_name: "dpa",
        table_name: "dpa",
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

      res.json({ success: true, data: result });
    } catch (error) {
      console.error("dpa.update:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const oldRow = await Dpa.findByPk(id);
      if (!oldRow)
        return res.status(404).json({ success: false, error: "Data tidak ditemukan" });

      const { change_reason_text, change_reason_file } = splitPlanningBody(
        req.body
      );
      const uid = req.user?.id ?? null;
      const version_before = Number(oldRow.version) || 1;

      const { old_value, new_value } = auditValuesFromRows(oldRow, null);
      await writePlanningAudit({
        module_name: "dpa",
        table_name: "dpa",
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

      await Dpa.destroy({ where: { id } });
      res.json({ success: true, message: "Data berhasil dihapus" });
    } catch (error) {
      console.error("dpa.destroy:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
