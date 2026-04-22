// controllers/indikatorSasaranController.js
const {
  sequelize,
  IndikatorSasaran,
  Sasaran,
  IndikatorProgram,
  Program,
  OpdPenanggungJawab,
} = require("../models");
const { Op } = require("sequelize");
const { generateKodeIndikator } = require("../helpers/generateKodeIndikator");
const { normalizeDecimalFields } = require("../utils/normalizeDecimal");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const {
  getPeriodeFromTahun,
  getPeriodeAktif,
} = require("../utils/periodeHelper");
const {
  sendValidationErrors,
  fromSequelizeValidationError,
} = require("../utils/validationErrorResponse");

const applyDefaultsAndNormalize = (data, periode) => {
  if (!periode?.id && !data.periode_id) {
    throw new Error("Periode tidak ditemukan. Tidak dapat menyimpan data.");
  }

  const item = {
    ...data,
    jenis_dokumen: data.jenis_dokumen || periode?.nama || "RPJMD",
    tahun:
      data.tahun || String(periode?.tahun_awal || new Date().getFullYear()),
    periode_id: data.periode_id || periode.id,
  };

  if (item.capaian_tahun_5) {
    item.baseline = item.capaian_tahun_5;
    item.target_awal = item.capaian_tahun_5;
    item.tahun_awal = item.tahun;
  }

  if (!item.target_akhir && item.target_tahun_5) {
    item.target_akhir = item.target_tahun_5;
  }

  if (!item.tahun_akhir && item.target_tahun_5) {
    item.tahun_akhir = item.tahun;
  }

  normalizeDecimalFields(item);
  return item;
};
const MAX_LIMIT = 200;
exports.create = async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];

    if (!rows.every((r) => r.indikator_id)) {
      return sendValidationErrors(
        res,
        400,
        { indikator_id: ["Semua data harus memiliki indikator_id"] },
        { message: "Semua data harus memiliki indikator_id" },
      );
    }

    const tahun = rows[0]?.tahun || new Date().getFullYear();
    const periode =
      (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());

    const withDefaults = rows.map((row) =>
      applyDefaultsAndNormalize(row, periode),
    );

    const transaction = await sequelize.transaction();
    try {
      const created = await IndikatorSasaran.bulkCreate(withDefaults, {
        fields: Object.keys(withDefaults[0]),
        transaction,
      });
      await transaction.commit();
      return res.status(201).json({ status: "success", data: created });
    } catch (error) {
      await transaction.rollback();
      if (error.name === "SequelizeUniqueConstraintError") {
        return sendValidationErrors(
          res,
          409,
          {
            kode_indikator: [
              "Data sudah ada untuk kombinasi indikator_id, kode_indikator, jenis_dokumen, dan tahun.",
            ],
          },
          {
            message:
              "Data sudah ada untuk kombinasi indikator_id, kode_indikator, jenis_dokumen, dan tahun.",
          },
        );
      }
      if (error.name === "SequelizeValidationError") {
        return sendValidationErrors(
          res,
          400,
          fromSequelizeValidationError(error),
          {
            message: error.message,
          },
        );
      }
      return res.status(500).json({ status: "error", message: error.message });
    }
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.bulkCreateDetail = async (req, res) => {
  try {
    const { indikatorId } = req.params;
    const rows = req.body.rows;

    if (!indikatorId || !Array.isArray(rows) || rows.length === 0) {
      return sendValidationErrors(
        res,
        400,
        { rows: ["indikatorId dan data rows wajib diisi."] },
        { message: "indikatorId dan data rows wajib diisi." },
      );
    }

    const tahun = rows[0]?.tahun || new Date().getFullYear();
    const periode =
      (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());

    const toInsert = rows.map((r) =>
      applyDefaultsAndNormalize({ ...r, indikator_id: indikatorId }, periode),
    );

    const created = await IndikatorSasaran.bulkCreate(toInsert);
    return res.status(201).json({ status: "success", data: created });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return sendValidationErrors(
        res,
        409,
        {
          kode_indikator: [
            "Data sudah ada untuk kombinasi kode_indikator, jenis_dokumen, dan tahun.",
          ],
        },
        {
          message:
            "Data sudah ada untuk kombinasi kode_indikator, jenis_dokumen, dan tahun.",
        },
      );
    }
    if (err.name === "SequelizeValidationError") {
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), {
        message: err.message,
      });
    }
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.findAll = async (req, res) => {
  const {
    jenis_dokumen = "RPJMD",
    tahun = "2025",
    page = 1,
    perPage = 50,
    sasaran_id,
  } = req.query;
  await ensureClonedOnce(jenis_dokumen, tahun);
  const limit = Math.min(parseInt(perPage), MAX_LIMIT),
    offset = (page - 1) * limit;

  const where = { jenis_dokumen, tahun };
  if (sasaran_id) where.sasaran_id = sasaran_id;

  const { count, rows } = await IndikatorSasaran.findAndCountAll({
    where,
    include: [
      {
        model: IndikatorProgram,
        as: "programs",
        separate: true,
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "nama_program", "kode_program"],
          },
          {
            model: OpdPenanggungJawab,
            as: "opdPenanggungJawab",
            attributes: ["id", "nama_opd"],
          },
        ],
      },
    ],
    attributes: { exclude: ["createdAt", "updatedAt"] },
    limit,
    offset,
    order: [["id", "ASC"]],
    distinct: true,
  });
  return res.json({
    status: "success",
    data: rows,
    pagination: {
      total: count,
      currentPage: page,
      perPage: limit,
      totalPages: Math.ceil(count / limit),
    },
  });
};

exports.findOne = async (req, res) => {
  try {
    const indikator = await IndikatorSasaran.findByPk(req.params.id, {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: IndikatorProgram,
          as: "programs",
          attributes: ["id", "kode_indikator", "nama_indikator"],
          include: [
            {
              model: Program,
              as: "program",
              attributes: ["id", "nama_program"],
            },
          ],
        },
      ],
    });

    if (!indikator) {
      return res
        .status(404)
        .json({ status: "error", message: "Data tidak ditemukan." });
    }

    return res.status(200).json({ status: "success", data: indikator });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.findByTujuan = async (req, res) => {
  try {
    const {
      tujuan_id,
      tahun,
      jenis_dokumen,
      page = 1,
      perPage = 50,
    } = req.query;
    if (!tujuan_id) {
      return res.status(400).json({ message: "tujuan_id wajib diisi." });
    }

    const limit = Math.min(parseInt(perPage, 10) || 50, MAX_LIMIT);
    const offset = (parseInt(page, 10) - 1) * limit;

    const where = { tujuan_id };
    if (tahun) where.tahun = tahun;
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;

    const { count, rows } = await IndikatorSasaran.findAndCountAll({
      where,
      include: [
        {
          model: IndikatorProgram,
          as: "programs",
          separate: true,
          include: [
            {
              model: Program,
              as: "program",
              attributes: ["id", "nama_program"],
            },
          ],
        },
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] },
      limit,
      offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    return res.json({
      status: "success",
      data: rows,
      pagination: {
        total: count,
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getNextKode = async (req, res) => {
  try {
    const { sasaran_id } = req.params;
    if (!sasaran_id)
      return res.status(400).json({ message: "sasaran_id wajib diisi." });

    const sasaran = await Sasaran.findByPk(sasaran_id);
    if (!sasaran || !sasaran.nomor) {
      return res.status(404).json({
        message: "Sasaran tidak ditemukan atau belum memiliki nomor.",
      });
    }

    const nextKode = await generateKodeIndikator(sasaran_id, sasaran.nomor);
    return res.json({ status: "success", next_kode: nextKode });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const indikatorSasaran = await IndikatorSasaran.findByPk(req.params.id);
    if (!indikatorSasaran)
      return res.status(404).json({
        message: `Indikator dengan ID ${req.params.id} tidak ditemukan.`,
      });

    const tahun =
      req.body?.tahun || indikatorSasaran.tahun || new Date().getFullYear();
    const periode =
      (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());

    const updateData = applyDefaultsAndNormalize(req.body, periode);

    await indikatorSasaran.update(updateData);
    return res.status(200).json({ status: "success", data: indikatorSasaran });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), {
        message: err.message,
      });
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      return sendValidationErrors(
        res,
        409,
        { kode_indikator: ["Kode indikator bentrok dengan data lain."] },
        { message: err.message },
      );
    }
    return res.status(500).json({ status: "error", message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const indikatorSasaran = await IndikatorSasaran.findByPk(req.params.id);
    if (!indikatorSasaran)
      return res.status(404).json({ message: "Indikator tidak ditemukan." });

    await indikatorSasaran.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};
