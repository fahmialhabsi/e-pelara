'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProsnKomoditas extends Model {
    static associate(models) {
      ProsnKomoditas.hasMany(models.ProsnStokTransaksi, { foreignKey: 'komoditas_id', as: 'transaksi' });
    }
  }

  ProsnKomoditas.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    kode: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nama: { type: DataTypes.STRING(150), allowNull: false },
    kategori: { type: DataTypes.STRING(100), allowNull: true },
    flag_beras: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    satuan_dasar: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Ton' },
    aktif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: 'ProsnKomoditas', tableName: 'prosnp_komoditas', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  return ProsnKomoditas;
};
