"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_kegiatan_kode_combination
      ON Kegiatan (
        periode_id,
        jenis_dokumen,
        kode_kegiatan
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_kegiatan_nama_combination
      ON Kegiatan (
        periode_id,
        jenis_dokumen,
        nama_kegiatan
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX unique_kegiatan_kode_combination ON Kegiatan;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX unique_kegiatan_nama_combination ON Kegiatan;
    `);
  },
};
