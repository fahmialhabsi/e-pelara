'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Relasi generik dokumen -> entitas,
 * independen dari `prosnp_bukti_indikator` (mandat §13). Phase 0 entity_type
 * dibatasi ke EVENT/REGULATION/DOCUMENT/GENERIC_REFERENCE (mandat §14).
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
    await queryInterface.createTable('food_ops_document_link', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tenant_id: tenantColumn(Sequelize),

      document_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'food_ops_document', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      entity_type: { type: Sequelize.ENUM('EVENT', 'REGULATION', 'DOCUMENT', 'GENERIC_REFERENCE'), allowNull: false },
      entity_id: { type: Sequelize.INTEGER, allowNull: false },

      relation_type: { type: Sequelize.STRING(50), allowNull: true },
      purpose: { type: Sequelize.STRING(255), allowNull: true },
      valid_from: { type: Sequelize.DATEONLY, allowNull: true },
      valid_until: { type: Sequelize.DATEONLY, allowNull: true },

      linked_by: userColumn(Sequelize),
      linked_at: { type: Sequelize.DATE, allowNull: false },
      ...auditColumns(Sequelize),
    });

    await queryInterface.addIndex('food_ops_document_link', ['tenant_id', 'entity_type', 'entity_id'], { name: 'idx_food_ops_link_tenant_entity' });
    await queryInterface.addIndex('food_ops_document_link', ['document_id'], { name: 'idx_food_ops_link_document' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('food_ops_document_link');
  },
};
