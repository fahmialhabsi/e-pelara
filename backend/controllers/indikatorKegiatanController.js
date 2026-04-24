const {
  sequelize,
  IndikatorKegiatan,
  IndikatorProgram,
  Program,
  Kegiatan,
  OpdPenanggungJawab,
} = require("../models");
const { Op, fn, col, where: sqlWhere } = require("sequelize");
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

const allowedFields = [
  "misi_id",
  "tujuan_id",
  "sasaran_id",
  "kegiatan_id",
  "program_id",
  "indikator_program_id",
  "kode_indikator",
  "nama_indikator",
  "jenis",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "jenis_indikator",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "satuan",
  "definisi_operasional",
  "metode_penghitungan",
  "baseline",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "sumber_data",
  "penanggung_jawab",
  "keterangan",
  "rekomendasi_ai",
  "target_awal",
  "tahun_awal",
  "target_akhir",
  "tahun_akhir",
];

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

async function fillPenanggungJawabFallback(rows) {
  const opdIds = new Set();

  for (const r of rows) {
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    if (pj != null && String(pj).trim() !== "") opdIds.add(Number(pj));
  }

  for (const r of rows) {
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    if (pj != null && String(pj).trim() !== "") continue;

    const fromIndProg =
      r?.indikatorProgram?.penanggung_jawab ??
      r?.get?.("indikatorProgram")?.penanggung_jawab;
    const fromProgram =
      r?.program?.opd_penanggung_jawab ?? r?.get?.("program")?.opd_penanggung_jawab;

    const fill = fromIndProg ?? fromProgram ?? null;
    if (fill == null || String(fill).trim() === "") continue;

    if (typeof r.setDataValue === "function") r.setDataValue("penanggung_jawab", fill);
    else r.penanggung_jawab = fill;
    opdIds.add(Number(fill));
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
    const assoc =
      r?.opdPenanggungJawab ?? r?.get?.("opdPenanggungJawab") ?? null;
    if (assoc != null) continue;
    const pj = r?.penanggung_jawab ?? r?.get?.("penanggung_jawab");
    const pid = Number(pj);
    if (!Number.isFinite(pid)) continue;
    const opd = opdById.get(pid);
    if (!opd) continue;
    if (typeof r.setDataValue === "function") r.setDataValue("opdPenanggungJawab", opd);
    else r.opdPenanggungJawab = opd;
  }
}

function filterAllowedFields(row, allowed) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => allowed.includes(key)),
  );
}

function buildMeta(count, limit, page) {
  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: Number(page),
  };
}

async function findIndikatorKegiatan(where, safeLimit, offset) {
  return IndikatorKegiatan.findAndCountAll({
    where,
    include: [
      {
        model: Program,
        as: "program",
        attributes: { exclude: ["createdAt", "updatedAt"] },
      },
      {
        model: IndikatorProgram,
        as: "indikatorProgram",
        attributes: ["id", "penanggung_jawab"],
        required: false,
        include: [
          {
            model: OpdPenanggungJawab,
            as: "opdPenanggungJawab",
            attributes: ["id", "nama_opd", "nama_bidang_opd"],
            required: false,
          },
        ],
      },
      {
        model: OpdPenanggungJawab,
        as: "opdPenanggungJawab",
        attributes: ["id", "nama_opd", "nama_bidang_opd"],
        required: false,
      },
    ],
    attributes: {
      exclude: ["createdAt", "updatedAt"],
    },
    limit: safeLimit,
    offset,
    order: [["id", "ASC"]],
    distinct: true,
  });
}

async function sanitizeAndFill(row, overrides = {}) {
  const cleanRow = { ...row };
  const tahun = row.tahun || new Date().getFullYear();
  const periode =
    (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());

  if (!periode?.id) throw new Error("Periode tidak ditemukan");
  const data = filterAllowedFields(cleanRow, allowedFields);

  data.tipe_indikator = "Proses";
  data.periode_id = periode.id;
  data.jenis_dokumen = row.jenis_dokumen || periode.nama;
  data.tahun = row.tahun || String(periode.tahun_awal);

  const capaian = row.capaian_tahun_5;
  const target5 = row.target_tahun_5;
  const tahunSekarang = row.tahun || new Date().getFullYear();

  if (capaian != null) {
    data.baseline = capaian;
    data.target_awal = capaian;
    data.tahun_awal = tahunSekarang;
  }

  if (!data.target_akhir && target5 != null) {
    data.target_akhir = target5;
  }

  if (!data.tahun_akhir && target5 != null) {
    data.tahun_akhir = tahunSekarang;
  }

  return {
    ...data,
    program_id: row.program_id ?? overrides.program_id,
    indikator_program_id:
      row.indikator_program_id ?? overrides.indikator_program_id,
    ...overrides,
  };
}

exports.getAll = async (req, res) => {
  try {
    const {
      jenis_dokumen,
      tahun,
      program_id,
      kegiatan_id,
      indikator_program_id,
      page = 1,
      limit = 50,
    } = req.query;

    if (!jenis_dokumen || !tahun) {
      return res.status(400).json({
        message: "jenis_dokumen dan tahun wajib diisi.",
      });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    const safeLimit = Math.min(Number(limit) || 50, MAX_LIMIT);
    const offset = (Number(page) - 1) * safeLimit;

    const effectiveJenisDokumen = await preferPeriodeNamaIfExists({
      model: IndikatorKegiatan,
      jenis_dokumen,
      tahun,
    });

    const where = { jenis_dokumen: effectiveJenisDokumen, tahun };
    let selectedKegiatan = null;

    if (
      indikator_program_id != null &&
      String(indikator_program_id).trim() !== ""
    ) {
      const ipNum = Number(indikator_program_id);
      if (Number.isFinite(ipNum)) where.indikator_program_id = ipNum;
    }

    if (program_id) {
      where.program_id = program_id;
    } else if (kegiatan_id) {
      selectedKegiatan = await Kegiatan.findByPk(kegiatan_id, {
        attributes: ["id", "program_id", "kode_kegiatan", "jenis_dokumen"],
      });

      if (!selectedKegiatan?.program_id) {
        return res.status(200).json({
          data: [],
          meta: buildMeta(0, safeLimit, page),
        });
      }

      // Tabel indikatorkegiatans tidak punya kolom kegiatan_id.
      // Secara default filter diarahkan ke program induk dari kegiatan yang dipilih.
      // Namun untuk wizard (yang mengirim indikator_program_id), data impor lama sering
      // menyimpan `program_id` = NULL. Dalam konteks itu, jangan memaksa program_id,
      // cukup gunakan indikator_program_id agar auto-fill (nama indikator, target, dll) tetap muncul.
      if (where.indikator_program_id == null) {
        where.program_id = selectedKegiatan.program_id;
      }
    }

    let { count, rows } = await findIndikatorKegiatan(where, safeLimit, offset);

    // Legacy/import: baseline & PJ sering NULL padahal sudah ada data pendukung (capaian th.5 / indikator program / program OPD).
    fillBaselineFallback(rows);
    await fillPenanggungJawabFallback(rows);

    if (count === 0 && kegiatan_id && jenis_dokumen !== "rpjmd") {
      const sourceKegiatan =
        selectedKegiatan?.jenis_dokumen === "rpjmd"
          ? selectedKegiatan
          : await Kegiatan.findOne({
              where: {
                kode_kegiatan: selectedKegiatan?.kode_kegiatan,
                jenis_dokumen: "rpjmd",
                tahun,
              },
              attributes: ["id", "program_id"],
            });

      if (sourceKegiatan?.program_id) {
        const fallback = await findIndikatorKegiatan(
          {
            jenis_dokumen: "rpjmd",
            tahun,
            program_id: sourceKegiatan.program_id,
          },
          safeLimit,
          offset,
        );

        count = fallback.count;
        rows = fallback.rows;
      }
    }

    return res.status(200).json({
      data: rows,
      meta: buildMeta(count, safeLimit, page),
    });
  } catch (err) {
    console.error("getAll indikatorKegiatan error:", err);
    return res.status(500).json({
      message: "Error fetching indikator kegiatan",
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const kegiatan = await IndikatorKegiatan.findByPk(req.params.id, {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          model: Program,
          as: "program",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["id", "nama_opd", "nama_bidang_opd"],
          required: false,
        },
        {
          model: IndikatorProgram,
          as: "indikatorProgram",
          attributes: ["id", "penanggung_jawab"],
          required: false,
          include: [
            {
              model: OpdPenanggungJawab,
              as: "opdPenanggungJawab",
              attributes: ["id", "nama_opd", "nama_bidang_opd"],
              required: false,
            },
          ],
        },
      ],
    });

    if (!kegiatan) {
      return res.status(404).json({ message: "Indikator Kegiatan not found" });
    }

    fillBaselineFallback([kegiatan]);
    await fillPenanggungJawabFallback([kegiatan]);

    return res.status(200).json(kegiatan);
  } catch (err) {
    console.error("getById error:", err);
    return res.status(500).json({
      message: "Error fetching indikator kegiatan",
    });
  }
};

exports.create = async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const sanitized = await Promise.all(rows.map((r) => sanitizeAndFill(r)));

    console.log("sanitize data:", sanitized);

    sanitized.forEach(normalizeDecimalFields);
    const created = await IndikatorKegiatan.bulkCreate(sanitized);

    return res.status(201).json(created);
  } catch (err) {
    console.error("❌ create error:", err);
    if (err.name === "SequelizeUniqueConstraintError") {
      return sendValidationErrors(
        res,
        409,
        {
          kode_indikator: [
            "Data dengan kombinasi kode_indikator, jenis_dokumen, dan tahun sudah ada.",
          ],
        },
        {
          message:
            "Data dengan kombinasi kode_indikator, jenis_dokumen, dan tahun sudah ada.",
        },
      );
    }
    if (err.name === "SequelizeValidationError") {
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), {
        message: err.message,
      });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.bulkCreateDetail = async (req, res) => {
  try {
    const parentId = req.params.id;
    if (!parentId) {
      return sendValidationErrors(
        res,
        400,
        { indikator_program_id: ["Parent indikator ID wajib diisi."] },
        { message: "Parent indikator ID wajib diisi." },
      );
    }

    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const sanitized = await Promise.all(
      rows.map((r) => sanitizeAndFill(r, { indikator_program_id: parentId })),
    );

    sanitized.forEach(normalizeDecimalFields);

    try {
      const created = await IndikatorKegiatan.bulkCreate(sanitized);
      return res.status(201).json(created);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return sendValidationErrors(
          res,
          409,
          {
            kode_indikator: [
              "Terdapat data duplikat berdasarkan kode_indikator, jenis_dokumen, dan tahun.",
            ],
          },
          {
            message:
              "Terdapat data duplikat berdasarkan kode_indikator, jenis_dokumen, dan tahun.",
          },
        );
      }
      if (err.name === "SequelizeValidationError") {
        return sendValidationErrors(
          res,
          400,
          fromSequelizeValidationError(err),
          {
            message: err.message,
          },
        );
      }
      return res.status(500).json({ message: err.message });
    }
  } catch (err) {
    console.error("❌ bulkCreateDetail error:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getNextKode = async (req, res) => {
  try {
    const { kegiatan_id } = req.params;
    const { tahun, jenis_dokumen } = req.query;

    if (!kegiatan_id) {
      return res.status(400).json({ message: "kegiatan_id wajib diisi." });
    }

    const kegiatan = await Kegiatan.findByPk(kegiatan_id);
    if (!kegiatan) {
      return res.status(404).json({ message: "Kegiatan tidak ditemukan." });
    }

    if (!kegiatan.kode_kegiatan) {
      return res
        .status(400)
        .json({ message: "Kegiatan belum memiliki 'kode_kegiatan'." });
    }

    const tahunStr =
      tahun != null && String(tahun).trim() !== ""
        ? String(tahun).trim()
        : String(new Date().getFullYear());
    const jenisLc =
      jenis_dokumen != null && String(jenis_dokumen).trim() !== ""
        ? String(jenis_dokumen).trim().toLowerCase()
        : null;

    // Standar kode indikator kegiatan (RPJMD): IPK-<kode_kegiatan>-NN
    const prefix = `IPK-${String(kegiatan.kode_kegiatan).trim()}`;

    const andParts = [
      { tahun: tahunStr },
      ...(jenisLc
        ? [sqlWhere(fn("LOWER", col("jenis_dokumen")), jenisLc)]
        : []),
      { kode_indikator: { [Op.like]: `${prefix}-%` } },
    ];

    const result = await IndikatorKegiatan.findOne({
      where: { [Op.and]: andParts },
      attributes: [
        [
          sequelize.fn(
            "MAX",
            sequelize.literal(
              "CAST(SUBSTRING_INDEX(kode_indikator,'-',-1) AS UNSIGNED)"
            )
          ),
          "maxNumber",
        ],
      ],
      raw: true,
    });

    const next = (result?.maxNumber || 0) + 1;
    const next_kode = `${prefix}-${String(next).padStart(2, "0")}`;

    return res.json({ next_kode });
  } catch (err) {
    console.error("❌ Gagal generate kode indikator:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const kegiatan = await IndikatorKegiatan.findByPk(req.params.id);
    if (!kegiatan) {
      return res.status(404).json({ message: "Indikator Kegiatan not found" });
    }
    const updateData = await sanitizeAndFill(req.body);

    console.log("🛠 update data:", updateData);

    await kegiatan.update(updateData);
    normalizeDecimalFields(updateData);

    return res.status(200).json(kegiatan);
  } catch (err) {
    console.error("❌ update error:", err);
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
    return res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const kegiatan = await IndikatorKegiatan.findByPk(req.params.id);
    if (!kegiatan) {
      return res.status(404).json({ message: "Indikator Kegiatan not found" });
    }

    await kegiatan.destroy();
    return res.status(204).json();
  } catch (err) {
    console.error("❌ delete error:", err);
    return res.status(500).json({ message: err.message });
  }
};
