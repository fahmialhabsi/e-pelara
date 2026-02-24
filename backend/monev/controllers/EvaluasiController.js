// rpjmd-backend/controllers/monev/evaluasiController.js
const { Evaluasi, Program, Sasaran, Indikator } = require("../../models");

const createEvaluasi = async (req, res) => {
  try {
    const { program_id, sasaran_id, indikator_id, hasil_evaluasi } = req.body;

    const evaluasi = await Evaluasi.create({
      program_id,
      sasaran_id,
      indikator_id,
      hasil_evaluasi,
    });

    return res.status(201).json({ evaluasi });
  } catch (error) {
    return res.status(500).json({ message: "Error creating evaluasi", error });
  }
};

const getEvaluasi = async (req, res) => {
  try {
    const evaluasiList = await Evaluasi.findAll({
      include: [
        { model: Program, as: "program" },
        { model: Sasaran, as: "sasaran" },
        { model: Indikator, as: "indikator" },
      ],
    });

    return res.status(200).json({ evaluasi: evaluasiList });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching evaluasi", error });
  }
};

module.exports = {
  createEvaluasi,
  getEvaluasi,
};
