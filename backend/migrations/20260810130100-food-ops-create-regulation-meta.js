'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Ekstensi 1:1 `food_ops_document`
 * khusus document_class=REGULATION. `renja_landasan_hukum` TIDAK disentuh.
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
    await queryInterface.createTable('food_ops_regulation_meta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),
      document_id: {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: 'food_ops_document', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },

      jenis_produk_hukum: { type: Sequelize.ENUM('uu', 'perpu', 'pp', 'perpres', 'permendagri', 'permen_lain', 'kepmendagri', 'perda', 'pergub', 'kepgub', 'sk', 'lainnya'), allowNull: false },
      nomor: { type: Sequelize.STRING(150), allowNull: true },
      tahun: { type: Sequelize.STRING(4), allowNull: true },
      judul_resmi: { type: Sequelize.STRING(500), allowNull: true },
      instansi_penerbit: { type: Sequelize.STRING(255), allowNull: true },
      tanggal_penetapan: { type: Sequelize.DATEONLY, allowNull: true },
      tanggal_berlaku: { type: Sequelize.DATEONLY, allowNull: true },
      status_berlaku: { type: Sequelize.ENUM('berlaku', 'diubah', 'dicabut'), allowNull: false, defaultValue: 'berlaku' },
      legal_hierarchy: { type: Sequelize.STRING(50), allowNull: true },
      scope: { type: Sequelize.STRING(255), allowNull: true },
      supersedes_document_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'food_ops_document', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      superseded_by_document_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'food_ops_document', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      catatan: { type: Sequelize.TEXT, allowNull: true },

      lock_version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      created_by: userColumn(Sequelize),
      updated_by: userColumn(Sequelize),
      ...auditColumns(Sequelize),
    });

    await queryInterface.addIndex('food_ops_regulation_meta', ['tenant_id', 'jenis_produk_hukum'], { name: 'idx_food_ops_regulation_tenant_jenis' });
    await queryInterface.addIndex('food_ops_regulation_meta', ['tenant_id', 'tahun'], { name: 'idx_food_ops_regulation_tenant_tahun' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('food_ops_regulation_meta');
  },
};
