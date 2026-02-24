"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("arah_kebijakan", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "RPJMD", // atau kosongkan kalau kamu mau isi manual
    });

    await queryInterface.addColumn("arah_kebijakan", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("arah_kebijakan", "jenisDokumen");
    await queryInterface.removeColumn("arah_kebijakan", "tahun");
  },
};
