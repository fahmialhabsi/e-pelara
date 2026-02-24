"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sub_kegiatan", "target_awal", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "target_akhir", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "satuan", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "realisasi_awal", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "realisasi_akhir", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "status_monitoring", {
      type: Sequelize.ENUM("on-track", "delay", "complete"),
      allowNull: false,
      defaultValue: "on-track",
    });
    await queryInterface.addColumn("sub_kegiatan", "tanggal_laporan", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "catatan", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Pada down, urutkan kebalikan dari up
    await queryInterface.removeColumn("sub_kegiatan", "catatan");
    await queryInterface.removeColumn("sub_kegiatan", "tanggal_laporan");
    await queryInterface.removeColumn("sub_kegiatan", "status_monitoring");
    await queryInterface.removeColumn("sub_kegiatan", "realisasi_akhir");
    await queryInterface.removeColumn("sub_kegiatan", "realisasi_awal");
    await queryInterface.removeColumn("sub_kegiatan", "satuan");
    await queryInterface.removeColumn("sub_kegiatan", "target_akhir");
    await queryInterface.removeColumn("sub_kegiatan", "target_awal");
    // Jika Anda menambahkan ENUM baru, Sequelize otomatis membersihkan tipe ENUM Anda
  },
};
