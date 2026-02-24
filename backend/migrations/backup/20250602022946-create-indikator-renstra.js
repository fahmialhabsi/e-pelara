"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("indikator_renstra", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      ref_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      stage: {
        type: Sequelize.ENUM(
          "tujuan",
          "sasaran",
          "strategi",
          "kebijakan",
          "program",
          "kegiatan",
          "sub_kegiatan"
        ),
        allowNull: false,
      },
      kode_indikator: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_indikator: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      satuan: Sequelize.STRING,
      definisi_operasional: Sequelize.TEXT,
      metode_penghitungan: Sequelize.TEXT,
      baseline: Sequelize.STRING,
      target_tahun_1: Sequelize.STRING,
      target_tahun_2: Sequelize.STRING,
      target_tahun_3: Sequelize.STRING,
      target_tahun_4: Sequelize.STRING,
      target_tahun_5: Sequelize.STRING,
      jenis_indikator: {
        type: Sequelize.ENUM("Kuantitatif", "Kualitatif"),
        allowNull: false,
      },
      tipe_indikator: {
        type: Sequelize.ENUM("Impact", "Outcome", "Output", "Proses"),
        allowNull: false,
      },
      kriteria_kuantitatif: Sequelize.STRING,
      kriteria_kualitatif: Sequelize.STRING,
      sumber_data: Sequelize.STRING,
      penanggung_jawab: Sequelize.STRING,
      keterangan: Sequelize.TEXT,
      tahun: Sequelize.STRING,
      jenis_dokumen: Sequelize.STRING,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("indikator_renstra");
  },
};
