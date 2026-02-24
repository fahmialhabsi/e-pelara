"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("indikatortujuans", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      misi_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "misis",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      tujuan_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: "tujuan",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
        type: Sequelize.ENUM("Impact"),
        allowNull: false,
      },
      jenis: {
        type: Sequelize.TEXT,
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
      rekomendasi_ai: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      jenis_dokumen: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tahun: {
        type: Sequelize.STRING,
        allowNull: false,
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
    await queryInterface.dropTable("indikatortujuans");
  },
};
