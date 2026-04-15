"use strict";
const { Tujuan, Misi, Sasaran, sequelize } = require("../models");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { Op } = require("sequelize");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { listResponse } = require("../utils/responseHelper");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");

// === Utility ===

const validateDokumenTahun = (jenis_dokumen, tahun, res) => {
  if (!jenis_dokumen || !tahun) {
    res.status(400).json({ message: "jenis_dokumen dan tahun wajib diisi." });
    return false;
  }
  return true;
};

const getPeriodeIdWithValidation = async (tahun, res) => {
  const periode = await getPeriodeFromTahun(tahun);
  if (!periode) {
    res
      .status(400)
      .json({ message: `Periode tidak ditemukan untuk tahun ${tahun}.` });
    return null;
  }
  return periode.id;
};

const getTujuansWithMisi = async (periode_id, jenis_dokumen, tahun) => {
  return Tujuan.findAll({
    where: { periode_id, jenis_dokumen, tahun },
    include: [
      { model: Misi, as: "Misi", attributes: ["id", "no_misi", "isi_misi"] },
    ],
    order: [
      [{ model: Misi, as: "Misi" }, "no_misi", "ASC"],
      ["no_tujuan", "ASC"],
    ],
  });
};

const parseId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const fetchTujuanList = async ({ where, limit, offset }) => {
  const totalItems = await Tujuan.count({ where });
  const rows = await Tujuan.findAll({
    where,
    include: [
      {
        model: Misi,
        as: "Misi",
        attributes: ["id", "no_misi", "isi_misi"],
      },
    ],
    order: [
      [{ model: Misi, as: "Misi" }, "no_misi", "ASC"],
      ["no_tujuan", "ASC"],
    ],
    limit,
    offset,
  });

  return { rows, totalItems };
};

const resolveMisiIdsForDokumen = async ({
  misiId,
  jenisDokumen,
  tahun,
  periodeId,
}) => {
  const parsedMisiId = parseId(misiId);
  if (!parsedMisiId) return [];

  const sourceMisi = await Misi.findByPk(parsedMisiId, {
    attributes: [
      "id",
      "no_misi",
      "isi_misi",
      "jenis_dokumen",
      "tahun",
      "periode_id",
    ],
  });

  if (!sourceMisi) {
    return [parsedMisiId];
  }

  const isSameScope =
    String(sourceMisi.jenis_dokumen || "").toLowerCase() ===
      String(jenisDokumen || "").toLowerCase() &&
    String(sourceMisi.tahun || "") === String(tahun) &&
    Number(sourceMisi.periode_id || 0) === Number(periodeId || 0);

  if (isSameScope) {
    return [sourceMisi.id];
  }

  const usePeriodeFilter = String(jenisDokumen || "").toLowerCase() !== "rpjmd";
  const byNoMisi = await Misi.findAll({
    where: {
      no_misi: sourceMisi.no_misi,
      jenis_dokumen: jenisDokumen,
      tahun: String(tahun),
      ...(usePeriodeFilter ? { periode_id: periodeId } : {}),
    },
    attributes: ["id"],
    order: [["id", "ASC"]],
  });

  if (byNoMisi.length) {
    return byNoMisi.map((item) => item.id);
  }

  const isiMisi = String(sourceMisi.isi_misi || "").trim();
  if (isiMisi) {
    const byIsiMisi = await Misi.findAll({
      where: {
        isi_misi: isiMisi,
        jenis_dokumen: jenisDokumen,
        tahun: String(tahun),
        ...(usePeriodeFilter ? { periode_id: periodeId } : {}),
      },
      attributes: ["id"],
      order: [["id", "ASC"]],
    });

    if (byIsiMisi.length) {
      return byIsiMisi.map((item) => item.id);
    }
  }

  return [sourceMisi.id];
};

const applyMisiFilter = (where, misiIds = []) => {
  if (!Array.isArray(misiIds) || !misiIds.length) return;
  where.misi_id = misiIds.length === 1 ? misiIds[0] : { [Op.in]: misiIds };
};

// === Controller ===

const tujuanController = {
  async getAll(req, res) {
    try {
      const { misi_id, jenis_dokumen, tahun, limit, offset } = req.query;

      if (!jenis_dokumen || !tahun) {
        return res
          .status(400)
          .json({ message: "jenis_dokumen dan tahun wajib diisi." });
      }

      const parsedTahun = parseInt(tahun, 10);
      const parsedLimit = parseInt(limit, 10) || 100;
      const parsedOffset = parseInt(offset, 10) || 0;

      if (isNaN(parsedTahun)) {
        return res.status(400).json({ message: "Tahun tidak valid." });
      }

      await ensureClonedOnce(jenis_dokumen, parsedTahun);

      const periode = await getPeriodeFromTahun(parsedTahun);
      if (!periode) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }

      const periode_id = periode.id;

      const normalizedDokumen = String(jenis_dokumen).toLowerCase();
      const where = {
        jenis_dokumen: normalizedDokumen,
        tahun: String(tahun),
        ...(normalizedDokumen === "rpjmd" ? {} : { periode_id }),
      };

      const hasMisiFilter =
        misi_id !== undefined && misi_id !== null && String(misi_id).trim() !== "";
      if (hasMisiFilter) {
        const misiIds = await resolveMisiIdsForDokumen({
          misiId: misi_id,
          jenisDokumen: jenis_dokumen,
          tahun: String(tahun),
          periodeId: periode_id,
        });
        applyMisiFilter(where, misiIds);
      }

      console.log("🔍 Params getAll Tujuan:", {
        jenis_dokumen,
        tahun,
        misi_id,
      });
      console.log("🔍 Where clause:", where);

      let resolvedDokumen = normalizedDokumen;
      let { rows: tujuans, totalItems } = await fetchTujuanList({
        where,
        limit: parsedLimit,
        offset: parsedOffset,
      });

      if (!tujuans.length && hasMisiFilter && resolvedDokumen !== "rpjmd") {
        const fallbackWhere = {
          jenis_dokumen: "rpjmd",
          tahun: String(tahun),
        };

        const fallbackMisiIds = await resolveMisiIdsForDokumen({
          misiId: misi_id,
          jenisDokumen: "rpjmd",
          tahun: String(tahun),
          periodeId: periode_id,
        });
        applyMisiFilter(fallbackWhere, fallbackMisiIds);

        const fallbackResult = await fetchTujuanList({
          where: fallbackWhere,
          limit: parsedLimit,
          offset: parsedOffset,
        });

        if (fallbackResult.rows.length) {
          tujuans = fallbackResult.rows;
          totalItems = fallbackResult.totalItems;
          resolvedDokumen = "rpjmd";
        }
      }

      console.log("✅ Tujuan count:", tujuans.length);

      return listResponse(res, 200, "Daftar tujuan berhasil diambil", tujuans, {
        totalItems,
        limit: parsedLimit,
        offset: parsedOffset,
        resolvedDokumen,
      });
    } catch (err) {
      console.error("❌ Error getAll Tujuan:", err);
      return res.status(500).json({ message: err.message });
    }
  },

  async getByMisi(req, res) {
    try {
      const { misi_id } = req.params;
      const { tahun, jenis_dokumen, limit, offset } = req.query;

      if (!misi_id || !tahun || !jenis_dokumen) {
        return res
          .status(400)
          .json({ message: "Parameter wajib: misi_id, tahun, jenis_dokumen." });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode_id = await getPeriodeIdWithValidation(tahun, res);
      if (!periode_id) return;

      const pageSize = Math.min(parseInt(limit) || 100, 500);
      const pageOffset = parseInt(offset) || 0;

      const totalItems = await Tujuan.count({
        where: { misi_id, periode_id, jenis_dokumen, tahun },
      });
      const tujuans = await Tujuan.findAll({
        where: { misi_id, periode_id, jenis_dokumen, tahun },
        order: [["no_tujuan", "ASC"]],
        limit: pageSize,
        offset: pageOffset,
      });

      return listResponse(
        res,
        200,
        "Daftar tujuan berdasarkan misi berhasil diambil",
        tujuans,
        {
          totalItems,
          limit: pageSize,
          offset: pageOffset,
        }
      );
    } catch (err) {
      console.error("Error getByMisi Tujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal mengambil Tujuan", error: err.message });
    }
  },

  async exportTujuan(req, res) {
    try {
      const { jenis_dokumen, tahun } = req.query;
      if (!validateDokumenTahun(jenis_dokumen, tahun, res)) return;

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode_id = await getPeriodeIdWithValidation(tahun, res);
      if (!periode_id) return;

      const tujuans = await Tujuan.findAll({
        where: { periode_id, jenis_dokumen, tahun },
        include: [{ model: Misi, as: "Misi" }],
        order: [["no_tujuan", "ASC"]],
      });

      if (tujuans.length > 1000) {
        return res.status(400).json({
          message:
            "Jumlah data terlalu banyak untuk diekspor. Gunakan filter atau ekspor sebagian.",
        });
      }

      const data = [];

      data.push({
        Kode: "",
        "Uraian Misi & Tujuan": `DAFTAR TUJUAN RPJMD TAHUN ${tahun}`,
      });
      data.push({});
      data.push({
        Kode: "",
        "Uraian Misi & Tujuan": `Dibuat oleh: Badan Perencanaan Dan Pembangunan Daerah`,
      });
      data.push({});
      data.push({
        Kode: "Kode",
        "Uraian Misi & Tujuan": "Uraian Misi & Tujuan",
      });

      const misiSudah = new Set();
      for (const item of tujuans) {
        const { Misi: misi, no_tujuan, isi_tujuan } = item;
        if (!misiSudah.has(misi.id)) {
          data.push({
            Kode: misi.no_misi,
            "Uraian Misi & Tujuan": misi.isi_misi.toUpperCase(),
          });
          misiSudah.add(misi.id);
        }
        data.push({
          Kode: no_tujuan,
          "Uraian Misi & Tujuan": isi_tujuan.trim(),
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Tujuan ${tahun}`);

      const filename = `tujuan_rpjmd_${tahun}.xlsx`;
      const filepath = path.join(__dirname, "..", "exports", filename);
      XLSX.writeFile(workbook, filepath);

      res.download(filepath, filename);
    } catch (err) {
      console.error("Error exportTujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal ekspor Tujuan", error: err.message });
    }
  },

  async exportTujuanPdf(req, res) {
    try {
      const { jenis_dokumen, tahun } = req.query;
      if (!validateDokumenTahun(jenis_dokumen, tahun, res)) return;

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode_id = await getPeriodeIdWithValidation(tahun, res);
      if (!periode_id) return;

      const tujuans = await getTujuansWithMisi(
        periode_id,
        jenis_dokumen,
        tahun
      );

      let html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; font-size: 12px; }
              h2 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 5px; vertical-align: top; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h2>DAFTAR TUJUAN RPJMD TAHUN ${tahun}</h2>
            <table>
              <thead>
                <tr>
                  <th style="width:10%;">Kode</th>
                  <th>Uraian Misi & Tujuan</th>
                </tr>
              </thead>
              <tbody>
      `;

      const misiSudah = new Set();
      for (const { Misi: misi, no_tujuan, isi_tujuan } of tujuans) {
        if (!misiSudah.has(misi.id)) {
          html += `<tr><td>${
            misi.no_misi
          }</td><td>${misi.isi_misi.toUpperCase()}</td></tr>`;
          misiSudah.add(misi.id);
        }
        html += `<tr><td>${no_tujuan}</td><td>${isi_tujuan}</td></tr>`;
      }

      html += `
              </tbody>
            </table>
            <p style="margin-top:30px;text-align:center;">Dibuat oleh: Badan Perencanaan Dan Pembangunan Daerah</p>
          </body>
        </html>
      `;

      const browser = await puppeteer.launch({ headless: "new" });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
      await browser.close();

      const filename = `tujuan_rpjmd_${tahun}.pdf`;
      const filepath = path.join(__dirname, "..", "exports", filename);
      fs.writeFileSync(filepath, pdfBuffer);

      res.download(filepath, filename);
    } catch (err) {
      console.error("Error exportTujuanPdf:", err);
      res.status(500).json({ message: "Gagal ekspor PDF", error: err.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const tujuan = await Tujuan.findByPk(id, {
        include: [{ model: Misi, as: "Misi" }],
      });

      if (!tujuan) {
        return res.status(404).json({ message: "Tujuan tidak ditemukan." });
      }

      res.json(tujuan);
    } catch (err) {
      console.error("Error getById Tujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal mengambil data Tujuan", error: err.message });
    }
  },

  async getByPeriode(req, res) {
    try {
      const { periode_id } = req.params;
      const { jenis_dokumen, tahun } = req.query;

      if (!periode_id || !jenis_dokumen || !tahun) {
        return res.status(400).json({
          message: "periode_id, jenis_dokumen, dan tahun wajib diisi.",
        });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);

      const tujuans = await Tujuan.findAll({
        where: { periode_id, jenis_dokumen, tahun },
        include: [{ model: Misi, as: "Misi" }],
        order: [["no_tujuan", "ASC"]],
      });

      return listResponse(
        res,
        200,
        "Daftar tujuan berdasarkan periode berhasil diambil",
        tujuans
      );
    } catch (err) {
      console.error("Error getByPeriode Tujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal mengambil data Tujuan", error: err.message });
    }
  },

  async getNextNo(req, res) {
    try {
      const { misi_id, jenis_dokumen, tahun } = req.query;
      if (!misi_id || !jenis_dokumen || !tahun) {
        return res
          .status(400)
          .json({ message: "misi_id, jenis_dokumen, dan tahun wajib diisi." });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode_id = await getPeriodeIdWithValidation(tahun, res);
      if (!periode_id) return;

      const misi = await Misi.findByPk(misi_id);
      if (!misi) {
        return res.status(404).json({ message: "Misi tidak ditemukan." });
      }

      const lastTujuan = await Tujuan.findOne({
        where: { misi_id, jenis_dokumen, tahun, periode_id },
        order: [["no_tujuan", "DESC"]],
      });

      let nextIndex = 1;
      if (lastTujuan && typeof lastTujuan.no_tujuan === "string") {
        const match = lastTujuan.no_tujuan.match(/T\d+-(\d+)/);
        if (match && match[1]) {
          nextIndex = parseInt(match[1], 10) + 1;
        }
      }

      const formattedNo = `T${misi.no_misi}-${String(nextIndex).padStart(
        2,
        "0"
      )}`;

      console.log(`[getNextNo] Misi ${misi_id}, hasil: ${formattedNo}`);

      res.json({ no_tujuan: formattedNo });
    } catch (err) {
      console.error("Error getNextNo Tujuan:", err);
      res.status(500).json({
        message: "Gagal mendapatkan nomor berikutnya",
        error: err.message,
      });
    }
  },

  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { rpjmd_id, misi_id, no_tujuan, isi_tujuan, jenis_dokumen, tahun } =
        req.body;

      if (
        !rpjmd_id ||
        !misi_id ||
        !no_tujuan ||
        !isi_tujuan ||
        !jenis_dokumen ||
        !tahun
      ) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode_id = await getPeriodeIdWithValidation(tahun, res);
      if (!periode_id) return;

      // Validasi data unik
      const existing = await Tujuan.findOne({
        where: {
          misi_id,
          no_tujuan,
          jenis_dokumen,
          tahun,
          periode_id,
        },
      });

      if (existing) {
        return res.status(409).json({
          message: `Tujuan dengan kombinasi yang sama sudah ada.`,
        });
      }

      const newTujuan = await Tujuan.create(
        {
          rpjmd_id,
          misi_id,
          no_tujuan,
          isi_tujuan,
          jenis_dokumen,
          tahun,
          periode_id,
        },
        { transaction: t }
      );

      await t.commit();
      res.status(201).json({
        message: "Tujuan berhasil ditambahkan.",
        data: newTujuan,
        no_tujuan: newTujuan.no_tujuan,
      });
    } catch (err) {
      await t.rollback();
      console.error("Error create Tujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal menambahkan Tujuan", error: err.message });
    }
  },

  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { misi_id, no_tujuan, isi_tujuan } = req.body;

      const tujuan = await Tujuan.findByPk(id);
      if (!tujuan) {
        return res.status(404).json({ message: "Tujuan tidak ditemukan." });
      }

      // Validasi data unik selain ID ini
      const duplicate = await Tujuan.findOne({
        where: {
          misi_id,
          no_tujuan,
          jenis_dokumen: tujuan.jenis_dokumen,
          tahun: tujuan.tahun,
          periode_id: tujuan.periode_id,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        return res.status(409).json({
          message: `Tujuan dengan kombinasi yang sama sudah ada.`,
        });
      }

      await tujuan.update(
        { misi_id, no_tujuan, isi_tujuan },
        { transaction: t }
      );

      await t.commit();
      res.json({ message: "Tujuan berhasil diperbarui.", data: tujuan });
    } catch (err) {
      await t.rollback();
      console.error("Error update Tujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal memperbarui Tujuan", error: err.message });
    }
  },

  async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;

      const tujuan = await Tujuan.findByPk(id);
      if (!tujuan) {
        return res.status(404).json({ message: "Tujuan tidak ditemukan." });
      }

      const relatedSasaran = await Sasaran.findOne({
        where: { tujuan_id: id },
      });
      if (relatedSasaran) {
        return res.status(400).json({
          message: "Tidak bisa menghapus Tujuan yang memiliki Sasaran.",
        });
      }

      await tujuan.destroy({ transaction: t });
      await t.commit();
      res.json({ message: "Tujuan berhasil dihapus." });
    } catch (err) {
      await t.rollback();
      console.error("Error delete Tujuan:", err);
      res
        .status(500)
        .json({ message: "Gagal menghapus Tujuan", error: err.message });
    }
  },
};

module.exports = tujuanController;
