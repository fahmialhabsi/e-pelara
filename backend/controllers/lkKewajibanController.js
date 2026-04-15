"use strict";

const db = require("../models");
const { KewajibanJangkaPendek } = db;

exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.query.tahun_anggaran) {
      where.tahun_anggaran = Number(req.query.tahun_anggaran);
    }
    const rows = await KewajibanJangkaPendek.findAll({
      where,
      order: [["id", "DESC"]],
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const row = await KewajibanJangkaPendek.create(req.body);
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
