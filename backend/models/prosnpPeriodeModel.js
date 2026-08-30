'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnPeriode extends Model {
    static associate(models) {
      ProsnPeriode.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
      ProsnPeriode.belongsTo(models.PerangkatDaerah, { foreignKey: 'perangkat_daerah_id', as: 'perangkatDaerah' });
      ProsnPeriode.belongsTo(models.User, { foreignKey: 'dikunci_oleh', as: 'dikunciOleh' });
      ProsnPeriode.hasMany(models.ProsnIndikator, { foreignKey: 'periode_id', as: 'indikators' });
      ProsnPeriode.hasMany(models.ProsnBuktiDukung, { foreignKey: 'periode_id', as: 'buktiDukung' });
      ProsnPeriode.hasOne(models.ProsnArsip, { foreignKey: 'periode_id', as: 'arsip' });
    }
  }

  ProsnPeriode.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    perangkat_daerah_id: { type: DataTypes.INTEGER, allowNull: false },
    tahun: { type: DataTypes.STRING(4), allowNull: false },
    semester: { type: DataTypes.ENUM('1', '2', 'tahunan'), allowNull: false, defaultValue: 'tahunan' },
    nama: { type: DataTypes.STRING(150), allowNull: false },
    tanggal_mulai: { type: DataTypes.DATEONLY, allowNull: false },
    tanggal_tenggat: { type: DataTypes.DATEONLY, allowNull: false },
    tanggal_cutoff: { type: DataTypes.DATEONLY, allowNull: true },
    tenggat_internal: { type: DataTypes.DATEONLY, allowNull: true },
    tenggat_pelaporan: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'aktif', 'terkunci', 'siap_diekspor', 'diarsipkan'), allowNull: false, defaultValue: 'draft' },
    dikunci_at: { type: DataTypes.DATE, allowNull: true },
    dikunci_oleh: { type: DataTypes.INTEGER, allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { sequelize, modelName: 'ProsnPeriode', tableName: 'prosnp_periode', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnPeriode;
};
