'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnSarprasKomponenMbg extends Model {
    static associate(models) {
      ProsnSarprasKomponenMbg.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnSarprasKomponenMbg.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
    }
  }

  ProsnSarprasKomponenMbg.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    nama_komponen: { type: DataTypes.STRING(150), allowNull: false },
    tersedia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnSarprasKomponenMbg', tableName: 'prosnp_sarpras_komponen_mbg', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnSarprasKomponenMbg;
};
