'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnCadanganTarget extends Model {
    static associate(models) {
      ProsnCadanganTarget.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnCadanganTarget.belongsTo(models.OpdPenanggungJawab, { foreignKey: 'source_opd_id', as: 'sourceOpd' });
      ProsnCadanganTarget.belongsTo(models.MasterSubKegiatan, { foreignKey: 'source_sub_kegiatan_id', as: 'sourceSubKegiatan' });
      ProsnCadanganTarget.belongsTo(models.Dpa, { foreignKey: 'source_dpa_id', as: 'sourceDpa' });
    }
  }

  ProsnCadanganTarget.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    tahun_target: { type: DataTypes.STRING(4), allowNull: false },
    nomor_keputusan: { type: DataTypes.STRING(150), allowNull: false },
    tanggal_keputusan: { type: DataTypes.DATEONLY, allowNull: false },
    target_ton: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    satuan: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Ton' },
    tanggal_mulai_berlaku: { type: DataTypes.DATEONLY, allowNull: true },
    status_aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    source_type: { type: DataTypes.ENUM('sistem', 'manual'), allowNull: false, defaultValue: 'manual' },
    source_tahun: { type: DataTypes.STRING(4), allowNull: true },
    source_opd_id: { type: DataTypes.INTEGER, allowNull: true },
    source_sub_kegiatan_id: { type: DataTypes.INTEGER, allowNull: true },
    source_dpa_id: { type: DataTypes.INTEGER, allowNull: true },
    source_pagu_dpa: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
    source_realisasi: { type: DataTypes.DECIMAL(20, 2), allowNull: true },
    source_snapshot_at: { type: DataTypes.DATE, allowNull: true },
    source_trace: { type: DataTypes.JSON, allowNull: true },
    manual_override_alasan: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
    provenance: { type: DataTypes.JSON, allowNull: true },
  }, { sequelize, modelName: 'ProsnCadanganTarget', tableName: 'prosnp_cadangan_target', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnCadanganTarget;
};
