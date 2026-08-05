'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnBuktiIndikator extends Model {
    static associate(models) {
      ProsnBuktiIndikator.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnBuktiIndikator.belongsTo(models.ProsnBuktiDukung, { foreignKey: 'bukti_dukung_id', as: 'buktiDukung' });
      ProsnBuktiIndikator.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnBuktiIndikator.belongsTo(models.User, { foreignKey: 'ditautkan_oleh', as: 'ditautkanOleh' });
    }
  }

  ProsnBuktiIndikator.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    bukti_dukung_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    relevansi: { type: DataTypes.TEXT, allowNull: true },
    checklist_status: { type: DataTypes.ENUM('belum_dicek', 'sesuai', 'tidak_sesuai'), allowNull: false, defaultValue: 'belum_dicek' },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    catatan_kekurangan: { type: DataTypes.TEXT, allowNull: true },
    ditautkan_oleh: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnBuktiIndikator', tableName: 'prosnp_bukti_indikator', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnBuktiIndikator;
};
