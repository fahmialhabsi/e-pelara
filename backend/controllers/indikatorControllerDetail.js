// backend/controllers/indikatorControllerDetail.js
const {
  Indikator,
  Sasaran,
  Tujuan,
  Misi,
  IndikatorDetail,
} = require("../models");
const { Op } = require("sequelize");
const { getPeriodeIdFromTahun } = require("../utils/periodeHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const {
  successResponse,
  errorResponse,
  listResponse,
} = require("../utils/responseHelper");

// Helper: Bersihkan payload dari string kosong
const cleanPayload = (payload) => {
  const result = {};
  for (const key in payload) {
    result[key] = payload[key] === "" ? null : payload[key];
  }
  return result;
};

// Relasi untuk include
const withRelations = [
  { model: Sasaran, as: "sasaran" },
  { model: Tujuan, as: "tujuan" },
  { model: Misi, as: "misi" },
  { model: IndikatorDetail, as: "details" },
];

// Create new Indikator
exports.createIndikator = async (req, res, next) => {
  try {
    const cleaned = cleanPayload(req.body);

    // Default fallback jika null (setelah dibersihkan)
    if (!cleaned.jenis_dokumen) cleaned.jenis_dokumen = "RPJMD";
    if (!cleaned.tahun) cleaned.tahun = "2025";
    if (!cleaned.level_dokumen) cleaned.level_dokumen = "RPJMD";
    if (!cleaned.jenis_iku) cleaned.jenis_iku = "IKU";

    // Validasi manual untuk field ENUM (jika ingin lebih eksplisit)
    if (!cleaned.jenis_indikator) {
      return res.status(400).json({
        status: "error",
        message: "Jenis indikator wajib diisi",
      });
    }

    if (!cleaned.tipe_indikator) {
      return res.status(400).json({
        status: "error",
        message: "Tipe indikator wajib diisi",
      });
    }

    const newIndikator = await Indikator.create(cleaned);

    return res.status(201).json({ status: "success", data: newIndikator });
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        status: "error",
        message: error.message,
        detail: error.errors,
      });
    }
    next(error);
  }
};

// Get all Indikators
exports.getIndikators = async (req, res, next) => {
  try {
    const { jenis_dokumen, tahun, page = 1, limit = 50 } = req.query;
    if (!tahun || !jenis_dokumen) {
      return res
        .status(400)
        .json({ status: "error", message: "tahun & jenis_dokumen wajib." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);
    const periode_id = await getPeriodeIdFromTahun(tahun);
    if (!periode_id) return errorResponse(res, 400, "Periode tidak ditemukan.");

    const safeLimit = Math.min(Number(limit), 100);
    const offset = (Number(page) - 1) * safeLimit;
    const where = { tahun, jenis_dokumen, periode_id };

    const { count, rows } = await Indikator.findAndCountAll({
      where,
      attributes: [
        "id",
        "kode_indikator",
        "nama_indikator",
        "tahun",
        "jenis_indikator",
        "jenis_dokumen",
      ],
      include: [
        { model: Sasaran, as: "sasaran", attributes: ["id", "nomor"] },
        { model: Tujuan, as: "tujuan", attributes: ["id", "no_tujuan"] },
        { model: Misi, as: "misi", attributes: ["id", "no_misi"] },
        { model: IndikatorDetail, as: "details", attributes: ["id", "nilai"] },
      ],
      limit: safeLimit,
      offset,
      order: [["kode_indikator", "ASC"]],
      distinct: true,
    });

    return listResponse(res, 200, "List indikator", rows, {
      totalItems: count,
      totalPages: Math.ceil(count / safeLimit),
      currentPage: Number(page),
    });
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Gagal mengambil indikator", err.message);
  }
};

// Get Indikator by ID
exports.getIndikatorById = async (req, res, next) => {
  try {
    const indikator = await Indikator.findByPk(req.params.id, {
      attributes: [
        "id",
        "kode_indikator",
        "nama_indikator",
        "tahun",
        "jenis_dokumen",
        "jenis_indikator",
      ],
      include: [
        { model: Sasaran, as: "sasaran", attributes: ["id", "nomor"] },
        { model: Tujuan, as: "tujuan", attributes: ["id", "no_tujuan"] },
        { model: Misi, as: "misi", attributes: ["id", "no_misi"] },
        { model: IndikatorDetail, as: "details", attributes: ["id", "nilai"] },
      ],
    });
    if (!indikator)
      return errorResponse(res, 404, "Indikator tidak ditemukan.");

    return successResponse(res, 200, "Detail indikator", indikator);
  } catch (err) {
    console.error(err);
    return errorResponse(
      res,
      500,
      "Gagal mengambil detail indikator",
      err.message
    );
  }
};

// Update Indikator
exports.updateIndikator = async (req, res, next) => {
  try {
    const indikator = await Indikator.findByPk(req.params.id);
    if (!indikator) {
      return res
        .status(404)
        .json({ status: "error", message: "Indikator tidak ditemukan" });
    }

    const allowedFields = [
      "sasaran_id",
      "tujuan_id",
      "misi_id",
      "kode_indikator",
      "nama_indikator",
      "definisi_operasional",
      "satuan",
      "metode_penghitungan",
      "baseline",
      "target_tahun_1",
      "target_tahun_2",
      "target_tahun_3",
      "target_tahun_4",
      "target_tahun_5",
      "sumber_data",
      "penanggung_jawab",
      "keterangan",
      "jenis_indikator",
      "tipe_indikator",
      "kriteria_kuantitatif",
      "kriteria_kualitatif",
      "jenis_dokumen",
      "tahun",
      "level_dokumen",
      "jenis_iku",
    ];

    const rawPayload = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        rawPayload[key] = req.body[key];
      }
    }

    const cleanedPayload = cleanPayload(rawPayload);

    await indikator.update(cleanedPayload);
    return res.json({ status: "success", data: indikator });
  } catch (error) {
    console.error("[UPDATE] Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
      detail: error.errors || null,
    });
  }
};

// Delete Indikator
exports.deleteIndikator = async (req, res, next) => {
  try {
    const indikator = await Indikator.findByPk(req.params.id);
    if (!indikator) {
      return res
        .status(404)
        .json({ status: "error", message: "Indikator tidak ditemukan" });
    }

    await indikator.destroy();
    return res.json({
      status: "success",
      message: "Indikator berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
};
