'use strict';

/**
 * Menyesuaikan tabel Tabel C-2/C-3 dan C-6 agar dapat menampung lampiran
 * referensi nasional Permendagri 14/2026.
 *
 * Latar belakang: rancangan awal menganggap Tabel C-2/C-3/C-6 adalah data yang
 * diinput tiap OPD per tahun. Setelah Lampiran Permendagri 14/2026 dibaca,
 * ternyata ketiganya adalah "Kesepakatan Rakortekbang Tahun 2026" — daftar
 * nasional yang sudah tercetak lengkap di dalam regulasi dan berlaku sama untuk
 * seluruh provinsi. Perangkat daerah tidak menginputnya; mereka hanya memakai
 * baris yang relevan dengan bidang urusannya.
 *
 * Perubahan:
 *  1. `tahun` dan `perangkat_daerah_id` menjadi nullable — baris referensi
 *     nasional tidak terikat tahun maupun OPD.
 *  2. Kolom `sumber` membedakan baris hasil seed regulasi dari baris tambahan
 *     milik OPD, sehingga seeding ulang tidak menghapus data buatan pengguna.
 *  3. Kolom `kode_bidang_urusan` (mis. "2.09") diturunkan dari awalan kode
 *     subkegiatan, dipakai menyaring baris milik satu OPD tanpa perlu tabel
 *     pemetaan tersendiri.
 *  4. `no_baris_c6` menyimpan nomor pada kolom NO Tabel C-6. Perhatikan: itu
 *     nomor urut baris tabel (berjalan 1..33+), BUKAN nomor Asta Cita — daftar
 *     Asta Cita resmi hanya berisi 8 butir dan teksnya berulang lintas baris.
 *     Identitas Asta Cita ada pada kolom teks `asta_cita`, bukan pada nomor ini.
 *  5. Kolom nama subkegiatan dilebarkan ke TEXT: nilai terpanjang pada Tabel
 *     C-6 mencapai 284 karakter sehingga STRING(255) akan memotongnya diam-diam.
 *
 * Kolom `kode`/`kode_subkegiatan` diberi indeks karena menjadi kunci sambung ke
 * `renja_item.kode_sub_kegiatan` — pencocokan yang diperintahkan Permendagri
 * sendiri lewat FORM 4 dan FORM 5 Daftar Isian Fasilitasi.
 */

const SUMBER = ['rakortekbang_2026', 'opd'];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // --- renja_dukungan_prosn_tematik (Tabel C-2 + C-3) ---
    await queryInterface.changeColumn('renja_dukungan_prosn_tematik', 'tahun', {
      type: Sequelize.STRING(4),
      allowNull: true,
    });
    await queryInterface.changeColumn('renja_dukungan_prosn_tematik', 'perangkat_daerah_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('renja_dukungan_prosn_tematik', 'sub_kegiatan', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('renja_dukungan_prosn_tematik', 'sumber', {
      type: Sequelize.ENUM(...SUMBER),
      allowNull: false,
      defaultValue: 'rakortekbang_2026',
      after: 'jenis',
    });
    await queryInterface.addColumn('renja_dukungan_prosn_tematik', 'pro_sn', {
      type: Sequelize.STRING(150),
      allowNull: true,
      after: 'pro_sn_master_id',
    });
    await queryInterface.addColumn('renja_dukungan_prosn_tematik', 'kode_bidang_urusan', {
      type: Sequelize.STRING(10),
      allowNull: true,
      after: 'kode',
    });
    await queryInterface.addIndex('renja_dukungan_prosn_tematik', ['kode']);
    await queryInterface.addIndex('renja_dukungan_prosn_tematik', [
      'kode_bidang_urusan',
      'jenis',
    ]);

    // --- renja_outcome_asta_cita (Tabel C-6) ---
    await queryInterface.changeColumn('renja_outcome_asta_cita', 'tahun', {
      type: Sequelize.STRING(4),
      allowNull: true,
    });
    await queryInterface.changeColumn('renja_outcome_asta_cita', 'perangkat_daerah_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('renja_outcome_asta_cita', 'subkegiatan', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('renja_outcome_asta_cita', 'sumber', {
      type: Sequelize.ENUM(...SUMBER),
      allowNull: false,
      defaultValue: 'rakortekbang_2026',
      after: 'perangkat_daerah_id',
    });
    await queryInterface.addColumn('renja_outcome_asta_cita', 'no_baris_c6', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'sumber',
    });
    await queryInterface.addColumn('renja_outcome_asta_cita', 'kode_bidang_urusan', {
      type: Sequelize.STRING(10),
      allowNull: true,
      after: 'kode_subkegiatan',
    });
    await queryInterface.addIndex('renja_outcome_asta_cita', ['kode_subkegiatan']);
    await queryInterface.addIndex('renja_outcome_asta_cita', ['kode_bidang_urusan']);
  },

  down: async (queryInterface, Sequelize) => {
    // Baris referensi regulasi dibuang lebih dulu: nilainya melebihi lebar
    // kolom lama, sehingga penyempitan STRING akan gagal bila data masih ada.
    // Data ini sepenuhnya dapat dibangun ulang lewat
    // `node scripts/seedPermendagri14TabelC.js`.
    await queryInterface.bulkDelete('renja_outcome_asta_cita', { sumber: 'rakortekbang_2026' });
    await queryInterface.bulkDelete('renja_dukungan_prosn_tematik', {
      sumber: 'rakortekbang_2026',
    });

    await queryInterface.removeIndex('renja_outcome_asta_cita', ['kode_bidang_urusan']);
    await queryInterface.removeIndex('renja_outcome_asta_cita', ['kode_subkegiatan']);
    await queryInterface.removeColumn('renja_outcome_asta_cita', 'kode_bidang_urusan');
    await queryInterface.removeColumn('renja_outcome_asta_cita', 'no_baris_c6');
    await queryInterface.removeColumn('renja_outcome_asta_cita', 'sumber');
    await queryInterface.changeColumn('renja_outcome_asta_cita', 'subkegiatan', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.changeColumn('renja_outcome_asta_cita', 'perangkat_daerah_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('renja_outcome_asta_cita', 'tahun', {
      type: Sequelize.STRING(4),
      allowNull: false,
    });

    await queryInterface.removeIndex('renja_dukungan_prosn_tematik', [
      'kode_bidang_urusan',
      'jenis',
    ]);
    await queryInterface.removeIndex('renja_dukungan_prosn_tematik', ['kode']);
    await queryInterface.removeColumn('renja_dukungan_prosn_tematik', 'kode_bidang_urusan');
    await queryInterface.removeColumn('renja_dukungan_prosn_tematik', 'pro_sn');
    await queryInterface.removeColumn('renja_dukungan_prosn_tematik', 'sumber');
    await queryInterface.changeColumn('renja_dukungan_prosn_tematik', 'sub_kegiatan', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.changeColumn('renja_dukungan_prosn_tematik', 'perangkat_daerah_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('renja_dukungan_prosn_tematik', 'tahun', {
      type: Sequelize.STRING(4),
      allowNull: false,
    });
  },
};
