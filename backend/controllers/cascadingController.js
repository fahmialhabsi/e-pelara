const {
  Cascading,
  Misi,
  PrioritasNasional,
  PrioritasDaerah,
  PrioritasGubernur,
  Tujuan,
  Sasaran,
  Program,
  Kegiatan,
  Strategi,
  ArahKebijakan,
} = require("../models");
const { Op } = require("sequelize");
const { Sequelize } = require("sequelize");
const { getPeriodeFromTahun } = require("../utils/periodeHelper");

// helper: validasi relasi exist
async function validateRelations(body) {
  const fkFields = [
    { field: "misi_id", model: Misi },
    { field: "prior_nas_id", model: PrioritasNasional },
    { field: "prior_daerah_id", model: PrioritasDaerah },
    { field: "prior_kepda_id", model: PrioritasGubernur },
    { field: "tujuan_id", model: Tujuan },
    { field: "sasaran_id", model: Sasaran },
    { field: "program_id", model: Program },
    { field: "kegiatan_id", model: Kegiatan },
  ];

  for (const { field, model } of fkFields) {
    if (body[field]) {
      const item = await model.findByPk(body[field]);
      if (!item) return `Relasi ${field}=${body[field]} tidak ditemukan.`;
    }
  }

  return null;
}

function getUniqueKeyFields(data, jenis_dokumen, tahun) {
  return {
    misi_id: data.misi_id,
    prior_nas_id: data.prior_nas_id,
    prior_daerah_id: data.prior_daerah_id,
    prior_kepda_id: data.prior_kepda_id,
    tujuan_id: data.tujuan_id,
    sasaran_id: data.sasaran_id,
    program_id: data.program_id,
    kegiatan_id: data.kegiatan_id,
    jenis_dokumen,
    tahun,
  };
}

exports.list = async (req, res) => {
  const { jenis_dokumen, tahun, limit, search } = req.query;

  if (!jenis_dokumen || !tahun) {
    return res
      .status(400)
      .json({ message: "jenis_dokumen dan tahun wajib diisi." });
  }

  const where = {};

  if (jenis_dokumen) where.jenis_dokumen = jenis_dokumen;
  if (tahun) where.tahun = String(tahun);

  const periode = await getPeriodeFromTahun(tahun);
  if (!periode)
    return res.status(400).json({ message: "Periode tidak ditemukan." });

  where.periode_id = periode.id;

  const limitNumber = limit ? parseInt(limit, 10) : undefined;

  try {
    const items = await Cascading.findAll({
      where,
      limit: limitNumber,
      include: [
        { model: Misi, as: "misi" },
        { model: Program, as: "program" },
        { model: Strategi, as: "strategis", through: { attributes: [] } },
        {
          model: ArahKebijakan,
          as: "arahKebijakans",
          through: { attributes: [] },
        },
        { model: PrioritasNasional, as: "priorNasional" },
        { model: PrioritasDaerah, as: "priorDaerah" },
        { model: PrioritasGubernur, as: "priorKepda" },
        { model: Tujuan, as: "tujuan" },
        { model: Sasaran, as: "sasaran" },
        { model: Kegiatan, as: "kegiatan" },
      ],
    });

    // Filter hasil berdasarkan search query (frontend: ?search=xxx)
    let filteredItems = items;

    if (search) {
      const lower = search.toLowerCase();
      filteredItems = items.filter((item) =>
        [
          item.jenis_dokumen,
          item.tahun,
          item.misi?.isi_misi,
          item.program?.nama_program,
          ...(item.strategis?.map((s) => s.deskripsi || "") || []),
          ...(item.arahKebijakans?.map(
            (a) => a.deskripsi || a.nama_arah || ""
          ) || []),
        ]
          .filter(Boolean)
          .some((val) => val.toLowerCase().includes(lower))
      );
    }

    res.json({
      data: filteredItems,
      meta: {
        totalItems: filteredItems.length,
      },
    });
  } catch (err) {
    console.error("Gagal mengambil cascading:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.statistik = async (req, res) => {
  console.log("✅ Masuk statistik controller", req.user);
  const { by } = req.query;
  let result = [];

  if (by === "tahun") {
    const items = await Cascading.findAll({
      attributes: [
        "tahun",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "jumlah"],
      ],
      group: ["tahun"],
      raw: true,
    });

    console.log("📊 Statistik tahun - hasil query:", items);

    result = items
      .filter((i) => i.tahun != null)
      .map((i) => ({ label: i.tahun, jumlah: parseInt(i.jumlah) }));

    console.log("📊 Statistik tahun - hasil akhir:", result);
  }

  if (by === "jenis_dokumen") {
    const items = await Cascading.findAll({
      attributes: [
        "jenis_dokumen",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "jumlah"],
      ],
      group: ["jenis_dokumen"],
      raw: true,
    });

    console.log("📘 Statistik jenis_dokumen - hasil query:", items);

    result = items.map((i) => ({
      label: i.jenis_dokumen,
      jumlah: parseInt(i.jumlah),
    }));

    console.log("📘 Statistik jenis_dokumen - hasil akhir:", result);
  }

  if (!result || result.length === 0) {
    console.log("⚠️ Data cascading statistik tidak ditemukan");
    return res.status(404).json({ message: "Cascading tidak ditemukan." });
  }

  res.json(result);
};

exports.statistikSankey = async (req, res) => {
  console.log("📌 Handler statistikSankey dipanggil");
  try {
    const { jenis_dokumen, tahun } = req.query;
    const list = await Cascading.findAll({
      where: {
        ...(jenis_dokumen ? { jenis_dokumen } : {}),
        ...(tahun ? { tahun } : {}),
      },
      include: [
        { model: Misi, as: "misi" },
        { model: Tujuan, as: "tujuan" },
        { model: Sasaran, as: "sasaran" },
        { model: Strategi, as: "strategis", through: { attributes: [] } },
        {
          model: ArahKebijakan,
          as: "arahKebijakans",
          through: { attributes: [] },
        },
        { model: Program, as: "program" },
        { model: Kegiatan, as: "kegiatan" },
      ],
    });

    const nodeSet = new Set();
    const linkMap = new Map();

    const safeText = (str) => (str || "(Tidak ada)").substring(0, 60);

    for (const item of list) {
      const path = [
        item.misi?.isi_misi,
        item.tujuan?.isi_tujuan,
        item.sasaran?.isi_sasaran,
        ...(item.strategis?.map((s) => s.deskripsi) || []),
        ...(item.arahKebijakans?.map((a) => a.deskripsi || a.nama_arah) || []),
        item.program?.nama_program,
        item.kegiatan?.nama_kegiatan,
      ]
        .filter(Boolean)
        .map(safeText);

      for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];
        nodeSet.add(source);
        nodeSet.add(target);
        const key = `${source}|${target}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      }
    }

    const nodes = [...nodeSet].map((id) => ({ id }));
    const links = Array.from(linkMap.entries()).map(([k, v]) => {
      const [source, target] = k.split("|");
      return { source, target, value: v };
    });

    console.log(
      "📦 Data sankey response:",
      JSON.stringify({ nodes, links }, null, 2)
    );

    res.json({ nodes, links });
  } catch (err) {
    console.error("Error statistikSankey:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.create = async (req, res) => {
  const { jenis_dokumen, tahun, strategi_ids, arah_kebijakan_ids, ...data } =
    req.body;

  if (!jenis_dokumen || !tahun) {
    return res
      .status(400)
      .json({ message: "jenis_dokumen dan tahun wajib diisi." });
  }

  const errRelasi = await validateRelations(data);
  if (errRelasi) return res.status(400).json({ message: errRelasi });

  const uniqueFields = getUniqueKeyFields(data, jenis_dokumen, tahun);
  const existing = await Cascading.findOne({ where: uniqueFields });
  if (existing) {
    return res
      .status(409)
      .json({ message: "Entry cascading identik sudah ada." });
  }

  try {
    const periode = await getPeriodeFromTahun(tahun);
    console.log("🧾 Periode hasil getPeriodeFromTahun:", periode);
    console.log("📆 Tahun:", tahun, "| 🧾 Periode hasil lookup:", periode);
    if (!periode) {
      return res.status(400).json({ message: "Periode tidak ditemukan." });
    }

    const created = await Cascading.create({
      ...data,
      jenis_dokumen,
      tahun,
      periode_id: periode.id, // ✅ tambahan penting
    });

    // Simpan relasi many-to-many
    if (Array.isArray(strategi_ids) && strategi_ids.length) {
      await created.setStrategis(strategi_ids);
    }

    if (Array.isArray(arah_kebijakan_ids) && arah_kebijakan_ids.length) {
      await created.setArahKebijakans(arah_kebijakan_ids);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("Gagal membuat cascading:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const cascading = await Cascading.findByPk(req.params.id, {
      include: Object.values(Cascading.associations),
    });

    if (!cascading) {
      return res.status(404).json({ message: "Cascading tidak ditemukan." });
    }

    res.json(cascading);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.update = async (req, res) => {
  const { jenis_dokumen, tahun, strategi_ids, arah_kebijakan_ids, ...data } =
    req.body;
  const id = req.params.id;

  const errRelasi = await validateRelations(data);
  if (errRelasi) return res.status(400).json({ message: errRelasi });

  const uniqueFields = getUniqueKeyFields(data, jenis_dokumen, tahun);
  const existing = await Cascading.findOne({
    where: {
      id: { [Op.ne]: id },
      ...uniqueFields,
    },
  });

  if (existing) {
    return res
      .status(409)
      .json({ message: "Entry cascading identik sudah ada." });
  }

  try {
    const cascading = await Cascading.findByPk(id);
    if (!cascading) {
      return res.status(404).json({ message: "Cascading tidak ditemukan." });
    }

    const periode = await getPeriodeFromTahun(tahun);
    if (!periode) {
      return res.status(400).json({ message: "Periode tidak ditemukan." });
    }

    await cascading.update({
      ...data,
      jenis_dokumen,
      tahun,
      periode_id: periode.id, // ✅ tambahan penting
    });

    // Update relasi many-to-many
    if (Array.isArray(strategi_ids)) {
      await cascading.setStrategis(strategi_ids);
    }

    if (Array.isArray(arah_kebijakan_ids)) {
      await cascading.setArahKebijakans(arah_kebijakan_ids);
    }

    res.json({ message: "Cascading berhasil diperbarui." });
  } catch (err) {
    console.error("Gagal update cascading:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await Cascading.destroy({ where: { id: req.params.id } });

    if (!deleted) {
      return res.status(404).json({ message: "Cascading tidak ditemukan." });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Gagal delete cascading:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
