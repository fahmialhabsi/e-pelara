'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PejabatPenandatangan extends Model {}
  PejabatPenandatangan.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tahun: { type: DataTypes.INTEGER, allowNull: false },
      role: {
        type: DataTypes.ENUM(
          'PENGGUNA_ANGGARAN',
          'KUASA_PENGGUNA_ANGGARAN',
          'KEPALA_DINAS',
          'SEKRETARIS',
        ),
        allowNull: false,
      },
      nama: { type: DataTypes.STRING(255), allowNull: true },
      nip: { type: DataTypes.STRING(50), allowNull: true },
      jabatan: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: 'PejabatPenandatangan',
      tableName: 'pejabat_penandatangan',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );
  return PejabatPenandatangan;
};
