"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("neraca_snapshot", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      kode_akun: { type: Sequelize.STRING(30), allowNull: false },
      nama_akun: { type: Sequelize.STRING(255), allowNull: true },
      kelompok: {
        type: Sequelize.ENUM("ASET", "KEWAJIBAN", "EKUITAS"),
        allowNull: false,
      },
      nilai_tahun_ini: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: Sequelize.INTEGER, allowNull: true },
      dikunci: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("neraca_snapshot", {
      fields: ["tahun_anggaran", "kode_akun"],
      type: "unique",
      name: "unique_neraca_per_akun_tahun",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("neraca_snapshot");
  },
};
