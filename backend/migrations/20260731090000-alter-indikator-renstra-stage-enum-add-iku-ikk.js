"use strict";

/**
 * Modul Renstra — tambah jenis indikator "IKU" (Indikator Kinerja Utama) dan
 * "IKK" (Indikator Kinerja Kunci) sebagai stage baru di tabel indikator_renstra.
 *
 * Berbeda dari stage lain (tujuan..sub_kegiatan) yang mengikuti hierarki
 * RPJMD-cascading, IKU/IKK adalah indikator level OPD yang berdiri sendiri.
 * Kolom ref_id tetap NOT NULL sehingga untuk stage ini ref_id diisi sama
 * dengan renstra_id (lihat generatePayload di IndikatorIkuIkkForm.jsx).
 */

const TABLE_NAME = "indikator_renstra";

const OLD_STAGES = [
  "tujuan",
  "sasaran",
  "strategi",
  "kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
];

const NEW_STAGES = [...OLD_STAGES, "iku", "ikk"];

const buildEnumSql = (items) => items.map((item) => `'${item}'`).join(",");

const alterStageEnum = async ({ queryInterface, stages, transaction }) => {
  await queryInterface.sequelize.query(
    `
      ALTER TABLE \`${TABLE_NAME}\`
      MODIFY COLUMN \`stage\` ENUM(${buildEnumSql(stages)}) NOT NULL
    `,
    { transaction }
  );
};

const countStageUsage = async ({ queryInterface, stage, transaction }) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS total FROM \`${TABLE_NAME}\` WHERE \`stage\` = :stage`,
    { replacements: { stage }, transaction }
  );

  return Number(rows?.[0]?.total || 0);
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await alterStageEnum({ queryInterface, stages: NEW_STAGES, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const stage of ["iku", "ikk"]) {
        const used = await countStageUsage({ queryInterface, stage, transaction });
        if (used > 0) {
          throw new Error(
            `Rollback diblokir: tabel ${TABLE_NAME} sudah memiliki ${used} data dengan stage '${stage}'.`
          );
        }
      }

      await alterStageEnum({ queryInterface, stages: OLD_STAGES, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
