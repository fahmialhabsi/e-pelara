const { Visi, Misi } = require("../models");

const getAllVisi = async (req, res) => {
  try {
    const visiList = await Visi.findAll({
      include: [
        {
          model: Misi,
          as: "misiFromVisi", // harus sama persis dengan as di model
          attributes: ["id", "isi_misi", "no_misi"],
        },
      ],
      order: [["tahun_awal", "ASC"]],
    });
    res.status(200).json(visiList);
  } catch (error) {
    console.error("Error fetching Visi:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Visi", error: error.message });
  }
};

const getVisiById = async (req, res) => {
  try {
    const visi = await Visi.findByPk(req.params.id, {
      include: [
        {
          model: Misi,
          as: "misiFromVisi",
          attributes: ["id", "isi_misi", "no_misi"],
        },
      ],
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
