const { Op } = require("sequelize");
const { LpkDispang, PeriodeRpjmd } = require("../models");
const Joi = require("joi");

const lpkDispangSchema = Joi.object({
  tahun: Joi.alternatives(Joi.string(), Joi.number()).required(),
  periode_id: Joi.number().required(),
  kegiatan: Joi.string().allow(null, ""),
  pelaksana: Joi.string().allow(null, ""),
  capaian: Joi.string().allow(null, ""),
  kendala: Joi.string().allow(null, ""),
  rekomendasi: Joi.string().allow(null, ""),
  jenis_dokumen: Joi.string().allow(null, ""),
  monev_id: Joi.number().allow(null),

  // Backward compatibility payload lama
  program: Joi.string().allow(null, ""),
  sub_kegiatan: Joi.string().allow(null, ""),
  indikator: Joi.string().allow(null, ""),
  target: Joi.alternatives(Joi.string(), Joi.number()).allow(null, ""),
  realisasi: Joi.alternatives(Joi.string(), Joi.number()).allow(null, ""),
  evaluasi: Joi.string().allow(null, ""),
}).custom((value, helpers) => {
  if (!value.kegiatan && !value.program && !value.sub_kegiatan) {
    return helpers.error("any.invalid");
  }
  return value;
}, "kegiatan fallback validation");

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function buildParagraph(parts = []) {
  const normalized = parts.map(cleanText).filter(Boolean);
  return normalized.length ? normalized.join("\n") : null;
}

function toModelPayload(value) {
  const kegiatan =
    cleanText(value.kegiatan) ||
    buildParagraph([value.program, value.sub_kegiatan]) ||
    cleanText(value.program);

  const capaian =
    cleanText(value.capaian) ||
    buildParagraph([
      value.evaluasi,
      value.indikator ? `Indikator: ${value.indikator}` : null,
      value.target !== undefined && value.target !== null && value.target !== ""
        ? `Target: ${value.target}`
        : null,
      value.realisasi !== undefined &&
      value.realisasi !== null &&
      value.realisasi !== ""
        ? `Realisasi: ${value.realisasi}`
        : null,
    ]);

  return {
    tahun: String(value.tahun),
    periode_id: value.periode_id,
    kegiatan,
    pelaksana: cleanText(value.pelaksana),
    capaian,
    kendala: cleanText(value.kendala),
    rekomendasi: cleanText(value.rekomendasi),
    jenis_dokumen: cleanText(value.jenis_dokumen),
    monev_id: value.monev_id || null,
  };
}

module.exports = {
  async getAll(req, res) {
    try {
      const where = {};
      const { tahun, periode_id, kegiatan, program } = req.query;

      if (tahun) where.tahun = String(tahun);
      if (periode_id) where.periode_id = periode_id;

      const keyword = cleanText(kegiatan) || cleanText(program);
      if (keyword) {
        where.kegiatan = { [Op.like]: `%${keyword}%` };
      }

      const data = await LpkDispang.findAll({
        where,
        include: [{ model: PeriodeRpjmd, as: "periode" }],
        order: [["tahun", "DESC"], ["created_at", "DESC"]],
      });

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await LpkDispang.findByPk(id, {
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
      const { error, value } = lpkDispangSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const created = await LpkDispang.create(toModelPayload(value));
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { error, value } = lpkDispangSchema.validate(req.body);
      if (error)
        return res.status(400).json({ error: error.details[0].message });

      const [updated] = await LpkDispang.update(toModelPayload(value), {
        where: { id },
      });
      if (!updated)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      const result = await LpkDispang.findByPk(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const deleted = await LpkDispang.destroy({ where: { id } });
      if (!deleted)
        return res.status(404).json({ error: "Data tidak ditemukan" });

      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
