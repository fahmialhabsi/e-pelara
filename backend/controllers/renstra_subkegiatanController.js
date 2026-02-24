const {
  RenstraSubkegiatan,
  RenstraProgram,
  RenstraKegiatan,
  SubKegiatan,
  Kegiatan,
} = require("../models");

const toInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const extractSubkegiatanData = (body) => ({
  renstra_program_id: toInt(body.renstra_program_id),
  kegiatan_id: toInt(body.kegiatan_id),
  sub_kegiatan_id: toInt(body.sub_kegiatan_id),
  sub_bidang_opd: body.sub_bidang_opd ?? null,
  nama_opd: body.nama_opd ?? null,
  nama_bidang_opd: body.nama_bidang_opd ?? null,
});

// CREATE
exports.create = async (req, res) => {
  try {
    const data = extractSubkegiatanData(req.body);
    if (
      !data.renstra_program_id ||
      !data.kegiatan_id ||
      !data.sub_kegiatan_id
    ) {
      return res.status(400).json({
        message:
          "Field renstra_program_id, kegiatan_id, dan sub_kegiatan_id wajib diisi.",
      });
    }

    const subKegiatan = await SubKegiatan.findByPk(data.sub_kegiatan_id);
    if (!subKegiatan) {
      return res.status(404).json({ message: "SubKegiatan tidak ditemukan" });
    }

    data.nama_sub_kegiatan = subKegiatan.nama_sub_kegiatan;
    data.kode_sub_kegiatan = subKegiatan.kode_sub_kegiatan;

    const newSubkegiatan = await RenstraSubkegiatan.create(data);
    return res.status(201).json({
      message: "Subkegiatan berhasil ditambahkan",
      data: newSubkegiatan,
    });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.findAll = async (req, res) => {
  try {
    const { kegiatan_id, unique } = req.query;
    const whereClause = {};
    if (kegiatan_id) whereClause.kegiatan_id = kegiatan_id;

    let rows = await RenstraSubkegiatan.findAll({
      where: whereClause,
      order: [["id", "ASC"]],
      attributes: [
        "id",
        "renstra_program_id",
        "kegiatan_id",
        "sub_kegiatan_id",
        "kode_sub_kegiatan",
        "nama_sub_kegiatan",
        "sub_bidang_opd",
        "nama_opd",
        "nama_bidang_opd",
        "created_at",
        "updated_at",
      ],
    });

    // unique filter
    if (unique === "true") {
      rows = rows.filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.sub_kegiatan_id === item.sub_kegiatan_id)
      );
    }

    return res.status(200).json({ data: rows });
  } catch (error) {
    console.error("FIND ALL ERROR:", error);
    return res.status(500).json({ message: error.message });
  }
};

// READ ONE
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraSubkegiatan.findByPk(req.params.id, {
      attributes: [
        "id",
        "renstra_program_id",
        "kegiatan_id",
        "sub_kegiatan_id",
        "kode_sub_kegiatan",
        "nama_sub_kegiatan",
        "sub_bidang_opd",
        "nama_opd",
        "nama_bidang_opd",
      ],
      include: [
        {
          model: RenstraProgram,
          as: "program",
          attributes: ["id", "kode_program", "nama_program"],
        },
        {
          model: RenstraKegiatan,
          as: "kegiatan",
          attributes: ["id", "kode_kegiatan", "nama_kegiatan"],
        },
        {
          model: SubKegiatan,
          as: "subKegiatan",
          attributes: ["id", "kode_sub_kegiatan", "nama_sub_kegiatan"],
        },
      ],
    });
    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.json({ message: "Data ditemukan", data });
  } catch (err) {
    console.error("FIND ONE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// READ by kode_kegiatan
exports.findByKodeKegiatan = async (req, res) => {
  try {
    const { kode_kegiatan } = req.query;
    if (!kode_kegiatan) {
      return res.status(400).json({ message: "kode_kegiatan is required" });
    }

    const rows = await SubKegiatan.findAll({
      include: [
        {
          model: Kegiatan,
          as: "kegiatan",
          attributes: ["id", "kode_kegiatan", "nama_kegiatan"],
          where: { kode_kegiatan },
          required: true,
        },
      ],
      order: [["id", "ASC"]],
      attributes: ["id", "kode_sub_kegiatan", "nama_sub_kegiatan"],
    });

    const data = rows.map((s) => ({
      id: s.id,
      kode_sub_kegiatan: s.kode_sub_kegiatan,
      nama_sub_kegiatan: s.nama_sub_kegiatan,
      kegiatan: s.kegiatan
        ? {
            id: s.kegiatan.id,
            kode_kegiatan: s.kegiatan.kode_kegiatan,
            nama_kegiatan: s.kegiatan.nama_kegiatan,
          }
        : null,
      renstra_program_id: null,
      sub_kegiatan_id: s.id,
    }));

    if (!data.length) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }
    return res.status(200).json({ data });
  } catch (error) {
    console.error("FIND BY KODE KEGIATAN ERROR:", error);
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const data = extractSubkegiatanData(req.body);

    if (
      !data.renstra_program_id ||
      !data.kegiatan_id ||
      !data.sub_kegiatan_id
    ) {
      return res.status(400).json({
        message:
          "Field renstra_program_id, kegiatan_id, dan sub_kegiatan_id wajib diisi.",
      });
    }

    const subKegiatan = await SubKegiatan.findByPk(data.sub_kegiatan_id);
    if (!subKegiatan) {
      return res.status(404).json({ message: "SubKegiatan tidak ditemukan" });
    }

    data.nama_sub_kegiatan = subKegiatan.nama_sub_kegiatan;
    data.kode_sub_kegiatan = subKegiatan.kode_sub_kegiatan;

    const [updated] = await RenstraSubkegiatan.update(data, { where: { id } });
    if (!updated)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    const updatedData = await RenstraSubkegiatan.findByPk(id);
    return res.json({
      message: "Subkegiatan berhasil diperbarui",
      data: updatedData,
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraSubkegiatan.destroy({ where: { id } });
    if (!deleted)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    return res.json({ message: "Subkegiatan berhasil dihapus" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// GENERATE from SubKegiatan (versi tanpa renstra_opd_id)
exports.generateFromSubKegiatan = async (req, res) => {
  try {
    const { kegiatan_id, renstra_program_id } = req.body;
    if (!kegiatan_id || !renstra_program_id) {
      return res.status(400).json({
        error: "Field kegiatan_id dan renstra_program_id wajib diisi",
      });
    }

    const subKegiatanList = await SubKegiatan.findAll({
      where: { kegiatan_id },
    });
    if (!subKegiatanList || subKegiatanList.length === 0) {
      return res.status(404).json({ error: "SubKegiatan tidak ditemukan" });
    }

    const createdList = [];
    for (const sub of subKegiatanList) {
      const [created] = await RenstraSubkegiatan.findOrCreate({
        where: {
          sub_kegiatan_id: sub.id,
          kegiatan_id,
          renstra_program_id,
        },
        defaults: {
          kode_sub_kegiatan: sub.kode_sub_kegiatan,
          nama_sub_kegiatan: sub.nama_sub_kegiatan,
          nama_bidang_opd: sub.nama_bidang_opd,
          sub_bidang_opd: sub.sub_bidang_opd,
          nama_opd: sub.nama_opd,
        },
      });
      createdList.push(created);
    }

    const result = await RenstraSubkegiatan.findAll({
      where: { kegiatan_id, renstra_program_id },
    });

    return res.status(201).json({
      message: "Subkegiatan berhasil digenerate dari data SubKegiatan",
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("GENERATE ERROR:", error);
    return res
      .status(500)
      .json({ error: "Terjadi kesalahan saat generate subkegiatan" });
  }
};
