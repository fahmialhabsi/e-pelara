'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renstra_review_konsistensi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      renstra_id: { type: Sequelize.INTEGER, allowNull: false },

      // Objek yang direviu — level + id record aslinya.
      objek_level: {
        type: Sequelize.ENUM(
          'tujuan',
          'sasaran',
          'strategi',
          'arah_kebijakan',
          'program',
          'kegiatan',
          'sub_kegiatan',
        ),
        allowNull: false,
      },
      objek_id: { type: Sequelize.INTEGER, allowNull: false },
      // Snapshot teks saat direviu, agar berita acara tetap terbaca walaupun
      // data induk kemudian diubah/dihapus.
      objek_kode: { type: Sequelize.STRING(60), allowNull: true },
      objek_uraian: { type: Sequelize.TEXT, allowNull: true },

      jenis_rekomendasi: {
        type: Sequelize.ENUM(
          'pindahkan',
          'pecah',
          'gabungkan',
          'perbaiki_rumusan',
          'ganti_program',
          'sesuai',
        ),
        allowNull: false,
      },
      kondisi_saat_ini: { type: Sequelize.TEXT, allowNull: true },
      rekomendasi: { type: Sequelize.TEXT, allowNull: false },
      alasan_substansi: { type: Sequelize.TEXT, allowNull: true },
      // [{ regulasi, pasal, kutipan }]
      dasar_hukum: { type: Sequelize.JSON, allowNull: true },

      // Target pemindahan (dipakai saat jenis_rekomendasi = pindahkan/ganti_program).
      usulan_parent_level: { type: Sequelize.STRING(30), allowNull: true },
      usulan_parent_id: { type: Sequelize.INTEGER, allowNull: true },
      // Nilai FK induk sebelum "terapkan" — dipakai untuk membatalkan terapan.
      parent_id_sebelum: { type: Sequelize.INTEGER, allowNull: true },

      tingkat_prioritas: {
        type: Sequelize.ENUM('tinggi', 'sedang', 'rendah'),
        allowNull: false,
        defaultValue: 'sedang',
      },
      status: {
        type: Sequelize.ENUM('usulan', 'disetujui', 'ditolak', 'ditindaklanjuti', 'selesai'),
        allowNull: false,
        defaultValue: 'usulan',
      },

      reviewer_nama: { type: Sequelize.STRING(150), allowNull: true },
      reviewer_jabatan: { type: Sequelize.STRING(150), allowNull: true },
      tanggal_review: { type: Sequelize.DATEONLY, allowNull: true },
      catatan_tindak_lanjut: { type: Sequelize.TEXT, allowNull: true },

      diterapkan_at: { type: Sequelize.DATE, allowNull: true },
      diterapkan_oleh: { type: Sequelize.STRING(150), allowNull: true },

      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renstra_review_konsistensi', ['renstra_id']);
    await queryInterface.addIndex('renstra_review_konsistensi', ['objek_level', 'objek_id']);
    await queryInterface.addIndex('renstra_review_konsistensi', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renstra_review_konsistensi');
  },
};
