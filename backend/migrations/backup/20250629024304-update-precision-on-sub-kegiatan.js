"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sub_kegiatan", "anggaran_kegiatan", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.changeColumn("sub_kegiatan", "sisa_anggaran", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sub_kegiatan", "anggaran_kegiatan", {
      type: Sequelize.DECIMAL(10, 0),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.changeColumn("sub_kegiatan", "sisa_anggaran", {
      type: Sequelize.DECIMAL(10, 0),
      allowNull: false,
      defaultValue: 0,
    });
  },
};
