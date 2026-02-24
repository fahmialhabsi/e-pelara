"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikator", "target");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikator", "target", {
      type: Sequelize.STRING, // tipe datanya disesuaikan dengan sebelumnya ya
      allowNull: true,
    });
  },
};
