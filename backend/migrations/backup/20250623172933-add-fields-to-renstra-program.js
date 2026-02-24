"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn("renstra_program", "rpjmd_program_id", {
        type: Sequelize.UUID,
        allowNull: true,
      }),
      queryInterface.addColumn("renstra_program", "misi_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("renstra_program", "no_program", {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("renstra_program", "isi_program", {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn("renstra_program", "no_rpjmd", {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("renstra_program", "isi_program_rpjmd", {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      // 🔥 Hapus kolom indikator_program
      queryInterface.removeColumn("renstra_program", "indikator_program"),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn("renstra_program", "rpjmd_program_id"),
      queryInterface.removeColumn("renstra_program", "misi_id"),
      queryInterface.removeColumn("renstra_program", "no_program"),
      queryInterface.removeColumn("renstra_program", "isi_program"),
      queryInterface.removeColumn("renstra_program", "no_rpjmd"),
      queryInterface.removeColumn("renstra_program", "isi_program_rpjmd"),
      // ✅ Tambahkan kembali jika rollback
      queryInterface.addColumn("renstra_program", "indikator_program", {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ]);
  },
};
