"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_program_kode_combination
      ON program (
        periode_id,
        jenis_dokumen,
        kode_program
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_program_nama_combination
      ON program (
        periode_id,
        jenis_dokumen,
        nama_program
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX unique_program_kode_combination ON program;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX unique_program_nama_combination ON program;
    `);
  },
};
