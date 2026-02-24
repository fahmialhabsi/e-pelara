"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_sasaran_clone
      ON sasaran (tujuan_id, nomor, jenis_dokumen, tahun);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX unique_sasaran_clone ON sasaran;
    `);
  },
};
