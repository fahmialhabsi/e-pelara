"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikator_detail", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "RPJMD", // atau kosongkan kalau kamu mau isi manual
    });

    await queryInterface.addColumn("indikator_detail", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikator_detail", "jenisDokumen");
    await queryInterface.removeColumn("indikator_detail", "tahun");
  },
};
