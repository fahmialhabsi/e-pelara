// controllers/renstra_tabelSasaranController.js
const { RenstraTabelSasaran, IndikatorRenstra } = require("../models");

// 🔹 Fungsi hitung target & pagu akhir renstra
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
    const indikator = await IndikatorRenstra.findByPk(req.body.indikator_id);
    if (!indikator)
      return res.status(404).json({ error: "Indikator tidak ditemukan" });

    const akhirRenstra = hitungAkhirRenstra(req.body);

    let payload = {
      ...req.body,
      satuan_target: indikator?.satuan || req.body.satuan_target,
      ...akhirRenstra,
    };

    // Hapus field yang tidak ada di DB
    delete payload.opd_penanggung_jawab;

    const data = await RenstraTabelSasaran.create(payload);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🔹 UPDATE
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    let payload = { ...req.body };

    if (req.body.indikator_id) {
      const indikator = await IndikatorRenstra.findByPk(req.body.indikator_id);
      if (!indikator)
        return res.status(404).json({ error: "Indikator tidak ditemukan" });
      payload.satuan_target = indikator?.satuan || req.body.satuan_target;
    }

    const akhirRenstra = hitungAkhirRenstra(payload);
    payload = { ...payload, ...akhirRenstra };

    // Hapus field yang tidak ada di DB
    delete payload.opd_penanggung_jawab;

    const [updated] = await RenstraTabelSasaran.update(payload, {
      where: { id },
    });
    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await RenstraTabelSasaran.findByPk(id);
    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🔹 DELETE
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await RenstraTabelSasaran.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 FIND ALL
exports.findAll = async (req, res) => {
  try {
    const data = await RenstraTabelSasaran.findAll({
      include: [
        {
          model: IndikatorRenstra,
          as: "indikator",
          attributes: ["id", "kode_indikator", "nama_indikator"],
        },
      ],
    });

    const dataWithAkhir = data.map((item) => {
      const json = item.toJSON();
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

    res.json(dataWithAkhir);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 FIND ONE
exports.findOne = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await RenstraTabelSasaran.findByPk(id, {
      include: [
        {
          model: IndikatorRenstra,
          as: "indikator",
          attributes: ["id", "kode_indikator", "nama_indikator"],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });

    const json = data.toJSON();
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
    res.status(500).json({ error: err.message });
  }
};

// 🔹 FIND BY TUJUAN
exports.findByTujuan = async (req, res) => {
  try {
    const { tujuan_id } = req.params;
    const data = await RenstraTabelSasaran.findAll({
      where: { tujuan_id },
      include: [
        {
          model: IndikatorRenstra,
          as: "indikator",
          attributes: ["id", "kode_indikator", "nama_indikator"],
        },
      ],
    });

    const dataWithAkhir = data.map((item) => {
      const json = item.toJSON();
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

    res.json(dataWithAkhir);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
