// controllers/divisionController.js
const { Division } = require("../models");

const defaultDokumen = {
  jenis_dokumennn: "RPJMD",
  tahun: "2025",
};

exports.createDivision = async (req, res) => {
  const {
    division_name,
    description,
    rpjmd_id,
    jenis_dokumennn = defaultDokumen.jenis_dokumennn,
    tahun = defaultDokumen.tahun,
  } = req.body;

  if (!division_name) {
    return res.status(400).json({ message: "Division name is required" });
  }

  try {
    const newDivision = await Division.create({
      name: division_name,
      description,
      rpjmd_id,
      jenis_dokumennn,
      tahun,
    });

    res.status(201).json(newDivision);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error creating division", error: error.message });
  }
};

exports.getDivisions = async (req, res) => {
  try {
    const divisions = await Division.findAll({
      attributes: ["id", "name", "description"],
      order: [["id", "ASC"]],
    });
    res.json(divisions);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data divisi." });
  }
};

exports.getDivisionById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const division = await Division.findByPk(id, {
      attributes: ["id", "name"],
    });
    if (!division) {
      return res.status(404).json({ message: "Division tidak ditemukan" });
    }
    res.json(division);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data division" });
  }
};

exports.updateDivision = async (req, res) => {
  try {
    const {
      division_name,
      description,
      rpjmd_id,
      jenis_dokumennn = defaultDokumen.jenis_dokumennn,
      tahun = defaultDokumen.tahun,
    } = req.body;

    if (!division_name) {
      return res.status(400).json({ message: "Division name is required" });
    }

    const division = await Division.findByPk(req.params.id);

    if (!division) {
      return res.status(404).json({ message: "Division not found" });
    }

    await division.update({
      name: division_name,
      description,
      rpjmd_id,
      jenis_dokumennn,
      tahun,
    });

    res.status(200).json(division);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating division", error: error.message });
  }
};

exports.deleteDivision = async (req, res) => {
  try {
    const division = await Division.findByPk(req.params.id);

    if (!division) {
      return res.status(404).json({ message: "Division not found" });
    }

    await division.destroy();
    res.status(200).json({ message: "Division deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting division" });
  }
};
