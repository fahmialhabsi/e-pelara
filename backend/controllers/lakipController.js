const {
  Lakip,
  PeriodeRpjmd,
  RenstraProgram,
  Rkpd,
  Renja,
  LkDispang,
} = require("../models");
const Joi = require("joi");

const lakipSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  program: Joi.string().allow(null, ""),
  kegiatan: Joi.string().allow(null, ""),
  indikator_kinerja: Joi.string().allow(null, ""),
  target: Joi.string().allow(null, ""),
  realisasi: Joi.string().allow(null, ""),
  evaluasi: Joi.string().allow(null, ""),
  rekomendasi: Joi.string().allow(null, ""),
  jenis_dokumen: Joi.string().allow(null, ""),
  renstra_id: Joi.number().allow(null),
  rkpd_id: Joi.number().allow(null),
  renja_id: Joi.number().allow(null),
  lk_dispang_id: Joi.number().allow(null),
});

module.exports = {
  // GET All with filter
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;

      const data = await Lakip.findAll({
        where,
        include: [
          { model: PeriodeRpjmd, as: "periode" },
          { model: RenstraProgram, as: "renstra_program" },
          { model: Rkpd, as: "rkpd" },
          { model: Renja, as: "renja" },
          { model: LkDispang, as: "lk_dispang" },
        ],
        order: [["tahun", "DESC"]],
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // GET by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Lakip.findByPk(id, {
        include: [
          { model: PeriodeRpjmd, as: "periode" },
          { model: RenstraProgram, as: "renstra_program" },
          { model: Rkpd, as: "rkpd" },
          { model: Renja, as: "renja" },
          { model: LkDispang, as: "lk_dispang" },
        ],
      });

      if (!data) return res.status(404).json({ error: "Data tidak ditemukan" });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // CREATE
  async create(req, res) {
    try {
      const { error, value } = lakipSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const created = await Lakip.create(value);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // UPDATE
  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = lakipSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const [updated] = await Lakip.update(value, { where: { id } });

      if (!updated)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      const result = await Lakip.findByPk(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // DELETE
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Lakip.destroy({ where: { id } });

      if (!deleted)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
