'use strict';

/**
 * Lampiran surat 000.7/4486/SETDA menyatakan ID DDP "dapat dikosongkan jika
 * tidak mengacu ke Daftar Data Pusat/Data Prioritas". Tanpa penanda, kolom
 * kosong karena memang tidak mengacu tidak dapat dibedakan dari kolom kosong
 * karena belum diperiksa — padahal yang pertama sudah lengkap dan yang kedua
 * masih menjadi temuan. Kolom ini merekam pembedaan tersebut.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sdi_daftar_data', 'id_ddp_status', {
      type: Sequelize.ENUM('belum_dicek', 'mengacu', 'tidak_mengacu'),
      allowNull: false,
      defaultValue: 'belum_dicek',
      after: 'id_ddp',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('sdi_daftar_data', 'id_ddp_status');
  },
};
