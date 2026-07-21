"use strict";

/**
 * Modul TLHP — BPKP wiring (lihat catatan Judgment Call #1 di rencana implementasi)
 *
 * Tujuan:
 * Menambah nilai ENUM stage "temuan_bpkp" pada mr_planning_context_item dan
 * mr_planning_risk. Nilai temuan_bpk/temuan_inspektorat sudah ada lebih dulu,
 * tapi BPKP belum pernah diselesaikan wiring-nya walau sudah diantisipasi di
 * mrReportGovernanceContractHelper.js (isBpkpReportScope, dst).
 *
 * Guard:
 * - Tidak menghapus stage lama.
 * - Rollback dilindungi agar tidak merusak data yang sudah memakai temuan_bpkp.
 */

const TABLES = ["mr_planning_context_item", "mr_planning_risk"];

const OLD_STAGES = [
  "tujuan",
  "sasaran",
  "strategi",
  "kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
  "lakip",
  "lk",
  "temuan_bpk",
  "temuan_inspektorat",
  "pelaksanaan_kegiatan",
  "pertanggungjawaban_keuangan",
  "spip_e_sigap",
  "manual_adhoc",
  "lainnya",
];

const NEW_STAGES = [...OLD_STAGES, "temuan_bpkp"];

const buildEnumSql = (items) => items.map((item) => `'${item}'`).join(",");

const alterStageEnum = async ({ queryInterface, tableName, stages, transaction }) => {
  await queryInterface.sequelize.query(
    `
      ALTER TABLE \`${tableName}\`
      MODIFY COLUMN \`stage\` ENUM(${buildEnumSql(stages)}) NOT NULL
    `,
    { transaction }
  );
};

const countStageUsage = async ({ queryInterface, tableName, stage, transaction }) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS total FROM \`${tableName}\` WHERE \`stage\` = :stage`,
    { replacements: { stage }, transaction }
  );

  return Number(rows?.[0]?.total || 0);
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const tableName of TABLES) {
        await alterStageEnum({ queryInterface, tableName, stages: NEW_STAGES, transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const tableName of TABLES) {
        const used = await countStageUsage({
          queryInterface,
          tableName,
          stage: "temuan_bpkp",
          transaction,
        });

        if (used > 0) {
          throw new Error(
            `Rollback diblokir: tabel ${tableName} sudah memiliki ${used} data dengan stage 'temuan_bpkp'.`
          );
        }
      }

      for (const tableName of TABLES) {
        await alterStageEnum({ queryInterface, tableName, stages: OLD_STAGES, transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
