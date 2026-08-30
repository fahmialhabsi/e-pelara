'use strict';

/**
 * Evidence & Operasi Pangan — Phase 1 (mandat §34/§46). Kolom provenance
 * MINIMAL agar `prosnp_bukti_dukung` dapat menandai baris yang berasal dari
 * FoodOps registry (bukan upload ProSN langsung) TANPA menduplikasi berkas
 * fisik — `file_path` baris ini tetap menunjuk path yang SAMA dengan
 * `food_ops_document.file_path` (mandat §34 "avoid binary duplication").
 * Rule engine ProSN existing (prosnpEvidenceGateService.js) TIDAK diubah —
 * baris ini hanya data tambahan yang dikonsumsi lewat query yang sudah ada.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_bukti_dukung', 'food_ops_document_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'food_ops_document', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('prosnp_bukti_dukung', ['food_ops_document_id'], { name: 'idx_prosnp_bukti_dukung_food_ops_document' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('prosnp_bukti_dukung', 'idx_prosnp_bukti_dukung_food_ops_document');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'food_ops_document_id');
  },
};
