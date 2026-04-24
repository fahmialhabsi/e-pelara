const {
  RenstraTabelTujuan,
  IndikatorRenstra,
  RenstraTujuan,
  RenstraOPD,
} = require("../models");

// 🔹 Fungsi bantu hitung target & pagu akhir
const hitungAkhirRenstra = (data) => {
  const targetFields = [
    "target_tahun_1",
    "target_tahun_2",
    "target_tahun_3",
    "target_tahun_4",
    "target_tahun_5",
    "target_tahun_6",
  ];
  const paguFields = [
    "pagu_tahun_1",
    "pagu_tahun_2",
    "pagu_tahun_3",
    "pagu_tahun_4",
    "pagu_tahun_5",
    "pagu_tahun_6",
  ];

  const targetSum = targetFields.reduce(
    (acc, field) => acc + (parseFloat(data[field]) || 0),
    0
  );
  const targetAvg = targetSum / targetFields.length;

  const paguSum = paguFields.reduce(
    (acc, field) => acc + (parseFloat(data[field]) || 0),
    0
  );

  return {
    target_akhir_renstra: targetAvg,
    pagu_akhir_renstra: paguSum,
  };
};

// 🔹 CREATE
exports.create = async (req, res) => {
  try {
    console.log("📥 [CREATE Tujuan] req.body:", req.body);

    const indikator = await IndikatorRenstra.findByPk(req.body.indikator_id);
    if (!indikator) {
      return res.status(404).json({ error: "Indikator tidak ditemukan" });
    }

    const akhirRenstra = hitungAkhirRenstra(req.body);

    const payload = {
      ...req.body,
      satuan_target: indikator?.satuan || req.body.satuan_target,
      ...akhirRenstra,
    };

    const data = await RenstraTabelTujuan.create(payload);

    const created = await RenstraTabelTujuan.findByPk(data.id, {
      include: [
        { model: IndikatorRenstra, as: "indikator" },
        { model: RenstraTujuan, as: "tujuan" },
        { model: RenstraOPD, as: "opd" },
      ],
    });

    const json = created.toJSON();
    if (json.tujuan) {
      json.kode_tujuan = json.tujuan.no_tujuan;
      json.nama_tujuan = json.tujuan.isi_tujuan;
    }

    res.status(201).json(json);
  } catch (err) {
    console.error("❌ [CREATE Tujuan] error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// 🔹 FIND ALL (opsional filter query ?tujuan_id=xx)
exports.findAll = async (req, res) => {
  try {
    console.log("🔍 [FIND ALL Tujuan] called with query:", req.query);

    const where = {};
    if (req.query.tujuan_id != null && req.query.tujuan_id !== "") {
      where.tujuan_id = Number(req.query.tujuan_id);
    }
    if (req.query.indikator_id != null && req.query.indikator_id !== "") {
      where.indikator_id = Number(req.query.indikator_id);
    }
    if (req.query.opd_id != null && req.query.opd_id !== "") {
      where.opd_id = Number(req.query.opd_id);
    }

    const data = await RenstraTabelTujuan.findAll({
      where,
      order: [["id", "DESC"]],
      include: [
        {
          model: IndikatorRenstra,
          as: "indikator",
          attributes: ["id", "kode_indikator", "nama_indikator"],
        },
        {
          model: RenstraTujuan,
          as: "tujuan",
          attributes: ["id", "no_tujuan", "isi_tujuan"],
        },
        {
          model: RenstraOPD,
          as: "opd",
          attributes: ["id", "nama_opd"],
        },
      ],
    });

    const result = data.map((item) => {
      const json = item.toJSON();

      if (json.tujuan) {
        json.kode_tujuan = json.tujuan.no_tujuan;
        json.nama_tujuan = json.tujuan.isi_tujuan;
      }

      if (
        json.target_akhir_renstra === null ||
        json.pagu_akhir_renstra === null
      ) {
        const akhir = hitungAkhirRenstra(json);
        json.target_akhir_renstra = akhir.target_akhir_renstra;
        json.pagu_akhir_renstra = akhir.pagu_akhir_renstra;
      }

      return json;
    });

    res.json(result);
  } catch (err) {
    console.error("❌ [FIND ALL Tujuan] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 FIND BY TUJUAN (endpoint baru /by-tujuan/:tujuan_id)
exports.findByTujuan = async (req, res) => {
  try {
    const { tujuan_id } = req.params;

    const data = await RenstraTabelTujuan.findAll({
      where: { tujuan_id },
      include: [
        {
          model: IndikatorRenstra,
          as: "indikator",
          attributes: ["id", "kode_indikator", "nama_indikator"],
        },
        {
          model: RenstraTujuan,
          as: "tujuan",
          attributes: ["id", "no_tujuan", "isi_tujuan"],
        },
        {
          model: RenstraOPD,
          as: "opd",
          attributes: ["id", "nama_opd"],
        },
      ],
    });

    const result = data.map((item) => {
      const json = item.toJSON();

      if (json.tujuan) {
        json.kode_tujuan = json.tujuan.no_tujuan;
        json.nama_tujuan = json.tujuan.isi_tujuan;
      }

      if (
        json.target_akhir_renstra === null ||
        json.pagu_akhir_renstra === null
      ) {
        const akhir = hitungAkhirRenstra(json);
        json.target_akhir_renstra = akhir.target_akhir_renstra;
        json.pagu_akhir_renstra = akhir.pagu_akhir_renstra;
      }

      return json;
    });

    res.json(result);
  } catch (err) {
    console.error("❌ [FIND BY TUJUAN] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 FIND ONE
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await RenstraTabelTujuan.findByPk(id, {
      include: [
        {
          model: IndikatorRenstra,
          as: "indikator",
          attributes: ["id", "kode_indikator", "nama_indikator"],
        },
        {
          model: RenstraTujuan,
          as: "tujuan",
          attributes: ["id", "no_tujuan", "isi_tujuan"],
        },
        {
          model: RenstraOPD,
          as: "opd",
          attributes: ["id", "nama_opd"],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });

    const json = data.toJSON();

    if (json.tujuan) {
      json.kode_tujuan = json.tujuan.no_tujuan;
      json.nama_tujuan = json.tujuan.isi_tujuan;
    }
    if (
      json.target_akhir_renstra === null ||
      json.pagu_akhir_renstra === null
    ) {
      const akhir = hitungAkhirRenstra(json);
      json.target_akhir_renstra = akhir.target_akhir_renstra;
      json.pagu_akhir_renstra = akhir.pagu_akhir_renstra;
    }

    res.json(json);
  } catch (err) {
    console.error("❌ [FIND ONE Tujuan] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🔹 UPDATE
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    let payload = { ...req.body };

    if (req.body.indikator_id) {
      const indikator = await IndikatorRenstra.findByPk(req.body.indikator_id);
      if (!indikator) {
        return res.status(404).json({ error: "Indikator tidak ditemukan" });
      }
      payload.satuan_target = indikator?.satuan || req.body.satuan_target;
    }

    const akhirRenstra = hitungAkhirRenstra(payload);
    payload = { ...payload, ...akhirRenstra };

    const [updated] = await RenstraTabelTujuan.update(payload, {
      where: { id },
    });
    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await RenstraTabelTujuan.findByPk(id, {
      include: [
        { model: IndikatorRenstra, as: "indikator" },
        { model: RenstraTujuan, as: "tujuan" },
        { model: RenstraOPD, as: "opd" },
      ],
    });

    const json = updatedData.toJSON();
    if (json.tujuan) {
      json.kode_tujuan = json.tujuan.no_tujuan;
      json.nama_tujuan = json.tujuan.isi_tujuan;
    }

    res.json(json);
  } catch (err) {
    console.error("❌ [UPDATE Tujuan] error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// 🔹 DELETE
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await RenstraTabelTujuan.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("❌ [DELETE Tujuan] error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
