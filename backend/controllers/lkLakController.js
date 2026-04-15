"use strict";

const db = require("../models");
const {
  generateLak,
  validasiLak,
  kunciLak,
} = require("../services/lakService");

const { LakSnapshot } = db;

exports.list = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });

    const rows = await LakSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [
        ["kelompok", "ASC"],
        ["urutan", "ASC"],
      ],
    });
    const plain = rows.map((r) => r.get({ plain: true }));
    const terkunci = plain.some((r) => r.dikunci);
    res.json({
      tahun_anggaran: tahun,
      status: terkunci ? "FINAL" : "DRAFT",
      data: plain,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat LAK" });
  }
};

exports.generate = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await generateLak(db.sequelize, db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message });
  }
};

exports.validasi = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await validasiLak(db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.exportData = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await LakSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [
        ["kelompok", "ASC"],
        ["urutan", "ASC"],
      ],
    });
    const validasi = await validasiLak(db, tahun);
    res.json({
      tahun_anggaran: tahun,
      validasi,
      baris: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.kunci = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await kunciLak(db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
