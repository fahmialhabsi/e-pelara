"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Menghapus kolom renstra_id dan renstra_opd_id
    await queryInterface.removeColumn("renstra_subkegiatan", "renstra_id");
    await queryInterface.removeColumn("renstra_subkegiatan", "renstra_opd_id");
  },

  down: async (queryInterface, Sequelize) => {
    // Mengembalikan kolom jika rollback
    await queryInterface.addColumn("renstra_subkegiatan", "renstra_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "renstra_program_id", // opsional, menyesuaikan posisi kolom
    });

    await queryInterface.addColumn("renstra_subkegiatan", "renstra_opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "sub_kegiatan_id", // opsional, menyesuaikan posisi kolom
    });
  },
};
