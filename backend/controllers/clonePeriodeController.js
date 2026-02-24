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

async function clone(req, res) {
  const { from_periode_id, to_periode_id, include = [] } = req.body;
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

    // CLONE TUJUAN
    if (include.includes("tujuan")) {
      const data = await Tujuan.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, ...rest } = item.toJSON();
        const newItem = await Tujuan.create(
          { ...rest, periode_id: to_periode_id },
          { transaction: t }
        );
        clonedIds.tujuan[id] = newItem.id;
      }
    }

    // CLONE SASARAN
    if (include.includes("sasaran")) {
      const data = await Sasaran.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, tujuan_id, ...rest } = item.toJSON();
        const newItem = await Sasaran.create(
          {
            ...rest,
            periode_id: to_periode_id,
            tujuan_id: clonedIds.tujuan[tujuan_id] || tujuan_id,
          },
          { transaction: t }
        );
        clonedIds.sasaran[id] = newItem.id;
      }
    }

    // CLONE STRATEGI
    if (include.includes("strategi")) {
      const data = await Strategi.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, sasaran_id, ...rest } = item.toJSON();
        const newItem = await Strategi.create(
          {
            ...rest,
            periode_id: to_periode_id,
            sasaran_id: clonedIds.sasaran[sasaran_id] || sasaran_id,
          },
          { transaction: t }
        );
        clonedIds.strategi[id] = newItem.id;
      }
    }

    // CLONE ARAH KEBAIJAKAN
    if (include.includes("arah_kebijakan")) {
      const data = await ArahKebijakan.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, strategi_id, ...rest } = item.toJSON();
        await ArahKebijakan.create(
          {
            ...rest,
            periode_id: to_periode_id,
            strategi_id: clonedIds.strategi[strategi_id] || strategi_id,
          },
          { transaction: t }
        );
      }
    }

    // CLONE PROGRAM
    if (include.includes("program")) {
      const data = await Program.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, sasaran_id, ...rest } = item.toJSON();
        const newItem = await Program.create(
          {
            ...rest,
            periode_id: to_periode_id,
            sasaran_id: clonedIds.sasaran[sasaran_id] || sasaran_id,
          },
          { transaction: t }
        );
        clonedIds.program[id] = newItem.id;
      }
    }

    // CLONE KEGIATAN
    if (include.includes("kegiatan")) {
      const data = await Kegiatan.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, program_id, ...rest } = item.toJSON();
        const newItem = await Kegiatan.create(
          {
            ...rest,
            periode_id: to_periode_id,
            program_id: clonedIds.program[program_id] || program_id,
          },
          { transaction: t }
        );
        clonedIds.kegiatan[id] = newItem.id;
      }
    }

    // CLONE SUB KEGIATAN
    if (include.includes("sub_kegiatan")) {
      const data = await SubKegiatan.findAll({
        where: { periode_id: from_periode_id },
      });
      for (const item of data) {
        const { id, kegiatan_id, ...rest } = item.toJSON();
        await SubKegiatan.create(
          {
            ...rest,
            periode_id: to_periode_id,
            kegiatan_id: clonedIds.kegiatan[kegiatan_id] || kegiatan_id,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return res.status(200).json({ message: "Clone data berhasil." });
  } catch (error) {
    await t.rollback();
    console.error("Clone error:", error);
    return res.status(500).json({ message: "Clone gagal.", error });
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
