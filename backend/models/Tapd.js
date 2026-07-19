'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tapd extends Model {}
  Tapd.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      urutan: { type: DataTypes.INTEGER, defaultValue: 1 },
      nama: { type: DataTypes.STRING(255), allowNull: false },
      nip: { type: DataTypes.STRING(50), allowNull: false },
      jabatan: { type: DataTypes.STRING(100), allowNull: false },
      tanggal_pembahasan: { type: DataTypes.STRING(50), allowNull: true },
      catatan: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Tapd',
      tableName: 'tapd',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return Tapd;
};
