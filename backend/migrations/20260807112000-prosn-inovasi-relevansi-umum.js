'use strict';

/**
 * ProSN Indicator Foundation (spek 34) §3.4, D3 — reuse prosnp_inovasi utk MBG
 * 2.7 lewat kolom generik baru relevansi_umum. Kolom relevansi_pengadaan/
 * pengelolaan/penyaluran TETAP dipakai khusus B.1.4, TIDAK diubah/dihapus.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_inovasi', 'relevansi_umum', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
      comment: 'Relevansi generik thd objek indikator ProSN yg dinilai (dipakai indikator selain Ketahanan Pangan, mis. MBG 2.7). Kolom relevansi_pengadaan/pengelolaan/penyaluran TETAP dipakai khusus B.1.4.',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('prosnp_inovasi', 'relevansi_umum');
  },
};
