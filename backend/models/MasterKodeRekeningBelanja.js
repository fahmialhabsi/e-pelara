'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MasterKodeRekeningBelanja extends Model {}
  MasterKodeRekeningBelanja.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      akun: DataTypes.STRING(10),
      kelompok: DataTypes.STRING(10),
      jenis: DataTypes.STRING(10),
      objek: DataTypes.STRING(10),
      rincian: DataTypes.STRING(10),
      sub_rincian: DataTypes.STRING(10),
      kode_rekening: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      uraian: { type: DataTypes.TEXT, allowNull: false },
      level: { type: DataTypes.INTEGER, allowNull: false },
      is_leaf: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'MasterKodeRekeningBelanja',
      tableName: 'master_kode_rekening_belanja',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  );
  return MasterKodeRekeningBelanja;
};
