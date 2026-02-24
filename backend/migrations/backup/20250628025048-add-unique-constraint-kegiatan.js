"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Hapus record yang memiliki NULL pada kode_kegiatan atau periode_id
    await queryInterface.sequelize.query(`
      DELETE FROM kegiatan 
      WHERE kode_kegiatan IS NULL OR periode_id IS NULL;
    `);

    // 2. Ubah kolom menjadi NOT NULL
    await queryInterface.changeColumn("kegiatan", "kode_kegiatan", {
      type: Sequelize.STRING(50),
      allowNull: false,
    });

    await queryInterface.changeColumn("kegiatan", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    // 3. Tambahkan constraint unik
    await queryInterface.addConstraint("kegiatan", {
      fields: ["periode_id", "kode_kegiatan"],
      type: "unique",
      name: "unique_kode_kegiatan_per_periode",
    });

    await queryInterface.addConstraint("kegiatan", {
      fields: ["periode_id", "nama_kegiatan"],
      type: "unique",
      name: "unique_nama_kegiatan_per_periode",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint(
      "kegiatan",
      "unique_kode_kegiatan_per_periode"
    );
    await queryInterface.removeConstraint(
      "kegiatan",
      "unique_nama_kegiatan_per_periode"
    );

    await queryInterface.changeColumn("kegiatan", "kode_kegiatan", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.changeColumn("kegiatan", "periode_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
