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
const {
  successResponse,
  errorResponse,
  listResponse,
  structuredErrorResponse,
} = require("../utils/responseHelper");
const {
  getEffectiveOperationalModeForSubKegiatan,
} = require("../services/appPolicyService");
const {
  prepareSubKegiatanMasterWrite,
  isMasterPayload,
} = require("../helpers/subKegiatanMasterWrite");
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

      const modeEffective =
        req.operationalMode ??
        (await getEffectiveOperationalModeForSubKegiatan());
      const prep = await prepareSubKegiatanMasterWrite({
        body: req.body,
        existing: null,
        operationalMode: modeEffective,
      });
      if (!prep.ok) {
        return structuredErrorResponse(res, prep.status || 400, {
          code: prep.code || "ENFORCEMENT_ERROR",
          message: prep.message || "Validasi master / mode operasional gagal",
          field: null,
          details: prep.details,
        });
      }

      console.log("[ENFORCEMENT]", {
        mode: modeEffective,
        entity: "sub_kegiatan",
        action: "create",
        isMasterPayload: isMasterPayload(req.body),
      });

      const masterFields =
        prep.input_mode === "MASTER"
          ? {
              master_sub_kegiatan_id: prep.merged.master_sub_kegiatan_id,
              regulasi_versi_id: prep.merged.regulasi_versi_id,
              input_mode: "MASTER",
            }
          : { input_mode: "LEGACY" };

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
        ...masterFields,
      });

      await recalcKegiatanTotal(kegiatan.id);
      await recalcProgramTotal(kegiatan.program.id);

      const meta =
        prep.transitionWarning != null
          ? { enforcementWarning: prep.transitionWarning }
          : undefined;
      return successResponse(
        res,
        201,
        "Sub-kegiatan berhasil dibuat",
        created,
        meta,
      );
    } catch (err) {
      return errorResponse(res, 500, "Gagal membuat sub-kegiatan", err);
    }
  },

  /**
   * Dropdown DPA / form anggaran: daftar sub kegiatan per kegiatan + tahun
   * tanpa wajib jenis_dokumen (alur RKPD→Renja→RKA belum selalu tersedia).
   */
  async listByKegiatanForDpa(req, res) {
    try {
      const kegiatanId = parseInt(req.params.kegiatanId, 10);
      const tahunRaw = req.query.tahun;
      if (!kegiatanId || Number.isNaN(kegiatanId)) {
        return errorResponse(res, 400, "Parameter kegiatanId tidak valid.");
      }
      if (tahunRaw === undefined || tahunRaw === null || tahunRaw === "") {
        return errorResponse(res, 400, "Query tahun wajib diisi.");
      }
      const tahunNum = parseInt(String(tahunRaw).trim(), 10);
      if (Number.isNaN(tahunNum)) {
        return errorResponse(res, 400, "Query tahun tidak valid.");
      }
      const kg = await Kegiatan.findByPk(kegiatanId);
      if (!kg) {
        return errorResponse(res, 404, "Kegiatan tidak ditemukan.");
      }
      const rows = await SubKegiatan.findAll({
        where: { kegiatan_id: kegiatanId, tahun: tahunNum },
        attributes: [
          "id",
          "kode_sub_kegiatan",
          "nama_sub_kegiatan",
          "pagu_anggaran",
        ],
        order: [["kode_sub_kegiatan", "ASC"]],
        limit: 500,
      });
      return listResponse(res, 200, "Daftar sub kegiatan", rows);
    } catch (err) {
      console.error("listByKegiatanForDpa:", err);
      return errorResponse(
        res,
        500,
        "Gagal mengambil sub kegiatan",
        err.message,
      );
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

      const currentPage = Number(page) || 1;
      const safeLimit = Math.min(Number(limit) || 50, MAX_LIMIT);
      const offset = (currentPage - 1) * safeLimit;
      const where = { tahun, jenis_dokumen, periode_id };
      if (kegiatan_id) where.kegiatan_id = kegiatan_id;

      let { rows, count } = await SubKegiatan.findAndCountAll({
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

      if (count === 0 && kegiatan_id && jenis_dokumen !== "rpjmd") {
        const selectedKegiatan = await Kegiatan.findByPk(kegiatan_id, {
          attributes: ["id", "kode_kegiatan", "jenis_dokumen"],
        });

        let fallbackKegiatanId = null;
        if (selectedKegiatan?.jenis_dokumen === "rpjmd") {
          fallbackKegiatanId = selectedKegiatan.id;
        } else if (selectedKegiatan?.kode_kegiatan) {
          const sourceKegiatan = await Kegiatan.findOne({
            where: {
              kode_kegiatan: selectedKegiatan.kode_kegiatan,
              jenis_dokumen: "rpjmd",
              tahun,
            },
            attributes: ["id"],
          });
          fallbackKegiatanId = sourceKegiatan?.id || null;
        }

        if (fallbackKegiatanId) {
          const fallback = await SubKegiatan.findAndCountAll({
            where: {
              kegiatan_id: fallbackKegiatanId,
              tahun,
              jenis_dokumen: "rpjmd",
            },
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

          rows = fallback.rows;
          count = fallback.count;
        }
      }

      return listResponse(
        res,
        200,
        "Daftar SubKegiatan ditemukan",
        rows,
        {
          totalItems: count,
          totalPages: Math.ceil(count / safeLimit),
          currentPage,
        }
      );
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

      const modeEffective =
        req.operationalMode ??
        (await getEffectiveOperationalModeForSubKegiatan());
      const prep = await prepareSubKegiatanMasterWrite({
        body: req.body,
        existing: sub,
        operationalMode: modeEffective,
      });
      if (!prep.ok) {
        return structuredErrorResponse(res, prep.status || 400, {
          code: prep.code || "ENFORCEMENT_ERROR",
          message: prep.message || "Validasi master / mode operasional gagal",
          field: null,
          details: prep.details,
        });
      }

      console.log("[ENFORCEMENT]", {
        mode: modeEffective,
        entity: "sub_kegiatan",
        action: "update",
        isMasterPayload: isMasterPayload(req.body),
      });

      const masterFields =
        prep.input_mode === "MASTER"
          ? {
              master_sub_kegiatan_id: prep.merged.master_sub_kegiatan_id,
              regulasi_versi_id: prep.merged.regulasi_versi_id,
              input_mode: "MASTER",
            }
          : { input_mode: "LEGACY" };

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
        ...masterFields,
      });

      await ensureClonedOnce(jenis_dokumen, tahun);

      await recalcKegiatanTotal(kegiatan.id);
      await recalcProgramTotal(kegiatan.program.id);

      const fresh = await SubKegiatan.findByPk(sub.id);
      const meta =
        prep.transitionWarning != null
          ? { enforcementWarning: prep.transitionWarning }
          : undefined;
      return successResponse(
        res,
        200,
        "Sub-kegiatan berhasil diperbarui",
        fresh,
        meta,
      );
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
