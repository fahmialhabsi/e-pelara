// controllers/subKegiatanController.js
const {
  SubKegiatan,
  Kegiatan,
  Program,
  Sasaran,
  Tujuan,
  OpdPenanggungJawab,
  PeriodeRpjmd,
} = require("../models");

const { Op } = require("sequelize");
const { validationResult } = require("express-validator");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  recalcKegiatanTotal,
  recalcProgramTotal,
} = require("../utils/paguHelper");

const MAX_LIMIT = 100;

const subKegiatanController = {
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return errorResponse(res, 400, "Validasi gagal", errors.array());

      const {
        kegiatan_id,
        kode_sub_kegiatan,
        nama_sub_kegiatan,
        pagu_anggaran,
        nama_opd,
        nama_bidang_opd,
        sub_bidang_opd,
        jenis_dokumen,
        tahun,
      } = req.body;

      if (jenis_dokumen && tahun) {
        await ensureClonedOnce(jenis_dokumen, tahun);
      }

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode)
        return errorResponse(
          res,
          400,
          `Periode tidak ditemukan untuk tahun ${tahun}.`
        );

      const periode_id = periode.id;

      console.log("🧪 Validasi duplikat:", {
        kode_sub_kegiatan: kode_sub_kegiatan.trim(),
        nama_sub_kegiatan: nama_sub_kegiatan.trim(),
        periode_id,
      });

      const kegiatan = await Kegiatan.findByPk(kegiatan_id, {
        include: { model: Program, as: "program" },
      });
      if (!kegiatan)
        return errorResponse(res, 404, "Kegiatan tidak ditemukan.");
      if (kegiatan.periode_id !== periode_id)
        return errorResponse(res, 400, "Periode kegiatan tidak sesuai.");

      const existing = await SubKegiatan.findOne({
        where: {
          periode_id,
          [Op.or]: [
            { kode_sub_kegiatan: kode_sub_kegiatan.trim() },
            { nama_sub_kegiatan: nama_sub_kegiatan.trim() },
          ],
        },
      });
      if (existing)
        return errorResponse(
          res,
          409,
          "Kode atau nama sub-kegiatan sudah digunakan."
        );

      const created = await SubKegiatan.create({
        kegiatan_id,
        periode_id,
        kode_sub_kegiatan: kode_sub_kegiatan.trim(),
        nama_sub_kegiatan: nama_sub_kegiatan.trim(),
        pagu_anggaran:
          typeof pagu_anggaran === "string"
            ? parseInt(pagu_anggaran.trim())
            : pagu_anggaran,
        nama_opd: nama_opd.trim(),
        nama_bidang_opd: nama_bidang_opd.trim(),
        sub_bidang_opd: sub_bidang_opd.trim(),
        jenis_dokumen,
        tahun,
      });

      await recalcKegiatanTotal(kegiatan.id);
      await recalcProgramTotal(kegiatan.program.id);

      return successResponse(res, 201, "Sub-kegiatan berhasil dibuat", created);
    } catch (err) {
      return errorResponse(res, 500, "Gagal membuat sub-kegiatan", err);
    }
  },

  async list(req, res) {
    try {
      const {
        kegiatan_id,
        tahun,
        jenis_dokumen,
        page = 1,
        limit = 50,
      } = req.query;
      if (!tahun || !jenis_dokumen) {
        return errorResponse(
          res,
          400,
          "Parameter 'tahun' dan 'jenis_dokumen' wajib diisi."
        );
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }
      const periode_id = periode.id;

      const safeLimit = Math.min(Number(limit), MAX_LIMIT);
      const offset = (Number(page) - 1) * safeLimit;
      const where = { tahun, jenis_dokumen, periode_id };
      if (kegiatan_id) where.kegiatan_id = kegiatan_id;

      const { rows, count } = await SubKegiatan.findAndCountAll({
        where,
        attributes: [
          "id",
          "kode_sub_kegiatan",
          "nama_sub_kegiatan",
          "pagu_anggaran",
          "nama_opd",
          "nama_bidang_opd",
          "sub_bidang_opd",
        ],
        include: [
          {
            model: Kegiatan,
            as: "kegiatan",
            attributes: [
              "id",
              "kode_kegiatan",
              "nama_kegiatan",
              "total_pagu_anggaran",
              "opd_penanggung_jawab",
              "bidang_opd_penanggung_jawab",
            ],
            include: [
              {
                model: Program,
                as: "program",
                attributes: [
                  "id",
                  "kode_program",
                  "nama_program",
                  "total_pagu_anggaran",
                  "opd_penanggung_jawab",
                  "bidang_opd_penanggung_jawab",
                ],
                include: [
                  {
                    model: Sasaran,
                    as: "sasaran",
                    attributes: ["id", "nomor", "isi_sasaran", "tujuan_id"],
                    include: [
                      {
                        model: Tujuan,
                        as: "Tujuan",
                        attributes: ["id", "no_tujuan", "isi_tujuan"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        order: [["kode_sub_kegiatan", "ASC"]],
        limit: safeLimit,
        offset,
      });

      return successResponse(res, 200, "Daftar SubKegiatan ditemukan", {
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / safeLimit),
          currentPage: Number(page),
        },
      });
    } catch (err) {
      console.error("Error list SubKegiatan:", err);
      return errorResponse(
        res,
        500,
        "Gagal mengambil sub-kegiatan",
        err.message
      );
    }
  },

  async getById(req, res) {
    try {
      const sub = await SubKegiatan.findByPk(req.params.id, {
        include: {
          model: Kegiatan,
          as: "kegiatan",
          include: {
            model: Program,
            as: "program",
            include: {
              model: OpdPenanggungJawab,
              as: "opd",
            },
          },
        },
      });

      if (!sub) return errorResponse(res, 404, "Sub-kegiatan tidak ditemukan");

      return successResponse(res, 200, "Detail sub-kegiatan ditemukan", sub);
    } catch (err) {
      return errorResponse(
        res,
        500,
        "Gagal mengambil detail sub-kegiatan",
        err
      );
    }
  },

  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return errorResponse(res, 400, "Validasi gagal", errors.array());

      const sub = await SubKegiatan.findByPk(req.params.id, {
        include: {
          model: Kegiatan,
          as: "kegiatan",
          include: { model: Program, as: "program" },
        },
      });
      if (!sub) return errorResponse(res, 404, "Sub-kegiatan tidak ditemukan");

      const {
        kegiatan_id,
        kode_sub_kegiatan,
        nama_sub_kegiatan,
        pagu_anggaran,
        nama_opd,
        nama_bidang_opd,
        sub_bidang_opd,
        jenis_dokumen,
        tahun,
      } = req.body;

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) return errorResponse(res, 400, "Periode tidak ditemukan");
      const periode_id = periode.id;

      const kegiatan = await Kegiatan.findByPk(kegiatan_id, {
        include: { model: Program, as: "program" },
      });
      if (!kegiatan) return errorResponse(res, 404, "Kegiatan tidak ditemukan");
      if (kegiatan.periode_id !== periode_id)
        return errorResponse(res, 400, "Periode kegiatan tidak sesuai.");

      const dup = await SubKegiatan.findOne({
        where: {
          periode_id,
          [Op.or]: [
            { kode_sub_kegiatan: kode_sub_kegiatan.trim() },
            { nama_sub_kegiatan: nama_sub_kegiatan.trim() },
          ],
          id: { [Op.ne]: sub.id },
        },
      });
      if (dup)
        return errorResponse(
          res,
          409,
          "Kode atau nama sub-kegiatan sudah digunakan."
        );

      await sub.update({
        kegiatan_id,
        periode_id,
        kode_sub_kegiatan: kode_sub_kegiatan.trim(),
        nama_sub_kegiatan: nama_sub_kegiatan.trim(),
        pagu_anggaran:
          typeof pagu_anggaran === "string"
            ? parseInt(pagu_anggaran.trim())
            : pagu_anggaran,
        nama_opd: nama_opd.trim(),
        nama_bidang_opd: nama_bidang_opd.trim(),
        sub_bidang_opd: sub_bidang_opd.trim(),
        jenis_dokumen,
        tahun,
      });

      await ensureClonedOnce(jenis_dokumen, tahun);

      await recalcKegiatanTotal(kegiatan.id);
      await recalcProgramTotal(kegiatan.program.id);

      return successResponse(res, 200, "Sub-kegiatan berhasil diperbarui", sub);
    } catch (err) {
      return errorResponse(res, 500, "Gagal memperbarui sub-kegiatan", err);
    }
  },

  async delete(req, res) {
    try {
      const sub = await SubKegiatan.findByPk(req.params.id, {
        include: {
          model: Kegiatan,
          as: "kegiatan",
          include: { model: Program, as: "program" },
        },
      });
      if (!sub) return errorResponse(res, 404, "Sub-kegiatan tidak ditemukan");

      await sub.destroy();

      await recalcKegiatanTotal(sub.kegiatan.id);
      await recalcProgramTotal(sub.kegiatan.program.id);

      return successResponse(res, 200, "Sub-kegiatan berhasil dihapus");
    } catch (err) {
      return errorResponse(res, 500, "Gagal menghapus sub-kegiatan", err);
    }
  },
};

module.exports = subKegiatanController;
