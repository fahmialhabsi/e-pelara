"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("indikatorkegiatans", "program_id", {
      type: Sequelize.INTEGER.UNSIGNED, // Menggunakan UNSIGNED
      allowNull: true,
      references: {
        model: "indikatorprograms", // Nama tabel yang benar
        key: "id", // Kolom yang direferensikan
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("indikatorkegiatans", "program_id");
  },
};
