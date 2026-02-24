const {
  Program,
  RenstraKegiatan,
  RenstraOPD,
  Kegiatan,
  RenstraProgram,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Membuat Renstra Kegiatan baru (tanpa rpjmd_kegiatan_id)
 */
exports.create = async (req, res) => {
  try {
    // Ambil data dari request body
    const { program_id, kode_kegiatan, nama_kegiatan, renstra_id, bidang_opd } =
      req.body;

    // Validasi minimal: wajib ada program_id, kode_kegiatan, nama_kegiatan
    if (!program_id) {
      return res.status(400).json({ error: "Program Renstra wajib dipilih." });
    }
    if (!kode_kegiatan || !nama_kegiatan) {
      return res
        .status(400)
        .json({ error: "Kode dan nama kegiatan wajib diisi." });
    }

    // Buat data baru di tabel renstra_kegiatan
    const data = await RenstraKegiatan.create({
      program_id,
      kode_kegiatan,
      nama_kegiatan,
      renstra_id: renstra_id || null,
      bidang_opd: bidang_opd || "",
    });

    // Response sukses
    res.status(201).json(data);
  } catch (err) {
    console.error("🔥 Error create Renstra Kegiatan:", err);
    res.status(500).json({ error: "Gagal menyimpan data. Silakan coba lagi." });
  }
};

/**
 * Update Renstra Kegiatan (tanpa rpjmd_kegiatan_id wajib)
 */
exports.update = async (req, res) => {
  try {
    const { bidang_opd } = req.body;
    const id = req.params.id;

    // Update data
    const [updated] = await RenstraKegiatan.update(
      { ...req.body, bidang_opd: bidang_opd ?? "" },
      { where: { id } }
    );

    if (!updated)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    // Ambil kembali data yang diperbarui
    const updatedData = await RenstraKegiatan.findByPk(id, {
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
        },
        {
          model: Kegiatan,
          as: "kegiatan_rpjmd",
          attributes: ["id", "kode_kegiatan", "nama_kegiatan"],
        },
        {
          model: RenstraProgram,
          as: "program_renstra",
          attributes: ["id", "kode_program", "nama_program"],
        },
      ],
    });

    res.json({
      ...updatedData.toJSON(),
      bidang_opd: updatedData.bidang_opd ?? "",
      renstra: {
        ...updatedData.renstra?.toJSON(),
        bidang_opd: updatedData.renstra?.bidang_opd ?? "",
        sub_bidang_opd: updatedData.renstra?.sub_bidang_opd ?? "",
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * Ambil semua Renstra Kegiatan
 */
exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai } = req.query;

    const whereClause = {};
    if (renstra_id) whereClause.renstra_id = renstra_id;

    const data = await RenstraKegiatan.findAll({
      where: whereClause,
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
          ...(tahun_mulai && {
            where: { tahun_mulai: parseInt(tahun_mulai, 10) },
          }),
        },
        {
          model: Kegiatan,
          as: "kegiatan_rpjmd",
          attributes: ["id", "kode_kegiatan", "nama_kegiatan"],
        },
        {
          model: RenstraProgram,
          as: "program_renstra",
          attributes: ["id", "kode_program", "nama_program"],
        },
      ],
    });

    const result = data.map((item) => ({
      ...item.toJSON(),
      bidang_opd: item.bidang_opd ?? "",
      renstra: {
        ...item.renstra?.toJSON(),
        bidang_opd: item.renstra?.bidang_opd ?? "",
        sub_bidang_opd: item.renstra?.sub_bidang_opd ?? "",
      },
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ambil 1 Renstra Kegiatan by ID
 */
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraKegiatan.findByPk(req.params.id, {
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
        },
        {
          model: Kegiatan,
          as: "kegiatan_rpjmd",
          attributes: ["id", "kode_kegiatan", "nama_kegiatan"],
        },
        {
          model: RenstraProgram,
          as: "program_renstra",
          attributes: ["id", "kode_program", "nama_program"],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data not found" });

    const result = {
      ...data.toJSON(),
      bidang_opd: data.bidang_opd ?? "",
      renstra: {
        ...data.renstra?.toJSON(),
        bidang_opd: data.renstra?.bidang_opd ?? "",
        sub_bidang_opd: data.renstra?.sub_bidang_opd ?? "",
      },
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ambil kegiatan berdasarkan programRenstraId
 * Tanpa mengubah data di tabel
 */
exports.findByProgramKode = async (req, res) => {
  try {
    const programId = Number(req.params.id || req.query.programId);
    if (!programId)
      return res.status(400).json({ error: "Program ID wajib diberikan." });

    // Ambil program yang terkait renstra
    const program = await Program.findByPk(programId, {
      include: [{ model: Kegiatan, as: "kegiatan" }],
    });

    const kegiatan = program?.kegiatan || []; // gunakan ? untuk aman jika null

    const result = kegiatan.map((k) => ({
      value: k.id,
      label: `${k.kode_kegiatan} - ${k.nama_kegiatan}`,
      kode_kegiatan: k.kode_kegiatan,
      nama_kegiatan: k.nama_kegiatan,
    }));

    res.json(result);
  } catch (err) {
    console.error("🔥 Error findByProgramKode:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ambil kode & nama kegiatan sederhana (untuk dropdown frontend)
 */
exports.getKodeNamaKegiatan = async (req, res) => {
  try {
    const data = await RenstraKegiatan.findAll({
      include: [
        {
          model: Kegiatan,
          as: "kegiatan_rpjmd",
          attributes: ["id", "kode_kegiatan", "nama_kegiatan", "rpjmd_id"],
        },
      ],
      attributes: [],
    });

    const result = data.map((item) => ({
      kode_kegiatan: item.kegiatan_rpjmd.kode_kegiatan,
      nama_kegiatan: item.kegiatan_rpjmd.nama_kegiatan,
      kegiatan_rpjmd_id: item.kegiatan_rpjmd.id,
      rpjmd_id: item.kegiatan_rpjmd.rpjmd_id ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error("🔥 Error getKodeNamaKegiatan:", err);
    res
      .status(500)
      .json({ message: "Gagal mengambil kegiatan", error: err.message });
  }
};

/**
 * Hapus Renstra Kegiatan
 */
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await RenstraKegiatan.destroy({ where: { id } });

    if (!deleted) return res.status(404).json({ message: "Data not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
