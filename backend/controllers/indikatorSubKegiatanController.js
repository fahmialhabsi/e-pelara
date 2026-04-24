// controllers/indikatorSubKegiatanController.js
const {
  sequelize,
  IndikatorSubKegiatan,
  SubKegiatan,
  OpdPenanggungJawab,
  Program,
} = require("../models");
const { Op, fn, col, where: sqlWhere } = require("sequelize");
const { normalizeDecimalFields } = require("../utils/normalizeDecimal");
const {
  getPeriodeFromTahun,
  getPeriodeAktif,
} = require("../utils/periodeHelper");
const {
  sendValidationErrors,
  fromSequelizeValidationError,
} = require("../utils/validationErrorResponse");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");

const MAX_LIMIT = 200;

function buildDocJenisClause(jdRaw) {
  const jenisLc = String(jdRaw ?? "").trim().toLowerCase();
  const left = fn("LOWER", fn("TRIM", col("jenis_dokumen")));
  if (!jenisLc) return null;
  if (jenisLc === "rpjmd") return sqlWhere(left, { [Op.like]: "rpjmd%" });
  return sqlWhere(left, jenisLc);
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

async function fillPenanggungJawabFallbackFromProgram(rows) {
  const programIds = new Set();
  for (const r of rows) {
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    const pid = r?.program_id ?? r?.get?.("program_id");
    if ((pj == null || String(pj).trim() === "") && pid != null && String(pid).trim() !== "") {
      const n = Number.parseInt(String(pid), 10);
      if (Number.isFinite(n)) programIds.add(n);
    }
  }
  const ids = [...programIds];
  if (ids.length === 0) return;

  const programs = await Program.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ["id", "opd_penanggung_jawab"],
    raw: true,
  });
  const opdByProgram = new Map(
    programs
      .filter((p) => p.opd_penanggung_jawab != null)
      .map((p) => [Number(p.id), p.opd_penanggung_jawab]),
  );

  const opdIds = new Set();
  for (const r of rows) {
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    if (pj != null && String(pj).trim() !== "") opdIds.add(Number(pj));

    if (pj == null || String(pj).trim() === "") {
      const pid = Number.parseInt(String(r?.program_id ?? r?.get?.("program_id") ?? ""), 10);
      if (!Number.isFinite(pid)) continue;
      const fill = opdByProgram.get(pid);
      if (fill == null || String(fill).trim() === "") continue;
      if (typeof r.setDataValue === "function") r.setDataValue("penanggung_jawab", fill);
      else r.penanggung_jawab = fill;
      opdIds.add(Number(fill));
    }
  }

  const opdIdList = [...opdIds].filter((n) => Number.isFinite(n) && n >= 1);
  if (opdIdList.length === 0) return;
  const opdRows = await OpdPenanggungJawab.findAll({
    where: { id: { [Op.in]: opdIdList } },
    attributes: ["id", "nama_opd", "nama_bidang_opd"],
    raw: true,
  });
  const opdById = new Map(opdRows.map((o) => [Number(o.id), o]));

  for (const r of rows) {
    const assoc =
      r?.opdPenanggungJawab ?? r?.get?.("opdPenanggungJawab") ?? null;
    if (assoc != null) continue;
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    const id = Number(pj);
    if (!Number.isFinite(id)) continue;
    const opd = opdById.get(id);
    if (!opd) continue;
    if (typeof r.setDataValue === "function") r.setDataValue("opdPenanggungJawab", opd);
    else r.opdPenanggungJawab = opd;
  }
}

/**
 * Filter opsional (sama pola indikator-program): baris terikat sub_kegiatan_id,
 * atau legacy (sub_kegiatan_id NULL) yang masih terikat kegiatan_id induk.
 */
/**
 * Tahun di baris sering = tahun_awal periode (wizard/defaults), sementara
 * konteks UI memakai tahun berjalan di rentang RPJMD yang sama — OR periode_id.
 */
async function buildTahunClause(tahunStr) {
  const trimmed = String(tahunStr ?? "").trim();
  const parts = [sqlWhere(fn("TRIM", col("tahun")), trimmed)];
  const periodeRow = await getPeriodeFromTahun(trimmed);
  if (periodeRow?.id != null) {
    parts.push({ periode_id: periodeRow.id });
  }
  return parts.length > 1 ? { [Op.or]: parts } : parts[0];
}

async function buildScopeFilter(subRaw, kegRaw) {
  const sidStr = subRaw != null ? String(subRaw).trim() : "";
  const kidStr = kegRaw != null ? String(kegRaw).trim() : "";

  if (sidStr !== "") {
    const sid = Number.parseInt(sidStr, 10);
    if (!Number.isFinite(sid)) return null;
    const subRow = await SubKegiatan.findByPk(sid, {
      attributes: ["id", "kegiatan_id"],
    });
    const parts = [{ sub_kegiatan_id: sid }];
    const kfs = subRow?.kegiatan_id;
    if (kfs != null) {
      parts.push({
        [Op.and]: [
          { sub_kegiatan_id: { [Op.is]: null } },
          { kegiatan_id: kfs },
        ],
      });
    }
    return { [Op.or]: parts };
  }

  if (kidStr !== "") {
    const kid = Number.parseInt(kidStr, 10);
    if (!Number.isFinite(kid)) return null;
    const subRows = await SubKegiatan.findAll({
      where: { kegiatan_id: kid },
      attributes: ["id"],
      raw: true,
    });
    const subIds = subRows
      .map((r) => Number(r.id))
      .filter((n) => Number.isFinite(n));
    const parts = [{ kegiatan_id: kid }];
    if (subIds.length) parts.push({ sub_kegiatan_id: { [Op.in]: subIds } });
    return { [Op.or]: parts };
  }

  return null;
}

/** Tabel indikatorsubkegiatans: ENUM Sequelize = Outcome|Output|Impact|Process|Input (bukan "Proses" seperti indikator kegiatan). */
const SUB_KEGIATAN_TIPE_ALIASES = { Proses: "Process", proses: "Process" };

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
  const rawTipe =
    item.tipe_indikator != null ? String(item.tipe_indikator).trim() : "";
  if (rawTipe && SUB_KEGIATAN_TIPE_ALIASES[rawTipe]) {
    item.tipe_indikator = SUB_KEGIATAN_TIPE_ALIASES[rawTipe];
  }
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
      const created = await IndikatorSubKegiatan.bulkCreate(withDefaults, {
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
      jenis_dokumen: jdRaw,
      tahun: tahunRaw,
      page = 1,
      limit: limitQ,
      perPage,
      sub_kegiatan_id: subQ,
      kegiatan_id: kegQ,
    } = req.query;
    const rawLimit = Number(limitQ ?? perPage ?? 50) || 50;
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset = (pageNum - 1) * limit;

    if (
      jdRaw === undefined ||
      jdRaw === null ||
      String(jdRaw).trim() === "" ||
      tahunRaw === undefined ||
      tahunRaw === null ||
      String(tahunRaw).trim() === ""
    ) {
      return res.status(400).json({
        status: "error",
        message: "Parameter jenis_dokumen dan tahun wajib diisi.",
      });
    }

    const jenisLc = String(jdRaw).trim().toLowerCase();
    const tahunStr = String(tahunRaw).trim();

    await ensureClonedOnce(jdRaw, tahunStr);

    const docJenisClause = buildDocJenisClause(jdRaw);
    const tahunClause = await buildTahunClause(tahunStr);

    const scopeClause = await buildScopeFilter(subQ, kegQ);
    const baseAndParts = [docJenisClause, tahunClause].filter(Boolean);
    if (scopeClause) baseAndParts.push(scopeClause);

    const baseWhere = () => ({ [Op.and]: baseAndParts });

    const runList = (where) =>
      IndikatorSubKegiatan.findAndCountAll({
        where,
        attributes: { exclude: ["createdAt", "updatedAt"] },
        limit,
        offset,
        order: [["id", "ASC"]],
        distinct: true,
      });

    let { count, rows } = await runList(baseWhere());

    /* Data legacy / clone: sama pola indikator-kegiatan — coba sumber RPJMD */
    if (count === 0 && jenisLc !== "rpjmd") {
      const fbParts = [buildDocJenisClause("rpjmd"), tahunClause].filter(Boolean);
      if (scopeClause) fbParts.push(scopeClause);
      const fb = await runList({ [Op.and]: fbParts });
      count = fb.count;
      rows = fb.rows;
    }

    /* Relasi untuk response (tanpa mem-pengaruhi WHERE / distinct di atas) */
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const withInc = await IndikatorSubKegiatan.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          {
            model: SubKegiatan,
            as: "subKegiatan",
            attributes: ["id", "kegiatan_id", "kode_sub_kegiatan", "nama_sub_kegiatan"],
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
        order: [["id", "ASC"]],
      });
      const byId = new Map(withInc.map((r) => [r.id, r]));
      rows = ids.map((id) => byId.get(id)).filter(Boolean);
    }

    const totalPages = Math.max(1, Math.ceil(count / limit));

    fillBaselineFallback(rows);
    await fillPenanggungJawabFallbackFromProgram(rows);
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

/* ── GET /?sub_kegiatan_id=X  (filter by parent) ── */
exports.findBySubKegiatan = async (req, res) => {
  try {
    const { sub_kegiatan_id, kegiatan_id, tahun, jenis_dokumen, page = 1, perPage = 50 } = req.query;
    if (!sub_kegiatan_id && !kegiatan_id) {
      return res.status(400).json({ message: "sub_kegiatan_id atau kegiatan_id wajib diisi." });
    }

    const limit  = Math.min(parseInt(perPage, 10) || 50, MAX_LIMIT);
    const offset = (parseInt(page, 10) - 1) * limit;
    const andParts = [];
    if (sub_kegiatan_id) andParts.push({ sub_kegiatan_id });
    if (kegiatan_id) andParts.push({ kegiatan_id });
    if (tahun != null && String(tahun).trim() !== "") {
      andParts.push(await buildTahunClause(String(tahun).trim()));
    }
    if (jenis_dokumen) {
      const jlc = String(jenis_dokumen).trim().toLowerCase();
      andParts.push(
        sqlWhere(fn("LOWER", fn("TRIM", col("jenis_dokumen"))), jlc)
      );
    }
    const where = andParts.length ? { [Op.and]: andParts } : {};

    const { count, rows } = await IndikatorSubKegiatan.findAndCountAll({
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

/* ── GET /:sub_kegiatan_id/next-kode ── */
exports.getNextKode = async (req, res) => {
  try {
    const { sub_kegiatan_id } = req.params;
    if (!sub_kegiatan_id) return res.status(400).json({ message: "sub_kegiatan_id wajib diisi." });

    const subKegiatan = await SubKegiatan.findByPk(sub_kegiatan_id);
    if (!subKegiatan) return res.status(404).json({ message: "Sub Kegiatan tidak ditemukan." });

    const { tahun, jenis_dokumen, indikator_kegiatan_kode_indikator } = req.query;

    const tahunStr =
      tahun != null && String(tahun).trim() !== ""
        ? String(tahun).trim()
        : String(new Date().getFullYear());
    const jenisLc =
      jenis_dokumen != null && String(jenis_dokumen).trim() !== ""
        ? String(jenis_dokumen).trim().toLowerCase()
        : null;

    // Basis IPSK: ambil dari kode indikator kegiatan (IPK-... -> ...), lalu tambahkan .NN
    const rawKegKode =
      indikator_kegiatan_kode_indikator != null
        ? String(indikator_kegiatan_kode_indikator).trim()
        : "";
    const kegBase = rawKegKode.toUpperCase().startsWith("IPK-")
      ? rawKegKode.slice(4).trim()
      : rawKegKode;

    const useIpsk = kegBase && kegBase.length > 0;
    const prefix = useIpsk
      ? `IPSK-${kegBase}`
      : subKegiatan.kode_sub_kegiatan || `SK-${sub_kegiatan_id}`;

    if (!useIpsk) {
      const result = await IndikatorSubKegiatan.findOne({
        where: {
          sub_kegiatan_id,
          ...(tahunStr ? { tahun: tahunStr } : {}),
          ...(jenisLc
            ? {
                [Op.and]: [
                  sqlWhere(fn("LOWER", fn("TRIM", col("jenis_dokumen"))), jenisLc),
                ],
              }
            : {}),
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
    }

    // Untuk IPSK-... gunakan suffix .NN (2 digit) agar kode tetap mudah dibaca.
    const dotResult = await IndikatorSubKegiatan.findOne({
      where: {
        ...(tahunStr ? { tahun: tahunStr } : {}),
        ...(jenisLc
          ? { [Op.and]: [sqlWhere(fn("LOWER", fn("TRIM", col("jenis_dokumen"))), jenisLc)] }
          : {}),
        kode_indikator: { [Op.like]: `${prefix}.%` },
      },
      attributes: [
        [
          sequelize.fn(
            "MAX",
            sequelize.literal(
              "CAST(SUBSTRING_INDEX(kode_indikator,'.',-1) AS UNSIGNED)",
            ),
          ),
          "maxNumber",
        ],
      ],
      raw: true,
    });

    const next = (dotResult?.maxNumber || 0) + 1;
    return res.json({
      status: "success",
      next_kode: `${prefix}.${String(next).padStart(2, "0")}`,
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── GET /:id ── */
exports.findOne = async (req, res) => {
  try {
    const record = await IndikatorSubKegiatan.findByPk(req.params.id, {
      include: [
        { model: SubKegiatan, as: "subKegiatan", attributes: ["id", "kegiatan_id", "kode_sub_kegiatan", "nama_sub_kegiatan"] },
        { model: OpdPenanggungJawab, as: "opdPenanggungJawab", attributes: ["id", "nama_opd", "nama_bidang_opd"] },
      ],
    });
    if (!record) return res.status(404).json({ message: "Indikator tidak ditemukan." });

    fillBaselineFallback([record]);
    await fillPenanggungJawabFallbackFromProgram([record]);
    return res.json({ status: "success", data: record });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};

/* ── PUT /:id ── */
exports.update = async (req, res) => {
  try {
    const record = await IndikatorSubKegiatan.findByPk(req.params.id);
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
    const record = await IndikatorSubKegiatan.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: "Indikator tidak ditemukan." });
    await record.destroy();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
};
