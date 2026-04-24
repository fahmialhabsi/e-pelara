const { RenstraTabelStrategiKebijakan, RenstraStrategi, RenstraKebijakan } = require("../models");

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

    // Otomatis ambil deskripsi dari FK jika tidak diisi
    if (payload.strategi_id && !payload.deskripsi_strategi) {
      const str = await RenstraStrategi.findByPk(payload.strategi_id);
      if (str) {
        payload.deskripsi_strategi = str.deskripsi;
        payload.kode_strategi = payload.kode_strategi || str.kode_strategi;
      }
    }
    if (payload.kebijakan_id && !payload.deskripsi_kebijakan) {
      const keb = await RenstraKebijakan.findByPk(payload.kebijakan_id);
      if (keb) {
        payload.deskripsi_kebijakan = keb.deskripsi;
        payload.kode_kebijakan = payload.kode_kebijakan || keb.kode_kebjkn;
      }
    }

    const created = await RenstraTabelStrategiKebijakan.create(payload);
    return res.status(201).json({ message: "Data berhasil ditambahkan", data: created });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    return res.status(400).json({ error: err.message });
  }
};

// READ ALL (filter by renstra_id)
exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.renstra_id) where.renstra_id = Number(req.query.renstra_id);

    const data = await RenstraTabelStrategiKebijakan.findAll({
      where,
      include: [
        { model: RenstraStrategi,  as: "strategi",  attributes: ["id","deskripsi","kode_strategi"] },
        { model: RenstraKebijakan, as: "kebijakan", attributes: ["id","deskripsi","kode_kebjkn"] },
      ],
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
    const data = await RenstraTabelStrategiKebijakan.findByPk(req.params.id, {
      include: [
        { model: RenstraStrategi,  as: "strategi"  },
        { model: RenstraKebijakan, as: "kebijakan" },
      ],
    });
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
    const [updated] = await RenstraTabelStrategiKebijakan.update(payload, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: "Data tidak ditemukan" });
    const result = await RenstraTabelStrategiKebijakan.findByPk(req.params.id);
    return res.json({ message: "Data berhasil diperbarui", data: result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const deleted = await RenstraTabelStrategiKebijakan.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.json({ message: "Data berhasil dihapus" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
