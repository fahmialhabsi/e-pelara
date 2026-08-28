"use strict";

const db = require("../models");
const Joi = require("joi");
const { previewPenyusutanTahunan } = require("../services/penyusutanService");

const { AsetTetap } = db;

// Sprint 21 — Candidate B (S20-DEFER-ASET-02). Inline Joi validation for
// create/update, matching the existing codebase convention used in
// dpaController.js (dpaCreateSchema) / bmdController.js (bmdSchema). Field
// set matches models/asetTetapModel.js exactly. akumulasi_penyusutan is
// deliberately NOT accepted here: it is a server-computed field, written
// only via the depreciation-posting transaction in
// services/penyusutanService.js (hitungDeltaPenyusutan / fresh.update
// inside a DB transaction) — client assignment of this field is forbidden.
// Joi.object() rejects unknown keys by default (no .unknown(true) set),
// so a client-supplied akumulasi_penyusutan (or any other unrecognized
// key) is rejected with a controlled 400, not silently ignored or
// persisted.
const KATEGORI_VALUES = [
  "TANAH",
  "PERALATAN_MESIN",
  "GEDUNG_BANGUNAN",
  "JALAN_IRIGASI_INSTALASI",
  "ASET_TETAP_LAINNYA",
  "KDP",
];
const KONDISI_VALUES = ["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"];
const STATUS_VALUES = ["AKTIF", "DIHAPUS", "DIPINDAHKAN"];

const asetTetapCreateSchema = Joi.object({
  kode_barang: Joi.string().max(30).allow(null, ""),
  nama_barang: Joi.string().max(255).required(),
  kode_akun: Joi.string().max(30).allow(null, ""),
  kategori: Joi.string().valid(...KATEGORI_VALUES).required(),
  tahun_perolehan: Joi.number().integer().allow(null),
  harga_perolehan: Joi.number().allow(null),
  umur_ekonomis: Joi.number().integer().allow(null),
  tarif_penyusutan: Joi.number().allow(null),
  kondisi: Joi.string().valid(...KONDISI_VALUES).allow(null),
  lokasi: Joi.string().allow(null, ""),
  status: Joi.string().valid(...STATUS_VALUES).allow(null),
  keterangan: Joi.string().allow(null, ""),
});

const asetTetapUpdateSchema = Joi.object({
  kode_barang: Joi.string().max(30).allow(null, ""),
  nama_barang: Joi.string().max(255),
  kode_akun: Joi.string().max(30).allow(null, ""),
  kategori: Joi.string().valid(...KATEGORI_VALUES),
  tahun_perolehan: Joi.number().integer().allow(null),
  harga_perolehan: Joi.number().allow(null),
  umur_ekonomis: Joi.number().integer().allow(null),
  tarif_penyusutan: Joi.number().allow(null),
  kondisi: Joi.string().valid(...KONDISI_VALUES).allow(null),
  lokasi: Joi.string().allow(null, ""),
  status: Joi.string().valid(...STATUS_VALUES).allow(null),
  keterangan: Joi.string().allow(null, ""),
}).min(1);

exports.list = async (req, res) => {
  try {
    const rows = await AsetTetap.findAll({
      order: [
        ["kategori", "ASC"],
        ["id", "ASC"],
      ],
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { error, value } = asetTetapCreateSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    const row = await AsetTetap.create(value);
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { error, value } = asetTetapUpdateSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({ message: error.message });
    }
    const row = await AsetTetap.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Aset tidak ditemukan" });
    await row.update(value);
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** GET /aset-tetap/penyusutan/:tahun — ringkasan preview penyusutan */
exports.penyusutanTahun = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await previewPenyusutanTahunan(db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
