"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambahkan kolom renstra_id ke tabel renstra_sasaran
    await queryInterface.addColumn("renstra_sasaran", "renstra_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // ubah ke false jika data wajib
    });

    // Tambahkan foreign key constraint
    await queryInterface.addConstraint("renstra_sasaran", {
      fields: ["renstra_id"],
      type: "foreign key",
      name: "fk_renstra_sasaran_renstra_id",
      references: {
        table: "renstra_opd",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // atau CASCADE jika ingin ikut terhapus
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus constraint terlebih dahulu
    await queryInterface.removeConstraint(
      "renstra_sasaran",
      "fk_renstra_sasaran_renstra_id"
    );

    // Hapus kolom renstra_id
    await queryInterface.removeColumn("renstra_sasaran", "renstra_id");
  },
};
