const { RenstraTabelPrioritas } = require("../models");

const computeFinal = (data) => {
  const targets = [1,2,3,4,5,6].map((i) => Number(data[`target_tahun_${i}`]) || 0);
  const pagus   = [1,2,3,4,5,6].map((i) => Number(data[`pagu_tahun_${i}`])   || 0);
  const target_akhir_renstra = targets.reduce((a,b)=>a+b,0) / targets.length || 0;
  const pagu_akhir_renstra   = pagus.reduce((a,b)=>a+b,0);
  return { target_akhir_renstra, pagu_akhir_renstra };
};

// CREATE
exports.create = async (req, res) => {
  try {
    const payload = { ...req.body, ...computeFinal(req.body) };
    if (!payload.nama_prioritas) {
      return res.status(400).json({ error: "nama_prioritas wajib diisi" });
    }
    if (!["nasional","daerah","gubernur"].includes(payload.jenis_prioritas)) {
      return res.status(400).json({ error: "jenis_prioritas tidak valid. Pilih: nasional, daerah, gubernur" });
    }
    const created = await RenstraTabelPrioritas.create(payload);
    return res.status(201).json({ message: "Data berhasil ditambahkan", data: created });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    return res.status(400).json({ error: err.message });
  }
};

// READ ALL (filter by renstra_id, jenis_prioritas)
exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.renstra_id)     where.renstra_id     = Number(req.query.renstra_id);
    if (req.query.jenis_prioritas) where.jenis_prioritas = req.query.jenis_prioritas;

    const data = await RenstraTabelPrioritas.findAll({
      where,
      order: [["id", "ASC"]],
    });

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTabelPrioritas.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const payload = { ...req.body, ...computeFinal(req.body) };
    const [updated] = await RenstraTabelPrioritas.update(payload, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: "Data tidak ditemukan" });
    const result = await RenstraTabelPrioritas.findByPk(req.params.id);
    return res.json({ message: "Data berhasil diperbarui", data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const deleted = await RenstraTabelPrioritas.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.json({ message: "Data berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
