"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sub_kegiatan", "pagu_anggaran", {
      type: Sequelize.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("sub_kegiatan", "waktu_pelaksanaan", {
      type: Sequelize.DATE,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "nama_opd", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "nama_bidang_opd", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "sumber_daya_pendukung", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "rencana_lokasi_desa", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "rencana_lokasi_kecamatan", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "rencana_lokasi_kabupaten", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "deskripsi", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "kerangka_pelaksanaan", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "output", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
    await queryInterface.addColumn("sub_kegiatan", "pihak_terlibat", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("sub_kegiatan", "pagu_anggaran");
    await queryInterface.removeColumn("sub_kegiatan", "waktu_pelaksanaan");
    await queryInterface.removeColumn("sub_kegiatan", "nama_opd");
    await queryInterface.removeColumn("sub_kegiatan", "nama_bidang_opd");
    await queryInterface.removeColumn("sub_kegiatan", "sumber_daya_pendukung");
    await queryInterface.removeColumn("sub_kegiatan", "rencana_lokasi_desa");
    await queryInterface.removeColumn(
      "sub_kegiatan",
      "rencana_lokasi_kecamatan"
    );
    await queryInterface.removeColumn(
      "sub_kegiatan",
      "rencana_lokasi_kabupaten"
    );
    await queryInterface.removeColumn("sub_kegiatan", "deskripsi");
    await queryInterface.removeColumn("sub_kegiatan", "kerangka_pelaksanaan");
    await queryInterface.removeColumn("sub_kegiatan", "output");
    await queryInterface.removeColumn("sub_kegiatan", "pihak_terlibat");
  },
};
