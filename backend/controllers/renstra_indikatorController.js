const {
  IndikatorRenstra,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorProgram,
  IndikatorKegiatan,
  RenstraOPD,
  SubKegiatan,
} = require("../models");

// ✅ Helper untuk validasi renstra_id
const validateRenstraId = (req, res) => {
  const renstraId = req.body.renstra_id || req.query.renstra_id;
  if (!renstraId) {
    res.status(400).json({ error: "renstra_id wajib diisi" });
    return null;
  }
  return renstraId;
};

// CREATE
exports.create = async (req, res) => {
  try {
    const renstraId = validateRenstraId(req, res);
    if (!renstraId) return;

    const data = await IndikatorRenstra.create({
      ...req.body,
      renstra_id: renstraId,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ ALL
exports.findAll = async (req, res) => {
  try {
    const { renstra_id, tahun_mulai } = req.query;

    const whereClause = {};
    if (renstra_id) whereClause.renstra_id = renstra_id;

    const data = await IndikatorRenstra.findAll({
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
      ],
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.findOne = async (req, res) => {
  try {
    const data = await IndikatorRenstra.findByPk(req.params.id, {
      include: [
        {
          model: RenstraOPD,
          as: "renstra",
          attributes: ["id", "bidang_opd", "sub_bidang_opd"],
        },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data not found" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const renstraId = validateRenstraId(req, res);
    if (!renstraId) return;

    const id = req.params.id;
    const [updated] = await IndikatorRenstra.update(
      { ...req.body, renstra_id: renstraId },
      { where: { id } }
    );
    if (!updated) return res.status(404).json({ message: "Data not found" });

    const updatedData = await IndikatorRenstra.findByPk(id);
    res.json(updatedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await IndikatorRenstra.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// IMPORT from RPJMD
exports.importFromRPJMD = async (req, res) => {
  try {
    const renstraId = validateRenstraId(req, res);
    if (!renstraId) return;

    const { stage, source_doc = "rpjmd" } = req.body;

    let sourceModel;
    switch (stage) {
      case "tujuan":
        sourceModel = IndikatorTujuan;
        break;
      case "sasaran":
        sourceModel = IndikatorSasaran;
        break;
      case "program":
        sourceModel = IndikatorProgram;
        break;
      case "kegiatan":
        sourceModel = IndikatorKegiatan;
        break;
      default:
        return res.status(400).json({ error: "Stage tidak valid" });
    }

    const indikatorList = await sourceModel.findAll({
      where: { jenis_dokumen: source_doc },
    });

    if (!indikatorList.length) {
      return res
        .status(404)
        .json({ message: `Tidak ada data ${stage} di ${source_doc}` });
    }

    const newData = indikatorList.map((item) => ({
      ref_id: item.id,
      stage,
      kode_indikator: item.kode_indikator,
      nama_indikator: item.nama_indikator,
      satuan: item.satuan,
      definisi_operasional: item.definisi_operasional,
      metode_penghitungan: item.metode_penghitungan,
      baseline: item.baseline,
      target_tahun_1: item.target_tahun_1,
      target_tahun_2: item.target_tahun_2,
      target_tahun_3: item.target_tahun_3,
      target_tahun_4: item.target_tahun_4,
      target_tahun_5: item.target_tahun_5,
      jenis_indikator: item.jenis_indikator,
      tipe_indikator: item.tipe_indikator,
      kriteria_kuantitatif: item.kriteria_kuantitatif,
      kriteria_kualitatif: item.kriteria_kualitatif,
      sumber_data: item.sumber_data,
      penanggung_jawab: item.penanggung_jawab,
      keterangan: item.keterangan,
      tahun: item.tahun,
      jenis_dokumen: "renstra", // hasil import ditandai "renstra"
      renstra_id: renstraId,
    }));

    const inserted = await IndikatorRenstra.bulkCreate(newData);
    res.json({
      message: `Import ${stage} dari ${source_doc} berhasil`,
      data: inserted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRenstraAktif = async (req, res) => {
  try {
    const { tahun } = req.query;
    if (!tahun) return res.status(400).json({ error: "Tahun wajib diisi" });

    const renstra = await RenstraOPD.findOne({
      where: { tahun_mulai: tahun, is_aktif: 1 },
    });

    if (!renstra)
      return res
        .status(404)
        .json({ message: `Renstra aktif tahun ${tahun} tidak ditemukan` });

    res.json(renstra);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// GET indikator program
exports.getIndikatorProgram = async (req, res) => {
  const { program_id } = req.query;
  const data = await IndikatorProgram.findAll({
    where: { program_id },
  });
  res.json(data);
};

// GET indikator kegiatan (fix: pakai kode_indikator)
exports.getIndikatorKegiatan = async (req, res) => {
  try {
    const { kegiatan_id } = req.query;
    const data = await IndikatorKegiatan.findAll({
      where: { kode_indikator: kegiatan_id || "" },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server internal." });
  }
};

// GET indikator sub kegiatan (sudah sesuai)
exports.getIndikatorSubKegiatan = async (req, res) => {
  try {
    const { subkegiatan_id } = req.query;
    const data = await SubKegiatan.findAll({
      where: { kode_sub_kegiatan: subkegiatan_id || "" },
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server internal." });
  }
};
