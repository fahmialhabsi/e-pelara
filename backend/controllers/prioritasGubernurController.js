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
      periode_id,
    } = req.query;
    if (!jenis_dokumen || !tahun) {
      return res
        .status(400)
        .json({ message: "jenis_dokumen & tahun wajib diisi." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);
    // Izinkan limit besar (hingga 1000) agar form edit bisa memuat semua pilihan
    const safeLimit = Math.min(Number(limit) || 50, 1000);
    const offset = (Number(page) - 1) * safeLimit;

    const normalizedDokumen = String(jenis_dokumen || "").toLowerCase();
    const tahunVal =
      typeof tahun === "number" ? tahun : parseInt(String(tahun), 10);
    const q = String(search || "").trim();

    const where = {
      jenis_dokumen: normalizedDokumen,
      tahun: Number.isFinite(tahunVal) ? tahunVal : tahun,
    };
    const pid = Number(periode_id);
    if (periode_id !== undefined && periode_id !== "" && Number.isFinite(pid)) {
      where.periode_id = pid;
    }
    if (q) {
      where[Op.or] = [
        { kode_priogub: { [Op.like]: `%${q}%` } },
        { uraian_priogub: { [Op.like]: `%${q}%` } },
        { standar_layanan_opd: { [Op.like]: `%${q}%` } },
      ];
    }

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
