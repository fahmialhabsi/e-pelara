// controllers/evaluasiController.js
const { Evaluasi, Indikator, RealisasiIndikator } = require("../models");

const defaultDokumen = {
  jenis_dokumen: "RPJMD",
  tahun: "2025",
};

exports.createEvaluasi = async (req, res) => {
  const {
    indikator_id,
    tanggal_evaluasi,
    realisasi,
    status,
    catatan,
    rekomendasi,
    jenis_dokumen = defaultDokumen.jenis_dokumen,
    tahun = defaultDokumen.tahun,
  } = req.body;

  if (!jenis_dokumen || !tahun) {
    return res
      .status(400)
      .json({ message: "jenis_dokumen dan tahun wajib diisi." });
  }

  if (!indikator_id || !tanggal_evaluasi || !realisasi || !status) {
    return res.status(400).json({
      message:
        "Indikator_id, tanggal_evaluasi, realisasi, dan status wajib diisi",
    });
  }

  try {
    const realisasiData = await RealisasiIndikator.findAll({
      where: { indikator_id },
    });

    if (!realisasiData || realisasiData.length === 0) {
      return res
        .status(404)
        .json({ message: "Data realisasi indikator tidak ditemukan" });
    }

    const indikator = await Indikator.findByPk(indikator_id);
    if (!indikator) {
      return res
        .status(404)
        .json({ message: "Data indikator tidak ditemukan" });
    }

    const tahunEvaluasi = new Date(tanggal_evaluasi).getFullYear();
    const tahunAwalRPJMD = 2025;
    const selisihTahun = tahunEvaluasi - tahunAwalRPJMD + 1;

    let target = null;
    switch (selisihTahun) {
      case 1:
        target = indikator.target_tahun_1;
        break;
      case 2:
        target = indikator.target_tahun_2;
        break;
      case 3:
        target = indikator.target_tahun_3;
        break;
      case 4:
        target = indikator.target_tahun_4;
        break;
      case 5:
        target = indikator.target_tahun_5;
        break;
      default:
        return res
          .status(400)
          .json({ message: "Tahun evaluasi di luar jangkauan RPJMD" });
    }

    const evaluasi = await Evaluasi.create({
      indikator_id,
      realisasi_id: realisasiData[0].id,
      tanggal_evaluasi,
      target,
      realisasi,
      status,
      catatan,
      rekomendasi,
      jenis_dokumen,
      tahun,
    });

    return res.status(201).json(evaluasi);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan evaluasi", error: err.message });
  }
};

exports.getAllEvaluasi = async (req, res) => {
  try {
    const list = await Evaluasi.findAll({
      include: [
        {
          model: RealisasiIndikator,
          as: "realisasiIndikator",
        },
      ],
      order: [["created_at", "DESC"]],
    });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Gagal mengambil data evaluasi" });
  }
};
