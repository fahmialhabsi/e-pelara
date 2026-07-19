'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DpaPerubahan extends Model {}
  DpaPerubahan.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dpa_id: { type: DataTypes.INTEGER, allowNull: false },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      nomor_perda: { type: DataTypes.STRING(100), allowNull: true },
      alasan: { type: DataTypes.TEXT, allowNull: false },
      pagu_semula: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
      pagu_menjadi: { type: DataTypes.DECIMAL(20, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM('DRAFT', 'DISETUJUI'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
    },
    {
      sequelize,
      modelName: 'DpaPerubahan',
      tableName: 'dpa_perubahan',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return DpaPerubahan;
};
