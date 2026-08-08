'use strict';

/**
 * Spesifikasi 35 v3 §25/§35, D5/OD-2 — deterministic mapping ProSN Master
 * Indikator -> IndikatorRenstra (untuk resolusi Target/Realisasi Indikator
 * fisik, §19). Nullable, default NULL untuk seluruh baris existing (termasuk
 * 4 indikator Ketahanan Pangan) — TIDAK ada backfill otomatis. Diisi HANYA
 * lewat endpoint ADMIN `PUT /prosnp/master-indikator/:id/mapping-renstra`
 * (OD-2 RESOLVED, Option B).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_master_indikator', 'indikator_renstra_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addIndex('prosnp_master_indikator', ['indikator_renstra_id'], {
      name: 'idx_prosnp_master_indikator_indikator_renstra_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('prosnp_master_indikator', 'idx_prosnp_master_indikator_indikator_renstra_id');
    await queryInterface.removeColumn('prosnp_master_indikator', 'indikator_renstra_id');
  },
};
