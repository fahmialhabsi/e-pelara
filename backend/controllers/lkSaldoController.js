"use strict";

const db = require("../models");
const { SaldoAkun, KodeAkunBas } = db;
const { recalculateSaldoTahun, computeSaldoAkhir } = require("../services/lkSaldoService");

exports.recalculate = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid." });
    const result = await recalculateSaldoTahun(db.sequelize, db, tahun);
    res.json({
      message: `Saldo tahun ${tahun} dihitung ulang dari jurnal POSTED.`,
      ...result,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal recalculate saldo." });
  }
};

exports.byTahunBulan = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = Number(req.params.bulan);
    const rows = await SaldoAkun.findAll({
      where: { tahun_anggaran: tahun, bulan },
      order: [["kode_akun", "ASC"]],
    });
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const plain = r.toJSON();
        const akun = await KodeAkunBas.findOne({ where: { kode: r.kode_akun } });
        const nb = akun?.normal_balance || "DEBIT";
        const saldoHitung = computeSaldoAkhir(
          nb,
          plain.saldo_awal,
          plain.total_debit,
          plain.total_kredit,
        );
        return {
          ...plain,
          normal_balance: nb,
          saldo_akhir_diverifikasi: saldoHitung,
        };
      }),
    );
    res.json({ data: enriched, tahun, bulan });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat saldo." });
  }
};

exports.byTahun = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const bulan = req.query.bulan !== undefined && req.query.bulan !== "" ? Number(req.query.bulan) : null;
    const where = { tahun_anggaran: tahun };
    if (bulan !== null && !Number.isNaN(bulan)) where.bulan = bulan;
    const rows = await SaldoAkun.findAll({
      where,
      order: [
        ["bulan", "ASC"],
        ["kode_akun", "ASC"],
      ],
    });
    res.json({ data: rows, tahun });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat saldo." });
  }
};
