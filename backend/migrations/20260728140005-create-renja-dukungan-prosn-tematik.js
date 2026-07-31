'use strict';

/**
 * Tabel C-2 (Dukungan terhadap Pro-SN Provinsi) dan Tabel C-3
 * (Dukungan terhadap Program Tematik Provinsi) — digabung satu tabel
 * karena strukturnya identik, dibedakan lewat kolom `jenis`.
 *
 * jenis='pro_sn'  : kolom pro_sn_master_id + proyek_kegiatan diisi,
 *                   tematik_pembangunan dikosongkan.
 * jenis='tematik' : kolom tematik_pembangunan diisi, pro_sn_master_id
 *                   dan proyek_kegiatan dikosongkan.
 *
 * Nomor urut baris (No.) dihasilkan saat render dari kolom `urutan`,
 * bukan disimpan sebagai angka statis — lampiran sumber (Tabel C-2)
 * memiliki nomor yang meloncat (1,3,5..), sehingga penomoran ditata
 * ulang berurutan (1..N) pada saat generate dokumen.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renja_dukungan_prosn_tematik', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      perangkat_daerah_id: { type: Sequelize.INTEGER, allowNull: false },
      jenis: {
        type: Sequelize.ENUM('pro_sn', 'tematik'),
        allowNull: false,
      },

      // Diisi hanya jika jenis = 'pro_sn'. Tanpa FK constraint agar
      // master Pro-SN boleh direvisi/diganti tanpa memutus data historis.
      pro_sn_master_id: { type: Sequelize.INTEGER, allowNull: true },
      proyek_kegiatan: { type: Sequelize.STRING(255), allowNull: true },

      // Diisi hanya jika jenis = 'tematik'.
      tematik_pembangunan: { type: Sequelize.STRING(255), allowNull: true },

      // Kolom bersama kedua jenis (struktur C-2 dan C-3 identik).
      outcome: { type: Sequelize.TEXT, allowNull: true },
      indikator_outcome: { type: Sequelize.TEXT, allowNull: true },
      satuan: { type: Sequelize.STRING(50), allowNull: true },
      pengampu_bidang_urusan_utama: { type: Sequelize.STRING(150), allowNull: true },
      bidang_urusan_terkait: { type: Sequelize.STRING(150), allowNull: true },
      program: { type: Sequelize.STRING(255), allowNull: true },
      kode: { type: Sequelize.STRING(100), allowNull: true },
      sub_kegiatan: { type: Sequelize.STRING(255), allowNull: true },

      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renja_dukungan_prosn_tematik', [
      'tahun',
      'perangkat_daerah_id',
      'jenis',
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renja_dukungan_prosn_tematik');
  },
};
