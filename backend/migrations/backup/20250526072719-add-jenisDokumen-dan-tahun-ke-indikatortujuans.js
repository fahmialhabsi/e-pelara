"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikatortujuans", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "RPJMD", // atau kosongkan kalau kamu mau isi manual
    });

    await queryInterface.addColumn("indikatortujuans", "tahun", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "2025",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikatortujuans", "jenisDokumen");
    await queryInterface.removeColumn("indikatortujuans", "tahun");
  },
};
