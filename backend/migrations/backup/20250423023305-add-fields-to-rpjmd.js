"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("rpjmd");

    // Menambahkan kolom yang belum ada
    if (!tableInfo.periode_awal) {
      await queryInterface.addColumn("rpjmd", "periode_awal", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (!tableInfo.periode_akhir) {
      await queryInterface.addColumn("rpjmd", "periode_akhir", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (!tableInfo.tahun_penetapan) {
      await queryInterface.addColumn("rpjmd", "tahun_penetapan", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (!tableInfo.akronim) {
      await queryInterface.addColumn("rpjmd", "akronim", {
        type: Sequelize.STRING,
      });
    }

    if (!tableInfo.foto_kepala_daerah) {
      await queryInterface.addColumn("rpjmd", "foto_kepala_daerah", {
        type: Sequelize.STRING,
      });
    }

    if (!tableInfo.foto_wakil_kepala_daerah) {
      await queryInterface.addColumn("rpjmd", "foto_wakil_kepala_daerah", {
        type: Sequelize.STRING,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus kolom jika rollback
    await queryInterface.removeColumn("rpjmd", "periode_awal");
    await queryInterface.removeColumn("rpjmd", "periode_akhir");
    await queryInterface.removeColumn("rpjmd", "tahun_penetapan");
    await queryInterface.removeColumn("rpjmd", "akronim");
    await queryInterface.removeColumn("rpjmd", "foto_kepala_daerah");
    await queryInterface.removeColumn("rpjmd", "foto_wakil_kepala_daerah");
  },
};
