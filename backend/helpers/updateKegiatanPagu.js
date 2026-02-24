// helpers/updateKegiatanPagu.js
const {
  RenstraTabelKegiatan,
  RenstraTabelSubkegiatan,
  RenstraProgram,
} = require("../models");
const { Sequelize } = require("sequelize");

/**
 * Sinkronisasi pagu & target dari Subkegiatan ke Kegiatan
 * dan update akumulasi ke Program
 * @param {number|string} kegiatanId - primary key `id` di RenstraTabelKegiatan
 * @param {object} transaction - opsional
 */
async function updateKegiatanPagu(kegiatanId, transaction = null) {
  try {
    const kegiatanIdInt = parseInt(kegiatanId, 10);
    if (isNaN(kegiatanIdInt)) throw new Error("Invalid kegiatan id");

    // 1️⃣ SUM dari semua Subkegiatan
    const sumsSubkeg = await RenstraTabelSubkegiatan.findOne({
      where: { kegiatan_id: kegiatanIdInt },
      attributes: [
        ...[1, 2, 3, 4, 5, 6].map((i) => [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col(`target_tahun_${i}`)),
            0
          ),
          `target_tahun_${i}`,
        ]),
        ...[1, 2, 3, 4, 5, 6].map((i) => [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col(`pagu_tahun_${i}`)),
            0
          ),
          `pagu_tahun_${i}`,
        ]),
      ],
      raw: true,
      transaction,
    });
    if (!sumsSubkeg) return;

    // Hitung total & rata-rata
    const totalPagu = [1, 2, 3, 4, 5, 6].reduce(
      (acc, i) => acc + parseFloat(sumsSubkeg[`pagu_tahun_${i}`] || 0),
      0
    );
    const totalTarget = [1, 2, 3, 4, 5, 6].reduce(
      (acc, i) => acc + parseFloat(sumsSubkeg[`target_tahun_${i}`] || 0),
      0
    );
    const avgTarget = totalTarget / 6;

    // 2️⃣ Update Kegiatan
    const [updatedRows] = await RenstraTabelKegiatan.update(
      {
        ...sumsSubkeg,
        pagu_akhir_renstra: totalPagu,
        target_akhir_renstra: avgTarget,
      },
      { where: { id: kegiatanIdInt }, transaction }
    );
    if (updatedRows === 0)
      throw new Error("Kegiatan tidak ditemukan saat update Kegiatan");

    // 3️⃣ Ambil program_id dari Kegiatan
    const kegiatan = await RenstraTabelKegiatan.findByPk(kegiatanIdInt, {
      attributes: ["program_id"],
      transaction,
    });
    if (!kegiatan)
      throw new Error("Kegiatan tidak ditemukan saat update pagu Program");
    const programId = kegiatan.program_id;

    // 4️⃣ SUM semua Kegiatan dalam Program
    const sumsProgram = await RenstraTabelKegiatan.findOne({
      where: { program_id: programId },
      attributes: [
        ...[1, 2, 3, 4, 5, 6].map((i) => [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col(`target_tahun_${i}`)),
            0
          ),
          `target_tahun_${i}`,
        ]),
        ...[1, 2, 3, 4, 5, 6].map((i) => [
          Sequelize.fn(
            "COALESCE",
            Sequelize.fn("SUM", Sequelize.col(`pagu_tahun_${i}`)),
            0
          ),
          `pagu_tahun_${i}`,
        ]),
      ],
      raw: true,
      transaction,
    });
    if (!sumsProgram) return;

    const totalPaguProgram = [1, 2, 3, 4, 5, 6].reduce(
      (acc, i) => acc + parseFloat(sumsProgram[`pagu_tahun_${i}`] || 0),
      0
    );
    const totalTargetProgram = [1, 2, 3, 4, 5, 6].reduce(
      (acc, i) => acc + parseFloat(sumsProgram[`target_tahun_${i}`] || 0),
      0
    );
    const avgTargetProgram = totalTargetProgram / 6;

    // 5️⃣ Update Program
    await RenstraProgram.update(
      {
        ...sumsProgram,
        pagu_akhir_renstra: totalPaguProgram,
        target_akhir_renstra: avgTargetProgram,
      },
      { where: { id: programId }, transaction }
    );

    console.log(
      `✅ Program ${programId} tersinkron bersama Kegiatan ${kegiatanIdInt}`
    );
  } catch (err) {
    console.error("❌ Gagal updateKegiatanPagu:", err.message);
    throw err;
  }
}

module.exports = updateKegiatanPagu;
