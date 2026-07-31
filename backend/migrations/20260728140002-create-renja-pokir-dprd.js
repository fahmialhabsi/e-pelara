'use strict';

/**
 * Telaah Pokok-Pokok Pikiran (Pokir) DPRD.
 *
 * Dikelola di modul RKPD (per tahun/OPD), lalu ditarik (recall) oleh
 * modul Renja Permendagri 14/2026 untuk mengisi Bab II.4 saat generate
 * dokumen. Data tidak selalu tersedia setiap tahun (mis. ada di 2025,
 * tidak ada di 2026), sehingga disimpan per tahun agar Renja tetap bisa
 * menyatakan "tidak terdapat usulan Pokir DPRD Tahun [tahun]" secara
 * akurat saat kosong, tanpa terikat ke dokumen Renja/revisi tertentu.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renja_pokir_dprd', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      perangkat_daerah_id: { type: Sequelize.INTEGER, allowNull: false },
      nama_anggota_dprd: { type: Sequelize.STRING(150), allowNull: true },
      dapil: { type: Sequelize.STRING(100), allowNull: true },
      usulan: { type: Sequelize.TEXT, allowNull: false },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      program_kegiatan_terkait: { type: Sequelize.STRING(255), allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renja_pokir_dprd', ['tahun', 'perangkat_daerah_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renja_pokir_dprd');
  },
};
