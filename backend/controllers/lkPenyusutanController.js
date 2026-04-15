"use strict";

const db = require("../models");
const {
  previewPenyusutanTahunan,
  prosesPenyusutanTahunan,
} = require("../services/penyusutanService");

const { sequelize } = db;

exports.preview = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await previewPenyusutanTahunan(db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.proses = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await prosesPenyusutanTahunan(sequelize, db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
