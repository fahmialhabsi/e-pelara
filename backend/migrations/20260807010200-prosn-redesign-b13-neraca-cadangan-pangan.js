'use strict';

/**
 * Redesain ProSN — Fase 3: B.1.3 Target & Neraca Cadangan Pangan Beras.
 * Refactor paling serius sesuai mandat — target dari Keputusan KDH (bukan
 * indikator Renstra), neraca dihitung backend dari transaksi stok berkepemilikan
 * jelas (hanya Pemerintah Provinsi + komoditas Beras + status valid yang masuk
 * pembilang capaian — lihat prosnpB13RuleEngineService.js).
 *
 * Target discope per TAHUN (bukan per periode/semester) karena satu Keputusan
 * KDH lazimnya berlaku satu tahun penuh dan dipakai bersama oleh Semester I
 * & II — dicek dengan kondisi nyata: dua periode 2025 (Semester I & II) di DB
 * ini sudah ada, cadangan_target akan dipakai kedua periode itu.
 */
const tenantColumn = (Sequelize) => ({
  type: Sequelize.INTEGER.UNSIGNED, allowNull: false,
  references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
});
const userColumn = (Sequelize) => ({
  type: Sequelize.INTEGER, allowNull: true,
  references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
});
const auditColumns = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('prosnp_cadangan_target', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      tahun_target: { type: Sequelize.STRING(4), allowNull: false },
      nomor_keputusan: { type: Sequelize.STRING(150), allowNull: false },
      tanggal_keputusan: { type: Sequelize.DATEONLY, allowNull: false },
      target_ton: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      satuan: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'Ton' },
      tanggal_mulai_berlaku: { type: Sequelize.DATEONLY, allowNull: true },
      status_aktif: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_cadangan_target', ['tenant_id', 'tahun_target', 'status_aktif'], { name: 'idx_prosnp_target_tenant_tahun_aktif' });

    await queryInterface.createTable('prosnp_stok_transaksi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      komoditas_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_komoditas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      tanggal: { type: Sequelize.DATEONLY, allowNull: false },
      jenis_transaksi: {
        type: Sequelize.ENUM('saldo_awal', 'pengadaan', 'penerimaan_lain_sah', 'penyaluran', 'susut_rusak', 'koreksi_masuk', 'koreksi_keluar'),
        allowNull: false,
      },
      volume: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      satuan: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'Ton' },
      lokasi_gudang: { type: Sequelize.STRING(255), allowNull: true },
      pengelola: { type: Sequelize.STRING(150), allowNull: true },
      nomor_dokumen: { type: Sequelize.STRING(150), allowNull: true },
      sumber_data: { type: Sequelize.STRING(255), allowNull: true },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      ownership: {
        type: Sequelize.ENUM('pemerintah_provinsi', 'bulog', 'distributor', 'penggilingan', 'lainnya'),
        allowNull: false, defaultValue: 'pemerintah_provinsi',
        comment: 'Hanya pemerintah_provinsi yg dihitung rule engine capaian ProSN (lihat §9.6 mandat) — lainnya tersimpan sbg info situasional.',
      },
      status_verifikasi: {
        type: Sequelize.ENUM('uploaded', 'valid', 'invalid', 'needs_clarification', 'duplicate', 'expired'),
        allowNull: false, defaultValue: 'uploaded',
      },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_stok_transaksi', ['pengisian_id', 'tanggal'], { name: 'idx_prosnp_stok_pengisian_tanggal' });
    await queryInterface.addIndex('prosnp_stok_transaksi', ['komoditas_id', 'ownership', 'status_verifikasi'], { name: 'idx_prosnp_stok_filter_capaian' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prosnp_stok_transaksi');
    await queryInterface.dropTable('prosnp_cadangan_target');
  },
};
