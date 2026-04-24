// Refactor: programController.js
const {
  Program,
  Sasaran,
  Strategi,
  ArahKebijakan,
  OpdPenanggungJawab,
  Tujuan,
  Misi,
  ProgramArahKebijakan,
} = require("../models");
const { Op, fn, col, where: sqlWhere } = require("sequelize");
const {
  getPeriodeFromTahun,
  getPeriodeIdFromTahun,
} = require("../utils/periodeHelper");
const { validationResult } = require("express-validator");
const {
  successResponse,
  errorResponse,
  listResponse,
} = require("../utils/responseHelper");
const {
  recalcProgramTotal,
  recalcProgramTotalByKode,
} = require("../utils/paguHelper");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const { logActivity } = require("../services/auditService");

const MAX_PAGE_LIMIT = 100;
const includeRelations = [
  {
    model: Strategi,
    as: "Strategi",
    through: { attributes: [] },
    attributes: ["id", "kode_strategi", "deskripsi"],
  },
  {
    model: ArahKebijakan,
    as: "ArahKebijakan",
    through: {
      attributes: ["strategi_id"],
    },
    attributes: ["id", "kode_arah", "deskripsi"],
  },
  {
    model: Sasaran,
    as: "sasaran",
    include: [
      {
        model: Tujuan,
        as: "Tujuan",
        include: [{ model: Misi, as: "Misi", attributes: ["id", "isi_misi"] }],
        attributes: ["id", "isi_tujuan", "no_tujuan"],
      },
    ],
    attributes: ["id", "isi_sasaran", "nomor", "tujuan_id"],
  },
  {
    model: OpdPenanggungJawab,
    as: "opd",
    attributes: ["id", "nama_opd", "nama_bidang_opd"],
  },
];

const programController = {
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 400, "Validasi gagal", errors.array());
      }

      const {
        sasaran_id,
        kode_program,
        nama_program,
        pagu_anggaran,
        rpjmd_id,
        prioritas,
        opd_penanggung_jawab,
        bidang_opd_penanggung_jawab,
        strategi: strategiRaw,
        arah_kebijakan: arahRaw,
        tahun,
        jenis_dokumen,
      } = req.body;

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return errorResponse(res, 400, "Periode tidak ditemukan.");
      }
      const periode_id = periode.id;

      const opd = await resolveOpd(opd_penanggung_jawab);
      if (!opd) {
        return errorResponse(
          res,
          404,
          `OPD '${opd_penanggung_jawab}' tidak ditemukan.`,
        );
      }

      const finalNama = normalize(nama_program);
      const finalKode = ensureTrailingDot(normalize(kode_program));

      const sasaran = await Sasaran.findByPk(sasaran_id);
      if (
        !sasaran ||
        sasaran.periode_id !== periode_id ||
        String(sasaran.tahun) !== String(tahun)
      ) {
        return errorResponse(
          res,
          400,
          "Sasaran tidak valid atau tidak sesuai periode/tahun.",
        );
      }

      const exists = await Program.findOne({
        where: {
          periode_id,
          [Op.or]: [{ kode_program: finalKode }, { nama_program: finalNama }],
        },
      });

      if (exists) {
        const conflictField =
          exists.kode_program === finalKode ? "Kode Program" : "Nama Program";
        return errorResponse(
          res,
          409,
          `${conflictField} sudah digunakan di periode yang sama.`,
        );
      }

      const program = await Program.create({
        sasaran_id,
        kode_program: finalKode,
        nama_program: finalNama,
        pagu_anggaran,
        rpjmd_id,
        prioritas,
        opd_penanggung_jawab: opd.id,
        bidang_opd_penanggung_jawab,
        periode_id,
        tahun,
        jenis_dokumen,
      });

      await program.setStrategi(parseIds(strategiRaw));
      const arahData = Array.isArray(arahRaw)
        ? arahRaw.map((a) => ({
            program_id: program.id,
            arah_kebijakan_id: typeof a === "object" ? a.id : a,
            strategi_id: typeof a === "object" ? a.strategi_id : null,
          }))
        : [];

      await ProgramArahKebijakan.bulkCreate(arahData);
      await recalcProgramTotalByKode(finalKode);

      const result = await Program.findByPk(program.id, {
        include: includeRelations,
      });
      logActivity(req, "CREATE", "Program", program.id, null, result.toJSON());
      return successResponse(res, 201, "Program berhasil ditambahkan", result);
    } catch (err) {
      return handleServerError(res, err, "menambah program");
    }
  },

  async bulkCreate(req, res) {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return errorResponse(
        res,
        400,
        "Data harus array dan tidak boleh kosong.",
      );
    }

    try {
      const filtered = [];
      const kodeSet = new Set();

      const periode_id = await getPeriodeIdFromTahun(data[0]?.tahun);
      if (!periode_id) {
        return errorResponse(res, 400, "Periode tidak ditemukan.");
      }

      const existing = await Program.findAll({
        where: {
          periode_id,
          jenis_dokumen: data[0]?.jenis_dokumen,
          kode_program: data.map((p) =>
            ensureTrailingDot(normalize(p.kode_program)),
          ),
        },
        attributes: ["kode_program"],
        raw: true,
      });

      const existingKode = new Set(existing.map((e) => e.kode_program));

      for (const p of data) {
        const finalKode = ensureTrailingDot(normalize(p.kode_program));
        const key = `${p.periode_id || periode_id}-${
          p.jenis_dokumen
        }-${finalKode}`;

        if (!existingKode.has(finalKode) && !kodeSet.has(key)) {
          filtered.push({
            ...p,
            kode_program: finalKode,
            nama_program: normalize(p.nama_program),
            created_at: new Date(),
            updated_at: new Date(),
            periode_id,
          });
          kodeSet.add(key);
        }
      }

      if (filtered.length === 0) {
        return errorResponse(res, 409, "Semua program sudah ada.");
      }

      const createdPrograms = [];
      for (let i = 0; i < filtered.length; i += 200) {
        const batch = filtered.slice(i, i + 200);
        const inserted = await Program.bulkCreate(batch, {
          ignoreDuplicates: true,
          returning: true,
        });
        createdPrograms.push(...inserted);
      }

      return successResponse(
        res,
        201,
        `Berhasil menambahkan ${createdPrograms.length} program.`,
        createdPrograms,
      );
    } catch (err) {
      return handleServerError(res, err, "bulk create program");
    }
  },

  async list(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        tahun,
        jenis_dokumen,
        sasaran_id,
        arah_kebijakan_id,
      } = req.query;
      if (!tahun || !jenis_dokumen) {
        return res
          .status(400)
          .json({ message: "Parameter tahun & jenis_dokumen wajib." });
      }

      await ensureClonedOnce(jenis_dokumen, tahun);
      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return res.status(400).json({ message: "Periode tidak ditemukan." });
      }
      const periode_id = periode.id;

      const currentPage = parseInt(page, 10) || 1;
      const safeLimit = Math.min(parseInt(limit, 10) || 20, MAX_PAGE_LIMIT);
      const offset = (currentPage - 1) * safeLimit;

      const jenisLc = String(jenis_dokumen).trim().toLowerCase();
      const where = {
        tahun,
        periode_id,
        [Op.and]: [
          sqlWhere(fn("LOWER", col("Program.jenis_dokumen")), jenisLc),
        ],
      };
      if (!arah_kebijakan_id && sasaran_id) {
        where.sasaran_id = sasaran_id;
      }

      const includeForList = includeRelations.map((inc) => {
        if (inc.as === "ArahKebijakan" && arah_kebijakan_id) {
          return {
            ...inc,
            required: true,
            where: { id: arah_kebijakan_id },
          };
        }
        return inc;
      });

      const { count, rows } = await Program.findAndCountAll({
        where,
        include: includeForList,
        limit: safeLimit,
        offset,
        order: [["kode_program", "ASC"]],
        distinct: true,
      });

      if (
        count === 0 &&
        sasaran_id &&
        !arah_kebijakan_id &&
        jenisLc !== "rpjmd"
      ) {
        const selectedSasaran = await Sasaran.findByPk(sasaran_id, {
          attributes: ["id", "rpjmd_id", "nomor", "jenis_dokumen", "periode_id"],
        });

        let fallbackSasaranId = null;
        if (selectedSasaran?.jenis_dokumen === "rpjmd") {
          fallbackSasaranId = selectedSasaran.id;
        } else if (selectedSasaran?.rpjmd_id) {
          fallbackSasaranId = selectedSasaran.rpjmd_id;
        } else if (selectedSasaran?.nomor) {
          const mappedSasaran = await Sasaran.findOne({
            where: {
              nomor: selectedSasaran.nomor,
              jenis_dokumen: "rpjmd",
              tahun: String(tahun),
            },
            attributes: ["id"],
          });
          fallbackSasaranId = mappedSasaran?.id || null;
        }

        if (fallbackSasaranId) {
          const fallback = await Program.findAndCountAll({
            where: {
              tahun,
              jenis_dokumen: "rpjmd",
              sasaran_id: fallbackSasaranId,
            },
            include: includeRelations,
            limit: safeLimit,
            offset,
            order: [["kode_program", "ASC"]],
            distinct: true,
          });

          return listResponse(
            res,
            200,
            "Daftar program berhasil diambil",
            fallback.rows,
            {
              totalItems: fallback.count,
              totalPages: Math.ceil(fallback.count / safeLimit),
              currentPage,
            }
          );
        }
      }

      return listResponse(res, 200, "Daftar program berhasil diambil", rows, {
        totalItems: count,
        totalPages: Math.ceil(count / safeLimit),
        currentPage,
      });
    } catch (err) {
      console.error("Error listing Program:", err);
      return res
        .status(500)
        .json({ message: "Gagal memuat program", error: err.message });
    }
  },

  // 📌 LIST ALL tanpa pagination (khusus dropdown)
  async listAll(req, res) {
    try {
      const { tahun, jenis_dokumen } = req.query;

      if (tahun && jenis_dokumen) {
        await ensureClonedOnce(jenis_dokumen, tahun);
      }

      const where = {};
      if (tahun) where.tahun = tahun;
      if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;

      const programs = await Program.findAll({
        where,
        order: [["kode_program", "ASC"]],
        include: includeRelations,
      });

      return listResponse(res, 200, "Semua program berhasil dimuat", programs);
    } catch (err) {
      return handleServerError(res, err, "memuat semua program");
    }
  },

  async getById(req, res) {
    try {
      const program = await Program.findByPk(req.params.id, {
        include: includeRelations,
      });
      if (!program) return errorResponse(res, 404, "Program tidak ditemukan.");
      return successResponse(res, 200, "Detail program ditemukan", program);
    } catch (err) {
      return handleServerError(res, err, "memuat program");
    }
  },

  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 400, "Validasi gagal", errors.array());
      }

      const programId = Number(req.params.id);
      const program = await Program.findByPk(programId);
      if (!program) return errorResponse(res, 404, "Program tidak ditemukan.");

      const {
        sasaran_id,
        kode_program,
        nama_program,
        pagu_anggaran,
        tahun,
        strategi: strategiRaw,
        arah_kebijakan: arahRaw,
        prioritas,
        opd_penanggung_jawab,
        bidang_opd_penanggung_jawab,
        jenis_dokumen,
      } = req.body;

      const periode = await getPeriodeFromTahun(tahun);
      if (!periode) {
        return errorResponse(res, 400, "Periode tidak ditemukan.");
      }
      const periode_id = periode.id;

      const opd = await resolveOpd(opd_penanggung_jawab);
      if (!opd) return errorResponse(res, 404, "OPD tidak ditemukan.");

      const finalKode = ensureTrailingDot(
        normalize(kode_program || program.kode_program),
      );
      const finalNama = normalize(nama_program || program.nama_program);

      const sasaran = await Sasaran.findByPk(sasaran_id);
      if (
        !sasaran ||
        sasaran.periode_id !== periode_id ||
        String(sasaran.tahun) !== String(tahun)
      ) {
        return errorResponse(
          res,
          400,
          "Sasaran tidak valid atau tidak sesuai periode/tahun.",
        );
      }

      const exists = await Program.findOne({
        where: {
          periode_id,
          id: { [Op.ne]: programId },
          [Op.or]: [{ kode_program: finalKode }, { nama_program: finalNama }],
        },
      });

      if (exists) {
        const conflictField =
          exists.kode_program === finalKode ? "Kode Program" : "Nama Program";
        return errorResponse(
          res,
          409,
          `${conflictField} sudah digunakan di periode yang sama.`,
        );
      }

      await program.update({
        sasaran_id,
        periode_id,
        jenis_dokumen,
        tahun,
        kode_program: finalKode,
        nama_program: finalNama,
        pagu_anggaran,
        prioritas,
        opd_penanggung_jawab: opd.id,
        bidang_opd_penanggung_jawab,
      });

      await program.setStrategi(parseIds(strategiRaw));
      await ProgramArahKebijakan.destroy({
        where: { program_id: program.id },
      });

      const arahData = Array.isArray(arahRaw)
        ? arahRaw.map((a) => ({
            program_id: program.id,
            arah_kebijakan_id: typeof a === "object" ? a.id : a,
            strategi_id: typeof a === "object" ? a.strategi_id : null,
          }))
        : [];

      await ProgramArahKebijakan.bulkCreate(arahData);
      await recalcProgramTotalByKode(finalKode);

      const result = await Program.findByPk(program.id, {
        include: includeRelations,
      });
      logActivity(req, "UPDATE", "Program", program.id, null, result.toJSON());
      return successResponse(res, 200, "Program berhasil diperbarui", result);
    } catch (err) {
      return handleServerError(res, err, "memperbarui program");
    }
  },

  async destroy(req, res) {
    try {
      const program = await Program.findByPk(req.params.id);
      if (!program) return errorResponse(res, 404, "Program tidak ditemukan.");
      const kodeProgram = program.kode_program;
      await program.destroy();
      await recalcProgramTotalByKode(kodeProgram);
      return successResponse(res, 200, "Program berhasil dihapus");
    } catch (err) {
      return handleServerError(res, err, "menghapus program");
    }
  },
};

function normalize(text) {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : text;
}

function ensureTrailingDot(str) {
  return typeof str === "string" && !str.endsWith(".") ? str + "." : str;
}

function parseIds(raw) {
  return Array.isArray(raw)
    ? raw
        .map((r) => (typeof r === "object" ? (r.id ?? r.value ?? null) : r))
        .filter(Boolean)
    : [];
}

async function resolveOpd(input) {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number" && Number.isFinite(input)) {
    return { id: input };
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      const id = Number(trimmed);
      if (Number.isSafeInteger(id)) return { id };
    }
  }
  const raw = typeof input === "string" ? input : String(input);
  const [namaOpd, bidang] = raw.split("||");
  const whereClause = bidang
    ? { nama_opd: namaOpd.trim(), nama_bidang_opd: bidang.trim() }
    : { nama_opd: namaOpd.trim() };
  return await OpdPenanggungJawab.findOne({ where: whereClause });
}

function handleServerError(res, err, context) {
  console.error(`Error ${context}:`, err);
  return errorResponse(
    res,
    500,
    `Gagal ${context}`,
    err.message || "Unexpected error",
  );
}

module.exports = programController;
