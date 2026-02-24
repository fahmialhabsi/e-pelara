"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_tabel_sasaran", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      tujuan_id: { type: Sequelize.INTEGER, allowNull: true },
      sasaran_id: { type: Sequelize.INTEGER, allowNull: true },
      indikator_id: { type: Sequelize.INTEGER, allowNull: true },
      baseline: { type: Sequelize.FLOAT, allowNull: true },
      satuan_target: { type: Sequelize.STRING(100), allowNull: true },
      target_tahun_1: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_2: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_3: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_4: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_5: { type: Sequelize.FLOAT, allowNull: true },
      target_tahun_6: { type: Sequelize.FLOAT, allowNull: true },
      pagu_tahun_1: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_2: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_3: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_4: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_5: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      pagu_tahun_6: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      kode_sasaran: { type: Sequelize.STRING(50), allowNull: true },
      nama_sasaran: { type: Sequelize.STRING(255), allowNull: true },
      opd_penanggung_jawab: { type: Sequelize.STRING(255), allowNull: true },
      target_akhir_renstra: { type: Sequelize.DECIMAL(10, 0), allowNull: true },
      pagu_akhir_renstra: { type: Sequelize.DECIMAL(20, 2), allowNull: true },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("renstra_tabel_sasaran");
  },
};
