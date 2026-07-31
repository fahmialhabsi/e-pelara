'use strict';

/**
 * Kolom penanda recall pada `renja_dokumen`.
 *
 * Dokumen Renja tidak menyimpan angka mati, melainkan turunan dari modul hulu
 * (Renstra, RKPD, LK/DPA, dan Tabel C Permendagri 14/2026). Ketiga kolom ini
 * membuat perubahan di hulu terlihat di layar: modul hulu menandai
 * `needs_recall = true`, pengguna menekan tombol Recall, lalu
 * `last_recall_at` tercatat sebagai bukti kapan dokumen terakhir diselaraskan.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('renja_dokumen', 'needs_recall', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'text_bab6',
    });
    await queryInterface.addColumn('renja_dokumen', 'recall_reason', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'needs_recall',
    });
    await queryInterface.addColumn('renja_dokumen', 'last_recall_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'recall_reason',
    });

    await queryInterface.addIndex('renja_dokumen', ['needs_recall']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('renja_dokumen', ['needs_recall']);
    await queryInterface.removeColumn('renja_dokumen', 'last_recall_at');
    await queryInterface.removeColumn('renja_dokumen', 'recall_reason');
    await queryInterface.removeColumn('renja_dokumen', 'needs_recall');
  },
};
