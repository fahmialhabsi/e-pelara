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
      periode_id,
    } = req.query;
    if (!jenis_dokumen || !tahun)
      return res
        .status(400)
        .json({ message: "jenis_dokumen & tahun required" });

    await ensureClonedOnce(jenis_dokumen, tahun);

    // Izinkan limit besar (hingga 1000) agar form edit bisa memuat semua pilihan
    const safeLimit = Math.min(Number(limit) || 20, 1000);
    const offset = (Number(page) - 1) * safeLimit;

    const normalizedDokumen = String(jenis_dokumen || "").toLowerCase();
    const tahunVal =
      typeof tahun === "number" ? tahun : parseInt(String(tahun), 10);
    const q = String(search || "").trim();

    const where = {
      jenis_dokumen: normalizedDokumen,
      tahun: Number.isFinite(tahunVal) ? tahunVal : tahun,
    };
    /**
     * periode_id bersifat opsional di sini: jika tidak dikirim atau kosong,
     * kembalikan semua baris untuk jenis_dokumen + tahun tersebut.
     * Ini agar form edit dapat menemukan pilihan yang tersimpan
     * meskipun periode_id-nya berbeda dengan periode aktif.
     */
    const pid = Number(periode_id);
    if (periode_id !== undefined && periode_id !== "" && Number.isFinite(pid)) {
      where.periode_id = pid;
    }
    if (q) {
      where[Op.or] = [
        { kode_prionas: { [Op.like]: `%${q}%` } },
        { uraian_prionas: { [Op.like]: `%${q}%` } },
      ];
    }

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
