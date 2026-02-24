"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikatorsasarans", "indikator_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      after: "id",
    });

    await queryInterface.addColumn("indikatorsasarans", "sasaran_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      after: "indikator_id",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikatorsasarans", "sasaran_id");
    await queryInterface.removeColumn("indikatorsasarans", "indikator_id");
  },
};
