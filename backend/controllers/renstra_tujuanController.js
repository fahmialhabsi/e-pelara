const { RenstraTujuan, RenstraOPD } = require("../models");

exports.create = async (req, res) => {
  try {
    const data = await RenstraTujuan.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai } = req.query;

    const whereClause = {};
    if (renstra_id) whereClause.renstra_id = renstra_id;

    const data = await RenstraTujuan.findAll({
      where: whereClause,
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
          ...(tahun_mulai && {
            where: { tahun_mulai: parseInt(tahun_mulai, 10) },
          }),
        },
      ],
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTujuan.findByPk(req.params.id, {
      include: [
        {
          model: RenstraOPD,
          as: "renstra", // pastikan as-nya cocok
          attributes: ["id", "rpjmd_id", "bidang_opd", "sub_bidang_opd"],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data not found" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateNomorTujuan = async (req, res) => {
  try {
    const { tujuan_id, renstra_id } = req.query;

    if (!tujuan_id || !renstra_id) {
      return res
        .status(400)
        .json({ message: "Parameter tujuan_id dan renstra_id diperlukan." });
    }

    // Ambil data tujuan RPJMD untuk dapatkan no_tujuan sebagai prefix
    const { Tujuan } = require("../models");
    const tujuan = await Tujuan.findByPk(tujuan_id);

    if (!tujuan) {
      return res.status(404).json({ message: "Tujuan RPJMD tidak ditemukan." });
    }

    const noDasar = tujuan.no_tujuan || "T1-00";

    // Hitung jumlah data dengan kombinasi tersebut
    const count = await RenstraTujuan.count({
      where: {
        rpjmd_tujuan_id: tujuan_id, // <- field yang benar
        renstra_id,
      },
    });

    const nextUrutan = String(count + 1).padStart(2, "0");
    const generatedNomor = `${noDasar}.${nextUrutan}`;

    res.status(200).json({ nomor_otomatis: generatedNomor });
  } catch (error) {
    console.error("Error generating nomor tujuan:", error);
    res.status(500).json({ message: "Gagal menghasilkan nomor tujuan." });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await RenstraTujuan.update(req.body, { where: { id } });
    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await RenstraTujuan.findByPk(id);
    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraTujuan.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
