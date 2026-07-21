'use strict';

/**
 * `kode_unik_sub_kegiatan` (`${tahun}-${opd_id}-${sub_kegiatan}-${tahapan}`) dibentuk
 * dari `sub_kegiatan` yang bisa sampai 255 karakter (STRING default Sequelize) —
 * VARCHAR(150) lama meluap utk nama Sub Kegiatan Permendagri 77/2020 yang panjang
 * (mis. "Koordinasi dan Sinkronisasi Pelaksanaan Advokasi, Edukasi, dan Sosialisasi
 * Konsumsi Pangan Beragam, Bergizi, ..."), gagal INSERT dgn error DB mentah "Data too
 * long for column" alih-alih pesan yang jelas. Dilebarkan ke 400 (255 + overhead
 * prefix tahun/opd_id + suffix tahapan terpanjang "APBD_PERUBAHAN").
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('rka', 'kode_unik_sub_kegiatan', {
      type: Sequelize.STRING(400),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('rka', 'kode_unik_sub_kegiatan', {
      type: Sequelize.STRING(150),
      allowNull: false,
    });
  },
};
