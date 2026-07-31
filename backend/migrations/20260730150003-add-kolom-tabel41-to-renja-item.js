'use strict';

/**
 * Kolom tambahan `renja_item` untuk Tabel 4.1 Renja Permendagri 14/2026
 * (17 kolom, lihat Bab IV dokumen acuan).
 *
 * Kolom yang SENGAJA TIDAK ditambahkan:
 *  - "Prioritas Nasional" dan "Prioritas Daerah" — dihitung saat render dengan
 *    menyambung `kode_sub_kegiatan` ke Tabel C-2/C-3/C-6. Bila disimpan sebagai
 *    kolom, nilainya menjadi basi begitu lampiran Rakortekbang diperbarui.
 *  - "Target Akhir Renstra", "Realisasi tahun lalu", "Prakiraan tahun berjalan"
 *    — masing-masing sudah tersedia di `indikator_renstra`, `lk_dispang`/
 *    `dpa_realisasi_bulanan`, dan dokumen Renja tahun sebelumnya.
 *
 * Indeks pada `kode_sub_kegiatan` ditambahkan karena kolom itu menjadi kunci
 * sambung ke Tabel C — pencocokan yang diperintahkan Permendagri lewat FORM 4
 * dan FORM 5 Daftar Isian Fasilitasi.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renja_item', 'sumber_dana', {
      type: Sequelize.STRING(64),
      allowNull: true,
      after: 'lokasi',
    });
    await queryInterface.addColumn('renja_item', 'target_prakiraan_maju', {
      type: Sequelize.STRING(128),
      allowNull: true,
      after: 'pagu_indikatif',
    });
    await queryInterface.addColumn('renja_item', 'pagu_prakiraan_maju', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true,
      after: 'target_prakiraan_maju',
    });
    await queryInterface.addColumn('renja_item', 'pd_penanggung_jawab', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'pagu_prakiraan_maju',
    });

    await queryInterface.addIndex('renja_item', ['kode_sub_kegiatan']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('renja_item', ['kode_sub_kegiatan']);
    await queryInterface.removeColumn('renja_item', 'pd_penanggung_jawab');
    await queryInterface.removeColumn('renja_item', 'pagu_prakiraan_maju');
    await queryInterface.removeColumn('renja_item', 'target_prakiraan_maju');
    await queryInterface.removeColumn('renja_item', 'sumber_dana');
  },
};
