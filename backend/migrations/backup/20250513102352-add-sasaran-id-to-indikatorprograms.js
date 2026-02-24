"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatorprograms", "sasaran_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Atur sesuai kebutuhan Anda
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatorprograms", "sasaran_id");
  },
};
