"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Periksa apakah kolom ada sebelum dihapus
    const table = await queryInterface.describeTable("renstra_program");

    if (table.program_id) {
      await queryInterface.removeColumn("renstra_program", "program_id");
    }
  },

  async down(queryInterface, Sequelize) {
    // Menambahkan kembali kolom jika diperlukan
    await queryInterface.addColumn("renstra_program", "program_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
