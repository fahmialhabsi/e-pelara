/**
 * dpaController.js — FINAL LOCKED SMART CHAIN (UI SAFE)
 * RKA → RPJMD → PREVIEW GUARANTEED (NO EMPTY UI)
 */

const { Dpa, PeriodeRpjmd, PlanningAuditEvent } = require('../models');
const Joi = require('joi');
const { splitPlanningBody } = require('../helpers/planningDocumentMutation');

const {
  writePlanningAudit,
  enrichPlanningAuditRows,
  auditValuesFromRows,
} = require('../services/planningDocumentAuditService');

const { validateMultiYearPaguAgainstTotal } = require('../helpers/planningPaguConsistency');
const { resolveRpjmdByContext } = require('../helpers/rpjmdResolver');
const { resolveRkaSmart } = require('../helpers/rkaSmartResolver');

/* =========================
   SCHEMA
========================= */
const dpaCreateSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),

  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),

  indikator: Joi.string().allow(null, ''),
  target: Joi.string().allow(null),
  anggaran: Joi.number().allow(null),

  kode_rekening: Joi.string().max(30).allow(null, ''),
  nama_rekening: Joi.string().max(255).allow(null, ''),

  pagu_year_1: Joi.number().allow(null),
  pagu_year_2: Joi.number().allow(null),
  pagu_year_3: Joi.number().allow(null),
  pagu_year_4: Joi.number().allow(null),
  pagu_year_5: Joi.number().allow(null),
  pagu_total: Joi.number().allow(null),

  jenis_dokumen: Joi.string().allow(null, ''),
  rka_id: Joi.number().allow(null),
  rpjmd_id: Joi.number().allow(null),

  rincian_belanja: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null),

  opd_id: Joi.number().allow(null),
});

const dpaUpdateSchema = Joi.object({
  tahun: Joi.string(),
  periode_id: Joi.number(),

  program: Joi.string(),
  kegiatan: Joi.string(),
  sub_kegiatan: Joi.string(),

  indikator: Joi.string().allow(null, ''),
  target: Joi.string().allow(null),
  anggaran: Joi.number().allow(null),

  kode_rekening: Joi.string().max(30).allow(null, ''),
  nama_rekening: Joi.string().max(255).allow(null, ''),

  pagu_year_1: Joi.number().allow(null),
  pagu_year_2: Joi.number().allow(null),
  pagu_year_3: Joi.number().allow(null),
  pagu_year_4: Joi.number().allow(null),
  pagu_year_5: Joi.number().allow(null),
  pagu_total: Joi.number().allow(null),

  jenis_dokumen: Joi.string().allow(null, ''),
  rka_id: Joi.number().allow(null),
  rpjmd_id: Joi.number().allow(null),

  rincian_belanja: Joi.alternatives().try(Joi.object(), Joi.array()).allow(null),

  opd_id: Joi.number().allow(null),

  change_reason_text: Joi.string().allow(null, ''),
}).min(1);

/* =========================
   SAFE NORMALIZER (ANTI EMPTY UI)
========================= */
function normalizeRkaContext(ctx = {}) {
  return {
    program: ctx.program || '',
    kegiatan: ctx.kegiatan || '',
    sub_kegiatan: ctx.sub_kegiatan || '',
    indikator: ctx.indikator || '',
    target: ctx.target || '',
    pagu: ctx.pagu || ctx.anggaran || 0,
    id: ctx.id || null,
  };
}

/* =========================
   PREVIEW GUARANTEE (NO EMPTY UI)
========================= */
function buildSmartPreview(rkaContext, rpjmdId) {
  const ctx = normalizeRkaContext(rkaContext);

  return {
    program: ctx.program || 'BELUM TERISI',
    kegiatan: ctx.kegiatan || 'BELUM TERISI',
    sub_kegiatan: ctx.sub_kegiatan || 'BELUM TERISI',
    indikator: ctx.indikator || 'BELUM TERISI',
    target: ctx.target || 'BELUM TERISI',
    anggaran: ctx.pagu ?? 0,
    rka_id: ctx.id,
    rpjmd_id: rpjmdId || null,
  };
}

/* =========================
   RKA RESOLVER WRAPPER (STRICT)
========================= */
async function resolveRkaSmartStrict(input) {
  const rkaResolved = await resolveRkaSmart(input);

  if (!rkaResolved?.ok) {
    return {
      ok: false,
      msg: rkaResolved?.msg || 'RKA gagal resolve',
      context: normalizeRkaContext({}),
    };
  }

  return {
    ok: true,
    rka_id: rkaResolved.rka_id,
    context: normalizeRkaContext(rkaResolved.context),
  };
}

/* =========================
   SMART CHAIN CORE (LOCKED)
========================= */
async function resolveSmartChain(payload) {
  const rkaResolved = await resolveRkaSmartStrict(payload);

  if (!rkaResolved.ok) {
    return {
      ok: false,
      msg: rkaResolved.msg,
      preview: buildSmartPreview({}, null),
    };
  }

  const rp = await resolveRpjmdByContext({
    tahun: payload.tahun,
    periode_id: payload.periode_id,
    rka: rkaResolved.context,
  });

  const rpjmd_id = rp?.ok ? rp.id : null;

  return {
    ok: true,
    rka: rkaResolved,
    rpjmd_id,
    preview: buildSmartPreview(rkaResolved.context, rpjmd_id),
  };
}

/* =========================
   CONTROLLER
========================= */
module.exports = {
  async getAudit(req, res) {
    try {
      const rows = await PlanningAuditEvent.findAll({
        where: { table_name: 'dpa', record_id: Number(req.params.id) },
        order: [['changed_at', 'DESC']],
        limit: 100,
      });

      res.json({ success: true, data: enrichPlanningAuditRows(rows) });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await Dpa.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
        order: [['tahun', 'DESC']],
      });

      res.json(data);
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  async getById(req, res) {
    try {
      const data = await Dpa.findByPk(req.params.id, {
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
      });

      if (!data) {
        return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
      }

      res.json(data);
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  /* =========================
     CREATE (LOCKED PIPELINE)
  ========================= */
  async create(req, res) {
    try {
      const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);

      const { error, value } = dpaCreateSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
          preview: buildSmartPreview({}, null),
        });
      }

      const chain = await resolveSmartChain(value);

      if (!chain.ok) {
        return res.status(400).json({
          success: false,
          error: chain.msg,
          preview: chain.preview,
        });
      }

      const paguChk = validateMultiYearPaguAgainstTotal(value);
      if (!paguChk.ok) {
        return res.status(400).json({
          success: false,
          error: paguChk.message,
          preview: chain.preview,
        });
      }

      const created = await Dpa.create({
        ...value,
        version: 1,
        is_active_version: true,
        rpjmd_id: chain.rpjmd_id,
        rka_id: chain.rka.rka_id,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      });

      const { old_value, new_value } = auditValuesFromRows(null, created);

      await writePlanningAudit({
        module_name: 'dpa',
        table_name: 'dpa',
        record_id: created.id,
        action_type: 'CREATE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        version_before: null,
        version_after: 1,
      });

      res.status(201).json({
        success: true,
        data: created,
        preview: chain.preview,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  /* =========================
     UPDATE (LOCKED PIPELINE)
  ========================= */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { payload, change_reason_text, change_reason_file } = splitPlanningBody(req.body);

      const { error, value } = dpaUpdateSchema.validate(payload);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
          preview: buildSmartPreview({}, null),
        });
      }

      const oldRow = await Dpa.findByPk(id);
      if (!oldRow) {
        return res.status(404).json({
          success: false,
          error: 'Data tidak ditemukan',
        });
      }

      const mergedPayload = {
        tahun: value.tahun ?? oldRow.tahun,
        periode_id: value.periode_id ?? oldRow.periode_id,

        program: value.program ?? oldRow.program,
        kegiatan: value.kegiatan ?? oldRow.kegiatan,
        sub_kegiatan: value.sub_kegiatan ?? oldRow.sub_kegiatan,

        indikator: value.indikator ?? oldRow.indikator,
        target: value.target ?? oldRow.target,
        anggaran: value.anggaran ?? oldRow.anggaran,

        kode_rekening: value.kode_rekening ?? oldRow.kode_rekening,
        nama_rekening: value.nama_rekening ?? oldRow.nama_rekening,

        pagu_year_1: value.pagu_year_1 ?? oldRow.pagu_year_1,
        pagu_year_2: value.pagu_year_2 ?? oldRow.pagu_year_2,
        pagu_year_3: value.pagu_year_3 ?? oldRow.pagu_year_3,
        pagu_year_4: value.pagu_year_4 ?? oldRow.pagu_year_4,
        pagu_year_5: value.pagu_year_5 ?? oldRow.pagu_year_5,
        pagu_total: value.pagu_total ?? oldRow.pagu_total,

        jenis_dokumen: value.jenis_dokumen ?? oldRow.jenis_dokumen,
        rka_id: value.rka_id ?? oldRow.rka_id,
        rpjmd_id: value.rpjmd_id ?? oldRow.rpjmd_id,
      };

      const chain = await resolveSmartChain(mergedPayload);

      if (!chain.ok) {
        return res.status(400).json({
          success: false,
          error: chain.msg,
          preview: chain.preview,
        });
      }

      const version_before = Number(oldRow.version) || 1;
      const version_after = version_before + 1;

      const patch = {
        ...mergedPayload,
        version: version_after,
        is_active_version: true,
        rpjmd_id: chain.rpjmd_id,
        rka_id: chain.rka.rka_id,
        change_reason_text: change_reason_text || null,
        change_reason_file: change_reason_file || null,
      };

      await Dpa.update(patch, { where: { id } });

      const result = await Dpa.findByPk(id);
      const { old_value, new_value } = auditValuesFromRows(oldRow, result);

      await writePlanningAudit({
        module_name: 'dpa',
        table_name: 'dpa',
        record_id: Number(id),
        action_type: 'UPDATE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        version_before,
        version_after,
      });

      res.json({
        success: true,
        data: result,
        preview: chain.preview,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  async destroy(req, res) {
    try {
      const oldRow = await Dpa.findByPk(req.params.id);
      if (!oldRow) {
        return res.status(404).json({ success: false, error: 'Data tidak ditemukan' });
      }

      const { change_reason_text, change_reason_file } = splitPlanningBody(req.body);

      const { old_value, new_value } = auditValuesFromRows(oldRow, null);

      await writePlanningAudit({
        module_name: 'dpa',
        table_name: 'dpa',
        record_id: Number(req.params.id),
        action_type: 'DELETE',
        old_value,
        new_value,
        change_reason_text,
        change_reason_file,
        version_before: Number(oldRow.version) || 1,
        version_after: null,
      });

      await Dpa.destroy({ where: { id: req.params.id } });

      res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
};
