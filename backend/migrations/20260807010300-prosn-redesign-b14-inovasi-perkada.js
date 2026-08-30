'use strict';

/** Redesain ProSN — Fase 4: B.1.4 Register Inovasi dan Perkada. */
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
    await queryInterface.createTable('prosnp_inovasi', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      periode_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_periode', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      indikator_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_indikator', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pengisian_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'prosnp_pengisian', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      nama_inovasi: { type: Sequelize.STRING(255), allowNull: false },
      masalah_awal: { type: Sequelize.TEXT, allowNull: true },
      tujuan: { type: Sequelize.TEXT, allowNull: true },
      unsur_kebaruan: { type: Sequelize.TEXT, allowNull: true },
      proses_sebelum: { type: Sequelize.TEXT, allowNull: true },
      proses_setelah: { type: Sequelize.TEXT, allowNull: true },
      ruang_lingkup: { type: Sequelize.TEXT, allowNull: true },
      relevansi_pengadaan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      relevansi_pengelolaan: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      relevansi_penyaluran: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: true },
      status_implementasi: { type: Sequelize.ENUM('gagasan', 'diterapkan_sebagian', 'diterapkan_penuh'), allowNull: false, defaultValue: 'gagasan' },
      unit_pelaksana: { type: Sequelize.STRING(255), allowNull: true },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      penerima_manfaat: { type: Sequelize.TEXT, allowNull: true },
      hasil_kuantitatif: { type: Sequelize.TEXT, allowNull: true },
      hasil_kualitatif: { type: Sequelize.TEXT, allowNull: true },
      sub_kegiatan_basis: { type: Sequelize.STRING(255), allowNull: true },
      status_evaluasi: { type: Sequelize.STRING(150), allowNull: true },
      status_perkada: { type: Sequelize.ENUM('belum_ada', 'proses_penyusunan', 'ditetapkan'), allowNull: false, defaultValue: 'belum_ada' },
      jenis_perkada: { type: Sequelize.STRING(100), allowNull: true },
      nomor_perkada: { type: Sequelize.STRING(150), allowNull: true },
      tanggal_perkada: { type: Sequelize.DATEONLY, allowNull: true },
      relevansi_dijelaskan: { type: Sequelize.TEXT, allowNull: true, comment: 'Wajib diisi bila sub_kegiatan_basis di luar 4 subkegiatan default B.1.4 (lihat mandat §12).' },
      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });
    await queryInterface.addIndex('prosnp_inovasi', ['pengisian_id'], { name: 'idx_prosnp_inovasi_pengisian' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('prosnp_inovasi');
  },
};
