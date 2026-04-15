"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("indikatorsubkegiatans", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      indikator_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "periode_rpjmds", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "sub_kegiatan", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      kegiatan_id: { type: Sequelize.INTEGER,          allowNull: true },
      program_id:  { type: Sequelize.INTEGER,          allowNull: true },
      sasaran_id:  { type: Sequelize.INTEGER, allowNull: true },
      tujuan_id:   { type: Sequelize.INTEGER, allowNull: true },
      misi_id:     { type: Sequelize.INTEGER, allowNull: true },
      kode_indikator:  { type: Sequelize.STRING(100), allowNull: false },
      nama_indikator:  { type: Sequelize.TEXT,        allowNull: false },
      kode_sub_kegiatan: { type: Sequelize.STRING(100), allowNull: true },
      nama_sub_kegiatan: { type: Sequelize.STRING(255), allowNull: true },
      tipe_indikator: {
        type: Sequelize.ENUM("Outcome", "Output", "Impact", "Process", "Input"),
        allowNull: true,
      },
      jenis:           { type: Sequelize.STRING(100), allowNull: true },
      jenis_indikator: {
        type: Sequelize.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: true,
      },
      satuan:               { type: Sequelize.STRING(50),   allowNull: true },
      tolok_ukur_kinerja:   { type: Sequelize.TEXT,         allowNull: true },
      target_kinerja:       { type: Sequelize.TEXT,         allowNull: true },
      kriteria_kuantitatif: { type: Sequelize.TEXT,         allowNull: true },
      kriteria_kualitatif:  { type: Sequelize.TEXT,         allowNull: true },
      definisi_operasional: { type: Sequelize.TEXT,         allowNull: true },
      metode_penghitungan:  { type: Sequelize.TEXT,         allowNull: true },
      baseline:             { type: Sequelize.TEXT,         allowNull: true },
      target_awal:          { type: Sequelize.DECIMAL(15,2), allowNull: true },
      target_akhir:         { type: Sequelize.DECIMAL(15,2), allowNull: true },
      tahun_awal:           { type: Sequelize.INTEGER,      allowNull: true },
      tahun_akhir:          { type: Sequelize.INTEGER,      allowNull: true },
      realisasi:            { type: Sequelize.DECIMAL(15,2), allowNull: true },
      anggaran:             { type: Sequelize.DECIMAL(20,2), allowNull: true },
      capaian_tahun_1:      { type: Sequelize.STRING(100), allowNull: true },
      capaian_tahun_2:      { type: Sequelize.STRING(100), allowNull: true },
      capaian_tahun_3:      { type: Sequelize.STRING(100), allowNull: true },
      capaian_tahun_4:      { type: Sequelize.STRING(100), allowNull: true },
      capaian_tahun_5:      { type: Sequelize.STRING(100), allowNull: true },
      target_tahun_1:       { type: Sequelize.STRING(100), allowNull: true },
      target_tahun_2:       { type: Sequelize.STRING(100), allowNull: true },
      target_tahun_3:       { type: Sequelize.STRING(100), allowNull: true },
      target_tahun_4:       { type: Sequelize.STRING(100), allowNull: true },
      target_tahun_5:       { type: Sequelize.STRING(100), allowNull: true },
      sumber_data:      { type: Sequelize.TEXT,    allowNull: true },
      penanggung_jawab: { type: Sequelize.INTEGER, allowNull: true },
      keterangan:       { type: Sequelize.TEXT,    allowNull: true },
      rekomendasi_ai:   { type: Sequelize.TEXT,    allowNull: true },
      jenis_dokumen: { type: Sequelize.STRING(50), allowNull: false },
      tahun:         { type: Sequelize.STRING(10), allowNull: false },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });

    await queryInterface.addIndex("indikatorsubkegiatans", {
      unique: true,
      name:   "unique_indikatorsubkegiatans",
      fields: ["indikator_id", "kode_indikator", "jenis_dokumen", "tahun"],
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("indikatorsubkegiatans");
  },
};
