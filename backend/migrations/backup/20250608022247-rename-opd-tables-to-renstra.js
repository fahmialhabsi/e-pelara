"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("tujuan_opd", "renstra_tujuan");
    await queryInterface.renameTable("subkegiatan_opd", "renstra_subkegiatan");
    await queryInterface.renameTable("strategi_opd", "renstra_strategi");
    await queryInterface.renameTable("sasaran_opd", "renstra_sasaran");
    await queryInterface.renameTable("program_opd", "renstra_program");
    await queryInterface.renameTable("kegiatan_opd", "renstra_kegiatan");
    await queryInterface.renameTable("kebijakan_opd", "renstra_kebijakan");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable("renstra_tujuan", "tujuan_opd");
    await queryInterface.renameTable("renstra_subkegiatan", "subkegiatan_opd");
    await queryInterface.renameTable("renstra_strategi", "strategi_opd");
    await queryInterface.renameTable("renstra_sasaran", "sasaran_opd");
    await queryInterface.renameTable("renstra_program", "program_opd");
    await queryInterface.renameTable("renstra_kegiatan", "kegiatan_opd");
    await queryInterface.renameTable("renstra_kebijakan", "kebijakan_opd");
  },
};
