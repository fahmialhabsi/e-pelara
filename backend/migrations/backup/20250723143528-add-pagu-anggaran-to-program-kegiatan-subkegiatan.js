"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("program", "pagu_anggaran", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn("kegiatan", "pagu_anggaran", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
    });

    await queryInterface.addColumn("sub_kegiatan", "pagu_anggaran", {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("program", "pagu_anggaran");
    await queryInterface.removeColumn("kegiatan", "pagu_anggaran");
    await queryInterface.removeColumn("sub_kegiatan", "pagu_anggaran");
  },
};
