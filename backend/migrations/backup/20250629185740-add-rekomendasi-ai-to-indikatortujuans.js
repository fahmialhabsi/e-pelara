"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("indikatortujuans", "rekomendasi_ai", {
      type: Sequelize.TEXT,
      allowNull: true,
      after: "keterangan", // opsional: tergantung urutan field yang diinginkan
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("indikatortujuans", "rekomendasi_ai");
  },
};
