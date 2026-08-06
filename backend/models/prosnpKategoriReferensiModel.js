'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnKategoriReferensi extends Model {
    static associate(models) {
      ProsnKategoriReferensi.hasMany(models.ProsnPengisian, { foreignKey: 'hambatan_kategori_id', as: 'pengisianHambatan' });
      ProsnKategoriReferensi.hasMany(models.ProsnPengisian, { foreignKey: 'tindak_lanjut_kategori_id', as: 'pengisianTindakLanjut' });
    }
  }

  ProsnKategoriReferensi.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    kelompok: { type: DataTypes.ENUM('hambatan', 'tindak_lanjut'), allowNull: false },
    kode: { type: DataTypes.STRING(50), allowNull: false },
    label: { type: DataTypes.STRING(255), allowNull: false },
    urutan: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'ProsnKategoriReferensi', tableName: 'prosnp_kategori_referensi', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnKategoriReferensi;
};
