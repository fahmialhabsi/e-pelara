// controllers/indikatorArahKebijakanController.js
const {
  sequelize,
  IndikatorArahKebijakan,
  IndikatorStrategi,
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

async function preferPeriodeNamaIfExists({
  model,
  jenis_dokumen,
  tahun,
}) {
  const jd = String(jenis_dokumen ?? "").trim();
  const tahunStr = String(tahun ?? "").trim();
  if (!jd || !tahunStr) return jd;
  if (jd.toUpperCase() !== "RPJMD") return jd;

  const periode = (await getPeriodeFromTahun(tahunStr)) || (await getPeriodeAktif());
  const periodeNama = String(periode?.nama ?? "").trim();
  if (!periodeNama) return jd;
  if (!/^RPJMD\b/i.test(periodeNama) || periodeNama.toUpperCase() === "RPJMD")
    return jd;

  const count = await model.count({
    where: { tahun: tahunStr, jenis_dokumen: periodeNama },
  });
  return count > 0 ? periodeNama : jd;
}

function fillBaselineFallback(rows) {
  for (const r of rows) {
    if (!r) continue;
    const baseline = r.baseline ?? r.get?.("baseline");
    if (baseline == null || String(baseline).trim() === "") {
      const c5 = r.capaian_tahun_5 ?? r.get?.("capaian_tahun_5");
      if (c5 != null && String(c5).trim() !== "") {
        if (typeof r.setDataValue === "function") r.setDataValue("baseline", c5);
        else r.baseline = c5;
      }
    }
  }
}

async function fillPenanggungJawabFallback({
  rows,
  tahun,
  jenis_dokumen,
}) {
  const needs = [];
  for (const r of rows) {
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    const strategi_id = r?.strategi_id ?? r?.get?.("strategi_id");
    if (
      (pj == null || String(pj).trim() === "") &&
      strategi_id != null &&
      String(strategi_id).trim() !== ""
    ) {
      needs.push(Number.parseInt(String(strategi_id), 10));
    }
  }
  const strategiIds = [...new Set(needs.filter((n) => Number.isFinite(n)))];
  if (strategiIds.length === 0) return;

  const tahunStr = String(tahun ?? "").trim();
  const isRpjmd = /rpjmd/i.test(String(jenis_dokumen ?? ""));
  const strategiWhere = {
    strategi_id: { [Op.in]: strategiIds },
    tahun: tahunStr,
    penanggung_jawab: { [Op.not]: null },
  };
  if (isRpjmd) strategiWhere.jenis_dokumen = { [Op.like]: "RPJMD%" };
  else strategiWhere.jenis_dokumen = String(jenis_dokumen ?? "").trim();

  const strategiRows = await IndikatorStrategi.findAll({
    where: strategiWhere,
    attributes: ["strategi_id", "penanggung_jawab"],
    raw: true,
  });
  const pjByStrategi = new Map();
  for (const s of strategiRows) {
    const sid = Number.parseInt(String(s.strategi_id), 10);
    const pj = s.penanggung_jawab;
    if (!Number.isFinite(sid) || pj == null || String(pj).trim() === "") continue;
    if (!pjByStrategi.has(sid)) pjByStrategi.set(sid, pj);
  }

  const opdIds = new Set();
  for (const r of rows) {
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    if (pj != null && String(pj).trim() !== "") opdIds.add(Number(pj));
    const strategi_id = Number.parseInt(String(r?.strategi_id ?? r?.get?.("strategi_id") ?? ""), 10);
    if (!Number.isFinite(strategi_id)) continue;
    if (pj == null || String(pj).trim() === "") {
      const fill = pjByStrategi.get(strategi_id);
      if (fill != null && String(fill).trim() !== "") {
        if (typeof r.setDataValue === "function") r.setDataValue("penanggung_jawab", fill);
        else r.penanggung_jawab = fill;
        opdIds.add(Number(fill));
      }
    }
  }

  const ids = [...opdIds].filter((n) => Number.isFinite(n) && n >= 1);
  if (ids.length === 0) return;
  const opdRows = await OpdPenanggungJawab.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ["id", "nama_opd", "nama_bidang_opd"],
    raw: true,
  });
  const opdById = new Map(opdRows.map((o) => [Number(o.id), o]));

  for (const r of rows) {
    const curAssoc =
      r?.opdPenanggungJawab ?? r?.get?.("opdPenanggungJawab") ?? null;
    if (curAssoc != null) continue;
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    const pid = Number(pj);
    if (!Number.isFinite(pid)) continue;
    const opd = opdById.get(pid);
    if (!opd) continue;
    if (typeof r.setDataValue === "function") r.setDataValue("opdPenanggungJawab", opd);
    else r.opdPenanggungJawab = opd;
  }
}

/**
 * Filter jenis_dokumen untuk GET by-arah: wizard sering mengirim label panjang
 * sedangkan baris DB menyimpan "RPJMD".
 */
function buildJenisDokumenWhere(jenis_dokumen) {
  if (jenis_dokumen == null || String(jenis_dokumen).trim() === "") return {};
  const j = String(jenis_dokumen).trim();
  const variants = new Set([j, j.toUpperCase(), j.toLowerCase()]);
  if (/rpjmd/i.test(j)) variants.add("RPJMD");
  return { jenis_dokumen: { [Op.in]: [...variants] } };
}

/* ── Normalisasi & default sebelum simpan ── */
const applyDefaults = (data, periode) => {
  if (!periode?.id && !data.periode_id) {
    throw new Error("Periode tidak ditemukan.");
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
  if (!item.target_akhir && item.target_tahun_5)
    item.target_akhir = item.target_tahun_5;
  if (!item.tahun_akhir && item.target_tahun_5) item.tahun_akhir = item.tahun;
  normalizeDecimalFields(item);
  return item;
};

/* ── POST / (bulk create) ── */
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
        return sendValidationErrors(
          res,
          409,
          { kode_indikator: ["Data sudah ada untuk kombinasi ini."] },
          { message: "Data duplikat." },
        );
      }
      if (err.name === "SequelizeValidationError") {
        return sendValidationErrors(
          res,
          400,
          fromSequelizeValidationError(err),
          { message: err.message },
        );
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

    const tahunStr = String(tahun).trim();
    const effectiveJenisDokumen = await preferPeriodeNamaIfExists({
      model: IndikatorArahKebijakan,
      jenis_dokumen,
      tahun: tahunStr,
    });

    const { count, rows } = await IndikatorArahKebijakan.findAndCountAll({
      where: { jenis_dokumen: effectiveJenisDokumen, tahun: tahunStr },
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
      limit,
      offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    // Legacy/import: baseline sering NULL padahal capaian_tahun_5 terisi → tampilkan baseline fallback agar UI list tidak kosong.
    fillBaselineFallback(rows);
    await fillPenanggungJawabFallback({
      rows,
      tahun: tahunStr,
      jenis_dokumen: effectiveJenisDokumen,
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
    const {
      arah_kebijakan_id,
      tahun,
      jenis_dokumen,
      page = 1,
      perPage = 50,
    } = req.query;
    if (!arah_kebijakan_id)
      return res
        .status(400)
        .json({ message: "arah_kebijakan_id wajib diisi." });

    const limit = Math.min(parseInt(perPage, 10) || 50, MAX_LIMIT);
    const offset = (parseInt(page, 10) - 1) * limit;
    const where = { arah_kebijakan_id };
    if (tahun != null && String(tahun).trim() !== "") {
      where.tahun = String(tahun).trim();
    }
    Object.assign(where, buildJenisDokumenWhere(jenis_dokumen));

    const { count, rows } = await IndikatorArahKebijakan.findAndCountAll({
      where,
      include: [
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["id", "nama_opd"],
          required: false,
        },
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] },
      limit,
      offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    fillBaselineFallback(rows);
    await fillPenanggungJawabFallback({
      rows,
      tahun: where.tahun || tahun,
      jenis_dokumen: jenis_dokumen,
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
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET /:arah_kebijakan_id/next-kode ── */
exports.getNextKode = async (req, res) => {
  try {
    const { arah_kebijakan_id } = req.params;
    if (!arah_kebijakan_id)
      return res
        .status(400)
        .json({ message: "arah_kebijakan_id wajib diisi." });

    const arahKebijakan = await ArahKebijakan.findByPk(arah_kebijakan_id);
    if (!arahKebijakan)
      return res
        .status(404)
        .json({ message: "Arah Kebijakan tidak ditemukan." });

    const prefix = arahKebijakan.kode_arah || `AK-${arah_kebijakan_id}`;

    const result = await IndikatorArahKebijakan.findOne({
      where: {
        arah_kebijakan_id,
        kode_indikator: { [Op.like]: `${prefix}-%` },
      },
      attributes: [
        [
          sequelize.fn(
            "MAX",
            sequelize.literal(
              "CAST(SUBSTRING_INDEX(kode_indikator,'-',-1) AS UNSIGNED)",
            ),
          ),
          "maxNumber",
        ],
      ],
      raw: true,
    });

    const next = (result?.maxNumber || 0) + 1;
    return res.json({
      status: "success",
      next_kode: `${prefix}-${String(next).padStart(2, "0")}`,
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET /:id ── */
exports.findOne = async (req, res) => {
  try {
    const record = await IndikatorArahKebijakan.findByPk(req.params.id, {
      include: [
        {
          model: ArahKebijakan,
          as: "arahKebijakan",
          attributes: ["id", "kode_arah", "deskripsi"],
        },
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["id", "nama_opd"],
        },
      ],
    });
    if (!record)
      return res.status(404).json({ message: "Indikator tidak ditemukan." });

    fillBaselineFallback([record]);
    await fillPenanggungJawabFallback({
      rows: [record],
      tahun: record.tahun,
      jenis_dokumen: record.jenis_dokumen,
    });

    return res.json({ status: "success", data: record });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── PUT /:id ── */
exports.update = async (req, res) => {
  try {
    const record = await IndikatorArahKebijakan.findByPk(req.params.id);
    if (!record)
      return res
        .status(404)
        .json({ message: `Indikator ID ${req.params.id} tidak ditemukan.` });

    const tahun = req.body?.tahun || record.tahun || new Date().getFullYear();
    const periode =
      (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());
    await record.update(applyDefaults(req.body, periode));
    return res.json({ status: "success", data: record });
  } catch (err) {
    if (err.name === "SequelizeValidationError")
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), {
        message: err.message,
      });
    if (err.name === "SequelizeUniqueConstraintError")
      return sendValidationErrors(
        res,
        409,
        { kode_indikator: ["Kode indikator bentrok."] },
        { message: err.message },
      );
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── DELETE /:id ── */
exports.delete = async (req, res) => {
  try {
    const record = await IndikatorArahKebijakan.findByPk(req.params.id);
    if (!record)
      return res.status(404).json({ message: "Indikator tidak ditemukan." });
    await record.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};
