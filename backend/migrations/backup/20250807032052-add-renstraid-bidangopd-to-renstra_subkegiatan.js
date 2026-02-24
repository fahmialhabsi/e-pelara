"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_subkegiatan", "renstra_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "renstra_program_id", // opsional, biar urut
    });

    await queryInterface.addColumn("renstra_subkegiatan", "bidang_opd", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "nama_sub_kegiatan",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("renstra_subkegiatan", "renstra_id");
    await queryInterface.removeColumn("renstra_subkegiatan", "bidang_opd");
  },
};
