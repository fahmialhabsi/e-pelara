"use strict";

/**
 * PHASE REPORT 2026 — STEP R17A-2A-1
 * Risk Scope Nullable Compatibility for Proposal Intake
 *
 * Tujuan:
 * Mengizinkan mr_planning_risk menyimpan risiko non-Renstra
 * tanpa memaksa renstra_id dan indikator_id.
 *
 * Guard:
 * - Flow Renstra tetap divalidasi di service.
 * - Tidak mengubah data lama.
 * - Tidak menyentuh report/export R16H.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.changeColumn(
        "mr_planning_risk",
        "renstra_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "mr_planning_risk",
        "indikator_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [rows] = await queryInterface.sequelize.query(
        `
          SELECT COUNT(*) AS total
          FROM mr_planning_risk
          WHERE renstra_id IS NULL
             OR indikator_id IS NULL
        `,
        { transaction }
      );

      const total = Number(rows?.[0]?.total || 0);

      if (total > 0) {
        throw new Error(
          `Rollback diblokir: terdapat ${total} risk non-Renstra dengan renstra_id/indikator_id NULL.`
        );
      }

      await queryInterface.changeColumn(
        "mr_planning_risk",
        "renstra_id",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "mr_planning_risk",
        "indikator_id",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};