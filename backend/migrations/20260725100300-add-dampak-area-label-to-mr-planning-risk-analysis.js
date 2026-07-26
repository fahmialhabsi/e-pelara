"use strict";

/**
 * Kolom label denormalisasi utk dampak_area_ref_id (lihat migration
 * 20260725100000) — pola sama dengan existing_control_status/
 * control_adequacy_status/selera_risiko di tabel yang sama.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_risk_analysis", "dampak_area", {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: "dampak_area_ref_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("mr_planning_risk_analysis", "dampak_area");
  },
};
