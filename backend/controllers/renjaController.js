const { Renja, PeriodeRpjmd, Rkpd } = require("../models");
const Joi = require("joi");

// ✅ Validasi skema input
const renjaSchema = Joi.object({
  tahun: Joi.string().required(),
  periode_id: Joi.number().required(),
  program: Joi.string().required(),
  kegiatan: Joi.string().required(),
  sub_kegiatan: Joi.string().required(),
  indikator: Joi.string().allow(null, ""),
  target: Joi.string().allow(null, ""),
  anggaran: Joi.number().allow(null),
  jenis_dokumen: Joi.string().allow(null, ""),
  rkpd_id: Joi.number().allow(null),
});

module.exports = {
  // 🔍 GET All
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, program } = req.query;

      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (program) where.program = program;

      const data = await Renja.findAll({
        where,
        include: [
          { model: PeriodeRpjmd, as: "periode" },
          { model: Rkpd, as: "rkpd" },
        ],
        order: [["tahun", "DESC"]],
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 🔍 GET by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Renja.findByPk(id, {
        include: [
          { model: PeriodeRpjmd, as: "periode" },
          { model: Rkpd, as: "rkpd" },
        ],
      });

      if (!data) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ➕ CREATE
  async create(req, res) {
    try {
      const { error, value } = renjaSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const created = await Renja.create(value);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // ✏️ UPDATE
  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = renjaSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const [updated] = await Renja.update(value, { where: { id } });
      if (!updated)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      const result = await Renja.findByPk(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 🗑 DELETE
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await Renja.destroy({ where: { id } });
      if (!deleted)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
