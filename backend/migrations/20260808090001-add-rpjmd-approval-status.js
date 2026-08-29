'use strict';

/**
 * Sprint 3 — S3-1: RPJMD Approval Synchronization.
 *
 * Gap (ADR-0002 §1.1, §3 butir 4; ditemukan Sprint 1, dikonfirmasi ulang
 * pada Phase A design verification Sprint 3): "rpjmd" terdaftar sebagai
 * entity_type valid di `approvalController.js` (VALID_ENTITY_TYPES) tapi
 * TIDAK ADA di ENTITY_TABLE_MAP — approval tercatat di approval_logs tapi
 * silent no-op terhadap tabel `rpjmd` itu sendiri.
 *
 * Keputusan desain (Phase A, verified sebelum migration ini ditulis):
 *   - Tabel `rpjmd` (model RPJMD, dipakai aktif oleh rpjmdController.js)
 *     hanya punya `version` + `is_active_version` (versioning riwayat
 *     dokumen) — TIDAK ADA field status apa pun. Tidak ada konflik.
 *   - Tabel `rpjmd_dokumen` (model RpjmdDokumen) punya `status` ENUM
 *     (draft/review/final) TAPI tidak direferensikan oleh controller
 *     manapun (orphan model) — TIDAK disentuh oleh migrasi ini, di luar
 *     scope S3-1.
 *   - `approval_config` (dibuat migration 20260407-001, seed 2-level untuk
 *     rpjmd) tidak pernah dibaca oleh kode manapun — dead artifact, TIDAK
 *     disentuh, TIDAK dijadikan basis desain.
 *   - Pola kolom & ENUM disamakan persis dengan dpa/rka/lakip/renja/rkpd/
 *     renstra (migration 20260407-001-add-approval-status.js dan
 *     20260409-003-create-renstra-table.js) supaya konsisten dengan
 *     ENTITY_TABLE_MAP existing — bukan skema baru yang berbeda.
 *
 * Migrasi ini: tambah kolom `approval_status` ENUM('DRAFT','SUBMITTED',
 * 'APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT' ke tabel `rpjmd`.
 * Idempotent — skip jika kolom sudah ada. Tidak mengubah tabel/kolom lain.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('rpjmd').catch(() => null);
    if (!desc) {
      console.log('[migration] ⚠️  Tabel rpjmd tidak ditemukan, skip');
      return;
    }
    if (desc.approval_status) {
      console.log('[migration] ⏭️  approval_status sudah ada di rpjmd, skip');
      return;
    }
    await queryInterface.addColumn('rpjmd', 'approval_status', {
      type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    });
    console.log('[migration] ✅ Kolom approval_status ditambah ke rpjmd');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rpjmd', 'approval_status').catch(() => {});
  },
};
