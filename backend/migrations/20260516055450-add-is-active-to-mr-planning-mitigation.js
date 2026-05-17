"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("mr_planning_mitigation", "is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: "status_revisi",
    });

    await queryInterface.sequelize.query(`
      UPDATE mr_planning_mitigation
      SET is_active = 1
      WHERE is_active IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("mr_planning_mitigation", "is_active");
  },
};