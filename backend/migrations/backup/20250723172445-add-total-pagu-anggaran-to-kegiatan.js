"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("kegiatan", "total_pagu_anggaran", {
      type: Sequelize.BIGINT,
      allowNull: true,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("kegiatan", "total_pagu_anggaran");
  },
};
