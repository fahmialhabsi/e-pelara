// src/features/renstra/utils/validasiPaguKegiatanSubkegiatan.js
const { RenstraTabelKegiatan, RenstraProgram } = require("../models");
const { Op } = require("sequelize");
const Decimal = require("decimal.js");

/**
 * Hitung total pagu kegiatan untuk suatu program
 * @param {number} program_id - ID program
 * @param {number|null} excludeId - ID kegiatan yang sedang diedit, jika ada
 * @returns {Promise<{ program: object, totalPagu: object }>}
 */
async function validasiPaguKegiatan(program_id, excludeId = null) {
  // Ambil data program
  const program = await RenstraProgram.findByPk(program_id);

  if (!program) {
    throw new Error("Program tidak ditemukan");
  }

  // Ambil semua kegiatan di program ini
  const kegiatanQuery = {
    where: { program_id },
  };

  if (excludeId !== null) {
    // Saat update, exclude kegiatan yg sedang diedit
    kegiatanQuery.where.id = { [Op.ne]: excludeId };
  }

  const kegiatanList = await RenstraTabelKegiatan.findAll(kegiatanQuery);

  // Hitung total pagu per tahun
  const totalPagu = {};
  for (let i = 1; i <= 6; i++) {
    totalPagu[`pagu_tahun_${i}`] = kegiatanList
      .map((k) => new Decimal(k[`pagu_tahun_${i}`] || 0))
      .reduce((acc, val) => acc.plus(val), new Decimal(0))
      .toNumber();
  }

  return { program, totalPagu };
}

module.exports = { validasiPaguKegiatan };
