"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("sub_kegiatan", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "kegiatan", // nama tabel yang dirujuk
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      nama_sub_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kode_sub_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      anggaran_sub_kegiatan: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      pagu_anggaran: {
        type: Sequelize.DECIMAL,
        allowNull: false,
      },
      waktu_pelaksanaan: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      nama_opd: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_bidang_opd: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sumber_daya_pendukung: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      rencana_lokasi_desa: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rencana_lokasi_kecamatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rencana_lokasi_kabupaten: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      kerangka_pelaksanaan: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      output: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      pihak_terlibat: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("sub_kegiatan");
  },
};
