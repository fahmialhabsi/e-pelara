// controllers/evaluasiRpjmdController.js
const { EvaluasiRpjmd } = require("../models");

const defaultDokumen = {
  jenis_dokumen: "RPJMD",
};

exports.createEvaluation = async (req, res) => {
  try {
    const {
      indikator_id,
      tahun,
      capaian,
      status,
      rekomendasi,
      jenis_dokumen = defaultDokumen.jenis_dokumen,
    } = req.body;

    const result = await EvaluasiRpjmd.create({
      indikator_id,
      tahun,
      capaian,
      status,
      rekomendasi,
      jenis_dokumen,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvaluation = async (req, res) => {
  try {
    const data = await EvaluasiRpjmd.findAll();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;
    const evaluation = await EvaluasiRpjmd.findByPk(id);
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }
    res.status(200).json(evaluation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      indikator_id,
      tahun,
      capaian,
      status,
      rekomendasi,
      jenis_dokumen = defaultDokumen.jenis_dokumen,
    } = req.body;

    const evaluation = await EvaluasiRpjmd.findByPk(id);
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }

    evaluation.indikator_id = indikator_id;
    evaluation.tahun = tahun;
    evaluation.capaian = capaian;
    evaluation.status = status;
    evaluation.rekomendasi = rekomendasi;
    evaluation.jenis_dokumen = jenis_dokumen;

    await evaluation.save();
    res.status(200).json(evaluation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const evaluation = await EvaluasiRpjmd.findByPk(id);
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation not found" });
    }
    await evaluation.destroy();
    res.status(200).json({ message: "Evaluation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
