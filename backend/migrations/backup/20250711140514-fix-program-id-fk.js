"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hapus foreign key lama jika ada
    try {
      await queryInterface.removeConstraint(
        "indikatorkegiatans",
        "indikatorkegiatans_program_id_foreign_idx" // Ganti jika perlu
      );
    } catch (err) {
      console.warn("⚠️ Constraint lama tidak ditemukan, lanjut...");
    }

    // Tambahkan foreign key baru yang benar ke tabel `program`
    await queryInterface.addConstraint("indikatorkegiatans", {
      fields: ["program_id"],
      type: "foreign key",
      name: "fk_indikatorkegiatans_program_id_to_program",
      references: {
        table: "program",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus constraint baru
    await queryInterface.removeConstraint(
      "indikatorkegiatans",
      "fk_indikatorkegiatans_program_id_to_program"
    );

    // Kembalikan ke FK lama (opsional)
    await queryInterface.addConstraint("indikatorkegiatans", {
      fields: ["program_id"],
      type: "foreign key",
      name: "indikatorkegiatans_program_id_foreign_idx",
      references: {
        table: "indikatorprograms",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },
};
