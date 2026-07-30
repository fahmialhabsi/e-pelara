'use strict';

/**
 * Daftar Data Daerah (Satu Data Indonesia).
 *
 * Struktur kolom mengikuti Lampiran "Format Daftar Data Daerah" pada surat
 * Sekretaris Daerah Provinsi Maluku Utara Nomor 000.7/4486/SETDA tanggal
 * 24 Juli 2026, yang berdasar pada Perpres 39/2019 tentang Satu Data Indonesia
 * dan Pergub Maluku Utara 40/2022 tentang Satu Data Provinsi Maluku Utara.
 *
 * Kolom (1) s.d. (19) adalah atribut baku Lampiran dan urutannya TIDAK BOLEH
 * diubah karena menjadi dasar verifikasi Forum Satu Data. Kolom tambahan
 * (metode_pengumpulan, periode_data, penanggung_jawab) ditambahkan untuk
 * memenuhi ketentuan angka 4 surat — metadata paling sedikit 10 unsur —
 * yang tidak seluruhnya tertampung pada 19 atribut Lampiran. Penambahan ini
 * diizinkan catatan akhir Lampiran ("Atribut Daftar Data dapat disesuaikan
 * dengan kebutuhan dan informasi yang tersedia").
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sdi_daftar_data', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },

      // Konteks kepemilikan data.
      renstra_id: { type: Sequelize.INTEGER, allowNull: true },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      nama_opd: { type: Sequelize.STRING(150), allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

      // Jejak asal baris bila ditarik dari indikator Renstra. Sengaja tanpa
      // constraint FK: indikator Renstra boleh dihapus/diganti antar periode,
      // sedangkan Daftar Data yang sudah dikirim ke Bappeda harus tetap utuh.
      indikator_renstra_id: { type: Sequelize.INTEGER, allowNull: true },
      sumber_tarikan: {
        type: Sequelize.ENUM('manual', 'renstra'),
        allowNull: false,
        defaultValue: 'manual',
      },

      // === Atribut Lampiran (1) s.d. (19) ===
      id_ddd: { type: Sequelize.STRING(30), allowNull: true }, // (1)
      id_ddp: { type: Sequelize.STRING(30), allowNull: true }, // (2)
      sumber_referensi: { type: Sequelize.TEXT, allowNull: true }, // (3)
      kode_indikator: { type: Sequelize.STRING(100), allowNull: true }, // (4)
      nama_indikator: { type: Sequelize.TEXT, allowNull: true }, // (5)
      nama_data: { type: Sequelize.TEXT, allowNull: false }, // (6)
      jenis_data: {
        // (7)
        type: Sequelize.ENUM('statistik', 'geospasial', 'keuangan'),
        allowNull: false,
        defaultValue: 'statistik',
      },
      indikator_variabel: {
        // (8)
        type: Sequelize.ENUM('indikator', 'variabel'),
        allowNull: false,
        defaultValue: 'indikator',
      },
      kode_standar_data: { type: Sequelize.STRING(100), allowNull: true }, // (9)
      produsen_data: { type: Sequelize.STRING(150), allowNull: true }, // (10)
      klasifikasi_risiko: {
        // (11)
        type: Sequelize.ENUM('terbuka', 'terbatas', 'tertutup'),
        allowNull: false,
        defaultValue: 'terbuka',
      },
      definisi: { type: Sequelize.TEXT, allowNull: true }, // (12)
      satuan: { type: Sequelize.STRING(50), allowNull: true }, // (13)
      klasifikasi_penyajian: { type: Sequelize.STRING(255), allowNull: true }, // (14)
      jadwal_pemutakhiran: {
        // (15)
        type: Sequelize.ENUM(
          'harian',
          'mingguan',
          'bulanan',
          'triwulanan',
          'semesteran',
          'tahunan',
          'insidental',
        ),
        allowNull: false,
        defaultValue: 'tahunan',
      },
      kategori_rad: { type: Sequelize.STRING(255), allowNull: true }, // (16)
      kode_metadata: { type: Sequelize.STRING(255), allowNull: true }, // (17)
      link_portal_daerah: { type: Sequelize.TEXT, allowNull: true }, // (18)
      link_portal_sdi: { type: Sequelize.TEXT, allowNull: true }, // (19)

      // === Atribut tambahan pemenuh metadata Standar Data Indonesia ===
      metode_pengumpulan: { type: Sequelize.TEXT, allowNull: true },
      periode_data: { type: Sequelize.STRING(100), allowNull: true },
      penanggung_jawab: { type: Sequelize.STRING(150), allowNull: true },

      status: {
        type: Sequelize.ENUM('draft', 'diverifikasi', 'final'),
        allowNull: false,
        defaultValue: 'draft',
      },
      catatan: { type: Sequelize.TEXT, allowNull: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('sdi_daftar_data', ['renstra_id']);
    await queryInterface.addIndex('sdi_daftar_data', ['tahun']);
    await queryInterface.addIndex('sdi_daftar_data', ['indikator_renstra_id']);
    await queryInterface.addIndex('sdi_daftar_data', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('sdi_daftar_data');
  },
};
