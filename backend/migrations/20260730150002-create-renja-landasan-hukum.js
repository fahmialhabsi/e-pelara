'use strict';

/**
 * Tabel referensi landasan hukum penyusunan Renja (Bab I.2).
 *
 * Sebelumnya daftar peraturan ditulis langsung di dalam generator narasi,
 * sehingga penambahan/pencabutan regulasi menuntut perubahan kode dan daftarnya
 * ikut terbawa ke semua OPD. Dengan tabel ini daftar tersebut menjadi data:
 *
 *  - `kode_bidang_urusan` NULL  -> peraturan umum, dipakai semua perangkat daerah
 *  - `kode_bidang_urusan` diisi -> peraturan khusus satu bidang urusan (mis. "2.09")
 *
 * `berlaku_dari`/`berlaku_sampai` memungkinkan peraturan yang dicabut berhenti
 * tercetak pada Renja tahun berikutnya tanpa menghapus jejaknya, dan
 * `perlu_verifikasi` menandai entri yang nomor/tahunnya masih harus dipastikan
 * oleh perangkat daerah sebelum dokumen difinalkan.
 */

const JENIS = [
  'uu',
  'perpu',
  'pp',
  'perpres',
  'permendagri',
  'permen_lain',
  'kepmendagri',
  'perda',
  'pergub',
  'lainnya',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renja_landasan_hukum', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      kode_bidang_urusan: { type: Sequelize.STRING(10), allowNull: true },
      jenis_produk: { type: Sequelize.ENUM(...JENIS), allowNull: false, defaultValue: 'lainnya' },
      nomor: { type: Sequelize.STRING(60), allowNull: true },
      tahun: { type: Sequelize.STRING(4), allowNull: true },
      judul: { type: Sequelize.TEXT, allowNull: false },
      // Teks lengkap siap cetak; bila kosong, dirangkai dari jenis+nomor+tahun+judul.
      teks_lengkap: { type: Sequelize.TEXT, allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      berlaku_dari: { type: Sequelize.STRING(4), allowNull: true },
      berlaku_sampai: { type: Sequelize.STRING(4), allowNull: true },
      aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      perlu_verifikasi: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renja_landasan_hukum', ['kode_bidang_urusan', 'urutan']);
    await queryInterface.addIndex('renja_landasan_hukum', ['aktif']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renja_landasan_hukum');
  },
};
