// controllers/clonePeriodeController.js
const {
  Tujuan,
  Sasaran,
  Strategi,
  ArahKebijakan,
  Program,
  Kegiatan,
  SubKegiatan,
  sequelize,
} = require("../models");

const CLONE_TYPES = Object.freeze([
  "tujuan",
  "sasaran",
  "strategi",
  "arah_kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
]);

function toInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

async function cloneOrReuse(Model, payload, uniqueWhere, transaction) {
  const existing = await Model.findOne({ where: uniqueWhere, transaction });
  if (existing) return { row: existing, created: false };

  try {
    const created = await Model.create(payload, { transaction });
    return { row: created, created: true };
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      const fallback = await Model.findOne({ where: uniqueWhere, transaction });
      if (fallback) return { row: fallback, created: false };
    }
    throw err;
  }
}

async function clone(req, res) {
  const { from_periode_id, to_periode_id, include = [] } = req.body;
  const fromPeriodeId = toInt(from_periode_id);
  const toPeriodeId = toInt(to_periode_id);
  const includeList = Array.isArray(include) ? include : [];
  const invalidTypes = includeList.filter((item) => !CLONE_TYPES.includes(item));

  if (!fromPeriodeId || !toPeriodeId) {
    return res.status(400).json({
      success: false,
      message: "from_periode_id dan to_periode_id wajib valid.",
    });
  }
  if (fromPeriodeId === toPeriodeId) {
    return res.status(400).json({
      success: false,
      message: "Periode asal dan periode tujuan tidak boleh sama.",
    });
  }
  if (!includeList.length) {
    return res.status(400).json({
      success: false,
      message: "Pilih minimal satu jenis data untuk dikloning.",
    });
  }
  if (invalidTypes.length) {
    return res.status(400).json({
      success: false,
      message: `Jenis data tidak valid: ${invalidTypes.join(", ")}`,
    });
  }

  const t = await sequelize.transaction();

  try {
    const clonedIds = {
      tujuan: {},
      sasaran: {},
      strategi: {},
      arah_kebijakan: {},
      program: {},
      kegiatan: {},
    };
    const summary = {
      tujuan: { created: 0, skipped: 0 },
      sasaran: { created: 0, skipped: 0 },
      strategi: { created: 0, skipped: 0 },
      arah_kebijakan: { created: 0, skipped: 0 },
      program: { created: 0, skipped: 0 },
      kegiatan: { created: 0, skipped: 0 },
      sub_kegiatan: { created: 0, skipped: 0 },
    };

    // CLONE TUJUAN
    if (includeList.includes("tujuan")) {
      const data = await Tujuan.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, ...rest } = item.toJSON();
        const payload = { ...rest, periode_id: toPeriodeId };
        const uniqueWhere = {
          periode_id: toPeriodeId,
          misi_id: payload.misi_id,
          no_tujuan: payload.no_tujuan,
          jenis_dokumen: payload.jenis_dokumen,
          tahun: payload.tahun,
        };
        const { row, created } = await cloneOrReuse(
          Tujuan,
          payload,
          uniqueWhere,
          t,
        );
        clonedIds.tujuan[id] = row.id;
        summary.tujuan[created ? "created" : "skipped"] += 1;
      }
    }

    // CLONE SASARAN
    if (includeList.includes("sasaran")) {
      const data = await Sasaran.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, tujuan_id, ...rest } = item.toJSON();
        const payload = {
          ...rest,
          periode_id: toPeriodeId,
          tujuan_id: clonedIds.tujuan[tujuan_id] || tujuan_id,
        };
        const uniqueWhere = {
          periode_id: toPeriodeId,
          tujuan_id: payload.tujuan_id,
          nomor: payload.nomor,
          jenis_dokumen: payload.jenis_dokumen,
          tahun: payload.tahun,
        };
        const { row, created } = await cloneOrReuse(
          Sasaran,
          payload,
          uniqueWhere,
          t,
        );
        clonedIds.sasaran[id] = row.id;
        summary.sasaran[created ? "created" : "skipped"] += 1;
      }
    }

    // CLONE STRATEGI
    if (includeList.includes("strategi")) {
      const data = await Strategi.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, sasaran_id, ...rest } = item.toJSON();
        const payload = {
          ...rest,
          periode_id: toPeriodeId,
          sasaran_id: clonedIds.sasaran[sasaran_id] || sasaran_id,
        };
        const uniqueWhere = {
          periode_id: toPeriodeId,
          sasaran_id: payload.sasaran_id,
          deskripsi: payload.deskripsi,
          jenis_dokumen: payload.jenis_dokumen,
          tahun: payload.tahun,
        };
        const { row, created } = await cloneOrReuse(
          Strategi,
          payload,
          uniqueWhere,
          t,
        );
        clonedIds.strategi[id] = row.id;
        summary.strategi[created ? "created" : "skipped"] += 1;
      }
    }

    // CLONE ARAH KEBAIJAKAN
    if (includeList.includes("arah_kebijakan")) {
      const data = await ArahKebijakan.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, strategi_id, ...rest } = item.toJSON();
        const payload = {
          ...rest,
          periode_id: toPeriodeId,
          strategi_id: clonedIds.strategi[strategi_id] || strategi_id,
        };
        const uniqueWhere = {
          periode_id: toPeriodeId,
          strategi_id: payload.strategi_id,
          kode_arah: payload.kode_arah,
          deskripsi: payload.deskripsi,
          jenis_dokumen: payload.jenis_dokumen,
          tahun: payload.tahun,
        };
        const { created } = await cloneOrReuse(
          ArahKebijakan,
          payload,
          uniqueWhere,
          t,
        );
        summary.arah_kebijakan[created ? "created" : "skipped"] += 1;
      }
    }

    // CLONE PROGRAM
    if (includeList.includes("program")) {
      const data = await Program.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, sasaran_id, ...rest } = item.toJSON();
        const payload = {
          ...rest,
          periode_id: toPeriodeId,
          sasaran_id: clonedIds.sasaran[sasaran_id] || sasaran_id,
        };
        const uniqueWhere = payload.kode_program
          ? { periode_id: toPeriodeId, kode_program: payload.kode_program }
          : { periode_id: toPeriodeId, nama_program: payload.nama_program };
        const { row, created } = await cloneOrReuse(
          Program,
          payload,
          uniqueWhere,
          t,
        );
        clonedIds.program[id] = row.id;
        summary.program[created ? "created" : "skipped"] += 1;
      }
    }

    // CLONE KEGIATAN
    if (includeList.includes("kegiatan")) {
      const data = await Kegiatan.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, program_id, ...rest } = item.toJSON();
        const payload = {
          ...rest,
          periode_id: toPeriodeId,
          program_id: clonedIds.program[program_id] || program_id,
        };
        const uniqueWhere = payload.kode_kegiatan
          ? {
              periode_id: toPeriodeId,
              jenis_dokumen: payload.jenis_dokumen,
              kode_kegiatan: payload.kode_kegiatan,
            }
          : {
              periode_id: toPeriodeId,
              jenis_dokumen: payload.jenis_dokumen,
              nama_kegiatan: payload.nama_kegiatan,
            };
        const { row, created } = await cloneOrReuse(
          Kegiatan,
          payload,
          uniqueWhere,
          t,
        );
        clonedIds.kegiatan[id] = row.id;
        summary.kegiatan[created ? "created" : "skipped"] += 1;
      }
    }

    // CLONE SUB KEGIATAN
    if (includeList.includes("sub_kegiatan")) {
      const data = await SubKegiatan.findAll({
        where: { periode_id: fromPeriodeId },
      });
      for (const item of data) {
        const { id, kegiatan_id, ...rest } = item.toJSON();
        const payload = {
          ...rest,
          periode_id: toPeriodeId,
          kegiatan_id: clonedIds.kegiatan[kegiatan_id] || kegiatan_id,
        };
        const uniqueWhere = payload.kode_sub_kegiatan
          ? { periode_id: toPeriodeId, kode_sub_kegiatan: payload.kode_sub_kegiatan }
          : { periode_id: toPeriodeId, nama_sub_kegiatan: payload.nama_sub_kegiatan };
        const { created } = await cloneOrReuse(
          SubKegiatan,
          payload,
          uniqueWhere,
          t,
        );
        summary.sub_kegiatan[created ? "created" : "skipped"] += 1;
      }
    }

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Clone data berhasil.",
      data: {
        from_periode_id: fromPeriodeId,
        to_periode_id: toPeriodeId,
        summary,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Clone error:", error);
    return res.status(500).json({
      success: false,
      message: "Clone gagal.",
      error: error.message,
    });
  }
}

async function getClonedTujuan(req, res) {
  const { periode_id } = req.query;
  try {
    const cloned = await Tujuan.findAll({ where: { periode_id } });
    return res.json(cloned);
  } catch (err) {
    console.error("Gagal ambil cloned tujuan:", err);
    return res.status(500).json({ message: "Gagal ambil data." });
  }
}

async function getClonedSasaran(req, res) {
  const { periode_id } = req.query;
  try {
    const data = await Sasaran.findAll({ where: { periode_id } });
    return res.json(data);
  } catch (err) {
    console.error("Gagal ambil sasaran:", err);
    return res.status(500).json({ message: "Gagal ambil data." });
  }
}

async function getCloned(req, res) {
  const { periode_id } = req.query;
  const { jenis } = req.params; // 'tujuan', 'sasaran', etc.
  const modelMap = {
    tujuan: Tujuan,
    sasaran: Sasaran,
    strategi: Strategi,
    arah_kebijakan: ArahKebijakan,
    program: Program,
    kegiatan: Kegiatan,
    sub_kegiatan: SubKegiatan,
  };
  const Model = modelMap[jenis];
  if (!Model) return res.status(400).json({ message: "Invalid jenis" });

  try {
    const rows = await Model.findAll({ where: { periode_id } });
    return res.json(rows);
  } catch (err) {
    console.error("Error getCloned", jenis, err);
    return res.status(500).json({ message: "Error ambil data" });
  }
}

// ✅ Ekspor dua fungsi sekaligus
module.exports = {
  clone,
  getClonedTujuan,
  getClonedSasaran,
  getCloned,
};
