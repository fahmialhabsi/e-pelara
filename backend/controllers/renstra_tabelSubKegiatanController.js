// controllers/renstra_tabelSubKegiatanController.js
const {
  sequelize,
  RenstraTabelSubkegiatan,
  SubKegiatan,
  RenstraTabelKegiatan,
} = require("../models");

const {
  validateSubAgainstKegiatan,
} = require("../services/renstraValidationService");
const { hitungAkhirKegiatan } = require("../helpers/computeFinalRenstra");

/** `kegiatan_id` di body = `renstra_kegiatan.id`; PK `renstra_tabel_kegiatan` beda. */
async function findTabelKegiatanByRenstraKegiatan(
  { program_id, kegiatan_id },
  options = {}
) {
  const kid = kegiatan_id;
  if (program_id != null && String(program_id).trim() !== "") {
    const row = await RenstraTabelKegiatan.findOne({
      where: { program_id, kegiatan_id: kid },
      ...options,
    });
    if (row) return row;
  }
  return RenstraTabelKegiatan.findOne({
    where: { kegiatan_id: kid },
    ...options,
  });
}

// ========================= CREATE =========================
exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { blocked, warnings, adaKurang } = await validateSubAgainstKegiatan(
      req.body,
      req.body.kegiatan_id,
      null
    );

    if (blocked) {
      await t.rollback();
      return res.status(400).json({
        message: "❌ Pagu subkegiatan melebihi pagu kegiatan",
        warnings,
        blocked: true,
      });
    }

    const sub = await SubKegiatan.findByPk(req.body.subkegiatan_id);
    if (!sub) throw new Error("SubKegiatan tidak ditemukan");

    const payload = {
      ...req.body,
      nama_subkegiatan: sub.nama_sub_kegiatan,
      kode_subkegiatan: sub.kode_sub_kegiatan,
    };

    const created = await RenstraTabelSubkegiatan.create(payload, {
      transaction: t,
    });

    const tabelKegiatan = await findTabelKegiatanByRenstraKegiatan(
      { program_id: req.body.program_id, kegiatan_id: req.body.kegiatan_id },
      {
        include: [{ model: RenstraTabelSubkegiatan, as: "subKegiatans" }],
        transaction: t,
      }
    );
    if (!tabelKegiatan) {
      await t.rollback();
      return res.status(400).json({
        message:
          "Baris Renstra Tabel Kegiatan tidak ditemukan untuk program dan kegiatan ini.",
      });
    }
    const akhir = hitungAkhirKegiatan({ subKegiatans: tabelKegiatan.subKegiatans });
    await tabelKegiatan.update(akhir, { transaction: t });

    await t.commit();

    res.status(201).json({
      message: adaKurang
        ? "⚠️ Subkegiatan tersimpan, tapi pagu masih kurang"
        : "✅ Subkegiatan berhasil ditambahkan",
      data: created,
      warnings,
      blocked: adaKurang,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// ========================= UPDATE =========================
exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const data = req.body;

    const { blocked, warnings, adaKurang } = await validateSubAgainstKegiatan(
      data,
      data.kegiatan_id,
      id
    );

    if (blocked) {
      await t.rollback();
      return res.status(400).json({
        message: "❌ Pagu subkegiatan melebihi pagu kegiatan",
        warnings,
        blocked: true,
      });
    }

    const subkegiatan = await RenstraTabelSubkegiatan.findByPk(id, {
      transaction: t,
    });
    if (!subkegiatan) throw new Error("Subkegiatan tidak ditemukan");

    await subkegiatan.update(data, { transaction: t });

    const tabelKegiatan = await findTabelKegiatanByRenstraKegiatan(
      { program_id: data.program_id, kegiatan_id: data.kegiatan_id },
      {
        include: [{ model: RenstraTabelSubkegiatan, as: "subKegiatans" }],
        transaction: t,
      }
    );
    if (!tabelKegiatan) {
      await t.rollback();
      return res.status(400).json({
        message:
          "Baris Renstra Tabel Kegiatan tidak ditemukan untuk program dan kegiatan ini.",
      });
    }
    const akhir = hitungAkhirKegiatan({ subKegiatans: tabelKegiatan.subKegiatans });
    await tabelKegiatan.update(akhir, { transaction: t });

    await t.commit();

    res.json({
      message: adaKurang
        ? "⚠️ Subkegiatan berhasil diperbarui, tapi pagu masih kurang"
        : "✅ Subkegiatan berhasil diperbarui",
      data: subkegiatan,
      warnings,
      blocked: adaKurang,
    });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// ========================= DELETE =========================
exports.delete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const sub = await RenstraTabelSubkegiatan.findByPk(id, { transaction: t });
    if (!sub) throw new Error("Subkegiatan tidak ditemukan");

    const deletedData = sub.toJSON();
    await sub.destroy({ transaction: t });

    const tabelKegiatan = await findTabelKegiatanByRenstraKegiatan(
      { program_id: sub.program_id, kegiatan_id: sub.kegiatan_id },
      {
        include: [{ model: RenstraTabelSubkegiatan, as: "subKegiatans" }],
        transaction: t,
      }
    );
    if (tabelKegiatan) {
      const akhir = hitungAkhirKegiatan({ subKegiatans: tabelKegiatan.subKegiatans });
      await tabelKegiatan.update(akhir, { transaction: t });
    }

    await t.commit();

    res.json({
      message: "✅ Subkegiatan berhasil dihapus",
      data: deletedData,
      blocked: false,
      warnings: {},
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ALL =========================
exports.findAll = async (req, res) => {
  try {
    const { kegiatan_id } = req.query;
    const whereClause = {};
    if (kegiatan_id) whereClause.kegiatan_id = kegiatan_id;

    const rows = await RenstraTabelSubkegiatan.findAll({
      where: whereClause,
      include: [{ model: SubKegiatan, as: "subkegiatan" }],
      order: [["id", "ASC"]],
    });

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTabelSubkegiatan.findByPk(req.params.id, {
      include: [{ model: SubKegiatan, as: "subkegiatan" }],
    });

    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
