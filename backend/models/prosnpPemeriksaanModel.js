'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnPemeriksaan extends Model {
    static associate(models) {
      ProsnPemeriksaan.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnPemeriksaan.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
      ProsnPemeriksaan.belongsTo(models.User, { foreignKey: 'diperiksa_oleh', as: 'pemeriksa' });
    }
  }

  ProsnPemeriksaan.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    putaran: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    hasil: { type: DataTypes.ENUM('lengkap', 'perlu_perbaikan'), allowNull: false },
    status_data: { type: DataTypes.ENUM('lengkap', 'tidak_lengkap', 'tidak_valid'), allowNull: false },
    status_bukti: { type: DataTypes.ENUM('lengkap', 'tidak_lengkap', 'tidak_valid'), allowNull: false },
    catatan_kekurangan: { type: DataTypes.TEXT, allowNull: true },
    diperiksa_oleh: { type: DataTypes.INTEGER, allowNull: false },
    diperiksa_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: 'ProsnPemeriksaan', tableName: 'prosnp_pemeriksaan', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnPemeriksaan;
};
