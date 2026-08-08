'use strict';

/**
 * Temuan implementasi Fase 5 Spesifikasi 35 v3 (§31 STEP 2) — query lock
 * serialization `/autofill-apply` (`WHERE bukti_dukung_id=? AND
 * entity_type='PENGISIAN' AND pengisian_id=? AND tenant_id=? LIMIT 1 FOR
 * UPDATE`) tidak memiliki index yang cocok persis dgn kombinasi kolom ini —
 * index existing (`idx_prosnp_bukti_pengisian` hanya `pengisian_id`,
 * `idx_prosnp_bukti_entity` hanya `entity_type`+`entity_id`) memaksa InnoDB
 * memakai index yang lebih luas dari yang diperlukan, mengambil gap-lock pada
 * lebih dari 1 baris kandidat. Dibuktikan lewat Test R (§36): 2 transaksi
 * concurrent dgn identity SAMA PERSIS mengunci records dlm URUTAN BERBEDA,
 * menghasilkan genuine MySQL deadlock ("Deadlock found when trying to get
 * lock") alih-alih WAIT bersih — bukan defect logika STEP 1-10, tapi
 * ketiadaan index presisi utk WHERE clause tsb.
 *
 * Perbaikan: index BARU (aditif, tidak mengubah/menghapus index existing)
 * persis kombinasi kolom WHERE clause STEP 2, menjadikan lock sebagai point
 * lookup 1 baris yang presisi (bukan range/gap lock).
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('prosnp_bukti_indikator', ['bukti_dukung_id', 'entity_type', 'pengisian_id', 'tenant_id'], {
      name: 'idx_prosnp_bukti_indikator_staging_lock',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('prosnp_bukti_indikator', 'idx_prosnp_bukti_indikator_staging_lock');
  },
};
