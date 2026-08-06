const { LkDispang, PeriodeRpjmd, Dpa, ActivityLog } = require('../models');
const Joi = require('joi');
const { recalcDpaRealisasi } = require('../services/dpaRealisasiRollupService');
const { recalcLkDispang } = require('../services/lkDispangRollupService');

// Validasi input
const lkDispangSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),
  indikator: Joi.string().allow(null, ''),
  target: Joi.string().allow(null, ''),
  realisasi: Joi.number().allow(null),
  evaluasi: Joi.string().allow(null, ''),
  rekomendasi: Joi.string().allow(null, ''),
  jenis_dokumen: Joi.string().allow(null, ''),
});

module.exports = {
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await LkDispang.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
        order: [['tahun', 'DESC']],
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await LkDispang.findByPk(id, {
        include: [{ model: PeriodeRpjmd, as: 'periode' }],
      });

      if (!data) return res.status(404).json({ error: 'Data tidak ditemukan' });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const { error, value } = lkDispangSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const created = await LkDispang.create(value);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = lkDispangSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const [updated] = await LkDispang.update(value, { where: { id } });
      if (!updated) return res.status(404).json({ error: 'Data tidak ditemukan' });

      const result = await LkDispang.findByPk(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await LkDispang.destroy({ where: { id } });
      if (!deleted) return res.status(404).json({ error: 'Data tidak ditemukan' });

      res.json({ message: 'Data berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Recall DPA + LK Dispang: hitung ulang realisasi dari ledger (BKU/Penatausahaan)
   * lalu lepas penanda needs_recall pada baris yang sudah disegarkan. Selalu aman
   * dijalankan tanpa gating approval_status — ini menyegarkan hasil hitung dari
   * ledger, bukan menimpa keputusan anggaran (sama seperti scope 'realisasi' di
   * renjaRecallService.js yang selalu diizinkan meski dokumen sudah final).
   */
  async recalcRollup(req, res) {
    try {
      const tahun = Number(req.body?.tahun || req.query?.tahun);
      if (!tahun) return res.status(400).json({ error: 'tahun wajib diisi' });
      const uid = req.user?.id ?? req.user?.userId ?? null;

      const rollupDpa = await recalcDpaRealisasi(require('../models'), tahun);
      const rollupLkDispang = await recalcLkDispang(require('../models'), tahun);

      const tahunStr = String(tahun);
      await Dpa.update(
        { needs_recall: false, recall_reason: null, last_recall_at: new Date() },
        { where: { tahun: tahunStr } },
      );
      await LkDispang.update(
        { needs_recall: false, recall_reason: null, last_recall_at: new Date() },
        { where: { tahun: tahunStr } },
      );

      if (ActivityLog) {
        await ActivityLog.create({
          user_id: uid,
          action: 'lk_dispang_recall',
          entity_type: 'lk_dispang',
          entity_id: null,
          new_data: JSON.stringify({ tahun, rollupDpa, rollupLkDispang }),
        }).catch(() => null);
      }

      res.json({
        success: true,
        message: `Recalc LK Dispang tahun ${tahun} berhasil`,
        rollup_dpa: rollupDpa,
        rollup_lk_dispang: rollupLkDispang,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
