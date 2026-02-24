"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program", "total_pagu_anggaran", {
      type: Sequelize.BIGINT,
      allowNull: true,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("program", "total_pagu_anggaran");
  },
};
