'use strict';

/**
 * Temuan implementasi Fase 2 Spesifikasi 35 v3 (§7 Phase E) — unique index
 * `uq_prosnp_bukti_indicator` existing (`20260805100000-create-prosnp-foundation.js`)
 * dibuat SEBELUM `entity_type`/`entity_id` ada, hanya mencakup
 * (tenant_id, bukti_dukung_id, indikator_id). Ini mem-blok desain Evidence-First
 * yang mandatory (satu bukti staging `entity_type='PENGISIAN'` + satu binding
 * tambahan `entity_type='SURAT_PENUGASAN'`/dst untuk `indikator_id` yang SAMA
 * — dua baris valid & sah, tapi bertabrakan pada index lama krn `indikator_id`
 * sama pada keduanya).
 *
 * Perbaikan: index lama diganti index yang SAMA PERSIS + 2 kolom tambahan
 * (`entity_type`, `entity_id`) — index baru adalah SUPERSET kolom index lama,
 * jadi murni memperlonggar (bukan mempersempit): seluruh baris existing yang
 * lolos index lama otomatis lolos index baru juga (unique pada subset kolom
 * => otomatis unique pada superset kolom). Tidak ada baris yang perlu diubah,
 * tidak ada risiko duplikasi baru pada data existing.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex('prosnp_bukti_indikator', 'uq_prosnp_bukti_indicator');
    await queryInterface.addIndex('prosnp_bukti_indikator', ['tenant_id', 'bukti_dukung_id', 'indikator_id', 'entity_type', 'entity_id'], {
      unique: true,
      name: 'uq_prosnp_bukti_indikator_binding',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('prosnp_bukti_indikator', 'uq_prosnp_bukti_indikator_binding');
    await queryInterface.addIndex('prosnp_bukti_indikator', ['tenant_id', 'bukti_dukung_id', 'indikator_id'], {
      unique: true,
      name: 'uq_prosnp_bukti_indicator',
    });
  },
};
