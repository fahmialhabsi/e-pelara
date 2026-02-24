"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn("sub_kegiatan", "anggaran_sub_kegiatan"),
      queryInterface.removeColumn("sub_kegiatan", "rpjmd_id"),
      queryInterface.removeColumn("sub_kegiatan", "sisa_anggaran"),
      queryInterface.removeColumn("sub_kegiatan", "waktu_pelaksanaan"),
      queryInterface.removeColumn("sub_kegiatan", "sumber_daya_pendukung"),
      queryInterface.removeColumn("sub_kegiatan", "rencana_lokasi_desa"),
      queryInterface.removeColumn("sub_kegiatan", "rencana_lokasi_kecamatan"),
      queryInterface.removeColumn("sub_kegiatan", "rencana_lokasi_kabupaten"),
      queryInterface.removeColumn("sub_kegiatan", "deskripsi"),
      queryInterface.removeColumn("sub_kegiatan", "kerangka_pelaksanaan"),
      queryInterface.removeColumn("sub_kegiatan", "output"),
      queryInterface.removeColumn("sub_kegiatan", "pihak_terlibat"),
      queryInterface.removeColumn("sub_kegiatan", "anggaran_kegiatan"),
      queryInterface.removeColumn("sub_kegiatan", "target_awal"),
      queryInterface.removeColumn("sub_kegiatan", "target_akhir"),
      queryInterface.removeColumn("sub_kegiatan", "satuan"),
      queryInterface.removeColumn("sub_kegiatan", "status_monitoring"),
      queryInterface.removeColumn("sub_kegiatan", "tanggal_laporan"),
      queryInterface.removeColumn("sub_kegiatan", "catatan"),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn("sub_kegiatan", "anggaran_sub_kegiatan", {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "rpjmd_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("sub_kegiatan", "sisa_anggaran", {
        type: Sequelize.DECIMAL(10, 0),
        allowNull: false,
        defaultValue: 0,
      }),
      queryInterface.addColumn("sub_kegiatan", "waktu_pelaksanaan", {
        type: Sequelize.DATE,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "sumber_daya_pendukung", {
        type: Sequelize.TEXT,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "rencana_lokasi_desa", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "rencana_lokasi_kecamatan", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "rencana_lokasi_kabupaten", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "deskripsi", {
        type: Sequelize.TEXT,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "kerangka_pelaksanaan", {
        type: Sequelize.TEXT,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "output", {
        type: Sequelize.TEXT,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "pihak_terlibat", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("sub_kegiatan", "anggaran_kegiatan", {
        type: Sequelize.DECIMAL,
        allowNull: false,
        defaultValue: 0,
      }),
      queryInterface.addColumn("sub_kegiatan", "target_awal", {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      }),
      queryInterface.addColumn("sub_kegiatan", "target_akhir", {
        type: Sequelize.DECIMAL(20, 2),
        allowNull: true,
      }),
      queryInterface.addColumn("sub_kegiatan", "satuan", {
        type: Sequelize.STRING(100),
        allowNull: true,
      }),
      queryInterface.addColumn("sub_kegiatan", "status_monitoring", {
        type: Sequelize.ENUM("on-track", "delay", "complete"),
        allowNull: false,
        defaultValue: "on-track",
      }),
      queryInterface.addColumn("sub_kegiatan", "tanggal_laporan", {
        type: Sequelize.DATE,
        allowNull: true,
      }),
      queryInterface.addColumn("sub_kegiatan", "catatan", {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ]);
  },
};
