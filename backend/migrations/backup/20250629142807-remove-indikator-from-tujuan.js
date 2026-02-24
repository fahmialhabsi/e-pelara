"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("tujuan", "indikator");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("tujuan", "indikator", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
