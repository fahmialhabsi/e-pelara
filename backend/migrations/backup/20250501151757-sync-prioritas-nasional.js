"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Kosong, karena tabel sudah dibuat manual
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("prioritas_nasional");
  },
};
