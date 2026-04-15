"use strict";

const db = require("../models");
const { generateLo, kunciLo } = require("../services/loService");

const { LoSnapshot, sequelize } = db;

exports.list = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await LoSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [
        ["kelompok", "ASC"],
        ["urutan", "ASC"],
      ],
    });
    const pendapatan = rows
      .filter((r) => r.kelompok === "PENDAPATAN_LO")
      .reduce((s, r) => s + Number(r.nilai_tahun_ini), 0);
    const beban = rows
      .filter((r) => r.kelompok === "BEBAN_LO")
      .reduce((s, r) => s + Number(r.nilai_tahun_ini), 0);
    const terkunci = rows.some((r) => r.dikunci);
    res.json({
      tahun_anggaran: tahun,
      status: terkunci ? "FINAL" : "DRAFT",
      ringkasan: {
        total_pendapatan: pendapatan,
        total_beban: beban,
        surplus_defisit: pendapatan - beban,
      },
      data: rows,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.generate = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await generateLo(sequelize, db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message });
  }
};

exports.kunci = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const r = await kunciLo(db, tahun);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
