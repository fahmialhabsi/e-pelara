'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DpaPergeseran extends Model {}
  DpaPergeseran.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dpa_id: { type: DataTypes.INTEGER, allowNull: false },
      nomor_pergeseran: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      alasan: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM('DRAFT', 'DISETUJUI', 'DITOLAK'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      created_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DpaPergeseran',
      tableName: 'dpa_pergeseran',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return DpaPergeseran;
};
