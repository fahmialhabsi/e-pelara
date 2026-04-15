const {
  IndikatorRenstra,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorSubKegiatan,
  RenstraOPD,
  SubKegiatan,
} = require("../models");
const { Op } = require("sequelize");
const { programWhereForRenstraOpdQuery } = require("../helpers/renstraOpdProgramFilter");

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
    const { renstra_id, tahun_mulai, stage, ref_id, sasaran_id } = req.query;

    const whereClause = {};
    if (renstra_id) {
      Object.assign(whereClause, await programWhereForRenstraOpdQuery(renstra_id));
    }
    if (stage) whereClause.stage = stage;
    if (ref_id) {
      whereClause.ref_id = Number(ref_id);
    } else if (
      String(stage || "").toLowerCase() === "sasaran" &&
      sasaran_id != null
    ) {
      /**
       * Import RPJMD: `ref_id` = PK `indikatorsasarans` untuk sasaran tersebut
       * (bukan `sasaran.id` dari dropdown).
       */
      const sid = Number(sasaran_id);
      if (Number.isFinite(sid)) {
        const rpjmdRows = await IndikatorSasaran.findAll({
          where: { sasaran_id: sid },
          attributes: ["id"],
          raw: true,
        });
        const refIds = rpjmdRows.map((r) => r.id).filter((id) => id != null);
        if (!refIds.length) {
          return res.json([]);
        }
        whereClause.ref_id = { [Op.in]: refIds };
      }
    }

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

/** ENUM `indikator_renstra.tipe_indikator` memakai "Proses"; sumber RPJMD sering "Process". */
function mapTipeIndikatorToRenstra(tipe) {
  if (tipe == null || tipe === "") return null;
  const u = String(tipe).trim();
  if (u === "Process") return "Proses";
  if (["Impact", "Outcome", "Output", "Proses"].includes(u)) return u;
  if (u === "Input") return "Output";
  return "Output";
}

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
      case "strategi":
        sourceModel = IndikatorStrategi;
        break;
      case "kebijakan":
        sourceModel = IndikatorArahKebijakan;
        break;
      case "program":
        sourceModel = IndikatorProgram;
        break;
      case "kegiatan":
        sourceModel = IndikatorKegiatan;
        break;
      case "sub_kegiatan":
        sourceModel = IndikatorSubKegiatan;
        break;
      default:
        return res.status(400).json({ error: "Stage tidak valid" });
    }

    const doc = String(source_doc || "rpjmd").trim();
    const docVariants = [...new Set([doc, doc.toLowerCase(), doc.toUpperCase()])];
    const indikatorList = await sourceModel.findAll({
      where: { jenis_dokumen: { [Op.in]: docVariants } },
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
      lokasi: (() => {
        const raw = item.lokasi ?? item.sumber_data ?? item.keterangan ?? null;
        if (raw == null || String(raw).trim() === "") return null;
        return String(raw).trim().slice(0, 255);
      })(),
      target_tahun_1: item.target_tahun_1,
      target_tahun_2: item.target_tahun_2,
      target_tahun_3: item.target_tahun_3,
      target_tahun_4: item.target_tahun_4,
      target_tahun_5: item.target_tahun_5,
      target_tahun_6: item.target_tahun_6 ?? null,
      pagu_tahun_1:
        stage === "sub_kegiatan"
          ? item.pagu_tahun_1 ?? item.anggaran ?? null
          : item.pagu_tahun_1 ?? null,
      pagu_tahun_2: item.pagu_tahun_2 ?? null,
      pagu_tahun_3: item.pagu_tahun_3 ?? null,
      pagu_tahun_4: item.pagu_tahun_4 ?? null,
      pagu_tahun_5: item.pagu_tahun_5 ?? null,
      pagu_tahun_6: item.pagu_tahun_6 ?? null,
      jenis_indikator: item.jenis_indikator,
      tipe_indikator: mapTipeIndikatorToRenstra(item.tipe_indikator),
      kriteria_kuantitatif: item.kriteria_kuantitatif,
      kriteria_kualitatif: item.kriteria_kualitatif,
      sumber_data: item.sumber_data,
      penanggung_jawab:
        item.penanggung_jawab != null ? String(item.penanggung_jawab) : null,
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
