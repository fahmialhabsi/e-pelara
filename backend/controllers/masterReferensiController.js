"use strict";

const {
  MasterProgram,
  MasterKegiatan,
  MasterSubKegiatan,
} = require("../models");

// ✅ DEFAULT DATASET (KUNCI UTAMA)
const DEFAULT_DATASET_KEY = "kepmendagri_provinsi_900_2024";

/**
 * Helper ambil dataset_key dari query
 */
function getDatasetKey(req) {
  return req.query.dataset_key || DEFAULT_DATASET_KEY;
}

/**
 * ===============================
 * GET /master-program
 * ===============================
 */
exports.getMasterProgram = async (req, res) => {
  try {
    const datasetKey = getDatasetKey(req);

    const data = await MasterProgram.findAll({
      where: {
        dataset_key: datasetKey,
        is_active: true,
      },
      attributes: ["id", "kode_program_full", "nama_program"],
      order: [["kode_program_full", "ASC"]],
    });

    return res.json({
      success: true,
      dataset_key: datasetKey,
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("getMasterProgram error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil master program",
    });
  }
};

/**
 * ===============================
 * GET /master-kegiatan?program_id=
 * ===============================
 */
exports.getMasterKegiatan = async (req, res) => {
  try {
    const datasetKey = getDatasetKey(req);
    const { program_id } = req.query;

    if (!program_id) {
      const datasetKey = getDatasetKey(req);
      return res.status(400).json({
        success: false,
        dataset_key: datasetKey,
        total: 0,
        data: [],
        message: "program_id wajib diisi",
      });
    }

    const data = await MasterKegiatan.findAll({
      where: {
        dataset_key: datasetKey,
        master_program_id: program_id,
        is_active: true,
      },
      attributes: ["id", "kode_kegiatan_full", "nama_kegiatan"],
      order: [["kode_kegiatan_full", "ASC"]],
    });

    return res.json({
      success: true,
      dataset_key: datasetKey,
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("getMasterKegiatan error:", err);
    const datasetKey = getDatasetKey(req);
    return res.status(500).json({
      success: false,
      dataset_key: datasetKey,
      total: 0,
      data: [],
      message: "Gagal mengambil master kegiatan",
    });
  }
};

/**
 * ===============================
 * GET /master-sub-kegiatan?kegiatan_id=
 * ===============================
 */
exports.getMasterSubKegiatan = async (req, res) => {
  try {
    const datasetKey = getDatasetKey(req);
    const { kegiatan_id } = req.query;

    if (!kegiatan_id) {
      const datasetKey = getDatasetKey(req);
      return res.status(400).json({
        success: false,
        dataset_key: datasetKey,
        total: 0,
        data: [],
        message: "kegiatan_id wajib diisi",
      });
    }

    const data = await MasterSubKegiatan.findAll({
      where: {
        dataset_key: datasetKey,
        master_kegiatan_id: kegiatan_id,
        is_active: true,
      },
      attributes: [
        "id",
        "kode_sub_kegiatan_full",
        "nama_sub_kegiatan",
        "regulasi_versi_id",
      ],
      order: [["kode_sub_kegiatan_full", "ASC"]],
    });

    return res.json({
      success: true,
      dataset_key: datasetKey,
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("getMasterSubKegiatan error:", err);
    const datasetKey = getDatasetKey(req);
    return res.status(500).json({
      success: false,
      dataset_key: datasetKey,
      total: 0,
      data: [],
      message: "Gagal mengambil master sub kegiatan",
    });
  }
};