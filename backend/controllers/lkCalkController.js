"use strict";

const db = require("../models");
const {
  generateSemuaKontenCalk,
  statusCalk,
  previewHtml,
} = require("../services/calkService");
const { populateDataOtomatis } = require("../services/calkDataProvider");

const { CalkTemplate, CalkKonten, sequelize } = db;

exports.listTahun = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    if (!tahun) return res.status(400).json({ message: "Tahun tidak valid" });

    const templates = await CalkTemplate.findAll({ order: [["urutan", "ASC"]] });
    const konten = await CalkKonten.findAll({ where: { tahun_anggaran: tahun } });
    const map = new Map(konten.map((k) => [k.template_id, k]));

    const bab = templates.map((t) => {
      const k = map.get(t.id);
      let statusRow = "KOSONG";
      if (k) statusRow = k.status === "FINAL" ? "FINAL" : "DRAFT";
      return {
        template_id: t.id,
        bab: t.bab,
        sub_bab: t.sub_bab,
        judul: t.judul,
        tipe: t.tipe,
        sumber_data: t.sumber_data,
        wajib: t.wajib,
        urutan: t.urutan,
        status: statusRow,
        terakhir_diedit: k?.terakhir_diedit || null,
      };
    });

    const st = await statusCalk(db, tahun);
    res.json({ tahun_anggaran: tahun, status_ringkas: st, bab });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || "Gagal memuat CALK" });
  }
};

exports.getBab = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const templateId = Number(req.params.template_id);
    const tmpl = await CalkTemplate.findByPk(templateId);
    if (!tmpl) return res.status(404).json({ message: "Template tidak ditemukan" });

    let row = await CalkKonten.findOne({
      where: { tahun_anggaran: tahun, template_id: templateId },
    });
    if (!row) {
      row = await CalkKonten.create({
        tahun_anggaran: tahun,
        template_id: templateId,
        konten: tmpl.konten_default || "",
        status: "DRAFT",
        variabel: null,
        data_otomatis: null,
      });
    }

    res.json({
      template: tmpl.get({ plain: true }),
      konten: row.get({ plain: true }),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.putBab = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const templateId = Number(req.params.template_id);
    const userId = req.user?.id || req.user?.userId || null;
    const { konten, status } = req.body || {};

    const tmpl = await CalkTemplate.findByPk(templateId);
    if (!tmpl) return res.status(404).json({ message: "Template tidak ditemukan" });

    const [row, created] = await CalkKonten.findOrCreate({
      where: { tahun_anggaran: tahun, template_id: templateId },
      defaults: {
        konten: konten != null ? konten : tmpl.konten_default || "",
        status: status === "FINAL" ? "FINAL" : "DRAFT",
        diedit_oleh: userId,
        terakhir_diedit: new Date(),
      },
    });

    if (!created && row.status === "FINAL" && status !== "FINAL") {
      return res.status(403).json({ message: "Bab sudah FINAL — ubah status ditolak" });
    }

    const patch = { terakhir_diedit: new Date(), diedit_oleh: userId };
    if (konten != null) patch.konten = konten;
    if (status === "FINAL" || status === "DRAFT") patch.status = status;

    await row.update(patch);
    res.json({ ok: true, konten: row.get({ plain: true }) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.generateAll = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await generateSemuaKontenCalk(sequelize, db, tahun);
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.status = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const st = await statusCalk(db, tahun);
    res.json({ tahun_anggaran: tahun, ...st });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const out = await previewHtml(db, tahun);
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.refreshBabData = async (req, res) => {
  try {
    const tahun = Number(req.params.tahun);
    const templateId = Number(req.params.template_id);
    const tmpl = await CalkTemplate.findByPk(templateId);
    if (!tmpl) return res.status(404).json({ message: "Template tidak ditemukan" });
    if (tmpl.tipe !== "TABEL_AUTO" && tmpl.tipe !== "CAMPURAN") {
      return res.status(400).json({ message: "Bukan bab tabel otomatis" });
    }

    const dataOtomatis = await populateDataOtomatis(
      sequelize,
      db,
      tmpl.sumber_data,
      tahun,
    );

    const [row] = await CalkKonten.findOrCreate({
      where: { tahun_anggaran: tahun, template_id: templateId },
      defaults: {
        konten: tmpl.konten_default || "",
        status: "DRAFT",
        data_otomatis: dataOtomatis,
        terakhir_diedit: new Date(),
      },
    });
    if (row.status === "FINAL") {
      return res.status(403).json({ message: "Bab FINAL — refresh ditolak" });
    }
    await row.update({ data_otomatis: dataOtomatis, terakhir_diedit: new Date() });
    res.json({ ok: true, data_otomatis: dataOtomatis });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
