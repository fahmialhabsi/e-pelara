"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_arah_kebijakan_combination
      ON arah_kebijakan (
        strategi_id,
        kode_arah(100),
        deskripsi(100),
        jenis_dokumen(50),
        tahun(10),
        periode_id
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX unique_arah_kebijakan_combination ON arah_kebijakan;
    `);
  },
};
