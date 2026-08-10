'use strict';
const { Model } = require('sequelize');

/**
 * Evidence & Operasi Pangan — Phase 0. Relasi generik satu dokumen -> banyak
 * entitas (mandat §13/§19), pola sama seperti `prosnp_bukti_indikator` TAPI
 * tabel independen (mandat §5: "Do NOT FK to prosnp tables"). `entity_type`
 * Phase 0 dibatasi ke EVENT/REGULATION/DOCUMENT/GENERIC_REFERENCE (mandat
 * §14) — PROSN_B11-B14/CPPD_TRANSACTION/MBG SENGAJA belum ditambahkan.
 *
 * Baris relasi murni (create/delete), TIDAK ber-lock_version (mandat §13:
 * "DocumentLink should be treated as relationship row, not mutable
 * business entity").
 */
module.exports = (sequelize, DataTypes) => {
  class FoodOpsDocumentLink extends Model {
    static associate(models) {
      FoodOpsDocumentLink.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      FoodOpsDocumentLink.belongsTo(models.FoodOpsDocument, { foreignKey: 'document_id', as: 'document' });
    }
  }

  FoodOpsDocumentLink.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },

    document_id: { type: DataTypes.INTEGER, allowNull: false },
    entity_type: { type: DataTypes.ENUM('EVENT', 'REGULATION', 'DOCUMENT', 'GENERIC_REFERENCE'), allowNull: false },
    entity_id: { type: DataTypes.INTEGER, allowNull: false },

    relation_type: { type: DataTypes.STRING(50), allowNull: true },
    purpose: { type: DataTypes.STRING(255), allowNull: true },
    valid_from: { type: DataTypes.DATEONLY, allowNull: true },
    valid_until: { type: DataTypes.DATEONLY, allowNull: true },

    linked_by: { type: DataTypes.INTEGER, allowNull: true },
    linked_at: { type: DataTypes.DATE, allowNull: false },
  }, {
    sequelize, modelName: 'FoodOpsDocumentLink', tableName: 'food_ops_document_link', underscored: true,
    timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  });

  return FoodOpsDocumentLink;
};
