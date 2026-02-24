const { RenstraProgram, RenstraOPD } = require("../models");

// 🔧 CREATE
exports.create = async (req, res) => {
  const {
    kode_program,
    nama_program,
    renstra_id,
    rpjmd_program_id,
    opd_penanggung_jawab,
    bidang_opd_penanggung_jawab,
  } = req.body;

  // Validasi
  if (!rpjmd_program_id || typeof rpjmd_program_id !== "string") {
    return res
      .status(400)
      .json({ error: "rpjmd_program_id wajib diisi dan harus berupa string" });
  }

  if (!kode_program || typeof kode_program !== "string") {
    return res
      .status(400)
      .json({ error: "kode_program wajib diisi dan harus berupa string" });
  }

  if (kode_program.length > 20) {
    return res.status(400).json({ error: "kode_program maksimal 20 karakter" });
  }

  if (!nama_program || typeof nama_program !== "string") {
    return res
      .status(400)
      .json({ error: "nama_program wajib diisi dan harus berupa string" });
  }

  if (!renstra_id || typeof renstra_id !== "number") {
    return res
      .status(400)
      .json({ error: "renstra_id wajib diisi dan harus berupa angka" });
  }

  if (opd_penanggung_jawab && typeof opd_penanggung_jawab !== "string") {
    return res
      .status(400)
      .json({ error: "opd_penanggung_jawab harus berupa string" });
  }

  if (
    bidang_opd_penanggung_jawab &&
    typeof bidang_opd_penanggung_jawab !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "bidang_opd_penanggung_jawab harus berupa string" });
  }

  try {
    // Cek duplikasi
    const existing = await RenstraProgram.findOne({
      where: { kode_program, renstra_id },
    });

    if (existing) {
      return res.status(400).json({
        error: "Program dengan kode ini sudah ada di Renstra terkait",
      });
    }

    const data = await RenstraProgram.create({
      kode_program,
      nama_program,
      renstra_id,
      rpjmd_program_id,
      opd_penanggung_jawab,
      bidang_opd_penanggung_jawab,
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🔍 FIND ALL
exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai } = req.query;

    const whereClause = {};
    if (renstra_id) whereClause.renstra_id = renstra_id;

    // Ambil semua program Renstra, termasuk OPD dan Bidang
    const data = await RenstraProgram.findAll({
      where: whereClause,
      attributes: [
        "id",
        "kode_program",
        "nama_program",
        "renstra_id",
        "rpjmd_program_id",
        "opd_penanggung_jawab",
        "bidang_opd_penanggung_jawab",
      ],
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
          ...(tahun_mulai && {
            where: { tahun_mulai: parseInt(tahun_mulai, 10) },
          }),
        },
      ],
    });

    // Jika ada field null di database, kita bisa beri default kosong
    const formattedData = data.map((item) => ({
      id: item.id,
      kode_program: item.kode_program,
      nama_program: item.nama_program,
      renstra_id: item.renstra_id,
      rpjmd_program_id: item.rpjmd_program_id,
      opd_penanggung_jawab: item.opd_penanggung_jawab || "",
      bidang_opd_penanggung_jawab: item.bidang_opd_penanggung_jawab || "",
      renstra: item.renstra,
    }));

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 FIND ONE
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;

    const data = await RenstraProgram.findByPk(id, {
      attributes: [
        "id",
        "kode_program",
        "nama_program",
        "renstra_id",
        "rpjmd_program_id",
        "opd_penanggung_jawab",
        "bidang_opd_penanggung_jawab",
      ],
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data not found" });

    const formattedData = {
      id: data.id,
      kode_program: data.kode_program,
      nama_program: data.nama_program,
      renstra_id: data.renstra_id,
      rpjmd_program_id: data.rpjmd_program_id,
      opd_penanggung_jawab: data.opd_penanggung_jawab || "",
      bidang_opd_penanggung_jawab: data.bidang_opd_penanggung_jawab || "",
      renstra: data.renstra,
    };

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ UPDATE
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    let {
      kode_program,
      nama_program,
      renstra_id,
      rpjmd_program_id,
      opd_penanggung_jawab,
      bidang_opd_penanggung_jawab,
    } = req.body;

    // Jika field kosong atau null, isi dengan string kosong
    opd_penanggung_jawab = opd_penanggung_jawab || "";
    bidang_opd_penanggung_jawab = bidang_opd_penanggung_jawab || "";

    // Validasi tipe data
    if (kode_program && typeof kode_program !== "string") {
      return res
        .status(400)
        .json({ error: "kode_program harus berupa string" });
    }

    if (nama_program && typeof nama_program !== "string") {
      return res
        .status(400)
        .json({ error: "nama_program harus berupa string" });
    }

    if (renstra_id && typeof renstra_id !== "number") {
      return res.status(400).json({ error: "renstra_id harus berupa angka" });
    }

    if (rpjmd_program_id && typeof rpjmd_program_id !== "string") {
      return res
        .status(400)
        .json({ error: "rpjmd_program_id harus berupa string" });
    }

    if (typeof opd_penanggung_jawab !== "string") {
      return res
        .status(400)
        .json({ error: "opd_penanggung_jawab harus berupa string" });
    }

    if (typeof bidang_opd_penanggung_jawab !== "string") {
      return res
        .status(400)
        .json({ error: "bidang_opd_penanggung_jawab harus berupa string" });
    }

    const [updated] = await RenstraProgram.update(
      {
        kode_program,
        nama_program,
        renstra_id,
        rpjmd_program_id,
        opd_penanggung_jawab,
        bidang_opd_penanggung_jawab,
      },
      { where: { id } }
    );

    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await RenstraProgram.findByPk(id, {
      attributes: [
        "id",
        "kode_program",
        "nama_program",
        "renstra_id",
        "rpjmd_program_id",
        "opd_penanggung_jawab",
        "bidang_opd_penanggung_jawab",
      ],
    });

    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🗑️ DELETE
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await RenstraProgram.destroy({
      where: { id },
    });

    if (!deleted) return res.status(404).json({ message: "Data not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
