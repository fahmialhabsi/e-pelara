'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnIndikatorKontributor extends Model {
    static associate(models) {
      ProsnIndikatorKontributor.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnIndikatorKontributor.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnIndikatorKontributor.belongsTo(models.PerangkatDaerah, { foreignKey: 'opd_id', as: 'opd' });
    }
  }

  ProsnIndikatorKontributor.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    opd_id: { type: DataTypes.INTEGER, allowNull: false },
    peran: { type: DataTypes.ENUM('kontributor_data', 'kontributor_bukti', 'koordinator_teknis'), allowNull: false },
    catatan: { type: DataTypes.TEXT, allowNull: true },
  }, { sequelize, modelName: 'ProsnIndikatorKontributor', tableName: 'prosnp_indikator_kontributor', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnIndikatorKontributor;
};
