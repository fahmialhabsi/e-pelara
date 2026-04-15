"use strict";

/**
 * Tabel untuk Prioritas Nasional, Prioritas Daerah, dan Prioritas Gubernur.
 * Dibedakan dengan kolom `jenis_prioritas`: 'nasional' | 'daerah' | 'gubernur'
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes("renstra_tabel_prioritas")) {
      console.log("Tabel renstra_tabel_prioritas sudah ada, skip.");
      return;
    }

    await queryInterface.createTable("renstra_tabel_prioritas", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      renstra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "FK ke renstra_opd.id",
      },
      jenis_prioritas: {
        type: Sequelize.ENUM("nasional", "daerah", "gubernur"),
        allowNull: false,
        defaultValue: "nasional",
        comment: "Jenis prioritas: nasional, daerah, gubernur",
      },
      nama_prioritas: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Nama program/kegiatan prioritas",
      },
      kode_prioritas: { type: Sequelize.STRING(50), allowNull: true },
      indikator: { type: Sequelize.STRING(255), allowNull: true },
      baseline: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      satuan_target: { type: Sequelize.STRING(100), allowNull: true },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      opd_penanggung_jawab: { type: Sequelize.STRING(255), allowNull: true },
      program_terkait: { type: Sequelize.STRING(255), allowNull: true },
      kegiatan_terkait: { type: Sequelize.STRING(255), allowNull: true },
      target_tahun_1: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_2: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_3: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_4: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_5: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      target_tahun_6: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 0 },
      pagu_tahun_1: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_2: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_3: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_4: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_5: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      pagu_tahun_6: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      target_akhir_renstra: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
      pagu_akhir_renstra: { type: Sequelize.DECIMAL(20, 2), allowNull: true, defaultValue: 0 },
      keterangan: { type: Sequelize.TEXT, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("renstra_tabel_prioritas", ["renstra_id", "jenis_prioritas"], {
      name: "idx_rtp_renstra_jenis",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("renstra_tabel_prioritas");
  },
};
