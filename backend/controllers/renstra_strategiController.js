// controllers/renstra_strategiController.js
const { RenstraStrategi, RenstraOPD, Strategi } = require("../models");

exports.create = async (req, res) => {
  try {
    const {
      kode_strategi,
      deskripsi,
      sasaran_id,
      rpjmd_strategi_id,
      renstra_id,
      no_rpjmd,
      isi_strategi_rpjmd,
    } = req.body;

    if (!sasaran_id || !rpjmd_strategi_id || !renstra_id || !deskripsi) {
      return res.status(400).json({
        success: false,
        message:
          "sasaran_id, rpjmd_strategi_id, renstra_id, dan deskripsi wajib diisi.",
      });
    }

    const dataBaru = await RenstraStrategi.create({
      kode_strategi,
      deskripsi,
      sasaran_id,
      rpjmd_strategi_id,
      renstra_id,
      no_rpjmd,
      isi_strategi_rpjmd,
    });

    return res.status(201).json({
      success: true,
      message: "Strategi Renstra berhasil dibuat",
      data: dataBaru,
    });
  } catch (error) {
    console.error("❌ Gagal simpan strategi:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan strategi",
      error: error.message,
    });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai } = req.query;

    const whereClause = {};
    if (renstra_id) whereClause.renstra_id = renstra_id;

    const data = await RenstraStrategi.findAll({
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

    return res.json({
      success: true,
      message: "Data strategi renstra berhasil diambil",
      data,
      meta: {
        totalItems: data.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data strategi renstra",
      error: err.message,
    });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraStrategi.findByPk(req.params.id, {
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
        },
        {
          model: Strategi,
          as: "strategi_rpjmd",
          attributes: ["id", "kode_strategi", "deskripsi"],
        },
      ],
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      message: "Detail strategi renstra berhasil diambil",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail strategi renstra",
      error: err.message,
    });
  }
};

exports.generateKodeStrategi = async (req, res) => {
  try {
    const { strategi_rpjmd_id, renstra_id } = req.query;

    if (!strategi_rpjmd_id || !renstra_id) {
      return res.status(400).json({
        success: false,
        message: "Parameter strategi_rpjmd_id dan renstra_id wajib diisi.",
      });
    }

    const strategiRpjmd = await Strategi.findByPk(strategi_rpjmd_id);
    if (!strategiRpjmd) {
      return res.status(404).json({
        success: false,
        message: "Strategi RPJMD tidak ditemukan.",
      });
    }

    const base = strategiRpjmd.kode_strategi;
    const existing = await RenstraStrategi.count({
      where: {
        rpjmd_strategi_id: strategi_rpjmd_id,
        renstra_id,
      },
    });

    const next = String(existing + 1).padStart(2, "0");
    const generatedKode = `${base}.${next}`;

    return res.status(200).json({
      success: true,
      message: "Kode strategi berhasil dihasilkan",
      data: { kode_otomatis: generatedKode },
    });
  } catch (error) {
    console.error("❌ Error generating kode strategi:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghasilkan kode strategi.",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const {
      kode_strategi,
      deskripsi,
      sasaran_id,
      rpjmd_strategi_id,
      renstra_id,
      no_rpjmd,
      isi_strategi_rpjmd,
    } = req.body;

    if (!sasaran_id || !rpjmd_strategi_id || !renstra_id || !deskripsi) {
      return res.status(400).json({
        success: false,
        message:
          "sasaran_id, rpjmd_strategi_id, renstra_id, dan deskripsi wajib diisi.",
      });
    }

    const [updated] = await RenstraStrategi.update(
      {
        kode_strategi,
        deskripsi,
        sasaran_id,
        rpjmd_strategi_id,
        renstra_id,
        no_rpjmd,
        isi_strategi_rpjmd,
      },
      { where: { id } }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }

    const updatedData = await RenstraStrategi.findByPk(id, {
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
        },
        {
          model: Strategi,
          as: "strategi_rpjmd",
          attributes: ["id", "kode_strategi", "deskripsi"],
        },
      ],
    });

    return res.json({
      success: true,
      message: "Strategi Renstra berhasil diperbarui",
      data: updatedData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui strategi renstra",
      error: err.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraStrategi.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Data tidak ditemukan",
      });
    }
    return res.json({
      success: true,
      message: "Strategi Renstra berhasil dihapus",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus strategi renstra",
      error: err.message,
    });
  }
};
