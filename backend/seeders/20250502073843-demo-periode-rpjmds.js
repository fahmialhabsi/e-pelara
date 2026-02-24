// seeders/20250606-demo-periode-rpjmds.js

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("periode_rpjmds", [
      {
        nama: "RPJMD 2020-2024",
        tahun_awal: 2020,
        tahun_akhir: 2024,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nama: "RPJMD 2025-2029",
        tahun_awal: 2025,
        tahun_akhir: 2029,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("periode_rpjmds", null, {});
  },
};
