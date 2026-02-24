const { Penatausahaan, PeriodeRpjmd } = require("../models");
const Joi = require("joi");

// Validasi input
const penatausahaanSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),
  indikator: Joi.string().allow(null, ""),
  target: Joi.string().allow(null, ""),
  realisasi: Joi.number().allow(null),
  jenis_dokumen: Joi.string().allow(null, ""),
});

module.exports = {
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await Penatausahaan.findAll({
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
      const data = await Penatausahaan.findByPk(id, {
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
      const { error, value } = penatausahaanSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const created = await Penatausahaan.create(value);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = penatausahaanSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const [updated] = await Penatausahaan.update(value, { where: { id } });
      if (!updated)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      const result = await Penatausahaan.findByPk(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Penatausahaan.destroy({ where: { id } });
      if (!deleted)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
