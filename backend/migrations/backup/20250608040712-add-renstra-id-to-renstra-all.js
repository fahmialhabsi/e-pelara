"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = [
      "indikator_renstra", // Nama benar
      "renstra_kebijakan",
      "renstra_kegiatan",
      "renstra_program",
      "renstra_strategi",
      "renstra_subkegiatan",
      // "renstra_tujuan" → Sudah punya kolom, tidak perlu diulang
    ];

    for (const table of tables) {
      await queryInterface.addColumn(table, "renstra_id", {
        type: Sequelize.INTEGER,
        allowNull: true, // Bisa diubah ke false jika data pasti selalu ada
      });

      await queryInterface.addConstraint(table, {
        fields: ["renstra_id"],
        type: "foreign key",
        name: `fk_${table}_renstra_id`,
        references: {
          table: "renstra_opd",
          field: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  down: async (queryInterface) => {
    const tables = [
      "indikator_renstra",
      "renstra_kebijakan",
      "renstra_kegiatan",
      "renstra_program",
      "renstra_strategi",
      "renstra_subkegiatan",
    ];

    for (const table of tables) {
      await queryInterface.removeConstraint(table, `fk_${table}_renstra_id`);
      await queryInterface.removeColumn(table, "renstra_id");
    }
  },
};
