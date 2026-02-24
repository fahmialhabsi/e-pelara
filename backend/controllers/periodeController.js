// controllers/periodeController.js
const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { PeriodeRpjmd } = require("../models");
const {
  getPeriodeAktif,
  clearPeriodeCache,
} = require("../utils/periodeHelper");

// POST /api/periode-rpjmd
const createPeriode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { tahun_awal, tahun_akhir } = req.body;

    const existing = await PeriodeRpjmd.findOne({
      where: { tahun_awal, tahun_akhir },
    });

    if (existing) {
      return res.status(409).json({
        message: "Periode dengan tahun tersebut sudah ada.",
      });
    }

    const newPeriode = await PeriodeRpjmd.create({ tahun_awal, tahun_akhir });

    // Bersihkan cache
    clearPeriodeCache(tahun_awal);
    clearPeriodeCache(tahun_akhir);
    clearPeriodeCache(); // aktif

    res.status(201).json({
      message: "Periode berhasil dibuat.",
      data: newPeriode,
    });
  } catch (error) {
    console.error("[createPeriode]", error);
    res.status(500).json({ message: "Gagal membuat periode." });
  }
};
// GET /api/periode-rpjmd/active
const getActivePeriode = async (req, res) => {
  try {
    const periode = await getPeriodeAktif();

    if (!periode) {
      const currentYear = new Date().getFullYear();
      return res.status(404).json({
        message: `Periode aktif untuk tahun ${currentYear} tidak ditemukan.`,
      });
    }

    res.json(periode);
  } catch (error) {
    console.error("[PeriodeController.getActivePeriode]", error);
    res.status(500).json({ message: "Gagal mengambil periode aktif." });
  }
};

const getPeriodeById = async (req, res) => {
  try {
    const id = req.params.id;
    const periode = await PeriodeRpjmd.findByPk(id);

    if (!periode) {
      return res.status(404).json({ message: "Periode tidak ditemukan." });
    }

    res.json(periode);
  } catch (error) {
    console.error("[getPeriodeById]", error);
    res.status(500).json({ message: "Gagal mengambil data periode." });
  }
};

// PUT /api/periode-rpjmd/:id
const updatePeriodeById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const id = req.params.id;
    const { tahun_awal, tahun_akhir } = req.body;

    const periode = await PeriodeRpjmd.findByPk(id);
    if (!periode) {
      return res.status(404).json({ message: "Periode tidak ditemukan." });
    }

    await periode.update({ tahun_awal, tahun_akhir });

    clearPeriodeCache(tahun_awal);
    clearPeriodeCache(tahun_akhir);
    clearPeriodeCache(); // Bersihkan juga cache aktif

    res.json({ message: "Periode berhasil diperbarui.", data: periode });
  } catch (error) {
    console.error("[updatePeriodeById]", error);
    res.status(500).json({ message: "Gagal memperbarui periode." });
  }
};

// DELETE /api/periode-rpjmd/:id
const deletePeriodeById = async (req, res) => {
  try {
    const id = req.params.id;

    const periode = await PeriodeRpjmd.findByPk(id);
    if (!periode) {
      return res.status(404).json({ message: "Periode tidak ditemukan." });
    }

    const { tahun_awal, tahun_akhir } = periode;

    await periode.destroy();

    // Hapus cache (cache aktif & berdasarkan tahun)
    clearPeriodeCache(tahun_awal);
    clearPeriodeCache(tahun_akhir);
    clearPeriodeCache();

    res.json({ message: "Periode berhasil dihapus." });
  } catch (error) {
    console.error("[deletePeriodeById]", error);
    res.status(500).json({ message: "Gagal menghapus periode." });
  }
};

module.exports = {
  getActivePeriode,
  updatePeriodeById,
  deletePeriodeById,
  createPeriode,
  getPeriodeById,
};
