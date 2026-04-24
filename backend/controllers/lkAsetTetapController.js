"use strict";

const db = require("../models");
const { previewPenyusutanTahunan } = require("../services/penyusutanService");

const { AsetTetap } = db;

exports.list = async (req, res) => {
  try {
    const rows = await AsetTetap.findAll({
      order: [
        ["kategori", "ASC"],
        ["id", "ASC"],
      ],
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const row = await AsetTetap.create(req.body);
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await AsetTetap.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Aset tidak ditemukan" });
    await row.update(req.body);
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** GET /aset-tetap/penyusutan/:tahun — ringkasan preview penyusutan */
exports.penyusutanTahun = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await previewPenyusutanTahunan(db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
