'use strict';

/**
 * ProSN Indicator Foundation (spek 34) §3.5 — register baru khusus MBG 2.1/2.2/2.3
 * (tidak ada register existing yang cocok dipakai ulang).
 *
 * Koreksi wajib #1 (CEA): prosnp_laporan_satgas_mbg SENGAJA TIDAK punya kolom
 * data_lengkap yang writable — kelengkapan dihitung rule engine dari 3 kolom
 * konten + evidence gate setiap "Hitung Ulang Skor" dijalankan.
 *
 * Koreksi wajib #2 (CEA): prosnp_sarpras_komponen_mbg BUKAN satu baris
 * status+textarea, melainkan satu baris PER KOMPONEN sarpras — proporsi
 * ketersediaan dihitung backend dari sini, daftar komponen wajib
 * admin-configurable via master_indikator.kriteria_skor.daftar_komponen_wajib.
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
    await queryInterface.createTable('prosnp_satgas_mbg', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      status_kelembagaan: {
        type: Sequelize.ENUM('belum_terbentuk', 'terbentuk_belum_optimal', 'terbentuk_aktif'), allowNull: false, defaultValue: 'belum_terbentuk',
        comment: 'Deklarasi/catatan operator sendiri (naratif) — BUKAN sumber skor. Skor final selalu dihitung independen dari evidence (spek 34 §5, koreksi #3).',
      },
      nomor_sk: { type: Sequelize.STRING(150), allowNull: true },
      tanggal_sk: { type: Sequelize.DATEONLY, allowNull: true },
      uraian_aktivitas: { type: Sequelize.TEXT, allowNull: true },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_satgas_mbg', ['tenant_id', 'pengisian_id'], { name: 'idx_prosnp_satgas_mbg_tenant_pengisian' });

    await queryInterface.createTable('prosnp_sarpras_komponen_mbg', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      nama_komponen: { type: Sequelize.STRING(150), allowNull: false, comment: 'Diisi dari daftar_komponen_wajib master_indikator.kriteria_skor — operator tidak bebas mengetik nama baru.' },
      tersedia: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      catatan: { type: Sequelize.TEXT, allowNull: true },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_sarpras_komponen_mbg', ['pengisian_id', 'nama_komponen'], { unique: true, name: 'uq_sarpras_komponen_pengisian_nama' });

    await queryInterface.createTable('prosnp_laporan_satgas_mbg', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tanggal_wajib_lapor: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_lapor_aktual: { type: Sequelize.DATEONLY, allowNull: true },
      rencana_kerja: { type: Sequelize.TEXT, allowNull: true },
      permasalahan: { type: Sequelize.TEXT, allowNull: true },
      hasil_identifikasi_sppg: { type: Sequelize.TEXT, allowNull: true },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_laporan_satgas_mbg', ['tenant_id', 'pengisian_id'], { name: 'idx_prosnp_laporan_satgas_mbg_tenant_pengisian' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prosnp_laporan_satgas_mbg');
    await queryInterface.dropTable('prosnp_sarpras_komponen_mbg');
    await queryInterface.dropTable('prosnp_satgas_mbg');
  },
};
