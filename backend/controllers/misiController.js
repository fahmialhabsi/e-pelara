// controllers/misiController.js
const { Misi, Visi } = require("../models");
const { logActivity } = require("../services/auditService");
const { autoCloneMisiIfNeeded } = require("../utils/autoCloneMisiIfNeeded");
const { listResponse } = require("../utils/responseHelper");

const dedupeMisis = (rows = []) => {
  const seen = new Set();

  return rows.filter((item) => {
    const key = [
      item.visi_id,
      item.no_misi,
      String(item.isi_misi || "").trim().toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

// Create new Misi
const createMisi = async (req, res) => {
  try {
    const {
      visi_id,
      no_misi,
      isi_misi,
      deskripsi,
      jenis_dokumen,
      tahun,
      periode_id,
      rpjmd_id,
    } = req.body;

    // 🔒 Validasi input kosong
    if (
      !visi_id ||
      !no_misi ||
      !isi_misi ||
      !jenis_dokumen ||
      !tahun ||
      !periode_id ||
      !rpjmd_id
    ) {
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    const newMisi = await Misi.create({
      visi_id,
      no_misi,
      isi_misi,
      deskripsi,
      jenis_dokumen,
      tahun,
      periode_id,
      rpjmd_id,
    });

    // Ambil kembali dengan relasi visi untuk respon lengkap
    const createdWithVisi = await Misi.findByPk(newMisi.id, {
      include: [{ model: Visi, as: "visi", attributes: ["id", "isi_visi"] }],
    });

    logActivity(
      req,
      "CREATE",
      "Misi",
      newMisi.id,
      null,
      createdWithVisi.toJSON(),
    );
    return res.status(201).json(createdWithVisi);
  } catch (error) {
    console.error("Error creating Misi:", error);
    return res.status(500).json({
      message: "Error creating Misi",
      error: error.message,
    });
  }
};

// Get all Misi
const getMisis = async (req, res) => {
  try {
    const { visi_id, jenis_dokumen, tahun, periode_id } = req.query;
    const where = {};

    if (jenis_dokumen && tahun) {
      await autoCloneMisiIfNeeded({ jenis_dokumen, tahun });
    }

    if (visi_id) where.visi_id = visi_id;
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
    if (tahun) where.tahun = String(tahun);
    if (periode_id) where.periode_id = periode_id;

    const misis = await Misi.findAll({
      where,
      include: [{ model: Visi, as: "visi", attributes: ["id", "isi_visi"] }],
      order: [["no_misi", "ASC"], ["id", "ASC"]],
    });
    return listResponse(
      res,
      200,
      "Daftar misi berhasil diambil",
      dedupeMisis(misis),
    );
  } catch (error) {
    console.error("Error fetching Misi:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Misi", error: error.message });
  }
};

// Get single Misi by ID
const getMisiById = async (req, res) => {
  try {
    const misi = await Misi.findByPk(req.params.id, {
      include: [{ model: Visi, as: "visi", attributes: ["id", "isi_visi"] }],
    });
    if (!misi) return res.status(404).json({ message: "Misi not found" });
    res.status(200).json(misi);
  } catch (error) {
    console.error("Error fetching Misi by ID:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Misi", error: error.message });
  }
};

// Update Misi
const updateMisi = async (req, res) => {
  try {
    const { visi_id, no_misi, isi_misi, deskripsi, rpjmd_id } = req.body;

    // 🔒 Validasi input kosong
    if (!visi_id || !no_misi || !isi_misi || !rpjmd_id) {
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    const misi = await Misi.findByPk(req.params.id);
    if (!misi) {
      return res.status(404).json({ message: "Misi not found" });
    }
    const oldData = misi.toJSON();
    await misi.update({ visi_id, no_misi, isi_misi, deskripsi, rpjmd_id });
    logActivity(req, "UPDATE", "Misi", misi.id, oldData, misi.toJSON());
    return res.status(200).json(misi);
  } catch (error) {
    console.error("Error updating Misi:", error);
    return res
      .status(500)
      .json({ message: "Error updating Misi", error: error.message });
  }
};

// Delete Misi
const deleteMisi = async (req, res) => {
  try {
    const misi = await Misi.findByPk(req.params.id);
    if (!misi) {
      return res.status(404).json({ message: "Misi not found" });
    }
    const oldData = misi.toJSON();
    await misi.destroy();
    logActivity(req, "DELETE", "Misi", parseInt(req.params.id), oldData, null);
    return res.status(200).json({ message: "Misi deleted" });
  } catch (error) {
    console.error("Error deleting Misi:", error);
    return res
      .status(500)
      .json({ message: "Error deleting Misi", error: error.message });
  }
};

// Ekspor semua controller sekaligus
module.exports = {
  createMisi,
  getMisis,
  getMisiById,
  updateMisi,
  deleteMisi,
};
