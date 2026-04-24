"use strict";

/** Sinkron data kinerja/monev dari SIGAP untuk CALK Bab II & non-keuangan */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lk_kinerja", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      kode_referensi: { type: Sequelize.STRING(64), allowNull: true },
      judul: { type: Sequelize.STRING(255), allowNull: true },
      target: { type: Sequelize.TEXT, allowNull: true },
      realisasi: { type: Sequelize.TEXT, allowNull: true },
      satuan: { type: Sequelize.STRING(64), allowNull: true },
      kuartal: { type: Sequelize.INTEGER, allowNull: true },
      payload: { type: Sequelize.JSON, allowNull: true },
      sumber: { type: Sequelize.STRING(32), defaultValue: "SIGAP" },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("lk_kinerja", ["tahun_anggaran"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lk_kinerja");
  },
};
