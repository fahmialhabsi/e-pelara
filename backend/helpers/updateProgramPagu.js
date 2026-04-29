// backend/helpers/updateProgramPagu.js
const { RenstraTabelKegiatan, RenstraProgram } = require("../models");
const { Sequelize } = require("sequelize");

async function updateProgramPagu(programId, transaction = null) {
  const programIdInt = parseInt(programId, 10);
  if (isNaN(programIdInt)) throw new Error("Invalid program id");

  const sumsProgram = await RenstraTabelKegiatan.findOne({
    where: { program_id: programIdInt },
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

  const totalPaguProgram = [1, 2, 3, 4, 5, 6].reduce(
    (acc, i) => acc + parseFloat(sumsProgram?.[`pagu_tahun_${i}`] || 0),
    0
  );

  const totalTargetProgram = [1, 2, 3, 4, 5, 6].reduce(
    (acc, i) => acc + parseFloat(sumsProgram?.[`target_tahun_${i}`] || 0),
    0
  );

  await RenstraProgram.update(
    {
      ...sumsProgram,
      pagu_akhir_renstra: totalPaguProgram,
      target_akhir_renstra: totalTargetProgram / 6,
    },
    { where: { id: programIdInt }, transaction }
  );
}

module.exports = updateProgramPagu;