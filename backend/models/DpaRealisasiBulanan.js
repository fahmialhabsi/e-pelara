'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DpaRealisasiBulanan extends Model {}
  DpaRealisasiBulanan.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dpa_id: { type: DataTypes.INTEGER, allowNull: false },
      bulan: { type: DataTypes.TINYINT, allowNull: false },
      jumlah: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: 'DpaRealisasiBulanan',
      tableName: 'dpa_realisasi_bulanan',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return DpaRealisasiBulanan;
};
