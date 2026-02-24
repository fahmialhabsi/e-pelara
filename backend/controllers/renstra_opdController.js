// controllers/renstra_opdController.js
const { RenstraOPD, OpdPenanggungJawab } = require("../models");
const { Op } = require("sequelize");

// ✅ CREATE
exports.create = async (req, res) => {
  try {
    if (!req.body.opd_id) {
      return res.status(400).json({ message: "opd_id wajib diisi" });
    }

    const opd = await OpdPenanggungJawab.findByPk(req.body.opd_id);
    if (!opd) {
      return res.status(400).json({ message: "OPD tidak ditemukan" });
    }

    const renstra = await RenstraOPD.create({
      ...req.body,
      nama_opd: opd.nama_opd,
    });

    // pastikan hanya satu aktif
    await RenstraOPD.update(
      { is_aktif: false },
      { where: { id: { [Op.ne]: renstra.id } } }
    );
    await RenstraOPD.update({ is_aktif: true }, { where: { id: renstra.id } });

    res.status(201).json({ message: "success", data: renstra });
  } catch (err) {
    res.status(400).json({ message: "Gagal membuat data", error: err.message });
  }
};

// ✅ SET AKTIF
exports.setAktif = async (req, res) => {
  try {
    const id = req.params.id;
    const renstra = await RenstraOPD.findByPk(id);
    if (!renstra) {
      return res.status(404).json({ message: "Renstra tidak ditemukan" });
    }

    await RenstraOPD.update({ is_aktif: false }, { where: {} });
    await RenstraOPD.update({ is_aktif: true }, { where: { id } });

    res.json({ message: "success", data: { id, is_aktif: true } });
  } catch (err) {
    res.status(500).json({ message: "Gagal set aktif", error: err.message });
  }
};

// ✅ FIND ALL
exports.findAll = async (req, res) => {
  try {
    const { is_aktif } = req.query;
    const where = {};

    if (typeof is_aktif !== "undefined") {
      where.is_aktif = is_aktif === "true" ? 1 : 0;
    }

    const data = await RenstraOPD.findAll({
      where,
      include: [
        {
          model: OpdPenanggungJawab,
          as: "opd",
          attributes: ["id", "nama_opd", "nama_bidang_opd"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ message: "success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error mengambil data", error: err.message });
  }
};

// ✅ FIND ONE
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraOPD.findByPk(req.params.id, {
      include: [
        {
          model: OpdPenanggungJawab,
          as: "opd",
          attributes: ["id", "nama_opd", "nama_bidang_opd"],
        },
      ],
    });

    if (!data) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    res.json({ message: "success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error mengambil data", error: err.message });
  }
};

// ✅ UPDATE
exports.update = async (req, res) => {
  try {
    if (!req.body.opd_id) {
      return res.status(400).json({ message: "opd_id wajib diisi" });
    }

    const opd = await OpdPenanggungJawab.findByPk(req.body.opd_id);
    if (!opd) {
      return res.status(400).json({ message: "OPD tidak ditemukan" });
    }

    const [updated] = await RenstraOPD.update(
      { ...req.body, nama_opd: opd.nama_opd },
      { where: { id: req.params.id } }
    );

    if (!updated) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    // pastikan hanya satu aktif
    await RenstraOPD.update(
      { is_aktif: false },
      { where: { id: { [Op.ne]: req.params.id } } }
    );
    await RenstraOPD.update(
      { is_aktif: true },
      { where: { id: req.params.id } }
    );

    const data = await RenstraOPD.findByPk(req.params.id);
    res.json({ message: "success", data });
  } catch (err) {
    res.status(400).json({ message: "Gagal update data", error: err.message });
  }
};

// ✅ GET AKTIF
exports.getAktif = async (req, res) => {
  try {
    const data = await RenstraOPD.findOne({ where: { is_aktif: true } });
    if (!data) {
      return res.status(404).json({ message: "Renstra aktif tidak ditemukan" });
    }
    res.json({ message: "success", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil data aktif", error: err.message });
  }
};

// ✅ DELETE
exports.delete = async (req, res) => {
  try {
    const deleted = await RenstraOPD.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }
    res.json({ message: "success", data: { id: req.params.id } });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal menghapus data", error: err.message });
  }
};
