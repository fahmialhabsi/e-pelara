"use strict";

const db = require("../models");
const {
  generateLpe,
  kunciLpe,
  validasiKeseimbangan,
} = require("../services/lpeService");

const { LpeSnapshot, sequelize } = db;

exports.list = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await LpeSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [["urutan", "ASC"]],
    });
    const terkunci = rows.some((r) => r.dikunci);
    res.json({
      tahun_anggaran: tahun,
      status: terkunci ? "FINAL" : "DRAFT",
      data: rows,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.generate = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const koreksi = req.body || {};
    const out = await generateLpe(sequelize, db, tahun, koreksi);
    res.json({ ok: true, ...out });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message });
  }
};

exports.kunci = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const r = await kunciLpe(db, tahun);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.validasi = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await validasiKeseimbangan(sequelize, db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
