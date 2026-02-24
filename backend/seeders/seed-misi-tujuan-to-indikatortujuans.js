"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE tujuan
      SET tahun = '2025',
          jenisDokumen = 'rpjmd'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Optional rollback jika perlu: reset ke NULL
    await queryInterface.sequelize.query(`
      UPDATE tujuan
      SET tahun = NULL,
          jenisDokumen = NULL
    `);
  },
};
