"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Bersihkan data NULL
    await queryInterface.sequelize.query(`
      DELETE FROM sub_kegiatan
      WHERE kode_sub_kegiatan IS NULL OR periode_id IS NULL;
    `);

    // 2. Ubah kolom agar tidak nullable
    await queryInterface.changeColumn("sub_kegiatan", "kode_sub_kegiatan", {
      type: Sequelize.STRING(50),
      allowNull: false,
    });

    await queryInterface.changeColumn("sub_kegiatan", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 3. Tambahkan constraint UNIQUE
    await queryInterface.addConstraint("sub_kegiatan", {
      fields: ["periode_id", "kode_sub_kegiatan"],
      type: "unique",
      name: "unique_kode_sub_kegiatan_per_periode",
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Hapus constraint
    await queryInterface.removeConstraint(
      "sub_kegiatan",
      "unique_kode_sub_kegiatan_per_periode"
    );

    // 2. Kembalikan ke NULLABLE
    await queryInterface.changeColumn("sub_kegiatan", "kode_sub_kegiatan", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.changeColumn("sub_kegiatan", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
