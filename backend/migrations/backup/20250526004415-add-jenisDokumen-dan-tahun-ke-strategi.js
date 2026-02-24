"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("strategi", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "RPJMD", // atau kosongkan kalau kamu mau isi manual
    });

    await queryInterface.addColumn("strategi", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("strategi", "jenisDokumen");
    await queryInterface.removeColumn("strategi", "tahun");
  },
};
