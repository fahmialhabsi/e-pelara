const { Op } = require("sequelize");
const { Visi, Misi } = require("../models");
const { autoCloneMisiIfNeeded } = require("../utils/autoCloneMisiIfNeeded");
const { listResponse } = require("../utils/responseHelper");

const buildMisiInclude = (query = {}) => {
  const where = {};

  if (query.jenis_dokumen) where.jenis_dokumen = query.jenis_dokumen;
  if (query.tahun) where.tahun = String(query.tahun);

  return {
    model: Misi,
    as: "misiFromVisi",
    attributes: ["id", "isi_misi", "no_misi"],
    ...(Object.keys(where).length > 0 ? { where, required: false } : {}),
  };
};

const buildVisiWhere = (query = {}) => {
  const where = {};
  const parsedTahun = parseInt(query.tahun, 10);

  if (!Number.isNaN(parsedTahun)) {
    where.tahun_awal = { [Op.lte]: parsedTahun };
    where.tahun_akhir = { [Op.gte]: parsedTahun };
  }

  return where;
};

const getAllVisi = async (req, res) => {
  try {
    if (req.query.jenis_dokumen && req.query.tahun) {
      await autoCloneMisiIfNeeded({
        jenis_dokumen: req.query.jenis_dokumen,
        tahun: req.query.tahun,
      });
    }

    const visiList = await Visi.findAll({
      where: buildVisiWhere(req.query),
      include: [buildMisiInclude(req.query)],
      order: [["tahun_awal", "ASC"]],
    });
    return listResponse(
      res,
      200,
      "Daftar visi berhasil diambil",
      visiList,
    );
  } catch (error) {
    console.error("Error fetching Visi:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Visi", error: error.message });
  }
};

const getVisiById = async (req, res) => {
  try {
    if (req.query.jenis_dokumen && req.query.tahun) {
      await autoCloneMisiIfNeeded({
        jenis_dokumen: req.query.jenis_dokumen,
        tahun: req.query.tahun,
      });
    }

    const visi = await Visi.findByPk(req.params.id, {
      include: [buildMisiInclude(req.query)],
    });
    if (!visi) return res.status(404).json({ message: "Visi not found" });
    res.status(200).json(visi);
  } catch (error) {
    console.error("Error fetching Visi by ID:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Visi", error: error.message });
  }
};

const createVisi = async (req, res) => {
  try {
    const { isi_visi, tahun_awal, tahun_akhir } = req.body;
    const newVisi = await Visi.create({ isi_visi, tahun_awal, tahun_akhir });
    res.status(201).json(newVisi);
  } catch (error) {
    res.status(500).json({ message: "Failed to create visi", error });
  }
};

const updateVisi = async (req, res) => {
  try {
    const visi = await Visi.findByPk(req.params.id);
    if (!visi) {
      return res.status(404).json({ message: "Visi not found" });
    }
    const { isi_visi, tahun_awal, tahun_akhir } = req.body;
    await visi.update({ isi_visi, tahun_awal, tahun_akhir });
    res.status(200).json(visi);
  } catch (error) {
    res.status(500).json({ message: "Failed to update visi", error });
  }
};

const deleteVisi = async (req, res) => {
  try {
    const visi = await Visi.findByPk(req.params.id);
    if (!visi) {
      return res.status(404).json({ message: "Visi not found" });
    }
    await visi.destroy();
    res.status(200).json({ message: "Visi deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete visi", error });
  }
};

module.exports = {
  getAllVisi,
  getVisiById,
  createVisi,
  updateVisi,
  deleteVisi,
};
