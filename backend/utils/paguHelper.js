// utils/paguHelper.js
const { SubKegiatan, Kegiatan, Program, sequelize } = require("../models");
const { Op } = require("sequelize");

async function recalcKegiatanTotal(kegiatanId) {
  if (!kegiatanId) return;

  const total = await SubKegiatan.sum("pagu_anggaran", {
    where: { kegiatan_id: kegiatanId },
  });

  console.log(`📊 Kegiatan ${kegiatanId} total sub pagu: ${total}`);

  await Kegiatan.update(
    { total_pagu_anggaran: total || 0 },
    { where: { id: kegiatanId } }
  );
}

async function recalcProgramTotal(programId) {
  if (!programId) return;

  console.log("[recalcProgramTotal] programId:", programId);

  try {
    const [results] = await sequelize.query(
      `SELECT SUM(total_pagu_anggaran) AS total FROM kegiatan WHERE program_id = :programId`,
      {
        replacements: { programId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const total = results.total || 0;

    console.log("[recalcProgramTotal] total yang dihitung (raw):", total);

    await Program.update(
      { total_pagu_anggaran: total },
      {
        where: { id: programId, locked_pagu: false },
      }
    );

    console.log("[recalcProgramTotal] Program berhasil diupdate");
  } catch (err) {
    console.error("[recalcProgramTotal] ERROR:", err);
    throw err;
  }
}

async function recalcProgramTotalByKode(kode_program) {
  if (!kode_program) return;

  const kegiatanList = await Kegiatan.findAll({
    where: {
      kode_kegiatan: {
        [Op.like]: `${kode_program}%`,
      },
    },
    attributes: ["total_pagu_anggaran"],
  });

  const total = kegiatanList.reduce(
    (sum, item) => sum + Number(item.total_pagu_anggaran || 0),
    0
  );

  await Program.update(
    { total_pagu_anggaran: total },
    {
      where: {
        kode_program,
        locked_pagu: false,
      },
    }
  );
}

module.exports = {
  recalcKegiatanTotal,
  recalcProgramTotal,
  recalcProgramTotalByKode,
};
