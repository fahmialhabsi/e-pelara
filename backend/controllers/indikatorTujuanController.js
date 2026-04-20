const {
  sequelize,
  Tujuan,
  IndikatorTujuan,
  SubKegiatan,
} = require("../models");
const { Op } = require("sequelize");
const { normalizeDecimalFields } = require("../utils/normalizeDecimal");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const redisClient = require("../utils/redisClient");
const { safeGet, safeSetEx } = require("../utils/safeRedis");
const {
  getPeriodeFromTahun,
  getPeriodeAktif,
} = require("../utils/periodeHelper");

const allowedFields = [
  "misi_id",
  "tujuan_id",
  "kode_indikator",
  "nama_indikator",
  "tipe_indikator",
  "jenis",
  "indikator_kinerja",
  "tolok_ukur_kinerja",
  "target_kinerja",
  "jenis_indikator",
  "kriteria_kuantitatif",
  "kriteria_kualitatif",
  "satuan",
  "definisi_operasional",
  "metode_penghitungan",
  "baseline",
  "target_awal",
  "tahun_awal",
  "target_tahun_1",
  "target_tahun_2",
  "target_tahun_3",
  "target_tahun_4",
  "target_tahun_5",
  "target_akhir",
  "tahun_akhir",
  "sumber_data",
  "penanggung_jawab",
  "keterangan",
  "rekomendasi_ai",
  "capaian_tahun_1",
  "capaian_tahun_2",
  "capaian_tahun_3",
  "capaian_tahun_4",
  "capaian_tahun_5",
  "jenis_dokumen",
  "tahun",
  "periode_id",
];

const MAX_LIMIT = 200;

async function sanitizeAndFill(row, overrides = {}) {
  const data = Object.fromEntries(
    Object.entries(row).filter(([key]) => allowedFields.includes(key))
  );

  // Mirror indikator_kinerja ↔ jenis for backward compatibility
  if (data.indikator_kinerja && !data.jenis) data.jenis = data.indikator_kinerja;
  if (data.jenis && !data.indikator_kinerja) data.indikator_kinerja = data.jenis;

  let periode = null;

  if (!data.periode_id) {
    const tahun = row.tahun || new Date().getFullYear();
    periode = (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());
    data.periode_id = periode?.id;
    data.jenis_dokumen = row.jenis_dokumen || periode?.nama;
    data.tahun = row.tahun || String(periode?.tahun_awal);

    if (!data.jenis_dokumen) {
      throw new Error("jenis_dokumen tidak boleh kosong");
    }
    if (!data.tahun) {
      throw new Error("tahun tidak boleh kosong");
    }
  } else {
    data.tahun = row.tahun || new Date().getFullYear().toString();
    data.jenis_dokumen = row.jenis_dokumen || "RPJMD";
  }

  const capaian = row.capaian_tahun_5;
  const target5 = row.target_tahun_5;
  const tahunSekarang = data.tahun;

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

  return { ...data, ...overrides };
}

async function getNextKode(req, res) {
  try {
    const { tujuan_id } = req.params;
    const { tahun, jenis_dokumen } = req.query;

    // Validasi parameter wajib
    if (!tahun || !jenis_dokumen) {
      return res
        .status(400)
        .json({ message: "Parameter tahun dan jenis_dokumen wajib diisi" });
    }

    // Cek apakah tujuan ada
    const tujuan = await Tujuan.findByPk(tujuan_id);
    if (!tujuan) {
      return res.status(404).json({ message: "Tujuan tidak ditemukan" });
    }

    // Ambil kode indikator terakhir dan buat kode berikutnya
    const existing = await IndikatorTujuan.findAll({
      attributes: ["kode_indikator"],
      where: {
        kode_indikator: { [Op.like]: `${tujuan.no_tujuan}-%` },
        tahun: Number(tahun),
        jenis_dokumen: jenis_dokumen.toUpperCase(),
      },
      order: [["kode_indikator", "DESC"]],
    });

    const suffixes = existing
      .map((e) => parseInt(e.kode_indikator.split("-").pop()))
      .filter(Number.isFinite);

    const nextSuffix = String(Math.max(...suffixes, 0) + 1).padStart(2, "0");
    const kode = `${tujuan.no_tujuan}-${nextSuffix}`;

    res.json({ kode });
  } catch (err) {
    console.error("❌ Error getNextKode:", err);
    res.status(500).json({ message: "Gagal mengambil kode indikator" });
  }
}

async function create(req, res) {
  try {
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const entry of entries) {
      // Pastikan tujuan ada
      const tujuan = await Tujuan.findByPk(entry.tujuan_id);
      if (!tujuan) {
        return res.status(404).json({ message: "Tujuan tidak ditemukan" });
      }

      // Pastikan no_tujuan tidak kosong
      if (!tujuan.no_tujuan) {
        return res.status(400).json({ message: "No tujuan tidak valid" });
      }

      // Sanitasi + lengkapi data
      const sanitized = await sanitizeAndFill(entry); // <-- pakai await

      // Generate kode indikator jika tidak ada
      if (!sanitized.kode_indikator) {
        sanitized.kode_indikator = await generateKodeIndikator(
          tujuan.no_tujuan,
          sanitized.tahun,
          sanitized.jenis_dokumen
        );
      }

      // Normalisasi angka decimal
      const normalized = normalizeDecimalFields(sanitized, [
        "baseline",
        "capaian_tahun_1",
        "capaian_tahun_2",
        "capaian_tahun_3",
        "capaian_tahun_4",
        "capaian_tahun_5",
      ]);

      // Simpan ke DB
      const created = await IndikatorTujuan.create(normalized);
      results.push(created);
    }

    res.status(201).json(results);
  } catch (error) {
    console.error("❌ Error create indikator tujuan:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ message: "Kode indikator sudah digunakan" });
    }
    res.status(500).json({ message: "Gagal membuat indikator tujuan" });
  }
}

async function update(req, res) {
  try {
    const indikator = await IndikatorTujuan.findByPk(req.params.id);
    if (!indikator) {
      return res
        .status(404)
        .json({ message: "Indikator Tujuan tidak ditemukan" });
    }

    const updateData = await sanitizeAndFill(req.body);
    normalizeDecimalFields(updateData);

    await indikator.update(updateData);
    return res.status(200).json(indikator);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

async function bulkCreateDetail(req, res) {
  try {
    const { indikatorId } = req.params;
    const rows = req.body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res
        .status(400)
        .json({ message: "rows harus berupa array tidak kosong" });
    }

    const data = await Promise.all(
      rows.map(async (r) => {
        const sanitized = await sanitizeAndFill(r, {
          id: undefined,
          indikator_id: indikatorId,
          periode_id: r.periode_id,
        });
        normalizeDecimalFields(sanitized);
        return sanitized;
      })
    );

    try {
      const created = await IndikatorTujuan.bulkCreate(data);
      return res.status(201).json(created);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          message:
            "Terdapat data duplikat berdasarkan kode_indikator, jenis_dokumen, dan tahun.",
          fields: err.fields,
        });
      }
      return res.status(500).json({ message: err.message });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

async function findAll(req, res) {
  const {
    misi_id,
    tahun,
    jenis_dokumen,
    periode_id,
    page = 1,
    limit = 50,
  } = req.query;

  try {
    if (!tahun || !jenis_dokumen) {
      return res.status(400).json({
        message: "Parameter tahun dan jenis_dokumen wajib diisi.",
      });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    const safeLimit = Math.min(Number(limit), 200);
    const offset = (Number(page) - 1) * safeLimit;

    const where = {
      tahun,
      [Op.and]: [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("IndikatorTujuan.jenis_dokumen")),
          jenis_dokumen.toLowerCase()
        ),
      ],
    };
    if (periode_id) where.periode_id = periode_id;

    const { Tujuan, OpdPenanggungJawab } = require("../models");

    const include = [
      {
        model: Tujuan,
        as: "Tujuan",
        attributes: ["id", "no_tujuan", "isi_tujuan", "misi_id"],
        where: misi_id ? { misi_id: parseInt(misi_id, 10) } : undefined,
        required: !!misi_id,
      },
      {
        model: OpdPenanggungJawab,
        as: "opdPenanggungJawab",
        attributes: ["id", "nama_opd"],
        required: false,
      },
    ];

    const { count, rows } = await IndikatorTujuan.findAndCountAll({
      where,
      include,
      attributes: { exclude: ["createdAt", "updatedAt"] },
      limit: safeLimit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / safeLimit),
        currentPage: Number(page),
      },
    });
  } catch (err) {
    console.error("❌ Error in findAll indikatorTujuanController:", err.stack);
    return res.status(500).json({ message: err.message });
  }
}

async function findOne(req, res) {
  try {
    const result = await IndikatorTujuan.findByPk(req.params.id, {
      attributes: { exclude: ["createdAt", "updatedAt"] },
      include: [
        {
          association: "sasarans",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
      ],
    });

    if (!result) {
      return res
        .status(404)
        .json({ message: "Indikator Tujuan tidak ditemukan" });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const indikator = await IndikatorTujuan.findByPk(req.params.id);
    if (!indikator) {
      return res
        .status(404)
        .json({ message: "Indikator Tujuan tidak ditemukan" });
    }

    await indikator.destroy();
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

async function listByTujuan(req, res) {
  try {
    const { tujuan_id } = req.query;
    if (!tujuan_id) {
      return res.status(400).json({ message: "tujuan_id diperlukan" });
    }

    const result = await IndikatorTujuan.findAll({ where: { tujuan_id } });
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

async function generateKodeIndikator(kodeTujuan, tahun, jenis_dokumen) {
  // Normalisasi & validasi input
  if (!kodeTujuan || !tahun || !jenis_dokumen) {
    throw new Error(
      "Parameter 'kodeTujuan', 'tahun', dan 'jenis_dokumen' wajib diisi"
    );
  }

  const cleanKodeTujuan = String(kodeTujuan).trim();
  const cleanTahun = parseInt(tahun, 10);
  const cleanJenisDokumen = String(jenis_dokumen).trim().toUpperCase();

  if (!cleanKodeTujuan) {
    throw new Error("kodeTujuan tidak boleh kosong setelah trim");
  }
  if (isNaN(cleanTahun) || cleanTahun < 1900) {
    throw new Error("tahun tidak valid");
  }
  if (!cleanJenisDokumen) {
    throw new Error("jenis_dokumen tidak boleh kosong setelah trim");
  }

  // Ambil kode terakhir
  const existing = await IndikatorTujuan.findAll({
    attributes: ["kode_indikator"],
    where: {
      kode_indikator: { [Op.like]: `${cleanKodeTujuan}-%` },
      tahun: cleanTahun,
      jenis_dokumen: cleanJenisDokumen,
    },
    order: [["kode_indikator", "DESC"]],
  });

  // Hitung suffix berikutnya
  const suffixes = existing
    .map((e) => {
      const parts = String(e.kode_indikator).split("-");
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter(Number.isFinite);

  const nextSuffix = String(Math.max(...suffixes, 0) + 1).padStart(2, "0");

  return `${cleanKodeTujuan}-${nextSuffix}`;
}

async function getNextKode(req, res) {
  try {
    const { tujuan_id } = req.params;
    const { tahun, jenis_dokumen } = req.query;

    if (!tujuan_id) {
      return res.status(400).json({ message: "tujuan_id wajib diisi" });
    }

    // Ambil kode_tujuan dari tabel Tujuan
    const tujuan = await Tujuan.findByPk(tujuan_id, {
      attributes: ["id", "no_tujuan"],
    });
    if (!tujuan || !tujuan.no_tujuan) {
      return res
        .status(404)
        .json({ message: "Tujuan atau no_tujuan tidak ditemukan" });
    }

    const kode = await generateKodeIndikator(
      tujuan.no_tujuan,
      tahun,
      jenis_dokumen
    );

    res.json({ kode });
  } catch (err) {
    console.error("❌ Error getNextKode:", err);
    res
      .status(500)
      .json({ message: err.message || "Gagal ambil kode indikator" });
  }
}

async function getSubKegiatanContext(req, res) {
  const { sub_kegiatan_id } = req.params;

  try {
    const subKegiatan = await SubKegiatan.findOne({
      where: { id: sub_kegiatan_id },
      attributes: ["id", "nama_opd", "nama_bidang_opd", "sub_bidang_opd"],
    });

    if (!subKegiatan) {
      return res.status(404).json({ message: "Sub kegiatan tidak ditemukan." });
    }

    return res.status(200).json(subKegiatan);
  } catch (error) {
    console.error("Error saat ambil sub_kegiatan:", error);
    return res.status(500).json({ message: "Terjadi kesalahan server." });
  }
}

async function getContext(req, res) {
  try {
    const { tujuan_id } = req.query;

    if (!tujuan_id) {
      return res
        .status(400)
        .json({ message: "Parameter tujuan_id wajib diisi." });
    }

    const tujuan = await Tujuan.findByPk(tujuan_id);

    if (!tujuan) {
      return res.status(404).json({ message: "Tujuan tidak ditemukan" });
    }

    return res.status(200).json({
      text: `Tujuan: ${tujuan.no_tujuan} - ${tujuan.isi_tujuan}`,
      tujuan: {
        id: tujuan.id,
        no_tujuan: tujuan.no_tujuan,
        isi_tujuan: tujuan.isi_tujuan,
      },
    });
  } catch (err) {
    console.error("Gagal ambil konteks indikator:", err);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
}

async function findSpecial(req, res) {
  try {
    const {
      misi_id,
      tujuan_id,
      sasaran_id,
      program_id,
      kegiatan_id,
      tahun,
      jenis_dokumen,
      periode_id,
      page = 1,
      limit = 50,
    } = req.query;

    if (!tahun || !jenis_dokumen) {
      return res.status(400).json({
        message: "Parameter tahun dan jenis_dokumen wajib diisi.",
      });
    }

    const where = { tahun, jenis_dokumen };
    if (periode_id) where.periode_id = periode_id;
    const safeLimit = Math.min(Number(limit), 200);
    const offset = (Number(page) - 1) * safeLimit;

    const include = [
      {
        association: "Tujuan",
        attributes: [],
        required: true,
        where: tujuan_id
          ? { id: tujuan_id }
          : misi_id
          ? { misi_id }
          : undefined,
        include: sasaran_id
          ? [
              {
                association: "Sasarans",
                required: true,
                where: { id: sasaran_id },
                attributes: [],
                include: program_id
                  ? [
                      {
                        association: "Program",
                        required: true,
                        where: { id: program_id },
                        attributes: [],
                        include: kegiatan_id
                          ? [
                              {
                                association: "kegiathans",
                                where: { id: kegiatan_id },
                                attributes: [],
                                required: true,
                              },
                            ]
                          : [],
                      },
                    ]
                  : [],
              },
            ]
          : [],
      },
      {
        association: "opd",
        attributes: ["id", "nama_opd"],
      },
    ];

    const { count, rows } = await IndikatorTujuan.findAndCountAll({
      where,
      include,
      limit: safeLimit,
      offset,
      distinct: true,
      attributes: [
        "kode_indikator",
        "nama_indikator",
        "jenis",
        "target_kinerja",
        "capaian_tahun_1",
        "capaian_tahun_2",
        "capaian_tahun_3",
        "capaian_tahun_4",
        "capaian_tahun_5",
        "baseline",
        "target_tahun_1",
        "target_tahun_2",
        "target_tahun_3",
        "target_tahun_4",
        "target_tahun_5",
        "sumber_data",
        "penanggung_jawab",
        "rekomendasi_ai",
        "satuan",
      ],
    });

    return res.status(200).json({
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / safeLimit),
        currentPage: Number(page),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  create,
  update,
  findAll,
  findOne,
  remove,
  bulkCreateDetail,
  listByTujuan,
  getNextKode,
  generateKodeIndikator,
  getContext,
  getSubKegiatanContext,
  findSpecial,
};
