'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnRiwayatStatus extends Model {
    static associate(models) {
      ProsnRiwayatStatus.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnRiwayatStatus.belongsTo(models.ProsnPengisian, { foreignKey: 'pengisian_id', as: 'pengisian' });
      ProsnRiwayatStatus.belongsTo(models.User, { foreignKey: 'diubah_oleh', as: 'diubahOleh' });
    }
  }

  ProsnRiwayatStatus.init({
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    pengisian_id: { type: DataTypes.INTEGER, allowNull: false },
    status_sebelum: { type: DataTypes.STRING(40), allowNull: true },
    status_sesudah: { type: DataTypes.STRING(40), allowNull: false },
    alasan: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    diubah_oleh: { type: DataTypes.INTEGER, allowNull: false },
    diubah_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: 'ProsnRiwayatStatus', tableName: 'prosnp_riwayat_status', underscored: true, timestamps: false });

  return ProsnRiwayatStatus;
};
