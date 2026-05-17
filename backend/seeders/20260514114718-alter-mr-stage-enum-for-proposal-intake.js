"use strict";

/**
 * PHASE REPORT 2026 — STEP R17A-2A
 * Context Item & Risk Stage Compatibility Migration
 *
 * Tujuan:
 * Menambah nilai ENUM stage untuk mendukung proposal intake non-Renstra:
 * - temuan_bpk
 * - temuan_inspektorat
 * - pelaksanaan_kegiatan
 * - pertanggungjawaban_keuangan
 * - spip_e_sigap
 * - manual_adhoc
 * - lainnya
 *
 * Guard:
 * - Tidak menghapus stage lama.
 * - Tidak mengubah data Renstra existing.
 * - Tidak menyentuh report/export R16H.
 * - Rollback dilindungi agar tidak merusak data non-Renstra yang sudah dibuat.
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
];

const NEW_STAGES = [
  ...OLD_STAGES,
  "temuan_bpk",
  "temuan_inspektorat",
  "pelaksanaan_kegiatan",
  "pertanggungjawaban_keuangan",
  "spip_e_sigap",
  "manual_adhoc",
  "lainnya",
];

const buildEnumSql = (items) =>
  items.map((item) => `'${item}'`).join(",");

const alterStageEnum = async ({ queryInterface, tableName, stages, transaction }) => {
  await queryInterface.sequelize.query(
    `
      ALTER TABLE \`${tableName}\`
      MODIFY COLUMN \`stage\` ENUM(${buildEnumSql(stages)}) NOT NULL
    `,
    { transaction }
  );
};

const countNewStageUsage = async ({ queryInterface, tableName, transaction }) => {
  const newOnlyStages = NEW_STAGES.filter((stage) => !OLD_STAGES.includes(stage));

  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT COUNT(*) AS total
      FROM \`${tableName}\`
      WHERE \`stage\` IN (${buildEnumSql(newOnlyStages)})
    `,
    { transaction }
  );

  return Number(rows?.[0]?.total || 0);
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      for (const tableName of TABLES) {
        await alterStageEnum({
          queryInterface,
          tableName,
          stages: NEW_STAGES,
          transaction,
        });
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
        const used = await countNewStageUsage({
          queryInterface,
          tableName,
          transaction,
        });

        if (used > 0) {
          throw new Error(
            `Rollback diblokir: tabel ${tableName} sudah memiliki ${used} data dengan stage non-Renstra. Bersihkan atau migrasikan data tersebut terlebih dahulu sebelum rollback.`
          );
        }
      }

      for (const tableName of TABLES) {
        await alterStageEnum({
          queryInterface,
          tableName,
          stages: OLD_STAGES,
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};