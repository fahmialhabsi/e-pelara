"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("indikator", "indikatorDetailModel");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("indikatorDetailModel", "indikator");
  },
};
