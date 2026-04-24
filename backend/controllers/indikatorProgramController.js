const {
  sequelize,
  Program,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSasaran,
  OpdPenanggungJawab,
} = require("../models");
const { Op, fn, col, where: sqlWhere } = require("sequelize");
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

const allowedFields = [
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
  "program_id",
  "arah_kebijakan_id",
];

const MAX_LIMIT = 200;

// Fallback aman untuk field default pada controller ini.
// Catatan: secara ideal default mengikuti periode aktif; namun controller ini
// menggunakan default hanya saat request tidak menyertakan nilai.
const defaultDokumen = {
  jenis_dokumen: "RPJMD",
  tahun: String(new Date().getFullYear()),
};

function buildJenisDokumenWhere(jenis_dokumen) {
  const raw = String(jenis_dokumen ?? "").trim();
  if (!raw) return null;

  const rawLc = raw.toLowerCase();

  // Data RPJMD di DB sering tersimpan sebagai "RPJMD 2025-2029" (nama periode),
  // sedangkan client kadang kirim "rpjmd". Samakan jadi prefix match.
  if (rawLc === "rpjmd" || rawLc.startsWith("rpjmd ")) {
    return { jenis_dokumen: { [Op.like]: "RPJMD%" } };
  }

  // Selain RPJMD, gunakan match persis.
  return { jenis_dokumen: raw };
}

async function buildTahunWhere({ tahun, jenis_dokumen }) {
  const tahunStr = String(tahun ?? "").trim();
  if (!tahunStr) return null;

  const jenisLc = String(jenis_dokumen ?? "").trim().toLowerCase();
  if (/^rpjmd/.test(jenisLc)) {
    const periode = await getPeriodeFromTahun(tahunStr);
    const tahunAwal = Number(periode?.tahun_awal);
    const tahunAkhir = Number(periode?.tahun_akhir);
    if (
      Number.isFinite(tahunAwal) &&
      Number.isFinite(tahunAkhir) &&
      tahunAkhir >= tahunAwal &&
      tahunAkhir - tahunAwal <= 20
    ) {
      const years = [];
      for (let y = tahunAwal; y <= tahunAkhir; y += 1) years.push(String(y));
      return { tahun: { [Op.in]: years } };
    }
  }

  return { tahun: tahunStr };
}

function extractProgramBaseFromArahKodeIndikator(kode) {
  const raw = kode == null ? "" : String(kode).trim();
  if (!raw) return "";

  // Target pola basis:
  //   AR1-01-01-01 -> 1.01.01.01
  //   ASST1-01-01.1.1 (jika dipakai) -> 1.01.01.1.1 (tetap deterministik)
  const segs = raw
    .split("-")
    .map((s) => String(s).trim())
    .filter(Boolean);

  const out = [];
  for (const seg of segs) {
    // Jika segmen sudah berupa angka bertitik (01.1.1), pertahankan.
    if (/^\d+(?:\.\d+)+$/.test(seg)) {
      out.push(seg);
      continue;
    }
    const m = seg.match(/\d+/g);
    if (m && m.length > 0) out.push(m[m.length - 1]);
  }

  return out.join(".");
}

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
        }
      );
    }
    if (err.name === "SequelizeValidationError") {
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), {
        message: err.message,
      });
    }
    console.error("CREATE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.bulkCreateDetail = async (req, res) => {
  try {
    const { indikatorId } = req.params;
    const rows = req.body?.rows || [];

    if (!indikatorId) {
      return sendValidationErrors(
        res,
        400,
        { indikator_id: ["indikatorId diperlukan."] },
        { message: "indikatorId diperlukan." }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return sendValidationErrors(
        res,
        400,
        { rows: ["rows harus berupa array dan tidak boleh kosong."] },
        { message: "rows harus berupa array dan tidak boleh kosong." }
      );
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
        }
      );
    }
    if (err.name === "SequelizeValidationError") {
      return sendValidationErrors(res, 400, fromSequelizeValidationError(err), {
        message: err.message,
      });
    }
    console.error("BULK CREATE DETAIL ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { jenis_dokumen, tahun, page = 1, perPage = 50, program_id } =
      req.query;

    if (!jenis_dokumen || !tahun) {
      return res
        .status(400)
        .json({ message: "Parameter jenis_dokumen dan tahun wajib diisi." });
    }

    await ensureClonedOnce(jenis_dokumen, tahun);

    const limit = Math.min(parseInt(perPage, 10) || 50, MAX_LIMIT);
    const offset = (parseInt(page, 10) - 1) * limit;

    const docJenisWhere = buildJenisDokumenWhere(jenis_dokumen);
    const docJenisWhereSasaran = buildJenisDokumenWhere(jenis_dokumen);
    const tahunStr = String(tahun).trim();
    const tahunWhere = await buildTahunWhere({ tahun: tahunStr, jenis_dokumen });

    const andParts = [
      ...(tahunWhere ? [tahunWhere] : []),
      ...(docJenisWhere ? [docJenisWhere] : []),
    ];

    let pid = null;
    if (program_id != null && String(program_id).trim() !== "") {
      pid = Number.parseInt(String(program_id), 10);
      if (!Number.isNaN(pid)) {
        const prog = await Program.findByPk(pid, {
          attributes: ["id", "sasaran_id"],
        });
        const sasaranKeys = [];
        if (prog?.sasaran_id != null) {
          const indikSasaran = await IndikatorSasaran.findOne({
            where: {
              sasaran_id: prog.sasaran_id,
              tahun: tahunStr,
              [Op.and]: [
                ...(docJenisWhereSasaran ? [docJenisWhereSasaran] : []),
              ],
            },
            attributes: ["id", "sasaran_id"],
          });
          if (indikSasaran?.id != null) sasaranKeys.push(Number(indikSasaran.id));
          sasaranKeys.push(Number(prog.sasaran_id));
        }
        const uniqSasaran = [...new Set(sasaranKeys.filter((n) => Number.isFinite(n)))];
        /**
         * Hook duplicate (beforeCreate) hanya cek kode_indikator + jenis_dokumen + tahun,
         * tanpa program_id â€” data lama sering program_id NULL.
         * GET harus mengembalikan baris yang sama konteks program:
         *   (program_id = :pid) OR (program_id IS NULL AND sasaran_id âˆˆ {FK indikator sasaran, sasaran RPJMD}).
         */
        if (uniqSasaran.length > 0) {
          andParts.push({
            [Op.or]: [
              { program_id: pid },
              {
                [Op.and]: [
                  { program_id: { [Op.is]: null } },
                  { sasaran_id: { [Op.in]: uniqSasaran } },
                ],
              },
            ],
          });
        } else {
          andParts.push({ program_id: pid });
        }
      }
    }

    const where = { [Op.and]: andParts };

    const { count, rows } = await IndikatorProgram.findAndCountAll({
      where,
      include: [
        {
          model: OpdPenanggungJawab,
          as: "opdPenanggungJawab",
          attributes: ["id", "nama_opd", "nama_bidang_opd"],
          required: false,
        },
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
    console.error("FIND ALL ERROR:", err.message);
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
    console.error("FIND ONE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

exports.getNextKode = async (req, res) => {
  try {
    const { program_id } = req.params;
    const { tahun, jenis_dokumen, arah_kebijakan_kode_indikator } = req.query;

    if (!program_id) {
      return res.status(400).json({ message: "program_id wajib diisi." });
    }

    const program = await Program.findByPk(program_id);
    if (!program || !program.kode_program) {
      return res.status(404).json({
        message: "Program tidak valid atau belum memiliki kode_program.",
      });
    }

    const tahunStr =
      tahun != null && String(tahun).trim() !== ""
        ? String(tahun).trim()
        : String(new Date().getFullYear());
    const docJenisWhere = buildJenisDokumenWhere(jenis_dokumen);
    const tahunWhere = await buildTahunWhere({
      tahun: tahunStr,
      jenis_dokumen,
    });

    // Basis kode indikator program mengikuti kode indikator Arah Kebijakan jika tersedia.
    // Jika tidak ada, fallback ke kode program (masih deterministik dan mudah diaudit).
    const baseFromArah = extractProgramBaseFromArahKodeIndikator(
      arah_kebijakan_kode_indikator
    );
    const base = baseFromArah || String(program.kode_program).trim();
    const prefix = `IP-${base}`;

    const andParts = [
      ...(tahunWhere ? [tahunWhere] : []),
      ...(docJenisWhere ? [docJenisWhere] : []),
      { kode_indikator: { [Op.like]: `${prefix}.%` } },
    ];

    const result = await IndikatorProgram.findOne({
      where: { [Op.and]: andParts },
      attributes: [
        [
          sequelize.fn(
            "MAX",
            sequelize.literal(
              "CAST(SUBSTRING_INDEX(kode_indikator,'.',-1) AS UNSIGNED)"
            )
          ),
          "maxNumber",
        ],
      ],
      raw: true,
    });

    const next = (result?.maxNumber || 0) + 1;
    const nextKode = `${prefix}.${String(next).padStart(2, "0")}`;

    return res.json({ next_kode: nextKode });
  } catch (err) {
    console.error("âŒ GET NEXT KODE ERROR:", err);
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
      // Jangan ganti konteks baris jika client (modal edit) tidak mengirim tahun/jenis_dokumen.
      jenis_dokumen:
        req.body.jenis_dokumen ||
        indikatorProgram.jenis_dokumen ||
        defaultDokumen.jenis_dokumen,
      tahun: req.body.tahun || indikatorProgram.tahun || defaultDokumen.tahun,
    };

    // ðŸ”„ Ikuti nilai capaian_tahun_5 jika tersedia
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
    console.error("âŒ UPDATE ERROR:", err);
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
        { message: err.message }
      );
    }
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
    console.error("âŒ DELETE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

