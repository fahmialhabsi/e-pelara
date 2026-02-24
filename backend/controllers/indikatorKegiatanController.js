const {
  IndikatorKegiatan,
  Program,
  Kegiatan,
  OpdPenanggungJawab,
} = require("../models");
const { generateKodeIndikator } = require("../helpers/generateKodeIndikator");
const { normalizeDecimalFields } = require("../utils/normalizeDecimal");
const { ensureClonedOnce } = require("../utils/autoCloneHelper");
const {
  getPeriodeFromTahun,
  getPeriodeAktif,
} = require("../utils/periodeHelper");

const allowedFields = [
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

function filterAllowedFields(row, allowed) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => allowed.includes(key))
  );
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
    const { jenis_dokumen, tahun, page = 1, limit = 50 } = req.query;

    if (!jenis_dokumen || !tahun) {
      return res.status(400).json({
        message: "jenis_dokumen dan tahun wajib diisi.",
      });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    const safeLimit = Math.min(Number(limit) || 50, MAX_LIMIT);
    const offset = (Number(page) - 1) * safeLimit;

    const where = { jenis_dokumen, tahun };

    const { count, rows } = await IndikatorKegiatan.findAndCountAll({
      where,
      include: [
        {
          model: Program,
          as: "program",
          // separate: true,
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["nama_bidang_opd"],
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

    return res.status(200).json({
      data: rows,
      meta: {
        totalItems: count,
        totalPages: Math.ceil(count / safeLimit),
        currentPage: Number(page),
      },
    });
  } catch (err) {
    console.error("❌ getAll indikatorKegiatan error:", err);
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
          separate: true,
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          association: "opdPenanggungJawab",
          attributes: ["nama_bidang_opd"],
        },
      ],
    });

    if (!kegiatan) {
      return res.status(404).json({ message: "Indikator Kegiatan not found" });
    }

    return res.status(200).json(kegiatan);
  } catch (err) {
    console.error("❌ getById error:", err);
    return res.status(500).json({
      message: "Error fetching indikator kegiatan",
    });
  }
};

exports.create = async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const sanitized = await Promise.all(rows.map((r) => sanitizeAndFill(r)));

    console.log("🛠 sanitize data:", sanitized);

    sanitized.forEach(normalizeDecimalFields);
    const created = await IndikatorKegiatan.bulkCreate(sanitized);

    return res.status(201).json(created);
  } catch (err) {
    console.error("❌ create error:", err);
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message:
          "Data dengan kombinasi kode_indikator, jenis_dokumen, dan tahun sudah ada.",
        fields: err.fields,
      });
    }
    return res.status(500).json({ message: err.message });
  }
};

exports.bulkCreateDetail = async (req, res) => {
  try {
    const parentId = req.params.id;
    if (!parentId) {
      return res
        .status(400)
        .json({ message: "Parent indikator ID wajib diisi." });
    }

    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const sanitized = await Promise.all(
      rows.map((r) => sanitizeAndFill(r, { indikator_program_id: parentId }))
    );

    sanitized.forEach(normalizeDecimalFields);

    try {
      const created = await IndikatorKegiatan.bulkCreate(sanitized);
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
    console.error("❌ bulkCreateDetail error:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getNextKode = async (req, res) => {
  try {
    const { kegiatan_id } = req.params;

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

    const next_kode = await generateKodeIndikator(
      "IK",
      kegiatan.kode_kegiatan,
      {
        model: IndikatorKegiatan,
        foreignKey: "kegiatan_id",
        kegiatan_id,
      }
    );

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
