"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing table completely
    await queryInterface.dropTable("indikatorsasarans");

    // Recreate the table with the new schema
    await queryInterface.createTable("indikatorsasarans", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      kode_indikator: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      nama_indikator: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      tipe_indikator: {
        type: Sequelize.ENUM("Outcome"),
        allowNull: false,
      },
      jenis: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      tolok_ukur_kinerja: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      target_kinerja: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      jenis_indikator: {
        type: Sequelize.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: false,
      },
      kriteria_kuantitatif: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      kriteria_kualitatif: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      satuan: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      definisi_operasional: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metode_penghitungan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      baseline: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      target_tahun_1: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      target_tahun_2: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      target_tahun_3: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      target_tahun_4: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      target_tahun_5: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      sumber_data: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      penanggung_jawab: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop with new schema
    await queryInterface.dropTable("indikatorsasarans");

    // Recreate original table schema
    await queryInterface.createTable("indikatorsasarans", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      tujuan_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
      },
      kode_sasaran: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      uraian: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      satuan: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      target_awal: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_akhir: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      tahun_awal: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      tahun_akhir: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },
};
