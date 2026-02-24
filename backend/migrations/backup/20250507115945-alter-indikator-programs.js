"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Jika masih ada constraint FK ke tabel ini, lepaskan dulu:
    // await queryInterface.removeConstraint('indikatorprograms', 'nama_constraint_fk');

    // 2. Drop tabel lama
    await queryInterface.dropTable("indikatorprograms");

    // 3. Recreate tabel dengan skema baru
    await queryInterface.createTable("indikatorprograms", {
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
        type: Sequelize.ENUM("Output"),
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
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Drop tabel baru
    await queryInterface.dropTable("indikatorprograms");

    // 2. Drop tipe ENUM (Postgres)
    // await queryInterface.sequelize.query(
    //   `DROP TYPE IF EXISTS "enum_indikatorprograms_tipe_indikator";`
    // );
    // await queryInterface.sequelize.query(
    //   `DROP TYPE IF EXISTS "enum_indikatorprograms_jenis_indikator";`
    // );

    // 3. Recreate tabel lama
    await queryInterface.createTable("indikatorprograms", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      sasaran_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      kode_program: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      nama_program: {
        type: Sequelize.TEXT,
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
      target: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      anggaran: {
        type: Sequelize.FLOAT,
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
