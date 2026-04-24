"use strict";

const db = require("../models");
const { QueryTypes } = require("sequelize");
const { generateNeraca, kunciNeraca } = require("../services/neracaService");

const { NeracaSnapshot, sequelize } = db;

exports.list = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await NeracaSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [
        ["kelompok", "ASC"],
        ["urutan", "ASC"],
        ["kode_akun", "ASC"],
      ],
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
    const out = await generateNeraca(sequelize, db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message });
  }
};

exports.perbandingan = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await sequelize.query(
      `SELECT n.kode_akun, n.nama_akun, n.kelompok,
              n.nilai_tahun_ini AS nilai_ini,
              p.nilai_tahun_ini AS nilai_tahun_lalu
       FROM neraca_snapshot n
       LEFT JOIN neraca_snapshot p
         ON p.kode_akun = n.kode_akun AND p.tahun_anggaran = :tl
       WHERE n.tahun_anggaran = :t
       ORDER BY n.kelompok, n.urutan, n.kode_akun`,
      { replacements: { t: tahun, tl: tahun - 1 }, type: QueryTypes.SELECT },
    );
    res.json({ tahun_anggaran: tahun, data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.kunci = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const r = await kunciNeraca(db, tahun);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.export = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await NeracaSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [
        ["kelompok", "ASC"],
        ["urutan", "ASC"],
      ],
    });
    res.json({
      judul: `Neraca — 31 Desember ${tahun}`,
      tahun_anggaran: tahun,
      baris: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
