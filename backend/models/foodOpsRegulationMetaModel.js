'use strict';
const { Model } = require('sequelize');

/**
 * Evidence & Operasi Pangan — Phase 0. Ekstensi 1:1 dari `food_ops_document`
 * KHUSUS `document_class='REGULATION'` (mandat §11) — field legal HANYA di
 * sini, field file TETAP di `food_ops_document` (tidak diduplikasi, mandat
 * §74 "STORE ONCE"). `renja_landasan_hukum` TIDAK disentuh — vocabulary
 * `jenis_produk_hukum` di sini independen (mandat §12).
 *
 * `supersedes_document_id`/`superseded_by_document_id` menautkan ke
 * `food_ops_document.id` LAIN (regulasi yang dicabut/menggantikan secara
 * hukum) — ini BEDA dari `menggantikan_document_id` milik document (yang
 * berarti "file baru menggantikan file lama dari dokumen YANG SAMA").
 */
module.exports = (sequelize, DataTypes) => {
  class FoodOpsRegulationMeta extends Model {
    static associate(models) {
      FoodOpsRegulationMeta.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      FoodOpsRegulationMeta.belongsTo(models.FoodOpsDocument, { foreignKey: 'document_id', as: 'document' });
      FoodOpsRegulationMeta.belongsTo(models.FoodOpsDocument, { foreignKey: 'supersedes_document_id', as: 'supersedesDocument' });
      FoodOpsRegulationMeta.belongsTo(models.FoodOpsDocument, { foreignKey: 'superseded_by_document_id', as: 'supersededByDocument' });
    }
  }

  FoodOpsRegulationMeta.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    document_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },

    jenis_produk_hukum: {
      type: DataTypes.ENUM('uu', 'perpu', 'pp', 'perpres', 'permendagri', 'permen_lain', 'kepmendagri', 'perda', 'pergub', 'kepgub', 'sk', 'lainnya'),
      allowNull: false,
    },
    nomor: { type: DataTypes.STRING(150), allowNull: true },
    tahun: { type: DataTypes.STRING(4), allowNull: true },
    judul_resmi: { type: DataTypes.STRING(500), allowNull: true },
    instansi_penerbit: { type: DataTypes.STRING(255), allowNull: true },
    tanggal_penetapan: { type: DataTypes.DATEONLY, allowNull: true },
    tanggal_berlaku: { type: DataTypes.DATEONLY, allowNull: true },
    status_berlaku: { type: DataTypes.ENUM('berlaku', 'diubah', 'dicabut'), allowNull: false, defaultValue: 'berlaku' },
    legal_hierarchy: { type: DataTypes.STRING(50), allowNull: true },
    scope: { type: DataTypes.STRING(255), allowNull: true },
    supersedes_document_id: { type: DataTypes.INTEGER, allowNull: true },
    superseded_by_document_id: { type: DataTypes.INTEGER, allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },

    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    sequelize, modelName: 'FoodOpsRegulationMeta', tableName: 'food_ops_regulation_meta', underscored: true,
    timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
  });

  return FoodOpsRegulationMeta;
};
