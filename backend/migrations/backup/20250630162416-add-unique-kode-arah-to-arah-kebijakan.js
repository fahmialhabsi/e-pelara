"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Hapus kolom prioritas jika ada
    await queryInterface
      .removeColumn("arah_kebijakan", "prioritas")
      .catch(() => {});

    // Tambahkan constraint unik
    await queryInterface.addConstraint("arah_kebijakan", {
      fields: ["kode_arah"],
      type: "unique",
      name: "unique_kode_arah_constraint",
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback: tambah kembali kolom prioritas
    await queryInterface.addColumn("arah_kebijakan", "prioritas", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Rollback: hapus constraint unik
    await queryInterface.removeConstraint(
      "arah_kebijakan",
      "unique_kode_arah_constraint"
    );
  },
};
