// controllers/indikatorMisiController.js
const { IndikatorMisi } = require("../models");

const defaultDokumen = {
  jenis_dokumen: "RPJMD",
  tahun: "2025",
};

exports.create = async (req, res) => {
  try {
    const {
      no_misi,
      isi_misi,
      jenis_dokumen = defaultDokumen.jenis_dokumen,
      tahun = defaultDokumen.tahun,
    } = req.body;

    const indikatorMisi = await IndikatorMisi.create({
      no_misi,
      isi_misi,
      jenis_dokumen,
      tahun,
    });

    return res.status(201).json(indikatorMisi);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const indikatorMisi = await IndikatorMisi.findAll();
    return res.status(200).json(indikatorMisi);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const indikatorMisi = await IndikatorMisi.findByPk(req.params.id);
    if (!indikatorMisi) {
      return res.status(404).json({ message: "Indikator Misi not found" });
    }
    return res.status(200).json(indikatorMisi);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const indikatorMisi = await IndikatorMisi.findByPk(req.params.id);
    if (!indikatorMisi) {
      return res.status(404).json({ message: "Indikator Misi not found" });
    }

    const {
      no_misi,
      isi_misi,
      jenis_dokumen = defaultDokumen.jenis_dokumen,
      tahun = defaultDokumen.tahun,
    } = req.body;

    await indikatorMisi.update({ no_misi, isi_misi, jenis_dokumen, tahun });
    return res.status(200).json(indikatorMisi);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const indikatorMisi = await IndikatorMisi.findByPk(req.params.id);
    if (!indikatorMisi) {
      return res.status(404).json({ message: "Indikator Misi not found" });
    }
    await indikatorMisi.destroy();
    return res.status(204).json();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
