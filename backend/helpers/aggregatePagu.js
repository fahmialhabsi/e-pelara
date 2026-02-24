// helpers/aggregatePagu.js
const {
  RenstraKegiatan,
  RenstraTabelKegiatan,
  RenstraTabelSubkegiatan,
  RenstraProgram,
  sequelize,
} = require("../models");

/**
 * Update pagu & target di level Kegiatan berdasarkan seluruh Subkegiatan,
 * lalu otomatis update Program.
 *
 * @param {number} kegiatanId - id di RenstraKegiatan
 * @param {object} transaction - opsional, Sequelize transaction
 */
async function updateKegiatanPagu(kegiatanId, transaction = null) {
  const t = transaction || (await sequelize.transaction());
  let commit = !transaction;

  try {
    // 1️⃣ Pastikan Kegiatan ada
    const kegiatan = await RenstraKegiatan.findByPk(kegiatanId, {
      attributes: ["id", "program_id"],
      transaction: t,
    });
    if (!kegiatan) throw new Error("Kegiatan tidak ditemukan");

    // 2️⃣ Hitung total target + pagu dari semua Subkegiatan
    const totals = await RenstraTabelSubkegiatan.findOne({
      where: { kegiatan_id: kegiatanId },
      attributes: [
        ...[1, 2, 3, 4, 5, 6].map((i) => [
          sequelize.fn(
            "COALESCE",
            sequelize.fn("SUM", sequelize.col(`target_tahun_${i}`)),
            0
          ),
          `target_tahun_${i}`,
        ]),
        ...[1, 2, 3, 4, 5, 6].map((i) => [
          sequelize.fn(
            "COALESCE",
            sequelize.fn("SUM", sequelize.col(`pagu_tahun_${i}`)),
            0
          ),
          `pagu_tahun_${i}`,
        ]),
      ],
      raw: true,
      transaction: t,
    });

    const totalPagu = [1, 2, 3, 4, 5, 6].reduce(
      (acc, i) => acc + parseFloat(totals[`pagu_tahun_${i}`] || 0),
      0
    );
    const totalTarget = [1, 2, 3, 4, 5, 6].reduce(
      (acc, i) => acc + parseFloat(totals[`target_tahun_${i}`] || 0),
      0
    );
    const avgTarget = totalTarget / 6;

    // 3️⃣ Simpan ke RenstraTabelKegiatan
    const existing = await RenstraTabelKegiatan.findOne({
      where: { kegiatan_id: kegiatan.id },
      transaction: t,
    });

    const kegiatanPayload = {
      program_id: kegiatan.program_id,
      kegiatan_id: kegiatan.id,
      ...totals,
      pagu_akhir_renstra: totalPagu,
      target_akhir_renstra: avgTarget,
    };

    if (!existing) {
      await RenstraTabelKegiatan.create(kegiatanPayload, { transaction: t });
    } else {
      await existing.update(kegiatanPayload, { transaction: t });
    }

    // 4️⃣ Update Program juga
    await updateProgramPagu(kegiatan.program_id, t);

    if (commit) await t.commit();
    console.log(
      `✅ Sinkron kegiatan ${kegiatanId} → program ${kegiatan.program_id}`
    );
  } catch (err) {
    if (commit) await t.rollback();
    console.error("❌ Gagal updateKegiatanPagu:", err.message);
    throw err;
  }
}

/**
 * Update pagu & target di level Program berdasarkan seluruh Kegiatan
 */
async function updateProgramPagu(programId, transaction = null) {
  const totals = await RenstraTabelKegiatan.findOne({
    where: { program_id: programId },
    attributes: [
      ...[1, 2, 3, 4, 5, 6].map((i) => [
        sequelize.fn(
          "COALESCE",
          sequelize.fn("SUM", sequelize.col(`target_tahun_${i}`)),
          0
        ),
        `target_tahun_${i}`,
      ]),
      ...[1, 2, 3, 4, 5, 6].map((i) => [
        sequelize.fn(
          "COALESCE",
          sequelize.fn("SUM", sequelize.col(`pagu_tahun_${i}`)),
          0
        ),
        `pagu_tahun_${i}`,
      ]),
    ],
    raw: true,
    transaction,
  });

  const totalPagu = [1, 2, 3, 4, 5, 6].reduce(
    (acc, i) => acc + parseFloat(totals[`pagu_tahun_${i}`] || 0),
    0
  );
  const totalTarget = [1, 2, 3, 4, 5, 6].reduce(
    (acc, i) => acc + parseFloat(totals[`target_tahun_${i}`] || 0),
    0
  );
  const avgTarget = totalTarget / 6;

  await RenstraProgram.update(
    {
      ...totals,
      pagu_akhir_renstra: totalPagu,
      target_akhir_renstra: avgTarget,
    },
    { where: { id: programId }, transaction }
  );

  console.log(`🔄 Program ${programId} tersinkron dari seluruh kegiatan`);
}

module.exports = {
  updateKegiatanPagu,
  updateProgramPagu,
};
