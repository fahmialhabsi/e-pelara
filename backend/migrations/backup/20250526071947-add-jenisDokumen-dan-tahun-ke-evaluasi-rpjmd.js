"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("evaluasi_rpjmd", "jenisDokumen", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "RPJMD", // atau kosongkan kalau kamu mau isi manual
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("evaluasi_rpjmd", "jenisDokumen");
  },
};
