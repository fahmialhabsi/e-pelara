// controllers/renstra_tabelProgramController.js
const {
  RenstraTabelProgram,
  RenstraProgram,
  IndikatorRenstra,
  RenstraKegiatan,
  RenstraTabelSubkegiatan,
} = require("../models");

// 🔹 Import helper untuk hitung target & pagu akhir
const { hitungAkhirProgram } = require("../helpers/computeFinalRenstra");

// ========================= Hitung Akhir dari field tahun =========================
const computeFinalFromTahun = (data) => {
  const targetValues = [
    data.target_tahun_1,
    data.target_tahun_2,
    data.target_tahun_3,
    data.target_tahun_4,
    data.target_tahun_5,
    data.target_tahun_6,
  ].map((v) => Number(v) || 0);

  const paguValues = [
    data.pagu_tahun_1,
    data.pagu_tahun_2,
    data.pagu_tahun_3,
    data.pagu_tahun_4,
    data.pagu_tahun_5,
    data.pagu_tahun_6,
  ].map((v) => Number(v) || 0);

  const target_akhir_renstra =
    targetValues.reduce((a, b) => a + b, 0) / targetValues.length || 0;

  const pagu_akhir_renstra = paguValues.reduce((a, b) => a + b, 0);

  return { target_akhir_renstra, pagu_akhir_renstra };
};

// ========================= CREATE =========================
exports.create = async (req, res) => {
  try {
    const program = await RenstraProgram.findByPk(req.body.program_id);
    const indikator = await IndikatorRenstra.findByPk(req.body.indikator_id);

    if (!program)
      return res.status(404).json({ error: "Program tidak ditemukan" });
    if (!indikator)
      return res.status(404).json({ error: "Indikator tidak ditemukan" });

    let payload = {
      ...req.body,
      kode_program: program.kode_program,
      nama_program: program.nama_program,
      opd_penanggung_jawab: program.opd_penanggung_jawab,
      satuan_target: indikator.satuan || req.body.satuan_target,
    };

    // 🔹 Hitung otomatis target & pagu akhir
    payload = { ...payload, ...computeFinalFromTahun(payload) };

    const created = await RenstraTabelProgram.create(payload);

    res
      .status(201)
      .json({ message: "Program berhasil ditambahkan", data: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ========================= UPDATE =========================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const program = await RenstraProgram.findByPk(req.body.program_id);
    const indikator = await IndikatorRenstra.findByPk(req.body.indikator_id);

    if (!program)
      return res.status(404).json({ error: "Program tidak ditemukan" });
    if (!indikator)
      return res.status(404).json({ error: "Indikator tidak ditemukan" });

    let payload = {
      ...req.body,
      kode_program: program.kode_program,
      nama_program: program.nama_program,
      opd_penanggung_jawab: program.opd_penanggung_jawab,
      satuan_target: indikator.satuan || req.body.satuan_target,
    };

    // 🔹 Hitung otomatis target & pagu akhir
    payload = { ...payload, ...computeFinalFromTahun(payload) };

    const [updated] = await RenstraTabelProgram.update(payload, {
      where: { id },
    });

    if (!updated)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    const updatedData = await RenstraTabelProgram.findByPk(id);

    res.json({ message: "Data berhasil diperbarui", data: updatedData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ========================= FIND ALL =========================
exports.findAll = async (req, res) => {
  try {
    const data = await RenstraTabelProgram.findAll({
      include: [
        { model: RenstraProgram, as: "program" },
        { model: IndikatorRenstra, as: "indikator" },
      ],
      order: [["id", "ASC"]],
    });

    // Tidak menghitung ulang target_akhir_renstra / pagu_akhir_renstra
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= FIND ONE =========================
exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTabelProgram.findByPk(req.params.id, {
      include: [
        {
          model: RenstraProgram,
          as: "program",
          include: [
            {
              model: RenstraKegiatan,
              as: "kegiatans",
              include: [
                { model: RenstraTabelSubkegiatan, as: "tabelSubKegiatans" },
              ],
            },
          ],
        },
        { model: IndikatorRenstra, as: "indikator" },
      ],
    });

    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });

    const json = data.toJSON();
    const akhir = hitungAkhirProgram({
      kegiatans:
        json.program?.kegiatans?.map((keg) => ({
          ...keg,
          subKegiatans: keg.tabelSubKegiatans || [],
        })) || [],
    });

    res.json({ ...json, ...akhir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ========================= DELETE =========================
exports.delete = async (req, res) => {
  try {
    const deleted = await RenstraTabelProgram.destroy({
      where: { id: req.params.id },
    });

    if (!deleted)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
