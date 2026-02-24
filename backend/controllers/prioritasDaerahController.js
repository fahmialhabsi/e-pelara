// controllers/prioritasDaerahController.js versi update dengan ensureClonedOnce

const { PrioritasDaerah } = require("../models");
const { Op } = require("sequelize");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");

exports.create = async (req, res) => {
  try {
    const data = await PrioritasDaerah.create(req.body);
    return res.status(201).json({ message: "Data berhasil ditambahkan", data });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Gagal menambahkan data", error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      jenis_dokumen,
      tahun,
    } = req.query;

    if (!jenis_dokumen || !tahun) {
      return res
        .status(400)
        .json({ message: "Parameter jenis_dokumen dan tahun wajib diisi." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    const offset = (page - 1) * limit;
    const where = {
      [Op.and]: [
        { jenis_dokumen },
        { tahun },
        {
          [Op.or]: [
            { kode_prioda: { [Op.like]: `%${search}%` } },
            { uraian_prioda: { [Op.like]: `%${search}%` } },
          ],
        },
      ],
    };

    const { rows, count } = await PrioritasDaerah.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [["id", "ASC"]],
    });

    return res.json({
      data: rows,
      meta: {
        total: count,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Gagal mengambil data", error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await PrioritasDaerah.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Gagal mengambil data", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await PrioritasDaerah.findByPk(id);
    if (!data) {
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan saat findByPk" });
    }

    await data.update(req.body);
    return res.status(200).json({ message: "Data berhasil diperbarui", data });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Gagal memperbarui data", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await PrioritasDaerah.destroy({
      where: { id: req.params.id },
    });
    if (!deleted)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.status(200).json({ message: "Data berhasil dihapus" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Gagal menghapus data", error: error.message });
  }
};
