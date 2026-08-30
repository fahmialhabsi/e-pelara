'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnLaporanSatgasMbg extends Model {
    static associate(models) {
      ProsnLaporanSatgasMbg.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnLaporanSatgasMbg.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
    }
  }

  ProsnLaporanSatgasMbg.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    tanggal_wajib_lapor: { type: DataTypes.DATEONLY, allowNull: false },
    tanggal_lapor_aktual: { type: DataTypes.DATEONLY, allowNull: true },
    rencana_kerja: { type: DataTypes.TEXT, allowNull: true },
    permasalahan: { type: DataTypes.TEXT, allowNull: true },
    hasil_identifikasi_sppg: { type: DataTypes.TEXT, allowNull: true },
    lock_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnLaporanSatgasMbg', tableName: 'prosnp_laporan_satgas_mbg', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnLaporanSatgasMbg;
};
