"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatorsasarans", "tujuan_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // Atur sesuai kebutuhan Anda
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatorsasarans", "tujuan_id");
  },
};
