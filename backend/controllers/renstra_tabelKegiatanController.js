// controllers/renstra_tabelKegiatanController.js
const {
  sequelize,
  RenstraTabelKegiatan,
  RenstraKegiatan,
  RenstraProgram,
  RenstraTabelSubkegiatan,
  IndikatorRenstra,
  RenstraTabelProgram,
} = require("../models");
const { Op } = require("sequelize");

const { hitungAkhirKegiatan } = require("../helpers/computeFinalRenstra");
const {
  validateKegiatanAgainstProgram,
} = require("../services/renstraValidationService");
const updateKegiatanPagu = require("../helpers/updateKegiatanPagu");

// ------------------ CREATE ------------------
exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { kegiatan_id, indikator_id, program_id } = req.body;

    const kegiatan = await RenstraKegiatan.findByPk(kegiatan_id, {
      include: [{ model: RenstraTabelSubkegiatan, as: "tabelSubKegiatans" }],
    });
    const indikator = await IndikatorRenstra.findByPk(indikator_id);

    if (!kegiatan || !indikator) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan", blocked: true });
    }

    const { blocked, warnings, adaKurang } =
      await validateKegiatanAgainstProgram(req.body, program_id, null);
    if (blocked) {
      await t.rollback();
      return res.status(400).json({
        message: "❌ Pagu kegiatan melebihi pagu program",
        warnings,
        blocked: true,
      });
    }

    const payload = {
      ...req.body,
      kode_kegiatan: kegiatan.kode_kegiatan,
      nama_kegiatan: kegiatan.nama_kegiatan,
      bidang_penanggung_jawab: kegiatan.bidang_opd,
      satuan_target: indikator?.satuan || req.body.satuan_target,
    };

    const created = await RenstraTabelKegiatan.create(payload, {
      transaction: t,
    });

    // Hitung akhir: dari tabel subkegiatan (renstra_tabel_subkegiatan) atau field tahun di body
    const akhir = hitungAkhirKegiatan({
      ...req.body,
      subKegiatans: kegiatan.tabelSubKegiatans || [],
    });
    await created.update(akhir, { transaction: t });

    await updateKegiatanPagu(created.id, t);
    await t.commit();

    res.status(201).json({
      message: adaKurang
        ? "⚠️ Data tersimpan, tapi pagu kegiatan masih kurang"
        : "✅ Data kegiatan berhasil disimpan",
      data: created,
      warnings,
      blocked: adaKurang,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ------------------ UPDATE ------------------
exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const { kegiatan_id, indikator_id, program_id } = req.body;

    const kegiatan = await RenstraKegiatan.findByPk(kegiatan_id, {
      include: [{ model: RenstraTabelSubkegiatan, as: "tabelSubKegiatans" }],
    });
    const indikator = await IndikatorRenstra.findByPk(indikator_id);

    if (!kegiatan || !indikator) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan", blocked: true });
    }

    const existing = await RenstraTabelKegiatan.findByPk(id);
    if (!existing) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan", blocked: true });
    }

    const { blocked, warnings, adaKurang } =
      await validateKegiatanAgainstProgram(req.body, program_id, id);
    if (blocked) {
      await t.rollback();
      return res.status(400).json({
        message: "❌ Pagu kegiatan melebihi pagu program",
        warnings,
        blocked: true,
      });
    }

    const payload = {
      ...req.body,
      kode_kegiatan: kegiatan.kode_kegiatan,
      nama_kegiatan: kegiatan.nama_kegiatan,
      bidang_penanggung_jawab: kegiatan.bidang_opd,
      satuan_target: indikator?.satuan || req.body.satuan_target,
    };

    await existing.update(payload, { transaction: t });

    // Hitung ulang target/pagu akhir otomatis dari tabel subkegiatan atau field tahun di body
    const akhir = hitungAkhirKegiatan({
      ...req.body,
      subKegiatans: kegiatan.tabelSubKegiatans || [],
    });
    await existing.update(akhir, { transaction: t });

    await updateKegiatanPagu(existing.id, t);
    await t.commit();

    res.status(200).json({
      message: adaKurang
        ? "⚠️ Data berhasil diperbarui, pagu kegiatan masih kurang. Lengkapi dulu sebelum menambah program baru."
        : "✅ Data kegiatan berhasil diperbarui",
      data: existing,
      warnings,
      blocked: adaKurang,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ------------------ DELETE ------------------
exports.delete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const kegiatan = await RenstraTabelKegiatan.findByPk(id);

    if (!kegiatan) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan", blocked: true, warnings: {} });
    }

    const deletedData = kegiatan.toJSON();
    await kegiatan.destroy({ transaction: t });
    await updateKegiatanPagu(kegiatan.id, t);
    await t.commit();

    res.status(200).json({
      message: "✅ Data berhasil dihapus",
      blocked: false,
      warnings: {},
      data: deletedData,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// ------------------ FINDERS ------------------
const tabelKegiatanListIncludes = [
  {
    model: RenstraProgram,
    as: "program",
    attributes: ["id", "kode_program", "nama_program", "opd_penanggung_jawab"],
  },
  {
    model: IndikatorRenstra,
    as: "indikator",
    attributes: ["id", "kode_indikator", "nama_indikator"],
  },
  { model: RenstraTabelSubkegiatan, as: "subkegiatans" },
];

exports.findAll = async (req, res) => {
  try {
    const data = await RenstraTabelKegiatan.findAll({
      include: tabelKegiatanListIncludes,
      order: [["id", "ASC"]],
    });

    const result = data.map((k) => {
      const json = k.toJSON();
      const akhir = hitungAkhirKegiatan(json);
      return { ...json, ...akhir };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await RenstraTabelKegiatan.findByPk(req.params.id, {
      include: tabelKegiatanListIncludes,
    });

    if (!data)
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan", blocked: true });

    const json = data.toJSON();
    const akhir = hitungAkhirKegiatan(json);

    res.status(200).json({ ...json, ...akhir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------ AVAILABLE PAGU + REALTIME REDUCE USER INPUT ------------------
exports.availablePagu = async (req, res) => {
  try {
    let { program_id, exclude_id, input_pagu } = req.query;

    // Konversi menjadi number
    program_id = Number(program_id);
    exclude_id = exclude_id ? Number(exclude_id) : null;

    if (!program_id || isNaN(program_id)) {
      return res.status(400).json({
        message: "Program ID wajib dan harus angka",
        available: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
    }

    // program_id di sini = PK renstra_tabel_program (bukan FK renstra_program)
    const tabelProgram = await RenstraTabelProgram.findByPk(program_id);

    if (!tabelProgram) {
      return res.json({
        message: "Program tidak ditemukan",
        available: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      });
    }

    const renstraProgramFk = tabelProgram.program_id;

    // renstra_tabel_kegiatan.program_id → FK ke renstra_program.id
    const kegiatanList = await RenstraTabelKegiatan.findAll({
      where: { program_id: renstraProgramFk },
    });

    // Parse input_pagu dari query (optional)
    let userInput = {};
    try {
      userInput = input_pagu ? JSON.parse(input_pagu) : {};
    } catch {
      userInput = {};
    }

    // Hitung total pagu kegiatan per tahun, kecuali exclude_id
    const totalPaguKegiatan = {};
    for (let i = 1; i <= 6; i++) {
      totalPaguKegiatan[i] = kegiatanList.reduce((sum, k) => {
        if (exclude_id && k.id === exclude_id) return sum;
        return sum + Number(k[`pagu_tahun_${i}`] || 0);
      }, 0);
    }

    // Hitung sisa pagu defensif + kurangi input user
    const sisaPagu = {};
    for (let i = 1; i <= 6; i++) {
      const paguProgram = Number(tabelProgram[`pagu_tahun_${i}`]) || 0;
      const totalKegiatan = totalPaguKegiatan[i] || 0;
      const input = Number(userInput[i] || 0);
      sisaPagu[i] = Math.max(0, paguProgram - totalKegiatan - input);
    }

    res.json({
      message: "Sisa pagu berhasil dihitung",
      available: sisaPagu,
    });
  } catch (err) {
    console.error("Error availablePagu:", err);
    res.status(500).json({
      message: err.message,
      available: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    });
  }
};
