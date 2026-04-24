"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lak_snapshot", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun_anggaran: { type: Sequelize.INTEGER, allowNull: false },
      kelompok: {
        type: Sequelize.ENUM(
          "AKTIVITAS_OPERASI",
          "AKTIVITAS_INVESTASI",
          "AKTIVITAS_PENDANAAN",
          "SALDO_KAS",
        ),
        allowNull: false,
      },
      komponen: { type: Sequelize.STRING(100), allowNull: false },
      uraian: { type: Sequelize.TEXT, allowNull: true },
      nilai_tahun_ini: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      nilai_tahun_lalu: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      urutan: { type: Sequelize.INTEGER, allowNull: true },
      dikunci: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("lak_snapshot", {
      fields: ["tahun_anggaran", "kelompok", "komponen"],
      type: "unique",
      name: "unique_lak_per_komponen_tahun",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("lak_snapshot");
  },
};
