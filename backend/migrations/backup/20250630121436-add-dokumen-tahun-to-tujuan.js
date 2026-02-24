"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tujuan", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "rpjmd", // berikan default jika ada data lama
    });

    await queryInterface.addColumn("tujuan", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025", // sesuaikan dengan data awal
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("tujuan", "jenisDokumen");
    await queryInterface.removeColumn("tujuan", "tahun");
  },
};
