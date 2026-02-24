const {
  sequelize,
  Program,
  IndikatorProgram,
  IndikatorKegiatan,
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

const allowedFields = [
  "kode_indikator",
  "nama_indikator",
  "tipe_indikator",
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
  "sasaran_id",
  "indikator_id",
];

const MAX_LIMIT = 200;

function applyAutoBaseline(row) {
  if (row.target_tahun_5) {
    row.baseline = row.target_tahun_5;
    row.target_awal = row.target_tahun_5;
    row.tahun_awal = row.tahun || defaultDokumen.tahun;
  }

  if (!row.target_akhir && row.target_tahun_5) {
    row.target_akhir = row.target_tahun_5;
  }

  if (!row.tahun_akhir && row.target_tahun_5) {
    row.tahun_akhir = row.tahun || defaultDokumen.tahun;
  }

  return row;
}

exports.create = async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];

    const sanitized = [];
    for (const r of rows) {
      const row = Object.fromEntries(
        Object.entries(r).filter(([key]) => allowedFields.includes(key))
      );

      const tahun = r.tahun || new Date().getFullYear();
      const periode =
        (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());

      row.periode_id = periode?.id;
      row.jenis_dokumen = r.jenis_dokumen || periode?.nama;
      row.tahun = r.tahun || String(periode?.tahun_awal);

      sanitized.push(applyAutoBaseline(row));
    }

    sanitized.forEach(normalizeDecimalFields);
    const created = await IndikatorProgram.bulkCreate(sanitized);

    return res.status(201).json(created);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message:
          "Data dengan kombinasi kode_indikator, jenis_dokumen, dan tahun sudah ada.",
        fields: err.fields,
      });
    }
    console.error("❌ CREATE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.bulkCreateDetail = async (req, res) => {
  try {
    const { indikatorId } = req.params;
    const rows = req.body?.rows || [];

    if (!indikatorId) {
      return res.status(400).json({ message: "indikatorId diperlukan." });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res
        .status(400)
        .json({ message: "rows harus berupa array dan tidak boleh kosong." });
    }

    const sanitized = [];
    for (const r of rows) {
      const row = Object.fromEntries(
        Object.entries(r).filter(([key]) => allowedFields.includes(key))
      );

      const tahun = r.tahun || new Date().getFullYear();
      const periode =
        (await getPeriodeFromTahun(tahun)) || (await getPeriodeAktif());

      row.indikator_id = indikatorId;
      row.periode_id = periode?.id;
      row.jenis_dokumen = r.jenis_dokumen || periode?.nama;
      row.tahun = r.tahun || String(periode?.tahun_awal);

      if (row.sasaran_id === "") row.sasaran_id = null;

      sanitized.push(applyAutoBaseline(row));
    }

    sanitized.forEach(normalizeDecimalFields);

    const created = await IndikatorProgram.bulkCreate(sanitized);
    return res.status(201).json(created);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message:
          "Terdapat data duplikat berdasarkan kode_indikator, jenis_dokumen, dan tahun.",
        fields: err.fields,
      });
    }
    console.error("❌ BULK CREATE DETAIL ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { jenis_dokumen, tahun, page = 1, perPage = 50 } = req.query;

    if (!jenis_dokumen || !tahun) {
      return res
        .status(400)
        .json({ message: "Parameter jenis_dokumen dan tahun wajib diisi." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    const limit = Math.min(parseInt(perPage, 10) || 50, MAX_LIMIT);
    const offset = (parseInt(page, 10) - 1) * limit;

    const { count, rows } = await IndikatorProgram.findAndCountAll({
      where: { jenis_dokumen, tahun },
      include: [
        {
          model: IndikatorKegiatan,
          as: "kegiatans",
          separate: true,
          attributes: [
            "id",
            "indikator_program_id",
            "kode_indikator",
            "nama_indikator",
            "tipe_indikator",
            "jenis",
            "tolok_ukur_kinerja",
            "target_kinerja",
            "jenis_indikator",
            "satuan",
            "tahun",
            "jenis_dokumen",
          ],
        },
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["nama_opd"],
        },
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] },
      limit,
      offset,
      order: [["id", "ASC"]],
      distinct: true,
    });

    return res.status(200).json({
      status: "success",
      data: rows,
      meta: {
        totalItems: count,
        currentPage: parseInt(page, 10),
        perPage: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("❌ FIND ALL ERROR:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const indikatorProgram = await IndikatorProgram.findByPk(req.params.id, {
      include: [
        {
          association: "kegiatans",
          attributes: { exclude: ["createdAt", "updatedAt"] },
        },
        {
          model: Program,
          as: "program",
          attributes: ["id", "kode_program", "nama_program"],
        },
        {
          association: "opdPenanggungJawab",
          attributes: ["id", "nama_opd"],
        },
        // Tambahkan relasi lainnya jika Anda punya: Kriteria, Satuan, dsb.
      ],
      attributes: { exclude: ["createdAt", "updatedAt"] },
    });

    if (!indikatorProgram) {
      return res
        .status(404)
        .json({ message: "Indikator Program tidak ditemukan." });
    }

    return res.status(200).json(indikatorProgram);
  } catch (err) {
    console.error("❌ FIND ONE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getNextKode = async (req, res) => {
  try {
    const { program_id } = req.params;

    if (!program_id) {
      return res.status(400).json({ message: "program_id wajib diisi." });
    }

    const program = await Program.findByPk(program_id);
    if (!program || !program.kode_program) {
      return res.status(404).json({
        message: "Program tidak valid atau belum memiliki kode_program.",
      });
    }

    const prefix = `IP-${program.kode_program}`;
    const nextKode = await generateKodeIndikator(
      program_id,
      prefix,
      IndikatorProgram,
      "program_id"
    );

    return res.json({ next_kode: nextKode });
  } catch (err) {
    console.error("❌ GET NEXT KODE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const indikatorProgram = await IndikatorProgram.findByPk(req.params.id);
    if (!indikatorProgram) {
      return res
        .status(404)
        .json({ message: "Indikator Program tidak ditemukan." });
    }

    const updateData = {
      ...req.body,
      jenis_dokumen: req.body.jenis_dokumen || defaultDokumen.jenis_dokumen,
      tahun: req.body.tahun || defaultDokumen.tahun,
    };

    // 🔄 Ikuti nilai capaian_tahun_5 jika tersedia
    if (updateData.capaian_tahun_5) {
      updateData.baseline = updateData.capaian_tahun_5;
      updateData.target_awal = updateData.capaian_tahun_5;
      updateData.tahun_awal = updateData.tahun;
    }

    // Tetap gunakan logic target_tahun_5 dari applyAutoBaseline
    applyAutoBaseline(updateData);
    normalizeDecimalFields(updateData);

    await indikatorProgram.update(updateData);
    return res.status(200).json(indikatorProgram);
  } catch (err) {
    console.error("❌ UPDATE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const indikatorProgram = await IndikatorProgram.findByPk(req.params.id);
    if (!indikatorProgram) {
      return res
        .status(404)
        .json({ message: "Indikator Program tidak ditemukan." });
    }

    await indikatorProgram.destroy();
    return res.status(204).json();
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};
