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
      periode_id,
    } = req.query;

    if (!jenis_dokumen || !tahun) {
      return res
        .status(400)
        .json({ message: "Parameter jenis_dokumen dan tahun wajib diisi." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    // Izinkan limit besar (hingga 1000) agar form edit bisa memuat semua pilihan
    const safeLimit = Math.min(Number(limit) || 10, 1000);
    const offset = (Number(page) - 1) * safeLimit;
    const normalizedDokumen = String(jenis_dokumen || "").toLowerCase();
    const tahunVal =
      typeof tahun === "number" ? tahun : parseInt(String(tahun), 10);
    const q = String(search || "").trim();

    const andParts = [
      { jenis_dokumen: normalizedDokumen },
      {
        tahun: Number.isFinite(tahunVal) ? tahunVal : tahun,
      },
    ];
    /**
     * periode_id opsional: jika tidak dikirim, kembalikan semua baris
     * untuk jenis_dokumen + tahun — mencegah list kosong saat form edit.
     */
    const pid = Number(periode_id);
    if (periode_id !== undefined && periode_id !== "" && Number.isFinite(pid)) {
      andParts.push({ periode_id: pid });
    }
    if (q) {
      andParts.push({
        [Op.or]: [
          { kode_prioda: { [Op.like]: `%${q}%` } },
          { uraian_prioda: { [Op.like]: `%${q}%` } },
        ],
      });
    }
    const where = { [Op.and]: andParts };

    const { rows, count } = await PrioritasDaerah.findAndCountAll({
      where,
      limit: safeLimit,
      offset,
      order: [["id", "ASC"]],
    });

    return res.json({
      data: rows,
      meta: {
        total: count,
        page: +page,
        limit: safeLimit,
        totalPages: Math.ceil(count / safeLimit),
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
