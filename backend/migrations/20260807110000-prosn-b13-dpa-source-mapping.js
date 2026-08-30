'use strict';

/**
 * Corrective pass §10 — Source-Driven DPA Mapping utk Target Cadangan Pangan
 * Beras (B.1.3), satu-satunya register ProSN yang punya dimensi target/anggaran
 * yang secara wajar dapat ditelusuri ke Program->Kegiatan->SubKegiatan APBD
 * nyata (via prosnp_nomenklatur_mapping -> Dpa.kode_sub_kegiatan, sudah
 * diverifikasi match nyata di DB: OPD 107 tahun 2025/2026).
 *
 * source_trace menyimpan riwayat snapshot (array JSON) setiap kali "Perbarui
 * Snapshot dari Sumber" dijalankan, supaya perubahan sumber tidak diam-diam
 * mengubah laporan tanpa jejak audit (mandat §10).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_type', {
      type: Sequelize.ENUM('sistem', 'manual'), allowNull: false, defaultValue: 'manual',
    });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_tahun', { type: Sequelize.STRING(4), allowNull: true });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_opd_id', {
      type: Sequelize.INTEGER, allowNull: true, references: { model: 'opd_penanggung_jawab', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      comment: 'FK ke opd_penanggung_jawab (ruang ID yang dipakai Dpa.opd_id), BUKAN perangkat_daerah — lihat perangkat_daerah_opd_mapping.',
    });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_sub_kegiatan_id', {
      type: Sequelize.INTEGER, allowNull: true, references: { model: 'master_sub_kegiatan', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_dpa_id', {
      type: Sequelize.INTEGER, allowNull: true, references: { model: 'dpa', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_pagu_dpa', { type: Sequelize.DECIMAL(20, 2), allowNull: true });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_realisasi', { type: Sequelize.DECIMAL(20, 2), allowNull: true });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_snapshot_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('prosnp_cadangan_target', 'source_trace', { type: Sequelize.JSON, allowNull: true, comment: 'Riwayat snapshot (array), tiap kali diambil/diperbarui dari sumber.' });
    await queryInterface.addColumn('prosnp_cadangan_target', 'manual_override_alasan', { type: Sequelize.TEXT, allowNull: true });
  },
  async down(queryInterface) {
    for (const col of ['manual_override_alasan', 'source_trace', 'source_snapshot_at', 'source_realisasi', 'source_pagu_dpa', 'source_dpa_id', 'source_sub_kegiatan_id', 'source_opd_id', 'source_tahun', 'source_type']) {
      await queryInterface.removeColumn('prosnp_cadangan_target', col);
    }
  },
};
