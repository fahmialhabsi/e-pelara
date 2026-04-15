// controllers/indikatorArahKebijakanController.js
const {
  sequelize,
  IndikatorArahKebijakan,
  ArahKebijakan,
  OpdPenanggungJawab,
} = require("../models");
const { Op } = require("sequelize");
const { normalizeDecimalFields } = require("../utils/normalizeDecimal");
const {
  getPeriodeFromTahun,
  getPeriodeAktif,
} = require("../utils/periodeHelper");
const {
  sendValidationErrors,
  fromSequelizeValidationError,
} = require("../utils/validationErrorResponse");

const MAX_LIMIT = 200;

/* ── Normalisasi & default sebelum simpan ── */
const applyDefaults = (data, periode) => {
  if (!periode?.id && !data.periode_id) {
    throw new Error("Periode tidak ditemukan.");
  }
  const item = {
    ...data,
    jenis_dokumen: data.jenis_dokumen || periode?.nama || "RPJMD",
    tahun:  data.tahun  || String(periode?.tahun_awal || new Date().getFullYear()),
    periode_id: data.periode_id || periode.id,
  };
  if (item.capaian_tahun_5) {
    item.baseline    = item.capaian_tahun_5;
    item.target_awal = item.capaian_tahun_5;
    item.tahun_awal  = item.tahun;
  }
  if (!item.target_akhir && item.target_tahun_5) item.target_akhir = item.target_tahun_5;
  if (!item.tahun_akhir  && item.target_tahun_5) item.tahun_akhir  = item.tahun;
  normalizeDecimalFields(item);
  return item;
};

/* ── POST / (bulk create) ── */
exports.create = async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];

    if (!rows.every((r) => r.indikator_id)) {
      return sendValidationErrors(res, 400,
        { indikator_id: ["Semua data harus memiliki indikator_id"] },
        { message: "Semua data harus memiliki indikator_id" }
      );
    }

    const tahun  = rows[0]?.tahun || new Date().getFullYear();
    const periode = (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());
    const withDefaults = rows.map((r) => applyDefaults(r, periode));

    const t = await sequelize.transaction();
    try {
      const created = await IndikatorArahKebijakan.bulkCreate(withDefaults, {
        fields: Object.keys(withDefaults[0]),
        transaction: t,
      });
      await t.commit();
      return res.status(201).json({ status: "success", data: created });
    } catch (err) {
      await t.rollback();
      if (err.name === "SequelizeUniqueConstraintError") {
        return sendValidationErrors(res, 409,
          { kode_indikator: ["Data sudah ada untuk kombinasi ini."] },
          { message: "Data duplikat." }
        );
      }
      if (err.name === "SequelizeValidationError") {
        return sendValidationErrors(res, 400, fromSequelizeValidationError(err), { message: err.message });
      }
      return res.status(500).json({ status: "error", message: err.message });
    }
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET / ── */
exports.findAll = async (req, res) => {
  try {
    const {
      jenis_dokumen = "RPJMD",
      tahun = "2025",
      page = 1,
      limit: limitQ,
      perPage,
    } = req.query;
    const rawLimit = Number(limitQ ?? perPage ?? 50) || 50;
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limit;

    const { count, rows } = await IndikatorArahKebijakan.findAndCountAll({
      where: { jenis_dokumen, tahun },
      include: [
        {
          model: ArahKebijakan,
          as: "arahKebijakan",
          attributes: ["id", "kode_arah", "deskripsi"],
          required: false,
        },
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["id", "nama_opd"],
          required: false,
        },
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] },
      limit, offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    const totalPages = Math.max(1, Math.ceil(count / limit));
    return res.json({
      status: "success",
      data: rows,
      meta: {
        totalItems: count,
        currentPage: pageNum,
        perPage: limit,
        totalPages,
      },
      pagination: {
        total: count,
        currentPage: pageNum,
        perPage: limit,
        totalPages,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET /?arah_kebijakan_id=X  (filter by parent) ── */
exports.findByArahKebijakan = async (req, res) => {
  try {
    const { arah_kebijakan_id, tahun, jenis_dokumen, page = 1, perPage = 50 } = req.query;
    if (!arah_kebijakan_id) return res.status(400).json({ message: "arah_kebijakan_id wajib diisi." });

    const limit  = Math.min(parseInt(perPage, 10) || 50, MAX_LIMIT);
    const offset = (parseInt(page, 10) - 1) * limit;
    const where  = { arah_kebijakan_id };
    if (tahun)         where.tahun = tahun;
    if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;

    const { count, rows } = await IndikatorArahKebijakan.findAndCountAll({
      where,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      limit, offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    return res.json({
      status: "success",
      data: rows,
      pagination: { total: count, currentPage: page, perPage: limit, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET /:arah_kebijakan_id/next-kode ── */
exports.getNextKode = async (req, res) => {
  try {
    const { arah_kebijakan_id } = req.params;
    if (!arah_kebijakan_id) return res.status(400).json({ message: "arah_kebijakan_id wajib diisi." });

    const arahKebijakan = await ArahKebijakan.findByPk(arah_kebijakan_id);
    if (!arahKebijakan) return res.status(404).json({ message: "Arah Kebijakan tidak ditemukan." });

    const prefix = arahKebijakan.kode_arah || `AK-${arah_kebijakan_id}`;

    const result = await IndikatorArahKebijakan.findOne({
      where: {
        arah_kebijakan_id,
        kode_indikator: { [Op.like]: `${prefix}-%` },
      },
      attributes: [
        [
          sequelize.fn("MAX", sequelize.literal("CAST(SUBSTRING_INDEX(kode_indikator,'-',-1) AS UNSIGNED)")),
          "maxNumber",
        ],
      ],
      raw: true,
    });

    const next = (result?.maxNumber || 0) + 1;
    return res.json({ status: "success", next_kode: `${prefix}-${String(next).padStart(2, "0")}` });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET /:id ── */
exports.findOne = async (req, res) => {
  try {
    const record = await IndikatorArahKebijakan.findByPk(req.params.id, {
      include: [
        { model: ArahKebijakan, as: "arahKebijakan", attributes: ["id", "kode_arah", "deskripsi"] },
        { model: OpdPenanggungJawab, as: "opdPenanggungJawab", attributes: ["id", "nama_opd"] },
      ],
    });
    if (!record) return res.status(404).json({ message: "Indikator tidak ditemukan." });
    return res.json({ status: "success", data: record });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── PUT /:id ── */
exports.update = async (req, res) => {
  try {
    const record = await IndikatorArahKebijakan.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: `Indikator ID ${req.params.id} tidak ditemukan.` });

    const tahun   = req.body?.tahun || record.tahun || new Date().getFullYear();
    const periode = (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());
    await record.update(applyDefaults(req.body, periode));
    return res.json({ status: "success", data: record });
  } catch (err) {
    if (err.name === "SequelizeValidationError")
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), { message: err.message });
    if (err.name === "SequelizeUniqueConstraintError")
      return sendValidationErrors(res, 409, { kode_indikator: ["Kode indikator bentrok."] }, { message: err.message });
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── DELETE /:id ── */
exports.delete = async (req, res) => {
  try {
    const record = await IndikatorArahKebijakan.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: "Indikator tidak ditemukan." });
    await record.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};
