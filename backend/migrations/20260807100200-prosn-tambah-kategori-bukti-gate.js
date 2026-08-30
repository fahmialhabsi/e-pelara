'use strict';

/**
 * Corrective pass §6 — kategori bukti baru yang dibutuhkan evidence category
 * gate per tipe transaksi/indikator (aditif, tidak menghapus nilai lama).
 */
const KATEGORI_LENGKAP = [
  'surat_penugasan', 'keputusan_kdh', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi',
  'berita_acara', 'kartu_stok', 'dokumen_pengadaan', 'dokumen_penyaluran', 'rekonsiliasi',
  'perkada', 'bukti_implementasi', 'bukti_hasil', 'dpa', 'renja', 'rkpd',
  'bukti_tindak_lanjut', 'bukti_penerimaan', 'dokumen_penetapan', 'dokumen_koreksi', 'lainnya',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('prosnp_bukti_dukung', 'kategori', {
      type: Sequelize.ENUM(...KATEGORI_LENGKAP), allowNull: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('prosnp_bukti_dukung', 'kategori', {
      type: Sequelize.ENUM(
        'surat_penugasan', 'keputusan_kdh', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi',
        'berita_acara', 'kartu_stok', 'dokumen_pengadaan', 'dokumen_penyaluran', 'rekonsiliasi',
        'perkada', 'bukti_implementasi', 'bukti_hasil', 'dpa', 'renja', 'rkpd', 'lainnya',
      ),
      allowNull: true,
    });
  },
};
