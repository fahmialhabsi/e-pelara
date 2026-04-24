"use strict";

const db = require("../models");
const { QueryTypes } = require("sequelize");
const {
  generateLra,
  kunciLra,
  crosscheckReport,
} = require("../services/lraService");

const { sequelize, LraSnapshot } = db;

exports.list = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });

    const rows = await sequelize.query(
      `SELECT ls.*, kab.jenis AS kelompok
       FROM lra_snapshot ls
       LEFT JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun
       WHERE ls.tahun_anggaran = :tahun
       ORDER BY
         CASE kab.jenis
           WHEN 'PENDAPATAN' THEN 1
           WHEN 'BELANJA' THEN 2
           WHEN 'PEMBIAYAAN' THEN 3
           ELSE 9
         END,
         ls.kode_akun`,
      { replacements: { tahun }, type: QueryTypes.SELECT },
    );

    const terkunci = rows.some((r) => r.dikunci);
    res.json({
      tahun_anggaran: tahun,
      status: terkunci ? "FINAL" : "DRAFT",
      data: rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat LRA" });
  }
};

exports.perbandingan = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await LraSnapshot.findAll({
      where: { tahun_anggaran: tahun },
      order: [["kode_akun", "ASC"]],
    });
    res.json({
      tahun_anggaran: tahun,
      data: rows.map((r) => ({
        ...r.get({ plain: true }),
        realisasi_tahun_lalu: Number(r.realisasi_tahun_lalu),
        realisasi: Number(r.realisasi),
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.generate = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await generateLra(sequelize, db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message });
  }
};

exports.kunci = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const r = await kunciLra(db, tahun);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.crosscheck = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await crosscheckReport(sequelize, db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.export = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await sequelize.query(
      `SELECT ls.kode_akun, ls.nama_akun, kab.jenis AS kelompok,
              ls.anggaran_murni, ls.anggaran_perubahan, ls.realisasi, ls.sisa, ls.persen,
              ls.realisasi_tahun_lalu, ls.dikunci
       FROM lra_snapshot ls
       LEFT JOIN kode_akun_bas kab ON kab.kode = ls.kode_akun
       WHERE ls.tahun_anggaran = :tahun
       ORDER BY
         CASE kab.jenis
           WHEN 'PENDAPATAN' THEN 1
           WHEN 'BELANJA' THEN 2
           WHEN 'PEMBIAYAAN' THEN 3
           ELSE 9
         END,
         ls.kode_akun`,
      { replacements: { tahun }, type: QueryTypes.SELECT },
    );
    res.json({
      judul: `Laporan Realisasi Anggaran ${tahun}`,
      tahun_anggaran: tahun,
      baris: rows,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
