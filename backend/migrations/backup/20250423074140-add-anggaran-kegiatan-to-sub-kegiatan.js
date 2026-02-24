"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sub_kegiatan", "anggaran_kegiatan", {
      type: Sequelize.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("sub_kegiatan", "anggaran_kegiatan");
  },
};
