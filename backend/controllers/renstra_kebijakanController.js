const {
  RenstraKebijakan,
  RenstraOPD,
  RenstraStrategi,
  ArahKebijakan,
} = require("../models");

exports.create = async (req, res) => {
  try {
    const data = await RenstraKebijakan.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await RenstraKebijakan.findAll({
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["bidang_opd", "sub_bidang_opd"],
        },
        {
          model: RenstraStrategi,
          as: "strategi",
          attributes: ["kode_strategi", "deskripsi"],
        },
        {
          model: ArahKebijakan,
          as: "arah_kebijakan",
          attributes: ["kode_arah", "deskripsi"], // Asumsi ArahKebijakan masih pakai 'kode_arah'
        },
        // RELASI KE RENSTRAKEBIJAKAN DENGAN ALIAS "KEBIJAKAN" DIHAPUS
        // JIKA TIDAK MEMILIKI TUJUAN FUNGSI SESPESIFIK
      ],
      order: [["id", "ASC"]],
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraKebijakan.findByPk(req.params.id, {
      include: [
        { model: RenstraOPD, as: "renstra" },
        { model: RenstraStrategi, as: "strategi" },
        {
          model: ArahKebijakan,
          as: "arah_kebijakan",
          attributes: ["kode_arah", "deskripsi"],
        }, // Sesuaikan attributes jika perlu
        // RELASI KE RENSTRAKEBIJAKAN DENGAN ALIAS "KEBIJAKAN" DIHAPUS
        // JIKA TIDAK MEMILIKI TUJUAN FUNGSI SESPESIFIK
      ],
    });
    if (!data) return res.status(404).json({ message: "Data not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateKodeKebijakan = async (req, res) => {
  try {
    const { arah_kebijakan_id, renstra_id } = req.query;

    if (!arah_kebijakan_id || !renstra_id) {
      return res.status(400).json({
        message: "Parameter arah_kebijakan_id dan renstra_id diperlukan.",
      });
    }

    // Ambil data arah kebijakan
    const arahKebijakan = await ArahKebijakan.findByPk(arah_kebijakan_id);
    if (!arahKebijakan) {
      return res
        .status(404)
        .json({ message: "Arah Kebijakan tidak ditemukan." });
    }

    const kodeArah = arahKebijakan.kode_arah; // contoh: ASST1-01-01.2.1
    const bagianAkhir = kodeArah.split("-").slice(1).join("-"); // hasil: 01-01.2.1

    // Hitung jumlah kebijakan eksisting dengan arah_kebijakan dan renstra yang sama
    const existingCount = await RenstraKebijakan.count({
      where: {
        rpjmd_arah_id: arah_kebijakan_id,
        renstra_id: renstra_id,
      },
    });

    const nextNo = existingCount + 1;
    const noFormatted = String(nextNo).padStart(2, "0"); // jadi "01", "02", dst.

    const generatedKode = `AKR-${bagianAkhir}.${noFormatted}`;

    return res.status(200).json({ kode_otomatis: generatedKode });
  } catch (error) {
    console.error("Error generate kode kebijakan:", error);
    res.status(500).json({ message: "Gagal menghasilkan kode kebijakan." });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    const updateData = {};

    if (req.body.kode_kebjkn !== undefined) {
      updateData.kode_kebjkn = req.body.kode_kebjkn;
    }
    if (req.body.no_arah_rpjmd !== undefined) {
      updateData.no_arah_rpjmd = req.body.no_arah_rpjmd;
    }
    if (req.body.strategi_id !== undefined)
      updateData.strategi_id = req.body.strategi_id;
    if (req.body.rpjmd_arah_id !== undefined)
      updateData.rpjmd_arah_id = req.body.rpjmd_arah_id;
    if (req.body.deskripsi !== undefined)
      updateData.deskripsi = req.body.deskripsi;
    if (req.body.prioritas !== undefined)
      updateData.prioritas = req.body.prioritas;
    if (req.body.isi_arah_rpjmd !== undefined)
      updateData.isi_arah_rpjmd = req.body.isi_arah_rpjmd;
    if (req.body.jenisDokumen !== undefined)
      updateData.jenisDokumen = req.body.jenisDokumen;
    if (req.body.tahun !== undefined) updateData.tahun = req.body.tahun;
    if (req.body.renstra_id !== undefined)
      updateData.renstra_id = req.body.renstra_id;

    const [updated] = await RenstraKebijakan.update(updateData, {
      where: { id },
    });

    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await RenstraKebijakan.findByPk(id, {
      include: [
        { model: RenstraOPD, as: "renstra" },
        { model: RenstraStrategi, as: "strategi" },
        {
          model: ArahKebijakan,
          as: "arah_kebijakan",
          attributes: ["kode_arah", "deskripsi"],
        }, // Sesuaikan attributes jika perlu
        // RELASI KE RENSTRAKEBIJAKAN DENGAN ALIAS "KEBIJAKAN" DIHAPUS
      ],
    });
    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraKebijakan.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
