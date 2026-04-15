"use strict";

const path = require("path");
const fs = require("fs");
const db = require("../models");
const { sequelize, LkPdfRiwayat } = db;
const {
  buildHtmlForTahun,
  generateLkPdfSimpan,
  STORAGE_DIR,
} = require("../services/lkPdfService");
const { validasiSebelumGenerate } = require("../services/lkPdfValidationService");
const { finalisasiSemuaLk } = require("../services/lkFinalisasiService");

exports.validasi = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });
    const out = await validasiSebelumGenerate(sequelize, db, tahun);
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Validasi gagal" });
  }
};

exports.generatePdf = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });
    const out = await generateLkPdfSimpan(sequelize, db, tahun, req.user, {
      variabelOverride: req.body?.variabel || {},
    });
    res.json({
      ok: true,
      filename: out.filename,
      size: out.size,
      id: out.id,
      riwayat: out.riwayat,
    });
  } catch (e) {
    const code = e.statusCode || 500;
    if (code === 400 && e.validation) {
      return res.status(400).json({
        message: e.message,
        validation: e.validation,
      });
    }
    console.error(e);
    res.status(code).json({ message: e.message || "Generate PDF gagal" });
  }
};

exports.downloadPdf = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const id = req.query.id ? Number(req.query.id) : null;
    const latest = req.query.latest === "1" || req.query.latest === "true";

    let row = null;
    if (id) {
      row = await LkPdfRiwayat.findByPk(id);
    } else if (latest) {
      row = await LkPdfRiwayat.findOne({
        where: { tahun_anggaran: tahun },
        order: [["created_at", "DESC"]],
      });
    }
    if (!row || row.tahun_anggaran !== tahun) {
      return res.status(404).json({ message: "File PDF tidak ditemukan" });
    }

    const safeName = path.basename(row.filename || "");
    if (!/^LK-\d+-\d+\.pdf$/.test(safeName)) {
      return res.status(400).json({ message: "Nama file tidak valid" });
    }
    const full = path.join(STORAGE_DIR, safeName);
    if (!fs.existsSync(full)) {
      return res.status(404).json({ message: "Berkas hilang di server" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    return res.sendFile(path.resolve(full));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
};

exports.riwayat = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const rows = await LkPdfRiwayat.findAll({
      where: { tahun_anggaran: tahun },
      order: [["created_at", "DESC"]],
      limit: 50,
    });
    res.json({
      tahun_anggaran: tahun,
      data: rows.map((r) => r.get({ plain: true })),
    });
  } catch (e) {
    if (e.message && e.message.includes("doesn't exist")) {
      return res.status(503).json({
        message: "Tabel lk_pdf_riwayat belum dimigrasi — jalankan migrasi terlebih dahulu",
      });
    }
    res.status(500).json({ message: e.message });
  }
};

exports.finalisasi = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });
    const v = await validasiSebelumGenerate(sequelize, db, tahun);
    if (!v.valid) {
      return res.status(400).json({
        message: "Finalisasi ditolak — validasi belum lolos",
        validation: v,
      });
    }
    const out = await finalisasiSemuaLk(db, tahun);
    res.json({ ok: true, kunci: out });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.previewHtml = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });
    const html = await buildHtmlForTahun(sequelize, db, tahun, {
      variabelOverride: req.query,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send(`<pre>${e.message}</pre>`);
  }
};
