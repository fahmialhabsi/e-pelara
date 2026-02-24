// controllers/prioritasGubernurController.js versi update dengan ensureClonedOnce

const { PrioritasGubernur, Sasaran } = require("../models");
const { Op } = require("sequelize");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");

exports.create = async (req, res) => {
  try {
    const data = await PrioritasGubernur.create(req.body);
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
      limit = 50,
      search = "",
      jenis_dokumen,
      tahun,
    } = req.query;
    if (!jenis_dokumen || !tahun) {
      return res
        .status(400)
        .json({ message: "jenis_dokumen & tahun wajib diisi." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);
    const safeLimit = Math.min(Number(limit), 100);
    const offset = (Number(page) - 1) * safeLimit;

    const where = {
      jenis_dokumen,
      tahun,
      [Op.or]: [
        { kode_priogub: { [Op.like]: `%${search}%` } },
        { uraian_priogub: { [Op.like]: `%${search}%` } },
        { standar_layanan_opd: { [Op.like]: `%${search}%` } },
      ],
    };

    const { rows, count } = await PrioritasGubernur.findAndCountAll({
      where,
      include: [
        {
          model: Sasaran,
          as: "Sasaran",
          attributes: ["id", "nomor", "isi_sasaran"],
          required: false,
        },
      ],
      limit: safeLimit,
      offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    return res.json({
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / safeLimit),
        currentPage: Number(page),
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Gagal mengambil data", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await PrioritasGubernur.findByPk(req.params.id);
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
    const [updated] = await PrioritasGubernur.update(req.body, {
      where: { id },
    });
    if (!updated)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    const data = await PrioritasGubernur.findByPk(id);
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
    const deleted = await PrioritasGubernur.destroy({
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
