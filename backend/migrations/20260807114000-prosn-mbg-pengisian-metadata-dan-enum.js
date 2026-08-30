'use strict';

/**
 * ProSN Indicator Foundation (spek 34) §3.5 (metadata sumber, koreksi #4),
 * §3.6 (kategori bukti baru MBG, aditif), §3.7 (entity_type baru MBG, aditif).
 */
const KATEGORI_BUKTI_LENGKAP = [
  'surat_penugasan', 'keputusan_kdh', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi',
  'berita_acara', 'kartu_stok', 'dokumen_pengadaan', 'dokumen_penyaluran', 'rekonsiliasi',
  'perkada', 'bukti_implementasi', 'bukti_hasil', 'dpa', 'renja', 'rkpd',
  'bukti_tindak_lanjut', 'bukti_penerimaan', 'dokumen_penetapan', 'dokumen_koreksi', 'lainnya',
  'sk_satgas_mbg', 'bukti_aktivitas_satgas_mbg',
  'daftar_sarpras_mbg', 'bukti_ketersediaan_sarpras_mbg',
  'laporan_satgas_mbg', 'bukti_penyampaian_laporan_mbg',
  'dokumen_penetapan_sasaran_mbg', 'data_realisasi_penerima_mbg',
];
const KATEGORI_BUKTI_LAMA = [
  'surat_penugasan', 'keputusan_kdh', 'undangan', 'daftar_hadir', 'notulen', 'dokumentasi',
  'berita_acara', 'kartu_stok', 'dokumen_pengadaan', 'dokumen_penyaluran', 'rekonsiliasi',
  'perkada', 'bukti_implementasi', 'bukti_hasil', 'dpa', 'renja', 'rkpd',
  'bukti_tindak_lanjut', 'bukti_penerimaan', 'dokumen_penetapan', 'dokumen_koreksi', 'lainnya',
];
const ENTITY_TYPE_LENGKAP = ['SURAT_PENUGASAN', 'RAPAT_FORKOPIMDA', 'CADANGAN_TARGET', 'STOK_TRANSAKSI', 'INOVASI', 'PENGISIAN', 'SATGAS_MBG', 'LAPORAN_SATGAS_MBG'];
const ENTITY_TYPE_LAMA = ['SURAT_PENUGASAN', 'RAPAT_FORKOPIMDA', 'CADANGAN_TARGET', 'STOK_TRANSAKSI', 'INOVASI', 'PENGISIAN'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_pengisian', 'sumber_data_tanggal_posisi', {
      type: Sequelize.DATEONLY, allowNull: true,
      comment: 'Tanggal cutoff/posisi data realisasi (bukan tanggal input) — wajib diisi utk tipe_form capaian_persentase_bertingkat sebelum status Lengkap.',
    });
    await queryInterface.addColumn('prosnp_pengisian', 'sumber_data_referensi_dokumen', {
      type: Sequelize.STRING(255), allowNull: true,
      comment: 'Nomor/identitas dokumen atau dataset sumber data, generik utk indikator kuantitatif manapun.',
    });

    await queryInterface.changeColumn('prosnp_bukti_dukung', 'kategori', {
      type: Sequelize.ENUM(...KATEGORI_BUKTI_LENGKAP), allowNull: true,
    });
    await queryInterface.changeColumn('prosnp_bukti_indikator', 'entity_type', {
      type: Sequelize.ENUM(...ENTITY_TYPE_LENGKAP), allowNull: true,
      comment: 'NULL = binding generik lama. Diisi = binding presisi ke satu record spesifik.',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('prosnp_bukti_indikator', 'entity_type', {
      type: Sequelize.ENUM(...ENTITY_TYPE_LAMA), allowNull: true,
    });
    await queryInterface.changeColumn('prosnp_bukti_dukung', 'kategori', {
      type: Sequelize.ENUM(...KATEGORI_BUKTI_LAMA), allowNull: true,
    });
    await queryInterface.removeColumn('prosnp_pengisian', 'sumber_data_referensi_dokumen');
    await queryInterface.removeColumn('prosnp_pengisian', 'sumber_data_tanggal_posisi');
  },
};
