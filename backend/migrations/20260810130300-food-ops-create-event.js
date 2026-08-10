'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Entitas kegiatan/aktivitas
 * operasional generik, independen dari `prosnp_rapat_forkopimda` (mandat
 * §16/§52 — B.1.2 TIDAK disentuh/dibridging pada Phase 0 ini).
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
    await queryInterface.createTable('food_ops_event', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      opd_id: { type: Sequelize.INTEGER, allowNull: true },

      tahun: { type: Sequelize.STRING(4), allowNull: false },
      event_type: { type: Sequelize.STRING(30), allowNull: false },

      tanggal_mulai: { type: Sequelize.DATEONLY, allowNull: false },
      tanggal_selesai: { type: Sequelize.DATEONLY, allowNull: true },
      nama_kegiatan: { type: Sequelize.STRING(255), allowNull: false },
      lokasi: { type: Sequelize.STRING(255), allowNull: true },
      pimpinan: { type: Sequelize.STRING(255), allowNull: true },
      penanggung_jawab: { type: Sequelize.STRING(255), allowNull: true },
      agenda: { type: Sequelize.TEXT, allowNull: true },
      hasil: { type: Sequelize.TEXT, allowNull: true },
      tindak_lanjut: { type: Sequelize.TEXT, allowNull: true },
      status_tindak_lanjut: { type: Sequelize.ENUM('belum_ditindaklanjuti', 'sedang_diproses', 'selesai'), allowNull: false, defaultValue: 'belum_ditindaklanjuti' },
      status: { type: Sequelize.ENUM('aktif', 'dibatalkan'), allowNull: false, defaultValue: 'aktif' },

      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });

    await queryInterface.addIndex('food_ops_event', ['tenant_id', 'event_type', 'tanggal_mulai'], { name: 'idx_food_ops_event_tenant_type_tanggal' });
    await queryInterface.addIndex('food_ops_event', ['tenant_id', 'opd_id', 'tahun'], { name: 'idx_food_ops_event_tenant_opd_tahun' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('food_ops_event');
  },
};
