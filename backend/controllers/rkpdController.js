"use strict";

const {
  Rkpd,
  PrioritasNasional,
  PrioritasDaerah,
  PrioritasGubernur,
  sequelize,
} = require("../models");
const XLSX = require("xlsx");
const puppeteer = require("puppeteer");

const rkpdController = {
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const {
        tahun,
        periode_id,
        opd_id,
        prioritas_nasional,
        prioritas_daerah,
        prioritas_gubernur,
        visi_id,
        misi_id,
        tujuan_id,
        sasaran_id,
        strategi_id,
        arah_id,
        program_id,
        kegiatan_id,
        sub_kegiatan_id,
        indikator_tujuan,
        indikator_sasaran,
        indikator_program,
        indikator_kegiatan,
      } = req.body;

      if (
        !periode_id ||
        !opd_id ||
        !tahun ||
        !visi_id ||
        !misi_id ||
        !tujuan_id ||
        !sasaran_id
      ) {
        return res.status(400).json({ message: "Data wajib tidak lengkap." });
      }

      const rkpd = await Rkpd.create(
        {
          tahun,
          periode_id,
          opd_id,
          visi_id,
          misi_id,
          tujuan_id,
          sasaran_id,
          strategi_id,
          arah_id,
          program_id,
          kegiatan_id,
          sub_kegiatan_id,
        },
        { transaction: t }
      );

      await rkpd.setPrioritas_nasional(prioritas_nasional || [], {
        transaction: t,
      });
      await rkpd.setPrioritas_daerah(prioritas_daerah || [], {
        transaction: t,
      });
      await rkpd.setPrioritas_gubernur(prioritas_gubernur || [], {
        transaction: t,
      });

      await rkpd.createIndikator_tujuan(indikator_tujuan || [], {
        transaction: t,
      });
      await rkpd.createIndikator_sasaran(indikator_sasaran || [], {
        transaction: t,
      });
      await rkpd.createIndikator_program(indikator_program || [], {
        transaction: t,
      });
      await rkpd.createIndikator_kegiatan(indikator_kegiatan || [], {
        transaction: t,
      });

      await t.commit();
      return res.status(201).json(rkpd);
    } catch (err) {
      await t.rollback();
      console.error("Error create RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal menyimpan RKPD", error: err.message });
    }
  },

  async getAll(req, res) {
    try {
      const {
        tahun,
        periode_id,
        visi_id,
        misi_id,
        tujuan_id,
        sasaran_id,
        strategi_id,
        arah_id,
        program_id,
        kegiatan_id,
        sub_kegiatan_id,
        opd_id,
        page = 1,
        limit = 10,
        sortBy = "id",
        sortDir = "DESC",
      } = req.query;

      const where = {};
      if (tahun) where.tahun = tahun;
      if (periode_id) where.periode_id = periode_id;
      if (visi_id) where.visi_id = visi_id;
      if (misi_id) where.misi_id = misi_id;
      if (tujuan_id) where.tujuan_id = tujuan_id;
      if (sasaran_id) where.sasaran_id = sasaran_id;
      if (strategi_id) where.strategi_id = strategi_id;
      if (arah_id) where.arah_id = arah_id;
      if (program_id) where.program_id = program_id;
      if (kegiatan_id) where.kegiatan_id = kegiatan_id;
      if (sub_kegiatan_id) where.sub_kegiatan_id = sub_kegiatan_id;
      if (opd_id) where.opd_id = opd_id;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows } = await Rkpd.findAndCountAll({
        where,
        attributes: [
          "id",
          "tahun",
          "periode_id",
          "opd_id",
          "program_id",
          "kegiatan_id",
          "sasaran_id",
          "tujuan_id",
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortDir.toUpperCase()]],
      });

      return res.json({ data: rows, total: count });
    } catch (err) {
      console.error("Error getAll RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal mengambil RKPD", error: err.message });
    }
  },

  async exportExcel(req, res) {
    try {
      const { tahun, periode_id } = req.query;
      const data = await Rkpd.findAll({ where: { tahun, periode_id } });

      const exportData = data.map((item) => ({
        ID: item.id,
        Tahun: item.tahun,
        Periode: item.periode_id,
        Program: item.program_id,
        Kegiatan: item.kegiatan_id,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RKPD");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=rkpd.xlsx");
      res.type(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(buffer);
    } catch (err) {
      console.error("Error exportExcel RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal ekspor Excel", error: err.message });
    }
  },

  async exportPdf(req, res) {
    try {
      const { tahun, periode_id } = req.query;
      const data = await Rkpd.findAll({ where: { tahun, periode_id } });

      let html = `
        <html><body>
        <h2>DAFTAR RKPD ${tahun}</h2>
        <table border="1" cellspacing="0" cellpadding="4">
          <thead>
            <tr><th>ID</th><th>Tahun</th><th>Program</th><th>Kegiatan</th></tr>
          </thead>
          <tbody>
      `;
      data.forEach((item) => {
        html += `<tr><td>${item.id}</td><td>${item.tahun}</td><td>${item.program_id}</td><td>${item.kegiatan_id}</td></tr>`;
      });
      html += `</tbody></table></body></html>`;

      const browser = await puppeteer.launch({ headless: "new" });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({ format: "A4" });
      await browser.close();

      res.setHeader("Content-Disposition", "attachment; filename=rkpd.pdf");
      res.contentType("application/pdf");
      return res.send(pdf);
    } catch (err) {
      console.error("Error exportPdf RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal ekspor PDF", error: err.message });
    }
  },

  async getPerubahanSkema(req, res) {
    try {
      const { tahun, periode_id } = req.query;
      const sebelum = await Rkpd.findAll({
        where: { tahun, periode_id, jenis_dokumen: "rpjmd" },
      });
      const sesudah = await Rkpd.findAll({
        where: { tahun, periode_id, jenis_dokumen: "perubahan" },
      });
      return res.json({ sebelum, sesudah });
    } catch (err) {
      console.error("Error getPerubahanSkema RKPD:", err);
      return res.status(500).json({
        message: "Gagal mengambil data perubahan",
        error: err.message,
      });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await Rkpd.findByPk(id, {
        include: [
          "Prioritas_nasional",
          "Prioritas_daerah",
          "Prioritas_gubernur",
          "Indikator_tujuan",
          "Indikator_sasaran",
          "Indikator_program",
          "Indikator_kegiatan",
        ],
      });
      if (!data)
        return res.status(404).json({ message: "RKPD tidak ditemukan" });
      return res.json(data);
    } catch (err) {
      console.error("Error getById RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal mengambil RKPD", error: err.message });
    }
  },

  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const data = await Rkpd.findByPk(id);
      if (!data)
        return res.status(404).json({ message: "RKPD tidak ditemukan" });

      await data.update(req.body, { transaction: t });
      await t.commit();
      return res.json(data);
    } catch (err) {
      await t.rollback();
      console.error("Error update RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal memperbarui RKPD", error: err.message });
    }
  },

  async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const data = await Rkpd.findByPk(id);
      if (!data)
        return res.status(404).json({ message: "RKPD tidak ditemukan" });

      await data.destroy({ transaction: t });
      await t.commit();
      return res.json({ message: "RKPD berhasil dihapus" });
    } catch (err) {
      await t.rollback();
      console.error("Error delete RKPD:", err);
      return res
        .status(500)
        .json({ message: "Gagal menghapus RKPD", error: err.message });
    }
  },
};

module.exports = rkpdController;
