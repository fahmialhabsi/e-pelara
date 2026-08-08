'use strict';

/**
 * Spesifikasi 35 v3 §25/§35 — kolom aditif untuk Evidence-First + Document
 * Intelligence + Autofill. Semua ADD COLUMN nullable, tidak ada backfill,
 * tidak ada perubahan tipe/kolom existing.
 *
 * 1. prosnp_bukti_dukung: cache hasil ekstraksi teks + metadata klasifikasi
 *    dokumen (dipakai orchestrator §12, hallucination guard §17).
 * 2. provenance JSON per tabel register (surat_penugasan/rapat_forkopimda/
 *    cadangan_target/inovasi) — pola mengikuti ProsnCadanganTarget.source_*
 *    yang sudah ada, tapi dikemas 1 kolom JSON (bukan kolom per-field) sesuai
 *    keputusan D3 Spesifikasi 35.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_bukti_dukung', 'extracted_text_cache', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'extracted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'extraction_method', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_bukti_dukung', 'klasifikasi_meta', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('prosnp_surat_penugasan', 'provenance', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_rapat_forkopimda', 'provenance', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_cadangan_target', 'provenance', {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn('prosnp_inovasi', 'provenance', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('prosnp_inovasi', 'provenance');
    await queryInterface.removeColumn('prosnp_cadangan_target', 'provenance');
    await queryInterface.removeColumn('prosnp_rapat_forkopimda', 'provenance');
    await queryInterface.removeColumn('prosnp_surat_penugasan', 'provenance');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'klasifikasi_meta');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'extraction_method');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'extracted_at');
    await queryInterface.removeColumn('prosnp_bukti_dukung', 'extracted_text_cache');
  },
};
