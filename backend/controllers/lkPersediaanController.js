"use strict";

const db = require("../models");
const { Persediaan } = db;

function hitungNilai(body) {
  const j = Number(body.jumlah) || 0;
  const h = Number(body.harga_satuan) || 0;
  return j * h;
}

exports.listByTahun = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await Persediaan.findAll({
      where: { tahun_anggaran: tahun },
      order: [["nama_barang", "ASC"]],
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const nilai = hitungNilai(req.body);
    const row = await Persediaan.create({
      ...req.body,
      nilai,
    });
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await Persediaan.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Baris tidak ditemukan" });
    const merged = { ...row.get({ plain: true }), ...req.body };
    const nilai = hitungNilai(merged);
    await row.update({ ...req.body, nilai });
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
