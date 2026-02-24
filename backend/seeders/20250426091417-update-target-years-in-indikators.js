"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      "indikator",
      {
        target_tahun_1: 100,
        target_tahun_2: 200,
        target_tahun_3: 300,
        target_tahun_4: 400,
        target_tahun_5: 500,
      },
      {
        // Kondisi WHERE kalau mau update spesifik, misal berdasarkan ID tertentu
        // kalau mau update semua data, kosongkan saja
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate(
      "indikator",
      {
        target_tahun_1: null,
        target_tahun_2: null,
        target_tahun_3: null,
        target_tahun_4: null,
        target_tahun_5: null,
      },
      {
        // sama seperti up, kosongkan atau kasih kondisi spesifik
      }
    );
  },
};
