'use strict';

/**
 * Tabel C-6 — Kesepakatan Rakortekbang tentang Outcome Prioritas,
 * Program, dan Subkegiatan dalam Mendukung Asta Cita.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('renja_outcome_asta_cita', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tahun: { type: Sequelize.STRING(4), allowNull: false },
      perangkat_daerah_id: { type: Sequelize.INTEGER, allowNull: false },
      asta_cita: { type: Sequelize.TEXT, allowNull: false },
      bidang_urusan: { type: Sequelize.STRING(150), allowNull: true },
      outcome_prioritas: { type: Sequelize.TEXT, allowNull: true },
      indikator: { type: Sequelize.TEXT, allowNull: true },
      satuan: { type: Sequelize.STRING(50), allowNull: true },
      program: { type: Sequelize.STRING(255), allowNull: true },
      kode_subkegiatan: { type: Sequelize.STRING(100), allowNull: true },
      subkegiatan: { type: Sequelize.STRING(255), allowNull: true },
      urutan: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('renja_outcome_asta_cita', ['tahun', 'perangkat_daerah_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('renja_outcome_asta_cita');
  },
};
