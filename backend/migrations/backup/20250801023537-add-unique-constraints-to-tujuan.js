"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX unique_tujuan_combination
      ON \`tujuan\` (
        misi_id,
        no_tujuan,
        jenis_dokumen,
        tahun,
        periode_id
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX unique_tujuan_combination ON \`tujuan\`;
    `);
  },
};
