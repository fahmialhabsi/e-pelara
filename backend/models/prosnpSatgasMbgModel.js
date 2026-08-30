'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnSatgasMbg extends Model {
    static associate(models) {
      ProsnSatgasMbg.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnSatgasMbg.belongsTo(models.ProsnPeriode, { foreignKey: 'periode_id', as: 'periode' });
      ProsnSatgasMbg.belongsTo(models.ProsnIndikator, { foreignKey: 'indikator_id', as: 'indikator' });
      ProsnSatgasMbg.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
    }
  }

  ProsnSatgasMbg.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    periode_id: { type: DataTypes.INTEGER, allowNull: false },
    indikator_id: { type: DataTypes.INTEGER, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    status_kelembagaan: { type: DataTypes.ENUM('belum_terbentuk', 'terbentuk_belum_optimal', 'terbentuk_aktif'), allowNull: false, defaultValue: 'belum_terbentuk' },
    nomor_sk: { type: DataTypes.STRING(150), allowNull: true },
    tanggal_sk: { type: DataTypes.DATEONLY, allowNull: true },
    uraian_aktivitas: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnSatgasMbg', tableName: 'prosnp_satgas_mbg', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnSatgasMbg;
};
