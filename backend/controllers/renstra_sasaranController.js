const { RenstraSasaran, Sasaran } = require("../models");

exports.create = async (req, res) => {
  try {
    const { rpjmd_sasaran_id, ...rest } = req.body;

    // Cari Sasaran RPJMD
    const sasaranRpjmd = await Sasaran.findByPk(rpjmd_sasaran_id, {
      attributes: ["id", "nomor", "isi_sasaran"],
    });

    if (!sasaranRpjmd) {
      return res.status(404).json({
        message: "failed",
        error: "Sasaran RPJMD tidak ditemukan",
      });
    }

    // Tambahkan no_rpjmd & isi_sasaran_rpjmd ke record
    const data = await RenstraSasaran.create({
      ...rest,
      rpjmd_sasaran_id,
      no_rpjmd: sasaranRpjmd.nomor,
      isi_sasaran_rpjmd: sasaranRpjmd.isi_sasaran,
    });

    res.status(201).json({
      message: "success",
      data,
    });
  } catch (err) {
    console.error("❌ Sequelize Error:", err);
    res.status(400).json({
      message: "failed",
      error: err.message,
    });
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await RenstraSasaran.findAll({
      include: [
        {
          model: Sasaran,
          as: "sasaran_rpjmd",
          attributes: ["id", "nomor", "isi_sasaran"],
        },
      ],
    });
    res.json({
      message: "success",
      data,
    });
  } catch (err) {
    console.error("🔴 ERROR findAll renstra-sasaran:", err);
    res.status(500).json({
      message: "failed",
      error: "Gagal memuat Sasaran Renstra.",
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraSasaran.findByPk(req.params.id, {
      include: [
        {
          model: Sasaran,
          as: "sasaran_rpjmd",
          attributes: ["id", "nomor", "isi_sasaran"],
        },
      ],
    });
    if (!data) {
      return res.status(404).json({
        message: "failed",
        error: "Data tidak ditemukan.",
      });
    }
    res.json({
      message: "success",
      data,
    });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({
      message: "failed",
      error: err.message,
    });
  }
};

// Ambil Sasaran RPJMD berdasarkan tujuan_id
exports.getSasaranRpjmd = async (req, res) => {
  try {
    const { tujuan_id } = req.query;

    if (!tujuan_id) {
      return res.status(400).json({
        message: "failed",
        error: "Parameter tujuan_id wajib diisi.",
      });
    }

    const sasaran = await Sasaran.findAll({
      where: {
        tujuan_id,
        jenis_dokumen: "rpjmd",
      },
      attributes: ["id", "nomor", "isi_sasaran"],
      order: [["nomor", "ASC"]],
    });

    res.status(200).json({
      message: "success",
      data: sasaran,
    });
  } catch (err) {
    console.error("❌ ERROR getSasaranRpjmd:", err);
    res.status(500).json({
      message: "failed",
      error: "Gagal mengambil Sasaran RPJMD.",
    });
  }
};

exports.generateNomorSasaran = async (req, res) => {
  try {
    const { rpjmd_sasaran_id, renstra_id } = req.query;

    if (!rpjmd_sasaran_id || !renstra_id) {
      return res.status(400).json({
        message: "failed",
        error: "Parameter rpjmd_sasaran_id dan renstra_id diperlukan.",
      });
    }

    const sasaran = await Sasaran.findByPk(rpjmd_sasaran_id);
    if (!sasaran || !sasaran.nomor) {
      return res.status(404).json({
        message: "failed",
        error: "Sasaran RPJMD tidak ditemukan atau nomor tidak tersedia.",
      });
    }

    const match = sasaran.nomor.match(/(?:ST\d?-)?(\d{2}-\d{2})$/);
    const baseNomor = match?.[1];

    if (!baseNomor) {
      return res.status(400).json({
        message: "failed",
        error: "Format nomor Sasaran RPJMD tidak valid (harus STx-XX-XX).",
      });
    }

    const count = await RenstraSasaran.count({
      where: { rpjmd_sasaran_id, renstra_id },
    });

    const urutan = String(count + 1).padStart(2, "0");
    const nomorOtomatis = `SR-${baseNomor}.${urutan}`;

    res.status(200).json({
      message: "success",
      data: { nomor_otomatis: nomorOtomatis },
    });
  } catch (error) {
    console.error("❌ Error generateNomorSasaran:", error);
    res.status(500).json({
      message: "failed",
      error: "Gagal menghasilkan nomor sasaran.",
    });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await RenstraSasaran.update(req.body, { where: { id } });

    if (!updated) {
      return res.status(404).json({
        message: "failed",
        error: "Data tidak ditemukan",
      });
    }

    const updatedData = await RenstraSasaran.findByPk(id, {
      include: [
        {
          model: Sasaran,
          as: "sasaran_rpjmd",
          attributes: ["id", "nomor", "isi_sasaran"],
        },
      ],
    });

    res.json({
      message: "success",
      data: updatedData,
    });
  } catch (err) {
    console.error("❌ ERROR update:", err);
    res.status(400).json({
      message: "failed",
      error: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await RenstraSasaran.findByPk(id, {
      include: [
        {
          model: Sasaran,
          as: "sasaran_rpjmd",
          attributes: ["id", "nomor", "isi_sasaran"],
        },
      ],
    });

    if (!data) {
      return res.status(404).json({
        message: "failed",
        error: "Data tidak ditemukan",
      });
    }

    await RenstraSasaran.destroy({ where: { id } });

    res.json({
      message: "success",
      data: data, // kirim data yang dihapus
    });
  } catch (err) {
    console.error("❌ ERROR delete:", err);
    res.status(500).json({
      message: "failed",
      error: err.message,
    });
  }
};
