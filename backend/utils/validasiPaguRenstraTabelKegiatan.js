// utils/validasiPaguRenstraTabelKegiatan.js
const { Op } = require("sequelize");
const { RenstraTabelKegiatan, RenstraProgram } = require("../models");

/**
 * Validasi total pagu kegiatan dalam 1 program
 * - Digunakan saat create/update Kegiatan
 * - excludeId dipakai agar tidak double count saat update
 *
 * @param {number|string} programId - ID program
 * @param {number|string|null} excludeId - ID kegiatan yang mau dikecualikan (untuk update), null untuk create
 * @returns {object} { totalPagu, program }
 */
async function validasiPaguRenstraTabelKegiatan(programId, excludeId = null) {
  const programIdInt = parseInt(programId, 10);
  if (isNaN(programIdInt)) {
    throw new Error("Program ID tidak valid");
  }

  // 🔹 Ambil data program
  const program = await RenstraProgram.findByPk(programIdInt, {
    attributes: [
      "id",
      "nama_program",
      "kode_program",
      "pagu_tahun_1",
      "pagu_tahun_2",
      "pagu_tahun_3",
      "pagu_tahun_4",
      "pagu_tahun_5",
      "pagu_tahun_6",
    ],
    raw: true,
  });

  if (!program) throw new Error("Program tidak ditemukan");

  // 🔹 Ambil semua kegiatan di program (kecuali excludeId)
  const whereClause = { program_id: programIdInt };
  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId }; // supaya kegiatan sendiri tidak ikut dijumlahkan
  }

  const kegiatanList = await RenstraTabelKegiatan.findAll({
    where: whereClause,
    attributes: [
      "pagu_tahun_1",
      "pagu_tahun_2",
      "pagu_tahun_3",
      "pagu_tahun_4",
      "pagu_tahun_5",
      "pagu_tahun_6",
    ],
    raw: true,
  });

  // 🔹 Hitung total per tahun
  const totalPagu = {};
  for (let i = 1; i <= 6; i++) {
    const field = `pagu_tahun_${i}`;
    totalPagu[`tahun_${i}`] = kegiatanList.reduce(
      (acc, k) => acc + (parseFloat(k[field]) || 0),
      0
    );
  }

  return { totalPagu, program };
}

module.exports = { validasiPaguRenstraTabelKegiatan };
