"use strict";

const db = require("../models");
const { KodeAkunBas, SaldoAkun } = db;

function buildTree(rows) {
  const byKode = new Map();
  rows.forEach((r) => {
    const plain = typeof r.toJSON === "function" ? r.toJSON() : r;
    byKode.set(plain.kode, { ...plain, children: [] });
  });
  const roots = [];
  byKode.forEach((node) => {
    if (node.kode_induk && byKode.has(node.kode_induk)) {
      byKode.get(node.kode_induk).children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr) => {
    arr.sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

exports.list = async (req, res) => {
  try {
    const { jenis, level, aktif } = req.query;
    const where = {};
    if (jenis) where.jenis = jenis;
    if (level !== undefined && level !== "") where.level = Number(level);
    if (aktif !== undefined && aktif !== "") where.aktif = aktif === "true" || aktif === "1";
    const rows = await KodeAkunBas.findAll({
      where,
      order: [["kode", "ASC"]],
    });
    res.json({ data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat kode akun." });
  }
};

exports.tree = async (req, res) => {
  try {
    const rows = await KodeAkunBas.findAll({
      where: { aktif: true },
      order: [["kode", "ASC"]],
    });
    res.json({ data: buildTree(rows) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat tree BAS." });
  }
};

/** GET /api/kode-akun/detail?kode=5.2.01 — path :kode tidak aman untuk kode bertitik (Express 5). */
exports.detail = async (req, res) => {
  try {
    const kode = req.query.kode;
    if (!kode) return res.status(400).json({ message: "Query kode wajib diisi." });
    const row = await KodeAkunBas.findOne({ where: { kode } });
    if (!row) return res.status(404).json({ message: "Kode akun tidak ditemukan." });
    res.json({ data: row });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat detail." });
  }
};

/** GET /api/kode-akun/saldo?kode=&tahun= */
exports.saldoByKode = async (req, res) => {
  try {
    const { kode, tahun } = req.query;
    if (!kode || !tahun) {
      return res.status(400).json({ message: "Query kode dan tahun wajib." });
    }
    const th = Number(tahun);
    const rows = await SaldoAkun.findAll({
      where: { kode_akun: kode, tahun_anggaran: th },
      order: [["bulan", "ASC"]],
    });
    res.json({ data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat saldo." });
  }
};
