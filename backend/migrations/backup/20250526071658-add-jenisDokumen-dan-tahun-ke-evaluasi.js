"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("evaluasi", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "RPJMD", // atau kosongkan kalau kamu mau isi manual
    });

    await queryInterface.addColumn("evaluasi", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("evaluasi", "jenisDokumen");
    await queryInterface.removeColumn("evaluasi", "tahun");
  },
};
