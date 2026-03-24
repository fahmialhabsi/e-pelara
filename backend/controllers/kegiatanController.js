// Refactor: kegiatanController.js
const {
  sequelize,
  Kegiatan,
  SubKegiatan,
  Program,
  Sasaran,
  Tujuan,
  Misi,
  OpdPenanggungJawab,
} = require("../models");
const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const {
  recalcKegiatanTotal,
  recalcProgramTotal,
} = require("../utils/paguHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { logActivity } = require("../services/auditService");

const MAX_PAGE_LIMIT = 100;

const kegiatanController = {
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 400, "Validasi gagal", errors.array());
      }

      const {
        program_id,
        nama_kegiatan,
        kode_kegiatan,
        jenis_dokumen,
        tahun,
        pagu_anggaran,
      } = req.body;

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return errorResponse(res, 400, "Periode tidak ditemukan.");
      }
      const periode_id = periode.id;

      const program = await Program.findByPk(program_id);
      if (!program) return errorResponse(res, 404, "Program tidak ditemukan.");
      if (
        program.periode_id !== periode_id ||
        String(program.tahun) !== String(tahun)
      ) {
        return errorResponse(
          res,
          400,
          "Program tidak sesuai dengan tahun dan periode.",
        );
      }

      const dupeConditions = [];
      if (kode_kegiatan?.trim()) {
        dupeConditions.push({
          kode_kegiatan: sequelize.where(
            sequelize.fn("lower", sequelize.col("kode_kegiatan")),
            kode_kegiatan.trim().toLowerCase(),
          ),
        });
      }
      if (nama_kegiatan?.trim()) {
        dupeConditions.push({
          nama_kegiatan: sequelize.where(
            sequelize.fn("lower", sequelize.col("nama_kegiatan")),
            nama_kegiatan.trim().toLowerCase(),
          ),
        });
      }

      if (dupeConditions.length > 0) {
        const exist = await Kegiatan.findOne({
          where: {
            periode_id,
            tahun,
            jenis_dokumen,
            [Op.or]: dupeConditions,
          },
        });

        if (exist) {
          return errorResponse(
            res,
            409,
            "Kode atau nama kegiatan sudah digunakan di periode ini.",
          );
        }
      }

      const kegiatan = await Kegiatan.create({
        program_id,
        kode_kegiatan,
        nama_kegiatan,
        pagu_anggaran,
        jenis_dokumen,
        tahun,
        periode_id,
        opd_penanggung_jawab: program.opd_penanggung_jawab,
        bidang_opd_penanggung_jawab: program.bidang_opd_penanggung_jawab,
      });

      await recalcKegiatanTotal(kegiatan.id);
      await recalcProgramTotal(program.id);

      logActivity(
        req,
        "CREATE",
        "Kegiatan",
        kegiatan.id,
        null,
        kegiatan.toJSON(),
      );
      return successResponse(res, 201, "Kegiatan berhasil dibuat", kegiatan);
    } catch (err) {
      console.error("Error createKegiatan:", err);
      return errorResponse(res, 500, "Gagal membuat kegiatan", err.message);
    }
  },

  async list(req, res) {
    try {
      const {
        program_id,
        tahun,
        jenis_dokumen,
        page = 1,
        limit = 20,
        search = "",
      } = req.query;
      if (!tahun || !jenis_dokumen) {
        return errorResponse(
          res,
          400,
          "Parameter 'tahun' dan 'jenis_dokumen' wajib diisi.",
        );
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }
      const periode_id = periode.id;

      const where = { periode_id, tahun, jenis_dokumen };
      if (program_id) where.program_id = program_id;
      if (search.trim()) {
        where.nama_kegiatan = { [Op.like]: `%${search.trim()}%` };
      }

      const safeLimit = Math.min(Number(limit), MAX_PAGE_LIMIT);
      const offset = (Number(page) - 1) * safeLimit;
      const count = await Kegiatan.count({ where });
      const rows = await Kegiatan.findAll({
        where,
        attributes: [
          "id",
          "kode_kegiatan",
          "nama_kegiatan",
          "pagu_anggaran",
          "total_pagu_anggaran",
          "program_id",
          "opd_penanggung_jawab",
          "bidang_opd_penanggung_jawab",
        ],
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "kode_program", "nama_program"],
            include: [
              {
                model: Sasaran,
                as: "sasaran",
                attributes: ["id", "nomor", "isi_sasaran", "tujuan_id"],
                include: [
                  {
                    model: Tujuan,
                    as: "Tujuan",
                    attributes: ["id", "no_tujuan", "isi_tujuan", "misi_id"], // tambahkan misi_id
                    include: [
                      {
                        model: Misi,
                        as: "Misi",
                        attributes: ["id", "no_misi", "isi_misi"], // tambahkan ini
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: OpdPenanggungJawab,
            as: "opd",
            attributes: ["id", "nama_opd"],
          },
        ],

        order: [["kode_kegiatan", "ASC"]],
        limit: safeLimit,
        offset,
      });

      return res.json({
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / safeLimit),
          currentPage: Number(page),
        },
      });
    } catch (err) {
      console.error("Error list kegiatan:", err);
      return errorResponse(res, 500, "Gagal mengambil kegiatan", err.message);
    }
  },

  async getById(req, res) {
    try {
      const kegiatan = await Kegiatan.findByPk(req.params.id, {
        include: [
          { model: Program, as: "program" },
          { model: SubKegiatan, as: "sub_kegiatan" },
        ],
      });
      if (!kegiatan)
        return errorResponse(res, 404, "Kegiatan tidak ditemukan.");

      let subs = kegiatan.sub_kegiatan;
      if (!subs || subs.length === 0) {
        subs = await SubKegiatan.findAll({
          where: {
            kode_sub_kegiatan: { [Op.like]: `${kegiatan.kode_kegiatan}%` },
          },
          limit: 1000,
        });
      }

      return successResponse(res, 200, "Detail kegiatan", {
        ...kegiatan.toJSON(),
        sub_kegiatan: subs,
      });
    } catch (err) {
      console.error("Error getById kegiatan:", err);
      return errorResponse(res, 500, "Gagal mengambil kegiatan", err.message);
    }
  },

  async getByProgramId(req, res) {
    try {
      const { id } = req.params;
      const program = await Program.findByPk(id);
      if (!program) return errorResponse(res, 404, "Program tidak ditemukan.");

      const kegiatanList = await Kegiatan.findAll({
        where: { program_id: id },
        order: [["kode_kegiatan", "ASC"]],
        limit: 1000,
      });

      return successResponse(res, 200, "Daftar kegiatan", kegiatanList);
    } catch (err) {
      console.error("Error getByProgramId:", err);
      return errorResponse(res, 500, "Gagal mengambil kegiatan", err.message);
    }
  },

  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return errorResponse(res, 400, "Validasi gagal", errors.array());

      const kegiatan = await Kegiatan.findByPk(req.params.id);
      if (!kegiatan)
        return errorResponse(res, 404, "Kegiatan tidak ditemukan.");

      const {
        program_id,
        kode_kegiatan,
        nama_kegiatan,
        pagu_anggaran,
        jenis_dokumen,
        tahun,
        bidang_opd_penanggung_jawab,
      } = req.body;

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return errorResponse(res, 400, "Periode tidak ditemukan.");
      }
      const periode_id = periode.id;

      const program = await Program.findByPk(program_id);
      if (!program) return errorResponse(res, 404, "Program tidak ditemukan.");
      if (
        program.periode_id !== periode_id ||
        String(program.tahun) !== String(tahun)
      ) {
        return errorResponse(
          res,
          400,
          "Program tidak sesuai dengan tahun dan periode.",
        );
      }

      const orConditions = [];
      if (kode_kegiatan?.trim()) {
        orConditions.push({
          kode_kegiatan: sequelize.where(
            sequelize.fn("lower", sequelize.col("kode_kegiatan")),
            kode_kegiatan.trim().toLowerCase(),
          ),
        });
      }
      if (nama_kegiatan?.trim()) {
        orConditions.push({
          nama_kegiatan: sequelize.where(
            sequelize.fn("lower", sequelize.col("nama_kegiatan")),
            nama_kegiatan.trim().toLowerCase(),
          ),
        });
      }

      if (orConditions.length > 0) {
        const dup = await Kegiatan.findOne({
          where: {
            periode_id,
            tahun,
            jenis_dokumen,
            id: { [Op.ne]: kegiatan.id },
            [Op.or]: orConditions,
          },
        });

        if (dup) {
          return errorResponse(
            res,
            409,
            "Kode atau nama kegiatan sudah digunakan di periode ini.",
          );
        }
      }

      await kegiatan.update({
        program_id,
        kode_kegiatan,
        nama_kegiatan,
        pagu_anggaran,
        jenis_dokumen,
        tahun,
        periode_id,
        opd_penanggung_jawab: program.opd_penanggung_jawab,
        bidang_opd_penanggung_jawab:
          bidang_opd_penanggung_jawab ||
          program.bidang_opd_penanggung_jawab ||
          kegiatan.bidang_opd_penanggung_jawab,
      });

      await recalcKegiatanTotal(kegiatan.id);
      await recalcProgramTotal(program.id);

      logActivity(
        req,
        "UPDATE",
        "Kegiatan",
        kegiatan.id,
        null,
        kegiatan.toJSON(),
      );
      return successResponse(
        res,
        200,
        "Kegiatan berhasil diperbarui",
        kegiatan,
      );
    } catch (err) {
      console.error("Error updateKegiatan:", err);
      return errorResponse(res, 500, "Gagal memperbarui kegiatan", err.message);
    }
  },

  async destroy(req, res) {
    try {
      const kegiatan = await Kegiatan.findByPk(req.params.id);
      if (!kegiatan)
        return errorResponse(res, 404, "Kegiatan tidak ditemukan.");

      const kodeKegiatan = kegiatan.kode_kegiatan;
      const kodeProgram = kodeKegiatan?.split(".").slice(0, 3).join(".");

      const oldData = kegiatan.toJSON();
      await kegiatan.destroy();

      if (kodeKegiatan) {
        await recalcKegiatanTotal(kegiatan.id);
      }
      if (kodeProgram) {
        await recalcProgramTotal(kodeProgram);
      }

      logActivity(
        req,
        "DELETE",
        "Kegiatan",
        parseInt(req.params.id),
        oldData,
        null,
      );
      return successResponse(res, 200, "Kegiatan berhasil dihapus");
    } catch (err) {
      console.error("Error deleteKegiatan:", err);
      return errorResponse(res, 500, "Gagal menghapus kegiatan", err.message);
    }
  },
};

module.exports = kegiatanController;
