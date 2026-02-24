// controllers/prioritasNasionalController.js versi update dengan ensureClonedOnce

const { PrioritasNasional } = require("../models");
const { Op, DatabaseError } = require("sequelize");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");

exports.create = async (req, res) => {
  try {
    const data = await PrioritasNasional.create(req.body);
    return res.status(201).json({ message: "Data berhasil dibuat", data });
  } catch (error) {
    console.error(error);
    if (
      error instanceof DatabaseError &&
      error.parent &&
      error.parent.code === "ER_DATA_TOO_LONG"
    ) {
      return res
        .status(400)
        .json({ message: "Nilai salah satu field terlalu panjang." });
    }
    return res
      .status(500)
      .json({ message: "Gagal membuat data", error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      jenis_dokumen,
      tahun,
    } = req.query;
    if (!jenis_dokumen || !tahun)
      return res
        .status(400)
        .json({ message: "jenis_dokumen & tahun required" });

    await ensureClonedOnce(jenis_dokumen, tahun);

    const safeLimit = Math.min(Number(limit) || 20, 100);
    const offset = (Number(page) - 1) * safeLimit;

    const where = {
      jenis_dokumen,
      tahun,
      [Op.or]: [
        { kode_prionas: { [Op.like]: `%${search.trim()}%` } },
        { uraian_prionas: { [Op.like]: `%${search.trim()}%` } },
      ],
    };

    const { rows, count } = await PrioritasNasional.findAndCountAll({
      where,
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
        pageSize: safeLimit,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed fetching data", error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await PrioritasNasional.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ data: item });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed fetching detail", error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await PrioritasNasional.update(req.body, {
      where: { id },
    });
    if (!updated)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    const data = await PrioritasNasional.findByPk(id);
    return res.status(200).json({ message: "Data berhasil diperbarui", data });
  } catch (error) {
    console.error(error);
    if (
      error instanceof DatabaseError &&
      error.parent &&
      error.parent.code === "ER_DATA_TOO_LONG"
    ) {
      return res
        .status(400)
        .json({ message: "Nilai salah satu field terlalu panjang." });
    }
    return res
      .status(500)
      .json({ message: "Gagal memperbarui data", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await PrioritasNasional.destroy({
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
